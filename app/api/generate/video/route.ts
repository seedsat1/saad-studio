import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVideoCreditsByModelIdAsync } from "@/lib/credit-pricing";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  refundGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";
import { normalizeMediaUrl } from "@/lib/r2-storage";

const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const { kieVideoModelMap, wavespeedFallbackMap } = getResolvedKieRoutingMaps();

function resolveWaveSpeedModelRoute(modelId: string): string {
  const clean = modelId.trim();
  const mapping: Record<string, string> = {
    "wavespeed-ai/cinematic-video-generator": "wavespeed-ai/cinematic-video-generator",
    "kling-3.0/video": "kwaivgi/kling-v3.0-pro/text-to-video",
    "kwaivgi/kling-v3.0-pro/text-to-video": "kwaivgi/kling-v3.0-pro/text-to-video",
    "kling-3.0/motion-control": "kwaivgi/kling-v3.0-pro/motion-control",
    "kwaivgi/kling-v3.0-pro/motion-control": "kwaivgi/kling-v3.0-pro/motion-control",
    "kling/v2-5-turbo-text-to-video-pro": "kling/v2-5-turbo-text-to-video-pro",
    "kling/v2-5-turbo-image-to-video-pro": "kling/v2-5-turbo-image-to-video-pro",
    
    "hailuo/2-3-image-to-video-standard": "hailuo/2-3-image-to-video-standard",
    "hailuo/2-3-image-to-video-pro": "hailuo/2-3-image-to-video-pro",
    "minimax/hailuo-2.3/i2v-standard": "hailuo/2-3-image-to-video-standard",
    "minimax/hailuo-2.3/i2v-pro": "hailuo/2-3-image-to-video-pro",
    
    "sora-2-text-to-video": "openai/sora-2/text-to-video",
    "sora-2-image-to-video": "openai/sora-2/image-to-video",
    "sora-2-pro-text-to-video": "openai/sora-2/text-to-video-pro",
    "openai/sora-2/text-to-video": "openai/sora-2/text-to-video",
    "openai/sora-2/image-to-video": "openai/sora-2/image-to-video",
    "openai/sora-2/text-to-video-pro": "openai/sora-2/text-to-video-pro",
    
    "grok-imagine/text-to-video": "x-ai/grok-imagine-video/text-to-video",
    "grok-imagine/image-to-video": "x-ai/grok-imagine-video/edit-video",
    "x-ai/grok-imagine-video/text-to-video": "x-ai/grok-imagine-video/text-to-video",
    "x-ai/grok-imagine-video/edit-video": "x-ai/grok-imagine-video/edit-video",
  };
  return mapping[clean] || wavespeedFallbackMap[clean] || clean;
}

interface VideoRequestBody {
  prompt: string;
  modelId: string;
  imageUrl?: string;
  imageUrls?: string[];
  duration?: number;
  resolution?: string;
  quality?: string;
  aspectRatio?: string;
  sound?: boolean;
}

interface ProviderResult {
  status: string;
  outputs?: string[];
  error?: string;
}

function extractOutputs(input: unknown): string[] {
  if (!input) return [];

  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) return [input];
    try {
      return extractOutputs(JSON.parse(input));
    } catch {
      return [];
    }
  }

  if (Array.isArray(input)) {
    return input.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v));
  }

  if (typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const candidates = [
      rec.resultUrls,
      rec.outputs,
      rec.urls,
      rec.videos,
      rec.images,
      rec.result,
      rec.videoUrl,
      rec.imageUrl,
      rec.url,
      rec.resultJson,
      rec.response,
    ];
    for (const candidate of candidates) {
      const out = extractOutputs(candidate);
      if (out.length) return out;
    }
  }

  return [];
}

async function pollWaveSpeed(predictionId: string, apiKey: string, maxAttempts = 80, intervalMs = 4000): Promise<ProviderResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${WAVESPEED_BASE_URL}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`WaveSpeed polling failed: ${res.status}`);

    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? {};
    const status = String(data?.status || "").toLowerCase();

    if (["completed", "success", "done"].includes(status)) {
      const resultRes = await fetch(`${WAVESPEED_BASE_URL}/predictions/${predictionId}/result`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const resultJson = await resultRes.json().catch(() => ({}));
      const resultData = resultJson?.data ?? resultJson ?? {};
      return { status: "completed", outputs: extractOutputs(resultData?.outputs ?? resultData?.result ?? resultData?.response ?? data?.outputs) };
    }

    if (["failed", "fail", "error", "cancelled", "canceled"].includes(status)) {
      return { status: "failed", error: String(data?.error || data?.errorMessage || "WaveSpeed generation failed") };
    }
  }

  throw new Error("Video generation timed out.");
}

async function pollKie(taskId: string, apiKey: string, maxAttempts = 100, intervalMs = 3000): Promise<ProviderResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`KIE polling failed: ${res.status}`);

    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? {};
    const status = String(data?.state || data?.status || data?.taskStatus || "").toLowerCase();

    if (["success", "completed", "done"].includes(status)) {
      return {
        status: "completed",
        outputs: extractOutputs(data?.resultUrls ?? data?.outputs ?? data?.resultJson ?? data?.response ?? data?.result),
      };
    }

    if (["fail", "failed", "error", "cancelled", "canceled"].includes(status)) {
      return {
        status: "failed",
        error: String(data?.failMsg || data?.errorMessage || data?.error || "KIE generation failed"),
      };
    }
  }

  throw new Error("Video generation timed out.");
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    await syncKieModelCatalog(false).catch(() => null);

    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`video-legacy:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body: VideoRequestBody = await req.json();
    const { prompt, modelId, imageUrl, imageUrls, duration = 5, resolution, quality, aspectRatio = "16:9", sound = false } = body;

    if (!prompt || !modelId) {
      return NextResponse.json({ error: "Missing required fields: prompt, modelId." }, { status: 400 });
    }

    const precheck = await precheckGenerationPolicy({ prompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    if (imageUrl && !isSafePublicHttpUrl(imageUrl) && !imageUrl.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid imageUrl provided." }, { status: 400 });
    }
    const safeImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((url): url is string => typeof url === "string" && isSafePublicHttpUrl(url))
      : [];
    if (Array.isArray(imageUrls) && safeImageUrls.length !== imageUrls.length) {
      return NextResponse.json({ error: "One or more imageUrls are invalid." }, { status: 400 });
    }

    const creditsToCharge = await getVideoCreditsByModelIdAsync(modelId, { duration, resolution, quality });
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit configuration for model: ${modelId}` }, { status: 400 });
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "VIDEO",
      modelUsed: modelId,
      duration,
      resolution,
      aspectRatio,
      quality,
      requestPayload: body,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const payload: Record<string, unknown> = {
      prompt: sanitizePrompt(prompt, 5000),
      duration,
      aspect_ratio: aspectRatio,
    };
    if (imageUrl) payload.image_url = imageUrl;

    const isGoogle = modelId.includes("google") || modelId.includes("veo") || modelId.includes("gemini");
    const isSeedance2 = (modelId.includes("seedance") || modelId.includes("bytedance")) && (modelId.includes("v2") || modelId.includes("-2"));

    if (isGoogle || isSeedance2) {
      // PRIMARY: KIE for Google / Seedance v2
      const kieModel = kieVideoModelMap[modelId];
      if (!kieModel) {
        throw new Error(`Unsupported Google/Seedance v2 model: ${modelId}`);
      }

      const kieKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
      if (!kieKey) {
        throw new Error("KIE_API_KEY is not configured.");
      }

      const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${kieKey}`,
        },
        body: JSON.stringify({
          model: kieModel,
          input: payload,
        }),
      });

      const submitJson = await submitRes.json().catch(() => ({}));
      const taskId = submitJson?.data?.taskId || submitJson?.taskId;
      if (!submitRes.ok || !taskId) {
        throw new Error(submitJson?.msg || submitJson?.message || "KIE submit failed");
      }

      const result = await pollKie(String(taskId), kieKey);
      if (result.status === "failed") {
        throw new Error(result.error ?? "KIE generation failed.");
      }

      const videoUrl = result.outputs?.[0];
      if (!videoUrl) throw new Error("No output URL in KIE result.");
      const normalizedVideoUrl = normalizeMediaUrl(videoUrl) || videoUrl;
      if (generationId) await setGenerationMediaUrl(generationId, normalizedVideoUrl);

      return NextResponse.json({ generationId, videoUrl: normalizedVideoUrl, taskId: String(taskId), provider: "kie" }, { status: 200 });
    } else {
      // FALLBACK: WaveSpeed for all other video models
      const wavespeedModel = resolveWaveSpeedModelRoute(modelId);

      const wavespeedKey = process.env.WAVESPEED_API_KEY;
      if (!wavespeedKey) {
        throw new Error("WAVESPEED_API_KEY is not configured.");
      }

      const wavespeedPayload = { ...payload };
      if (wavespeedModel === "wavespeed-ai/cinematic-video-generator") {
        if (safeImageUrls.length) {
          wavespeedPayload.images = safeImageUrls.slice(0, 4);
          delete wavespeedPayload.image_url;
        } else if (imageUrl) {
          wavespeedPayload.images = [imageUrl];
          delete wavespeedPayload.image_url;
        }
      } else if (imageUrl) {
        if (wavespeedModel.includes("kling-v3.0") || wavespeedModel.includes("motion-control")) {
          wavespeedPayload.image_urls = [imageUrl];
          delete wavespeedPayload.image_url;
        } else {
          wavespeedPayload.image_url = imageUrl;
          delete wavespeedPayload.image_urls;
        }
      }

      const submitRes = await fetch(`${WAVESPEED_BASE_URL}/${wavespeedModel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wavespeedKey}`,
        },
        body: JSON.stringify(wavespeedPayload),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`WaveSpeed submit failed: ${errText}`);
      }

      const submitJson = await submitRes.json().catch(() => ({}));
      const predictionId = submitJson?.data?.id || submitJson?.id;
      if (!predictionId) {
        throw new Error("No prediction ID returned from WaveSpeed.");
      }

      const result = await pollWaveSpeed(String(predictionId), wavespeedKey);
      if (result.status === "failed") {
        throw new Error(result.error ?? "WaveSpeed generation failed.");
      }

      const videoUrl = result.outputs?.[0];
      if (!videoUrl) {
        throw new Error("No output URL in WaveSpeed result.");
      }
      const normalizedVideoUrl = normalizeMediaUrl(videoUrl) || videoUrl;
      if (generationId) {
        await setGenerationMediaUrl(generationId, normalizedVideoUrl);
      }

      return NextResponse.json({ generationId, videoUrl: normalizedVideoUrl, predictionId, provider: "wavespeed" }, { status: 200 });
    }
  } catch (error: unknown) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

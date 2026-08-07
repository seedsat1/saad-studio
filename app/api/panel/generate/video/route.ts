import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { getVideoCreditsByModelId } from "@/lib/credit-pricing";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { isDirectProviderModel, getProviderFor } from "@/lib/provider-router";
import { dispatchDirectVideo } from "@/lib/providers/dispatch";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

type KieApiJson = { code?: number; msg?: string; data?: { taskId?: string; state?: string; resultJson?: string; failMsg?: string; failCode?: string } };

function sanitizePublicUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((url): url is string => typeof url === "string" && isSafePublicHttpUrl(url));
}

function extractVideoUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value.trim())) return [value.trim()];
    try { return extractVideoUrls(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v));
  }
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    for (const k of ["resultUrls", "outputs", "urls", "videos", "result", "videoUrl", "url", "response", "data"]) {
      const u = extractVideoUrls(r[k]);
      if (u.length) return u;
    }
  }
  return [];
}

function resolveWaveSpeedModelRoute(modelId: string, opts?: { resolution?: string; mode?: string }): string {
  const clean = modelId.trim();
  const normalizedResolution = String(opts?.resolution ?? "").trim().toLowerCase();
  const normalizedMode = String(opts?.mode ?? "").trim().toLowerCase();
  if (
    clean === "kling-3.0/video" &&
    (normalizedResolution === "4k" || normalizedMode === "4k")
  ) {
    return "kwaivgi/kling-v3.0-4k/text-to-video";
  }
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
    "x-ai/grok-imagine-video/text-to-video-1-5": "x-ai/grok-imagine-video/text-to-video-1-5",
    "x-ai/grok-imagine-video/edit-video-1-5": "x-ai/grok-imagine-video/edit-video-1-5",
  };
  return mapping[clean] || clean;
}

async function createWaveSpeedTask(apiKey: string, apiRoute: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`https://api.wavespeed.ai/api/v3/${apiRoute}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WaveSpeed submit failed: ${json?.error || json?.message || res.statusText}`);
  }
  const predictionId = json?.data?.id || json?.id;
  if (!predictionId) {
    throw new Error("WaveSpeed did not return a prediction/task ID.");
  }
  return String(predictionId);
}

async function pollWaveSpeedTask(apiKey: string, predictionId: string, maxAttempts = 80, intervalMs = 4000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 425 || res.status === 409) {
        continue;
      }
      throw new Error(`WaveSpeed polling failed: ${res.status}`);
    }
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? {};
    const status = String(data?.status || "").toLowerCase();
    
    if (["completed", "success", "done"].includes(status)) {
      const resultRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}/result`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resultRes.ok) {
        if (resultRes.status === 404 || resultRes.status === 425 || resultRes.status === 409) {
          continue;
        }
        throw new Error(`WaveSpeed result polling failed: ${resultRes.status}`);
      }
      const resultJson = await resultRes.json().catch(() => ({}));
      const resultData = resultJson?.data ?? resultJson ?? {};
      const outputs = extractVideoUrls(resultData?.outputs ?? resultData?.result ?? resultData?.response ?? data?.outputs);
      if (!outputs.length) throw new Error("WaveSpeed task succeeded but no video URL returned.");
      return outputs;
    }
    
    if (["failed", "fail", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(data?.error || data?.errorMessage || "WaveSpeed generation failed.");
    }
  }
  throw new Error("Video generation timed out.");
}

async function createKieTask(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const json = await res.json().catch(() => ({})) as KieApiJson;
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(`KIE createTask failed: ${json.msg ?? res.statusText}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("KIE did not return a taskId.");
  return taskId;
}

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 80, intervalMs = 4000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 3000 : intervalMs));
    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);
    const json = await res.json().catch(() => ({})) as KieApiJson;
    const state = String(json.data?.state ?? "").toLowerCase();
    if (state === "success") {
      if (!json.data?.resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(json.data.resultJson) as unknown;
      const urls = extractVideoUrls(parsed);
      if (!urls.length) throw new Error("KIE task succeeded but no video URL returned.");
      return urls;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }
  throw new Error("Video generation timed out.");
}

/** POST /api/panel/generate/video — generates video using website credits + KIE API. */
export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });

  const rate = hitRateLimit({
    key: `panel:generate-video:${verified.userId}`,
    limit: 12,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  let chargedCredits = 0;
  let generationId: string | null = null;
  const userId = verified.userId;

  try {
    await ensureUserRow(userId);
    const dbUser = await prismadb.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });
    if (dbUser?.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const body = await req.json() as {
      prompt?: string;
      modelId?: string;  // KIE video model ID e.g. "kling-3.0/video"
      duration?: number;
      aspectRatio?: string;
      resolution?: string;
      mode?: string;
      imageUrl?: string;
      imageUrls?: string[];
      videoUrl?: string;
      videoUrls?: string[];
      audioUrls?: string[];
      firstFrameUrl?: string;
      lastFrameUrl?: string;
      referenceImageUrls?: string[];
      referenceVideoUrls?: string[];
      referenceAudioUrls?: string[];
      generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
      enableAudio?: boolean;
    };

    const {
      prompt,
      modelId = "kling-3.0/video",
      duration = 5,
      aspectRatio = "16:9",
      resolution = "1080p",
      mode,
      imageUrl,
      imageUrls,
      videoUrl,
      videoUrls,
      audioUrls,
      firstFrameUrl,
      lastFrameUrl,
      referenceImageUrls,
      referenceVideoUrls,
      referenceAudioUrls,
      generationType,
      enableAudio,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Please enter a prompt." }, { status: 400 });
    }
    if (imageUrl && !isSafePublicHttpUrl(imageUrl)) {
      return NextResponse.json({ error: "Invalid imageUrl provided." }, { status: 400 });
    }
    const safeImageUrls = Array.isArray(imageUrls)
      ? sanitizePublicUrlList(imageUrls)
      : [];
    if (Array.isArray(imageUrls) && safeImageUrls.length !== imageUrls.length) {
      return NextResponse.json({ error: "One or more imageUrls are invalid." }, { status: 400 });
    }
    const safeVideoUrls = sanitizePublicUrlList(videoUrls);
    if (Array.isArray(videoUrls) && safeVideoUrls.length !== videoUrls.length) {
      return NextResponse.json({ error: "One or more videoUrls are invalid." }, { status: 400 });
    }
    const safeAudioUrls = sanitizePublicUrlList(audioUrls);
    if (Array.isArray(audioUrls) && safeAudioUrls.length !== audioUrls.length) {
      return NextResponse.json({ error: "One or more audioUrls are invalid." }, { status: 400 });
    }
    const safeReferenceImageUrls = sanitizePublicUrlList(referenceImageUrls);
    if (Array.isArray(referenceImageUrls) && safeReferenceImageUrls.length !== referenceImageUrls.length) {
      return NextResponse.json({ error: "One or more referenceImageUrls are invalid." }, { status: 400 });
    }
    const safeReferenceVideoUrls = sanitizePublicUrlList(referenceVideoUrls);
    if (Array.isArray(referenceVideoUrls) && safeReferenceVideoUrls.length !== referenceVideoUrls.length) {
      return NextResponse.json({ error: "One or more referenceVideoUrls are invalid." }, { status: 400 });
    }
    const safeReferenceAudioUrls = sanitizePublicUrlList(referenceAudioUrls);
    if (Array.isArray(referenceAudioUrls) && safeReferenceAudioUrls.length !== referenceAudioUrls.length) {
      return NextResponse.json({ error: "One or more referenceAudioUrls are invalid." }, { status: 400 });
    }
    if (videoUrl && !isSafePublicHttpUrl(videoUrl)) {
      return NextResponse.json({ error: "Invalid videoUrl provided." }, { status: 400 });
    }
    if (firstFrameUrl && !isSafePublicHttpUrl(firstFrameUrl)) {
      return NextResponse.json({ error: "Invalid firstFrameUrl provided." }, { status: 400 });
    }
    if (lastFrameUrl && !isSafePublicHttpUrl(lastFrameUrl)) {
      return NextResponse.json({ error: "Invalid lastFrameUrl provided." }, { status: 400 });
    }

    // ── Early dispatch: Google Veo direct (Vertex/Gemini) and BytePlus
    //    Seedance v2 direct. OpenAI Sora has no public direct API yet so
    //    it falls through to the kie.ai path below.
    const hasImageOrAvatar = !!(
      firstFrameUrl ||
      lastFrameUrl ||
      imageUrl ||
      (Array.isArray(imageUrls) && imageUrls.length > 0) ||
      (Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0)
    );
    const provider = getProviderFor(modelId);
    const shouldGoDirect = isDirectProviderModel(modelId)
      && provider !== "openai"
      && !(provider === "byteplus" && hasImageOrAvatar);

    if (shouldGoDirect) {
      const result = await dispatchDirectVideo({
        userId,
        modelId,
        prompt,
        aspect: isGoogleVideoRoute(modelId) ? normalizeGoogleVideoOptions(modelId, { duration, resolution, aspectRatio, referenceImageCount: safeReferenceImageUrls.length, hasVideoInput: Boolean(videoUrl || safeVideoUrls.length), hasStartImage: Boolean(firstFrameUrl || imageUrl || safeImageUrls.length), hasEndImage: Boolean(lastFrameUrl) }).aspectRatio : aspectRatio,
        durationSec: isGoogleVideoRoute(modelId) ? normalizeGoogleVideoOptions(modelId, { duration, resolution, aspectRatio, referenceImageCount: safeReferenceImageUrls.length, hasVideoInput: Boolean(videoUrl || safeVideoUrls.length), hasStartImage: Boolean(firstFrameUrl || imageUrl || safeImageUrls.length), hasEndImage: Boolean(lastFrameUrl) }).duration : duration,
        quality: isGoogleVideoRoute(modelId) ? normalizeGoogleVideoOptions(modelId, { duration, resolution, aspectRatio, referenceImageCount: safeReferenceImageUrls.length, hasVideoInput: Boolean(videoUrl || safeVideoUrls.length), hasStartImage: Boolean(firstFrameUrl || imageUrl || safeImageUrls.length), hasEndImage: Boolean(lastFrameUrl) }).resolution : resolution,
        imageUrl,
        imageUrls: safeImageUrls,
        videoUrl,
        videoUrls: safeVideoUrls,
        audioUrls: safeAudioUrls,
        firstFrameUrl,
        lastFrameUrl,
        referenceImageUrls: safeReferenceImageUrls,
        referenceVideoUrls: safeReferenceVideoUrls,
        referenceAudioUrls: safeReferenceAudioUrls,
        generationType,
        enableAudio,
      });
      return NextResponse.json({
        videoUrl: result.videoUrl ?? null,
        videoUrls: result.videoUrl ? [result.videoUrl] : [],
        generationId: result.generationId,
      });
    }

    const dynamicVideoModels = await getDynamicVideoModels();
    const dynamicVideoModel = dynamicVideoModels.find(
      (m) => (m.api_route === modelId || m.id === modelId) && m.isActive !== false
    );

    // Validate the model is a known KIE video model
    const { kieVideoModelMap, videoRouteToKieModelMap } = getResolvedKieRoutingMaps();
    let kieModelId = kieVideoModelMap[modelId] ?? videoRouteToKieModelMap[modelId] ?? modelId;

    if (dynamicVideoModel) {
      kieModelId = dynamicVideoModel.api_route || dynamicVideoModel.id;
    }

    let creditsToCharge: number;
    try {
      const normalizedGoogleForCost = isGoogleVideoRoute(modelId) ? normalizeGoogleVideoOptions(modelId, { duration, resolution, aspectRatio, referenceImageCount: safeReferenceImageUrls.length, hasVideoInput: Boolean(videoUrl || safeVideoUrls.length), hasStartImage: Boolean(firstFrameUrl || imageUrl || safeImageUrls.length), hasEndImage: Boolean(lastFrameUrl) }) : null;
      creditsToCharge = getVideoCreditsByModelId(kieModelId, {
        duration: normalizedGoogleForCost?.duration ?? duration,
        resolution: normalizedGoogleForCost?.resolution ?? resolution,
        generate_audio: enableAudio === true,
        reference_video_urls: safeReferenceVideoUrls.length ? safeReferenceVideoUrls : videoUrl ? [videoUrl] : [],
      });
      if (!creditsToCharge || creditsToCharge <= 0) creditsToCharge = 12;
    } catch {
      creditsToCharge = 12; // fallback: 12 credits
    }

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "VIDEO",
      modelUsed: modelId,
      duration: duration !== undefined ? Number(duration) : null,
      resolution: resolution || null,
      aspectRatio: aspectRatio || null,
      quality: mode || null,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const isGoogle = modelId.includes("google") || modelId.includes("veo") || modelId.includes("gemini");
    const isSeedance25 = modelId.startsWith("bytedance/seedance-2.5") || kieModelId.startsWith("bytedance/seedance-2.5");
    const isSeedance2 = !isSeedance25 && (modelId.includes("seedance") || modelId.includes("bytedance")) && (modelId.includes("v2") || modelId.includes("-2"));
    const isKlingModel = modelId.includes("kling") || kieModelId.includes("kling");

    if (isGoogle || isSeedance2 || isKlingModel) {
      const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
      if (!kieApiKey) throw new Error("KIE API key not configured on server.");

      const isSeedance = kieModelId.includes("seedance") || kieModelId.includes("bytedance");
      const isKling = kieModelId.includes("kling");

      const input: Record<string, unknown> = {
        prompt: sanitizePrompt(prompt, 5000),
        // Seedance: duration must be integer [4-15]; Kling/others: string "5"|"10"
        duration: isSeedance
          ? Math.max(4, Math.min(15, Number(duration) || 5))
          : String(duration),
        aspect_ratio: aspectRatio,
      };

      const startFrameUrl = firstFrameUrl ?? imageUrl ?? safeImageUrls[0];
      const endFrameUrl = lastFrameUrl ?? safeImageUrls[1];

      // Add reference inputs
      if (isKling) {
        const klingFrames = [startFrameUrl, endFrameUrl].filter((url): url is string => typeof url === "string" && url.length > 0);
        if (klingFrames.length) {
          input.image_urls = klingFrames.slice(0, 2);
        }
      } else if (isSeedance) {
        if (safeReferenceImageUrls.length) {
          input.reference_image_urls = safeReferenceImageUrls.slice(0, 9);
        } else {
          if (startFrameUrl) input.first_frame_url = startFrameUrl;
          if (endFrameUrl) input.last_frame_url = endFrameUrl;
        }
        if (safeReferenceVideoUrls.length) {
          input.reference_video_urls = safeReferenceVideoUrls.slice(0, 3);
        } else if (videoUrl) {
          input.reference_video_urls = [videoUrl];
        }
        if (safeReferenceAudioUrls.length) {
          input.reference_audio_urls = safeReferenceAudioUrls.slice(0, 3);
        } else if (safeAudioUrls.length) {
          input.reference_audio_urls = safeAudioUrls.slice(0, 3);
        }
      } else if (startFrameUrl) {
        input.image_url = startFrameUrl;
      }

      // Model-specific settings
      if (isKling) {
        if (modelId.includes("kling-3.0") || kieModelId.includes("kling-3.0")) {
          const klingMode = typeof mode === "string" && mode.trim()
            ? mode.trim()
            : (resolution === "4K" ? "4K" : (resolution === "720p" ? "std" : "pro"));
          input.mode = klingMode;
          // The plugin page uses Kling 3 as normal text-to-video or reference-to-video.
          // Explicitly disable multi-shot so KIE does not expect a multi_shots payload.
          input.multi_shots = false;
          input.multi_prompt = [];
          input.sound = false;
        } else if (resolution) {
          input.resolution = resolution;
        }
      }

      // Seedance: generate_audio defaults to TRUE (extra cost) — always disable unless explicitly set
      if (isSeedance) {
        input.generate_audio = enableAudio === true;
        // resolution for Seedance: 480p/720p/1080p
        if (resolution) input.resolution = resolution.toLowerCase();
      }

      const taskId = await createKieTask(kieApiKey, kieModelId, input);
      const videoUrls = await pollKieTask(kieApiKey, taskId);

      if (generationId && videoUrls[0]) {
        await setGenerationMediaUrl(generationId, videoUrls[0]).catch(() => {});
      }

      return NextResponse.json({ videoUrls, videoUrl: videoUrls[0] ?? null, taskId, generationId });
    } else {
      // WaveSpeed for all other video models
      const wavespeedKey = process.env.WAVESPEED_API_KEY;
      if (!wavespeedKey) throw new Error("WaveSpeed API key not configured on server.");

      let wavespeedModel = resolveWaveSpeedModelRoute(modelId, { resolution, mode });
      const isSeedance25 = wavespeedModel.startsWith("bytedance/seedance-2.5");
      if (isSeedance25 && wavespeedModel === "bytedance/seedance-2.5/text-to-video-turbo" && (imageUrl || firstFrameUrl || safeImageUrls.length || safeReferenceImageUrls.length)) {
        wavespeedModel = "bytedance/seedance-2.5/image-to-video-turbo";
      }
      const isKling = wavespeedModel.includes("kling");

      const isGrokEdit = wavespeedModel === "x-ai/grok-imagine-video/edit-video"
        || wavespeedModel === "x-ai/grok-imagine-video/edit-video-1-5";
      const payload: Record<string, unknown> = {
        prompt: sanitizePrompt(prompt, 5000),
        duration: isKling || isGrokEdit ? String(duration) : duration,
        aspect_ratio: aspectRatio,
      };
      if (isSeedance25) {
        const normalizedDuration = Math.max(4, Math.min(30, Number(duration) || 5));
        const normalizedResolution = String(resolution || "720p").toLowerCase();
        payload.duration = normalizedDuration;
        payload.generate_audio = enableAudio !== false;
        payload.resolution = wavespeedModel.endsWith("image-to-video-spicy")
          ? (["480p", "720p", "1080p", "4k"].includes(normalizedResolution) ? normalizedResolution : "720p")
          : (normalizedResolution === "1080p" ? "1080p" : "720p");
        if (wavespeedModel.endsWith("text-to-video-turbo")) {
          if (safeReferenceImageUrls.length) payload.reference_images = safeReferenceImageUrls.slice(0, 30);
          if (safeReferenceVideoUrls.length || videoUrl) payload.reference_videos = (safeReferenceVideoUrls.length ? safeReferenceVideoUrls : [videoUrl].filter(Boolean)).slice(0, 10);
          if (safeReferenceAudioUrls.length || safeAudioUrls.length) payload.reference_audios = (safeReferenceAudioUrls.length ? safeReferenceAudioUrls : safeAudioUrls).slice(0, 10);
        } else {
          const startFrameUrl = firstFrameUrl ?? imageUrl ?? safeImageUrls[0] ?? safeReferenceImageUrls[0];
          const endFrameUrl = lastFrameUrl ?? safeImageUrls[1] ?? safeReferenceImageUrls[1];
          if (startFrameUrl) payload.image = startFrameUrl;
          if (endFrameUrl) payload.last_image = endFrameUrl;
        }
      }
      if (typeof mode === "string" && mode.trim() && isKling) {
        payload.mode = mode.trim();
      }
      if (isGrokEdit) {
        const allowedAspect = wavespeedModel.endsWith("-1-5")
          ? ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
          : ["2:3", "3:2", "1:1", "16:9", "9:16"];
        const allowedResolution = ["480p", "720p"];
        const allowedMode = ["fun", "normal", "spicy"];
        if (!allowedAspect.includes(aspectRatio)) {
          payload.aspect_ratio = wavespeedModel.endsWith("-1-5") ? "16:9" : "2:3";
        }
        const normalizedResolution = String(resolution || "").toLowerCase();
        payload.resolution = allowedResolution.includes(normalizedResolution) ? normalizedResolution : "720p";
        const normalizedMode = String(mode || "").toLowerCase();
        if (allowedMode.includes(normalizedMode)) {
          payload.mode = normalizedMode;
        } else {
          payload.mode = "normal";
        }
      }

      if (wavespeedModel === "wavespeed-ai/cinematic-video-generator") {
        if (safeImageUrls.length) {
          payload.images = safeImageUrls.slice(0, 4);
        } else if (imageUrl) {
          payload.images = [imageUrl];
        }
      } else if (isGrokEdit) {
        if (safeImageUrls.length) {
          payload.image_urls = safeImageUrls.slice(0, 7);
        } else if (imageUrl) {
          payload.image_urls = [imageUrl];
        }
      } else if (imageUrl) {
        if (wavespeedModel.includes("kling-v3.0") || wavespeedModel.includes("motion-control")) {
          payload.image_urls = [imageUrl];
        } else {
          payload.image_url = imageUrl;
        }
      }

      const taskId = await createWaveSpeedTask(wavespeedKey, wavespeedModel, payload);
      const videoUrls = await pollWaveSpeedTask(wavespeedKey, taskId);

      if (generationId && videoUrls[0]) {
        await setGenerationMediaUrl(generationId, videoUrls[0]).catch(() => {});
      }

      return NextResponse.json({ videoUrls, videoUrl: videoUrls[0] ?? null, taskId, generationId });
    }
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance },
        { status: 402 },
      );
    }
    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }
    console.error("[panel/generate/video]", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

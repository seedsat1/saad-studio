import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { applyImageWatermark } from "@/lib/watermark";
import { InsufficientCreditsError } from "@/lib/credit-ledger";
import { runInlineGeneration } from "@/lib/generation/inline-orchestrator";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl } from "@/lib/security";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_IMAGE_UPSCALER_MODEL = "wavespeed-ai/image-upscaler";
const WAVESPEED_VIDEO_UPSCALER_MODEL = "wavespeed-ai/video-upscaler";

interface WaveSpeedResponse {
  code?: number;
  message?: string;
  msg?: string;
  data?: Record<string, unknown>;
}

function getWaveSpeedKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured.");
  return key;
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
    const candidates = [rec.outputs, rec.resultUrls, rec.urls, rec.images, rec.result, rec.imageUrl, rec.videoUrl, rec.url, rec.output];
    for (const candidate of candidates) {
      const out = extractOutputs(candidate);
      if (out.length) return out;
    }
  }
  return [];
}

function parseBase64DataUrl(raw: string) {
  const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg").replace("mpeg", "mp4") || "bin";
  return { mime, fileData, ext };
}

async function uploadDataUrlToWaveSpeed(mediaDataUrl: string, apiKey: string): Promise<string> {
  const parsed = parseBase64DataUrl(mediaDataUrl);
  if (!parsed) return mediaDataUrl;

  const buffer = Buffer.from(parsed.fileData, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: parsed.mime }), `upscale-input.${parsed.ext}`);

  const uploadRes = await fetchWithTimeout(
    `${WAVESPEED_BASE_URL}/media/upload/binary`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    },
    45_000,
  );

  const uploadJson = (await uploadRes.json().catch(() => null)) as WaveSpeedResponse | null;
  const url =
    (uploadJson?.data?.download_url as string | undefined) ||
    (uploadJson?.data?.url as string | undefined);

  if (!uploadRes.ok || !url) {
    throw new Error(uploadJson?.msg || uploadJson?.message || "WaveSpeed media upload failed.");
  }

  return url;
}

async function pollWaveSpeedTask(taskId: string, apiKey: string, maxAttempts = 90, intervalMs = 2500): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      30_000,
    );

    const json = (await res.json().catch(() => null)) as WaveSpeedResponse | null;
    if (!res.ok || (json?.code != null && json.code !== 200)) {
      throw new Error(json?.msg || json?.message || `WaveSpeed polling failed (${res.status})`);
    }

    const data = (json?.data ?? {}) as Record<string, unknown>;
    const status = String(data.status || data.taskStatus || "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const outputs = extractOutputs(data.outputs || data.result || data.resultJson || data.response);
      if (!outputs.length) throw new Error("No output URL in WaveSpeed upscale result.");
      return outputs;
    }
    if (["fail", "failed", "error", "canceled", "cancelled", "timeout"].includes(status)) {
      throw new Error(String(data.error || data.errorMessage || "Upscale failed."));
    }
  }
  throw new Error("Upscale timed out.");
}

function readScale(body: Record<string, unknown>, resolution: string): string {
  if (body.scale && ["1", "2", "4", "8"].includes(String(body.scale))) {
    return String(body.scale);
  }
  const resolutionMap: Record<string, string> = { "480": "1", "720": "2", "1080": "8" };
  return resolutionMap[resolution] || "2";
}

function resolveTargetResolution(input: { isVideo: boolean; resolution: string; scaleFactor: string }): string {
  if (input.isVideo) {
    const byScale: Record<string, string> = { "1": "720p", "2": "1080p", "4": "4k", "8": "4k" };
    return byScale[input.scaleFactor] || "1080p";
  }

  const byScale: Record<string, string> = { "1": "2k", "2": "4k", "4": "4k", "8": "8k" };
  return byScale[input.scaleFactor] || "4k";
}

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`upscale:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";
    const mediaUrl = imageUrl || videoUrl;

    if (!mediaUrl) {
      return NextResponse.json({ error: "imageUrl or videoUrl is required." }, { status: 400 });
    }
    if (!(mediaUrl.startsWith("data:") || isSafePublicHttpUrl(mediaUrl))) {
      return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
    }

    const isVideo = Boolean(
      videoUrl ||
      mediaUrl.startsWith("data:video/") ||
      mediaUrl.match(/\.(mp4|webm|mov|mkv|3gp|avi|ogg)(?:[?#].*)?$/i),
    );
    const resolution = String(body.resolution || (isVideo ? "720" : "720"));
    const scaleFactor = readScale(body, resolution);
    const targetResolution = resolveTargetResolution({ isVideo, resolution, scaleFactor });
    const modelToUse = isVideo ? WAVESPEED_VIDEO_UPSCALER_MODEL : WAVESPEED_IMAGE_UPSCALER_MODEL;
    const duration = Math.max(5, Math.ceil(Number(body.duration) || 5));

    const creditsToCharge = await getGenerationCost("tool:upscale", isVideo ? duration : 0, 1, targetResolution);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: "No credit configuration for upscale tool." }, { status: 400 });
    }

    const result = await runInlineGeneration({
      modelId: "tool:upscale",
      modality: isVideo ? "video" : "image",
      currentRoute: { provider: "wavespeed", route: modelToUse },
      charge: {
        userId,
        credits: creditsToCharge,
        prompt: isVideo ? `Upscale video to ${targetResolution}` : `Upscale image to ${targetResolution}`,
        assetType: isVideo ? "VIDEO" : "IMAGE",
        modelUsed: modelToUse,
      },
      attachMediaFailure: "log",
      logPrefix: "upscale",
      execute: async () => {
        const waveKey = getWaveSpeedKey();
        const normalizedMediaUrl = mediaUrl.startsWith("data:")
          ? await uploadDataUrlToWaveSpeed(mediaUrl, waveKey)
          : mediaUrl;

        const submitBody = isVideo
          ? {
              video: normalizedMediaUrl,
              target_resolution: targetResolution,
            }
          : {
              image: normalizedMediaUrl,
              target_resolution: targetResolution,
              output_format: "jpeg",
              enable_base64_output: false,
            };

        const submitRes = await fetchWithTimeout(
          `${WAVESPEED_BASE_URL}/${modelToUse}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${waveKey}`,
            },
            body: JSON.stringify(submitBody),
          },
          30_000,
        );

        if (!submitRes.ok) {
          const errText = await readErrorBody(submitRes);
          throw new Error(`WaveSpeed submit failed: ${errText}`);
        }

        const submitJson = (await submitRes.json().catch(() => null)) as WaveSpeedResponse | null;
        if (submitJson?.code != null && submitJson.code !== 200) {
          throw new Error(submitJson.msg || submitJson.message || "WaveSpeed task submission failed.");
        }

        const taskId = (submitJson?.data?.id as string | undefined) || (submitJson?.data?.taskId as string | undefined);
        if (!taskId) throw new Error("No task ID returned.");

        const outputs = await pollWaveSpeedTask(taskId, waveKey);
        return { mediaUrl: outputs[0], taskId };
      },
    });
    const rawUrl = result.providerResult.mediaUrl;
    const url = isVideo ? rawUrl : await applyImageWatermark(rawUrl, { userId, generationId: result.generationId });

    return NextResponse.json(
      {
        generationId: result.generationId,
        imageUrl: isVideo ? undefined : url,
        videoUrl: isVideo ? url : undefined,
        mediaUrl: url,
        provider: "wavespeed",
        modelUsed: modelToUse,
        chargedCredits: creditsToCharge,
      },
      { status: 200 },
    );
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

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

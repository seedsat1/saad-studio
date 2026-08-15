import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError } from "@/lib/credit-ledger";
import { runInlineGeneration } from "@/lib/generation/inline-orchestrator";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl } from "@/lib/security";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_WATERMARK_REMOVER_MODEL = "wavespeed-ai/video-watermark-remover";

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
    const candidates = [rec.outputs, rec.resultUrls, rec.urls, rec.images, rec.result, rec.imageUrl, rec.url, rec.output];
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
  const ext = mime.split("/")[1]?.replace("mpeg", "mp4") || "mp4";
  return { mime, fileData, ext };
}

async function uploadDataUrlToWaveSpeed(videoDataUrl: string, apiKey: string): Promise<string> {
  const parsed = parseBase64DataUrl(videoDataUrl);
  if (!parsed) return videoDataUrl;

  const buffer = Buffer.from(parsed.fileData, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: parsed.mime }), `watermark-remove.${parsed.ext}`);

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
    throw new Error(uploadJson?.msg || uploadJson?.message || "WaveSpeed video upload failed.");
  }

  return url;
}

async function pollWaveSpeedTask(taskId: string, apiKey: string, maxAttempts = 60, intervalMs = 3000): Promise<string[]> {
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
      if (!outputs.length) throw new Error("No output URL in WaveSpeed result.");
      return outputs;
    }
    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(String(data.error || data.errorMessage || "Watermark removal failed."));
    }
  }
  throw new Error("Watermark removal timed out.");
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
    const rate = checkRateLimit(`watermark-remove:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    const videoUrl = body?.videoUrl as string | undefined;
    // Billed duration in seconds (rounded up), with 5-second minimum
    const duration = Math.max(5, Math.ceil(Number(body?.duration) || 5));

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required." }, { status: 400 });
    }

    const isVideoOk = videoUrl.startsWith("data:") || isSafePublicHttpUrl(videoUrl);
    if (!isVideoOk) {
      return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
    }

    // Get cost dynamically for duration
    const creditsToCharge = await getGenerationCost("tool:watermark-remover", duration);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: "No credit configuration for watermark remover." }, { status: 400 });
    }

    const result = await runInlineGeneration({
      modelId: "tool:watermark-remover",
      modality: "video",
      currentRoute: { provider: "wavespeed", route: WAVESPEED_WATERMARK_REMOVER_MODEL },
      charge: {
        userId,
        credits: creditsToCharge,
        prompt: "Watermark removal",
        assetType: "VIDEO",
        modelUsed: WAVESPEED_WATERMARK_REMOVER_MODEL,
      },
      attachMediaFailure: "log",
      logPrefix: "watermark-remove",
      execute: async () => {
        const waveKey = getWaveSpeedKey();
        const sourceVideo = videoUrl.startsWith("data:")
          ? await uploadDataUrlToWaveSpeed(videoUrl, waveKey)
          : videoUrl;

        const submitRes = await fetchWithTimeout(
          `${WAVESPEED_BASE_URL}/${WAVESPEED_WATERMARK_REMOVER_MODEL}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${waveKey}`,
            },
            body: JSON.stringify({
              video: sourceVideo,
            }),
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
    const url = result.providerResult.mediaUrl;

    return NextResponse.json({ generationId: result.generationId, imageUrl: url, videoUrl: url }, { status: 200 });
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePlainText } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — long enough for large video transcription

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WHISPER_MODELS = new Set([
  "wavespeed-ai/openai-whisper",
  "wavespeed-ai/openai-whisper-turbo",
  "wavespeed-ai/openai-whisper-with-video",
] as const);

type WhisperModel = "wavespeed-ai/openai-whisper" | "wavespeed-ai/openai-whisper-turbo" | "wavespeed-ai/openai-whisper-with-video";

interface WaveSpeedApiResponse {
  code?: number;
  msg?: string;
  message?: string;
  data?: Record<string, unknown>;
}

function getWaveSpeedKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured.");
  return key;
}

async function uploadFileToWaveSpeed(file: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name || "media-input.bin");

  const uploadRes = await fetchWithTimeout(
    `${WAVESPEED_BASE_URL}/media/upload/binary`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
    60_000,
  );

  const uploadJson = (await uploadRes.json().catch(() => null)) as WaveSpeedApiResponse | null;
  const url =
    (uploadJson?.data?.download_url as string | undefined) ||
    (uploadJson?.data?.url as string | undefined) ||
    (uploadJson?.data?.downloadUrl as string | undefined);

  if (!uploadRes.ok || !url) {
    throw new Error(uploadJson?.msg || uploadJson?.message || "WaveSpeed media upload failed.");
  }

  return url;
}

function firstUrl(input: unknown): string {
  if (!input) return "";
  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) return input;
    return "";
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = firstUrl(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const candidates = [
      rec.caption_url,
      rec.captionUrl,
      rec.subtitle_url,
      rec.subtitleUrl,
      rec.vtt_url,
      rec.srt_url,
      rec.url,
      rec.output,
      rec.outputs,
      rec.result,
      rec.resultJson,
      rec.response,
    ];
    for (const candidate of candidates) {
      const found = firstUrl(candidate);
      if (found) return found;
    }
  }
  return "";
}

function firstText(input: unknown): string {
  if (!input) return "";
  if (typeof input === "string") {
    const t = input.trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return "";
    return t;
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = firstText(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const candidates = [
      rec.text,
      rec.transcript,
      rec.transcription,
      rec.caption,
      rec.captions,
      rec.subtitle,
      rec.subtitles,
      rec.output_text,
      rec.outputText,
      rec.result,
      rec.resultJson,
      rec.response,
    ];
    for (const candidate of candidates) {
      const found = firstText(candidate);
      if (found) return found;
    }
  }
  return "";
}

async function pollWaveSpeedTask(taskId: string, apiKey: string): Promise<{ text: string; captionUrl: string; raw: unknown }> {
  // Total budget ~ 4.8 min — must stay under Vercel maxDuration (5 min)
  const maxAttempts = 144;
  const intervalMs = 2_000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
      30_000,
    );

    const json = (await res.json().catch(() => null)) as WaveSpeedApiResponse | null;
    if (!res.ok || (json?.code != null && json.code !== 200)) {
      throw new Error(json?.msg || json?.message || `WaveSpeed polling failed (${res.status}).`);
    }

    const data = (json?.data ?? {}) as Record<string, unknown>;
    const status = String(data.status || data.taskStatus || data.state || "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const text = firstText(data);
      const captionUrl = firstUrl(data);
      return { text, captionUrl, raw: data };
    }
    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(String(data.error || data.errorMessage || data.failMsg || "Caption generation failed."));
    }
  }

  throw new Error("Caption generation timed out.");
}

function ensureAllowedModel(input: unknown): WhisperModel {
  const model = typeof input === "string" ? input.trim() : "";
  if (!WHISPER_MODELS.has(model as WhisperModel)) {
    throw new Error("Unsupported model.");
  }
  return model as WhisperModel;
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
    const rate = checkRateLimit(`captions:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const apiKey = getWaveSpeedKey();

    const contentType = req.headers.get("content-type") || "";
    let model: WhisperModel;
    let mediaUrl = "";
    let language = "auto";
    let outputFormat = "text";

    if (contentType.toLowerCase().includes("multipart/form-data")) {
      const form = await req.formData();
      model = ensureAllowedModel(form.get("model"));
      language = sanitizePlainText(String(form.get("language") || "auto"), 20) || "auto";
      outputFormat = sanitizePlainText(String(form.get("outputFormat") || "text"), 20) || "text";

      const upload = form.get("file");
      if (upload instanceof File && upload.size > 0) {
        mediaUrl = await uploadFileToWaveSpeed(upload, apiKey);
      }

      if (!mediaUrl) {
        mediaUrl = String(form.get("mediaUrl") || "").trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      model = ensureAllowedModel(body?.model);
      language = sanitizePlainText(String(body?.language || "auto"), 20) || "auto";
      outputFormat = sanitizePlainText(String(body?.outputFormat || "text"), 20) || "text";
      mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Provide mediaUrl or upload a file." }, { status: 400 });
    }
    if (!isSafePublicHttpUrl(mediaUrl)) {
      return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      language,
      output_format: outputFormat,
      response_format: outputFormat,
    };

    if (model === "wavespeed-ai/openai-whisper-with-video") {
      payload.video = mediaUrl;
    } else {
      payload.audio = mediaUrl;
    }

    const submitRes = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      45_000,
    );

    if (!submitRes.ok) {
      const errBody = await readErrorBody(submitRes);
      throw new Error(`WaveSpeed submit failed: ${errBody}`);
    }

    const submitJson = (await submitRes.json().catch(() => null)) as WaveSpeedApiResponse | null;
    if (submitJson?.code != null && submitJson.code !== 200) {
      throw new Error(submitJson?.msg || submitJson?.message || "WaveSpeed task submission failed.");
    }

    const taskId =
      (submitJson?.data?.id as string | undefined) ||
      (submitJson?.data?.taskId as string | undefined);

    if (!taskId) {
      throw new Error("No prediction id returned from WaveSpeed.");
    }

    // Async mode: return taskId immediately, client polls /status endpoint.
    // This bypasses Vercel's serverless time limit entirely.
    const isAsync =
      req.nextUrl.searchParams.get("async") === "1" ||
      req.headers.get("x-async") === "1";
    if (isAsync) {
      return NextResponse.json({ taskId, status: "pending" }, { status: 202 });
    }

    const result = await pollWaveSpeedTask(taskId, apiKey);

    return NextResponse.json(
      {
        text: result.text,
        captionUrl: result.captionUrl,
        raw: result.raw,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[captions API] 500:", message, stack);
    return NextResponse.json({ error: message, detail: stack?.split("\n").slice(0, 3).join(" | ") }, { status: 500 });
  }
}
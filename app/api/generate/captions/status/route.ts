import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchWithTimeout } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";

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
      rec.caption_url, rec.captionUrl, rec.subtitle_url, rec.subtitleUrl,
      rec.url, rec.download_url, rec.downloadUrl, rec.output, rec.outputs,
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
      rec.text, rec.transcript, rec.transcription, rec.caption, rec.captions,
      rec.subtitle, rec.subtitles, rec.output_text, rec.outputText, rec.result,
      rec.resultJson, rec.response,
    ];
    for (const candidate of candidates) {
      const found = firstText(candidate);
      if (found) return found;
    }
  }
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId || !/^[a-zA-Z0-9_-]{1,128}$/.test(taskId)) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }

    const apiKey = getWaveSpeedKey();
    const res = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      20_000,
    );

    const json = (await res.json().catch(() => null)) as WaveSpeedApiResponse | null;
    if (!res.ok || (json?.code != null && json.code !== 200)) {
      return NextResponse.json(
        { status: "failed", error: json?.msg || json?.message || `WaveSpeed status ${res.status}` },
        { status: 200 },
      );
    }

    const data = (json?.data ?? {}) as Record<string, unknown>;
    const status = String(data.status || data.taskStatus || data.state || "pending").toLowerCase();

    if (["success", "completed", "done"].includes(status)) {
      const text = firstText(data);
      const captionUrl = firstUrl(data);
      // Log structure when both extractors fail to help diagnose new response shapes
      if (!text && !captionUrl) {
        console.warn("[captions/status] WaveSpeed done but no text/url found. Raw keys:",
          Object.keys(data), "Sample:", JSON.stringify(data).slice(0, 800));
      }
      return NextResponse.json({
        status: "done",
        text,
        captionUrl,
        raw: data,
      });
    }
    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      return NextResponse.json({
        status: "failed",
        error: String(data.error || data.errorMessage || data.failMsg || "Caption generation failed."),
      });
    }

    return NextResponse.json({ status: "pending", progress: data.progress ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed.";
    return NextResponse.json({ status: "failed", error: message }, { status: 200 });
  }
}

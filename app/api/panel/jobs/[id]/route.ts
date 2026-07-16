import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow, rollbackGenerationCharge, setGenerationMediaUrl } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";

type WaveSpeedPredictionResponse = {
  data?: Record<string, unknown>;
  status?: string;
  outputs?: unknown;
  result?: unknown;
  response?: unknown;
  url?: unknown;
  imageUrl?: unknown;
  videoUrl?: unknown;
  downloadUrl?: unknown;
};

function extractUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];
    try { return extractUrls(JSON.parse(trimmed)); } catch { return []; }
  }
  if (Array.isArray(value)) return value.flatMap((item) => extractUrls(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["outputs", "result", "response", "data", "url", "imageUrl", "videoUrl", "downloadUrl"]) {
      const urls = extractUrls(record[key]);
      if (urls.length) return urls;
    }
  }
  return [];
}

function toKind(assetType: string): "image" | "video" | "audio" {
  const upper = assetType.toUpperCase();
  if (upper === "VIDEO") return "video";
  if (upper === "AUDIO") return "audio";
  return "image";
}

function taskIdFromGeneration(generation: { mediaUrl: string | null; providerRequestId: string | null }): string {
  const provider = generation.providerRequestId?.trim();
  if (provider) return provider;
  const marker = generation.mediaUrl?.trim() ?? "";
  return marker.startsWith("task:") ? marker.slice("task:".length) : "";
}

function generationResult(generation: {
  id: string;
  prompt: string;
  mediaUrl: string | null;
  assetType: string;
  modelUsed: string;
  aspectRatio: string | null;
  duration: number | null;
  createdAt: Date;
}) {
  return {
    id: generation.id,
    kind: toKind(generation.assetType),
    url: generation.mediaUrl ?? "",
    thumbnailUrl: generation.mediaUrl ?? undefined,
    prompt: generation.prompt,
    model: generation.modelUsed,
    aspect: generation.aspectRatio ?? undefined,
    durationSec: typeof generation.duration === "number" ? generation.duration : undefined,
    createdAt: generation.createdAt.toISOString(),
  };
}

async function fetchWaveSpeedOnce(apiKey: string, taskId: string): Promise<
  | { status: "running" }
  | { status: "succeeded"; urls: string[] }
  | { status: "failed"; error: string }
> {
  const resultRes = await fetch(`${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (resultRes.ok) {
    const json = await resultRes.json().catch(() => ({})) as WaveSpeedPredictionResponse;
    const data = json.data ?? {};
    const status = String(data.status || json.status || "").toLowerCase();
    if (["failed", "fail", "error", "cancelled", "canceled"].includes(status)) {
      return { status: "failed", error: String(data.error || data.errorMessage || "WaveSpeed generation failed.") };
    }
    const urls = extractUrls(json);
    if (urls.length && (!status || ["completed", "success", "done"].includes(status))) return { status: "succeeded", urls };
    return { status: "running" };
  }

  if (![404, 409, 425].includes(resultRes.status)) {
    return { status: "failed", error: `WaveSpeed result polling failed: ${resultRes.status}` };
  }

  const statusRes = await fetch(`${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!statusRes.ok) {
    return [404, 409, 425].includes(statusRes.status)
      ? { status: "running" }
      : { status: "failed", error: `WaveSpeed polling failed: ${statusRes.status}` };
  }

  const json = await statusRes.json().catch(() => ({})) as WaveSpeedPredictionResponse;
  const data = json.data ?? {};
  const status = String(data.status || json.status || "").toLowerCase();
  if (["failed", "fail", "error", "cancelled", "canceled"].includes(status)) {
    return { status: "failed", error: String(data.error || data.errorMessage || "WaveSpeed generation failed.") };
  }
  if (["completed", "success", "done"].includes(status)) {
    const urls = extractUrls(json);
    return urls.length ? { status: "succeeded", urls } : { status: "running" };
  }
  return { status: "running" };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });

  try {
    await ensureUserRow(verified.userId);
    const { id } = await params;
    const generationId = String(id ?? "").trim();
    if (!generationId) return NextResponse.json({ error: "Job id is required." }, { status: 400 });

    const generation = await prismadb.generation.findFirst({
      where: { id: generationId, userId: verified.userId },
      select: {
        id: true,
        prompt: true,
        mediaUrl: true,
        assetType: true,
        modelUsed: true,
        cost: true,
        status: true,
        providerRequestId: true,
        aspectRatio: true,
        duration: true,
        createdAt: true,
      },
    });

    if (!generation) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    if (generation.status === "failed") {
      return NextResponse.json({ id: generation.id, status: "failed", progress: 100, result: null, error: "Generation failed." });
    }
    if (generation.mediaUrl && !generation.mediaUrl.startsWith("task:")) {
      return NextResponse.json({ id: generation.id, status: "succeeded", progress: 100, result: generationResult(generation) });
    }

    const taskId = taskIdFromGeneration(generation);
    if (!taskId) return NextResponse.json({ id: generation.id, status: "running", progress: 15, result: null });

    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) throw new Error("WAVESPEED_API_KEY is not configured on server.");

    const waveSpeed = await fetchWaveSpeedOnce(apiKey, taskId);
    if (waveSpeed.status === "running") return NextResponse.json({ id: generation.id, status: "running", progress: 45, result: null });
    if (waveSpeed.status === "failed") {
      await rollbackGenerationCharge(generation.id, verified.userId, Number(generation.cost ?? 0)).catch(() => {});
      return NextResponse.json({ id: generation.id, status: "failed", progress: 100, result: null, error: waveSpeed.error });
    }

    const outputUrl = waveSpeed.urls[0];
    await setGenerationMediaUrl(generation.id, outputUrl);
    const completed = await prismadb.generation.findUnique({
      where: { id: generation.id },
      select: { id: true, prompt: true, mediaUrl: true, assetType: true, modelUsed: true, aspectRatio: true, duration: true, createdAt: true },
    });

    return NextResponse.json({
      id: generation.id,
      status: "succeeded",
      progress: 100,
      result: completed ? generationResult(completed) : {
        id: generation.id,
        kind: toKind(generation.assetType),
        url: outputUrl,
        prompt: generation.prompt,
        model: generation.modelUsed,
        createdAt: generation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[panel/jobs/:id]", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
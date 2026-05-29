import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";
import { isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const IMAGE_MODEL_ROUTE = "wavespeed-ai/image-zoom-out";
const VIDEO_MODEL_ROUTE = "wavespeed-ai/video-outpainter";

type WaveSpeedPredictionResponse = {
  data?: {
    id?: string;
    status?: string;
    outputs?: unknown;
    error?: string;
    errorMessage?: string;
  };
  id?: string;
};

function extractUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];
    try {
      return extractUrls(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractUrls(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["outputs", "result", "response", "data", "url", "imageUrl", "videoUrl", "downloadUrl"]) {
      const urls = extractUrls(record[key]);
      if (urls.length) return urls;
    }
  }
  return [];
}

async function createWaveSpeedTask(
  apiKey: string,
  route: string,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE_URL}/${route}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({})) as WaveSpeedPredictionResponse;
  if (!res.ok) {
    throw new Error(`WaveSpeed submit failed: ${json?.data?.error || json?.data?.errorMessage || res.statusText}`);
  }

  const taskId = json?.data?.id || json?.id;
  if (!taskId) {
    throw new Error("WaveSpeed did not return a task ID.");
  }
  return String(taskId);
}

async function pollWaveSpeedTask(
  apiKey: string,
  taskId: string,
  maxAttempts = 80,
  intervalMs = 3500,
): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(`${WAVESPEED_BASE_URL}/predictions/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`WaveSpeed polling failed: ${res.status}`);
    }

    const json = await res.json().catch(() => ({})) as WaveSpeedPredictionResponse;
    const data = json?.data ?? {};
    const status = String(data.status || "").toLowerCase();

    if (["completed", "success", "done"].includes(status)) {
      const resultRes = await fetch(`${WAVESPEED_BASE_URL}/predictions/${taskId}/result`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resultRes.ok) {
        throw new Error(`WaveSpeed result polling failed: ${resultRes.status}`);
      }
      const resultJson = await resultRes.json().catch(() => ({}));
      const urls = extractUrls(resultJson);
      if (!urls.length) {
        throw new Error("WaveSpeed task succeeded but no output URL was returned.");
      }
      return urls;
    }

    if (["failed", "fail", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(String(data.error || data.errorMessage || "WaveSpeed generation failed."));
    }
  }

  throw new Error("Expand generation timed out.");
}

function aspectToDimensions(aspectRatio: string): { width: number; height: number } {
  const clean = aspectRatio.trim() || "1:1";
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1536, height: 1536 },
    "4:3": { width: 1536, height: 1152 },
    "3:4": { width: 1152, height: 1536 },
    "16:9": { width: 1536, height: 864 },
    "9:16": { width: 864, height: 1536 },
    "3:2": { width: 1536, height: 1024 },
    "2:3": { width: 1024, height: 1536 },
    "21:9": { width: 1536, height: 658 },
    "9:21": { width: 658, height: 1536 },
  };
  return map[clean] ?? map["1:1"];
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });
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
      inputUrl?: string;
      inputKind?: "image" | "video";
      aspectRatio?: string;
      prompt?: string;
      width?: number;
      height?: number;
      outputFormat?: "png" | "jpeg" | "webp";
    };

    const inputUrl = body.inputUrl?.trim() ?? "";
    const inputKind = body.inputKind === "video" ? "video" : "image";
    const aspectRatio = body.aspectRatio?.trim() || (inputKind === "video" ? "auto" : "16:9");
    const prompt = typeof body.prompt === "string" ? sanitizePrompt(body.prompt, 2000) : "";
    const outputFormat = body.outputFormat === "jpeg" || body.outputFormat === "webp" ? body.outputFormat : "png";

    if (!isSafePublicHttpUrl(inputUrl)) {
      return NextResponse.json({ error: "Please provide a valid public media URL." }, { status: 400 });
    }

    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WAVESPEED_API_KEY is not configured on server.");
    }

    const creditsToCharge = inputKind === "video" ? 12 : 2;
    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: prompt || (inputKind === "video" ? "Expand video" : "Expand image"),
      assetType: inputKind === "video" ? "VIDEO" : "IMAGE",
      modelUsed: inputKind === "video" ? VIDEO_MODEL_ROUTE : IMAGE_MODEL_ROUTE,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    let taskId = "";
    if (inputKind === "video") {
      const payload: Record<string, unknown> = {
        video: inputUrl,
        aspect_ratio: aspectRatio || "auto",
        seed: -1,
      };
      if (prompt) payload.prompt = prompt;
      taskId = await createWaveSpeedTask(apiKey, VIDEO_MODEL_ROUTE, payload);
    } else {
      const fallbackSize = aspectToDimensions(aspectRatio);
      const payload: Record<string, unknown> = {
        image: inputUrl,
        width: typeof body.width === "number" && body.width > 0 ? body.width : fallbackSize.width,
        height: typeof body.height === "number" && body.height > 0 ? body.height : fallbackSize.height,
        output_format: outputFormat,
      };
      taskId = await createWaveSpeedTask(apiKey, IMAGE_MODEL_ROUTE, payload);
    }

    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId).catch(() => {});
    }

    const urls = await pollWaveSpeedTask(apiKey, taskId);
    const mediaUrl = urls[0] ?? null;
    if (generationId && mediaUrl) {
      await setGenerationMediaUrl(generationId, mediaUrl).catch(() => {});
    }

    return NextResponse.json({
      id: generationId ?? taskId,
      status: "succeeded",
      progress: 100,
      result: mediaUrl
        ? {
            id: generationId ?? taskId,
            kind: inputKind,
            url: mediaUrl,
            prompt: prompt || undefined,
            model: inputKind === "video" ? VIDEO_MODEL_ROUTE : IMAGE_MODEL_ROUTE,
            aspect: aspectRatio,
            createdAt: new Date().toISOString(),
          }
        : null,
      taskId,
      generationId,
      mediaUrl,
      urls,
    });
  } catch (error) {
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

    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }

    console.error("[panel/generate/expand]", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

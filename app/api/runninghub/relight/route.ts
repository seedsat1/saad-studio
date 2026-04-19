import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 300;

const CREDIT_COST = 2;
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_MODEL = "wavespeed-ai/qwen-image/edit";

function getWavespeedApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured");
  return key;
}

/** Upload base64 image to Supabase Storage and return a public URL */
async function uploadRefImage(base64DataUrl: string, userId: string, genId: string): Promise<string> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URL for reference image");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image-ref",
    generationId: `${genId}-relight-ref`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image to storage");
  return url;
}

/** Submit a WaveSpeed edit task and return the prediction ID */
async function createWavespeedTask(
  apiKey: string,
  imageUrl: string,
  prompt: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    images: [imageUrl],
    prompt,
    output_format: "jpeg",
    seed: -1,
    enable_base64_output: false,
    enable_sync_mode: false,
  };

  const res = await fetch(`${WAVESPEED_BASE}/${WAVESPEED_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  const predId = json?.data?.id ?? json?.id;
  if (!res.ok || !predId) {
    throw new Error(
      `WaveSpeed submit failed (${res.status}): ${json?.message ?? json?.msg ?? JSON.stringify(json)}`,
    );
  }
  return predId as string;
}

/** Poll WaveSpeed prediction until completed/failed/timeout */
async function pollWavespeedTask(
  apiKey: string,
  predictionId: string,
  maxAttempts = 60,
  intervalMs = 2000,
): Promise<{ status: "success" | "fail" | "timeout"; urls: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}/result`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) continue;

    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    const status = String(data?.status ?? "").toLowerCase();

    if (status === "completed") {
      const outputs: string[] = Array.isArray(data?.outputs)
        ? data.outputs
        : Array.isArray(data?.output?.images)
          ? data.output.images
          : Array.isArray(data?.output)
            ? data.output
            : [];
      return { status: "success", urls: outputs };
    }

    if (status === "failed") {
      return { status: "fail", urls: [], error: data?.error ?? "WaveSpeed task failed" };
    }
  }

  return { status: "timeout", urls: [] };
}

/**
 * POST /api/runninghub/relight
 *
 * AI Relighting via WaveSpeed (wavespeed-ai/qwen-image/edit).
 * Body: { imageDataUrl, prompt? }
 */
export async function POST(req: NextRequest) {
  let generationId: string | null = null;
  let chargedUserId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`relight:${userId}:${ip}`, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as { imageDataUrl?: string; prompt?: string };
    const { imageDataUrl, prompt } = body;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid photo is required." }, { status: 400 });
    }

    const editPrompt = prompt?.trim() || "Relight the image with professional studio lighting, enhance depth, add dramatic cinematic light and shadow";

    const apiKey = getWavespeedApiKey();

    // Charge credits
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: editPrompt,
      assetType: "RELIGHT",
      modelUsed: "wavespeed/qwen-image-edit-relight",
    });
    generationId = spent.generationId;
    chargedUserId = userId;

    // Upload image to Supabase for a public URL
    const hostedImageUrl = await uploadRefImage(imageDataUrl, userId, generationId);

    // Submit WaveSpeed task
    const predId = await createWavespeedTask(apiKey, hostedImageUrl, editPrompt);

    // Poll for result
    const result = await pollWavespeedTask(apiKey, predId);

    if (result.status === "success" && result.urls.length > 0) {
      const outputUrl = result.urls[0];
      await setGenerationMediaUrl(generationId, outputUrl).catch(() => null);

      return NextResponse.json({
        output: outputUrl,
        generationId,
        remainingCredits: spent.remainingCredits,
      });
    }

    if (result.status === "fail") {
      await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
      return NextResponse.json(
        { error: result.error || "Relight generation failed." },
        { status: 502 },
      );
    }

    // Timeout
    await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
    return NextResponse.json(
      { error: "Generation timed out. Credits refunded." },
      { status: 504 },
    );
  } catch (err) {
    if (generationId && chargedUserId) {
      await rollbackGenerationCharge(generationId, chargedUserId, CREDIT_COST).catch(() => null);
    }

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }

    console.error("[RELIGHT_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

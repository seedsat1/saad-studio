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

/** Allow up to 5 minutes */
export const maxDuration = 300;

const CREDIT_PER_PANEL = 2;
const MAX_PANELS = 6;

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_MODEL = "wavespeed-ai/qwen-image/edit-2509-multiple-angles";

/**
 * Each panel is a unique camera angle/distance combo.
 * horizontal_angle: -90 (left), -45, 0 (front), 45, 90 (right)
 * vertical_angle:   -30 (low), 0 (eye level), 30 (elevated), 60 (high)
 * distance:         0 (close-up), 1 (medium), 2 (wide)
 */
const PANEL_ANGLES = [
  { horizontal_angle: 0,   vertical_angle: 0,   distance: 1, label: "Front – Medium" },
  { horizontal_angle: 45,  vertical_angle: 0,   distance: 0, label: "Right 45° – Close-up" },
  { horizontal_angle: -45, vertical_angle: 30,  distance: 1, label: "Left 45° – Elevated" },
  { horizontal_angle: 90,  vertical_angle: 0,   distance: 1, label: "Right 90° – Medium" },
  { horizontal_angle: 0,   vertical_angle: 60,  distance: 2, label: "Top-down – Wide" },
  { horizontal_angle: -90, vertical_angle: -30, distance: 0, label: "Left 90° – Low Close-up" },
];

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
    generationId: `${genId}-storyboard-ref`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image to storage");
  return url;
}

/** Submit a WaveSpeed task and return the prediction ID */
async function createWavespeedTask(
  apiKey: string,
  imageUrl: string,
  angle: (typeof PANEL_ANGLES)[number],
  prompt?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    images: [imageUrl],
    horizontal_angle: angle.horizontal_angle,
    vertical_angle: angle.vertical_angle,
    distance: angle.distance,
    output_format: "jpeg",
    seed: -1,
    enable_base64_output: false,
    enable_sync_mode: false,
  };
  if (prompt) body.prompt = prompt;

  const res = await fetch(`${WAVESPEED_BASE}/${WAVESPEED_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.id) {
    throw new Error(
      `WaveSpeed submit failed (${res.status}): ${json?.message ?? json?.msg ?? JSON.stringify(json)}`,
    );
  }
  return json.id as string;
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

    const res = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) continue;

    const json = await res.json().catch(() => ({}));
    const status = String(json?.status ?? "").toLowerCase();

    if (status === "completed") {
      const outputs: string[] = Array.isArray(json?.output?.images)
        ? json.output.images
        : Array.isArray(json?.outputs)
          ? json.outputs
          : Array.isArray(json?.output)
            ? json.output
            : [];
      if (outputs.length > 0) return { status: "success", urls: outputs };

      // Fallback: fetch the result endpoint
      const resultRes = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}/result`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => null);
      if (resultRes?.ok) {
        const resultJson = await resultRes.json().catch(() => ({}));
        const resultUrls: string[] = Array.isArray(resultJson?.output?.images)
          ? resultJson.output.images
          : Array.isArray(resultJson?.outputs)
            ? resultJson.outputs
            : Array.isArray(resultJson?.output)
              ? resultJson.output
              : [];
        if (resultUrls.length > 0) return { status: "success", urls: resultUrls };
      }
      return { status: "success", urls: [] };
    }

    if (status === "failed") {
      return { status: "fail", urls: [], error: json?.error ?? "WaveSpeed task failed" };
    }
    // pending / processing — keep polling
  }

  return { status: "timeout", urls: [] };
}

/**
 * POST /api/runninghub/storyboard-production
 *
 * Generates storyboard panels via WaveSpeed API (qwen-image/edit-2509-multiple-angles).
 * Each panel uses a different camera angle/distance.
 *
 * Body: { imageDataUrl, numPanels?, prompt? }
 */
export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`storyboard-prod:${userId}:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      numPanels?: number;
      prompt?: string;
    };

    const { imageDataUrl, prompt } = body;
    const numPanels = Math.max(1, Math.min(MAX_PANELS, body.numPanels ?? 4));

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const apiKey = getWavespeedApiKey();
    const totalCost = numPanels * CREDIT_PER_PANEL;

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: totalCost,
      prompt: `Storyboard Production – ${numPanels} panels`,
      assetType: "IMAGE",
      modelUsed: "wavespeed/qwen-image-edit-multiple-angles",
    });
    chargedCredits = totalCost;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to Supabase Storage
    const hostedImageUrl = await uploadRefImage(imageDataUrl, userId, generationId!);

    // Launch all panel tasks in parallel
    const predictionIds: string[] = [];
    for (let i = 0; i < numPanels; i++) {
      const angle = PANEL_ANGLES[i % PANEL_ANGLES.length];
      const predId = await createWavespeedTask(apiKey, hostedImageUrl, angle, prompt);
      predictionIds.push(predId);
    }

    // Poll all tasks
    const results = await Promise.all(
      predictionIds.map((pid) => pollWavespeedTask(apiKey, pid)),
    );

    const outputs: string[] = [];
    const failures: string[] = [];

    for (const r of results) {
      if (r.status === "success" && r.urls.length > 0) {
        outputs.push(r.urls[0]);
      } else {
        failures.push(r.error ?? "Panel generation failed");
      }
    }

    // If all failed, refund everything
    if (outputs.length === 0) {
      await rollbackGenerationCharge(generationId, userId, totalCost).catch(() => null);
      return NextResponse.json(
        { error: failures[0] || "All panels failed. Credits refunded." },
        { status: 502 },
      );
    }

    // If some failed, refund partial
    if (failures.length > 0) {
      const refund = failures.length * CREDIT_PER_PANEL;
      await rollbackGenerationCharge(generationId, userId, refund).catch(() => null);
    }

    await setGenerationMediaUrl(generationId, outputs[0]).catch(() => null);

    return NextResponse.json({
      outputs,
      generationId,
      totalPanels: numPanels,
      successfulPanels: outputs.length,
      remainingCredits: spent.remainingCredits,
    });
  } catch (err) {
    if (generationId && chargedUserId && chargedCredits > 0) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => null);
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

    console.error("[STORYBOARD_PRODUCTION_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

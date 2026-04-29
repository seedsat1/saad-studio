import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  refundGenerationCharge,
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

type StoryboardType = "production" | "short-drama" | "short-drama-2" | "comic-drama" | "comic-drama-2";

interface AnglePreset {
  horizontal_angle: number;
  vertical_angle: number;
  distance: number;
  label: string;
}

const ANGLE_PRESETS: Record<StoryboardType, AnglePreset[]> = {
  production: [
    { horizontal_angle: 0,   vertical_angle: 0,   distance: 1, label: "Front – Medium" },
    { horizontal_angle: 45,  vertical_angle: 0,   distance: 0, label: "Right 45° – Close-up" },
    { horizontal_angle: -45, vertical_angle: 30,  distance: 1, label: "Left 45° – Elevated" },
    { horizontal_angle: 90,  vertical_angle: 0,   distance: 1, label: "Right 90° – Medium" },
    { horizontal_angle: 0,   vertical_angle: 60,  distance: 2, label: "Top-down – Wide" },
    { horizontal_angle: -90, vertical_angle: -30, distance: 0, label: "Left 90° – Low Close-up" },
  ],
  "short-drama": [
    { horizontal_angle: 0,   vertical_angle: 0,   distance: 0, label: "Front – Close-up" },
    { horizontal_angle: 45,  vertical_angle: 15,  distance: 1, label: "Over Shoulder Right" },
    { horizontal_angle: 0,   vertical_angle: -30, distance: 1, label: "Low Angle – Hero" },
    { horizontal_angle: -90, vertical_angle: 0,   distance: 1, label: "Profile Left" },
    { horizontal_angle: 60,  vertical_angle: 15,  distance: 0, label: "Dutch Angle Right" },
    { horizontal_angle: 0,   vertical_angle: 60,  distance: 2, label: "Bird's Eye" },
  ],
  "short-drama-2": [
    { horizontal_angle: 0,   vertical_angle: -15, distance: 0, label: "Dramatic Close-up" },
    { horizontal_angle: -45, vertical_angle: 0,   distance: 1, label: "Left 3/4 – Medium" },
    { horizontal_angle: 90,  vertical_angle: -30, distance: 0, label: "Right – Low Close-up" },
    { horizontal_angle: 0,   vertical_angle: 30,  distance: 2, label: "High Angle – Wide" },
    { horizontal_angle: 45,  vertical_angle: 0,   distance: 0, label: "Right 45° – Close-up" },
    { horizontal_angle: -90, vertical_angle: 15,  distance: 1, label: "Left Profile – Elevated" },
  ],
  "comic-drama": [
    { horizontal_angle: 0,   vertical_angle: -15, distance: 0, label: "Dramatic Close-up" },
    { horizontal_angle: 0,   vertical_angle: 15,  distance: 2, label: "Wide Establishing" },
    { horizontal_angle: -90, vertical_angle: 0,   distance: 1, label: "Side Profile" },
    { horizontal_angle: -45, vertical_angle: 0,   distance: 1, label: "Three-Quarter Left" },
    { horizontal_angle: 0,   vertical_angle: 45,  distance: 2, label: "High Angle" },
    { horizontal_angle: 90,  vertical_angle: -15, distance: 0, label: "Right – Dramatic" },
  ],
  "comic-drama-2": [
    { horizontal_angle: 0,   vertical_angle: 0,   distance: 0, label: "Extreme Close-up" },
    { horizontal_angle: 45,  vertical_angle: -30, distance: 1, label: "Low Power Shot" },
    { horizontal_angle: 0,   vertical_angle: 60,  distance: 2, label: "Over-the-top" },
    { horizontal_angle: -45, vertical_angle: -15, distance: 0, label: "Left 3/4 – Dramatic" },
    { horizontal_angle: 90,  vertical_angle: 0,   distance: 2, label: "Right – Wide" },
    { horizontal_angle: 0,   vertical_angle: 0,   distance: 1, label: "Straight-on – Medium" },
  ],
};

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
  angle: AnglePreset,
  aspectRatio?: string,
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
  if (aspectRatio && aspectRatio !== "auto") body.aspect_ratio = aspectRatio;
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

    // WaveSpeed uses /result endpoint for polling
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
    // created / pending / processing — keep polling
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
  const panelGenerationIds: string[] = [];

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
      storyboardType?: string;
      aspectRatio?: string;
      prompt?: string;
    };

    const { imageDataUrl, prompt, aspectRatio } = body;
    const numPanels = Math.max(1, Math.min(MAX_PANELS, body.numPanels ?? 4));
    const sbType = (ANGLE_PRESETS[body.storyboardType as StoryboardType] ? body.storyboardType : "production") as StoryboardType;
    const angles = ANGLE_PRESETS[sbType];

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const apiKey = getWavespeedApiKey();
    const totalCost = numPanels * CREDIT_PER_PANEL;
    const storyLabel = sbType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Create one Generation row per panel so each image is persisted in assets
    let firstGenerationId: string | null = null;
    let remainingCredits = 0;

    for (let i = 0; i < numPanels; i++) {
      const spent = await spendCredits({
        userId,
        credits: CREDIT_PER_PANEL,
        prompt: `${storyLabel} – Panel ${i + 1}/${numPanels}`,
        assetType: "STORYBOARD",
        modelUsed: "wavespeed/qwen-image-edit-multiple-angles",
      });
      panelGenerationIds.push(spent.generationId);
      if (i === 0) firstGenerationId = spent.generationId;
      remainingCredits = spent.remainingCredits;
    }
    chargedCredits = totalCost;
    chargedUserId = userId;
    generationId = firstGenerationId;

    // Upload reference image to Supabase Storage
    const hostedImageUrl = await uploadRefImage(imageDataUrl, userId, firstGenerationId!);

    // Launch all panel tasks in parallel
    const predictionIds: string[] = [];
    for (let i = 0; i < numPanels; i++) {
      const angle = angles[i % angles.length];
      const predId = await createWavespeedTask(apiKey, hostedImageUrl, angle, aspectRatio, prompt);
      predictionIds.push(predId);
    }

    // Poll all tasks
    const results = await Promise.all(
      predictionIds.map((pid) => pollWavespeedTask(apiKey, pid)),
    );

    const outputs: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "success" && r.urls.length > 0) {
        outputs.push(r.urls[0]);
        // Persist each panel URL to its Generation row
        await setGenerationMediaUrl(panelGenerationIds[i], r.urls[0]).catch(() => null);
      } else {
        failures.push(r.error ?? "Panel generation failed");
        // Refund this panel's credits
        await refundGenerationCharge(panelGenerationIds[i], userId, CREDIT_PER_PANEL, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => null);
      }
    }

    // If all failed, return error
    if (outputs.length === 0) {
      return NextResponse.json(
        { error: failures[0] || "All panels failed. Credits refunded." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      outputs,
      generationId: firstGenerationId,
      totalPanels: numPanels,
      successfulPanels: outputs.length,
      remainingCredits,
    });
  } catch (err) {
    // Rollback all panel generation charges on unexpected error
    if (chargedUserId && chargedCredits > 0 && panelGenerationIds.length > 0) {
      for (const pgId of panelGenerationIds) {
        await refundGenerationCharge(pgId, chargedUserId, CREDIT_PER_PANEL, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => null);
      }
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

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
import {
  checkStoryboardReferenceImageSafety,
  getStoryboardReferenceImageHash,
  UnsafeReferenceImageError,
  verifyStoryboardReferenceSafetyToken,
} from "@/lib/storyboard-reference-safety";
import { deleteFromStorage, uploadBufferToStorage } from "@/lib/supabase-storage";

/** Allow up to 5 minutes */
export const maxDuration = 300;

const MAX_PANELS = 9;

type QualityTier = "1k" | "2k" | "4k";
const QUALITY_CREDIT_PER_PANEL: Record<QualityTier, number> = {
  "1k": 2,
  "2k": 4,
  "4k": 8,
};

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

interface PanelPlan {
  angleId: string;
  angle: AnglePreset;
}

const SUPPORTED_ASPECT_RATIOS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);
const SUPPORTED_OUTPUT_FORMATS = new Set(["jpeg", "png"]);
const ALLOWED_HORIZONTAL = [-90, -45, 0, 45, 90] as const;
const ALLOWED_VERTICAL = [-30, 0, 30, 60] as const;
const ALLOWED_DISTANCE = [0, 1, 2] as const;

function snapToAllowed(value: number, allowed: readonly number[]): number {
  return allowed.reduce((closest, current) => (
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  ), allowed[0]);
}

function normalizeAnglePreset(angle: AnglePreset): AnglePreset {
  return {
    horizontal_angle: snapToAllowed(angle.horizontal_angle, ALLOWED_HORIZONTAL),
    vertical_angle: snapToAllowed(angle.vertical_angle, ALLOWED_VERTICAL),
    distance: snapToAllowed(angle.distance, ALLOWED_DISTANCE),
    label: angle.label,
  };
}

function hashToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash);
  return (positive % 2_147_483_646) + 1;
}

function getDistanceLabel(distance: number): string {
  if (distance <= 0) return "close-up";
  if (distance === 1) return "medium";
  return "wide";
}

function getAngleDirective(angleId: string, angle: AnglePreset): string {
  const fallback = `Camera framing should match ${angle.label} with clear composition.`;
  const directives: Record<string, string> = {
    "ext-long-shot": "Use an extreme long shot with the subject small in frame and strong environmental context.",
    "long-shot": "Use a long shot showing full body and surrounding environment.",
    "closeup": "Use a closeup emphasizing face details and expression.",
    "extreme-closeup": "Use an extreme closeup focused on one key facial feature with tight crop.",
    "back-view": "Subject must face away from camera; show the back clearly and do not show a front-facing portrait.",
    "med-closeup": "Use a medium closeup from chest-up with clear subject prominence.",
    "ots": "Use an over-the-shoulder framing with foreground shoulder/back edge visible.",
    "wide": "Use a wide cinematic composition emphasizing space and scene depth.",
    "aerial": "Use a high aerial perspective from above with visible floor/ground layout.",
    "profile": "Use strict side profile view at approximately 90 degrees.",
    "low-angle": "Use a low-angle hero framing with camera below eye level.",
    "high-angle": "Use a high-angle framing looking down at the subject.",
    "dutch-angle": "Use a dutch-angle shot with a clear tilted horizon for dynamic tension.",
    "eye-level": "Use neutral eye-level framing with natural perspective.",
    "3-4-view": "Use a three-quarter view showing depth of the face/body.",
    "pov": "Use first-person POV perspective as if seen through the subject's own eyes.",
  };
  return directives[angleId] ?? fallback;
}

function buildPanelPrompt(input: {
  storyLabel: string;
  panelIndex: number;
  totalPanels: number;
  angleId: string;
  angle: AnglePreset;
  userPrompt?: string;
}): string {
  const header = `${input.storyLabel} storyboard panel ${input.panelIndex + 1} of ${input.totalPanels}.`;
  const cameraRule = `Use camera angle: ${input.angle.label}. Horizontal ${input.angle.horizontal_angle}deg, vertical ${input.angle.vertical_angle}deg, distance ${getDistanceLabel(input.angle.distance)}.`;
  const angleDirective = getAngleDirective(input.angleId, input.angle);
  const continuityRule = "Keep the same subject identity, outfit, and location as the reference image.";
  const uniquenessRule = "Make this framing clearly different from other panels with distinct composition.";
  const userText = input.userPrompt?.trim() ? `Scene direction: ${input.userPrompt.trim()}.` : "";
  return [header, userText, cameraRule, angleDirective, continuityRule, uniquenessRule].filter(Boolean).join(" ");
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

// Map camera angle names to AnglePresets
const CAMERA_ANGLE_MAP: Record<string, AnglePreset> = {
  "ext-long-shot": { horizontal_angle: 0, vertical_angle: 0, distance: 2, label: "Ext. long shot" },
  "long-shot": { horizontal_angle: 0, vertical_angle: 0, distance: 1, label: "Long shot" },
  "closeup": { horizontal_angle: 0, vertical_angle: 0, distance: 0, label: "Closeup" },
  "extreme-closeup": { horizontal_angle: 0, vertical_angle: 0, distance: 0, label: "Extreme closeup" },
  "back-view": { horizontal_angle: 90, vertical_angle: 0, distance: 1, label: "Back view" },
  "med-closeup": { horizontal_angle: 0, vertical_angle: 0, distance: 0, label: "Med. closeup" },
  "ots": { horizontal_angle: 45, vertical_angle: 0, distance: 1, label: "OTS" },
  "wide": { horizontal_angle: 0, vertical_angle: 0, distance: 2, label: "Wide" },
  "aerial": { horizontal_angle: 0, vertical_angle: 60, distance: 2, label: "Aerial" },
  "profile": { horizontal_angle: 90, vertical_angle: 0, distance: 1, label: "Profile" },
  "low-angle": { horizontal_angle: 0, vertical_angle: -30, distance: 1, label: "Low angle" },
  "high-angle": { horizontal_angle: 0, vertical_angle: 30, distance: 2, label: "High angle" },
  "dutch-angle": { horizontal_angle: 45, vertical_angle: 0, distance: 1, label: "Dutch angle" },
  "eye-level": { horizontal_angle: 0, vertical_angle: 0, distance: 1, label: "Eye level" },
  "3-4-view": { horizontal_angle: 45, vertical_angle: 0, distance: 1, label: "3/4 view" },
  "pov": { horizontal_angle: 0, vertical_angle: 0, distance: 0, label: "POV" },
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
  outputFormat?: "jpeg" | "png",
  seed?: number,
  prompt?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    images: [imageUrl],
    horizontal_angle: angle.horizontal_angle,
    vertical_angle: angle.vertical_angle,
    distance: angle.distance,
    output_format: outputFormat ?? "jpeg",
    seed: typeof seed === "number" ? seed : -1,
    enable_base64_output: false,
    enable_sync_mode: false,
    // Provider-side safety filter (WaveSpeed/KIE-compatible where supported).
    nsfw_checker: true,
    safety_checker: true,
  };
  if (aspectRatio && SUPPORTED_ASPECT_RATIOS.has(aspectRatio)) body.aspect_ratio = aspectRatio;
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
  let chargedCreditsPerPanel = QUALITY_CREDIT_PER_PANEL["1k"];
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
      quality?: QualityTier;
      outputFormat?: "jpeg" | "png";
      prompt?: string;
      cameraAngles?: string[];
      referenceSafetyToken?: string;
    };

    const { imageDataUrl, prompt, cameraAngles } = body;
    const numPanels = Math.max(1, Math.min(MAX_PANELS, body.numPanels ?? 4));
    const quality: QualityTier = body.quality === "2k" || body.quality === "4k" ? body.quality : "1k";
    const creditsPerPanel = QUALITY_CREDIT_PER_PANEL[quality];
    const aspectRatio = typeof body.aspectRatio === "string" && SUPPORTED_ASPECT_RATIOS.has(body.aspectRatio)
      ? body.aspectRatio
      : "1:1";
    const outputFormat = typeof body.outputFormat === "string" && SUPPORTED_OUTPUT_FORMATS.has(body.outputFormat)
      ? (body.outputFormat as "jpeg" | "png")
      : quality === "1k"
        ? "jpeg"
        : "png";
    const sbType = (ANGLE_PRESETS[body.storyboardType as StoryboardType] ? body.storyboardType : "production") as StoryboardType;
    
    // If cameraAngles are provided, use them; otherwise use preset angles
    let panelPlan: PanelPlan[];
    if (cameraAngles && cameraAngles.length > 0) {
      panelPlan = cameraAngles
        .slice(0, numPanels)
        .map((angleId) => ({
          angleId,
          angle: normalizeAnglePreset(CAMERA_ANGLE_MAP[angleId] || ANGLE_PRESETS[sbType][0]),
        }))
        .filter(Boolean);
      
      // If not enough angles provided, fill remaining with presets
      if (panelPlan.length < numPanels) {
        const presetAngles = ANGLE_PRESETS[sbType];
        for (let i = panelPlan.length; i < numPanels; i++) {
          const preset = normalizeAnglePreset(presetAngles[i % presetAngles.length]);
          panelPlan.push({ angleId: `preset-${i}`, angle: preset });
        }
      }
    } else {
      panelPlan = ANGLE_PRESETS[sbType].map((preset, i) => ({
        angleId: `preset-${i}`,
        angle: normalizeAnglePreset(preset),
      }));
    }

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const totalCost = numPanels * creditsPerPanel;
    const storyLabel = sbType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const imageHash = getStoryboardReferenceImageHash(imageDataUrl);
    const hasUploadSafetyPass = verifyStoryboardReferenceSafetyToken({
      userId,
      imageHash,
      token: typeof body.referenceSafetyToken === "string" ? body.referenceSafetyToken : undefined,
    });
    const precheckGenerationId = `storyboard-precheck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hostedImageUrl = await uploadRefImage(imageDataUrl, userId, precheckGenerationId);
    if (!hasUploadSafetyPass) {
      try {
        await checkStoryboardReferenceImageSafety(hostedImageUrl);
      } catch (err) {
        await deleteFromStorage({
          userId,
          generationId: `${precheckGenerationId}-storyboard-ref`,
          assetType: "image-ref",
        }).catch(() => null);
        throw err;
      }
    }

    const apiKey = getWavespeedApiKey();

    // Create one Generation row per panel so each image is persisted in assets
    let firstGenerationId: string | null = null;
    let remainingCredits = 0;

    for (let i = 0; i < numPanels; i++) {
      const spent = await spendCredits({
        userId,
        credits: creditsPerPanel,
        prompt: `${storyLabel} – Panel ${i + 1}/${numPanels}`,
        assetType: "STORYBOARD",
        modelUsed: "wavespeed/qwen-image-edit-multiple-angles",
      });
      panelGenerationIds.push(spent.generationId);
      if (i === 0) firstGenerationId = spent.generationId;
      remainingCredits = spent.remainingCredits;
    }
    chargedCredits = totalCost;
    chargedCreditsPerPanel = creditsPerPanel;
    chargedUserId = userId;
    generationId = firstGenerationId;

    // Launch all panel tasks in parallel
    const predictionIds: string[] = [];
    for (let i = 0; i < numPanels; i++) {
      const plan = panelPlan[i] || panelPlan[i % panelPlan.length];
      const panelSeed = hashToSeed(`${firstGenerationId}:${plan.angleId}:${i}`);
      const panelPrompt = buildPanelPrompt({
        storyLabel,
        panelIndex: i,
        totalPanels: numPanels,
        angleId: plan.angleId,
        angle: plan.angle,
        userPrompt: prompt,
      });
      const predId = await createWavespeedTask(
        apiKey,
        hostedImageUrl,
        plan.angle,
        aspectRatio,
        outputFormat,
        panelSeed,
        panelPrompt,
      );
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
        await refundGenerationCharge(panelGenerationIds[i], userId, creditsPerPanel, {
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
      quality,
      creditsPerPanel,
      totalPanels: numPanels,
      successfulPanels: outputs.length,
      remainingCredits,
    });
  } catch (err) {
    // Rollback all panel generation charges on unexpected error
    if (chargedUserId && chargedCredits > 0 && panelGenerationIds.length > 0) {
      for (const pgId of panelGenerationIds) {
        await refundGenerationCharge(pgId, chargedUserId, chargedCreditsPerPanel, {
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

    if (err instanceof UnsafeReferenceImageError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 },
      );
    }

    console.error("[STORYBOARD_PRODUCTION_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

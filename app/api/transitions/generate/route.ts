import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  getPresetById,
  assembleHiddenPrompt,
  calcTransitionCreditsForModel,
  type TransitionModelId,
} from "@/lib/transition-presets";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  refundGenerationCharge,
  spendCredits,
  setGenerationTaskMarker,
} from "@/lib/credit-ledger";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";

const KIE_BASE = "https://api.kie.ai/api/v1";
const DEFAULT_TRANSITION_MODEL: TransitionModelId = "kling-2.6/image-to-video";
const TRANSITION_MODELS = new Set<TransitionModelId>([
  "kling-2.6/image-to-video",
  "kling-3.0/video",
  "hailuo/2-3-image-to-video-standard",
  "bytedance/seedance-2-mini",
]);

function kieHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Upload a base64 data URL to Supabase storage and return a hosted HTTP URL.
 * HTTP(S) URLs are passed through unchanged.
 */
async function resolveInputUrl(raw: string, userId: string): Promise<string> {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!raw.startsWith("data:")) throw new Error("Invalid input URL — must be http(s) or base64 data URL.");

  // Parse data URL: data:<contentType>;base64,<data>
  const commaIdx = raw.indexOf(",");
  if (commaIdx === -1) throw new Error("Malformed data URL.");
  const header = raw.slice(5, commaIdx); // strip "data:"
  const [mimeAndEncoding] = header.split(";");
  const contentType = mimeAndEncoding || "image/jpeg";
  const base64Data = raw.slice(commaIdx + 1);
  const buffer = Buffer.from(base64Data, "base64");

  const uploadedUrl = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image",
    generationId: `transition-input-${crypto.randomUUID()}`,
  });

  if (!uploadedUrl) throw new Error("Failed to upload input image to storage.");
  return uploadedUrl;
}

async function validateTransitionInput(raw: string): Promise<void> {
  if (raw.startsWith("data:image/") || raw.startsWith("http://") || raw.startsWith("https://")) {
    const isVideo = /\.(mp4|mov|webm|mkv|m4v)(\?|$)/i.test(raw);
    if (isVideo) return;
    try {
      await checkStoryboardReferenceImageSafety(raw);
    } catch (err) {
      if (err instanceof UnsafeReferenceImageError) {
        throw err;
      }
      console.warn("[transitions/generate] Safety check bypassed due to validation error:", err instanceof Error ? err.message : err);
    }
  }
}

function resolveTransitionModel(value: unknown): TransitionModelId {
  if (typeof value !== "string") return DEFAULT_TRANSITION_MODEL;
  if (value === "wan/2-7-image-to-video") return DEFAULT_TRANSITION_MODEL;
  if (value === "hailuo-2.3-standard") return "hailuo/2-3-image-to-video-standard";
  if (value === "bytedance/seedance-v2/text-to-video-mini") return "bytedance/seedance-2-mini";
  return TRANSITION_MODELS.has(value as TransitionModelId)
    ? (value as TransitionModelId)
    : DEFAULT_TRANSITION_MODEL;
}

function clampAiDuration(modelId: TransitionModelId, duration: number): number {
  if (modelId === "kling-2.6/image-to-video") {
    return [5, 10].includes(Math.round(duration)) ? Math.round(duration) : 5;
  }
  if (modelId === "hailuo/2-3-image-to-video-standard") {
    return Math.round(duration) === 10 ? 10 : 6;
  }
  if (modelId === "bytedance/seedance-2-mini") {
    return Math.max(4, Math.min(15, Math.floor(duration)));
  }
  return [5, 10].includes(Math.round(duration)) ? Math.round(duration) : 5;
}

function buildKieTransitionPayload(params: {
  modelId: TransitionModelId;
  prompt: string;
  negativePrompt: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  inputA: string;
  inputB: string;
}): Record<string, unknown> {
  if (params.modelId === "kling-2.6/image-to-video") {
    return {
      prompt: params.prompt.slice(0, 1000),
      image_urls: [params.inputA],
      sound: false,
      duration: String(clampAiDuration(params.modelId, params.duration)),
    };
  }

  if (params.modelId === "hailuo/2-3-image-to-video-standard") {
    return {
      prompt: params.prompt.slice(0, 5000),
      image_url: params.inputA,
      duration: String(clampAiDuration(params.modelId, params.duration)),
      resolution: params.resolution === "1080p" || params.resolution === "1080P" ? "1080P" : "768P",
    };
  }

  if (params.modelId === "bytedance/seedance-2-mini") {
    return {
      prompt: params.prompt,
      duration: clampAiDuration(params.modelId, params.duration),
      aspect_ratio: params.aspectRatio,
      resolution: params.resolution === "480p" ? "480p" : "720p",
      generate_audio: false,
      first_frame_url: params.inputA,
      last_frame_url: params.inputB,
    };
  }

  return {
    prompt: params.prompt,
    duration: String(clampAiDuration(params.modelId, params.duration)),
    aspect_ratio: params.aspectRatio,
    mode: params.resolution === "720p" ? "std" : "pro",
    sound: false,
    multi_shots: false,
    multi_prompt: [],
    image_urls: [params.inputA, params.inputB],
  };
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;
  let jobId: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const presetId = typeof body.presetId === "string" ? body.presetId : "";
    const inputAUrl = typeof body.inputAUrl === "string" ? body.inputAUrl : "";
    const inputBUrl = typeof body.inputBUrl === "string" ? body.inputBUrl : "";
    const selectedModelId = resolveTransitionModel(body.modelId);
    const requestedDuration = typeof body.duration === "number" ? body.duration : 5;
    const duration = clampAiDuration(selectedModelId, requestedDuration);
    const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9";

    const controls = {
      intensity: typeof body.intensity === "number" ? body.intensity : 50,
      smoothness: typeof body.smoothness === "number" ? body.smoothness : 50,
      cinematicStrength: typeof body.cinematicStr === "number" ? body.cinematicStr : 60,
      preserveFraming: typeof body.preserveFraming === "boolean" ? body.preserveFraming : true,
      subjectFocus: typeof body.subjectFocus === "boolean" ? body.subjectFocus : true,
      resolution: typeof body.resolution === "string" ? body.resolution : "1080p",
      fps: typeof body.fps === "number" ? body.fps : 24,
      enhance: typeof body.enhance === "boolean" ? body.enhance : true,
    };

    if (!presetId) return NextResponse.json({ error: "presetId is required" }, { status: 400 });
    if (!inputAUrl) return NextResponse.json({ error: "Input A is required" }, { status: 400 });
    if (!inputBUrl) return NextResponse.json({ error: "Input B is required" }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    await Promise.all([
      validateTransitionInput(inputAUrl),
      validateTransitionInput(inputBUrl),
    ]);

    // Validate project ownership
    const project = await prismadb.transitionProject.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get preset (server-side — has hidden prompts)
    const preset = getPresetById(presetId);
    if (!preset) return NextResponse.json({ error: "Invalid preset" }, { status: 400 });

    if (selectedModelId === "bytedance/seedance-2-mini" && !["480p", "720p"].includes(controls.resolution)) {
      controls.resolution = "720p";
    }

    const creditsToCharge = await calcTransitionCreditsForModel(
      presetId,
      duration,
      controls.resolution,
      selectedModelId,
    );

    // Assemble hidden prompt
    const { prompt, negativePrompt } = assembleHiddenPrompt(preset, controls);

    const precheck = await precheckGenerationPolicy({
      prompt,
      negativePrompt,
      extraText: `Transition: ${preset.name}`,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    // Charge credits (only after precheck passes)
    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: `Transition: ${preset.name}`,
      assetType: "TRANSITION",
      modelUsed: `${selectedModelId}/transition/${presetId}`,
      duration: duration,
      resolution: controls.resolution,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error("KIE API key is not configured.");

    // Resolve inputs — upload base64 data URLs to hosted URLs if needed
    const [resolvedInputA, resolvedInputB] = await Promise.all([
      resolveInputUrl(inputAUrl, userId),
      resolveInputUrl(inputBUrl, userId),
    ]);

    // Build KIE payload — Kling 3.0 with start+end frame (image_urls[0]=start, image_urls[1]=end)
    const kiePayload = buildKieTransitionPayload({
      modelId: selectedModelId,
      prompt,
      negativePrompt,
      duration,
      aspectRatio,
      resolution: controls.resolution,
      inputA: resolvedInputA,
      inputB: resolvedInputB,
    });

    // Create job record first
    const job = await prismadb.transitionJob.create({
      data: {
        projectId,
        userId,
        presetId,
        status: "queued",
        creditsCost: creditsToCharge,
        payload: JSON.stringify(kiePayload),
      },
    });
    jobId = job.id;

    // Submit to KIE AI — Kling 3.0 supports both start and end frame via image_urls[]
    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(apiKey),
      body: JSON.stringify({
        model: selectedModelId,
        input: kiePayload,
      }),
    });

    const createJson = await createRes.json().catch(() => null);
    const taskId = createJson?.data?.taskId || createJson?.taskId;

    if (!createRes.ok || !taskId) {
      // Roll back job and credits
      await prismadb.transitionJob.update({
        where: { id: job.id },
        data: { status: "failed", error: createJson?.msg || "Submission failed" },
      });
      await refundGenerationCharge(generationId, userId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
      return NextResponse.json(
        { error: createJson?.msg || createJson?.message || "Failed to start generation" },
        { status: createRes.ok ? 500 : createRes.status }
      );
    }

    // Update job with taskId
    await prismadb.transitionJob.update({
      where: { id: job.id },
      data: { status: "processing", taskId },
    });

    // Mark generation with taskId
    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId);
    }

    return NextResponse.json({
      jobId: job.id,
      taskId,
      status: "processing",
      creditsCharged: creditsToCharge,
      remainingCredits: charge.remainingCredits,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isSafetyError = errMsg.includes("verify image safety") || errMsg.includes("Restricted content");

    if (err instanceof UnsafeReferenceImageError || isSafetyError) {
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => null);
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, current: err.currentBalance },
        { status: 402 }
      );
    }

    // Roll back charges if we haven't already
    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => null);
    }
    if (jobId) {
      await prismadb.transitionJob
        .update({ where: { id: jobId }, data: { status: "failed", error: String(err) } })
        .catch(() => null);
    }

    console.error("[transitions/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

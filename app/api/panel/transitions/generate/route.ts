import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  refundGenerationCharge,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";
import {
  assembleHiddenPrompt,
  calcTransitionCredits,
  getPresetById,
} from "@/lib/transition-presets";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import {
  checkStoryboardReferenceImageSafety,
  UnsafeReferenceImageError,
} from "@/lib/storyboard-reference-safety";

export const dynamic = "force-dynamic";

const KIE_BASE = "https://api.kie.ai/api/v1";
const DEFAULT_TRANSITION_MODEL = "kling-2.6/image-to-video";
const TRANSITION_MODELS = new Set([
  "kling-2.6/image-to-video",
  "hailuo/2-3-image-to-video-standard",
]);

function requirePanelUser(req: NextRequest): string | null {
  const token = extractPanelToken(req);
  if (!token) return null;
  return verifyPanelToken(token)?.userId ?? null;
}

function kieHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function resolveTransitionModel(value: unknown): string {
  return typeof value === "string" && TRANSITION_MODELS.has(value)
    ? value
    : DEFAULT_TRANSITION_MODEL;
}

function buildTransitionInput(modelId: string, prompt: string, inputAUrl: string, duration: number, resolution: string) {
  if (modelId === "hailuo/2-3-image-to-video-standard") {
    return {
      prompt: prompt.slice(0, 5000),
      image_url: inputAUrl,
      duration: String(Math.round(duration) === 10 ? 10 : 6),
      resolution: resolution === "1080p" || resolution === "1080P" ? "1080P" : "768P",
    };
  }

  return {
    prompt: prompt.slice(0, 1000),
    image_urls: [inputAUrl],
    sound: false,
    duration: String(Math.round(duration) === 10 ? 10 : 5),
  };
}

async function resolveInputUrl(raw: string, userId: string): Promise<string> {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!raw.startsWith("data:")) throw new Error("Invalid input URL.");

  const commaIdx = raw.indexOf(",");
  if (commaIdx === -1) throw new Error("Malformed data URL.");
  const header = raw.slice(5, commaIdx);
  const [mimeAndEncoding] = header.split(";");
  const contentType = mimeAndEncoding || "image/jpeg";
  const base64Data = raw.slice(commaIdx + 1);
  const buffer = Buffer.from(base64Data, "base64");

  const uploadedUrl = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image",
    generationId: `panel-transition-input-${crypto.randomUUID()}`,
  });

  if (!uploadedUrl) throw new Error("Failed to upload transition input.");
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
      console.warn("[panel/transitions/generate] Safety check bypassed due to validation error:", err instanceof Error ? err.message : err);
    }
  }
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let generationId: string | null = null;
  let userId: string | null = null;
  let jobId: string | null = null;

  try {
    userId = requirePanelUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const presetId = typeof body.presetId === "string" ? body.presetId : "";
    const inputAUrl = typeof body.inputAUrl === "string" ? body.inputAUrl : "";
    const inputBUrl = typeof body.inputBUrl === "string" ? body.inputBUrl : "";
    const duration = typeof body.duration === "number" ? Math.max(3, Math.min(10, body.duration)) : 5;
    const modelId = resolveTransitionModel(body.modelId);

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

    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    if (!presetId) return NextResponse.json({ error: "presetId is required" }, { status: 400 });
    if (!inputAUrl || !inputBUrl) return NextResponse.json({ error: "Both inputs are required" }, { status: 400 });

    const project = await prismadb.transitionProject.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await Promise.all([
      validateTransitionInput(inputAUrl),
      validateTransitionInput(inputBUrl),
    ]);

    const preset = getPresetById(presetId);
    if (!preset) {
      return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
    }

    const creditsToCharge = calcTransitionCredits(presetId, duration, controls.resolution);
    const hidden = assembleHiddenPrompt(preset, controls);

    const precheck = await precheckGenerationPolicy({
      prompt: hidden.prompt,
      negativePrompt: hidden.negativePrompt,
      extraText: `Transition: ${preset.name}`,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: `Transition: ${preset.name}`,
      assetType: "TRANSITION",
      modelUsed: modelId,
      duration: duration,
      resolution: controls.resolution,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error("KIE API key is not configured.");

    const [resolvedInputA, resolvedInputB] = await Promise.all([
      resolveInputUrl(inputAUrl, userId),
      resolveInputUrl(inputBUrl, userId),
    ]);

    const kiePayload: Record<string, unknown> = buildTransitionInput(
      modelId,
      hidden.prompt,
      resolvedInputA,
      duration,
      controls.resolution,
    );

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

    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(apiKey),
      body: JSON.stringify({
        model: modelId,
        input: kiePayload,
      }),
    });

    const createJson = await createRes.json().catch(() => null) as
      | { data?: { taskId?: string }; taskId?: string; msg?: string; message?: string }
      | null;
    const taskId = createJson?.data?.taskId || createJson?.taskId;

    if (!createRes.ok || !taskId) {
      await prismadb.transitionJob.update({
        where: { id: job.id },
        data: { status: "failed", error: createJson?.msg || createJson?.message || "Submission failed" },
      });
      await refundGenerationCharge(generationId, userId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
      return NextResponse.json(
        { error: createJson?.msg || createJson?.message || "Failed to start generation" },
        { status: createRes.ok ? 500 : createRes.status },
      );
    }

    await prismadb.transitionJob.update({
      where: { id: job.id },
      data: { status: "processing", taskId },
    });

    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId).catch(() => {});
    }

    return NextResponse.json({
      jobId: job.id,
      taskId,
      status: "processing",
      creditsCharged: creditsToCharge,
      remainingCredits: charge.remainingCredits,
    });
  } catch (err) {
    if (err instanceof UnsafeReferenceImageError) {
      if (chargedCredits > 0 && userId && generationId) {
        await refundGenerationCharge(generationId, userId, chargedCredits, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => null);
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, current: err.currentBalance },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && userId && generationId) {
      await refundGenerationCharge(generationId, userId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => null);
    }
    if (jobId) {
      await prismadb.transitionJob.update({
        where: { id: jobId },
        data: { status: "failed", error: err instanceof Error ? err.message : String(err) },
      }).catch(() => null);
    }

    console.error("[panel/transitions/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

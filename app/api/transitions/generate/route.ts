import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  getPresetById,
  assembleHiddenPrompt,
  calcTransitionCredits,
} from "@/lib/transition-presets";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationTaskMarker,
} from "@/lib/credit-ledger";

const KIE_BASE = "https://api.kie.ai/api/v1";
const KIE_UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";

function kieHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/** Upload a base64 data URL to KIE and return a hosted HTTP URL. */
async function resolveInputUrl(raw: string, apiKey: string): Promise<string> {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!raw.startsWith("data:")) throw new Error("Invalid input URL — must be http(s) or base64 data URL.");

  const res = await fetch(KIE_UPLOAD, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ base64Data: raw, uploadPath: "transition-inputs" }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`KIE file upload failed (${res.status}): ${json?.msg ?? JSON.stringify(json)}`);
  const url: string = json?.data?.url ?? json?.url ?? "";
  if (!url) throw new Error(`KIE file upload returned no URL. Response: ${JSON.stringify(json)}`);
  return url;
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
    const duration = typeof body.duration === "number" ? Math.max(3, Math.min(10, body.duration)) : 5;
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

    const creditsToCharge = calcTransitionCredits(presetId, duration);

    // Charge credits
    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: `Transition: ${preset.name}`,
      assetType: "TRANSITION",
      modelUsed: `transition/${presetId}`,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    // Assemble hidden prompt
    const { prompt, negativePrompt } = assembleHiddenPrompt(preset, controls);

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error("KIE API key is not configured.");

    // Resolve inputs — upload base64 data URLs to hosted URLs if needed
    const [resolvedInputA, resolvedInputB] = await Promise.all([
      resolveInputUrl(inputAUrl, apiKey),
      resolveInputUrl(inputBUrl, apiKey),
    ]);

    // Build KIE payload — Kling 2.5 with start+end frame
    const kiePayload = {
      prompt,
      negative_prompt: negativePrompt,
      duration,
      aspect_ratio: aspectRatio,
      mode: "pro",
      image_url: resolvedInputA,
      tail_image_url: resolvedInputB,
    };

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

    // Submit to KIE AI
    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(apiKey),
      body: JSON.stringify({
        model: "kling-2.5/image-to-video",
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
      await rollbackGenerationCharge(generationId, userId, chargedCredits);
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
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, current: err.currentBalance },
        { status: 402 }
      );
    }

    // Roll back charges if we haven't already
    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => null);
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

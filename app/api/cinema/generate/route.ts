import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  buildCinemaVideoPayload,
  cinemaShotCredits,
  ensureProjectOwnership,
  requireCinemaUser,
} from "@/lib/cinema";
import {
  InsufficientCreditsError,
  rollbackGenerationCharge,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";

const KIE_BASE = "https://api.kie.ai/api/v1";

const ROUTE_TO_KIE_MODEL: Record<string, string> = {
  "kwaivgi/kling-v3.0-pro/text-to-video": "kling-3.0/video",
  "kwaivgi/kling-v3.0-pro/motion-control": "kling-3.0/video",
  "minimax/hailuo-2.3/i2v-standard": "hailuo/2-3-image-to-video-standard",
  "minimax/hailuo-2.3/i2v-pro": "hailuo/2-3-image-to-video-pro",
  "openai/sora-2/text-to-video": "sora-2-text-to-video",
  "openai/sora-2/image-to-video": "sora-2-image-to-video",
};

function kieHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    const userId = await requireCinemaUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const shotId = typeof body.shotId === "string" ? body.shotId : "";
    if (!projectId || !shotId) {
      return NextResponse.json({ error: "projectId and shotId are required" }, { status: 400 });
    }
    await ensureProjectOwnership(projectId, userId);

    const shot = await prismadb.cinemaShot.findUnique({ where: { id: shotId } });
    if (!shot || shot.projectId !== projectId) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }
    const project = await prismadb.cinemaProject.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const selectedCharacters = shot.characterIds.length
      ? await prismadb.cinemaCharacter.findMany({
          where: { id: { in: shot.characterIds } },
          select: { referenceUrl: true },
        })
      : [];
    const selectedLocation = shot.locationId
      ? await prismadb.cinemaLocation.findUnique({
          where: { id: shot.locationId },
          select: { referenceUrl: true },
        })
      : null;

    const creditsToCharge = cinemaShotCredits(shot.duration, shot.consistencyLock);
    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: shot.prompt || project.conceptPrompt || "Cinema shot generation",
      assetType: "CINEMA",
      modelUsed: project.modelRoute,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error("KIE API key is not configured.");

    const model = ROUTE_TO_KIE_MODEL[project.modelRoute] ?? "kling-3.0/video";
    const payload = buildCinemaVideoPayload({
      prompt: shot.prompt || project.conceptPrompt,
      negativePrompt: shot.negativePrompt || project.negativePrompt,
      duration: shot.duration,
      ratio: shot.ratio || project.aspectRatio,
      cameraPreset: shot.cameraPreset,
      cameraSpeed: shot.cameraSpeed,
      motionIntensity: shot.motionIntensity,
      smoothness: shot.smoothness,
      lighting: shot.lighting,
      lens: shot.lens,
      colorGrade: shot.colorGrade,
      audioPrompt: shot.audioPrompt,
      seed: shot.seed,
      consistencyLock: shot.consistencyLock,
      characterRefs: selectedCharacters.map((c) => c.referenceUrl).filter((x): x is string => Boolean(x)),
      locationRef: selectedLocation?.referenceUrl ?? null,
    });

    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(apiKey),
      body: JSON.stringify({
        model,
        input: payload,
      }),
    });
    const createJson = await createRes.json().catch(() => null);
    const taskId = createJson?.data?.taskId || createJson?.taskId;
    if (!createRes.ok || !taskId) {
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
      }
      return NextResponse.json(
        { error: createJson?.msg || createJson?.message || "Failed to start generation" },
        { status: createRes.ok ? 500 : createRes.status },
      );
    }

    if (generationId) {
      await setGenerationTaskMarker(generationId, String(taskId));
    }

    const job = await prismadb.cinemaJob.create({
      data: {
        projectId,
        shotId,
        userId,
        status: "processing",
        taskId: String(taskId),
        modelRoute: project.modelRoute,
        creditsCost: creditsToCharge,
        payload: payload as unknown as object,
      },
    });

    await prismadb.cinemaShot.update({
      where: { id: shotId },
      data: { generationStatus: "processing" },
    });

    return NextResponse.json({ jobId: job.id, taskId: String(taskId), status: "processing" });
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

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
    }

    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


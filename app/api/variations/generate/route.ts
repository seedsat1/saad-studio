import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  buildStoryboardPlan,
  buildAnglesPlan,
  estimateVariationCost,
} from "@/lib/variations-presets";
import type { VariationMode, VariationGenMode } from "@/lib/variations-presets";
import {
  uploadBase64ToKie,
  submitVariationTask,
} from "@/lib/variations-adapter";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationTaskMarker,
} from "@/lib/credit-ledger";

const KIE_API_KEY = process.env.KIE_API_KEY ?? "";

export async function POST(req: NextRequest) {
  let totalCharged = 0;
  let chargedUserId: string | null = null;
  const generationIds: string[] = [];

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!KIE_API_KEY) {
      return NextResponse.json({ error: "Generation service not configured" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const mode = (typeof body.mode === "string" ? body.mode : "storyboard") as VariationMode;
    const genMode = (typeof body.genMode === "string" ? body.genMode : "standard") as VariationGenMode;
    const outputCount = typeof body.outputCount === "number" ? body.outputCount : 9;
    const rawSelectedPresetIds = Array.isArray(body.selectedPresetIds) ? (body.selectedPresetIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
    const referenceImageUrl = typeof body.referenceImageUrl === "string" ? body.referenceImageUrl : "";
    const direction = typeof body.direction === "string" ? body.direction : "";
    const negativeDirection = typeof body.negativeDirection === "string" ? body.negativeDirection : "";
    const consistencyLock = typeof body.consistencyLock === "boolean" ? body.consistencyLock : true;
    const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9";

    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    if (!referenceImageUrl) return NextResponse.json({ error: "referenceImageUrl is required" }, { status: 400 });

    // Validate project ownership
    const project = await prismadb.variationProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Resolve reference image URL (upload base64 if needed)
    let resolvedRefUrl = referenceImageUrl;
    if (referenceImageUrl.startsWith("data:")) {
      resolvedRefUrl = await uploadBase64ToKie(referenceImageUrl, KIE_API_KEY);
    }

    // Build preset plan — use explicit preset IDs if provided, otherwise fall back to count-based plan
    let presetIds: string[];
    if (rawSelectedPresetIds.length > 0) {
      presetIds = rawSelectedPresetIds;
    } else if (mode === "storyboard") {
      const safeCount = ([4, 6, 9].includes(outputCount) ? outputCount : 9) as 4 | 6 | 9;
      presetIds = buildStoryboardPlan(safeCount);
    } else {
      const safeCount = ([4, 6, 8].includes(outputCount) ? outputCount : 6) as 4 | 6 | 8;
      presetIds = buildAnglesPlan(safeCount);
    }

    // Estimate cost
    const estimate = estimateVariationCost(mode, genMode, presetIds.length, consistencyLock);

    // Create job record
    const job = await prismadb.variationJob.create({
      data: {
        projectId,
        userId,
        status: "queued",
        payload: { mode, genMode, outputCount: presetIds.length, aspectRatio },
      },
    });

    // Create pending output records
    const pendingOutputs = await Promise.all(
      estimate.perOutput.map((o, idx) => {
        const presetId = presetIds[idx];
        const presetLabel =
          mode === "storyboard"
            ? (presetId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
            : (presetId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

        return prismadb.variationOutput.create({
          data: {
            projectId,
            jobId: job.id,
            userId,
            variationMode: mode,
            presetId,
            presetLabel,
            modelUsed: o.model,
            fallbackUsed: false,
            generationStatus: "pending",
            creditCost: o.credits,
          },
        });
      }),
    );

    // Charge credits upfront
    chargedUserId = userId;
    const chargeResult = await spendCredits({
      userId,
      credits: estimate.totalCredits,
      prompt: `Variations Studio – ${mode} (${presetIds.length} outputs)`,
      assetType: "variation",
      modelUsed: genMode === "standard" ? "nano-banana-pro" : "z-image",
    });
    totalCharged = estimate.totalCredits;
    generationIds.push(chargeResult.generationId);

    await setGenerationTaskMarker(chargeResult.generationId, `variation-job:${job.id}`);

    // Update job status
    await prismadb.variationJob.update({
      where: { id: job.id },
      data: { status: "processing" },
    });

    // Expected model per output (for fallback detection)
    const expectedModels = new Map(
      estimate.perOutput.map((o, idx) => [pendingOutputs[idx].id, o.model]),
    );

    // Submit tasks concurrently (fire-and-forget model — poll via /job/:id)
    const submittedOutputs = await Promise.allSettled(
      pendingOutputs.map(async (output) => {
        try {
          const result = await submitVariationTask(KIE_API_KEY, {
            mode,
            genMode,
            presetId: output.presetId,
            referenceImageUrl: resolvedRefUrl,
            userDirection: direction,
            userNegativeDirection: negativeDirection,
            consistencyLock,
            aspectRatio,
          });

          const expectedModel = expectedModels.get(output.id) ?? genMode === "standard" ? "nano-banana-pro" : "z-image";
          await prismadb.variationOutput.update({
            where: { id: output.id },
            data: {
              kieTaskId: result.kieTaskId,
              modelUsed: result.modelUsed,
              fallbackUsed: result.modelUsed !== expectedModel,
              generationStatus: "processing",
              creditCost: result.creditCost,
            },
          });

          return { outputId: output.id, kieTaskId: result.kieTaskId };
        } catch (err) {
          await prismadb.variationOutput.update({
            where: { id: output.id },
            data: { generationStatus: "failed" },
          });
          throw err;
        }
      }),
    );

    const successCount = submittedOutputs.filter((r) => r.status === "fulfilled").length;

    if (successCount === 0) {
      // Refund if nothing submitted
      await rollbackGenerationCharge(chargeResult.generationId, userId, estimate.totalCredits);
      await prismadb.variationJob.update({
        where: { id: job.id },
        data: { status: "failed", error: "All tasks failed to submit" },
      });
      return NextResponse.json({ error: "All generation tasks failed" }, { status: 500 });
    }

    await prismadb.variationJob.update({
      where: { id: job.id },
      data: { status: successCount === pendingOutputs.length ? "processing" : "partially_completed" },
    });

    const outputs = await prismadb.variationOutput.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      jobId: job.id,
      outputs,
      totalCredits: estimate.totalCredits,
      remainingCredits: chargeResult.remainingCredits,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, balance: err.currentBalance },
        { status: 402 },
      );
    }

    if (chargedUserId && generationIds.length > 0) {
      for (const gid of generationIds) {
        await rollbackGenerationCharge(gid, chargedUserId, totalCharged).catch(() => {});
      }
    }

    console.error("[variations/generate]", err);
    const errMsg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

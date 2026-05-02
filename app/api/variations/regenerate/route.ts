import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  uploadBase64ToKie,
  submitVariationTask,
} from "@/lib/variations-adapter";
import type { VariationMode, VariationGenMode } from "@/lib/variations-presets";
import { VARIATION_CREDIT_COSTS } from "@/lib/variations-presets";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  refundGenerationCharge,
  spendCredits,
} from "@/lib/credit-ledger";

const KIE_API_KEY = process.env.KIE_API_KEY ?? "";

export async function POST(req: NextRequest) {
  let generationId: string | null = null;
  let chargedUserId: string | null = null;
  let chargedCredits = 0;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    chargedUserId = userId;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const outputId = typeof body.outputId === "string" ? body.outputId : "";
    if (!outputId) return NextResponse.json({ error: "outputId is required" }, { status: 400 });

    const output = await prismadb.variationOutput.findUnique({
      where: { id: outputId },
      include: {
        project: {
          select: {
            userId: true,
            referenceAssetUrl: true,
            direction: true,
            negativeDirection: true,
            consistencyLock: true,
            aspectRatio: true,
            selectedGenMode: true,
            selectedMode: true,
          },
        },
      },
    });

    if (!output) return NextResponse.json({ error: "Output not found" }, { status: 404 });
    if (output.project.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const referenceImageUrl = output.project.referenceAssetUrl ?? "";
    if (!referenceImageUrl) return NextResponse.json({ error: "No reference image" }, { status: 400 });

    let resolvedRefUrl = referenceImageUrl;
    if (referenceImageUrl.startsWith("data:")) {
      resolvedRefUrl = await uploadBase64ToKie(referenceImageUrl, KIE_API_KEY);
    }

    const mode = output.project.selectedMode as VariationMode;
    const genMode = output.project.selectedGenMode as VariationGenMode;
    const creditCost = VARIATION_CREDIT_COSTS[output.modelUsed as keyof typeof VARIATION_CREDIT_COSTS] ?? 3;

    const precheck = await precheckGenerationPolicy({
      prompt: output.project.direction ?? "",
      negativePrompt: output.project.negativeDirection ?? "",
      extraText: `Variations Studio – Regenerate ${output.presetId}`,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const { generationId: gid, remainingCredits } = await spendCredits({
      userId,
      credits: creditCost,
      prompt: `Variations Studio – Regenerate ${output.presetId}`,
      assetType: "variation",
      modelUsed: output.modelUsed,
    });
    generationId = gid;
    chargedCredits = creditCost;

    // Reset output status
    await prismadb.variationOutput.update({
      where: { id: outputId },
      data: { generationStatus: "processing", assetUrl: null, thumbnailUrl: null, kieTaskId: null },
    });

    const result = await submitVariationTask(KIE_API_KEY, {
      mode,
      genMode,
      presetId: output.presetId,
      referenceImageUrl: resolvedRefUrl,
      userDirection: output.project.direction,
      userNegativeDirection: output.project.negativeDirection,
      consistencyLock: output.project.consistencyLock,
      aspectRatio: output.project.aspectRatio,
    });

    await prismadb.variationOutput.update({
      where: { id: outputId },
      data: {
        kieTaskId: result.kieTaskId,
        modelUsed: result.modelUsed,
        generationStatus: "processing",
        creditCost: result.creditCost,
        fallbackUsed: result.modelUsed !== output.modelUsed,
      },
    });

    return NextResponse.json({
      generationId,
      outputId,
      kieTaskId: result.kieTaskId,
      modelUsed: result.modelUsed,
      remainingCredits,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, balance: err.currentBalance },
        { status: 402 },
      );
    }
    if (generationId) {
      await refundGenerationCharge(generationId, chargedUserId ?? "", chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }
    console.error("[variations/regenerate]", err);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
  }
}

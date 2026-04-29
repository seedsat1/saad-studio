import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  refundCreditsWithReason,
  refundGenerationCharge,
  spendCredits,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import {
  type GenerationMode,
  type ShotType,
  type NormalizedShotOutput,
  estimateShotCredits,
  getShotPack,
  SHOT_PRESETS,
  routeShotModel,
} from "@/lib/shots-studio";
import { generateShotWithFallback, uploadBase64ToKie } from "@/lib/shots-adapters";

/** Allow up to 5 minutes for serverless execution (large packs run concurrently) */
export const maxDuration = 300;

interface ShotsGenerateBody {
  mode?: GenerationMode;
  packId?: string;
  shotTypes?: ShotType[];
  /** Subject description / user creative prompt */
  prompt?: string;
  /**
   * Reference image: either a base64 data URI (data:image/...;base64,...) or
   * an https:// URL already hosted externally.
   */
  referenceImage?: string;
  consistencyLock?: boolean;
}

export async function POST(req: NextRequest) {
  let chargedCredits  = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null  = null;

  try {
    // ── Security gates ──
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip   = getClientIp(req);
    const rate = checkRateLimit(`shots:${userId}:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    // ── Parse body ──
    const body: ShotsGenerateBody = await req.json();
    const {
      mode           = "standard",
      packId,
      shotTypes: shotTypesInput,
      prompt         = "",
      referenceImage,
      consistencyLock = false,
    } = body;

    // ── Resolve shot types ──
    let shotTypes: ShotType[];

    if (shotTypesInput && shotTypesInput.length > 0) {
      shotTypes = shotTypesInput.filter((s) => s in SHOT_PRESETS);
    } else if (packId) {
      const pack = getShotPack(packId);
      if (!pack) {
        return NextResponse.json(
          { error: `Unknown packId: "${packId}"` },
          { status: 400 },
        );
      }
      shotTypes = pack.shots;
    } else {
      return NextResponse.json(
        { error: 'Provide "packId" or "shotTypes" array.' },
        { status: 400 },
      );
    }

    if (shotTypes.length === 0) {
      return NextResponse.json({ error: "No valid shot types resolved." }, { status: 400 });
    }
    if (shotTypes.length > 15) {
      return NextResponse.json(
        { error: "Maximum 15 shots per request." },
        { status: 400 },
      );
    }

    // ── Calculate total cost (server-authoritative) ──
    const estimate = estimateShotCredits(shotTypes, mode, consistencyLock);

    // ── Charge all credits upfront ──
    const sanitizedPrompt = sanitizePrompt(
      prompt || `Shots studio – ${packId ?? "custom"} pack`,
      1000,
    );

    const precheck = await precheckGenerationPolicy({ prompt: sanitizedPrompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const spent = await spendCredits({
      userId,
      credits: estimate.total,
      prompt: sanitizedPrompt,
      assetType: "IMAGE",
      modelUsed: `shots/${mode}`,
    });
    chargedCredits = estimate.total;
    chargedUserId  = userId;
    generationId   = spent.generationId;

    // ── Get API key ──
    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) {
      throw new Error("KIE_API_KEY is not configured on the server.");
    }

    // ── Resolve reference image to a hosted URL ──
    let referenceImageUrl: string | undefined;
    if (referenceImage) {
      if (referenceImage.startsWith("data:")) {
        referenceImageUrl = await uploadBase64ToKie(referenceImage, apiKey);
      } else if (referenceImage.startsWith("https://") || referenceImage.startsWith("http://")) {
        referenceImageUrl = referenceImage;
      }
    }

    // ── Generate all shots concurrently with per-shot routing & fallback ──
    const tasks = estimate.breakdown.map((b, idx) =>
      generateShotWithFallback({
        apiKey,
        shotType: b.shotType,
        primaryModel: routeShotModel(b.shotType, mode, consistencyLock),
        userPrompt: sanitizedPrompt,
        referenceImageUrl,
        mode,
        outputId: `${generationId}_${idx}`,
      }),
    );

    const settled = await Promise.allSettled(tasks);

    // ── Collect outputs, calculate refunds for failed shots ──
    const outputs: NormalizedShotOutput[] = [];
    let creditsToRefund = 0;

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        const output = result.value;
        outputs.push(output);
        // Refund cost for failed shots (no asset produced)
        if (output.generation_status === "failed") {
          creditsToRefund += estimate.breakdown[i]?.cost ?? 0;
        }
      }
      // generateShotWithFallback never rejects, but handle defensively
    }

    // ── Partial refund for failures ──
    if (creditsToRefund > 0 && chargedUserId) {
      await refundCreditsWithReason(
        chargedUserId,
        creditsToRefund,
        "generation_refund_partial_failure",
        generationId,
      ).catch(() => {});
    }

    // ── Save first successful asset URL to the generation record ──
    const firstSuccess = outputs.find((o) => o.asset_url);
    if (generationId && firstSuccess?.asset_url) {
      await setGenerationMediaUrl(generationId, firstSuccess.asset_url).catch(() => {});
    }

    const actualCost    = estimate.total - creditsToRefund;
    const successCount  = outputs.filter((o) => o.generation_status !== "failed").length;
    const fallbackCount = outputs.filter((o) => o.fallback_used).length;

    return NextResponse.json({
      outputs,
      generationId,
      summary: {
        totalCost: actualCost,
        shotCount: shotTypes.length,
        successCount,
        failedCount: outputs.length - successCount,
        fallbackCount,
        mode,
        creditsRefunded: creditsToRefund,
      },
    });
  } catch (err) {
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

    // Full refund on unexpected error
    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }

    const message = err instanceof Error ? err.message : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

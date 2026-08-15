// ============================================================
// FILE: app/api/cinematic-video/generate/route.ts
// DESCRIPTION: Start a Veo 3.1 generation via the direct Gemini
//   API. Charges credits using the standard pricing pipeline,
//   creates a Generation row, and returns the operation handle
//   so the client can poll /api/cinematic-video/status.
// AUTH: Clerk user
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  rollbackGenerationCharge,
} from "@/lib/credit-ledger";
import { runTaskGenerationStart } from "@/lib/generation/task-orchestrator";
import { getGenerationCost } from "@/lib/pricing";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  getClientIp,
  isAllowedOrigin,
  isSafePublicHttpUrl,
  sanitizePrompt,
} from "@/lib/security";
import {
  PRICING_ID,
  startVeoGeneration,
  urlToImageInput,
  urlToVideoInput,
  type VeoAspect,
  type VeoResolution,
  type VeoTier,
} from "@/lib/gemini-veo";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TIERS = new Set<VeoTier>(["lite", "fast", "pro"]);
const ALLOWED_ASPECTS = new Set<VeoAspect>(["16:9", "9:16"]);
const ALLOWED_RES = new Set<VeoResolution>(["720p", "1080p", "4k"]);

interface CinematicRequestBody {
  tier?: VeoTier;
  prompt?: string;
  aspectRatio?: VeoAspect;
  resolution?: VeoResolution;
  durationSeconds?: number;
  negativePrompt?: string;
  /** Public HTTPS URLs (Supabase / uploaded) — server pulls bytes */
  startImageUrl?: string;
  endImageUrl?: string;
  referenceImageUrls?: string[];
  extendVideoUrl?: string;
}

class CinematicProviderSubmitError extends Error {
  constructor(message: string, readonly originalError: unknown) {
    super(message);
    this.name = "CinematicProviderSubmitError";
  }
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedCredits = 0;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    chargedUserId = userId;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`cinematic:${userId}:${ip}`, 12, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const raw = (await req.json().catch(() => null)) as CinematicRequestBody | null;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const tier: VeoTier = ALLOWED_TIERS.has(raw.tier as VeoTier)
      ? (raw.tier as VeoTier)
      : "fast";

    const prompt = sanitizePrompt(typeof raw.prompt === "string" ? raw.prompt : "");
    if (!prompt || prompt.length < 4) {
      return NextResponse.json(
        { error: "Prompt is required (min 4 chars)" },
        { status: 400 },
      );
    }

    const aspectRatio: VeoAspect = ALLOWED_ASPECTS.has(raw.aspectRatio as VeoAspect)
      ? (raw.aspectRatio as VeoAspect)
      : "16:9";

    let resolution: VeoResolution = ALLOWED_RES.has(raw.resolution as VeoResolution)
      ? (raw.resolution as VeoResolution)
      : "720p";

    // Google constraint: Lite tier does NOT support 4K — downgrade to 1080p.
    if (tier === "lite" && resolution === "4k") {
      resolution = "1080p";
    }

    // Google constraint: video extension is 720p ONLY.
    if (raw.extendVideoUrl) {
      resolution = "720p";
    }

    // Google constraint: duration MUST be one of 4, 6, 8 seconds only.
    const ALLOWED_DURATIONS = new Set<number>([4, 6, 8]);
    const rawDur = Math.floor(Number(raw.durationSeconds) || 8);
    let durationSeconds: number = ALLOWED_DURATIONS.has(rawDur) ? rawDur : 8;

    // Google constraint: duration MUST be 8 when using reference images,
    // video extension, or 1080p / 4k resolutions.
    const refImageCount = Array.isArray(raw.referenceImageUrls)
      ? raw.referenceImageUrls.filter((u) => typeof u === "string" && u.trim()).length
      : 0;
    if (tier === "lite" && refImageCount > 0) {
      return NextResponse.json(
        {
          error: "Veo 3.1 Lite supports start/end frames only, not generic referenceImages.",
        },
        { status: 400 },
      );
    }
    const requiresEightSeconds =
      refImageCount > 0 ||
      !!raw.extendVideoUrl ||
      resolution === "1080p" ||
      resolution === "4k";
    if (requiresEightSeconds) {
      durationSeconds = 8;
    }

    // Google constraint: Lite tier does NOT support video extension.
    if (raw.extendVideoUrl && tier === "lite") {
      return NextResponse.json(
        {
          error:
            "Video extension is not available on Veo 3.1 Lite. Choose Veo 3.1 Fast or Veo 3.1.",
        },
        { status: 400 },
      );
    }

    const negativePrompt =
      typeof raw.negativePrompt === "string" && raw.negativePrompt.trim()
        ? sanitizePrompt(raw.negativePrompt)
        : undefined;

    // ── Pricing ─────────────────────────────────────────────────────────
    const pricingId = PRICING_ID[tier];
    const cost = await getGenerationCost(pricingId, durationSeconds, 1, resolution);
    if (!Number.isFinite(cost) || cost <= 0) {
      return NextResponse.json(
        { error: "Pricing for this model is not configured." },
        { status: 500 },
      );
    }
    const credits = Math.ceil(cost);

    // ── Content moderation precheck ─────────────────────────────────────
    const policy = await precheckGenerationPolicy({
      prompt,
      negativePrompt: negativePrompt ?? null,
    });
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.message, reason: policy.reason },
        { status: 403 },
      );
    }

    // ── Fetch any uploaded reference media ──────────────────────────────
    const safeUrl = (u: unknown): string | null => {
      if (typeof u !== "string" || !u.trim()) return null;
      return isSafePublicHttpUrl(u) ? u : null;
    };

    const startUrl = safeUrl(raw.startImageUrl);
    const endUrl = safeUrl(raw.endImageUrl);
    const refUrls = Array.isArray(raw.referenceImageUrls)
      ? (raw.referenceImageUrls
          .map(safeUrl)
          .filter((u): u is string => !!u)
          .slice(0, 3))
      : [];
    const extendUrl = safeUrl(raw.extendVideoUrl);

    const [image, lastFrame, referenceImages, video] = await Promise.all([
      startUrl ? urlToImageInput(startUrl) : Promise.resolve(undefined),
      endUrl ? urlToImageInput(endUrl) : Promise.resolve(undefined),
      refUrls.length
        ? Promise.all(refUrls.map((u) => urlToImageInput(u)))
        : Promise.resolve([]),
      extendUrl ? urlToVideoInput(extendUrl) : Promise.resolve(undefined),
    ]);

    // ── Charge credits + create generation row ──────────────────────────
    let startResult: Awaited<ReturnType<typeof runTaskGenerationStart<{
      taskId: string;
      name: string;
      model: string;
    }>>>;
    try {
      startResult = await runTaskGenerationStart({
        charge: {
          userId,
          prompt,
          assetType: "video",
          modelUsed: pricingId,
          credits,
        },
        submit: async () => {
          let opHandle: Awaited<ReturnType<typeof startVeoGeneration>>;
          try {
            opHandle = await startVeoGeneration({
              tier,
              prompt,
              aspectRatio,
              resolution,
              durationSeconds,
              negativePrompt,
              image,
              lastFrame: image ? lastFrame : undefined, // last frame requires a start
              referenceImages: referenceImages.length ? referenceImages : undefined,
              video,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Generation failed.";
            throw new CinematicProviderSubmitError(message, err);
          }

          return {
            ...opHandle,
            taskId: opHandle.name,
          };
        },
      });
      generationId = startResult.generationId;
      chargedCredits = startResult.chargedCredits;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: "Insufficient credits.",
            currentBalance: err.currentBalance,
            requiredCredits: err.requiredCredits,
          },
          { status: 402 },
        );
      }
      if (!(err instanceof CinematicProviderSubmitError)) {
        throw err;
      }
      const message = err instanceof Error ? err.message : "Generation failed.";
      console.error("[cinematic-video] startVeoGeneration error:", err.originalError);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const opHandle = startResult.providerResult;

    return NextResponse.json({
      generationId: startResult.generationId,
      operationName: opHandle.name,
      model: opHandle.model,
      creditsCharged: startResult.chargedCredits,
      remainingCredits: startResult.remainingCredits,
      status: "processing",
    }, { status: 202 });
  } catch (err) {
    if (generationId && chargedUserId && chargedCredits > 0) {
      await rollbackGenerationCharge(
        generationId,
        chargedUserId,
        chargedCredits,
      ).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[cinematic-video] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

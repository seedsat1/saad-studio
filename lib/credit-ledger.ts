import { clerkClient } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { WELCOME_SIGNUP_CREDITS } from "@/lib/credits-config";
import { SAAD_PLANS } from "@/lib/pricing-models";
import { isStorageConfigured, uploadUrlToStorage } from "@/lib/supabase-storage";
import { maybeSendLowCreditAlert } from "@/lib/notifications";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class InsufficientCreditsError extends Error {
  constructor(public readonly currentBalance: number, public readonly requiredCredits: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

export class PolicyBlockedError extends Error {
  constructor(public readonly reason: string, public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "PolicyBlockedError";
  }
}

export class CreditAdvanceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CreditAdvanceError";
  }
}

export async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId).catch(() => null);
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  // Welcome bonus is OFF by default. Only set creditsExpireAt when we
  // actually allocate something — a zero-credit account doesn't need a
  // ticking 30-day expiry.
  const welcome = Math.max(0, Math.floor(WELCOME_SIGNUP_CREDITS));

  try {
    return await prismadb.user.create({
      data: {
        id: userId,
        email,
        name,
        creditBalance: welcome,
        creditsExpireAt: welcome > 0 ? new Date(Date.now() + THIRTY_DAYS_MS) : null,
        role: "USER",
        isBanned: false,
      },
    });
  } catch {
    // Unique-constraint race or email already used by another row
    const retry = await prismadb.user.findUnique({ where: { id: userId } });
    if (retry) return retry;
    const byEmail = await prismadb.user.findUnique({ where: { email } });
    if (byEmail) return byEmail;
    throw new Error(`Cannot create DB row for user ${userId}`);
  }
}

export async function ensureWelcomeCredits(userId: string) {
  const user = await ensureUserRow(userId);
  // No-op when the welcome bonus is disabled — never silently top up.
  if (WELCOME_SIGNUP_CREDITS <= 0) return user;
  if (user.creditBalance > 0) return user;

  const [generationCount, transactionCount] = await Promise.all([
    prismadb.generation.count({ where: { userId } }),
    prismadb.adminTransaction.count({ where: { userId } }),
  ]);

  if (generationCount > 0 || transactionCount > 0 || user.monthlyCredits > 0) {
    return user;
  }

  return prismadb.user.update({
    where: { id: userId },
    data: {
      creditBalance: WELCOME_SIGNUP_CREDITS,
      creditsExpireAt: user.creditsExpireAt ?? new Date(Date.now() + THIRTY_DAYS_MS),
    },
  });
}
// ─── Credit Expiry & Renewal ─────────────────────────────────────────────────

/**
 * Check if the user's credits have expired. If the user has an active annual
 * subscription and 30 days have passed, auto-renew their credits.
 * For monthly subscribers, expired credits are reset to 0.
 * Called automatically before every spendCredits().
 */
async function handleCreditExpiry(userId: string): Promise<void> {
  const user = await prismadb.user.findUnique({ where: { id: userId } });
  if (!user?.creditsExpireAt) return; // no expiry set → welcome/admin credits, skip

  const now = new Date();
  if (user.creditsExpireAt > now) return; // not expired yet

  // Credits have expired — check if user has an active subscription (annual OR monthly)
  const subscription = await prismadb.userSubscription.findUnique({
    where: { userId },
    select: {
      billingInterval: true,
      planId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  // STRICT TIMING: subscription is active only if stripeCurrentPeriodEnd is
  // still in the future. NO grace period — not a day, not an hour.
  const isSubscriptionActive =
    subscription?.stripePriceId &&
    subscription?.stripeCurrentPeriodEnd &&
    subscription.stripeCurrentPeriodEnd.getTime() > now.getTime();

  // Only annual subscribers get auto-renewed every 30 days.
  // Monthly subscribers must pay again — their credits expire and stay at 0.
  if (isSubscriptionActive && subscription?.billingInterval === "annual" && subscription?.planId) {
    const plan = SAAD_PLANS.find((p) => p.id === subscription.planId);
    const monthlyCredits = plan?.credits ?? user.monthlyCredits;

    if (monthlyCredits > 0) {
      const advanceBalance = Math.max(0, Math.floor(user.creditAdvanceBalance ?? 0));
      const advanceDeduction = Math.min(advanceBalance, monthlyCredits);
      const remainingAdvance = advanceBalance - advanceDeduction;

      await prismadb.user.update({
        where: { id: userId },
        data: {
          creditBalance: monthlyCredits - advanceDeduction,
          monthlyCredits,
          creditsExpireAt: new Date(now.getTime() + THIRTY_DAYS_MS),
          lastCreditRenewal: now,
          creditAdvanceBalance: remainingAdvance,
          ...(remainingAdvance <= 0
            ? {
                creditAdvanceRequestedAt: null,
                creditAdvanceCycleEnd: null,
              }
            : {}),
        },
      });
      return;
    }
  }

  // No active subscription — expire credits
  await prismadb.user.update({
    where: { id: userId },
    data: {
      creditBalance: 0,
      monthlyCredits: 0,
      creditsExpireAt: null,
      lastCreditRenewal: null,
      creditAdvanceBalance: 0,
      creditAdvanceRequestedAt: null,
      creditAdvanceCycleEnd: null,
    },
  });
}

/**
 * Return the user's existing expiry IF it is still in the future, otherwise
 * fall back to (now + 30 days). Used by topups: they MUST NOT extend the
 * current cycle (no rollover), but new users with no active cycle still
 * need a 30-day window to spend what they just purchased.
 */
function preserveExpiryOrFresh(current: Date | null | undefined): Date {
  const now = Date.now();
  if (current && current.getTime() > now) return current;
  return new Date(now + THIRTY_DAYS_MS);
}

/**
 * Allocate subscription credits to a user after payment.
 *
 * Behaviour (no rollover — matches the stated business model):
 *   - creditBalance = plan.credits         → replaces the balance, any
 *                                              unused credits from the
 *                                              previous cycle are discarded.
 *   - monthlyCredits = plan.credits        → recorded for auto-renew use.
 *   - creditsExpireAt = now + 30 days      → fresh 30-day window starts.
 *                                              Annual subscribers refresh
 *                                              monthly via handleCreditExpiry().
 *
 * Same function used by Stripe webhook AND manual admin-approval flow,
 * so both payment paths behave identically.
 */
export async function allocateSubscriptionCredits(
  userId: string,
  planId: string,
  billingInterval: "monthly" | "annual",
): Promise<void> {
  void billingInterval;
  await ensureUserRow(userId);
  const plan = SAAD_PLANS.find((p) => p.id === planId);
  if (!plan) return;

  const now = new Date();
  await prismadb.user.update({
    where: { id: userId },
    data: {
      creditBalance: plan.credits,
      monthlyCredits: plan.credits,
      creditsExpireAt: new Date(now.getTime() + THIRTY_DAYS_MS),
      lastCreditRenewal: now,
      creditAdvanceBalance: 0,
      creditAdvanceRequestedAt: null,
      creditAdvanceCycleEnd: null,
    },
  });
}

function sameCycleEnd(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return Boolean(a && b && a.getTime() === b.getTime());
}

export async function requestAnnualCreditAdvance(userId: string, requestedAmount?: number) {
  await ensureUserRow(userId);
  await handleCreditExpiry(userId);

  const now = new Date();
  const [user, subscription] = await Promise.all([
    prismadb.user.findUnique({
      where: { id: userId },
      select: {
        creditBalance: true,
        monthlyCredits: true,
        creditsExpireAt: true,
        creditAdvanceBalance: true,
        creditAdvanceCycleEnd: true,
      },
    }),
    prismadb.userSubscription.findUnique({
      where: { userId },
      select: {
        billingInterval: true,
        planId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
  ]);

  const isSubscriptionActive = Boolean(
    subscription?.stripePriceId &&
      subscription?.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd.getTime() > now.getTime(),
  );

  if (!isSubscriptionActive || subscription?.billingInterval !== "annual") {
    throw new CreditAdvanceError("annual_subscription_required", "Credit advance is available for active annual subscriptions only.");
  }

  if (!user?.creditsExpireAt || user.creditsExpireAt.getTime() <= now.getTime()) {
    throw new CreditAdvanceError("no_active_credit_cycle", "No active credit cycle is available for advance credits.");
  }

  if (sameCycleEnd(user.creditAdvanceCycleEnd, user.creditsExpireAt)) {
    throw new CreditAdvanceError("already_requested_this_cycle", "Credit advance was already requested for this credit cycle.");
  }

  const planCredits = subscription.planId
    ? (SAAD_PLANS.find((p) => p.id === subscription.planId)?.credits ?? 0)
    : 0;
  const monthlyCredits = Math.max(0, Math.floor(planCredits || user.monthlyCredits || 0));
  if (monthlyCredits <= 0) {
    throw new CreditAdvanceError("no_monthly_allowance", "No monthly allowance is configured for this annual subscription.");
  }

  const amount = requestedAmount == null
    ? monthlyCredits
    : Math.max(0, Math.floor(requestedAmount));

  if (amount <= 0 || amount > monthlyCredits) {
    throw new CreditAdvanceError("invalid_advance_amount", "Advance amount must be between 1 and the monthly allowance.");
  }

  const updated = await prismadb.user.update({
    where: { id: userId },
    data: {
      creditBalance: { increment: amount },
      creditAdvanceBalance: { increment: amount },
      creditAdvanceRequestedAt: now,
      creditAdvanceCycleEnd: user.creditsExpireAt,
    },
    select: {
      creditBalance: true,
      monthlyCredits: true,
      creditsExpireAt: true,
      creditAdvanceBalance: true,
      creditAdvanceRequestedAt: true,
      creditAdvanceCycleEnd: true,
    },
  });

  return {
    credited: amount,
    creditBalance: updated.creditBalance,
    monthlyCredits: updated.monthlyCredits,
    creditsExpireAt: updated.creditsExpireAt,
    creditAdvanceBalance: updated.creditAdvanceBalance,
    creditAdvanceRequestedAt: updated.creditAdvanceRequestedAt,
    creditAdvanceCycleEnd: updated.creditAdvanceCycleEnd,
  };
}

/**
 * Add stand-alone topup credits to a user.
 *
 * STRICT NO-ROLLOVER POLICY:
 *   - creditBalance is incremented by the purchased amount.
 *   - creditsExpireAt is INHERITED from the user's current cycle. The topup
 *     does NOT extend the cycle and the topup credits die together with the
 *     rest of the pool when the cycle ends — there is no carryover into
 *     the next month, ever.
 *   - For users with no active cycle (free users / expired credits), the
 *     topup opens a single fresh 30-day window so the purchase is usable.
 */
export async function applyTopupCredits(userId: string, credits: number): Promise<void> {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (!userId || safeCredits <= 0) return;
  await ensureUserRow(userId);

  const existing = await prismadb.user.findUnique({
    where: { id: userId },
    select: { creditsExpireAt: true },
  });

  const finalExpiry = preserveExpiryOrFresh(existing?.creditsExpireAt);

  await prismadb.user.update({
    where: { id: userId },
    data: {
      creditBalance: { increment: safeCredits },
      creditsExpireAt: finalExpiry,
    },
  });
}

type SpendCreditsInput = {
  userId: string;
  credits: number;
  prompt: string;
  assetType: string;
  modelUsed: string;
  mediaUrl?: string | null;
  resolution?: string | null;
  duration?: number | null;
  aspectRatio?: string | null;
  quality?: string | null;
  providerName?: string | null;
  providerModel?: string | null;
  providerRequestId?: string | null;
  providerCostUsd?: number | null;
  providerTokens?: number | null;
  providerCredits?: number | null;
  providerCostSource?: string | null;

  // Snapshot fields
  generationType?: string | null;
  mode?: string | null;
  requestPayload?: any;
  estimatedProviderCostUsd?: number | null;
};

type CreditLedgerReason =
  | "generation_charge"
  | "generation_refund_provider_failed"
  | "generation_refund_blocked_result"
  | "generation_refund_no_output"
  | "generation_refund_partial_failure";

async function tryCreateCreditLedgerEntry(
  tx: typeof prismadb,
  data: { userId: string; generationId?: string | null; delta: number; reason: CreditLedgerReason },
): Promise<void> {
  try {
    await (tx as any).creditLedgerEntry.create({
      data: {
        userId: data.userId,
        generationId: data.generationId ?? null,
        delta: data.delta,
        reason: data.reason,
      },
    });
  } catch {
    // Best-effort: do not break generation flow if the DB schema is not yet migrated.
  }
}

function inferGenerationType(assetType: string): "image" | "video" {
  const t = String(assetType || "").toLowerCase();
  return t.includes("video") ? "video" : "image";
}

function isPublicHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

async function resolveProviderTrackingFallback(input: {
  modelUsed: string;
  duration?: number | null;
  resolution?: string | null;
  quality?: string | null;
  providerName?: string | null;
  providerModel?: string | null;
  providerCostUsd?: number | null;
  providerCostSource?: string | null;
  providerCredits?: number | null;
  providerTokens?: number | null;
}) {
  let providerName = input.providerName;
  let providerModel = input.providerModel;
  let providerCostUsd = input.providerCostUsd;
  let providerCostSource = input.providerCostSource;
  let providerCredits = input.providerCredits;
  let providerTokens = input.providerTokens;

  const modelLower = (input.modelUsed || "").toLowerCase();

  if (!providerName) {
    if (modelLower.includes("dreamina") || modelLower.includes("seedance") || modelLower.includes("byteplus") || modelLower.includes("bytedance")) {
      providerName = "BytePlus";
    } else if (modelLower.includes("veo") || modelLower.includes("gemini") || modelLower.includes("google") || modelLower.includes("banana") || modelLower.includes("imagen")) {
      providerName = "Google";
    } else if (modelLower.includes("openai") || modelLower.includes("sora") || modelLower.includes("gpt") || modelLower.includes("dall-e")) {
      providerName = "OpenAI";
    } else if (modelLower.includes("wavespeed") || modelLower.includes("heartmula") || modelLower.includes("music_gen") || modelLower.includes("music") || modelLower.includes("transition")) {
      providerName = "WaveSpeed";
    } else if (modelLower.includes("reap") || modelLower.includes("clipcraft")) {
      providerName = "Reap";
    } else {
      providerName = "KIE.ai";
    }
  }

  if (!providerModel) {
    providerModel = input.modelUsed;
  }

  if (providerCostUsd === undefined || providerCostUsd === null) {
    try {
      const { estimateProviderCostSync, loadModels, resolveConstitutionId } = await import("./pricing");
      const models = await loadModels().catch(() => []);
      const constId = resolveConstitutionId(input.modelUsed, models);
      const model = models.find(m => m.id === constId);
      
      const isPerSec = model ? model.billing === "per_sec" : (modelLower.includes("video") || modelLower.includes("cinema") || modelLower.includes("seedance") || modelLower.includes("veo") || modelLower.includes("sora") || modelLower.includes("hailuo") || modelLower.includes("kling") || modelLower.includes("grok"));
      
      if (isPerSec && (input.duration === undefined || input.duration === null)) {
        providerCostUsd = null;
        providerCostSource = "unknown";
      } else {
        const durationSec = input.duration || 0;
        const est = estimateProviderCostSync(input.modelUsed, durationSec, input.resolution || input.quality);
        providerCostUsd = est.usd;
        providerCostSource = est.source;
        if (providerName === "KIE.ai" && est.usd !== null && providerCredits === null) {
          providerCredits = est.usd / 0.005;
        }
      }
    } catch (e) {
      console.error("[resolveProviderTrackingFallback] Failed to estimate provider cost:", e);
      providerCostUsd = null;
      providerCostSource = "unknown";
    }
  }

  return {
    providerName,
    providerModel,
    providerCostUsd,
    providerCostSource: providerCostSource || "unknown",
    providerCredits,
    providerTokens,
  };
}

async function createRequestSnapshot(
  tx: any,
  generationId: string,
  userId: string,
  input: SpendCreditsInput,
  resolved: any,
  credits: number
) {
  try {
    const payload = input.requestPayload || null;
    let mode = input.mode || null;
    let generationType = input.generationType || null;
    let duration = input.duration ?? null;
    let resolution = input.resolution ?? null;
    let aspectRatio = input.aspectRatio ?? null;
    let quality = input.quality ?? null;

    // Try to infer from payload if not explicitly passed
    if (payload && typeof payload === "object") {
      // mode
      if (!mode) {
        mode = payload.mode ?? payload.quality ?? payload.style ?? null;
      }
      // generationType
      if (!generationType) {
        generationType = payload.generation_type ?? payload.generationType ?? payload.type ?? null;
        if (!generationType) {
          const hasImage = !!(
            payload.image_url ??
            payload.imageUrl ??
            payload.image ??
            payload.images ??
            payload.first_frame_url ??
            payload.firstFrameUrl ??
            payload.start_image ??
            payload.startImage ??
            payload.reference_image_urls ??
            payload.referenceImageUrls ??
            payload.imageUrls ??
            payload.imageUrlList
          );
          const isVideo = String(input.assetType || "").toLowerCase().includes("video");
          if (isVideo) {
            generationType = hasImage ? "image-to-video" : "text-to-video";
          } else {
            generationType = hasImage ? "image-to-image" : "text-to-image";
          }
        }
      }
      // duration
      if (duration === null || duration === undefined) {
        duration = payload.duration ?? payload.duration_seconds ?? payload.seconds ?? null;
      }
      // resolution
      if (!resolution) {
        resolution = payload.resolution ?? payload.target_res ?? payload.size ?? null;
      }
      // aspectRatio
      if (!aspectRatio) {
        aspectRatio = payload.aspect_ratio ?? payload.aspectRatio ?? payload.ratio ?? null;
      }
      // quality
      if (!quality) {
        quality = payload.quality ?? payload.mode ?? null;
      }
    }

    // Coerce values to clean types
    if (duration !== null && duration !== undefined) {
      duration = Number(duration);
      if (isNaN(duration)) duration = null;
    }
    if (mode !== null && mode !== undefined) mode = String(mode);
    if (generationType !== null && generationType !== undefined) generationType = String(generationType);
    if (resolution !== null && resolution !== undefined) resolution = String(resolution);
    if (aspectRatio !== null && aspectRatio !== undefined) aspectRatio = String(aspectRatio);
    if (quality !== null && quality !== undefined) quality = String(quality);

    await tx.generationRequestSnapshot.create({
      data: {
        generationId,
        userId,
        provider: resolved.providerName ?? null,
        model: resolved.providerModel ?? null,
        generationType,
        duration,
        resolution,
        aspectRatio,
        quality,
        mode,
        userCreditsCharged: credits,
        estimatedProviderCostUsd: resolved.providerCostUsd ?? null,
        requestPayload: payload,
      },
    });
  } catch (error) {
    console.error("[createRequestSnapshot] Failed to write generation request snapshot:", error);
  }
}

export async function spendCredits(input: SpendCreditsInput) {
  const credits = Math.max(0, Math.ceil(input.credits));
  if (credits <= 0) {
    throw new Error(`Invalid credit amount: ${input.credits}`);
  }

  await ensureUserRow(input.userId);

  // Handle credit expiry/renewal before checking balance
  await handleCreditExpiry(input.userId);

  const result = await prismadb.$transaction(async (tx) => {
    const updatedCount = await tx.user.updateMany({
      where: {
        id: input.userId,
        creditBalance: { gte: credits },
      },
      data: { creditBalance: { decrement: credits } },
    });

    if (updatedCount.count !== 1) {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { creditBalance: true },
      });
      const balance = user?.creditBalance ?? 0;
      throw new InsufficientCreditsError(balance, credits);
    }

    const updated = await tx.user.findUnique({
      where: { id: input.userId },
      select: { creditBalance: true },
    });

    const resolved = await resolveProviderTrackingFallback({
      modelUsed: input.modelUsed,
      duration: input.duration,
      resolution: input.resolution,
      quality: input.quality,
      providerName: input.providerName,
      providerModel: input.providerModel,
      providerCostUsd: input.providerCostUsd,
      providerCostSource: input.providerCostSource,
      providerCredits: input.providerCredits,
      providerTokens: input.providerTokens,
    });

    const generation = await tx.generation.create({
      data: {
        userId: input.userId,
        prompt: input.prompt,
        assetType: input.assetType,
        modelUsed: input.modelUsed,
        mediaUrl: input.mediaUrl ?? null,
        outputUrl: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? input.mediaUrl : null,
        type: inferGenerationType(input.assetType),
        status: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? "completed" : "queued",
        cost: credits,
        resolution: input.resolution ?? null,
        duration: input.duration ?? null,
        aspectRatio: input.aspectRatio ?? null,
        quality: input.quality ?? null,
        providerName: resolved.providerName ?? null,
        providerModel: resolved.providerModel ?? null,
        providerRequestId: input.providerRequestId ?? null,
        providerCostUsd: resolved.providerCostUsd ?? null,
        providerTokens: resolved.providerTokens ?? null,
        providerCredits: resolved.providerCredits ?? null,
        providerCostSource: resolved.providerCostSource ?? null,
      },
      select: { id: true },
    });

    await tx.providerUsageRecord.create({
      data: {
        userId: input.userId,
        generationId: generation.id,
        providerName: resolved.providerName ?? null,
        providerModel: resolved.providerModel ?? null,
        providerRequestId: input.providerRequestId ?? null,
        providerCostUsd: resolved.providerCostUsd ?? null,
        providerTokens: resolved.providerTokens ?? null,
        providerCredits: resolved.providerCredits ?? null,
        providerCostSource: resolved.providerCostSource ?? null,
        duration: input.duration ?? null,
        resolution: input.resolution ?? null,
        quality: input.quality ?? null,
        aspectRatio: input.aspectRatio ?? null,
        status: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? "completed" : "queued",
      },
    });

    await createRequestSnapshot(tx, generation.id, input.userId, input, resolved, credits);

    await tryCreateCreditLedgerEntry(tx as any, {
      userId: input.userId,
      generationId: generation.id,
      delta: -credits,
      reason: "generation_charge",
    });

    return { remainingCredits: Math.max(0, updated?.creditBalance ?? 0), generationId: generation.id };
  });

  await maybeSendLowCreditAlert(input.userId, result.remainingCredits).catch((error) => {
    console.error("[credit alert] failed:", error);
  });

  return result;
}

export async function recordFreeGeneration(input: Omit<SpendCreditsInput, "credits">) {
  await ensureUserRow(input.userId);

  const resolved = await resolveProviderTrackingFallback({
    modelUsed: input.modelUsed,
    duration: input.duration,
    resolution: input.resolution,
    quality: input.quality,
    providerName: input.providerName,
    providerModel: input.providerModel,
    providerCostUsd: input.providerCostUsd,
    providerCostSource: input.providerCostSource,
    providerCredits: input.providerCredits,
    providerTokens: input.providerTokens,
  });

  const generation = await prismadb.generation.create({
    data: {
      userId: input.userId,
      prompt: input.prompt,
      assetType: input.assetType,
      modelUsed: input.modelUsed,
      mediaUrl: input.mediaUrl ?? null,
      outputUrl: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? input.mediaUrl : null,
      type: inferGenerationType(input.assetType),
      status: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? "completed" : "queued",
      cost: 0,
      resolution: input.resolution ?? null,
      duration: input.duration ?? null,
      aspectRatio: input.aspectRatio ?? null,
      quality: input.quality ?? null,
      providerName: resolved.providerName ?? null,
      providerModel: resolved.providerModel ?? null,
      providerRequestId: input.providerRequestId ?? null,
      providerCostUsd: resolved.providerCostUsd ?? null,
      providerTokens: resolved.providerTokens ?? null,
      providerCredits: resolved.providerCredits ?? null,
      providerCostSource: resolved.providerCostSource ?? null,
    },
    select: { id: true },
  });

  await prismadb.providerUsageRecord.create({
    data: {
      userId: input.userId,
      generationId: generation.id,
      providerName: resolved.providerName ?? null,
      providerModel: resolved.providerModel ?? null,
      providerRequestId: input.providerRequestId ?? null,
      providerCostUsd: resolved.providerCostUsd ?? null,
      providerTokens: resolved.providerTokens ?? null,
      providerCredits: resolved.providerCredits ?? null,
      providerCostSource: resolved.providerCostSource ?? null,
      duration: input.duration ?? null,
      resolution: input.resolution ?? null,
      quality: input.quality ?? null,
      aspectRatio: input.aspectRatio ?? null,
      status: input.mediaUrl && isPublicHttpUrl(input.mediaUrl) ? "completed" : "queued",
    },
  });

  await createRequestSnapshot(prismadb, generation.id, input.userId, input, resolved, 0);

  return { remainingCredits: null, generationId: generation.id };
}

export async function refundCredits(userId: string, credits: number) {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (safeCredits <= 0) return;
  await ensureUserRow(userId);
  await prismadb.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: safeCredits } },
  });
}

export async function refundCreditsWithReason(
  userId: string,
  credits: number,
  reason: Exclude<CreditLedgerReason, "generation_charge">,
  generationId?: string | null,
): Promise<void> {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (!userId || safeCredits <= 0) return;
  await ensureUserRow(userId);
  await prismadb.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: safeCredits } },
    });
    await tryCreateCreditLedgerEntry(tx as any, {
      userId,
      generationId: generationId ?? null,
      delta: safeCredits,
      reason,
    });
  });
}


type RefundGenerationChargeOptions = {
  reason: CreditLedgerReason;
  clearMediaUrl?: boolean;
  flagGeneration?: boolean;
};

export async function refundGenerationCharge(
  generationId: string,
  userId: string,
  credits: number,
  options: RefundGenerationChargeOptions,
): Promise<void> {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (!generationId || !userId || safeCredits <= 0) return;

  const clearMediaUrl = options.clearMediaUrl !== false;
  const flagGeneration = options.flagGeneration === true;

  await prismadb.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({
      where: { id: generationId },
      select: { id: true, cost: true, isFlagged: true },
    });

    if (!generation || generation.cost <= 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: safeCredits } },
    });

    await tx.generation.update({
      where: { id: generationId },
      data: {
        cost: 0,
        ...(clearMediaUrl ? { mediaUrl: null, outputUrl: null } : {}),
        status: "failed",
        ...(flagGeneration && !generation.isFlagged ? { isFlagged: true } : {}),
      },
    });

    await tryCreateCreditLedgerEntry(tx as any, {
      userId,
      generationId,
      delta: safeCredits,
      reason: options.reason,
    });
  });
}

export async function setGenerationMediaUrl(generationId: string, mediaUrl: string) {
  if (!generationId || !mediaUrl) return;
  const gen = await prismadb.generation.findUnique({
    where: { id: generationId },
    select: { id: true, userId: true, assetType: true },
  });

  let finalUrl: string | null = mediaUrl;
  if (gen && isStorageConfigured() && isPublicHttpUrl(mediaUrl)) {
    const persisted = await uploadUrlToStorage({
      remoteUrl: mediaUrl,
      userId: gen.userId,
      assetType: gen.assetType,
      generationId: gen.id,
    }).catch(() => null);
    if (persisted) finalUrl = persisted;
  }

  await prismadb.generation.updateMany({
    where: { id: generationId },
    data: {
      mediaUrl: finalUrl,
      outputUrl: finalUrl,
      status: finalUrl && finalUrl.startsWith("task:") ? "processing" : "completed",
      ...(gen ? { type: inferGenerationType(gen.assetType) } : {}),
    },
  });

  await prismadb.providerUsageRecord.updateMany({
    where: { generationId },
    data: {
      status: finalUrl && finalUrl.startsWith("task:") ? "processing" : "completed",
    },
  }).catch((e) => console.error("[setGenerationMediaUrl] Failed to update ProviderUsageRecord status:", e));

  void maybeScanAndFlagGeneration(generationId).catch(() => {});
}

/**
 * When a single generation produces multiple images (e.g. numImages=4),
 * the main generation record already holds the first URL.
 * Call this to persist each additional URL as a separate zero-cost record
 * so all images appear in the user's gallery after page refresh.
 */
export async function saveAdditionalGenerationUrls(
  userId: string,
  prompt: string,
  modelUsed: string,
  assetType: string,
  additionalUrls: string[],
): Promise<void> {
  if (!additionalUrls.length || !userId) return;
  const prepared = await Promise.all(
    additionalUrls.map(async (url, idx) => {
      let finalUrl: string | null = url;
      if (isStorageConfigured() && isPublicHttpUrl(url)) {
        const persisted = await uploadUrlToStorage({
          remoteUrl: url,
          userId,
          assetType,
          generationId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${idx}`,
        }).catch(() => null);
        if (persisted) finalUrl = persisted;
      }
      return {
        userId,
        prompt,
        mediaUrl: finalUrl,
        outputUrl: finalUrl,
        assetType,
        modelUsed,
        type: inferGenerationType(assetType),
        status: finalUrl ? "completed" : "queued",
        cost: 0,
      };
    }),
  );

  await prismadb.generation.createMany({ data: prepared });
  void maybeScanAndFlagRecentGenerationsByMediaUrls(userId, additionalUrls).catch(() => {});
}

export async function setGenerationTaskMarker(generationId: string, taskId: string) {
  if (!generationId || !taskId) return;
  await prismadb.generation.updateMany({
    where: { id: generationId },
    data: { mediaUrl: `task:${taskId}`, outputUrl: null, status: "processing" },
  });
  await prismadb.providerUsageRecord.updateMany({
    where: { generationId },
    data: { providerRequestId: taskId, status: "processing" },
  }).catch((e) => console.error("[setGenerationTaskMarker] Failed to sync ProviderUsageRecord:", e));
}

export async function rollbackGenerationCharge(generationId: string, userId: string, credits: number) {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (!generationId || !userId || safeCredits <= 0) return;

  await prismadb.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({
      where: { id: generationId },
      select: { id: true, cost: true },
    });

    // Already rolled back or missing.
    if (!generation || generation.cost <= 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: safeCredits } },
    });

    await tx.generation.update({
      where: { id: generationId },
      data: {
        cost: 0,
        mediaUrl: null,
        outputUrl: null,
        status: "failed",
        isFlagged: true,
      },
    });

    await tryCreateCreditLedgerEntry(tx as any, {
      userId,
      generationId,
      delta: safeCredits,
      reason: "generation_refund_provider_failed",
    });
  });
}

type GenerationPrecheckInput = {
  prompt: string;
  negativePrompt?: string | null;
  extraText?: string | null;
};

export type GenerationPrecheckResult =
  | { allowed: true }
  | { allowed: false; message: string; reason: string };

function getPrecheckEnabled(): boolean {
  const raw = String(process.env.GENERATION_PRECHECK_ENABLED ?? "1").trim();
  return raw !== "0";
}

function getOpenAiPrecheckBlocking(): boolean {
  const raw = String(process.env.GENERATION_PRECHECK_OPENAI_BLOCKING ?? "0").trim();
  return raw === "1";
}

function normalizeCombinedText(input: GenerationPrecheckInput): string {
  const parts = [input.prompt, input.negativePrompt ?? "", input.extraText ?? ""]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join("\n").slice(0, 8000);
}

export function keywordBlocksPrompt(text: string): boolean {
  let p = (text || "").toLowerCase();
  if (!p) return false;
  p = p.replace(/\bnude[-\s]?(berry|beige|pink|brown|peach|rose|mauve|lipstick|makeup|shade|color|tone|palette)\b/gi, "$1");
  p = p.replace(/\b(lipstick|makeup|shade|color|tone|palette)[-\s]?nude\b/gi, "$1");
  const patterns: RegExp[] = [
    /\b(nude|naked|porn|porno|sex\s*act|explicit|genitals|penis|vagina)\b/i,
    /\b(blowjob|handjob|anal|cumshot|orgasm)\b/i,
    /(عاري|عريان|تعري|إباحي|إباحية|سكس|جنس|قضيب|مهبل)/i,
  ];
  return patterns.some((re) => re.test(p));
}

async function openAiPromptModeration(text: string, model: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
    signal: AbortSignal.timeout(2_500),
  }).catch(() => null);

  if (!res || !res.ok) return false;
  const json = (await res.json().catch(() => null)) as any;
  return Boolean(json?.results?.[0]?.flagged);
}

export async function precheckGenerationPolicy(input: GenerationPrecheckInput): Promise<GenerationPrecheckResult> {
  if (!getPrecheckEnabled()) return { allowed: true };

  const text = normalizeCombinedText(input);
  if (!text) return { allowed: true };

  if (keywordBlocksPrompt(text)) {
    return {
      allowed: false,
      message: "Request blocked by safety policy.",
      reason: "keyword_blocked",
    };
  }

  const model = String(process.env.GENERATION_PRECHECK_OPENAI_MODEL ?? "omni-moderation-latest").trim()
    || "omni-moderation-latest";
  const flagged = await openAiPromptModeration(text, model).catch(() => false);
  if (flagged && getOpenAiPrecheckBlocking()) {
    return {
      allowed: false,
      message: "Request blocked by safety policy.",
      reason: "openai_moderation_flagged",
    };
  }

  return { allowed: true };
}

type NsfwScanConfig = {
  enabled: boolean;
  provider: "openai" | "keywords";
  openAiModel: string;
  includeImageUrls: boolean;
};

function getNsfwScanConfig(): NsfwScanConfig {
  const enabled = String(process.env.NSFW_SCAN_ENABLED ?? "").trim() === "1";
  const providerRaw = String(process.env.NSFW_SCAN_PROVIDER ?? "openai").trim().toLowerCase();
  const provider: "openai" | "keywords" = providerRaw === "keywords" ? "keywords" : "openai";
  const openAiModel = String(process.env.NSFW_SCAN_OPENAI_MODEL ?? "omni-moderation-latest").trim()
    || "omni-moderation-latest";
  const includeImageUrls = String(process.env.NSFW_SCAN_INCLUDE_IMAGE_URLS ?? "").trim() === "1";
  return { enabled, provider, openAiModel, includeImageUrls };
}

function isLikelyHttpImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  const base = url.split("?")[0].toLowerCase();
  return base.endsWith(".png") || base.endsWith(".jpg") || base.endsWith(".jpeg") || base.endsWith(".webp") || base.endsWith(".gif");
}

async function flagGeneration(generationId: string): Promise<void> {
  await prismadb.generation.updateMany({
    where: { id: generationId },
    data: { isFlagged: true },
  });
}

async function openAiTextModeration(prompt: string, model: string): Promise<boolean> {
  return await openAiPromptModeration(prompt, model).catch(() => false);
}

async function openAiImageUrlModeration(imageUrl: string, model: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    }),
    signal: AbortSignal.timeout(4_000),
  }).catch(() => null);

  if (!res || !res.ok) return false;
  const json = (await res.json().catch(() => null)) as any;
  return Boolean(json?.results?.[0]?.flagged);
}

async function maybeScanAndFlagGeneration(generationId: string): Promise<void> {
  const cfg = getNsfwScanConfig();
  if (!cfg.enabled) return;

  const gen = await prismadb.generation.findUnique({
    where: { id: generationId },
    select: { id: true, prompt: true, mediaUrl: true, assetType: true, isFlagged: true },
  });
  if (!gen || gen.isFlagged) return;

  if (keywordBlocksPrompt(gen.prompt)) {
    await flagGeneration(gen.id);
    return;
  }

  if (cfg.provider === "openai") {
    const flaggedByText = await openAiTextModeration(gen.prompt, cfg.openAiModel).catch(() => false);
    if (flaggedByText) {
      await flagGeneration(gen.id);
      return;
    }

    const mediaUrl = typeof gen.mediaUrl === "string" ? gen.mediaUrl : "";
    if (cfg.includeImageUrls && mediaUrl && isLikelyHttpImageUrl(mediaUrl)) {
      const flaggedByImage = await openAiImageUrlModeration(mediaUrl, cfg.openAiModel).catch(() => false);
      if (flaggedByImage) {
        await flagGeneration(gen.id);
        return;
      }
    }
  }
}

async function maybeScanAndFlagRecentGenerationsByMediaUrls(userId: string, mediaUrls: string[]): Promise<void> {
  const cfg = getNsfwScanConfig();
  if (!cfg.enabled) return;
  if (!userId || !mediaUrls.length) return;

  const since = new Date(Date.now() - 10 * 60_000);
  const gens = await prismadb.generation.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      mediaUrl: { in: mediaUrls },
      isFlagged: false,
    },
    select: { id: true },
    take: Math.min(25, mediaUrls.length),
  });

  await Promise.all(gens.map((g) => maybeScanAndFlagGeneration(g.id).catch(() => {})));
}

export async function finalizeReapGeneration(projectId: string, duration: number | null): Promise<void> {
  if (!projectId) return;

  const generations = await prismadb.generation.findMany({
    where: {
      OR: [
        { mediaUrl: `task:reap:${projectId}` },
        { mediaUrl: `task:clipcraft:${projectId}` }
      ]
    }
  });

  for (const gen of generations) {
    let actualDuration = duration;
    let actualCostUsd = gen.providerCostUsd;
    let actualCostSource = gen.providerCostSource || "estimated";

    if (actualDuration && actualDuration > 0) {
      try {
        const { estimateProviderCostSync } = await import("./pricing");
        const est = estimateProviderCostSync(gen.modelUsed, actualDuration, gen.resolution || gen.quality);
        actualCostUsd = est.usd;
        actualCostSource = "actual";
      } catch (e) {
        console.error("[finalizeReapGeneration] Failed to estimate provider cost:", e);
      }
    }

    await prismadb.generation.update({
      where: { id: gen.id },
      data: {
        duration: actualDuration ?? gen.duration,
        providerCostUsd: actualCostUsd,
        providerCostSource: actualCostSource,
      }
    });

    await prismadb.providerUsageRecord.updateMany({
      where: { generationId: gen.id },
      data: {
        duration: actualDuration ?? gen.duration,
        providerCostUsd: actualCostUsd,
        providerCostSource: actualCostSource,
        status: "completed",
      }
    });
  }
}

export async function updateProviderUsageRecord(
  generationId: string,
  data: {
    providerRequestId?: string | null;
    providerCostUsd?: number | null;
    providerTokens?: number | null;
    providerCredits?: number | null;
    providerCostSource?: string | null;
    duration?: number | null;
    resolution?: string | null;
    quality?: string | null;
    status?: string | null;
    rawPayloadSafe?: string | null;
  }
) {
  try {
    const existing = await prismadb.providerUsageRecord.findFirst({
      where: { generationId }
    });

    if (existing) {
      await prismadb.providerUsageRecord.update({
        where: { id: existing.id },
        data: {
          providerRequestId: data.providerRequestId !== undefined ? data.providerRequestId : existing.providerRequestId,
          providerCostUsd: data.providerCostUsd !== undefined ? data.providerCostUsd : existing.providerCostUsd,
          providerTokens: data.providerTokens !== undefined ? data.providerTokens : existing.providerTokens,
          providerCredits: data.providerCredits !== undefined ? data.providerCredits : existing.providerCredits,
          providerCostSource: data.providerCostSource !== undefined ? data.providerCostSource : existing.providerCostSource,
          duration: data.duration !== undefined ? data.duration : existing.duration,
          resolution: data.resolution !== undefined ? data.resolution : existing.resolution,
          quality: data.quality !== undefined ? data.quality : existing.quality,
          status: data.status !== undefined ? data.status : existing.status,
          rawPayloadSafe: data.rawPayloadSafe !== undefined ? data.rawPayloadSafe : existing.rawPayloadSafe,
        }
      });
    } else {
      const gen = await prismadb.generation.findUnique({
        where: { id: generationId },
        select: { userId: true }
      });
      if (gen) {
        await prismadb.providerUsageRecord.create({
          data: {
            userId: gen.userId,
            generationId,
            providerRequestId: data.providerRequestId ?? null,
            providerCostUsd: data.providerCostUsd ?? null,
            providerTokens: data.providerTokens ?? null,
            providerCredits: data.providerCredits ?? null,
            providerCostSource: data.providerCostSource ?? null,
            duration: data.duration ?? null,
            resolution: data.resolution ?? null,
            quality: data.quality ?? null,
            status: data.status ?? null,
            rawPayloadSafe: data.rawPayloadSafe ?? null,
          }
        });
      }
    }
  } catch (e) {
    console.error("[updateProviderUsageRecord] Failed:", e);
  }
}

export async function updateProviderUsageRecordByRequestId(
  requestId: string,
  data: {
    providerCostUsd?: number | null;
    providerTokens?: number | null;
    providerCredits?: number | null;
    providerCostSource?: string | null;
    duration?: number | null;
    resolution?: string | null;
    quality?: string | null;
    status?: string | null;
    rawPayloadSafe?: string | null;
  }
) {
  try {
    const existing = await prismadb.providerUsageRecord.findFirst({
      where: { providerRequestId: requestId }
    });

    if (existing) {
      await prismadb.providerUsageRecord.update({
        where: { id: existing.id },
        data: {
          providerCostUsd: data.providerCostUsd !== undefined ? data.providerCostUsd : existing.providerCostUsd,
          providerTokens: data.providerTokens !== undefined ? data.providerTokens : existing.providerTokens,
          providerCredits: data.providerCredits !== undefined ? data.providerCredits : existing.providerCredits,
          providerCostSource: data.providerCostSource !== undefined ? data.providerCostSource : existing.providerCostSource,
          duration: data.duration !== undefined ? data.duration : existing.duration,
          resolution: data.resolution !== undefined ? data.resolution : existing.resolution,
          quality: data.quality !== undefined ? data.quality : existing.quality,
          status: data.status !== undefined ? data.status : existing.status,
          rawPayloadSafe: data.rawPayloadSafe !== undefined ? data.rawPayloadSafe : existing.rawPayloadSafe,
        }
      });
    }
  } catch (e) {
    console.error("[updateProviderUsageRecordByRequestId] Failed:", e);
  }
}

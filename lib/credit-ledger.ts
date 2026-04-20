import { clerkClient } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { WELCOME_SIGNUP_CREDITS } from "@/lib/credits-config";
import { SAAD_PLANS } from "@/lib/pricing-models";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class InsufficientCreditsError extends Error {
  constructor(public readonly currentBalance: number, public readonly requiredCredits: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

export async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId).catch(() => null);
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  try {
    return await prismadb.user.create({
      data: {
        id: userId,
        email,
        name,
        creditBalance: WELCOME_SIGNUP_CREDITS,
        creditsExpireAt: new Date(Date.now() + THIRTY_DAYS_MS),
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

  const isSubscriptionActive =
    subscription?.stripePriceId &&
    subscription?.stripeCurrentPeriodEnd &&
    subscription.stripeCurrentPeriodEnd.getTime() + 86_400_000 > now.getTime();

  // Only annual subscribers get auto-renewed every 30 days.
  // Monthly subscribers must pay again — their credits expire and stay at 0.
  if (isSubscriptionActive && subscription?.billingInterval === "annual" && subscription?.planId) {
    const plan = SAAD_PLANS.find((p) => p.id === subscription.planId);
    const monthlyCredits = plan?.credits ?? user.monthlyCredits;

    if (monthlyCredits > 0) {
      await prismadb.user.update({
        where: { id: userId },
        data: {
          creditBalance: monthlyCredits,
          monthlyCredits,
          creditsExpireAt: new Date(now.getTime() + THIRTY_DAYS_MS),
          lastCreditRenewal: now,
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
    },
  });
}

/**
 * Allocate subscription credits to a user after payment.
 * Sets creditBalance = plan credits, creditsExpireAt = now + 30 days.
 */
export async function allocateSubscriptionCredits(
  userId: string,
  planId: string,
  billingInterval: "monthly" | "annual",
): Promise<void> {
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
};

export async function spendCredits(input: SpendCreditsInput) {
  const credits = Math.max(0, Math.ceil(input.credits));
  if (credits <= 0) {
    throw new Error(`Invalid credit amount: ${input.credits}`);
  }

  await ensureUserRow(input.userId);

  // Handle credit expiry/renewal before checking balance
  await handleCreditExpiry(input.userId);

  return prismadb.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    const balance = user?.creditBalance ?? 0;

    if (balance < credits) {
      throw new InsufficientCreditsError(balance, credits);
    }

    const updated = await tx.user.update({
      where: { id: input.userId },
      data: { creditBalance: { decrement: credits } },
      select: { creditBalance: true },
    });

    const generation = await tx.generation.create({
      data: {
        userId: input.userId,
        prompt: input.prompt,
        assetType: input.assetType,
        modelUsed: input.modelUsed,
        mediaUrl: input.mediaUrl ?? null,
        cost: credits,
      },
      select: { id: true },
    });

    return { remainingCredits: updated.creditBalance, generationId: generation.id };
  });
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

export async function setGenerationMediaUrl(generationId: string, mediaUrl: string) {
  if (!generationId || !mediaUrl) return;
  await prismadb.generation.update({
    where: { id: generationId },
    data: { mediaUrl },
  });
}

export async function setGenerationTaskMarker(generationId: string, taskId: string) {
  if (!generationId || !taskId) return;
  await prismadb.generation.update({
    where: { id: generationId },
    data: { mediaUrl: `task:${taskId}` },
  });
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
        isFlagged: true,
      },
    });
  });
}

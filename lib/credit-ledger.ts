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

export class PolicyBlockedError extends Error {
  constructor(public readonly reason: string, public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "PolicyBlockedError";
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

    await tryCreateCreditLedgerEntry(tx as any, {
      userId: input.userId,
      generationId: generation.id,
      delta: -credits,
      reason: "generation_charge",
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
        ...(clearMediaUrl ? { mediaUrl: null } : {}),
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
  await prismadb.generation.update({
    where: { id: generationId },
    data: { mediaUrl },
  });
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
  await prismadb.generation.createMany({
    data: additionalUrls.map((mediaUrl) => ({
      userId,
      prompt,
      mediaUrl,
      assetType,
      modelUsed,
      cost: 0, // credits were already charged in the parent generation record
    })),
  });
  void maybeScanAndFlagRecentGenerationsByMediaUrls(userId, additionalUrls).catch(() => {});
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

function normalizeCombinedText(input: GenerationPrecheckInput): string {
  const parts = [input.prompt, input.negativePrompt ?? "", input.extraText ?? ""]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join("\n").slice(0, 8000);
}

export function keywordBlocksPrompt(text: string): boolean {
  const p = (text || "").toLowerCase();
  if (!p) return false;
  const patterns: RegExp[] = [
    /\b(nude|naked|porn|porno|sex\s*act|explicit|genitals|penis|vagina|nipples?)\b/i,
    /\b(blowjob|handjob|anal|cumshot|orgasm)\b/i,
    /(عاري|عريان|تعري|إباحي|إباحية|سكس|جنس|قضيب|مهبل|حلمات)/i,
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
  if (flagged) {
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
  await prismadb.generation.update({
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

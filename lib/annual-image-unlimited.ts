import prismadb from "@/lib/prismadb";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_LIMIT_BY_PLAN: Record<string, number> = {
  starter: 25,
  plus: 50,
  pro: 100,
  max: 200,
};
const DEFAULT_FAST_DAILY_LIMIT = 10;
const DEFAULT_SLOWDOWN_MS = 30_000;

export const ANNUAL_UNLIMITED_IMAGE_MODELS = [
  "flux-2/pro",
  "flux-2/flex",
  "flux-2/pro-text-to-image",
  "flux-2/pro-image-to-image",
  "flux-2/flex-text-to-image",
  "flux-2/flex-image-to-image",
  "seedream/4.5-text-to-image",
  "seedream/4.5-edit",
  "google/nano-banana",
  "gpt-image/1.5-text-to-image",
  "gpt-image/1.5-image-to-image",
  "gpt-image-2-text-to-image",
  "gpt-image-2-image-to-image",
  "nano-banana-2",
  "nano-banana-pro",
] as const;

const ANNUAL_UNLIMITED_IMAGE_MODEL_SET = new Set<string>(ANNUAL_UNLIMITED_IMAGE_MODELS);
const EXCLUDED_ANNUAL_UNLIMITED_IMAGE_MODELS = new Set<string>([
  "google/imagen4-ultra",
  "flux-2/max",
]);
const IMAGE_MODEL_PREFIXES = [
  "nano-banana",
  "google/nano-banana",
  "google/imagen4",
  "seedream/",
  "z-image",
  "qwen2/",
  "qwen/",
  "grok-imagine/",
  "gpt-image",
  "wan/2-7-image-pro",
  "flux-2/",
];

function normalizeQuality(value?: string | null): string {
  return String(value ?? "1K").trim().toLowerCase();
}

function readPositiveIntEnv(name: string): number | null {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function readNonNegativeIntEnv(name: string): number | null {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function getAnnualUnlimitedDailyLimit(planId: string): number {
  const planKey = planId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return readPositiveIntEnv(`ANNUAL_UNLIMITED_IMAGE_DAILY_LIMIT_${planKey}`)
    ?? readPositiveIntEnv("ANNUAL_UNLIMITED_IMAGE_DAILY_LIMIT")
    ?? DEFAULT_DAILY_LIMIT_BY_PLAN[planId]
    ?? DEFAULT_DAILY_LIMIT_BY_PLAN.pro;
}

function getAnnualUnlimitedFastDailyLimit(): number {
  return readPositiveIntEnv("ANNUAL_UNLIMITED_IMAGE_FAST_DAILY_LIMIT") ?? DEFAULT_FAST_DAILY_LIMIT;
}

function getAnnualUnlimitedSlowdownMs(): number {
  return readNonNegativeIntEnv("ANNUAL_UNLIMITED_IMAGE_SLOWDOWN_MS") ?? DEFAULT_SLOWDOWN_MS;
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAnnualUnlimitedImageQuality(value?: string | null): boolean {
  const quality = normalizeQuality(value);
  return [
    "1k",
    "1024",
    "1024x1024",
    "basic",
    "medium",
    "speed",
    "standard",
  ].includes(quality);
}

export function isAnnualUnlimitedImageModel(modelId: string): boolean {
  if (EXCLUDED_ANNUAL_UNLIMITED_IMAGE_MODELS.has(modelId)) return false;
  return ANNUAL_UNLIMITED_IMAGE_MODEL_SET.has(modelId) ||
    IMAGE_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
}

export async function getActiveAnnualPlanId(userId: string): Promise<string | null> {
  const subscription = await prismadb.userSubscription.findUnique({
    where: { userId },
    select: {
      planId: true,
      billingInterval: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  const now = Date.now();
  const isActive = Boolean(
    subscription?.stripePriceId &&
      subscription?.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd.getTime() + DAY_MS > now,
  );

  if (!isActive || subscription?.billingInterval !== "annual") return null;
  return subscription.planId ?? null;
}

export async function getAnnualUnlimitedImageEligibility(input: {
  userId: string;
  modelId: string;
  quality?: string | null;
  requestedUnits?: number;
}): Promise<{
  eligible: boolean;
  planId: string | null;
  reason?: string;
  dailyLimit?: number;
  dailyUsed?: number;
  dailyRemaining?: number;
}> {
  const planId = await getActiveAnnualPlanId(input.userId);
  if (!planId) return { eligible: false, planId: null, reason: "not_annual" };
  if (!isAnnualUnlimitedImageModel(input.modelId)) {
    return { eligible: false, planId, reason: "model_not_included" };
  }
  if (!isAnnualUnlimitedImageQuality(input.quality)) {
    return { eligible: false, planId, reason: "quality_not_1k" };
  }

  const dailyLimit = getAnnualUnlimitedDailyLimit(planId);
  const requestedUnits = Math.max(1, Math.floor(Number(input.requestedUnits ?? 1)));
  const dailyUsed = await prismadb.generation.count({
    where: {
      userId: input.userId,
      assetType: "IMAGE",
      cost: 0,
      createdAt: { gte: startOfUtcDay() },
      OR: [
        ...ANNUAL_UNLIMITED_IMAGE_MODELS.map((modelId) => ({ modelUsed: modelId })),
        ...IMAGE_MODEL_PREFIXES.map((prefix) => ({ modelUsed: { startsWith: prefix } })),
      ],
    },
  });
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  return { eligible: true, planId, dailyLimit, dailyUsed, dailyRemaining };
}

export async function applyAnnualUnlimitedImageSlowdown(input: {
  eligible: boolean;
  dailyUsed?: number;
  requestedUnits?: number;
}): Promise<number> {
  if (!input.eligible) return 0;

  const requestedUnits = Math.max(1, Math.floor(Number(input.requestedUnits ?? 1)));
  const dailyUsed = Math.max(0, Math.floor(Number(input.dailyUsed ?? 0)));
  const fastDailyLimit = getAnnualUnlimitedFastDailyLimit();
  if (dailyUsed + requestedUnits <= fastDailyLimit) return 0;

  const slowdownMs = getAnnualUnlimitedSlowdownMs();
  if (slowdownMs <= 0) return 0;

  await sleep(slowdownMs);
  return slowdownMs;
}

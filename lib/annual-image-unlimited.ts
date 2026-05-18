import prismadb from "@/lib/prismadb";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  "kwaivgi/kling-image-o1",
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
  "kwaivgi/kling-image-o1",
  "flux-2/",
];

function normalizeQuality(value?: string | null): string {
  return String(value ?? "1K").trim().toLowerCase();
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
}): Promise<{ eligible: boolean; planId: string | null; reason?: string }> {
  const planId = await getActiveAnnualPlanId(input.userId);
  if (!planId) return { eligible: false, planId: null, reason: "not_annual" };
  if (!isAnnualUnlimitedImageModel(input.modelId)) {
    return { eligible: false, planId, reason: "model_not_included" };
  }
  if (!isAnnualUnlimitedImageQuality(input.quality)) {
    return { eligible: false, planId, reason: "quality_not_1k" };
  }
  return { eligible: true, planId };
}

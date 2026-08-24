import { IMAGE_MODELS, getImageCreditCost } from "@/lib/image-models";
import { VIDEO_MODELS } from "@/lib/video-models";
import { VIDEO_MODEL_REGISTRY, isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";
import { getGenerationCost, getGenerationCostSync, calculateTtsCredits, calculateMusicCredits, calculateSfxCredits } from "@/lib/pricing";

type VideoPayload = Record<string, unknown>;
type ImagePricingOptions = {
  quality?: string;
  resolution?: string;
  imageSize?: string;
};

const IMAGE_MODEL_MAP = new Map(IMAGE_MODELS.map((m) => [m.id, m]));
const VIDEO_MODEL_ID_COST_MAP = new Map(VIDEO_MODELS.map((m) => [m.id, m.creditCost]));
const VIDEO_MODEL_BY_ID_MAP = new Map(VIDEO_MODELS.map((m) => [m.id, m]));
const VIDEO_ROUTE_REGISTRY_MAP = new Map(VIDEO_MODEL_REGISTRY.map((m) => [m.api_route, m]));
const SEEDANCE_25_CREDITS_PER_USD = 40;
const SEEDANCE_25_MARGIN_MULTIPLIER = 1.4;
const SEEDANCE_25_USD_PER_SECOND = {
  "480p": 0.162,
  "720p": 0.180,
  "1080p": 0.240,
  "4k": 0.360,
} as const;
const MINIMAX_H3_CREDITS_PER_USD = 40;
const MINIMAX_H3_MARGIN_MULTIPLIER = 1.4;
const MINIMAX_H3_USD_PER_SECOND = {
  "768p": 0.10,
  "2k": 0.14,
} as const;
const WAN_30_CREDITS_PER_USD = 40;
const WAN_30_MARGIN_MULTIPLIER = 1.4;
const WAN_30_USD_PER_SECOND = {
  "480p": 0.05,
  "720p": 0.10,
  "1080p": 0.20,
} as const;

const VIDEO_ROUTE_COST_MAP = new Map<string, number>([
  ["minimax/h3/reference-to-video", 28.0],
  ["kwaivgi/kling-v3.0-std/text-to-video", 9.0],
  ["kwaivgi/kling-v3.0-std/image-to-video", 9.0],
  ["kwaivgi/kling-v3.0-pro/image-to-video", 17.5],
  ["kwaivgi/kling-v3.0-pro/text-to-video", 17.5],
  // Kling 3.0 Omni / Omni Edit removed — KIE has no Omni endpoint.
  ["kwaivgi/kling-v3.0-pro/motion-control", 14],
  ["kling/v2-5-turbo-text-to-video-pro", 7.15],
  ["kling/v2-5-turbo-image-to-video-pro", 7.15],
  ["kling/v3-turbo-text-to-video", 9.0],
  ["kling/v3-turbo-image-to-video", 9.0],
  ["kling/v3-turbo", 9.0],
  ["kwaivgi/kling-v3-turbo-std/image-to-video", 12.0],
  ["kwaivgi/kling-v3-turbo-pro/image-to-video", 15.0],
  ["kwaivgi/kling-video-o3-std/text-to-video", 9.0],
  ["kwaivgi/kling-video-o3-std/image-to-video", 9.0],
  ["kwaivgi/kling-video-o3-std/reference-to-video", 10.5],
  ["kwaivgi/kling-video-o3-pro/text-to-video", 14.0],
  ["kwaivgi/kling-video-o3-pro/image-to-video", 14.0],
  ["kwaivgi/kling-video-o3-pro/reference-to-video", 16.0],
  ["kwaivgi/kling-video-o3-4k/text-to-video", 25.0],
  ["kwaivgi/kling-video-o3-4k/image-to-video", 25.0],
  ["kwaivgi/kling-video-o3-4k/reference-to-video", 30.0],
  ["kwaivgi/kling-v2.6-std/text-to-video", 5.0],
  ["kwaivgi/kling-v2.6-std/image-to-video", 5.0],
  ["kwaivgi/kling-v2.6-pro/text-to-video", 7.0],
  ["kwaivgi/kling-v2.6-pro/image-to-video", 7.0],
  ["minimax/hailuo-2.3/i2v-standard", 6.18],
  ["minimax/hailuo-2.3/i2v-pro", 10.26],
  ["openai/sora-2/text-to-video", 13.64],
  ["openai/sora-2/text-to-video-pro", 20.48],
  ["openai/sora-2-pro/text-to-video", 20.48],
  ["openai/sora-2-pro/text-to-video-pro", 20.48],
  ["google/veo3.1-lite-text-to-video", 12.0],
  ["google/veo3.1-fast-text-to-video", 24.0],
  ["google/veo3.1-text-to-video", 96.0],
  ["google/veo-3.1-generate-preview", 96.0],
  ["google/veo3-fast-text-to-video", 24.0],
  ["google/veo3-text-to-video", 96.0],
  ["google/gemini-omni-video", 30.0],
  ["google/gemini-omni-flash", 30.0],
  ["bytedance/seedance-2.0/text-to-video", 40],
  ["bytedance/seedance-2.0/image-to-video", 40],
  ["bytedance/seedance-2.0/text-to-video-turbo", 27],
  ["bytedance/seedance-2.0/image-to-video-turbo", 27],
  ["bytedance/seedance-2.5/text-to-video-turbo", 40],
  ["bytedance/seedance-2.5/image-to-video-turbo", 40],
  ["bytedance/seedance-2.5/image-to-video-spicy", 64.8],
  ["bytedance/seedance-v2/text-to-video-fast", 27],
  ["bytedance/seedance-v2/text-to-video", 40],
  ["x-ai/grok-imagine-video/text-to-video", 9.24],
  ["x-ai/grok-imagine-video/edit-video", 9.24],
  ["wavespeed-ai/cinematic-video-generator", 8],
]);

const MUSIC_MODEL_BASE_COST = new Map<string, number>([
  ["wavespeed-ai/ace-step-1.5", 10],
  ["wavespeed-ai/song-generation", 14],
  ["wavespeed-ai/ace-step", 9],
  ["wavespeed-ai/heartmula-generate-music", 9],
  ["minimax/music-2.5", 12],
  ["minimax/music-02", 10],
  ["minimax/music-v1.5", 8],
  ["elevenlabs/elevenlabs-music", 12],
  ["google/lyria-3-pro/music", 15],
  ["google/lyria-3-clip/music", 10],
]);

const THREE_D_COST_MAP = new Map<string, number>([
  ["tripo3d-2.5.image", 3.9],
  ["tripo3d-2.5.multiview", 3.9],
  ["hunyuan3d-3.1.text", 3],
  ["hunyuan3d-3.1.image", 4],
  ["hunyuan3d-3.text", 38],
  ["hunyuan3d-3.image", 38],
  ["hunyuan3d-3.sketch", 40],
  ["meshy-6.text", 7.8],
  ["meshy-6.image", 7.8],
  ["hyper3d-rodin-2.text", 40],
  ["hyper3d-rodin-2.image", 40],
]);

function shouldApplySound(modelRef: string): boolean {
  const ref = modelRef.toLowerCase();
  if (ref.includes("seedance") || ref.includes("dreamina") || ref.includes("minimax/h3") || ref.includes("minimax_h3")) {
    return false;
  }
  return true;
}

export function getImageCredits(modelId: string, numImages = 1, options?: ImagePricingOptions): number {
  const count = Number.isFinite(numImages) ? Math.max(1, Math.floor(numImages)) : 1;
  const dbCost = getGenerationCostSync(modelId, 0, count, options?.quality ?? options?.resolution ?? options?.imageSize);
  if (dbCost > 0) return dbCost;
  const model = IMAGE_MODEL_MAP.get(modelId);
  if (!model) return 0;
  return getImageCreditCost(model, count, options?.quality ?? options?.resolution ?? options?.imageSize);
}

function readDuration(payload?: VideoPayload, fallback = 5): number {
  const raw = payload?.duration;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed)) return Math.max(1, parsed);
  }
  return fallback;
}

function readQuality(payload?: VideoPayload): string {
  const candidates = [payload?.quality, payload?.resolution, payload?.mode];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim().toLowerCase();
  }
  return "std";
}

function hasSoundEnabled(payload?: VideoPayload): boolean {
  return payload?.sound === true || payload?.generate_audio === true;
}

function applySoundMultiplier(baseCost: number, payload?: VideoPayload): number {
  return hasSoundEnabled(payload) ? parseFloat((baseCost * 1.5).toFixed(2)) : baseCost;
}

function getMinimaxH3Credits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = (readQuality(payload) || "768p").toLowerCase();
  const usdPerSec = quality.includes("2k") ? MINIMAX_H3_USD_PER_SECOND["2k"] : MINIMAX_H3_USD_PER_SECOND["768p"];
  return parseFloat(Math.max(1, duration * usdPerSec * MINIMAX_H3_MARGIN_MULTIPLIER * MINIMAX_H3_CREDITS_PER_USD).toFixed(2));
}

function getKling3Credits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const is4k = quality === "4k";
  const isPro = quality === "pro" || quality.includes("1080");

  if (is4k) {
    return parseFloat((duration * 2.5 * 3.0).toFixed(2));
  }

  if (isPro) {
    return parseFloat((duration * 2.5 * 1.6).toFixed(2));
  }

  return parseFloat((duration * 2.5 * 1.0).toFixed(2));
}

function getKling30StdCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const base = parseFloat((duration * 1.8).toFixed(2));
  return hasSoundEnabled(payload) ? parseFloat((base * 1.5).toFixed(2)) : base;
}

function getKlingMotionCredits(payload?: VideoPayload): number {
  const quality = readQuality(payload);
  const is1080 = quality.includes("1080") || quality === "pro";
  return is1080 ? 21.84 : 16.8;
}

// Kling Omni Edit credit helper removed — endpoint not provided by KIE.

function getSeedance2Credits(payload?: VideoPayload, variant: "hq" | "fast" = "hq"): number {
  const duration = readDuration(payload, 4);
  const quality = readQuality(payload);

  if (variant === "fast") {
    let cost = duration * 6.0;
    if (quality.includes("480")) {
      cost *= 0.5;
    }
    return parseFloat(Math.max(1, cost).toFixed(2));
  }

  // HQ variant
  let cost = duration * 4.5333;
  let qMul = 1.0;
  if (quality.includes("480")) {
    qMul = 0.661765;
  } else if (quality.includes("1080")) {
    qMul = 1.985294;
  } else if (quality.includes("4k")) {
    qMul = 4.852941;
  }
  cost *= qMul;

  return parseFloat(Math.max(1, cost).toFixed(2));
}


function hasNonEmptyArray(payload: VideoPayload | undefined, keys: string[]): boolean {
  return keys.some((key) => {
    const value = payload?.[key];
    return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim().length > 0);
  });
}

function getSeedance25TurboCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const q: keyof typeof SEEDANCE_25_USD_PER_SECOND = quality.includes("1080") ? "1080p" : quality.includes("480") ? "480p" : "720p";
  const usdPerSecond = SEEDANCE_25_USD_PER_SECOND[q] ?? SEEDANCE_25_USD_PER_SECOND["720p"];
  return parseFloat(Math.max(1, usdPerSecond * duration * SEEDANCE_25_MARGIN_MULTIPLIER * SEEDANCE_25_CREDITS_PER_USD).toFixed(2));
}

function getSeedance25SpicyCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const q: keyof typeof SEEDANCE_25_USD_PER_SECOND = quality.includes("4k") ? "4k" : quality.includes("1080") ? "1080p" : quality.includes("480") ? "480p" : "720p";
  const usdPerSecond = SEEDANCE_25_USD_PER_SECOND[q] ?? SEEDANCE_25_USD_PER_SECOND["720p"];
  return parseFloat(Math.max(1, usdPerSecond * duration * SEEDANCE_25_MARGIN_MULTIPLIER * SEEDANCE_25_CREDITS_PER_USD).toFixed(2));
}

function getWan30Credits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const q: keyof typeof WAN_30_USD_PER_SECOND = quality.includes("1080") ? "1080p" : quality.includes("480") ? "480p" : "720p";
  const usdPerSecond = WAN_30_USD_PER_SECOND[q] ?? WAN_30_USD_PER_SECOND["720p"];
  return parseFloat(Math.max(1, usdPerSecond * duration * WAN_30_MARGIN_MULTIPLIER * WAN_30_CREDITS_PER_USD).toFixed(2));
}
function getSora2Credits(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 4);
  const isPro = modelRoute.includes("text-to-video-pro") || modelRoute.includes("sora-2-pro");
  return parseFloat(Math.max(1, duration * (isPro ? 5.12 : 3.41)).toFixed(2));
}

function getHailuoCredits(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 6);
  const isPro = modelRoute.includes("i2v-pro");
  return parseFloat(Math.max(1, duration * (isPro ? 1.71 : 1.03)).toFixed(2));
}

function getGrokCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 6);
  const quality = readQuality(payload);
  const qualityMultiplier = quality.includes("480") ? 0.8 : 1;
  return parseFloat(Math.max(1, duration * 1.54 * qualityMultiplier).toFixed(2));
}

function getVeo31Credits(modelRoute: string, payload?: VideoPayload): number {
  if (!isGoogleVideoRoute(modelRoute)) return 0;

  const referenceCount = Array.isArray(payload?.reference_image_urls)
    ? payload.reference_image_urls.length
    : Array.isArray(payload?.referenceImageUrls)
      ? payload.referenceImageUrls.length
      : 0;
  const normalized = normalizeGoogleVideoOptions(modelRoute, {
    duration: payload?.duration as number | string | undefined,
    resolution: readQuality(payload),
    aspectRatio: typeof payload?.aspect_ratio === "string" ? payload.aspect_ratio : typeof payload?.aspectRatio === "string" ? payload.aspectRatio : undefined,
    referenceImageCount: referenceCount,
    hasVideoInput: Boolean(payload?.video_url || payload?.videoUrl || payload?.video),
    hasStartImage: Boolean(payload?.image_url || payload?.imageUrl || payload?.image || payload?.first_frame_url),
    hasEndImage: Boolean(payload?.last_frame_url || payload?.lastFrameUrl || payload?.last_image || payload?.end_image),
  });

  let usdPerSecond = 0.40;
  if (normalized.tier === "veo31_lite") {
    usdPerSecond = normalized.resolution === "1080p" ? 0.08 : 0.05;
  } else if (normalized.tier === "veo31_fast" || normalized.tier === "veo3_fast") {
    usdPerSecond = normalized.resolution === "4k" ? 0.30 : normalized.resolution === "1080p" ? 0.12 : 0.10;
  } else if (normalized.tier === "veo31") {
    usdPerSecond = normalized.resolution === "4k" ? 0.60 : 0.40;
  }

  return parseFloat(Math.max(1, usdPerSecond * normalized.duration * 28).toFixed(2));
}

function getGeminiOmniFlashCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 10);
  return parseFloat((duration * 2.8).toFixed(2));
}

function applyGenericRouteDynamics(modelRoute: string, baseCost: number, payload?: VideoPayload): number {
  const model = VIDEO_ROUTE_REGISTRY_MAP.get(modelRoute);
  if (!model) return applySoundMultiplier(baseCost, payload);

  let cost = baseCost;
  const caps = model.capabilities;

  if (caps.durations.length > 0) {
    const baseDuration = caps.durations[0];
    const duration = readDuration(payload, baseDuration);
    cost = (cost * duration) / baseDuration;
  }

  if (caps.resolutions.length > 1) {
    const quality = readQuality(payload);
    const tiers = caps.resolutions.map((r) => r.toLowerCase());
    const matchedIndex = tiers.findIndex((t) => quality === t || quality.includes(t));
    const tierIndex = matchedIndex >= 0 ? matchedIndex : 0;
    if (tierIndex > 0) cost *= 1 + tierIndex * 0.35;
  }

  return applySoundMultiplier(Math.max(1, Math.ceil(cost)), payload);
}

export function getVideoCreditsByModelId(modelId: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const dbCost = getGenerationCostSync(modelId, duration, 1, quality);
  if (dbCost > 0) {
    return shouldApplySound(modelId) ? applySoundMultiplier(dbCost, payload) : dbCost;
  }

  return getVideoCreditsByModelIdFallback(modelId, payload);
}

export async function getVideoCreditsByModelIdAsync(modelId: string, payload?: VideoPayload): Promise<number> {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const dbCost = await getGenerationCost(modelId, duration, 1, quality).catch(() => 0);
  if (dbCost > 0) {
    return shouldApplySound(modelId) ? applySoundMultiplier(dbCost, payload) : dbCost;
  }

  return getVideoCreditsByModelIdFallback(modelId, payload);
}

function getVideoCreditsByModelIdFallback(modelId: string, payload?: VideoPayload): number {
  if (modelId === "kling-v3-turbo") {
    const duration = readDuration(payload, 5);
    return applySoundMultiplier(parseFloat((duration * (5 / 3)).toFixed(2)), payload);
  }
  if (modelId === "kling-3.0/video") return applySoundMultiplier(getKling3Credits(payload), payload);
  if (modelId === "kling-3.0/motion-control") return applySoundMultiplier(getKlingMotionCredits(payload), payload);
  if (modelId === "bytedance/seedance-2") return getSeedance2Credits(payload, "hq");
  if (modelId === "bytedance/seedance-2-fast") return getSeedance2Credits(payload, "fast");
  if (modelId === "bytedance/seedance-2.5/text-to-video-turbo" || modelId === "bytedance/seedance-2.5/image-to-video-turbo") return getSeedance25TurboCredits(payload);
  if (modelId === "bytedance/seedance-2.5/image-to-video-spicy") return getSeedance25SpicyCredits(payload);
  if (modelId === "google/gemini-omni-flash" || modelId === "google/gemini-omni-video") {
    return applySoundMultiplier(getGeminiOmniFlashCredits(payload), payload);
  }

  const base = VIDEO_MODEL_ID_COST_MAP.get(modelId) ?? 0;
  if (!base) return 0;

  const model = VIDEO_MODEL_BY_ID_MAP.get(modelId);
  const baseDuration = model?.durations?.[0];
  if (baseDuration && Number.isFinite(baseDuration)) {
    const duration = readDuration(payload, baseDuration);
    let cost = Math.max(1, Math.ceil((base * duration) / baseDuration));

    if (model?.resolutions && model.resolutions.length > 1) {
      const quality = readQuality(payload);
      const tiers = model.resolutions.map((r) => r.toLowerCase());
      const matchedIndex = tiers.findIndex((t) => quality === t || quality.includes(t));
      const tierIndex = matchedIndex >= 0 ? matchedIndex : 0;
      if (tierIndex > 0) cost = Math.max(1, Math.ceil(cost * (1 + tierIndex * 0.35)));
    }

    return applySoundMultiplier(cost, payload);
  }

  return applySoundMultiplier(base, payload);
}

export function getVideoCreditsByRoute(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const dbCost = getGenerationCostSync(modelRoute, duration, 1, quality);
  if (dbCost > 0) {
    return shouldApplySound(modelRoute) ? applySoundMultiplier(dbCost, payload) : dbCost;
  }

  return getVideoCreditsByRouteFallback(modelRoute, payload);
}

export async function getVideoCreditsByRouteAsync(modelRoute: string, payload?: VideoPayload): Promise<number> {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const dbCost = await getGenerationCost(modelRoute, duration, 1, quality).catch(() => 0);
  if (dbCost > 0) {
    return shouldApplySound(modelRoute) ? applySoundMultiplier(dbCost, payload) : dbCost;
  }

  return getVideoCreditsByRouteFallback(modelRoute, payload);
}

function getVideoCreditsByRouteFallback(modelRoute: string, payload?: VideoPayload): number {
  if (modelRoute === "minimax/h3/reference-to-video") {
    return getMinimaxH3Credits(payload);
  }
  if (modelRoute === "kwaivgi/kling-v3-turbo-std/image-to-video" || modelRoute === "kwaivgi/kling-v3-turbo-pro/image-to-video") {
    const duration = readDuration(payload, 5);
    const perSecond = modelRoute.includes("-pro/") ? 5.0 : 4.0;
    return parseFloat((duration * perSecond).toFixed(2));
  }
  if (modelRoute.includes("kling/v3-turbo")) {
    const duration = readDuration(payload, 5);
    return applySoundMultiplier(parseFloat((duration * 4.0).toFixed(2)), payload);
  }
  if (modelRoute === "kwaivgi/kling-v3.0-std/text-to-video") {
    return getKling30StdCredits(payload);
  }
  if (modelRoute === "kwaivgi/kling-v3.0-std/image-to-video") {
    return getKling30StdCredits(payload);
  }
  if (modelRoute === "kwaivgi/kling-v3.0-pro/image-to-video") {
    return applySoundMultiplier(getKling3Credits(payload), payload);
  }
  if (modelRoute.startsWith("kwaivgi/kling-video-o3-")) {
    const duration = readDuration(payload, 5);
    const tier = modelRoute.includes("-4k/") ? 7.5 : modelRoute.includes("-pro/") ? 4.0 : 3.0;
    const refMultiplier = modelRoute.includes("/reference-to-video") ? 1.5 : 1;
    const soundMultiplier = payload?.sound === true || payload?.generate_audio === true ? 1.5 : 1;
    return parseFloat((duration * tier * refMultiplier * soundMultiplier).toFixed(2));
  }
  if (modelRoute.startsWith("kwaivgi/kling-v2.6-")) {
    const duration = readDuration(payload, 5);
    const tier = modelRoute.includes("-pro/") ? 2.5 : 1.5;
    const soundMultiplier = payload?.sound === true || payload?.generate_audio === true ? 2 : 1;
    return parseFloat((duration * tier * soundMultiplier).toFixed(2));
  }
  if (modelRoute === "kwaivgi/kling-v3.0-pro/text-to-video") {
    return applySoundMultiplier(getKling3Credits(payload), payload);
  }
  // kwaivgi/kling-video-o3-pro/* routes removed — KIE has no Omni endpoint.
  if (modelRoute === "kwaivgi/kling-v3.0-pro/motion-control") {
    return applySoundMultiplier(getKlingMotionCredits(payload), payload);
  }
  if (
    modelRoute === "bytedance/dreamina-v3.0/text-to-video-720p" ||
    modelRoute === "bytedance/seedance-v2/text-to-video"
  ) {
    return getSeedance2Credits(payload, "hq");
  }
  if (modelRoute === "bytedance/seedance-v2/text-to-video-fast") {
    return getSeedance2Credits(payload, "fast");
  }
  if (modelRoute === "bytedance/seedance-2.5/text-to-video-turbo" || modelRoute === "bytedance/seedance-2.5/image-to-video-turbo") {
    return getSeedance25TurboCredits(payload);
  }
  if (modelRoute === "bytedance/seedance-2.5/image-to-video-spicy") {
    return getSeedance25SpicyCredits(payload);
  }
  if (modelRoute.startsWith("alibaba/wan-3.0")) {
    return getWan30Credits(payload);
  }
  if (
    modelRoute === "google/veo3.1-lite-text-to-video" ||
    modelRoute === "google/veo3.1-fast-text-to-video" ||
    modelRoute === "google/veo3.1-text-to-video" ||
    modelRoute === "google/veo-3.1-generate-preview" ||
    modelRoute === "google/gemini-omni-video" ||
    modelRoute === "google/veo3-fast-text-to-video" ||
    modelRoute === "google/veo3-text-to-video"
  ) {
    return applySoundMultiplier(getVeo31Credits(modelRoute, payload), payload);
  }
  if (
    modelRoute === "openai/sora-2/text-to-video" ||
    modelRoute === "openai/sora-2/text-to-video-pro" ||
    modelRoute === "openai/sora-2-pro/text-to-video" ||
    modelRoute === "openai/sora-2-pro/text-to-video-pro"
  ) {
    return applySoundMultiplier(getSora2Credits(modelRoute, payload), payload);
  }
  if (modelRoute === "minimax/hailuo-2.3/i2v-standard" || modelRoute === "minimax/hailuo-2.3/i2v-pro") {
    return applySoundMultiplier(getHailuoCredits(modelRoute, payload), payload);
  }
  if (modelRoute === "x-ai/grok-imagine-video/text-to-video" || modelRoute === "x-ai/grok-imagine-video/edit-video") {
    return applySoundMultiplier(getGrokCredits(payload), payload);
  }
  if (modelRoute === "wavespeed-ai/cinematic-video-generator") {
    const duration = readDuration(payload, 5);
    return applySoundMultiplier(parseFloat(Math.max(1, duration * 1.6).toFixed(2)), payload);
  }

  if (modelRoute === "google/gemini-omni-flash" || modelRoute === "google/gemini-omni-video") {
    return applySoundMultiplier(getGeminiOmniFlashCredits(payload), payload);
  }

  const base = VIDEO_ROUTE_COST_MAP.get(modelRoute) ?? 20;
  return applyGenericRouteDynamics(modelRoute, base, payload);
}

export function getMusicCredits(modelId: string, duration?: number): number {
  const safeDuration = duration && duration > 0 ? duration : 30;
  const dbCost = getGenerationCostSync(modelId, safeDuration, 1);
  if (dbCost > 0) return dbCost;

  return getMusicCreditsFallback(modelId, safeDuration);
}

export async function getMusicCreditsAsync(modelId: string, duration?: number): Promise<number> {
  const safeDuration = duration && duration > 0 ? duration : 30;
  const dbCost = await getGenerationCost(modelId, safeDuration, 1).catch(() => 0);
  if (dbCost > 0) return dbCost;

  return getMusicCreditsFallback(modelId, safeDuration);
}

export async function getHookStudioCreditsAsync(
  modelId: string,
  payload?: VideoPayload,
  options?: { legacyUserCredits?: number },
): Promise<number> {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const dbCost = await getGenerationCost(modelId, duration, 1, quality).catch(() => 0);
  if (dbCost > 0) {
    return shouldApplySound(modelId) ? applySoundMultiplier(dbCost, payload) : dbCost;
  }

  const legacyUserCredits = Number(options?.legacyUserCredits);
  if (Number.isFinite(legacyUserCredits) && legacyUserCredits > 0) {
    return legacyUserCredits;
  }

  return getVideoCreditsByModelIdFallback(modelId, payload);
}

function getMusicCreditsFallback(modelId: string, safeDuration: number): number {
  const base = MUSIC_MODEL_BASE_COST.get(modelId) ?? 10;
  const durationMultiplier = Math.max(1, Math.ceil(safeDuration / 30));
  return base * durationMultiplier;
}

export function get3DCredits(modelId: string, mode: string): number {
  const combinedKey = `${modelId}.${mode}`;
  const dbCost = getGenerationCostSync(combinedKey, 0, 1);
  if (dbCost > 0) return dbCost;

  return THREE_D_COST_MAP.get(combinedKey) ?? 0;
}

export function getAudioActionCredits(
  actionType: "tts" | "video2audio" | "music" | "voice-changer" | "dubbing" | "lip-sync" | "voice-cloning",
  textOrPayloadOrDuration?: string | number | { text?: string; prompt?: string; duration?: number; musicDuration?: number }
): number {
  if (actionType === "tts" || actionType === "voice-cloning") {
    const text = typeof textOrPayloadOrDuration === "string" ? textOrPayloadOrDuration : typeof textOrPayloadOrDuration === "object" ? textOrPayloadOrDuration?.text || textOrPayloadOrDuration?.prompt : "";
    if (text !== undefined) return calculateTtsCredits(text);
  }
  if (actionType === "music") {
    const dur = typeof textOrPayloadOrDuration === "number" ? textOrPayloadOrDuration : typeof textOrPayloadOrDuration === "object" ? textOrPayloadOrDuration?.duration || textOrPayloadOrDuration?.musicDuration : 30;
    return calculateMusicCredits(dur);
  }
  if (actionType === "video2audio") {
    const dur = typeof textOrPayloadOrDuration === "number" ? textOrPayloadOrDuration : typeof textOrPayloadOrDuration === "object" ? textOrPayloadOrDuration?.duration : 5;
    return calculateSfxCredits(dur);
  }
  const dbCost = getGenerationCostSync(`audio:${actionType}`, 0, 1);
  if (dbCost > 0) return dbCost;

  if (actionType === "dubbing") return 8;
  if (actionType === "voice-changer") return 3;
  if (actionType === "lip-sync") return 6;
  return 10;
}

export const FIXED_TOOL_CREDITS = {
  upscale: 6,
  removeBg: 4,
  faceSwap: 4,
};

import { IMAGE_MODELS } from "@/lib/image-models";
import { VIDEO_MODELS } from "@/lib/video-models";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

type VideoPayload = Record<string, unknown>;
type ImagePricingOptions = {
  quality?: string;
  resolution?: string;
  imageSize?: string;
};

const IMAGE_COST_MAP = new Map(IMAGE_MODELS.map((m) => [m.id, m.creditCost]));
const VIDEO_MODEL_ID_COST_MAP = new Map(VIDEO_MODELS.map((m) => [m.id, m.creditCost]));
const VIDEO_MODEL_BY_ID_MAP = new Map(VIDEO_MODELS.map((m) => [m.id, m]));
const VIDEO_ROUTE_REGISTRY_MAP = new Map(VIDEO_MODEL_REGISTRY.map((m) => [m.api_route, m]));

const VIDEO_ROUTE_COST_MAP = new Map<string, number>([
  ["kwaivgi/kling-v3.0-pro/text-to-video", 20],
  // Kling 3.0 Omni / Omni Edit removed — KIE has no Omni endpoint.
  ["kwaivgi/kling-v3.0-pro/motion-control", 22],
  ["kling/v2-5-turbo-text-to-video-pro", 10],
  ["kling/v2-5-turbo-image-to-video-pro", 10],
  ["minimax/hailuo-2.3/i2v-standard", 12],
  ["minimax/hailuo-2.3/i2v-pro", 18],
  ["openai/sora-2/text-to-video", 25],
  ["openai/sora-2/text-to-video-pro", 35],
  ["openai/sora-2-pro/text-to-video", 35],
  ["openai/sora-2-pro/text-to-video-pro", 45],
  ["google/veo3.1-lite-text-to-video", 30],
  ["google/veo3.1-fast-text-to-video", 50],
  ["google/veo3.1-text-to-video", 65],
  ["bytedance/seedance-v2/text-to-video-fast", 12],
  ["bytedance/seedance-v2/text-to-video", 20],
  ["x-ai/grok-imagine-video/text-to-video", 20],
  ["x-ai/grok-imagine-video/edit-video", 20],
]);

const MUSIC_MODEL_BASE_COST = new Map<string, number>([
  ["wavespeed-ai/ace-step-1.5", 10],
  ["wavespeed-ai/song-generation", 14],
  ["wavespeed-ai/ace-step", 9],
  ["wavespeed-ai/heartmula-generate-music", 9],
  ["minimax/minimax-music-2.5", 12],
  ["minimax/minimax-music-02", 10],
  ["minimax/minimax-music-v1.5", 8],
  ["elevenlabs/elevenlabs-music", 12],
]);

const THREE_D_COST_MAP = new Map<string, number>([
  ["tripo3d-2.5.image", 10],
  ["tripo3d-2.5.multiview", 14],
  ["hunyuan3d-3.1.text", 3],
  ["hunyuan3d-3.1.image", 4],
  ["hunyuan3d-3.text", 38],
  ["hunyuan3d-3.image", 38],
  ["hunyuan3d-3.sketch", 40],
  ["meshy-6.text", 20],
  ["meshy-6.image", 20],
  ["hyper3d-rodin-2.text", 40],
  ["hyper3d-rodin-2.image", 40],
]);

export function getImageCredits(modelId: string, numImages = 1, options?: ImagePricingOptions): number {
  const count = Number.isFinite(numImages) ? Math.max(1, Math.floor(numImages)) : 1;
  void options;
  const base = IMAGE_COST_MAP.get(modelId);
  if (!base) return 0;
  return 2 * count;
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
  return hasSoundEnabled(payload) ? Math.ceil(baseCost * 1.5) : baseCost;
}

function getKling3Credits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const is4k = quality === "4k";
  const isPro = quality === "pro" || quality.includes("1080");

  if (is4k) {
    if (duration <= 3) return 18;
    return Math.max(18, Math.ceil((duration * 82) / 15));
  }

  if (isPro) {
    if (duration <= 3) return 9;
    return Math.max(9, Math.ceil((duration * 41) / 15));
  }

  return Math.max(6, duration * 2);
}

function getKlingMotionCredits(payload?: VideoPayload): number {
  const quality = readQuality(payload);
  const is1080 = quality.includes("1080") || quality === "pro";
  return is1080 ? 33 : 22;
}

// Kling Omni Edit credit helper removed — endpoint not provided by KIE.

function getSeedance2Credits(payload?: VideoPayload, variant: "hq" | "fast" = "hq"): number {
  const duration = readDuration(payload, 4);
  const quality = readQuality(payload);

  // HQ baseline: 24 cr @4s → 85 cr @15s. Linear by second between, capped at endpoints.
  let cost: number;
  if (duration === 4) cost = 24;
  else if (duration === 15) cost = 85;
  else if (duration < 4) cost = Math.max(1, Math.ceil(duration * 6));
  else cost = Math.ceil((duration * 85) / 15);

  // Fast variant is roughly half the price per KIE pricing
  if (variant === "fast") cost = Math.max(1, Math.ceil(cost * 0.5));

  // 1080p (HQ only) costs ~50% more than 720p per KIE
  if (variant === "hq" && quality.includes("1080")) {
    cost = Math.max(1, Math.ceil(cost * 1.5));
  } else if (quality.includes("480")) {
    // 480p discount ~25%
    cost = Math.max(1, Math.ceil(cost * 0.75));
  }

  return cost;
}

function getSora2Credits(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 4);
  const isPro = modelRoute.includes("text-to-video-pro") || modelRoute.includes("sora-2-pro");
  const baseAt4s = isPro ? 35 : 25;
  return Math.max(1, Math.ceil((baseAt4s * duration) / 4));
}

function getHailuoCredits(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 6);
  const isPro = modelRoute.includes("i2v-pro");
  const baseAt6s = isPro ? 18 : 12;
  return Math.max(1, Math.ceil((baseAt6s * duration) / 6));
}

function getGrokCredits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 6);
  const quality = readQuality(payload);
  const qualityMultiplier = quality.includes("720") ? 1.5 : 1;
  const baseAt6s = 20;
  return Math.max(1, Math.ceil(((baseAt6s * duration) / 6) * qualityMultiplier));
}

function getVeo31Credits(modelRoute: string, payload?: VideoPayload): number {
  const duration = readDuration(payload, 8);
  const quality = readQuality(payload);
  const durationFactor = duration / 8;
  const is4k = quality === "4k";

  if (modelRoute === "google/veo3.1-lite-text-to-video") {
    const base = Math.ceil(30 * durationFactor);
    return Math.max(1, is4k ? Math.ceil(base * 2) : base);
  }

  if (modelRoute === "google/veo3.1-fast-text-to-video") {
    const base = Math.ceil(50 * durationFactor);
    return Math.max(1, is4k ? Math.ceil(base * 2) : base);
  }

  const is1080 = quality.includes("1080");
  const base = is1080 ? 65 : 50;
  const cost = Math.ceil(base * durationFactor);
  return Math.max(1, is4k ? Math.ceil(cost * 2) : cost);
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
  if (modelId === "kling-3.0/video") return applySoundMultiplier(getKling3Credits(payload), payload);
  if (modelId === "kling-3.0/motion-control") return applySoundMultiplier(getKlingMotionCredits(payload), payload);
  if (modelId === "bytedance/seedance-2") return applySoundMultiplier(getSeedance2Credits(payload, "hq"), payload);
  if (modelId === "bytedance/seedance-2-fast") return applySoundMultiplier(getSeedance2Credits(payload, "fast"), payload);

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
    return applySoundMultiplier(getSeedance2Credits(payload, "hq"), payload);
  }
  if (modelRoute === "bytedance/seedance-v2/text-to-video-fast") {
    return applySoundMultiplier(getSeedance2Credits(payload, "fast"), payload);
  }
  if (
    modelRoute === "google/veo3.1-lite-text-to-video" ||
    modelRoute === "google/veo3.1-fast-text-to-video" ||
    modelRoute === "google/veo3.1-text-to-video"
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

  const base = VIDEO_ROUTE_COST_MAP.get(modelRoute) ?? 20;
  return applyGenericRouteDynamics(modelRoute, base, payload);
}

export function getMusicCredits(modelId: string, duration?: number): number {
  const base = MUSIC_MODEL_BASE_COST.get(modelId) ?? 10;
  const safeDuration = duration && duration > 0 ? duration : 30;
  const durationMultiplier = Math.max(1, Math.ceil(safeDuration / 30));
  return base * durationMultiplier;
}

export function get3DCredits(modelId: string, mode: string): number {
  return THREE_D_COST_MAP.get(`${modelId}.${mode}`) ?? 0;
}

export function getAudioActionCredits(actionType: "tts" | "video2audio" | "music" | "voice-changer" | "dubbing" | "lip-sync" | "voice-cloning"): number {
  if (actionType === "tts") return 4;
  if (actionType === "video2audio") return 8;
  if (actionType === "dubbing") return 8;
  if (actionType === "voice-changer") return 3;
  if (actionType === "lip-sync") return 6;
  if (actionType === "voice-cloning") return 5;
  return 10;
}

export const FIXED_TOOL_CREDITS = {
  upscale: 6,
  removeBg: 4,
  faceSwap: 4,
};

import { IMAGE_MODELS, getImageCreditCost } from "@/lib/image-models";
import { VIDEO_MODELS } from "@/lib/video-models";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

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

const VIDEO_ROUTE_COST_MAP = new Map<string, number>([
  ["kwaivgi/kling-v3.0-pro/text-to-video", 17.5],
  // Kling 3.0 Omni / Omni Edit removed — KIE has no Omni endpoint.
  ["kwaivgi/kling-v3.0-pro/motion-control", 14],
  ["kling/v2-5-turbo-text-to-video-pro", 7.15],
  ["kling/v2-5-turbo-image-to-video-pro", 7.15],
  ["minimax/hailuo-2.3/i2v-standard", 6.18],
  ["minimax/hailuo-2.3/i2v-pro", 10.26],
  ["openai/sora-2/text-to-video", 13.64],
  ["openai/sora-2/text-to-video-pro", 20.48],
  ["openai/sora-2-pro/text-to-video", 20.48],
  ["openai/sora-2-pro/text-to-video-pro", 20.48],
  ["google/veo3.1-lite-text-to-video", 13.68],
  ["google/veo3.1-fast-text-to-video", 13.68],
  ["google/veo3.1-text-to-video", 42.56],
  ["google/veo-3.1-generate-preview", 42.56],
  ["google/gemini-omni-video", 42.56],
  ["bytedance/seedance-v2/text-to-video-fast", 27],
  ["bytedance/seedance-v2/text-to-video", 40],
  ["x-ai/grok-imagine-video/text-to-video", 9.24],
  ["x-ai/grok-imagine-video/edit-video", 9.24],
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

export function getImageCredits(modelId: string, numImages = 1, options?: ImagePricingOptions): number {
  const count = Number.isFinite(numImages) ? Math.max(1, Math.floor(numImages)) : 1;
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
  return hasSoundEnabled(payload) ? Math.ceil(baseCost * 1.5) : baseCost;
}

function getKling3Credits(payload?: VideoPayload): number {
  const duration = readDuration(payload, 5);
  const quality = readQuality(payload);
  const is4k = quality === "4k";
  const isPro = quality === "pro" || quality.includes("1080");

  if (is4k) {
    return parseFloat((duration * 40.0).toFixed(2));
  }

  if (isPro) {
    return parseFloat((duration * 22.0).toFixed(2));
  }

  return parseFloat((duration * 15.0).toFixed(2));
}

function getKlingMotionCredits(payload?: VideoPayload): number {
  const quality = readQuality(payload);
  const is1080 = quality.includes("1080") || quality === "pro";
  return is1080 ? 21.84 : 16.8;
}

// Kling Omni Edit credit helper removed — endpoint not provided by KIE.

function getSeedance2Credits(payload?: VideoPayload, variant: "hq" | "fast" = "hq"): number {
  // Base rates reduced to widen the price gap closer to Higgsfield while
  // keeping >=25% margin on Pro and >=20% on Max.
  //   HQ:   8.0 -> 7.0 per second
  //   Fast: 6.7 -> 6.0 per second
  const duration = readDuration(payload, 4);
  const quality = readQuality(payload);
  let cost = duration * (variant === "fast" ? 6.0 : 7.0);

  if (variant === "hq" && quality.includes("1080")) {
    cost *= 3;
  } else if (variant === "fast" && quality.includes("480")) {
    cost *= 0.5;
  } else if (quality.includes("480")) {
    cost *= 0.8;
  }

  return parseFloat(Math.max(1, cost).toFixed(2));
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
  const duration = readDuration(payload, 8);
  const quality = readQuality(payload);
  const is4k = quality === "4k";

  if (modelRoute === "google/veo3.1-lite-text-to-video") {
    const base = duration * 1.71;
    return parseFloat(Math.max(1, is4k ? base * 3.285714 : base).toFixed(2));
  }

  if (modelRoute === "google/veo3.1-fast-text-to-video") {
    const base = duration * 1.71;
    return parseFloat(Math.max(1, is4k ? base * 3 : base).toFixed(2));
  }

  let cost = duration * 5.32;
  if (quality.includes("1080")) cost *= 1.3;
  if (is4k) cost *= 1.8;
  return parseFloat(Math.max(1, cost).toFixed(2));
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
  if (modelId === "bytedance/seedance-2") return getSeedance2Credits(payload, "hq");
  if (modelId === "bytedance/seedance-2-fast") return getSeedance2Credits(payload, "fast");

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
    return getSeedance2Credits(payload, "hq");
  }
  if (modelRoute === "bytedance/seedance-v2/text-to-video-fast") {
    return getSeedance2Credits(payload, "fast");
  }
  if (
    modelRoute === "google/veo3.1-lite-text-to-video" ||
    modelRoute === "google/veo3.1-fast-text-to-video" ||
    modelRoute === "google/veo3.1-text-to-video" ||
    modelRoute === "google/veo-3.1-generate-preview" ||
    modelRoute === "google/gemini-omni-video"
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

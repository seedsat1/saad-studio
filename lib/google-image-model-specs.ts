import type { ImageModel } from "./image-models";

export const DEFAULT_GOOGLE_IMAGE_MODEL_ID = "nano-banana-2";

export const GEMINI_FLASH_IMAGE_ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "1:8",
  "2:3",
  "3:2",
  "3:4",
  "4:1",
  "4:3",
  "4:5",
  "5:4",
  "8:1",
  "9:16",
  "16:9",
  "21:9",
];

export const GEMINI_STANDARD_IMAGE_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

export const GEMINI_FLASH_LITE_IMAGE_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

export const GOOGLE_IMAGE_UPSTREAM_MODEL_MAP: Record<string, string> = {
  "nano-banana-2": "gemini-3.1-flash-image",
  "nano-banana-pro": "gemini-3-pro-image",
  "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
  "google/nano-banana": "gemini-2.5-flash-image",
  "google/nano-banana-edit": "gemini-2.5-flash-image",
  "google/imagen4": "imagen-4.0-generate-001",
  "google/imagen4-ultra": "imagen-4.0-ultra-generate-001",
  "google/imagen4-fast": "imagen-4.0-fast-generate-001",
};

const GEMINI_UPSTREAM_SPECS: Record<string, { aspectRatios: string[]; qualityParam: string[]; maxRefImages: number }> = {
  "gemini-3.1-flash-image": {
    aspectRatios: GEMINI_FLASH_IMAGE_ASPECT_RATIOS,
    qualityParam: ["512px", "1K", "2K", "4K"],
    maxRefImages: 14,
  },
  "gemini-3-pro-image": {
    aspectRatios: GEMINI_STANDARD_IMAGE_ASPECT_RATIOS,
    qualityParam: ["1K", "2K", "4K"],
    maxRefImages: 14,
  },
  "gemini-3.1-flash-lite-image": {
    aspectRatios: GEMINI_FLASH_LITE_IMAGE_ASPECT_RATIOS,
    qualityParam: ["1K"],
    maxRefImages: 14,
  },
  "gemini-2.5-flash-image": {
    aspectRatios: GEMINI_STANDARD_IMAGE_ASPECT_RATIOS,
    qualityParam: [],
    maxRefImages: 3,
  },
};

export function getGoogleImageUpstreamModel(modelId: string | null | undefined): string | null {
  if (!modelId) return null;
  const direct = GOOGLE_IMAGE_UPSTREAM_MODEL_MAP[modelId];
  if (direct) return direct;
  return isGoogleImageUpstreamModel(modelId) ? modelId : null;
}

export function isGoogleImageUpstreamModel(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  const normalized = modelId.trim().toLowerCase();
  return normalized.startsWith("gemini-") || normalized.startsWith("imagen-");
}

export function isGeminiImageUpstreamModel(modelId: string | null | undefined): boolean {
  return Boolean(modelId && modelId.trim().toLowerCase().startsWith("gemini-"));
}

export function normalizeGoogleImageAspectRatio(modelId: string, requested?: string | null): string {
  const upstream = getGoogleImageUpstreamModel(modelId) ?? modelId;
  const spec = GEMINI_UPSTREAM_SPECS[upstream];
  const allowed = spec?.aspectRatios ?? GEMINI_STANDARD_IMAGE_ASPECT_RATIOS;
  const normalized = String(requested ?? "1:1").trim();
  return allowed.includes(normalized) ? normalized : "1:1";
}

export function normalizeGoogleImageSize(modelId: string, requested?: string | null): string | null {
  const upstream = getGoogleImageUpstreamModel(modelId) ?? modelId;
  if (upstream === "gemini-2.5-flash-image") return null;
  if (upstream === "gemini-3.1-flash-lite-image") return "1K";

  const raw = String(requested ?? "1K").trim();
  const upper = raw.toUpperCase();
  if (upstream === "gemini-3.1-flash-image" && upper === "512PX") return "512px";
  if (["1K", "2K", "4K"].includes(upper)) return upper;
  return "1K";
}

export function normalizeGoogleImageModelConfig(model: ImageModel): ImageModel {
  const upstream = getGoogleImageUpstreamModel(model.upstreamModelId ?? model.id);
  if (!upstream || !isGeminiImageUpstreamModel(upstream)) return model;

  const spec = GEMINI_UPSTREAM_SPECS[upstream];
  if (!spec) return model;

  return {
    ...model,
    upstreamModelId: upstream,
    aspectRatios: model.inputType === "edit" ? model.aspectRatios : spec.aspectRatios,
    maxImages: model.inputType === "edit" ? model.maxImages : 4,
    maxRefImages: spec.maxRefImages,
    imageInputField: model.id === "google/nano-banana-edit" ? "image_urls" : "image_input",
    qualityParam: spec.qualityParam.length ? spec.qualityParam : model.qualityParam,
  };
}

export function getDefaultImageModel(models: ImageModel[]): ImageModel | undefined {
  return models.find((model) => model.id === DEFAULT_GOOGLE_IMAGE_MODEL_ID) ?? models[0];
}

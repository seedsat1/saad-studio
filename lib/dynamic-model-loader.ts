import prismadb from "@/lib/prismadb";
import { IMAGE_MODELS, type ImageModel } from "./image-models";
import { VIDEO_MODEL_REGISTRY, orderVideoModelsForDisplay, type WaveSpeedVideoModel } from "./video-model-registry";

export interface DynamicImageModel extends ImageModel {
  isActive?: boolean;
}

export interface DynamicVideoModel extends WaveSpeedVideoModel {
  isActive?: boolean;
  creditCost?: number;
}

const BLOCKED_DYNAMIC_IMAGE_IDS = new Set([
  "google/gemini-3.1-flash-image-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
]);

const BLOCKED_DYNAMIC_VIDEO_IDS = new Set([
  "google/veo-3.1-generate-preview",
  "google/veo-3.1-fast-generate-preview",
  "google/veo-3.1-lite-generate-preview",
]);

function mergeCuratedImageModel(curated: ImageModel, existing?: DynamicImageModel): DynamicImageModel {
  return {
    ...curated,
    isActive: existing?.isActive ?? (curated as DynamicImageModel).isActive ?? true,
    creditCost: existing?.creditCost ?? curated.creditCost,
  };
}

function mergeCuratedVideoModel(curated: WaveSpeedVideoModel, existing?: DynamicVideoModel): DynamicVideoModel {
  return {
    ...curated,
    isActive: existing?.isActive ?? (curated as DynamicVideoModel).isActive ?? true,
    creditCost: existing?.creditCost ?? (curated as DynamicVideoModel).creditCost,
  };
}

export function normalizeDynamicImageModels(models: DynamicImageModel[]): DynamicImageModel[] {
  const existingById = new Map(models.map((model) => [model.id.toLowerCase(), model]));
  const curatedIds = new Set(IMAGE_MODELS.map((model) => model.id.toLowerCase()));
  const normalized: DynamicImageModel[] = IMAGE_MODELS.map((model) => mergeCuratedImageModel(model, existingById.get(model.id.toLowerCase())));

  for (const model of models) {
    const id = model.id.toLowerCase();
    if (curatedIds.has(id) || BLOCKED_DYNAMIC_IMAGE_IDS.has(id)) continue;
    if (/gemini-3(?:\.1)?-.*preview/i.test(model.id)) continue;
    normalized.push(model);
  }

  return normalized;
}

export function normalizeDynamicVideoModels(models: DynamicVideoModel[]): DynamicVideoModel[] {
  const existingById = new Map(models.map((model) => [model.id.toLowerCase(), model]));
  const curatedIds = new Set(VIDEO_MODEL_REGISTRY.map((model) => model.id.toLowerCase()));
  const normalized: DynamicVideoModel[] = VIDEO_MODEL_REGISTRY.map((model) => mergeCuratedVideoModel(model, existingById.get(model.id.toLowerCase())));

  for (const model of models) {
    const id = model.id.toLowerCase();
    if (curatedIds.has(id) || BLOCKED_DYNAMIC_VIDEO_IDS.has(id)) continue;
    normalized.push(model);
  }

  return orderVideoModelsForDisplay(normalized);
}

/**
 * Loads dynamic image models from the PlatformConfig table.
 * If empty or not set, initializes it with static defaults.
 */
export async function getDynamicImageModels(): Promise<DynamicImageModel[]> {
  try {
    const config = await prismadb.platformConfig.findUnique({
      where: { key: "dynamic_image_models" },
    });
    if (config?.value) {
      const parsed = JSON.parse(config.value) as DynamicImageModel[];
      if (parsed && parsed.length > 0) {
        const normalized = normalizeDynamicImageModels(parsed);
        if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
          await saveDynamicImageModels(normalized);
        }
        return normalized;
      }
    }
    const normalizedDefaults = normalizeDynamicImageModels(IMAGE_MODELS);
    await saveDynamicImageModels(normalizedDefaults);
    return normalizedDefaults;
  } catch (error) {
    console.error("[GET_DYNAMIC_IMAGE_MODELS_ERROR]", error);
    return normalizeDynamicImageModels(IMAGE_MODELS);
  }
}

/**
 * Loads dynamic video models from the PlatformConfig table.
 * If empty or not set, initializes it with static defaults.
 */
export async function getDynamicVideoModels(): Promise<DynamicVideoModel[]> {
  try {
    const config = await prismadb.platformConfig.findUnique({
      where: { key: "dynamic_video_models" },
    });
    if (config?.value) {
      const parsed = JSON.parse(config.value) as DynamicVideoModel[];
      if (parsed && parsed.length > 0) {
        const normalized = normalizeDynamicVideoModels(parsed);
        if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
          await saveDynamicVideoModels(normalized);
        }
        return normalized;
      }
    }
    const normalizedDefaults = normalizeDynamicVideoModels(VIDEO_MODEL_REGISTRY);
    await saveDynamicVideoModels(normalizedDefaults);
    return normalizedDefaults;
  } catch (error) {
    console.error("[GET_DYNAMIC_VIDEO_MODELS_ERROR]", error);
    return normalizeDynamicVideoModels(VIDEO_MODEL_REGISTRY);
  }
}

/**
 * Saves dynamic image models to the PlatformConfig table.
 */
export async function saveDynamicImageModels(models: ImageModel[]): Promise<void> {
  const serialized = JSON.stringify(models);
  await prismadb.platformConfig.upsert({
    where: { key: "dynamic_image_models" },
    update: { value: serialized },
    create: { key: "dynamic_image_models", value: serialized },
  });
}

/**
 * Saves dynamic video models to the PlatformConfig table.
 */
export async function saveDynamicVideoModels(models: WaveSpeedVideoModel[]): Promise<void> {
  const serialized = JSON.stringify(models);
  await prismadb.platformConfig.upsert({
    where: { key: "dynamic_video_models" },
    update: { value: serialized },
    create: { key: "dynamic_video_models", value: serialized },
  });
}

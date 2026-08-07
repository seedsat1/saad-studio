import prismadb from "@/lib/prismadb";
import { IMAGE_MODELS, type ImageModel } from "./image-models";
import { VIDEO_MODEL_REGISTRY, type WaveSpeedVideoModel } from "./video-model-registry";

export interface DynamicImageModel extends ImageModel {
  isActive?: boolean;
}

export interface DynamicVideoModel extends WaveSpeedVideoModel {
  isActive?: boolean;
  creditCost?: number;
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
        return parsed;
      }
    }
    // Initialize DB if empty
    await saveDynamicImageModels(IMAGE_MODELS);
    return IMAGE_MODELS;
  } catch (error) {
    console.error("[GET_DYNAMIC_IMAGE_MODELS_ERROR]", error);
    return IMAGE_MODELS;
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
        return parsed;
      }
    }
    // Initialize DB if empty
    await saveDynamicVideoModels(VIDEO_MODEL_REGISTRY);
    return VIDEO_MODEL_REGISTRY;
  } catch (error) {
    console.error("[GET_DYNAMIC_VIDEO_MODELS_ERROR]", error);
    return VIDEO_MODEL_REGISTRY;
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

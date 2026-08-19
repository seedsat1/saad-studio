import prismadb from "@/lib/prismadb";
import { IMAGE_MODELS, type ImageModel } from "./image-models";
import { VIDEO_MODEL_REGISTRY, orderVideoModelsForDisplay, type WaveSpeedVideoModel } from "./video-model-registry";

export interface DynamicImageModel extends ImageModel {
  isActive?: boolean;
  isCustom?: boolean;
  isDeleted?: boolean;
  family_color?: string;
  color?: string;
  text_api_route?: string;
  image_api_route?: string;
}

export interface DynamicVideoModel extends WaveSpeedVideoModel {
  isActive?: boolean;
  creditCost?: number;
  isCustom?: boolean;
  isDeleted?: boolean;
  group?: string;
  color?: string;
  text_api_route?: string;
  image_api_route?: string;
}

const BLOCKED_DYNAMIC_IMAGE_IDS = new Set([
  "google/gemini-3.1-flash-image-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "openai/dall-e-3",
  "dalle3",
]);

const BLOCKED_DYNAMIC_VIDEO_IDS = new Set([
  "google/veo-3.1-generate-preview",
  "google/veo-3.1-fast-generate-preview",
  "google/veo-3.1-lite-generate-preview",
]);

function mergeCuratedImageModel(curated: ImageModel, existing?: DynamicImageModel): DynamicImageModel {
  const group = existing?.group ?? curated.group ?? "Image Models";
  const familyColor = existing?.family_color ?? existing?.color ?? (curated as any).family_color ?? (curated as any).color ?? "#06b6d4";
  const label = existing?.label ?? (existing as any)?.name ?? curated.label;
  return {
    ...curated,
    label,
    group,
    family_color: familyColor,
    isActive: existing?.isDeleted ? false : (existing?.isActive ?? (curated as DynamicImageModel).isActive ?? true),
    isDeleted: existing?.isDeleted ?? false,
    creditCost: existing?.creditCost ?? curated.creditCost,
  };
}

function mergeCuratedVideoModel(curated: WaveSpeedVideoModel, existing?: DynamicVideoModel): DynamicVideoModel {
  const group = existing?.group ?? (curated as any).group ?? curated.family_label ?? curated.family ?? "Video Models";
  const familyColor = existing?.family_color ?? existing?.color ?? curated.family_color ?? "#8b5cf6";
  const familySlug = group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const name = existing?.name ?? (existing as any)?.label ?? curated.name;
  return {
    ...curated,
    name,
    group,
    family: familySlug,
    family_label: group,
    family_color: familyColor,
    isActive: existing?.isDeleted ? false : (existing?.isActive ?? (curated as DynamicVideoModel).isActive ?? true),
    isDeleted: existing?.isDeleted ?? false,
    creditCost: existing?.creditCost ?? (curated as DynamicVideoModel).creditCost,
    capabilities: existing?.capabilities ? { ...curated.capabilities, ...existing.capabilities } : curated.capabilities,
  };
}

export function normalizeDynamicImageModels(models: DynamicImageModel[]): DynamicImageModel[] {
  const orderedResult: DynamicImageModel[] = [];
  const processedIds = new Set<string>();

  if (Array.isArray(models) && models.length > 0) {
    for (const model of models) {
      const id = model.id?.toLowerCase();
      if (!id || processedIds.has(id) || model.isDeleted || BLOCKED_DYNAMIC_IMAGE_IDS.has(id)) continue;
      if (/gemini-3(?:\.1)?-.*preview/i.test(model.id)) continue;

      const curated = IMAGE_MODELS.find((c) => c.id.toLowerCase() === id);
      if (curated) {
        orderedResult.push(mergeCuratedImageModel(curated, model));
      } else {
        orderedResult.push({
          ...model,
          label: model.label || model.id,
          sublabel: model.sublabel || "",
          badge: model.badge || "NEW",
          group: model.group || "Custom Fleet",
          inputType: (model.text_api_route || !model.image_api_route) ? "text-to-image" : (model.inputType || "text-to-image"),
          aspectRatios: model.aspectRatios || ["16:9", "9:16", "1:1"],
          maxImages: typeof model.maxImages === "number" ? model.maxImages : 4,
          maxRefImages: typeof model.maxRefImages === "number" ? model.maxRefImages : 4,
          family_color: model.family_color || model.color || "#06b6d4",
        });
      }
      processedIds.add(id);
    }
  }

  for (const curated of IMAGE_MODELS) {
    const id = curated.id.toLowerCase();
    if (!processedIds.has(id) && !BLOCKED_DYNAMIC_IMAGE_IDS.has(id)) {
      orderedResult.push(mergeCuratedImageModel(curated));
      processedIds.add(id);
    }
  }

  return orderedResult;
}

export function normalizeDynamicVideoModels(models: DynamicVideoModel[]): DynamicVideoModel[] {
  const orderedResult: DynamicVideoModel[] = [];
  const processedIds = new Set<string>();

  if (Array.isArray(models) && models.length > 0) {
    for (const model of models) {
      const id = model.id?.toLowerCase();
      if (!id || processedIds.has(id) || model.isDeleted || BLOCKED_DYNAMIC_VIDEO_IDS.has(id)) continue;

      const curated = VIDEO_MODEL_REGISTRY.find((c) => c.id.toLowerCase() === id);
      if (curated) {
        orderedResult.push(mergeCuratedVideoModel(curated, model));
      } else {
        const group = model.group || (model as any).family_label || (model as any).family || "Custom Video Fleet";
        const familySlug = group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const familyColor = model.family_color || model.color || "#8b5cf6";
        orderedResult.push({
          ...model,
          group,
          family: familySlug,
          family_label: group,
          family_color: familyColor,
        });
      }
      processedIds.add(id);
    }
  }

  for (const curated of VIDEO_MODEL_REGISTRY) {
    const id = curated.id.toLowerCase();
    if (!processedIds.has(id) && !BLOCKED_DYNAMIC_VIDEO_IDS.has(id)) {
      orderedResult.push(mergeCuratedVideoModel(curated));
      processedIds.add(id);
    }
  }

  return orderedResult;
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

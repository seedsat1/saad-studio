export type WaveSpeedImageReferenceField = "image" | "images";

export interface WaveSpeedImageRouteConfig {
  model: string;
  referenceField?: WaveSpeedImageReferenceField;
  requiresReference?: boolean;
  maxReferenceImages: number;
  outputCountField?: "num_images" | "max_images";
  maxOutputImages: number;
  inputShape: "aspect-resolution" | "seedream-pro" | "seedream-lite-size" | "size" | "aspect-only";
}

function normalizeSeedream5ProResolution(value: unknown): "1k" | "2k" {
  const normalized = String(value ?? "1k").trim().toLowerCase();
  return normalized.includes("2") ? "2k" : "1k";
}

function normalizeSeedream5LiteSize(value: unknown): string {
  const normalized = String(value ?? "2K").trim().toLowerCase();
  if (normalized.includes("4")) return "4096*4096";
  return "2048*2048";
}

function parseAspectRatio(value: unknown): [number, number] {
  const normalized = String(value ?? "1:1").trim().toLowerCase();
  if (normalized === "auto") return [1, 1];
  const match = normalized.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return [1, 1];
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? [width, height] : [1, 1];
}

function roundToMultiple(value: number, step = 16): number {
  return Math.max(step, Math.round(value / step) * step);
}

export function normalizeWaveSpeedImageSize(aspectRatio: unknown, quality: unknown): string {
  const normalizedQuality = String(quality ?? "1K").trim().toLowerCase();
  const longEdge = normalizedQuality.includes("4")
    ? 4096
    : normalizedQuality.includes("2") || normalizedQuality.includes("high")
      ? 2048
      : 1024;
  const [rw, rh] = parseAspectRatio(aspectRatio);
  if (rw >= rh) {
    return `${longEdge}*${roundToMultiple(longEdge * (rh / rw))}`;
  }
  return `${roundToMultiple(longEdge * (rw / rh))}*${longEdge}`;
}

export function resolveWaveSpeedImageModelRoute(
  modelId: string,
  hasReferenceImages: boolean,
  numImages: number,
): WaveSpeedImageRouteConfig | null {
  const id = modelId.toLowerCase();
  const wantsMulti = numImages > 1;

  if (id === "seedream/4.5-text-to-image" || id === "bytedance/seedream-v4.5") {
    return {
      model: wantsMulti ? "bytedance/seedream-v4.5/sequential" : "bytedance/seedream-v4.5",
      maxReferenceImages: 0,
      outputCountField: wantsMulti ? "max_images" : undefined,
      maxOutputImages: 15,
      inputShape: "size",
    };
  }

  if (id === "seedream/4.5-edit" || id === "bytedance/seedream-v4.5/edit") {
    return {
      model: wantsMulti ? "bytedance/seedream-v4.5/edit-sequential" : "bytedance/seedream-v4.5/edit",
      referenceField: "images",
      requiresReference: true,
      maxReferenceImages: 10,
      outputCountField: wantsMulti ? "max_images" : undefined,
      maxOutputImages: 15,
      inputShape: "size",
    };
  }

  if (
    id === "seedream/5-lite"
    || id === "seedream/5-lite-text-to-image"
    || id === "bytedance/seedream-v5.0-lite"
    || id === "bytedance/seedream-v5.0-lite/sequential"
  ) {
    const edit = hasReferenceImages;
    return {
      model: edit
        ? wantsMulti ? "bytedance/seedream-v5.0-lite/edit-sequential" : "bytedance/seedream-v5.0-lite/edit"
        : wantsMulti ? "bytedance/seedream-v5.0-lite/sequential" : "bytedance/seedream-v5.0-lite",
      referenceField: edit ? "images" : undefined,
      requiresReference: edit,
      maxReferenceImages: edit ? 10 : 0,
      outputCountField: wantsMulti ? "max_images" : undefined,
      maxOutputImages: 15,
      inputShape: "seedream-lite-size",
    };
  }

  if (
    id === "seedream/5-lite-image-to-image"
    || id === "bytedance/seedream-v5.0-lite/edit"
    || id === "bytedance/seedream-v5.0-lite/edit-sequential"
  ) {
    return {
      model: wantsMulti ? "bytedance/seedream-v5.0-lite/edit-sequential" : "bytedance/seedream-v5.0-lite/edit",
      referenceField: "images",
      requiresReference: true,
      maxReferenceImages: 10,
      outputCountField: wantsMulti ? "max_images" : undefined,
      maxOutputImages: 15,
      inputShape: "seedream-lite-size",
    };
  }

  if (id === "seedream/5-pro-text-to-image" || id === "bytedance/seedream-v5.0-pro") {
    return {
      model: "bytedance/seedream-v5.0-pro",
      maxReferenceImages: 0,
      maxOutputImages: 1,
      inputShape: "seedream-pro",
    };
  }

  if (
    id === "seedream/5-pro-image-to-image"
    || id === "bytedance/seedream-v5.0-pro/edit"
    || id === "seedream/5-pro"
  ) {
    return {
      model: hasReferenceImages ? "bytedance/seedream-v5.0-pro/edit" : "bytedance/seedream-v5.0-pro",
      referenceField: hasReferenceImages ? "images" : undefined,
      requiresReference: hasReferenceImages,
      maxReferenceImages: hasReferenceImages ? 10 : 0,
      maxOutputImages: 1,
      inputShape: "seedream-pro",
    };
  }

  if (id === "z-image") {
    return {
      model: "wavespeed-ai/z-image/base",
      referenceField: hasReferenceImages ? "image" : undefined,
      maxReferenceImages: hasReferenceImages ? 1 : 0,
      maxOutputImages: 4,
      inputShape: "size",
    };
  }

  if (id === "qwen2/text-to-image") {
    return {
      model: "wavespeed-ai/qwen-image-2.0/text-to-image",
      maxReferenceImages: 0,
      maxOutputImages: 4,
      inputShape: "size",
    };
  }

  if (id === "qwen2/image-edit") {
    return {
      model: "wavespeed-ai/qwen-image-2.0/edit",
      referenceField: "images",
      requiresReference: true,
      maxReferenceImages: 3,
      maxOutputImages: 1,
      inputShape: "size",
    };
  }

  if (id === "qwen/image-to-image") {
    return {
      model: "wavespeed-ai/qwen-image/edit",
      referenceField: "image",
      requiresReference: true,
      maxReferenceImages: 1,
      maxOutputImages: 1,
      inputShape: "size",
    };
  }

  if (id === "grok-imagine/text-to-image") {
    return {
      model: "x-ai/grok-imagine-image-quality/text-to-image",
      maxReferenceImages: 0,
      outputCountField: "num_images",
      maxOutputImages: 4,
      inputShape: "aspect-resolution",
    };
  }

  if (id === "grok-imagine/image-to-image") {
    return {
      model: "x-ai/grok-imagine-image-quality/edit",
      referenceField: "image",
      requiresReference: true,
      maxReferenceImages: 1,
      outputCountField: "num_images",
      maxOutputImages: 4,
      inputShape: "aspect-resolution",
    };
  }

  if (id === "wan/2-7-image-pro") {
    return {
      model: hasReferenceImages ? "alibaba/wan-2.7/image-edit-pro" : "alibaba/wan-2.7/text-to-image-pro",
      referenceField: hasReferenceImages ? "images" : undefined,
      requiresReference: hasReferenceImages,
      maxReferenceImages: hasReferenceImages ? 3 : 0,
      maxOutputImages: 12,
      inputShape: "size",
    };
  }

  if (
    id === "grok-imagine/text-to-image"
    || id === "grok-imagine/image-to-image"
    || id.includes("grok-imagine")
    || id.includes("grok")
  ) {
    const edit = hasReferenceImages || id.includes("image-to-image") || id.includes("edit");
    return {
      model: edit ? "grok-imagine/image-to-image" : "grok-imagine/text-to-image",
      referenceField: edit ? "image" : undefined,
      requiresReference: edit,
      maxReferenceImages: edit ? 1 : 0,
      maxOutputImages: 1,
      inputShape: "aspect-only",
    };
  }

  const flux = id.match(/^flux-2\/(pro|flex|max)(?:-(text-to-image|image-to-image))?$/);
  if (flux) {
    const tier = flux[1];
    const edit = hasReferenceImages || flux[2] === "image-to-image";
    return {
      model: `wavespeed-ai/flux-2-${tier}/${edit ? "edit" : "text-to-image"}`,
      referenceField: edit ? "images" : undefined,
      requiresReference: edit,
      maxReferenceImages: edit ? 3 : 0,
      maxOutputImages: 4,
      inputShape: "size",
    };
  }

  // Universal fallback for custom endpoints registered via admin portal (e.g. provider/model-path)
  if (modelId.includes("/")) {
    return {
      model: modelId.trim(),
      referenceField: hasReferenceImages ? "images" : undefined,
      requiresReference: false,
      maxReferenceImages: hasReferenceImages ? 4 : 0,
      maxOutputImages: 4,
      inputShape: "aspect-resolution",
    };
  }

  return null;
}

export function buildWaveSpeedImageInput(
  config: WaveSpeedImageRouteConfig,
  params: {
    prompt: string;
    aspectRatio?: string;
    quality?: string | null;
    resolution?: string | null;
    imageSize?: string | null;
    numImages?: number;
    referenceUrls?: string[];
    negativePrompt?: string | null;
  },
): Record<string, unknown> {
  const requestedQuality = params.quality ?? params.resolution ?? params.imageSize;
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    output_format: "jpeg",
  };

  if (params.negativePrompt) {
    input.negative_prompt = params.negativePrompt;
  }

  if (config.inputShape === "aspect-only" || config.model.includes("grok")) {
    const ar = String(params.aspectRatio || "1:1").trim();
    input.aspect_ratio = ar === "auto" ? "1:1" : ar;
  } else if (config.inputShape === "aspect-resolution" || config.inputShape === "seedream-pro") {
    input.aspect_ratio = params.aspectRatio === "auto" ? undefined : params.aspectRatio;
    input.resolution = config.inputShape === "seedream-pro"
      ? normalizeSeedream5ProResolution(requestedQuality)
      : String(requestedQuality ?? "1k").trim().toLowerCase();
  } else if (config.inputShape === "seedream-lite-size") {
    input.size = normalizeSeedream5LiteSize(requestedQuality);
  } else {
    input.size = normalizeWaveSpeedImageSize(params.aspectRatio, requestedQuality);
    input.enable_base64_output = false;
    input.enable_sync_mode = false;
  }

  const refs = (params.referenceUrls ?? []).slice(0, config.maxReferenceImages);
  if (config.referenceField === "images") {
    input.images = refs;
  } else if (config.referenceField === "image" && refs[0]) {
    input.image = refs[0];
  }

  if (config.outputCountField) {
    input[config.outputCountField] = Math.max(1, Math.min(config.maxOutputImages, Math.ceil(Number(params.numImages) || 1)));
  }

  Object.keys(input).forEach((key) => {
    if (input[key] === undefined) delete input[key];
  });
  return input;
}

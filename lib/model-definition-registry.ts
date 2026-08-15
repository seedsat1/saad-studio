import { getDynamicImageModels, getDynamicVideoModels, type DynamicImageModel, type DynamicVideoModel } from "@/lib/dynamic-model-loader";
import { resolveImageModelSource, resolveVideoModelSource, type RuntimeSourceProvider } from "@/lib/model-source-map";

export const MODEL_DEFINITION_MODALITIES = ["image", "video", "audio", "3d", "tool"] as const;
export const MODEL_DEFINITION_STATUSES = ["active", "disabled", "deprecated", "draft"] as const;
export const MODEL_PARAMETER_TYPES = ["select", "number", "boolean", "text", "file", "file_list"] as const;

export type ModelDefinitionModality = (typeof MODEL_DEFINITION_MODALITIES)[number];
export type ModelDefinitionStatus = (typeof MODEL_DEFINITION_STATUSES)[number];
export type ModelParameterType = (typeof MODEL_PARAMETER_TYPES)[number];

export type ModelCapabilityKey =
  | "textToImage"
  | "imageToImage"
  | "textToVideo"
  | "imageToVideo"
  | "videoToVideo"
  | "textToAudio"
  | "referenceImages"
  | "referenceVideos"
  | "referenceAudios"
  | "audioInput"
  | "audioOutput"
  | "multipleOutputs"
  | "seed"
  | "negativePrompt"
  | "transparentBackground"
  | "extendVideo"
  | "editVideo";

export type ModelDefinitionProvenance = {
  source: "curated_registry" | "admin_model_registry" | "knowledge_publish";
  sourceUrl: string | null;
  documentId: string | null;
  section: string | null;
  approvedAt: string | null;
};

export type ModelParameterDefinition = {
  id: string;
  label: string;
  type: ModelParameterType;
  required: boolean;
  defaultValue: string | number | boolean | null;
  options?: Array<string | number | boolean>;
  min?: number;
  max?: number;
  step?: number;
  visible: boolean;
  supported: boolean;
  provenance?: ModelDefinitionProvenance[];
};

export type ModelParameterRule = {
  when: { parameterId: string; equals: string | number | boolean };
  then: { parameterId: string; options?: Array<string | number | boolean>; min?: number; max?: number; supported?: boolean };
};

export type ModelReferenceInputDefinition = {
  supported: boolean;
  min: number;
  max: number;
  required: boolean;
};

export type CentralModelDefinition = {
  modelId: string;
  displayName: string;
  modality: ModelDefinitionModality;
  status: ModelDefinitionStatus;
  sourceModelId: string;
  version: string | null;
  pricingRef: string;
  routingRef: string;
  capabilities: Partial<Record<ModelCapabilityKey, boolean | number | string[]>>;
  parameters: ModelParameterDefinition[];
  parameterRules: ModelParameterRule[];
  inputs: {
    referenceImages: ModelReferenceInputDefinition;
    referenceVideos: ModelReferenceInputDefinition;
    referenceAudios: ModelReferenceInputDefinition;
  };
  outputs: {
    mediaTypes: Array<"image" | "video" | "audio" | "text" | "3d">;
    multipleOutputs: boolean;
    maxOutputs: number;
  };
  limits: Record<string, number | string | boolean | null>;
  defaults: Record<string, string | number | boolean | null>;
  runtimeSource: RuntimeSourceProvider;
  definitionSource: "central" | "legacy_fallback";
  provenance: ModelDefinitionProvenance[];
};

const REGISTRY_PROVENANCE: ModelDefinitionProvenance = {
  source: "curated_registry",
  sourceUrl: null,
  documentId: null,
  section: "static/dynamic model registry",
  approvedAt: null,
};

function selectParam(id: string, label: string, options: Array<string | number | boolean>, defaultValue: string | number | boolean | null = options[0] ?? null): ModelParameterDefinition | null {
  if (!options.length) return null;
  return {
    id,
    label,
    type: "select",
    required: false,
    defaultValue,
    options,
    visible: true,
    supported: true,
    provenance: [REGISTRY_PROVENANCE],
  };
}

function numberParam(id: string, label: string, max: number, defaultValue: number, min = 1): ModelParameterDefinition | null {
  if (!Number.isFinite(max) || max <= 0) return null;
  return {
    id,
    label,
    type: "number",
    required: false,
    defaultValue,
    min,
    max,
    step: 1,
    visible: true,
    supported: true,
    provenance: [REGISTRY_PROVENANCE],
  };
}

function compactParams(params: Array<ModelParameterDefinition | null>): ModelParameterDefinition[] {
  return params.filter(Boolean) as ModelParameterDefinition[];
}

export function buildImageModelDefinition(model: DynamicImageModel): CentralModelDefinition {
  const source = resolveImageModelSource(model);
  const maxImages = Math.max(1, Number(model.maxImages) || 1);
  const maxRefImages = Math.max(0, Number(model.maxRefImages) || 0);
  const supportsRefs = maxRefImages > 0;
  const isImageInput = model.inputType === "image-to-image" || model.inputType === "edit";

  return {
    modelId: model.id,
    displayName: model.label,
    modality: "image",
    status: model.isActive === false ? "disabled" : "active",
    sourceModelId: model.upstreamModelId || model.id,
    version: null,
    pricingRef: model.id,
    routingRef: model.id,
    capabilities: {
      textToImage: model.inputType === "text-to-image",
      imageToImage: isImageInput,
      referenceImages: supportsRefs ? maxRefImages : false,
      multipleOutputs: maxImages > 1,
      seed: Boolean(model.grokMode || model.wanSequentialMode),
    },
    parameters: compactParams([
      selectParam("aspectRatio", "Aspect Ratio", model.aspectRatios || []),
      selectParam("quality", "Quality", model.qualityParam || []),
      numberParam("numOutputs", "Number of Outputs", maxImages, 1),
      numberParam("referenceImages", "Reference Images", maxRefImages, isImageInput ? Math.min(1, maxRefImages) : 0, 0),
    ]),
    parameterRules: [],
    inputs: {
      referenceImages: { supported: supportsRefs, min: isImageInput && supportsRefs ? 1 : 0, max: maxRefImages, required: isImageInput && supportsRefs },
      referenceVideos: { supported: false, min: 0, max: 0, required: false },
      referenceAudios: { supported: false, min: 0, max: 0, required: false },
    },
    outputs: {
      mediaTypes: ["image"],
      multipleOutputs: maxImages > 1,
      maxOutputs: maxImages,
    },
    limits: {
      maxImages,
      maxReferenceImages: maxRefImages,
    },
    defaults: {
      aspectRatio: model.aspectRatios?.[0] ?? null,
      quality: model.qualityParam?.[0] ?? null,
      numOutputs: 1,
    },
    runtimeSource: source.runtimeSource,
    definitionSource: "central",
    provenance: [REGISTRY_PROVENANCE],
  };
}

export function buildVideoModelDefinition(model: DynamicVideoModel): CentralModelDefinition {
  const source = resolveVideoModelSource(model);
  const caps = model.capabilities;
  const durations = caps?.durations ?? [];
  const resolutions = caps?.resolutions ?? [];
  const aspectRatios = caps?.aspect_ratios ?? [];
  const maxReferenceImages = Math.max(0, Number(caps?.max_reference_images) || 0);
  const maxReferenceVideos = Math.max(0, Number(caps?.max_reference_videos) || 0);
  const maxReferenceAudios = Math.max(0, Number(caps?.max_reference_audios) || 0);
  const requiresImage = Boolean(caps?.requires_image);
  const requiresVideo = Boolean(caps?.requires_video);

  return {
    modelId: model.id,
    displayName: model.name,
    modality: "video",
    status: model.isActive === false ? "disabled" : "active",
    sourceModelId: model.api_route || model.id,
    version: null,
    pricingRef: model.api_route || model.id,
    routingRef: model.api_route || model.id,
    capabilities: {
      textToVideo: !requiresImage && !requiresVideo,
      imageToVideo: requiresImage || Boolean(caps?.optional_image),
      videoToVideo: requiresVideo || Boolean(caps?.optional_video),
      referenceImages: maxReferenceImages || false,
      referenceVideos: maxReferenceVideos || false,
      referenceAudios: maxReferenceAudios || false,
      audioInput: maxReferenceAudios > 0,
      audioOutput: Boolean(caps?.has_sound),
      multipleOutputs: false,
      seed: Boolean(caps?.has_seed),
      negativePrompt: Boolean(caps?.has_negative_prompt),
      extendVideo: Boolean(caps?.optional_video),
      editVideo: requiresVideo || Boolean(caps?.optional_video),
    },
    parameters: compactParams([
      selectParam("resolution", "Resolution", resolutions),
      selectParam("duration", "Duration", durations),
      selectParam("aspectRatio", "Aspect Ratio", aspectRatios),
      numberParam("referenceImages", "Reference Images", maxReferenceImages, requiresImage ? Math.min(1, maxReferenceImages) : 0, 0),
      numberParam("referenceVideos", "Reference Videos", maxReferenceVideos, requiresVideo ? Math.min(1, maxReferenceVideos) : 0, 0),
      numberParam("referenceAudios", "Reference Audios", maxReferenceAudios, 0, 0),
    ]),
    parameterRules: [],
    inputs: {
      referenceImages: { supported: maxReferenceImages > 0 || requiresImage, min: requiresImage ? 1 : 0, max: maxReferenceImages, required: requiresImage },
      referenceVideos: { supported: maxReferenceVideos > 0 || requiresVideo, min: requiresVideo ? 1 : 0, max: maxReferenceVideos, required: requiresVideo },
      referenceAudios: { supported: maxReferenceAudios > 0, min: 0, max: maxReferenceAudios, required: false },
    },
    outputs: {
      mediaTypes: ["video"],
      multipleOutputs: false,
      maxOutputs: 1,
    },
    limits: {
      maxReferenceImages,
      maxReferenceVideos,
      maxReferenceAudios,
      maxReferenceVideoTotalSeconds: caps?.max_reference_video_total_seconds ?? 0,
      maxReferenceAudioTotalSeconds: caps?.max_reference_audio_total_seconds ?? 0,
    },
    defaults: {
      resolution: resolutions[0] ?? null,
      duration: durations[0] ?? null,
      aspectRatio: aspectRatios[0] ?? null,
    },
    runtimeSource: source.runtimeSource,
    definitionSource: "central",
    provenance: [REGISTRY_PROVENANCE],
  };
}

export function buildCentralModelDefinitions(input: {
  imageModels: DynamicImageModel[];
  videoModels: DynamicVideoModel[];
}): CentralModelDefinition[] {
  return [
    ...input.imageModels.map(buildImageModelDefinition),
    ...input.videoModels.map(buildVideoModelDefinition),
  ];
}

export async function getCentralModelDefinitions(): Promise<CentralModelDefinition[]> {
  const [imageModels, videoModels] = await Promise.all([getDynamicImageModels(), getDynamicVideoModels()]);
  return buildCentralModelDefinitions({ imageModels, videoModels });
}

export async function getCentralizedDynamicImageModels(): Promise<DynamicImageModel[]> {
  const imageModels = await getDynamicImageModels();
  return applyCentralDefinitionsToImageModels(
    imageModels,
    buildCentralModelDefinitions({ imageModels, videoModels: [] }),
  );
}

export async function getCentralizedDynamicVideoModels(): Promise<DynamicVideoModel[]> {
  const videoModels = await getDynamicVideoModels();
  return applyCentralDefinitionsToVideoModels(
    videoModels,
    buildCentralModelDefinitions({ imageModels: [], videoModels }),
  );
}

export function getModelDefinitionFromList(modelId: string, definitions: CentralModelDefinition[]): CentralModelDefinition | null {
  return definitions.find((definition) => definition.modelId === modelId || definition.sourceModelId === modelId) ?? null;
}

export function getModelDefinitionParameterOptions(definition: CentralModelDefinition | null, parameterId: string): string[] {
  if (!definition) return [];
  const param = definition.parameters.find((item) => item.id === parameterId);
  return Array.isArray(param?.options) ? param.options.map(String) : [];
}

function optionsFor(definition: CentralModelDefinition, parameterId: string): string[] {
  return getModelDefinitionParameterOptions(definition, parameterId);
}

function numberLimit(definition: CentralModelDefinition, parameterId: string, fallback: number): number {
  const param = definition.parameters.find((item) => item.id === parameterId);
  return Number.isFinite(param?.max) ? Number(param?.max) : fallback;
}

export function applyCentralDefinitionsToImageModels(models: DynamicImageModel[], definitions: CentralModelDefinition[]): DynamicImageModel[] {
  return models.map((model) => applyCentralDefinitionToImageModel(model, getModelDefinitionFromList(model.id, definitions)));
}

export function applyCentralDefinitionsToVideoModels(models: DynamicVideoModel[], definitions: CentralModelDefinition[]): DynamicVideoModel[] {
  return models.map((model) => applyCentralDefinitionToVideoModel(model, getModelDefinitionFromList(model.id, definitions)));
}

export function applyCentralDefinitionToImageModel(model: DynamicImageModel, definition: CentralModelDefinition | null): DynamicImageModel {
  if (!definition) return model;
  return {
    ...model,
    label: definition.displayName,
    upstreamModelId: definition.sourceModelId,
    aspectRatios: optionsFor(definition, "aspectRatio"),
    qualityParam: optionsFor(definition, "quality").length ? optionsFor(definition, "quality") : model.qualityParam,
    maxImages: numberLimit(definition, "numOutputs", model.maxImages),
    maxRefImages: definition.inputs.referenceImages.max,
    isActive: definition.status === "active",
  };
}

export function applyCentralDefinitionToVideoModel(model: DynamicVideoModel, definition: CentralModelDefinition | null): DynamicVideoModel {
  if (!definition) return model;
  return {
    ...model,
    name: definition.displayName,
    api_route: definition.sourceModelId,
    isActive: definition.status === "active",
    capabilities: {
      ...model.capabilities,
      aspect_ratios: optionsFor(definition, "aspectRatio"),
      durations: optionsFor(definition, "duration").map(Number).filter(Number.isFinite),
      resolutions: optionsFor(definition, "resolution"),
      max_reference_images: definition.inputs.referenceImages.max,
      max_reference_videos: definition.inputs.referenceVideos.max,
      max_reference_audios: definition.inputs.referenceAudios.max,
    },
  };
}

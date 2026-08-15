import { describe, expect, it } from "vitest";

import {
  applyCentralDefinitionsToImageModels,
  applyCentralDefinitionsToVideoModels,
  applyCentralDefinitionToImageModel,
  applyCentralDefinitionToVideoModel,
  buildCentralModelDefinitions,
  getModelDefinitionParameterOptions,
  type CentralModelDefinition,
} from "@/lib/model-definition-registry";
import type { DynamicImageModel, DynamicVideoModel } from "@/lib/dynamic-model-loader";

const imageModel: DynamicImageModel = {
  id: "gpt-image-2-text-to-image",
  label: "GPT Image 2",
  sublabel: "Official OpenAI text-to-image",
  badge: "NEW",
  group: "OpenAI Images",
  inputType: "text-to-image",
  aspectRatios: ["1:1", "16:9"],
  maxImages: 1,
  maxRefImages: 0,
  qualityParam: ["low", "medium"],
  creditCost: 2,
  isActive: true,
};

const videoModel: DynamicVideoModel = {
  id: "bytedance-seedance-v2-t2v",
  name: "Seedance 2.0",
  family: "seedance",
  family_label: "Seedance",
  family_color: "#10b981",
  badge: "NEW",
  description: "Seedance video",
  api_route: "bytedance/seedance-2.0/text-to-video",
  route_confirmed: true,
  isActive: true,
  creditCost: 5,
  capabilities: {
    requires_image: false,
    optional_image: true,
    requires_video: false,
    optional_video: false,
    has_end_frame: true,
    aspect_ratios: ["16:9", "9:16"],
    sizes: [],
    durations: [5, 10],
    resolutions: ["720p", "1080p"],
    quality_param: "resolution",
    max_reference_images: 4,
    max_reference_videos: 0,
    max_reference_video_total_seconds: 0,
    max_reference_audios: 0,
    max_reference_audio_total_seconds: 0,
    has_negative_prompt: false,
    has_seed: false,
    has_cfg_scale: false,
    has_sound: true,
    sound_param: "generate_audio",
    has_shot_type: false,
    has_multi_prompt: false,
    has_element_list: false,
    has_scene_control: false,
    has_orientation: false,
    has_omni_tabs: false,
  },
};

function withChangedParam(definition: CentralModelDefinition, parameterId: string, options: Array<string | number>): CentralModelDefinition {
  return {
    ...definition,
    parameters: definition.parameters.map((parameter) =>
      parameter.id === parameterId ? { ...parameter, options } : parameter,
    ),
  };
}

function withChangedParamMax(definition: CentralModelDefinition, parameterId: string, max: number): CentralModelDefinition {
  return {
    ...definition,
    parameters: definition.parameters.map((parameter) =>
      parameter.id === parameterId ? { ...parameter, max } : parameter,
    ),
  };
}

function withChangedVideoCapabilities(definition: CentralModelDefinition): CentralModelDefinition {
  const withResolution = withChangedParam(definition, "resolution", ["720p", "1080p", "4k"]);
  const withDuration = withChangedParam(withResolution, "duration", [5, 10, 15]);
  const withAspect = withChangedParam(withDuration, "aspectRatio", ["16:9", "9:16", "21:9"]);
  return {
    ...withAspect,
    displayName: "Seedance Central Updated",
    inputs: {
      ...withAspect.inputs,
      referenceImages: { supported: true, min: 0, max: 8, required: false },
    },
  };
}

describe("central model definition registry", () => {
  it("builds one central definition per model with pricing and routing references only", () => {
    const definitions = buildCentralModelDefinitions({ imageModels: [imageModel], videoModels: [videoModel] });

    expect(definitions).toHaveLength(2);
    expect(definitions[0]).toMatchObject({
      modelId: "gpt-image-2-text-to-image",
      displayName: "GPT Image 2",
      modality: "image",
      pricingRef: "gpt-image-2-text-to-image",
      routingRef: "gpt-image-2-text-to-image",
      definitionSource: "central",
    });
    expect(definitions[1]).toMatchObject({
      modelId: "bytedance-seedance-v2-t2v",
      sourceModelId: "bytedance/seedance-2.0/text-to-video",
      pricingRef: "bytedance/seedance-2.0/text-to-video",
      routingRef: "bytedance/seedance-2.0/text-to-video",
    });
  });

  it("propagates image model definition changes into the existing consumer shape", () => {
    const [definition] = buildCentralModelDefinitions({ imageModels: [imageModel], videoModels: [] });
    const changed = withChangedParam(
      { ...definition, displayName: "GPT Image 2 Pro", inputs: { ...definition.inputs, referenceImages: { supported: true, min: 0, max: 8, required: false } } },
      "quality",
      ["low", "medium", "high", "4K"],
    );

    const consumerModel = applyCentralDefinitionToImageModel(imageModel, changed);

    expect(consumerModel.label).toBe("GPT Image 2 Pro");
    expect(consumerModel.qualityParam).toEqual(["low", "medium", "high", "4K"]);
    expect(consumerModel.maxRefImages).toBe(8);
  });

  it("propagates video capabilities into Create Video's existing model shape", () => {
    const [definition] = buildCentralModelDefinitions({ imageModels: [], videoModels: [videoModel] });
    const changed = withChangedVideoCapabilities(definition);

    const consumerModel = applyCentralDefinitionToVideoModel(videoModel, changed);

    expect(consumerModel.name).toBe("Seedance Central Updated");
    expect(consumerModel.capabilities.resolutions).toEqual(["720p", "1080p", "4k"]);
    expect(consumerModel.capabilities.durations).toEqual([5, 10, 15]);
    expect(consumerModel.capabilities.aspect_ratios).toEqual(["16:9", "9:16", "21:9"]);
    expect(consumerModel.capabilities.max_reference_images).toBe(8);
  });

  it("keeps UI/runtime parity by resolving migrated consumers from the same central definition", () => {
    const [definition] = buildCentralModelDefinitions({ imageModels: [], videoModels: [videoModel] });
    const changed = withChangedVideoCapabilities(definition);
    const uiConsumerModels = applyCentralDefinitionsToVideoModels([videoModel], [changed]);
    const runtimeConsumerModels = applyCentralDefinitionsToVideoModels([videoModel], [changed]);

    expect(uiConsumerModels[0].name).toBe("Seedance Central Updated");
    expect(runtimeConsumerModels[0].name).toBe("Seedance Central Updated");
    expect(uiConsumerModels[0].capabilities.resolutions).toContain("4k");
    expect(runtimeConsumerModels[0].capabilities.resolutions).toContain("4k");
    expect(uiConsumerModels[0].capabilities.durations).toContain(15);
    expect(runtimeConsumerModels[0].capabilities.durations).toContain(15);
    expect(uiConsumerModels[0].capabilities.aspect_ratios).toContain("21:9");
    expect(runtimeConsumerModels[0].capabilities.aspect_ratios).toContain("21:9");
    expect(uiConsumerModels[0].capabilities.max_reference_images).toBe(8);
    expect(runtimeConsumerModels[0].capabilities.max_reference_images).toBe(8);
  });

  it("does not expose unsupported central options to migrated consumer shapes", () => {
    const [definition] = buildCentralModelDefinitions({ imageModels: [], videoModels: [videoModel] });
    const changed = withChangedParam(definition, "resolution", ["720p"]);
    const [consumerModel] = applyCentralDefinitionsToVideoModels([videoModel], [changed]);

    expect(getModelDefinitionParameterOptions(changed, "resolution")).toEqual(["720p"]);
    expect(consumerModel.capabilities.resolutions).toEqual(["720p"]);
    expect(consumerModel.capabilities.resolutions).not.toContain("4k");
  });

  it("propagates central image output, aspect, quality, and reference limits through batch helpers", () => {
    const [definition] = buildCentralModelDefinitions({ imageModels: [imageModel], videoModels: [] });
    const withQuality = withChangedParam(definition, "quality", ["low", "medium", "4K"]);
    const withAspect = withChangedParam(withQuality, "aspectRatio", ["1:1", "16:9", "21:9"]);
    const withOutputs = withChangedParamMax(withAspect, "numOutputs", 4);
    const changed = {
      ...withOutputs,
      displayName: "GPT Image Central Updated",
      inputs: {
        ...withOutputs.inputs,
        referenceImages: { supported: true, min: 0, max: 8, required: false },
      },
    };

    const [consumerModel] = applyCentralDefinitionsToImageModels([imageModel], [changed]);

    expect(consumerModel.label).toBe("GPT Image Central Updated");
    expect(consumerModel.qualityParam).toContain("4K");
    expect(consumerModel.aspectRatios).toContain("21:9");
    expect(consumerModel.maxImages).toBe(4);
    expect(consumerModel.maxRefImages).toBe(8);
  });
});

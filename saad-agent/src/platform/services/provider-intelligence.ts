export interface ModelMetadata {
  id: string;
  provider: "KIE" | "BytePlus" | "GoogleAI" | "OpenAI" | "WaveSpeed" | "Local";
  name: string;
  capabilities: Array<"image_edit" | "image_generation" | "video_generation" | "text" | "vision">;
  pricingPer1kTokens: number;
  bestPrompts: string[];
}

export class ProviderIntelligenceService {
  private static registry: ModelMetadata[] = [
    {
      id: "nano-banana",
      provider: "GoogleAI",
      name: "Nano Banana",
      capabilities: ["image_edit", "image_generation", "vision"],
      pricingPer1kTokens: 0.0015,
      bestPrompts: ["High resolution dark glass ui element", "Studio quality product rendering"],
    },
    {
      id: "veo-generator",
      provider: "BytePlus",
      name: "Veo Video Generator",
      capabilities: ["video_generation"],
      pricingPer1kTokens: 0.01,
      bestPrompts: ["Cinematic slow motion camera panning"],
    },
  ];

  static getModelMetadata(modelId: string): ModelMetadata | undefined {
    return this.registry.find((m) => m.id.toLowerCase() === modelId.toLowerCase());
  }

  static listAllModels(): ModelMetadata[] {
    return this.registry;
  }
}

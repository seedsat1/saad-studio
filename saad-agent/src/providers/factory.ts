import type { ModelProvider, ModelProviderConfig } from "./provider-interface.js";
import { LMStudioProvider } from "./lm-studio.js";
import { OllamaProvider } from "./ollama.js";

export function getProvider(type: string, config: ModelProviderConfig): ModelProvider {
  const normalizedType = String(type || "").trim().toLowerCase();
  switch (normalizedType) {
    case "lm-studio":
      return new LMStudioProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    default:
      throw new Error(`Unsupported or missing model provider type: ${type || "not configured"}`);
  }
}

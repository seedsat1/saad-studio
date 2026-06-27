import { CONFIG } from "./config.js";
import { getProvider } from "./providers/factory.js";
import type { ModelProvider } from "./providers/provider-interface.js";

export class LLMClient {
  private provider: ModelProvider;

  constructor() {
    const providerType = CONFIG.PROVIDER;
    const isLMStudio = providerType === "lm-studio";
    
    const config = {
      baseUrl: isLMStudio ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL,
      apiKey: isLMStudio ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY,
      modelName: CONFIG.MODEL_NAME,
      temperature: CONFIG.TEMPERATURE,
    };

    this.provider = getProvider(providerType, config);
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    return this.provider.chat(systemPrompt, userMessage);
  }

  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }
}

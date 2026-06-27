import { CONFIG } from "./config.js";
import { getProvider } from "./providers/factory.js";
export class LLMClient {
    provider;
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
    async chat(systemPrompt, userMessage) {
        return this.provider.chat(systemPrompt, userMessage);
    }
    async healthCheck() {
        return this.provider.healthCheck();
    }
}
//# sourceMappingURL=llm-client.js.map
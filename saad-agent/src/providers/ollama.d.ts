import type { ModelProvider, ModelProviderConfig } from "./provider-interface.js";
export declare class OllamaProvider implements ModelProvider {
    name: string;
    model: string;
    config: ModelProviderConfig;
    private client;
    constructor(config: ModelProviderConfig);
    chat(systemPrompt: string, userMessage: string): Promise<string>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=ollama.d.ts.map
import type { ModelProvider, ModelProviderConfig } from "./provider-interface.js";
export declare class LMStudioProvider implements ModelProvider {
    name: string;
    model: string;
    config: ModelProviderConfig;
    private client;
    constructor(config: ModelProviderConfig);
    chat(systemPrompt: string, userMessage: string): Promise<string>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=lm-studio.d.ts.map
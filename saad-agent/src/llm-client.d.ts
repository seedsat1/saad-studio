export declare class LLMClient {
    private provider;
    constructor();
    chat(systemPrompt: string, userMessage: string): Promise<string>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=llm-client.d.ts.map
import OpenAI from "openai";
export class OllamaProvider {
    name = "Ollama";
    model;
    config;
    client;
    constructor(config) {
        this.config = config;
        this.model = config.modelName;
        this.client = new OpenAI({
            baseURL: config.baseUrl,
            apiKey: config.apiKey || "ollama",
        });
    }
    async chat(systemPrompt, userMessage) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: this.config.temperature ?? 0.1,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });
        return response.choices[0]?.message?.content || "";
    }
    async healthCheck() {
        try {
            await this.client.models.list();
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=ollama.js.map
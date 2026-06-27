import OpenAI from "openai";
import type { ModelProvider, ModelProviderConfig } from "./provider-interface.js";

export class OllamaProvider implements ModelProvider {
  name = "Ollama";
  model: string;
  config: ModelProviderConfig;
  private client: OpenAI;

  constructor(config: ModelProviderConfig) {
    this.config = config;
    this.model = config.modelName;
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey || "ollama",
    });
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
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

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

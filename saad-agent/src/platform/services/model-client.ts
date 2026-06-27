import { CONFIG } from "../../config.js";

export class ModelClient {
  static async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    modelName: string
  ): Promise<string> {
    const isLms = CONFIG.PROVIDER === "lm-studio";
    const baseUrl = isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL;
    const apiKey = isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: CONFIG.TEMPERATURE,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Model request failed: HTTP ${response.status} - ${response.statusText}`
        );
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err: any) {
      throw new Error(`Failed to contact model provider: ${err.message}`);
    }
  }
}

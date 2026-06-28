import { CONFIG } from "../../config.js";
import type { ModelRoleSettings, ProviderSettings } from "../../production/settings-manager.js";

export interface ModelRuntimeOptions {
  provider?: ProviderSettings;
  model?: ModelRoleSettings;
  apiKey?: string;
}

export class ModelClient {
  private static async fetchWithRuntime(url: string, init: RequestInit, runtime?: ModelRuntimeOptions): Promise<Response> {
    const retryCount = runtime?.model?.retryCount ?? 0;
    const timeoutMs = runtime?.model?.timeoutMs ?? 120000;
    let lastError: any;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } catch (err) {
        lastError = err;
        if (attempt >= retryCount) break;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError;
  }

  static async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    modelName: string,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    const isLms = CONFIG.PROVIDER === "lm-studio";
    const baseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
    const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
    const maxTokens = runtime?.model?.maxTokens;

    try {
      const body: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: runtime?.model?.streaming ?? false,
        response_format: { type: "json_object" },
      };
      let response = await this.fetchWithRuntime(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }, runtime);

      if (response.status === 400) {
        delete body.response_format;
        response = await this.fetchWithRuntime(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        }, runtime);
      }

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

  static async chatCompletionMultimodal(
    systemPrompt: string,
    userPrompt: string,
    modelName: string,
    imageUrl: string,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    const isLms = CONFIG.PROVIDER === "lm-studio";
    const baseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
    const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
    const maxTokens = runtime?.model?.maxTokens;

    try {
      const body: any = {
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: runtime?.model?.streaming ?? false,
        response_format: { type: "json_object" },
      };
      let response = await this.fetchWithRuntime(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }, runtime);

      if (response.status === 400) {
        delete body.response_format;
        response = await this.fetchWithRuntime(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        }, runtime);
      }

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

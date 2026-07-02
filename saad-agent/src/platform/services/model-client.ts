import { CONFIG } from "../../config.js";
import type { ModelRoleSettings, ProviderSettings } from "../../production/settings-manager.js";

export interface ModelRuntimeOptions {
  provider?: ProviderSettings;
  model?: ModelRoleSettings;
  apiKey?: string;
  signal?: AbortSignal | undefined;
}

interface ChatEndpointCandidate {
  url: string;
  responseFormat: boolean;
  lmStudioDeveloperApi?: boolean;
}

export class ModelClient {
  private static readonly MAX_INTERACTIVE_TIMEOUT_MS = 20000;

  private static normalizeHost(baseUrl: string): string {
    let normalized = baseUrl.trim().replace(/\/+$/, "");
    normalized = normalized.replace("http://localhost:", "http://127.0.0.1:");
    return normalized;
  }

  private static normalizeOpenAIBaseUrl(baseUrl: string): string {
    let normalized = this.normalizeHost(baseUrl);
    if (/^http:\/\/127\.0\.0\.1:1234$/i.test(normalized)) {
      normalized = "http://127.0.0.1:1234/v1";
    }
    if (!/\/v1$/i.test(normalized) && /127\.0\.0\.1:1234/i.test(normalized)) {
      normalized = `${normalized}/v1`;
    }
    return normalized;
  }

  private static endpointOrigin(baseUrl: string): string {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return baseUrl.replace(/\/+$/, "");
    }
  }

  private static isLmStudioRuntime(runtime: ModelRuntimeOptions | undefined, baseUrl: string): boolean {
    const providerId = runtime?.provider?.id?.toLowerCase() || "";
    const providerName = runtime?.provider?.name?.toLowerCase() || "";
    return providerId === "lm-studio"
      || providerName.includes("lm studio")
      || /127\.0\.0\.1:(1234|32768)/i.test(baseUrl);
  }

  private static buildChatEndpoints(baseUrl: string, isLmStudio: boolean): ChatEndpointCandidate[] {
    const normalized = this.normalizeHost(baseUrl);
    const openAIBase = this.normalizeOpenAIBaseUrl(baseUrl);
    const origin = this.endpointOrigin(normalized);
    const candidates: ChatEndpointCandidate[] = [];
    const add = (url: string, responseFormat: boolean, lmStudioDeveloperApi = false) => {
      if (!candidates.some(candidate => candidate.url === url)) candidates.push({ url, responseFormat, lmStudioDeveloperApi });
    };

    if (isLmStudio) {
      add(`${origin}/api/v1/chat/completions`, false);
      add(`${origin}/api/v1/chat`, false, true);
      if (/127\.0\.0\.1:1234/i.test(origin)) {
        add(`${origin}/v1/chat/completions`, false);
      }
      return candidates;
    }

    add(`${openAIBase}/chat/completions`, !isLmStudio);
    add(`${normalized}/chat/completions`, !isLmStudio);
    return candidates;
  }

  private static extractText(payload: any): string {
    const content = payload?.choices?.[0]?.message?.content
      ?? payload?.choices?.[0]?.text
      ?? payload?.output?.[0]?.content
      ?? payload?.message?.content
      ?? payload?.message
      ?? payload?.content
      ?? payload?.response
      ?? payload?.text;
    if (Array.isArray(content)) {
      return content
        .map((part) => typeof part === "string" ? part : part?.text || part?.content || "")
        .filter(Boolean)
        .join("\n")
        .trim();
    }
    return typeof content === "string" ? content.trim() : "";
  }

  private static async readJsonOrText(response: Response): Promise<any> {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  }

  private static async fetchWithRuntime(url: string, init: RequestInit, runtime?: ModelRuntimeOptions): Promise<Response> {
    const retryCount = Math.min(runtime?.model?.retryCount ?? 0, 1);
    const configuredTimeoutMs = runtime?.model?.timeoutMs ?? this.MAX_INTERACTIVE_TIMEOUT_MS;
    const timeoutMs = Math.min(Math.max(configuredTimeoutMs, 1000), this.MAX_INTERACTIVE_TIMEOUT_MS);
    let lastError: any;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      const onAbort = () => controller.abort();
      if (runtime?.signal) {
        if (runtime.signal.aborted) {
          throw new DOMException("The user aborted a request.", "AbortError");
        }
        runtime.signal.addEventListener("abort", onAbort);
      }

      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          lastError = new Error(`Model provider request timed out after ${timeoutMs}ms at ${url}`);
        } else {
          lastError = err;
        }
        if (attempt >= retryCount) break;
      } finally {
        clearTimeout(timeout);
        if (runtime?.signal) {
          runtime.signal.removeEventListener("abort", onAbort);
        }
      }
    }
    throw lastError;
  }

  private static async postChatCandidate(
    candidate: ChatEndpointCandidate,
    body: any,
    headers: Record<string, string>,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    const requestBody = candidate.lmStudioDeveloperApi
      ? {
          model: body.model,
          input: body.messages
            .map((message: any) => {
              const content = Array.isArray(message.content)
                ? message.content.map((part: any) => part.text || part.image_url?.url || "").filter(Boolean).join("\n")
                : message.content;
              return `${message.role}: ${content}`;
            })
            .join("\n\n"),
          temperature: body.temperature,
          stream: false,
        }
      : { ...body };
    if (candidate.responseFormat) requestBody.response_format = { type: "json_object" };

    let response = await this.fetchWithRuntime(candidate.url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }, runtime);

    if (response.status === 400 && requestBody.response_format) {
      delete requestBody.response_format;
      response = await this.fetchWithRuntime(candidate.url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }, runtime);
    }

    const payload = await this.readJsonOrText(response);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${JSON.stringify(payload).slice(0, 240)}`);
    }

    const content = this.extractText(payload);
    if (!content) {
      throw new Error(`Provider returned no message content from ${candidate.url}: ${JSON.stringify(payload).slice(0, 240)}`);
    }
    return content;
  }

  static async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    modelName: string,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    const isLms = CONFIG.PROVIDER === "lm-studio";
    const rawBaseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
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
        // Streaming requires SSE parsing; use non-stream responses for the current chat renderer.
        stream: false,
      };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      let lastError: any;
      for (const candidate of this.buildChatEndpoints(rawBaseUrl, isLmStudio)) {
        try {
          return await this.postChatCandidate(candidate, body, headers, runtime);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error("No provider endpoint candidates were available.");
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
    const rawBaseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
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
        // Streaming requires SSE parsing; use non-stream responses for the current chat renderer.
        stream: false,
      };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      let lastError: any;
      for (const candidate of this.buildChatEndpoints(rawBaseUrl, isLmStudio)) {
        try {
          return await this.postChatCandidate(candidate, body, headers, runtime);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error("No provider endpoint candidates were available.");
    } catch (err: any) {
      throw new Error(`Failed to contact model provider: ${err.message}`);
    }
  }
}

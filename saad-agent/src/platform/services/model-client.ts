import { CONFIG } from "../../config.js";
import type { ModelRoleSettings, ProviderSettings } from "../../production/settings-manager.js";
import { LocalModelRuntime } from "./local-model-runtime.js";

export interface ModelRuntimeOptions {
  provider?: ProviderSettings;
  model?: ModelRoleSettings;
  apiKey?: string;
  signal?: AbortSignal | undefined;
  requestTimeoutMs?: number | undefined;
  retryCountOverride?: number | undefined;
}

interface ChatEndpointCandidate {
  url: string;
  responseFormat: boolean;
  lmStudioDeveloperApi?: boolean;
}

export class ModelClient {
  private static readonly MAX_INTERACTIVE_TIMEOUT_MS = 1800000;

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

  private static getRuntimeContextWindow(runtime?: ModelRuntimeOptions): number {
    return runtime?.provider?.localRuntime?.contextWindow
      || runtime?.model?.detectedContextWindow
      || 8192;
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(String(text || "").length / 4);
  }

  private static trimToTokenBudget(text: string, tokenBudget: number): string {
    if (tokenBudget <= 0) return "";
    if (this.estimateTokens(text) <= tokenBudget) return text;
    const maxChars = Math.max(256, tokenBudget * 4);
    const headChars = Math.floor(maxChars * 0.25);
    const tailChars = maxChars - headChars;
    const head = text.slice(0, headChars);
    const tail = text.slice(-tailChars);
    return `${head}\n\n[Saad Agent compressed local-model context: middle content omitted to fit the configured context window.]\n\n${tail}`;
  }

  private static fitPromptToRuntime(
    systemPrompt: string,
    userPrompt: string,
    runtime?: ModelRuntimeOptions
  ): { systemPrompt: string; userPrompt: string } {
    const contextWindow = Math.max(1024, this.getRuntimeContextWindow(runtime));
    const outputReserve = Math.min(Math.max(runtime?.model?.maxTokens || 1024, 512), Math.floor(contextWindow * 0.45));
    const inputBudget = Math.max(512, contextWindow - outputReserve - 384);
    const systemBudget = Math.min(Math.max(Math.floor(inputBudget * 0.25), 256), 2048);
    const fittedSystem = this.trimToTokenBudget(systemPrompt, systemBudget);
    const remaining = Math.max(256, inputBudget - this.estimateTokens(fittedSystem));
    const fittedUser = this.trimToTokenBudget(userPrompt, remaining);
    return { systemPrompt: fittedSystem, userPrompt: fittedUser };
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

  private static isGeminiRuntime(runtime: ModelRuntimeOptions | undefined): boolean {
    const providerId = runtime?.provider?.id?.toLowerCase() || "";
    const providerName = runtime?.provider?.name?.toLowerCase() || "";
    return providerId === "gemini" || providerName.includes("gemini");
  }

  private static normalizeGeminiBaseUrl(baseUrl: string): string {
    const normalized = this.normalizeHost(baseUrl || "https://generativelanguage.googleapis.com/v1beta");
    return normalized || "https://generativelanguage.googleapis.com/v1beta";
  }

  private static buildGeminiGenerateUrl(baseUrl: string, modelName: string, apiKey: string): string {
    const base = this.normalizeGeminiBaseUrl(baseUrl);
    const modelId = String(modelName || "gemini-2.0-flash").replace(/^models\//i, "");
    const url = new URL(`${base}/models/${encodeURIComponent(modelId)}:generateContent`);
    url.searchParams.set("key", apiKey);
    return url.toString();
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
    const geminiParts = payload?.candidates?.[0]?.content?.parts;
    if (Array.isArray(geminiParts)) {
      const geminiText = geminiParts
        .map((part: any) => typeof part?.text === "string" ? part.text : "")
        .filter(Boolean)
        .join("\n")
        .trim();
      if (geminiText) return geminiText;
    }

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
    const retryCount = Math.min(runtime?.retryCountOverride ?? runtime?.model?.retryCount ?? 0, 1);
    const configuredTimeoutMs = runtime?.requestTimeoutMs ?? runtime?.model?.timeoutMs ?? this.MAX_INTERACTIVE_TIMEOUT_MS;
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

  private static async postGeminiGenerateContent(
    systemPrompt: string,
    userParts: any[],
    modelName: string,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    const rawBaseUrl = runtime?.provider?.endpointUrl || "https://generativelanguage.googleapis.com/v1beta";
    const apiKey = runtime?.apiKey;
    if (!apiKey) {
      throw new Error("Gemini API key is required for Gemini provider requests.");
    }

    const generationConfig: any = {
      temperature: runtime?.model?.temperature ?? CONFIG.TEMPERATURE,
    };
    const maxTokens = runtime?.model?.maxTokens;
    if (typeof maxTokens === "number" && maxTokens > 0) {
      generationConfig.maxOutputTokens = maxTokens;
    }

    const body: any = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig,
    };

    const url = this.buildGeminiGenerateUrl(rawBaseUrl, modelName, apiKey);
    const response = await this.fetchWithRuntime(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, runtime);

    const payload = await this.readJsonOrText(response);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${JSON.stringify(payload).slice(0, 240)}`);
    }

    const content = this.extractText(payload);
    if (!content) {
      const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason;
      if (blockReason) {
        throw new Error(`Gemini returned no message content because the provider blocked the submitted prompt context (${blockReason}).`);
      }
      throw new Error(`Gemini returned no message content: ${JSON.stringify(payload).slice(0, 240)}`);
    }
    return content;
  }

  private static parseDataUrlImage(imageUrl: string): { mimeType: string; data: string } | null {
    const match = String(imageUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const data = match[2];
    if (!mimeType || !data) return null;
    return { mimeType, data };
  }

  static async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    modelName: string,
    runtime?: ModelRuntimeOptions
  ): Promise<string> {
    if (this.isGeminiRuntime(runtime)) {
      try {
        return await this.postGeminiGenerateContent(systemPrompt, [{ text: userPrompt }], modelName, runtime);
      } catch (err: any) {
        throw new Error(`Failed to contact Gemini provider: ${err.message}`);
      }
    }

    const isLms = CONFIG.PROVIDER === "lm-studio";
    const rawBaseUrl = runtime?.provider && LocalModelRuntime.isDirectLocalProvider(runtime.provider)
      ? await LocalModelRuntime.ensureReady(runtime.provider)
      : runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
    const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
    const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
    const maxTokens = runtime?.model?.maxTokens;

    try {
      const fitted = this.fitPromptToRuntime(systemPrompt, userPrompt, runtime);
      const body: any = {
        model: modelName,
        messages: [
          { role: "system", content: fitted.systemPrompt },
          { role: "user", content: fitted.userPrompt },
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
    if (this.isGeminiRuntime(runtime)) {
      try {
        const image = this.parseDataUrlImage(imageUrl);
        if (!image) {
          throw new Error("Gemini multimodal currently supports data URL images only.");
        }
        return await this.postGeminiGenerateContent(systemPrompt, [
          { text: userPrompt },
          { inline_data: { mime_type: image.mimeType, data: image.data } },
        ], modelName, runtime);
      } catch (err: any) {
        throw new Error(`Failed to contact Gemini provider: ${err.message}`);
      }
    }

    const isLms = CONFIG.PROVIDER === "lm-studio";
    const rawBaseUrl = runtime?.provider && LocalModelRuntime.isDirectLocalProvider(runtime.provider)
      ? await LocalModelRuntime.ensureReady(runtime.provider)
      : runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
    const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
    const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
    const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
    const maxTokens = runtime?.model?.maxTokens;

    try {
      const fitted = this.fitPromptToRuntime(systemPrompt, userPrompt, runtime);
      const body: any = {
        model: modelName,
        messages: [
          { role: "system", content: fitted.systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: fitted.userPrompt },
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

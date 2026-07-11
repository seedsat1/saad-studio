import { CONFIG } from "../../config.js";
export class ModelClient {
    static MAX_INTERACTIVE_TIMEOUT_MS = 1800000;
    static normalizeHost(baseUrl) {
        let normalized = baseUrl.trim().replace(/\/+$/, "");
        normalized = normalized.replace("http://localhost:", "http://127.0.0.1:");
        return normalized;
    }
    static normalizeOpenAIBaseUrl(baseUrl) {
        let normalized = this.normalizeHost(baseUrl);
        if (/^http:\/\/127\.0\.0\.1:1234$/i.test(normalized)) {
            normalized = "http://127.0.0.1:1234/v1";
        }
        if (!/\/v1$/i.test(normalized) && /127\.0\.0\.1:1234/i.test(normalized)) {
            normalized = `${normalized}/v1`;
        }
        return normalized;
    }
    static endpointOrigin(baseUrl) {
        try {
            return new URL(baseUrl).origin;
        }
        catch {
            return baseUrl.replace(/\/+$/, "");
        }
    }
    static isLmStudioRuntime(runtime, baseUrl) {
        const providerId = runtime?.provider?.id?.toLowerCase() || "";
        const providerName = runtime?.provider?.name?.toLowerCase() || "";
        return providerId === "lm-studio"
            || providerName.includes("lm studio")
            || /127\.0\.0\.1:(1234|32768)/i.test(baseUrl);
    }
    static isGeminiRuntime(runtime) {
        const providerId = runtime?.provider?.id?.toLowerCase() || "";
        const providerName = runtime?.provider?.name?.toLowerCase() || "";
        return providerId === "gemini" || providerName.includes("gemini");
    }
    static normalizeGeminiBaseUrl(baseUrl) {
        const normalized = this.normalizeHost(baseUrl || "https://generativelanguage.googleapis.com/v1beta");
        return normalized || "https://generativelanguage.googleapis.com/v1beta";
    }
    static buildGeminiGenerateUrl(baseUrl, modelName, apiKey) {
        const base = this.normalizeGeminiBaseUrl(baseUrl);
        const modelId = String(modelName || "gemini-2.0-flash").replace(/^models\//i, "");
        const url = new URL(`${base}/models/${encodeURIComponent(modelId)}:generateContent`);
        url.searchParams.set("key", apiKey);
        return url.toString();
    }
    static buildChatEndpoints(baseUrl, isLmStudio) {
        const normalized = this.normalizeHost(baseUrl);
        const openAIBase = this.normalizeOpenAIBaseUrl(baseUrl);
        const origin = this.endpointOrigin(normalized);
        const candidates = [];
        const add = (url, responseFormat, lmStudioDeveloperApi = false) => {
            if (!candidates.some(candidate => candidate.url === url))
                candidates.push({ url, responseFormat, lmStudioDeveloperApi });
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
    static extractText(payload) {
        const geminiParts = payload?.candidates?.[0]?.content?.parts;
        if (Array.isArray(geminiParts)) {
            const geminiText = geminiParts
                .map((part) => typeof part?.text === "string" ? part.text : "")
                .filter(Boolean)
                .join("\n")
                .trim();
            if (geminiText)
                return geminiText;
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
    static async readJsonOrText(response) {
        const text = await response.text();
        if (!text.trim())
            return {};
        try {
            return JSON.parse(text);
        }
        catch {
            return { text };
        }
    }
    static async fetchWithRuntime(url, init, runtime) {
        const retryCount = Math.min(runtime?.retryCountOverride ?? runtime?.model?.retryCount ?? 0, 1);
        const configuredTimeoutMs = runtime?.requestTimeoutMs ?? runtime?.model?.timeoutMs ?? this.MAX_INTERACTIVE_TIMEOUT_MS;
        const timeoutMs = Math.min(Math.max(configuredTimeoutMs, 1000), this.MAX_INTERACTIVE_TIMEOUT_MS);
        let lastError;
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
            }
            catch (err) {
                if (err?.name === "AbortError") {
                    lastError = new Error(`Model provider request timed out after ${timeoutMs}ms at ${url}`);
                }
                else {
                    lastError = err;
                }
                if (attempt >= retryCount)
                    break;
            }
            finally {
                clearTimeout(timeout);
                if (runtime?.signal) {
                    runtime.signal.removeEventListener("abort", onAbort);
                }
            }
        }
        throw lastError;
    }
    static async postChatCandidate(candidate, body, headers, runtime) {
        const requestBody = candidate.lmStudioDeveloperApi
            ? {
                model: body.model,
                input: body.messages
                    .map((message) => {
                    const content = Array.isArray(message.content)
                        ? message.content.map((part) => part.text || part.image_url?.url || "").filter(Boolean).join("\n")
                        : message.content;
                    return `${message.role}: ${content}`;
                })
                    .join("\n\n"),
                temperature: body.temperature,
                stream: false,
            }
            : { ...body };
        if (candidate.responseFormat)
            requestBody.response_format = { type: "json_object" };
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
    static async postGeminiGenerateContent(systemPrompt, userParts, modelName, runtime) {
        const rawBaseUrl = runtime?.provider?.endpointUrl || "https://generativelanguage.googleapis.com/v1beta";
        const apiKey = runtime?.apiKey;
        if (!apiKey) {
            throw new Error("Gemini API key is required for Gemini provider requests.");
        }
        const generationConfig = {
            temperature: runtime?.model?.temperature ?? CONFIG.TEMPERATURE,
        };
        const maxTokens = runtime?.model?.maxTokens;
        if (typeof maxTokens === "number" && maxTokens > 0) {
            generationConfig.maxOutputTokens = maxTokens;
        }
        const body = {
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
            throw new Error(`Gemini returned no message content: ${JSON.stringify(payload).slice(0, 240)}`);
        }
        return content;
    }
    static parseDataUrlImage(imageUrl) {
        const match = String(imageUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
        if (!match)
            return null;
        const mimeType = match[1];
        const data = match[2];
        if (!mimeType || !data)
            return null;
        return { mimeType, data };
    }
    static async chatCompletion(systemPrompt, userPrompt, modelName, runtime) {
        if (this.isGeminiRuntime(runtime)) {
            try {
                return await this.postGeminiGenerateContent(systemPrompt, [{ text: userPrompt }], modelName, runtime);
            }
            catch (err) {
                throw new Error(`Failed to contact Gemini provider: ${err.message}`);
            }
        }
        const isLms = CONFIG.PROVIDER === "lm-studio";
        const rawBaseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
        const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
        const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
        const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
        const maxTokens = runtime?.model?.maxTokens;
        try {
            const body = {
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
            const headers = { "Content-Type": "application/json" };
            if (apiKey)
                headers.Authorization = `Bearer ${apiKey}`;
            let lastError;
            for (const candidate of this.buildChatEndpoints(rawBaseUrl, isLmStudio)) {
                try {
                    return await this.postChatCandidate(candidate, body, headers, runtime);
                }
                catch (err) {
                    lastError = err;
                }
            }
            throw lastError || new Error("No provider endpoint candidates were available.");
        }
        catch (err) {
            throw new Error(`Failed to contact model provider: ${err.message}`);
        }
    }
    static async chatCompletionMultimodal(systemPrompt, userPrompt, modelName, imageUrl, runtime) {
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
            }
            catch (err) {
                throw new Error(`Failed to contact Gemini provider: ${err.message}`);
            }
        }
        const isLms = CONFIG.PROVIDER === "lm-studio";
        const rawBaseUrl = runtime?.provider?.endpointUrl || (isLms ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL);
        const isLmStudio = this.isLmStudioRuntime(runtime, rawBaseUrl);
        const apiKey = runtime?.apiKey || (isLms ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY);
        const temperature = runtime?.model?.temperature ?? CONFIG.TEMPERATURE;
        const maxTokens = runtime?.model?.maxTokens;
        try {
            const body = {
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
            const headers = { "Content-Type": "application/json" };
            if (apiKey)
                headers.Authorization = `Bearer ${apiKey}`;
            let lastError;
            for (const candidate of this.buildChatEndpoints(rawBaseUrl, isLmStudio)) {
                try {
                    return await this.postChatCandidate(candidate, body, headers, runtime);
                }
                catch (err) {
                    lastError = err;
                }
            }
            throw lastError || new Error("No provider endpoint candidates were available.");
        }
        catch (err) {
            throw new Error(`Failed to contact model provider: ${err.message}`);
        }
    }
}
//# sourceMappingURL=model-client.js.map
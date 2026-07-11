import * as fs from "fs/promises";
import * as path from "path";
import { EngineeringMemory } from "./engineering-memory.js";
import { KnowledgeIngestionService } from "./knowledge-ingestion.js";
import { ModelClient } from "./model-client.js";
import { ReasoningEngine } from "./reasoning-engine.js";
import { SettingsManager } from "../../production/settings-manager.js";

export interface ModelExpertiseExtractionResult {
  saved: boolean;
  topic: string;
  provider?: ModelExpertiseProviderProfile;
  modelAttempted?: boolean;
  trainingPath?: string;
  chunksCreated?: number;
  error?: string;
}

export interface ModelExpertiseExtractionBatchResult {
  topics: string[];
  provider: ModelExpertiseProviderProfile;
  results: ModelExpertiseExtractionResult[];
  savedCount: number;
  failedCount: number;
  modelAttempted: boolean;
}

export type ModelExpertiseProviderId = "local" | "gemini" | "openai";

export interface ModelExpertiseProviderProfile {
  id: ModelExpertiseProviderId;
  label: string;
  sourceTag: string;
  configured: boolean;
  unavailableReason?: string;
}

export class ModelExpertiseExtractionService {
  static isExtractionRequest(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = String(prompt || "").toLowerCase();
    return /\b(extract|distill|capture|learn)\b.{0,80}\b(model|local model|lm studio|ollama|expertise|knowledge)\b/i.test(lower)
      || /(?:استخرج|استخلص|لخص|خذ|اسال|اسأل).{0,80}(?:خبره|خبرة|معرفه|معرفة).{0,80}(?:الموديل|النموذج|المحلي|جيمناي|جمنياي|جمني|gemini)/.test(normalized)
      || /(?:استخرج|استخلص|لخص|خذ).{0,80}(?:خبره|خبرة|معرفه|معرفة).{0,80}(?:الموديل|النموذج|المحلي)/.test(normalized)
      || /(?:اسال|اسأل).{0,80}(?:الموديل|النموذج).{0,80}(?:وخزن|واحفظ|كمعرفه|كمعرفة|كتدريب)/.test(normalized);
  }

  static resolveRequestedProvider(prompt: string): ModelExpertiseProviderProfile {
    const lower = String(prompt || "").toLowerCase();
    const normalized = this.normalizeArabic(prompt);
    const asksGemini = /\b(from|using|ask|source)\s+(gemini|google gemini)\b/i.test(lower)
      || /\b(gemini|google gemini)\b.{0,30}\b(expertise|knowledge)\b/i.test(lower)
      || /(?:من|اسال|اسأل|بواسطه|بواسطة).{0,30}(?:gemini|جيمناي|جمنياي|جمني)/.test(normalized)
      || /(?:Ù…Ù†|Ø§Ø³Ø§Ù„|Ø§Ø³Ø£Ù„|Ø¨ÙˆØ§Ø³Ø·Ø©).{0,30}(?:gemini|Ø¬ÙŠÙ…Ù†Ø§ÙŠ|Ø¬Ù…Ù†Ø§ÙŠ|Ø¬ÙŠÙ…Ù†ÙŠ)/.test(normalized);
    if (asksGemini) {
      return {
        id: "gemini",
        label: "Gemini",
        sourceTag: "gemini-model",
        configured: false,
        unavailableReason: "Gemini expertise extraction is not connected/configured yet. No card was generated or saved."
      };
    }

    const asksOpenAi = /\b(from|using|ask|source)\s+(chatgpt|openai|gpt)\b/i.test(lower)
      || /\b(chatgpt|openai|gpt)\b.{0,30}\b(expertise|knowledge)\b/i.test(lower)
      || /(?:Ù…Ù†|Ø§Ø³Ø§Ù„|Ø§Ø³Ø£Ù„|Ø¨ÙˆØ§Ø³Ø·Ø©).{0,30}(?:chatgpt|openai|gpt|Ø´Ø§Øª Ø¬ÙŠ Ø¨ÙŠ ØªÙŠ|Ø¬ÙŠ Ø¨ÙŠ ØªÙŠ)/.test(normalized);
    if (asksOpenAi) {
      return {
        id: "openai",
        label: "ChatGPT/OpenAI",
        sourceTag: "openai-model",
        configured: false,
        unavailableReason: "ChatGPT/OpenAI expertise extraction is not connected/configured yet. No card was generated or saved."
      };
    }

    return {
      id: "local",
      label: "Local active model",
      sourceTag: "local-model",
      configured: true
    };
  }

  static extractTopics(prompt: string): string[] {
    const raw = String(prompt || "").replace(/\r/g, "\n");
    const afterColon = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
    const lines = afterColon
      .split(/\n|;|،/)
      .map((part) => this.extractTopic(part))
      .filter((part) => part.length >= 3 && part !== "general local model expertise");
    const unique = Array.from(new Set(lines));
    if (unique.length > 1) {
      return unique.slice(0, 8);
    }
    return [this.extractTopic(prompt)];
  }

  static async extractBatchFromLocalModel(params: {
    workspacePath: string;
    prompt: string;
    signal?: AbortSignal | undefined;
  }): Promise<ModelExpertiseExtractionBatchResult> {
    const topics = this.extractTopics(params.prompt);
    const results: ModelExpertiseExtractionResult[] = [];
    for (const topic of topics) {
      results.push(await this.extractFromLocalModel({
        workspacePath: params.workspacePath,
        prompt: topic,
        signal: params.signal
      }));
    }
    return {
      topics,
      provider: this.resolveRequestedProvider("local model"),
      results,
      savedCount: results.filter((result) => result.saved).length,
      failedCount: results.filter((result) => !result.saved).length,
      modelAttempted: true
    };
  }

  static async extractBatchFromRequestedProvider(params: {
    workspacePath: string;
    prompt: string;
    signal?: AbortSignal | undefined;
  }): Promise<ModelExpertiseExtractionBatchResult> {
    const provider = await this.resolveRequestedProviderForRuntime(params.prompt);
    const topics = this.extractTopics(params.prompt);
    if (provider.id === "local") {
      const batch = await this.extractBatchFromLocalModel(params);
      return { ...batch, provider };
    }
    if (provider.id === "gemini" && provider.configured) {
      const results: ModelExpertiseExtractionResult[] = [];
      for (const topic of topics) {
        results.push(await this.extractFromGemini({
          workspacePath: params.workspacePath,
          prompt: topic,
          provider,
          signal: params.signal
        }));
      }
      return {
        topics,
        provider,
        results,
        savedCount: results.filter((result) => result.saved).length,
        failedCount: results.filter((result) => !result.saved).length,
        modelAttempted: true
      };
    }
    const results = topics.map((topic) => this.createUnavailableProviderResult(topic, provider));
    return {
      topics,
      provider,
      results,
      savedCount: 0,
      failedCount: results.length,
      modelAttempted: false
    };
  }

  static extractTopic(prompt: string): string {
    const cleaned = String(prompt || "")
      .replace(/^\s*(?:for|about|on)\s*:\s*/i, " ")
      .replace(/\b(extract|distill|capture|learn)\b/gi, " ")
      .replace(/\b(local model|google gemini|chatgpt|openai|gemini|gpt|model|lm studio|ollama|expertise|knowledge|about|from|using|ask|source|for|on|and save|save it)\b/gi, " ")
      .replace(/(?:استخرج|استخلص|لخص|خذ|اسال|اسأل|خبره|خبرة|معرفه|معرفة|الموديل|النموذج|المحلي|جيمناي|جمنياي|جمني|وخزن|واحفظ|كمعرفه|كمعرفة|كتدريب|عن|حول|من)/g, " ")
      .replace(/^\s*:\s*/, " ")
      .replace(/\b(save it|and save|save)\b/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/\bit$/i, "")
      .trim();
    return cleaned || "general local model expertise";
  }

  static async extractFromLocalModel(params: {
    workspacePath: string;
    prompt: string;
    signal?: AbortSignal | undefined;
  }): Promise<ModelExpertiseExtractionResult> {
    const topic = this.extractTopic(params.prompt);
    const provider = this.resolveRequestedProvider("local model");
    const { systemPrompt, userPrompt } = this.buildExpertisePrompts(topic, "Local active model");

    let responseText = "";
    try {
      const response = await ReasoningEngine.requestCompletion({
        role: "Coding",
        systemPrompt,
        userPrompt,
        signal: params.signal,
        requestTimeoutMs: 1800000,
        retryCountOverride: 0
      });
      responseText = EngineeringMemory.scrubSecrets(response.rawResponse || "").trim();
    } catch (err: any) {
      return {
        saved: false,
        topic,
        provider,
        modelAttempted: true,
        error: err?.message || "Local model expertise extraction failed."
      };
    }

    if (!responseText || responseText.length < 120) {
      return {
        saved: false,
        topic,
        provider,
        modelAttempted: true,
        error: "Local model returned an empty or too-short expertise card. Nothing was saved."
      };
    }

    return this.saveExpertiseCard({
      workspacePath: params.workspacePath,
      topic,
      provider,
      responseText,
      source: "local-active-model",
      storageNote: "This card was generated by the currently configured local model."
    });
  }

  static async extractFromGemini(params: {
    workspacePath: string;
    prompt: string;
    provider: ModelExpertiseProviderProfile;
    signal?: AbortSignal | undefined;
  }): Promise<ModelExpertiseExtractionResult> {
    const topic = this.extractTopic(params.prompt);
    let runtime: Awaited<ReturnType<typeof this.getGeminiRuntimeForExtraction>>;
    try {
      runtime = await this.getGeminiRuntimeForExtraction(params.signal);
    } catch (err: any) {
      return {
        saved: false,
        topic,
        provider: { ...params.provider, configured: false, unavailableReason: err?.message || "Gemini provider is not configured." },
        modelAttempted: false,
        error: err?.message || "Gemini provider is not configured."
      };
    }

    const { systemPrompt, userPrompt } = this.buildExpertisePrompts(topic, "Gemini");
    let responseText = "";
    try {
      responseText = EngineeringMemory.scrubSecrets(await ModelClient.chatCompletion(
        systemPrompt,
        userPrompt,
        runtime.model.modelName,
        {
          provider: runtime.provider,
          model: runtime.model,
          apiKey: runtime.apiKey,
          signal: params.signal,
          requestTimeoutMs: 1800000,
          retryCountOverride: 0,
        }
      )).trim();
    } catch (err: any) {
      return {
        saved: false,
        topic,
        provider: params.provider,
        modelAttempted: true,
        error: err?.message || "Gemini expertise extraction failed."
      };
    }

    if (!responseText || responseText.length < 120) {
      return {
        saved: false,
        topic,
        provider: params.provider,
        modelAttempted: true,
        error: "Gemini returned an empty or too-short expertise card. Nothing was saved."
      };
    }

    return this.saveExpertiseCard({
      workspacePath: params.workspacePath,
      topic,
      provider: params.provider,
      responseText,
      source: "gemini",
      storageNote: "This card was generated by the configured Gemini provider."
    });
  }

  private static async saveExpertiseCard(params: {
    workspacePath: string;
    topic: string;
    provider: ModelExpertiseProviderProfile;
    responseText: string;
    source: string;
    storageNote: string;
  }): Promise<ModelExpertiseExtractionResult> {
    const now = new Date().toISOString();
    const relativePath = path.join(".saad-agent", "training", "lessons", "model-expertise", `${this.slugify(params.topic)}.md`);
    const absolutePath = path.join(params.workspacePath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    const card = [
      "---",
      `title: ${JSON.stringify(params.topic)}`,
      "category: lessons",
      `tags: model-expertise, ${params.provider.sourceTag}, model-generated-unverified`,
      `source: ${params.source}`,
      "verification: model-generated-unverified",
      `generatedAt: ${now}`,
      "---",
      "",
      params.responseText,
      "",
      "## Saad Agent Storage Notes",
      `- ${params.storageNote}`,
      "- Verification status is model-generated-unverified until checked against real project evidence or trusted sources.",
      "- Do not treat this card as higher priority than explicit user instructions, project files, or verified documentation."
    ].join("\n");
    await fs.writeFile(absolutePath, card, "utf8");
    const registry = await KnowledgeIngestionService.ingestTrainingKnowledge(params.workspacePath);
    const normalizedRelative = relativePath.replace(/\\/g, "/");
    const item = registry.items.find((entry) => entry.filePath.replace(/\\/g, "/") === normalizedRelative);
    return {
      saved: true,
      topic: params.topic,
      provider: params.provider,
      modelAttempted: true,
      trainingPath: normalizedRelative,
      chunksCreated: item?.chunkCount || 0
    };
  }

  static async extractFromRequestedProvider(params: {
    workspacePath: string;
    prompt: string;
    signal?: AbortSignal | undefined;
  }): Promise<ModelExpertiseExtractionResult> {
    const provider = await this.resolveRequestedProviderForRuntime(params.prompt);
    const topic = this.extractTopic(params.prompt);
    if (provider.id === "gemini" && provider.configured) {
      return this.extractFromGemini({ ...params, provider });
    }
    if (provider.id !== "local") {
      return this.createUnavailableProviderResult(topic, provider);
    }
    return this.extractFromLocalModel(params);
  }

  private static buildExpertisePrompts(topic: string, sourceModel: string): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = [
      "You are generating a structured expertise card for Saad Agent's private local knowledge base.",
      "Return useful durable knowledge, not conversation filler.",
      "Do not include secrets, API keys, credentials, private tokens, or unverifiable claims.",
      "If the topic is too broad, still produce a compact practical starter card.",
      "Use clear Markdown with the exact sections requested."
    ].join("\n");
    const userPrompt = [
      `Topic: ${topic}`,
      "",
      "Create a concise but practical expertise card with these sections:",
      "# Title",
      `Source Model: ${sourceModel}`,
      "Verification Status: model-generated-unverified",
      "Domain:",
      "When To Use:",
      "Core Rules:",
      "Step By Step Workflow:",
      "Common Mistakes:",
      "Good Examples:",
      "Bad Examples:",
      "When Not To Use:",
      "Verification Notes:",
      "",
      "Keep it factual, reusable, and suitable for retrieval by a local agent."
    ].join("\n");
    return { systemPrompt, userPrompt };
  }

  private static async resolveRequestedProviderForRuntime(prompt: string): Promise<ModelExpertiseProviderProfile> {
    const requested = this.resolveRequestedProvider(prompt);
    if (requested.id !== "gemini") return requested;
    try {
      await this.getGeminiRuntimeForExtraction();
      return {
        ...requested,
        configured: true
      };
    } catch (err: any) {
      return {
        ...requested,
        configured: false,
        unavailableReason: err?.message || "Gemini provider is not configured. No card was generated or saved."
      };
    }
  }

  private static async getGeminiRuntimeForExtraction(signal?: AbortSignal | undefined): Promise<{
    provider: any;
    model: any;
    apiKey: string;
  }> {
    const settings = await SettingsManager.getSettings();
    const provider = settings.providers.find((entry) => entry.id === "gemini" || entry.name.toLowerCase().includes("gemini"));
    if (!provider) throw new Error("Gemini provider is missing from Settings.");
    if (!provider.enabled) throw new Error("Gemini provider is disabled in Settings.");
    const apiKey = await SettingsManager.getProviderApiKey(provider);
    if (!apiKey) throw new Error("Gemini API key is missing. Add it in Settings > Providers > Gemini or set GEMINI_API_KEY.");

    const configuredModel = Object.values(settings.models).find((model: any) => model?.providerId === provider.id && model?.modelName);
    const discoveredModel = provider.discoveredModels?.find((model: any) => model?.id)?.id;
    const modelName = configuredModel?.modelName || discoveredModel || "gemini-2.0-flash";
    const model = {
      ...(configuredModel || settings.models.Coding),
      role: configuredModel?.role || settings.models.Coding.role,
      providerId: provider.id,
      modelName,
      timeoutMs: configuredModel?.timeoutMs || settings.models.Coding.timeoutMs || 180000,
      retryCount: 0,
    };
    return {
      provider: { ...provider, endpointUrl: (provider.endpointUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "") },
      model,
      apiKey,
    };
  }

  private static createUnavailableProviderResult(
    topic: string,
    provider: ModelExpertiseProviderProfile
  ): ModelExpertiseExtractionResult {
    return {
      saved: false,
      topic,
      provider,
      modelAttempted: false,
      error: provider.unavailableReason || `${provider.label} expertise extraction is unavailable. No card was generated or saved.`
    };
  }

  private static normalizeArabic(input: string): string {
    return String(input || "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .toLowerCase();
  }

  private static slugify(input: string): string {
    const ascii = String(input || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return ascii || `local-model-expertise-${Date.now()}`;
  }
}

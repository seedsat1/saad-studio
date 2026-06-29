import * as fs from "fs";
import * as path from "path";
import { ReasoningEngine } from "./reasoning-engine.js";
import { ConversationStateEngine } from "./conversation-state-engine.js";

export type SupportedIntent =
  | "memory_save"
  | "memory_recall"
  | "general_chat"
  | "friendly_expression"
  | "emotional_expression"
  | "frustration"
  | "workspace_question"
  | "web_search"
  | "internet_answers"
  | "image_search"
  | "code_generation"
  | "debugging"
  | "image_generation"
  | "video_generation"
  | "clarification_request"
  | "contextual_followup"
  | "fallback_llm";

export interface IntentClassificationResult {
  intent: SupportedIntent;
  confidence: number;
  source: "dictionary" | "pattern" | "state" | "llm";
  language: string;
  extractedFact?: string | undefined;
  followUpType?: string | undefined;
  resolvedOption?: string | undefined;
}

export class IntentEngine {
  private dictionary: any[];

  constructor() {
    this.dictionary = [];
    this.loadDictionary();
  }

  private loadDictionary() {
    try {
      const configPath = path.resolve(process.cwd(), "src/config/intent-dictionary.json");
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, "utf-8");
        this.dictionary = JSON.parse(rawData).intents || [];
        return;
      }
    } catch (error) {
      console.error("[Intent Engine] CRITICAL: Failed to load intent dictionary.", error);
    }

    this.dictionary = [];
  }

  public detectLanguage(prompt: string): string {
    const clean = prompt.toLowerCase();
    const hasArabic = /[\u0600-\u06FF]/.test(clean);
    if (!hasArabic) return "en";

    const iraqiKeywords = ["شنو", "شلونك", "شكو", "اني", "آني", "عيني", "سوي", "خليها", "ليش", "حبيبي", "شخبارك", "وين", "كللي"];
    const isIraqi = iraqiKeywords.some((kw) => clean.includes(kw));
    return isIraqi ? "ar_iq" : "ar";
  }

  public classifyIntent(prompt: string, sessionId = "default_session"): IntentClassificationResult {
    if (!this.dictionary || !Array.isArray(this.dictionary) || this.dictionary.length === 0) {
      this.loadDictionary();
    }
    const cleanPrompt = prompt.toLowerCase().trim();
    const language = this.detectLanguage(prompt);
    const state = ConversationStateEngine.getState(sessionId);

    // High Priority Patterns
    const priorityMemory = this.classifyPriorityUserMemoryIntent(prompt, language);
    if (priorityMemory) return priorityMemory;

    const priorityWorkspace = this.classifyPriorityWorkspaceIntent(prompt, language);
    if (priorityWorkspace) return priorityWorkspace;

    const priorityEngineering = this.classifyPriorityEngineeringIntent(prompt, language);
    if (priorityEngineering) return priorityEngineering;

    const priorityImageSearch = this.classifyPriorityImageSearchIntent(prompt, language);
    if (priorityImageSearch) return priorityImageSearch;

    const priorityWeb = this.classifyPriorityWebIntent(prompt, language);
    if (priorityWeb) return priorityWeb;

    // 1. Pending Clarification State
    if (state.pendingClarification) {
      const resolved = ConversationStateEngine.resolveClarification(prompt, state.pendingClarification);
      if (resolved.resolved) {
        return {
          intent: (state.lastIntent as SupportedIntent) || "code_generation",
          confidence: 0.99,
          source: "state",
          language,
          resolvedOption: resolved.selectedOption,
        };
      }
    }

    // 2. Contextual Follow-up
    const followUp = ConversationStateEngine.detectContextualFollowUp(prompt);
    if (followUp.isFollowUp) {
      const inheritedIntent = (state.activeWorkflow as SupportedIntent) || (state.lastIntent as SupportedIntent) || "code_generation";
      return {
        intent: inheritedIntent,
        confidence: 0.95,
        source: "state",
        language,
        followUpType: followUp.type,
      };
    }

    // 3. Dictionary Matching
    for (const intentObj of this.dictionary) {
      if (!intentObj.phrases) continue;
      const phrasesMap = intentObj.phrases;
      const langPhrases = phrasesMap[language] || [];
      const arPhrases = phrasesMap["ar"] || [];
      const arIqPhrases = phrasesMap["ar_iq"] || [];
      const enPhrases = phrasesMap["en"] || [];

      const allPhrases = Array.from(new Set([...langPhrases, ...arIqPhrases, ...arPhrases, ...enPhrases]));

      for (const phrase of allPhrases) {
        if (!phrase) continue;
        const cleanPhrase = phrase.toLowerCase().trim();
        const regex = new RegExp(`(^|\\s|[.,!؟?])${this.escapeRegEx(cleanPhrase)}($|\\s|[.,!؟?])`, "i");

        if (regex.test(cleanPrompt)) {
          return {
            intent: intentObj.id as SupportedIntent,
            confidence: 0.98,
            source: "dictionary",
            language,
          };
        }
      }
    }

    return {
      intent: "fallback_llm",
      confidence: 0.5,
      source: "dictionary",
      language,
    };
  }

  private escapeRegEx(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private normalizeArabicText(input: string): string {
    return input
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[؟?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private classifyPriorityUserMemoryIntent(prompt: string, language: string): IntentClassificationResult | null {
    const normalized = this.normalizeArabicText(prompt);
    const memoryRecallPhrases = [
      "من انا", "ما اسمي", "شنو اسمي", "منو اني", "ماذا تعرف عني", "ماذا تتذكر عني", "شنو تعرف عني", "شتتذكر عني",
      "what is my name", "who am i", "what do you remember about me"
    ];

    if (memoryRecallPhrases.some((phrase) => normalized === phrase || normalized.includes(phrase))) {
      return { intent: "memory_recall", confidence: 1, source: "pattern", language };
    }

    const hasSaveVerb = ["احفظ", "تذكر", "خزن", "سجل", "ثبت", "remember", "save"].some((word) => normalized.includes(word));
    const hasIdentityMarker = ["اسمي", "رسمي", "انا", "اني", "هويتي", "name"].some((word) => normalized.includes(word));
    if (hasSaveVerb && hasIdentityMarker) {
      return { intent: "memory_save", confidence: 1, source: "pattern", language };
    }

    return null;
  }

  private classifyPriorityWorkspaceIntent(prompt: string, language: string): IntentClassificationResult | null {
    const clean = prompt.toLowerCase();
    const normalized = this.normalizeArabicText(prompt);

    // Keywords clearly indicating local workspace / code investigation
    const workspaceKeywords = [
      "حساب credits", "credits", "gallery", "غاليري", "جاليري", "كم صفحة", "شكم صفحة",
      "داخل المشروع", "في المشروع", "بالمشروع", "اين يتم", "اين يوجد", "وين يتم", "وين يوجد",
      "وين القى", "وين صاير", "ملفات المشروع", "بنية المشروع", "شلون مرتب المشروع",
      "where is calculated", "how many pages", "inside project", "where is gallery"
    ];

    if (workspaceKeywords.some((kw) => clean.includes(kw) || normalized.includes(kw))) {
      return { intent: "workspace_question", confidence: 0.98, source: "pattern", language };
    }

    return null;
  }

  private classifyPriorityEngineeringIntent(prompt: string, language: string): IntentClassificationResult | null {
    const clean = prompt.toLowerCase();
    const normalized = this.normalizeArabicText(prompt);

    const localCodingTargets = [
      "next.js", "nextjs", "react", "typescript", "javascript", "electron", "node", "api route",
      "component", "page", "route", "file", "function", "class", "module", "tsx", "jsx", "ts"
    ];
    const codingActions = [
      "انشئ", "انشأ", "أنشئ", "اصنع", "سوي", "اضف", "أضف", "عدل", "عدّل", "طبق", "نفذ",
      "ابني", "اكتب", "غير", "غيّر", "اربط", "اكمل", "انجز", "create", "add", "implement",
      "build", "write", "modify", "update", "refactor", "wire", "connect", "apply"
    ];
    const debuggingActions = [
      "اصلح", "أصلح", "صلح", "حل الخطا", "حل الخطأ", "خطا", "خطأ", "مشكله", "مشكلة",
      "bug", "fix", "error", "debug", "broken", "failing", "regression"
    ];

    const hasTarget = localCodingTargets.some((kw) => clean.includes(kw) || normalized.includes(kw));
    const hasCodingAction = codingActions.some((kw) => clean.includes(kw) || normalized.includes(kw));
    const hasDebugAction = debuggingActions.some((kw) => clean.includes(kw) || normalized.includes(kw));

    if (hasDebugAction && (hasTarget || clean.includes("this") || normalized.includes("هذا"))) {
      const confidence = hasTarget ? 0.96 : 0.88;
      return { intent: "debugging", confidence, source: "pattern", language };
    }

    if (hasCodingAction && (hasTarget || /\/[\w.-]+/.test(clean))) {
      const confidence = hasTarget ? 0.96 : 0.9;
      return { intent: "code_generation", confidence, source: "pattern", language };
    }

    return null;
  }

  private classifyPriorityImageSearchIntent(prompt: string, language: string): IntentClassificationResult | null {
    const clean = prompt.toLowerCase();
    const normalized = this.normalizeArabicText(prompt);
    const imageTerms = ["صورة", "صور", "image", "photo", "picture"];
    const searchTerms = ["رابط", "ابحث", "على الانترنت", "على الإنترنت", "search", "find", "online", "link"];
    const wantsImage = imageTerms.some((kw) => clean.includes(kw) || normalized.includes(kw));
    const wantsSearch = searchTerms.some((kw) => clean.includes(kw) || normalized.includes(kw));
    if (wantsImage && wantsSearch) {
      return { intent: "image_search", confidence: 0.95, source: "pattern", language };
    }
    return null;
  }

  private classifyPriorityWebIntent(prompt: string, language: string): IntentClassificationResult | null {
    const clean = prompt.toLowerCase();
    const normalized = this.normalizeArabicText(prompt);

    const webKeywords = [
      "آخر تحديث", "اخر تحديث", "أحدث تحديث", "أحدث إصدار", "اخر اصدار", "ابحث عن آخر", "ابحث عن اخر",
      "ابحث في الانترنت", "ابحث في الإنترنت", "بحث في الانترنت", "بحث في الإنترنت", "على الانترنت", "على الإنترنت",
      "next.js", "nextjs", "byteplus", "modelark", "openai responses", "latest update", "search online", "search web"
    ];

    const explicitWebSearch = [
      "ابحث في الانترنت", "ابحث في الإنترنت", "بحث في الانترنت", "بحث في الإنترنت",
      "هل يمكنك البحث في الانترنت", "هل يمكنك البحث في الإنترنت", "search online", "search web", "web search"
    ];

    if (explicitWebSearch.some((kw) => clean.includes(kw) || normalized.includes(kw))) {
      return { intent: "web_search", confidence: 0.97, source: "pattern", language };
    }

    if (webKeywords.some((kw) => clean.includes(kw) || normalized.includes(kw))) {
      const latestSignal = ["آخر", "اخر", "أحدث", "latest", "current", "today"].some((kw) => clean.includes(kw) || normalized.includes(kw));
      return { intent: "internet_answers", confidence: latestSignal ? 0.96 : 0.86, source: "pattern", language };
    }

    return null;
  }

  public async classifyWithLLM(prompt: string, language: string): Promise<IntentClassificationResult> {
    try {
      const systemPrompt = `You are a multilingual intent classification subsystem for Saad Agent.
Classify the user prompt into exactly ONE of the following supported intent labels:
memory_save, memory_recall, general_chat, friendly_expression, emotional_expression, frustration, workspace_question, web_search, internet_answers, image_search, code_generation, image_generation, video_generation, debugging.
Output ONLY the single intent label string (e.g. "workspace_question"), with zero extra text.`;

      const res = await ReasoningEngine.requestCompletion({
        role: "Fast",
        systemPrompt,
        userPrompt: prompt,
      });

      const clean = res.rawResponse.trim().toLowerCase();
      const valid: SupportedIntent[] = [
        "memory_save", "memory_recall", "general_chat", "friendly_expression", "emotional_expression",
        "frustration", "workspace_question", "web_search", "internet_answers", "image_search",
        "code_generation", "image_generation", "video_generation", "debugging",
      ];
      const matched = valid.find((v) => clean.includes(v)) || "workspace_question";

      return { intent: matched, confidence: 0.88, source: "llm", language };
    } catch {
      return { intent: "workspace_question", confidence: 0.5, source: "llm", language };
    }
  }

  public static shouldOverrideComposer(intent: SupportedIntent): boolean {
    const overrideIntents: SupportedIntent[] = [
      "memory_save", "memory_recall", "general_chat", "friendly_expression", "emotional_expression",
      "frustration", "clarification_request", "workspace_question", "web_search", "internet_answers", "image_search",
    ];
    return overrideIntents.includes(intent);
  }
}

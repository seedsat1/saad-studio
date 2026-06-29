import * as path from "path";
import { CONFIG } from "../../config.js";
import { BraveAnswersService } from "./brave-answers.js";
import { ContextEngine } from "./context-engine.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { IntentEngine, type SupportedIntent } from "./intent-engine.js";
import { PreAnswerReviewService } from "./pre-answer-review.js";
import { ReasoningEngine } from "./reasoning-engine.js";

export interface ChatOrchestrationResult {
  response: string;
  intent: SupportedIntent;
  usedModel: boolean;
}

export class ChatOrchestratorService {
  static async handleDirectChat(input: {
    prompt: string;
    workspacePath?: string;
    projectName?: string;
    sessionId?: string;
  }): Promise<ChatOrchestrationResult> {
    const prompt = EngineeringMemory.scrubSecrets(input.prompt || "").trim();
    const activeWorkspace = input.workspacePath || CONFIG.PROJECT_ROOT;
    const intent = this.detectIntent(prompt, input.sessionId || "desktop-chat");
    const preAnswerReview = await PreAnswerReviewService.review(prompt, activeWorkspace);
    const prefix = [
      `Intent: ${intent}`,
      PreAnswerReviewService.formatUserVisiblePrefix(preAnswerReview)
    ].join("\n");

    if (this.isKnowledgeUsageQuestion(prompt)) {
      return {
        intent,
        usedModel: false,
        response: [
          prefix,
          "",
          "Trained knowledge used:",
          PreAnswerReviewService.formatKnowledgeUsageReport(preAnswerReview)
        ].join("\n")
      };
    }

    if (intent === "memory_save") {
      const fact = this.extractMemoryFact(prompt);
      if (!fact) {
        return {
          intent,
          usedModel: false,
          response: [prefix, "", "اكتب المعلومة التي تريد حفظها بوضوح، وسأحفظها في الذاكرة الدائمة بدون توليد رد من الموديل."].join("\n")
        };
      }
      const saved = await EngineeringMemory.addKnowledgeItem({
        area: "user-memory",
        description: fact,
        relatedFiles: []
      });
      return {
        intent,
        usedModel: false,
        response: [prefix, "", `تم الحفظ في الذاكرة الدائمة.\nMemory ID: ${saved.id}\nالمعلومة: ${saved.description}`].join("\n")
      };
    }

    if (intent === "memory_recall") {
      const memory = await EngineeringMemory.searchMemory({});
      const userMemory = memory.knowledgeItems.filter((item) => item.area === "user-memory").slice(-12);
      const lines = userMemory.length
        ? userMemory.map((item) => `- ${item.description}`)
        : ["لا توجد معلومات شخصية محفوظة في الذاكرة الدائمة حتى الآن."];
      return {
        intent,
        usedModel: false,
        response: [prefix, "", "الذاكرة الدائمة:", ...lines].join("\n")
      };
    }

    if (intent === "web_search" || intent === "internet_answers" || intent === "image_search") {
      try {
        const search = await BraveAnswersService.query(prompt);
        const sourceBlock = BraveAnswersService.formatSourcesMarkdown(search.sources);
        return {
          intent,
          usedModel: false,
          response: [
            prefix,
            "",
            `Internet Search: completed in ${search.latencyMs}ms${search.cacheHit ? " (cache)" : ""}`,
            "",
            search.answersText,
            sourceBlock
          ].join("\n")
        };
      } catch (err: any) {
        return {
          intent,
          usedModel: false,
          response: [
            prefix,
            "",
            "تعذر تنفيذ البحث في الإنترنت فعليًا.",
            `السبب: ${err?.message || "Unknown search error"}`,
            "لن أقدم نتائج بحث تخمينية بدون مصدر مباشر."
          ].join("\n")
        };
      }
    }

    const context = await ContextEngine.retrieveContext(prompt, activeWorkspace, 4096).catch(() => null);
    const contextSummary = context?.items?.slice(0, 6).map((item) => {
      return `- ${item.title}: ${item.content.slice(0, 700)}`;
    }).join("\n\n") || "No workspace context was retrieved.";

    const response = await ReasoningEngine.requestCompletion({
      role: "Coding",
      systemPrompt: [
        "You are Saad Agent, a practical AI engineering assistant.",
        "Reply directly to the user in the user's language.",
        "Never answer before the orchestrator, memory, training knowledge, and context review have run.",
        "Obey the Mandatory Pre-Answer Review Context before using model knowledge.",
        "Use matched trained knowledge when it applies. If it conflicts with model knowledge, prefer trained knowledge.",
        "Do not claim that you changed files unless an execution tool actually changed files.",
        "If a provider/model/runtime problem prevents completion, explain the exact problem."
      ].join("\n"),
      userPrompt: [
        `Project: ${input.projectName || path.basename(activeWorkspace)}`,
        preAnswerReview.finalContext,
        "Retrieved workspace context:",
        contextSummary,
        "User request:",
        prompt
      ].join("\n\n")
    });

    return {
      intent,
      usedModel: true,
      response: [prefix, "", response.rawResponse].join("\n")
    };
  }

  private static detectIntent(prompt: string, sessionId: string): SupportedIntent {
    const normalized = this.normalizeArabic(prompt);
    if (this.isMemorySave(prompt, normalized)) return "memory_save";
    if (this.isMemoryRecall(prompt, normalized)) return "memory_recall";
    if (this.isExplicitInternetSearch(prompt, normalized)) return "web_search";
    const engine = new IntentEngine();
    return engine.classifyIntent(prompt, sessionId).intent;
  }

  private static isMemorySave(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const saveSignals = /\b(remember|save|store|memorize)\b/i.test(lower)
      || /(احفظ|حفظ|تذكر|تذكّر|خزن|خزّن|سجل|سجّل|ثبت|ثبّت)/.test(normalized);
    const recallQuestion = /(من انا|منو اني|منو انا|ما اسمي|شنو اسمي|who am i|what is my name)/i.test(normalized)
      || /\?/.test(prompt);
    return saveSignals && !recallQuestion;
  }

  private static isMemoryRecall(prompt: string, normalized: string): boolean {
    return /(من انا|منو اني|منو انا|ما اسمي|شنو اسمي|ماذا تعرف عني|شنو تعرف عني|ماذا تتذكر عني|what do you remember about me|who am i|what is my name)/i.test(normalized);
  }

  private static isExplicitInternetSearch(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /(ابحث في الانترنت|ابحث في الإنترنت|بحث في الانترنت|بحث في الإنترنت|على الانترنت|على الإنترنت|اعطني روابط|اعطيني روابط|هات روابط|روابط|search web|search online|give me links|latest|current|recent)/i.test(normalized)
      || /\b(search web|search online|give me links|latest|current|recent)\b/i.test(lower);
  }

  private static isKnowledgeUsageQuestion(prompt: string): boolean {
    return /what trained knowledge did you use|ما(?:ذا)? المعرفة المدربة|ما المعرفة التي استخدمت|أي معرفة مدربة/i.test(prompt || "");
  }

  private static extractMemoryFact(prompt: string): string {
    return EngineeringMemory.scrubSecrets(prompt)
      .replace(/^(احفظ|حفظ|تذكر|تذكّر|خزن|خزّن|سجل|سجّل|ثبت|ثبّت)\s*(هذا|هذه|هاي|هذي|المعلومة|التالي|:)?\s*/i, "")
      .replace(/^(remember|save|store|memorize)\s*(this|that|the following|:)?\s*/i, "")
      .trim();
  }

  private static normalizeArabic(input: string): string {
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
}

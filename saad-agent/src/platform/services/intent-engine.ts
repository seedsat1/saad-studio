import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { ConversationStateEngine } from "./conversation-state-engine.js";

export type SupportedIntent =
  | "memory_save"
  | "training_ingest"
  | "memory_recall"
  | "knowledge_lookup"
  | "knowledge_list"
  | "workspace_query"
  | "workspace_scan"
  | "project_navigation"
  | "code_generation"
  | "code_modification"
  | "bug_fix"
  | "code_review"
  | "architecture_question"
  | "external_research"
  | "vision_analysis"
  | "translation"
  | "conversation"
  | "general_chat"
  | "friendly_expression"
  | "emotional_expression"
  | "frustration"
  | "workspace_question"
  | "web_search"
  | "internet_answers"
  | "image_search"
  | "debugging"
  | "image_generation"
  | "video_generation"
  | "clarification_request"
  | "contextual_followup"
  | "fallback_llm";

export interface IntentClassificationResult {
  intent: SupportedIntent;
  confidence: number;
  source: "semantic" | "pattern" | "context" | "state" | "dictionary" | "llm";
  language: string;
  matchedPattern?: string | undefined;
  reason?: string | undefined;
  selectedPipeline?: string | undefined;
  selectedTools?: string[] | undefined;
  conversationContextUsed?: boolean | undefined;
  conversationType?: string | undefined;
  referenceResolved?: string | undefined;
  topic?: string | undefined;
  extractedFact?: string | undefined;
  followUpType?: string | undefined;
  resolvedOption?: string | undefined;
}

interface IntentPattern {
  pattern: string;
  weight?: number;
  reason?: string;
}

interface IntentRuleFile {
  intent: SupportedIntent;
  pipeline?: string;
  tools?: string[];
  patterns: IntentPattern[];
  negativePatterns?: string[];
}

interface Candidate {
  intent: SupportedIntent;
  confidence: number;
  source: IntentClassificationResult["source"];
  matchedPattern: string;
  reason: string;
  selectedPipeline: string;
  selectedTools: string[];
}

interface ConversationAnalysis {
  conversationType: string;
  contextUsed: boolean;
  referenceResolved?: string | undefined;
  topic?: string | undefined;
  intentHint?: SupportedIntent | undefined;
  confidence: number;
  reason: string;
}

const REQUESTED_INTENTS: SupportedIntent[] = [
  "memory_save",
  "training_ingest",
  "memory_recall",
  "knowledge_lookup",
  "knowledge_list",
  "workspace_query",
  "workspace_scan",
  "project_navigation",
  "code_generation",
  "code_modification",
  "bug_fix",
  "code_review",
  "architecture_question",
  "external_research",
  "vision_analysis",
  "translation",
  "conversation"
];

const LEGACY_INTENT_MAP: Partial<Record<SupportedIntent, SupportedIntent>> = {
  workspace_question: "workspace_query",
  web_search: "external_research",
  internet_answers: "external_research",
  image_search: "external_research",
  debugging: "bug_fix",
  general_chat: "conversation",
  fallback_llm: "conversation"
};

const DEFAULT_RULES: Record<string, IntentRuleFile> = {
  memory_save: {
    intent: "memory_save",
    pipeline: "memory.write",
    tools: ["EngineeringMemory"],
    patterns: [
      { pattern: "^(?:احفظ|حفظ|تذكر|خزن|سجل|ثبت)(?:\\s|$)", weight: 0.98, reason: "User asks to store a fact." },
      { pattern: "\\b(?:remember|save|store|memorize)\\b", weight: 0.96, reason: "User asks to store memory." }
    ],
    negativePatterns: ["\\?", "ما الذي", "ماذا", "اشرح", "اعرض"]
  },
  training_ingest: {
    intent: "training_ingest",
    pipeline: "training.ingest",
    tools: ["AttachmentManager", "KnowledgeIngestionService"],
    patterns: [
      { pattern: "(?:^|\\s)(?:درب|تدريب)\\s+(?:نفسك|على|هذا|هذه|هذي|هاي|الملف|الصوره|الصورة|المرفق)", weight: 0.99, reason: "User asks the agent to ingest training material." },
      { pattern: "(?:احفظ|استخدم|اعتمد).*(?:مرجع|للتدريب|كمصدر)", weight: 0.96, reason: "User asks to save content as a training reference." },
      { pattern: "\\b(?:train on|learn from|ingest|use as reference|save as reference)\\b", weight: 0.97, reason: "User asks to ingest knowledge." }
    ],
    negativePatterns: ["دربك", "دربتك", "تدربت", "ما الذي"]
  },
  memory_recall: {
    intent: "memory_recall",
    pipeline: "memory.read",
    tools: ["EngineeringMemory"],
    patterns: [
      { pattern: "^(?:من انا|منو انا|منو اني|ما اسمي|شنو اسمي)(?:\\s|$)", weight: 0.99, reason: "User asks about remembered identity." },
      { pattern: "(?:ما الذي|شنو|ماذا).*(?:دربتك|دربك|حفظت|تتذكر|تعرف)", weight: 0.97, reason: "User asks for previously stored/trained knowledge." },
      { pattern: "\\b(?:who am i|what is my name|what do you remember|what did i train you on)\\b", weight: 0.97, reason: "User asks to recall memory." }
    ]
  },
  knowledge_lookup: {
    intent: "knowledge_lookup",
    pipeline: "knowledge.retrieve",
    tools: ["PreAnswerReviewService", "ContextEngine"],
    patterns: [
      { pattern: "^(?:اشرح|وضح|فسر).*(?:الذي|اللي|حفظته|دربتك|دربك|البروتوكول|القاعده|القاعدة)", weight: 0.96, reason: "User asks to explain stored knowledge." },
      { pattern: "\\b(?:explain|lookup|retrieve).*(?:saved|trained|protocol|rule|knowledge)\\b", weight: 0.93, reason: "User asks to look up trained knowledge." }
    ]
  },
  knowledge_list: {
    intent: "knowledge_list",
    pipeline: "knowledge.list",
    tools: ["KnowledgeIngestionService"],
    patterns: [
      { pattern: "^(?:اعرض|اظهر|اذكر).*(?:جميع|كل).*(?:البروتوكولات|التدريبات|المراجع|المعرفه|المعرفة)", weight: 0.97, reason: "User asks to list trained knowledge." },
      { pattern: "\\b(?:list|show).*(?:trained knowledge|training|protocols|references)\\b", weight: 0.94, reason: "User asks for a knowledge list." }
    ]
  },
  workspace_scan: {
    intent: "workspace_scan",
    pipeline: "workspace.scan",
    tools: ["WorkspaceAnalyzer", "ContextEngine"],
    patterns: [
      { pattern: "(?:كم|شكد|عدد).*(?:صفحه|صفحة|ملف|ملفات|route|routes|page|pages).*(?:المشروع|workspace|project)?", weight: 0.96, reason: "User asks for workspace statistics." },
      { pattern: "\\b(?:scan workspace|analyze workspace|how many pages|how many files)\\b", weight: 0.94, reason: "User asks to scan the workspace." }
    ]
  },
  workspace_query: {
    intent: "workspace_query",
    pipeline: "workspace.query",
    tools: ["ContextEngine", "SemanticSearch"],
    patterns: [
      { pattern: "^(?:اين|وين|مكان|أين).*(?:يوجد|القى|القا|مكان)?", weight: 0.92, reason: "User asks where something exists in the project." },
      { pattern: "(?:ابحث|بحث|دور|فتش).*(?:داخل المشروع|في المشروع|بالمشروع|داخل الملفات|في الملفات|بالملفات|داخل الكود|في الكود|workspace|project files|local files|codebase)", weight: 0.97, reason: "User asks to search inside the trusted workspace." },
      { pattern: "\\b(?:where is|find in project|where does).*\\b", weight: 0.92, reason: "User asks for project location." }
    ]
  },
  project_navigation: {
    intent: "project_navigation",
    pipeline: "workspace.navigate",
    tools: ["SemanticSearch"],
    patterns: [
      { pattern: "(?:افتح|روح|اذهب|انتقل).*(?:صفحه|صفحة|ملف|folder|file|page)", weight: 0.93, reason: "User asks to navigate project files." },
      { pattern: "\\b(?:open|navigate to|go to).*(?:file|page|folder)\\b", weight: 0.92, reason: "User asks to navigate." }
    ]
  },
  code_generation: {
    intent: "code_generation",
    pipeline: "engineering.generate",
    tools: ["ContextEngine", "ReasoningEngine"],
    patterns: [
      { pattern: "^(?:انشئ|انشأ|اصنع|سوي|ابني|اكتب|اضف|أضف|create|build|write|add).*(?:صفحه|صفحة|كود|component|page|api|route|function|button|password|feature)", weight: 0.95, reason: "User asks to create code." }
    ]
  },
  code_modification: {
    intent: "code_modification",
    pipeline: "engineering.modify",
    tools: ["ContextEngine", "Filesystem"],
    patterns: [
      { pattern: "^(?:عدل|عدله|غير|بدل|حدث|طبق|حرك|انقل|modify|update|change|refactor|move|use)(?:\\s|$)", weight: 0.95, reason: "User asks to modify existing code." },
      { pattern: "(?:make it responsive|now make it responsive|responsive|glass ui|use glass ui)", weight: 0.9, reason: "User asks to adjust the current implementation." },
      { pattern: "(?:غير الاسم فقط|لا تعدل الباقي|بس هذا)", weight: 0.96, reason: "User asks for constrained modification." }
    ]
  },
  bug_fix: {
    intent: "bug_fix",
    pipeline: "engineering.fix",
    tools: ["ContextEngine", "ValidationPipeline"],
    patterns: [
      { pattern: "^(?:اصلح|صلح|حل).*(?:خطا|خطأ|مشكله|مشكلة|bug|error)", weight: 0.97, reason: "User asks to fix a bug." },
      { pattern: "\\b(?:fix|debug|resolve).*(?:bug|error|issue|failure)\\b", weight: 0.96, reason: "User asks to debug." }
    ]
  },
  code_review: {
    intent: "code_review",
    pipeline: "engineering.review",
    tools: ["ContextEngine", "ValidationPipeline"],
    patterns: [
      { pattern: "^(?:راجع|افحص|دقق).*(?:الكود|الملف|code|file)", weight: 0.96, reason: "User asks for code review." },
      { pattern: "\\b(?:review|inspect|audit).*(?:code|file|diff)\\b", weight: 0.95, reason: "User asks for review." }
    ]
  },
  architecture_question: {
    intent: "architecture_question",
    pipeline: "architecture.explain",
    tools: ["ContextEngine", "ArchitectureIndex"],
    patterns: [
      { pattern: "(?:اشرح|وضح).*(?:معماريه|معمارية|architecture|بنية|هيكل)", weight: 0.95, reason: "User asks about architecture." },
      { pattern: "\\b(?:architecture|system design|data flow|pipeline)\\b", weight: 0.9, reason: "User asks about architecture." }
    ]
  },
  external_research: {
    intent: "external_research",
    pipeline: "research.external",
    tools: ["BraveAnswersService"],
    patterns: [
      { pattern: "(?:ابحث|بحث).*(?:الانترنت|الإنترنت|ويب|web)", weight: 0.97, reason: "User explicitly asks for web research." },
      { pattern: "(?:ابحثلي|ابحث لي|ابحث|دورلي|دور لي|دور|فتشلي|فتش لي|فتش|جيبلي معلومات|جيب لي معلومات|هاتلي معلومات|هات لي معلومات|طلعلي معلومات|طلع لي معلومات).*(?:[A-Za-z][A-Za-z0-9_.\\-/]*|\\d+(?:\\.\\d+)+|موديل|نموذج|شركة|منتج|منصة|خدمة|تقنية|معلومات|تفاصيل)", weight: 0.96, reason: "User asks to search for an external product/model/topic." },
      { pattern: "(?:اعطني|اعطيني|هات|اريد).*(?:روابط|مصادر|links|sources)", weight: 0.96, reason: "User asks for external links or sources." },
      { pattern: "(?:اخر|آخر|احدث|أحدث|latest|current|recent).*(?:اصدار|إصدار|نسخه|نسخة|update|version)", weight: 0.94, reason: "User asks for current external information." },
      { pattern: "(?:\u0627\u062e\u0631|\u0622\u062e\u0631|\u0627\u062d\u062f\u062b|\u0623\u062d\u062f\u062b|latest|current|recent).*(?:\u0648\u062b\u0627\u0626\u0642|\u0645\u0633\u062a\u0646\u062f\u0627\u062a|\u062f\u0644\u064a\u0644|documentation|docs|api)", weight: 0.95, reason: "User asks for current external documentation." },
      { pattern: "(?:\u0648\u062b\u0627\u0626\u0642|\u0645\u0633\u062a\u0646\u062f\u0627\u062a|\u062f\u0644\u064a\u0644|documentation|docs|api).*(?:\u0627\u062e\u0631|\u0622\u062e\u0631|\u0627\u062d\u062f\u062b|\u0623\u062d\u062f\u062b|latest|current|recent)", weight: 0.95, reason: "User asks for current external documentation." },
      { pattern: "(?:\u0631\u0627\u0628\u0637|\u0631\u0648\u0627\u0628\u0637|link|links).*(?:\u0635\u0648\u0631\u0629|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631|image|photo).*(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a|internet|online|web)", weight: 0.96, reason: "User asks for an external image link." },
      { pattern: "(?:\u0635\u0648\u0631\u0629|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631|image|photo).*(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a|internet|online|web).*(?:\u0631\u0627\u0628\u0637|\u0631\u0648\u0627\u0628\u0637|link|links)", weight: 0.96, reason: "User asks for an external image link." },
      { pattern: "\\b(?:search web|search online|latest|current|recent)\\b", weight: 0.94, reason: "User asks for external/current information." }
    ],
    negativePatterns: [
      "(?:داخل المشروع|في المشروع|بالمشروع|داخل الملفات|في الملفات|بالملفات|داخل الكود|في الكود|workspace|project files|local files|codebase)"
    ]
  },
  vision_analysis: {
    intent: "vision_analysis",
    pipeline: "vision.analyze",
    tools: ["VisionAnalyzer"],
    patterns: [
      { pattern: "(?:حلل|افحص|شوف|انظر).*(?:الصوره|الصورة|سكرين|screenshot|image)", weight: 0.96, reason: "User asks to analyze an image." },
      { pattern: "(?:انظر|شوف|افحص|حلل).*(?:فولدر|فولد|مجلد|مسار|folder|directory|path).*(?:صور|صوره|صورة|الصور|screenshots|images)", weight: 0.98, reason: "User asks to inspect an image folder." },
      { pattern: "(?:صنف|تصنيف|فرز|رتب|ضع|حط).*(?:صور|صوره|صورة|الصور|screenshots|images).*(?:فولدر|فولد|مجلد|تصنيف|folder|category)", weight: 0.98, reason: "User asks to classify or organize images." },
      { pattern: "\\b(?:analyze image|inspect screenshot|vision)\\b", weight: 0.95, reason: "User asks for vision analysis." }
    ]
  },
  translation: {
    intent: "translation",
    pipeline: "language.translate",
    tools: ["ReasoningEngine"],
    patterns: [
      { pattern: "^(?:ترجم|ترجمه|translate)(?:\\s|$)", weight: 0.97, reason: "User asks for translation." }
    ]
  },
  conversation: {
    intent: "conversation",
    pipeline: "conversation.respond",
    tools: ["ConversationStateEngine"],
    patterns: [
      { pattern: "^(?:اهلا|هلا|شلونك|تمام|شكرا|thanks|hello|hi)(?:\\s|$)", weight: 0.88, reason: "User is making conversation." }
    ]
  }
};

export class IntentEngine {
  private static history: Map<string, IntentClassificationResult[]> = new Map();
  private rules: IntentRuleFile[];

  constructor() {
    this.ensureDefaultIntentRules();
    this.rules = this.loadIntentRules();
  }

  public detectLanguage(prompt: string): string {
    const normalized = this.normalize(prompt);
    if (!/[\u0600-\u06FF]/.test(prompt)) return "en";
    const iraqi = ["شنو", "شلون", "هيج", "هيچ", "مو", "سوه", "هذني", "هاي", "كمل", "رجع", "عدله", "بدله"];
    return iraqi.some((word) => normalized.includes(word)) ? "ar_iq" : "ar";
  }

  public classifyIntent(prompt: string, sessionId = "default_session"): IntentClassificationResult {
    const language = this.detectLanguage(prompt);
    const normalized = this.normalize(prompt);
    const state = ConversationStateEngine.getState(sessionId);
    const conversation = this.analyzeConversation(prompt, normalized, sessionId);
    const candidates = this.scoreRules(normalized, prompt);

    if (conversation.intentHint) {
      candidates.push({
        intent: conversation.intentHint,
        confidence: conversation.confidence,
        source: "context",
        matchedPattern: conversation.conversationType,
        reason: conversation.reason,
        selectedPipeline: this.pipelineFor(conversation.intentHint),
        selectedTools: this.toolsFor(conversation.intentHint)
      });
    }

    if (state.pendingClarification) {
      const resolved = ConversationStateEngine.resolveClarification(prompt, state.pendingClarification);
      if (resolved.resolved) {
        candidates.push({
          intent: this.toRequestedIntent((state.lastIntent as SupportedIntent) || "code_modification"),
          confidence: 0.99,
          source: "state",
          matchedPattern: "pending clarification response",
          reason: "User answered a pending clarification.",
          selectedPipeline: this.pipelineFor((state.lastIntent as SupportedIntent) || "code_modification"),
          selectedTools: this.toolsFor((state.lastIntent as SupportedIntent) || "code_modification")
        });
      }
    }

    const best = this.pickBestCandidate(candidates) || {
      intent: "conversation" as SupportedIntent,
      confidence: 0.55,
      source: "semantic" as const,
      matchedPattern: "fallback conversational sentence",
      reason: "No stronger engineering, memory, workspace, vision, or research intent matched.",
      selectedPipeline: "conversation.respond",
      selectedTools: ["ConversationStateEngine"]
    };

    const result: IntentClassificationResult = {
      intent: best.intent,
      confidence: Number(best.confidence.toFixed(2)),
      source: best.source,
      language,
      matchedPattern: best.matchedPattern,
      reason: best.reason,
      selectedPipeline: best.selectedPipeline,
      selectedTools: best.selectedTools,
      conversationContextUsed: conversation.contextUsed,
      conversationType: conversation.conversationType,
      referenceResolved: conversation.referenceResolved,
      topic: conversation.topic
    };

    ConversationStateEngine.updateState(sessionId, {
      lastIntent: result.intent,
      lastPrompt: prompt,
      activeWorkflow: this.isWorkflowIntent(result.intent) ? result.intent : state.activeWorkflow,
      activeTask: conversation.topic || state.activeTask
    });
    this.pushHistory(sessionId, result);
    return result;
  }

  public getDiagnostics(result: IntentClassificationResult): string {
    return [
      `Detected Intent: ${result.intent}`,
      `Confidence: ${result.confidence}`,
      `Matched Pattern: ${result.matchedPattern || "none"}`,
      `Conversation Context Used: ${result.conversationContextUsed ? "yes" : "no"}`,
      `Reason: ${result.reason || "No reason recorded."}`,
      `Selected Pipeline: ${result.selectedPipeline || this.pipelineFor(result.intent)}`,
      `Selected Tools: ${(result.selectedTools || this.toolsFor(result.intent)).join(", ") || "none"}`
    ].join("\n");
  }

  public getIntentHistory(sessionId = "default_session"): IntentClassificationResult[] {
    return [...(IntentEngine.history.get(sessionId) || [])];
  }

  private ensureDefaultIntentRules(): void {
    const dir = this.intentDirectory();
    fs.mkdirSync(dir, { recursive: true });
    for (const intent of REQUESTED_INTENTS) {
      const filePath = path.join(dir, `${intent}.json`);
      if (!fs.existsSync(filePath) && DEFAULT_RULES[intent]) {
        fs.writeFileSync(filePath, JSON.stringify(DEFAULT_RULES[intent], null, 2), "utf8");
      }
    }
  }

  private loadIntentRules(): IntentRuleFile[] {
    const dir = this.intentDirectory();
    const merged = new Map<SupportedIntent, IntentRuleFile>();
    for (const rule of Object.values(DEFAULT_RULES)) {
      merged.set(rule.intent, {
        ...rule,
        patterns: [...rule.patterns],
        negativePatterns: [...(rule.negativePatterns || [])],
        tools: [...(rule.tools || [])]
      });
    }
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as IntentRuleFile;
        if (!parsed.intent || !Array.isArray(parsed.patterns)) continue;
        const existing = merged.get(parsed.intent);
        if (existing) {
          existing.patterns.push(...parsed.patterns);
          existing.negativePatterns = [...(existing.negativePatterns || []), ...(parsed.negativePatterns || [])];
          if (parsed.tools) existing.tools = parsed.tools;
          if (parsed.pipeline) existing.pipeline = parsed.pipeline;
        } else {
          merged.set(parsed.intent, parsed);
        }
      } catch (error) {
        console.warn(`[IntentEngine] Ignored invalid intent rule ${file}:`, error);
      }
    }
    return [...merged.values()];
  }

  private intentDirectory(): string {
    return path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "intents");
  }

  private scoreRules(normalized: string, original: string): Candidate[] {
    const candidates: Candidate[] = [];
    for (const rule of this.rules) {
      if (rule.negativePatterns?.some((pattern) => this.safeRegex(pattern).test(normalized))) continue;
      for (const item of rule.patterns) {
        const regex = this.safeRegex(item.pattern);
        if (!regex.test(normalized) && !regex.test(original.toLowerCase())) continue;
        candidates.push({
          intent: this.toRequestedIntent(rule.intent),
          confidence: item.weight || 0.85,
          source: "pattern",
          matchedPattern: item.pattern,
          reason: item.reason || rule.pipeline || "Matched semantic sentence pattern.",
          selectedPipeline: rule.pipeline || this.pipelineFor(rule.intent),
          selectedTools: rule.tools || this.toolsFor(rule.intent)
        });
      }
    }
    return candidates;
  }

  private analyzeConversation(prompt: string, normalized: string, sessionId: string): ConversationAnalysis {
    const state = ConversationStateEngine.getState(sessionId);
    const lastIntent = this.toRequestedIntent((state.lastIntent as SupportedIntent) || "conversation");
    const hasPrevious = Boolean(state.lastPrompt || state.activeTask || state.activeWorkflow);
    const short = normalized.split(/\s+/).length <= 4;

    const topic = this.extractTopic(normalized) || state.activeTask || undefined;
    const correction = /^(?:لا|مو هذا|مو هيج|مو هيچ|هذا غلط|قصدي|عدله|صححه|بدله|غيره|ارجع|رجع مثل قبل|not this|wrong|fix it|change it)(?:\s|$)/.test(normalized);
    if (correction) {
      return {
        conversationType: "correction_request",
        contextUsed: hasPrevious,
        referenceResolved: state.activeTask || state.lastPrompt,
        topic,
        intentHint: "code_modification",
        confidence: hasPrevious ? 0.94 : 0.72,
        reason: "User is correcting or narrowing the previous task."
      };
    }

    const continuation = /^(?:كمل|استمر|واصل|امش|امشي|تمام|نفذ|ابدأ|سوه|continue|retry|go on)(?:\s|$)/.test(normalized);
    if (continuation) {
      return {
        conversationType: "continue_previous_task",
        contextUsed: hasPrevious,
        referenceResolved: state.activeTask || state.activeWorkflow || lastIntent,
        topic,
        intentHint: lastIntent === "conversation" ? "code_modification" : lastIntent,
        confidence: hasPrevious ? 0.93 : 0.68,
        reason: "Short confirmation/continuation inherits the previous engineering intent."
      };
    }

    const topicSwitch = /(?:نبدأ موضوع جديد|موضوع ثاني|انس هذا|اترك هذا|archive previous|start a new task)/.test(normalized);
    if (topicSwitch) {
      return {
        conversationType: "topic_switch",
        contextUsed: false,
        topic: "new-topic",
        intentHint: "conversation",
        confidence: 0.9,
        reason: "User asks to switch topics."
      };
    }

    const reference = /^(?:هذا|هاي|هذه|هذني|الثاني|الاول|الأول|نفسه|نفسها|نفس السابق|الملف السابق|الكود السابق|الصفحه السابقه|الصفحة السابقة)(?:\s|$)/.test(normalized);
    if (reference && hasPrevious) {
      return {
        conversationType: "reference_resolution",
        contextUsed: true,
        referenceResolved: state.activeTask || state.lastPrompt,
        topic,
        intentHint: lastIntent === "conversation" ? "knowledge_lookup" : lastIntent,
        confidence: short ? 0.9 : 0.84,
        reason: "User references previous task/content."
      };
    }

    const memoryReference = /(?:اللي علمتك اياه|اللي دربتك عليه|اخر بروتوكول|آخر بروتوكول|القاعده السابقه|القاعدة السابقة|اللي حفظته امس|اللي حفظته أمس)/.test(normalized);
    if (memoryReference) {
      return {
        conversationType: "memory_reference",
        contextUsed: true,
        referenceResolved: "trained knowledge",
        topic,
        intentHint: /(?:اشرح|وضح|ما هو|ماهو)/.test(normalized) ? "knowledge_lookup" : "memory_recall",
        confidence: 0.95,
        reason: "User references stored or trained knowledge."
      };
    }

    return {
      conversationType: "standalone",
      contextUsed: false,
      topic,
      confidence: 0.5,
      reason: "No conversation inheritance required."
    };
  }

  private pickBestCandidate(candidates: Candidate[]): Candidate | null {
    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.confidence - a.confidence)[0] || null;
  }

  private normalize(input: string): string {
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

  private safeRegex(pattern: string): RegExp {
    try {
      return new RegExp(pattern, "i");
    } catch {
      return /$a/;
    }
  }

  private extractTopic(normalized: string): string | undefined {
    const match = normalized.match(/(?:صفحه|صفحة|page|component|ملف)\s+([\w\u0600-\u06FF-]+)/i)
      || normalized.match(/\b(gallery|dashboard|pricing|credits|login|provider|model)\b/i);
    return match?.[1] || match?.[0];
  }

  private toRequestedIntent(intent: SupportedIntent): SupportedIntent {
    return LEGACY_INTENT_MAP[intent] || intent;
  }

  private isWorkflowIntent(intent: SupportedIntent): boolean {
    return [
      "code_generation",
      "code_modification",
      "bug_fix",
      "code_review",
      "workspace_query",
      "workspace_scan",
      "architecture_question"
    ].includes(intent);
  }

  private pushHistory(sessionId: string, result: IntentClassificationResult): void {
    const next = [...(IntentEngine.history.get(sessionId) || []), result].slice(-20);
    IntentEngine.history.set(sessionId, next);
  }

  private pipelineFor(intent: SupportedIntent): string {
    const rule = this.rules.find((item) => item.intent === intent);
    if (rule?.pipeline) return rule.pipeline;
    const map: Partial<Record<SupportedIntent, string>> = {
      memory_save: "memory.write",
      training_ingest: "training.ingest",
      memory_recall: "memory.read",
      knowledge_lookup: "knowledge.retrieve",
      knowledge_list: "knowledge.list",
      workspace_query: "workspace.query",
      workspace_scan: "workspace.scan",
      project_navigation: "workspace.navigate",
      code_generation: "engineering.generate",
      code_modification: "engineering.modify",
      bug_fix: "engineering.fix",
      code_review: "engineering.review",
      architecture_question: "architecture.explain",
      external_research: "research.external",
      vision_analysis: "vision.analyze",
      translation: "language.translate",
      conversation: "conversation.respond"
    };
    return map[intent] || "conversation.respond";
  }

  private toolsFor(intent: SupportedIntent): string[] {
    const rule = this.rules.find((item) => item.intent === intent);
    if (rule?.tools) return rule.tools;
    const map: Partial<Record<SupportedIntent, string[]>> = {
      memory_save: ["EngineeringMemory"],
      training_ingest: ["KnowledgeIngestionService"],
      memory_recall: ["EngineeringMemory"],
      knowledge_lookup: ["PreAnswerReviewService", "ContextEngine"],
      workspace_query: ["ContextEngine"],
      workspace_scan: ["WorkspaceAnalyzer"],
      external_research: ["BraveAnswersService"],
      vision_analysis: ["VisionAnalyzer"]
    };
    return map[intent] || ["ConversationStateEngine"];
  }

  public async classifyWithLLM(prompt: string, language: string): Promise<IntentClassificationResult> {
    return {
      intent: "conversation",
      confidence: 0.5,
      source: "llm",
      language,
      matchedPattern: "llm disabled in deterministic intent v2",
      reason: `No deterministic intent matched for: ${prompt.slice(0, 80)}`,
      selectedPipeline: "conversation.respond",
      selectedTools: ["ConversationStateEngine"]
    };
  }

  public static shouldOverrideComposer(intent: SupportedIntent): boolean {
    const overrideIntents: SupportedIntent[] = [
      "memory_save",
      "training_ingest",
      "memory_recall",
      "knowledge_lookup",
      "knowledge_list",
      "workspace_query",
      "workspace_scan",
      "project_navigation",
      "external_research",
      "vision_analysis",
      "translation",
      "conversation",
      "friendly_expression",
      "emotional_expression",
      "frustration",
      "clarification_request",
      "contextual_followup"
    ];
    return overrideIntents.includes(intent);
  }
}

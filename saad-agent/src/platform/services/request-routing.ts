import { ResearchGatewayService } from "./research-gateway.js";
import { ModelExpertiseExtractionService } from "./model-expertise-extraction.js";
import type { SupportedIntent } from "./intent-engine.js";

export type RequestRouteKind =
  | "deterministic_answer"
  | "memory_save"
  | "memory_recall"
  | "knowledge_lookup"
  | "training_ingest"
  | "external_research"
  | "url_read"
  | "engineering_review"
  | "engineering_modify"
  | "inline_image_generation"
  | "image_prompt_draft"
  | "conversation";

export interface RequestRouteDecision {
  kind: RequestRouteKind;
  intent: SupportedIntent;
  pipeline: string;
  tools: string[];
  reason: string;
  confidence: number;
  requiresModel: boolean;
  allowsTrainingFallback: boolean;
}

export class RequestRoutingService {
  static classify(prompt: string): RequestRouteDecision {
    const raw = String(prompt || "").trim();
    const normalized = this.normalizeArabic(raw);
    const lower = raw.toLowerCase();
    const haystack = `${normalized} ${lower}`;

    if (ModelExpertiseExtractionService.isExtractionRequest(raw)) {
      return this.route("training_ingest", "training_ingest", "training.expertise.extract", ["ModelExpertiseExtractionService"], "Expertise extraction must use its provider-aware training pipeline.", 0.99, true, false);
    }

    if (this.isProjectAuditOrRepairInstruction(raw, normalized)) {
      const inspectFirst = this.isInspectFirstProjectRequest(raw, normalized);
      return this.route(
        inspectFirst ? "engineering_review" : "engineering_modify",
        inspectFirst ? "code_review" : "code_modification",
        inspectFirst ? "engineering.review" : "engineering.modify",
        inspectFirst ? ["ContextEngine", "ValidationPipeline"] : ["ContextEngine", "Filesystem", "ValidationPipeline"],
        inspectFirst ? "Project audit/report-first request." : "Project repair/modification request.",
        0.98,
        true,
        false
      );
    }

    if (this.isSavedKnowledgeLookupRequest(raw, normalized)) {
      return this.route("knowledge_lookup", "knowledge_lookup", "knowledge.retrieve", ["KnowledgeIngestionService"], "User explicitly asked for saved/local/training knowledge.", 0.98, false, false);
    }

    if (this.isMemoryRecallRequest(raw, normalized)) {
      return this.route("memory_recall", "memory_recall", "memory.read", ["EngineeringMemory"], "User asked to recall stored personal memory.", 0.97, false, false);
    }

    if (this.isMemorySaveRequest(raw, normalized)) {
      return this.route("memory_save", "memory_save", "memory.write", ["EngineeringMemory"], "User explicitly asked to save/remember information.", 0.97, false, false);
    }

    if (this.isTrainingIngestRequest(raw, normalized)) {
      return this.route("training_ingest", "training_ingest", "training.ingest", ["KnowledgeIngestionService"], "User asked to train/save a reference.", 0.96, false, false);
    }

    if (this.isUrlContentReadRequest(raw, normalized)) {
      return this.route("url_read", "conversation", "url.read_and_index", ["UrlTrainingService"], "Concrete URL read/import request.", 0.96, true, false);
    }

    if (this.isInlineImageGenerationRequest(raw, normalized)) {
      return this.route("inline_image_generation", "image_generation", "creative.inline_image", ["CreativeService"], "User asked to generate/show an actual image inside chat.", 0.95, false, false);
    }

    if (ResearchGatewayService.isImagePromptDraftRequest(raw)) {
      return this.route("image_prompt_draft", "conversation", "creative.prompt_draft", [], "User asked to write an image prompt, not generate/search an image.", 0.94, false, false);
    }

    if (this.isStrictLocalAnswerRequest(raw, normalized)) {
      return this.route("deterministic_answer", "conversation", "local.deterministic_answer", [], "User constrained the answer to no tools/search/final-only.", 0.9, false, false);
    }

    if (
      this.isUrlScopedExternalSearch(raw, normalized)
      || ResearchGatewayService.isMediaSearchRequest(raw)
      || ResearchGatewayService.isSocialProfileSearchRequest(raw)
      || ResearchGatewayService.isPublicPageLookupRequest(raw)
      || this.isExplicitExternalResearch(raw, normalized)
    ) {
      return this.route("external_research", "external_research", "research.external", ["ResearchGatewayService"], "Live external research or media lookup request.", 0.96, false, false);
    }

    return this.route("conversation", "conversation", "chat.model", ["ReasoningEngine"], "Ordinary conversation after deterministic, memory, knowledge, research, and engineering gates.", 0.5, true, false);
  }

  static normalizeArabic(input: string): string {
    return String(input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u0625\u0623\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064a")
      .replace(/\u0629/g, "\u0647")
      .replace(/[\u061F?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static route(
    kind: RequestRouteKind,
    intent: SupportedIntent,
    pipeline: string,
    tools: string[],
    reason: string,
    confidence: number,
    requiresModel: boolean,
    allowsTrainingFallback: boolean
  ): RequestRouteDecision {
    return { kind, intent, pipeline, tools, reason, confidence, requiresModel, allowsTrainingFallback };
  }

  private static isMemorySaveRequest(prompt: string, normalized: string): boolean {
    if (this.isProjectAuditOrRepairInstruction(prompt, normalized)) return false;
    if (this.isQuestionLike(prompt, normalized)) return false;
    const lower = prompt.toLowerCase();
    const startsWithSave = /^(?:\u0627\u062d\u0641\u0638|\u062a\u0630\u0643\u0631|\u062a\u0630\u0643\u0651\u0631|\u062e\u0632\u0646|\u062e\u0632\u0651\u0646|\u0633\u062c\u0644|\u0633\u062c\u0651\u0644|\u062b\u0628\u062a|\u062b\u0628\u0651\u062a)\b/.test(normalized)
      || /^(?:remember|save|store|memorize)\b/i.test(lower.trim());
    const saveSignal = /(?:^|\s)(?:\u0627\u062d\u0641\u0638|\u062d\u0641\u0638|\u062a\u0630\u0643\u0631|\u062a\u0630\u0643\u0651\u0631|\u062e\u0632\u0646|\u062e\u0632\u0651\u0646|\u0633\u062c\u0644|\u0633\u062c\u0651\u0644|\u062b\u0628\u062a|\u062b\u0628\u0651\u062a)(?:\s|$)/.test(normalized)
      || /\b(?:remember|save|store|memorize)\b/i.test(lower);
    return startsWithSave || saveSignal;
  }

  private static isMemoryRecallRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    if (/(?:\u0645\u0627|\u0634\u0646\u0648|what).{0,40}(?:\u0627\u0644\u0631\u0642\u0645|\u0631\u0642\u0645|number).{0,40}(?:\u062a\u0630\u0643\u0631|\u062a\u0630\u0643\u0631\u0647|\u0627\u062a\u0630\u0643\u0631|\u062d\u0641\u0638|remember|asked you to remember)/i.test(`${normalized} ${lower}`)) return true;
    return /(\u0645\u0646 \u0627\u0646\u0627|\u0645\u0646 \u0627\u0646\u064a|\u0645\u0646\u0648 \u0627\u0646\u064a|\u0645\u0646\u0648 \u0627\u0646\u0627|\u0645\u0627 \u0627\u0633\u0645\u064a|\u0634\u0646\u0648 \u0627\u0633\u0645\u064a|\u062a\u0639\u0631\u0641\u0646\u064a|\u062a\u062a\u0630\u0643\u0631\u0646\u064a|\u0645\u0627\u0630\u0627 \u062a\u0639\u0631\u0641 \u0639\u0646\u064a|\u0634\u0646\u0648 \u062a\u0630\u0643\u0631|\u0634\u0646\u0648 \u062d\u0627\u0641\u0638|\u0645\u0639\u0644\u0648\u0645\u0627\u062a\u064a|what do you remember about me|what do you know about me|who am i|what is my name|do you know me)/i.test(`${normalized} ${lower}`);
  }

  private static isTrainingIngestRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /\b(train|training|learn from|use as reference|save as reference|store as reference)\b/i.test(lower)
      || /(?:^|\s)(?:\u062f\u0631\u0628|\u062f\u0631\u0651\u0628|\u062a\u062f\u0631\u064a\u0628).*(?:\u0646\u0641\u0633\u0643|\u0627\u0644\u0645\u0644\u0641|\u0627\u0644\u0645\u0631\u0641\u0642|\u0627\u0644\u0635\u0648\u0631\u0647|\u0627\u0644\u0635\u0648\u0631\u0629)/.test(normalized)
      || /(?:\u0647\u0630\u0627|\u0647\u0630\u0647|\u0647\u0630\u064a|\u0647\u0627\u064a|\u0627\u0644\u0645\u0644\u0641|\u0627\u0644\u0635\u0648\u0631\u0647|\u0627\u0644\u0635\u0648\u0631\u0629|\u0627\u0644\u0645\u0631\u0641\u0642).*(?:\u0644\u0644\u062a\u062f\u0631\u064a\u0628|\u0645\u0631\u062c\u0639)/.test(normalized);
  }

  private static isSavedKnowledgeLookupRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /(?:\u0645\u0646|\u062d\u0633\u0628|\u0627\u0639\u062a\u0645\u062f\s+\u0639\u0644\u0649).{0,35}(?:\u0645\u0639\u0631\u0641\u062a\u0643|\u0627\u0644\u0645\u0639\u0631\u0641\u0647|\u0627\u0644\u062a\u062f\u0631\u064a\u0628|\u0627\u0644\u0630\u0627\u0643\u0631\u0647).{0,35}(?:\u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0647|\u0627\u0644\u0645\u062e\u0632\u0648\u0646\u0647)/i.test(normalized)
      || /\b(?:saved|stored|local|training)\s+knowledge\b/i.test(lower)
      || /\b(?:from|using|based on)\s+your\s+(?:saved|stored|local|training)?\s*knowledge\b/i.test(lower)
      || /\bknowledge\s+base\b/i.test(lower);
  }

  private static isUrlContentReadRequest(prompt: string, normalized: string): boolean {
    if (!/https?:\/\/[^\s)>\]"]+/i.test(prompt)) return false;
    const lower = prompt.toLowerCase();
    const readSignal = /(?:^|\s)(?:\u0627\u0642\u0631\u0627|\u0627\u0641\u062a\u062d|\u0641\u062a\u062d|\u0644\u062e\u0635|\u062d\u0644\u0644|راقب|تابع)(?:\s|$)/i.test(normalized)
      || /(?:\u0645\u062d\u062a\u0648\u0627\u0647|\u0645\u062d\u062a\u0648\u0649|\u0627\u0644\u0635\u0641\u062d\u0647|\u0627\u0644\u0635\u0641\u062d\u0629|\u0627\u0644\u062a\u062d\u062f\u064a\u062b\u0627\u062a|\u0627\u0644\u062c\u062f\u064a\u062f\u0629)/i.test(normalized)
      || /\b(read|open|summarize|analyse|analyze|content|page|monitor|watch|updates|changelog)\b/i.test(lower);
    const searchSignal = /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634)(?:\s|$)/i.test(normalized)
      || /\b(search|find|look up|research)\b/i.test(lower);
    return readSignal && !searchSignal;
  }

  private static isUrlScopedExternalSearch(prompt: string, normalized: string): boolean {
    if (!/https?:\/\/[^\s)>\]"]+/i.test(prompt)) return false;
    if (this.hasLocalScope(prompt, normalized)) return false;
    return /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a|\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634)(?:\s|$)/i.test(normalized)
      || /\b(search|find|look up|research)\b/i.test(prompt);
  }

  private static isExplicitExternalResearch(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    if (this.hasLocalScope(prompt, normalized)) return false;
    if (this.isStrictLocalAnswerRequest(prompt, normalized)) return false;
    return /\b(search online|search web|web search|internet search|latest|current|recent)\b/i.test(lower)
      || /(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0641\u064a\u062f\u064a\u0648|\u0645\u0642\u0637\u0639|\u0635\u0648\u062a|\u064a\u0648\u062a\u064a\u0648\u0628|\u0627\u062e\u0628\u0627\u0631|\u0648\u062b\u0627\u0626\u0642)/i.test(normalized)
      || /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a|\u0628\u062d\u062b|\u062f\u0648\u0631|\u062f\u0648\u0631\u0644\u064a|\u0641\u062a\u0634|\u0647\u0627\u062a\u0644\u064a|\u062c\u064a\u0628\u0644\u064a)(?:\s|$)/i.test(normalized);
  }

  private static isInlineImageGenerationRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const haystack = `${normalized} ${lower}`;
    const imageTerm = /(?:\u0635\u0648\u0631|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631\u0629|\bimage\b|\bphoto\b|\bpicture\b)/i.test(haystack);
    const generationIntent = /(?:\u0648\u0644\u062f|\u0648\u0644\u0651\u062f|\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0635\u0646\u0639|\u0627\u0631\u0633\u0645|\u0635\u0645\u0645|\u0633\u0648\u064a|\u0627\u0639\u0645\u0644|\u0627\u0639\u0631\u0636\u0647\u0627|\u0627\u0639\u0631\u0636\s+\u0635\u0648\u0631\u0629|\bgenerate\b|\bcreate\b|\bmake\b|\bdraw\b|\brender\b|\bshow\b)/i.test(haystack);
    const explicitSearch = /(?:\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634|\u0628\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0645\u0646\s+\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\bsearch\b|\bfind\b|\binternet\b|\bonline\b)/i.test(haystack);
    return imageTerm && generationIntent && !explicitSearch;
  }

  private static isStrictLocalAnswerRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const combined = `${normalized} ${lower}`;
    return /\u0644\u0627\s+\u062a\u0628\u062d\u062b|\u0628\u062f\u0648\u0646\s+\u0628\u062d\u062b|\u0644\u0627\s+\u062a\u0633\u062a\u062e\u062f\u0645.{0,30}(?:\u0628\u062d\u062b|\u0627\u062f\u0627\u0647|\u0623\u062f\u0627\u0629|\u0627\u062f\u0648\u0627\u062a|\u0623\u062f\u0648\u0627\u062a)/i.test(combined)
      || /\bdo not use (?:any )?tools?\b|\bdon't use (?:any )?tools?\b|\bdo not search\b|\bno search\b|\bwithout tools?\b/i.test(combined)
      || /(?:\u0627\u0644\u0646\u062a\u064a\u062c\u0647\s+\u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0647|\u0627\u0644\u0646\u062a\u064a\u062c\u0629\s+\u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629).{0,30}\u0641\u0642\u0637/i.test(combined)
      || /\u0627\u062c\u0628.{0,30}\u0641\u0642\u0637|\u0623\u062c\u0628.{0,30}\u0641\u0642\u0637/i.test(combined)
      || /\bfinal result only\b|\banswer only\b|\bone word only\b/i.test(combined);
  }

  private static isProjectAuditOrRepairInstruction(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const compact = `${normalized} ${lower}`;
    const startsAsExplicitMemory = /^(?:\u0627\u062d\u0641\u0638|\u062a\u0630\u0643\u0631|\u062e\u0632\u0646|\u0633\u062c\u0644|\u062b\u0628\u062a)\b/.test(normalized)
      || /^(?:remember|save|store|memorize)\b/i.test(lower.trim());
    if (startsAsExplicitMemory) return false;

    const projectSignals = /(?:\u0645\u0634\u0631\u0648\u0639|\u0645\u0644\u0641|\u0645\u0644\u0641\u0627\u062a|\u0643\u0648\u062f|\u0648\u064a\u0628|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629|\u0635\u0641\u062d\u0627\u062a|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|api|typescript|build|framework|frontend|backend|database|auth|login|env|gallery|generate|generation)/i.test(compact);
    const auditOrRepair = /(?:\u0627\u0641\u062d\u0635|\u0641\u062d\u0635|\u0631\u0627\u062c\u0639|\u062d\u0644\u0644|\u062d\u062f\u062f|\u062a\u0642\u0631\u064a\u0631|\u0627\u0644\u0645\u0634\u0627\u0643\u0644|\u0645\u0634\u0627\u0643\u0644|\u062e\u0637\u0648\u0631\u0629|\u0627\u0635\u0644\u062d|\u0635\u0644\u062d|\u0627\u0636\u0641|\u0627\u0645\u0646\u0639|inspect|audit|review|analyze|report|risk|solution|fix|add|prevent|show error)/i.test(compact);
    const structuredTask = /(?:^|\n)\s*(?:\d+|[0-9]+)[-.)]\s+/.test(prompt)
      || /(?:\u0627\u0644\u0645\u0647\u0645\u0629|\u0642\u0648\u0627\u0639\u062f\s+\u0645\u0647\u0645\u0629|\btask\b|\brules\b)/i.test(compact);
    return projectSignals && auditOrRepair && (structuredTask || prompt.length > 300);
  }

  private static isInspectFirstProjectRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /(?:\u0644\u0627\s+\u062a\u0639\u062f\u0644|\u0644\u0627\s+\u062a\u0639\u062f\u0651\u0644|\u0627\u0648\u0644\u0627|\u0623\u0648\u0644\u0627|\u0642\u0628\u0644\s+\u062a\u0646\u0641\u064a\u0630|\u0642\u0628\u0644\s+\u0627\u064a\s+\u062a\u0639\u062f\u064a\u0644|\u062a\u0642\u0631\u064a\u0631\s+\u0627\u0644\u0641\u062d\u0635)/i.test(normalized)
      || /\b(do not edit|do not modify|before any edit|before making changes|inspection report|audit report|report first)\b/i.test(lower);
  }

  private static isQuestionLike(prompt: string, normalized: string): boolean {
    return /[?؟]/.test(prompt)
      || /^(?:\u0645\u0627|\u0645\u0627\u0630\u0627|\u0634\u0646\u0648|\u0644\u064a\u0634|\u0647\u0644|\u0627\u064a\u0646|\u0648\u064a\u0646|\u0645\u062a\u0649|\u0643\u0645|\u0643\u064a\u0641)\b/.test(normalized)
      || /^(?:what|why|where|when|how|is|are|do|does|did)\b/i.test(prompt.trim());
  }

  private static hasLocalScope(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /(?:\u062f\u0627\u062e\u0644\s+\u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u0641\u064a\s+\u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u062f\u0627\u062e\u0644\s+\u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u062f\u0627\u062e\u0644\s+\u0627\u0644\u0643\u0648\u062f|\u0641\u0648\u0644\u062f\u0631|\u0645\u062c\u0644\u062f)/i.test(normalized)
      || /[a-z]:[\\/]/i.test(lower)
      || /\b(workspace|codebase|local files|project files|folder|directory)\b/i.test(lower);
  }
}

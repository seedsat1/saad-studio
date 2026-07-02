import * as fsp from "fs/promises";
import * as path from "path";
import { getGlobalAppDataDir } from "../workspace-manager.js";

export type DecisionOutcome =
  | "ANSWER"
  | "EXPLAIN"
  | "SEARCH"
  | "ANALYZE"
  | "INVESTIGATE"
  | "DOCUMENT"
  | "PLAN"
  | "WAIT_FOR_CLARIFICATION"
  | "WAIT_FOR_APPROVAL"
  | "IMPLEMENT"
  | "REJECT";

export interface ExecutionDecisionResult {
  decision: DecisionOutcome;
  requiresApproval: boolean;
  reason: string;
  workflow: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  evidenceStatus: "VERIFIED" | "NOT_VERIFIED";
}

export class ExecutionPolicyService {
  private static async auditPath(): Promise<string> {
    const appData = await getGlobalAppDataDir();
    return path.join(appData, "execution-policy-audit.jsonl");
  }

  static async evaluateDecision(
    prompt: string,
    workspacePath?: string,
    approvalMode?: string,
    conversationId?: string
  ): Promise<ExecutionDecisionResult> {
    const userFacingPrompt = this.extractUserFacingPrompt(prompt);
    const normalizedPrompt = userFacingPrompt.trim().toLowerCase();
    const normalizedArabicPrompt = this.normalizeArabic(userFacingPrompt);

    // 1. Classification & Outcomes
    let isModificationRequired = false;
    let isDangerous = false;
    let requiresApproval = false;
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    let decision: DecisionOutcome = "ANSWER";
    let reason = "The request is informational and can be answered without modifying the project.";
    let workflow = "casual_discussion";
    let evidenceStatus: "VERIFIED" | "NOT_VERIFIED" = workspacePath ? "VERIFIED" : "NOT_VERIFIED";

    // Detect if prompt requests project modification. This must understand Arabic/Iraqi
    // engineering phrasing, not only English verbs.
    if (this.isProjectModificationRequest(normalizedPrompt, normalizedArabicPrompt)) {
      isModificationRequired = true;
    }
    const isExternalResearchRequired = this.isExternalResearchRequest(normalizedPrompt, normalizedArabicPrompt);

    // Detect dangerous/destructive directives
    if (
      normalizedPrompt.includes("rm -rf") ||
      normalizedPrompt.includes("delete database") ||
      normalizedPrompt.includes("destroy") ||
      normalizedPrompt.includes("nuke")
    ) {
      isDangerous = true;
    }

    if (isDangerous) {
      decision = "REJECT";
      requiresApproval = false;
      riskLevel = "critical";
      reason = "Safety check failed: Dangerous command or destructive action detected.";
      workflow = "safety_rejection";
    } else if (isModificationRequired) {
      riskLevel = "medium";
      workflow = "engineering_workflow";
      if (approvalMode === "ask") {
        requiresApproval = true;
        decision = "WAIT_FOR_APPROVAL";
        reason = "Project modification requires explicit user authorization under 'ask' mode.";
      } else {
        decision = "PLAN";
        reason = "Project modification requested; generating execution plan.";
      }
    } else if (isExternalResearchRequired) {
      riskLevel = "medium";
      workflow = "external_research";
      if (approvalMode === "ask") {
        requiresApproval = true;
        decision = "WAIT_FOR_APPROVAL";
        reason = "Internet access requires explicit user authorization under 'ask' mode.";
      } else {
        decision = "SEARCH";
        reason = "External web research requested.";
      }
    } else {
      // Informational path
      if (normalizedPrompt.includes("explain") || normalizedPrompt.includes("why") || normalizedPrompt.includes("how")) {
        decision = "EXPLAIN";
        reason = "Informational request requiring explanation of codebase patterns or behavior.";
      } else if (normalizedPrompt.includes("search") || normalizedPrompt.includes("find")) {
        decision = "SEARCH";
        reason = "Search request scanning local directory metadata or knowledge archives.";
      } else {
        decision = "ANSWER";
      }
    }

    const result: ExecutionDecisionResult = {
      decision,
      requiresApproval,
      reason,
      workflow,
      riskLevel,
      evidenceStatus
    };

    // Log decision audit entry asynchronously
    void this.logDecision(userFacingPrompt, result, conversationId);

    return result;
  }

  private static extractUserFacingPrompt(prompt: string): string {
    const raw = (prompt || "").trim();
    const marker = raw.match(/(?:^|\n)User request:\s*\n?/i);
    if (!marker || marker.index === undefined) return raw;
    const requestStart = marker.index + marker[0].length;
    const request = raw.slice(requestStart).trim();
    return request || raw;
  }

  private static normalizeArabic(input: string): string {
    return (input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[؟?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static isProjectModificationRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    const englishModification = /\b(create|write|delete|fix|implement|update|modify|add|replace|repack|run|build|generate|refactor|remove|edit)\b/i.test(lowerPrompt);
    if (englishModification) return true;

    const arabicAction = /(?:^|\s)(?:اريد|ابي|احتاج|سوي|سو|اعمل|اصنع|ابني|اكتب|اضف|زد|انشئ|انشء|انشا|انشاء|عدل|عدله|غير|بدل|طبق|حدث|اصلح|صلح|احذف|ارفع|غلف|شغل|نفذ)(?:\s|$)/.test(normalizedArabic);
    const engineeringTarget = /(?:صفحه|صفحات|page|component|مكون|كومبوننت|route|راوت|api|كود|ملف|فولدر|مشروع|واجهه|واجهة|زر|مودل|مزود|provider|model|settings|composer|chat|محادثه|محادثة|نافذه|نافذة)/i.test(normalizedArabic);
    const directEngineeringPhrase = /(?:انشئ|انشء|انشا|انشاء|سوي|اصنع|ابني|اضف|اكتب).*(?:صفحه|صفحات|مكون|كومبوننت|api|route|راوت|كود|ملف|واجهه|واجهة)/i.test(normalizedArabic)
      || /(?:اصلح|صلح|عدل|غير|بدل|حدث|طبق).*(?:خطا|خطأ|مشكله|مشكلة|bug|error|كود|صفحه|صفحة|واجهه|واجهة)/i.test(normalizedArabic);

    return directEngineeringPhrase || (arabicAction && engineeringTarget);
  }

  private static isExternalResearchRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    if (/\b(search online|search web|web search|internet search|latest|current|recent)\b/i.test(lowerPrompt)) {
      return true;
    }
    const localScope = /(داخل المشروع|في المشروع|بالمشروع|داخل الملفات|في الملفات|بالملفات|داخل الكود|في الكود|workspace|project files|local files|codebase)/i.test(normalizedArabic)
      || /\b(workspace|codebase|local files|project files)\b/i.test(lowerPrompt);
    const explicitWeb = /(الانترنت|الإنترنت|انترنت|الويب|ويب|روابط|مصادر|لنكات|لينكات|اخبار|أخبار|وثائق|توثيق)/i.test(normalizedArabic)
      || /\b(web|internet|online|links|sources|docs|documentation|news)\b/i.test(lowerPrompt);
    if (explicitWeb) return true;

    const directSearchVerb = /(?:^|\s)(?:ابحثلي|ابحث\s+لي|ابحث|بحث|دورلي|دور\s+لي|دور|فتشلي|فتش\s+لي|فتش|جيبلي\s+معلومات|جيب\s+لي\s+معلومات|هاتلي\s+معلومات|هات\s+لي\s+معلومات|طلعلي\s+معلومات|طلع\s+لي\s+معلومات)(?:\s|$)/i.test(normalizedArabic)
      || /\b(search for|look up|research|find info about|find information about)\b/i.test(lowerPrompt);
    const externalTopicSignal = /[A-Za-z][A-Za-z0-9_.\-/]*(?:\s+\d+(?:\.\d+)*)?/i.test(lowerPrompt)
      || /\d+(?:\.\d+)+/.test(lowerPrompt)
      || /(موديل|نموذج|شركة|منتج|منصة|خدمة|تقنية|اصدار|إصدار|نسخه|نسخة|معلومات|تفاصيل|سعر|اسعار|أسعار)/i.test(normalizedArabic);
    if (directSearchVerb && externalTopicSignal && !localScope) {
      return true;
    }

    const searchWords = ["ابحث", "بحث", "دور", "فتش"];
    const internetWords = ["الانترنت", "الإنترنت", "انترنت", "الويب", "ويب"];
    return searchWords.some((word) => normalizedArabic.includes(this.normalizeArabic(word)))
      && internetWords.some((word) => normalizedArabic.includes(this.normalizeArabic(word)));
  }

  private static async logDecision(
    prompt: string,
    result: ExecutionDecisionResult,
    conversationId?: string
  ): Promise<void> {
    try {
      const auditFile = await this.auditPath();
      await fsp.mkdir(path.dirname(auditFile), { recursive: true });
      const entry = {
        timestamp: new Date().toISOString(),
        conversationId: conversationId || "unknown",
        prompt: prompt.slice(0, 500),
        decision: result.decision,
        requiresApproval: result.requiresApproval,
        reason: result.reason,
        workflow: result.workflow,
        riskLevel: result.riskLevel,
        evidenceStatus: result.evidenceStatus
      };
      await fsp.appendFile(auditFile, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Execution policy audit logging skipped: ${message}`);
    }
  }
}

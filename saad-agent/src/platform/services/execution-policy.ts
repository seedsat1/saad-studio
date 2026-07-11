import * as fsp from "fs/promises";
import * as path from "path";
import { getGlobalAppDataDir } from "../workspace-manager.js";
import { ResearchGatewayService } from "./research-gateway.js";
import { RequestRoutingService } from "./request-routing.js";

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

    let isModificationRequired = false;
    let isDangerous = false;
    let requiresApproval = false;
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    let decision: DecisionOutcome = "ANSWER";
    let reason = "The request is informational and can be answered without modifying the project.";
    let workflow = "casual_discussion";
    const evidenceStatus: "VERIFIED" | "NOT_VERIFIED" = workspacePath ? "VERIFIED" : "NOT_VERIFIED";
    const requestRoute = RequestRoutingService.classify(userFacingPrompt);

    const isLocalImageClassification = this.isLocalImageClassificationRequest(
      normalizedPrompt,
      normalizedArabicPrompt
    );
    const isLocalFilesystemSearch = this.isLocalFilesystemSearchRequest(
      normalizedPrompt,
      normalizedArabicPrompt
    );
    const isUrlScopedExternalSearch = this.isUrlScopedExternalSearchRequest(
      normalizedPrompt,
      normalizedArabicPrompt
    );
    const isUrlContentRead = this.isUrlContentReadRequest(
      normalizedPrompt,
      normalizedArabicPrompt
    );
    const isProjectAuditOrRepair = requestRoute.kind === "engineering_review" || requestRoute.kind === "engineering_modify" || this.isProjectAuditOrRepairInstruction(
      normalizedPrompt,
      normalizedArabicPrompt
    );

    if (!isProjectAuditOrRepair && this.isProjectModificationRequest(normalizedPrompt, normalizedArabicPrompt)) {
      isModificationRequired = true;
    }
    const isExternalResearchRequired = !isProjectAuditOrRepair && !isUrlContentRead && (
      requestRoute.kind === "external_research"
      ||
      isUrlScopedExternalSearch
      || ResearchGatewayService.isMediaSearchRequest(userFacingPrompt)
      || ResearchGatewayService.isSocialProfileSearchRequest(userFacingPrompt)
      || ResearchGatewayService.isPublicPageLookupRequest(userFacingPrompt)
      || this.isExternalResearchRequest(normalizedPrompt, normalizedArabicPrompt)
    );

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
    } else if (isProjectAuditOrRepair) {
      riskLevel = "low";
      workflow = requestRoute.kind === "engineering_modify" ? "engineering_workflow" : "engineering_review";
      decision = requestRoute.kind === "engineering_modify" ? "PLAN" : "ANALYZE";
      requiresApproval = requestRoute.kind === "engineering_modify" && approvalMode === "ask";
      reason = requestRoute.reason || "Project audit or repair requested.";
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
    } else if (isLocalImageClassification) {
      riskLevel = "medium";
      workflow = "local_image_classification";
      if (approvalMode === "ask") {
        requiresApproval = true;
        decision = "WAIT_FOR_APPROVAL";
        reason = "Local image folder classification may inspect and organize files and requires explicit user authorization under 'ask' mode.";
      } else {
        decision = "PLAN";
        reason = "Local image folder classification requested; route to local classifier workflow without using the text model.";
      }
    } else if (isLocalFilesystemSearch) {
      riskLevel = "low";
      workflow = "local_filesystem_search";
      decision = "SEARCH";
      requiresApproval = false;
      reason = "Local trusted-workspace file search requested; use the filesystem search runtime without invoking the model.";
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
    } else {
      if (/\b(explain|why|how)\b/i.test(normalizedPrompt)) {
        decision = "EXPLAIN";
        reason = "Informational request requiring explanation of codebase patterns or behavior.";
      } else if (/\b(search|find)\b/i.test(normalizedPrompt)) {
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
      .replace(/[\u0625\u0623\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064a")
      .replace(/\u0629/g, "\u0647")
      .replace(/[\u061F?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static isProjectModificationRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    if (
      ResearchGatewayService.isSocialProfileSearchRequest(normalizedArabic || lowerPrompt)
      || ResearchGatewayService.isPublicPageLookupRequest(normalizedArabic || lowerPrompt)
    ) {
      return false;
    }

    const englishModification = /\b(create|write|delete|fix|implement|update|modify|add|replace|repack|run|build|generate|refactor|remove|edit)\b/i.test(lowerPrompt);
    if (englishModification) return true;

    const hasLocalFilesystemPath = /[a-z]:[\\/][^\r\n]+/i.test(lowerPrompt)
      || /(?:^|\s)(?:\.{1,2}[\\/]|~[\\/])/.test(lowerPrompt);
    const arabicAction = /(?:^|\s)(?:\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0627\u062d\u062a\u0627\u062c|\u0633\u0648\u064a|\u0633\u0648|\u0627\u0639\u0645\u0644|\u0627\u0635\u0646\u0639|\u0627\u0628\u0646\u064a|\u0627\u0643\u062a\u0628|\u0627\u0636\u0641|\u0632\u062f|\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0646\u0634\u0627|\u0627\u0646\u0634\u0627\u0621|\u0639\u062f\u0644|\u0639\u062f\u0644\u0647|\u063a\u064a\u0631|\u0628\u062f\u0644|\u0637\u0628\u0642|\u062d\u062f\u062b|\u0627\u0635\u0644\u062d|\u0635\u0644\u062d|\u0627\u062d\u0630\u0641|\u0627\u0631\u0641\u0639|\u063a\u0644\u0641|\u0634\u063a\u0644|\u0646\u0641\u0630|\u0627\u0646\u0638\u0631|\u0634\u0648\u0641|\u0627\u0641\u062d\u0635|\u0635\u0646\u0641|\u062a\u0635\u0646\u064a\u0641|\u0641\u0631\u0632|\u0631\u062a\u0628|\u0636\u0639|\u062d\u0637)(?:\s|$)/.test(normalizedArabic);
    const engineeringTarget = /(?:\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0627\u062a|page|component|\u0645\u0643\u0648\u0646|\u0643\u0648\u0645\u0628\u0648\u0646\u0646\u062a|route|\u0631\u0627\u0648\u062a|api|\u0643\u0648\u062f|\u0645\u0644\u0641|\u0641\u0648\u0644\u062f\u0631|\u0645\u0634\u0631\u0648\u0639|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629|\u0632\u0631|\u0645\u0648\u062f\u0644|\u0645\u0632\u0648\u062f|provider|model|settings|composer|chat|\u0645\u062d\u0627\u062f\u062b\u0647|\u0645\u062d\u0627\u062f\u062b\u0629|\u0646\u0627\u0641\u0630\u0647|\u0646\u0627\u0641\u0630\u0629|\u0635\u0648\u0631|\u0627\u0644\u0635\u0648\u0631|image|images|screenshot|screenshots)/i.test(normalizedArabic);
    const directEngineeringPhrase = /(?:\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0646\u0634\u0627|\u0627\u0646\u0634\u0627\u0621|\u0633\u0648\u064a|\u0627\u0635\u0646\u0639|\u0627\u0628\u0646\u064a|\u0627\u0636\u0641|\u0627\u0643\u062a\u0628).*(?:\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0627\u062a|\u0645\u0643\u0648\u0646|\u0643\u0648\u0645\u0628\u0648\u0646\u0646\u062a|api|route|\u0631\u0627\u0648\u062a|\u0643\u0648\u062f|\u0645\u0644\u0641|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629)/i.test(normalizedArabic)
      || /(?:\u0627\u0635\u0644\u062d|\u0635\u0644\u062d|\u0639\u062f\u0644|\u063a\u064a\u0631|\u0628\u062f\u0644|\u062d\u062f\u062b|\u0637\u0628\u0642).*(?:\u062e\u0637\u0627|\u062e\u0637\u0623|\u0645\u0634\u0643\u0644\u0647|\u0645\u0634\u0643\u0644\u0629|bug|error|\u0643\u0648\u062f|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629)/i.test(normalizedArabic);
    const localPathAction = /(?:^|\s)(?:\u0633\u0648\u064a|\u0633\u0648|\u0633\u0648\u0647|\u0627\u0639\u0645\u0644|\u0627\u0634\u062a\u063a\u0644|\u0634\u063a\u0644|\u062c\u0647\u0632|\u0631\u062a\u0628|\u0627\u0643\u062a\u0628|\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0628\u0646\u064a|\u0627\u0635\u0646\u0639|\u0639\u062f\u0644|\u0627\u0635\u0644\u062d|\u0635\u0644\u062d|\u0637\u0628\u0642|\u0627\u0646\u0638\u0631|\u0634\u0648\u0641|\u0627\u0641\u062d\u0635|\u0635\u0646\u0641|\u062a\u0635\u0646\u064a\u0641|\u0641\u0631\u0632|\u0636\u0639|\u062d\u0637)(?:\s|$)/.test(normalizedArabic)
      || /\b(create|make|build|write|implement|setup|set up|fix|edit|modify|add|work|inspect|analyze|classify|categorize|sort|organize|move)\b/i.test(lowerPrompt);
    const folderOrPathTarget = hasLocalFilesystemPath
      || /(?:\u0641\u0648\u0644\u062f|\u0641\u0648\u0644\u062f\u0631|\u0645\u062c\u0644\u062f|\u0645\u0633\u0627\u0631|\u0628\u0627\u062b|\u0641\u0631\u064a\u0645|\u0645\u0634\u0631\u0648\u0639|folder|directory|workspace|path|frame|starter|app)/i.test(normalizedArabic);

    return directEngineeringPhrase || (arabicAction && engineeringTarget) || (localPathAction && folderOrPathTarget);
  }

  private static isProjectAuditOrRepairInstruction(lowerPrompt: string, normalizedArabic: string): boolean {
    const compact = `${normalizedArabic} ${lowerPrompt}`;
    const projectSignals = /(?:\u0645\u0634\u0631\u0648\u0639|\u0645\u0644\u0641|\u0645\u0644\u0641\u0627\u062a|\u0643\u0648\u062f|\u0648\u064a\u0628|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629|\u0635\u0641\u062d\u0627\u062a|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|api|\u062a\u0633\u062c\u064a\u0644\s+\u0627\u0644\u062f\u062e\u0648\u0644|\u0642\u0627\u0639\u062f\u0629\s+\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a|\u0642\u0627\u0639\u062f\u0647\s+\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a|typescript|build|framework|frontend|backend|database|auth|login|env|gallery|generate|generation)/i.test(compact);
    const auditSignals = /(?:\u0627\u0641\u062d\u0635|\u0641\u062d\u0635|\u0631\u0627\u062c\u0639|\u062d\u0644\u0644|\u062d\u062f\u062f|\u062a\u0642\u0631\u064a\u0631|\u0627\u0644\u0645\u0634\u0627\u0643\u0644|\u0645\u0634\u0627\u0643\u0644|\u062e\u0637\u0648\u0631\u0629|\u0627\u0644\u062d\u0644\s+\u0627\u0644\u0645\u0642\u062a\u0631\u062d|\u0628\u0646\u064a\u0629\s+\u0627\u0644\u0645\u0634\u0631\u0648\u0639|inspect|audit|review|analyze|analyse|report|risk|solution|problems|issues)/i.test(compact);
    const inspectFirst = /(?:\u0644\u0627\s+\u062a\u0639\u062f\u0644|\u0644\u0627\s+\u062a\u0639\u062f\u0651\u0644|\u0642\u0628\u0644\s+\u062a\u0646\u0641\u064a\u0630|\u0642\u0628\u0644\s+\u0627\u064a\s+\u062a\u0639\u062f\u064a\u0644|\u062a\u0642\u0631\u064a\u0631\s+\u0627\u0644\u0641\u062d\u0635|\bbefore editing\b|\breport first\b|\bdo not edit\b|\bdo not modify\b)/i.test(compact);
    const structuredTask = /(?:^|\n)\s*(?:\d+|[0-9]+)[-.)]\s+/.test(lowerPrompt)
      || /(?:\u0627\u0644\u0645\u0647\u0645\u0629|\u0642\u0648\u0627\u0639\u062f\s+\u0645\u0647\u0645\u0629|\btask\b|\brules\b)/i.test(compact);
    return projectSignals && auditSignals && (inspectFirst || structuredTask || lowerPrompt.length > 350);
  }

  private static isLocalImageClassificationRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    const hasLocalFilesystemPath = /[a-z]:[\\/][^\r\n]+/i.test(lowerPrompt)
      || /(?:^|\s)(?:\.{1,2}[\\/]|~[\\/])/.test(lowerPrompt);
    const pageCreationTarget = /(?:\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0635\u0641\u062d\u0627\u062a|\u0645\u0639\u0631\u0636|gallery|page|website|landing|html|ui|interface)/i.test(normalizedArabic)
      || /\b(gallery|page|website|landing|html|ui|interface)\b/i.test(lowerPrompt);
    const pageCreationAction = /(?:\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0646\u0634\u0627|\u0627\u0646\u0634\u0627\u0621|\u0633\u0648\u064a|\u0633\u0648|\u0627\u0639\u0645\u0644|\u0627\u0628\u0646\u064a|\u0627\u0635\u0646\u0639|\u0635\u0645\u0645|\u0627\u0643\u062a\u0628|\u062c\u0647\u0632)/i.test(normalizedArabic)
      || /\b(create|make|build|design|write|generate|implement|setup|set up)\b/i.test(lowerPrompt);
    if (pageCreationTarget && pageCreationAction) return false;

    const imageScope = /(?:\u0635\u0648\u0631|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631\u0629|\u0627\u0644\u0635\u0648\u0631|screenshots?|images?)/i.test(normalizedArabic)
      || /\b(screenshots?|images?|pictures?)\b/i.test(lowerPrompt);
    const classifyOrInspect = /(?:\u0627\u0646\u0638\u0631|\u0634\u0648\u0641|\u0627\u0641\u062d\u0635|\u062d\u0644\u0644|\u0635\u0646\u0641|\u062a\u0635\u0646\u064a\u0641|\u0641\u0631\u0632|\u0631\u062a\u0628|\u0636\u0639|\u062d\u0637)/i.test(normalizedArabic)
      || /\b(inspect|analyze|classify|categorize|sort|organize|move)\b/i.test(lowerPrompt);
    const folderAction = /(?:\u0641\u0648\u0644\u062f\u0631|\u0641\u0648\u0644\u062f|\u0645\u062c\u0644\u062f|\u0645\u0633\u0627\u0631|\u062a\u0635\u0646\u064a\u0641|folder|directory|path|category)/i.test(normalizedArabic)
      || /\b(folder|directory|path|category)\b/i.test(lowerPrompt);
    return hasLocalFilesystemPath && imageScope && classifyOrInspect && folderAction;
  }

  private static isLocalFilesystemSearchRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    const hasSearchVerb = /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u062f\u0648\u0631|\u062f\u0648\u0631\u0644\u064a|\u062f\u0648\u0631\s+\u0644\u064a|\u0641\u062a\u0634|\u0641\u062a\u0634\u0644\u064a|\u0641\u062a\u0634\s+\u0644\u064a|\u0627\u0637\u0644\u0639|\u0637\u0644\u0639|\u0634\u0648\u0641)(?:\s|$)/i.test(normalizedArabic)
      || /\b(find|search|locate|look for)\b/i.test(lowerPrompt);
    const hasLocalScope = /(?:\u0643\u0645\u0628\u064a\u0648\u062a\u0631|\u0627\u0644\u062d\u0627\u0633\u0648\u0628|\u0627\u0644\u062c\u0647\u0627\u0632|\u0642\u0631\u0635|\u062f\u0631\u0627\u064a\u0641|\u0641\u0648\u0644\u062f\u0631|\u0641\u0648\u0644\u062f|\u0645\u062c\u0644\u062f|\u0645\u0633\u0627\u0631|\u0645\u0644\u0641|\u0645\u0644\u0641\u0627\u062a|\u0648\u0648\u0631\u062f|\u0648\u0631\u062f|\u0628\u064a\s+\u062f\u064a\s+\u0627\u0641|\u0635\u0648\u0631|screenshots?|desktop|documents|downloads|docx?|pdf)/i.test(normalizedArabic)
      || /[a-z]:[\\/]/i.test(lowerPrompt)
      || /\b(local|computer|folder|directory|file|files|word|docx|pdf|desktop|documents|downloads)\b/i.test(lowerPrompt);
    const explicitWeb = /(?:\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a|\u0648\u064a\u0628|\u0627\u0644\u0648\u064a\u0628|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0627\u062e\u0628\u0627\u0631|\u0623\u062e\u0628\u0627\u0631)/i.test(normalizedArabic)
      || /\b(internet|web|online|latest|current|links|sources|news)\b/i.test(lowerPrompt);
    return hasSearchVerb && hasLocalScope && !explicitWeb;
  }

  private static isUrlScopedExternalSearchRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    const hasHttpUrl = /https?:\/\/[^\s)>\]"]+/i.test(lowerPrompt);
    if (!hasHttpUrl) return false;

    const localScope = /(\u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u0641\u064a \u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u0628\u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u0641\u064a \u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u0628\u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u062f\u0627\u062e\u0644 \u0627\u0644\u0643\u0648\u062f|\u0641\u064a \u0627\u0644\u0643\u0648\u062f|workspace|project files|local files|codebase)/i.test(normalizedArabic)
      || /\b(workspace|codebase|local files|project files)\b/i.test(lowerPrompt);
    if (localScope) return false;

    return /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u0628\u062d\u062b|\u062f\u0648\u0631|\u062f\u0648\u0631\u0644\u064a|\u062f\u0648\u0631\s+\u0644\u064a|\u0641\u062a\u0634|\u0641\u062a\u0634\u0644\u064a|\u0641\u062a\u0634\s+\u0644\u064a)(?:\s|$)/i.test(normalizedArabic)
      || /\b(search|find|look up|research)\b/i.test(lowerPrompt);
  }

  private static isUrlContentReadRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    const hasHttpUrl = /https?:\/\/[^\s)>\]"]+/i.test(lowerPrompt);
    if (!hasHttpUrl) return false;
    const readSignal = /(?:^|\s)(?:\u0627\u0642\u0631\u0627|\u0627\u0641\u062a\u062d|\u0641\u062a\u062d|\u0644\u062e\u0635|\u062d\u0644\u0644)(?:\s|$)/i.test(normalizedArabic)
      || /(?:\u0645\u062d\u062a\u0648\u0627\u0647|\u0645\u062d\u062a\u0648\u0649|\u0627\u0644\u0635\u0641\u062d\u0647|\u0627\u0644\u0635\u0641\u062d\u0629)/i.test(normalizedArabic)
      || /\b(read|open|summarize|analyse|analyze|content|page)\b/i.test(lowerPrompt);
    const searchSignal = /(?:^|\s)(?:\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634)(?:\s|$)/i.test(normalizedArabic)
      || /\b(search|find|look up|research)\b/i.test(lowerPrompt);
    return readSignal && !searchSignal;
  }

  private static isExternalResearchRequest(lowerPrompt: string, normalizedArabic: string): boolean {
    if (/\b(search online|search web|web search|internet search|latest|current|recent)\b/i.test(lowerPrompt)) {
      return true;
    }
    const localScope = /(\u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u0641\u064a \u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u0628\u0627\u0644\u0645\u0634\u0631\u0648\u0639|\u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u0641\u064a \u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u0628\u0627\u0644\u0645\u0644\u0641\u0627\u062a|\u062f\u0627\u062e\u0644 \u0627\u0644\u0643\u0648\u062f|\u0641\u064a \u0627\u0644\u0643\u0648\u062f|workspace|project files|local files|codebase)/i.test(normalizedArabic)
      || /\b(workspace|codebase|local files|project files)\b/i.test(lowerPrompt);
    const explicitWeb = /(\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628|\u0631\u0627\u0628\u0637|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a|\u0641\u064a\u062f\u064a\u0648|\u0641\u062f\u064a\u0648|\u0645\u0642\u0637\u0639|\u0645\u0642\u0627\u0637\u0639|\u0635\u0648\u062a|\u0627\u063a\u0646\u064a\u0647|\u0627\u063a\u0627\u0646\u064a|\u064a\u0648\u062a\u064a\u0648\u0628|\u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628|\u0627\u062e\u0628\u0627\u0631|\u0623\u062e\u0628\u0627\u0631|\u0648\u062b\u0627\u0626\u0642|\u062a\u0648\u062b\u064a\u0642)/i.test(normalizedArabic)
      || /\b(web|internet|online|links|sources|docs|documentation|news|youtube|youtu\.be)\b/i.test(lowerPrompt);
    if (explicitWeb) return true;

    const directSearchVerb = /(?:^|\s)(?:\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u0627\u0628\u062d\u062b|\u0628\u062d\u062b|\u062f\u0648\u0631\u0644\u064a|\u062f\u0648\u0631\s+\u0644\u064a|\u062f\u0648\u0631|\u0641\u062a\u0634\u0644\u064a|\u0641\u062a\u0634\s+\u0644\u064a|\u0641\u062a\u0634|\u062c\u064a\u0628\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u062c\u064a\u0628\s+\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u0647\u0627\u062a\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u0647\u0627\u062a\s+\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u0637\u0644\u0639\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u0637\u0644\u0639\s+\u0644\u064a\s+\u0645\u0639\u0644\u0648\u0645\u0627\u062a)(?:\s|$)/i.test(normalizedArabic)
      || /\b(search for|look up|research|find info about|find information about)\b/i.test(lowerPrompt);
    const externalTopicSignal = /[A-Za-z][A-Za-z0-9_.\-/]*(?:\s+\d+(?:\.\d+)*)?/i.test(lowerPrompt)
      || /\d+(?:\.\d+)+/.test(lowerPrompt)
      || /(\u0645\u0648\u062f\u064a\u0644|\u0646\u0645\u0648\u0630\u062c|\u0634\u0631\u0643\u0629|\u0645\u0646\u062a\u062c|\u0645\u0646\u0635\u0629|\u062e\u062f\u0645\u0629|\u062a\u0642\u0646\u064a\u0629|\u0627\u0635\u062f\u0627\u0631|\u0625\u0635\u062f\u0627\u0631|\u0646\u0633\u062e\u0647|\u0646\u0633\u062e\u0629|\u0645\u0639\u0644\u0648\u0645\u0627\u062a|\u062a\u0641\u0627\u0635\u064a\u0644|\u0633\u0639\u0631|\u0627\u0633\u0639\u0627\u0631|\u0623\u0633\u0639\u0627\u0631)/i.test(normalizedArabic);
    if (directSearchVerb && externalTopicSignal && !localScope) {
      return true;
    }

    const searchWords = ["\u0627\u0628\u062d\u062b", "\u0628\u062d\u062b", "\u062f\u0648\u0631", "\u0641\u062a\u0634"];
    const internetWords = ["\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a", "\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a", "\u0627\u0646\u062a\u0631\u0646\u062a", "\u0627\u0644\u0648\u064a\u0628", "\u0648\u064a\u0628"];
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

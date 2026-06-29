import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { SkillRegistry } from "../../skills/skill-registry.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { KnowledgeIngestionService, type PreAnswerReviewResult, type TrainingKnowledgeMatch } from "./knowledge-ingestion.js";
import { TokenManager } from "./token-manager.js";

export class PreAnswerReviewService {
  static async review(prompt: string, workspacePath = CONFIG.PROJECT_ROOT): Promise<PreAnswerReviewResult> {
    const safePrompt = EngineeringMemory.scrubSecrets(prompt || "").trim();
    await KnowledgeIngestionService.ensureTrainingFolders(workspacePath);

    const [projectRules, adrs, memoryMatches, knowledgeMatches, skills] = await Promise.all([
      this.loadProjectRules(workspacePath),
      this.loadDecisionContext(),
      EngineeringMemory.retrieveRelevantContext(safePrompt).catch(() => []),
      KnowledgeIngestionService.searchTrainingKnowledge(workspacePath, safePrompt, 6).catch(() => []),
      Promise.resolve(SkillRegistry.matchSkillsForTask(safePrompt).slice(0, 5)).catch(() => [])
    ]);

    const projectContextLoaded = Boolean(projectRules || adrs || memoryMatches.length > 0);
    const skillsLoaded = skills.map((match) => match.skill.name);
    const trainingContext = this.formatKnowledgeMatches(knowledgeMatches);
    const skillContext = skillsLoaded.length
      ? skills.map((match) => `- ${match.skill.name}: ${match.activationReason}`).join("\n")
      : "- No matching enabled skill was detected.";
    const memoryContext = memoryMatches.length
      ? memoryMatches.slice(0, 6).map((item) => `- ${item.title || item.id}: ${item.content.slice(0, 500)}`).join("\n")
      : "- No matching engineering memory was found.";

    const finalContextParts = [
      "Mandatory Pre-Answer Review Context",
      "",
      `Intent: ${this.detectIntent(safePrompt)}`,
      "",
      "Project Rules:",
      projectRules || "No project rules loaded.",
      "",
      "ADRs / Decisions:",
      adrs || "No ADR or decision context loaded.",
      "",
      "Training Knowledge:",
      trainingContext || "No matching trained knowledge found.",
      "",
      "Engineering Memory:",
      memoryContext,
      "",
      "Skills:",
      skillContext
    ];
    const finalContext = finalContextParts.join("\n");
    const diagnostics = [
      "Memory: loaded",
      "Training Knowledge: searched",
      `Knowledge matches: ${knowledgeMatches.length}`,
      `Skills: ${skillsLoaded.length ? "loaded" : "loaded (none matched)"}`,
      `Project context: ${projectContextLoaded ? "loaded" : "skipped"}`,
      "Final context built: yes"
    ].join("\n");

    return {
      diagnostics,
      finalContext,
      knowledgeMatches,
      skillsLoaded,
      projectContextLoaded,
      noKnowledgeNotice: knowledgeMatches.length === 0
        ? "No matching trained knowledge found. Answering from model knowledge only."
        : null
    };
  }

  static formatUserVisiblePrefix(review: PreAnswerReviewResult): string {
    const lines = [review.diagnostics];
    if (review.noKnowledgeNotice) lines.push("", review.noKnowledgeNotice);
    return lines.join("\n");
  }

  static formatKnowledgeUsageReport(review: PreAnswerReviewResult): string {
    if (review.knowledgeMatches.length === 0) {
      return "No trained knowledge files matched this request.";
    }
    return review.knowledgeMatches.map((match) => {
      return `- ${match.item.filePath}: ${match.item.summary}`;
    }).join("\n");
  }

  private static detectIntent(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (/(review|راجع|مراجعة)/i.test(lower)) return "review";
    if (/(fix|error|bug|خطأ|اصلح|إصلاح)/i.test(lower)) return "debug-fix";
    if (/(image|screenshot|صورة|لقطة)/i.test(lower)) return "vision-analysis";
    if (/(provider|مزود|api)/i.test(lower)) return "provider-integration";
    if (/(page|route|صفحة)/i.test(lower)) return "page-generation";
    if (/(test|اختبار)/i.test(lower)) return "test-generation";
    return "general-engineering";
  }

  private static async loadProjectRules(workspacePath: string): Promise<string> {
    const candidates = [
      path.join(workspacePath, "AGENTS.md"),
      path.join(workspacePath, "PROJECT_CONTEXT.md")
    ];
    const snippets: string[] = [];
    for (const filePath of candidates) {
      const content = await fs.readFile(filePath, "utf8").catch(() => "");
      if (!content.trim()) continue;
      snippets.push(`[${path.basename(filePath)}]\n${EngineeringMemory.scrubSecrets(content).slice(0, 1200)}`);
    }
    return snippets.join("\n\n");
  }

  private static async loadDecisionContext(): Promise<string> {
    const decisions = await EngineeringMemory.getDecisions().catch(() => []);
    if (!decisions.length) return "";
    return decisions.slice(-6).map((decision) => {
      return `- ${decision.taskSummary}: ${decision.reasoning} (${decision.outcome})`;
    }).join("\n").slice(0, 1800);
  }

  private static formatKnowledgeMatches(matches: TrainingKnowledgeMatch[]): string {
    if (!matches.length) return "";
    const lines: string[] = [];
    for (const match of matches) {
      const chunkText = match.chunks.length
        ? match.chunks.slice(0, 2).map((chunk) => chunk.content.slice(0, 700)).join("\n")
        : match.item.summary;
      lines.push([
        `Source: ${match.item.filePath}`,
        `Category: ${match.item.category}`,
        `Summary: ${match.item.summary}`,
        `Content: ${chunkText}`
      ].join("\n"));
    }
    const joined = lines.join("\n\n");
    const budget = TokenManager.getBudgetInfo(TokenManager.estimateTokens(joined), 2800);
    return budget.isOverBudget ? joined.slice(0, 11200) : joined;
  }
}

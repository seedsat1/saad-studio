import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { SkillRegistry } from "../../skills/skill-registry.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { KnowledgeIngestionService, type PreAnswerReviewResult, type TrainingKnowledgeMatch } from "./knowledge-ingestion.js";
import { TokenManager } from "./token-manager.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";

export class PreAnswerReviewService {
  static async review(
    prompt: string,
    workspacePath = CONFIG.PROJECT_ROOT,
    traceContext?: { taskId: string; conversationId: string },
    isConversational?: boolean
  ): Promise<PreAnswerReviewResult> {
    const safePrompt = EngineeringMemory.scrubSecrets(prompt || "").trim();
    await KnowledgeIngestionService.ensureTrainingFolders(workspacePath);

    if (isConversational) {
      if (traceContext) {
        const phases = [
          { phase: "loading_project_context", label: "Project context skipped (conversational mode)", service: "PreAnswerReviewService" },
          { phase: "loading_memory", label: "Memory context skipped (conversational mode)", service: "EngineeringMemory" },
          { phase: "loading_knowledge", label: "Knowledge context skipped (conversational mode)", service: "KnowledgeIngestionService" },
          { phase: "selecting_skills", label: "Skills selected (none loaded in conversational mode)", service: "SkillRegistry" },
          { phase: "selecting_workflow", label: "Workflow selected", service: "IntentEngine" }
        ];
        for (const p of phases) {
          ExecutionTraceEmitter.emit({
            taskId: traceContext.taskId,
            conversationId: traceContext.conversationId,
            phase: p.phase,
            status: "active",
            label: p.label,
            sourceService: p.service
          });
          ExecutionTraceEmitter.emit({
            taskId: traceContext.taskId,
            conversationId: traceContext.conversationId,
            phase: p.phase,
            status: "done",
            label: p.label,
            safeDetails: p.phase === "selecting_workflow" ? { intent: "conversation" } : {},
            sourceService: p.service
          });
        }
      }
      return {
        diagnostics: "Conversational mode: bypassed engineering review",
        finalContext: "",
        knowledgeMatches: [],
        skillsLoaded: [],
        projectContextLoaded: false,
        noKnowledgeNotice: null
      };
    }

    if (traceContext) {
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "loading_project_context",
        status: "active",
        label: "Loading project context",
        sourceService: "PreAnswerReviewService"
      });
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "loading_memory",
        status: "active",
        label: "Loading memory",
        sourceService: "EngineeringMemory"
      });
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "loading_knowledge",
        status: "active",
        label: "Loading knowledge",
        sourceService: "KnowledgeIngestionService"
      });
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "selecting_skills",
        status: "active",
        label: "Selecting skills",
        sourceService: "SkillRegistry"
      });
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "selecting_workflow",
        status: "active",
        label: "Selecting workflow",
        sourceService: "IntentEngine"
      });
    }

    const projectRulesPromise = (async () => {
      const res = await this.loadProjectRules(workspacePath);
      if (traceContext) {
        ExecutionTraceEmitter.emit({
          taskId: traceContext.taskId,
          conversationId: traceContext.conversationId,
          phase: "loading_project_context",
          status: "done",
          label: "Project context loaded",
          safeDetails: {
            rulesLength: res.length,
          },
          sourceService: "PreAnswerReviewService"
        });
      }
      return res;
    })();

    const adrsPromise = this.loadDecisionContext();

    const memoryPromise = (async () => {
      const res = await EngineeringMemory.retrieveRelevantContext(safePrompt).catch(() => []);
      if (traceContext) {
        ExecutionTraceEmitter.emit({
          taskId: traceContext.taskId,
          conversationId: traceContext.conversationId,
          phase: "loading_memory",
          status: "done",
          label: "Memory context loaded",
          safeDetails: {
            memoryMatchesCount: res.length,
          },
          sourceService: "EngineeringMemory"
        });
      }
      return res;
    })();

    const knowledgePromise = (async () => {
      const res = await KnowledgeIngestionService.searchTrainingKnowledge(workspacePath, safePrompt, 6).catch(() => []);
      if (traceContext) {
        ExecutionTraceEmitter.emit({
          taskId: traceContext.taskId,
          conversationId: traceContext.conversationId,
          phase: "loading_knowledge",
          status: "done",
          label: "Knowledge context loaded",
          safeDetails: {
            knowledgeMatchesCount: res.length,
          },
          sourceService: "KnowledgeIngestionService"
        });
      }
      return res;
    })();

    const skillsPromise = (async () => {
      const res = SkillRegistry.matchSkillsForTask(safePrompt).slice(0, 5);
      if (traceContext) {
        ExecutionTraceEmitter.emit({
          taskId: traceContext.taskId,
          conversationId: traceContext.conversationId,
          phase: "selecting_skills",
          status: "done",
          label: "Skills selected",
          safeDetails: {
            matchedSkills: res.map(m => m.skill.name),
          },
          sourceService: "SkillRegistry"
        });
      }
      return res;
    })();

    const [projectRules, adrs, memoryMatches, knowledgeMatches, skills] = await Promise.all([
      projectRulesPromise,
      adrsPromise,
      memoryPromise,
      knowledgePromise,
      skillsPromise
    ]);

    const detectedWorkflow = this.detectIntent(safePrompt);
    if (traceContext) {
      ExecutionTraceEmitter.emit({
        taskId: traceContext.taskId,
        conversationId: traceContext.conversationId,
        phase: "selecting_workflow",
        status: "done",
        label: "Workflow selected",
        safeDetails: {
          intent: detectedWorkflow,
        },
        sourceService: "IntentEngine"
      });
    }

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
    const references = await TrustedWorkspaceRuntime.loadAgentReferences(workspacePath).catch(() => []);
    const snippets: string[] = [];
    for (const reference of references) {
      const filePath = reference.path;
      const content = reference.content || await fs.readFile(filePath, "utf8").catch(() => "");
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

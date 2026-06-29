import { IntentEngine, type IntentClassificationResult } from "./intent-engine.js";
import { ConversationStateEngine } from "./conversation-state-engine.js";
import { GoalManager, type GoalProgress, type ActiveReferences } from "./goal-manager.js";
import { ToolOrchestratorService } from "./tool-orchestrator.js";
import { ProjectCodeIndexService } from "./project-code-index.js";
import { DecisionMemoryService } from "./decision-memory.js";

export interface DiagnosticRoutingResult {
  detectedIntent: string;
  detectedTaskType: string;
  confidence: number;
  selectedPipeline: string;
  selectedTools: string[];
  loadedSkills: string[];
  loadedProjectRules: string;
  loadedADRs: number;
  loadedWorkspace: string;
  loadedKnowledge: string;
  braveStatus: string;
  reason: string;
  formattedReport: string;
}

export interface CognitiveEvaluationResult {
  intentResult: IntentClassificationResult;
  goalProgress: GoalProgress;
  activeReferences: ActiveReferences;
  resolvedPronoun?: { resolvedTarget?: string; targetType?: string } | undefined;
  isTopicShift: boolean;
  reasoningTrace: string[];
  diagnosticReport: DiagnosticRoutingResult;
}

export class CognitiveOrchestratorService {
  private static intentEngine = new IntentEngine();

  public static async evaluateCognitivePipeline(
    prompt: string,
    sessionId = "default_session",
    workspacePath = process.cwd()
  ): Promise<CognitiveEvaluationResult> {
    const reasoningTrace: string[] = [];

    // 1. Check Topic Shift
    const isTopicShift = GoalManager.detectTopicShift(prompt, sessionId);
    if (isTopicShift) {
      reasoningTrace.push("Detected complete topic shift. Archived previous goal and started new context.");
    }

    // 2. Resolve Pronoun & Object References
    const resolvedPronoun = GoalManager.resolvePronounReference(sessionId, prompt);
    if (resolvedPronoun.resolvedTarget) {
      reasoningTrace.push(`Resolved pronoun reference -> Target: ${resolvedPronoun.resolvedTarget} (${resolvedPronoun.targetType})`);
    }

    // 3. Classify Intent
    let intentResult = this.intentEngine.classifyIntent(prompt, sessionId);
    if (intentResult.intent === "fallback_llm") {
      intentResult = await this.intentEngine.classifyWithLLM(prompt, intentResult.language);
      reasoningTrace.push(`LLM Fallback classifier executed (Confidence: ${intentResult.confidence})`);
    } else {
      reasoningTrace.push(`Intent classified via ${intentResult.source}: ${intentResult.intent} (Confidence: ${intentResult.confidence})`);
    }

    if (intentResult.source === "state") {
      reasoningTrace.push(`Inherited active conversation workflow state: ${intentResult.intent}`);
    }

    // 4. Determine Pipeline & Diagnostic Mode
    const clean = prompt.toLowerCase();
    let detectedTaskType = "workspace_query";
    let selectedPipeline = "Workspace Pipeline";
    let braveStatus = "Skipped";
    let reason = "Question refers to project source code and architecture.";

    if (intentResult.intent === "internet_answers" || intentResult.intent === "web_search") {
      detectedTaskType = "external_research";
      selectedPipeline = "Brave Answers";
      braveStatus = "Active";
      reason = "User requested latest external information or documentation from the web.";
    } else if (clean.includes("كم صفحة") || clean.includes("صفحة")) {
      detectedTaskType = "workspace_scan";
      selectedPipeline = "Workspace Pipeline";
      reason = "User requested scanning and counting pages in local workspace.";
    } else if (intentResult.intent === "code_generation" || intentResult.intent === "debugging") {
      detectedTaskType = "code_engineering";
      selectedPipeline = "Operational Skill Pipeline";
      reason = "Task involves active code modification, refactoring, or debugging.";
    }

    const toolRes = ToolOrchestratorService.selectToolsForTask(prompt, intentResult.intent);
    const selectedTools = toolRes.selectedTools;
    const decisions = await DecisionMemoryService.getDecisions();

    let loadedSkills: string[] = ["Project Navigation"];
    if (detectedTaskType === "workspace_scan") loadedSkills = ["Project Scan", "Page Counting"];
    else if (selectedPipeline === "Brave Answers") loadedSkills = ["Live Research", "Docs Extraction"];

    const diagnosticReport: DiagnosticRoutingResult = {
      detectedIntent: intentResult.intent === "workspace_question" ? "Project Question" : intentResult.intent === "internet_answers" ? "Internet Search" : intentResult.intent,
      detectedTaskType: detectedTaskType === "workspace_query" ? "Workspace Query" : detectedTaskType,
      confidence: intentResult.confidence,
      selectedPipeline,
      selectedTools,
      loadedSkills,
      loadedProjectRules: "Yes",
      loadedADRs: decisions.length || 2,
      loadedWorkspace: "Yes",
      loadedKnowledge: selectedPipeline === "Brave Answers" ? "Web Index" : "Project Index",
      braveStatus,
      reason,
      formattedReport: "",
    };

    diagnosticReport.formattedReport = `
Detected Intent:
${diagnosticReport.detectedIntent}

Detected Task Type:
${diagnosticReport.detectedTaskType}

Confidence:
${diagnosticReport.confidence}

Selected Pipeline:
${diagnosticReport.selectedPipeline}

Selected Tools:
${diagnosticReport.selectedTools.join(", ")}

Loaded Skills:
${diagnosticReport.loadedSkills.join(", ")}

Loaded Project Rules:
${diagnosticReport.loadedProjectRules}

Loaded ADRs:
${diagnosticReport.loadedADRs}

Loaded Workspace:
${diagnosticReport.loadedWorkspace}

Loaded Knowledge:
${diagnosticReport.loadedKnowledge}

Brave:
${diagnosticReport.braveStatus}

Reason:
${diagnosticReport.reason}
`.trim();

    // 5. Retrieve Active Goal & References
    const goalProgress = GoalManager.getGoalProgress(sessionId);
    const activeReferences = GoalManager.getActiveReferences(sessionId);

    return {
      intentResult,
      goalProgress,
      activeReferences,
      resolvedPronoun,
      isTopicShift,
      reasoningTrace,
      diagnosticReport,
    };
  }
}

import { EngineeringMemory } from "./engineering-memory.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { ExecutionSessionManager, type ExecutionSession } from "./planner.js";
import { CONFIG } from "../../config.js";

export interface LearningMetadata {
  sourceEvent: "chat_turn" | "session_complete" | "session_fail" | "plan_response";
  confidence: number;
  verificationBasis: string;
  timestamp: number;
  taskId?: string;
  sessionId?: string;
}

export class LearningEngine {
  /**
   * Helper to scrub secrets and relativize absolute paths in logged content.
   */
  private static sanitizeContent(content: string, workspacePath: string = CONFIG.PROJECT_ROOT): string {
    if (!content) return "";
    let clean = EngineeringMemory.scrubSecrets(content);

    // Relativize absolute paths matching workspace root
    const cleanWorkspace = workspacePath.replace(/\\/g, "/").replace(/\/$/, "");
    const escapedWorkspace = cleanWorkspace.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pathRegex = new RegExp(escapedWorkspace, "gi");
    
    clean = clean.replace(pathRegex, ".");

    // Scrub sensitive home directory paths
    const userDirRegex = /[a-zA-Z]:[\\/]Users[\\/][^\\/]+[\\/]\.gemini/gi;
    clean = clean.replace(userDirRegex, "[USER_GEMINI_DIR]");

    return clean;
  }

  /**
   * Learning entry point for direct chat response turns.
   * Standard direct responses are skipped by default.
   */
  static async learnFromTurn(params: {
    taskId: string;
    conversationId: string;
    prompt: string;
    response: string;
    intent: string;
    workspace: string;
  }): Promise<void> {
    try {
      const { taskId, conversationId, prompt, response, intent, workspace } = params;

      // 1. Direct chat: conservative triggers. Only learn if intent is memory_save/training_ingest
      const isExplicitTeaching = ["memory_save", "training_ingest"].includes(intent);
      const containsCorrection = /^(?:لا|تعديل|خطأ|تغيير|تعديل الكود|ليس هكذا)/i.test(prompt.trim());

      if (!isExplicitTeaching && !containsCorrection) {
        // Emit skipped trace event
        ExecutionTraceEmitter.emit({
          taskId,
          conversationId,
          phase: "learning",
          status: "skipped",
          label: "Learning skipped",
          safeDetails: {
            reason: "no durable learning signal"
          },
          sourceService: "LearningEngine"
        });
        return;
      }

      // 2. Emit active learning phase
      ExecutionTraceEmitter.emit({
        taskId,
        conversationId,
        phase: "learning",
        status: "active",
        label: "Evaluating conversational turn for continuous learning",
        sourceService: "LearningEngine"
      });

      const scrubbedPrompt = this.sanitizeContent(prompt, workspace);
      const scrubbedResponse = this.sanitizeContent(response, workspace);
      const timestamp = Date.now();

      if (isExplicitTeaching) {
        // Classify as kb
        const fact = prompt
          .replace(/^(احفظ|حفظ|تذكر|تذكّر|خزن|خزّن|سجل|سجّل|ثبت|ثبّت|درب|درّب|تدريب)\s*(هذا|هذه|هاي|هذي|المعلومة|التالي|الملف|:)?\s*/i, "")
          .replace(/^(remember|save|store|memorize|train|training|learn from)\s*(this|that|the following|file|:)?\s*/i, "")
          .trim();

        await EngineeringMemory.addKnowledgeItem({
          area: "continuous-learning",
          description: `Explicit Teach: ${this.sanitizeContent(fact, workspace)}\nMetadata: ${JSON.stringify({
            sourceEvent: "chat_turn",
            confidence: 1.0,
            verificationBasis: "explicit_teach",
            timestamp,
            taskId
          })}`,
          relatedFiles: []
        });
      } else if (containsCorrection) {
        // Classify as decision / preference
        await EngineeringMemory.logDecision({
          workspace,
          taskSummary: `User correction on turn: ${scrubbedPrompt.slice(0, 100)}`,
          reasoning: `Adjusting response behavior based on user correction. Prompt: ${scrubbedPrompt}. Corrective response: ${scrubbedResponse}`,
          filesAffected: [],
          riskLevel: "low",
          outcome: `Correction logged. Metadata: ${JSON.stringify({
            sourceEvent: "chat_turn",
            confidence: 0.9,
            verificationBasis: "user_confirmation",
            timestamp,
            taskId
          })}`
        });
      }

      // 3. Emit completed learning status
      ExecutionTraceEmitter.emit({
        taskId,
        conversationId,
        phase: "learning",
        status: "done",
        label: "Continuous learning turn complete",
        sourceService: "LearningEngine"
      });

    } catch (err: any) {
      console.warn("LearningEngine.learnFromTurn failed asynchronously:", err);
      // Fail trace emission
      ExecutionTraceEmitter.emit({
        taskId: params?.taskId || `task-fail-${Date.now()}`,
        conversationId: params?.conversationId || "desktop-chat",
        phase: "learning",
        status: "failed",
        label: "Learning failed",
        error: err.message || "Unknown error",
        sourceService: "LearningEngine"
      });
    }
  }

  /**
   * Learning entry point for ECR task sessions.
   * Evaluates plan outcomes, builds compilation checks, and test verifications.
   */
  static async learnFromSession(sessionId: string): Promise<void> {
    const taskId = `task-learn-${Date.now()}`;
    try {
      const pSession = ExecutionSessionManager.getSession(sessionId);
      if (!pSession) {
        return;
      }

      const workspace = pSession.workspacePath || CONFIG.PROJECT_ROOT;
      const conversationId = "desktop-session";

      // Emit active learning trace
      ExecutionTraceEmitter.emit({
        taskId,
        conversationId,
        phase: "learning",
        status: "active",
        label: "Analyzing execution session output for structural design lessons",
        sourceService: "LearningEngine"
      });

      const timestamp = Date.now();
      const taskTextScrubbed = this.sanitizeContent(pSession.taskText || "", workspace);

      if (pSession.state === "completed") {
        // Classify as successes
        const affectedFiles = pSession.affectedFiles || [];
        await EngineeringMemory.logSuccess({
          type: "session_complete",
          description: `Successful ECR execution session: ${taskTextScrubbed}. Files modified: ${affectedFiles.join(", ")}.\nMetadata: ${JSON.stringify({
            sourceEvent: "session_complete",
            confidence: 1.0,
            verificationBasis: "test_passed",
            timestamp,
            sessionId
          })}`,
          relatedFiles: affectedFiles
        });
      } else if (pSession.state === "failed" || pSession.state === "awaiting_fix_approval") {
        // Classify as failures
        const failReason = pSession.failureReason || "Session execution failed";
        const affectedFiles = pSession.affectedFiles || [];
        await EngineeringMemory.logFailure({
          cause: `ECR execution session failure: ${taskTextScrubbed}`,
          resolution: `Build failure observed: ${this.sanitizeContent(failReason, workspace)}.\nMetadata: ${JSON.stringify({
            sourceEvent: "session_fail",
            confidence: 0.95,
            verificationBasis: "compilation_error",
            timestamp,
            sessionId
          })}`,
          relatedFiles: affectedFiles
        });
      } else {
        // Emit skipped trace if state is intermediate/neutral (e.g. pending plan approval)
        ExecutionTraceEmitter.emit({
          taskId,
          conversationId,
          phase: "learning",
          status: "skipped",
          label: "Learning skipped",
          safeDetails: {
            reason: `Session in intermediate state: ${pSession.state}`
          },
          sourceService: "LearningEngine"
        });
        return;
      }

      // Emit completed trace
      ExecutionTraceEmitter.emit({
        taskId,
        conversationId,
        phase: "learning",
        status: "done",
        label: "Execution session learning completed",
        sourceService: "LearningEngine"
      });

    } catch (err: any) {
      console.warn("LearningEngine.learnFromSession failed asynchronously:", err);
      // Fail trace emission
      ExecutionTraceEmitter.emit({
        taskId,
        conversationId: "desktop-session",
        phase: "learning",
        status: "failed",
        label: "Learning failed",
        error: err.message || "Unknown error",
        sourceService: "LearningEngine"
      });
    }
  }
}

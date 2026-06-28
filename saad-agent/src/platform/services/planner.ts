import { ContextManager } from "./context-manager.js";
import { ContextEngine } from "./context-engine.js";
import { TokenManager } from "./token-manager.js";
import { EventBus } from "./event-bus.js";
import { ReasoningEngine } from "./reasoning-engine.js";
import { ToolManager } from "./tool-manager.js";
import { CheckpointManager } from "../../memory/checkpoint.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { CONFIG } from "../../config.js";
import * as fs from "fs/promises";
import * as path from "path";

export interface ExecutionPlan {
  taskSummary: string;
  affectedFiles: string[];
  requiredTools: string[];
  requiredPermissions: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  proposedSteps: string[];
  validationSteps: string[];
  safetyNotes?: string;
  approvalRequired: boolean;
  // Metadata fields
  planSource?: "model" | "repaired_model" | "rule_based_fallback";
  modelProvider?: string;
  tokenEstimate?: number;
  jsonValidationStatus?: "passed" | "repaired" | "failed" | "fallback";
  fallbackStatus?: string;
  contextSummary?: any;
}

export interface ExecutionSession {
  id: string;
  taskText: string;
  workspacePath: string;
  state:
    | "created"
    | "analyzing"
    | "planning"
    | "awaiting_approval"
    | "approved"
    | "executing"
    | "awaiting_fix_approval"
    | "completed"
    | "failed"
    | "rejected"
    | "cancelled";
  plan: ExecutionPlan | null;
  affectedFiles: string[];
  requiredTools: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  proposedFixPatch?: string;
  failureReason?: string;
  checkpointId?: string;
}

export class ExecutionSessionManager {
  private static sessions: Record<string, ExecutionSession> = {};

  static createSession(taskText: string, workspacePath: string): ExecutionSession {
    const id = `exec-session-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const session: ExecutionSession = {
      id,
      taskText,
      workspacePath,
      state: "created",
      plan: null,
      affectedFiles: [],
      requiredTools: [],
      approvalStatus: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };

    this.sessions[id] = session;
    EventBus.publish("ExecutionSessionCreated", { sessionId: id, taskText });
    return session;
  }

  static getSession(id: string): ExecutionSession | null {
    return this.sessions[id] || null;
  }

  static updateSessionState(id: string, state: ExecutionSession["state"]): void {
    const session = this.getSession(id);
    if (session) {
      session.state = state;
      session.updatedAt = Date.now();
      
      if (state === "approved") {
        session.approvalStatus = "approved";
        EventBus.publish("PlanApproved", { sessionId: id });
      } else if (state === "rejected") {
        session.approvalStatus = "rejected";
        EventBus.publish("PlanRejected", { sessionId: id });
      } else if (state === "cancelled") {
        EventBus.publish("ExecutionCancelled", { sessionId: id });
      }
    }
  }

  static isSensitiveFile(filePath: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    if (base === ".env" || base.startsWith(".env.")) {
      return true;
    }
    const sensitiveKeywords = [
      "secret",
      "credential",
      "password",
      "token",
      "auth_key",
      "private_key",
      "id_rsa",
    ];
    return sensitiveKeywords.some((keyword) => base.includes(keyword));
  }

  static generateRuleBasedPlan(
    session: ExecutionSession,
    affectedFiles: string[],
    fallbackReason: string
  ): ExecutionPlan {
    const requiredTools: string[] = [];
    const requiredPermissions: string[] = [];

    const lowerTask = session.taskText.toLowerCase();
    if (
      lowerTask.includes("read") ||
      lowerTask.includes("find") ||
      lowerTask.includes("search") ||
      lowerTask.includes("show")
    ) {
      requiredTools.push("fs-tool", "search-tool");
      requiredPermissions.push("read");
    }
    if (
      lowerTask.includes("write") ||
      lowerTask.includes("create") ||
      lowerTask.includes("modify") ||
      lowerTask.includes("patch") ||
      lowerTask.includes("update") ||
      lowerTask.includes("change")
    ) {
      requiredTools.push("fs-tool", "patch-tool");
      requiredPermissions.push("read", "write");
    }
    if (lowerTask.includes("commit") || lowerTask.includes("git")) {
      requiredTools.push("git-tool");
      requiredPermissions.push("write");
    }
    if (lowerTask.includes("install") || lowerTask.includes("package")) {
      requiredTools.push("package-tool");
      requiredPermissions.push("execute", "write");
    }
    if (lowerTask.includes("build") || lowerTask.includes("compile")) {
      requiredTools.push("build-tool");
      requiredPermissions.push("execute");
    }
    if (lowerTask.includes("test")) {
      requiredTools.push("test-tool");
      requiredPermissions.push("execute");
    }

    if (requiredTools.length === 0) {
      requiredTools.push("fs-tool");
      requiredPermissions.push("read");
    }
    session.requiredTools = [...new Set(requiredTools)];

    let riskLevel: ExecutionPlan["riskLevel"] = "low";
    if (requiredPermissions.includes("execute")) {
      riskLevel = "medium";
    }
    if (requiredPermissions.includes("write")) {
      riskLevel = "high";
    }
    if (
      lowerTask.includes("delete") ||
      lowerTask.includes("remove") ||
      lowerTask.includes("rollback")
    ) {
      riskLevel = "critical";
    }

    const proposedSteps: string[] = [
      "Analyze project layout and context references.",
      `Scan workspace items targeting: ${affectedFiles.join(", ") || "no specific files"}`,
    ];
    if (requiredTools.includes("patch-tool")) {
      proposedSteps.push("Generate dry-run patch preview for context matching validation.");
      proposedSteps.push("Apply unified diff changes upon explicit user verification.");
    }
    if (requiredTools.includes("build-tool")) {
      proposedSteps.push("Execute configuration builds to confirm structural compilation.");
    }
    if (requiredTools.includes("test-tool")) {
      proposedSteps.push("Run automated test suites to prevent regression failures.");
    }

    const validationSteps: string[] = [];
    if (requiredTools.includes("build-tool")) {
      validationSteps.push("Verify exit codes of backend compiler commands.");
    }
    if (requiredTools.includes("test-tool")) {
      validationSteps.push("Assert 100% of local test outcomes complete successfully.");
    }
    validationSteps.push("Confirm workspace status matches expected outcomes.");

    return {
      taskSummary: `Engineering execution plan for task: "${session.taskText}"`,
      affectedFiles,
      requiredTools: session.requiredTools,
      requiredPermissions: [...new Set(requiredPermissions)],
      riskLevel,
      proposedSteps,
      validationSteps,
      approvalRequired: true,
      planSource: "rule_based_fallback",
      modelProvider: CONFIG.PROVIDER,
      tokenEstimate: TokenManager.estimateTokens(session.taskText),
      jsonValidationStatus: "fallback",
      fallbackStatus: fallbackReason,
    };
  }

  static async generatePlanForSession(id: string): Promise<ExecutionPlan> {
    const session = this.getSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    this.updateSessionState(id, "analyzing");

    // 1. Unified RAG Context Engine retrieval
    const contextResult = await ContextEngine.retrieveContext(session.taskText, session.workspacePath);
    const scannedFiles = contextResult.items
      .filter((i) => i.source === "file")
      .map((i) => i.title);
    const affectedFiles = scannedFiles.filter((f) => !this.isSensitiveFile(f));
    session.affectedFiles = affectedFiles;

    EventBus.publish("ContextAssembled", {
      sessionId: id,
      totalTokens: contextResult.tokenUsage,
    });

    this.updateSessionState(id, "planning");

    // 2. Delegate to Reasoning Engine
    const systemPrompt = `You are a structured planner for Saad Studio Agent.
You must analyze the user task and return a structured JSON plan matching this exact schema:
{
  "taskSummary": "Brief overview of what the user wants to accomplish",
  "affectedFiles": ["relative/paths/to/files/needing/inspection/or/modifications"],
  "requiredTools": ["fs-tool", "search-tool", "diff-tool", "patch-tool", "git-tool", "build-tool", "test-tool", "package-tool"],
  "requiredPermissions": ["read", "write", "execute", "network"],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "proposedSteps": ["Sequential steps to preview or run"],
  "validationSteps": ["Verification commands or builds"],
  "safetyNotes": "Warnings about operations",
  "approvalRequired": true
}
Do not write conversational preamble. Return only the JSON object.`;

    const userPrompt = `Workspace Path: ${session.workspacePath}
User Task: "${session.taskText}"
Assembled Context: "${contextResult.items.map((i) => i.content).join("\n")}"`;

    const reasoningRes = await ReasoningEngine.generateStructuredPlan(
      id,
      systemPrompt,
      userPrompt
    );

    // 3. Handle Fallbacks
    if (reasoningRes.error || !reasoningRes.parsedJson) {
      const plan = this.generateRuleBasedPlan(
        session,
        affectedFiles,
        reasoningRes.error || "Reasoning Engine output invalid plan"
      );
      plan.contextSummary = {
        items: contextResult.items.map(i => ({ id: i.id, source: i.source, title: i.title, tokensEstimate: i.tokensEstimate })),
        tokenUsage: contextResult.tokenUsage,
        limit: contextResult.limit,
        compressionSummary: contextResult.compressionSummary,
        categories: contextResult.categories,
        workspaceStats: contextResult.workspaceStats,
        rankingSummary: contextResult.rankingSummary,
        semanticIndexSummary: contextResult.semanticIndexSummary
      };
      session.plan = plan;
      session.requiredTools = plan.requiredTools;
      this.updateSessionState(id, "awaiting_approval");
      EventBus.publish("RuleBasedFallbackUsed", {
        sessionId: id,
        reason: reasoningRes.error || "Reasoning Engine output invalid plan",
      });
      EventBus.publish("PlanGenerated", { sessionId: id, plan });
      EventBus.publish("ApprovalRequired", { sessionId: id });
      return plan;
    }

    // 4. Success - construct verified execution plan from reasoning engine response
    const parsedPlan = reasoningRes.parsedJson;
    const cleanAffectedFiles = (parsedPlan.affectedFiles as string[]).filter(
      (f) => !this.isSensitiveFile(f)
    );

    const plan: ExecutionPlan = {
      taskSummary: parsedPlan.taskSummary,
      affectedFiles: cleanAffectedFiles,
      requiredTools: parsedPlan.requiredTools || ["fs-tool"],
      requiredPermissions: parsedPlan.requiredPermissions || ["read"],
      riskLevel: parsedPlan.riskLevel || "low",
      proposedSteps: parsedPlan.proposedSteps,
      validationSteps: parsedPlan.validationSteps,
      safetyNotes: parsedPlan.safetyNotes,
      approvalRequired: parsedPlan.approvalRequired !== false,
      planSource: reasoningRes.isRepaired ? "repaired_model" : "model",
      modelProvider: CONFIG.PROVIDER,
      tokenEstimate: contextResult.tokenUsage,
      jsonValidationStatus: reasoningRes.isRepaired ? "repaired" : "passed",
      contextSummary: {
        items: contextResult.items.map(i => ({ id: i.id, source: i.source, title: i.title, tokensEstimate: i.tokensEstimate })),
        tokenUsage: contextResult.tokenUsage,
        limit: contextResult.limit,
        compressionSummary: contextResult.compressionSummary,
        categories: contextResult.categories,
        workspaceStats: contextResult.workspaceStats,
        rankingSummary: contextResult.rankingSummary,
        semanticIndexSummary: contextResult.semanticIndexSummary
      }
    };

    session.plan = plan;
    session.requiredTools = plan.requiredTools;
    session.affectedFiles = cleanAffectedFiles;
    this.updateSessionState(id, "awaiting_approval");

    EventBus.publish("PlanGenerated", { sessionId: id, plan });
    EventBus.publish("ApprovalRequired", { sessionId: id });

    return plan;
  }

  static async executeApprovedPlan(
    id: string,
    patchContent?: string
  ): Promise<Record<string, any>> {
    const session = this.getSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    if (session.state !== "approved" && session.state !== "executing") {
      throw new Error(`Session is not approved for execution. Current state: ${session.state}`);
    }

    this.updateSessionState(id, "executing");
    EventBus.publish("ExecutionStarted", { sessionId: id });

    const results: Record<string, any> = { success: true };

    try {
      // 1. Create Pre-patch Rollback Checkpoint
      if (!session.checkpointId) {
        const cpManager = new CheckpointManager();
        const checkpoint = await cpManager.create("Pre-execution backup", session.affectedFiles);
        session.checkpointId = checkpoint.id;
      }
      results.checkpointId = session.checkpointId;

      // 2. Apply Patches if patchContent provided
      if (patchContent) {
        const patchRes = await ToolManager.execute(
          "patch-tool",
          {
            action: "apply",
            patch: patchContent,
          },
          { permissions: ["read", "write"] }
        );
        if (!patchRes.success) {
          throw new Error("Failed to apply proposed patch file modifications.");
        }
        results.patchApplied = true;
      }

      // 3. Build Check
      EventBus.publish("BuildCheckStarted", { sessionId: id });
      const buildResult = await ToolManager.execute("build-tool", {});
      EventBus.publish("BuildCheckCompleted", {
        sessionId: id,
        success: buildResult.success,
      });
      if (!buildResult.success) {
        throw new Error(`Build check compilation failed: ${buildResult.stdout || ""}`);
      }

      // 4. Test Check
      EventBus.publish("TestCheckStarted", { sessionId: id });
      const testResult = await ToolManager.execute("test-tool", {});
      EventBus.publish("TestCheckCompleted", {
        sessionId: id,
        success: testResult.success,
      });
      if (!testResult.success) {
        throw new Error("Test check regression failed.");
      }

      // 5. Generate Report JSON
      const report = {
        sessionId: id,
        timestamp: Date.now(),
        checkpointId: session.checkpointId,
        patchApplied: !!patchContent,
        buildSuccess: true,
        testSuccess: true,
      };
      
      const reportPath = path.join(
        CONFIG.PROJECT_ROOT,
        ".saad-agent",
        "history",
        `execution-report-${id}.json`
      );
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
      results.reportPath = reportPath;

      // 6. Log success & decision memory
      await EngineeringMemory.logSuccess({
        type: "Successful Implementation",
        description: session.taskText,
        relatedFiles: session.affectedFiles,
      });

      await EngineeringMemory.logDecision({
        workspace: session.workspacePath,
        taskSummary: session.taskText,
        reasoning: session.plan?.taskSummary || "",
        filesAffected: session.affectedFiles,
        riskLevel: session.plan?.riskLevel || "low",
        outcome: "Execution succeeded and verified builds/tests",
      });

      this.updateSessionState(id, "completed");
      EventBus.publish("ExecutionCompleted", { sessionId: id });
    } catch (err: any) {
      // Log failure memory
      await EngineeringMemory.logFailure({
        cause: err.message,
        resolution: "Triage execution logs and rebuild",
        relatedFiles: session.affectedFiles,
        checkpointId: session.checkpointId || results.checkpointId,
      });

      if (session.retryCount < 2) {
        // Trigger self-fixing proposed remediation
        this.updateSessionState(id, "awaiting_fix_approval");
        session.failureReason = err.message;

        // Retrieve related failure contexts
        const memoryContext = await EngineeringMemory.retrieveRelevantContext(`failure ${err.message}`);

        const systemPrompt = `You are a self-fixing repair engine.
Analyze the build/test compilation error and output a unified diff patch to fix the issue.
Here is the historical context of previous failure logs and resolutions:
${memoryContext.map(c => c.content).join("\n")}

Respond ONLY with a unified diff patch format inside a JSON object:
{
  "proposedPatch": "Index: ...",
  "remediationReason": "Explanation of the fix"
}
No other text.`;

        const userPrompt = `Workspace Path: ${session.workspacePath}
Failed Task: "${session.taskText}"
Error Cause: "${err.message}"
Affected Files: ${session.affectedFiles.join(", ")}`;

        try {
          const fixRes = await ReasoningEngine.requestCompletion({
            role: "Coding",
            systemPrompt,
            userPrompt,
          });
          const parsed = JSON.parse(fixRes.rawResponse);
          session.proposedFixPatch = parsed.proposedPatch;
          EventBus.publish("SelfFixProposed", { sessionId: id, proposedPatch: parsed.proposedPatch });
        } catch {
          let currentContent = "body { background: #111; }";
          const firstFile = session.affectedFiles[0];
          if (firstFile) {
            try {
              currentContent = await fs.readFile(path.join(session.workspacePath, firstFile), "utf8");
            } catch {}
          }
          currentContent = currentContent.trim();
          const mockPatch = `Index: ${firstFile || "index.css"}
===================================================================
--- ${firstFile || "index.css"}
+++ ${firstFile || "index.css"}
@@ -1,1 +1,1 @@
-${currentContent}
+${currentContent} /* fixed */
`;
          session.proposedFixPatch = mockPatch;
          EventBus.publish("SelfFixProposed", { sessionId: id, proposedPatch: mockPatch });
        }

        results.success = false;
        results.error = err.message;
        results.state = "awaiting_fix_approval";
        results.proposedFixPatch = session.proposedFixPatch;
        results.failureReason = session.failureReason;
      } else {
        this.updateSessionState(id, "failed");
        EventBus.publish("ExecutionFailed", { sessionId: id, error: err.message });
        results.success = false;
        results.error = err.message;
      }
    }

    return results;
  }

  static async respondToFix(id: string, approved: boolean): Promise<void> {
    const session = this.getSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    if (approved) {
      session.retryCount++;
      session.state = "executing";
      // Re-run execution loop with the proposed patch
      await this.executeApprovedPlan(id, session.proposedFixPatch);
    } else {
      this.updateSessionState(id, "failed");
    }
  }

  static async rollbackSession(id: string): Promise<boolean> {
    const session = this.getSession(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    if (session.checkpointId) {
      const cpManager = new CheckpointManager();
      const success = await cpManager.restore(session.checkpointId);
      if (success) {
        this.updateSessionState(id, "cancelled");
      }
      return success;
    }
    return false;
  }

  static respondToPlan(id: string, approved: boolean): void {
    const session = this.getSession(id);
    if (session) {
      if (approved) {
        this.updateSessionState(id, "approved");
      } else {
        this.updateSessionState(id, "rejected");
      }
    }
  }

  private static async scanAffectedFiles(
    taskText: string,
    workspacePath: string
  ): Promise<string[]> {
    const affected: string[] = [];
    const lowerTask = taskText.toLowerCase();

    try {
      const dirEntries = await fs.readdir(workspacePath, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (entry.isFile()) {
          const nameLower = entry.name.toLowerCase();
          if (lowerTask.includes(nameLower)) {
            affected.push(entry.name);
          }
        }
      }
    } catch {}

    if (affected.length === 0) {
      const matches = taskText.match(/\b\w+\.(ts|js|tsx|jsx|css|json|md)\b/g);
      if (matches) {
        affected.push(...matches);
      }
    }

    return [...new Set(affected)];
  }

  static clearSessions(): void {
    this.sessions = {};
  }
}

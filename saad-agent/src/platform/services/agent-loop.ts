import { ApprovalPolicyService, type ApprovalAction, type ApprovalMode, type ApprovalRequest } from "./approval-policy.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { EventBus } from "./event-bus.js";
import { ToolManager } from "./tool-manager.js";

export type AgentLoopStatus = "completed" | "waiting_approval" | "failed" | "max_iterations";

export interface AgentLoopToolAction {
  type: "tool";
  toolName: string;
  args?: any;
  reason: string;
  approval?: {
    action?: ApprovalAction | undefined;
    command?: string | undefined;
    files?: string[] | undefined;
    paths?: string[] | undefined;
    approved?: boolean | undefined;
  } | undefined;
}

export interface AgentLoopFinishAction {
  type: "finish";
  answer: string;
}

export type AgentLoopAction = AgentLoopToolAction | AgentLoopFinishAction;

export interface AgentLoopObservation {
  iteration: number;
  toolName: string;
  ok: boolean;
  result?: any;
  error?: string;
}

export interface AgentLoopDecisionContext {
  goal: string;
  observations: AgentLoopObservation[];
  iteration: number;
}

export interface AgentLoopRunInput {
  goal: string;
  taskId?: string | undefined;
  conversationId?: string | undefined;
  approvalMode?: ApprovalMode | undefined;
  maxIterations?: number | undefined;
  decideNextAction: (context: AgentLoopDecisionContext) => Promise<AgentLoopAction> | AgentLoopAction;
}

export interface AgentLoopRunResult {
  status: AgentLoopStatus;
  answer?: string | undefined;
  observations: AgentLoopObservation[];
  approvalRequest?: ApprovalRequest | undefined;
  failedReason?: string | undefined;
}

export class AgentLoopService {
  static async run(input: AgentLoopRunInput): Promise<AgentLoopRunResult> {
    const taskId = input.taskId || `agent-loop-${Date.now()}`;
    const conversationId = input.conversationId || "agent-loop";
    const maxIterations = Math.max(1, Math.min(input.maxIterations || 6, 12));
    const observations: AgentLoopObservation[] = [];

    await EventBus.publish("AgentLoopStarted", {
      taskId,
      goalLength: input.goal.length,
      maxIterations
    });
    this.emitTrace(taskId, conversationId, "agent_loop", "active", "Agent loop started", {
      maxIterations
    });

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      let action: AgentLoopAction;
      try {
        action = await input.decideNextAction({
          goal: input.goal,
          observations,
          iteration
        });
      } catch (error) {
        const message = this.errorMessage(error);
        await EventBus.publish("AgentLoopFailed", { taskId, iteration, error: message });
        this.emitTrace(taskId, conversationId, "agent_loop", "failed", "Agent loop decision failed", { iteration }, message);
        return { status: "failed", observations, failedReason: message };
      }

      if (action.type === "finish") {
        await EventBus.publish("AgentLoopCompleted", { taskId, iterations: iteration - 1 });
        this.emitTrace(taskId, conversationId, "agent_loop", "done", "Agent loop completed", {
          iterations: iteration - 1
        });
        return { status: "completed", answer: action.answer, observations };
      }

      const tool = ToolManager.getTool(action.toolName);
      if (!tool) {
        const message = `Tool not found in registry: ${action.toolName}`;
        observations.push({ iteration, toolName: action.toolName, ok: false, error: message });
        await EventBus.publish("AgentLoopToolMissing", { taskId, iteration, toolName: action.toolName });
        this.emitTrace(taskId, conversationId, "tool_selection", "failed", "Requested tool is not registered", {
          iteration,
          toolName: action.toolName
        }, message);
        return { status: "failed", observations, failedReason: message };
      }

      const approval = await ApprovalPolicyService.evaluate({
        mode: input.approvalMode,
        conversationId: input.conversationId,
        taskId,
        action: action.approval?.action || this.approvalActionFor(tool.definition.permissions),
        command: action.approval?.command,
        files: action.approval?.files,
        paths: action.approval?.paths,
        approved: action.approval?.approved,
        reason: action.reason
      });

      if (!approval.allowed) {
        if (approval.requiresApproval && approval.request) {
          await EventBus.publish("AgentLoopApprovalRequired", {
            taskId,
            iteration,
            toolName: action.toolName,
            action: approval.request.action
          });
          this.emitTrace(taskId, conversationId, "approval", "active", "Agent loop is waiting for approval", {
            iteration,
            toolName: action.toolName,
            action: approval.request.action,
            risk: approval.request.risk
          });
          return { status: "waiting_approval", observations, approvalRequest: approval.request };
        }

        observations.push({ iteration, toolName: action.toolName, ok: false, error: approval.reason });
        await EventBus.publish("AgentLoopBlocked", { taskId, iteration, toolName: action.toolName, reason: approval.reason });
        this.emitTrace(taskId, conversationId, "approval", "failed", "Agent loop action blocked", {
          iteration,
          toolName: action.toolName
        }, approval.reason);
        return { status: "failed", observations, failedReason: approval.reason };
      }

      this.emitTrace(taskId, conversationId, "tool_execution", "active", `Running ${action.toolName}`, {
        iteration,
        toolName: action.toolName
      });

      try {
        const result = await ToolManager.execute(action.toolName, action.args || {}, {
          permissions: tool.definition.permissions
        });
        observations.push({ iteration, toolName: action.toolName, ok: true, result });
        await EventBus.publish("AgentLoopToolCompleted", { taskId, iteration, toolName: action.toolName });
        this.emitTrace(taskId, conversationId, "tool_execution", "done", `${action.toolName} completed`, {
          iteration,
          toolName: action.toolName
        });
      } catch (error) {
        const message = this.errorMessage(error);
        observations.push({ iteration, toolName: action.toolName, ok: false, error: message });
        await EventBus.publish("AgentLoopToolFailed", { taskId, iteration, toolName: action.toolName, error: message });
        this.emitTrace(taskId, conversationId, "tool_execution", "failed", `${action.toolName} failed`, {
          iteration,
          toolName: action.toolName
        }, message);
        return { status: "failed", observations, failedReason: message };
      }
    }

    await EventBus.publish("AgentLoopMaxIterations", { taskId, maxIterations });
    this.emitTrace(taskId, conversationId, "agent_loop", "failed", "Agent loop reached max iterations", {
      maxIterations
    });
    return { status: "max_iterations", observations, failedReason: "Agent loop reached max iterations." };
  }

  private static approvalActionFor(permissions: Array<"read" | "write" | "execute" | "network">): ApprovalAction {
    if (permissions.includes("network")) return "use_internet";
    if (permissions.includes("execute")) return "run_command";
    if (permissions.includes("write")) return "write_file";
    return "search_workspace";
  }

  private static emitTrace(
    taskId: string,
    conversationId: string,
    phase: string,
    status: "pending" | "active" | "done" | "failed" | "skipped",
    label: string,
    safeDetails?: any,
    error?: string
  ) {
    ExecutionTraceEmitter.emit({
      taskId,
      conversationId,
      phase,
      status,
      label,
      safeDetails,
      error,
      sourceService: "AgentLoopService"
    });
  }

  private static errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

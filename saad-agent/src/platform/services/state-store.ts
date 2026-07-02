import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";

export type TaskLifecycleState =
  | "NEW"
  | "CLASSIFIED"
  | "ANALYZING"
  | "EVIDENCE_COLLECTION"
  | "VALIDATING"
  | "GAP_ANALYSIS"
  | "IMPACT_ANALYSIS"
  | "RISK_ASSESSMENT"
  | "SOLUTION_DESIGN"
  | "PLANNING"
  | "WAIT_FOR_APPROVAL"
  | "IMPLEMENTING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED";

export interface TransitionRecord {
  from: TaskLifecycleState | null;
  to: TaskLifecycleState;
  timestamp: number;
  reason?: string;
}

export interface EngineeringTaskState {
  taskId: string;
  conversationId: string;
  currentState: TaskLifecycleState;
  previousState: TaskLifecycleState | null;
  status: "active" | "pending" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  transitionHistory: TransitionRecord[];
}

export class TaskStateStore {
  private static statesCache: Map<string, EngineeringTaskState> = new Map();
  private static loaded = false;

  private static getFilePath(): string {
    const dir = path.join(CONFIG.PROJECT_ROOT || process.cwd(), ".saad-agent", "tasks");
    return path.join(dir, "active-states.json");
  }

  private static async ensureDirectory(filePath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    } catch {
      // ignore
    }
  }

  private static async loadStore(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const filePath = this.getFilePath();
      const content = await fs.readFile(filePath, "utf8");
      const records: EngineeringTaskState[] = JSON.parse(content || "[]");
      this.statesCache.clear();
      for (const r of records) {
        this.statesCache.set(r.taskId, r);
      }
    } catch {
      this.statesCache.clear();
    }
  }

  private static async persistStore(): Promise<void> {
    try {
      const filePath = this.getFilePath();
      await this.ensureDirectory(filePath);
      const list = Array.from(this.statesCache.values());
      await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to persist task state store:", err);
    }
  }

  // Define valid transition mappings
  private static readonly ALLOWED_TRANSITIONS: Record<TaskLifecycleState, TaskLifecycleState[]> = {
    NEW: ["CLASSIFIED", "FAILED"],
    CLASSIFIED: ["ANALYZING", "FAILED"],
    ANALYZING: ["EVIDENCE_COLLECTION", "FAILED"],
    EVIDENCE_COLLECTION: ["VALIDATING", "FAILED"],
    VALIDATING: ["GAP_ANALYSIS", "FAILED"],
    GAP_ANALYSIS: ["IMPACT_ANALYSIS", "FAILED"],
    IMPACT_ANALYSIS: ["RISK_ASSESSMENT", "FAILED"],
    RISK_ASSESSMENT: ["SOLUTION_DESIGN", "FAILED"],
    SOLUTION_DESIGN: ["PLANNING", "FAILED"],
    PLANNING: ["WAIT_FOR_APPROVAL", "IMPLEMENTING", "FAILED"],
    WAIT_FOR_APPROVAL: ["IMPLEMENTING", "FAILED", "CLASSIFIED"],
    IMPLEMENTING: ["VERIFYING", "FAILED"],
    VERIFYING: ["COMPLETED", "FAILED"],
    COMPLETED: [],
    FAILED: []
  };

  static isValidTransition(from: TaskLifecycleState | null, to: TaskLifecycleState): boolean {
    if (from === null) return to === "NEW";
    if (to === "FAILED") return true; // Can always fail
    const allowed = this.ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static async initializeTask(taskId: string, conversationId: string): Promise<EngineeringTaskState> {
    await this.loadStore();
    const state: EngineeringTaskState = {
      taskId,
      conversationId,
      currentState: "NEW",
      previousState: null,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      transitionHistory: [
        {
          from: null,
          to: "NEW",
          timestamp: Date.now(),
          reason: "Task initialized"
        }
      ]
    };

    this.statesCache.set(taskId, state);
    await this.persistStore();

    ExecutionTraceEmitter.emit({
      taskId,
      conversationId,
      phase: "NEW",
      status: "active",
      label: "State: NEW",
      safeDetails: { reason: "Task initialized", previousState: null },
      sourceService: "TaskStateStore"
    });

    return state;
  }

  static async getTaskState(taskId: string): Promise<EngineeringTaskState | null> {
    await this.loadStore();
    return this.statesCache.get(taskId) || null;
  }

  static async listTasks(): Promise<EngineeringTaskState[]> {
    await this.loadStore();
    return Array.from(this.statesCache.values());
  }

  static async transitionTask(taskId: string, toState: TaskLifecycleState, reason?: string): Promise<EngineeringTaskState> {
    await this.loadStore();
    const state = this.statesCache.get(taskId);
    if (!state) {
      throw new Error(`Task state not found: ${taskId}`);
    }

    const fromState = state.currentState;
    if (!this.isValidTransition(fromState, toState)) {
      const errMsg = `Invalid state transition rejected: ${fromState} -> ${toState} for task ${taskId}`;
      console.warn(errMsg);
      throw new Error(errMsg);
    }

    state.previousState = fromState;
    state.currentState = toState;
    state.updatedAt = Date.now();
    
    // Set general status
    if (toState === "COMPLETED") {
      state.status = "completed";
    } else if (toState === "FAILED") {
      state.status = "failed";
    } else if (toState === "NEW" || toState === "WAIT_FOR_APPROVAL") {
      state.status = "pending";
    } else {
      state.status = "active";
    }

    const transitionRecord: TransitionRecord = {
      from: fromState,
      to: toState,
      timestamp: Date.now()
    };
    if (reason !== undefined) {
      transitionRecord.reason = reason;
    }
    state.transitionHistory.push(transitionRecord);

    this.statesCache.set(taskId, state);
    await this.persistStore();

    // Emit event to execution trace
    ExecutionTraceEmitter.emit({
      taskId,
      conversationId: state.conversationId,
      phase: toState,
      status: toState === "COMPLETED" ? "done" : toState === "FAILED" ? "failed" : toState === "WAIT_FOR_APPROVAL" ? "pending" : "active",
      label: `State: ${toState}`,
      safeDetails: { reason, previousState: fromState },
      sourceService: "TaskStateStore"
    });

    return state;
  }

  static async clearStore(): Promise<void> {
    this.statesCache.clear();
    await this.persistStore();
  }
}

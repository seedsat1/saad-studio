import { EventBus } from "./event-bus.js";
import { ExecutionSessionManager } from "./planner.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { ProjectIntelligenceService } from "./project-intelligence.js";
import { AgentRegistry, type Agent } from "./multi-agent.js";

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting';

export interface TaskNode {
  id: string;
  name: string;
  status: TaskStatus;
  dependencies: string[];
  run: () => Promise<any>;
  error?: string | undefined;
  startTime?: number;
  endTime?: number;
}

export interface OrchestratorSession {
  id: string;
  workspace: string;
  taskText: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'awaiting_approval' | 'awaiting_fix_approval' | 'cancelled';
  tasks: TaskNode[];
  createdAt: number;
  updatedAt: number;
  assignedAgents?: string[];
}

export class EngineeringOrchestrator {
  private static sessions: Map<string, OrchestratorSession> = new Map();

  static getSession(id: string): OrchestratorSession | undefined {
    return this.sessions.get(id);
  }

  static getSessions(): OrchestratorSession[] {
    return Array.from(this.sessions.values());
  }

  static createSession(taskText: string, workspace: string): OrchestratorSession {
    const plannerSession = ExecutionSessionManager.createSession(taskText, workspace);
    const matchedAgents = AgentRegistry.findAgentsForTask(taskText);
    const assignedAgents = matchedAgents.map(a => a.name);

    const tasks: TaskNode[] = [
      {
        id: "health-check",
        name: "Provider & Runtime Health Checks",
        status: "pending",
        dependencies: [],
        run: async () => {
          await ProjectIntelligenceService.refreshHealth();
        }
      },
      {
        id: "context-assembly",
        name: "Context & Memory Assembly",
        status: "pending",
        dependencies: [],
        run: async () => {
          await EngineeringMemory.retrieveRelevantContext(taskText);
        }
      },
      {
        id: "planning",
        name: "Plan Generation",
        status: "pending",
        dependencies: ["health-check", "context-assembly"],
        run: async () => {}
      },
      {
        id: "approval",
        name: "Awaiting User Approval",
        status: "pending",
        dependencies: ["planning"],
        run: async () => {}
      },
      {
        id: "checkpoint",
        name: "Pre-execution Checkpoint",
        status: "pending",
        dependencies: ["approval"],
        run: async () => {}
      },
      {
        id: "patch",
        name: "Applying Code Patches",
        status: "pending",
        dependencies: ["checkpoint"],
        run: async () => {}
      },
      {
        id: "build",
        name: "Build & Compilation Checks",
        status: "pending",
        dependencies: ["patch"],
        run: async () => {}
      },
      {
        id: "tests",
        name: "Test Verification Suite",
        status: "pending",
        dependencies: ["build"],
        run: async () => {}
      },
      {
        id: "review",
        name: "Engineering Memory Logging",
        status: "pending",
        dependencies: ["tests"],
        run: async () => {}
      }
    ];

    const session: OrchestratorSession = {
      id: plannerSession.id,
      workspace,
      taskText,
      status: 'awaiting_approval',
      tasks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      assignedAgents,
    };

    this.sessions.set(session.id, session);
    EventBus.publish("ActiveSessionCreated", { sessionId: session.id });
    return session;
  }

  static async respondToPlan(sessionId: string, approved: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    if (session.status === "paused") {
      throw new Error("Session is currently paused");
    }

    const planTask = session.tasks.find(t => t.id === "planning");
    const appTask = session.tasks.find(t => t.id === "approval");
    if (planTask) planTask.status = "completed";

    if (approved) {
      if (appTask) appTask.status = "completed";
      session.status = "running";
      ExecutionSessionManager.respondToPlan(sessionId, true);
    } else {
      if (appTask) appTask.status = "failed";
      session.status = "failed";
      ExecutionSessionManager.respondToPlan(sessionId, false);
    }
    session.updatedAt = Date.now();
    EventBus.publish("SessionStatusChanged", { sessionId, status: session.status });
  }

  static async executePlan(sessionId: string, patchContent?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    if (session.status === "paused") {
      throw new Error("Session is currently paused");
    }

    session.status = "running";
    session.updatedAt = Date.now();

    const runSteps = ["checkpoint", "patch", "build", "tests", "review"];
    for (const stepId of runSteps) {
      const task = session.tasks.find(t => t.id === stepId);
      if (task) task.status = "running";
    }

    const success = await ExecutionSessionManager.executeApprovedPlan(sessionId, patchContent);
    const pSession = ExecutionSessionManager.getSession(sessionId);

    if (success) {
      for (const stepId of runSteps) {
        const task = session.tasks.find(t => t.id === stepId);
        if (task) {
          task.status = "completed";
        }
      }
      session.status = "completed";
    } else {
      const buildTask = session.tasks.find(t => t.id === "build");
      const testTask = session.tasks.find(t => t.id === "tests");
      const patchTask = session.tasks.find(t => t.id === "patch");
      const checkpointTask = session.tasks.find(t => t.id === "checkpoint");
      if (checkpointTask) checkpointTask.status = "completed";
      if (patchTask) patchTask.status = "completed";

      if (pSession?.state === "awaiting_fix_approval") {
        if (buildTask) {
          buildTask.status = "failed";
          buildTask.error = pSession.failureReason;
        }
        if (testTask) testTask.status = "waiting";
        session.status = "awaiting_fix_approval";
      } else {
        if (buildTask) buildTask.status = "failed";
        if (testTask) testTask.status = "failed";
        session.status = "failed";
      }
    }
    EventBus.publish("SessionStatusChanged", { sessionId, status: session.status });
  }

  static async respondToFix(sessionId: string, approved: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    if (session.status === "paused") {
      throw new Error("Session is currently paused");
    }

    if (approved) {
      session.status = "running";
      const buildTask = session.tasks.find(t => t.id === "build");
      const testTask = session.tasks.find(t => t.id === "tests");
      if (buildTask) buildTask.status = "running";
      if (testTask) testTask.status = "running";

      await ExecutionSessionManager.respondToFix(sessionId, true);
      const pSession = ExecutionSessionManager.getSession(sessionId);

      if (pSession?.state === "completed") {
        if (buildTask) buildTask.status = "completed";
        if (testTask) testTask.status = "completed";
        const reviewTask = session.tasks.find(t => t.id === "review");
        if (reviewTask) reviewTask.status = "completed";
        session.status = "completed";
      } else if (pSession?.state === "awaiting_fix_approval") {
        if (buildTask) {
          buildTask.status = "failed";
          buildTask.error = pSession.failureReason;
        }
        session.status = "awaiting_fix_approval";
      } else {
        if (buildTask) buildTask.status = "failed";
        if (testTask) testTask.status = "failed";
        session.status = "failed";
      }
    } else {
      session.status = "failed";
      await ExecutionSessionManager.respondToFix(sessionId, false);
    }
    session.updatedAt = Date.now();
    EventBus.publish("SessionStatusChanged", { sessionId, status: session.status });
  }

  static async rollbackSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    session.status = "cancelled";
    for (const t of session.tasks) {
      if (t.status === "running" || t.status === "pending" || t.status === "waiting") {
        t.status = "failed";
        t.error = "Rolled back by user";
      }
    }
    session.updatedAt = Date.now();
    const result = await ExecutionSessionManager.rollbackSession(sessionId);
    EventBus.publish("SessionStatusChanged", { sessionId, status: session.status });
    return result;
  }

  static pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    if (session.status === "running" || session.status === "awaiting_approval" || session.status === "awaiting_fix_approval") {
      session.status = "paused";
      session.updatedAt = Date.now();
      EventBus.publish("SessionStatusChanged", { sessionId, status: "paused" });
    }
  }

  static resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Orchestrator session not found");

    if (session.status === "paused") {
      const pSession = ExecutionSessionManager.getSession(sessionId);
      if (pSession?.state === "awaiting_approval") {
        session.status = "awaiting_approval";
      } else if (pSession?.state === "awaiting_fix_approval") {
        session.status = "awaiting_fix_approval";
      } else {
        session.status = "running";
      }
      session.updatedAt = Date.now();
      EventBus.publish("SessionStatusChanged", { sessionId, status: session.status });
    }
  }

  static async executeParallelGraph(session: OrchestratorSession): Promise<void> {
    if (session.status === "paused") return;

    const initialTasks = session.tasks.filter(t => t.dependencies.length === 0 && t.status === "pending");

    await Promise.all(
      initialTasks.map(async (task) => {
        task.status = "running";
        task.startTime = Date.now();
        try {
          await task.run();
          task.status = "completed";
        } catch (err: any) {
          task.status = "failed";
          task.error = err.message;
        }
        task.endTime = Date.now();
      })
    );
  }
}

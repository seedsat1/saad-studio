export interface WorkflowStep {
  id: string;
  name: string;
  action: string; // The service action or tool name to run
  dependsOn?: string[];
  conditions?: Array<{
    variable: string;
    operator: "eq" | "ne" | "contains";
    value: any;
  }>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowState {
  workflowId: string;
  status: "idle" | "running" | "completed" | "failed" | "paused";
  currentStepIndex: number;
  variables: Record<string, any>;
  stepResults: Record<string, { success: boolean; output?: any; error?: string }>;
  startedAt?: number;
  completedAt?: number;
}

export class WorkflowEngine {
  private static workflowRegistry: Record<string, WorkflowDefinition> = {};
  private static activeStates: Record<string, WorkflowState> = {};

  static registerWorkflow(definition: WorkflowDefinition): void {
    this.workflowRegistry[definition.id] = definition;
  }

  static getWorkflow(id: string): WorkflowDefinition | null {
    return this.workflowRegistry[id] || null;
  }

  static createSession(
    workflowId: string,
    initialVariables: Record<string, any> = {}
  ): string {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow definition not registered: ${workflowId}`);
    }

    const sessionId = `wf-session-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    this.activeStates[sessionId] = {
      workflowId,
      status: "idle",
      currentStepIndex: 0,
      variables: initialVariables,
      stepResults: {},
    };

    return sessionId;
  }

  static getSessionState(sessionId: string): WorkflowState | null {
    return this.activeStates[sessionId] || null;
  }

  static updateSessionState(
    sessionId: string,
    updates: Partial<WorkflowState>
  ): void {
    const state = this.getSessionState(sessionId);
    if (state) {
      this.activeStates[sessionId] = { ...state, ...updates };
    }
  }

  static clearRegistry(): void {
    this.workflowRegistry = {};
    this.activeStates = {};
  }
}

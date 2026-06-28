export type AgentStatus = "idle" | "initializing" | "active" | "error" | "disposed";

export interface AgentSDKConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  supportedTasks: string[];
  supportedSkills: string[];
}

export abstract class BaseAgentSDK {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly description: string;
  public readonly capabilities: string[];
  public readonly supportedTasks: string[];
  public readonly supportedSkills: string[];
  public status: AgentStatus = "idle";

  constructor(config: AgentSDKConfig) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
    this.capabilities = config.capabilities;
    this.supportedTasks = config.supportedTasks;
    this.supportedSkills = config.supportedSkills;
  }

  async initialize(): Promise<void> {
    this.status = "initializing";
  }

  async activate(): Promise<void> {
    this.status = "active";
  }

  async deactivate(): Promise<void> {
    this.status = "idle";
  }

  abstract execute(task: { taskId: string; prompt: string; context?: any }): Promise<{ success: boolean; result: string }>;

  async dispose(): Promise<void> {
    this.status = "disposed";
  }
}

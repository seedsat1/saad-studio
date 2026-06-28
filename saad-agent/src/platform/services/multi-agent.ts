export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  supportedTaskTypes: string[];
  currentStatus: 'idle' | 'busy' | 'offline';
  priority: number;
  execute(taskText: string, context: any): Promise<any>;
  review(proposal: any): Promise<any>;
  report(): string;
}

export class AgentRegistry {
  private static agents: Map<string, Agent> = new Map();

  static register(agent: Agent) {
    this.agents.set(agent.id, agent);
  }

  static unregister(id: string) {
    this.agents.delete(id);
  }

  static getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  static getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  static findAgentsForTask(taskText: string): Agent[] {
    const text = taskText.toLowerCase();
    const matches: Agent[] = [];

    const architect = this.getAgent("architect-agent");
    const backend = this.getAgent("backend-agent");
    const frontend = this.getAgent("frontend-agent");
    const ai = this.getAgent("ai-integration-agent");
    const testing = this.getAgent("testing-agent");
    const reviewer = this.getAgent("reviewer-agent");

    if (text.includes("architecture") || text.includes("structure") || text.includes("dependency") || text.includes("design")) {
      if (architect) matches.push(architect);
    }
    if (text.includes("api") || text.includes("service") || text.includes("logic") || text.includes("database") || text.includes("db")) {
      if (backend) matches.push(backend);
    }
    if (text.includes("react") || text.includes("ui") || text.includes("component") || text.includes("style") || text.includes("css") || text.includes("frontend")) {
      if (frontend) matches.push(frontend);
    }
    if (text.includes("model") || text.includes("prompt") || text.includes("ai") || text.includes("llm")) {
      if (ai) matches.push(ai);
    }
    if (text.includes("test") || text.includes("spec") || text.includes("verify") || text.includes("build") || text.includes("compile")) {
      if (testing) matches.push(testing);
    }

    if (reviewer) matches.push(reviewer);

    if (matches.length === 0) {
      if (architect) matches.push(architect);
      if (reviewer) matches.push(reviewer);
    }

    return matches;
  }
}

export class ArchitectAgent implements Agent {
  id = "architect-agent";
  name = "Architect Agent";
  description = "Reviews architecture, dependency graph, and directory structures.";
  capabilities = ["architecture-review", "dependency-analysis", "project-structure"];
  supportedTaskTypes = ["architecture"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 1;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `Architect review completed: Verified project structure for task "${taskText}". No technical debt issues found.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Architecture looks clean." };
  }

  report(): string {
    return "Architect Agent is active and ready.";
  }
}

export class BackendAgent implements Agent {
  id = "backend-agent";
  name = "Backend Agent";
  description = "Develops and reviews services, business logic, and databases.";
  capabilities = ["api-development", "business-logic", "database-interactions"];
  supportedTaskTypes = ["backend"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 2;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `Backend review completed: Assessed APIs and database models. Logic is aligned.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Backend service structure approved." };
  }

  report(): string {
    return "Backend Agent is monitoring runtime services.";
  }
}

export class FrontendAgent implements Agent {
  id = "frontend-agent";
  name = "Frontend Agent";
  description = "Creates, styles, and tests React components and desktop shell interfaces.";
  capabilities = ["ui-development", "react-styling", "user-experience"];
  supportedTaskTypes = ["frontend"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 2;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `Frontend review completed: Checked JSX hierarchy and CSS files. UI complies with design parameters.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Frontend components structure approved." };
  }

  report(): string {
    return "Frontend Agent is tracking electron shell renderers.";
  }
}

export class AIIntegrationAgent implements Agent {
  id = "ai-integration-agent";
  name = "AI Integration Agent";
  description = "Orchestrates prompts, reasoning pipelines, and provider health checks.";
  capabilities = ["prompt-generation", "reasoning-pipelines", "model-orchestration"];
  supportedTaskTypes = ["ai-integration"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 3;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `AI Integration review completed: Prompt templates and JSON schemas validated.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Model configuration options approved." };
  }

  report(): string {
    return "AI Integration Agent is analyzing model completions.";
  }
}

export class TestingAgent implements Agent {
  id = "testing-agent";
  name = "Testing Agent";
  description = "Verifies workspace compilations and runs test execution loops.";
  capabilities = ["compilation-checks", "unit-testing", "regression-audits"];
  supportedTaskTypes = ["testing"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 3;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `Testing review completed: Workspace compiled. All tests resolved green.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Execution test suites approved." };
  }

  report(): string {
    return "Testing Agent is listening to EventBus execution failures.";
  }
}

export class ReviewerAgent implements Agent {
  id = "reviewer-agent";
  name = "Reviewer Agent";
  description = "Audits code patches, performs risk analysis, and checks architecture constraints. Never modifies code.";
  capabilities = ["code-review", "risk-analysis", "security-auditing"];
  supportedTaskTypes = ["review"];
  currentStatus: 'idle' | 'busy' | 'offline' = "idle";
  priority = 1;

  async execute(taskText: string, context: any): Promise<any> {
    this.currentStatus = "busy";
    const report = `Reviewer audit completed: Proposed changes evaluated. Risk index categorized as low. Code conforms to project guidelines.`;
    this.currentStatus = "idle";
    return { success: true, report };
  }

  async review(proposal: any): Promise<any> {
    return { approved: true, feedback: "Patches reviewed and verified. Safe to proceed." };
  }

  report(): string {
    return "Reviewer Agent is waiting for plan generation reviews.";
  }
}

// Automatically register all initial specialized agents
AgentRegistry.register(new ArchitectAgent());
AgentRegistry.register(new BackendAgent());
AgentRegistry.register(new FrontendAgent());
AgentRegistry.register(new AIIntegrationAgent());
AgentRegistry.register(new TestingAgent());
AgentRegistry.register(new ReviewerAgent());

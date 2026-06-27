import { WorkflowEngine } from "./workflow-engine.js";
import type { WorkflowDefinition } from "./workflow-engine.js";

export const EngineeringPlanningWorkflow: WorkflowDefinition = {
  id: "EngineeringPlanningWorkflow",
  name: "Engineering Planning Workflow",
  steps: [
    {
      id: "create-session",
      name: "Initialize Session",
      action: "planner:create-session",
    },
    {
      id: "assemble-context",
      name: "Assemble Codebase Context",
      action: "planner:assemble-context",
      dependsOn: ["create-session"],
    },
    {
      id: "generate-plan",
      name: "Formulate Execution Steps",
      action: "planner:generate-plan",
      dependsOn: ["assemble-context"],
    },
    {
      id: "estimate-risk",
      name: "Analyze Workload Risks",
      action: "planner:estimate-risk",
      dependsOn: ["generate-plan"],
    },
    {
      id: "request-approval",
      name: "Awaiting User Approval",
      action: "planner:request-approval",
      dependsOn: ["estimate-risk"],
    },
  ],
};

// Automatically register the workflow
WorkflowEngine.registerWorkflow(EngineeringPlanningWorkflow);

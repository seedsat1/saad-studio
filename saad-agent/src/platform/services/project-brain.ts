import { DecisionMemoryService } from "./decision-memory.js";
import { UserMemoryService } from "./user-memory.js";

export interface ProjectBrainOverview {
  vision: string;
  architecture: string;
  rules: string[];
  codingStandards: string[];
  completedFeatures: string[];
  roadmap: string[];
  knownIssues: string[];
  adrsCount: number;
}

export class ProjectBrainService {
  static async getOverview(): Promise<ProjectBrainOverview> {
    const adrs = await DecisionMemoryService.getDecisions();
    const facts = await UserMemoryService.getAllFacts();

    return {
      vision: "Saad Studio: Next-Generation AI Content & SaaS Production Studio.",
      architecture: "Modular Hybrid Engine: Next.js 14 App Router + Electron + Native AI Providers + Brave Research.",
      rules: facts.map((f) => f.rawFact),
      codingStandards: [
        "Use TypeScript strict typing.",
        "Maintain Dark Glass aesthetic with deep blue & gold highlights.",
        "Always review project rules and ADRs before generating code.",
      ],
      completedFeatures: [
        "Saad Agent v5.0 Architectural Subsystems",
        "Brave Answers Live Research Provider",
        "Permanent Operational Skills System",
        "Multi-Cam & Silence Removal Premiere CEP Plugins",
      ],
      roadmap: [
        "Saad Agent v6.0 Engineering Console Transformation",
        "AI Model Wizard Integration",
        "Autonomous Autopilot Pipeline",
      ],
      knownIssues: [
        "LM Studio single-concurrency queue waiting times during parallel generation",
      ],
      adrsCount: adrs.length,
    };
  }
}

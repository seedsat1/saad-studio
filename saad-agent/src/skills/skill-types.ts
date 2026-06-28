export interface Skill {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  triggers: {
    keywords: string[];
    filePatterns: string[];
    taskTypes?: string[];
  };
  capabilities: string[];
  knowledgeFiles?: string[];
  promptTemplates: {
    systemRules: string[];
    planningGuidelines?: string[];
  };
  validationRules?: string[];
  recommendedTools: string[];
  supportedAgents: string[];
  status?: "enabled" | "disabled" | "invalid";
  source?: "builtin" | "custom" | "workspace";
  lastLoadedAt?: string;
}

export interface ActiveSkillMatch {
  skill: Skill;
  confidence: number; // 0 to 100
  activationReason: string;
  matchedTriggers: string[];
}

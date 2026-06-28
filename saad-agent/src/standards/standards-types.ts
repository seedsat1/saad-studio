export interface CodingStandards {
  namingConventions: string[];
  typescriptRules: string[];
  reactRules: string[];
  electronRules: string[];
  pythonRules: string[];
  testingRules: string[];
}

export interface UIStandards {
  spacing: string;
  typography: string;
  colors: string[];
  accessibility: string[];
  componentConsistency: string[];
}

export interface ArchitectureStandards {
  folderOrganization: string[];
  dependencyRules: string[];
  moduleBoundaries: string[];
  layeringRules: string[];
}

export interface ReviewStandards {
  reviewChecklist: string[];
  securityChecklist: string[];
  performanceChecklist: string[];
  maintainabilityChecklist: string[];
}

export interface UserPreferences {
  preferredCodingStyle: string;
  preferredUIStyle: string;
  preferredPlanningFormat: string;
  preferredReviewFormat: string;
}

export interface DecisionPolicies {
  neverModifyEnv: boolean;
  alwaysCheckpointBeforePatches: boolean;
  preferIncrementalUpdates: boolean;
  avoidUnnecessaryDependencies: boolean;
  customPolicies: string[];
}

export interface EngineeringStandards {
  version: string;
  coding: CodingStandards;
  ui: UIStandards;
  architecture: ArchitectureStandards;
  review: ReviewStandards;
  userPreferences: UserPreferences;
  policies: DecisionPolicies;
}

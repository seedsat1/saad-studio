import type { ContextItem } from "../platform/services/context-manager.js";

export type ContextKind =
  | "file"
  | "architecture"
  | "dependency"
  | "summary"
  | "decision"
  | "failure"
  | "success"
  | "knowledge"
  | "attachment";

export interface RankedContextCandidate {
  item: ContextItem;
  score: number;
  kind: ContextKind;
  reasons: string[];
}

export interface ContextCategories {
  retrievedFiles: number;
  engineeringMemoryMatches: number;
  previousDecisions: number;
  failureMemories: number;
  successMemories: number;
  architectureReferences: number;
  dependencyReferences: number;
  attachmentReferences: number;
}

export interface WorkspaceContextStats {
  candidateFiles: number;
  skippedSensitiveFiles: number;
  attachmentMetadataFiles: number;
  recentModifications: number;
}

export interface SemanticIndexSummary {
  files: number;
  classes: number;
  functions: number;
  symbols: number;
  dependencies: number;
  keywords: number;
  engineeringTopics: number;
  architectureComponents: number;
}

export interface ContextRetrievalResult {
  items: ContextItem[];
  tokenUsage: number;
  limit: number;
  compressionSummary: string;
  categories: ContextCategories;
  workspaceStats: WorkspaceContextStats;
  rankingSummary: string[];
  semanticIndexSummary: SemanticIndexSummary;
}

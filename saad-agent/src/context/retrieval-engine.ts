import type { ContextCategories, ContextKind, RankedContextCandidate } from "./context-types.js";

export class RetrievalEngine {
  static kindFromMemoryId(id: string): ContextKind {
    if (id.startsWith("memory:decision:")) return "decision";
    if (id.startsWith("memory:failure:")) return "failure";
    if (id.startsWith("memory:success:")) return "success";
    return "knowledge";
  }

  static buildCategories(candidates: RankedContextCandidate[]): ContextCategories {
    return {
      retrievedFiles: candidates.filter((c) => c.kind === "file").length,
      engineeringMemoryMatches: candidates.filter((c) => ["decision", "failure", "success", "knowledge"].includes(c.kind)).length,
      previousDecisions: candidates.filter((c) => c.kind === "decision").length,
      failureMemories: candidates.filter((c) => c.kind === "failure").length,
      successMemories: candidates.filter((c) => c.kind === "success").length,
      architectureReferences: candidates.filter((c) => c.kind === "architecture").length,
      dependencyReferences: candidates.filter((c) => c.kind === "dependency").length,
      attachmentReferences: candidates.filter((c) => c.kind === "attachment").length
    };
  }
}

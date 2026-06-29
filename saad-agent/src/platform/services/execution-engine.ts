export type ExecutionStrategy = "Sequential" | "Parallel" | "Batch" | "Retry" | "Rollback";

export interface ExecutionStrategyResult {
  strategy: ExecutionStrategy;
  description: string;
}

export class ExecutionEngineService {
  static determineStrategy(filesCount: number, isRefactoring = false): ExecutionStrategyResult {
    if (isRefactoring) {
      return { strategy: "Sequential", description: "Sequential execution selected to ensure safe refactoring without race conditions." };
    }
    if (filesCount > 3) {
      return { strategy: "Parallel", description: "Parallel execution selected to optimize speed across multiple independent files." };
    }
    return { strategy: "Sequential", description: "Standard sequential execution." };
  }
}

import type { BaseRuntime, RuntimeExecutionResult } from "./runtime-interface.js";
import { NodeRuntime } from "./node-runtime.js";
import { PythonRuntime } from "./python-runtime.js";

export class RuntimeManager {
  private static runtimes = {
    node: new NodeRuntime(),
    python: new PythonRuntime(),
  };

  static getRuntime(type: "node" | "python"): BaseRuntime {
    const runtime = this.runtimes[type];
    if (!runtime) {
      throw new Error(`Runtime type not supported: ${type}`);
    }
    return runtime;
  }

  static getPythonRuntime(): PythonRuntime {
    return this.runtimes.python;
  }

  static async detectAll(): Promise<{
    node: { isValid: boolean; version: string; path: string };
    python: { isValid: boolean; version: string; path: string };
  }> {
    const nodeInfo = await this.runtimes.node.detect();
    const pythonInfo = await this.runtimes.python.detect();
    return {
      node: {
        isValid: nodeInfo.isValid,
        version: nodeInfo.version,
        path: nodeInfo.executablePath,
      },
      python: {
        isValid: pythonInfo.isValid,
        version: pythonInfo.version,
        path: pythonInfo.executablePath,
      },
    };
  }

  static async checkHealth(type: "node" | "python"): Promise<{ healthy: boolean; details?: string }> {
    return this.getRuntime(type).checkHealth();
  }

  static async execute(
    type: "node" | "python",
    scriptPath: string,
    args: string[] = [],
    cwd?: string
  ): Promise<RuntimeExecutionResult> {
    return this.getRuntime(type).executeScript(scriptPath, args, cwd);
  }
}

export interface RuntimeExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  error?: string;
}

export interface RuntimePackage {
  name: string;
  version: string;
}

export interface RuntimeEnvironmentInfo {
  type: "node" | "python" | "other";
  name: string;
  executablePath: string;
  version: string;
  isValid: boolean;
}

export interface BaseRuntime {
  id: string;
  name: string;
  type: "node" | "python" | "other";

  detect(): Promise<RuntimeEnvironmentInfo>;
  checkHealth(): Promise<{ healthy: boolean; details?: string }>;
  executeScript(scriptPath: string, args?: string[], cwd?: string): Promise<RuntimeExecutionResult>;
  listPackages(): Promise<RuntimePackage[]>;
  installPackage(packageName: string, version?: string): Promise<RuntimeExecutionResult>;
}

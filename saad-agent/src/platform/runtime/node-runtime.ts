import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import type { BaseRuntime, RuntimeEnvironmentInfo, RuntimeExecutionResult, RuntimePackage } from "./runtime-interface.js";
import { CONFIG } from "../../config.js";

const execAsync = promisify(exec);

export class NodeRuntime implements BaseRuntime {
  id = "node";
  name = "NodeJS Runtime";
  type: "node" = "node";

  async detect(): Promise<RuntimeEnvironmentInfo> {
    try {
      const nodePath = process.execPath;
      const version = process.version;
      return {
        type: "node",
        name: "NodeJS",
        executablePath: nodePath.replace(/\\/g, "/"),
        version,
        isValid: true,
      };
    } catch (err: any) {
      return {
        type: "node",
        name: "NodeJS",
        executablePath: "",
        version: "unknown",
        isValid: false,
      };
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; details?: string }> {
    try {
      const { stdout } = await execAsync("node -v");
      return { healthy: true, details: `Node version: ${stdout.trim()}` };
    } catch (err: any) {
      return { healthy: false, details: err.message };
    }
  }

  async executeScript(scriptPath: string, args: string[] = [], cwd?: string): Promise<RuntimeExecutionResult> {
    const runCwd = cwd || CONFIG.PROJECT_ROOT;
    const command = `node "${scriptPath}" ${args.join(" ")}`;
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: runCwd });
      return {
        success: true,
        stdout,
        stderr,
        code: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        stdout: err.stdout || "",
        stderr: err.stderr || "",
        code: err.code || 1,
        error: err.message,
      };
    }
  }

  async listPackages(): Promise<RuntimePackage[]> {
    try {
      const pkgJsonPath = path.join(CONFIG.PROJECT_ROOT, "package.json");
      const content = await fs.readFile(pkgJsonPath, "utf8");
      const pkg = JSON.parse(content);
      const dependencies = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      return Object.entries(dependencies).map(([name, version]: [string, any]) => ({
        name,
        version: String(version).replace(/[^0-9.]/g, ""),
      }));
    } catch {
      return [];
    }
  }

  async installPackage(packageName: string, version?: string): Promise<RuntimeExecutionResult> {
    const pkgTarget = version ? `${packageName}@${version}` : packageName;
    const command = `npm install ${pkgTarget}`;
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: CONFIG.PROJECT_ROOT });
      return {
        success: true,
        stdout,
        stderr,
        code: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        stdout: err.stdout || "",
        stderr: err.stderr || "",
        code: err.code || 1,
        error: err.message,
      };
    }
  }
}

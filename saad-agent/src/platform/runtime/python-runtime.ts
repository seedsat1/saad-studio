import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import type { BaseRuntime, RuntimeEnvironmentInfo, RuntimeExecutionResult, RuntimePackage } from "./runtime-interface.js";
import { CONFIG } from "../../config.js";

const execAsync = promisify(exec);

export class PythonRuntime implements BaseRuntime {
  id = "python";
  name = "Python Runtime";
  type: "python" = "python";
  private customPythonPath: string | null = null;

  setEnvironment(pythonPath: string): void {
    this.customPythonPath = pythonPath;
  }

  async detect(): Promise<RuntimeEnvironmentInfo> {
    const venvPath = await this.detectVenv();
    let executablePath = this.customPythonPath || venvPath || (await this.detectSystemPython()) || "python";

    try {
      const { stdout } = await execAsync(`"${executablePath}" --version`);
      const version = stdout.replace("Python", "").trim();
      return {
        type: "python",
        name: venvPath ? "Python (Venv)" : "Python (System)",
        executablePath: executablePath.replace(/\\/g, "/"),
        version,
        isValid: true,
      };
    } catch {
      // Fallback check if it fails but we still have an executable
      return {
        type: "python",
        name: "Python (Invalid)",
        executablePath: executablePath.replace(/\\/g, "/"),
        version: "unknown",
        isValid: false,
      };
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; details?: string }> {
    const info = await this.detect();
    if (!info.isValid) {
      return { healthy: false, details: "No valid Python executable found." };
    }
    return {
      healthy: true,
      details: `Python environment verified at: ${info.executablePath} (version: ${info.version})`,
    };
  }

  async executeScript(scriptPath: string, args: string[] = [], cwd?: string): Promise<RuntimeExecutionResult> {
    const runCwd = cwd || CONFIG.PROJECT_ROOT;
    const info = await this.detect();
    
    // Command wraps python script execution
    const command = `"${info.executablePath}" "${scriptPath}" ${args.join(" ")}`;
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
    const info = await this.detect();
    if (!info.isValid) return [];

    try {
      // Execute pip list
      const pipPath = await this.getPipExecutablePath(info.executablePath);
      const { stdout } = await execAsync(`"${pipPath}" list --format=json`);
      const packages = JSON.parse(stdout);
      return packages.map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
      }));
    } catch {
      // Fallback via simple python script if pip list fails
      try {
        const script = "import pkg_resources; print([(p.project_name, p.version) for p in pkg_resources.working_set])";
        const { stdout } = await execAsync(`"${info.executablePath}" -c "${script}"`);
        const parsed = eval(stdout); // Safe to eval local python output format
        return parsed.map(([name, version]: [string, string]) => ({ name, version }));
      } catch {
        return [];
      }
    }
  }

  async installPackage(packageName: string, version?: string): Promise<RuntimeExecutionResult> {
    const info = await this.detect();
    if (!info.isValid) {
      return {
        success: false,
        stdout: "",
        stderr: "Cannot install package: No valid Python executable found.",
        code: -1,
      };
    }

    const pipPath = await this.getPipExecutablePath(info.executablePath);
    const targetPkg = version ? `${packageName}==${version}` : packageName;
    const command = `"${pipPath}" install ${targetPkg}`;

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

  private async detectVenv(): Promise<string | null> {
    const commonVenvDirs = [".venv", "venv", "env"];
    const isWindows = process.platform === "win32";

    for (const venvDir of commonVenvDirs) {
      const venvPath = path.join(CONFIG.PROJECT_ROOT, venvDir);
      const pythonExe = isWindows
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");

      try {
        await fs.access(pythonExe);
        return pythonExe;
      } catch {}
    }

    return null;
  }

  private async detectSystemPython(): Promise<string | null> {
    const commands = ["python", "python3"];
    for (const cmd of commands) {
      try {
        await execAsync(`${cmd} --version`);
        return cmd;
      } catch {}
    }
    return null;
  }

  private async getPipExecutablePath(pythonPath: string): Promise<string> {
    // If it's venv, pip is inside the same Scripts/bin folder
    const isWindows = process.platform === "win32";
    if (pythonPath.endsWith("python.exe") || pythonPath.endsWith("python")) {
      const dir = path.dirname(pythonPath);
      const pipExe = isWindows ? path.join(dir, "pip.exe") : path.join(dir, "pip");
      try {
        await fs.access(pipExe);
        return pipExe;
      } catch {}
    }
    return "pip";
  }
}

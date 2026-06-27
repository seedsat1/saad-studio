import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { setProjectRoot } from "../config.js";
import { StorageManager } from "./storage-manager.js";

export interface GlobalConfig {
  lastActiveWorkspace?: string;
}

export interface RecentWorkspaceEntry {
  path: string;
  name: string;
  lastOpened: number;
}

export interface RecentWorkspaces {
  workspaces: RecentWorkspaceEntry[];
}

async function getElectronApp(): Promise<any> {
  try {
    const { app } = await import("electron");
    return app;
  } catch {
    return null;
  }
}

export async function getGlobalAppDataDir(): Promise<string> {
  const app = await getElectronApp();
  if (app) {
    try {
      return app.getPath("userData");
    } catch {}
  }
  // Fallback for CLI/Node execution
  return path.join(os.homedir(), ".saad-agent");
}

export class WorkspaceManager {
  private static async getGlobalConfigPath(): Promise<string> {
    const appDataDir = await getGlobalAppDataDir();
    return path.join(appDataDir, "config.json");
  }

  private static async getRecentPath(): Promise<string> {
    const appDataDir = await getGlobalAppDataDir();
    return path.join(appDataDir, "recent.json");
  }

  static async loadGlobalConfig(): Promise<GlobalConfig> {
    const configPath = await this.getGlobalConfigPath();
    try {
      const data = await fs.readFile(configPath, "utf8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  static async saveGlobalConfig(config: GlobalConfig): Promise<void> {
    const configPath = await this.getGlobalConfigPath();
    const appDataDir = path.dirname(configPath);
    await fs.mkdir(appDataDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  }

  static async loadRecentWorkspaces(): Promise<RecentWorkspaces> {
    const recentPath = await this.getRecentPath();
    try {
      const data = await fs.readFile(recentPath, "utf8");
      return JSON.parse(data);
    } catch {
      return { workspaces: [] };
    }
  }

  static async saveRecentWorkspaces(recent: RecentWorkspaces): Promise<void> {
    const recentPath = await this.getRecentPath();
    const appDataDir = path.dirname(recentPath);
    await fs.mkdir(appDataDir, { recursive: true });
    await fs.writeFile(recentPath, JSON.stringify(recent, null, 2), "utf8");
  }

  static async addRecentWorkspace(workspacePath: string): Promise<void> {
    const normalizedPath = path.resolve(workspacePath).replace(/\\/g, "/");
    const recent = await this.loadRecentWorkspaces();
    const name = normalizedPath.split("/").pop() || "unknown";

    const workspaces = recent.workspaces.filter(
      (w) => w.path.toLowerCase() !== normalizedPath.toLowerCase()
    );

    workspaces.unshift({
      path: normalizedPath,
      name,
      lastOpened: Date.now(),
    });

    // Keep up to 10 workspaces
    recent.workspaces = workspaces.slice(0, 10);
    await this.saveRecentWorkspaces(recent);
  }

  static async validateWorkspace(
    workspacePath: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const normalizedPath = path.resolve(workspacePath);
      const stat = await fs.stat(normalizedPath);
      if (!stat.isDirectory()) {
        return { valid: false, error: "Selected path is not a directory." };
      }

      // Check workspace footprint (must have package.json or .git folder)
      const packageJsonExists = await fs
        .access(path.join(normalizedPath, "package.json"))
        .then(() => true)
        .catch(() => false);
      const gitDirExists = await fs
        .access(path.join(normalizedPath, ".git"))
        .then(() => true)
        .catch(() => false);

      if (!packageJsonExists && !gitDirExists) {
        return {
          valid: false,
          error: "Directory is not a valid project (missing package.json or .git).",
        };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message || "Directory is not accessible." };
    }
  }

  static async initializeWorkspace(workspacePath: string): Promise<void> {
    const agentDir = path.join(workspacePath, ".saad-agent");

    // Initialize required folders via StorageManager
    await StorageManager.initializeDirectories(workspacePath);

    // Check if knowledge base memory exists and is valid
    const memoryPath = path.join(agentDir, "knowledge", "memory.json");
    try {
      const data = await fs.readFile(memoryPath, "utf8");
      JSON.parse(data);
    } catch (err) {
      // If it exists but is corrupted, raise an error
      const exists = await fs
        .access(memoryPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        throw new Error(
          `Workspace metadata is corrupted: ${memoryPath}. Propose recovery or clean setup.`
        );
      }
    }
  }

  static async switchWorkspace(workspacePath: string): Promise<void> {
    const validation = await this.validateWorkspace(workspacePath);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid workspace folder.");
    }

    const normalizedPath = path.resolve(workspacePath).replace(/\\/g, "/");

    // First initialize structure (ensure folders exist and check corruption)
    await this.initializeWorkspace(normalizedPath);

    // Run migration checks safely
    await StorageManager.checkAndMigrate(normalizedPath);

    // Apply configuration updates
    setProjectRoot(normalizedPath);
    await this.addRecentWorkspace(normalizedPath);

    const config = await this.loadGlobalConfig();
    config.lastActiveWorkspace = normalizedPath;
    await this.saveGlobalConfig(config);
  }
}

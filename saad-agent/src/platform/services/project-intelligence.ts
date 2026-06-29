import * as fs from "fs/promises";
import * as path from "path";
import { EventBus } from "./event-bus.js";
import { ToolManager } from "./tool-manager.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { ProviderHealthMonitor } from "./health-monitor.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";
import { ResourceManager } from "./resource-manager.js";
import { CONFIG } from "../../config.js";
import { KnowledgeIngestionService } from "./knowledge-ingestion.js";

export interface ProjectHealthStatus {
  workspaceValid: boolean;
  buildStatus: "passing" | "failing" | "unknown";
  testStatus: "passing" | "failing" | "needs_rerun" | "unknown";
  gitStatus: {
    clean: boolean;
    branch: string;
    uncommittedCount: number;
  };
  providerStatus: "online" | "offline";
  runtimeStatus: {
    nodeAvailable: boolean;
    pythonAvailable: boolean;
  };
}

export interface ResourceSnapshot {
  cpuUsage: number;
  memoryUsage: {
    usedBytes: number;
    totalBytes: number;
  };
  gpuUsage: number;
  diskFreeBytes: number;
}

export interface IntelligenceNotification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export class ProjectIntelligenceService {
  private static notifications: IntelligenceNotification[] = [];
  private static watcherInterval: NodeJS.Timeout | null = null;
  private static fileHashes: Record<string, string> = {};
  private static cachedHealth: ProjectHealthStatus = {
    workspaceValid: true,
    buildStatus: "unknown",
    testStatus: "unknown",
    gitStatus: { clean: true, branch: "main", uncommittedCount: 0 },
    providerStatus: "offline",
    runtimeStatus: { nodeAvailable: true, pythonAvailable: true },
  };

  static addNotification(notif: Omit<IntelligenceNotification, "id" | "timestamp">) {
    const record: IntelligenceNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      ...notif,
    };
    this.notifications.unshift(record);
    if (this.notifications.length > 20) {
      this.notifications.pop();
    }
    EventBus.publish("NotificationCreated", record);
  }

  static getNotifications(): IntelligenceNotification[] {
    return this.notifications;
  }

  static clearNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  // 1. Workspace Watcher & Polling Hashing
  static startWatcher(intervalMs = 5000) {
    if (this.watcherInterval) return;

    this.watcherInterval = setInterval(async () => {
      try {
        await this.scanChanges();
        await this.refreshHealth();
      } catch (err) {
        // Safe read-only catch
      }
    }, intervalMs);
  }

  static stopWatcher() {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }
  }

  private static isIgnored(filepath: string): boolean {
    const normalized = filepath.replace(/\\/g, "/");
    if (normalized.startsWith(".saad-agent/training/")) return false;
    const parts = filepath.split(path.sep);
    const ignoredDirs = ["node_modules", ".git", "dist", "build", ".next", ".saad-agent", "cache", "temp-test"];
    return parts.some((p) => ignoredDirs.includes(p));
  }

  static async scanChanges(): Promise<void> {
    const currentFiles: Record<string, string> = {};
    const rootDir = CONFIG.PROJECT_ROOT;

    const traverse = async (dir: string) => {
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (this.isIgnored(path.relative(rootDir, fullPath))) continue;

        let stat;
        try {
          stat = await fs.stat(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          await traverse(fullPath);
        } else if (stat.isFile()) {
          const rel = path.relative(rootDir, fullPath);
          // Quick hash using mtime size combo to be token-efficient and fast
          const quickHash = `${stat.mtimeMs}-${stat.size}`;
          currentFiles[rel] = quickHash;
        }
      }
    };

    await traverse(rootDir);

    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    // Detect additions and modifications
    for (const [file, hash] of Object.entries(currentFiles)) {
      const oldHash = this.fileHashes[file];
      if (!oldHash) {
        added.push(file);
      } else if (oldHash !== hash) {
        modified.push(file);
      }
    }

    // Detect deletions
    for (const file of Object.keys(this.fileHashes)) {
      if (!currentFiles[file]) {
        deleted.push(file);
      }
    }

    this.fileHashes = currentFiles;

    if (added.length > 0 || modified.length > 0 || deleted.length > 0) {
      // 2. Incremental knowledge refresh
      const trainingChanged = [...added, ...modified, ...deleted].some((file) =>
        file.replace(/\\/g, "/").startsWith(".saad-agent/training/")
      );
      if (trainingChanged) {
        await KnowledgeIngestionService.ingestTrainingKnowledge(rootDir).catch(() => undefined);
      }
      EventBus.publish("WorkspaceChanged", { added, modified, deleted });
      EventBus.publish("KnowledgeUpdated", { timestamp: Date.now() });

      // Classify changes and log intelligence
      for (const f of [...added, ...modified]) {
        const intelligence = this.classifyChange(f);
        await EngineeringMemory.logSuccess({
          type: `File change detected`,
          description: `Classified: ${intelligence.classification} | Impact: ${intelligence.impact} | File: ${f}`,
          relatedFiles: [f],
        });
      }

      this.addNotification({
        title: "Workspace Changed",
        message: `Detected ${added.length} added, ${modified.length} modified, ${deleted.length} deleted files. Knowledge refreshed.`,
        severity: "info",
      });
    }
  }

  // 5. Change Intelligence Classification
  private static classifyChange(filename: string): { classification: string; impact: "low" | "medium" | "high" | "critical" } {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename).toLowerCase();

    let classification = "source code";
    let impact: "low" | "medium" | "high" | "critical" = "medium";

    if (basename === "package.json" || basename === "package-lock.json") {
      classification = "dependencies";
      impact = "high";
    } else if (basename.includes("config") || ext === ".env") {
      classification = "configuration";
      impact = "critical";
    } else if (ext === ".md" || ext === ".txt") {
      classification = "documentation";
      impact = "low";
    } else if (filename.includes("test") || ext === ".test.ts" || ext === ".spec.ts") {
      classification = "tests";
      impact = "low";
    } else if ([".png", ".jpg", ".jpeg", ".svg", ".ico"].includes(ext)) {
      classification = "assets";
      impact = "low";
    }

    return { classification, impact };
  }

  // 3. Project Health Monitor
  static async refreshHealth(): Promise<ProjectHealthStatus> {
    const status = { ...this.cachedHealth };

    // Workspace validity check
    try {
      await fs.access(path.join(CONFIG.PROJECT_ROOT, "package.json"));
      status.workspaceValid = true;
    } catch {
      status.workspaceValid = false;
    }

    // Git Status
    try {
      const gitResult = await ToolManager.execute("git-tool", { action: "status" });
      if (gitResult.success) {
        status.gitStatus = {
          clean: gitResult.clean,
          branch: gitResult.branch,
          uncommittedCount: gitResult.uncommittedCount ?? 0,
        };
        if (gitResult.uncommittedCount > 0) {
          EventBus.publish("DependencyChanged", { count: gitResult.uncommittedCount });
        }
      }
    } catch {
      // Read-only ignore
    }

    // Providers Health Check
    try {
      const healthCheck = await ProviderHealthMonitor.checkProviderHealth(CONFIG.PROVIDER);
      status.providerStatus = healthCheck.status;
    } catch {
      status.providerStatus = "offline";
    }

    // Runtimes Health Check
    try {
      const nodeHealth = await RuntimeManager.checkHealth("node");
      const pythonHealth = await RuntimeManager.checkHealth("python");
      status.runtimeStatus = {
        nodeAvailable: nodeHealth.healthy,
        pythonAvailable: pythonHealth.healthy,
      };
    } catch {
      status.runtimeStatus = { nodeAvailable: false, pythonAvailable: false };
    }

    const healthChanged = JSON.stringify(status) !== JSON.stringify(this.cachedHealth);
    if (healthChanged) {
      this.cachedHealth = status;
      EventBus.publish("ProjectHealthUpdated", status);
      EventBus.publish("RuntimeHealthUpdated", status.runtimeStatus);
      EventBus.publish("ProviderHealthUpdated", { status: status.providerStatus });

      if (status.providerStatus === "offline") {
        this.addNotification({
          title: "Provider Disconnected",
          message: `The active local model provider is currently offline or unreachable.`,
          severity: "warning",
        });
      }
    }

    return status;
  }

  // 4. Resource Monitor Snapshot
  static async getResourceSnapshot(): Promise<ResourceSnapshot> {
    const usage = await ResourceManager.getResourceUsage();
    return {
      cpuUsage: usage.cpuUsagePercent,
      memoryUsage: {
        usedBytes: usage.usedMemoryBytes,
        totalBytes: usage.totalMemoryBytes,
      },
      gpuUsage: usage.gpuUsagePercent ?? 0,
      diskFreeBytes: usage.diskFreeBytes ?? 0,
    };
  }

  static getIntelligenceState(): { health: ProjectHealthStatus; notifications: IntelligenceNotification[] } {
    return {
      health: this.cachedHealth,
      notifications: this.notifications,
    };
  }
}

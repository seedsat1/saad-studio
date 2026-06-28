import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
import { Logger } from "./logger.js";

export interface CrashSnapshot {
  timestamp: number;
  workspacePath: string;
  activeSessionId?: string;
  pendingPlansCount: number;
  lastCheckpointId?: string;
}

export class CrashRecoveryManager {
  private static snapshotFile = () => path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "recovery", "crash-snapshot.json");

  static async saveSnapshot(data: Omit<CrashSnapshot, "timestamp">): Promise<void> {
    try {
      const snapshot: CrashSnapshot = {
        ...data,
        timestamp: Date.now()
      };
      const dirPath = path.dirname(this.snapshotFile());
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(this.snapshotFile(), JSON.stringify(snapshot, null, 2), "utf8");
      Logger.log("Runtime", "info", "Saved crash recovery state snapshot", snapshot);
    } catch (err: any) {
      Logger.log("Errors", "error", `Failed to save crash recovery snapshot: ${err.message}`);
    }
  }

  static async loadSnapshot(): Promise<CrashSnapshot | null> {
    try {
      const content = await fs.readFile(this.snapshotFile(), "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static async clearSnapshot(): Promise<void> {
    try {
      await fs.unlink(this.snapshotFile());
    } catch {}
  }
}

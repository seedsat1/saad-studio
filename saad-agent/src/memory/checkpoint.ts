import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";

export interface Checkpoint {
  id: string;
  timestamp: number;
  description: string;
  filesBackup: string[];
}

const CHECKPOINTS_DIR = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "checkpoints");

export class CheckpointManager {
  async create(description: string, filesToBackup: string[]): Promise<Checkpoint> {
    const id = `cp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const cpDir = path.join(CHECKPOINTS_DIR, id);
    await fs.mkdir(cpDir, { recursive: true });

    const backedUp: string[] = [];
    for (const file of filesToBackup) {
      try {
        const srcPath = path.resolve(CONFIG.PROJECT_ROOT, file);
        const destPath = path.join(cpDir, file.replace(/\//g, "_"));
        await fs.copyFile(srcPath, destPath);
        backedUp.push(file);
      } catch (err) {
        console.error(`Failed to backup file ${file}:`, err);
      }
    }

    const checkpoint: Checkpoint = {
      id,
      timestamp: Date.now(),
      description,
      filesBackup: backedUp
    };

    await fs.writeFile(
      path.join(cpDir, "metadata.json"),
      JSON.stringify(checkpoint, null, 2),
      "utf8"
    );

    return checkpoint;
  }

  async restore(id: string): Promise<boolean> {
    const cpDir = path.join(CHECKPOINTS_DIR, id);
    try {
      const metadataStr = await fs.readFile(path.join(cpDir, "metadata.json"), "utf8");
      const checkpoint: Checkpoint = JSON.parse(metadataStr);

      for (const file of checkpoint.filesBackup) {
        const backupFile = path.join(cpDir, file.replace(/\//g, "_"));
        const destPath = path.resolve(CONFIG.PROJECT_ROOT, file);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(backupFile, destPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<Checkpoint[]> {
    try {
      const entries = await fs.readdir(CHECKPOINTS_DIR, { withFileTypes: true });
      const checkpoints: Checkpoint[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const metaPath = path.join(CHECKPOINTS_DIR, entry.name, "metadata.json");
            const data = await fs.readFile(metaPath, "utf8");
            checkpoints.push(JSON.parse(data));
          } catch {}
        }
      }
      return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
}

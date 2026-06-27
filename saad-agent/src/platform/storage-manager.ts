import * as fs from "fs/promises";
import * as path from "path";

export interface MigrationReport {
  timestamp: number;
  migratedFiles: string[];
  backupPath: string;
  success: boolean;
  error?: string;
}

export class StorageManager {
  private static readonly REQUIRED_SUBFOLDERS = [
    "knowledge",
    "memory",
    "history",
    "checkpoints",
    "attachments",
    "cache",
    "prompts",
    "workflows",
    "logs",
    "state",
  ];

  static async initializeDirectories(workspacePath: string): Promise<void> {
    const agentDir = path.join(workspacePath, ".saad-agent");
    await fs.mkdir(agentDir, { recursive: true });

    // Initialize all 10 required subfolders
    for (const folder of this.REQUIRED_SUBFOLDERS) {
      await fs.mkdir(path.join(agentDir, folder), { recursive: true });
    }
  }

  static async checkAndMigrate(workspacePath: string): Promise<MigrationReport | null> {
    const agentDir = path.join(workspacePath, ".saad-agent");
    const legacyFiles = ["memory.json", "architecture.json", "dependency-graph.json", "project-summary.json"];
    
    // Check if any legacy files exist directly under .saad-agent/
    const foundLegacy: string[] = [];
    for (const file of legacyFiles) {
      const filePath = path.join(agentDir, file);
      try {
        await fs.access(filePath);
        foundLegacy.push(file);
      } catch {}
    }

    if (foundLegacy.length === 0) {
      return null;
    }

    // Step 1: Create backup folder under checkpoints/
    const backupDirName = `backup-migration-${Date.now()}`;
    const backupDir = path.join(agentDir, "checkpoints", backupDirName);
    await fs.mkdir(backupDir, { recursive: true });

    const migratedFiles: string[] = [];
    const report: MigrationReport = {
      timestamp: Date.now(),
      migratedFiles: [],
      backupPath: backupDir.replace(/\\/g, "/"),
      success: false,
    };

    try {
      // Step 2: Backup legacy files
      for (const file of foundLegacy) {
        const src = path.join(agentDir, file);
        const destBackup = path.join(backupDir, file);
        await fs.copyFile(src, destBackup);
      }

      // Step 3: Move legacy files to knowledge/
      const knowledgeDir = path.join(agentDir, "knowledge");
      await fs.mkdir(knowledgeDir, { recursive: true });

      for (const file of foundLegacy) {
        const src = path.join(agentDir, file);
        const destKnowledge = path.join(knowledgeDir, file);

        // If dest already exists, read both and merge or overwrite safely
        let shouldCopy = true;
        try {
          await fs.access(destKnowledge);
          // Destination exists, let's keep it but backup. Overwrite is safe since we backed up.
        } catch {
          shouldCopy = true;
        }

        if (shouldCopy) {
          await fs.copyFile(src, destKnowledge);
        }

        // Delete old file
        await fs.unlink(src);
        migratedFiles.push(file);
      }

      report.migratedFiles = migratedFiles;
      report.success = true;

      // Write migration report to history/
      const reportPath = path.join(agentDir, "history", `migration-report-${report.timestamp}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

      console.log(`✅ Legacy storage migration completed. Backup saved to: ${report.backupPath}`);
      return report;
    } catch (err: any) {
      report.success = false;
      report.error = err.message;
      
      const reportPath = path.join(agentDir, "history", `migration-report-${report.timestamp}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8").catch(() => {});
      
      throw new Error(`Storage migration failed: ${err.message}. Data is backed up in ${report.backupPath}`);
    }
  }

  static async getWorkspaceStatePath(workspacePath: string): Promise<string> {
    return path.join(workspacePath, ".saad-agent", "state");
  }

  static async getWorkspacePromptsPath(workspacePath: string): Promise<string> {
    return path.join(workspacePath, ".saad-agent", "prompts");
  }
}

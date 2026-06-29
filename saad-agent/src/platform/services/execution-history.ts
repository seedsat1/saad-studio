import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface ExecutionRecord {
  taskId: string;
  prompt: string;
  filesCreated: number;
  filesModified: number;
  validationPassed: boolean;
  executionTimeMs: number;
  resultSummary: string;
  timestamp: number;
}

export class ExecutionHistoryService {
  private static getFilePath(): string {
    const dir = path.join(CONFIG.PROJECT_ROOT || process.cwd(), ".saad-agent", "history");
    return path.join(dir, "execution-db.json");
  }

  private static async ensureFile(): Promise<string> {
    const filePath = this.getFilePath();
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify([], null, 2), "utf8");
      }
    } catch {
      // ignore
    }
    return filePath;
  }

  static async logRecord(record: ExecutionRecord): Promise<void> {
    try {
      const filePath = await this.ensureFile();
      const content = await fs.readFile(filePath, "utf8");
      const records: ExecutionRecord[] = JSON.parse(content || "[]");
      records.push(record);
      await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
    } catch {
      // ignore
    }
  }

  static async getHistory(): Promise<ExecutionRecord[]> {
    try {
      const filePath = await this.ensureFile();
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content || "[]");
    } catch {
      return [];
    }
  }
}

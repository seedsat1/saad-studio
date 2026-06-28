import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";

export type LogCategory =
  | "UI"
  | "Runtime"
  | "Planner"
  | "Orchestrator"
  | "Skills"
  | "Connectors"
  | "CreativeAI"
  | "Vision"
  | "ContextEngine"
  | "Errors";

export interface LogEntry {
  id: string;
  timestamp: number;
  category: LogCategory;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  details?: any;
}

export class Logger {
  private static logs: LogEntry[] = [];

  static log(category: LogCategory, level: "info" | "warn" | "error" | "debug", message: string, details?: any): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      category,
      level,
      message,
      details
    };
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
  }

  static getLogs(category?: LogCategory, limit: number = 100): LogEntry[] {
    if (category) {
      return this.logs.filter(l => l.category === category).slice(-limit);
    }
    return this.logs.slice(-limit);
  }

  static async exportLogs(): Promise<string> {
    const dirPath = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "logs");
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `structured-logs-${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.logs, null, 2), "utf8");
    return filePath;
  }
}

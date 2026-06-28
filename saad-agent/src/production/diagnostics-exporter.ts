import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
import { DiagnosticsService, type SystemDiagnostics } from "./diagnostics.js";
import { Logger, type LogEntry } from "./logger.js";

export interface DiagnosticsBundle {
  exporterVersion: string;
  exportedAt: number;
  diagnostics: SystemDiagnostics;
  recentLogs: LogEntry[];
  sanitizationVerified: boolean;
}

export class DiagnosticsExporter {
  private static sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeObject(item));

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("key") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("auth")
      ) {
        sanitized[key] = "[REDACTED_SECRET]";
      } else if (typeof value === "object") {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  static async exportDiagnosticsBundle(): Promise<{ filePath: string; bundle: DiagnosticsBundle }> {
    const rawDiagnostics = DiagnosticsService.getDiagnostics();
    const rawLogs = Logger.getLogs(undefined, 200);

    const sanitizedDiagnostics = this.sanitizeObject(rawDiagnostics);
    const sanitizedLogs = this.sanitizeObject(rawLogs);

    const bundle: DiagnosticsBundle = {
      exporterVersion: "1.0.0",
      exportedAt: Date.now(),
      diagnostics: sanitizedDiagnostics,
      recentLogs: sanitizedLogs,
      sanitizationVerified: true
    };

    const dirPath = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "exports");
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `saad-agent-diagnostics-bundle-${Date.now()}.json`);

    await fs.writeFile(filePath, JSON.stringify(bundle, null, 2), "utf8");
    Logger.log("Runtime", "info", `Exported sanitized diagnostics bundle to ${filePath}`);

    return { filePath, bundle };
  }
}

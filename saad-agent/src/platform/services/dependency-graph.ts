import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface ImpactAssessment {
  targetFile: string;
  importedBy: string[];
  riskLevel: "low" | "medium" | "high";
}

export class DependencyGraphService {
  private static graphCache: Map<string, string[]> | null = null; // file -> imported files

  static async buildGraph(workspacePath = CONFIG.PROJECT_ROOT || process.cwd()): Promise<Map<string, string[]>> {
    if (this.graphCache) return this.graphCache;
    const graph = new Map<string, string[]>();

    async function scan(dir: string, depth = 0) {
      if (depth > 5) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(workspacePath, fullPath).replace(/\\/g, "/");
          if (entry.isDirectory()) {
            if (!["node_modules", ".git", "dist", "release", ".next", ".saad-agent"].includes(entry.name)) {
              await scan(fullPath, depth + 1);
            }
          } else if (entry.isFile() && /\.(tsx?|jsx?)$/i.test(entry.name)) {
            try {
              const content = await fs.readFile(fullPath, "utf8");
              const imports: string[] = [];
              const importMatches = content.matchAll(/from\s+["']([^"']+)["']/g);
              for (const match of importMatches) {
                if (match[1]) imports.push(match[1]);
              }
              graph.set(relPath, imports);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    }

    await scan(workspacePath);
    this.graphCache = graph;
    return graph;
  }

  static async assessImpact(targetFile: string, workspacePath = CONFIG.PROJECT_ROOT || process.cwd()): Promise<ImpactAssessment> {
    const graph = await this.buildGraph(workspacePath);
    const cleanTarget = targetFile.replace(/\\/g, "/").toLowerCase();
    const targetBasename = (path.basename(cleanTarget).split(".")[0] || "").toLowerCase();

    const importedBy: string[] = [];
    if (targetBasename) {
      for (const [file, imports] of graph.entries()) {
        if (file.toLowerCase() === cleanTarget) continue;
        const hits = imports.some((imp) => imp.toLowerCase().includes(targetBasename) || imp.toLowerCase().endsWith(targetBasename));
        if (hits) {
          importedBy.push(file);
        }
      }
    }

    const riskLevel: "low" | "medium" | "high" = importedBy.length > 5 ? "high" : importedBy.length > 1 ? "medium" : "low";

    return {
      targetFile,
      importedBy,
      riskLevel,
    };
  }
}

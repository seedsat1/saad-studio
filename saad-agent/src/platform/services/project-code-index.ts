import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface CodeIndexCategory {
  category: "Components" | "Hooks" | "API" | "Services" | "Database" | "Utils" | "Pages";
  files: string[];
}

export class ProjectCodeIndexService {
  private static cachedIndex: Map<string, CodeIndexCategory> | null = null;

  static async buildOrGetIndex(workspacePath = CONFIG.PROJECT_ROOT || process.cwd()): Promise<Map<string, CodeIndexCategory>> {
    if (this.cachedIndex) return this.cachedIndex;

    const categories: Record<string, string[]> = {
      Components: [],
      Hooks: [],
      API: [],
      Services: [],
      Database: [],
      Utils: [],
      Pages: [],
    };

    async function scan(dir: string, depth = 0) {
      if (depth > 6) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(workspacePath, fullPath).replace(/\\/g, "/");
          if (entry.isDirectory()) {
            if (!["node_modules", ".git", "dist", "release", ".next", ".saad-agent"].includes(entry.name)) {
              await scan(fullPath, depth + 1);
            }
          } else if (entry.isFile() && /\.(tsx?|jsx?|json)$/i.test(entry.name)) {
            const lower = relPath.toLowerCase();
            if (lower.includes("component") || lower.includes("/ui/") || lower.includes("card") || lower.includes("modal") || lower.includes("grid")) {
              (categories["Components"] as string[]).push(relPath);
            } else if (lower.includes("use") || lower.includes("hook")) {
              (categories["Hooks"] as string[]).push(relPath);
            } else if (lower.includes("api") || lower.includes("route")) {
              (categories["API"] as string[]).push(relPath);
            } else if (lower.includes("service") || lower.includes("provider")) {
              (categories["Services"] as string[]).push(relPath);
            } else if (lower.includes("db") || lower.includes("schema") || lower.includes("model") || lower.includes("prisma")) {
              (categories["Database"] as string[]).push(relPath);
            } else if (lower.includes("util") || lower.includes("helper") || lower.includes("lib")) {
              (categories["Utils"] as string[]).push(relPath);
            } else if (lower.includes("page") || lower.includes("app/") || lower.includes("routes")) {
              (categories["Pages"] as string[]).push(relPath);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    await scan(workspacePath);

    const indexMap = new Map<string, CodeIndexCategory>();
    for (const [key, files] of Object.entries(categories)) {
      indexMap.set(key, { category: key as any, files });
    }
    this.cachedIndex = indexMap;
    return indexMap;
  }

  static async findTargetFiles(query: string, workspacePath = CONFIG.PROJECT_ROOT || process.cwd()): Promise<string[]> {
    const index = await this.buildOrGetIndex(workspacePath);
    const cleanQuery = query.toLowerCase();
    const matches: string[] = [];

    for (const cat of index.values()) {
      for (const file of cat.files) {
        const basename = path.basename(file).toLowerCase();
        const baseNameNoExt = basename.split(".")[0] || "";
        const dirName = path.basename(path.dirname(file)).toLowerCase();
        if ((baseNameNoExt && cleanQuery.includes(baseNameNoExt)) || (dirName && cleanQuery.includes(dirName))) {
          matches.push(file);
        }
      }
    }
    return Array.from(new Set(matches));
  }
}

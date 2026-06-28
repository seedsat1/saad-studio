import * as fs from "fs/promises";
import * as path from "path";

export interface ExtractedSymbols {
  classes: string[];
  functions: string[];
  symbols: string[];
}

export class SemanticSearch {
  static isSensitiveFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, "/").toLowerCase();
    const base = path.basename(normalized);
    if (base === ".env" || base.startsWith(".env.")) {
      return true;
    }
    if (normalized.includes("/.env") || normalized.includes("/secrets/")) {
      return true;
    }
    const sensitiveKeywords = [
      "secret",
      "credential",
      "password",
      "token",
      "auth_key",
      "private_key",
      "id_rsa",
      "cookie",
      "keychain",
      "safestorage",
      "encrypted"
    ];
    return sensitiveKeywords.some((keyword) => base.includes(keyword) || normalized.includes(`/${keyword}`));
  }

  static async listFilesRecursive(root: string, maxFiles: number): Promise<string[]> {
    const results: string[] = [];
    const visit = async (dir: string) => {
      if (results.length >= maxFiles) return;
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (results.length >= maxFiles) break;
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await visit(entryPath);
        } else if (entry.isFile()) {
          results.push(entryPath);
        }
      }
    };
    await visit(root);
    return results;
  }

  static extractSymbols(content: string): ExtractedSymbols {
    const classes = [...content.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)]
      .map((m) => m[1])
      .filter(Boolean) as string[];
    const functions = [
      ...content.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g),
      ...content.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g)
    ].map((m) => m[1]).filter(Boolean) as string[];
    const symbols = [...content.matchAll(/\b[A-Za-z_$][\w$]{3,}\b/g)]
      .map((m) => m[0])
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 100);
    return { classes, functions, symbols };
  }

  static countArchitectureComponents(node: any): number {
    if (!node || typeof node !== "object") return 0;
    const children = Array.isArray(node.children) ? node.children : [];
    return 1 + children.reduce((count: number, child: any) => count + this.countArchitectureComponents(child), 0);
  }

  static countDependencyEntries(graph: any): number {
    if (!graph || typeof graph !== "object") return 0;
    const modules = graph.modules && typeof graph.modules === "object" ? Object.keys(graph.modules).length : 0;
    const deps = graph.dependencies && typeof graph.dependencies === "object" ? Object.keys(graph.dependencies).length : 0;
    return modules + deps;
  }
}

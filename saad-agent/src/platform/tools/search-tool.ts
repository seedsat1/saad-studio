import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { assertSafePath } from "./fs-tool.js";

interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

async function discoverFiles(dir: string, extensions?: string[]): Promise<string[]> {
  const list: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Filter ignore items
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".saad-agent" ||
      entry.name === "dist" ||
      entry.name === "build"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await discoverFiles(fullPath, extensions);
      list.push(...subFiles);
    } else {
      if (extensions && extensions.length > 0) {
        const ext = path.extname(entry.name).toLowerCase().replace(/^\./, "");
        if (!extensions.includes(ext)) continue;
      }
      list.push(fullPath);
    }
  }

  return list;
}

export const SearchTool: Tool = {
  definition: {
    name: "search-tool",
    description: "Search for files, symbols, or text queries inside workspace using regex and extension filters.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["file-search", "text-search", "symbol-search"] },
        query: { type: "string" },
        extensions: { type: "array", items: { type: "string" } },
        targetDir: { type: "string" },
        isRegex: { type: "boolean" },
      },
      required: ["action", "query"],
    },
    permissions: ["read"],
    approvalRequired: false,
  },

  async execute(args: {
    action: string;
    query: string;
    extensions?: string[];
    targetDir?: string;
    isRegex?: boolean;
  }): Promise<any> {
    const searchDir = assertSafePath(args.targetDir || ".");
    const result: Record<string, any> = { action: args.action, matches: [] };

    await EventBus.publish("search:started", { action: args.action, query: args.query });

    try {
      const files = await discoverFiles(searchDir, args.extensions);

      if (args.action === "file-search") {
        const queryLower = args.query.toLowerCase();
        result.matches = files
          .filter((f: string) => path.basename(f).toLowerCase().includes(queryLower))
          .map((f: string) => ({ file: f }));
      } else if (args.action === "text-search" || args.action === "symbol-search") {
        const matches: SearchMatch[] = [];
        let regex: RegExp;

        if (args.isRegex) {
          regex = new RegExp(args.query, "i");
        } else {
          // Escape special regex chars for literal search
          const escaped = args.query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          regex = new RegExp(escaped, "i");
        }

        // Symbol search prefix mock filter logic (identifies class/function signatures)
        const isSymbol = args.action === "symbol-search";

        for (const file of files) {
          try {
            const content = await fs.readFile(file, "utf8");
            const lines = content.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i] || "";
              if (regex.test(line)) {
                if (isSymbol) {
                  // Basic symbol indicators: function, class, interface, const/let variables
                  const isSymbolLine =
                    /\b(class|function|interface|const|let|var|def|struct)\b/.test(line);
                  if (!isSymbolLine) continue;
                }
                matches.push({
                  file: path.relative(searchDir, file).replace(/\\/g, "/"),
                  line: i + 1,
                  content: line.trim(),
                });
              }
            }
          } catch {}
        }
        result.matches = matches;
      }

      await EventBus.publish("search:completed", { matchesCount: result.matches.length });
      return result;
    } catch (err: any) {
      await EventBus.publish("search:failed", { error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(SearchTool);

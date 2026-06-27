import { createTwoFilesPatch } from "diff";
import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { assertSafePath } from "./fs-tool.js";

function calculateDiffStats(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  const lines = patch.split("\n");
  // Ignore headers (first 4 lines usually)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i] || "";
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }
  return { additions, deletions };
}

async function listAllFiles(dir: string): Promise<string[]> {
  const list: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listAllFiles(fullPath);
      list.push(...subFiles);
    } else {
      list.push(fullPath);
    }
  }

  return list;
}

export const DiffTool: Tool = {
  definition: {
    name: "diff-tool",
    description: "Compare text, files, or folders and generate structured unified diffs and statistics.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["compare-text", "compare-files", "compare-folders"] },
        pathA: { type: "string" },
        pathB: { type: "string" },
        textA: { type: "string" },
        textB: { type: "string" },
      },
      required: ["action"],
    },
    permissions: ["read"],
    approvalRequired: false,
  },

  async execute(args: {
    action: string;
    pathA?: string;
    pathB?: string;
    textA?: string;
    textB?: string;
  }): Promise<any> {
    const result: Record<string, any> = { action: args.action };
    await EventBus.publish("diff:started", { action: args.action });

    try {
      if (args.action === "compare-text") {
        if (args.textA === undefined || args.textB === undefined) {
          throw new Error("Missing text inputs for comparison.");
        }
        const patch = createTwoFilesPatch("TextA", "TextB", args.textA, args.textB);
        const stats = calculateDiffStats(patch);
        result.patch = patch;
        result.stats = stats;
      } else if (args.action === "compare-files") {
        if (!args.pathA || !args.pathB) {
          throw new Error("Missing file paths for comparison.");
        }
        const fileA = assertSafePath(args.pathA);
        const fileB = assertSafePath(args.pathB);

        const contentA = await fs.readFile(fileA, "utf8");
        const contentB = await fs.readFile(fileB, "utf8");

        const patch = createTwoFilesPatch(args.pathA, args.pathB, contentA, contentB);
        const stats = calculateDiffStats(patch);
        result.patch = patch;
        result.stats = stats;
      } else if (args.action === "compare-folders") {
        if (!args.pathA || !args.pathB) {
          throw new Error("Missing folder paths for comparison.");
        }
        const folderA = assertSafePath(args.pathA);
        const folderB = assertSafePath(args.pathB);

        const filesA = await listAllFiles(folderA);
        const filesB = await listAllFiles(folderB);

        const relFilesA = filesA.map((f: string) => path.relative(folderA, f).replace(/\\/g, "/"));
        const relFilesB = filesB.map((f: string) => path.relative(folderB, f).replace(/\\/g, "/"));

        const added = relFilesB.filter((f: string) => !relFilesA.includes(f));
        const deleted = relFilesA.filter((f: string) => !relFilesB.includes(f));
        const common = relFilesA.filter((f: string) => relFilesB.includes(f));

        const modifications: Array<{ file: string; patch: string; stats: any }> = [];

        for (const file of common) {
          const contentA = await fs.readFile(path.join(folderA, file), "utf8");
          const contentB = await fs.readFile(path.join(folderB, file), "utf8");

          if (contentA !== contentB) {
            const patch = createTwoFilesPatch(
              path.join(args.pathA, file),
              path.join(args.pathB, file),
              contentA,
              contentB
            );
            modifications.push({
              file,
              patch,
              stats: calculateDiffStats(patch),
            });
          }
        }

        result.added = added;
        result.deleted = deleted;
        result.modifications = modifications;
        result.stats = {
          addedCount: added.length,
          deletedCount: deleted.length,
          modifiedCount: modifications.length,
        };
      }

      await EventBus.publish("diff:completed", { action: args.action });
      return result;
    } catch (err: any) {
      await EventBus.publish("diff:failed", { error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(DiffTool);

import { parsePatch, applyPatch } from "diff";
import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { assertSafePath } from "./fs-tool.js";

interface PatchResult {
  file: string;
  applied: boolean;
  dryRun: boolean;
  originalContent?: string;
  newContent?: string;
  error?: string;
}

export const PatchTool: Tool = {
  definition: {
    name: "patch-tool",
    description: "Validate, dry-run, apply, or rollback unified patches on workspace files.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["validate", "apply", "rollback"] },
        patch: { type: "string" },
        // Used in rollback action
        rollbackData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              file: { type: "string" },
              originalContent: { type: "string" },
            },
            required: ["file", "originalContent"],
          },
        },
        dryRun: { type: "boolean" },
      },
      required: ["action"],
    },
    permissions: ["read", "write"],
    approvalRequired: true,
  },

  async execute(args: {
    action: string;
    patch?: string;
    rollbackData?: Array<{ file: string; originalContent: string }>;
    dryRun?: boolean;
  }): Promise<any> {
    const isDryRun = args.dryRun ?? false;
    const result: Record<string, any> = { action: args.action, success: false, results: [] };
    
    await EventBus.publish("patch:started", { action: args.action, dryRun: isDryRun });

    try {
      if (args.action === "validate" || args.action === "apply") {
        if (!args.patch) throw new Error("Missing patch content.");
        
        const diffs = parsePatch(args.patch);
        if (diffs.length === 0) throw new Error("Could not parse any unified diff from the patch.");

        const runResults: PatchResult[] = [];
        let allSuccess = true;

        for (const diff of diffs) {
          const fileA = diff.oldFileName;
          if (!fileA) continue;
          
          const targetFile = assertSafePath(fileA);
          
          let currentContent = "";
          try {
            currentContent = await fs.readFile(targetFile, "utf8");
          } catch {
            // File might be new
            currentContent = "";
          }

          // Apply patch context check using diff.applyPatch
          const patchedContent = applyPatch(currentContent, diff);
          if (patchedContent === false) {
            allSuccess = false;
            runResults.push({
              file: fileA,
              applied: false,
              dryRun: isDryRun,
              error: `Context matching failed for patch hunks in file: ${fileA}`,
            });
            continue;
          }

          if (args.action === "apply" && !isDryRun) {
            // Save backup and write file
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            await fs.writeFile(targetFile, patchedContent, "utf8");
          }

          runResults.push({
            file: fileA,
            applied: !isDryRun,
            dryRun: isDryRun,
            originalContent: currentContent,
            newContent: patchedContent,
          });
        }

        result.results = runResults;
        result.success = allSuccess;
      } else if (args.action === "rollback") {
        if (!args.rollbackData || args.rollbackData.length === 0) {
          throw new Error("Missing rollback data.");
        }

        const rollbackResults: any[] = [];
        for (const item of args.rollbackData) {
          const targetFile = assertSafePath(item.file);
          await fs.mkdir(path.dirname(targetFile), { recursive: true });
          await fs.writeFile(targetFile, item.originalContent, "utf8");
          rollbackResults.push({ file: item.file, rolledBack: true });
        }

        result.results = rollbackResults;
        result.success = true;
      }

      await EventBus.publish("patch:completed", { action: args.action, success: result.success });
      return result;
    } catch (err: any) {
      await EventBus.publish("patch:failed", { error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(PatchTool);

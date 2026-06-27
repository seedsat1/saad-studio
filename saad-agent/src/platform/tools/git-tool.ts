import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { CONFIG } from "../../config.js";

const execAsync = promisify(exec);

export const GitTool: Tool = {
  definition: {
    name: "git-tool",
    description: "Manage Git operations including status, diff, log, branches, commit, and stash inside workspace.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "status",
            "diff",
            "branch",
            "checkout",
            "restore",
            "commit",
            "stash",
            "log",
            "current-branch",
            "detect",
          ],
        },
        message: { type: "string" }, // Used for commit
        target: { type: "string" },  // Used for checkout/restore/stash pop
      },
      required: ["action"],
    },
    permissions: ["write"], // Git writes changes to index
    approvalRequired: true,
  },

  async execute(args: { action: string; message?: string; target?: string }): Promise<any> {
    const cwd = CONFIG.PROJECT_ROOT;
    const result: Record<string, any> = { action: args.action };

    await EventBus.publish("git:started", { action: args.action });

    try {
      let command = "";
      switch (args.action) {
        case "status":
          command = "git status";
          break;
        case "diff":
          command = "git diff";
          break;
        case "branch":
          command = "git branch -a";
          break;
        case "checkout":
          if (!args.target) throw new Error("Missing checkout target branch/commit.");
          command = `git checkout ${args.target}`;
          break;
        case "restore":
          if (!args.target) throw new Error("Missing target files/paths to restore.");
          command = `git restore ${args.target}`;
          break;
        case "commit":
          if (!args.message) throw new Error("Missing commit message.");
          // Escape quotes for command safety
          const escapedMsg = args.message.replace(/"/g, '\\"');
          command = `git commit -m "${escapedMsg}"`;
          break;
        case "stash":
          command = args.target ? `git stash ${args.target}` : "git stash";
          break;
        case "log":
          command = "git log -n 10 --oneline";
          break;
        case "current-branch":
          command = "git branch --show-current";
          break;
        case "detect":
          command = "git rev-parse --is-inside-work-tree";
          break;
        default:
          throw new Error(`Unsupported git action: ${args.action}`);
      }

      const { stdout, stderr } = await execAsync(command, { cwd });
      result.success = true;
      result.stdout = stdout.trim();
      result.stderr = stderr.trim();

      await EventBus.publish("git:completed", { action: args.action, success: true });
      return result;
    } catch (err: any) {
      // If detect fails, we just return isRepository: false instead of throwing
      if (args.action === "detect") {
        result.success = false;
        result.isRepository = false;
        await EventBus.publish("git:completed", { action: args.action, success: false });
        return result;
      }
      
      await EventBus.publish("git:failed", { action: args.action, error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(GitTool);

import { exec } from "child_process";
import { promisify } from "util";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { CONFIG } from "../../config.js";

const execAsync = promisify(exec);

export const BuildTool: Tool = {
  definition: {
    name: "build-tool",
    description: "Execute compiler builds (e.g. npm run build) and capture stdout/stderr and performance durations.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string" }, // Optional override, default is 'npm run build'
      },
      required: [],
    },
    permissions: ["execute"],
    approvalRequired: false,
  },

  async execute(args: { command?: string }): Promise<any> {
    const buildCommand = args.command || "npm run build";
    const startTime = Date.now();

    await EventBus.publish("build:started", { command: buildCommand });

    try {
      const { stdout, stderr } = await execAsync(buildCommand, { cwd: CONFIG.PROJECT_ROOT });
      const duration = Date.now() - startTime;
      
      const result = {
        success: true,
        command: buildCommand,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        durationMs: duration,
      };

      await EventBus.publish("build:completed", { success: true, durationMs: duration });
      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const result = {
        success: false,
        command: buildCommand,
        stdout: err.stdout ? err.stdout.trim() : "",
        stderr: err.stderr ? err.stderr.trim() : err.message,
        exitCode: err.code || 1,
        durationMs: duration,
      };

      await EventBus.publish("build:failed", { error: err.message, durationMs: duration });
      return result; // Don't throw so caller gets structured results
    }
  },
};

ToolManager.registerTool(BuildTool);

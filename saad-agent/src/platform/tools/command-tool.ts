import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";
import { assertSafePath } from "./fs-tool.js";

export const CommandTool: Tool = {
  definition: {
    name: "command-tool",
    description: "Run Node or Python scripts inside the workspace boundary using RuntimeManager.",
    parameters: {
      type: "object",
      properties: {
        runtime: { type: "string", enum: ["node", "python"] },
        scriptPath: { type: "string" },
        args: { type: "array", items: { type: "string" } },
        cwd: { type: "string" },
      },
      required: ["runtime", "scriptPath"],
    },
    permissions: ["execute"],
    approvalRequired: true,
  },

  async execute(args: {
    runtime: "node" | "python";
    scriptPath: string;
    args?: string[];
    cwd?: string;
  }): Promise<any> {
    const script = assertSafePath(args.scriptPath);
    const runCwd = args.cwd ? assertSafePath(args.cwd) : undefined;
    
    await EventBus.publish("command:started", {
      runtime: args.runtime,
      scriptPath: args.scriptPath,
    });

    try {
      const runResult = await RuntimeManager.execute(
        args.runtime,
        script,
        args.args || [],
        runCwd
      );

      await EventBus.publish("command:completed", {
        runtime: args.runtime,
        success: runResult.success,
        code: runResult.code,
      });

      return runResult;
    } catch (err: any) {
      await EventBus.publish("command:failed", { error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(CommandTool);

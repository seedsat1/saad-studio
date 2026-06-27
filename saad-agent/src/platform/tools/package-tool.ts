import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";

export const PackageManagerTool: Tool = {
  definition: {
    name: "package-tool",
    description: "Manage Node (npm/pnpm/yarn) and Python (pip/uv) packages inside workspace via RuntimeManager.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "install", "uninstall"] },
        runtime: { type: "string", enum: ["node", "python"] },
        packageName: { type: "string" },
        version: { type: "string" },
        manager: { type: "string", enum: ["npm", "pnpm", "yarn", "pip", "uv"] },
      },
      required: ["action", "runtime"],
    },
    permissions: ["execute", "write"],
    approvalRequired: true, // Controlled execution with explicit approval
  },

  async execute(args: {
    action: "list" | "install" | "uninstall";
    runtime: "node" | "python";
    packageName?: string;
    version?: string;
    manager?: "npm" | "pnpm" | "yarn" | "pip" | "uv";
  }): Promise<any> {
    const result: Record<string, any> = { action: args.action, runtime: args.runtime };

    await EventBus.publish("package:started", {
      action: args.action,
      runtime: args.runtime,
      packageName: args.packageName,
    });

    try {
      const runtime = RuntimeManager.getRuntime(args.runtime);

      if (args.action === "list") {
        const packages = await runtime.listPackages();
        result.packages = packages;
        result.success = true;
      } else if (args.action === "install") {
        if (!args.packageName) throw new Error("Missing packageName to install.");
        
        // Controlled runtime-aware installations
        const runResult = await runtime.installPackage(args.packageName, args.version);
        result.success = runResult.success;
        result.stdout = runResult.stdout;
        result.stderr = runResult.stderr;
        result.exitCode = runResult.code;
        if (!runResult.success) {
          result.error = runResult.error;
        }
      } else if (args.action === "uninstall") {
        // Implement basic uninstallation as a runtime-aware execution
        if (!args.packageName) throw new Error("Missing packageName to uninstall.");
        
        let command = "";
        if (args.runtime === "node") {
          const mgr = args.manager || "npm";
          command = `${mgr} uninstall ${args.packageName}`;
        } else {
          const mgr = args.manager || "pip";
          command = `"${mgr}" uninstall -y ${args.packageName}`;
        }

        // Execute uninstall command via standard child execution inside the runtime
        const runResult = await runtime.executeScript("", [command]);
        result.success = runResult.success;
        result.stdout = runResult.stdout;
        result.stderr = runResult.stderr;
        result.exitCode = runResult.code;
      }

      await EventBus.publish("package:completed", {
        action: args.action,
        runtime: args.runtime,
        success: result.success,
      });

      return result;
    } catch (err: any) {
      await EventBus.publish("package:failed", { error: err.message });
      throw err;
    }
  },
};

ToolManager.registerTool(PackageManagerTool);

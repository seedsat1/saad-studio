import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { CONFIG } from "../../config.js";

export function assertSafePath(targetPath: string): string {
  const resolved = path.resolve(CONFIG.PROJECT_ROOT, targetPath);
  const relative = path.relative(CONFIG.PROJECT_ROOT, resolved);
  const isOutside = relative.startsWith("..") || path.isAbsolute(relative);
  if (isOutside && resolved !== path.resolve(CONFIG.PROJECT_ROOT)) {
    throw new Error(
      `Access denied: Target path lies outside active workspace boundary: ${targetPath}`
    );
  }
  return resolved;
}

export const FileSystemTool: Tool = {
  definition: {
    name: "fs-tool",
    description: "Read, write, copy, move, delete files and directories inside workspace.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "read",
            "write",
            "create-file",
            "delete-file",
            "copy-file",
            "move-file",
            "create-dir",
            "delete-dir",
            "list-dir",
            "metadata",
          ],
        },
        path: { type: "string" },
        content: { type: "string" },
        destination: { type: "string" },
      },
      required: ["action", "path"],
    },
    permissions: ["read", "write"],
    approvalRequired: false,
  },

  async execute(args: {
    action: string;
    path: string;
    content?: string;
    destination?: string;
  }): Promise<any> {
    const target = assertSafePath(args.path);
    const result: Record<string, any> = { action: args.action, path: args.path };

    await EventBus.publish("fs:started", { action: args.action, path: args.path });

    try {
      switch (args.action) {
        case "read": {
          const data = await fs.readFile(target, "utf8");
          result.content = data;
          break;
        }
        case "write":
        case "create-file": {
          if (args.content === undefined) {
            throw new Error("Missing content for writing file.");
          }
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, args.content, "utf8");
          result.success = true;
          break;
        }
        case "delete-file": {
          await fs.unlink(target);
          result.success = true;
          break;
        }
        case "copy-file": {
          if (!args.destination) throw new Error("Missing destination for copy operation.");
          const dest = assertSafePath(args.destination);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(target, dest);
          result.destination = args.destination;
          result.success = true;
          break;
        }
        case "move-file": {
          if (!args.destination) throw new Error("Missing destination for move operation.");
          const dest = assertSafePath(args.destination);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.rename(target, dest);
          result.destination = args.destination;
          result.success = true;
          break;
        }
        case "create-dir": {
          await fs.mkdir(target, { recursive: true });
          result.success = true;
          break;
        }
        case "delete-dir": {
          await fs.rm(target, { recursive: true, force: true });
          result.success = true;
          break;
        }
        case "list-dir": {
          const entries = await fs.readdir(target, { withFileTypes: true });
          result.entries = entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          }));
          break;
        }
        case "metadata": {
          const stat = await fs.stat(target);
          result.metadata = {
            size: stat.size,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile(),
            mtimeMs: stat.mtimeMs,
            birthtimeMs: stat.birthtimeMs,
          };
          break;
        }
        default:
          throw new Error(`Unsupported action in file system tool: ${args.action}`);
      }

      await EventBus.publish("fs:completed", result);
      return result;
    } catch (err: any) {
      await EventBus.publish("fs:failed", {
        action: args.action,
        path: args.path,
        error: err.message,
      });
      throw err;
    }
  },
};

ToolManager.registerTool(FileSystemTool);

import { BuildTool } from "../tools/build-tool.js";
import { CommandTool } from "../tools/command-tool.js";
import { DiffTool } from "../tools/diff-tool.js";
import { FileSystemTool } from "../tools/fs-tool.js";
import { GitTool } from "../tools/git-tool.js";
import { PackageManagerTool } from "../tools/package-tool.js";
import { PatchTool } from "../tools/patch-tool.js";
import { SearchTool } from "../tools/search-tool.js";
import { TestTool } from "../tools/test-tool.js";
import { ToolManager, type Tool } from "./tool-manager.js";

const CORE_TOOLS: Tool[] = [
  FileSystemTool,
  SearchTool,
  DiffTool,
  PatchTool,
  CommandTool,
  GitTool,
  BuildTool,
  TestTool,
  PackageManagerTool
];

export class CoreToolRegistryService {
  static ensureRegistered(): string[] {
    for (const tool of CORE_TOOLS) {
      ToolManager.registerTool(tool);
    }

    return CORE_TOOLS.map((tool) => tool.definition.name);
  }
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any; // JSON Schema description of parameter expectations
  permissions: Array<"read" | "write" | "execute" | "network">;
  approvalRequired: boolean;
}

export type ToolExecutor = (args: any) => Promise<any>;

export interface Tool {
  definition: ToolDefinition;
  execute: ToolExecutor;
}

export class ToolManager {
  private static registry: Record<string, Tool> = {};

  static registerTool(tool: Tool): void {
    this.registry[tool.definition.name] = tool;
  }

  static getTool(name: string): Tool | null {
    return this.registry[name] || null;
  }

  static listTools(): ToolDefinition[] {
    return Object.values(this.registry).map((t) => t.definition);
  }

  static async execute(
    name: string,
    args: any,
    context?: { permissions: string[] }
  ): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found in registry: ${name}`);
    }

    // Validate permissions
    if (context) {
      for (const reqPerm of tool.definition.permissions) {
        if (!context.permissions.includes(reqPerm)) {
          throw new Error(
            `Permission denied: Tool "${name}" requires "${reqPerm}" permission.`
          );
        }
      }
    }

    return tool.execute(args);
  }

  static clearRegistry(): void {
    this.registry = {};
  }
}

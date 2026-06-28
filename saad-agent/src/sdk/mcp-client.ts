import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import {
  SettingsManager,
  type MCPLogEntry,
  type MCPPromptSettings,
  type MCPResourceSettings,
  type MCPServerSettings,
  type MCPToolSettings,
} from "../production/settings-manager.js";

type JsonRpcResponse = {
  id?: number;
  result?: any;
  error?: { message?: string; code?: number };
};

export class MCPClient {
  private static legacyServers: Map<string, MCPServerSettings> = new Map();
  private static legacyTools: Map<string, MCPToolSettings> = new Map();

  static registerServer(server: any): void {
    const normalized = SettingsManager.normalizeMCPServer({
      ...server,
      transport: server.transport === "local" ? "stdio" : server.transport,
      command: server.command || "",
      enabled: server.status !== "disconnected",
      status: server.status === "connected" ? "online" : server.status === "error" ? "error" : "offline",
    });
    this.legacyServers.set(normalized.id, normalized);
  }

  static registerTool(tool: any): void {
    if (!this.legacyServers.has(tool.serverId)) {
      throw new Error(`Cannot register MCP tool for unknown server: ${tool.serverId}`);
    }
    this.legacyTools.set(tool.id, {
      id: String(tool.id),
      serverId: String(tool.serverId),
      name: String(tool.name),
      description: String(tool.description || ""),
      category: "General",
      status: "enabled",
      permission: "ask",
      inputSchema: tool.inputSchema,
    });
  }

  static async getServers(): Promise<MCPServerSettings[]> {
    const settings = await SettingsManager.getSettings();
    return [...settings.mcp.servers, ...Array.from(this.legacyServers.values())];
  }

  static async getDiscoveredServers(): Promise<MCPServerSettings[]> {
    return this.getServers();
  }

  static async getDiscoveredTools(): Promise<MCPToolSettings[]> {
    const settings = await SettingsManager.getSettings();
    return [
      ...settings.mcp.servers.flatMap(server => server.tools || []),
      ...Array.from(this.legacyTools.values()),
    ];
  }

  static async upsertServer(input: any): Promise<MCPServerSettings> {
    const server = SettingsManager.normalizeMCPServer(input);
    const settings = await SettingsManager.getSettings();
    const servers = settings.mcp.servers.filter(item => item.id !== server.id);
    servers.push(server);
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers } });
    return server;
  }

  static async removeServer(serverId: string): Promise<boolean> {
    const settings = await SettingsManager.getSettings();
    const servers = settings.mcp.servers.filter(server => server.id !== serverId);
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers } });
    return servers.length !== settings.mcp.servers.length;
  }

  static async setServerEnabled(serverId: string, enabled: boolean): Promise<MCPServerSettings> {
    const settings = await SettingsManager.getSettings();
    const server = settings.mcp.servers.find(item => item.id === serverId);
    if (!server) throw new Error("MCP server not found.");
    const next = { ...server, enabled };
    const servers = settings.mcp.servers.map(item => item.id === serverId ? next : item);
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers } });
    return next;
  }

  static async setToolPermission(serverId: string, toolId: string, permission: "always" | "ask" | "never", enabled: boolean): Promise<MCPServerSettings> {
    const settings = await SettingsManager.getSettings();
    const server = settings.mcp.servers.find(item => item.id === serverId);
    if (!server) throw new Error("MCP server not found.");
    const tools = server.tools.map(tool => tool.id === toolId ? { ...tool, permission, status: enabled ? "enabled" as const : "disabled" as const } : tool);
    const next = { ...server, tools };
    const servers = settings.mcp.servers.map(item => item.id === serverId ? next : item);
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers } });
    return next;
  }

  static async testServer(serverIdOrConfig: string | any): Promise<MCPServerSettings> {
    const settings = await SettingsManager.getSettings();
    const server = typeof serverIdOrConfig === "string"
      ? settings.mcp.servers.find(item => item.id === serverIdOrConfig)
      : SettingsManager.normalizeMCPServer(serverIdOrConfig);
    if (!server) throw new Error("MCP server not found.");
    const result = await this.discoverSingle(server, true);
    if (typeof serverIdOrConfig === "string") {
      await this.persistServer(result);
    }
    return result;
  }

  static async restartServer(serverId: string): Promise<MCPServerSettings> {
    return this.testServer(serverId);
  }

  static async discoverAll(): Promise<{ servers: MCPServerSettings[]; tools: MCPToolSettings[]; resources: MCPResourceSettings[]; prompts: MCPPromptSettings[] }> {
    const settings = await SettingsManager.getSettings();
    const discovered: MCPServerSettings[] = [];
    for (const server of settings.mcp.servers) {
      if (!server.enabled) {
        discovered.push(this.withLog({ ...server, status: "offline" }, "info", "Skipped disabled server."));
        continue;
      }
      const result = await this.discoverSingle(server, false);
      discovered.push(result);
    }
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers: discovered } });
    return {
      servers: discovered,
      tools: discovered.flatMap(server => server.tools),
      resources: discovered.flatMap(server => server.resources),
      prompts: discovered.flatMap(server => server.prompts),
    };
  }

  private static async persistServer(server: MCPServerSettings): Promise<void> {
    const settings = await SettingsManager.getSettings();
    const servers = settings.mcp.servers.map(item => item.id === server.id ? server : item);
    await SettingsManager.replaceSettings({ ...settings, mcp: { ...settings.mcp, servers } });
  }

  private static async discoverSingle(server: MCPServerSettings, testOnly: boolean): Promise<MCPServerSettings> {
    const startedAt = Date.now();
    let next = this.withLog(server, "info", "Connected");
    try {
      const client = server.transport === "stdio" ? this.createStdioSession(server) : this.createHttpSession(server);
      try {
        const init = await client.request("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "Saad Agent", version: "1.0.0" },
        });
        next = this.withLog(next, "info", "initialize");
        const protocolVersion = init?.protocolVersion ? String(init.protocolVersion) : undefined;
        const version = init?.serverInfo?.version ? String(init.serverInfo.version) : next.version;
        let tools: MCPToolSettings[] = next.tools || [];
        let resources: MCPResourceSettings[] = next.resources || [];
        let prompts: MCPPromptSettings[] = next.prompts || [];
        if (!testOnly) {
          tools = await this.safeListTools(client, next);
          next = this.withLog(next, "info", "tools/list");
          resources = await this.safeListResources(client, next);
          next = this.withLog(next, "info", "resources/list");
          prompts = await this.safeListPrompts(client, next);
          next = this.withLog(next, "info", "prompts/list");
        }
        const testedAt = new Date().toISOString();
        return this.withLog({
          ...next,
          status: "online",
          version,
          protocolVersion,
          latencyMs: Date.now() - startedAt,
          lastSuccessfulConnectionAt: testedAt,
          lastTestedAt: testedAt,
          reconnectStatus: next.autoReconnect ? "idle" : "disabled",
          tools,
          resources,
          prompts,
          lastError: undefined,
        }, "info", "Ready");
      } finally {
        client.close();
      }
    } catch (err: any) {
      return this.withLog({
        ...next,
        status: "error",
        latencyMs: Date.now() - startedAt,
        lastTestedAt: new Date().toISOString(),
        reconnectStatus: next.autoReconnect ? "scheduled" : "disabled",
        lastError: String(err?.message || err),
      }, "error", String(err?.message || err));
    }
  }

  private static async safeListTools(client: ReturnType<typeof MCPClient.createStdioSession>, server: MCPServerSettings): Promise<MCPToolSettings[]> {
    try {
      const result = await client.request("tools/list", {});
      return (Array.isArray(result?.tools) ? result.tools : []).map((tool: any) => ({
        id: `${server.id}:${tool.name}`,
        serverId: server.id,
        name: String(tool.name),
        description: String(tool.description || ""),
        category: this.categorizeTool(tool.name, tool.description),
        status: server.tools.find(item => item.name === tool.name)?.status || "enabled",
        permission: server.tools.find(item => item.name === tool.name)?.permission || "ask",
        inputSchema: tool.inputSchema,
      }));
    } catch {
      return [];
    }
  }

  private static async safeListResources(client: ReturnType<typeof MCPClient.createStdioSession>, server: MCPServerSettings): Promise<MCPResourceSettings[]> {
    try {
      const result = await client.request("resources/list", {});
      return (Array.isArray(result?.resources) ? result.resources : []).map((resource: any) => ({
        id: `${server.id}:${resource.uri || resource.name}`,
        serverId: server.id,
        name: String(resource.name || resource.uri),
        uri: String(resource.uri || resource.name),
        description: resource.description ? String(resource.description) : undefined,
        mimeType: resource.mimeType ? String(resource.mimeType) : undefined,
      }));
    } catch {
      return [];
    }
  }

  private static async safeListPrompts(client: ReturnType<typeof MCPClient.createStdioSession>, server: MCPServerSettings): Promise<MCPPromptSettings[]> {
    try {
      const result = await client.request("prompts/list", {});
      return (Array.isArray(result?.prompts) ? result.prompts : []).map((prompt: any) => ({
        id: `${server.id}:${prompt.name}`,
        serverId: server.id,
        name: String(prompt.name),
        description: prompt.description ? String(prompt.description) : undefined,
        arguments: Array.isArray(prompt.arguments) ? prompt.arguments : [],
      }));
    } catch {
      return [];
    }
  }

  private static createStdioSession(server: MCPServerSettings) {
    const child = spawn(server.command, server.args, {
      cwd: server.cwd || undefined,
      env: { ...process.env, ...server.env },
      shell: process.platform === "win32",
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;
    let buffer = "";
    let nextId = 1;
    const pending = new Map<number, { resolve: (value: any) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>();
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as JsonRpcResponse;
          if (typeof message.id !== "number") continue;
          const waiter = pending.get(message.id);
          if (!waiter) continue;
          clearTimeout(waiter.timer);
          pending.delete(message.id);
          if (message.error) waiter.reject(new Error(message.error.message || `MCP error ${message.error.code}`));
          else waiter.resolve(message.result);
        } catch {}
      }
    });
    child.stderr.on("data", () => {});
    child.on("exit", () => {
      for (const waiter of pending.values()) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error("MCP server exited."));
      }
      pending.clear();
    });
    return {
      request(method: string, params: any) {
        const id = nextId++;
        const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
        return new Promise<any>((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`${method} timed out.`));
          }, 10000);
          pending.set(id, { resolve, reject, timer });
          child.stdin.write(payload);
        });
      },
      close() {
        child.kill();
      },
    };
  }

  private static createHttpSession(server: MCPServerSettings) {
    let nextId = 1;
    return {
      async request(method: string, params: any) {
        const response = await fetch(server.command, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const payload = await response.json() as JsonRpcResponse;
        if (payload.error) throw new Error(payload.error.message || `MCP error ${payload.error.code}`);
        return payload.result;
      },
      close() {},
    };
  }

  private static categorizeTool(name: string, description?: string): string {
    const text = `${name} ${description || ""}`.toLowerCase();
    if (/file|read|write|directory|workspace/.test(text)) return "Filesystem";
    if (/git|github|pull|commit|branch/.test(text)) return "Source Control";
    if (/browser|playwright|page|click/.test(text)) return "Browser";
    if (/docker|container/.test(text)) return "Containers";
    if (/sql|database|postgres|sqlite/.test(text)) return "Database";
    return "General";
  }

  private static withLog(server: MCPServerSettings, level: "info" | "error", message: string): MCPServerSettings {
    const entry: MCPLogEntry = { timestamp: new Date().toISOString(), serverId: server.id, level, message };
    return { ...server, logs: [...(server.logs || []), entry].slice(-100) };
  }
}

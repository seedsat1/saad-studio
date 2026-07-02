import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
import { SecretsManager } from "../platform/services/connectors.js";
import { BUILTIN_SKILLS } from "../skills/builtin-skills.js";

export type ProviderType = "local" | "cloud" | "first_party";
export type ProviderHealth = "online" | "offline" | "unknown";
export type ModelRoleName = "Coding" | "Vision" | "Reviewer" | "Fast";
export type MCPTransport = "stdio" | "http" | "sse";
export type MCPPermissionMode = "always" | "ask" | "never";
export type MCPServerStatus = "online" | "offline" | "error" | "unknown";

export interface AppSettings {
  version: number;
  general: {
    theme: "dark_glass" | "dark_sleek" | "light_clean";
    startup: "last_workspace" | "blank";
    language: "en" | "ar";
  };
  workspace: {
    restoreLastWorkspace: boolean;
    ignoredFolders: string[];
    indexingMode: "balanced" | "manual";
  };
  providers: ProviderSettings[];
  models: Record<ModelRoleName, ModelRoleSettings>;
  skills: {
    disabledSkillIds: string[];
    customSkills: ManagedSkill[];
  };
  connectors: Record<string, { enabled: boolean }>;
  mcp: {
    enabled: boolean;
    allowedServers: string[];
    servers: MCPServerSettings[];
  };
  creative: {
    enabled: boolean;
    requireApproval: boolean;
    outputFolder: string;
  };
  vision: {
    enabled: boolean;
    providerRole: ModelRoleName;
  };
  knowledge: {
    memoryEnabled: boolean;
    architectureIndexEnabled: boolean;
    attachmentMetadataEnabled: boolean;
  };
  execution: {
    autoCheckpoints: boolean;
    approvalRequired: boolean;
    selfFixRetries: number;
  };
  security: {
    redactDiagnostics: boolean;
    blockSensitiveFiles: boolean;
    developerMode: boolean;
  };
  backups: {
    autoBackupOnUpgrade: boolean;
    retentionCount: number;
  };
  diagnostics: {
    logLevel: "info" | "warn" | "error" | "debug";
    exportRedactedOnly: boolean;
  };
  advanced: {
    developerMode: boolean;
    experimentalMcp: boolean;
  };

  // Backward-compatible top-level aliases used by earlier production tests.
  theme?: "dark_glass" | "dark_sleek" | "light_clean";
  defaultProvider?: string;
  defaultModel?: string;
  autoCheckpoints?: boolean;
  logLevel?: "info" | "warn" | "error" | "debug";
  autoBackupOnUpgrade?: boolean;
}

export interface ProviderSettings {
  id: string;
  name: string;
  type: ProviderType;
  endpointUrl: string;
  organization?: string;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
  fallbackProvider?: string;
  healthStatus: ProviderHealth;
  lastTestedAt?: string;
  latencyMs?: number;
  lastError?: string;
  apiKeySecretRef?: string;
  discoveredModels?: DiscoveredModel[];
  lastModelDiscoveryAt?: string;
  lastSuccessfulConnectionAt?: string;
  modelCount?: number;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  contextWindow?: number;
  ownedBy?: string;
  created?: number;
}

export interface ModelRoleSettings {
  role: ModelRoleName;
  providerId: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  detectedContextWindow?: number;
  streaming: boolean;
  timeoutMs: number;
  retryCount: number;
}

export interface MCPPermissions {
  filesystem: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  terminal: {
    execute: boolean;
    powershell: boolean;
    cmd: boolean;
  };
  workspace: {
    read: boolean;
    modify: boolean;
    delete: boolean;
  };
  network: {
    localhost: boolean;
    internet: boolean;
  };
}

export interface MCPToolSettings {
  id: string;
  serverId: string;
  name: string;
  description: string;
  category: string;
  status: "enabled" | "disabled";
  permission: MCPPermissionMode;
  inputSchema?: any;
}

export interface MCPResourceSettings {
  id: string;
  serverId: string;
  name: string;
  uri: string;
  description?: string | undefined;
  mimeType?: string | undefined;
}

export interface MCPPromptSettings {
  id: string;
  serverId: string;
  name: string;
  description?: string | undefined;
  arguments?: any[] | undefined;
}

export interface MCPLogEntry {
  timestamp: string;
  serverId: string;
  level: "info" | "error";
  message: string;
}

export interface MCPServerSettings {
  id: string;
  name: string;
  transport: MCPTransport;
  command: string;
  args: string[];
  cwd?: string | undefined;
  env: Record<string, string>;
  enabled: boolean;
  autoStart: boolean;
  autoReconnect: boolean;
  status: MCPServerStatus;
  version?: string | undefined;
  protocolVersion?: string | undefined;
  latencyMs?: number | undefined;
  lastSuccessfulConnectionAt?: string | undefined;
  lastTestedAt?: string | undefined;
  lastError?: string | undefined;
  reconnectStatus?: "idle" | "scheduled" | "disabled";
  permissions: MCPPermissions;
  tools: MCPToolSettings[];
  resources: MCPResourceSettings[];
  prompts: MCPPromptSettings[];
  logs: MCPLogEntry[];
}

export interface ManagedSkill {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  triggers: {
    keywords: string[];
    filePatterns: string[];
    taskTypes?: string[];
  };
  capabilities: string[];
  promptTemplates: {
    systemRules: string[];
    planningGuidelines?: string[];
  };
  validationRules?: string[];
  recommendedTools: string[];
  supportedAgents: string[];
  status: "enabled" | "disabled" | "invalid";
  source: "builtin" | "custom" | "workspace";
  lastLoadedAt: string;
}

export class SettingsManager {
  private static settingsDir = () => process.env["SAAD_AGENT_SETTINGS_ROOT"] || path.join(CONFIG.PROJECT_ROOT, ".saad-agent");
  private static settingsFile = () => path.join(this.settingsDir(), "settings.json");
  private static legacyWorkspaceSettingsFile = () => path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "settings.json");
  private static workspaceSkillsDir = () => path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "skills");
  private static cachedSettings: AppSettings | null = null;

  static clearCache(): void {
    this.cachedSettings = null;
  }

  static getDefaultSettings(): AppSettings {
    const settings: AppSettings = {
      version: 2,
      general: {
        theme: "dark_glass",
        startup: "last_workspace",
        language: "en",
      },
      workspace: {
        restoreLastWorkspace: true,
        ignoredFolders: ["node_modules", ".git", "dist", "release"],
        indexingMode: "balanced",
      },
      providers: [
        { id: "ollama", name: "Ollama", type: "local", endpointUrl: "http://localhost:11434/v1", enabled: true, isDefault: false, priority: 2, fallbackProvider: "lm-studio", healthStatus: "unknown" },
        { id: "lm-studio", name: "LM Studio", type: "local", endpointUrl: "http://localhost:1234/v1", enabled: true, isDefault: true, priority: 1, fallbackProvider: "ollama", healthStatus: "unknown" },
        { id: "openai", name: "OpenAI", type: "cloud", endpointUrl: "https://api.openai.com/v1", enabled: false, isDefault: false, priority: 3, fallbackProvider: "openrouter", healthStatus: "unknown" },
        { id: "anthropic", name: "Anthropic", type: "cloud", endpointUrl: "https://api.anthropic.com/v1", enabled: false, isDefault: false, priority: 4, fallbackProvider: "openrouter", healthStatus: "unknown" },
        { id: "gemini", name: "Gemini", type: "cloud", endpointUrl: "https://generativelanguage.googleapis.com/v1beta", enabled: false, isDefault: false, priority: 5, fallbackProvider: "openrouter", healthStatus: "unknown" },
        { id: "openrouter", name: "OpenRouter", type: "cloud", endpointUrl: "https://openrouter.ai/api/v1", enabled: false, isDefault: false, priority: 6, fallbackProvider: "lm-studio", healthStatus: "unknown" },
        { id: "saad-studio", name: "Saad Studio", type: "first_party", endpointUrl: "https://www.saadstudio.app/api/agent/v1", organization: "Saad Studio", enabled: false, isDefault: false, priority: 7, fallbackProvider: "lm-studio", healthStatus: "unknown" },
        { id: "brave-answers", name: "Brave Answers", type: "cloud", endpointUrl: "https://api.search.brave.com/res/v1/web/search", enabled: true, isDefault: false, priority: 8, fallbackProvider: "lm-studio", healthStatus: "online", apiKeySecretRef: "provider:brave-answers:api-key" },
      ],
      models: {
        Coding: { role: "Coding", providerId: "lm-studio", modelName: CONFIG.ROLES.Coding, temperature: 0.1, maxTokens: 8192, detectedContextWindow: 32768, streaming: true, timeoutMs: 120000, retryCount: 2 },
        Vision: { role: "Vision", providerId: "lm-studio", modelName: CONFIG.ROLES.Vision, temperature: 0.1, maxTokens: 4096, detectedContextWindow: 16384, streaming: false, timeoutMs: 120000, retryCount: 1 },
        Reviewer: { role: "Reviewer", providerId: "ollama", modelName: CONFIG.ROLES.Reviewer, temperature: 0.1, maxTokens: 8192, detectedContextWindow: 32768, streaming: true, timeoutMs: 90000, retryCount: 2 },
        Fast: { role: "Fast", providerId: "ollama", modelName: CONFIG.ROLES.Fast, temperature: 0.2, maxTokens: 4096, detectedContextWindow: 8192, streaming: true, timeoutMs: 45000, retryCount: 1 },
      },
      skills: {
        disabledSkillIds: [],
        customSkills: [],
      },
      connectors: {},
      mcp: { enabled: true, allowedServers: [], servers: [] },
      creative: { enabled: true, requireApproval: true, outputFolder: ".saad-agent/attachments/generated" },
      vision: { enabled: true, providerRole: "Vision" },
      knowledge: { memoryEnabled: true, architectureIndexEnabled: true, attachmentMetadataEnabled: true },
      execution: { autoCheckpoints: true, approvalRequired: true, selfFixRetries: 2 },
      security: { redactDiagnostics: true, blockSensitiveFiles: true, developerMode: false },
      backups: { autoBackupOnUpgrade: true, retentionCount: 10 },
      diagnostics: { logLevel: "info", exportRedactedOnly: true },
      advanced: { developerMode: false, experimentalMcp: false },
      theme: "dark_glass",
      defaultProvider: CONFIG.PROVIDER || "LM Studio",
      defaultModel: CONFIG.MODEL_NAME || "Qwen3-Coder-30B-Instruct-GGUF",
      autoCheckpoints: true,
      logLevel: "info",
      autoBackupOnUpgrade: true
    };
    return settings;
  }

  static sanitizeSettings(settings: AppSettings): AppSettings {
    const cloned = JSON.parse(JSON.stringify(settings));
    const scrub = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        const lower = key.toLowerCase();
        if (/(api.?key|token|password|cookie|credential|secret)$/i.test(lower) && key !== "apiKeySecretRef") {
          delete obj[key];
        } else {
          scrub(obj[key]);
        }
      }
    };
    scrub(cloned);
    return cloned;
  }

  private static mergeWithDefaults(raw: any): AppSettings {
    const defaults = this.getDefaultSettings();
    const providerMap = new Map<string, ProviderSettings>();
    for (const provider of defaults.providers) providerMap.set(provider.id, provider);
    if (Array.isArray(raw?.providers)) {
      for (const provider of raw.providers) {
        if (provider?.id) {
          providerMap.set(String(provider.id), { ...(providerMap.get(String(provider.id)) || {} as ProviderSettings), ...provider });
        }
      }
    }
    const merged: AppSettings = {
      ...defaults,
      ...raw,
      general: { ...defaults.general, ...(raw?.general || {}) },
      workspace: { ...defaults.workspace, ...(raw?.workspace || {}) },
      providers: Array.from(providerMap.values()).sort((a, b) => a.priority - b.priority),
      models: { ...defaults.models, ...(raw?.models || {}) },
      skills: {
        disabledSkillIds: Array.isArray(raw?.skills?.disabledSkillIds) ? raw.skills.disabledSkillIds : [],
        customSkills: Array.isArray(raw?.skills?.customSkills) ? raw.skills.customSkills : [],
      },
      connectors: { ...defaults.connectors, ...(raw?.connectors || {}) },
      mcp: {
        ...defaults.mcp,
        ...(raw?.mcp || {}),
        allowedServers: Array.isArray(raw?.mcp?.allowedServers) ? raw.mcp.allowedServers.map(String) : [],
        servers: Array.isArray(raw?.mcp?.servers) ? raw.mcp.servers.map((server: any) => this.normalizeMCPServer(server)) : [],
      },
      creative: { ...defaults.creative, ...(raw?.creative || {}) },
      vision: { ...defaults.vision, ...(raw?.vision || {}) },
      knowledge: { ...defaults.knowledge, ...(raw?.knowledge || {}) },
      execution: { ...defaults.execution, ...(raw?.execution || {}) },
      security: { ...defaults.security, ...(raw?.security || {}) },
      backups: { ...defaults.backups, ...(raw?.backups || {}) },
      diagnostics: { ...defaults.diagnostics, ...(raw?.diagnostics || {}) },
      advanced: { ...defaults.advanced, ...(raw?.advanced || {}) },
    };
    merged.theme = merged.general.theme;
    merged.defaultProvider = merged.providers.find(p => p.isDefault)?.id || defaults.defaultProvider || CONFIG.PROVIDER;
    merged.defaultModel = merged.models.Coding.modelName;
    merged.autoCheckpoints = merged.execution.autoCheckpoints;
    merged.logLevel = merged.diagnostics.logLevel;
    merged.autoBackupOnUpgrade = merged.backups.autoBackupOnUpgrade;
    return this.sanitizeSettings(merged);
  }

  private static getDefaultMCPPermissions(): MCPPermissions {
    return {
      filesystem: { read: true, write: false, delete: false },
      terminal: { execute: false, powershell: false, cmd: false },
      workspace: { read: true, modify: false, delete: false },
      network: { localhost: true, internet: false },
    };
  }

  static normalizeMCPServer(input: any): MCPServerSettings {
    const transport = input?.transport === "http" || input?.transport === "sse" ? input.transport : "stdio";
    const id = String(input?.id || input?.name || `mcp-${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const permissions = input?.permissions || {};
    const defaults = this.getDefaultMCPPermissions();
    return {
      id,
      name: String(input?.name || id || "MCP Server"),
      transport,
      command: String(input?.command || ""),
      args: Array.isArray(input?.args) ? input.args.map(String) : [],
      cwd: input?.cwd ? String(input.cwd) : undefined,
      env: input?.env && typeof input.env === "object" ? Object.fromEntries(Object.entries(input.env).map(([key, value]) => [String(key), String(value)])) : {},
      enabled: input?.enabled !== false,
      autoStart: Boolean(input?.autoStart),
      autoReconnect: Boolean(input?.autoReconnect),
      status: input?.status === "online" || input?.status === "offline" || input?.status === "error" ? input.status : "unknown",
      version: input?.version ? String(input.version) : undefined,
      protocolVersion: input?.protocolVersion ? String(input.protocolVersion) : undefined,
      latencyMs: typeof input?.latencyMs === "number" ? input.latencyMs : undefined,
      lastSuccessfulConnectionAt: input?.lastSuccessfulConnectionAt ? String(input.lastSuccessfulConnectionAt) : undefined,
      lastTestedAt: input?.lastTestedAt ? String(input.lastTestedAt) : undefined,
      lastError: input?.lastError ? String(input.lastError) : undefined,
      reconnectStatus: input?.reconnectStatus === "scheduled" || input?.reconnectStatus === "disabled" ? input.reconnectStatus : "idle",
      permissions: {
        filesystem: { ...defaults.filesystem, ...(permissions.filesystem || {}) },
        terminal: { ...defaults.terminal, ...(permissions.terminal || {}) },
        workspace: { ...defaults.workspace, ...(permissions.workspace || {}) },
        network: { ...defaults.network, ...(permissions.network || {}) },
      },
      tools: Array.isArray(input?.tools) ? input.tools.map((tool: any) => ({
        id: String(tool.id || tool.name),
        serverId: id,
        name: String(tool.name || tool.id),
        description: String(tool.description || ""),
        category: String(tool.category || "General"),
        status: tool.status === "disabled" ? "disabled" : "enabled",
        permission: tool.permission === "always" || tool.permission === "never" ? tool.permission : "ask",
        inputSchema: tool.inputSchema,
      })) : [],
      resources: Array.isArray(input?.resources) ? input.resources.map((resource: any) => ({
        id: String(resource.id || resource.uri || resource.name),
        serverId: id,
        name: String(resource.name || resource.uri || resource.id),
        uri: String(resource.uri || resource.id || resource.name),
        description: resource.description ? String(resource.description) : undefined,
        mimeType: resource.mimeType ? String(resource.mimeType) : undefined,
      })) : [],
      prompts: Array.isArray(input?.prompts) ? input.prompts.map((prompt: any) => ({
        id: String(prompt.id || prompt.name),
        serverId: id,
        name: String(prompt.name || prompt.id),
        description: prompt.description ? String(prompt.description) : undefined,
        arguments: Array.isArray(prompt.arguments) ? prompt.arguments : [],
      })) : [],
      logs: Array.isArray(input?.logs) ? input.logs.slice(-100).map((log: any) => ({
        timestamp: String(log.timestamp || new Date().toISOString()),
        serverId: id,
        level: log.level === "error" ? "error" : "info",
        message: String(log.message || ""),
      })) : [],
    };
  }

  static async getSettings(): Promise<AppSettings> {
    if (this.cachedSettings) return this.cachedSettings;
    try {
      if (!fsSync.existsSync(this.settingsFile())) {
        const legacyPath = this.legacyWorkspaceSettingsFile();
        if (legacyPath !== this.settingsFile() && fsSync.existsSync(legacyPath)) {
          await fs.mkdir(path.dirname(this.settingsFile()), { recursive: true });
          await fs.copyFile(legacyPath, this.settingsFile());
        }
      }
      const content = await fs.readFile(this.settingsFile(), "utf8");
      this.cachedSettings = this.mergeWithDefaults(JSON.parse(content));
      return this.cachedSettings!;
    } catch {
      this.cachedSettings = this.getDefaultSettings();
      return this.cachedSettings;
    }
  }

  static getSettingsSync(): AppSettings {
    if (this.cachedSettings) return this.cachedSettings;
    try {
      if (!fsSync.existsSync(this.settingsFile())) {
        const legacyPath = this.legacyWorkspaceSettingsFile();
        if (legacyPath !== this.settingsFile() && fsSync.existsSync(legacyPath)) {
          fsSync.mkdirSync(path.dirname(this.settingsFile()), { recursive: true });
          fsSync.copyFileSync(legacyPath, this.settingsFile());
        }
      }
      const content = fsSync.readFileSync(this.settingsFile(), "utf8");
      this.cachedSettings = this.mergeWithDefaults(JSON.parse(content));
      return this.cachedSettings;
    } catch {
      this.cachedSettings = this.getDefaultSettings();
      return this.cachedSettings;
    }
  }

  static validateSettings(settings: AppSettings): string[] {
    const errors: string[] = [];
    const names = new Set<string>();
    const ids = new Set<string>();
    for (const provider of settings.providers) {
      if (!provider.id.trim()) errors.push("Provider id is required.");
      if (!provider.name.trim()) errors.push("Provider name is required.");
      if (ids.has(provider.id)) errors.push(`Duplicate provider id: ${provider.id}`);
      if (names.has(provider.name.toLowerCase())) errors.push(`Duplicate provider name: ${provider.name}`);
      ids.add(provider.id);
      names.add(provider.name.toLowerCase());
      try {
        new URL(provider.endpointUrl);
      } catch {
        errors.push(`Invalid endpoint URL for ${provider.name}.`);
      }
      if (provider.type !== "local" && provider.enabled && !provider.apiKeySecretRef) {
        errors.push(`${provider.name} requires a stored API key before it can be enabled.`);
      }
    }
    for (const role of Object.keys(settings.models) as ModelRoleName[]) {
      const model = settings.models[role];
      if (!ids.has(model.providerId)) errors.push(`${role} model maps to unknown provider ${model.providerId}.`);
      if (!model.modelName.trim()) errors.push(`${role} model name is required.`);
      if (model.temperature < 0 || model.temperature > 2) errors.push(`${role} temperature must be between 0 and 2.`);
      if (model.maxTokens < 1) errors.push(`${role} max tokens must be positive.`);
    }
    const mcpIds = new Set<string>();
    for (const server of settings.mcp.servers || []) {
      if (!server.id.trim()) errors.push("MCP server id is required.");
      if (!server.name.trim()) errors.push("MCP server name is required.");
      if (mcpIds.has(server.id)) errors.push(`Duplicate MCP server id: ${server.id}`);
      mcpIds.add(server.id);
      if (server.transport === "stdio" && !server.command.trim()) errors.push(`${server.name} requires a command.`);
      if ((server.transport === "http" || server.transport === "sse")) {
        try {
          new URL(server.command);
        } catch {
          errors.push(`${server.name} requires a valid HTTP/SSE endpoint URL in Command.`);
        }
      }
      const envText = JSON.stringify(server.env || {}).toLowerCase();
      if (/(api.?key|token|password|cookie|credential|secret|private_key)/.test(envText)) {
        errors.push(`${server.name} environment variables contain secret-like values. Store secrets outside Settings.`);
      }
      if (/lm\s*studio|lm-studio|localhost:1234|127\.0\.0\.1:1234/.test(`${server.name} ${server.command}`.toLowerCase())) {
        errors.push("LM Studio is a model provider, not an MCP server. Configure it under Providers.");
      }
    }
    return errors;
  }

  static async replaceSettings(nextSettings: AppSettings): Promise<AppSettings> {
    const sanitized = this.mergeWithDefaults(this.sanitizeSettings(nextSettings));
    const validationErrors = this.validateSettings(sanitized);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" "));
    }
    this.cachedSettings = sanitized;
    const dir = path.dirname(this.settingsFile());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.settingsFile(), JSON.stringify(this.cachedSettings, null, 2), "utf8");
    return this.cachedSettings;
  }

  static async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    return this.replaceSettings({ ...current, ...updates });
  }

  static async saveProviderSecret(providerId: string, apiKey: string): Promise<string> {
    if (!apiKey.trim()) throw new Error("API key cannot be empty.");
    const ref = `provider:${providerId}:api-key`;
    await SecretsManager.setSecret(ref, apiKey);
    const settings = await this.getSettings();
    const providers = settings.providers.map((provider) =>
      provider.id === providerId ? { ...provider, apiKeySecretRef: ref } : provider
    );
    await this.replaceSettings({ ...settings, providers });
    return ref;
  }

  static async getProviderApiKey(provider: ProviderSettings): Promise<string | undefined> {
    if (!provider.apiKeySecretRef) return undefined;
    return SecretsManager.getSecret(provider.apiKeySecretRef);
  }

  private static normalizeProviderEndpoint(provider: ProviderSettings): string {
    let endpoint = provider.endpointUrl.trim().replace(/\/+$/, "");
    endpoint = endpoint.replace("http://localhost:", "http://127.0.0.1:");
    if (provider.id === "lm-studio" && /^http:\/\/127\.0\.0\.1:1234$/i.test(endpoint)) {
      endpoint = "http://127.0.0.1:1234/v1";
    }
    if (provider.id === "lm-studio" && !/\/v1$/i.test(endpoint) && /127\.0\.0\.1:1234/i.test(endpoint)) {
      endpoint = `${endpoint}/v1`;
    }
    return endpoint;
  }

  private static buildProviderModelEndpoints(provider: ProviderSettings): string[] {
    const base = this.normalizeProviderEndpoint(provider);
    const endpoints: string[] = [];
    const add = (endpoint: string) => {
      if (!endpoints.includes(endpoint)) endpoints.push(endpoint);
    };
    const isLmStudio = provider.id === "lm-studio" || provider.name.toLowerCase().includes("lm studio");
    if (isLmStudio) {
      try {
        const origin = new URL(base).origin;
        add(`${origin}/api/v1/models`);
        add(`${origin}/v1/models`);
        add(`${origin}/models`);
      } catch {
        add(base.endsWith("/models") ? base : `${base}/models`);
      }
      return endpoints;
    }
    add(base.endsWith("/models") ? base : `${base}/models`);
    return endpoints;
  }

  private static parseDiscoveredModels(payload: any): DiscoveredModel[] {
    const rawModels = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
        ? payload.models
        : Array.isArray(payload)
          ? payload
          : [];

    return rawModels
      .map((item: any) => {
        const id = String(item?.id || item?.name || item?.model || "").trim();
        if (!id) return null;
        const discovered: DiscoveredModel = {
          id,
          name: String(item?.name || item?.id || id),
        };
        const contextWindow = this.detectContextWindow(id, item);
        if (contextWindow) discovered.contextWindow = contextWindow;
        if (item?.owned_by) discovered.ownedBy = String(item.owned_by);
        else if (item?.ownedBy) discovered.ownedBy = String(item.ownedBy);
        if (typeof item?.created === "number") discovered.created = item.created;
        return discovered;
      })
      .filter(Boolean) as DiscoveredModel[];
  }

  private static async requestProviderModels(provider: ProviderSettings): Promise<{ models: DiscoveredModel[]; latencyMs: number }> {
    const start = Date.now();
    const apiKey = await this.getProviderApiKey(provider);
    if (provider.type !== "local" && !apiKey) {
      throw new Error("API key is required for this provider.");
    }

    if (provider.id === "brave-answers") {
      const baseUrl = provider.endpointUrl || "https://api.search.brave.com/res/v1/web/search";
      const testQuery = "Next.js latest release";
      const url = new URL(baseUrl);
      url.searchParams.set("q", testQuery);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const headers: Record<string, string> = {
          "Accept": "application/json",
          "X-Subscription-Token": apiKey || "",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaadAgent/1.0",
        };

        const response = await fetch(url.toString(), { method: "GET", headers, signal: controller.signal });
        const latencyMs = Date.now() - start;
        const text = await response.text();

        if (!response.ok) {
          const cleanHeaders = { ...headers };
          if (cleanHeaders["X-Subscription-Token"]) cleanHeaders["X-Subscription-Token"] = "[REDACTED]";
          
          let parsedError = text;
          try {
            const jsonErr = JSON.parse(text);
            parsedError = JSON.stringify(jsonErr, null, 2);
          } catch {}

          const diagnostics = `Brave API Request Failed:
URL: ${url.origin}${url.pathname}
Method: GET
Query Params: q=${testQuery}
Headers: ${JSON.stringify(cleanHeaders, null, 2)}
Response Status: ${response.status} ${response.statusText}
Response Body:
${parsedError}`;

          console.error(diagnostics);
          throw new Error(diagnostics);
        }

        const models: DiscoveredModel[] = [
          { id: "brave-web-search", name: "Brave Web Search" },
          { id: "brave-llm-context", name: "Brave LLM Context" }
        ];
        return { models, latencyMs };
      } catch (err: any) {
        if (err?.name === "AbortError") throw new Error("Connection timed out");
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey) {
        if (provider.id === "anthropic") headers["x-api-key"] = apiKey;
        else headers.Authorization = `Bearer ${apiKey}`;
      }

      let lastError: any;
      for (const modelsEndpoint of this.buildProviderModelEndpoints(provider)) {
        try {
          const response = await fetch(modelsEndpoint, { method: "GET", headers, signal: controller.signal });
          const latencyMs = Date.now() - start;
          const text = await response.text();
          const payload: any = text.trim() ? JSON.parse(text) : {};
          if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
          const models = this.parseDiscoveredModels(payload);
          if (models.length === 0) {
            throw new Error(`No models returned from ${modelsEndpoint}`);
          }
          return { models, latencyMs };
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error("No model discovery endpoints were available.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private static detectContextWindow(modelId: string, raw?: any): number | undefined {
    const explicit = raw?.context_window || raw?.contextWindow || raw?.max_context_length || raw?.maxContextLength || raw?.n_ctx;
    if (typeof explicit === "number" && explicit > 0) return explicit;
    const id = modelId.toLowerCase();
    const match = id.match(/(?:^|[-_])(\d{1,3})k(?:[-_]|$)/);
    if (match) return Number(match[1]) * 1024;
    if (id.includes("qwen2.5") || id.includes("qwen3")) return 32768;
    if (id.includes("deepseek")) return 32768;
    if (id.includes("llama-3")) return 8192;
    if (id.includes("gpt-4o") || id.includes("gpt-4.1")) return 128000;
    if (id.includes("claude-3")) return 200000;
    if (id.includes("gemini")) return 1000000;
    return undefined;
  }

  static async getModelRuntime(role: ModelRoleName): Promise<{ model: ModelRoleSettings; provider: ProviderSettings; apiKey?: string }> {
    const settings = await this.getSettings();
    const model = settings.models[role];
    const provider = settings.providers.find(p => p.id === model.providerId && p.enabled);
    if (!provider) throw new Error(`Enabled provider for ${role} model is not configured.`);
    const runtimeProvider = { ...provider, endpointUrl: this.normalizeProviderEndpoint(provider) };
    const apiKey = await this.getProviderApiKey(provider);
    return apiKey ? { model, provider: runtimeProvider, apiKey } : { model, provider: runtimeProvider };
  }

  static async testProviderConnection(providerId: string): Promise<ProviderSettings> {
    const settings = await this.getSettings();
    const provider = settings.providers.find(p => p.id === providerId);
    if (!provider) throw new Error("Provider not found.");
    const start = Date.now();
    let healthStatus: ProviderHealth = "offline";
    let lastError = "";
    let latencyMs: number | undefined;

    try {
      const result = await this.requestProviderModels(provider);
      latencyMs = result.latencyMs;
      healthStatus = "online";
    } catch (err: any) {
      latencyMs = Date.now() - start;
      lastError = String(err?.message || err);
    }

    const nextProvider: ProviderSettings = {
      ...provider,
      healthStatus,
      latencyMs,
      lastTestedAt: new Date().toISOString(),
    };
    if (healthStatus === "online" && nextProvider.lastTestedAt) nextProvider.lastSuccessfulConnectionAt = nextProvider.lastTestedAt;
    if (lastError) nextProvider.lastError = lastError;
    else delete nextProvider.lastError;
    const providers = settings.providers.map(p => p.id === providerId ? nextProvider : p);
    await this.replaceSettings({ ...settings, providers });
    return nextProvider;
  }

  static async discoverProviderModels(providerId: string): Promise<ProviderSettings> {
    const settings = await this.getSettings();
    const provider = settings.providers.find(p => p.id === providerId);
    if (!provider) throw new Error("Provider not found.");

    const testedAt = new Date().toISOString();
    let nextProvider: ProviderSettings;
    try {
      const result = await this.requestProviderModels(provider);
      nextProvider = {
        ...provider,
        healthStatus: "online",
        latencyMs: result.latencyMs,
        lastTestedAt: testedAt,
        lastSuccessfulConnectionAt: testedAt,
        lastModelDiscoveryAt: testedAt,
        discoveredModels: result.models,
        modelCount: result.models.length,
      };
      delete nextProvider.lastError;
    } catch (err: any) {
      nextProvider = {
        ...provider,
        healthStatus: "offline",
        lastTestedAt: testedAt,
        lastModelDiscoveryAt: testedAt,
        modelCount: provider.discoveredModels?.length || 0,
        lastError: String(err?.message || err),
      };
    }

    const providers = settings.providers.map(p => p.id === providerId ? nextProvider : p);
    await this.replaceSettings({ ...settings, providers });
    if (nextProvider.healthStatus !== "online") throw new Error(nextProvider.lastError || "Model discovery failed.");
    return nextProvider;
  }

  static validateSkillManifest(input: any): ManagedSkill {
    const text = JSON.stringify(input).toLowerCase();
    if (/(api.?key|token|password|cookie|credential|secret|private_key)/.test(text)) {
      throw new Error("Skill manifest rejected because it contains credential-like fields.");
    }
    if (/(exec|spawn|child_process|rm\s+-rf|powershell|cmd\.exe|writefile|appendfile|fs\.write|delete)/.test(text)) {
      throw new Error("Skill manifest rejected because it contains executable or filesystem write behavior.");
    }
    const required = ["id", "name", "version", "domain", "description", "triggers", "capabilities", "promptTemplates", "recommendedTools", "supportedAgents"];
    for (const key of required) {
      if (input[key] === undefined) throw new Error(`Skill manifest missing ${key}.`);
    }
    return {
      id: String(input.id),
      name: String(input.name),
      version: String(input.version),
      domain: String(input.domain),
      description: String(input.description),
      triggers: {
        keywords: Array.isArray(input.triggers?.keywords) ? input.triggers.keywords.map(String) : [],
        filePatterns: Array.isArray(input.triggers?.filePatterns) ? input.triggers.filePatterns.map(String) : [],
        taskTypes: Array.isArray(input.triggers?.taskTypes) ? input.triggers.taskTypes.map(String) : undefined,
      },
      capabilities: Array.isArray(input.capabilities) ? input.capabilities.map(String) : [],
      promptTemplates: {
        systemRules: Array.isArray(input.promptTemplates?.systemRules) ? input.promptTemplates.systemRules.map(String) : [],
        planningGuidelines: Array.isArray(input.promptTemplates?.planningGuidelines) ? input.promptTemplates.planningGuidelines.map(String) : undefined,
      },
      validationRules: Array.isArray(input.validationRules) ? input.validationRules.map(String) : [],
      recommendedTools: Array.isArray(input.recommendedTools) ? input.recommendedTools.map(String) : [],
      supportedAgents: Array.isArray(input.supportedAgents) ? input.supportedAgents.map(String) : [],
      status: input.status === "disabled" ? "disabled" : "enabled",
      source: input.source === "workspace" ? "workspace" : "custom",
      lastLoadedAt: new Date().toISOString(),
    };
  }

  static async upsertCustomSkill(input: any): Promise<ManagedSkill> {
    const skill = this.validateSkillManifest(input);
    const settings = await this.getSettings();
    if (BUILTIN_SKILLS.some(builtIn => builtIn.id === skill.id) && input.overrideBuiltIn !== true) {
      throw new Error("Built-in skill override requires explicit project approval.");
    }
    const customSkills = settings.skills.customSkills.filter(s => s.id !== skill.id);
    customSkills.push(skill);
    await this.replaceSettings({ ...settings, skills: { ...settings.skills, customSkills } });
    await fs.mkdir(this.workspaceSkillsDir(), { recursive: true });
    await fs.writeFile(path.join(this.workspaceSkillsDir(), `${skill.id}.json`), JSON.stringify(skill, null, 2), "utf8");
    return skill;
  }

  static async importSkillFromFolder(folderPath: string): Promise<ManagedSkill> {
    const candidates = ["skill.json", "manifest.json"].map(file => path.join(folderPath, file));
    let manifestContent = "";
    for (const filePath of candidates) {
      try {
        manifestContent = await fs.readFile(filePath, "utf8");
        break;
      } catch {}
    }
    if (!manifestContent) {
      throw new Error("Selected folder does not contain skill.json or manifest.json.");
    }
    return this.upsertCustomSkill(JSON.parse(manifestContent));
  }

  static async removeCustomSkill(skillId: string): Promise<boolean> {
    const settings = await this.getSettings();
    const skill = settings.skills.customSkills.find(s => s.id === skillId);
    if (!skill) return false;
    const customSkills = settings.skills.customSkills.filter(s => s.id !== skillId);
    await this.replaceSettings({ ...settings, skills: { ...settings.skills, customSkills } });
    try {
      await fs.unlink(path.join(this.workspaceSkillsDir(), `${skillId}.json`));
    } catch {}
    return true;
  }

  static async setSkillEnabled(skillId: string, enabled: boolean): Promise<AppSettings> {
    const settings = await this.getSettings();
    const disabled = new Set(settings.skills.disabledSkillIds);
    if (enabled) disabled.delete(skillId);
    else disabled.add(skillId);
    const customSkills = settings.skills.customSkills.map(skill =>
      skill.id === skillId ? { ...skill, status: enabled ? "enabled" as const : "disabled" as const } : skill
    );
    return this.replaceSettings({ ...settings, skills: { disabledSkillIds: Array.from(disabled), customSkills } });
  }
}

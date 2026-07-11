import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceRuntimePanel } from "./WorkspaceRuntimePanel";
import { KnowledgeManager } from "./KnowledgeManager";

type SettingsTab =
  | "general"
  | "workspace"
  | "models"
  | "providers"
  | "agents"
  | "skills"
  | "tools"
  | "connectors"
  | "mcp"
  | "creative"
  | "vision"
  | "knowledge"
  | "execution"
  | "security"
  | "backups"
  | "diagnostics"
  | "advanced";

type ProviderType = "local" | "cloud" | "first_party";
type ProviderHealth = "online" | "offline" | "unknown";
type ModelRoleName = "Chat" | "Coding" | "Vision" | "Reviewer" | "Fast";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

interface ProviderSettings {
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

interface DiscoveredModel {
  id: string;
  name: string;
  contextWindow?: number;
  ownedBy?: string;
  created?: number;
}

interface ModelRoleSettings {
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

interface ManagedSkill {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  triggers: { keywords: string[]; filePatterns: string[]; taskTypes?: string[] };
  capabilities: string[];
  promptTemplates: { systemRules: string[]; planningGuidelines?: string[] };
  validationRules?: string[];
  recommendedTools: string[];
  supportedAgents: string[];
  status?: "enabled" | "disabled" | "invalid";
  source?: "builtin" | "custom" | "workspace";
  lastLoadedAt?: string;
}

type MCPTransport = "stdio" | "http" | "sse";
type MCPPermissionMode = "always" | "ask" | "never";

interface MCPPermissions {
  filesystem: { read: boolean; write: boolean; delete: boolean };
  terminal: { execute: boolean; powershell: boolean; cmd: boolean };
  workspace: { read: boolean; modify: boolean; delete: boolean };
  network: { localhost: boolean; internet: boolean };
}

interface MCPLogEntry {
  timestamp: string;
  serverId: string;
  level: "info" | "error";
  message: string;
}

interface MCPServer {
  id: string;
  name: string;
  transport: MCPTransport;
  command: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  enabled: boolean;
  autoStart: boolean;
  autoReconnect: boolean;
  status: "online" | "offline" | "error" | "unknown";
  version?: string;
  protocolVersion?: string;
  latencyMs?: number;
  lastSuccessfulConnectionAt?: string;
  lastTestedAt?: string;
  lastError?: string;
  reconnectStatus?: "idle" | "scheduled" | "disabled";
  permissions: MCPPermissions;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  logs: MCPLogEntry[];
}

interface MCPTool {
  id: string;
  serverId: string;
  name: string;
  description: string;
  category: string;
  status: "enabled" | "disabled";
  permission: MCPPermissionMode;
  inputSchema?: any;
}

interface MCPResource {
  id: string;
  serverId: string;
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

interface MCPPrompt {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  arguments?: any[];
}

interface AppSettings {
  version: number;
  general: { theme: "dark_glass" | "dark_sleek" | "light_clean"; startup: "last_workspace" | "blank"; language: "en" | "ar" };
  workspace: { restoreLastWorkspace: boolean; ignoredFolders: string[]; indexingMode: "balanced" | "manual" };
  providers: ProviderSettings[];
  models: Record<ModelRoleName, ModelRoleSettings>;
  skills: { disabledSkillIds: string[]; customSkills: ManagedSkill[] };
  connectors: Record<string, { enabled: boolean }>;
  mcp: { enabled: boolean; allowedServers: string[]; servers: MCPServer[] };
  creative: { enabled: boolean; requireApproval: boolean; outputFolder: string };
  vision: { enabled: boolean; providerRole: ModelRoleName };
  knowledge: { memoryEnabled: boolean; architectureIndexEnabled: boolean; attachmentMetadataEnabled: boolean };
  execution: { autoCheckpoints: boolean; approvalRequired: boolean; selfFixRetries: number };
  security: { redactDiagnostics: boolean; blockSensitiveFiles: boolean; developerMode: boolean };
  backups: { autoBackupOnUpgrade: boolean; retentionCount: number };
  diagnostics: { logLevel: "info" | "warn" | "error" | "debug"; exportRedactedOnly: boolean };
  advanced: { developerMode: boolean; experimentalMcp: boolean };
}

declare global {
  interface Window {
    electronAPI?: {
      loadSettings?: () => Promise<{ success: boolean; settings?: AppSettings; error?: string }>;
      saveSettings?: (settings: AppSettings) => Promise<{ success: boolean; settings?: AppSettings; error?: string }>;
      saveProviderSecret?: (providerId: string, apiKey: string) => Promise<{ success: boolean; settings?: AppSettings; error?: string }>;
      testProviderConnection?: (providerId: string) => Promise<{ success: boolean; provider?: ProviderSettings; error?: string }>;
      discoverProviderModels?: (providerId: string) => Promise<{ success: boolean; provider?: ProviderSettings; settings?: AppSettings; error?: string }>;
      getAvailableSkills?: () => Promise<{ success: boolean; skills?: ManagedSkill[]; error?: string }>;
      toggleSkill?: (skillId: string, enabled: boolean) => Promise<{ success: boolean; settings?: AppSettings; skills?: ManagedSkill[]; error?: string }>;
      upsertSkill?: (manifest: any) => Promise<{ success: boolean; settings?: AppSettings; skill?: ManagedSkill; error?: string }>;
      importSkillFolder?: (folderPath: string) => Promise<{ success: boolean; settings?: AppSettings; skill?: ManagedSkill; error?: string }>;
      removeSkill?: (skillId: string) => Promise<{ success: boolean; settings?: AppSettings; removed?: boolean; error?: string }>;
      discoverMCPServers?: () => Promise<{ success: boolean; servers?: MCPServer[]; tools?: MCPTool[]; resources?: MCPResource[]; prompts?: MCPPrompt[]; error?: string }>;
      listMCPServers?: () => Promise<{ success: boolean; servers?: MCPServer[]; tools?: MCPTool[]; resources?: MCPResource[]; prompts?: MCPPrompt[]; error?: string }>;
      saveMCPServer?: (server: Partial<MCPServer>) => Promise<{ success: boolean; server?: MCPServer; error?: string }>;
      removeMCPServer?: (serverId: string) => Promise<{ success: boolean; removed?: boolean; error?: string }>;
      testMCPServer?: (serverIdOrConfig: string | Partial<MCPServer>) => Promise<{ success: boolean; server?: MCPServer; error?: string }>;
      setMCPServerEnabled?: (serverId: string, enabled: boolean) => Promise<{ success: boolean; server?: MCPServer; error?: string }>;
      restartMCPServer?: (serverId: string) => Promise<{ success: boolean; server?: MCPServer; error?: string }>;
      setMCPToolPermission?: (serverId: string, toolId: string, permission: MCPPermissionMode, enabled: boolean) => Promise<{ success: boolean; server?: MCPServer; error?: string }>;
      openFolder?: () => Promise<string | null>;
    };
  }
}

const tabs: Array<{ id: SettingsTab; label: string; group: string }> = [
  { id: "workspace", label: "Workspace", group: "Application" },
  { id: "models", label: "Models", group: "AI Runtime" },
  { id: "providers", label: "Providers", group: "AI Runtime" },
  { id: "agents", label: "Agents", group: "AI Runtime" },
  { id: "skills", label: "Skills", group: "AI Runtime" },
  { id: "tools", label: "Tools", group: "Engineering" },
  { id: "connectors", label: "Connectors", group: "Engineering" },
  { id: "mcp", label: "MCP", group: "Engineering" },
  { id: "creative", label: "Creative AI", group: "Creative" },
  { id: "vision", label: "Vision", group: "Creative" },
  { id: "knowledge", label: "Knowledge & Memory", group: "Operations" },
  { id: "execution", label: "Execution", group: "Operations" },
  { id: "security", label: "Security", group: "Operations" },
  { id: "backups", label: "Backups", group: "Operations" },
  { id: "diagnostics", label: "Diagnostics", group: "System" },
  { id: "advanced", label: "Advanced", group: "System" },
];

const runtimeUnwiredTabs = new Set<SettingsTab>([]);

const defaultSettings: AppSettings = {
  version: 2,
  general: { theme: "dark_glass", startup: "last_workspace", language: "en" },
  workspace: { restoreLastWorkspace: true, ignoredFolders: ["node_modules", ".git", "dist", "release"], indexingMode: "balanced" },
  providers: [],
  models: {
    Chat: { role: "Chat", providerId: "lm-studio", modelName: "", temperature: 0.3, maxTokens: 8192, detectedContextWindow: 32768, streaming: true, timeoutMs: 120000, retryCount: 1 },
    Coding: { role: "Coding", providerId: "lm-studio", modelName: "", temperature: 0.1, maxTokens: 8192, detectedContextWindow: 32768, streaming: true, timeoutMs: 120000, retryCount: 2 },
    Vision: { role: "Vision", providerId: "lm-studio", modelName: "", temperature: 0.1, maxTokens: 4096, detectedContextWindow: 16384, streaming: false, timeoutMs: 120000, retryCount: 1 },
    Reviewer: { role: "Reviewer", providerId: "ollama", modelName: "", temperature: 0.1, maxTokens: 8192, detectedContextWindow: 32768, streaming: true, timeoutMs: 90000, retryCount: 2 },
    Fast: { role: "Fast", providerId: "ollama", modelName: "", temperature: 0.2, maxTokens: 4096, detectedContextWindow: 8192, streaming: true, timeoutMs: 45000, retryCount: 1 },
  },
  skills: { disabledSkillIds: [], customSkills: [] },
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
};

const providerTemplates: ProviderSettings[] = [
  { id: "ollama", name: "Ollama", type: "local", endpointUrl: "http://localhost:11434/v1", enabled: true, isDefault: false, priority: 2, fallbackProvider: "lm-studio", healthStatus: "unknown" },
  { id: "lm-studio", name: "LM Studio", type: "local", endpointUrl: "http://localhost:1234/v1", enabled: true, isDefault: true, priority: 1, fallbackProvider: "ollama", healthStatus: "unknown" },
  { id: "openai", name: "OpenAI", type: "cloud", endpointUrl: "https://api.openai.com/v1", enabled: false, isDefault: false, priority: 3, fallbackProvider: "openrouter", healthStatus: "unknown" },
  { id: "anthropic", name: "Anthropic", type: "cloud", endpointUrl: "https://api.anthropic.com/v1", enabled: false, isDefault: false, priority: 4, fallbackProvider: "openrouter", healthStatus: "unknown" },
  { id: "gemini", name: "Gemini", type: "cloud", endpointUrl: "https://generativelanguage.googleapis.com/v1beta", enabled: false, isDefault: false, priority: 5, fallbackProvider: "openrouter", healthStatus: "unknown" },
  { id: "openrouter", name: "OpenRouter", type: "cloud", endpointUrl: "https://openrouter.ai/api/v1", enabled: false, isDefault: false, priority: 6, fallbackProvider: "lm-studio", healthStatus: "unknown" },
  { id: "saad-studio", name: "Saad Studio", type: "first_party", endpointUrl: "https://www.saadstudio.app/api/agent/v1", organization: "Saad Studio", enabled: false, isDefault: false, priority: 7, fallbackProvider: "lm-studio", healthStatus: "unknown" },
];

const defaultMcpPermissions: MCPPermissions = {
  filesystem: { read: true, write: false, delete: false },
  terminal: { execute: false, powershell: false, cmd: false },
  workspace: { read: true, modify: false, delete: false },
  network: { localhost: true, internet: false },
};

function createMcpDraft(): Partial<MCPServer> {
  return {
    id: "",
    name: "",
    transport: "stdio",
    command: "",
    args: [],
    cwd: "",
    env: {},
    enabled: true,
    autoStart: false,
    autoReconnect: true,
    status: "unknown",
    permissions: defaultMcpPermissions,
    tools: [],
    resources: [],
    prompts: [],
    logs: [],
  };
}

function resolveInitialTab(tab: SettingsTab): SettingsTab {
  return runtimeUnwiredTabs.has(tab) ? "workspace" : tab;
}

const fieldStyle = {
  background: "#0b1220",
  color: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: "7px",
  padding: "9px 10px",
  fontSize: "12px",
};

const panelStyle = {
  background: "rgba(15, 23, 42, 0.66)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "10px",
  padding: "16px",
};

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>{title}</h3>
      <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "1fr minmax(220px, 320px)", gap: "18px", alignItems: "center" }}>
      <div>
        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: "13px" }}>{title}</div>
        <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px", lineHeight: 1.45 }}>{description}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function TextListInput({ value, onChange, placeholder, disabled = false }: { value: string[]; onChange: (next: string[]) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <textarea
      value={value.join("\n")}
      onChange={(event) => onChange(event.target.value.split("\n").map(item => item.trim()).filter(Boolean))}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...fieldStyle, width: "100%", minHeight: "86px", resize: "vertical", opacity: disabled ? 0.78 : 1 }}
    />
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ color: "#94a3b8", fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SettingsModal({ isOpen, onClose, initialTab = "general" }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(resolveInitialTab(initialTab));
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [skills, setSkills] = useState<ManagedSkill[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("lm-studio");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [skillDomain, setSkillDomain] = useState("all");
  const [modelSearch, setModelSearch] = useState<Record<ModelRoleName, string>>({ Chat: "", Coding: "", Vision: "", Reviewer: "", Fast: "" });
  const [secretDraft, setSecretDraft] = useState("");
  const [status, setStatus] = useState("Loading settings...");
  const [backendConnected, setBackendConnected] = useState(false);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [mcpResources, setMcpResources] = useState<MCPResource[]>([]);
  const [mcpPrompts, setMcpPrompts] = useState<MCPPrompt[]>([]);
  const [mcpStatus, setMcpStatus] = useState("MCP discovery has not run yet.");
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpDraft, setMcpDraft] = useState<Partial<MCPServer>>(createMcpDraft());
  const [mcpTesting, setMcpTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providerDirty, setProviderDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    void loadSettings();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "mcp") return;
    void loadMCPState();
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeTab !== "skills" && status.startsWith("Failed")) {
      setStatus(backendConnected ? "Settings loaded." : "Settings backend is not connected.");
    }
  }, [activeTab, backendConnected, status]);

  const developerMode = settings.security.developerMode || settings.advanced.developerMode;
  const visibleTabs = useMemo(() => {
    return tabs.filter(tab => developerMode || !runtimeUnwiredTabs.has(tab.id));
  }, [developerMode]);

  useEffect(() => {
    const nextTab = resolveInitialTab(initialTab);
    setActiveTab(nextTab);
    if (isOpen && status.startsWith("Failed")) {
      setStatus(backendConnected ? "Settings loaded." : "");
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "workspace");
    }
  }, [activeTab, visibleTabs]);

  const groupedTabs = useMemo(() => {
    return visibleTabs.reduce<Record<string, typeof tabs>>((acc, tab) => {
      acc[tab.group] = [...(acc[tab.group] || []), tab];
      return acc;
    }, {});
  }, [visibleTabs]);

  const selectedProvider = settings.providers.find(provider => provider.id === selectedProviderId) || settings.providers[0];
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) || skills[0];
  const domains = Array.from(new Set(skills.map(skill => skill.domain))).sort();
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = `${skill.name} ${skill.id} ${skill.description}`.toLowerCase().includes(skillSearch.toLowerCase());
    const matchesDomain = skillDomain === "all" || skill.domain === skillDomain;
    return matchesSearch && matchesDomain;
  });

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    if (status.startsWith("Failed")) {
      setStatus(backendConnected ? "Settings loaded." : "");
    }
  }

  async function loadSettings() {
    const api = window.electronAPI;
    if (!api?.loadSettings) {
      setBackendConnected(false);
      setStatus("Settings backend is not connected. Open Settings inside the packaged desktop app after rebuilding the preload bridge.");
      return;
    }
    const result = await api.loadSettings();
    if (result.success && result.settings) {
      setBackendConnected(true);
      setSettings({ ...defaultSettings, ...result.settings });
      setMcpServers(result.settings.mcp?.servers || []);
      setMcpTools((result.settings.mcp?.servers || []).flatMap(server => server.tools || []));
      setMcpResources((result.settings.mcp?.servers || []).flatMap(server => server.resources || []));
      setMcpPrompts((result.settings.mcp?.servers || []).flatMap(server => server.prompts || []));
      setSelectedProviderId(result.settings.providers.find(provider => provider.isDefault)?.id || result.settings.providers[0]?.id || "lm-studio");
      setStatus("Settings loaded.");
    } else {
      setBackendConnected(false);
      setStatus(result.error || "Failed to load settings.");
    }
    if (api.getAvailableSkills) {
      const skillResult = await api.getAvailableSkills();
      if (skillResult.success && skillResult.skills) {
        setSkills(skillResult.skills);
        setSelectedSkillId(skillResult.skills[0]?.id || "");
      }
    }
  }

  async function loadMCPState() {
    const api = window.electronAPI;
    if (!api?.listMCPServers) {
      setMcpStatus("MCP Manager backend is not connected in this renderer.");
      return;
    }
    const result = await api.listMCPServers();
    if (result.success) {
      const servers = result.servers || [];
      setMcpServers(servers);
      setMcpTools(result.tools || servers.flatMap(server => server.tools || []));
      setMcpResources(result.resources || servers.flatMap(server => server.resources || []));
      setMcpPrompts(result.prompts || servers.flatMap(server => server.prompts || []));
      setMcpStatus(servers.length ? `${servers.length} MCP server(s) configured.` : "No MCP servers are currently registered or configured.");
    } else {
      setMcpStatus(result.error || "Failed to load MCP servers.");
    }
  }

  async function loadMCPDiscovery() {
    const api = window.electronAPI;
    if (!api?.discoverMCPServers) {
      setMcpServers([]);
      setMcpTools([]);
      setMcpResources([]);
      setMcpPrompts([]);
      setMcpStatus("MCP discovery backend is not connected in this renderer.");
      return;
    }
    setMcpStatus("Running MCP initialize, tools/list, resources/list, and prompts/list...");
    const result = await api.discoverMCPServers();
    if (result.success) {
      const servers = result.servers || [];
      const tools = result.tools || [];
      const resources = result.resources || [];
      const prompts = result.prompts || [];
      setMcpServers(servers);
      setMcpTools(tools);
      setMcpResources(resources);
      setMcpPrompts(prompts);
      setMcpStatus(servers.length ? `${servers.length} server(s), ${tools.length} tool(s), ${resources.length} resource(s), ${prompts.length} prompt(s) discovered.` : "No MCP servers are currently registered or configured.");
    } else {
      setMcpServers([]);
      setMcpTools([]);
      setMcpResources([]);
      setMcpPrompts([]);
      setMcpStatus(result.error || "MCP discovery failed.");
    }
  }

  function openMCPDialog(server?: MCPServer) {
    setMcpDraft(server ? { ...server, env: { ...server.env }, args: [...server.args], permissions: JSON.parse(JSON.stringify(server.permissions)) } : createMcpDraft());
    setMcpDialogOpen(true);
  }

  function updateMcpDraft(patch: Partial<MCPServer>) {
    setMcpDraft(prev => ({ ...prev, ...patch }));
  }

  function updateMcpPermission(group: keyof MCPPermissions, key: string, value: boolean) {
    setMcpDraft(prev => ({
      ...prev,
      permissions: {
        ...(prev.permissions || defaultMcpPermissions),
        [group]: { ...((prev.permissions || defaultMcpPermissions)[group] as any), [key]: value },
      } as MCPPermissions,
    }));
  }

  async function testMCPDraft() {
    const api = window.electronAPI;
    if (!api?.testMCPServer) {
      setMcpStatus("MCP test backend is not connected.");
      return;
    }
    setMcpTesting(true);
    setMcpStatus("Testing MCP server connection...");
    const result = await api.testMCPServer(mcpDraft);
    setMcpTesting(false);
    if (result.success && result.server) {
      setMcpDraft(result.server);
      setMcpStatus(`MCP test completed: ${result.server.status}${result.server.latencyMs ? ` | ${result.server.latencyMs}ms` : ""}.`);
    } else {
      setMcpStatus(result.error || "MCP test failed.");
    }
  }

  async function saveMCPServer() {
    const api = window.electronAPI;
    if (!api?.saveMCPServer) {
      setMcpStatus("MCP save backend is not connected.");
      return;
    }
    const result = await api.saveMCPServer(mcpDraft);
    if (result.success) {
      setMcpDialogOpen(false);
      setMcpStatus("MCP server saved.");
      await loadMCPState();
      await loadSettings();
    } else {
      setMcpStatus(result.error || "MCP server validation failed.");
    }
  }

  async function removeMCPServer(serverId: string) {
    const api = window.electronAPI;
    if (!api?.removeMCPServer) return;
    const result = await api.removeMCPServer(serverId);
    setMcpStatus(result.success ? "MCP server removed." : result.error || "Failed to remove MCP server.");
    await loadMCPState();
  }

  async function setMCPServerEnabled(serverId: string, enabled: boolean) {
    const api = window.electronAPI;
    if (!api?.setMCPServerEnabled) return;
    const result = await api.setMCPServerEnabled(serverId, enabled);
    setMcpStatus(result.success ? "MCP server updated." : result.error || "Failed to update MCP server.");
    await loadMCPState();
  }

  async function restartMCPServer(serverId: string) {
    const api = window.electronAPI;
    if (!api?.restartMCPServer) return;
    setMcpStatus("Restarting MCP server...");
    const result = await api.restartMCPServer(serverId);
    setMcpStatus(result.success ? "MCP server restarted/tested." : result.error || "MCP restart failed.");
    await loadMCPState();
  }

  async function updateMCPToolPermission(tool: MCPTool, permission: MCPPermissionMode, enabled: boolean) {
    const api = window.electronAPI;
    if (!api?.setMCPToolPermission) return;
    const result = await api.setMCPToolPermission(tool.serverId, tool.id, permission, enabled);
    setMcpStatus(result.success ? "MCP tool permission saved." : result.error || "Failed to save MCP tool permission.");
    await loadMCPState();
  }

  async function save(next: AppSettings, successMessage = "Settings saved.") {
    const api = window.electronAPI;
    if (!api?.saveSettings) return;
    setSaving(true);
    const result = await api.saveSettings(next);
    setSaving(false);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setProviderDirty(false);
      setStatus(successMessage);
    } else {
      setStatus(result.error || "Settings validation failed.");
    }
  }

  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    void save(next);
  }

  function updateProvider(providerId: string, patch: Partial<ProviderSettings>) {
    const nextProviders = settings.providers.map(provider => {
      if (provider.id !== providerId) return provider;
      return { ...provider, ...patch };
    });
    const next = { ...settings, providers: nextProviders };
    setSettings(next);
    setProviderDirty(true);
    setStatus("Provider has unsaved changes.");
  }

  function saveSelectedProvider() {
    setProviderDirty(false);
    void save(settings, "Provider settings saved.");
  }

  function addProvider(template?: ProviderSettings) {
    const base = template || { id: `custom-${Date.now().toString(36)}`, name: "Custom Provider", type: "cloud" as ProviderType, endpointUrl: "https://api.example.com/v1", enabled: false, isDefault: false, priority: settings.providers.length + 1, fallbackProvider: settings.providers[0]?.id, healthStatus: "unknown" as ProviderHealth };
    if (settings.providers.some(provider => provider.id === base.id)) {
      setStatus(`${base.name} already exists.`);
      return;
    }
    const next = { ...settings, providers: [...settings.providers, base] };
    setSettings(next);
    setSelectedProviderId(base.id);
    setProviderDirty(false);
    void save(next, "Provider added.");
  }

  function removeProvider(providerId: string) {
    const provider = settings.providers.find(item => item.id === providerId);
    if (!provider || settings.providers.length <= 1) return;
    const nextProviders = settings.providers.filter(item => item.id !== providerId);
    const next = { ...settings, providers: nextProviders };
    setSettings(next);
    setSelectedProviderId(nextProviders[0]?.id || "");
    setProviderDirty(false);
    void save(next, "Provider removed.");
  }

  function setDefaultProvider(providerId: string) {
    const next = {
      ...settings,
      providers: settings.providers.map(provider => ({ ...provider, isDefault: provider.id === providerId })),
    };
    setSettings(next);
    setProviderDirty(false);
    void save(next, "Default provider updated.");
  }

  async function saveSecret() {
    if (!selectedProvider || !secretDraft.trim()) return;
    const result = await window.electronAPI?.saveProviderSecret?.(selectedProvider.id, secretDraft);
    setSecretDraft("");
    if (result?.success && result.settings) {
      setSettings(result.settings);
      setStatus("API key saved in encrypted secret storage.");
    } else {
      setStatus(result?.error || "Failed to save API key.");
    }
  }

  async function testProvider() {
    if (!selectedProvider) return;
    await testProviderById(selectedProvider.id);
  }

  async function testProviderById(providerId: string) {
    const provider = settings.providers.find(item => item.id === providerId);
    if (!provider) return;
    setStatus(`Testing ${provider.name}...`);
    const result = await window.electronAPI?.testProviderConnection?.(providerId);
    if (result?.success && result.provider) {
      const nextProviders = settings.providers.map(provider => provider.id === result.provider?.id ? result.provider : provider);
      setSettings({ ...settings, providers: nextProviders });
      setStatus(result.provider.healthStatus === "online" ? `Online in ${result.provider.latencyMs}ms.` : result.provider.lastError || "Provider is offline.");
    } else {
      setStatus(result?.error || "Provider test failed.");
    }
  }

  async function discoverProviderModels(providerId: string, role?: ModelRoleName) {
    const provider = settings.providers.find(item => item.id === providerId);
    if (!provider) return;
    setStatus(`Fetching models from ${provider.name}...`);
    const result = await window.electronAPI?.discoverProviderModels?.(providerId);
    if (result?.success && result.provider) {
      const discovered = result.provider.discoveredModels || [];
      const nextSettings = result.settings || {
        ...settings,
        providers: settings.providers.map(item => item.id === providerId ? result.provider! : item),
      };
      if (role && discovered.length && !nextSettings.models[role].modelName) {
        nextSettings.models = {
          ...nextSettings.models,
          [role]: {
            ...nextSettings.models[role],
            modelName: discovered[0].id,
            detectedContextWindow: discovered[0].contextWindow || nextSettings.models[role].detectedContextWindow,
          },
        };
        await save(nextSettings, `${role} model selected from discovered models.`);
      } else {
        setSettings(nextSettings);
      }
      setStatus(`Discovered ${discovered.length} model(s) from ${result.provider.name}.`);
    } else {
      if (result?.settings) setSettings(result.settings);
      setStatus(result?.error || "Model discovery failed.");
    }
  }

  function updateModel(role: ModelRoleName, patch: Partial<ModelRoleSettings>) {
    const next = { ...settings, models: { ...settings.models, [role]: { ...settings.models[role], ...patch } } };
    setSettings(next);
    void save(next, `${role} model saved.`);
  }

  function updateModelProvider(role: ModelRoleName, providerId: string) {
    const provider = settings.providers.find(item => item.id === providerId);
    const firstModel = provider?.discoveredModels?.[0];
    if (!firstModel) {
      setSettings({
        ...settings,
        models: {
          ...settings.models,
          [role]: {
            ...settings.models[role],
            providerId,
            modelName: "",
          },
        },
      });
      setStatus(`${provider?.name || providerId} has no discovered models yet. Fetch models first, then select it for ${role}.`);
      return;
    }
    updateModel(role, {
      providerId,
      modelName: firstModel?.id || "",
      detectedContextWindow: firstModel?.contextWindow || settings.models[role].detectedContextWindow,
    });
  }

  function selectDiscoveredModel(role: ModelRoleName, modelId: string) {
    const provider = settings.providers.find(item => item.id === settings.models[role].providerId);
    const model = provider?.discoveredModels?.find(item => item.id === modelId);
    updateModel(role, {
      modelName: modelId,
      detectedContextWindow: model?.contextWindow || settings.models[role].detectedContextWindow,
    });
  }

  async function toggleSkill(skill: ManagedSkill, enabled: boolean) {
    const result = await window.electronAPI?.toggleSkill?.(skill.id, enabled);
    if (result?.success) {
      if (result.settings) setSettings(result.settings);
      const skillResult = await window.electronAPI?.getAvailableSkills?.();
      if (skillResult?.success && skillResult.skills) setSkills(skillResult.skills);
      setStatus(`${skill.name} ${enabled ? "enabled" : "disabled"}.`);
    } else {
      setStatus(result?.error || "Failed to update skill.");
    }
  }

  async function createCustomSkill() {
    const id = `custom-skill-${Date.now().toString(36)}`;
    const manifest = {
      id,
      name: "Custom Skill",
      version: "1.0.0",
      domain: "Custom",
      description: "Custom project skill.",
      triggers: { keywords: ["custom"], filePatterns: [] },
      capabilities: ["custom-guidance"],
      promptTemplates: { systemRules: ["Apply this custom skill only when its trigger matches."] },
      validationRules: [],
      recommendedTools: ["fs-tool"],
      supportedAgents: ["Reviewer Agent"],
      status: "enabled",
      source: "custom",
    };
    const result = await window.electronAPI?.upsertSkill?.(manifest);
    if (result?.success) {
      await loadSettings();
      setSelectedSkillId(id);
      setStatus("Custom skill created.");
    } else {
      setStatus(result?.error || "Failed to create custom skill.");
    }
  }

  async function saveSkill(skill: ManagedSkill) {
    const result = await window.electronAPI?.upsertSkill?.({ ...skill, source: skill.source === "builtin" ? "custom" : skill.source });
    if (result?.success) {
      await loadSettings();
      setStatus("Skill saved.");
    } else {
      setStatus(result?.error || "Skill validation failed.");
    }
  }

  async function removeSkill(skill: ManagedSkill) {
    if (skill.source === "builtin") return;
    const result = await window.electronAPI?.removeSkill?.(skill.id);
    if (result?.success) {
      await loadSettings();
      setStatus("Custom skill removed.");
    } else {
      setStatus(result?.error || "Failed to remove skill.");
    }
  }

  async function importSkillFile(file: File) {
    try {
      const manifest = JSON.parse(await file.text());
      const result = await window.electronAPI?.upsertSkill?.(manifest);
      if (result?.success) {
        await loadSettings();
        setStatus("Skill manifest imported.");
      } else {
        setStatus(result?.error || "Skill import failed.");
      }
    } catch (err: any) {
      setStatus(`Invalid JSON manifest: ${err.message}`);
    }
  }

  async function importSkillFolder() {
    const folder = await window.electronAPI?.openFolder?.();
    if (!folder) return;
    const result = await window.electronAPI?.importSkillFolder?.(folder);
    if (result?.success) {
      await loadSettings();
      setStatus("Skill folder imported.");
    } else {
      setStatus(result?.error || "Skill folder import failed.");
    }
  }

  function renderBooleanRow<T extends keyof AppSettings>(section: T, key: keyof AppSettings[T], title: string, description: string) {
    const sectionValue = settings[section] as any;
    return (
      <SettingRow title={title} description={description}>
        <input
          type="checkbox"
          checked={Boolean(sectionValue[key])}
          onChange={(event) => updateSettings({ [section]: { ...sectionValue, [key]: event.target.checked } } as Partial<AppSettings>)}
        />
      </SettingRow>
    );
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(2, 6, 23, 0.82)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, overflow: "hidden", padding: "16px" }}>
      <div style={{ width: "min(1180px, calc(100vw - 32px))", height: "min(860px, calc(100vh - 32px))", maxHeight: "calc(100vh - 32px)", minHeight: 0, backgroundColor: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: "14px", boxShadow: "0 28px 80px rgba(0, 0, 0, 0.72)", display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", overflow: "hidden" }}>
        <aside style={{ background: "#0b0f19", borderRight: "1px solid rgba(148, 163, 184, 0.14)", padding: "18px 14px", overflowY: "auto", minHeight: 0 }}>
          <div style={{ padding: "0 10px 16px" }}>
            <div style={{ color: "#f8fafc", fontSize: "15px", fontWeight: 800 }}>Settings</div>
            <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>Application management center</div>
          </div>
          {Object.entries(groupedTabs).map(([group, groupTabs]) => (
            <div key={group} style={{ marginBottom: "14px" }}>
              <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px 6px" }}>{group}</div>
              {groupTabs.map((tab) => (
                <button key={tab.id} onClick={() => selectTab(tab.id)} style={{ width: "100%", padding: "9px 10px", borderRadius: "7px", border: "none", background: activeTab === tab.id ? "rgba(56, 189, 248, 0.12)" : "transparent", color: activeTab === tab.id ? "#38bdf8" : "#cbd5e1", fontWeight: activeTab === tab.id ? 700 : 500, textAlign: "left", cursor: "pointer", fontSize: "13px" }}>
                  {tab.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section style={{ position: "relative", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden", background: "#111827" }}>
          <header style={{ padding: "17px 24px", borderBottom: "1px solid rgba(148, 163, 184, 0.14)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div>
              <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: "15px" }}>{tabs.find((tab) => tab.id === activeTab)?.label}</div>
              <div style={{ color: saving ? "#fbbf24" : "#64748b", fontSize: "11px", marginTop: "2px" }}>{saving ? "Saving..." : status}</div>
            </div>
            <button onClick={onClose} style={{ ...fieldStyle, width: "34px", padding: "6px", cursor: "pointer" }}>x</button>
          </header>

          <main style={{ flex: 1, padding: "22px 24px 36px", overflowY: "auto", overflowX: "hidden", minHeight: 0, overscrollBehavior: "contain", scrollbarGutter: "stable" }}>
            {activeTab === "workspace" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Workspace" description="Workspace preferences used by indexing and startup restoration." />
                {renderBooleanRow("workspace", "restoreLastWorkspace", "Restore last workspace", "Open the last active workspace when the app starts.")}
                <SettingRow title="Indexing mode" description="Balanced mode keeps retrieval current while avoiding unnecessary full scans.">
                  <select value={settings.workspace.indexingMode} onChange={(event) => updateSettings({ workspace: { ...settings.workspace, indexingMode: event.target.value as AppSettings["workspace"]["indexingMode"] } })} style={{ ...fieldStyle, width: "100%" }}>
                    <option value="balanced">Balanced</option>
                    <option value="manual">Manual refresh</option>
                  </select>
                </SettingRow>
                <SettingRow title="Ignored folders" description="Folders skipped by workspace indexing and retrieval.">
                  <TextListInput value={settings.workspace.ignoredFolders} onChange={(ignoredFolders) => updateSettings({ workspace: { ...settings.workspace, ignoredFolders } })} />
                </SettingRow>
                <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "16px" }}>
                  <WorkspaceRuntimePanel />
                </div>
              </div>
            )}

            {activeTab === "providers" && selectedProvider && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <SectionHeader title="Providers" description="Manage real provider records, encrypted API key references, priority, fallback, and health checks." />
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "16px" }}>
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <select onChange={(event) => addProvider(providerTemplates.find(item => item.id === event.target.value))} value="" style={fieldStyle}>
                      <option value="">Add Provider...</option>
                      {providerTemplates.filter(template => !settings.providers.some(provider => provider.id === template.id)).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                      <option value="custom">Custom Provider</option>
                    </select>
                    <button onClick={() => addProvider()} style={{ ...fieldStyle, cursor: "pointer", background: "#38bdf8", color: "#06111f", fontWeight: 800 }}>Add Custom Provider</button>
                    {[...settings.providers].sort((a, b) => a.priority - b.priority).map((provider) => (
                      <button key={provider.id} onClick={() => { setSelectedProviderId(provider.id); setProviderDirty(false); }} style={{ ...fieldStyle, cursor: "pointer", textAlign: "left", background: provider.id === selectedProviderId ? "rgba(56, 189, 248, 0.12)" : "#0b1220" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <strong>{provider.name}</strong>
                          <span style={{ color: provider.healthStatus === "online" ? "#34d399" : provider.healthStatus === "offline" ? "#fb7185" : "#fbbf24" }}>{provider.healthStatus}</span>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>{provider.type} | priority {provider.priority}{provider.isDefault ? " | default" : ""}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h4 style={{ margin: 0, color: "#f8fafc" }}>{selectedProvider.name}</h4>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={saveSelectedProvider} disabled={!providerDirty && !saving} style={{ ...fieldStyle, cursor: providerDirty || saving ? "pointer" : "not-allowed", background: providerDirty ? "#38bdf8" : "#0b1220", color: providerDirty ? "#06111f" : "#f8fafc", fontWeight: 800 }}>{saving ? "Saving..." : "Save Provider"}</button>
                        <button onClick={testProvider} style={{ ...fieldStyle, cursor: "pointer" }}>Test Connection</button>
                        <button onClick={() => setDefaultProvider(selectedProvider.id)} style={{ ...fieldStyle, cursor: "pointer" }}>Set Default</button>
                        <button onClick={() => removeProvider(selectedProvider.id)} style={{ ...fieldStyle, cursor: "pointer", color: "#fb7185" }}>Remove</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Name<input value={selectedProvider.name} onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }} /></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Type<select value={selectedProvider.type} onChange={(e) => updateProvider(selectedProvider.id, { type: e.target.value as ProviderType })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }}><option value="local">Local</option><option value="cloud">Cloud</option><option value="first_party">First party</option></select></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Endpoint URL<input value={selectedProvider.endpointUrl} onChange={(e) => updateProvider(selectedProvider.id, { endpointUrl: e.target.value })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }} /></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Organization<input value={selectedProvider.organization || ""} onChange={(e) => updateProvider(selectedProvider.id, { organization: e.target.value })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }} /></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Fallback Provider<select value={selectedProvider.fallbackProvider || ""} onChange={(e) => updateProvider(selectedProvider.id, { fallbackProvider: e.target.value })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }}>{settings.providers.filter((p) => p.id !== selectedProvider.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Priority<input type="number" value={selectedProvider.priority} onChange={(e) => updateProvider(selectedProvider.id, { priority: Number(e.target.value) })} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }} /></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>Enabled<div style={{ marginTop: "9px" }}><input type="checkbox" checked={selectedProvider.enabled} onChange={(e) => updateProvider(selectedProvider.id, { enabled: e.target.checked })} /></div></label>
                      <label style={{ color: "#94a3b8", fontSize: "12px" }}>API Key<input type="password" value={secretDraft} onChange={(e) => setSecretDraft(e.target.value)} placeholder={selectedProvider.apiKeySecretRef ? "Stored securely" : "Paste key to store securely"} style={{ ...fieldStyle, width: "100%", marginTop: "5px" }} /></label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>Last tested: {selectedProvider.lastTestedAt || "Never"} {selectedProvider.latencyMs ? `| ${selectedProvider.latencyMs}ms` : ""} {selectedProvider.lastError ? `| ${selectedProvider.lastError}` : ""}</div>
                      <button onClick={saveSecret} disabled={!secretDraft.trim()} style={{ ...fieldStyle, cursor: secretDraft.trim() ? "pointer" : "not-allowed" }}>Save API Key Securely</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "models" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <SectionHeader title="Models" description="Configure model roles. Context window is detected from the selected model/provider and is not manually editable." />
                {!backendConnected && (
                  <div style={{ ...panelStyle, color: "#fbbf24", fontSize: "13px" }}>
                    Settings backend is not connected, so provider and model role data cannot be loaded yet.
                  </div>
                )}
                {(Object.keys(settings.models) as ModelRoleName[]).map((role) => {
                  const model = settings.models[role];
                  const provider = settings.providers.find(item => item.id === model.providerId);
                  const discoveredModels = provider?.discoveredModels || [];
                  const query = modelSearch[role].toLowerCase();
                  const filteredModels = discoveredModels.filter(item => `${item.name} ${item.id}`.toLowerCase().includes(query));
                  const selectedDiscoveredModel = discoveredModels.find(item => item.id === model.modelName);
                  return (
                    <div key={role} style={{ ...panelStyle, display: "grid", gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
                      <div>
                        <div style={{ color: "#f8fafc", fontWeight: 800 }}>{role}</div>
                        <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "5px" }}>Applied at runtime through SettingsManager</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", minWidth: 0 }}>
                        <FieldBlock label="Provider">
                          <select value={model.providerId} disabled={!settings.providers.length} onChange={(e) => updateModelProvider(role, e.target.value)} style={{ ...fieldStyle, width: "100%" }}>
                            {settings.providers.length ? settings.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>) : <option value="">No providers loaded</option>}
                          </select>
                        </FieldBlock>
                        <FieldBlock label="Connection">
                          <div style={{ ...fieldStyle, width: "100%", color: provider?.healthStatus === "online" ? "#22c55e" : provider?.healthStatus === "offline" ? "#fb7185" : "#94a3b8" }}>
                            {provider?.healthStatus || "unknown"}{provider?.latencyMs ? ` | ${provider.latencyMs}ms` : ""}
                          </div>
                        </FieldBlock>
                        <FieldBlock label="Last success">
                          <div style={{ ...fieldStyle, width: "100%", color: "#94a3b8" }}>{provider?.lastSuccessfulConnectionAt || "Never"}</div>
                        </FieldBlock>
                        <FieldBlock label="Discovered models">
                          <div style={{ ...fieldStyle, width: "100%", color: "#94a3b8" }}>{provider?.modelCount ?? discoveredModels.length}</div>
                        </FieldBlock>
                        <FieldBlock label="Test connection">
                          <button onClick={() => void testProviderById(model.providerId)} disabled={!provider} style={{ ...fieldStyle, width: "100%", cursor: provider ? "pointer" : "not-allowed" }}>Test Connection</button>
                        </FieldBlock>
                        <FieldBlock label="Fetch models">
                          <button onClick={() => void discoverProviderModels(model.providerId, role)} disabled={!provider} style={{ ...fieldStyle, width: "100%", cursor: provider ? "pointer" : "not-allowed", background: "#38bdf8", color: "#06111f", fontWeight: 800 }}>Discover / Fetch Models</button>
                        </FieldBlock>
                        <FieldBlock label="Search models">
                          <input value={modelSearch[role]} onChange={(e) => setModelSearch(prev => ({ ...prev, [role]: e.target.value }))} placeholder={discoveredModels.length ? "Search discovered models" : "Fetch models first"} disabled={!discoveredModels.length} style={{ ...fieldStyle, width: "100%" }} />
                        </FieldBlock>
                        <FieldBlock label="Model">
                          <select value={model.modelName} onChange={(e) => selectDiscoveredModel(role, e.target.value)} disabled={!filteredModels.length} style={{ ...fieldStyle, width: "100%" }}>
                            {model.modelName && !filteredModels.some(item => item.id === model.modelName) && <option value={model.modelName}>{model.modelName} (saved, fetch to verify)</option>}
                            {filteredModels.length ? filteredModels.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>) : <option value="">No models discovered</option>}
                          </select>
                        </FieldBlock>
                        <FieldBlock label="Temperature">
                          <input type="number" step="0.1" value={model.temperature} onChange={(e) => updateModel(role, { temperature: Number(e.target.value) })} style={{ ...fieldStyle, width: "100%" }} />
                        </FieldBlock>
                        <FieldBlock label="Max output tokens">
                          <input type="number" value={model.maxTokens} onChange={(e) => updateModel(role, { maxTokens: Number(e.target.value) })} style={{ ...fieldStyle, width: "100%" }} />
                        </FieldBlock>
                        <FieldBlock label="Detected context">
                          <div style={{ ...fieldStyle, color: "#94a3b8", width: "100%" }}>{selectedDiscoveredModel?.contextWindow || model.detectedContextWindow || "Auto-detected by provider"}</div>
                        </FieldBlock>
                        <FieldBlock label="Streaming">
                          <select value={String(model.streaming)} onChange={(e) => updateModel(role, { streaming: e.target.value === "true" })} style={{ ...fieldStyle, width: "100%" }}><option value="true">On</option><option value="false">Off</option></select>
                        </FieldBlock>
                        <FieldBlock label="Timeout">
                          <input type="number" value={model.timeoutMs} onChange={(e) => updateModel(role, { timeoutMs: Number(e.target.value) })} style={{ ...fieldStyle, width: "100%" }} />
                        </FieldBlock>
                        <FieldBlock label="Retry count">
                          <input type="number" value={model.retryCount} onChange={(e) => updateModel(role, { retryCount: Number(e.target.value) })} style={{ ...fieldStyle, width: "100%" }} />
                        </FieldBlock>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "skills" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <SectionHeader title="Skill Manager" description="Enable, inspect, import, edit, and remove skills. Disabled skills are excluded from Context Engine injection." />
                <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#cbd5e1", fontSize: "13px" }}>
                    {backendConnected ? `${skills.length} skill(s) loaded from the backend registry.` : "Skill backend is not connected; no skill data is being displayed."}
                  </div>
                  <button onClick={loadSettings} style={{ ...fieldStyle, cursor: "pointer" }}>Reload Registry</button>
                </div>
                <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSkillFile(file); event.currentTarget.value = ""; }} />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} placeholder="Search skills" style={{ ...fieldStyle, minWidth: "220px" }} />
                  <select value={skillDomain} onChange={(event) => setSkillDomain(event.target.value)} style={fieldStyle}><option value="all">All domains</option>{domains.map(domain => <option key={domain} value={domain}>{domain}</option>)}</select>
                  <button onClick={createCustomSkill} style={{ ...fieldStyle, cursor: "pointer" }}>Create Custom Skill</button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ ...fieldStyle, cursor: "pointer" }}>Import JSON</button>
                  <button onClick={importSkillFolder} style={{ ...fieldStyle, cursor: "pointer" }}>Import Folder</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "16px" }}>
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "8px", maxHeight: "470px", overflowY: "auto" }}>
                    {filteredSkills.length === 0 && (
                      <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5 }}>
                        {backendConnected ? "No skills matched the current search/filter. If the registry is empty, reload it or import a custom manifest." : "Backend unavailable. Rebuild/open the packaged desktop app with the corrected preload bridge."}
                      </div>
                    )}
                    {filteredSkills.map(skill => (
                      <button key={skill.id} onClick={() => setSelectedSkillId(skill.id)} style={{ ...fieldStyle, cursor: "pointer", textAlign: "left", background: skill.id === selectedSkill?.id ? "rgba(56, 189, 248, 0.12)" : "#0b1220" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <strong>{skill.name}</strong>
                          <span>{skill.source === "builtin" ? "Built-in" : "Custom"}</span>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>{skill.domain} | {skill.status || "enabled"}</div>
                      </button>
                    ))}
                  </div>
                  {selectedSkill && (
                    <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                        <div>
                          <h4 style={{ margin: 0, color: "#f8fafc" }}>{selectedSkill.name}</h4>
                          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>{selectedSkill.id} | v{selectedSkill.version} | {selectedSkill.source || "builtin"}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <label style={{ color: "#94a3b8", fontSize: "12px" }}><input type="checkbox" checked={(selectedSkill.status || "enabled") === "enabled"} onChange={(event) => void toggleSkill(selectedSkill, event.target.checked)} /> Enabled</label>
                          <button onClick={() => saveSkill(selectedSkill)} disabled={selectedSkill.source === "builtin"} style={{ ...fieldStyle, cursor: selectedSkill.source === "builtin" ? "not-allowed" : "pointer" }}>Save</button>
                          <button onClick={() => removeSkill(selectedSkill)} disabled={selectedSkill.source === "builtin"} style={{ ...fieldStyle, color: "#fb7185", cursor: selectedSkill.source === "builtin" ? "not-allowed" : "pointer" }}>Remove</button>
                          <button onClick={loadSettings} style={{ ...fieldStyle, cursor: "pointer" }}>Reload</button>
                        </div>
                      </div>
                      <textarea value={selectedSkill.description} readOnly={selectedSkill.source === "builtin"} onChange={(e) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, description: e.target.value } : skill))} style={{ ...fieldStyle, width: "100%", minHeight: "62px", opacity: selectedSkill.source === "builtin" ? 0.78 : 1 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                        <SettingRow title="Triggers" description="Keywords that activate this skill."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.triggers.keywords} onChange={(keywords) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, triggers: { ...skill.triggers, keywords } } : skill))} /></SettingRow>
                        <SettingRow title="File patterns" description="Files that activate this skill."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.triggers.filePatterns} onChange={(filePatterns) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, triggers: { ...skill.triggers, filePatterns } } : skill))} /></SettingRow>
                        <SettingRow title="Capabilities" description="What the skill contributes."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.capabilities} onChange={(capabilities) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, capabilities } : skill))} /></SettingRow>
                        <SettingRow title="Recommended tools" description="Tools preferred by the skill."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.recommendedTools} onChange={(recommendedTools) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, recommendedTools } : skill))} /></SettingRow>
                        <SettingRow title="Supported agents" description="Agents that may use this skill."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.supportedAgents} onChange={(supportedAgents) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, supportedAgents } : skill))} /></SettingRow>
                        <SettingRow title="Validation rules" description="Safety and quality checks."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.validationRules || []} onChange={(validationRules) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, validationRules } : skill))} /></SettingRow>
                      </div>
                      <SettingRow title="Prompt templates" description="System rules injected only when enabled and matched."><TextListInput disabled={selectedSkill.source === "builtin"} value={selectedSkill.promptTemplates.systemRules} onChange={(systemRules) => setSkills(prev => prev.map(skill => skill.id === selectedSkill.id ? { ...skill, promptTemplates: { ...skill.promptTemplates, systemRules } } : skill))} /></SettingRow>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>Last loaded: {selectedSkill.lastLoadedAt || "Not recorded"}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "agents" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Agents" description="Agent visibility and delegation preferences." />
                <SettingRow title="Approval required" description="Agent plans require user approval before modifying workspace files."><input type="checkbox" checked={settings.execution.approvalRequired} onChange={(e) => updateSettings({ execution: { ...settings.execution, approvalRequired: e.target.checked } })} /></SettingRow>
              </div>
            )}

            {activeTab === "tools" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Tools" description="Tool exposure is governed by execution and security policies." />
                {renderBooleanRow("security", "blockSensitiveFiles", "Block sensitive files", "Prevent tools and retrieval from reading secret-bearing files.")}
                {renderBooleanRow("execution", "approvalRequired", "Require approval", "Require approval before tools perform modifying actions.")}
              </div>
            )}

            {activeTab === "connectors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Connectors" description="Enable or disable connector discovery preferences. Credentials stay in encrypted secret storage." />
                {["github", "gmail", "google-drive", "supabase", "vercel", "backblaze-b2", "render", "namecheap"].map(id => (
                  <SettingRow key={id} title={id} description="Connector preference persisted in app settings.">
                    <input type="checkbox" checked={settings.connectors[id]?.enabled !== false} onChange={(e) => updateSettings({ connectors: { ...settings.connectors, [id]: { enabled: e.target.checked } } })} />
                  </SettingRow>
                ))}
              </div>
            )}

            {activeTab === "mcp" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="MCP Manager" description="Manage real Model Context Protocol servers. LM Studio is managed under Providers, not here." />
                <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#cbd5e1", fontSize: "13px" }}>{mcpStatus}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => openMCPDialog()} style={{ ...fieldStyle, cursor: "pointer", background: "#38bdf8", color: "#06111f", fontWeight: 800 }}>Add MCP Server</button>
                    <button onClick={loadMCPDiscovery} style={{ ...fieldStyle, cursor: "pointer" }}>Refresh Discovery</button>
                  </div>
                </div>
                {renderBooleanRow("mcp", "enabled", "Enable MCP discovery", "Allow the SDK layer to discover MCP servers and tools.")}
                <SettingRow title="Allowed servers" description="Optional allow-list for registered MCP server ids. Empty means all configured enabled servers are allowed.">
                  <TextListInput value={settings.mcp.allowedServers} onChange={(allowedServers) => updateSettings({ mcp: { ...settings.mcp, allowedServers } })} />
                </SettingRow>
                <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ color: "#f8fafc", fontWeight: 800 }}>Registered Servers</div>
                  {mcpServers.length === 0 && <div style={{ color: "#94a3b8", fontSize: "13px" }}>No MCP servers configured. Add a real MCP server to enable discovery.</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                    {mcpServers.map(server => (
                      <div key={server.id} style={{ ...fieldStyle, background: "#0b1220", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <strong>{server.name}</strong>
                          <span style={{ color: server.status === "online" ? "#22c55e" : server.status === "error" ? "#fb7185" : "#fbbf24" }}>{server.status}</span>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>{server.id} | {server.transport.toUpperCase()} | {server.version ? `v${server.version}` : "version unknown"}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>protocol: {server.protocolVersion || "unknown"} | latency: {server.latencyMs ? `${server.latencyMs}ms` : "n/a"}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>tools {server.tools?.length || 0} | resources {server.resources?.length || 0} | prompts {server.prompts?.length || 0}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>last success: {server.lastSuccessfulConnectionAt || "Never"} | reconnect: {server.reconnectStatus || "idle"}</div>
                        {server.lastError && <div style={{ color: "#fb7185", fontSize: "11px" }}>{server.lastError}</div>}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => openMCPDialog(server)} style={{ ...fieldStyle, cursor: "pointer" }}>Configure</button>
                          <button onClick={() => setMCPServerEnabled(server.id, !server.enabled)} style={{ ...fieldStyle, cursor: "pointer" }}>{server.enabled ? "Disable" : "Enable"}</button>
                          <button onClick={() => restartMCPServer(server.id)} style={{ ...fieldStyle, cursor: "pointer" }}>Restart</button>
                          <button onClick={() => removeMCPServer(server.id)} style={{ ...fieldStyle, cursor: "pointer", color: "#fb7185" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ color: "#f8fafc", fontWeight: 800 }}>Tools Management</div>
                  {mcpTools.length === 0 && <div style={{ color: "#94a3b8", fontSize: "13px" }}>No MCP tools discovered yet. Run Refresh Discovery after configuring a server.</div>}
                  {mcpTools.map(tool => (
                    <div key={tool.id} style={{ ...fieldStyle, display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(130px, 160px) minmax(130px, 170px) minmax(110px, 130px)", gap: "10px", alignItems: "center" }}>
                      <div>
                        <strong>{tool.name}</strong>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>{tool.description || "No description"} | server: {tool.serverId}</div>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>{tool.category}</div>
                      <select value={tool.permission} onChange={(e) => updateMCPToolPermission(tool, e.target.value as MCPPermissionMode, tool.status !== "disabled")} style={{ ...fieldStyle, width: "100%" }}>
                        <option value="always">Always Allow</option>
                        <option value="ask">Ask Every Time</option>
                        <option value="never">Never Allow</option>
                      </select>
                      <button onClick={() => updateMCPToolPermission(tool, tool.permission, tool.status === "disabled")} style={{ ...fieldStyle, cursor: "pointer" }}>{tool.status === "disabled" ? "Enable" : "Disable"}</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ color: "#f8fafc", fontWeight: 800 }}>Resources</div>
                    {mcpResources.length === 0 && <div style={{ color: "#94a3b8", fontSize: "13px" }}>No resources exposed by discovered MCP servers.</div>}
                    {mcpResources.map(resource => (
                      <div key={resource.id} style={{ ...fieldStyle }}>
                        <strong>{resource.name}</strong>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>{resource.uri}</div>
                        <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "5px" }}>{resource.description || resource.mimeType || "Inspectable MCP resource"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ color: "#f8fafc", fontWeight: 800 }}>Prompts</div>
                    {mcpPrompts.length === 0 && <div style={{ color: "#94a3b8", fontSize: "13px" }}>No reusable prompts exposed by discovered MCP servers.</div>}
                    {mcpPrompts.map(prompt => (
                      <div key={prompt.id} style={{ ...fieldStyle }}>
                        <strong>{prompt.name}</strong>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>server: {prompt.serverId}</div>
                        <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "5px" }}>{prompt.description || "Reusable MCP prompt template"}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ color: "#f8fafc", fontWeight: 800 }}>Communication Logs</div>
                  {mcpServers.flatMap(server => server.logs || []).length === 0 && <div style={{ color: "#94a3b8", fontSize: "13px" }}>No MCP communication logged yet.</div>}
                  {mcpServers.flatMap(server => server.logs || []).slice(-40).map((log, index) => (
                    <div key={`${log.timestamp}-${index}`} style={{ color: log.level === "error" ? "#fb7185" : "#cbd5e1", fontSize: "12px", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>
                      {log.timestamp} | {log.serverId} | {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "creative" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Creative AI" description="Creative generation settings that affect asset jobs." />
                {renderBooleanRow("creative", "enabled", "Enable Creative AI", "Allow creative asset planning and generation workflows.")}
                {renderBooleanRow("creative", "requireApproval", "Require approval", "Require user approval before generation starts.")}
                <SettingRow title="Output folder" description="Local folder for generated asset metadata and files."><input value={settings.creative.outputFolder} onChange={(e) => updateSettings({ creative: { ...settings.creative, outputFolder: e.target.value } })} style={{ ...fieldStyle, width: "100%" }} /></SettingRow>
              </div>
            )}

            {activeTab === "vision" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Vision" description="Vision routing settings for screenshot and image analysis." />
                {renderBooleanRow("vision", "enabled", "Enable vision analysis", "Allow image attachments to route through the Vision model role.")}
                <SettingRow title="Vision role" description="Model role used for image analysis."><select value={settings.vision.providerRole} onChange={(e) => updateSettings({ vision: { ...settings.vision, providerRole: e.target.value as ModelRoleName } })} style={{ ...fieldStyle, width: "100%" }}>{(Object.keys(settings.models) as ModelRoleName[]).map(role => <option key={role} value={role}>{role}</option>)}</select></SettingRow>
              </div>
            )}

            {activeTab === "knowledge" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
                <SectionHeader title="Knowledge & Memory" description="Retrieval sources controlled by the Context Engine." />
                {renderBooleanRow("knowledge", "memoryEnabled", "Engineering memory", "Use decisions, failures, successes, and task history in retrieval.")}
                {renderBooleanRow("knowledge", "architectureIndexEnabled", "Architecture index", "Use architecture and dependency metadata in retrieval.")}
                {renderBooleanRow("knowledge", "attachmentMetadataEnabled", "Attachment metadata", "Use safe attachment metadata in retrieval results.")}
                <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "16px" }}>
                  <KnowledgeManager />
                </div>
              </div>
            )}

            {activeTab === "execution" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Execution" description="Controls for checkpoints, approvals, and bounded self-fixing." />
                {renderBooleanRow("execution", "autoCheckpoints", "Automatic checkpoints", "Create rollback points before approved modifications.")}
                {renderBooleanRow("execution", "approvalRequired", "Approval gate", "Require approval before executing modifying plans.")}
                <SettingRow title="Self-fix retries" description="Maximum automated remediation attempts after a failed check."><input type="number" min={0} max={2} value={settings.execution.selfFixRetries} onChange={(e) => updateSettings({ execution: { ...settings.execution, selfFixRetries: Number(e.target.value) } })} style={{ ...fieldStyle, width: "100%" }} /></SettingRow>
              </div>
            )}

            {activeTab === "security" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Security" description="User-facing safety policies. Secret values are never stored in Settings JSON." />
                {renderBooleanRow("security", "redactDiagnostics", "Redact diagnostics", "Scrub sensitive-looking values from diagnostic exports.")}
                {renderBooleanRow("security", "blockSensitiveFiles", "Block sensitive files", "Prevent retrieval of .env, tokens, cookies, and credential stores.")}
                {renderBooleanRow("security", "developerMode", "Developer mode", "Show advanced troubleshooting fields only for development sessions.")}
              </div>
            )}

            {activeTab === "backups" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Backups" description="Persistent backup behavior used by the production platform." />
                {renderBooleanRow("backups", "autoBackupOnUpgrade", "Backup on upgrade", "Create a backup before app upgrades or schema migration.")}
                <SettingRow title="Retention count" description="Number of backups to keep."><input type="number" min={1} value={settings.backups.retentionCount} onChange={(e) => updateSettings({ backups: { ...settings.backups, retentionCount: Number(e.target.value) } })} style={{ ...fieldStyle, width: "100%" }} /></SettingRow>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Diagnostics" description="Logging and export controls for support bundles." />
                <SettingRow title="Log level" description="Runtime log verbosity."><select value={settings.diagnostics.logLevel} onChange={(e) => updateSettings({ diagnostics: { ...settings.diagnostics, logLevel: e.target.value as AppSettings["diagnostics"]["logLevel"] } })} style={{ ...fieldStyle, width: "100%" }}><option value="info">Info</option><option value="warn">Warn</option><option value="error">Error</option><option value="debug">Debug</option></select></SettingRow>
                {renderBooleanRow("diagnostics", "exportRedactedOnly", "Redacted exports only", "Diagnostic archives are exported with secret redaction enabled.")}
              </div>
            )}

            {activeTab === "advanced" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeader title="Advanced" description="Developer-only controls. Internal token windows remain automatic and are not user configurable." />
                {renderBooleanRow("advanced", "developerMode", "Developer mode", "Expose developer diagnostics where the product supports them.")}
                {renderBooleanRow("advanced", "experimentalMcp", "Experimental MCP", "Enable experimental MCP behavior that may require restart.")}
              </div>
            )}
          </main>
          {mcpDialogOpen && (
            <div style={{ position: "absolute", inset: "24px", background: "rgba(2, 6, 23, 0.86)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
              <div style={{ ...panelStyle, width: "min(820px, 100%)", maxHeight: "calc(100vh - 96px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#f8fafc" }}>{mcpDraft.id ? "Configure MCP Server" : "Add MCP Server"}</h3>
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>Configure a real MCP server. Use Providers for LM Studio and model endpoints.</div>
                  </div>
                  <button onClick={() => setMcpDialogOpen(false)} style={{ ...fieldStyle, cursor: "pointer" }}>x</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                  <FieldBlock label="Server Name">
                    <input value={mcpDraft.name || ""} onChange={(e) => updateMcpDraft({ name: e.target.value })} style={{ ...fieldStyle, width: "100%" }} />
                  </FieldBlock>
                  <FieldBlock label="Transport">
                    <select value={mcpDraft.transport || "stdio"} onChange={(e) => updateMcpDraft({ transport: e.target.value as MCPTransport })} style={{ ...fieldStyle, width: "100%" }}>
                      <option value="stdio">STDIO</option>
                      <option value="http">HTTP</option>
                      <option value="sse">SSE</option>
                    </select>
                  </FieldBlock>
                  <FieldBlock label={mcpDraft.transport === "stdio" ? "Command" : "HTTP/SSE Endpoint URL"}>
                    <input value={mcpDraft.command || ""} onChange={(e) => updateMcpDraft({ command: e.target.value })} placeholder={mcpDraft.transport === "stdio" ? "npx" : "http://localhost:3000/mcp"} style={{ ...fieldStyle, width: "100%" }} />
                  </FieldBlock>
                  <FieldBlock label="Working Directory">
                    <input value={mcpDraft.cwd || ""} onChange={(e) => updateMcpDraft({ cwd: e.target.value })} placeholder="Optional" style={{ ...fieldStyle, width: "100%" }} />
                  </FieldBlock>
                  <FieldBlock label="Arguments">
                    <TextListInput value={mcpDraft.args || []} onChange={(args) => updateMcpDraft({ args })} placeholder="One argument per line" />
                  </FieldBlock>
                  <FieldBlock label="Environment Variables">
                    <textarea
                      value={Object.entries(mcpDraft.env || {}).map(([key, value]) => `${key}=${value}`).join("\n")}
                      onChange={(event) => updateMcpDraft({ env: Object.fromEntries(event.target.value.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
                        const index = line.indexOf("=");
                        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
                      })) })}
                      placeholder="NON_SECRET_FLAG=true"
                      style={{ ...fieldStyle, width: "100%", minHeight: "86px", resize: "vertical" }}
                    />
                  </FieldBlock>
                  <label style={{ color: "#cbd5e1", fontSize: "13px" }}><input type="checkbox" checked={Boolean(mcpDraft.autoStart)} onChange={(e) => updateMcpDraft({ autoStart: e.target.checked })} /> Auto Start</label>
                  <label style={{ color: "#cbd5e1", fontSize: "13px" }}><input type="checkbox" checked={Boolean(mcpDraft.autoReconnect)} onChange={(e) => updateMcpDraft({ autoReconnect: e.target.checked })} /> Auto Reconnect</label>
                </div>
                <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
                  {([
                    ["filesystem", ["read", "write", "delete"]],
                    ["terminal", ["execute", "powershell", "cmd"]],
                    ["workspace", ["read", "modify", "delete"]],
                    ["network", ["localhost", "internet"]],
                  ] as Array<[keyof MCPPermissions, string[]]>).map(([group, keys]) => (
                    <div key={group}>
                      <div style={{ color: "#f8fafc", fontWeight: 800, marginBottom: "8px" }}>{group}</div>
                      {keys.map(key => (
                        <label key={key} style={{ display: "block", color: "#cbd5e1", fontSize: "12px", marginTop: "6px" }}>
                          <input type="checkbox" checked={Boolean(((mcpDraft.permissions || defaultMcpPermissions)[group] as any)[key])} onChange={(e) => updateMcpPermission(group, key, e.target.checked)} /> {key}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: mcpDraft.lastError ? "#fb7185" : "#94a3b8", fontSize: "12px" }}>
                    {mcpDraft.lastError || (mcpDraft.status ? `Status: ${mcpDraft.status}` : "Test connection before saving when possible.")}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={testMCPDraft} disabled={mcpTesting} style={{ ...fieldStyle, cursor: mcpTesting ? "not-allowed" : "pointer" }}>{mcpTesting ? "Testing..." : "Test Connection"}</button>
                    <button onClick={saveMCPServer} style={{ ...fieldStyle, cursor: "pointer", background: "#38bdf8", color: "#06111f", fontWeight: 800 }}>Save Server</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openFolder: () => ipcRenderer.invoke("open-folder"),
  runCommand: (args: { command: string; cwd: string }) =>
    ipcRenderer.invoke("run-command", args),
  switchWorkspace: (workspacePath: string) =>
    ipcRenderer.invoke("switch-workspace", workspacePath),
  getRecentWorkspaces: () => ipcRenderer.invoke("get-recent-workspaces"),
  getLastWorkspace: () => ipcRenderer.invoke("get-last-workspace"),
  createExecutionSession: (taskText: string) =>
    ipcRenderer.invoke("create-execution-session", taskText),
  respondToPlan: (sessionId: string, approved: boolean) =>
    ipcRenderer.invoke("respond-to-plan", { sessionId, approved }),
  executePlan: (sessionId: string, patchContent?: string) =>
    ipcRenderer.invoke("execute-plan", { sessionId, patchContent }),
  respondToFix: (sessionId: string, approved: boolean) =>
    ipcRenderer.invoke("respond-to-fix", { sessionId, approved }),
  rollbackSession: (sessionId: string) =>
    ipcRenderer.invoke("rollback-session", sessionId),
  getProjectIntelligence: () =>
    ipcRenderer.invoke("get-project-intelligence"),
  clearNotification: (id: string) =>
    ipcRenderer.invoke("clear-notification", id),
  getResourceSnapshot: () =>
    ipcRenderer.invoke("get-resource-snapshot"),
  orchestratorCreateSession: (taskText: string) =>
    ipcRenderer.invoke("orchestrator-create-session", taskText),
  orchestratorRespondToPlan: (sessionId: string, approved: boolean) =>
    ipcRenderer.invoke("orchestrator-respond-to-plan", { sessionId, approved }),
  orchestratorExecutePlan: (sessionId: string, patchContent?: string) =>
    ipcRenderer.invoke("orchestrator-execute-plan", { sessionId, patchContent }),
  orchestratorRespondToFix: (sessionId: string, approved: boolean) =>
    ipcRenderer.invoke("orchestrator-respond-to-fix", { sessionId, approved }),
  orchestratorRollback: (sessionId: string) =>
    ipcRenderer.invoke("orchestrator-rollback", sessionId),
  orchestratorPauseSession: (sessionId: string) =>
    ipcRenderer.invoke("orchestrator-pause-session", sessionId),
  orchestratorResumeSession: (sessionId: string) =>
    ipcRenderer.invoke("orchestrator-resume-session", sessionId),
  orchestratorGetSessionStatus: (sessionId: string) =>
    ipcRenderer.invoke("orchestrator-get-session-status", sessionId),
  orchestratorGetAgents: () =>
    ipcRenderer.invoke("orchestrator-get-agents"),
  orchestratorGetConnectors: () =>
    ipcRenderer.invoke("orchestrator-get-connectors"),
  orchestratorConnectConnector: (id: string, credentials: any) =>
    ipcRenderer.invoke("orchestrator-connect-connector", { id, credentials }),
  orchestratorDisconnectConnector: (id: string) =>
    ipcRenderer.invoke("orchestrator-disconnect-connector", id),
  orchestratorRefreshConnector: (id: string) =>
    ipcRenderer.invoke("orchestrator-refresh-connector", id),
  storeAttachment: (filename: string, mimeType: string, dataBase64: string, source: "upload" | "clipboard" | "drag_drop", workspaceId: string) =>
    ipcRenderer.invoke("attachments-store", { filename, mimeType, dataBase64, source, workspaceId }),
  analyzeImage: (localPath: string, mimeType: string) =>
    ipcRenderer.invoke("vision-analyze", { localPath, mimeType }),
  retrieveContext: (query: string, workspacePath: string, tokenLimit?: number) =>
    ipcRenderer.invoke("context-retrieve", { query, workspacePath, tokenLimit }),
  createCreativePlan: (prompt: string, providerId?: string, model?: string, size?: string, workspaceId?: string) =>
    ipcRenderer.invoke("creative-plan", { prompt, providerId, model, size, workspaceId }),
  approveCreativeJob: (taskId: string, approved: boolean) =>
    ipcRenderer.invoke("creative-approve", { taskId, approved }),
  getCreativeJobStatus: (taskId: string) =>
    ipcRenderer.invoke("creative-status", taskId),
  getAvailableSkills: () =>
    ipcRenderer.invoke("skills-list"),
  matchActiveSkills: (taskText: string, affectedFiles?: string[]) =>
    ipcRenderer.invoke("skills-match", { taskText, affectedFiles }),
  loadSettings: () =>
    ipcRenderer.invoke("settings-load"),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke("settings-save", settings),
  saveProviderSecret: (providerId: string, apiKey: string) =>
    ipcRenderer.invoke("settings-save-provider-secret", { providerId, apiKey }),
  testProviderConnection: (providerId: string) =>
    ipcRenderer.invoke("settings-test-provider", providerId),
  discoverProviderModels: (providerId: string) =>
    ipcRenderer.invoke("settings-discover-provider-models", providerId),
  toggleSkill: (skillId: string, enabled: boolean) =>
    ipcRenderer.invoke("settings-skill-toggle", { skillId, enabled }),
  upsertSkill: (manifest: any) =>
    ipcRenderer.invoke("settings-skill-upsert", manifest),
  importSkillFolder: (folderPath: string) =>
    ipcRenderer.invoke("settings-skill-import-folder", folderPath),
  removeSkill: (skillId: string) =>
    ipcRenderer.invoke("settings-skill-remove", skillId),
  getProductionDiagnostics: () =>
    ipcRenderer.invoke("prod-diagnostics"),
  getPerformanceMetrics: (currentTokens?: number, queuedTasks?: number) =>
    ipcRenderer.invoke("prod-performance", { currentTokens, queuedTasks }),
  getEngineeringStandards: () =>
    ipcRenderer.invoke("prod-standards"),
  createBackup: (label?: string) =>
    ipcRenderer.invoke("prod-backup-create", label),
  listBackups: () =>
    ipcRenderer.invoke("prod-backup-list"),
  restoreBackup: (backupId: string) =>
    ipcRenderer.invoke("prod-backup-restore", backupId),
  exportLogs: () =>
    ipcRenderer.invoke("prod-export-logs"),
  exportDiagnosticsBundle: () =>
    ipcRenderer.invoke("prod-export-bundle"),
  checkForUpdates: () =>
    ipcRenderer.invoke("prod-check-updates"),
  getExtensions: (type?: string) =>
    ipcRenderer.invoke("sdk-extensions", type),
  toggleExtension: (id: string, enabled: boolean) =>
    ipcRenderer.invoke("sdk-toggle-extension", { id, enabled }),
  discoverMCPServers: () =>
    ipcRenderer.invoke("mcp-discover-servers"),
  listMCPServers: () =>
    ipcRenderer.invoke("mcp-list-servers"),
  saveMCPServer: (server: any) =>
    ipcRenderer.invoke("mcp-save-server", server),
  removeMCPServer: (serverId: string) =>
    ipcRenderer.invoke("mcp-remove-server", serverId),
  testMCPServer: (serverIdOrConfig: string | any) =>
    ipcRenderer.invoke("mcp-test-server", serverIdOrConfig),
  setMCPServerEnabled: (serverId: string, enabled: boolean) =>
    ipcRenderer.invoke("mcp-set-server-enabled", { serverId, enabled }),
  restartMCPServer: (serverId: string) =>
    ipcRenderer.invoke("mcp-restart-server", serverId),
  setMCPToolPermission: (serverId: string, toolId: string, permission: "always" | "ask" | "never", enabled: boolean) =>
    ipcRenderer.invoke("mcp-set-tool-permission", { serverId, toolId, permission, enabled }),
  onMenuNavigate: (callback: (dest: string) => void) =>
    ipcRenderer.on("menu-navigate", (event, dest) => callback(dest)),
});

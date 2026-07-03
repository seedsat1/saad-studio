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
  chatComplete: (prompt: string, workspacePath?: string, projectName?: string, attachments?: any[], approvalMode?: string, conversationId?: string, approval?: any) =>
    ipcRenderer.invoke("chat-complete", { prompt, workspacePath, projectName, attachments, approvalMode, conversationId, approval }),
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
  knowledgeImportFile: (filePath: string, category: string, tags?: string[], packName?: string) =>
    ipcRenderer.invoke("knowledge:import-file", { filePath, category, tags, packName }),
  knowledgeImportFolder: (folderPath: string, category: string, packName?: string) =>
    ipcRenderer.invoke("knowledge:import-folder", { folderPath, category, packName }),
  knowledgeImportGithub: (repoUrl: string, category: string) =>
    ipcRenderer.invoke("knowledge:import-github", { repoUrl, category }),
  knowledgeList: () =>
    ipcRenderer.invoke("knowledge:list"),
  knowledgeSearch: (query: string, category?: string, limit?: number) =>
    ipcRenderer.invoke("knowledge:search", { query, category, limit }),
  knowledgeGetDocument: (id: string) =>
    ipcRenderer.invoke("knowledge:get-document", { id }),
  knowledgeGetDictionaries: () =>
    ipcRenderer.invoke("knowledge:get-dictionaries"),
  knowledgeGetTerm: (id: string, category: string) =>
    ipcRenderer.invoke("knowledge:get-term", { id, category }),
  knowledgeDeleteDocument: (id: string) =>
    ipcRenderer.invoke("knowledge:delete-document", { id }),
  knowledgeGetStats: () =>
    ipcRenderer.invoke("knowledge:get-stats"),
  knowledgeImportUrl: (url: string, category: string, tags?: string[]) =>
    ipcRenderer.invoke("knowledge:import-url", { url, category, tags }),
  knowledgeImportControl: (taskId: string, action: string) =>
    ipcRenderer.invoke("knowledge:import-control", { taskId, action }),
  knowledgeListPacks: () =>
    ipcRenderer.invoke("knowledge:list-packs"),
  knowledgePackDelete: (category: string) =>
    ipcRenderer.invoke("knowledge:pack-delete", { category }),
  knowledgePackReindex: (category: string) =>
    ipcRenderer.invoke("knowledge:pack-reindex", { category }),
  knowledgePackExport: (category: string) =>
    ipcRenderer.invoke("knowledge:pack-export", { category }),
  knowledgeGetConfig: () =>
    ipcRenderer.invoke("knowledge:get-config"),
  knowledgeSaveConfig: (newConfig: any) =>
    ipcRenderer.invoke("knowledge:save-config", { newConfig }),
  knowledgeListWorkspaces: () =>
    ipcRenderer.invoke("knowledge:list-workspaces"),
  knowledgeCreateBackup: (label?: string) =>
    ipcRenderer.invoke("knowledge:create-backup", { label }),
  knowledgeListBackups: () =>
    ipcRenderer.invoke("knowledge:list-backups"),
  knowledgeRestoreBackup: (backupId: string) =>
    ipcRenderer.invoke("knowledge:restore-backup", { backupId }),
  onKnowledgeImportProgress: (callback: (event: any) => void) =>
    ipcRenderer.on("knowledge:import-progress", (event, data) => callback(data)),
  listTrustedWorkspaces: () =>
    ipcRenderer.invoke("trusted-workspace:list"),
  addTrustedWorkspace: (workspacePath: string, name?: string) =>
    ipcRenderer.invoke("trusted-workspace:add", { workspacePath, name }),
  removeTrustedWorkspace: (id: string) =>
    ipcRenderer.invoke("trusted-workspace:remove", { id }),
  searchWorkspace: (workspaceId: string, query: string, limit?: number, policy?: any) =>
    ipcRenderer.invoke("trusted-workspace:search", { workspaceId, query, limit, ...(policy || {}) }),
  runWorkspaceCommand: (workspaceId: string, command: string, args?: string[], explicitApproval?: boolean, policy?: any) =>
    ipcRenderer.invoke("trusted-workspace:run-command", { workspaceId, command, args, explicitApproval, ...(policy || {}) }),
  openLocalPath: (targetPath: string, policy?: any) =>
    ipcRenderer.invoke("trusted-workspace:open-path", { targetPath, ...(policy || {}) }),
  revealLocalPath: (targetPath: string, policy?: any) =>
    ipcRenderer.invoke("trusted-workspace:reveal-path", { targetPath, ...(policy || {}) }),
  copyLocalPath: (targetPath: string, policy?: any) =>
    ipcRenderer.invoke("trusted-workspace:copy-path", { targetPath, ...(policy || {}) }),
  rememberApproval: (conversationId: string, action: string) =>
    ipcRenderer.invoke("approval:remember", { conversationId, action }),
  chatAbort: (sessionId: string) =>
    ipcRenderer.invoke("chat-abort", { sessionId }),
  onMenuNavigate: (callback: (dest: string) => void) =>
    ipcRenderer.on("menu-navigate", (event, dest) => callback(dest)),
  onExecutionTraceEvent: (callback: (event: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on("execution-trace-event", listener);
    return () => ipcRenderer.removeListener("execution-trace-event", listener);
  },
});

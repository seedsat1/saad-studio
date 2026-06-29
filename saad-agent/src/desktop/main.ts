import electronPkg from "electron";
const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, shell } = electronPkg;
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { WorkspaceManager } from "../platform/workspace-manager.js";
import { ExecutionSessionManager } from "../platform/services/planner.js";
import { ProjectIntelligenceService } from "../platform/services/project-intelligence.js";
import { EngineeringOrchestrator } from "../platform/services/orchestrator.js";
import { AgentRegistry } from "../platform/services/multi-agent.js";
import { ConnectorRegistry } from "../platform/services/connectors.js";
import { AttachmentManager } from "../platform/services/attachments.js";
import { VisionAnalyzer } from "../platform/services/vision-analyzer.js";
import { ContextEngine } from "../platform/services/context-engine.js";
import { CreativeService } from "../platform/services/creative.js";
import { SkillsService } from "../platform/services/skills.js";
import { ProductionService } from "../platform/services/production.js";
import { SDKService } from "../platform/services/sdk.js";
import { SettingsManager } from "../production/settings-manager.js";
import { CONFIG } from "../config.js";
import { ChatOrchestratorService } from "../platform/services/chat-orchestrator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  app.commandLine.appendSwitch("disable-gpu-cache");
  app.commandLine.appendSwitch("disable-http-cache");
} catch (_) {}

let mainWindow: any = null;

ipcMain.handle("switch-workspace", async (event, workspacePath) => {
  try {
    await WorkspaceManager.switchWorkspace(workspacePath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("create-execution-session", async (event, taskText) => {
  try {
    const session = ExecutionSessionManager.createSession(taskText, CONFIG.PROJECT_ROOT);
    const plan = await ExecutionSessionManager.generatePlanForSession(session.id);
    return { success: true, sessionId: session.id, plan };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("respond-to-plan", async (event, { sessionId, approved }) => {
  try {
    ExecutionSessionManager.respondToPlan(sessionId, approved);
    const session = ExecutionSessionManager.getSession(sessionId);
    return { success: true, state: session?.state };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("execute-plan", async (event, { sessionId, patchContent }) => {
  try {
    const results = await ExecutionSessionManager.executeApprovedPlan(sessionId, patchContent);
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("respond-to-fix", async (event, { sessionId, approved }) => {
  try {
    await ExecutionSessionManager.respondToFix(sessionId, approved);
    const session = ExecutionSessionManager.getSession(sessionId);
    return { success: true, state: session?.state, proposedFixPatch: session?.proposedFixPatch, failureReason: session?.failureReason };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("rollback-session", async (event, sessionId) => {
  try {
    const success = await ExecutionSessionManager.rollbackSession(sessionId);
    return { success };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-project-intelligence", async () => {
  try {
    return ProjectIntelligenceService.getIntelligenceState();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("clear-notification", async (event, id) => {
  try {
    ProjectIntelligenceService.clearNotification(id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-resource-snapshot", async () => {
  try {
    const snapshot = await ProjectIntelligenceService.getResourceSnapshot();
    return { success: true, snapshot };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-create-session", async (event, taskText) => {
  try {
    const session = EngineeringOrchestrator.createSession(taskText, CONFIG.PROJECT_ROOT);
    const plan = await ExecutionSessionManager.generatePlanForSession(session.id);
    await EngineeringOrchestrator.executeParallelGraph(session);
    return { success: true, session, plan };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("chat-complete", async (event, { prompt, workspacePath, projectName }) => {
  try {
    const result = await ChatOrchestratorService.handleDirectChat({ prompt, workspacePath, projectName });
    return { success: true, response: result.response, intent: result.intent, usedModel: result.usedModel };
  } catch (err: any) {
    return { success: false, error: err.message || "Chat completion failed." };
  }
});
ipcMain.handle("orchestrator-respond-to-plan", async (event, { sessionId, approved }) => {
  try {
    await EngineeringOrchestrator.respondToPlan(sessionId, approved);
    const session = EngineeringOrchestrator.getSession(sessionId);
    const plannerSession = ExecutionSessionManager.getSession(sessionId);
    return { success: true, session, state: plannerSession?.state };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-execute-plan", async (event, { sessionId, patchContent }) => {
  try {
    await EngineeringOrchestrator.executePlan(sessionId, patchContent);
    const session = EngineeringOrchestrator.getSession(sessionId);
    const plannerSession = ExecutionSessionManager.getSession(sessionId);
    return {
      success: true,
      session,
      results: {
        success: session?.status === "completed",
        state: plannerSession?.state,
        checkpointId: plannerSession?.checkpointId,
        proposedFixPatch: plannerSession?.proposedFixPatch,
        failureReason: plannerSession?.failureReason,
        error: plannerSession?.failureReason,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-respond-to-fix", async (event, { sessionId, approved }) => {
  try {
    await EngineeringOrchestrator.respondToFix(sessionId, approved);
    const session = EngineeringOrchestrator.getSession(sessionId);
    const plannerSession = ExecutionSessionManager.getSession(sessionId);
    return {
      success: true,
      session,
      state: plannerSession?.state,
      proposedFixPatch: plannerSession?.proposedFixPatch,
      failureReason: plannerSession?.failureReason,
      error: plannerSession?.failureReason,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-rollback", async (event, sessionId) => {
  try {
    const success = await EngineeringOrchestrator.rollbackSession(sessionId);
    const session = EngineeringOrchestrator.getSession(sessionId);
    return { success, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-pause-session", async (event, sessionId) => {
  try {
    EngineeringOrchestrator.pauseSession(sessionId);
    const session = EngineeringOrchestrator.getSession(sessionId);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-resume-session", async (event, sessionId) => {
  try {
    EngineeringOrchestrator.resumeSession(sessionId);
    const session = EngineeringOrchestrator.getSession(sessionId);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-get-session-status", async (event, sessionId) => {
  try {
    const session = EngineeringOrchestrator.getSession(sessionId);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-get-agents", async () => {
  try {
    const agents = AgentRegistry.getAgents().map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
      currentStatus: a.currentStatus,
      priority: a.priority,
      report: a.report(),
    }));
    return { success: true, agents };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-get-connectors", async () => {
  try {
    const connectors = ConnectorRegistry.getConnectors().map(c => ({
      id: c.id,
      name: c.name,
      version: c.version,
      provider: c.provider,
      capabilities: c.capabilities,
      authenticationType: c.authenticationType,
      permissions: c.permissions,
      connectionStatus: c.connectionStatus,
      healthStatus: c.healthStatus,
      lastSync: c.lastSync,
    }));
    return { success: true, connectors };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-connect-connector", async (event, { id, credentials }) => {
  try {
    const connector = ConnectorRegistry.getConnector(id);
    if (!connector) throw new Error("Connector not found");
    await connector.authenticate(credentials);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-disconnect-connector", async (event, id) => {
  try {
    const connector = ConnectorRegistry.getConnector(id);
    if (!connector) throw new Error("Connector not found");
    await connector.disconnect();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("orchestrator-refresh-connector", async (event, id) => {
  try {
    const connector = ConnectorRegistry.getConnector(id);
    if (!connector) throw new Error("Connector not found");
    await connector.refresh();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("attachments-store", async (event, { filename, mimeType, dataBase64, source, workspaceId }) => {
  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const attachment = await AttachmentManager.storeAttachment(filename, mimeType, buffer, source, workspaceId);
    return { success: true, attachment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("vision-analyze", async (event, { localPath, mimeType }) => {
  try {
    const result = await VisionAnalyzer.analyzeImage(localPath, mimeType);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("context-retrieve", async (event, { query, workspacePath, tokenLimit }) => {
  try {
    const result = await ContextEngine.retrieveContext(query, workspacePath, tokenLimit);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("creative-plan", async (event, { prompt, providerId, model, size, workspaceId }) => {
  try {
    const plan = await CreativeService.createPlan(prompt, providerId, model, size, workspaceId);
    return { success: true, plan };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("creative-approve", async (event, { taskId, approved }) => {
  try {
    const status = await CreativeService.approveJob(taskId, approved);
    return { success: true, status };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("creative-status", async (event, taskId) => {
  try {
    const status = await CreativeService.getJobStatus(taskId);
    return { success: true, status };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("skills-list", async () => {
  try {
    const skills = SkillsService.getAvailableSkills();
    return { success: true, skills };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("skills-match", async (event, { taskText, affectedFiles }) => {
  try {
    const matches = SkillsService.matchActiveSkills(taskText, affectedFiles);
    return { success: true, matches };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-load", async () => {
  try {
    const settings = await SettingsManager.getSettings();
    return { success: true, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-save", async (event, settings) => {
  try {
    const saved = await SettingsManager.replaceSettings(settings);
    return { success: true, settings: saved };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-save-provider-secret", async (event, { providerId, apiKey }) => {
  try {
    const secretRef = await SettingsManager.saveProviderSecret(providerId, apiKey);
    const settings = await SettingsManager.getSettings();
    return { success: true, secretRef, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-test-provider", async (event, providerId) => {
  try {
    const provider = await SettingsManager.testProviderConnection(providerId);
    return { success: true, provider };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-discover-provider-models", async (event, providerId) => {
  try {
    const provider = await SettingsManager.discoverProviderModels(providerId);
    const settings = await SettingsManager.getSettings();
    return { success: true, provider, settings };
  } catch (err: any) {
    const settings = await SettingsManager.getSettings();
    return { success: false, error: err.message, settings };
  }
});

ipcMain.handle("settings-skill-toggle", async (event, { skillId, enabled }) => {
  try {
    const skills = await SkillsService.setSkillEnabled(skillId, enabled);
    const settings = await SettingsManager.getSettings();
    return { success: true, skills, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-skill-upsert", async (event, manifest) => {
  try {
    const skill = await SkillsService.upsertCustomSkill(manifest);
    const settings = await SettingsManager.getSettings();
    return { success: true, skill, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-skill-import-folder", async (event, folderPath) => {
  try {
    const skill = await SettingsManager.importSkillFromFolder(folderPath);
    const settings = await SettingsManager.getSettings();
    return { success: true, skill, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("settings-skill-remove", async (event, skillId) => {
  try {
    const removed = await SkillsService.removeCustomSkill(skillId);
    const settings = await SettingsManager.getSettings();
    return { success: true, removed, settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-diagnostics", async () => {
  try {
    const diagnostics = ProductionService.getDiagnostics();
    return { success: true, diagnostics };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-performance", async (event, { currentTokens, queuedTasks }) => {
  try {
    const metrics = ProductionService.getPerformanceMetrics(currentTokens, queuedTasks);
    return { success: true, metrics };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-standards", async () => {
  try {
    const standards = await ProductionService.getStandards();
    return { success: true, standards };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-backup-create", async (event, label) => {
  try {
    const backup = await ProductionService.createBackup(label);
    return { success: true, backup };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-backup-list", async () => {
  try {
    const backups = await ProductionService.listBackups();
    return { success: true, backups };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-backup-restore", async (event, backupId) => {
  try {
    const restored = await ProductionService.restoreBackup(backupId);
    return { success: restored };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-export-logs", async () => {
  try {
    const filePath = await ProductionService.exportLogs();
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-export-bundle", async () => {
  try {
    const res = await ProductionService.exportDiagnosticsBundle();
    return { success: true, filePath: res.filePath, bundle: res.bundle };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("prod-check-updates", async () => {
  try {
    const info = await ProductionService.checkForUpdates();
    return { success: true, info };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("sdk-extensions", async (event, type) => {
  try {
    const extensions = SDKService.getExtensions(type);
    return { success: true, extensions };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("sdk-toggle-extension", async (event, { id, enabled }) => {
  try {
    const toggled = SDKService.toggleExtension(id, enabled);
    return { success: toggled };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-discover-servers", async () => {
  try {
    const result = await SDKService.discoverMCPServers();
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-list-servers", async () => {
  try {
    const servers = await SDKService.listMCPServers();
    const tools = await SDKService.discoverMCPTools();
    const resources = servers.flatMap((server: any) => server.resources || []);
    const prompts = servers.flatMap((server: any) => server.prompts || []);
    return { success: true, servers, tools, resources, prompts };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-save-server", async (event, server) => {
  try {
    const saved = await SDKService.upsertMCPServer(server);
    return { success: true, server: saved };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-remove-server", async (event, serverId) => {
  try {
    const removed = await SDKService.removeMCPServer(serverId);
    return { success: true, removed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-test-server", async (event, serverIdOrConfig) => {
  try {
    const server = await SDKService.testMCPServer(serverIdOrConfig);
    return { success: true, server };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-set-server-enabled", async (event, { serverId, enabled }) => {
  try {
    const server = await SDKService.setMCPServerEnabled(serverId, enabled);
    return { success: true, server };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-restart-server", async (event, serverId) => {
  try {
    const server = await SDKService.restartMCPServer(serverId);
    return { success: true, server };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("mcp-set-tool-permission", async (event, { serverId, toolId, permission, enabled }) => {
  try {
    const server = await SDKService.setMCPToolPermission(serverId, toolId, permission, enabled);
    return { success: true, server };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-recent-workspaces", async () => {
  try {
    const recent = await WorkspaceManager.loadRecentWorkspaces();
    return recent.workspaces;
  } catch {
    return [];
  }
});

ipcMain.handle("get-last-workspace", async () => {
  try {
    const config = await WorkspaceManager.loadGlobalConfig();
    return config.lastActiveWorkspace || null;
  } catch {
    return null;
  }
});

ipcMain.handle("open-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

ipcMain.handle("run-command", async (event, { command, cwd }) => {
  const allowedPrefixes = [
    "npx tsc",
    "node src/test-incremental.js",
    "npm run build",
    "npm test"
  ];
  const isAllowed = allowedPrefixes.some((prefix) => command.startsWith(prefix));
  if (!isAllowed) {
    return { success: false, error: `Command not allowlisted: ${command}` };
  }

  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, stdout, stderr };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      stdout: err.stdout,
      stderr: err.stderr
    };
  }
});

async function setupApplicationMenu(win: any) {
  const recentData = await WorkspaceManager.loadRecentWorkspaces();
  const recentItems = recentData.workspaces.map((w) => ({
    label: w.name + " (" + w.path + ")",
    click: async () => {
      try {
        await WorkspaceManager.switchWorkspace(w.path);
        const folderName = path.basename(w.path);
        win.setTitle("Saad Studio Agent - " + folderName);
        win.webContents.reload();
        await setupApplicationMenu(win);
      } catch (err: any) {
        dialog.showMessageBox(win, { type: "error", title: "Error", message: err.message });
      }
    }
  }));

  const template: any[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const res = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
            if (!res.canceled && res.filePaths[0]) {
              const selectedPath = res.filePaths[0];
              try {
                await WorkspaceManager.switchWorkspace(selectedPath);
                const folderName = path.basename(selectedPath);
                win.setTitle("Saad Studio Agent - " + folderName);
                win.webContents.reload();
                await setupApplicationMenu(win);
              } catch (err: any) {
                dialog.showMessageBox(win, { type: "error", title: "Error", message: err.message });
              }
            }
          }
        },
        {
          label: "Open Recent",
          submenu: recentItems.length > 0 ? recentItems : [{ label: "No Recent Folders", enabled: false }]
        },
        {
          label: "Close Folder",
          click: () => {
            win.setTitle("Saad Studio Agent");
            win.webContents.reload();
          }
        },
        { type: "separator" },
        {
          label: "Save Workspace As...",
          click: () => {
            dialog.showMessageBox(win, { type: "info", title: "Save Workspace", message: "Workspace footprint state automatically synchronized under .saad-agent/" });
          }
        },
        {
          label: "Workspace Settings",
          click: () => {
            win.webContents.send("menu-navigate", "settings");
          }
        },
        { type: "separator" },
        {
          label: "Settings",
          click: () => {
            win.webContents.send("menu-navigate", "settings");
          }
        },
        { type: "separator" },
        { label: "Exit", role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        {
          label: "Maximize",
          click: () => {
            if (win.isMaximized()) win.unmaximize();
            else win.maximize();
          }
        },
        { role: "close" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Saad Studio Agent",
          click: () => {
            const iconPath = path.join(app.getAppPath(), "resources", "icon.png");
            const appIcon = nativeImage.createFromPath(iconPath);
            dialog.showMessageBox(win, {
              type: "info",
              icon: appIcon,
              title: "About Saad Studio Agent",
              message: "Saad Studio Agent v6.5.0 Production Release",
              detail: `Autonomous AI Engineering Studio Desktop Platform\nEngine Build: v6.5.0-production (Build 2026-06-29)\nFeatures: Autonomous Engineering Engine, Intent Routing, Brave Research, Cognitive Memory & RAG\n\nCopyright Â© 2026 Saad Studio. All rights reserved.\nLicense: Commercial / Enterprise Studio License\nWebsite: https://saad-studio.ai\n\nRuntime Specifications:\nâ€¢ Electron: v${process.versions.electron}\nâ€¢ Node.js: v${process.versions.node}\nâ€¢ Chromium: v${process.versions.chrome}\nâ€¢ Architecture: x64\n\nUserData Directory:\n${app.getPath("userData")}`
            });
          }
        },
        {
          label: "Check for Updates",
          click: async () => {
            try {
              const res = await ProductionService.checkForUpdates();
              dialog.showMessageBox(win, {
                type: "info",
                title: "Check for Updates",
                message: "Auto update is not configured yet.",
                detail: res ? `Current Version: ${res.currentVersion}` : "Offline mode"
              });
            } catch (err: any) {
              dialog.showMessageBox(win, { type: "error", title: "Update Error", message: err.message });
            }
          }
        },
        { type: "separator" },
        {
          label: "Open Logs Folder",
          click: () => {
            const logsPath = path.join(app.getPath("userData"), "logs");
            shell.openPath(logsPath);
          }
        },
        {
          label: "Export Diagnostics Bundle",
          click: async () => {
            try {
              const bundle = await ProductionService.exportDiagnosticsBundle();
              const choice = await dialog.showMessageBox(win, {
                type: "info",
                title: "Export Diagnostics Bundle",
                message: "Diagnostics bundle exported successfully!",
                detail: `File Path: ${bundle.filePath}`,
                buttons: ["Open Folder", "Open File", "Copy Path", "OK"],
                defaultId: 0,
                cancelId: 3
              });
              if (choice.response === 0) {
                shell.showItemInFolder(bundle.filePath);
              } else if (choice.response === 1) {
                shell.openPath(bundle.filePath);
              } else if (choice.response === 2) {
                clipboard.writeText(bundle.filePath);
              }
            } catch (err: any) {
              dialog.showMessageBox(win, { type: "error", title: "Export Error", message: err.message });
            }
          }
        },
        {
          label: "Open App Data Folder",
          click: () => {
            shell.openPath(app.getPath("userData"));
          }
        },
        { type: "separator" },
        {
          label: "Documentation",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "Documentation",
              message: "Documentation is not available yet.",
              detail: "Official Saad Studio desktop platform documentation will be published with the upcoming cloud release."
            });
          }
        },
        {
          label: "Report Issue",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "Report Issue & Support",
              message: "Saad Studio Issue Reporting",
              detail: "To submit engineering feedback or diagnostic archives, please use Help > Export Diagnostics Bundle and attach the generated archive."
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      icon: path.join(app.getAppPath(), "resources", "icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(app.getAppPath(), "dist", "desktop", "preload.cjs"),
      },
      backgroundColor: "#070a13",
      title: "Saad Studio Agent",
    });

    await setupApplicationMenu(mainWindow);

    try {
      const globalConfig = await WorkspaceManager.loadGlobalConfig();
      if (globalConfig.lastActiveWorkspace) {
        await WorkspaceManager.switchWorkspace(globalConfig.lastActiveWorkspace);
        const folderName = path.basename(globalConfig.lastActiveWorkspace);
        mainWindow.setTitle("Saad Studio Agent - " + folderName);
        await setupApplicationMenu(mainWindow);
      }
    } catch (e) {
      console.error("Error restoring last active workspace:", e);
    }

    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      mainWindow.loadURL("http://localhost:5173");
    } else {
      let uiPath = path.join(app.getAppPath(), "ui", "dist", "index.html");
      if (!fs.existsSync(uiPath)) {
        uiPath = path.join(app.getAppPath(), "ui", "index.html");
      }
      if (!fs.existsSync(uiPath)) {
        uiPath = path.resolve(__dirname, "../../ui/dist/index.html");
      }
      if (!fs.existsSync(uiPath)) {
        uiPath = path.resolve(__dirname, "../ui/dist/index.html");
      }
      mainWindow.loadFile(uiPath);
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
      try { ProjectIntelligenceService.stopWatcher(); } catch (_) {}
    });

    try { ProjectIntelligenceService.startWatcher(); } catch (_) {}
  } catch (err: any) {
    dialog.showErrorBox("Startup Error", err.message + "\n" + err.stack);
  }
}

app.on("ready", () => {
  process.env["SAAD_AGENT_SETTINGS_ROOT"] = app.getPath("userData");
  void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

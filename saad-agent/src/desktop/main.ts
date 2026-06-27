import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { WorkspaceManager } from "../platform/workspace-manager.js";
import { ExecutionSessionManager } from "../platform/services/planner.js";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#070a13",
    title: "Saad Studio Agent",
  });

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // Path resolution to load the compiled UI frontend
    mainWindow.loadFile(path.join(__dirname, "../../../ui/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

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

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
});

import { Logger } from "./logger.js";

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
}

export class AutoUpdaterPlaceholder {
  static async checkForUpdates(): Promise<UpdateInfo> {
    Logger.log("Runtime", "info", "Checking for updates via AutoUpdater placeholder...");
    return {
      updateAvailable: false,
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      releaseNotes: "Current version is up to date."
    };
  }

  static async downloadUpdate(): Promise<boolean> {
    Logger.log("Runtime", "info", "Download update triggered (Placeholder offline mode).");
    return true;
  }

  static async applyUpdate(): Promise<boolean> {
    Logger.log("Runtime", "info", "Apply update triggered (Placeholder offline mode).");
    return true;
  }
}

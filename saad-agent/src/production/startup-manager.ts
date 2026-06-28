import { SettingsManager } from "./settings-manager.js";
import { CrashRecoveryManager, type CrashSnapshot } from "./crash-recovery.js";
import { Logger } from "./logger.js";
import { SkillRegistry } from "../skills/skill-registry.js";
import { ConnectorRegistry } from "../platform/services/connectors.js";

export interface StartupResult {
  status: "initialized" | "recovered" | "failed";
  restoredSessionId?: string | undefined;
  restoredWorkspacePath?: string | undefined;
  loadedSkillsCount: number;
  loadedConnectorsCount: number;
  error?: string | undefined;
}

export class StartupManager {
  static async initializeApplication(): Promise<StartupResult> {
    try {
      Logger.log("Runtime", "info", "Starting Saad Agent production boot sequence...");

      // 1. Load global settings
      await SettingsManager.getSettings();

      // 2. Load crash snapshot / last session state
      const crashSnapshot: CrashSnapshot | null = await CrashRecoveryManager.loadSnapshot();

      // 3. Initialize built-in skills
      const skills = SkillRegistry.getSkills();

      // 4. Initialize connector ecosystem
      const connectors = ConnectorRegistry.getConnectors();

      Logger.log("Runtime", "info", "Application boot sequence completed successfully.", {
        skillsCount: skills.length,
        connectorsCount: connectors.length,
        recovered: crashSnapshot !== null
      });

      return {
        status: crashSnapshot ? "recovered" : "initialized",
        restoredSessionId: crashSnapshot?.activeSessionId,
        restoredWorkspacePath: crashSnapshot?.workspacePath,
        loadedSkillsCount: skills.length,
        loadedConnectorsCount: connectors.length
      };
    } catch (err: any) {
      Logger.log("Errors", "error", `Startup initialization failed: ${err.message}`);
      return {
        status: "failed",
        loadedSkillsCount: 0,
        loadedConnectorsCount: 0,
        error: err.message
      };
    }
  }
}

import { StandardsManager } from "./standards/standards-manager.js";
import { CrashRecoveryManager } from "./production/crash-recovery.js";
import { DiagnosticsService } from "./production/diagnostics.js";
import { Logger } from "./production/logger.js";
import { BackupManager } from "./production/backup-manager.js";
import { SettingsManager } from "./production/settings-manager.js";
import { PerformanceMonitor } from "./production/performance-monitor.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 20 Production Platform & Engineering Standards Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-production-workspace");

  try {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    setProjectRoot(tempWorkspace);

    // 1. Part A � Engineering Standards & Decision Policies
    console.log("\n--- Test 1: Engineering Standards & Policies ---");
    const standards = await StandardsManager.getStandards();
    console.log("Engineering Standards version:", standards.version);
    console.log("Policy 'neverModifyEnv' is true:", standards.policies.neverModifyEnv);
    console.log("Policy 'alwaysCheckpointBeforePatches' is true:", standards.policies.alwaysCheckpointBeforePatches);
    console.log("TypeScript rules loaded count:", standards.coding.typescriptRules.length);

    // 2. Crash Recovery Snapshots
    console.log("\n--- Test 2: Crash Recovery Snapshots ---");
    await CrashRecoveryManager.saveSnapshot({
      workspacePath: tempWorkspace,
      activeSessionId: "session-crash-test-123",
      pendingPlansCount: 2
    });

    const recoveredSnapshot = await CrashRecoveryManager.loadSnapshot();
    console.log("Recovered snapshot activeSessionId:", recoveredSnapshot?.activeSessionId);
    console.log("Recovered snapshot workspacePath matches:", recoveredSnapshot?.workspacePath === tempWorkspace);

    // 3. System Diagnostics
    console.log("\n--- Test 3: System Diagnostics ---");
    const diag = DiagnosticsService.getDiagnostics();
    console.log("App Version:", diag.appVersion);
    console.log("OS Platform:", diag.os);
    console.log("CPU Cores count:", diag.cpuCores);
    console.log("Total Memory MB:", diag.totalMemoryMB);
    console.log("Workspace Health status:", diag.workspaceHealth);

    // 4. Structured Logger & Export
    console.log("\n--- Test 4: Structured Logger & Export ---");
    Logger.log("Runtime", "info", "Production test log entry initialized");
    Logger.log("Planner", "info", "Test planning log recorded");
    const logs = Logger.getLogs("Runtime");
    console.log("Recorded Runtime logs count:", logs.length);
    const exportedPath = await Logger.exportLogs();
    const exportedExists = await fs.stat(exportedPath).then(() => true).catch(() => false);
    console.log("Exported log file written to disk:", exportedExists);

    // 5. Backup & Restore Manager
    console.log("\n--- Test 5: Backup & Restore Manager ---");
    const backup = await BackupManager.createBackup("Phase 20 Test Backup Point");
    console.log("Backup ID generated:", backup.backupId);
    console.log("Backup label:", backup.label);
    const backupsList = await BackupManager.listBackups();
    console.log("Backups count in registry:", backupsList.length);
    const restored = await BackupManager.restoreBackup(backup.backupId);
    console.log("Restore operation success:", restored);

    // 6. Settings Manager
    console.log("\n--- Test 6: Settings Manager ---");
    const defaultSettings = await SettingsManager.getSettings();
    console.log("Default theme setting:", defaultSettings.theme);
    const updatedSettings = await SettingsManager.updateSettings({ theme: "dark_sleek" });
    console.log("Updated theme setting:", updatedSettings.theme);

    // 7. Performance Monitor
    console.log("\n--- Test 7: Performance Monitor ---");
    const metrics = PerformanceMonitor.getMetrics(250, 1);
    console.log("CPU Load percentage:", metrics.cpuLoadPercentage, "%");
    console.log("Active Memory Used MB:", metrics.memoryUsedMB, "MB");
    console.log("Active Context Tokens tracked:", metrics.activeContextTokens);

    console.log("\n✅ All Phase 20 Production Platform & Engineering Standards tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();

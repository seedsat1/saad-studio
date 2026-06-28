import { StandardsManager } from "../../standards/standards-manager.js";
import { DiagnosticsService } from "../../production/diagnostics.js";
import { PerformanceMonitor } from "../../production/performance-monitor.js";
import { BackupManager } from "../../production/backup-manager.js";
import { Logger } from "../../production/logger.js";
import { SettingsManager } from "../../production/settings-manager.js";
import { CrashRecoveryManager } from "../../production/crash-recovery.js";
import { DiagnosticsExporter } from "../../production/diagnostics-exporter.js";
import { AutoUpdaterPlaceholder } from "../../production/auto-updater.js";

export class ProductionService {
  static async getStandards() {
    return StandardsManager.getStandards();
  }

  static getDiagnostics() {
    return DiagnosticsService.getDiagnostics();
  }

  static getPerformanceMetrics(currentTokens?: number, queuedTasks?: number) {
    return PerformanceMonitor.getMetrics(currentTokens, queuedTasks);
  }

  static async createBackup(label?: string) {
    return BackupManager.createBackup(label);
  }

  static async listBackups() {
    return BackupManager.listBackups();
  }

  static async restoreBackup(backupId: string) {
    return BackupManager.restoreBackup(backupId);
  }

  static async exportLogs() {
    return Logger.exportLogs();
  }

  static async exportDiagnosticsBundle() {
    return DiagnosticsExporter.exportDiagnosticsBundle();
  }

  static async checkForUpdates() {
    return AutoUpdaterPlaceholder.checkForUpdates();
  }

  static async getSettings() {
    return SettingsManager.getSettings();
  }

  static async updateSettings(updates: any) {
    return SettingsManager.updateSettings(updates);
  }

  static async getCrashSnapshot() {
    return CrashRecoveryManager.loadSnapshot();
  }
}

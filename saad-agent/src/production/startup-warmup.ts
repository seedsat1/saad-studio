import { ConnectorRegistry } from "../platform/services/connectors.js";
import { ReferenceRegistryService } from "../platform/services/reference-registry.js";
import { SkillRegistry } from "../skills/skill-registry.js";
import { SettingsManager } from "./settings-manager.js";

export interface StartupWarmupEntry {
  name: string;
  status: "pending" | "fulfilled" | "rejected";
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  error?: string;
}

export interface StartupWarmupReport {
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  entries: StartupWarmupEntry[];
}

let warmupPromise: Promise<StartupWarmupReport> | null = null;
let latestReport: StartupWarmupReport | null = null;

function now(): number {
  return Date.now();
}

async function runEntry(name: string, work: () => unknown | Promise<unknown>): Promise<StartupWarmupEntry> {
  const entry: StartupWarmupEntry = {
    name,
    status: "pending",
    startedAt: now()
  };
  try {
    await work();
    entry.status = "fulfilled";
  } catch (error: any) {
    entry.status = "rejected";
    entry.error = error?.message ? String(error.message) : String(error);
  } finally {
    entry.finishedAt = now();
    entry.durationMs = entry.finishedAt - entry.startedAt;
  }
  return entry;
}

export class StartupWarmupService {
  static start(): Promise<StartupWarmupReport> {
    if (warmupPromise) return warmupPromise;

    const startedAt = now();
    latestReport = { startedAt, entries: [] };

    const tasks = [
      runEntry("settings", () => SettingsManager.getSettings()),
      runEntry("reference-registry", () => ReferenceRegistryService.getSnapshot()),
      runEntry("skills", () => SkillRegistry.getSkills()),
      runEntry("connectors", () => ConnectorRegistry.getConnectors())
    ];

    warmupPromise = Promise.all(tasks).then((entries) => {
      const finishedAt = now();
      latestReport = {
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        entries
      };
      return latestReport;
    });

    return warmupPromise;
  }

  static async wait(): Promise<StartupWarmupReport> {
    return warmupPromise || this.start();
  }

  static getLatestReport(): StartupWarmupReport | null {
    return latestReport;
  }

  static resetForTests(): void {
    warmupPromise = null;
    latestReport = null;
  }
}

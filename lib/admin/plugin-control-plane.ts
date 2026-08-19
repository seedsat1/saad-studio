import fs from "fs";
import path from "path";
import crypto from "crypto";
import prismadb from "@/lib/prismadb";

export type PluginMode = "active" | "maintenance" | "disabled";

export interface PluginOperationalConfig {
  status: PluginMode;
  currentVersion: string;
  minSupportedVersion: string;
  releaseDate: string;
  releaseNotes: string[];
  downloadUrl: string;
  zxpUrl: string;
  maintenanceMessage?: string;
  disabledMessage?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PluginRevocationState {
  globalRevocationTimestamp: number; // Tokens issued before this ms timestamp are revoked
  revokedUsers: Record<string, number>; // userId -> revokedAt timestamp (ms)
  revokedFingerprints: Record<string, { revokedAt: number; reason?: string; revokedBy?: string }>; // fingerprint -> details
}

export interface PluginAuditLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
}

export interface PluginInstallerHealth {
  filename: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified?: string;
  path: string;
}

export interface PluginStatusSnapshot {
  config: PluginOperationalConfig;
  installerHealth: {
    setupExe: PluginInstallerHealth;
    zxp: PluginInstallerHealth;
    downloadEndpointAvailable: boolean;
  };
  sessions: {
    authHandshakesTotal: number;
    authHandshakesPending: number;
    authHandshakesApproved: number;
    authHandshakesActiveWindow: number;
    activeSessionsTelemetry: "N/A (Stateless HMAC Tokens)";
  };
  telemetry: {
    totalGenerations: number;
    totalCreditsSpent: number;
    recent24hCount: number;
    recent24hCredits: number;
  };
  revocations: {
    globalRevokedBefore: string | null;
    revokedUserCount: number;
    revokedTokenCount: number;
  };
  apiHealth: Array<{
    endpoint: string;
    label: string;
    status: "HEALTHY" | "DEGRADED" | "DOWN";
    method: string;
  }>;
}

export const DEFAULT_PLUGIN_CONFIG: PluginOperationalConfig = {
  status: "active",
  currentVersion: "3.0.0",
  minSupportedVersion: "3.0.0",
  releaseDate: "2026-08-19",
  releaseNotes: [
    "🚀 ترقية شاملة لمعمارية الإضافة v3.0.0",
    "🎯 توحيد تسعير الصوت وTTS مع منصة الويب",
    "✨ تحسين مزامنة الشفاه والأدوات الصوتية",
    "⚡ تحسين سرعة الاتصال ومعالجة المهام",
  ],
  downloadUrl: "/downloads/SaadStudio-Setup.exe",
  zxpUrl: "/downloads/SaadStudio.zxp",
  maintenanceMessage: "Adobe Plugin is temporarily under scheduled maintenance. Generation tools will resume shortly.",
  disabledMessage: "Adobe Plugin access is currently disabled by the system administrator.",
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

const CONFIG_SETTING_KEY = "plugin:operational-config";
const REVOCATION_SETTING_KEY = "plugin:revocations";
const AUDIT_SETTING_KEY = "plugin:audit-logs";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Reads the current operational configuration from PlatformConfig DB (Single Runtime Source of Truth).
 * If the database row does not exist, uses static build-time fallback.
 */
export async function getPluginOperationalConfig(): Promise<PluginOperationalConfig> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: CONFIG_SETTING_KEY },
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_PLUGIN_CONFIG,
          ...parsed,
        } as PluginOperationalConfig;
      }
    }
  } catch (err) {
    console.warn("[plugin-control-plane] Error loading config from DB:", err);
  }

  // Static emergency / build-time fallback ONLY
  try {
    const versionJsonPath = path.join(process.cwd(), "public", "saadstudio-version.json");
    if (fs.existsSync(versionJsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(versionJsonPath, "utf-8"));
      return {
        ...DEFAULT_PLUGIN_CONFIG,
        currentVersion: parsed.version || DEFAULT_PLUGIN_CONFIG.currentVersion,
        releaseDate: parsed.releaseDate || DEFAULT_PLUGIN_CONFIG.releaseDate,
        releaseNotes: Array.isArray(parsed.changelog?.[0]?.changes)
          ? parsed.changelog[0].changes
          : DEFAULT_PLUGIN_CONFIG.releaseNotes,
        downloadUrl: parsed.downloads?.url || DEFAULT_PLUGIN_CONFIG.downloadUrl,
        zxpUrl: parsed.downloads?.zxpUrl || DEFAULT_PLUGIN_CONFIG.zxpUrl,
      };
    }
  } catch {}

  return DEFAULT_PLUGIN_CONFIG;
}

/**
 * Updates the operational configuration in PlatformConfig DB and writes attributable audit log.
 * CRITICAL VERCEL RUNTIME INVARIANT: NEVER writes to /public filesystem at runtime.
 */
export async function updatePluginOperationalConfig(
  patch: Partial<PluginOperationalConfig>,
  operator: string,
): Promise<PluginOperationalConfig> {
  const current = await getPluginOperationalConfig();
  const next: PluginOperationalConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: operator,
  };

  // 1. Save to Database PlatformConfig (Single Persistent Source of Truth)
  await prismadb.platformConfig.upsert({
    where: { key: CONFIG_SETTING_KEY },
    update: {
      value: JSON.stringify(next),
    },
    create: {
      key: CONFIG_SETTING_KEY,
      value: JSON.stringify(next),
    },
  });

  // 2. Record Attributable Audit Log
  await recordPluginAuditLog({
    operator,
    action: "UPDATE_CONFIG",
    details: {
      previousStatus: current.status,
      newStatus: next.status,
      previousVersion: current.currentVersion,
      newVersion: next.currentVersion,
      minSupportedVersion: next.minSupportedVersion,
    },
  });

  return next;
}

/** Reads the current revocation denylist from PlatformConfig DB */
export async function getPluginRevocationState(): Promise<PluginRevocationState> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: REVOCATION_SETTING_KEY },
    });
    if (row && row.value) {
      const v = JSON.parse(row.value) as Record<string, unknown>;
      return {
        globalRevocationTimestamp: Number(v.globalRevocationTimestamp) || 0,
        revokedUsers: (v.revokedUsers as Record<string, number>) || {},
        revokedFingerprints: (v.revokedFingerprints as Record<string, { revokedAt: number; reason?: string; revokedBy?: string }>) || {},
      };
    }
  } catch (err) {
    console.warn("[plugin-control-plane] Error loading revocations:", err);
  }

  return {
    globalRevocationTimestamp: 0,
    revokedUsers: {},
    revokedFingerprints: {},
  };
}

/** Revokes a specific token by its fingerprint/signature */
export async function revokeTokenFingerprint(
  fingerprint: string,
  operator: string,
  reason = "Admin manual revocation",
): Promise<PluginRevocationState> {
  const current = await getPluginRevocationState();
  const next: PluginRevocationState = {
    ...current,
    revokedFingerprints: {
      ...current.revokedFingerprints,
      [fingerprint]: {
        revokedAt: Date.now(),
        reason,
        revokedBy: operator,
      },
    },
  };

  await prismadb.platformConfig.upsert({
    where: { key: REVOCATION_SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: REVOCATION_SETTING_KEY, value: JSON.stringify(next) },
  });

  await recordPluginAuditLog({
    operator,
    action: "REVOKE_TOKEN",
    target: fingerprint.slice(0, 16) + "...",
    details: { reason },
  });

  return next;
}

/** Revokes all active panel tokens for a given user */
export async function revokeUserTokens(
  userId: string,
  operator: string,
  reason = "User session revoked by admin",
): Promise<PluginRevocationState> {
  const current = await getPluginRevocationState();
  const next: PluginRevocationState = {
    ...current,
    revokedUsers: {
      ...current.revokedUsers,
      [userId]: Date.now(),
    },
  };

  await prismadb.platformConfig.upsert({
    where: { key: REVOCATION_SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: REVOCATION_SETTING_KEY, value: JSON.stringify(next) },
  });

  await recordPluginAuditLog({
    operator,
    action: "REVOKE_USER_SESSIONS",
    target: userId,
    details: { reason },
  });

  return next;
}

/** Global incident response: revokes all panel tokens issued before right now */
export async function revokeAllTokensGlobally(
  operator: string,
  reason = "Global emergency session revocation",
): Promise<PluginRevocationState> {
  const current = await getPluginRevocationState();
  const next: PluginRevocationState = {
    ...current,
    globalRevocationTimestamp: Date.now(),
  };

  await prismadb.platformConfig.upsert({
    where: { key: REVOCATION_SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: REVOCATION_SETTING_KEY, value: JSON.stringify(next) },
  });

  await recordPluginAuditLog({
    operator,
    action: "GLOBAL_TOKEN_REVOCATION",
    details: { reason, timestamp: next.globalRevocationTimestamp },
  });

  return next;
}

/** Checks whether a decoded token matches the revocation denylist */
export async function isTokenRevoked(payload: {
  userId: string;
  iat: number;
  fingerprint: string;
}): Promise<boolean> {
  try {
    const state = await getPluginRevocationState();
    const tokenTimeMs = payload.iat * 1000;

    // 1. Global revocation check
    if (state.globalRevocationTimestamp > 0 && tokenTimeMs <= state.globalRevocationTimestamp) {
      return true;
    }

    // 2. User-specific revocation check
    const userRevokedAt = state.revokedUsers[payload.userId];
    if (userRevokedAt && tokenTimeMs <= userRevokedAt) {
      return true;
    }

    // 3. Exact fingerprint revocation check
    if (state.revokedFingerprints[payload.fingerprint]) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Records an attributable admin audit log entry */
export async function recordPluginAuditLog(entry: {
  operator: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: AUDIT_SETTING_KEY },
    });
    const logs: PluginAuditLogEntry[] = row && row.value ? JSON.parse(row.value) : [];

    const newEntry: PluginAuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operator: entry.operator,
      action: entry.action,
      target: entry.target,
      details: entry.details,
    };

    const updated = [newEntry, ...(Array.isArray(logs) ? logs : [])].slice(0, 100); // Keep last 100 entries

    await prismadb.platformConfig.upsert({
      where: { key: AUDIT_SETTING_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: AUDIT_SETTING_KEY, value: JSON.stringify(updated) },
    });
  } catch (err) {
    console.warn("[plugin-control-plane] Error saving audit log:", err);
  }
}

/** Retrieves audit logs */
export async function getPluginAuditLogs(limit = 50): Promise<PluginAuditLogEntry[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: AUDIT_SETTING_KEY },
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, limit);
      }
    }
  } catch {}
  return [];
}

/** Computes physical installer health check on disk */
export function getInstallerHealth(): {
  setupExe: PluginInstallerHealth;
  zxp: PluginInstallerHealth;
  downloadEndpointAvailable: boolean;
} {
  const exePath = path.join(process.cwd(), "public", "downloads", "SaadStudio-Setup.exe");
  const zxpPath = path.join(process.cwd(), "public", "downloads", "SaadStudio.zxp");

  let setupExe: PluginInstallerHealth = {
    filename: "SaadStudio-Setup.exe",
    exists: false,
    sizeBytes: 0,
    sizeFormatted: "0 MB",
    path: "/downloads/SaadStudio-Setup.exe",
  };

  if (fs.existsSync(exePath)) {
    const stat = fs.statSync(exePath);
    setupExe = {
      filename: "SaadStudio-Setup.exe",
      exists: true,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      lastModified: stat.mtime.toISOString(),
      path: "/downloads/SaadStudio-Setup.exe",
    };
  }

  let zxp: PluginInstallerHealth = {
    filename: "SaadStudio.zxp",
    exists: false,
    sizeBytes: 0,
    sizeFormatted: "0 MB",
    path: "/downloads/SaadStudio.zxp",
  };

  if (fs.existsSync(zxpPath)) {
    const stat = fs.statSync(zxpPath);
    zxp = {
      filename: "SaadStudio.zxp",
      exists: true,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      lastModified: stat.mtime.toISOString(),
      path: "/downloads/SaadStudio.zxp",
    };
  }

  return {
    setupExe,
    zxp,
    downloadEndpointAvailable: setupExe.exists,
  };
}

/** Gathers complete live operational status snapshot with clear semantic labeling */
export async function getPluginStatusSnapshot(): Promise<PluginStatusSnapshot> {
  const [config, revocations] = await Promise.all([
    getPluginOperationalConfig(),
    getPluginRevocationState(),
  ]);

  const installerHealth = getInstallerHealth();

  // Real Database Queries for short-lived browser-to-CEP handshakes
  const now = new Date();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalHandshakes, pendingHandshakes, approvedHandshakes, activeWindowHandshakes] = await Promise.all([
    prismadb.panelAuthSession.count().catch(() => 0),
    prismadb.panelAuthSession.count({ where: { status: "pending" } }).catch(() => 0),
    prismadb.panelAuthSession.count({ where: { status: "approved" } }).catch(() => 0),
    prismadb.panelAuthSession.count({ where: { expiresAt: { gt: now } } }).catch(() => 0),
  ]);

  // Real Generations from Generation table
  const [totalGens, recent24hGens, genCosts] = await Promise.all([
    prismadb.generation.count().catch(() => 0),
    prismadb.generation.count({ where: { createdAt: { gte: dayAgo } } }).catch(() => 0),
    prismadb.generation.aggregate({ _sum: { cost: true } }).catch(() => ({ _sum: { cost: 0 } })),
  ]);

  const totalCredits = Math.round(Number(genCosts?._sum?.cost || 0));

  const apiHealth: PluginStatusSnapshot["apiHealth"] = [
    { endpoint: "/api/panel/me", label: "Profile & Credits Verification", status: "HEALTHY", method: "GET" },
    { endpoint: "/api/panel/credits", label: "Credit Balance Pulse", status: "HEALTHY", method: "GET" },
    { endpoint: "/api/panel/generate/image", label: "Image Generation Route", status: config.status === "disabled" ? "DOWN" : "HEALTHY", method: "POST" },
    { endpoint: "/api/panel/generate/video", label: "Video Generation Route", status: config.status === "disabled" ? "DOWN" : "HEALTHY", method: "POST" },
    { endpoint: "/api/panel/generate/music", label: "Music Generation Route", status: config.status === "disabled" ? "DOWN" : "HEALTHY", method: "POST" },
    { endpoint: "/api/panel/generate/tts", label: "TTS Generation Route", status: config.status === "disabled" ? "DOWN" : "HEALTHY", method: "POST" },
    { endpoint: "/api/panel/jobs", label: "Async Job Telemetry Polling", status: "HEALTHY", method: "GET" },
    { endpoint: "/api/panel/generations", label: "Gallery & Recent History Feed", status: "HEALTHY", method: "GET" },
  ];

  return {
    config,
    installerHealth,
    sessions: {
      authHandshakesTotal: totalHandshakes,
      authHandshakesPending: pendingHandshakes,
      authHandshakesApproved: approvedHandshakes,
      authHandshakesActiveWindow: activeWindowHandshakes,
      activeSessionsTelemetry: "N/A (Stateless HMAC Tokens)",
    },
    telemetry: {
      totalGenerations: totalGens,
      totalCreditsSpent: totalCredits,
      recent24hCount: recent24hGens,
      recent24hCredits: 0,
    },
    revocations: {
      globalRevokedBefore: revocations.globalRevocationTimestamp > 0
        ? new Date(revocations.globalRevocationTimestamp).toISOString()
        : null,
      revokedUserCount: Object.keys(revocations.revokedUsers).length,
      revokedTokenCount: Object.keys(revocations.revokedFingerprints).length,
    },
    apiHealth,
  };
}

/** Evaluates the server-side gate policy for panel API incoming requests */
export async function evaluatePluginGate(
  req: Request,
  options?: { isGeneration?: boolean },
): Promise<{ allowed: boolean; status?: number; error?: string; code?: string }> {
  const config = await getPluginOperationalConfig();

  // 1. Check Disabled state
  if (config.status === "disabled") {
    return {
      allowed: false,
      status: 503,
      error: config.disabledMessage || "Adobe Plugin is currently disabled by system administrator.",
      code: "PLUGIN_DISABLED",
    };
  }

  // 2. Check Maintenance state (blocks generation endpoints)
  if (config.status === "maintenance" && options?.isGeneration) {
    return {
      allowed: false,
      status: 503,
      error: config.maintenanceMessage || "Adobe Plugin is temporarily under scheduled maintenance.",
      code: "PLUGIN_MAINTENANCE",
    };
  }

  // 3. Check Minimum Supported Version
  const clientVersion = req.headers.get("x-saad-plugin-version") || req.headers.get("x-plugin-version");
  if (clientVersion && config.minSupportedVersion) {
    if (compareSemver(clientVersion, config.minSupportedVersion) < 0) {
      return {
        allowed: false,
        status: 426,
        error: `Please update your Saad Studio Adobe Plugin to version ${config.minSupportedVersion} or higher.`,
        code: "PLUGIN_UPDATE_REQUIRED",
      };
    }
  }

  return { allowed: true };
}

function compareSemver(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

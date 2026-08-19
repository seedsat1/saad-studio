import prismadb from "@/lib/prismadb";
import type { ModelRoutingOverride, RouteTarget, RoutingDiagnostics } from "@/lib/model-routing-registry";

const ROUTING_OVERRIDES_KEY = "model_routing_overrides";
const ROUTING_DIAGNOSTICS_KEY = "model_routing_diagnostics";
const ROUTING_AUDIT_LOG_KEY = "model_routing_audit_log";

type RoutingOverrideStore = Record<string, ModelRoutingOverride>;
type RoutingDiagnosticsStore = Record<string, RoutingDiagnostics>;

export type RoutingAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  modelId: string;
  action: "save_override" | "reset_override";
  oldRoute: RouteTarget | null;
  newRoute: RouteTarget | null;
  oldProvider: string | null;
  newProvider: string | null;
};

export class RoutingConcurrencyError extends Error {
  constructor(message = "Routing configuration was modified by another administrator. Please refresh.") {
    super(message);
    this.name = "RoutingConcurrencyError";
  }
}

export type RoutingConfigReadResult<T> = {
  data: Record<string, T>;
  source: "persisted" | "default";
  databaseAvailable: boolean;
  updatedAt?: string | null;
  error?: string;
};

function parseJsonRecord<T>(value: string | null | undefined): Record<string, T> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatReadError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown database read error";
}

async function readConfigRecord<T>(key: string): Promise<RoutingConfigReadResult<T>> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key } });
    return {
      data: parseJsonRecord<T>(row?.value),
      source: row?.value ? "persisted" : "default",
      databaseAvailable: true,
      updatedAt: row?.updatedAt?.toISOString() || null,
    };
  } catch (error) {
    console.error(`[routing-config] Could not read ${key}:`, error);
    return {
      data: {},
      source: "default",
      databaseAvailable: false,
      updatedAt: null,
      error: formatReadError(error),
    };
  }
}

async function writeConfigRecord<T>(key: string, value: Record<string, T>): Promise<void> {
  await prismadb.platformConfig.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
}

export async function appendRoutingAuditLog(event: RoutingAuditEvent): Promise<void> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: ROUTING_AUDIT_LOG_KEY } });
    const existing = parseJsonArray<RoutingAuditEvent>(row?.value);
    const updated = [event, ...existing].slice(0, 100); // Keep last 100 events

    await prismadb.platformConfig.upsert({
      where: { key: ROUTING_AUDIT_LOG_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: ROUTING_AUDIT_LOG_KEY, value: JSON.stringify(updated) },
    });
  } catch (err) {
    console.error("[routing-config] Failed to append routing audit log:", err);
  }
}

export async function loadRoutingAuditLog(): Promise<RoutingAuditEvent[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: ROUTING_AUDIT_LOG_KEY } });
    return parseJsonArray<RoutingAuditEvent>(row?.value);
  } catch (err) {
    console.error("[routing-config] Failed to load routing audit log:", err);
    return [];
  }
}

export async function loadRoutingOverridesResult(): Promise<RoutingConfigReadResult<ModelRoutingOverride>> {
  return readConfigRecord<ModelRoutingOverride>(ROUTING_OVERRIDES_KEY);
}

export async function loadRoutingOverrides(): Promise<RoutingOverrideStore> {
  const result = await loadRoutingOverridesResult();
  return result.data;
}

export async function getRoutingOverride(modelId: string): Promise<ModelRoutingOverride | undefined> {
  const overrides = await loadRoutingOverrides();
  return overrides[modelId];
}

export async function saveRoutingOverride(
  modelId: string,
  override: ModelRoutingOverride,
  options?: { expectedUpdatedAt?: string | null; operatorId?: string }
): Promise<ModelRoutingOverride> {
  const row = await prismadb.platformConfig.findUnique({ where: { key: ROUTING_OVERRIDES_KEY } });
  if (options?.expectedUpdatedAt && row?.updatedAt) {
    if (row.updatedAt.toISOString() !== options.expectedUpdatedAt) {
      throw new RoutingConcurrencyError();
    }
  }

  const overrides = parseJsonRecord<ModelRoutingOverride>(row?.value);
  const oldOverride = overrides[modelId] || null;
  overrides[modelId] = override;

  await writeConfigRecord(ROUTING_OVERRIDES_KEY, overrides);

  await appendRoutingAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    operatorId: options?.operatorId || "admin",
    modelId,
    action: "save_override",
    oldRoute: oldOverride?.primaryRoute || null,
    newRoute: override?.primaryRoute || null,
    oldProvider: oldOverride?.primaryRoute?.provider || null,
    newProvider: override?.primaryRoute?.provider || null,
  });

  return override;
}

export async function resetRoutingOverride(
  modelId: string,
  options?: { expectedUpdatedAt?: string | null; operatorId?: string }
): Promise<void> {
  const row = await prismadb.platformConfig.findUnique({ where: { key: ROUTING_OVERRIDES_KEY } });
  if (options?.expectedUpdatedAt && row?.updatedAt) {
    if (row.updatedAt.toISOString() !== options.expectedUpdatedAt) {
      throw new RoutingConcurrencyError();
    }
  }

  const overrides = parseJsonRecord<ModelRoutingOverride>(row?.value);
  const oldOverride = overrides[modelId] || null;
  delete overrides[modelId];

  await writeConfigRecord(ROUTING_OVERRIDES_KEY, overrides);

  await appendRoutingAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    operatorId: options?.operatorId || "admin",
    modelId,
    action: "reset_override",
    oldRoute: oldOverride?.primaryRoute || null,
    newRoute: null,
    oldProvider: oldOverride?.primaryRoute?.provider || null,
    newProvider: null,
  });
}

export async function loadRoutingDiagnosticsResult(): Promise<RoutingConfigReadResult<RoutingDiagnostics>> {
  return readConfigRecord<RoutingDiagnostics>(ROUTING_DIAGNOSTICS_KEY);
}

export async function loadRoutingDiagnostics(): Promise<RoutingDiagnosticsStore> {
  const result = await loadRoutingDiagnosticsResult();
  return result.data;
}

export async function saveRoutingDiagnostics(modelId: string, diagnostics: RoutingDiagnostics): Promise<RoutingDiagnostics> {
  const res = await readConfigRecord<RoutingDiagnostics>(ROUTING_DIAGNOSTICS_KEY);
  const allDiagnostics = res.data;
  allDiagnostics[modelId] = diagnostics;
  await writeConfigRecord(ROUTING_DIAGNOSTICS_KEY, allDiagnostics);
  return diagnostics;
}

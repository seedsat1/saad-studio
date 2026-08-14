import prismadb from "@/lib/prismadb";
import type { ModelRoutingOverride, RoutingDiagnostics } from "@/lib/model-routing-registry";

const ROUTING_OVERRIDES_KEY = "model_routing_overrides";
const ROUTING_DIAGNOSTICS_KEY = "model_routing_diagnostics";

type RoutingOverrideStore = Record<string, ModelRoutingOverride>;
type RoutingDiagnosticsStore = Record<string, RoutingDiagnostics>;

export type RoutingConfigReadResult<T> = {
  data: Record<string, T>;
  source: "persisted" | "default";
  databaseAvailable: boolean;
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
    };
  } catch (error) {
    console.error(`[routing-config] Could not read ${key}:`, error);
    return {
      data: {},
      source: "default",
      databaseAvailable: false,
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

async function readWritableConfigRecord<T>(key: string): Promise<Record<string, T>> {
  const result = await readConfigRecord<T>(key);
  if (!result.databaseAvailable) {
    throw new Error(`Cannot write ${key}: database is unavailable.`);
  }
  return result.data;
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

export async function saveRoutingOverride(modelId: string, override: ModelRoutingOverride): Promise<ModelRoutingOverride> {
  const overrides = await readWritableConfigRecord<ModelRoutingOverride>(ROUTING_OVERRIDES_KEY);
  overrides[modelId] = override;
  await writeConfigRecord(ROUTING_OVERRIDES_KEY, overrides);
  return override;
}

export async function resetRoutingOverride(modelId: string): Promise<void> {
  const overrides = await readWritableConfigRecord<ModelRoutingOverride>(ROUTING_OVERRIDES_KEY);
  delete overrides[modelId];
  await writeConfigRecord(ROUTING_OVERRIDES_KEY, overrides);
}

export async function loadRoutingDiagnosticsResult(): Promise<RoutingConfigReadResult<RoutingDiagnostics>> {
  return readConfigRecord<RoutingDiagnostics>(ROUTING_DIAGNOSTICS_KEY);
}

export async function loadRoutingDiagnostics(): Promise<RoutingDiagnosticsStore> {
  const result = await loadRoutingDiagnosticsResult();
  return result.data;
}

export async function saveRoutingDiagnostics(modelId: string, diagnostics: RoutingDiagnostics): Promise<RoutingDiagnostics> {
  const allDiagnostics = await readWritableConfigRecord<RoutingDiagnostics>(ROUTING_DIAGNOSTICS_KEY);
  allDiagnostics[modelId] = diagnostics;
  await writeConfigRecord(ROUTING_DIAGNOSTICS_KEY, allDiagnostics);
  return diagnostics;
}

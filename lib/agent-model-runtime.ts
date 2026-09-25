import prismadb from "@/lib/prismadb";
import {
  getAgentModel,
  getAgentModels,
  type AgentModelDefinition,
  type AgentRuntimeStatus,
} from "@/lib/agent-model-registry";

const AGENT_MODEL_OVERRIDES_KEY = "agent_model_runtime_overrides_v1";

type AgentModelOverride = {
  enabled?: boolean;
  runtimeStatus?: AgentRuntimeStatus;
  maxCreditsPerRequest?: number;
};

type AgentModelOverrides = Record<string, AgentModelOverride>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOverrides(raw: string | null | undefined): AgentModelOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainRecord(parsed)) return {};
    const out: AgentModelOverrides = {};
    for (const [modelId, override] of Object.entries(parsed)) {
      if (!isPlainRecord(override)) continue;
      const clean: AgentModelOverride = {};
      if (typeof override.enabled === "boolean") clean.enabled = override.enabled;
      if (
        override.runtimeStatus === "ready" ||
        override.runtimeStatus === "disabled" ||
        override.runtimeStatus === "not_configured" ||
        override.runtimeStatus === "pricing_unverified"
      ) {
        clean.runtimeStatus = override.runtimeStatus;
      }
      const maxCredits = Number(override.maxCreditsPerRequest);
      if (Number.isFinite(maxCredits) && maxCredits >= 1) {
        clean.maxCreditsPerRequest = Math.floor(maxCredits);
      }
      if (Object.keys(clean).length > 0) out[modelId] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

async function readOverrides(): Promise<AgentModelOverrides> {
  const row = await prismadb.platformConfig.findUnique({
    where: { key: AGENT_MODEL_OVERRIDES_KEY },
    select: { value: true },
  });
  return parseOverrides(row?.value);
}

function applyOverride(model: AgentModelDefinition, override: AgentModelOverride | undefined): AgentModelDefinition {
  if (!override) return model;
  const next = structuredClone(model);
  if (typeof override.enabled === "boolean") next.enabled = override.enabled;
  if (override.runtimeStatus) next.runtimeStatus = override.runtimeStatus;
      if (override.maxCreditsPerRequest !== undefined && override.maxCreditsPerRequest >= 1) {
    next.maxCreditsPerRequest = Math.floor(override.maxCreditsPerRequest);
  }
  if (!next.enabled && next.runtimeStatus === "ready") next.runtimeStatus = "disabled";
  return next;
}

export async function getRuntimeAgentModels(): Promise<AgentModelDefinition[]> {
  const overrides = await readOverrides();
  return getAgentModels().map((model) => applyOverride(model, overrides[model.id]));
}

export async function getRuntimeAgentModel(id: string): Promise<AgentModelDefinition | null> {
  const base = getAgentModel(id);
  if (!base) return null;
  const overrides = await readOverrides();
  return applyOverride(base, overrides[id]);
}

export async function updateAgentModelOverride(input: {
  id: string;
  enabled?: boolean;
  runtimeStatus?: AgentRuntimeStatus;
  maxCreditsPerRequest?: number;
}): Promise<AgentModelDefinition> {
  const base = getAgentModel(input.id);
  if (!base) throw new Error("Unknown Agent model.");

  const current = await readOverrides();
  const existing = current[input.id] ?? {};
  const next: AgentModelOverride = { ...existing };
  if (typeof input.enabled === "boolean") next.enabled = input.enabled;
  if (input.runtimeStatus) next.runtimeStatus = input.runtimeStatus;
  if (input.maxCreditsPerRequest !== undefined) {
    if (!Number.isFinite(input.maxCreditsPerRequest) || input.maxCreditsPerRequest < 1) {
      throw new Error("maxCreditsPerRequest must be >= 1.");
    }
    next.maxCreditsPerRequest = Math.floor(input.maxCreditsPerRequest);
  }
  current[input.id] = next;

  await prismadb.platformConfig.upsert({
    where: { key: AGENT_MODEL_OVERRIDES_KEY },
    update: { value: JSON.stringify(current) },
    create: { key: AGENT_MODEL_OVERRIDES_KEY, value: JSON.stringify(current) },
  });

  return applyOverride(base, next);
}

export type AgentEntitlement = {
  allowed: boolean;
  reason?: string;
  planId: string | null;
  subscriptionActive: boolean;
};

export function resolveAgentEntitlement(input: {
  model: AgentModelDefinition;
  subscription: { planId: string | null; stripeCurrentPeriodEnd: Date | null } | null;
}): AgentEntitlement {
  const subscriptionActive = Boolean(
    input.subscription?.stripeCurrentPeriodEnd &&
    input.subscription.stripeCurrentPeriodEnd.getTime() > Date.now(),
  );
  const planId = input.subscription?.planId ?? null;

  if (!input.model.enabled || input.model.runtimeStatus !== "ready") {
    return { allowed: false, reason: "model_unavailable", planId, subscriptionActive };
  }
  if (!input.model.manualSelectable) {
    return { allowed: false, reason: "model_not_selectable", planId, subscriptionActive };
  }

  return { allowed: true, planId, subscriptionActive };
}



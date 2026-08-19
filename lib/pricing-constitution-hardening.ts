import prismadb from "@/lib/prismadb";
import { applyPricingFloor, type PricingModel } from "@/lib/pricing-models";
import { invalidatePricingCache } from "@/lib/pricing";

export const PRICING_AUDIT_LOG_KEY = "pricing_constitution_audit_log";

export class PricingConcurrencyError extends Error {
  constructor(message = "Pricing constitution was modified by another administrator. Please refresh.") {
    super(message);
    this.name = "PricingConcurrencyError";
  }
}

export type PricingFieldChange = {
  pricingKey: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type PricingConstitutionAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  action: "save_constitution";
  changedModelsCount: number;
  changes: PricingFieldChange[];
};

export async function getPricingConstitutionVersionToken(): Promise<string> {
  try {
    const latest = await prismadb.pricingConstitution.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return latest?.updatedAt ? String(latest.updatedAt.getTime()) : "0";
  } catch (err) {
    console.error("[getPricingConstitutionVersionToken] error:", err);
    return "0";
  }
}

export function validatePricingConfigurations(models: PricingModel[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(models) || models.length === 0) {
    errors.push("models array must not be empty.");
    return { ok: false, errors };
  }

  for (const m of models) {
    if (!m.id || !m.id.trim()) {
      errors.push("Pricing model contains an empty or invalid id.");
      continue;
    }
    if (typeof m.userCreditsRate === "number" && (Number.isNaN(m.userCreditsRate) || m.userCreditsRate < 0)) {
      errors.push(`Model ${m.id} has an invalid negative or NaN userCreditsRate: ${m.userCreditsRate}`);
    }
    if (typeof m.waveUsd === "number" && (Number.isNaN(m.waveUsd) || m.waveUsd < 0)) {
      errors.push(`Model ${m.id} has an invalid negative or NaN waveUsd: ${m.waveUsd}`);
    }
    if (typeof m.kieCredits === "number" && (Number.isNaN(m.kieCredits) || m.kieCredits < 0)) {
      errors.push(`Model ${m.id} has an invalid negative or NaN kieCredits: ${m.kieCredits}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function computePricingDiffs(oldModels: PricingModel[], newModels: PricingModel[]): PricingFieldChange[] {
  const changes: PricingFieldChange[] = [];
  const oldMap = new Map(oldModels.map((m) => [m.id, m]));

  for (const newM of newModels) {
    const oldM = oldMap.get(newM.id);
    if (!oldM) {
      changes.push({ pricingKey: newM.id, field: "created", oldValue: null, newValue: newM.userCreditsRate });
    } else {
      if (oldM.userCreditsRate !== newM.userCreditsRate) {
        changes.push({ pricingKey: newM.id, field: "userCreditsRate", oldValue: oldM.userCreditsRate, newValue: newM.userCreditsRate });
      }
      if (oldM.isActive !== newM.isActive) {
        changes.push({ pricingKey: newM.id, field: "isActive", oldValue: oldM.isActive, newValue: newM.isActive });
      }
      if (oldM.waveUsd !== newM.waveUsd) {
        changes.push({ pricingKey: newM.id, field: "waveUsd", oldValue: oldM.waveUsd, newValue: newM.waveUsd });
      }
      if (oldM.kieCredits !== newM.kieCredits) {
        changes.push({ pricingKey: newM.id, field: "kieCredits", oldValue: oldM.kieCredits, newValue: newM.kieCredits });
      }
    }
  }

  return changes;
}

export async function appendPricingAuditLog(
  event: PricingConstitutionAuditEvent,
  tx?: any
): Promise<void> {
  const db = tx || prismadb;
  try {
    const row = await db.platformConfig.findUnique({ where: { key: PRICING_AUDIT_LOG_KEY } });
    let existing: PricingConstitutionAuditEvent[] = [];
    if (row?.value) {
      try {
        existing = JSON.parse(row.value);
        if (!Array.isArray(existing)) existing = [];
      } catch {}
    }

    const updated = [event, ...existing].slice(0, 100);
    await db.platformConfig.upsert({
      where: { key: PRICING_AUDIT_LOG_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: PRICING_AUDIT_LOG_KEY, value: JSON.stringify(updated) },
    });
  } catch (err) {
    console.error("[appendPricingAuditLog] error:", err);
  }
}

export async function loadPricingAuditLog(): Promise<PricingConstitutionAuditEvent[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: PRICING_AUDIT_LOG_KEY } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function savePricingConstitutionAtomic(options: {
  models: PricingModel[];
  kiePkgIndex?: number | string | null;
  expectedVersionToken?: string | null;
  operatorId?: string;
}): Promise<{ success: boolean; changesCount: number; versionToken: string }> {
  const currentVersion = await getPricingConstitutionVersionToken();
  if (options.expectedVersionToken && options.expectedVersionToken !== currentVersion) {
    throw new PricingConcurrencyError();
  }

  const validation = validatePricingConfigurations(options.models);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  const sanitizedModels = options.models.map((m) => applyPricingFloor(m));

  // Load existing models to compute accurate diffs
  const oldRows = await prismadb.pricingConstitution.findMany();
  const oldModels: PricingModel[] = oldRows.map((r) => applyPricingFloor(r as PricingModel));
  const changes = computePricingDiffs(oldModels, sanitizedModels);

  await prismadb.$transaction(async (tx) => {
    // 1. Upsert all models
    for (const m of sanitizedModels) {
      await tx.pricingConstitution.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          name: m.name,
          notes: m.notes ?? "",
          type: m.type,
          provider: m.provider,
          billing: m.billing,
          kieCredits: m.kieCredits ?? 0,
          waveUsd: m.waveUsd ?? 0,
          userCreditsRate: m.userCreditsRate ?? 0,
          maxDuration: m.maxDuration ?? null,
          isActive: m.isActive !== false,
        },
        update: {
          name: m.name,
          notes: m.notes ?? "",
          kieCredits: m.kieCredits ?? 0,
          waveUsd: m.waveUsd ?? 0,
          userCreditsRate: m.userCreditsRate ?? 0,
          maxDuration: m.maxDuration ?? null,
          isActive: m.isActive !== false,
        },
      });
    }

    // 2. Save kie_pkg_index if provided
    if (options.kiePkgIndex !== undefined && options.kiePkgIndex !== null) {
      await tx.platformConfig.upsert({
        where: { key: "kie_pkg_index" },
        create: { key: "kie_pkg_index", value: String(options.kiePkgIndex) },
        update: { value: String(options.kiePkgIndex) },
      });
    }

    // 3. Append Audit Event inside transaction
    if (changes.length > 0) {
      await appendPricingAuditLog(
        {
          id: `pricing_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          operatorId: options.operatorId || "admin",
          action: "save_constitution",
          changedModelsCount: changes.length,
          changes,
        },
        tx
      );
    }
  });

  invalidatePricingCache();

  const newVersionToken = await getPricingConstitutionVersionToken();
  return { success: true, changesCount: changes.length, versionToken: newVersionToken };
}

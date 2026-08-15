import { Prisma } from "@prisma/client";

import {
  mapGenerationToUnifiedJob,
  normalizeJobStatus,
  type UnifiedJobStatus,
} from "@/lib/admin/jobs-read-model";
import prismadb from "@/lib/prismadb";

export type HistoryCreditState = "charged" | "free" | "refunded" | "partially_refunded" | "unknown";

export type ProviderUsageHistory = {
  id: string;
  provider: string | null;
  model: string | null;
  requestId: string | null;
  providerCostUsd: number | null;
  providerCostSource: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreditLedgerHistory = {
  charged: number | null;
  refunded: number | null;
  entries: Array<{
    id: string;
    delta: number;
    reason: string;
    createdAt: string | null;
  }>;
};

export type UnifiedGenerationHistoryRow = {
  generationId: string;
  jobId: string | null;
  featureId: string | null;
  userId: string;
  modelId: string | null;
  provider: string | null;
  routingSource: "control_center" | "legacy_fallback" | null;
  providerTaskId: string | null;
  status: UnifiedJobStatus;
  rawStatus: string | null;
  creditState: HistoryCreditState;
  creditsCharged: number | null;
  creditsRefunded: number | null;
  providerEstimatedCost: number | null;
  providerActualCost: number | null;
  createdAt: string | null;
  completedAt: string | null;
  duration: number | null;
  latencyMs: number | null;
  primaryResult: string | null;
  additionalOutputsCount: number | null;
  error: string | null;
  errorCode: string | null;
  providerUsage: ProviderUsageHistory[];
  creditLedger: CreditLedgerHistory;
  observabilityGaps: string[];
};

export type HistoryFilterInput = {
  dateFrom?: string | null;
  dateTo?: string | null;
  featureId?: string | null;
  provider?: string | null;
  modelId?: string | null;
  status?: string | null;
  creditState?: string | null;
  hasError?: string | null;
  hasProviderCost?: string | null;
  query?: string | null;
};

export type HistoryReadModelResult = {
  ok: boolean;
  databaseAvailable: boolean;
  rows: UnifiedGenerationHistoryRow[];
  summary: {
    totalGenerations: number;
    completed: number;
    failed: number;
    processing: number;
    creditsCharged: number | null;
    creditsRefunded: number | null;
    providerUsageRecords: number;
    providerUsageLinked: number;
    providerUsageUnlinked: number;
    rowsWithProviderCost: number;
    rowsMissingProviderUsage: number;
  };
  sources: string[];
  observabilityGaps: string[];
  error?: string;
};

type CreditLedgerEntryRow = {
  id: string;
  userId: string;
  generationId: string | null;
  delta: number;
  reason: string;
  createdAt: Date | string | null;
};

export function mapGenerationToHistoryRow(
  generation: any,
  ledgerEntries: CreditLedgerEntryRow[] = [],
): UnifiedGenerationHistoryRow {
  const job = mapGenerationToUnifiedJob(generation);
  const providerUsage = (Array.isArray(generation.providerUsageRecords) ? generation.providerUsageRecords : [])
    .map(mapProviderUsageHistory);
  const snapshot = generation.generationRequestSnapshot ?? null;
  const requestPayload = asRecord(snapshot?.requestPayload);
  const routing = asRecord(requestPayload?.routing);
  const completedAt = inferCompletedAt(generation, providerUsage, job.status);
  const createdAt = iso(generation.createdAt);
  const ledger = summarizeCreditLedger(ledgerEntries);
  const creditsCharged = ledger.charged ?? toNumber(snapshot?.userCreditsCharged) ?? toNumber(generation.cost);
  const creditsRefunded = ledger.refunded;
  const providerEstimatedCost = toNumber(snapshot?.estimatedProviderCostUsd);
  const actualUsageCost = firstActualProviderCost(providerUsage);
  const directActualCost = generation.providerCostSource === "actual" ? toNumber(generation.providerCostUsd) : null;
  const estimatedFallback = generation.providerCostSource === "estimated" ? toNumber(generation.providerCostUsd) : null;
  const error = job.error ?? nullableString(requestPayload?.error) ?? nullableString(requestPayload?.errorMessage);
  const row: UnifiedGenerationHistoryRow = {
    generationId: generation.id,
    jobId: job.providerTaskId ? job.jobId : null,
    featureId: job.featureId,
    userId: String(generation.userId),
    modelId: nullableString(snapshot?.model) ?? nullableString(generation.modelUsed),
    provider: job.provider,
    routingSource: job.routingSource ?? routingSourceFrom(routing?.routingSource),
    providerTaskId: job.providerTaskId,
    status: job.status,
    rawStatus: job.rawStatus,
    creditState: inferCreditState(creditsCharged, creditsRefunded, generation.cost),
    creditsCharged,
    creditsRefunded,
    providerEstimatedCost: providerEstimatedCost ?? estimatedFallback,
    providerActualCost: actualUsageCost ?? directActualCost,
    createdAt,
    completedAt,
    duration: toNumber(generation.duration) ?? toNumber(snapshot?.duration),
    latencyMs: createdAt && completedAt ? Math.max(0, Date.parse(completedAt) - Date.parse(createdAt)) : null,
    primaryResult: job.result,
    additionalOutputsCount: inferAdditionalOutputsCount(requestPayload),
    error,
    errorCode: nullableString(requestPayload?.errorCode) ?? errorCodeFromError(error),
    providerUsage,
    creditLedger: ledger,
    observabilityGaps: [],
  };

  return { ...row, observabilityGaps: detectHistoryGaps(row) };
}

export function summarizeCreditLedger(entries: CreditLedgerEntryRow[]): CreditLedgerHistory {
  const charged = entries
    .filter((entry) => entry.reason === "generation_charge" && entry.delta < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);
  const refunded = entries
    .filter((entry) => entry.reason.startsWith("generation_refund") && entry.delta > 0)
    .reduce((sum, entry) => sum + entry.delta, 0);

  return {
    charged: entries.some((entry) => entry.reason === "generation_charge") ? charged : null,
    refunded: entries.some((entry) => entry.reason.startsWith("generation_refund")) ? refunded : null,
    entries: entries.map((entry) => ({
      id: entry.id,
      delta: entry.delta,
      reason: entry.reason,
      createdAt: iso(entry.createdAt),
    })),
  };
}

export function summarizeHistoryRows(
  rows: UnifiedGenerationHistoryRow[],
  providerUsageTotals: { total: number; linked: number; unlinked: number },
) {
  return {
    totalGenerations: rows.length,
    completed: rows.filter((row) => row.status === "completed").length,
    failed: rows.filter((row) => row.status === "failed").length,
    processing: rows.filter((row) => row.status === "processing").length,
    creditsCharged: sumKnown(rows.map((row) => row.creditsCharged)),
    creditsRefunded: sumKnown(rows.map((row) => row.creditsRefunded)),
    providerUsageRecords: providerUsageTotals.total,
    providerUsageLinked: providerUsageTotals.linked,
    providerUsageUnlinked: providerUsageTotals.unlinked,
    rowsWithProviderCost: rows.filter((row) => row.providerActualCost !== null || row.providerEstimatedCost !== null).length,
    rowsMissingProviderUsage: rows.filter((row) => row.creditsCharged !== null && row.creditsCharged > 0 && row.providerUsage.length === 0).length,
  };
}

export async function loadUnifiedHistory(filters: HistoryFilterInput = {}, limit = 100): Promise<HistoryReadModelResult> {
  const take = Math.max(1, Math.min(Math.floor(limit || 100), 250));

  try {
    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: {
        providerUsageRecords: {
          orderBy: { createdAt: "desc" },
        },
        generationRequestSnapshot: true,
      },
    });

    const generationIds = generations.map((generation) => generation.id);
    const [ledgerEntries, providerUsageTotals] = await Promise.all([
      loadCreditLedgerEntries(generationIds),
      loadProviderUsageTotals(),
    ]);
    const ledgerByGeneration = groupLedgerByGeneration(ledgerEntries);
    const rows = generations
      .map((generation) => mapGenerationToHistoryRow(generation, ledgerByGeneration.get(generation.id) ?? []))
      .filter((row) => matchesHistoryFilters(row, filters));

    return {
      ok: true,
      databaseAvailable: true,
      rows,
      summary: summarizeHistoryRows(rows, providerUsageTotals),
      sources: [
        "Generation",
        "GenerationRequestSnapshot",
        "ProviderUsageRecord",
        "CreditLedgerEntry (optional raw read)",
        "Unified Jobs Read Model mapping",
      ],
      observabilityGaps: getGlobalObservabilityGaps(rows, ledgerEntries),
    };
  } catch (error) {
    return {
      ok: false,
      databaseAvailable: false,
      rows: [],
      summary: summarizeHistoryRows([], { total: 0, linked: 0, unlinked: 0 }),
      sources: [],
      observabilityGaps: ["Database unavailable; history read model could not load persisted rows."],
      error: error instanceof Error ? error.message : "Unable to load history.",
    };
  }
}

async function loadCreditLedgerEntries(generationIds: string[]): Promise<CreditLedgerEntryRow[]> {
  if (!generationIds.length) return [];
  try {
    return await prismadb.$queryRaw<CreditLedgerEntryRow[]>(Prisma.sql`
      SELECT "id", "userId", "generationId", "delta", "reason", "createdAt"
      FROM "CreditLedgerEntry"
      WHERE "generationId" IN (${Prisma.join(generationIds)})
      ORDER BY "createdAt" DESC
    `);
  } catch {
    return [];
  }
}

async function loadProviderUsageTotals() {
  const [total, linked, unlinked] = await Promise.all([
    prismadb.providerUsageRecord.count(),
    prismadb.providerUsageRecord.count({ where: { generationId: { not: null } } }),
    prismadb.providerUsageRecord.count({ where: { generationId: null } }),
  ]);
  return { total, linked, unlinked };
}

function groupLedgerByGeneration(entries: CreditLedgerEntryRow[]) {
  const grouped = new Map<string, CreditLedgerEntryRow[]>();
  for (const entry of entries) {
    if (!entry.generationId) continue;
    const current = grouped.get(entry.generationId) ?? [];
    current.push(entry);
    grouped.set(entry.generationId, current);
  }
  return grouped;
}

function mapProviderUsageHistory(value: any): ProviderUsageHistory {
  return {
    id: String(value.id),
    provider: nullableString(value.providerName),
    model: nullableString(value.providerModel),
    requestId: nullableString(value.providerRequestId),
    providerCostUsd: toNumber(value.providerCostUsd),
    providerCostSource: nullableString(value.providerCostSource),
    status: nullableString(value.status),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
  };
}

function inferCompletedAt(generation: any, providerUsage: ProviderUsageHistory[], status: UnifiedJobStatus): string | null {
  if (status !== "completed" && status !== "failed" && status !== "cancelled") return null;
  const terminalUsage = providerUsage.find((usage) => {
    const normalized = normalizeJobStatus(usage.status);
    return normalized === status;
  });
  return terminalUsage?.updatedAt ?? null;
}

function inferCreditState(charged: number | null, refunded: number | null, generationCost: unknown): HistoryCreditState {
  const cost = toNumber(generationCost);
  if ((charged === null || charged <= 0) && (!cost || cost <= 0)) return "free";
  if (charged === null && refunded === null) return "unknown";
  if (refunded !== null && charged !== null && refunded >= charged) return "refunded";
  if (refunded !== null && refunded > 0) return "partially_refunded";
  return "charged";
}

function inferAdditionalOutputsCount(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  for (const key of ["additionalOutputs", "additionalUrls", "extraOutputs", "outputUrls"]) {
    const value = payload[key];
    if (Array.isArray(value)) return Math.max(0, value.length - 1);
  }
  return null;
}

function firstActualProviderCost(usages: ProviderUsageHistory[]): number | null {
  const actual = usages.find((usage) => usage.providerCostSource === "actual" && usage.providerCostUsd !== null);
  return actual?.providerCostUsd ?? null;
}

function detectHistoryGaps(row: UnifiedGenerationHistoryRow): string[] {
  const gaps: string[] = [];
  if (row.creditsCharged !== null && row.creditsCharged > 0 && row.providerUsage.length === 0) {
    gaps.push("ProviderUsageRecord missing for a paid generation.");
  }
  if (row.status === "failed" && row.creditsRefunded === null) {
    gaps.push("Refund state cannot be proven without CreditLedgerEntry data.");
  }
  if (row.error === null && row.status === "failed") {
    gaps.push("Failure is persisted, but no structured error message is stored.");
  }
  if (row.additionalOutputsCount === null) {
    gaps.push("Additional output count is not explicitly linked to the primary generation row.");
  }
  if (row.providerActualCost === null) {
    gaps.push("Actual provider cost is unknown.");
  }
  return gaps;
}

function getGlobalObservabilityGaps(rows: UnifiedGenerationHistoryRow[], ledgerEntries: CreditLedgerEntryRow[]): string[] {
  const gaps = new Set<string>();
  if (!ledgerEntries.length) {
    gaps.add("CreditLedgerEntry is optional/raw-read only; refunds cannot be proven for loaded rows when the table is absent or empty.");
  }
  if (rows.some((row) => row.observabilityGaps.includes("Additional output count is not explicitly linked to the primary generation row."))) {
    gaps.add("Multiple/additional outputs are not consistently linked back to a primary generation id.");
  }
  if (rows.some((row) => row.error === null && row.status === "failed")) {
    gaps.add("Some failed generations do not have a structured persisted error.");
  }
  if (rows.some((row) => row.providerActualCost === null)) {
    gaps.add("Actual provider cost is not available for every ProviderUsageRecord.");
  }
  return Array.from(gaps);
}

function matchesHistoryFilters(row: UnifiedGenerationHistoryRow, filters: HistoryFilterInput): boolean {
  if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
  if (filters.featureId && filters.featureId !== "all" && (row.featureId ?? "unknown") !== filters.featureId) return false;
  if (filters.creditState && filters.creditState !== "all" && row.creditState !== filters.creditState) return false;
  if (filters.provider && filters.provider !== "all" && !contains(row.provider, filters.provider)) return false;
  if (filters.modelId && filters.modelId !== "all" && !contains(row.modelId, filters.modelId)) return false;
  if (filters.hasError === "yes" && !row.error) return false;
  if (filters.hasError === "no" && row.error) return false;
  if (filters.hasProviderCost === "yes" && row.providerActualCost === null && row.providerEstimatedCost === null) return false;
  if (filters.hasProviderCost === "no" && (row.providerActualCost !== null || row.providerEstimatedCost !== null)) return false;
  if (filters.dateFrom && row.createdAt && Date.parse(row.createdAt) < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && row.createdAt && Date.parse(row.createdAt) > Date.parse(filters.dateTo)) return false;
  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystack = [
      row.generationId,
      row.jobId,
      row.featureId,
      row.userId,
      row.modelId,
      row.provider,
      row.providerTaskId,
      row.status,
      row.error,
      row.routingSource,
    ].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!known.length) return null;
  return known.reduce((sum, value) => sum + value, 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return new Date(value).toISOString();
  return null;
}

function routingSourceFrom(value: unknown): UnifiedGenerationHistoryRow["routingSource"] {
  return value === "control_center" || value === "legacy_fallback" ? value : null;
}

function errorCodeFromError(error: string | null): string | null {
  if (!error) return null;
  const match = error.match(/\b([A-Z][A-Z0-9_]{3,}|[a-z][a-z0-9_]{3,})\b/);
  return match?.[1] ?? null;
}

function contains(value: string | null, query: string): boolean {
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}

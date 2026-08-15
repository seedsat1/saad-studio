import { Prisma } from "@prisma/client";

import {
  JOB_SOURCE_TYPES,
  mapCinemaJobToUnifiedJob,
  mapGenerationToUnifiedJob,
  mapReapJobToUnifiedJob,
  mapTransitionJobToUnifiedJob,
  mapVariationJobToUnifiedJob,
  type JobSourceType,
  type UnifiedJobStatus,
  type UnifiedJobView,
} from "@/lib/admin/jobs-read-model";
import {
  mapGenerationToHistoryRow,
  type UnifiedGenerationHistoryRow,
} from "@/lib/admin/history-read-model";
import { APPROVED_PRODUCT_FEATURE_IDS } from "@/lib/product/feature-registry";
import prismadb from "@/lib/prismadb";

export type AnalyticsFilterInput = {
  dateFrom?: string | null;
  dateTo?: string | null;
  provider?: string | null;
  modelId?: string | null;
  featureId?: string | null;
  status?: string | null;
};

export type AnalyticsBucket = {
  key: string;
  total: number;
  completed: number;
  failed: number;
  processing: number;
  successRate: number | null;
  failureRate: number | null;
  averageLatencyMs: number | null;
};

export type ProviderUsageAnalytics = {
  total: number;
  linked: number;
  unlinked: number;
  linkCoverage: number | null;
  missingRequestIdentifiers: number;
  missingActualCost: number;
  missingEstimatedCost: number;
  byProvider: UsageBucket[];
  byModel: UsageBucket[];
  byStatus: Array<{ key: string; total: number }>;
};

export type UsageBucket = {
  key: string;
  total: number;
  linked: number;
  unlinked: number;
  withActualCost: number;
  withEstimatedCost: number;
  missingActualCost: number;
  missingEstimatedCost: number;
  missingRequestIdentifiers: number;
};

export type CreditsAnalytics = {
  totalCreditsCharged: number | null;
  totalCreditsRefunded: number | null;
  netCredits: number | null;
  freeGenerations: number;
  refundCoverageWarning: string | null;
};

export type CostCoverageAnalytics = {
  rowsWithActualCost: number;
  rowsWithEstimatedCostOnly: number;
  rowsWithNoCost: number;
  actualProviderCostTotal: number | null;
  estimatedProviderCostTotal: number | null;
  actualCostCoverage: number | null;
  estimatedCostCoverage: number | null;
  financialAnalyticsTrustworthy: false;
  warnings: string[];
};

export type DataQualityCoverage = {
  generationRows: number;
  providerUsageRows: number;
  linkedUsage: number;
  unlinkedUsage: number;
  providerUsageLinkCoverage: number | null;
  actualCostCoverage: number | null;
  estimatedCostCoverage: number | null;
  featureMappingCoverage: number | null;
  errorDataCoverage: number | null;
  rowsMissingProviderUsage: number;
  rowsMissingFeatureId: number;
};

export type AnalyticsReadModelResult = {
  ok: boolean;
  databaseAvailable: boolean;
  sources: string[];
  filters: AnalyticsFilterInput;
  overview: {
    totalGenerations: number;
    completed: number;
    failed: number;
    processing: number;
    successRate: number | null;
    failureRate: number | null;
    averageCompletionLatencyMs: number | null;
  };
  performance: {
    averageCompletionLatencyMs: number | null;
    queuedTooLong: number;
    processingTooLong: number;
    stuckJobs: number;
  };
  providers: AnalyticsBucket[];
  models: AnalyticsBucket[];
  features: AnalyticsBucket[];
  unknownFeatureCount: number;
  jobs: {
    total: number;
    byStatus: Record<UnifiedJobStatus, number>;
    bySource: Record<JobSourceType, number>;
    diagnostics: number;
  };
  usage: ProviderUsageAnalytics;
  credits: CreditsAnalytics;
  costCoverage: CostCoverageAnalytics;
  dataQuality: DataQualityCoverage;
  partialMetrics: string[];
  refusedMetrics: string[];
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

const MAX_ANALYTICS_ROWS = 5000;
const STATUS_KEYS: UnifiedJobStatus[] = ["queued", "processing", "completed", "failed", "cancelled"];

export async function loadUnifiedAnalytics(
  filters: AnalyticsFilterInput = {},
  limit = MAX_ANALYTICS_ROWS,
): Promise<AnalyticsReadModelResult> {
  const take = Math.max(1, Math.min(Math.floor(limit || MAX_ANALYTICS_ROWS), MAX_ANALYTICS_ROWS));
  const now = new Date();

  try {
    const [generations, transitions, variations, reaps, cinemas, providerUsageRows] = await Promise.all([
      prismadb.generation.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: {
          providerUsageRecords: {
            orderBy: { createdAt: "desc" },
          },
          generationRequestSnapshot: true,
        },
      }),
      prismadb.transitionJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: { output: true },
      }),
      prismadb.variationJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: {
          outputs: {
            orderBy: { createdAt: "asc" },
            take: 4,
          },
        },
      }),
      prismadb.reapJob.findMany({ orderBy: { createdAt: "desc" }, take }),
      prismadb.cinemaJob.findMany({ orderBy: { createdAt: "desc" }, take }),
      prismadb.providerUsageRecord.findMany({
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    const ledgerEntries = await loadCreditLedgerEntries(generations.map((generation) => generation.id));
    const ledgerByGeneration = groupLedgerByGeneration(ledgerEntries);
    const historyRows = generations
      .map((generation) => mapGenerationToHistoryRow(generation, ledgerByGeneration.get(generation.id) ?? []))
      .filter((row) => matchesAnalyticsFilters(row, filters));
    const jobs = [
      ...generations.map((row) => mapGenerationToUnifiedJob(row, now)),
      ...transitions.map((row) => mapTransitionJobToUnifiedJob(row, now)),
      ...variations.map((row) => mapVariationJobToUnifiedJob(row, now)),
      ...reaps.map((row) => mapReapJobToUnifiedJob(row, now)),
      ...cinemas.map((row) => mapCinemaJobToUnifiedJob(row, now)),
    ].filter((job) => matchesJobAnalyticsFilters(job, filters));
    const usage = providerUsageRows.map(mapProviderUsageAnalyticsRow).filter((row) => matchesUsageFilters(row, filters));

    return buildAnalyticsResult(historyRows, jobs, usage, filters);
  } catch (error) {
    return {
      ok: false,
      databaseAvailable: false,
      sources: [],
      filters,
      overview: emptyOverview(),
      performance: { averageCompletionLatencyMs: null, queuedTooLong: 0, processingTooLong: 0, stuckJobs: 0 },
      providers: [],
      models: [],
      features: [],
      unknownFeatureCount: 0,
      jobs: emptyJobsSummary(),
      usage: emptyUsageAnalytics(),
      credits: { totalCreditsCharged: null, totalCreditsRefunded: null, netCredits: null, freeGenerations: 0, refundCoverageWarning: null },
      costCoverage: emptyCostCoverage(),
      dataQuality: emptyDataQuality(),
      partialMetrics: ["All analytics are unavailable while the database cannot be read."],
      refusedMetrics: ["Financial profit/margin/revenue metrics are not computed."],
      error: error instanceof Error ? error.message : "Unable to load analytics.",
    };
  }
}

export function buildAnalyticsResult(
  historyRows: UnifiedGenerationHistoryRow[],
  jobs: UnifiedJobView[],
  usageRows: ProviderUsageRow[],
  filters: AnalyticsFilterInput = {},
): AnalyticsReadModelResult {
  const overview = buildOverview(historyRows);
  const usage = buildProviderUsageAnalytics(usageRows);
  const costCoverage = buildCostCoverage(historyRows);
  const credits = buildCreditsAnalytics(historyRows);

  return {
    ok: true,
    databaseAvailable: true,
    sources: [
      "Generation",
      "Unified Jobs Read Model",
      "History Read Model",
      "ProviderUsageRecord",
      "Product Feature Registry metadata",
      "CreditLedgerEntry (optional raw read)",
    ],
    filters,
    overview,
    performance: {
      averageCompletionLatencyMs: overview.averageCompletionLatencyMs,
      queuedTooLong: countDiagnostics(jobs, "queued_too_long"),
      processingTooLong: countDiagnostics(jobs, "processing_too_long"),
      stuckJobs: jobs.filter((job) => job.diagnostics.length > 0).length,
    },
    providers: bucketHistory(historyRows, (row) => row.provider ?? "unknown"),
    models: bucketHistory(historyRows, (row) => row.modelId ?? "unknown"),
    features: bucketHistory(historyRows.filter((row) => isApprovedFeatureId(row.featureId)), (row) => row.featureId ?? "unknown"),
    unknownFeatureCount: historyRows.filter((row) => !isApprovedFeatureId(row.featureId)).length,
    jobs: {
      total: jobs.length,
      byStatus: countJobsByStatus(jobs),
      bySource: countJobsBySource(jobs),
      diagnostics: jobs.reduce((sum, job) => sum + job.diagnostics.length, 0),
    },
    usage,
    credits,
    costCoverage,
    dataQuality: buildDataQuality(historyRows, usageRows, costCoverage),
    partialMetrics: buildPartialMetrics(historyRows, usageRows),
    refusedMetrics: [
      "Total Profit is not computed because actual provider cost coverage is incomplete.",
      "True Margin is not computed because estimated costs and missing costs cannot be treated as actual cost.",
      "Net Revenue is not computed in this phase; credits are operational usage units, not verified revenue.",
    ],
  };
}

export type ProviderUsageRow = {
  id: string;
  generationId: string | null;
  provider: string | null;
  model: string | null;
  requestId: string | null;
  status: string | null;
  providerCostUsd: number | null;
  providerCostSource: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function buildOverview(rows: UnifiedGenerationHistoryRow[]) {
  const total = rows.length;
  const completed = rows.filter((row) => row.status === "completed").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const processing = rows.filter((row) => row.status === "processing").length;

  return {
    totalGenerations: total,
    completed,
    failed,
    processing,
    successRate: percentage(completed, completed + failed),
    failureRate: percentage(failed, completed + failed),
    averageCompletionLatencyMs: average(rows.map((row) => row.latencyMs)),
  };
}

function bucketHistory(
  rows: UnifiedGenerationHistoryRow[],
  keyFor: (row: UnifiedGenerationHistoryRow) => string,
): AnalyticsBucket[] {
  const groups = new Map<string, UnifiedGenerationHistoryRow[]>();
  for (const row of rows) {
    const key = keyFor(row) || "unknown";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.entries())
    .map(([key, group]) => {
      const completed = group.filter((row) => row.status === "completed").length;
      const failed = group.filter((row) => row.status === "failed").length;
      return {
        key,
        total: group.length,
        completed,
        failed,
        processing: group.filter((row) => row.status === "processing").length,
        successRate: percentage(completed, completed + failed),
        failureRate: percentage(failed, completed + failed),
        averageLatencyMs: average(group.map((row) => row.latencyMs)),
      };
    })
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function buildProviderUsageAnalytics(rows: ProviderUsageRow[]): ProviderUsageAnalytics {
  const linked = rows.filter((row) => Boolean(row.generationId)).length;
  const unlinked = rows.length - linked;
  return {
    total: rows.length,
    linked,
    unlinked,
    linkCoverage: percentage(linked, rows.length),
    missingRequestIdentifiers: rows.filter((row) => !row.requestId).length,
    missingActualCost: rows.filter((row) => row.providerCostSource !== "actual" || row.providerCostUsd === null).length,
    missingEstimatedCost: rows.filter((row) => row.providerCostSource !== "estimated" || row.providerCostUsd === null).length,
    byProvider: bucketUsage(rows, (row) => row.provider ?? "unknown"),
    byModel: bucketUsage(rows, (row) => row.model ?? "unknown"),
    byStatus: simpleBucket(rows, (row) => row.status ?? "unknown"),
  };
}

function bucketUsage(rows: ProviderUsageRow[], keyFor: (row: ProviderUsageRow) => string): UsageBucket[] {
  const groups = new Map<string, ProviderUsageRow[]>();
  for (const row of rows) {
    const key = keyFor(row) || "unknown";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      total: group.length,
      linked: group.filter((row) => Boolean(row.generationId)).length,
      unlinked: group.filter((row) => !row.generationId).length,
      withActualCost: group.filter((row) => row.providerCostSource === "actual" && row.providerCostUsd !== null).length,
      withEstimatedCost: group.filter((row) => row.providerCostSource === "estimated" && row.providerCostUsd !== null).length,
      missingActualCost: group.filter((row) => row.providerCostSource !== "actual" || row.providerCostUsd === null).length,
      missingEstimatedCost: group.filter((row) => row.providerCostSource !== "estimated" || row.providerCostUsd === null).length,
      missingRequestIdentifiers: group.filter((row) => !row.requestId).length,
    }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function buildCreditsAnalytics(rows: UnifiedGenerationHistoryRow[]): CreditsAnalytics {
  const charged = sumKnown(rows.map((row) => row.creditsCharged));
  const refunded = sumKnown(rows.map((row) => row.creditsRefunded));
  const refundUnknownFailures = rows.filter((row) => row.status === "failed" && row.creditsRefunded === null).length;
  return {
    totalCreditsCharged: charged,
    totalCreditsRefunded: refunded,
    netCredits: charged !== null && refunded !== null ? charged - refunded : null,
    freeGenerations: rows.filter((row) => row.creditState === "free").length,
    refundCoverageWarning: refundUnknownFailures
      ? `${refundUnknownFailures} failed generation rows do not have explicit refund proof.`
      : null,
  };
}

function buildCostCoverage(rows: UnifiedGenerationHistoryRow[]): CostCoverageAnalytics {
  const rowsWithActualCost = rows.filter((row) => row.providerActualCost !== null).length;
  const rowsWithEstimatedCostOnly = rows.filter((row) => row.providerActualCost === null && row.providerEstimatedCost !== null).length;
  const rowsWithNoCost = rows.length - rowsWithActualCost - rowsWithEstimatedCostOnly;
  return {
    rowsWithActualCost,
    rowsWithEstimatedCostOnly,
    rowsWithNoCost,
    actualProviderCostTotal: sumKnown(rows.map((row) => row.providerActualCost)),
    estimatedProviderCostTotal: sumKnown(
      rows
        .filter((row) => row.providerActualCost === null)
        .map((row) => row.providerEstimatedCost),
    ),
    actualCostCoverage: percentage(rowsWithActualCost, rows.length),
    estimatedCostCoverage: percentage(rowsWithEstimatedCostOnly, rows.length),
    financialAnalyticsTrustworthy: false,
    warnings: [
      "Actual and estimated provider costs are intentionally separated.",
      "Profit, true margin, and net revenue are not computed while cost coverage is incomplete.",
    ],
  };
}

function buildDataQuality(
  historyRows: UnifiedGenerationHistoryRow[],
  usageRows: ProviderUsageRow[],
  costCoverage: CostCoverageAnalytics,
): DataQualityCoverage {
  const linkedUsage = usageRows.filter((row) => Boolean(row.generationId)).length;
  const failedRows = historyRows.filter((row) => row.status === "failed");
  return {
    generationRows: historyRows.length,
    providerUsageRows: usageRows.length,
    linkedUsage,
    unlinkedUsage: usageRows.length - linkedUsage,
    providerUsageLinkCoverage: percentage(linkedUsage, usageRows.length),
    actualCostCoverage: costCoverage.actualCostCoverage,
    estimatedCostCoverage: costCoverage.estimatedCostCoverage,
    featureMappingCoverage: percentage(historyRows.filter((row) => isApprovedFeatureId(row.featureId)).length, historyRows.length),
    errorDataCoverage: percentage(failedRows.filter((row) => Boolean(row.error)).length, failedRows.length),
    rowsMissingProviderUsage: historyRows.filter((row) => row.creditsCharged !== null && row.creditsCharged > 0 && row.providerUsage.length === 0).length,
    rowsMissingFeatureId: historyRows.filter((row) => !isApprovedFeatureId(row.featureId)).length,
  };
}

function buildPartialMetrics(historyRows: UnifiedGenerationHistoryRow[], usageRows: ProviderUsageRow[]): string[] {
  const partial: string[] = [];
  if (historyRows.some((row) => row.latencyMs === null)) {
    partial.push("Average latency is partial because some rows do not have a proven completion timestamp.");
  }
  if (historyRows.some((row) => !isApprovedFeatureId(row.featureId))) {
    partial.push("Feature analytics are partial because featureId is not proven for every generation row.");
  }
  if (usageRows.some((row) => !row.generationId)) {
    partial.push("Provider usage analytics are partial because some ProviderUsageRecord rows are unlinked.");
  }
  if (historyRows.some((row) => row.creditsRefunded === null && row.status === "failed")) {
    partial.push("Refund analytics are partial where explicit CreditLedgerEntry refund proof is missing.");
  }
  if (historyRows.some((row) => row.providerActualCost === null)) {
    partial.push("Financial cost analytics are partial because actual provider cost is missing for some rows.");
  }
  return partial;
}

function matchesAnalyticsFilters(row: UnifiedGenerationHistoryRow, filters: AnalyticsFilterInput): boolean {
  if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
  if (filters.provider && filters.provider !== "all" && !contains(row.provider, filters.provider)) return false;
  if (filters.modelId && filters.modelId !== "all" && !contains(row.modelId, filters.modelId)) return false;
  if (filters.featureId && filters.featureId !== "all" && (row.featureId ?? "unknown") !== filters.featureId) return false;
  if (filters.dateFrom && row.createdAt && Date.parse(row.createdAt) < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && row.createdAt && Date.parse(row.createdAt) > Date.parse(filters.dateTo)) return false;
  return true;
}

function matchesJobAnalyticsFilters(job: UnifiedJobView, filters: AnalyticsFilterInput): boolean {
  if (filters.status && filters.status !== "all" && job.status !== filters.status) return false;
  if (filters.provider && filters.provider !== "all" && !contains(job.provider, filters.provider)) return false;
  if (filters.modelId && filters.modelId !== "all" && !contains(job.modelId, filters.modelId)) return false;
  if (filters.featureId && filters.featureId !== "all" && (job.featureId ?? "unknown") !== filters.featureId) return false;
  if (filters.dateFrom && job.createdAt && Date.parse(job.createdAt) < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && job.createdAt && Date.parse(job.createdAt) > Date.parse(filters.dateTo)) return false;
  return true;
}

function matchesUsageFilters(row: ProviderUsageRow, filters: AnalyticsFilterInput): boolean {
  if (filters.status && filters.status !== "all" && !contains(row.status, filters.status)) return false;
  if (filters.provider && filters.provider !== "all" && !contains(row.provider, filters.provider)) return false;
  if (filters.modelId && filters.modelId !== "all" && !contains(row.model, filters.modelId)) return false;
  if (filters.dateFrom && row.createdAt && Date.parse(row.createdAt) < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && row.createdAt && Date.parse(row.createdAt) > Date.parse(filters.dateTo)) return false;
  return true;
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

function groupLedgerByGeneration(entries: CreditLedgerEntryRow[]) {
  const grouped = new Map<string, CreditLedgerEntryRow[]>();
  for (const entry of entries) {
    if (!entry.generationId) continue;
    grouped.set(entry.generationId, [...(grouped.get(entry.generationId) ?? []), entry]);
  }
  return grouped;
}

function mapProviderUsageAnalyticsRow(value: any): ProviderUsageRow {
  return {
    id: String(value.id),
    generationId: nullableString(value.generationId),
    provider: nullableString(value.providerName),
    model: nullableString(value.providerModel),
    requestId: nullableString(value.providerRequestId),
    status: nullableString(value.status),
    providerCostUsd: toNumber(value.providerCostUsd),
    providerCostSource: nullableString(value.providerCostSource),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
  };
}

function countDiagnostics(jobs: UnifiedJobView[], code: string): number {
  return jobs.filter((job) => job.diagnostics.some((diagnostic) => diagnostic.code === code)).length;
}

function countJobsByStatus(jobs: UnifiedJobView[]): Record<UnifiedJobStatus, number> {
  const result = Object.fromEntries(STATUS_KEYS.map((status) => [status, 0])) as Record<UnifiedJobStatus, number>;
  for (const job of jobs) result[job.status] += 1;
  return result;
}

function countJobsBySource(jobs: UnifiedJobView[]): Record<JobSourceType, number> {
  const result = Object.fromEntries(JOB_SOURCE_TYPES.map((source) => [source, 0])) as Record<JobSourceType, number>;
  for (const job of jobs) result[job.sourceType] += 1;
  return result;
}

function simpleBucket<T>(items: T[], keyFor: (item: T) => string): Array<{ key: string; total: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFor(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function percentage(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function average(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!known.length) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!known.length) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) * 1000000) / 1000000;
}

function emptyOverview() {
  return {
    totalGenerations: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    successRate: null,
    failureRate: null,
    averageCompletionLatencyMs: null,
  };
}

function emptyJobsSummary() {
  return {
    total: 0,
    byStatus: countJobsByStatus([]),
    bySource: countJobsBySource([]),
    diagnostics: 0,
  };
}

function emptyUsageAnalytics(): ProviderUsageAnalytics {
  return {
    total: 0,
    linked: 0,
    unlinked: 0,
    linkCoverage: null,
    missingRequestIdentifiers: 0,
    missingActualCost: 0,
    missingEstimatedCost: 0,
    byProvider: [],
    byModel: [],
    byStatus: [],
  };
}

function emptyCostCoverage(): CostCoverageAnalytics {
  return {
    rowsWithActualCost: 0,
    rowsWithEstimatedCostOnly: 0,
    rowsWithNoCost: 0,
    actualProviderCostTotal: null,
    estimatedProviderCostTotal: null,
    actualCostCoverage: null,
    estimatedCostCoverage: null,
    financialAnalyticsTrustworthy: false,
    warnings: [],
  };
}

function emptyDataQuality(): DataQualityCoverage {
  return {
    generationRows: 0,
    providerUsageRows: 0,
    linkedUsage: 0,
    unlinkedUsage: 0,
    providerUsageLinkCoverage: null,
    actualCostCoverage: null,
    estimatedCostCoverage: null,
    featureMappingCoverage: null,
    errorDataCoverage: null,
    rowsMissingProviderUsage: 0,
    rowsMissingFeatureId: 0,
  };
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

function contains(value: string | null, query: string): boolean {
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}

function isApprovedFeatureId(value: string | null): boolean {
  return Boolean(value && APPROVED_PRODUCT_FEATURE_IDS.includes(value));
}

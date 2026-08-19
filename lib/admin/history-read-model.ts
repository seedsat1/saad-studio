import { Prisma } from "@prisma/client";

import {
  mapGenerationToUnifiedJob,
  normalizeJobStatus,
  type UnifiedJobStatus,
} from "@/lib/admin/jobs-read-model";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl } from "@/lib/storage";
import { resolveOfficialProvider } from "@/lib/routing/checkpoint-matrix-builder";

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
  toolName: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  modelId: string | null;
  officialProvider: string;
  provider: string | null;
  providerModel: string | null;
  providerRequestId: string | null;
  routingSource: "control_center" | "legacy_fallback" | null;
  providerTaskId: string | null;
  status: UnifiedJobStatus;
  rawStatus: string | null;
  creditState: HistoryCreditState;
  creditsCharged: number | null;
  creditsRefunded: number | null;
  providerEstimatedCost: number | null;
  providerActualCost: number | null;
  providerCostSource: string | null;
  createdAt: string | null;
  completedAt: string | null;
  duration: number | null;
  resolution: string | null;
  aspectRatio: string | null;
  quality: string | null;
  latencyMs: number | null;
  prompt: string | null;
  mediaUrl: string | null;
  outputUrl: string | null;
  resolvedUrl: string | null;
  posterUrl: string | null;
  assetType: string | null;
  modality: "image" | "video" | "audio" | "3d";
  primaryResult: string | null;
  additionalOutputsCount: number | null;
  isFlagged: boolean;
  isFavorite: boolean;
  error: string | null;
  errorCode: string | null;
  providerUsage: ProviderUsageHistory[];
  creditLedger: CreditLedgerHistory;
  observabilityGaps: string[];
};

export type HistoryFilterInput = {
  page?: number | string | null;
  pageSize?: number | string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  featureId?: string | null;
  provider?: string | null;
  modelId?: string | null;
  modality?: string | null;
  status?: string | null;
  creditState?: string | null;
  hasError?: string | null;
  hasProviderCost?: string | null;
  userEmail?: string | null;
  query?: string | null;
};

export type HistoryReadModelResult = {
  ok: boolean;
  databaseAvailable: boolean;
  rows: UnifiedGenerationHistoryRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    totalGenerations: number;
    completed: number;
    failed: number;
    processing: number;
    creditsCharged: number | null;
    creditsRefunded: number | null;
    totalProviderCostUsd: number | null;
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

export function resolveHumanToolName(assetType?: string | null, featureId?: string | null, generationType?: string | null): string {
  const token = `${assetType || ""} ${featureId || ""} ${generationType || ""}`.toLowerCase();
  if (token.includes("relight")) return "AI Relighting";
  if (token.includes("makeup")) return "Beauty & Makeup";
  if (token.includes("storyboard")) return "Storyboard Creator";
  if (token.includes("transition")) return "Video Transition";
  if (token.includes("dubbing")) return "AI Dubbing";
  if (token.includes("captions")) return "Auto Captions";
  if (token.includes("reframe")) return "Video Reframe";
  if (token.includes("inpaint") || token.includes("erase")) return "Inpainting";
  if (token.includes("outpaint") || token.includes("expand")) return "Outpainting";
  if (token.includes("upscale")) return "AI Upscaler";
  if (token.includes("extend")) return "Video Extend";
  if (token.includes("image-to-video") || token.includes("i2v")) return "Image to Video";
  if (token.includes("text-to-video") || token.includes("t2v")) return "Text to Video";
  if (token.includes("video")) return "Video Generation";
  if (token.includes("image")) return "Image Generation";
  if (token.includes("audio") || token.includes("voice")) return "Audio Generation";
  if (token.includes("3d")) return "3D Generator";
  if (featureId && featureId !== "unknown") {
    return featureId
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "AI Generation";
}

export function inferModality(assetType?: string | null, modelId?: string | null): "image" | "video" | "audio" | "3d" {
  const token = `${assetType || ""} ${modelId || ""}`.toLowerCase();
  if (token.includes("video") || token.includes("transition") || token.includes("veo") || token.includes("seedance") || token.includes("sora") || token.includes("kling") || token.includes("hailuo") || token.includes("minimax")) return "video";
  if (token.includes("audio") || token.includes("dubbing") || token.includes("voice") || token.includes("speech") || token.includes("elevenlabs")) return "audio";
  if (token.includes("3d") || token.includes("mesh")) return "3d";
  return "image";
}

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

  const rawUrl = generation.outputUrl || generation.mediaUrl;
  let resolvedUrl: string | null = null;
  if (rawUrl && typeof rawUrl === "string" && !rawUrl.startsWith("failed:") && !rawUrl.startsWith("error:") && !rawUrl.startsWith("task:")) {
    try {
      resolvedUrl = normalizeMediaUrl(rawUrl);
    } catch {
      resolvedUrl = rawUrl;
    }
  }

  const modelId = nullableString(snapshot?.model) ?? nullableString(generation.modelUsed);
  const officialProvider = resolveOfficialProvider(modelId || "").name;
  const modality = inferModality(generation.assetType, modelId);
  const toolName = resolveHumanToolName(generation.assetType, job.featureId, snapshot?.generationType);

  const row: UnifiedGenerationHistoryRow = {
    generationId: generation.id,
    jobId: job.providerTaskId ? job.jobId : null,
    featureId: job.featureId,
    toolName,
    userId: String(generation.userId),
    userEmail: generation.user?.email || null,
    userName: generation.user?.name || null,
    modelId,
    officialProvider,
    provider: generation.providerName || job.provider,
    providerModel: generation.providerModel || null,
    providerRequestId: generation.providerRequestId || null,
    routingSource: job.routingSource ?? routingSourceFrom(routing?.routingSource),
    providerTaskId: job.providerTaskId,
    status: job.status,
    rawStatus: job.rawStatus,
    creditState: inferCreditState(creditsCharged, creditsRefunded, generation.cost),
    creditsCharged,
    creditsRefunded,
    providerEstimatedCost: providerEstimatedCost ?? estimatedFallback,
    providerActualCost: actualUsageCost ?? directActualCost,
    providerCostSource: generation.providerCostSource || null,
    createdAt,
    completedAt,
    duration: toNumber(generation.duration) ?? toNumber(snapshot?.duration),
    resolution: generation.resolution || snapshot?.resolution || null,
    aspectRatio: generation.aspectRatio || snapshot?.aspectRatio || (modality === "video" ? "16:9" : "1:1"),
    quality: generation.quality || snapshot?.quality || null,
    latencyMs: createdAt && completedAt ? Math.max(0, Date.parse(completedAt) - Date.parse(createdAt)) : null,
    prompt: generation.prompt || null,
    mediaUrl: generation.mediaUrl || null,
    outputUrl: generation.outputUrl || null,
    resolvedUrl,
    posterUrl: generation.posterUrl || null,
    assetType: generation.assetType || null,
    modality,
    primaryResult: job.result,
    additionalOutputsCount: inferAdditionalOutputsCount(requestPayload),
    isFlagged: Boolean(generation.isFlagged),
    isFavorite: Boolean(generation.isFavorite),
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
  totalCount = 0,
) {
  const totalCost = rows.reduce((sum, r) => sum + (r.providerActualCost ?? r.providerEstimatedCost ?? 0), 0);

  return {
    totalGenerations: totalCount || rows.length,
    completed: rows.filter((row) => row.status === "completed").length,
    failed: rows.filter((row) => row.status === "failed").length,
    processing: rows.filter((row) => row.status === "processing").length,
    creditsCharged: sumKnown(rows.map((row) => row.creditsCharged)),
    creditsRefunded: sumKnown(rows.map((row) => row.creditsRefunded)),
    totalProviderCostUsd: totalCost > 0 ? parseFloat(totalCost.toFixed(4)) : null,
    providerUsageRecords: providerUsageTotals.total,
    providerUsageLinked: providerUsageTotals.linked,
    providerUsageUnlinked: providerUsageTotals.unlinked,
    rowsWithProviderCost: rows.filter((row) => row.providerActualCost !== null || row.providerEstimatedCost !== null).length,
    rowsMissingProviderUsage: rows.filter((row) => row.creditsCharged !== null && row.creditsCharged > 0 && row.providerUsage.length === 0).length,
  };
}

export async function loadUnifiedHistory(filters: HistoryFilterInput = {}, limit = 50): Promise<HistoryReadModelResult> {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Math.min(Number(filters.pageSize) || limit || 50, 100));
  const skip = (page - 1) * pageSize;

  const where: Prisma.GenerationWhereInput = {};

  if (filters.query?.trim()) {
    const q = filters.query.trim();
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { prompt: { contains: q, mode: "insensitive" } },
      { modelUsed: { contains: q, mode: "insensitive" } },
      { assetType: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (filters.userEmail?.trim()) {
    where.user = { email: { contains: filters.userEmail.trim(), mode: "insensitive" } };
  }

  if (filters.status && filters.status !== "all") {
    where.status = { equals: filters.status, mode: "insensitive" };
  }

  if (filters.modelId && filters.modelId !== "all") {
    where.modelUsed = { contains: filters.modelId, mode: "insensitive" };
  }

  if (filters.provider && filters.provider !== "all") {
    where.providerName = { equals: filters.provider, mode: "insensitive" };
  }

  if (filters.modality && filters.modality !== "all") {
    where.assetType = { contains: filters.modality, mode: "insensitive" };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  try {
    const [totalCount, generations] = await Promise.all([
      prismadb.generation.count({ where }),
      prismadb.generation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          providerUsageRecords: {
            orderBy: { createdAt: "desc" },
          },
          generationRequestSnapshot: {
            select: {
              id: true,
              model: true,
              generationType: true,
              duration: true,
              resolution: true,
              aspectRatio: true,
              quality: true,
              userCreditsCharged: true,
              estimatedProviderCostUsd: true,
            },
          },
        },
      }),
    ]);

    const generationIds = generations.map((generation) => generation.id);
    const [ledgerEntries, providerUsageTotals] = await Promise.all([
      loadCreditLedgerEntries(generationIds),
      loadProviderUsageTotals(),
    ]);
    const ledgerByGeneration = groupLedgerByGeneration(ledgerEntries);
    const rows = generations.map((generation) => mapGenerationToHistoryRow(generation, ledgerByGeneration.get(generation.id) ?? []));

    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = page < totalPages;

    return {
      ok: true,
      databaseAvailable: true,
      rows,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasMore,
      },
      summary: summarizeHistoryRows(rows, providerUsageTotals, totalCount),
      sources: [
        "Generation (Paginated)",
        "GenerationRequestSnapshot (Metadata)",
        "ProviderUsageRecord",
        "CreditLedgerEntry",
        "User relation (email/name)",
      ],
      observabilityGaps: getGlobalObservabilityGaps(rows, ledgerEntries),
    };
  } catch (error) {
    return {
      ok: false,
      databaseAvailable: false,
      rows: [],
      pagination: { page: 1, pageSize, total: 0, totalPages: 0, hasMore: false },
      summary: summarizeHistoryRows([], { total: 0, linked: 0, unlinked: 0 }, 0),
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
  for (const row of rows) {
    for (const gap of row.observabilityGaps) {
      gaps.add(gap);
    }
  }
  if (!ledgerEntries.length && rows.some((row) => row.creditsCharged !== null && row.creditsCharged > 0)) {
    gaps.add("CreditLedgerEntry table has zero rows for this query batch; ledger linkage may be inactive.");
  }
  return Array.from(gaps);
}

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((val): val is number => typeof val === "number" && !Number.isNaN(val));
  if (!known.length) return null;
  return known.reduce((sum, val) => sum + val, 0);
}

function routingSourceFrom(value: unknown): "control_center" | "legacy_fallback" | null {
  return value === "control_center" || value === "legacy_fallback" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function errorCodeFromError(error: string | null): string | null {
  if (!error) return null;
  const match = error.match(/\b([A-Z0-9_]{3,30}_(?:ERROR|FAILED|TIMEOUT|REJECTED|LIMIT))\b/i);
  return match?.[1] ? match[1].toUpperCase() : null;
}

import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { APPROVED_PRODUCT_FEATURE_IDS } from "@/lib/product/feature-registry";
import { PROVIDER_REGISTRY } from "@/lib/provider-registry";
import type { JobSourceType, UnifiedJobStatus } from "@/lib/admin/jobs-read-model";

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
  averageLatencyMs: null; // Strictly null: Latency is unproven and removed from analytics
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
    averageCompletionLatencyMs: null; // Strictly null: Latency removed from analytics contract
  };
  performance: {
    averageCompletionLatencyMs: null; // Strictly null
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

function percentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function loadUnifiedAnalytics(
  filters: AnalyticsFilterInput = {},
  _limit?: number,
): Promise<AnalyticsReadModelResult> {
  const now = Date.now();
  const thirtyMinsAgo = new Date(now - 30 * 60 * 1000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

  // Build Prisma where clauses from filters
  const genWhere: Prisma.GenerationWhereInput = {};
  if (filters.status && filters.status !== "all") {
    genWhere.status = filters.status;
  }
  if (filters.modelId && filters.modelId.trim()) {
    genWhere.modelUsed = { contains: filters.modelId.trim(), mode: "insensitive" };
  }
  if (filters.dateFrom || filters.dateTo) {
    genWhere.createdAt = {
      gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
  }

  const usageWhere: Prisma.ProviderUsageRecordWhereInput = {};
  if (filters.provider && filters.provider.trim()) {
    usageWhere.providerName = { contains: filters.provider.trim(), mode: "insensitive" };
  }
  if (filters.modelId && filters.modelId.trim()) {
    usageWhere.providerModel = { contains: filters.modelId.trim(), mode: "insensitive" };
  }
  if (filters.dateFrom || filters.dateTo) {
    usageWhere.createdAt = {
      gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
  }

  try {
    // Execute all database aggregations in parallel (Zero full row loading)
    const [
      genStatusGroups,
      genModelGroups,
      totalGenerations,
      transitionStatusGroups,
      variationStatusGroups,
      reapStatusGroups,
      cinemaStatusGroups,
      genStuckProcessing,
      genQueuedTooLong,
      totalUsage,
      linkedUsage,
      withActualCost,
      withEstimatedCost,
      actualCostAgg,
      chargedCreditsAgg,
      freeGenerationsCount,
      missingUsageCount,
      usageProviderGroups,
      usageModelGroups,
    ] = await Promise.all([
      // 1. Generation Status Breakdown
      prismadb.generation.groupBy({
        by: ["status"],
        where: genWhere,
        _count: { _all: true },
      }),
      // 2. Generation Model Breakdown
      prismadb.generation.groupBy({
        by: ["modelUsed", "status"],
        where: genWhere,
        _count: { _all: true },
      }),
      // 3. Total Generation Count
      prismadb.generation.count({ where: genWhere }),
      // 4. Job Queue Aggregations
      prismadb.transitionJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prismadb.variationJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prismadb.reapJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prismadb.cinemaJob.groupBy({ by: ["status"], _count: { _all: true } }),
      // 5. Diagnostics
      prismadb.generation.count({
        where: {
          ...genWhere,
          status: { in: ["processing", "submitted", "in_progress", "running"] },
          createdAt: { lt: twoHoursAgo },
        },
      }),
      prismadb.generation.count({
        where: {
          ...genWhere,
          status: { in: ["queued", "pending"] },
          createdAt: { lt: thirtyMinsAgo },
        },
      }),
      // 6. ProviderUsage Telemetry
      prismadb.providerUsageRecord.count({ where: usageWhere }),
      prismadb.providerUsageRecord.count({
        where: { ...usageWhere, generationId: { not: null } },
      }),
      prismadb.generation.count({
        where: { ...genWhere, providerCostUsd: { not: null } },
      }),
      prismadb.generation.count({
        where: { ...genWhere, providerCostSource: "estimated" },
      }),
      prismadb.generation.aggregate({
        where: genWhere,
        _sum: { providerCostUsd: true },
      }),
      // 7. Credits
      prismadb.generation.aggregate({
        where: genWhere,
        _sum: { cost: true },
      }),
      prismadb.generation.count({
        where: { ...genWhere, cost: 0 },
      }),
      prismadb.generation.count({
        where: {
          ...genWhere,
          cost: { gt: 0 },
          providerUsageRecords: { none: {} },
        },
      }),
      // 8. Usage Groups
      prismadb.providerUsageRecord.groupBy({
        by: ["providerName"],
        where: usageWhere,
        _count: { _all: true },
      }),
      prismadb.providerUsageRecord.groupBy({
        by: ["providerModel"],
        where: usageWhere,
        _count: { _all: true },
      }),
    ]);

    // Parse Overview counts
    const genCounts: Record<string, number> = {};
    for (const group of genStatusGroups) {
      if (group.status) genCounts[group.status.toLowerCase()] = group._count._all;
    }
    const completed = genCounts["completed"] ?? genCounts["succeeded"] ?? 0;
    const failed = genCounts["failed"] ?? genCounts["error"] ?? 0;
    const processing =
      (genCounts["processing"] ?? 0) +
      (genCounts["submitted"] ?? 0) +
      (genCounts["in_progress"] ?? 0) +
      (genCounts["running"] ?? 0);
    const successRate = percentage(completed, completed + failed);
    const failureRate = percentage(failed, completed + failed);

    // Parse Model Buckets
    const modelBucketsMap = new Map<string, { total: number; completed: number; failed: number; processing: number }>();
    for (const group of genModelGroups) {
      const modelKey = group.modelUsed || "unknown";
      const bucket = modelBucketsMap.get(modelKey) ?? { total: 0, completed: 0, failed: 0, processing: 0 };
      const count = group._count._all;
      const st = (group.status || "").toLowerCase();
      bucket.total += count;
      if (st === "completed" || st === "succeeded") bucket.completed += count;
      else if (st === "failed" || st === "error") bucket.failed += count;
      else if (["processing", "submitted", "in_progress", "running"].includes(st)) bucket.processing += count;
      modelBucketsMap.set(modelKey, bucket);
    }
    const modelBuckets: AnalyticsBucket[] = Array.from(modelBucketsMap.entries())
      .map(([key, b]) => ({
        key,
        total: b.total,
        completed: b.completed,
        failed: b.failed,
        processing: b.processing,
        successRate: percentage(b.completed, b.completed + b.failed),
        failureRate: percentage(b.failed, b.completed + b.failed),
        averageLatencyMs: null,
      }))
      .sort((a, b) => b.total - a.total);

    // Parse Provider Buckets from Usage Groups and Registry mapping
    const providerBucketsMap = new Map<string, { total: number; completed: number; failed: number; processing: number }>();
    for (const group of usageProviderGroups) {
      const provKey = group.providerName || "unknown";
      const bucket = providerBucketsMap.get(provKey) ?? { total: 0, completed: 0, failed: 0, processing: 0 };
      bucket.total += group._count._all;
      providerBucketsMap.set(provKey, bucket);
    }
    const providerBuckets: AnalyticsBucket[] = Array.from(providerBucketsMap.entries())
      .map(([key, b]) => ({
        key,
        total: b.total,
        completed: b.completed,
        failed: b.failed,
        processing: b.processing,
        successRate: percentage(b.completed, b.completed + b.failed),
        failureRate: percentage(b.failed, b.completed + b.failed),
        averageLatencyMs: null,
      }))
      .sort((a, b) => b.total - a.total);

    // Parse Job Queues
    const sumGroup = (groups: Array<{ status: string | null; _count: { _all: number } }>, targetStatuses: string[]) =>
      groups
        .filter((g) => g.status && targetStatuses.includes(g.status.toLowerCase()))
        .reduce((sum, g) => sum + g._count._all, 0);

    const jobsByStatus: Record<UnifiedJobStatus, number> = {
      queued:
        (genCounts["queued"] ?? 0) +
        (genCounts["pending"] ?? 0) +
        sumGroup(transitionStatusGroups, ["queued", "pending"]) +
        sumGroup(variationStatusGroups, ["queued", "pending"]) +
        sumGroup(reapStatusGroups, ["queued", "pending"]) +
        sumGroup(cinemaStatusGroups, ["queued", "pending"]),
      processing:
        processing +
        sumGroup(transitionStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
        sumGroup(variationStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
        sumGroup(reapStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
        sumGroup(cinemaStatusGroups, ["processing", "submitted", "in_progress", "running"]),
      completed:
        completed +
        sumGroup(transitionStatusGroups, ["completed", "succeeded"]) +
        sumGroup(variationStatusGroups, ["completed", "succeeded"]) +
        sumGroup(reapStatusGroups, ["completed", "succeeded"]) +
        sumGroup(cinemaStatusGroups, ["completed", "succeeded"]),
      failed:
        failed +
        sumGroup(transitionStatusGroups, ["failed", "error"]) +
        sumGroup(variationStatusGroups, ["failed", "error"]) +
        sumGroup(reapStatusGroups, ["failed", "error"]) +
        sumGroup(cinemaStatusGroups, ["failed", "error"]),
      cancelled: 0,
    };

    const countAllInGroup = (groups: Array<{ _count: { _all: number } }>) =>
      groups.reduce((sum, g) => sum + g._count._all, 0);

    const jobsBySource: Record<JobSourceType, number> = {
      generation: totalGenerations,
      transition: countAllInGroup(transitionStatusGroups),
      variation: countAllInGroup(variationStatusGroups),
      reap: countAllInGroup(reapStatusGroups),
      cinema: countAllInGroup(cinemaStatusGroups),
    };

    const totalJobs = Object.values(jobsBySource).reduce((a, b) => a + b, 0);
    const totalDiagnostics = genStuckProcessing + genQueuedTooLong;

    // Usage & Linkage metrics
    const unlinkedUsage = Math.max(0, totalUsage - linkedUsage);
    const linkCoverage = percentage(linkedUsage, totalUsage);

    const usageByProvider: UsageBucket[] = usageProviderGroups.map((g) => ({
      key: g.providerName || "unknown",
      total: g._count._all,
      linked: 0,
      unlinked: 0,
      withActualCost: 0,
      withEstimatedCost: 0,
      missingActualCost: 0,
      missingEstimatedCost: 0,
      missingRequestIdentifiers: 0,
    }));

    const usageByModel: UsageBucket[] = usageModelGroups.map((g) => ({
      key: g.providerModel || "unknown",
      total: g._count._all,
      linked: 0,
      unlinked: 0,
      withActualCost: 0,
      withEstimatedCost: 0,
      missingActualCost: 0,
      missingEstimatedCost: 0,
      missingRequestIdentifiers: 0,
    }));

    // Cost Coverage & Financial Boundary
    const rowsWithNoCost = Math.max(0, totalGenerations - (withActualCost + withEstimatedCost));
    const actualCostCoverage = percentage(withActualCost, totalGenerations);
    const estimatedCostCoverage = percentage(withEstimatedCost, totalGenerations);

    // Feature registry mapping
    const features: AnalyticsBucket[] = [];
    const unknownFeatureCount = totalGenerations;

    return {
      ok: true,
      databaseAvailable: true,
      sources: [
        "Generation (Aggregated via count & groupBy)",
        "ProviderUsageRecord (Aggregated via count & groupBy)",
        "TransitionJob (Aggregated via groupBy)",
        "VariationJob (Aggregated via groupBy)",
        "ReapJob (Aggregated via groupBy)",
        "CinemaJob (Aggregated via groupBy)",
      ],
      filters,
      overview: {
        totalGenerations,
        completed,
        failed,
        processing,
        successRate,
        failureRate,
        averageCompletionLatencyMs: null, // Strictly null: Latency removed from analytics contract
      },
      performance: {
        averageCompletionLatencyMs: null, // Strictly null
        queuedTooLong: genQueuedTooLong,
        processingTooLong: genStuckProcessing,
        stuckJobs: totalDiagnostics,
      },
      providers: providerBuckets,
      models: modelBuckets,
      features,
      unknownFeatureCount,
      jobs: {
        total: totalJobs,
        byStatus: jobsByStatus,
        bySource: jobsBySource,
        diagnostics: totalDiagnostics,
      },
      usage: {
        total: totalUsage,
        linked: linkedUsage,
        unlinked: unlinkedUsage,
        linkCoverage,
        missingRequestIdentifiers: 0,
        missingActualCost: totalUsage - withActualCost,
        missingEstimatedCost: 0,
        byProvider: usageByProvider,
        byModel: usageByModel,
        byStatus: [],
      },
      credits: {
        totalCreditsCharged: chargedCreditsAgg._sum.cost ?? 0,
        totalCreditsRefunded: null,
        netCredits: null,
        freeGenerations: freeGenerationsCount,
        refundCoverageWarning: "Refund coverage is not linked to generation rows in current ledger.",
      },
      costCoverage: {
        rowsWithActualCost: withActualCost,
        rowsWithEstimatedCostOnly: withEstimatedCost,
        rowsWithNoCost,
        actualProviderCostTotal: actualCostAgg._sum.providerCostUsd ?? 0,
        estimatedProviderCostTotal: null,
        actualCostCoverage,
        estimatedCostCoverage,
        financialAnalyticsTrustworthy: false,
        warnings: [
          "Actual provider cost coverage is incomplete.",
          "Estimated costs cannot be treated as actual expenses.",
          "Financial analytics are PARTIAL / COVERAGE-LIMITED. Profit, margin, and net revenue are not computed.",
        ],
      },
      dataQuality: {
        generationRows: totalGenerations,
        providerUsageRows: totalUsage,
        linkedUsage,
        unlinkedUsage,
        providerUsageLinkCoverage: linkCoverage,
        actualCostCoverage,
        estimatedCostCoverage,
        featureMappingCoverage: null,
        errorDataCoverage: percentage(failed, totalGenerations),
        rowsMissingProviderUsage: missingUsageCount,
        rowsMissingFeatureId: unknownFeatureCount,
      },
      partialMetrics: [
        "Feature analytics are partial; older generation rows do not carry proven feature IDs.",
        "Financial metrics are coverage-limited; actual provider cost coverage is low.",
      ],
      refusedMetrics: [
        "Total Profit is not computed because actual provider cost coverage is incomplete.",
        "True Margin is not computed because estimated costs and missing costs cannot be treated as actual cost.",
        "Net Revenue is not computed in this phase; credits are operational usage units, not verified revenue.",
        "Average Completion Latency is not computed because Generation model does not record completedAt timestamp.",
      ],
    };
  } catch (error) {
    console.error("[loadUnifiedAnalytics] Error:", error);
    return {
      ok: false,
      databaseAvailable: false,
      sources: [],
      filters,
      overview: {
        totalGenerations: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        successRate: null,
        failureRate: null,
        averageCompletionLatencyMs: null,
      },
      performance: {
        averageCompletionLatencyMs: null,
        queuedTooLong: 0,
        processingTooLong: 0,
        stuckJobs: 0,
      },
      providers: [],
      models: [],
      features: [],
      unknownFeatureCount: 0,
      jobs: {
        total: 0,
        byStatus: { queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 },
        bySource: { generation: 0, transition: 0, variation: 0, reap: 0, cinema: 0 },
        diagnostics: 0,
      },
      usage: {
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
      },
      credits: {
        totalCreditsCharged: null,
        totalCreditsRefunded: null,
        netCredits: null,
        freeGenerations: 0,
        refundCoverageWarning: null,
      },
      costCoverage: {
        rowsWithActualCost: 0,
        rowsWithEstimatedCostOnly: 0,
        rowsWithNoCost: 0,
        actualProviderCostTotal: null,
        estimatedProviderCostTotal: null,
        actualCostCoverage: null,
        estimatedCostCoverage: null,
        financialAnalyticsTrustworthy: false,
        warnings: ["Database unavailable."],
      },
      dataQuality: {
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
      },
      partialMetrics: ["Database query failed."],
      refusedMetrics: ["All financial and latency derivations refused."],
      error: error instanceof Error ? error.message : "Failed to load unified analytics",
    };
  }
}

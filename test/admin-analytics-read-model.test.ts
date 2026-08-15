import { describe, expect, it } from "vitest";

import { buildAnalyticsResult, type ProviderUsageRow } from "@/lib/admin/analytics-read-model";
import type { UnifiedGenerationHistoryRow } from "@/lib/admin/history-read-model";
import type { UnifiedJobView } from "@/lib/admin/jobs-read-model";

const baseHistoryRow: UnifiedGenerationHistoryRow = {
  generationId: "gen_1",
  jobId: "gen_1",
  featureId: "image-face-swap",
  userId: "user_1",
  modelId: "wavespeed-ai/image-face-swap-pro",
  provider: "WaveSpeed",
  routingSource: "legacy_fallback",
  providerTaskId: "ws_1",
  status: "completed",
  rawStatus: "completed",
  creditState: "charged",
  creditsCharged: 4,
  creditsRefunded: null,
  providerEstimatedCost: null,
  providerActualCost: 0.12,
  createdAt: "2026-08-15T10:00:00.000Z",
  completedAt: "2026-08-15T10:02:00.000Z",
  duration: null,
  latencyMs: 120000,
  primaryResult: "https://cdn.test/out.png",
  additionalOutputsCount: 0,
  error: null,
  errorCode: null,
  providerUsage: [],
  creditLedger: { charged: 4, refunded: null, entries: [] },
  observabilityGaps: [],
};

const baseJob: UnifiedJobView = {
  jobId: "gen_1",
  sourceType: "generation",
  generationId: "gen_1",
  featureId: "image-face-swap",
  userId: "user_1",
  modelId: "wavespeed-ai/image-face-swap-pro",
  provider: "WaveSpeed",
  providerTaskId: "ws_1",
  routingSource: "legacy_fallback",
  status: "completed",
  rawStatus: "completed",
  progress: 100,
  createdAt: "2026-08-15T10:00:00.000Z",
  startedAt: "2026-08-15T10:00:00.000Z",
  completedAt: "2026-08-15T10:02:00.000Z",
  error: null,
  creditsCharged: 4,
  mediaUrl: "https://cdn.test/out.png",
  result: "https://cdn.test/out.png",
  refundState: "charged",
  providerUsage: null,
  diagnostics: [],
};

const baseUsage: ProviderUsageRow = {
  id: "usage_1",
  generationId: "gen_1",
  provider: "WaveSpeed",
  model: "wavespeed-ai/image-face-swap-pro",
  requestId: "ws_1",
  status: "completed",
  providerCostUsd: 0.12,
  providerCostSource: "actual",
  createdAt: "2026-08-15T10:00:00.000Z",
  updatedAt: "2026-08-15T10:02:00.000Z",
};

describe("admin analytics read model", () => {
  it("computes operational metrics from real history rows", () => {
    const failedRow: UnifiedGenerationHistoryRow = {
      ...baseHistoryRow,
      generationId: "gen_2",
      status: "failed",
      error: "provider failed",
      providerActualCost: null,
      providerEstimatedCost: 0.05,
      creditsRefunded: null,
      latencyMs: null,
      featureId: null,
    };
    const result = buildAnalyticsResult([baseHistoryRow, failedRow], [baseJob], [baseUsage]);

    expect(result.overview.totalGenerations).toBe(2);
    expect(result.overview.completed).toBe(1);
    expect(result.overview.failed).toBe(1);
    expect(result.overview.successRate).toBe(50);
    expect(result.overview.averageCompletionLatencyMs).toBe(120000);
    expect(result.unknownFeatureCount).toBe(1);
    expect(result.dataQuality.featureMappingCoverage).toBe(50);
  });

  it("keeps actual and estimated provider cost separate", () => {
    const estimatedOnly: UnifiedGenerationHistoryRow = {
      ...baseHistoryRow,
      generationId: "gen_estimated",
      providerActualCost: null,
      providerEstimatedCost: 0.2,
    };
    const noCost: UnifiedGenerationHistoryRow = {
      ...baseHistoryRow,
      generationId: "gen_no_cost",
      providerActualCost: null,
      providerEstimatedCost: null,
    };
    const result = buildAnalyticsResult([baseHistoryRow, estimatedOnly, noCost], [], []);

    expect(result.costCoverage.rowsWithActualCost).toBe(1);
    expect(result.costCoverage.rowsWithEstimatedCostOnly).toBe(1);
    expect(result.costCoverage.rowsWithNoCost).toBe(1);
    expect(result.costCoverage.actualProviderCostTotal).toBe(0.12);
    expect(result.costCoverage.estimatedProviderCostTotal).toBe(0.2);
    expect(result.costCoverage.financialAnalyticsTrustworthy).toBe(false);
    expect(result.refusedMetrics).toContain("Total Profit is not computed because actual provider cost coverage is incomplete.");
  });

  it("reports provider usage coverage without auto-linking unlinked records", () => {
    const unlinkedUsage: ProviderUsageRow = {
      ...baseUsage,
      id: "usage_unlinked",
      generationId: null,
      requestId: null,
      providerCostUsd: null,
      providerCostSource: "unknown",
    };
    const result = buildAnalyticsResult([baseHistoryRow], [], [baseUsage, unlinkedUsage]);

    expect(result.usage.total).toBe(2);
    expect(result.usage.linked).toBe(1);
    expect(result.usage.unlinked).toBe(1);
    expect(result.usage.linkCoverage).toBe(50);
    expect(result.usage.missingRequestIdentifiers).toBe(1);
    expect(result.partialMetrics).toContain("Provider usage analytics are partial because some ProviderUsageRecord rows are unlinked.");
  });
});

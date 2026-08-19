import prismadb from "@/lib/prismadb";
import { isCommercialCustomerEmail } from "@/lib/admin/account-classification";
import { getDiscoveredProvidersList, evaluateCostTrust } from "@/lib/admin/provider-costs-read-model";
import { estimateProviderCostSync } from "@/lib/pricing";

export type ReconciliationStatus =
  | "MATCHED"
  | "WITHIN_TOLERANCE"
  | "VARIANCE"
  | "INSUFFICIENT_DATA"
  | "UNKNOWN";

export interface ProviderReconciliationItem {
  providerName: string;
  classification: string;
  periodStart: string;
  periodEnd: string;
  generationCount: number;
  knownGenerationCostUsd: number;
  actualGenerationCostUsd: number;
  estimatedVerifiedCostUsd: number;
  estimatedLegacyCostUsd: number;
  shadowAnalyticalCostUsd: number;
  unknownGenerationCount: number;
  providerObservedSpendUsd: number | null;
  providerObservedSpendSource: string | null;
  varianceUsd: number | null;
  variancePercent: number | null;
  reconciliationStatus: ReconciliationStatus;
  commercialKnownCost: number;
  internalKnownCost: number;
  totalKnownCost: number;
}

export interface ProviderReconciliationSummary {
  totalKnownCostUsd: number;
  totalCommercialKnownCostUsd: number;
  totalInternalKnownCostUsd: number;
  totalObservedSpendUsd: number | null;
  providersWithObservedSpend: number;
  providersWithInsufficientData: number;
  totalGenerationsAnalyzed: number;
}

export interface ProviderReconciliationResponse {
  summary: ProviderReconciliationSummary;
  reconciliations: ProviderReconciliationItem[];
  generatedAt: string;
}

export interface ReconciliationFilters {
  periodDays?: number;
  provider?: string;
}

/**
 * Builds the read-only macro-level Provider Reconciliation Read Model.
 * Compares bottom-up per-generation cost evidence against macro provider observations.
 */
export async function getProviderReconciliationReadModel(
  filters: ReconciliationFilters = {}
): Promise<ProviderReconciliationResponse> {
  const periodDays = Math.min(365, Math.max(1, filters.periodDays || 30));
  const periodStartDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const periodEndDate = new Date();

  // 1. Get distinct providers from DB
  const distinctGenProviders = await prismadb.generation.findMany({
    select: { providerName: true },
    distinct: ["providerName"],
  });

  const discovered = getDiscoveredProvidersList(distinctGenProviders.map((p) => p.providerName));

  // 2. Fetch bounded generations for period with user email for commercial/internal breakdown
  const generations = await prismadb.generation.findMany({
    where: {
      createdAt: { gte: periodStartDate, lte: periodEndDate },
      ...(filters.provider && filters.provider !== "ALL"
        ? { providerName: { equals: filters.provider, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      providerName: true,
      providerModel: true,
      modelUsed: true,
      cost: true,
      providerCostUsd: true,
      providerCostSource: true,
      duration: true,
      resolution: true,
      quality: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
      providerUsageRecords: {
        take: 1,
        select: { providerCostUsd: true, providerCostSource: true, duration: true },
      },
    },
    take: 5000,
  });

  // 3. Initialize aggregator map
  const map = new Map<string, ProviderReconciliationItem>();

  for (const dp of discovered) {
    if (filters.provider && filters.provider !== "ALL" && dp.name.toLowerCase() !== filters.provider.toLowerCase()) {
      continue;
    }
    map.set(dp.name.toLowerCase(), {
      providerName: dp.name,
      classification: dp.classification,
      periodStart: periodStartDate.toISOString(),
      periodEnd: periodEndDate.toISOString(),
      generationCount: 0,
      knownGenerationCostUsd: 0,
      actualGenerationCostUsd: 0,
      estimatedVerifiedCostUsd: 0,
      estimatedLegacyCostUsd: 0,
      shadowAnalyticalCostUsd: 0,
      unknownGenerationCount: 0,
      providerObservedSpendUsd: null,
      providerObservedSpendSource: null,
      varianceUsd: null,
      variancePercent: null,
      reconciliationStatus: "INSUFFICIENT_DATA",
      commercialKnownCost: 0,
      internalKnownCost: 0,
      totalKnownCost: 0,
    });
  }

  // 4. Aggregate generation rows
  let totalKnownCostUsd = 0;
  let totalCommercialKnownCostUsd = 0;
  let totalInternalKnownCostUsd = 0;

  for (const gen of generations) {
    const rawProv = gen.providerName || "Legacy / Unclassified";
    const key = rawProv.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        providerName: rawProv,
        classification: "UNKNOWN",
        periodStart: periodStartDate.toISOString(),
        periodEnd: periodEndDate.toISOString(),
        generationCount: 0,
        knownGenerationCostUsd: 0,
        actualGenerationCostUsd: 0,
        estimatedVerifiedCostUsd: 0,
        estimatedLegacyCostUsd: 0,
        shadowAnalyticalCostUsd: 0,
        unknownGenerationCount: 0,
        providerObservedSpendUsd: null,
        providerObservedSpendSource: null,
        varianceUsd: null,
        variancePercent: null,
        reconciliationStatus: "INSUFFICIENT_DATA",
        commercialKnownCost: 0,
        internalKnownCost: 0,
        totalKnownCost: 0,
      });
    }

    const item = map.get(key)!;
    item.generationCount++;

    const isCommercial = isCommercialCustomerEmail(gen.user?.email);

    // Resolve cost
    let costUsd = gen.providerUsageRecords[0]?.providerCostUsd ?? gen.providerCostUsd;
    let costSource = gen.providerUsageRecords[0]?.providerCostSource ?? gen.providerCostSource;
    let provStatus = "VERIFIED_CURRENT";
    let provSourceType: string | undefined = undefined;

    if (costUsd === null || costUsd === undefined) {
      const tariffRes = estimateProviderCostSync({
        modelRef: gen.modelUsed,
        providerName: gen.providerName,
        providerModel: gen.providerModel,
        durationSec: gen.duration || 5,
        resolution: gen.resolution,
        quality: gen.quality,
      });
      costUsd = tariffRes.usd;
      costSource = tariffRes.source;
      provStatus = tariffRes.provenance?.verificationStatus || "UNKNOWN";
      provSourceType = tariffRes.provenance?.sourceType;
    }

    const trust = evaluateCostTrust(rawProv, costSource, costUsd, provStatus as any, provSourceType);

    if (trust === "UNKNOWN") {
      item.unknownGenerationCount++;
    } else if (trust === "SHADOW_ANALYTICAL") {
      const amt = costUsd || 0;
      item.shadowAnalyticalCostUsd += amt;
    } else {
      const amt = costUsd || 0;
      item.knownGenerationCostUsd += amt;
      item.totalKnownCost += amt;
      totalKnownCostUsd += amt;

      if (isCommercial) {
        item.commercialKnownCost += amt;
        totalCommercialKnownCostUsd += amt;
      } else {
        item.internalKnownCost += amt;
        totalInternalKnownCostUsd += amt;
      }

      if (trust === "ACTUAL") {
        item.actualGenerationCostUsd += amt;
      } else if (trust === "ESTIMATED_VERIFIED") {
        item.estimatedVerifiedCostUsd += amt;
      } else {
        item.estimatedLegacyCostUsd += amt;
      }
    }
  }

  // 5. Evaluate Macro Observed Spend & Variance
  let providersWithObservedSpend = 0;
  let providersWithInsufficientData = 0;

  map.forEach((item) => {
    item.knownGenerationCostUsd = parseFloat(item.knownGenerationCostUsd.toFixed(4));
    item.actualGenerationCostUsd = parseFloat(item.actualGenerationCostUsd.toFixed(4));
    item.estimatedVerifiedCostUsd = parseFloat(item.estimatedVerifiedCostUsd.toFixed(4));
    item.estimatedLegacyCostUsd = parseFloat(item.estimatedLegacyCostUsd.toFixed(4));
    item.shadowAnalyticalCostUsd = parseFloat(item.shadowAnalyticalCostUsd.toFixed(4));
    item.commercialKnownCost = parseFloat(item.commercialKnownCost.toFixed(4));
    item.internalKnownCost = parseFloat(item.internalKnownCost.toFixed(4));
    item.totalKnownCost = parseFloat(item.totalKnownCost.toFixed(4));

    // Evaluate macro status
    if (item.providerObservedSpendUsd !== null) {
      providersWithObservedSpend++;
      item.varianceUsd = parseFloat((item.knownGenerationCostUsd - item.providerObservedSpendUsd).toFixed(4));
      item.variancePercent = item.providerObservedSpendUsd > 0
        ? parseFloat(((item.varianceUsd / item.providerObservedSpendUsd) * 100).toFixed(2))
        : 0;

      if (Math.abs(item.varianceUsd) < 0.01) {
        item.reconciliationStatus = "MATCHED";
      } else if (Math.abs(item.variancePercent) <= 5.0) {
        item.reconciliationStatus = "WITHIN_TOLERANCE";
      } else {
        item.reconciliationStatus = "VARIANCE";
      }
    } else {
      providersWithInsufficientData++;
      item.reconciliationStatus = "INSUFFICIENT_DATA";
    }
  });

  const reconciliations = Array.from(map.values()).filter(
    (r) => r.generationCount > 0 || r.classification === "ACTIVE_GENERATIVE" || r.classification === "ACTIVE_TOOL_SERVICE" || r.classification === "STANDBY"
  );

  return {
    summary: {
      totalKnownCostUsd: parseFloat(totalKnownCostUsd.toFixed(4)),
      totalCommercialKnownCostUsd: parseFloat(totalCommercialKnownCostUsd.toFixed(4)),
      totalInternalKnownCostUsd: parseFloat(totalInternalKnownCostUsd.toFixed(4)),
      totalObservedSpendUsd: null,
      providersWithObservedSpend,
      providersWithInsufficientData,
      totalGenerationsAnalyzed: generations.length,
    },
    reconciliations,
    generatedAt: new Date().toISOString(),
  };
}

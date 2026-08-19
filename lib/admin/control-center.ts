import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { PROVIDER_REGISTRY, hasAnyEnv, type ProviderRegistryId } from "@/lib/provider-registry";
import { getProductFeatureSummary } from "@/lib/product/feature-registry";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { DEFAULT_MODELS } from "@/lib/pricing-models";
import { loadKnowledgeHub } from "@/lib/admin/knowledge-hub";
import {
  getStorageProviderDescriptors,
  getStorageReadProvidersForConfig,
  readStorageRuntimeConfig,
} from "@/lib/storage";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";

export type ControlSystemStatus = "READY" | "PARTIAL" | "DEGRADED" | "NOT_STARTED";

export type ControlCenterInput = {
  providers?: any;
  features?: any;
  routing?: any;
  jobs?: any;
  history?: any;
  analytics?: any;
  models?: any;
  pricing?: any;
  knowledge?: any;
  storage?: any;
};

export type ControlCenterAlert = {
  severity: "warning" | "critical" | "info";
  title: string;
  detail: string;
  href: string;
};

export type ControlSystemRow = {
  system: string;
  status: ControlSystemStatus;
  coverage: string;
  href: string | null;
};

export type AdminControlCenterSnapshot = {
  cards: {
    providers: { active: number; standby: number; offline: number };
    features: { controlled: number; partial: number; uncontrolled: number; unknown: number };
    routing: { databaseAvailable: boolean | null; controlCenterRoutes: number | null; legacyFallbackCount: number | null };
    generation: { total: number; completed: number; failed: number; processing: number };
    jobs: { queued: number; processing: number; failed: number; stuckDiagnostics: number };
    usage: { total: number; linked: number; unlinked: number; coverage: number | null };
    analytics: { successRate: number | null; failureRate: number | null; dataQualityCoverage: number | null };
    financial: { actualCostCoverage: number | null; estimatedCostCoverage: number | null; trustworthy: false };
    knowledge: { sources: number; approvedKnowledge: number; drafts: number };
    storage: { activeProvider: string; writeEnabled: boolean; readEnabled: boolean; legacyReadEnabled: boolean };
  };
  systems: ControlSystemRow[];
  alerts: ControlCenterAlert[];
  linkedSystems: Array<{ label: string; href: string; status: ControlSystemStatus }>;
};

export async function loadControlCenterSummary(): Promise<{
  ok: boolean;
  databaseAvailable: boolean;
  snapshot: AdminControlCenterSnapshot;
  checkedAt: string;
  error?: string;
}> {
  const checkedAt = new Date().toISOString();
  const now = Date.now();
  const thirtyMinsAgo = new Date(now - 30 * 60 * 1000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

  try {
    // 1. In-Memory Registries & Configs
    const providerList = Object.values(PROVIDER_REGISTRY);
    const providerCounts = {
      active: providerList.filter((p) => Array.isArray(p.envKeys) && hasAnyEnv(p.envKeys)).length,
      standby: providerList.filter((p) => (!Array.isArray(p.envKeys) || !hasAnyEnv(p.envKeys)) && p.status === "standby").length,
      offline: providerList.filter((p) => (!Array.isArray(p.envKeys) || !hasAnyEnv(p.envKeys)) && p.status !== "standby").length,
    };

    const featuresSummary = getProductFeatureSummary();
    const featureCounts = {
      controlled: featuresSummary.byOverallControl?.CONTROLLED ?? 0,
      partial: featuresSummary.byOverallControl?.PARTIAL ?? 0,
      uncontrolled: featuresSummary.byOverallControl?.UNCONTROLLED ?? 0,
      unknown: featuresSummary.byOverallControl?.UNKNOWN ?? 0,
    };

    const pricingRows = DEFAULT_MODELS;
    const [imageModels, videoModels] = await Promise.all([
      getDynamicImageModels().catch(() => []),
      getDynamicVideoModels().catch(() => []),
    ]);
    const totalCatalogModels = imageModels.length + videoModels.length;

    // 2. Direct Server-Side Module Calls (Zero internal HTTP)
    const [routingData, knowledgeHub, storageConfig] = await Promise.all([
      loadAdminRoutingData().catch(() => ({
        databaseAvailable: false,
        rows: [],
        providers: [],
        warning: "Routing state could not be loaded",
      })),
      loadKnowledgeHub().catch(() => null),
      readStorageRuntimeConfig().catch(() => null),
    ]);

    // 3. Fast Server-Side Database Aggregations (Zero findMany with full rows)
    const [
      genStatusGroups,
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
      missingUsagePaid,
    ] = await Promise.all([
      prismadb.generation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),
      prismadb.generation.count().catch(() => 0),
      prismadb.transitionJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),
      prismadb.variationJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),
      prismadb.reapJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),
      prismadb.cinemaJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }).catch(() => []),
      prismadb.generation.count({
        where: {
          status: { in: ["processing", "submitted", "in_progress", "running"] },
          createdAt: { lt: twoHoursAgo },
        },
      }).catch(() => 0),
      prismadb.generation.count({
        where: {
          status: { in: ["queued", "pending"] },
          createdAt: { lt: thirtyMinsAgo },
        },
      }).catch(() => 0),
      prismadb.providerUsageRecord.count().catch(() => 0),
      prismadb.providerUsageRecord.count({
        where: { generationId: { not: null } },
      }).catch(() => 0),
      prismadb.generation.count({
        where: { providerCostUsd: { not: null } },
      }).catch(() => 0),
      prismadb.generation.count({
        where: { providerCostSource: "estimated" },
      }).catch(() => 0),
      prismadb.generation.count({
        where: {
          cost: { gt: 0 },
          providerUsageRecords: { none: {} },
        },
      }).catch(() => 0),
    ]);

    // Parse Generation counts
    const genCounts: Record<string, number> = {};
    for (const group of genStatusGroups) {
      if (group.status) genCounts[group.status.toLowerCase()] = group._count._all;
    }
    const genCompleted = genCounts["completed"] ?? genCounts["succeeded"] ?? 0;
    const genFailed = genCounts["failed"] ?? genCounts["error"] ?? 0;
    const genProcessing =
      (genCounts["processing"] ?? 0) +
      (genCounts["submitted"] ?? 0) +
      (genCounts["in_progress"] ?? 0) +
      (genCounts["running"] ?? 0);
    const genQueued = (genCounts["queued"] ?? 0) + (genCounts["pending"] ?? 0);

    // Sum other jobs queues
    const sumGroup = (groups: Array<{ status: string | null; _count: { _all: number } }>, targetStatuses: string[]) =>
      groups
        .filter((g) => g.status && targetStatuses.includes(g.status.toLowerCase()))
        .reduce((sum, g) => sum + g._count._all, 0);

    const activeQueued =
      genQueued +
      sumGroup(transitionStatusGroups, ["queued", "pending"]) +
      sumGroup(variationStatusGroups, ["queued", "pending"]) +
      sumGroup(reapStatusGroups, ["queued", "pending"]) +
      sumGroup(cinemaStatusGroups, ["queued", "pending"]);

    const activeProcessing =
      genProcessing +
      sumGroup(transitionStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
      sumGroup(variationStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
      sumGroup(reapStatusGroups, ["processing", "submitted", "in_progress", "running"]) +
      sumGroup(cinemaStatusGroups, ["processing", "submitted", "in_progress", "running"]);

    const activeFailed =
      genFailed +
      sumGroup(transitionStatusGroups, ["failed", "error"]) +
      sumGroup(variationStatusGroups, ["failed", "error"]) +
      sumGroup(reapStatusGroups, ["failed", "error"]) +
      sumGroup(cinemaStatusGroups, ["failed", "error"]);

    const totalStuckDiagnostics = genStuckProcessing + genQueuedTooLong;

    // Usage & Linkage metrics
    const unlinkedUsage = Math.max(0, totalUsage - linkedUsage);
    const usageCoverage = totalUsage > 0 ? Math.round((linkedUsage / totalUsage) * 1000) / 10 : null;

    // Cost coverage metrics
    const actualCostCoverage = totalGenerations > 0 ? Math.round((withActualCost / totalGenerations) * 1000) / 10 : null;
    const estimatedCostCoverage = totalGenerations > 0 ? Math.round((withEstimatedCost / totalGenerations) * 1000) / 10 : null;
    const successRate = totalGenerations > 0 ? Math.round((genCompleted / totalGenerations) * 1000) / 10 : null;
    const failureRate = totalGenerations > 0 ? Math.round((genFailed / totalGenerations) * 1000) / 10 : null;

    // Routing snapshot
    const routingEnabled = routingData.rows.filter((r) => r.enabled).length;
    const routing = {
      databaseAvailable: routingData.databaseAvailable,
      controlCenterRoutes: routingEnabled,
      legacyFallbackCount: null as number | null,
    };

    // Storage summary
    const storageSummary = storageConfig
      ? {
          activeProviderLabel: storageConfig.activeWriteProvider,
          legacyReadEnabled: storageConfig.legacyReadEnabled,
          health: {
            activeConfigured: true,
            writeEnabled: true,
            readEnabled: true,
            mediaGatewayReady: true,
          },
        }
      : {
          activeProviderLabel: "unknown",
          legacyReadEnabled: false,
          health: {
            activeConfigured: false,
            writeEnabled: false,
            readEnabled: false,
            mediaGatewayReady: false,
          },
        };

    const knowledgeSummary = knowledgeHub?.summary ?? {
      sources: 0,
      approvedKnowledge: 0,
      drafts: 0,
    };

    // Construct systems
    const systems: ControlSystemRow[] = [
      {
        system: "Providers",
        status: providerCounts.active > 0 ? "READY" : "DEGRADED",
        coverage: `${providerCounts.active} active / ${providerCounts.standby} standby / ${providerCounts.offline} offline`,
        href: "/admin/providers",
      },
      {
        system: "Features",
        status: featureCounts.unknown || featureCounts.partial || featureCounts.uncontrolled ? "PARTIAL" : "READY",
        coverage: `${featureCounts.controlled} controlled / ${featureCounts.partial} partial / ${featureCounts.uncontrolled} uncontrolled / ${featureCounts.unknown} unknown`,
        href: "/admin/features",
      },
      {
        system: "Routing",
        status: routingData.databaseAvailable === false ? "DEGRADED" : "READY",
        coverage: `${routingEnabled} enabled routes / DB ${routingData.databaseAvailable ? "available" : "unavailable"}`,
        href: "/admin/routing",
      },
      {
        system: "Pricing",
        status: pricingRows.length > 0 ? "READY" : "PARTIAL",
        coverage: `${pricingRows.length} pricing rows`,
        href: "/admin/pricing",
      },
      {
        system: "Generation",
        status: totalGenerations > 0 ? "READY" : "PARTIAL",
        coverage: `${totalGenerations} total / ${genCompleted} completed / ${genFailed} failed`,
        href: "/admin/history",
      },
      {
        system: "Jobs",
        status: totalStuckDiagnostics > 0 ? "PARTIAL" : "READY",
        coverage: `${activeQueued} queued / ${activeProcessing} processing / ${activeFailed} failed / ${totalStuckDiagnostics} diagnostics`,
        href: "/admin/jobs",
      },
      {
        system: "History",
        status: unlinkedUsage > 0 ? "PARTIAL" : "READY",
        coverage: `${totalUsage} usage rows / ${linkedUsage} linked / ${unlinkedUsage} unlinked`,
        href: "/admin/history",
      },
      {
        system: "Analytics",
        status: "READY",
        coverage: `success ${formatPercent(successRate)} / data quality ${formatPercent(usageCoverage)}`,
        href: "/admin/analytics",
      },
      {
        system: "Knowledge",
        status: knowledgeHub ? "READY" : "PARTIAL",
        coverage: `${knowledgeSummary.sources} sources / ${knowledgeSummary.approvedKnowledge} approved / ${knowledgeSummary.drafts} drafts`,
        href: "/admin/knowledge",
      },
      {
        system: "Storage",
        status: storageSummary.health.writeEnabled && storageSummary.health.readEnabled ? "READY" : "PARTIAL",
        coverage: `${storageSummary.activeProviderLabel} / write ${storageSummary.health.writeEnabled ? "enabled" : "disabled"} / legacy ${storageSummary.legacyReadEnabled ? "enabled" : "disabled"}`,
        href: "/admin/storage",
      },
    ];

    // Construct Alerts
    const alerts: ControlCenterAlert[] = [];
    if (routing.databaseAvailable === false) {
      alerts.push({
        severity: "critical",
        title: "Routing DB unavailable",
        detail: "Routing Control is showing fallback/default state.",
        href: "/admin/routing",
      });
    }
    if (totalStuckDiagnostics > 0) {
      alerts.push({
        severity: "warning",
        title: "Job diagnostics detected",
        detail: `${totalStuckDiagnostics} job diagnostics need review.`,
        href: "/admin/jobs",
      });
    }
    if (unlinkedUsage > 0) {
      alerts.push({
        severity: "warning",
        title: "Unlinked ProviderUsage records",
        detail: `${unlinkedUsage} ProviderUsageRecord rows are not linked to Generation rows.`,
        href: "/admin/history",
      });
    }
    if (missingUsagePaid > 0) {
      alerts.push({
        severity: "warning",
        title: "Missing provider usage",
        detail: `${missingUsagePaid} paid generation rows are missing ProviderUsageRecord.`,
        href: "/admin/history",
      });
    }
    if (actualCostCoverage !== null && actualCostCoverage < 50) {
      alerts.push({
        severity: "warning",
        title: "Low actual-cost coverage",
        detail: `Actual provider cost coverage is ${actualCostCoverage}%. Financial data is not fully trustworthy.`,
        href: "/admin/analytics",
      });
    }
    if (featureCounts.partial || featureCounts.uncontrolled || featureCounts.unknown) {
      alerts.push({
        severity: "info",
        title: "Partial or unknown features",
        detail: `${featureCounts.partial} partial, ${featureCounts.uncontrolled} uncontrolled, ${featureCounts.unknown} unknown features remain.`,
        href: "/admin/features",
      });
    }

    const snapshot: AdminControlCenterSnapshot = {
      cards: {
        providers: providerCounts,
        features: featureCounts,
        routing,
        generation: {
          total: totalGenerations,
          completed: genCompleted,
          failed: genFailed,
          processing: genProcessing,
        },
        jobs: {
          queued: activeQueued,
          processing: activeProcessing,
          failed: activeFailed,
          stuckDiagnostics: totalStuckDiagnostics,
        },
        usage: {
          total: totalUsage,
          linked: linkedUsage,
          unlinked: unlinkedUsage,
          coverage: usageCoverage,
        },
        analytics: {
          successRate,
          failureRate,
          dataQualityCoverage: usageCoverage,
        },
        financial: {
          actualCostCoverage,
          estimatedCostCoverage,
          trustworthy: false,
        },
        knowledge: {
          sources: knowledgeSummary.sources,
          approvedKnowledge: knowledgeSummary.approvedKnowledge,
          drafts: knowledgeSummary.drafts,
        },
        storage: {
          activeProvider: storageSummary.activeProviderLabel,
          writeEnabled: storageSummary.health.writeEnabled,
          readEnabled: storageSummary.health.readEnabled,
          legacyReadEnabled: storageSummary.legacyReadEnabled,
        },
      },
      systems,
      alerts,
      linkedSystems: [
        { label: "Providers", href: "/admin/providers", status: systems[0].status },
        { label: "Features", href: "/admin/features", status: systems[1].status },
        { label: "Routing", href: "/admin/routing", status: systems[2].status },
        { label: "Models", href: "/admin/models", status: totalCatalogModels > 0 ? "READY" : "PARTIAL" },
        { label: "Pricing", href: "/admin/pricing", status: systems[3].status },
        { label: "Jobs", href: "/admin/jobs", status: systems[5].status },
        { label: "History", href: "/admin/history", status: systems[6].status },
        { label: "Analytics", href: "/admin/analytics", status: systems[7].status },
        { label: "Knowledge", href: "/admin/knowledge", status: systems[8].status },
        { label: "Storage", href: "/admin/storage", status: systems[9].status },
      ],
    };

    return {
      ok: true,
      databaseAvailable: true,
      snapshot,
      checkedAt,
    };
  } catch (error) {
    console.error("[loadControlCenterSummary] Error:", error);
    return {
      ok: false,
      databaseAvailable: false,
      snapshot: buildEmptyControlCenterSnapshot(),
      checkedAt,
      error: error instanceof Error ? error.message : "Failed to load control center summary",
    };
  }
}

export function buildEmptyControlCenterSnapshot(): AdminControlCenterSnapshot {
  return {
    cards: {
      providers: { active: 0, standby: 0, offline: 0 },
      features: { controlled: 0, partial: 0, uncontrolled: 0, unknown: 0 },
      routing: { databaseAvailable: null, controlCenterRoutes: null, legacyFallbackCount: null },
      generation: { total: 0, completed: 0, failed: 0, processing: 0 },
      jobs: { queued: 0, processing: 0, failed: 0, stuckDiagnostics: 0 },
      usage: { total: 0, linked: 0, unlinked: 0, coverage: null },
      analytics: { successRate: null, failureRate: null, dataQualityCoverage: null },
      financial: { actualCostCoverage: null, estimatedCostCoverage: null, trustworthy: false },
      knowledge: { sources: 0, approvedKnowledge: 0, drafts: 0 },
      storage: { activeProvider: "unknown", writeEnabled: false, readEnabled: false, legacyReadEnabled: false },
    },
    systems: [],
    alerts: [],
    linkedSystems: [],
  };
}

export function buildAdminControlCenterSnapshot(input: ControlCenterInput): AdminControlCenterSnapshot {
  const providers = Array.isArray(input.providers?.providers) ? input.providers.providers : [];
  const featuresSummary = input.features?.summary ?? {};
  const analytics = input.analytics ?? {};
  const routingSummary = input.routing?.summary ?? {};
  const historyRows = Array.isArray(input.history?.rows) ? input.history.rows : [];

  const providerCounts = {
    active: providers.filter((provider: any) => provider.operationalStatus === "active" || provider.status === "online").length,
    standby: providers.filter((provider: any) => provider.operationalStatus === "standby" || provider.status === "standby").length,
    offline: providers.filter((provider: any) => provider.status === "offline").length,
  };

  const featureCounts = {
    controlled: numberAt(featuresSummary.byOverallControl?.CONTROLLED),
    partial: numberAt(featuresSummary.byOverallControl?.PARTIAL),
    uncontrolled: numberAt(featuresSummary.byOverallControl?.UNCONTROLLED),
    unknown: numberAt(featuresSummary.byOverallControl?.UNKNOWN),
  };

  const routing = {
    databaseAvailable: typeof input.routing?.databaseAvailable === "boolean" ? input.routing.databaseAvailable : null,
    controlCenterRoutes: numberOrNull(routingSummary.enabledModels),
    legacyFallbackCount: historyRows.length
      ? historyRows.filter((row: any) => row.routingSource === "legacy_fallback").length
      : null,
  };

  const generation = {
    total: numberAt(analytics.overview?.totalGenerations),
    completed: numberAt(analytics.overview?.completed),
    failed: numberAt(analytics.overview?.failed),
    processing: numberAt(analytics.overview?.processing),
  };

  const jobs = {
    queued: numberAt(input.jobs?.summary?.byStatus?.queued ?? analytics.jobs?.byStatus?.queued),
    processing: numberAt(input.jobs?.summary?.byStatus?.processing ?? analytics.jobs?.byStatus?.processing),
    failed: numberAt(input.jobs?.summary?.byStatus?.failed ?? analytics.jobs?.byStatus?.failed),
    stuckDiagnostics: numberAt(input.jobs?.summary?.diagnostics ?? analytics.jobs?.diagnostics),
  };

  const usage = {
    total: numberAt(analytics.usage?.total ?? input.history?.summary?.providerUsageRecords),
    linked: numberAt(analytics.usage?.linked ?? input.history?.summary?.providerUsageLinked),
    unlinked: numberAt(analytics.usage?.unlinked ?? input.history?.summary?.providerUsageUnlinked),
    coverage: numberOrNull(analytics.usage?.linkCoverage),
  };

  const actualCostCoverage = numberOrNull(analytics.costCoverage?.actualCostCoverage);
  const estimatedCostCoverage = numberOrNull(analytics.costCoverage?.estimatedCostCoverage);
  const storageSummary = input.storage?.summary ?? {};
  const storageHealth = storageSummary.health ?? {};
  const systems: ControlSystemRow[] = [
    {
      system: "Providers",
      status: providerCounts.active > 0 ? "READY" : "DEGRADED",
      coverage: `${providerCounts.active} active / ${providerCounts.standby} standby / ${providerCounts.offline} offline`,
      href: "/admin/providers",
    },
    {
      system: "Features",
      status: featureCounts.unknown || featureCounts.partial || featureCounts.uncontrolled ? "PARTIAL" : "READY",
      coverage: `${featureCounts.controlled} controlled / ${featureCounts.partial} partial / ${featureCounts.uncontrolled} uncontrolled / ${featureCounts.unknown} unknown`,
      href: "/admin/features",
    },
    {
      system: "Routing",
      status: routing.databaseAvailable === false ? "DEGRADED" : numberAt(routingSummary.invalidRoutes) > 0 ? "PARTIAL" : "READY",
      coverage: `${routing.controlCenterRoutes ?? "-"} enabled routes / DB ${routing.databaseAvailable === false ? "unavailable" : "available"}`,
      href: "/admin/routing",
    },
    {
      system: "Pricing",
      status: Array.isArray(input.pricing?.models) && input.pricing.models.length > 0 ? "READY" : "PARTIAL",
      coverage: `${Array.isArray(input.pricing?.models) ? input.pricing.models.length : 0} pricing rows`,
      href: "/admin/pricing",
    },
    {
      system: "Generation",
      status: generation.total > 0 ? "READY" : "PARTIAL",
      coverage: `${generation.total} total / ${generation.completed} completed / ${generation.failed} failed`,
      href: "/admin/history",
    },
    {
      system: "Jobs",
      status: jobs.stuckDiagnostics > 0 ? "PARTIAL" : "READY",
      coverage: `${jobs.queued} queued / ${jobs.processing} processing / ${jobs.failed} failed / ${jobs.stuckDiagnostics} diagnostics`,
      href: "/admin/jobs",
    },
    {
      system: "History",
      status: input.history?.databaseAvailable === false ? "DEGRADED" : usage.unlinked > 0 ? "PARTIAL" : "READY",
      coverage: `${usage.total} usage rows / ${usage.linked} linked / ${usage.unlinked} unlinked`,
      href: "/admin/history",
    },
    {
      system: "Analytics",
      status: input.analytics?.ok === false ? "DEGRADED" : "READY",
      coverage: `success ${formatPercent(analytics.overview?.successRate)} / data quality ${formatPercent(analytics.dataQuality?.providerUsageLinkCoverage)}`,
      href: "/admin/analytics",
    },
    {
      system: "Knowledge",
      status: input.knowledge?.ok === false ? "DEGRADED" : input.knowledge ? "READY" : "NOT_STARTED",
      coverage: input.knowledge
        ? `${numberAt(input.knowledge.summary?.sources)} sources / ${numberAt(input.knowledge.summary?.approvedKnowledge)} approved / ${numberAt(input.knowledge.summary?.drafts)} drafts`
        : "Planned, not started",
      href: input.knowledge ? "/admin/knowledge" : null,
    },
    {
      system: "Storage",
      status:
        input.storage?.ok === false
          ? "DEGRADED"
          : storageHealth.writeEnabled && storageHealth.readEnabled && storageHealth.mediaGatewayReady
            ? "READY"
            : input.storage && (storageHealth.activeConfigured === false || storageHealth.writeEnabled === false || storageHealth.mediaGatewayReady === false)
              ? "DEGRADED"
            : input.storage
              ? "PARTIAL"
              : "NOT_STARTED",
      coverage: input.storage
        ? `${storageSummary.activeProviderLabel ?? "unknown"} / write ${storageHealth.writeEnabled ? "enabled" : "disabled"} / legacy ${storageSummary.legacyReadEnabled ? "enabled" : "disabled"}`
        : "Not started",
      href: input.storage ? "/admin/storage" : null,
    },
  ];

  return {
    cards: {
      providers: providerCounts,
      features: featureCounts,
      routing,
      generation,
      jobs,
      usage,
      analytics: {
        successRate: numberOrNull(analytics.overview?.successRate),
        failureRate: numberOrNull(analytics.overview?.failureRate),
        dataQualityCoverage: numberOrNull(analytics.dataQuality?.providerUsageLinkCoverage),
      },
      financial: {
        actualCostCoverage,
        estimatedCostCoverage,
        trustworthy: false,
      },
      knowledge: {
        sources: numberAt(input.knowledge?.summary?.sources),
        approvedKnowledge: numberAt(input.knowledge?.summary?.approvedKnowledge),
        drafts: numberAt(input.knowledge?.summary?.drafts),
      },
      storage: {
        activeProvider: String(storageSummary.activeProviderLabel ?? "unknown"),
        writeEnabled: Boolean(storageHealth.writeEnabled),
        readEnabled: Boolean(storageHealth.readEnabled),
        legacyReadEnabled: Boolean(storageSummary.legacyReadEnabled),
      },
    },
    systems,
    alerts: buildAlerts(input, featureCounts, routing, jobs, usage, actualCostCoverage),
    linkedSystems: [
      { label: "Providers", href: "/admin/providers", status: systems[0].status },
      { label: "Features", href: "/admin/features", status: systems[1].status },
      { label: "Routing", href: "/admin/routing", status: systems[2].status },
      { label: "Models", href: "/admin/models", status: Array.isArray(input.models?.imageModels) || Array.isArray(input.models?.videoModels) ? "READY" : "PARTIAL" },
      { label: "Pricing", href: "/admin/pricing", status: systems[3].status },
      { label: "Jobs", href: "/admin/jobs", status: systems[5].status },
      { label: "History", href: "/admin/history", status: systems[6].status },
      { label: "Analytics", href: "/admin/analytics", status: systems[7].status },
      { label: "Knowledge", href: "/admin/knowledge", status: systems[8].status },
      { label: "Storage", href: "/admin/storage", status: systems[9].status },
    ],
  };
}

function buildAlerts(
  input: ControlCenterInput,
  features: AdminControlCenterSnapshot["cards"]["features"],
  routing: AdminControlCenterSnapshot["cards"]["routing"],
  jobs: AdminControlCenterSnapshot["cards"]["jobs"],
  usage: AdminControlCenterSnapshot["cards"]["usage"],
  actualCostCoverage: number | null,
): ControlCenterAlert[] {
  const alerts: ControlCenterAlert[] = [];

  if (routing.databaseAvailable === false) {
    alerts.push({ severity: "critical", title: "Routing DB unavailable", detail: "Routing Control is showing fallback/default state.", href: "/admin/routing" });
  }
  if (jobs.stuckDiagnostics > 0) {
    alerts.push({ severity: "warning", title: "Job diagnostics detected", detail: `${jobs.stuckDiagnostics} job diagnostics need review.`, href: "/admin/jobs" });
  }
  if (usage.unlinked > 0) {
    alerts.push({ severity: "warning", title: "Unlinked ProviderUsage records", detail: `${usage.unlinked} ProviderUsageRecord rows are not linked to Generation rows.`, href: "/admin/history" });
  }
  const missingUsage = numberAt(input.history?.summary?.rowsMissingProviderUsage ?? input.analytics?.dataQuality?.rowsMissingProviderUsage);
  if (missingUsage > 0) {
    alerts.push({ severity: "warning", title: "Missing provider usage", detail: `${missingUsage} paid generation rows are missing ProviderUsageRecord.`, href: "/admin/history" });
  }
  if (actualCostCoverage !== null && actualCostCoverage < 50) {
    alerts.push({ severity: "warning", title: "Low actual-cost coverage", detail: `Actual provider cost coverage is ${actualCostCoverage}%. Financial data is not fully trustworthy.`, href: "/admin/analytics" });
  }
  if (features.partial || features.uncontrolled || features.unknown) {
    alerts.push({ severity: "info", title: "Partial or unknown features", detail: `${features.partial} partial, ${features.uncontrolled} uncontrolled, ${features.unknown} unknown features remain.`, href: "/admin/features" });
  }
  if (input.analytics?.costCoverage?.financialAnalyticsTrustworthy === false) {
    alerts.push({ severity: "warning", title: "Financial data not fully trustworthy", detail: "Actual and estimated cost coverage are separated; no profit/margin totals are computed.", href: "/admin/analytics" });
  }
  if (input.storage && input.storage.summary?.health?.writeEnabled === false) {
    alerts.push({ severity: "warning", title: "Storage write unavailable", detail: "Active storage provider is not write-enabled by the current safe configuration.", href: "/admin/storage" });
  }

  return alerts;
}

function numberAt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatPercent(value: unknown): string {
  const number = numberOrNull(value);
  return number === null ? "-" : `${number}%`;
}

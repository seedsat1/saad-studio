import { NextResponse } from "next/server";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { isAdmin } from "@/lib/is-admin";
import { withAudioSourceMetadata, withImageSourceMetadata, withVideoSourceMetadata } from "@/lib/model-source-map";
import {
  PROVIDER_REGISTRY,
  hasAnyEnv,
  normalizeProviderId,
  readNumericEnv,
  type ProviderRegistryId,
} from "@/lib/provider-registry";
import prismadb from "@/lib/prismadb";
import { loadModels } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type ProviderUsageStats = {
  monthlyRequests: number;
  estimatedCostUsd: number;
  fallbackUsage: number;
};

function blankUsageStats(): ProviderUsageStats {
  return {
    monthlyRequests: 0,
    estimatedCostUsd: 0,
    fallbackUsage: 0,
  };
}

function incrementUsage(
  stats: Map<ProviderRegistryId, ProviderUsageStats>,
  providerId: ProviderRegistryId | null,
  costUsd: number | null | undefined
) {
  if (!providerId) return;
  const row = stats.get(providerId) ?? blankUsageStats();
  row.monthlyRequests += 1;
  if (typeof costUsd === "number" && Number.isFinite(costUsd)) {
    row.estimatedCostUsd += costUsd;
  }
  stats.set(providerId, row);
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

async function loadUsageStats(): Promise<Map<ProviderRegistryId, ProviderUsageStats>> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const stats = new Map<ProviderRegistryId, ProviderUsageStats>();
  const [usageRecords, fallbackGenerations] = await Promise.all([
    prismadb.providerUsageRecord.findMany({
      where: { createdAt: { gte: since } },
      select: {
        providerName: true,
        providerModel: true,
        providerCostUsd: true,
      },
    }),
    prismadb.generation.findMany({
      where: {
        createdAt: { gte: since },
        providerUsageRecords: { none: {} },
      },
      select: {
        providerName: true,
        providerModel: true,
        modelUsed: true,
        providerCostUsd: true,
      },
    }),
  ]);

  for (const usage of usageRecords) {
    const providerId = normalizeProviderId(usage.providerName) ?? normalizeProviderId(usage.providerModel);
    incrementUsage(stats, providerId, usage.providerCostUsd);
  }

  for (const generation of fallbackGenerations) {
    const providerId =
      normalizeProviderId(generation.providerName) ??
      normalizeProviderId(generation.providerModel) ??
      normalizeProviderId(generation.modelUsed);
    incrementUsage(stats, providerId, generation.providerCostUsd);
  }

  return stats;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [imageModels, videoModels, pricingModels, usageStats] = await Promise.all([
      getDynamicImageModels(),
      getDynamicVideoModels(),
      loadModels(),
      loadUsageStats().catch((error) => {
        console.error("[admin-providers] usage stats unavailable:", error);
        return new Map<ProviderRegistryId, ProviderUsageStats>();
      }),
    ]);

    const routeCounts = new Map<ProviderRegistryId, { modelsCount: number; activeRoutes: number }>();
    const addRoute = (providerId: ProviderRegistryId, active: boolean) => {
      const current = routeCounts.get(providerId) ?? { modelsCount: 0, activeRoutes: 0 };
      current.modelsCount += 1;
      if (active) current.activeRoutes += 1;
      routeCounts.set(providerId, current);
    };

    for (const model of imageModels.map(withImageSourceMetadata)) {
      addRoute(model.runtimeSource, model.isActive !== false);
    }

    for (const model of videoModels.map(withVideoSourceMetadata)) {
      addRoute(model.runtimeSource, model.isActive !== false);
    }

    for (const model of pricingModels.filter((item) => item.type === "audio")) {
      const withSource = withAudioSourceMetadata({
        id: model.id,
        name: model.name,
      });
      addRoute(withSource.runtimeSource, model.isActive !== false);
    }

    const checkedAt = new Date().toISOString();
    const providers = PROVIDER_REGISTRY.map((provider) => {
      const apiConfigured = hasAnyEnv(provider.envKeys);
      const counts = routeCounts.get(provider.id) ?? { modelsCount: 0, activeRoutes: 0 };
      const usage = usageStats.get(provider.id) ?? blankUsageStats();
      const balanceAmount = readNumericEnv(provider.balanceEnvKeys);
      const enabled = provider.enabled;
      const routingEligible = provider.status === "active" && enabled && provider.allowRouting;
      const online = routingEligible && apiConfigured;

      return {
        id: provider.id,
        providerName: provider.name,
        shortName: provider.shortName,
        status: provider.status === "standby" ? "standby" : online ? "online" : "offline",
        operationalStatus: provider.status,
        enabled,
        allowRouting: provider.allowRouting,
        allowFallback: provider.allowFallback,
        futureProvider: provider.futureProvider,
        routingEligible,
        apiConfigured,
        healthCheck: provider.status === "standby" ? "standby_disabled" : online ? "configured" : "missing_api_config",
        lastCheck: checkedAt,
        lastError:
          provider.status === "standby"
            ? "Provider is standby; routing and fallback are disabled."
            : apiConfigured ? null : `Missing API config: ${provider.envKeys.join(" or ")}`,
        modelsCount: counts.modelsCount,
        activeRoutes: provider.allowRouting ? counts.activeRoutes : 0,
        fallbackUsage: usage.fallbackUsage,
        monthlyRequests: usage.monthlyRequests,
        estimatedCostUsd: roundMoney(usage.estimatedCostUsd),
        balance:
          balanceAmount === null
            ? null
            : {
                amount: balanceAmount,
                unit: provider.id === "kie" || provider.id === "reap" || provider.id === "elevenlabs" ? "credits" : "USD",
                source: "env",
              },
        billingUrl: provider.billingUrl,
        modalities: provider.modalities,
        supportsBalance: provider.supportsBalance,
        healthMode: provider.healthCheck,
        notes: provider.notes,
      };
    });

    return NextResponse.json({
      ok: true,
      providers,
      summary: {
        totalProviders: providers.length,
        onlineProviders: providers.filter((item) => item.status === "online").length,
        configuredProviders: providers.filter((item) => item.apiConfigured).length,
        totalModels: providers.reduce((sum, item) => sum + item.modelsCount, 0),
        totalActiveRoutes: providers.reduce((sum, item) => sum + item.activeRoutes, 0),
        monthlyRequests: providers.reduce((sum, item) => sum + item.monthlyRequests, 0),
        estimatedCostUsd: roundMoney(providers.reduce((sum, item) => sum + item.estimatedCostUsd, 0)),
      },
      checkedAt,
    });
  } catch (error) {
    console.error("[admin-providers] GET error:", error);
    return NextResponse.json({ error: "Failed to load provider management data" }, { status: 500 });
  }
}

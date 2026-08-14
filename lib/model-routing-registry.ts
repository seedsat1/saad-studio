import type { RuntimeSourceProvider } from "@/lib/model-source-map";
import type { PricingProvider } from "@/lib/model-source-map";

export type RoutingModality = "image" | "video" | "audio";

export type RouteTarget = {
  provider: RuntimeSourceProvider;
  route: string;
};

export type ModelRoutingConfig = {
  modelId: string;
  modelName: string;
  modality: RoutingModality;
  enabled: boolean;
  runtimeSource: RuntimeSourceProvider;
  primaryRoute: RouteTarget;
  fallbackRoutes: RouteTarget[];
  pricingProvider: PricingProvider | RuntimeSourceProvider;
  automaticFallback: boolean;
  healthRequirement: boolean;
  diagnostics?: RoutingDiagnostics;
};

export type ModelRoutingOverride = Partial<
  Pick<
    ModelRoutingConfig,
    | "enabled"
    | "runtimeSource"
    | "primaryRoute"
    | "fallbackRoutes"
    | "pricingProvider"
    | "automaticFallback"
    | "healthRequirement"
  >
>;

export type RoutingDiagnostics = {
  lastAttemptAt: string | null;
  selectedProvider: RuntimeSourceProvider | null;
  selectedRoute: string | null;
  fallbackUsed: boolean;
  latencyMs: number | null;
  lastError: string | null;
};

export const EMPTY_ROUTING_DIAGNOSTICS: RoutingDiagnostics = {
  lastAttemptAt: null,
  selectedProvider: null,
  selectedRoute: null,
  fallbackUsed: false,
  latencyMs: null,
  lastError: null,
};

export function buildDefaultRoutingConfig(input: {
  modelId: string;
  modelName: string;
  modality: RoutingModality;
  runtimeSource: RuntimeSourceProvider;
  sourceModelId: string;
  pricingProvider: PricingProvider | RuntimeSourceProvider;
  enabled?: boolean;
}): ModelRoutingConfig {
  return {
    modelId: input.modelId,
    modelName: input.modelName,
    modality: input.modality,
    enabled: input.enabled !== false,
    runtimeSource: input.runtimeSource,
    primaryRoute: {
      provider: input.runtimeSource,
      route: input.sourceModelId,
    },
    fallbackRoutes: [],
    pricingProvider: input.pricingProvider,
    automaticFallback: false,
    healthRequirement: true,
    diagnostics: EMPTY_ROUTING_DIAGNOSTICS,
  };
}

export function applyRoutingOverride(
  defaults: ModelRoutingConfig,
  override: ModelRoutingOverride | undefined
): ModelRoutingConfig {
  if (!override) return defaults;
  const primaryRoute = override.primaryRoute ?? defaults.primaryRoute;
  return {
    ...defaults,
    ...override,
    primaryRoute,
    runtimeSource: override.runtimeSource ?? primaryRoute.provider ?? defaults.runtimeSource,
    fallbackRoutes: Array.isArray(override.fallbackRoutes) ? override.fallbackRoutes : defaults.fallbackRoutes,
    diagnostics: defaults.diagnostics ?? EMPTY_ROUTING_DIAGNOSTICS,
  };
}

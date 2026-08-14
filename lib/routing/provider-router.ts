import {
  applyRoutingOverride,
  type ModelRoutingConfig,
  type ModelRoutingOverride,
  type RouteTarget,
} from "@/lib/model-routing-registry";
import { isProviderFallbackAllowed, isProviderRoutingAllowed } from "@/lib/provider-registry";

export type FallbackRouteEvaluation = {
  configured: RouteTarget;
  effective: RouteTarget | null;
  status: "active" | "ignored";
  reason: string | null;
};

export type ProviderRouteDecision = {
  modelId: string;
  selected: RouteTarget;
  configuredFallbacks: RouteTarget[];
  fallbacks: RouteTarget[];
  fallbackEvaluations: FallbackRouteEvaluation[];
  automaticFallback: boolean;
  healthRequirement: boolean;
};

export function resolveEffectiveRoutingConfig(
  defaults: ModelRoutingConfig,
  override: ModelRoutingOverride | undefined
): ModelRoutingConfig {
  return applyRoutingOverride(defaults, override);
}

export function evaluateFallbackRoutes(config: ModelRoutingConfig): FallbackRouteEvaluation[] {
  return config.fallbackRoutes.map((route) => {
    if (!config.automaticFallback) {
      return {
        configured: route,
        effective: null,
        status: "ignored",
        reason: "automatic fallback is disabled",
      };
    }

    if (!isProviderFallbackAllowed(route.provider)) {
      return {
        configured: route,
        effective: null,
        status: "ignored",
        reason: `${route.provider} is standby, disabled, or not allowed for fallback routing`,
      };
    }

    return {
      configured: route,
      effective: route,
      status: "active",
      reason: null,
    };
  });
}

export function decideProviderRoute(config: ModelRoutingConfig): ProviderRouteDecision {
  if (!config.enabled) {
    throw new Error(`Routing disabled for ${config.modelId}`);
  }

  if (!isProviderRoutingAllowed(config.primaryRoute.provider)) {
    throw new Error(`${config.primaryRoute.provider} is not active for routing`);
  }

  const fallbackEvaluations = evaluateFallbackRoutes(config);
  const fallbacks = fallbackEvaluations.flatMap((evaluation) => evaluation.effective ? [evaluation.effective] : []);

  return {
    modelId: config.modelId,
    selected: config.primaryRoute,
    configuredFallbacks: config.fallbackRoutes,
    fallbacks,
    fallbackEvaluations,
    automaticFallback: config.automaticFallback,
    healthRequirement: config.healthRequirement,
  };
}

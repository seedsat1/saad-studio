import type { ModelRoutingOverride, RouteTarget } from "@/lib/model-routing-registry";
import { isProviderFallbackAllowed, isProviderRoutingAllowed } from "@/lib/provider-registry";

function validateRouteTarget(target: RouteTarget | undefined, field: string): string[] {
  const errors: string[] = [];
  if (!target) {
    errors.push(`${field} is required.`);
    return errors;
  }
  if (!target.provider) errors.push(`${field}.provider is required.`);
  if (!target.route || !target.route.trim()) errors.push(`${field}.route is required.`);
  if (target.provider && !isProviderRoutingAllowed(target.provider)) {
    errors.push(`${target.provider} is not active for primary routing.`);
  }
  return errors;
}

export function validateRoutingOverride(override: ModelRoutingOverride): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (override.primaryRoute) {
    errors.push(...validateRouteTarget(override.primaryRoute, "primaryRoute"));
  }

  if (Array.isArray(override.fallbackRoutes)) {
    override.fallbackRoutes.forEach((route, index) => {
      if (!route.provider) errors.push(`fallbackRoutes[${index}].provider is required.`);
      if (!route.route || !route.route.trim()) errors.push(`fallbackRoutes[${index}].route is required.`);
      if (route.provider && !isProviderFallbackAllowed(route.provider)) {
        errors.push(`${route.provider} is not active for fallback routing.`);
      }
    });
  }

  if (override.runtimeSource && !isProviderRoutingAllowed(override.runtimeSource)) {
    errors.push(`${override.runtimeSource} is not active for runtime routing.`);
  }

  return { ok: errors.length === 0, errors };
}

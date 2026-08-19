import type { ModelRoutingOverride, RouteTarget } from "@/lib/model-routing-registry";
import { isProviderFallbackAllowed, isProviderRoutingAllowed, PROVIDER_REGISTRY } from "@/lib/provider-registry";

export type ModelValidationContext = {
  modelId: string;
  modality?: "image" | "video" | "audio" | "3d" | string;
};

function validateRouteTarget(
  target: RouteTarget | undefined,
  field: string,
  modelContext?: ModelValidationContext
): string[] {
  const errors: string[] = [];
  if (!target) {
    errors.push(`${field} is required.`);
    return errors;
  }
  if (!target.provider) {
    errors.push(`${field}.provider is required.`);
    return errors;
  }
  if (!target.route || !target.route.trim()) {
    errors.push(`${field}.route is required.`);
  }

  const providerEntry = PROVIDER_REGISTRY.find((p) => p.id === target.provider);
  if (!providerEntry) {
    errors.push(`Provider ${target.provider} is not recognized in the provider registry.`);
    return errors;
  }

  if (!isProviderRoutingAllowed(target.provider)) {
    errors.push(`Provider ${providerEntry.name} (${target.provider}) is standby or not active for primary routing.`);
  }

  if (modelContext?.modality) {
    const targetModality = modelContext.modality === "3d" ? "image" : modelContext.modality;
    if (!providerEntry.modalities.includes(targetModality as any) && !providerEntry.modalities.includes("post-production")) {
      errors.push(`Provider ${providerEntry.name} (${target.provider}) does not support ${modelContext.modality} modality.`);
    }
  }

  return errors;
}

export function validateRoutingOverride(
  override: ModelRoutingOverride,
  modelContext?: ModelValidationContext
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (override.primaryRoute) {
    errors.push(...validateRouteTarget(override.primaryRoute, "primaryRoute", modelContext));
  }

  if (Array.isArray(override.fallbackRoutes)) {
    override.fallbackRoutes.forEach((route, index) => {
      if (!route.provider) {
        errors.push(`fallbackRoutes[${index}].provider is required.`);
        return;
      }
      if (!route.route || !route.route.trim()) {
        errors.push(`fallbackRoutes[${index}].route is required.`);
      }

      const providerEntry = PROVIDER_REGISTRY.find((p) => p.id === route.provider);
      if (!providerEntry) {
        errors.push(`Fallback provider ${route.provider} is not recognized in provider registry.`);
        return;
      }

      if (!isProviderFallbackAllowed(route.provider)) {
        errors.push(`Fallback provider ${providerEntry.name} (${route.provider}) is not active for fallback routing.`);
      }

      if (modelContext?.modality) {
        const targetModality = modelContext.modality === "3d" ? "image" : modelContext.modality;
        if (!providerEntry.modalities.includes(targetModality as any) && !providerEntry.modalities.includes("post-production")) {
          errors.push(`Fallback provider ${providerEntry.name} (${route.provider}) does not support ${modelContext.modality} modality.`);
        }
      }
    });
  }

  if (override.runtimeSource && !isProviderRoutingAllowed(override.runtimeSource)) {
    errors.push(`${override.runtimeSource} is not active for runtime routing.`);
  }

  return { ok: errors.length === 0, errors };
}

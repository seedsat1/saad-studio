import type { RoutingModality, RouteTarget } from "@/lib/model-routing-registry";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { decideProviderRoute } from "@/lib/routing/provider-router";

export type RuntimeRoutingSource = "control_center" | "legacy_fallback";

export type RuntimeRoutingDecision = {
  modelId: string;
  modality: RoutingModality;
  routingSource: RuntimeRoutingSource;
  effectiveProvider: RouteTarget["provider"];
  providerRoute: string;
  route: RouteTarget;
  reason: string | null;
};

export async function resolveRuntimeProviderRoute(input: {
  modelId: string;
  modality: RoutingModality;
  legacyRoute: RouteTarget;
}): Promise<RuntimeRoutingDecision> {
  try {
    const data = await loadAdminRoutingData();
    const row = data.rows.find((item) => {
      if (item.modality !== input.modality) return false;
      return (
        item.modelId === input.modelId ||
        item.primaryRoute.route === input.modelId ||
        item.defaultRouting.primaryRoute.route === input.modelId
      );
    });

    if (!row) {
      return legacyDecision(input, "No model routing row matched this model/action.");
    }

    const decision = decideProviderRoute(row);
    return {
      modelId: row.modelId,
      modality: input.modality,
      routingSource: "control_center",
      effectiveProvider: decision.selected.provider,
      providerRoute: decision.selected.route,
      route: decision.selected,
      reason: null,
    };
  } catch (error) {
    return legacyDecision(
      input,
      error instanceof Error ? error.message : "Runtime routing resolution failed.",
    );
  }
}

export function routingMetadata(decision: RuntimeRoutingDecision) {
  return {
    routingSource: decision.routingSource,
    effectiveProvider: decision.effectiveProvider,
    providerRoute: decision.providerRoute,
    routingReason: decision.reason,
  };
}

function legacyDecision(
  input: {
    modelId: string;
    modality: RoutingModality;
    legacyRoute: RouteTarget;
  },
  reason: string,
): RuntimeRoutingDecision {
  return {
    modelId: input.modelId,
    modality: input.modality,
    routingSource: "legacy_fallback",
    effectiveProvider: input.legacyRoute.provider,
    providerRoute: input.legacyRoute.route,
    route: input.legacyRoute,
    reason,
  };
}

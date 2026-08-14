import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import {
  buildDefaultRoutingConfig,
  type ModelRoutingConfig,
  type RoutingModality,
} from "@/lib/model-routing-registry";
import { withAudioSourceMetadata, withImageSourceMetadata, withVideoSourceMetadata } from "@/lib/model-source-map";
import { PROVIDER_REGISTRY } from "@/lib/provider-registry";
import { loadModels } from "@/lib/pricing";
import { loadRoutingDiagnosticsResult, loadRoutingOverridesResult } from "@/lib/routing/routing-config";
import { evaluateFallbackRoutes, resolveEffectiveRoutingConfig } from "@/lib/routing/provider-router";
import { validateRoutingOverride } from "@/lib/routing/route-validator";

function defaultConfig(input: {
  modelId: string;
  modelName: string;
  modality: RoutingModality;
  runtimeSource: any;
  sourceModelId: string;
  pricingProvider: any;
  enabled?: boolean;
}): ModelRoutingConfig {
  return buildDefaultRoutingConfig(input);
}

export async function loadAdminRoutingData() {
  const [imageModels, videoModels, pricingModels, overridesResult, diagnosticsResult] = await Promise.all([
    getDynamicImageModels(),
    getDynamicVideoModels(),
    loadModels(),
    loadRoutingOverridesResult(),
    loadRoutingDiagnosticsResult(),
  ]);
  const overrides = overridesResult.data;
  const diagnostics = diagnosticsResult.data;
  const databaseAvailable = overridesResult.databaseAvailable && diagnosticsResult.databaseAvailable;
  const unavailableMessages = [
    overridesResult.databaseAvailable ? null : `Routing overrides could not be loaded from Neon${overridesResult.error ? `: ${overridesResult.error}` : ""}`,
    diagnosticsResult.databaseAvailable ? null : `Routing diagnostics could not be loaded from Neon${diagnosticsResult.error ? `: ${diagnosticsResult.error}` : ""}`,
  ].filter(Boolean) as string[];

  const defaults: ModelRoutingConfig[] = [
    ...imageModels.map((model) => {
      const source = withImageSourceMetadata(model);
      return defaultConfig({
        modelId: source.id,
        modelName: source.label || source.id,
        modality: "image",
        runtimeSource: source.runtimeSource,
        sourceModelId: source.sourceModelId,
        pricingProvider: source.runtimeSource,
        enabled: source.isActive !== false,
      });
    }),
    ...videoModels.map((model) => {
      const source = withVideoSourceMetadata(model);
      return defaultConfig({
        modelId: source.id,
        modelName: source.name || source.id,
        modality: "video",
        runtimeSource: source.runtimeSource,
        sourceModelId: source.sourceModelId,
        pricingProvider: source.runtimeSource,
        enabled: source.isActive !== false,
      });
    }),
    ...pricingModels
      .filter((model) => model.type === "audio")
      .map((model) => {
        const source = withAudioSourceMetadata({
          id: model.id,
          name: model.name,
        });
        return defaultConfig({
          modelId: source.id,
          modelName: model.name || source.id,
          modality: "audio",
          runtimeSource: source.runtimeSource,
          sourceModelId: source.sourceModelId,
          pricingProvider: source.runtimeSource,
          enabled: model.isActive !== false,
        });
      }),
  ];

  const rows = defaults.map((defaultsRow) => {
    const override = overrides[defaultsRow.modelId];
    const effective = resolveEffectiveRoutingConfig(defaultsRow, override);
    const validation = override ? validateRoutingOverride(override) : { ok: true, errors: [] };
    return {
      ...effective,
      defaultRouting: defaultsRow,
      hasOverride: Boolean(override),
      configSource: override ? "persisted" : "default",
      databaseAvailable,
      override: override ?? null,
      diagnostics: diagnostics[defaultsRow.modelId] ?? effective.diagnostics,
      fallbackEvaluations: evaluateFallbackRoutes(effective),
      validation,
    };
  });

  return {
    databaseAvailable,
    configSource: overridesResult.source === "persisted" ? "persisted" : "default",
    warning: databaseAvailable ? null : unavailableMessages.join(" "),
    configState: {
      overrides: overridesResult,
      diagnostics: diagnosticsResult,
    },
    rows,
    providers: PROVIDER_REGISTRY.map((provider) => ({
      id: provider.id,
      name: provider.name,
      shortName: provider.shortName,
      status: provider.status,
      enabled: provider.enabled,
      allowRouting: provider.allowRouting,
      allowFallback: provider.allowFallback,
      futureProvider: provider.futureProvider,
      routingEligible: provider.status === "active" && provider.enabled && provider.allowRouting,
      fallbackEligible: provider.status === "active" && provider.enabled && provider.allowFallback,
    })),
    overrides,
  };
}

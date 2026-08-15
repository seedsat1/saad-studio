import type { RouteTarget } from "@/lib/model-routing-registry";

export const THREE_D_ENDPOINTS: Record<string, string> = {
  "tripo3d-2.5.image": "tripo3d/v2.5/image-to-3d",
  "tripo3d-2.5.multiview": "tripo3d/v2.5/multiview-to-3d",
  "hunyuan3d-3.1.text": "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid",
  "hunyuan3d-3.1.image": "wavespeed-ai/hunyuan-3d-v3.1/image-to-3d-rapid",
  "hunyuan3d-3.text": "wavespeed-ai/hunyuan3d-v3/text-to-3d",
  "hunyuan3d-3.image": "wavespeed-ai/hunyuan3d-v3/image-to-3d",
  "hunyuan3d-3.sketch": "wavespeed-ai/hunyuan3d-v3/sketch-to-3d",
  "meshy-6.text": "wavespeed-ai/meshy6/text-to-3d",
  "meshy-6.image": "wavespeed-ai/meshy6/image-to-3d",
  "hyper3d-rodin-2.text": "hyper3d/rodin-v2/text-to-3d",
  "hyper3d-rodin-2.image": "hyper3d/rodin-v2/image-to-3d",
};

// Keep this list strict: only add models that are verified to work on KIE 3D endpoints.
export const KIE_3D_MODELS = new Set<string>([]);

export function resolveThreeDLegacyRoute(modelId: string, endpoint: string): RouteTarget {
  return {
    provider: KIE_3D_MODELS.has(modelId) ? "kie" : "wavespeed",
    route: endpoint,
  };
}

export const THREE_D_ROUTING_MODELS = Object.entries(THREE_D_ENDPOINTS).map(([modelId, sourceModelId]) => ({
  modelId,
  modelName: modelId,
  modality: "3d" as const,
  runtimeSource: resolveThreeDLegacyRoute(modelId.split(".")[0] ?? modelId, sourceModelId).provider,
  sourceModelId,
  pricingProvider: "wavespeed" as const,
  enabled: true,
}));

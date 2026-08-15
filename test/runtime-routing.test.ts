import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/routing/admin-routing-data", () => ({
  loadAdminRoutingData: vi.fn(),
}));

import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { resolveRuntimeProviderRoute } from "@/lib/routing/runtime-routing";
import { THREE_D_ROUTING_MODELS, resolveThreeDLegacyRoute } from "@/lib/three-d-models";

const mockedLoadAdminRoutingData = vi.mocked(loadAdminRoutingData);

function routingRow(input: {
  modelId: string;
  modality: "image" | "video" | "audio" | "3d";
  provider: "google" | "openai" | "wavespeed" | "kie" | "byteplus";
  route: string;
}) {
  return {
    modelId: input.modelId,
    modelName: input.modelId,
    modality: input.modality,
    enabled: true,
    runtimeSource: input.provider,
    primaryRoute: {
      provider: input.provider,
      route: input.route,
    },
    defaultRouting: {
      primaryRoute: {
        provider: input.provider,
        route: input.route,
      },
    },
    fallbackRoutes: [],
    pricingProvider: input.provider,
    automaticFallback: false,
    healthRequirement: true,
  };
}

describe("runtime routing integration", () => {
  it("uses the control center route when the provider is active", async () => {
    mockedLoadAdminRoutingData.mockResolvedValueOnce({
      rows: [
        routingRow({
          modelId: "seedream/5-pro-text-to-image",
          modality: "image",
          provider: "wavespeed",
          route: "bytedance/seedream-v5.0-pro",
        }),
      ],
    } as any);

    const decision = await resolveRuntimeProviderRoute({
      modelId: "seedream/5-pro-text-to-image",
      modality: "image",
      legacyRoute: { provider: "wavespeed", route: "bytedance/seedream-v5.0-pro" },
    });

    expect(decision.routingSource).toBe("control_center");
    expect(decision.effectiveProvider).toBe("wavespeed");
    expect(decision.providerRoute).toBe("bytedance/seedream-v5.0-pro");
  });

  it("falls back to legacy routing when no routing row exists", async () => {
    mockedLoadAdminRoutingData.mockResolvedValueOnce({ rows: [] } as any);

    const decision = await resolveRuntimeProviderRoute({
      modelId: "unknown-model",
      modality: "video",
      legacyRoute: { provider: "wavespeed", route: "legacy-route" },
    });

    expect(decision.routingSource).toBe("legacy_fallback");
    expect(decision.effectiveProvider).toBe("wavespeed");
    expect(decision.providerRoute).toBe("legacy-route");
  });

  it("does not allow standby providers through control center routing", async () => {
    mockedLoadAdminRoutingData.mockResolvedValueOnce({
      rows: [
        routingRow({
          modelId: "kling-standby-route",
          modality: "video",
          provider: "kie",
          route: "kling-3.0/video",
        }),
      ],
    } as any);

    const decision = await resolveRuntimeProviderRoute({
      modelId: "kling-standby-route",
      modality: "video",
      legacyRoute: { provider: "wavespeed", route: "kwaivgi/kling-v3.0-std/text-to-video" },
    });

    expect(decision.routingSource).toBe("legacy_fallback");
    expect(decision.effectiveProvider).toBe("wavespeed");
    expect(decision.reason).toMatch(/not active for routing/i);
  });

  it("exposes verified 3D routes as active WaveSpeed routing defaults", async () => {
    expect(THREE_D_ROUTING_MODELS.length).toBeGreaterThan(0);
    expect(THREE_D_ROUTING_MODELS.every((model) => model.modality === "3d")).toBe(true);
    expect(THREE_D_ROUTING_MODELS.every((model) => model.runtimeSource === "wavespeed")).toBe(true);
    expect(resolveThreeDLegacyRoute("hunyuan3d-3.1", "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid")).toEqual({
      provider: "wavespeed",
      route: "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid",
    });
  });
});

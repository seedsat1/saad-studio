import { describe, expect, it } from "vitest";
import {
  validateModelConfigurations,
  ModelConcurrencyError,
  type ModelRegistryAuditEvent,
} from "@/lib/model-registry-hardening";
import { IMAGE_MODELS } from "@/lib/image-models";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

describe("Admin Models Backend Hardening Test Suite", () => {
  describe("1. Strict Write Validation", () => {
    it("accepts valid curated image and video models", () => {
      const result = validateModelConfigurations(IMAGE_MODELS, VIDEO_MODEL_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty imageModels or videoModels arrays", () => {
      const result = validateModelConfigurations([], VIDEO_MODEL_REGISTRY);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("imageModels array must not be empty"))).toBe(true);
    });

    it("rejects invalid/empty model ID", () => {
      const badImageModels = [{ ...IMAGE_MODELS[0], id: "  " }];
      const result = validateModelConfigurations(badImageModels, VIDEO_MODEL_REGISTRY);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("empty or invalid id"))).toBe(true);
    });

    it("rejects negative creditCost", () => {
      const badImageModels = [{ ...IMAGE_MODELS[0], creditCost: -5 }];
      const result = validateModelConfigurations(badImageModels, VIDEO_MODEL_REGISTRY);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid negative or NaN creditCost"))).toBe(true);
    });

    it("rejects invalid video model with empty id", () => {
      const badVideoModels = [{ ...VIDEO_MODEL_REGISTRY[0], id: "" }];
      const result = validateModelConfigurations(IMAGE_MODELS, badVideoModels);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("empty or invalid id"))).toBe(true);
    });
  });

  describe("2. Optimistic Concurrency Protection", () => {
    it("creates ModelConcurrencyError with correct message and name", () => {
      const err = new ModelConcurrencyError();
      expect(err.name).toBe("ModelConcurrencyError");
      expect(err.message).toContain("Model registry configuration was modified by another administrator");
    });
  });

  describe("3. Persistent Audit Event Data Contract", () => {
    it("accurately constructs audit event structure", () => {
      const auditEvent: ModelRegistryAuditEvent = {
        id: "model_audit_123",
        timestamp: new Date().toISOString(),
        operatorId: "user_admin_test",
        action: "save_models",
        changedModelsCount: 1,
        changes: [
          {
            modelId: "flux-2-pro",
            modality: "image",
            field: "creditCost",
            oldValue: 2.0,
            newValue: 2.5,
          },
        ],
      };

      expect(auditEvent.operatorId).toBe("user_admin_test");
      expect(auditEvent.action).toBe("save_models");
      expect(auditEvent.changes[0].oldValue).toBe(2.0);
      expect(auditEvent.changes[0].newValue).toBe(2.5);
    });
  });

  describe("4. WaveSpeed Route Normalization & Grok Routing", () => {
    it("correctly routes Grok text-to-image and edit to official WaveSpeed endpoints", async () => {
      const { resolveWaveSpeedImageModelRoute, normalizeWaveSpeedModelEndpoint } = await import("@/lib/wavespeed-image-routing");
      const { resolveVideoModelSource } = await import("@/lib/model-source-map");

      const textRoute = resolveWaveSpeedImageModelRoute("grok-imagine/text-to-image", false, 1);
      expect(textRoute?.model).toBe("x-ai/grok-imagine-image-quality/text-to-image");
      expect(textRoute?.inputShape).toBe("aspect-resolution");

      const editRoute = resolveWaveSpeedImageModelRoute("grok-imagine/image-to-image", true, 1);
      expect(editRoute?.model).toBe("x-ai/grok-imagine-image-quality/edit");
      expect(editRoute?.requiresReference).toBe(true);

      const v2Route = resolveWaveSpeedImageModelRoute("x-ai-grok-imagine-image-v2.0-text-to-image", false, 1);
      expect(v2Route?.model).toBe("x-ai/grok-imagine-image-v2.0/text-to-image");

      const customNormalized = normalizeWaveSpeedModelEndpoint("bytedance-seedream-v5.0-pro-text-to-image");
      expect(customNormalized).toBe("bytedance/seedream-v5.0-pro/text-to-image");

      const alibabaSource = resolveVideoModelSource({
        id: "wan-3-unified",
        api_route: "alibaba/wan-3.0/text-to-video",
      });
      expect(alibabaSource.runtimeSource).toBe("wavespeed");
      expect(alibabaSource.pricingProvider).toBe("wavespeed");
    });

    it("keeps one subscriber-facing dynamic video model while dispatching text versus image/reference routes", async () => {
      const { resolveDynamicVideoSubRoute } = await import("@/lib/dynamic-model-loader");

      const unifiedModel = {
        api_route: "alibaba/wan-3.0/text-to-video",
        text_api_route: "alibaba/wan-3.0/text-to-video",
        image_api_route: "alibaba/wan-3.0/image-to-video",
        reference_api_route: "alibaba/wan-3.0/reference-to-video",
      };

      expect(resolveDynamicVideoSubRoute(unifiedModel, false)).toBe("alibaba/wan-3.0/text-to-video");
      expect(resolveDynamicVideoSubRoute(unifiedModel, true)).toBe("alibaba/wan-3.0/image-to-video");
      expect(resolveDynamicVideoSubRoute(unifiedModel, true, true)).toBe("alibaba/wan-3.0/reference-to-video");
    });

    it("publishes Wan 3.0 as one visible video model in the central registry", () => {
      const wan30 = VIDEO_MODEL_REGISTRY.find((model) => model.id === "alibaba-wan-3.0-video");

      expect(wan30).toBeDefined();
      expect(wan30?.name).toBe("Wan 3.0");
      expect(wan30?.api_route).toBe("alibaba/wan-3.0/text-to-video");
      expect(wan30?.text_api_route).toBe("alibaba/wan-3.0/text-to-video");
      expect(wan30?.image_api_route).toBe("alibaba/wan-3.0/image-to-video");
      expect(wan30?.reference_api_route).toBe("alibaba/wan-3.0/reference-to-video");
      expect(wan30?.capabilities.aspect_ratios).toEqual(["16:9", "9:16", "1:1", "4:3", "3:4"]);
      expect(wan30?.capabilities.resolutions).toEqual(["480p", "720p", "1080p"]);
      expect(wan30?.capabilities.durations).toContain(2);
      expect(wan30?.capabilities.durations).toContain(30);
      expect(wan30?.capabilities.max_reference_images).toBe(10);
      expect(wan30?.capabilities.max_reference_videos).toBe(5);
      expect(wan30?.capabilities.max_reference_audios).toBe(5);
    });

    it("keeps official Wan 3.0 ratios visible when stale Admin Models rows only contain one ratio", async () => {
      const { normalizeDynamicVideoModels } = await import("@/lib/dynamic-model-loader");
      const wan30 = VIDEO_MODEL_REGISTRY.find((model) => model.id === "alibaba-wan-3.0-video");
      const seedance25 = VIDEO_MODEL_REGISTRY.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");

      expect(wan30).toBeDefined();
      expect(seedance25).toBeDefined();

      const normalized = normalizeDynamicVideoModels([
        {
          ...wan30!,
          capabilities: {
            ...wan30!.capabilities,
            aspect_ratios: ["16:9"],
            durations: [2, 10, 30],
            resolutions: ["720p"],
            max_reference_images: 3,
          },
        },
        {
          ...seedance25!,
          capabilities: {
            ...seedance25!.capabilities,
            resolutions: ["480p", "720p"],
          },
        },
      ]);

      const normalizedWan30 = normalized.find((model) => model.id === "alibaba-wan-3.0-video");
      const normalizedSeedance25 = normalized.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");

      expect(normalizedWan30?.capabilities.aspect_ratios).toEqual(["16:9", "9:16", "1:1", "4:3", "3:4"]);
      expect(normalizedWan30?.capabilities.durations).toEqual([2, 10, 30]);
      expect(normalizedWan30?.capabilities.resolutions).toEqual(["720p"]);
      expect(normalizedWan30?.capabilities.max_reference_images).toBe(3);
      expect(normalizedSeedance25?.capabilities.resolutions).toContain("1080p");
    });
  });

  describe("5. Model Branding Normalization & Specs Auto-Detection", () => {
    it("cleans ugly sub-route technical names into pure brand titles", async () => {
      const { cleanModelDisplayName, inferModelCapabilitiesAndSpecs } = await import("@/lib/dynamic-model-loader");

      expect(cleanModelDisplayName("x-ai-grok-imagine-image-v2.0-text-to-image")).toBe("Grok Imagine 2.0");
      expect(cleanModelDisplayName("grok-imagine-image-quality-edit")).toBe("Grok Imagine");
      expect(cleanModelDisplayName("kwaivgi-kling-v3.0-pro-text-to-video")).toBe("Kling 3.0 Pro");
      expect(cleanModelDisplayName("bytedance-seedance-2.5-text-to-video-turbo")).toBe("Seedance 2.5");

      const grokSpecs = inferModelCapabilitiesAndSpecs("x-ai-grok-imagine-image-v2.0-text-to-image");
      expect(grokSpecs.cleanName).toBe("Grok Imagine 2.0");
      expect(grokSpecs.aspectRatios).toContain("19.5:9");
      expect(grokSpecs.aspectRatios).toContain("9:19.5");
      expect(grokSpecs.aspectRatios).toContain("3:2");
      expect(grokSpecs.textRoute).toBe("x-ai/grok-imagine-image-v2.0/text-to-image");
      expect(grokSpecs.imageRoute).toBe("x-ai/grok-imagine-image-v2.0/edit");

      const klingSpecs = inferModelCapabilitiesAndSpecs("kwaivgi-kling-v3.0-pro-text-to-video");
      expect(klingSpecs.cleanName).toBe("Kling 3.0 Pro");
      expect(klingSpecs.modality).toBe("video");
      expect(klingSpecs.textRoute).toBe("kwaivgi/kling-v3.0-pro/text-to-video");
      expect(klingSpecs.imageRoute).toBe("kwaivgi/kling-v3.0-pro/image-to-video");
      expect(klingSpecs.durations).toEqual([5, 10, 15]);

      const wan30Specs = inferModelCapabilitiesAndSpecs("Alibaba Wan 3.0 Image To Video API Documentation");
      expect(wan30Specs.cleanName).toBe("Wan 3.0");
      expect(wan30Specs.modality).toBe("video");
      expect(wan30Specs.textRoute).toBe("alibaba/wan-3.0/text-to-video");
      expect(wan30Specs.imageRoute).toBe("alibaba/wan-3.0/image-to-video");
      expect(wan30Specs.referenceRoute).toBe("alibaba/wan-3.0/reference-to-video");
      expect(wan30Specs.aspectRatios).toEqual(["16:9", "9:16", "1:1", "4:3", "3:4"]);
      expect(wan30Specs.resolutions).toEqual(["480p", "720p", "1080p"]);
      expect(wan30Specs.durations).toContain(30);

      const flux3Specs = inferModelCapabilitiesAndSpecs("Black Forest Labs Flux 3 Text To Video API Documentation");
      expect(flux3Specs.cleanName).toBe("Flux 3");
      expect(flux3Specs.modality).toBe("video");
      expect(flux3Specs.textRoute).toBe("black-forest-labs/flux-3/text-to-video");
      expect(flux3Specs.imageRoute).toBe("black-forest-labs/flux-3/image-to-video");
      expect(flux3Specs.aspectRatios).toEqual(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "2:1"]);
      expect(flux3Specs.resolutions).toEqual(["720p", "1080p"]);
      expect(flux3Specs.durations).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });
  });

  describe("6. FLUX 3 Unified Video Integration & Pricing", () => {
    it("properly resolves Flux 3 source, sub-routes, tariffs, and user credits", async () => {
      const { resolveVideoModelSource } = await import("@/lib/model-source-map");
      const { resolveDynamicVideoSubRoute } = await import("@/lib/dynamic-model-loader");
      const { getVideoCreditsByRoute } = await import("@/lib/credit-pricing");
      const { resolveCanonicalProviderTariff } = await import("@/lib/provider-tariff-registry");
      const { getModelById } = await import("@/lib/video-model-registry");

      const flux3 = getModelById("black-forest-labs-flux-3-video");
      expect(flux3).toBeDefined();
      expect(flux3?.name).toBe("Flux 3");
      expect(flux3?.family).toBe("flux");

      // Source routing
      const textSource = resolveVideoModelSource({ id: "black-forest-labs-flux-3-video", api_route: "black-forest-labs/flux-3/text-to-video" });
      expect(textSource.runtimeSource).toBe("wavespeed");
      expect(textSource.pricingProvider).toBe("wavespeed");

      const extendSource = resolveVideoModelSource({ id: "black-forest-labs-flux-3-video", api_route: "black-forest-labs/flux-3/video-extend" });
      expect(extendSource.runtimeSource).toBe("wavespeed");
      expect(extendSource.pricingProvider).toBe("wavespeed");

      // Sub-route dynamic dispatch
      const model = {
        api_route: "black-forest-labs/flux-3/text-to-video",
        text_api_route: "black-forest-labs/flux-3/text-to-video",
        image_api_route: "black-forest-labs/flux-3/image-to-video",
        reference_api_route: "black-forest-labs/flux-3/image-to-video",
        video_api_route: "black-forest-labs/flux-3/video-extend",
        start_end_api_route: "black-forest-labs/flux-3/start-end-to-video",
      };
      expect(resolveDynamicVideoSubRoute(model, false, false, false, false)).toBe("black-forest-labs/flux-3/text-to-video");
      expect(resolveDynamicVideoSubRoute(model, true, false, false, false)).toBe("black-forest-labs/flux-3/image-to-video");
      expect(resolveDynamicVideoSubRoute(model, true, false, false, true)).toBe("black-forest-labs/flux-3/start-end-to-video");
      expect(resolveDynamicVideoSubRoute(model, false, false, true, false)).toBe("black-forest-labs/flux-3/video-extend");

      // Customer pricing: 720p $0.17/s * 56 = 9.52 cr/s -> 5s = 47.6 cr
      expect(getVideoCreditsByRoute("black-forest-labs/flux-3/text-to-video", { duration: 5, resolution: "720p" })).toBe(47.6);
      // 1080p: $0.29/s * 56 = 16.24 cr/s -> 5s = 81.2 cr
      expect(getVideoCreditsByRoute("black-forest-labs/flux-3/text-to-video", { duration: 5, resolution: "1080p" })).toBe(81.2);
      // Draft / Extend: $0.06/s * 56 = 3.36 cr/s -> 5s = 16.8 cr
      expect(getVideoCreditsByRoute("black-forest-labs/flux-3/video-extend", { duration: 5 })).toBe(16.8);

      // Provider tariff
      const tariff720p = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "black-forest-labs/flux-3/text-to-video",
        durationSec: 5,
        resolution: "720p",
      });
      expect(tariff720p.usd).toBe(0.85);

      const tariff1080p = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "black-forest-labs/flux-3/text-to-video",
        durationSec: 5,
        resolution: "1080p",
      });
      expect(tariff1080p.usd).toBe(1.45);
    });
  });
});

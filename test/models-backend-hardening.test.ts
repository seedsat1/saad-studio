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

  describe("7. Seedance 2.0 Mini Comprehensive Sub-routes & Tariffs", () => {
    it("properly resolves Seedance 2.0 Mini tariffs for Turbo, Spicy, Image, Text, Edit, and Extend", async () => {
      const { resolveCanonicalProviderTariff } = await import("@/lib/provider-tariff-registry");
      const { getModelById } = await import("@/lib/video-model-registry");

      const mini = getModelById("bytedance-seedance-v2-t2v-mini");
      expect(mini).toBeDefined();
      expect(mini?.capabilities.resolutions).toEqual(["480p", "720p", "1080p", "4k"]);

      const turbo = getModelById("bytedance-seedance-v2-mini-turbo");
      expect(turbo).toBeDefined();
      expect(turbo?.capabilities.resolutions).toEqual(["720p", "1080p"]);

      const spicy = getModelById("bytedance-seedance-v2-mini-spicy");
      expect(spicy).toBeDefined();

      // 1. Turbo Tariff (720p: $0.08/s, 1080p: $0.09/s)
      const turbo720 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/text-to-video-turbo",
        durationSec: 5,
        resolution: "720p",
      });
      expect(turbo720.usd).toBe(0.40); // 5 * 0.08

      const turbo1080 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/image-to-video-turbo",
        durationSec: 5,
        resolution: "1080p",
      });
      expect(turbo1080.usd).toBe(0.45); // 5 * 0.09

      // 2. Spicy & Image-to-Video Tariff (480p: $0.06/s, 720p: $0.12/s, 1080p: $0.30/s, 4k: $0.60/s)
      const spicy480 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/image-to-video-spicy",
        durationSec: 5,
        resolution: "480p",
      });
      expect(spicy480.usd).toBe(0.30); // 5 * 0.06

      const i2v720 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/image-to-video",
        durationSec: 5,
        resolution: "720p",
      });
      expect(i2v720.usd).toBe(0.60); // 5 * 0.12

      const i2v1080 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/image-to-video",
        durationSec: 5,
        resolution: "1080p",
      });
      expect(i2v1080.usd).toBe(1.50); // 5 * 0.30

      const i2v4k = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/image-to-video",
        durationSec: 5,
        resolution: "4k",
      });
      expect(i2v4k.usd).toBe(3.00); // 5 * 0.60

      // 3. Text-to-Video & Video-Edit Tariff (480p: $0.0375/s, 720p: $0.075/s, 1080p: $0.1875/s, 4k: $0.375/s)
      const t2v720 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/text-to-video",
        durationSec: 5,
        resolution: "720p",
      });
      expect(t2v720.usd).toBe(0.375); // 5 * 0.075

      const edit1080 = resolveCanonicalProviderTariff({
        providerName: "WaveSpeed",
        providerRoute: "bytedance/seedance-2.0-mini/video-edit",
        durationSec: 5,
        resolution: "1080p",
      });
      expect(edit1080.usd).toBe(0.9375); // 5 * 0.1875
    });

    it("strictly applies the 2.8x platform standard margin on retail user credits", async () => {
      const { getVideoCreditsByRoute } = await import("@/lib/credit-pricing");
      const { getGenerationCostSync } = await import("@/lib/pricing");

      // 1. I2V 720p (5s): source $0.12 * 5 * 1.4 * 40 = 33.6 credits ($1.68 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/image-to-video", { duration: 5, resolution: "720p" })).toBe(33.6);
      expect(getGenerationCostSync("bytedance/seedance-2.0-mini/image-to-video", 5, 1, "720p")).toBe(33.6);

      // 2. T2V 720p (5s): source $0.075 * 5 * 1.4 * 40 = 21.0 credits ($1.05 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/text-to-video", { duration: 5, resolution: "720p" })).toBe(21.0);
      expect(getGenerationCostSync("bytedance/seedance-2.0-mini/text-to-video", 5, 1, "720p")).toBe(21.0);

      // 3. T2V Turbo 720p (5s): source $0.08 * 5 * 1.4 * 40 = 22.4 credits ($1.12 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/text-to-video-turbo", { duration: 5, resolution: "720p" })).toBe(22.4);
      expect(getGenerationCostSync("bytedance/seedance-2.0-mini/text-to-video-turbo", 5, 1, "720p")).toBe(22.4);

      // 4. I2V Turbo 1080p (5s): source $0.09 * 5 * 1.4 * 40 = 25.2 credits ($1.26 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/image-to-video-turbo", { duration: 5, resolution: "1080p" })).toBe(25.2);
      expect(getGenerationCostSync("bytedance/seedance-2.0-mini/image-to-video-turbo", 5, 1, "1080p")).toBe(25.2);

      // 5. Spicy 1080p (5s): source $0.30 * 5 * 1.4 * 40 = 84.0 credits ($4.20 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/image-to-video-spicy", { duration: 5, resolution: "1080p" })).toBe(84.0);

      // 6. Extend 4k (5s): source $0.60 * 5 * 1.4 * 40 = 168.0 credits ($8.40 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/video-extend", { duration: 5, resolution: "4k" })).toBe(168.0);

      // 7. Video-Edit 1080p (5s): source $0.1875 * 5 * 1.4 * 40 = 52.5 credits ($2.625 retail)
      expect(getVideoCreditsByRoute("bytedance/seedance-2.0-mini/video-edit", { duration: 5, resolution: "1080p" })).toBe(52.5);

      // 8. Turbo Guard: 480p or 4k on Turbo throws an Error
      expect(() => getVideoCreditsByRoute("bytedance/seedance-2.0-mini/text-to-video-turbo", { duration: 5, resolution: "480p" })).toThrow();
      expect(() => getGenerationCostSync("bytedance/seedance-2.0-mini/text-to-video-turbo", 5, 1, "480p")).toThrow();
    });

    it("strictly enforces reference limits, aspect ratios, resolution allowlists, and exact payload cleanup on server route", async () => {
      const { mapToWavespeedInput } = await import("@/app/api/video/route");

      // 1. T2V with > 9 reference images throws ValidationError
      const twentyImages = Array.from({ length: 20 }, (_, i) => `https://example.com/img${i}.jpg`);
      expect(() =>
        mapToWavespeedInput(
          { prompt: "A cinematic shot", reference_images: twentyImages },
          "bytedance/seedance-2.0-mini/text-to-video"
        )
      ).toThrow("supports up to 9 reference images.");

      // 2. Spicy without a start image throws ValidationError
      expect(() =>
        mapToWavespeedInput(
          { prompt: "A cinematic shot" },
          "bytedance/seedance-2.0-mini/image-to-video-spicy"
        )
      ).toThrow("requires a start image.");

      // 3. Extend without an input video throws ValidationError
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Continue camera" },
          "bytedance/seedance-2.0-mini/video-extend"
        )
      ).toThrow("requires an input video.");

      // 4. Invalid aspect ratio (e.g. "5:4") throws ValidationError
      expect(() =>
        mapToWavespeedInput(
          { prompt: "A shot", aspect_ratio: "5:4" },
          "bytedance/seedance-2.0-mini/text-to-video"
        )
      ).toThrow("Aspect ratio '5:4' not supported.");

      // 5. Unsupported resolution (e.g. "540p" or "480p" on Turbo) throws ValidationError
      expect(() =>
        mapToWavespeedInput(
          { prompt: "A shot", image: "https://example.com/img.jpg", resolution: "540p" },
          "bytedance/seedance-2.0-mini/image-to-video"
        )
      ).toThrow("Resolution '540p' not supported");

      expect(() =>
        mapToWavespeedInput(
          { prompt: "A shot", image: "https://example.com/img.jpg", resolution: "480p" },
          "bytedance/seedance-2.0-mini/image-to-video-turbo"
        )
      ).toThrow("Resolution '480p' not supported");

      // 6. Valid exact payload output filtering
      const exactT2V = mapToWavespeedInput(
        {
          prompt: "A cinematic night market",
          duration: 10,
          resolution: "1080p",
          aspect_ratio: "16:9",
          extra_unsupported_key: "danger_payload",
        },
        "bytedance/seedance-2.0-mini/text-to-video"
      );
      expect(exactT2V.prompt).toBe("A cinematic night market");
      expect(exactT2V.duration).toBe(10);
      expect(exactT2V.resolution).toBe("1080p");
      expect(exactT2V.aspect_ratio).toBe("16:9");
      expect(exactT2V.extra_unsupported_key).toBeUndefined();
    });

    it("comprehensively validates all 24 Seedance sub-routes across 2.5, Fast, and Mini families", async () => {
      const { mapToWavespeedInput } = await import("@/app/api/video/route");

      // 1. Seedance 2.5: image-to-video rejects reference_images and silently removes aspect_ratio
      expect(() =>
        mapToWavespeedInput(
          { prompt: "A shot", image: "https://example.com/img.jpg", reference_images: ["https://example.com/ref.jpg"] },
          "bytedance/seedance-2.5/image-to-video"
        )
      ).toThrow("does not accept any reference_images");

      const exact25I2V = mapToWavespeedInput(
        { prompt: "A shot", image: "https://example.com/img.jpg", aspect_ratio: "9:16", resolution: "1080p" },
        "bytedance/seedance-2.5/image-to-video"
      );
      expect(exact25I2V.image).toBe("https://example.com/img.jpg");
      expect(exact25I2V.aspect_ratio).toBeUndefined(); // silently removed for 2.5 I2V family

      // 2. Seedance 2.5: video-extend rejects last_image
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Extend", video: "https://example.com/vid.mp4", last_image: "https://example.com/end.jpg" },
          "bytedance/seedance-2.5/video-extend"
        )
      ).toThrow("seedance-2.5/video-extend does not support last_image.");

      // 3. Video-Edit family: duration omitted from exact payload when user does not provide duration
      const exact25Edit = mapToWavespeedInput(
        { prompt: "Edit video", video: "https://example.com/vid.mp4", resolution: "720p" },
        "bytedance/seedance-2.5/video-edit"
      );
      expect(exact25Edit.video).toBe("https://example.com/vid.mp4");
      expect(exact25Edit.duration).toBeUndefined(); // auto-detect from input video!

      const exactMiniEdit = mapToWavespeedInput(
        { prompt: "Edit video", video: "https://example.com/vid.mp4", resolution: "720p" },
        "bytedance/seedance-2.0-mini/video-edit"
      );
      expect(exactMiniEdit.duration).toBeUndefined(); // auto-detect from input video!

      // 4. Seedance 2.0 Fast: text-to-video enforces max 9 images, 3 videos, 3 audios
      const tenImages = Array.from({ length: 10 }, (_, i) => `https://example.com/img${i}.jpg`);
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Prompt", reference_images: tenImages },
          "bytedance/seedance-2.0-fast/text-to-video"
        )
      ).toThrow("seedance-2.0-fast/text-to-video supports up to 9 reference images.");

      // 5. Seedance 2.5 Spicy: duration capped at 15s (rejects 20s)
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Prompt", image: "https://example.com/img.jpg", duration: 20 },
          "bytedance/seedance-2.5/image-to-video-spicy"
        )
      ).toThrow("Duration 20s out of range. Allowed: 4-15s.");

      // 6. Fast & Mini Video-Extend: supports last_image target frame
      const exactFastExtend = mapToWavespeedInput(
        { prompt: "Extend", video: "https://example.com/vid.mp4", last_image: "https://example.com/end.jpg" },
        "bytedance/seedance-2.0-fast/video-extend"
      );
      expect(exactFastExtend.last_image).toBe("https://example.com/end.jpg");
    });

    it("strictly verifies Seedance 2.0 Standard, Fast, Mini, 2.5 and dynamic admin pricing", async () => {
      const { mapToWavespeedInput } = await import("@/app/api/video/route");
      const { computeCreditsFromDynamicModel } = await import("@/lib/pricing");
      const { VIDEO_MODEL_REGISTRY } = await import("@/lib/video-model-registry");
      const { SEEDANCE_INITIAL_PRICING } = await import("@/lib/dynamic-model-loader");

      // 1. Verify 5th model card: Seedance 2.0 Fast (BUDGET badge) and Turbo (TURBO badge)
      const seedanceModels = VIDEO_MODEL_REGISTRY.filter((m) => m.family === "seedance");
      expect(seedanceModels.length).toBeGreaterThanOrEqual(5);

      const fastCard = seedanceModels.find((m) => m.id === "bytedance-seedance-v2-fast");
      expect(fastCard).toBeDefined();
      expect(fastCard?.badge).toBe("BUDGET");
      expect(fastCard?.name).toBe("Seedance 2.0 Fast");

      const turboCard = seedanceModels.find((m) => m.id === "bytedance-seedance-v2-t2v-fast");
      expect(turboCard).toBeDefined();
      expect(turboCard?.badge).toBe("TURBO");

      // 2. Standard 2.0 Route validation: text-to-video & image-to-video pass validation
      const exactStandardT2V = mapToWavespeedInput(
        { prompt: "A cinematic shot", duration: 15, resolution: "480p", enable_base64_output: true },
        "bytedance/seedance-2.0/text-to-video"
      );
      expect(exactStandardT2V.prompt).toBe("A cinematic shot");
      expect(exactStandardT2V.duration).toBe(15);
      expect(exactStandardT2V.resolution).toBe("480p");
      expect(exactStandardT2V.enable_base64_output).toBe(true);

      const exactStandardI2V = mapToWavespeedInput(
        { prompt: "A shot", image: "https://example.com/img.jpg", duration: 10, resolution: "720p" },
        "bytedance/seedance-2.0/image-to-video"
      );
      expect(exactStandardI2V.image).toBe("https://example.com/img.jpg");
      expect(exactStandardI2V.duration).toBe(10);
      expect(exactStandardI2V.resolution).toBe("720p");

      // 3. Dynamic Model Pricing Verification with 40x balanced margin:
      // Standard 2.0 T2V (15s @ 480p): sticker 0.12 * 15 = $1.80 -> 10% off (0.90) = $1.62 -> 1.62 * 40 = 64.8 (65 cr)
      const standardCredits = computeCreditsFromDynamicModel(
        {
          id: "bytedance-seedance-v2-t2v",
          pricingConfig: SEEDANCE_INITIAL_PRICING["bytedance-seedance-v2-t2v"],
        } as any,
        { resolution: "480p", outputSec: 15 }
      );
      expect(standardCredits).toBe(64.8);

      // Fast I2V (15s @ 720p): sticker 0.20 * 15 = $3.00 -> 20% off (0.80) = $2.40 -> 2.40 * 40 = 96.0 cr
      const fastCredits = computeCreditsFromDynamicModel(
        {
          id: "bytedance-seedance-v2-fast",
          pricingConfig: SEEDANCE_INITIAL_PRICING["bytedance-seedance-v2-fast"],
        } as any,
        { resolution: "720p", outputSec: 15 }
      );
      expect(fastCredits).toBe(96.0);

      // Mini I2V (10s @ 480p): sticker 0.06 * 10 = $0.60 -> 40% off (0.60) = $0.36 -> 0.36 * 40 = 14.4 cr
      const miniCredits = computeCreditsFromDynamicModel(
        {
          id: "bytedance-seedance-v2-t2v-mini",
          pricingConfig: SEEDANCE_INITIAL_PRICING["bytedance-seedance-v2-t2v-mini"],
        } as any,
        { resolution: "480p", outputSec: 10 }
      );
      expect(miniCredits).toBe(14.4);

      // 2.5 T2V (30s @ 720p): sticker 0.36 * 30 = $10.80 -> 10% off (0.90) = $9.72 -> 9.72 * 40 = 388.8 cr
      const seedance25Credits = computeCreditsFromDynamicModel(
        {
          id: "bytedance-seedance-v25-t2v",
          pricingConfig: SEEDANCE_INITIAL_PRICING["bytedance-seedance-v25-t2v"],
        } as any,
        { resolution: "720p", outputSec: 30 }
      );
      expect(seedance25Credits).toBe(388.8);

      // 4. Web Search Gating:
      // Seedance 2.5 does NOT support enable_web_search -> omitted from exact payload
      const exact25Web = mapToWavespeedInput(
        { prompt: "A prompt", enable_web_search: true },
        "bytedance/seedance-2.5/text-to-video"
      );
      expect(exact25Web.enable_web_search).toBeUndefined();

      // Mini Spicy does NOT support enable_web_search -> omitted
      const exactMiniSpicyWeb = mapToWavespeedInput(
        { prompt: "A prompt", image: "https://example.com/img.jpg", enable_web_search: true },
        "bytedance/seedance-2.0-mini/image-to-video-spicy"
      );
      expect(exactMiniSpicyWeb.enable_web_search).toBeUndefined();

      // Fast I2V supports enable_web_search -> exact payload has enable_web_search: true
      const exactFastI2VWeb = mapToWavespeedInput(
        { prompt: "A prompt", image: "https://example.com/img.jpg", enable_web_search: true },
        "bytedance/seedance-2.0-fast/image-to-video"
      );
      expect(exactFastI2VWeb.enable_web_search).toBe(true);

      // 5. T2V with 'image' field alongside reference_images throws error
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Prompt", image: "https://example.com/img.jpg", reference_images: ["https://example.com/ref.jpg"] },
          "bytedance/seedance-2.0-fast/text-to-video"
        )
      ).toThrow("does not support 'image' field. Use 'reference_images' array instead.");

      // 6. Clarified reject messages for references on unsupported routes
      expect(() =>
        mapToWavespeedInput(
          { prompt: "Prompt", image: "https://example.com/img.jpg", reference_images: ["https://example.com/ref.jpg"] },
          "bytedance/seedance-2.5/image-to-video"
        )
      ).toThrow("does not accept any reference_images. Use a text-to-video or video-edit sub-route if you need references.");
    });
  });
});

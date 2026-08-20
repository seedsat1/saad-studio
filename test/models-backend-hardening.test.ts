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
    });
  });
});

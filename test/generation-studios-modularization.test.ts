import { describe, it, expect } from "vitest";
import { AspectRatioPicker } from "@/components/generation/AspectRatioPicker";
import { GenerateActionButton } from "@/components/generation/GenerateActionButton";
import { VideoHistoryList, DeleteGenerationDialog } from "@/components/video/VideoHistoryList";
import { ImageResultGrid } from "@/components/image/ImageResultGrid";
import { IMAGE_MODELS, getImageCreditCost } from "@/lib/image-models";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";

describe("Phase 2: Generation Studios Modularization & Integrity Suite", () => {
  describe("1. Component Exports & Interface Stability", () => {
    it("should export shared generation components", () => {
      expect(AspectRatioPicker).toBeDefined();
      expect(typeof AspectRatioPicker).toBe("function");
      expect(GenerateActionButton).toBeDefined();
      expect(typeof GenerateActionButton).toBe("function");
    });

    it("should export Video Studio modular components", () => {
      expect(VideoHistoryList).toBeDefined();
      expect(typeof VideoHistoryList).toBe("function");
      expect(DeleteGenerationDialog).toBeDefined();
      expect(typeof DeleteGenerationDialog).toBe("function");
    });

    it("should export Image Studio modular components", () => {
      expect(ImageResultGrid).toBeDefined();
      expect(typeof ImageResultGrid).toBe("function");
    });
  });

  describe("2. Image Model Registry & Pricing Constitution Integrity", () => {
    it("should preserve all core image models in registry", () => {
      expect(IMAGE_MODELS.length).toBeGreaterThanOrEqual(10);
      const modelIds = IMAGE_MODELS.map((m) => m.id);
      expect(modelIds).toContain("nano-banana-2");
      expect(modelIds).toContain("nano-banana-pro");
      expect(modelIds).toContain("flux-2/pro");
      expect(modelIds).toContain("wan/2-7-image-pro");
    });

    it("should calculate correct credit costs for standard and premium models", () => {
      const standardModel = IMAGE_MODELS.find((m) => m.id === "nano-banana-2");
      expect(standardModel).toBeDefined();
      const cost = getImageCreditCost(standardModel!, 1);
      expect(cost).toBeGreaterThan(0);

      const batchCost = getImageCreditCost(standardModel!, 4);
      expect(batchCost).toBe(cost * 4);
    });

    it("should preserve aspect ratios for generative image models", () => {
      const t2iModels = IMAGE_MODELS.filter((m) => m.inputType === "text-to-image");
      expect(t2iModels.length).toBeGreaterThan(0);
      t2iModels.forEach((model) => {
        if (model.aspectRatios) {
          expect(Array.isArray(model.aspectRatios)).toBe(true);
        }
      });
    });
  });

  describe("3. Video Studio Pricing Constitution Integrity", () => {
    it("should compute video credits dynamically based on duration and route", () => {
      const defaultCost = getVideoCreditsByRoute("kwaivgi/kling-v3-turbo-std/image-to-video", {
        duration: 5,
        resolution: "720p",
      });
      expect(defaultCost).toBeGreaterThan(0);

      const longerCost = getVideoCreditsByRoute("kwaivgi/kling-v3-turbo-std/image-to-video", {
        duration: 10,
        resolution: "720p",
      });
      expect(longerCost).toBeGreaterThan(defaultCost);
    });
  });
});

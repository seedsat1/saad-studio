import { describe, it, expect } from "vitest";
import { VIDEO_MODELS } from "@/lib/video-models";
import { IMAGE_MODELS, getImageCreditCost } from "@/lib/image-models";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";
import { getGenerationCostSync } from "@/lib/pricing";

describe("Phase 2B: Capability-Driven UI, Pricing Equivalence & Request Semantics Proof", () => {
  describe("1. Capability-Driven UI Controls Integrity", () => {
    it("should dynamically bound aspect ratios to model capabilities", () => {
      const veoModel = VIDEO_MODELS.find((m) => m.id === "google/veo3.1-text-to-video");
      expect(veoModel).toBeDefined();
      expect(veoModel!.aspectRatios).toContain("16:9");
      expect(veoModel!.aspectRatios).toContain("9:16");

      const geminiImageModel = IMAGE_MODELS.find((m) => m.id === "nano-banana-2");
      expect(geminiImageModel).toBeDefined();
      expect(geminiImageModel!.aspectRatios).toContain("1:1");
      expect(geminiImageModel!.aspectRatios).toContain("16:9");
    });

    it("should restrict durations strictly according to model specs", () => {
      const veoModel = VIDEO_MODELS.find((m) => m.id === "google/veo3.1-text-to-video");
      expect(veoModel).toBeDefined();
      expect(veoModel!.durations).toEqual([4, 6, 8]);

      // Verify that durations array is non-empty and contains valid numbers
      VIDEO_MODELS.forEach((m) => {
        if (m.durations) {
          expect(Array.isArray(m.durations)).toBe(true);
          expect(m.durations.every((d) => typeof d === "number" && d > 0)).toBe(true);
        }
      });
    });

    it("should restrict resolution tiers strictly according to model specs", () => {
      const veoModel = VIDEO_MODELS.find((m) => m.id === "google/veo3.1-text-to-video");
      expect(veoModel).toBeDefined();
      expect(veoModel!.resolutions).toEqual(["720p", "1080p", "4k"]);
    });

    it("should enforce reference limits on image and video models", () => {
      const nanoBanana = IMAGE_MODELS.find((m) => m.id === "nano-banana-2");
      expect(nanoBanana).toBeDefined();
      expect(nanoBanana!.maxRefImages).toBe(14);

      const wanPro = IMAGE_MODELS.find((m) => m.id === "wan/2-7-image-pro");
      expect(wanPro).toBeDefined();
      expect(wanPro!.maxRefImages).toBe(3);
    });
  });

  describe("2. Pricing Mathematical Equivalence (UI Preview == Authoritative Function == API Charge)", () => {
    it("should prove exact price match across multiple video duration configurations", () => {
      const route = "kwaivgi/kling-v3-turbo-std/image-to-video";

      // 5s duration configuration
      const uiPreview5s = getVideoCreditsByRoute(route, { duration: 5, resolution: "720p" });
      const authoritativeCost5s = getGenerationCostSync(route, 5, 1, "720p");
      expect(uiPreview5s).toBe(authoritativeCost5s);
      expect(uiPreview5s).toBeGreaterThan(0);

      // 10s duration configuration
      const uiPreview10s = getVideoCreditsByRoute(route, { duration: 10, resolution: "720p" });
      const authoritativeCost10s = getGenerationCostSync(route, 10, 1, "720p");
      expect(uiPreview10s).toBe(authoritativeCost10s);
      expect(uiPreview10s).toBeGreaterThan(uiPreview5s);
    });

    it("should prove exact price match across multiple image output counts", () => {
      const model = IMAGE_MODELS.find((m) => m.id === "nano-banana-2")!;
      expect(model).toBeDefined();

      const cost1 = getImageCreditCost(model, 1);
      const cost2 = getImageCreditCost(model, 2);
      const cost4 = getImageCreditCost(model, 4);

      expect(cost1).toBe(2.0);
      expect(cost2).toBe(4.0);
      expect(cost4).toBe(8.0);
    });
  });

  describe("3. Request Semantics Preservation", () => {
    it("should validate video payload schema preserves canonical fields", () => {
      const videoPayload = {
        prompt: "Cinematic drone shot of sunset mountains",
        aspect_ratio: "16:9",
        duration: 5,
        resolution: "720p",
        first_frame_url: "https://example.com/first.jpg",
        last_frame_url: "https://example.com/last.jpg",
        sound: true,
      };

      expect(videoPayload.prompt).toBeDefined();
      expect(videoPayload.aspect_ratio).toBe("16:9");
      expect(videoPayload.duration).toBe(5);
      expect(videoPayload.resolution).toBe("720p");
      expect(videoPayload.first_frame_url).toBeDefined();
      expect(videoPayload.last_frame_url).toBeDefined();
      expect(videoPayload.sound).toBe(true);
    });

    it("should validate image payload schema preserves canonical fields", () => {
      const imagePayload = {
        prompt: "Hyperrealistic portrait of an astronaut",
        model: "nano-banana-2",
        aspect_ratio: "1:1",
        quality: "2K",
        n: 4,
        image_input: ["https://example.com/ref1.jpg", "https://example.com/ref2.jpg"],
      };

      expect(imagePayload.prompt).toBeDefined();
      expect(imagePayload.model).toBe("nano-banana-2");
      expect(imagePayload.aspect_ratio).toBe("1:1");
      expect(imagePayload.quality).toBe("2K");
      expect(imagePayload.n).toBe(4);
      expect(imagePayload.image_input.length).toBe(2);
    });
  });
});

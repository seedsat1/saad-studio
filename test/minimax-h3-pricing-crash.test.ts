import { describe, it, expect } from "vitest";
import { getGenerationCostSync } from "@/lib/pricing";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";

/**
 * The minimax_h3 branch of resolveModelUserCharge read an undeclared `q`.
 * The t2v and i2v routes registered in lib/video-model-registry.ts are not in
 * MODEL_ALIAS_MAP, so they fell past resolveSpecialUserCharge and into that
 * branch, throwing "q is not defined" at pricing time.
 */
describe("Minimax H3 pricing", () => {
  const routes = [
    "minimax_h3",
    "minimax-h3",
    "minimax/h3/text-to-video",
    "minimax/h3/image-to-video",
    "minimax/h3/reference-to-video",
    "wavespeed-ai/minimax-h3/text-to-video",
    "wavespeed-ai/minimax-h3/image-to-video",
    "wavespeed-ai/minimax-h3/reference-to-video",
  ];

  it("prices every registered H3 route without throwing", () => {
    for (const ref of routes) {
      expect(() => getGenerationCostSync(ref, 6, 1, "2k"), ref).not.toThrow();
    }
  });

  it("uses the same official H3 rate table for text, image, and reference routes", () => {
    const text = getGenerationCostSync("minimax/h3/text-to-video", 6, 1, "2k");
    const image = getGenerationCostSync("minimax/h3/image-to-video", 6, 1, "2k");
    const reference = getGenerationCostSync("minimax/h3/reference-to-video", 6, 1, "2k");
    expect(text).toBe(47.04);
    expect(image).toBe(text);
    expect(reference).toBe(text);
  });

  it("separates the 2K and 768p tiers", () => {
    const hi = getGenerationCostSync("minimax/h3/text-to-video", 6, 1, "2k");
    const lo = getGenerationCostSync("minimax/h3/text-to-video", 6, 1, "768p");
    expect(hi).toBeGreaterThan(lo);
  });

  it("adds reference video seconds for WaveSpeed H3 reference-to-video billing", () => {
    expect(
      getVideoCreditsByRoute("minimax/h3/reference-to-video", {
        duration: 5,
        resolution: "768p",
        reference_video_durations: [5, 5, 5],
      }),
    ).toBe(112);
  });
});

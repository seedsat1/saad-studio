import { describe, it, expect } from "vitest";
import { getGenerationCostSync } from "@/lib/pricing";

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
  ];

  it("prices every registered H3 route without throwing", () => {
    for (const ref of routes) {
      expect(() => getGenerationCostSync(ref, 6, 1, "2k"), ref).not.toThrow();
    }
  });

  it("charges the same for every H3 route", () => {
    const costs = routes.map((ref) => getGenerationCostSync(ref, 6, 1, "2k"));
    expect(costs.every((c) => c > 0)).toBe(true);
    expect(new Set(costs).size).toBe(1);
  });

  it("still separates the 2k and 768p tiers", () => {
    const hi = getGenerationCostSync("minimax/h3/text-to-video", 6, 1, "2k");
    const lo = getGenerationCostSync("minimax/h3/text-to-video", 6, 1, "768p");
    expect(hi).toBeGreaterThan(lo);
  });
});

import { describe, it, expect } from "vitest";
import { getGenerationCost } from "@/lib/pricing";
import { getVideoCreditsByRouteAsync } from "@/lib/credit-pricing";

/**
 * Provider costs measured from real WaveSpeed invoices, not estimated:
 *   kling-v3-turbo-std/image-to-video  10s = $1.064, 15s = $1.596  -> $0.1064/s
 *   kling-v2.6-pro/image-to-video      10s = $0.665                -> $0.0665/s
 *
 * Kling v3 Turbo used to charge 1.19 cr/s against an assumed $0.02128/s, five
 * times under the real price, so every generation sold below cost. These tests
 * pin the rates to the cheapest credit a subscriber can hold, so a future edit
 * cannot quietly put the model back under water.
 */
const USD_PER_CREDIT = {
  Try: 5 / 70,
  Starter: 15 / 300,
  Plus: 35 / 800,
  Pro: 70 / 1800,
  Max: 99 / 2700, // cheapest credit sold, so the tightest margin
} as const;

const CASES = [
  { route: "kwaivgi/kling-v3-turbo-std/image-to-video", quality: "std", seconds: 10, providerUsd: 1.064 },
  { route: "kwaivgi/kling-v3-turbo-std/image-to-video", quality: "std", seconds: 15, providerUsd: 1.596 },
  { route: "kwaivgi/kling-v2.6-pro/image-to-video", quality: "pro", seconds: 10, providerUsd: 0.665 },
] as const;

describe("Kling pricing covers the measured provider cost", () => {
  it.each(CASES)("$route $seconds s never sells below cost on any plan", async (c) => {
    const credits = await getGenerationCost(c.route, c.seconds, 1, c.quality);
    for (const [plan, usd] of Object.entries(USD_PER_CREDIT)) {
      const revenue = credits * usd;
      expect(revenue, `${plan} plan`).toBeGreaterThan(c.providerUsd);
    }
  });

  it.each(CASES)("$route $seconds s keeps at least a 1.2x margin on the cheapest credit", async (c) => {
    const credits = await getGenerationCost(c.route, c.seconds, 1, c.quality);
    const margin = (credits * USD_PER_CREDIT.Max) / c.providerUsd;
    expect(margin).toBeGreaterThanOrEqual(1.2);
  });

  it.each(CASES)("$route $seconds s charges the same through both pricing paths", async (c) => {
    const a = await getGenerationCost(c.route, c.seconds, 1, c.quality);
    const b = await getVideoCreditsByRouteAsync(c.route, { duration: c.seconds, quality: c.quality } as any);
    expect(b).toBe(a);
  });

  it("charges 3.5 credits per second for Kling v3 Turbo std", async () => {
    expect(await getGenerationCost("kwaivgi/kling-v3-turbo-std/image-to-video", 10, 1, "std")).toBe(35);
    expect(await getGenerationCost("kwaivgi/kling-v3-turbo-std/image-to-video", 5, 1, "std")).toBe(17.5);
  });

  it("charges more for the Pro route than the Std route", async () => {
    const std = await getGenerationCost("kwaivgi/kling-v3-turbo-std/image-to-video", 10, 1, "std");
    const pro = await getGenerationCost("kwaivgi/kling-v3-turbo-pro/image-to-video", 10, 1, "pro");
    expect(pro).toBeGreaterThan(std);
  });
});

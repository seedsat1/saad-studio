import { describe, expect, it } from "vitest";
import { getGenerationCost, getGenerationCostSync, loadModels, estimateProviderCostSync } from "@/lib/pricing";
import { DEFAULT_MODELS, SAAD_PRICING_MODELS, SAAD_PLANS, calcUserCredits } from "@/lib/pricing-models";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";

describe("Pricing Reality & Constitution Deep Audit (Read-Only)", () => {
  it("verifies provider independence: user credit price is identical regardless of route", async () => {
    const models = await loadModels();
    expect(models.length).toBeGreaterThan(50);

    // Kling video test across various aliases
    const costDirect = await getGenerationCost("kling25t", 5, 1, "std");
    const costAlias1 = await getGenerationCost("kling/v2-5-turbo-text-to-video-pro", 5, 1, "std");
    const costAlias2 = await getGenerationCost("kwaivgi/kling-v2.6-std/text-to-video", 5, 1, "std");

    expect(costDirect).toBeGreaterThan(0);
    expect(costAlias1).toBe(costDirect);
    expect(costAlias2).toBe(costDirect);
  }, 20000);

  it("verifies duration pricing logic: per-second vs flat billing", async () => {
    // Per-second video model
    const cost5s = await getGenerationCost("kling25t", 5, 1, "720p");
    const cost10s = await getGenerationCost("kling25t", 10, 1, "720p");
    expect(cost10s).toBe(cost5s * 2);

    // Flat billing image model
    const imgCost5s = await getGenerationCost("nano-banana-pro", 5, 1);
    const imgCost10s = await getGenerationCost("nano-banana-pro", 10, 1);
    expect(imgCost5s).toBe(imgCost10s); // Duration is ignored for flat billing
  });

  it("verifies resolution / quality multipliers", async () => {
    const costStd = await getGenerationCost("kling25t", 5, 1, "std");
    const costPro = await getGenerationCost("kling25t", 5, 1, "pro");

    // Pro is 1.5x multiplier: 7.5 * 1.5 = 11.25 credits
    expect(costPro).toBe(parseFloat((costStd * 1.5).toFixed(2)));
  });

  it("measures pricing payload and database consistency", async () => {
    const models = await loadModels();
    const jsonStr = JSON.stringify(models);
    const byteLength = Buffer.byteLength(jsonStr, "utf-8");

    console.log(`[MEASUREMENT] Pricing Constitution Models: ${models.length} entries, payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB)`);
    expect(models.length).toBeGreaterThanOrEqual(50);
  }, 20000);
});

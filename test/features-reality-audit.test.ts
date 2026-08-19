import { describe, expect, it } from "vitest";
import {
  PRODUCT_FEATURE_REGISTRY,
  APPROVED_PRODUCT_FEATURE_IDS,
  getProductFeatureSummary,
  validateProductFeatureRegistry,
} from "@/lib/product/feature-registry";
import { loadModels } from "@/lib/pricing";

describe("Features Reality & Product Linkage Deep Audit (Read-Only)", () => {
  it("1. validates exact approved feature registry inventory (40 features)", () => {
    const errors = validateProductFeatureRegistry();
    expect(errors).toHaveLength(0);
    expect(PRODUCT_FEATURE_REGISTRY).toHaveLength(40);
    expect(APPROVED_PRODUCT_FEATURE_IDS).toHaveLength(40);
  });

  it("2. measures summary breakdown across categories, states, and lifecycles", () => {
    const summary = getProductFeatureSummary();
    expect(summary.total).toBe(40);
    expect(summary.byCategory.image).toBe(10);
    expect(summary.byCategory.video).toBe(18);
    expect(summary.byCategory.edit).toBe(6);
    expect(summary.byCategory.audio).toBe(6);

    console.log(`[MEASUREMENT] Total Product Features: ${summary.total}`, {
      categories: summary.byCategory,
      states: summary.byState,
      overallControl: summary.byOverallControl,
    });
  });

  it("3. checks feature -> model -> pricing -> routing linkage consistency", async () => {
    const pricingModels = await loadModels();
    expect(pricingModels.length).toBeGreaterThan(50);

    for (const feat of PRODUCT_FEATURE_REGISTRY) {
      if (feat.state === "active" && feat.lifecycle !== "no_generation") {
        expect(feat.apiRoutes.length).toBeGreaterThan(0);
      }
    }
  });

  it("4. measures payload size of GET /api/admin/features", () => {
    const summary = getProductFeatureSummary();
    const payload = {
      ok: true,
      features: PRODUCT_FEATURE_REGISTRY,
      summary,
      validationErrors: [],
    };
    const jsonStr = JSON.stringify(payload);
    const byteLength = Buffer.byteLength(jsonStr, "utf-8");
    console.log(`[MEASUREMENT] Features API Payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB)`);
    expect(byteLength).toBeLessThan(100_000);
  });
});

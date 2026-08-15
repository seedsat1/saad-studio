import { describe, expect, it } from "vitest";

import {
  GENERATION_LIFECYCLE_CONTRACTS,
  GENERATION_LIFECYCLE_TYPES,
  PRODUCT_FEATURE_LIFECYCLE_CONTRACT_BY_ID,
  getProductFeatureLifecycleContract,
} from "@/lib/generation/lifecycle-contract";

describe("generation lifecycle contract", () => {
  it("uses only approved lifecycle types", () => {
    for (const contract of Object.values(GENERATION_LIFECYCLE_CONTRACTS)) {
      expect(GENERATION_LIFECYCLE_TYPES).toContain(contract.lifecycleType);
      expect(contract.id.length).toBeGreaterThan(0);
      expect(contract.providerResolution.length).toBeGreaterThan(0);
      expect(contract.pricingSource.length).toBeGreaterThan(0);
      expect(contract.chargeBehavior.length).toBeGreaterThan(0);
      expect(contract.failureRefundPolicy.length).toBeGreaterThan(0);
    }
  });

  it("classifies the main image, audio, and video routes as preserved special workflows", () => {
    expect(GENERATION_LIFECYCLE_CONTRACTS.image_special_workflow).toMatchObject({
      lifecycleType: "special_workflow",
      multipleOutputsSupport: "yes",
      freeGenerationSupport: "yes",
      idempotencySupport: "no",
    });
    expect(GENERATION_LIFECYCLE_CONTRACTS.image_special_workflow.entryRoutes).toContain("/api/generate/image");
    expect(GENERATION_LIFECYCLE_CONTRACTS.image_special_workflow.completionBehavior).toContain("saveAdditionalGenerationUrls");

    expect(GENERATION_LIFECYCLE_CONTRACTS.audio_special_workflow).toMatchObject({
      lifecycleType: "special_workflow",
      multipleOutputsSupport: "mixed",
      freeGenerationSupport: "no",
      idempotencySupport: "yes",
    });
    expect(GENERATION_LIFECYCLE_CONTRACTS.audio_special_workflow.entryRoutes).toContain("/api/generate/audio");
    expect(GENERATION_LIFECYCLE_CONTRACTS.audio_special_workflow.pricingSource).toContain("legacy audio/avatar");

    expect(GENERATION_LIFECYCLE_CONTRACTS.video_special_task_hybrid).toMatchObject({
      lifecycleType: "special_workflow",
      idempotencySupport: "yes",
    });
    expect(GENERATION_LIFECYCLE_CONTRACTS.video_special_task_hybrid.entryRoutes).toContain("/api/video");
    expect(GENERATION_LIFECYCLE_CONTRACTS.video_special_task_hybrid.taskBehavior).toContain("gvo:");
    expect(GENERATION_LIFECYCLE_CONTRACTS.video_special_task_hybrid.failureRefundPolicy).toContain("Custom");
  });

  it("maps every approved product feature id to a lifecycle contract", () => {
    expect(Object.keys(PRODUCT_FEATURE_LIFECYCLE_CONTRACT_BY_ID)).toHaveLength(40);

    for (const featureId of Object.keys(PRODUCT_FEATURE_LIFECYCLE_CONTRACT_BY_ID)) {
      expect(getProductFeatureLifecycleContract(featureId)).not.toBeNull();
    }
  });
});

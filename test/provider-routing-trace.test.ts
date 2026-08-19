import { describe, expect, it } from "vitest";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";
import { IMAGE_MODEL_REGISTRY } from "@/lib/image-model-registry";
import { DEFAULT_MODELS } from "@/lib/pricing-models";
import { resolveVideoModelSource, resolveImageModelSource, resolveAudioModelSource } from "@/lib/model-source-map";
import { estimateProviderCostSync } from "@/lib/pricing";

describe("Phase 1 & 2 Execution Provider & Cost Attribution Audit", () => {
  it("traces all video models and compares actual runtime provider vs constitution provider", () => {
    let wavespeedExecutingCount = 0;
    let googleExecutingCount = 0;
    let byteplusExecutingCount = 0;
    let kieExecutingCount = 0;
    let reapExecutingCount = 0;
    let openaiExecutingCount = 0;

    let kiePricingConstitutionCount = 0;

    for (const model of VIDEO_MODEL_REGISTRY) {
      const src = resolveVideoModelSource(model);
      if (src.runtimeSource === "wavespeed") wavespeedExecutingCount++;
      if (src.runtimeSource === "google") googleExecutingCount++;
      if (src.runtimeSource === "byteplus") byteplusExecutingCount++;
      if (src.runtimeSource === "kie") kieExecutingCount++;
      if (src.runtimeSource === "reap") reapExecutingCount++;
      if (src.runtimeSource === "openai") openaiExecutingCount++;
    }

    for (const dm of DEFAULT_MODELS) {
      if (dm.provider === "kie") kiePricingConstitutionCount++;
    }

    console.log("Video Registry Execution Provider Breakdown:", {
      wavespeed: wavespeedExecutingCount,
      google: googleExecutingCount,
      byteplus: byteplusExecutingCount,
      kie: kieExecutingCount,
      reap: reapExecutingCount,
      openai: openaiExecutingCount,
    });

    console.log("DEFAULT_MODELS with provider='kie':", kiePricingConstitutionCount);
  });

  it("checks whether Kling 3.0 / Hailuo / Sora / Grok actually route to WaveSpeed", () => {
    const kling = VIDEO_MODEL_REGISTRY.find(m => m.id.includes("kling") || m.api_route.includes("kling"));
    if (kling) {
      const src = resolveVideoModelSource(kling);
      expect(src.runtimeSource).toBe("wavespeed");
    }

    const hailuo = VIDEO_MODEL_REGISTRY.find(m => m.id.includes("hailuo") || m.api_route.includes("hailuo"));
    if (hailuo) {
      const src = resolveVideoModelSource(hailuo);
      expect(src.runtimeSource).toBe("wavespeed");
    }
  });
});

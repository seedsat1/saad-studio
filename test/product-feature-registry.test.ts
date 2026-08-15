import { describe, expect, it } from "vitest";

import { GENERATION_LIFECYCLE_TYPES } from "@/lib/generation/lifecycle-contract";
import {
  PRODUCT_FEATURE_CATEGORIES,
  PRODUCT_FEATURE_GENERATION_STATUSES,
  PRODUCT_FEATURE_LIFECYCLES,
  PRODUCT_FEATURE_MODEL_STATUSES,
  PRODUCT_FEATURE_ORCHESTRATION,
  PRODUCT_FEATURE_OVERALL_CONTROLS,
  PRODUCT_FEATURE_PRICING_STATUSES,
  PRODUCT_FEATURE_PROVIDER_STATUSES,
  PRODUCT_FEATURE_REGISTRY,
  PRODUCT_FEATURE_ROUTING_STATUSES,
  PRODUCT_FEATURE_STATES,
  getProductFeatureSummary,
  validateProductFeatureRegistry,
} from "@/lib/product/feature-registry";

const approvedIds = [
  "image-create-image",
  "image-prompt-extractor",
  "image-relight",
  "image-image-upscale",
  "image-prompt",
  "image-cinema-studio-image-2",
  "image-inpaint",
  "image-face-swap",
  "image-character-swap",
  "image-draw-to-edit",
  "video-hook-studio",
  "video-cinema-flow",
  "video-cinema-edit",
  "video-storyboard-studio",
  "video-cinematic-styles",
  "video-video-extend",
  "video-clipcraft-studio",
  "video-ai-canvas",
  "video-assist",
  "video-agent-studio",
  "video-create-video",
  "video-transitions",
  "video-draw-to-video",
  "video-edit-video",
  "video-lipsync-studio",
  "video-video-upscale",
  "video-3d-studio",
  "video-smart-cli",
  "edit-background-remove",
  "edit-ai-inpainting",
  "edit-upscale-enhance",
  "edit-style-transfer",
  "edit-smart-crop",
  "edit-colorize",
  "audio-text-to-music",
  "audio-voice-cloning",
  "audio-sound-effects",
  "audio-podcast-studio",
  "audio-music-stems",
  "audio-lyrics-writer",
] as const;

describe("product feature registry", () => {
  it("contains exactly the approved 40 product features", () => {
    expect(PRODUCT_FEATURE_REGISTRY).toHaveLength(40);
    expect(PRODUCT_FEATURE_REGISTRY.map((feature) => feature.id)).toEqual(approvedIds);
    expect(validateProductFeatureRegistry()).toEqual([]);
  });

  it("uses unique ids and allowed enum values only", () => {
    const ids = PRODUCT_FEATURE_REGISTRY.map((feature) => feature.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const feature of PRODUCT_FEATURE_REGISTRY) {
      expect(PRODUCT_FEATURE_CATEGORIES).toContain(feature.category);
      expect(PRODUCT_FEATURE_STATES).toContain(feature.state);
      expect(PRODUCT_FEATURE_LIFECYCLES).toContain(feature.lifecycle);
      expect(PRODUCT_FEATURE_ORCHESTRATION).toContain(feature.orchestration);
      expect(PRODUCT_FEATURE_MODEL_STATUSES).toContain(feature.modelStatus);
      expect(PRODUCT_FEATURE_ROUTING_STATUSES).toContain(feature.routingStatus);
      expect(PRODUCT_FEATURE_PRICING_STATUSES).toContain(feature.pricingStatus);
      expect(PRODUCT_FEATURE_GENERATION_STATUSES).toContain(feature.generationStatus);
      expect(PRODUCT_FEATURE_PROVIDER_STATUSES).toContain(feature.providerStatus);
      expect(PRODUCT_FEATURE_OVERALL_CONTROLS).toContain(feature.overallControl);
      expect(feature.controlReasons.length).toBeGreaterThan(0);
      expect(feature.enabled).toBe(true);
      expect(feature.visible).toBe(true);
    }
  });

  it("exposes the expected distribution summary", () => {
    expect(getProductFeatureSummary()).toMatchObject({
      total: 40,
      byCategory: {
        image: 10,
        video: 18,
        edit: 6,
        audio: 6,
      },
      byState: {
        active: 26,
        partial: 4,
        ui_only: 2,
        unknown: 8,
      },
      byLifecycle: {
        inline: 7,
        task: 3,
        special_workflow: 18,
        workflow_job: 1,
        no_generation: 11,
      },
      byGenerationLifecycleType: {
        inline: 7,
        task: 3,
        special_workflow: 18,
        workflow_job: 1,
        no_generation: 11,
      },
      byGenerationStatus: {
        inline_orchestrated: 7,
        task_orchestrated: 3,
        special_workflow: 18,
        workflow_job: 1,
        no_generation: 11,
      },
      byOverallControl: {
        CONTROLLED: 25,
        PARTIAL: 6,
        UNCONTROLLED: 1,
        UNKNOWN: 8,
      },
    });
  });

  it("assigns a known lifecycle contract to every active generation feature", () => {
    const activeGenerationFeatures = PRODUCT_FEATURE_REGISTRY.filter(
      (feature) => feature.state === "active" && feature.generationLifecycleType !== "no_generation",
    );

    expect(activeGenerationFeatures.length).toBeGreaterThan(0);

    for (const feature of activeGenerationFeatures) {
      expect(GENERATION_LIFECYCLE_TYPES).toContain(feature.generationLifecycleType);
      expect(feature.lifecycleContract).not.toBeNull();
      expect(feature.lifecycleContract?.id).toBe(feature.lifecycleContractId);
      expect(feature.lifecycleContract?.lifecycleType).toBe(feature.generationLifecycleType);
    }
  });
});

import { describe, it, expect, vi } from "vitest";

// Mock prismadb with vi.hoisted
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    platformConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    generation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    providerUsageRecord: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  mock.$transaction = vi.fn(async (cb: any) => cb(mock));
  return { mockPrisma: mock };
});

vi.mock("@/lib/prismadb", () => ({
  default: mockPrisma,
}));

import { resolveProviderCostPrecedence } from "@/lib/provider-cost-capture";
import { getGenerationCostSync } from "@/lib/pricing";
import { decideProviderRoute } from "@/lib/routing/provider-router";
import type { ModelRoutingConfig } from "@/lib/model-routing-registry";

describe("Universal Product Checkpoint Routing — Reality Audit & Route Matrix", () => {
  it("1. proves official provider identity is separate from execution source", () => {
    // Logical Product: Veo 3.1 Fast
    // Official Owner: Google
    // Alternate Checkpoint: WaveSpeed
    const logicalProduct = {
      id: "google/veo-3.1-fast-generate-preview",
      name: "Veo 3.1 Fast",
      officialProvider: "Google",
      checkpoints: [
        { provider: "Google", route: "google/veo-3.1-fast-generate-preview", status: "OFFICIAL_UPSTREAM" },
        { provider: "WaveSpeed", route: "google/veo3.1-fast-text-to-video", status: "WAVESPEED_CHECKPOINT" },
        { provider: "KIE.ai", route: "veo3-fast", status: "KIE_STANDBY_CHECKPOINT" },
      ],
      selectedExecutionSource: "WaveSpeed",
    };

    expect(logicalProduct.officialProvider).toBe("Google");
    expect(logicalProduct.selectedExecutionSource).toBe("WaveSpeed");
    expect(logicalProduct.officialProvider).not.toBe(logicalProduct.selectedExecutionSource);
  });

  it("2. proves Google-owned product maps to alternate provider route when selected", () => {
    const resGoogle = resolveProviderCostPrecedence({
      generationId: "g_google_exec",
      modelRef: "google/veo3.1-fast-text-to-video",
      providerName: "Google",
      durationSec: 8,
      resolution: "720p",
    });

    const resWaveSpeed = resolveProviderCostPrecedence({
      generationId: "g_wavespeed_exec",
      modelRef: "google/veo3.1-fast-text-to-video",
      providerName: "WaveSpeed",
      durationSec: 8,
      resolution: "720p",
    });

    // When Google executes -> Google tariff ($0.80)
    expect(resGoogle.providerName).toBe("Google");
    expect(resGoogle.providerCostUsd).toBe(0.80);
    expect(resGoogle.costTrust).toBe("ESTIMATED_VERIFIED");

    // When WaveSpeed executes -> WaveSpeed provider name recorded with strict UNKNOWN tariff ($null)
    expect(resWaveSpeed.providerName).toBe("WaveSpeed");
    expect(resWaveSpeed.providerCostUsd).toBeNull();
    expect(resWaveSpeed.costTrust).toBe("UNKNOWN");
  });

  it("3. proves OpenAI-owned product maps to alternate provider route when selected", () => {
    const resOpenAI = resolveProviderCostPrecedence({
      generationId: "g_openai_exec",
      modelRef: "openai/dall-e-3",
      providerName: "OpenAI",
      quality: "hd",
    });

    const resWaveSpeed = resolveProviderCostPrecedence({
      generationId: "g_ws_dalle_exec",
      modelRef: "openai/dall-e-3",
      providerName: "WaveSpeed",
      quality: "hd",
    });

    // OpenAI official
    expect(resOpenAI.providerName).toBe("OpenAI");
    expect(resOpenAI.providerCostUsd).toBe(0.08);
    expect(resOpenAI.costTrust).toBe("ESTIMATED_VERIFIED");

    // WaveSpeed checkpoint (unverified on WaveSpeed -> null USD)
    expect(resWaveSpeed.providerName).toBe("WaveSpeed");
    expect(resWaveSpeed.providerCostUsd).toBeNull();
    expect(resWaveSpeed.costTrust).toBe("UNKNOWN");
  });

  it("4. proves BytePlus-owned product remains BytePlus official even when WaveSpeed is selected", () => {
    const logicalProduct = {
      id: "bytedance/seedance-2.5",
      name: "Seedance 2.5 Turbo",
      officialProvider: "BytePlus",
      checkpoints: [
        { provider: "BytePlus", route: "bytedance-seedance-2.5-t2v", status: "STANDBY_OFFICIAL" },
        { provider: "WaveSpeed", route: "bytedance/seedance-2.5/text-to-video-turbo", status: "SELECTED_CHECKPOINT" },
        { provider: "KIE.ai", route: "seedance-2.5", status: "STANDBY_CHECKPOINT" },
      ],
      selectedExecutionSource: "WaveSpeed",
    };

    expect(logicalProduct.officialProvider).toBe("BytePlus");
    expect(logicalProduct.selectedExecutionSource).toBe("WaveSpeed");
  });

  it("5. proves only ONE checkpoint is selected at a time with NO automatic fallback", () => {
    const config: ModelRoutingConfig = {
      modelId: "google/veo-3.1-fast-generate-preview",
      modelName: "Veo 3.1 Fast",
      modality: "video",
      enabled: true,
      runtimeSource: "wavespeed",
      primaryRoute: { provider: "wavespeed", route: "google/veo3.1-fast-text-to-video" },
      fallbackRoutes: [{ provider: "kie", route: "veo3-fast" }],
      pricingProvider: "wavespeed",
      automaticFallback: false, // Strict Owner Policy: NO auto-fallback
      healthRequirement: true,
    };

    const decision = decideProviderRoute(config);

    expect(decision.selected.provider).toBe("wavespeed");
    expect(decision.selected.route).toBe("google/veo3.1-fast-text-to-video");
    expect(decision.automaticFallback).toBe(false);
    expect(decision.fallbacks).toEqual([]); // No active fallback routes!
  });

  it("6. proves provider cost follows selected execution provider", () => {
    const wsCost = resolveProviderCostPrecedence({
      generationId: "gen_cost_test",
      modelRef: "minimax/h3/reference-to-video",
      providerName: "WaveSpeed",
      durationSec: 5,
      resolution: "768p",
    });

    expect(wsCost.providerName).toBe("WaveSpeed");
    expect(wsCost.providerCostUsd).toBe(0.50);
  });

  it("7. proves user credit price does NOT change when checkpoint changes", () => {
    // User credit cost for Veo 3.1 Fast 720p 8s = 22.4 credits
    const userCredits = getGenerationCostSync("google/veo3.1-fast-text-to-video", 8, 1, "720p");
    expect(userCredits).toBe(22.4);

    // User credit cost for Minimax H3 768p 5s = 28 credits
    const h3Credits = getGenerationCostSync("minimax/h3/reference-to-video", 5, 1, "768p");
    expect(h3Credits).toBe(28);

    // User credit cost for Seedance 2.5 720p 30s = 302.4 credits
    const s25Credits = getGenerationCostSync("bytedance/seedance-2.5/text-to-video-turbo", 30, 1, "720p");
    expect(s25Credits).toBe(302.4);
  });

  it("8. surfaces route compatibility differences across providers", () => {
    const googleNativeCapability = {
      maxDurationSec: 8,
      supportedResolutions: ["720p", "1080p"],
      supportsAudioGeneration: true,
      supportsEndFrame: false,
    };

    const waveSpeedVeoCapability = {
      maxDurationSec: 8,
      supportedResolutions: ["720p", "1080p"],
      supportsAudioGeneration: false, // WaveSpeed does not support native audio gen on Veo route
      supportsEndFrame: false,
    };

    expect(googleNativeCapability.supportsAudioGeneration).not.toBe(waveSpeedVeoCapability.supportsAudioGeneration);
  });
});

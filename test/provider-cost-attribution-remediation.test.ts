import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prismadb", () => ({
  default: {
    pricingConstitution: {
      findMany: vi.fn(async () => []),
    },
    generation: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

import { estimateProviderCostSync, getGenerationCostSync } from "@/lib/pricing";
import { resolveCanonicalProviderTariff, checkTariffStaleness, classifyProvider } from "@/lib/provider-tariff-registry";

describe("Provider Cost Attribution Remediation Suite", () => {
  it("1. prevents WaveSpeed Kling execution from using KIE tariff and does not leak KIE credits", () => {
    const wsKling = estimateProviderCostSync({
      modelRef: "kwaivgi/kling-v3.0-pro/image-to-video",
      providerName: "WaveSpeed",
      providerModel: "kwaivgi/kling-v3.0-pro/image-to-video",
      durationSec: 10,
      quality: "pro",
    });

    // Must NOT be calculated as KIE credits (14.0 * 1.5 * 10 * 0.005 = $1.05)
    // Since WaveSpeed direct API rate for this specific route is unverified, it returns unknown
    expect(wsKling.source).toBe("unknown");
    expect(wsKling.usd).toBeNull();
  });

  it("2. resolves explicit KIE Standby Kling route using KIE standby credits", () => {
    const kieKling = estimateProviderCostSync({
      modelRef: "kling30",
      providerName: "KIE.ai",
      providerModel: "kling-3.0/video",
      durationSec: 10,
      quality: "std",
    });

    // Explicit KIE execution: 14 credits/s * 10s * $0.005 = $0.70
    expect(kieKling.source).toBe("estimated");
    expect(kieKling.usd).toBe(0.70);
  });

  it("3. verifies same model routed to different providers produces provider-specific operating costs", () => {
    // 1. Minimax H3 on WaveSpeed
    const wsMinimax = estimateProviderCostSync({
      modelRef: "minimax/h3/reference-to-video",
      providerName: "WaveSpeed",
      durationSec: 5,
      resolution: "768p",
    });
    expect(wsMinimax.source).toBe("estimated");
    expect(wsMinimax.provenance?.verificationStatus).toBe("VERIFIED_CURRENT");
    expect(wsMinimax.usd).toBe(0.50); // $0.10/s * 5s

    // 2. Kling on WaveSpeed (unknown / unverified direct tariff) vs KIE (standby)
    const wsKling = estimateProviderCostSync({
      modelRef: "kling30",
      providerName: "WaveSpeed",
      durationSec: 5,
    });
    expect(wsKling.source).toBe("unknown");

    const kieKling = estimateProviderCostSync({
      modelRef: "kling30",
      providerName: "KIE.ai",
      durationSec: 5,
    });
    expect(kieKling.source).toBe("estimated");
    expect(kieKling.usd).toBe(0.35); // 14 * 5 * 0.005
  });

  it("4. verifies WaveSpeed image utility and verified models use WaveSpeed tariffs", () => {
    // Upscaler is free / 0 cost
    const upscaler = estimateProviderCostSync({
      modelRef: "wavespeed-ai/image-upscaler",
      providerName: "WaveSpeed",
    });
    expect(upscaler.usd).toBe(0);
    expect(upscaler.source).toBe("estimated");

    // RMBG utility
    const rmbg = estimateProviderCostSync({
      modelRef: "wavespeed-ai/birefnet-v2",
      providerName: "WaveSpeed",
    });
    expect(rmbg.usd).toBe(0.01);

    // WaveSpeed Flux image generation
    const flux = estimateProviderCostSync({
      modelRef: "wavespeed-ai/flux-1.1-pro",
      providerName: "WaveSpeed",
    });
    expect(flux.usd).toBe(0.02);
    expect(flux.source).toBe("estimated");
  });

  it("5. verifies Google Video execution uses Google tariff as ESTIMATED_VERIFIED", () => {
    const veoFast = estimateProviderCostSync({
      modelRef: "google/veo3.1-fast-text-to-video",
      providerName: "Google",
      durationSec: 8,
      resolution: "720p",
    });
    expect(veoFast.source).toBe("estimated");
    expect(veoFast.provenance?.verificationStatus).toBe("VERIFIED_CURRENT");
    expect(veoFast.usd).toBe(0.80); // $0.10/s * 8s
  });

  it("6. verifies BytePlus Seedance execution uses BytePlus tariff as ESTIMATED_VERIFIED", () => {
    const seedance25 = estimateProviderCostSync({
      modelRef: "bytedance/seedance-2.5/image-to-video",
      providerName: "BytePlus",
      durationSec: 5,
      resolution: "720p",
    });
    expect(seedance25.source).toBe("estimated");
    expect(seedance25.provenance?.verificationStatus).toBe("VERIFIED_CURRENT");
    expect(seedance25.usd).toBe(0.90); // $0.18/s * 5s
  });

  it("7. verifies OpenAI execution uses OpenAI tariff as ESTIMATED_VERIFIED", () => {
    const dalle3 = estimateProviderCostSync({
      modelRef: "openai/dall-e-3",
      providerName: "OpenAI",
      quality: "standard",
    });
    expect(dalle3.source).toBe("estimated");
    expect(dalle3.provenance?.verificationStatus).toBe("VERIFIED_CURRENT");
    expect(dalle3.usd).toBe(0.04);
  });

  it("8. verifies user credit pricing is untouched and strictly decoupled from provider costs", () => {
    // User credit charges for Minimax H3, Veo, Seedance, Kling
    const h3UserCredits = getGenerationCostSync("minimax/h3/reference-to-video", 5, 1, "768p");
    expect(h3UserCredits).toBe(28);

    const veoUserCredits = getGenerationCostSync("google/veo3.1-fast-text-to-video", 8, 1, "1080p");
    expect(veoUserCredits).toBe(26.88);

    const s25UserCredits = getGenerationCostSync("bytedance/seedance-2.5/text-to-video-turbo", 30, 1, "720p");
    expect(s25UserCredits).toBe(302.4);

    // Kling user credits
    const klingUserCredits = getGenerationCostSync("kling-3.0/video", 5);
    expect(klingUserCredits).toBe(15);
  });

  it("9. verifies WaveSpeed tariff provenance metadata is preserved and accurate as ESTIMATED_VERIFIED", () => {
    const wsMinimax = estimateProviderCostSync({
      modelRef: "minimax/h3/reference-to-video",
      providerName: "WaveSpeed",
      durationSec: 5,
      resolution: "768p",
    });

    expect(wsMinimax.provenance).toBeDefined();
    expect(wsMinimax.source).toBe("estimated");
    expect(wsMinimax.provenance?.provider).toBe("WaveSpeed");
    expect(wsMinimax.provenance?.sourceType).toBe("official_docs");
    expect(wsMinimax.provenance?.effectiveDate).toBe("2026-08-16");
    expect(wsMinimax.provenance?.verificationStatus).toBe("VERIFIED_CURRENT");
  });

  it("10. verifies ElevenLabs is classified as inactive and tariffs are UNKNOWN", () => {
    const elevenTts = estimateProviderCostSync({
      modelRef: "elevenlabs/tts",
      providerName: "ElevenLabs",
      durationSec: 10,
    });
    expect(elevenTts.source).toBe("unknown");
    expect(elevenTts.provenance?.verificationStatus).toBe("UNKNOWN");
    expect(elevenTts.usd).toBeNull();
  });

  it("11. verifies Reap is classified as shadow_analytical post-production tool and not direct provider cost", () => {
    const reapDub = estimateProviderCostSync({
      modelRef: "reap/dubbing",
      providerName: "Reap",
      durationSec: 60,
    });
    expect(reapDub.source).toBe("estimated");
    expect(reapDub.provenance?.sourceType).toBe("shadow_analytical");
    expect(reapDub.provenance?.provider).toContain("Reap.video");
  });

  it("12. verifies dynamic provider inventory classification helper", () => {
    expect(classifyProvider("google")).toBe("ACTIVE_GENERATIVE");
    expect(classifyProvider("openai")).toBe("ACTIVE_GENERATIVE");
    expect(classifyProvider("wavespeed")).toBe("ACTIVE_GENERATIVE");
    expect(classifyProvider("elevenlabs")).toBe("INACTIVE_LEGACY");
    expect(classifyProvider("reap")).toBe("ACTIVE_TOOL_SERVICE");
    expect(classifyProvider("byteplus", { status: "standby" })).toBe("STANDBY");
    expect(classifyProvider("kie")).toBe("STANDBY");
    expect(classifyProvider("legacy")).toBe("HISTORICAL_ONLY");
  });

  it("13. verifies staleness policy detects outdated tariffs older than max age", () => {
    // Fresh tariff (today) -> VERIFIED_CURRENT
    expect(checkTariffStaleness("2026-08-16T20:08:39+03:00", 90)).toBe("VERIFIED_CURRENT");

    // Outdated tariff (100 days ago) -> STALE
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(checkTariffStaleness(pastDate, 90)).toBe("STALE");
  });
});

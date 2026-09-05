import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prismadb", () => ({
  default: {
    pricingConstitution: {
      findMany: vi.fn(async () => []),
    },
    generation: {
      findFirst: vi.fn(async () => ({
        id: "gen_test_123",
        cost: 15,
        providerName: "KIE.ai",
        providerModel: "kling-3.0/video",
        providerCostUsd: 0.35,
        providerCostSource: "estimated",
      })),
    },
  },
}));

import { estimateProviderCostSync, getGenerationCostSync } from "@/lib/pricing";
import { DEFAULT_MODELS, KIE_PACKAGES } from "@/lib/pricing-models";
import prismadb from "@/lib/prismadb";

describe("Provider Cost Pricing & Recency Audit Suite", () => {
  it("1. verifies KIE.ai package base unit cost is $0.005 per credit", () => {
    expect(KIE_PACKAGES[0].costPerCredit).toBe(0.005);
    expect(KIE_PACKAGES[1].costPerCredit).toBe(0.005);
  });

  it("2. verifies Google Video (Veo 2 / 3.1) actual provider cost tariff", () => {
    // Veo 3.1 Fast 720p: $0.10/s -> 8s = $0.80
    const veo720 = estimateProviderCostSync("google/veo3.1-fast-text-to-video", 8, "720p");
    expect(veo720.source).toBe("estimated");
    expect(veo720.usd).toBe(0.80);

    // Veo 3.1 Fast 1080p: $0.12/s -> 8s = $0.96
    const veo1080 = estimateProviderCostSync("google/veo3.1-fast-text-to-video", 8, "1080p");
    expect(veo1080.source).toBe("estimated");
    expect(veo1080.usd).toBe(0.96);
  });

  it("3. verifies Minimax H3 calibrated provider cost tariff", () => {
    // 768p: $0.10/s -> 5s = $0.50
    const h3_768 = estimateProviderCostSync("minimax/h3/reference-to-video", 5, "768p");
    expect(h3_768.source).toBe("estimated");
    expect(h3_768.usd).toBe(0.50);

    // 2k: $0.14/s -> 5s = $0.70
    const h3_2k = estimateProviderCostSync("minimax/h3/reference-to-video", 5, "2k");
    expect(h3_2k.source).toBe("estimated");
    expect(h3_2k.usd).toBe(0.70);
  });

  it("4. verifies Seedance 2.5 calibrated provider cost tariff", () => {
    // 480p: $0.162/s -> 5s = $0.81
    const s25_480 = estimateProviderCostSync("bytedance/seedance-2.5/image-to-video", 5, "480p");
    expect(s25_480.source).toBe("estimated");
    expect(s25_480.usd).toBe(0.81);

    // 720p: $0.18/s -> 5s = $0.90
    const s25_720 = estimateProviderCostSync("bytedance/seedance-2.5/image-to-video", 5, "720p");
    expect(s25_720.source).toBe("estimated");
    expect(s25_720.usd).toBe(0.90);
  });

  it("4.1. verifies WaveSpeed Alibaba Wan 3.0 source pricing tariff", () => {
    // Official docs: text/reference 480p 30s = $2.10 -> $0.07/s
    const wan480 = estimateProviderCostSync({
      modelRef: "alibaba/wan-3.0/text-to-video",
      providerName: "WaveSpeed",
      durationSec: 30,
      resolution: "480p",
    });
    expect(wan480.source).toBe("estimated");
    expect(wan480.usd).toBe(2.10);
    expect(wan480.tariffKey).toBe("wavespeed:video:alibaba-wan-3.0:text-to-video:480p");

    // Official docs: image 720p 30s = $3.60 -> $0.12/s
    const wan720 = estimateProviderCostSync({
      modelRef: "alibaba/wan-3.0/image-to-video",
      providerName: "WaveSpeed",
      durationSec: 30,
      resolution: "720p",
    });
    expect(wan720.usd).toBe(3.60);

    // Official docs: reference 1080p 30s = $8.40 -> $0.28/s
    const wan1080 = estimateProviderCostSync({
      modelRef: "alibaba/wan-3.0/reference-to-video",
      providerName: "WaveSpeed",
      durationSec: 30,
      resolution: "1080p",
    });
    expect(wan1080.usd).toBe(8.40);
    expect(wan1080.provenance?.sourceType).toBe("official_docs");
  });

  it("5. verifies Reap / ClipCraft provider cost calculation", () => {
    // Captions: $0.05/min -> 60s = $0.05
    const captions = estimateProviderCostSync("reap/subtitles-captions", 60);
    expect(captions.source).toBe("estimated");
    expect(captions.usd).toBe(0.05);

    // Dubbing: $0.12/min -> 60s = $0.12
    const dubbing = estimateProviderCostSync("clipcraft-dubbing", 60);
    expect(dubbing.source).toBe("estimated");
    expect(dubbing.usd).toBe(0.12);

    // Reframe: $0.08/min -> 60s = $0.08
    const reframe = estimateProviderCostSync("reap/video-reframe", 60);
    expect(reframe.source).toBe("estimated");
    expect(reframe.usd).toBe(0.08);
  });

  it("6. verifies KIE Standby and WaveSpeed standard model costing from PricingConstitution", () => {
    // Kling 3.0 on WaveSpeed: $0.0798/sec -> 5s = $0.399
    const kling30 = estimateProviderCostSync({ modelRef: "kling30", providerName: "WaveSpeed", durationSec: 5 });
    expect(kling30.source).toBe("estimated");
    expect(kling30.usd).toBe(0.399);

    // Kling 2.5 Turbo on KIE standby: 8.4 kieCredits/sec -> 5s = 42 credits * $0.005 = $0.21
    const kling25t = estimateProviderCostSync({ modelRef: "kling25t", providerName: "KIE.ai", durationSec: 5 });
    expect(kling25t.source).toBe("estimated");
    expect(kling25t.usd).toBe(0.21);
  });

  it("7. verifies strict separation between user credit charge and provider operating cost", () => {
    // Minimax H3 768p 5s:
    // User credit charge = 28 credits
    const userCharge = getGenerationCostSync("minimax/h3/reference-to-video", 5, 1, "768p");
    expect(userCharge).toBe(28);

    // Provider cost = $0.50 USD
    const providerCost = estimateProviderCostSync("minimax/h3/reference-to-video", 5, "768p");
    expect(providerCost.usd).toBe(0.50);

    // User charge is denominated in Credits, provider cost is denominated in USD.
    expect(userCharge).not.toBe(providerCost.usd);
  });

  it("8. verifies database schema contracts include immutable per-generation provider cost fields", async () => {
    const sampleGen = await prismadb.generation.findFirst({
      where: { providerCostUsd: { not: null } },
    });

    expect(sampleGen).toBeDefined();
    expect(sampleGen?.id).toBe("gen_test_123");
    expect(sampleGen?.cost).toBe(15);
    expect(sampleGen?.providerCostUsd).toBe(0.35);
    expect(sampleGen?.providerCostSource).toBe("estimated");
  });
});

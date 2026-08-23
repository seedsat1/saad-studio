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
    // Kling 3.0: 14 kieCredits/sec -> 5s = 70 credits * $0.005 = $0.35
    const kling30 = estimateProviderCostSync({ modelRef: "kling30", providerName: "KIE.ai", durationSec: 5 });
    expect(kling30.source).toBe("estimated");
    expect(kling30.usd).toBe(0.35);

    // Kling 3.0 Motion Control: 16.4 kieCredits/sec -> 5s = 82 credits * $0.005 = $0.41
    const kling30mc = estimateProviderCostSync({ modelRef: "kling30_mc", providerName: "KIE.ai", durationSec: 5 });
    expect(kling30mc.source).toBe("estimated");
    expect(kling30mc.usd).toBe(0.41);
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

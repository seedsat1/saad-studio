import { describe, it, expect } from "vitest";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";
import { VIDEO_MODELS } from "@/lib/video-models";
import { DEFAULT_MODELS } from "@/lib/pricing-models";
import { getVideoCreditsByRoute, getVideoCreditsByModelId } from "@/lib/credit-pricing";
import { resolveCanonicalProviderTariff } from "@/lib/provider-tariff-registry";

describe("Minimax Hailuo Contract and Specification Tests", () => {
  it("should have all 7 models registered under family 'hailuo' in exact dropdown sequence", () => {
    const hailuoModels = VIDEO_MODEL_REGISTRY.filter((m) => m.family === "hailuo");
    expect(hailuoModels.length).toBe(7);

    const expectedOrder = [
      { id: "minimax-h3-max", name: "Minimax H3 Max", badge: null },
      { id: "minimax-h3-max-turbo", name: "Minimax H3 Max Turbo", badge: null },
      { id: "minimax-h3", name: "Minimax H3", badge: null },
      { id: "minimax-hailuo-2.3", name: "MiniMax Hailuo 2.3", badge: null },
      { id: "minimax-hailuo-2.3-fast", name: "MiniMax Hailuo 2.3 Fast", badge: null },
      { id: "minimax-hailuo-02", name: "MiniMax Hailuo 02", badge: null },
      { id: "minimax-live-illustrations", name: "MiniMax Live Illustrations", badge: null },
    ];

    expectedOrder.forEach((expected, index) => {
      const actual = hailuoModels[index];
      expect(actual.id).toBe(expected.id);
      expect(actual.name).toBe(expected.name);
      expect(actual.badge ?? null).toBe(expected.badge);
      expect(actual.route_confirmed).toBe(true);

      const vm = VIDEO_MODELS.find((m) => m.id === actual.id);
      expect(vm).toBeDefined();
      expect(vm?.family).toBe("Hailuo");
    });
  });

  it("should mirror all 7 models into VIDEO_MODELS with correct accepts flags", () => {
    const h02 = VIDEO_MODELS.find((m) => m.id === "minimax-hailuo-02");
    expect(h02).toBeDefined();
    expect(h02?.accepts).toContain("start-frame");
    expect(h02?.accepts).toContain("end-frame");

    const h23 = VIDEO_MODELS.find((m) => m.id === "minimax-hailuo-2.3");
    expect(h23).toBeDefined();
    expect(h23?.accepts).toContain("start-frame");
    expect(h23?.accepts).not.toContain("end-frame");

    const h23f = VIDEO_MODELS.find((m) => m.id === "minimax-hailuo-2.3-fast");
    expect(h23f).toBeDefined();
    expect(h23f?.accepts).toContain("start-frame");
    expect(h23f?.accepts).not.toContain("end-frame");

    const liveIll = VIDEO_MODELS.find((m) => m.id === "minimax-live-illustrations");
    expect(liveIll).toBeDefined();
    expect(liveIll?.accepts).toContain("start-frame");
  });

  it("should strictly enforce empty aspect_ratios array for Hailuo models (image-derived AR)", () => {
    const hailuoModels = VIDEO_MODEL_REGISTRY.filter(
      (m) => m.id.startsWith("minimax-hailuo-") || m.id === "minimax-live-illustrations"
    );
    for (const m of hailuoModels) {
      expect(m.capabilities.aspect_ratios).toEqual([]);
    }
  });

  it("should calculate exact credit costs per formula for all Minimax models", () => {
    // Hailuo 02 Pro: 6s fixed -> $0.48 * 56 = 26.88 cr
    expect(getVideoCreditsByModelId("minimax-hailuo-02")).toBe(26.88);
    expect(getVideoCreditsByRoute("minimax/hailuo-02/pro")).toBe(26.88);
    expect(getVideoCreditsByRoute("minimax/hailuo-02/standard", { duration: 6 })).toBe(12.88);
    expect(getVideoCreditsByRoute("minimax/hailuo-02/standard", { duration: 10 })).toBe(31.36);
    expect(getVideoCreditsByRoute("minimax/hailuo-02/fast", { duration: 6 })).toBe(5.60);

    // Hailuo 2.3 Pro: 5s fixed -> $0.49 * 56 = 27.44 cr
    expect(getVideoCreditsByModelId("minimax-hailuo-2.3")).toBe(27.44);
    expect(getVideoCreditsByRoute("minimax/hailuo-2.3/t2v-pro")).toBe(27.44);
    expect(getVideoCreditsByRoute("minimax/hailuo-2.3/i2v-pro")).toBe(27.44);

    // Hailuo 2.3 Fast: 6s / 10s
    expect(getVideoCreditsByModelId("minimax-hailuo-2.3-fast", { duration: 6 })).toBe(10.64);
    expect(getVideoCreditsByModelId("minimax-hailuo-2.3-fast", { duration: 10 })).toBe(17.92);

    // Live Illustrations: 5s fixed -> $0.25 * 56 = 14.00 cr
    expect(getVideoCreditsByModelId("minimax-live-illustrations")).toBe(14.00);
    expect(getVideoCreditsByRoute("minimax/live-illustrations")).toBe(14.00);

    // H3 models
    expect(getVideoCreditsByModelId("minimax-h3", { duration: 5, quality: "768p" })).toBe(28.00);
    expect(getVideoCreditsByModelId("minimax-h3", { duration: 5, quality: "2k" })).toBe(39.20);
    expect(getVideoCreditsByModelId("minimax-h3-max", { duration: 5 })).toBe(39.20);
    expect(getVideoCreditsByModelId("minimax-h3-max-turbo", { duration: 5 })).toBe(33.60);
  });

  it("should resolve verified WaveSpeed tariffs from registry", () => {
    const tariffH02 = resolveCanonicalProviderTariff({
      modelRef: "minimax-hailuo-02",
      providerName: "WaveSpeed",
      providerRoute: "minimax/hailuo-02/pro",
      durationSec: 6,
    });
    expect(tariffH02.usd).toBe(0.48);
    expect(tariffH02.providerName).toBe("WaveSpeed");
    expect(tariffH02.tariffKey).toBe("wavespeed:video:minimax-hailuo-02:pro");

    const tariffH23 = resolveCanonicalProviderTariff({
      modelRef: "minimax-hailuo-2.3",
      providerName: "WaveSpeed",
      providerRoute: "minimax/hailuo-2.3/t2v-pro",
      durationSec: 5,
    });
    expect(tariffH23.usd).toBe(0.49);
    expect(tariffH23.providerName).toBe("WaveSpeed");
    expect(tariffH23.tariffKey).toBe("wavespeed:video:minimax-hailuo-2.3:pro");

    const tariffLive = resolveCanonicalProviderTariff({
      modelRef: "minimax-live-illustrations",
      providerName: "WaveSpeed",
      providerRoute: "minimax/live-illustrations",
      durationSec: 5,
    });
    expect(tariffLive.usd).toBe(0.25);
    expect(tariffLive.providerName).toBe("WaveSpeed");
  });
});

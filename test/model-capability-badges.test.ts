import { describe, it, expect } from "vitest";
import { extractModelCapabilities } from "@/components/video/ModelCapabilityBadges";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

describe("Model Capability Badges Contract Tests", () => {
  it("should accurately extract capabilities for Kling 3.0 Pro without guessing", () => {
    const kling30Pro = VIDEO_MODEL_REGISTRY.find(m => m.id === "kling-v3.0-pro-t2v");
    expect(kling30Pro).toBeDefined();

    const caps = extractModelCapabilities(kling30Pro);
    expect(caps.refs).toBe(true);
    expect(caps.multi).toBe(true);
    expect(caps.seed).toBe(false); // Kling 3.0 has no seed parameter per official schema
    expect(caps.startEnd).toBe("Start/End");
    expect(caps.audio).toBe(true);
    expect(caps.duration).toBe("3 - 15\"");
    expect(caps.creditRange).toBeTruthy();
  });

  it("should accurately extract capabilities for Wan 2.1 models with Custom seed", () => {
    const wanModel = VIDEO_MODEL_REGISTRY.find(m => m.capabilities?.has_seed);
    expect(wanModel).toBeDefined();

    const caps = extractModelCapabilities(wanModel);
    expect(caps.seed).toBe(true);
  });

  it("should accurately extract capabilities for Minimax H3 without guessing", () => {
    const minimaxH3 = VIDEO_MODEL_REGISTRY.find(m => m.id === "minimax-h3");
    expect(minimaxH3).toBeDefined();

    const caps = extractModelCapabilities(minimaxH3);
    expect(caps.refs).toBe(true);
    expect(caps.startEnd).toBe("Start/End");
    expect(caps.duration).toBe("3 - 15\"");
    expect(caps.resolution).toBe("1080p");
    expect(caps.creditRange).toBeTruthy();
  });

  it("should accurately extract capabilities for Hailuo 02 Pro with fixed 6s duration", () => {
    const hailuo02Pro = VIDEO_MODEL_REGISTRY.find(m => m.id === "minimax-hailuo-02-pro");
    expect(hailuo02Pro).toBeDefined();

    const caps = extractModelCapabilities(hailuo02Pro);
    expect(caps.startEnd).toBe("Start/End");
    expect(caps.duration).toBe("6\"");
    expect(caps.resolution).toBe("1080p");
    expect(caps.creditRange).toBe("27.4");
  });

  it("should accurately extract capabilities for Hailuo 02 Fast with Start only", () => {
    const hailuo02Fast = VIDEO_MODEL_REGISTRY.find(m => m.id === "minimax-hailuo-02-fast");
    expect(hailuo02Fast).toBeDefined();

    const caps = extractModelCapabilities(hailuo02Fast);
    expect(caps.startEnd).toBe("Start");
    expect(caps.duration).toBe("6 - 10\"");
    expect(caps.creditRange).toContain("5.6");
  });

  it("should accurately extract capabilities for Kling V3 Turbo", () => {
    const turbo = VIDEO_MODEL_REGISTRY.find(m => m.id === "kling-v3-turbo");
    expect(turbo).toBeDefined();

    const caps = extractModelCapabilities(turbo);
    expect(caps.multi).toBe(true);
    expect(caps.duration).toBe("3 - 15\"");
    expect(caps.creditRange).toBeTruthy();
  });
});

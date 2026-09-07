import { describe, it, expect } from "vitest";
import { extractImageModelCapabilities } from "@/components/image/ImageModelCapabilityBadges";
import { IMAGE_MODELS } from "@/lib/image-models";

describe("ImageModelCapabilityBadges Contract", () => {
  const getModel = (id: string) => {
    const found = IMAGE_MODELS.find((m) => m.id === id);
    if (!found) throw new Error(`Model ${id} not found in IMAGE_MODELS`);
    return found;
  };

  it("extracts exact capabilities for Nano Banana 2", () => {
    const model = getModel("nano-banana-2");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~9s");
    expect(caps.resolution).toBe("512px-4K");
    expect(caps.creditRange).toBe("2 - 4");
  });

  it("extracts exact capabilities for Nano Banana Pro", () => {
    const model = getModel("nano-banana-pro");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~18s");
    expect(caps.resolution).toBe("1K-4K");
    expect(caps.creditRange).toBe("2 - 4");
  });

  it("extracts exact capabilities for Nano Banana 2 Lite", () => {
    const model = getModel("nano-banana-2-lite");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~5s");
    expect(caps.resolution).toBe("1K");
    expect(caps.creditRange).toBe("1");
  });

  it("extracts exact capabilities for Google Imagen 4 (pure T2I)", () => {
    const model = getModel("google/imagen4");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(false);
    expect(caps.speed).toBe("~18s");
    expect(caps.resolution).toBe("1K-2K");
    expect(caps.creditRange).toBe("1");
  });

  it("extracts exact capabilities for Google Imagen 4 Fast", () => {
    const model = getModel("google/imagen4-fast");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(false);
    expect(caps.speed).toBe("~5s");
    expect(caps.resolution).toBe("1K-2K");
    expect(caps.creditRange).toBe("1");
  });

  it("extracts exact capabilities for Google Imagen 4 Ultra", () => {
    const model = getModel("google/imagen4-ultra");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(false);
    expect(caps.speed).toBe("~47s");
    expect(caps.resolution).toBe("1K-2K");
    expect(caps.creditRange).toBe("1");
  });

  it("extracts exact capabilities for Seedream 5.0 Lite", () => {
    const model = getModel("seedream/5-lite");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~9s");
    expect(caps.resolution).toBe("2K-4K");
    expect(caps.creditRange).toBe("1.5 - 3");
  });

  it("extracts exact capabilities for Seedream 5.0 Pro", () => {
    const model = getModel("seedream/5-pro");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~18s");
    expect(caps.resolution).toBe("1K-2K");
    expect(caps.creditRange).toBe("1 - 2");
  });

  it("extracts exact capabilities for GPT Image 2", () => {
    const model = getModel("gpt-image-2-text-to-image");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~18s");
    expect(caps.resolution).toBe("1K-2K");
    expect(caps.creditRange).toBe("2");
  });

  it("extracts exact capabilities for Wan 2.7 Image Pro", () => {
    const model = getModel("wan/2-7-image-pro");
    const caps = extractImageModelCapabilities(model);
    expect(caps.refs).toBe(true);
    expect(caps.speed).toBe("~18s");
    expect(caps.resolution).toBe("1K-4K");
  });
});

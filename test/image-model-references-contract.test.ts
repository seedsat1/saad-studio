import { describe, it, expect } from "vitest";
import { IMAGE_MODELS } from "@/lib/image-models";
import { resolveWaveSpeedImageModelRoute } from "@/lib/wavespeed-image-routing";

describe("Image Model Reference Capacity and Routing Contract", () => {
  it("verifies exact reference limits (maxRefImages) across canonical image models", () => {
    const modelMap = new Map(IMAGE_MODELS.map((m) => [m.id, m]));

    // Google Nano Banana fleet
    expect(modelMap.get("nano-banana-2")?.maxRefImages).toBe(14);
    expect(modelMap.get("nano-banana-pro")?.maxRefImages).toBe(14);
    expect(modelMap.get("nano-banana-2-lite")?.maxRefImages).toBe(14);
    expect(modelMap.get("google/nano-banana")?.maxRefImages).toBe(3);
    expect(modelMap.get("google/nano-banana-edit")?.maxRefImages).toBe(3);

    // Google Imagen 4 (Pure T2I)
    expect(modelMap.get("google/imagen4")?.maxRefImages).toBe(0);
    expect(modelMap.get("google/imagen4-fast")?.maxRefImages).toBe(0);
    expect(modelMap.get("google/imagen4-ultra")?.maxRefImages).toBe(0);

    // Seedream fleet
    expect(modelMap.get("seedream/5-lite")?.maxRefImages).toBe(10);
    expect(modelMap.get("seedream/5-pro")?.maxRefImages).toBe(10);
    expect(modelMap.get("seedream/4.5-edit")?.maxRefImages).toBe(10);
    expect(modelMap.get("seedream/4.5-text-to-image")?.maxRefImages).toBe(0);

    // OpenAI fleet
    expect(modelMap.get("gpt-image-2-text-to-image")?.maxRefImages).toBe(16);
    expect(modelMap.get("gpt-image-2-image-to-image")?.maxRefImages).toBe(16);
    expect(modelMap.get("gpt-image/1.5-image-to-image")?.maxRefImages).toBe(16);
    expect(modelMap.get("gpt-image/1.5-text-to-image")?.maxRefImages).toBe(0);

    // Other curated models
    expect(modelMap.get("wan/2-7-image-pro")?.maxRefImages).toBe(3);
    expect(modelMap.get("qwen2/image-edit")?.maxRefImages).toBe(3);
    expect(modelMap.get("qwen/image-to-image")?.maxRefImages).toBe(1);
    expect(modelMap.get("z-image")?.maxRefImages).toBe(1);
    expect(modelMap.get("grok-imagine/image-to-image")?.maxRefImages).toBe(1);
  });

  it("verifies WaveSpeed image route config assigns correct reference fields and limits", () => {
    // Seedream 5.0 with references routes to edit with up to 10 images
    const seedreamProWithRefs = resolveWaveSpeedImageModelRoute("seedream/5-pro", true);
    expect(seedreamProWithRefs?.referenceField).toBe("images");
    expect(seedreamProWithRefs?.maxReferenceImages).toBe(10);
    expect(seedreamProWithRefs?.requiresReference).toBe(true);

    // Seedream 5.0 without references routes to base T2I with 0 references
    const seedreamProNoRefs = resolveWaveSpeedImageModelRoute("seedream/5-pro", false);
    expect(seedreamProNoRefs?.referenceField).toBeUndefined();
    expect(seedreamProNoRefs?.maxReferenceImages).toBe(0);
    expect(seedreamProNoRefs?.requiresReference).toBe(false);

    // Qwen2 Edit accepts up to 3 images
    const qwen2Edit = resolveWaveSpeedImageModelRoute("qwen2/image-edit", true);
    expect(qwen2Edit?.referenceField).toBe("images");
    expect(qwen2Edit?.maxReferenceImages).toBe(3);

    // Z-Image accepts 1 image
    const zImage = resolveWaveSpeedImageModelRoute("z-image", true);
    expect(zImage?.referenceField).toBe("image");
    expect(zImage?.maxReferenceImages).toBe(1);
  });
});

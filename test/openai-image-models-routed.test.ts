import { describe, it, expect } from "vitest";
import { IMAGE_MODELS } from "@/lib/image-models";
import { OPENAI_IMAGE_MODEL_MAP } from "@/app/api/generate/image/route";

/**
 * An OpenAI row added to IMAGE_MODELS but missing from OPENAI_IMAGE_MODEL_MAP
 * does not fail loudly: the route falls through to the WaveSpeed branch and the
 * generation dies at the provider instead. These tests make that mistake fail
 * here instead.
 */
const openAiRows = IMAGE_MODELS.filter((m) => m.group === "OpenAI Images");

describe("OpenAI image models are routed to OpenAI", () => {
  it("has OpenAI rows to check", () => {
    expect(openAiRows.length).toBeGreaterThan(0);
  });

  it("maps every OpenAI row to an upstream model id", () => {
    const unmapped = openAiRows.map((m) => m.id).filter((id) => !OPENAI_IMAGE_MODEL_MAP[id]);
    expect(unmapped).toEqual([]);
  });

  it("maps only ids that exist in IMAGE_MODELS", () => {
    const known = new Set(IMAGE_MODELS.map((m) => m.id));
    const orphans = Object.keys(OPENAI_IMAGE_MODEL_MAP).filter((id) => !known.has(id));
    expect(orphans).toEqual([]);
  });

  it("routes GPT Image 2.5 to the model ids OpenAI documents", () => {
    expect(OPENAI_IMAGE_MODEL_MAP["gpt-image-2.5-flare-text-to-image"]).toBe("gpt-image-2.5-flare");
    expect(OPENAI_IMAGE_MODEL_MAP["gpt-image-2.5-flare-image-to-image"]).toBe("gpt-image-2.5-flare");
    expect(OPENAI_IMAGE_MODEL_MAP["gpt-image-2.5-sunburst-text-to-image"]).toBe("gpt-image-2.5-sunburst");
    expect(OPENAI_IMAGE_MODEL_MAP["gpt-image-2.5-sunburst-image-to-image"]).toBe("gpt-image-2.5-sunburst");
  });

  it("gives every GPT Image 2.5 row the same contract as GPT Image 2", () => {
    const two = IMAGE_MODELS.find((m) => m.id === "gpt-image-2-text-to-image")!;
    for (const row of openAiRows.filter((m) => m.id.includes("gpt-image-2.5"))) {
      expect(row.maxRefImages, row.id).toBe(two.maxRefImages);
      expect(row.qualityParam, row.id).toEqual(two.qualityParam);
      expect(row.aspectRatios, row.id).toEqual(two.aspectRatios);
      expect(row.creditCost, row.id).toBe(two.creditCost);
    }
  });
});

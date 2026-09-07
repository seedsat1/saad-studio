import { describe, it, expect } from "vitest";
import { withPresetsAppended } from "@/lib/reference-prompt-injector";

// Mirrors exactly what app/(dash)/(routes)/image/page.tsx does before POSTing
// to /api/generate/image: build effectivePrompt, then send it as body.prompt.
function whatThePageSends(basePrompt: string, selections: Record<string, string | null>) {
  return withPresetsAppended(basePrompt, {
    selectedStyleId: selections.selectedStyle ?? null,
    selectedEffectId: selections.selectedEffectId ?? null,
    selectedCameraId: selections.selectedCameraId ?? null,
    selectedSketchId: selections.selectedSketchId ?? null,
    selectedShotTypeId: selections.selectedShotTypeId ?? null,
    selectedFilmStockId: selections.selectedFilmStockId ?? null,
    selectedMovieLookId: selections.selectedMovieLookId ?? null,
    selectedLightingId: selections.selectedLightingId ?? null,
    selectedMotionBlurId: selections.selectedMotionBlurId ?? null,
    selectedGrainId: selections.selectedGrainId ?? null,
    selectedHalationId: selections.selectedHalationId ?? null,
    selectedTonalLookId: selections.selectedTonalLookId ?? null,
    selectedLocationId: selections.selectedLocationId ?? null,
    selectedElementId: selections.selectedElementId ?? null,
  });
}

const BASE = "a red bicycle leaning on a wall";

describe("a selected preset actually changes what is sent to the model", () => {
  it("sends the base prompt untouched when nothing is selected", () => {
    expect(whatThePageSends(BASE, {})).toBe(BASE);
  });

  it("appends the Zoom Blur instruction when that chip is showing", () => {
    const sent = whatThePageSends(BASE, { selectedMotionBlurId: "zoom-blur" });
    expect(sent).not.toBe(BASE);
    expect(sent).toContain(BASE);
    expect(sent).toContain("#zoom-blur");
    expect(sent.toLowerCase()).toContain("radially outward");
    console.log("\n--- prompt actually POSTed with Zoom Blur selected ---\n" + sent + "\n");
  });

  it("carries all eight new tabs at once, each identifiable", () => {
    const sent = whatThePageSends(BASE, {
      selectedShotTypeId: "cu-profile",
      selectedFilmStockId: "cinema-tungsten",
      selectedMovieLookId: "neon-cyberpunk",
      selectedTonalLookId: "velvet-dusk",
      selectedLightingId: "rembrandt-lighting",
      selectedMotionBlurId: "zoom-blur",
      selectedGrainId: "coarse-16mm",
      selectedHalationId: "strong-warm-bloom",
    });
    for (const tag of [
      "Shot type (#cu-profile)",
      "Film stock (#cinema-tungsten)",
      "Movie look (#neon-cyberpunk)",
      "Tonal look (#velvet-dusk)",
      "Lighting (#rembrandt)",
      "Motion blur (#zoom-blur)",
      "Grain (#16mm-grain)",
      "Halation (#strong-bloom)",
    ]) {
      expect(sent).toContain(tag);
    }
    console.log("\n--- prompt with all eight selected (" + sent.length + " chars) ---\n" + sent + "\n");
  });
});

import { describe, it, expect } from "vitest";
import { buildPresetPromptSuffix } from "@/lib/reference-prompt-injector";
import { HOOK_SHOT_TYPES, HOOK_FILM_STOCKS, HOOK_MOVIE_LOOKS, HOOK_LIGHTING, HOOK_MOTION_BLURS, HOOK_GRAINS, HOOK_HALATIONS, HOOK_EFFECTS } from "@/lib/hook-studio-config";

describe("Shot Type preset injection", () => {
  it("exposes 24 shot types split into framing and angle", () => {
    expect(HOOK_SHOT_TYPES).toHaveLength(24);
    expect(HOOK_SHOT_TYPES.filter((s) => s.group === "framing")).toHaveLength(18);
    expect(HOOK_SHOT_TYPES.filter((s) => s.group === "angle")).toHaveLength(6);
    expect(new Set(HOOK_SHOT_TYPES.map((s) => s.id)).size).toBe(24);
  });

  it("injects the selected shot type into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedShotTypeId: "dutch-angle" });
    expect(suffix).toContain("#dutch-angle");
    expect(suffix.toLowerCase()).toContain("the camera rolled 15 to 30 degrees");
  });

  it("returns nothing when no shot type is selected", () => {
    expect(buildPresetPromptSuffix({})).toBe("");
  });
});

describe("Film Stock preset injection", () => {
  it("exposes 18 film stocks split into colour and b&w", () => {
    expect(HOOK_FILM_STOCKS).toHaveLength(18);
    expect(HOOK_FILM_STOCKS.filter((s) => s.group === "color")).toHaveLength(15);
    expect(HOOK_FILM_STOCKS.filter((s) => s.group === "bw")).toHaveLength(3);
    expect(new Set(HOOK_FILM_STOCKS.map((s) => s.id)).size).toBe(18);
  });

  it("points every film stock at its own prefixed thumbnail", () => {
    for (const stock of HOOK_FILM_STOCKS) {
      expect(stock.imageUrl).toBe(`/api/media/reference-thumbnails/film-${stock.id}.webp`);
    }
  });

  it("injects the selected film stock into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedFilmStockId: "green-cast" });
    expect(suffix).toContain("Film stock (#green-cast)");
    expect(suffix.toLowerCase()).toContain("olive-green tint");
  });
});

describe("Combined preset selections", () => {
  it("stacks style, shot type, film stock and camera in one suffix", () => {
    const suffix = buildPresetPromptSuffix({
      selectedStyleId: "cyberpunk",
      selectedShotTypeId: "ecu-profile",
      selectedFilmStockId: "high-contrast-bw",
      selectedCameraId: "dolly-in",
    });
    expect(suffix).toContain("Style:");
    expect(suffix).toContain("Shot type (#ecu-profile)");
    expect(suffix).toContain("Film stock (#high-contrast-bw)");
    expect(suffix).toContain("Camera (#dolly-in)");
  });

  it("keeps shot type ids distinct from film stock ids", () => {
    const shotIds = new Set(HOOK_SHOT_TYPES.map((s) => s.id));
    const overlap = HOOK_FILM_STOCKS.filter((f) => shotIds.has(f.id));
    expect(overlap).toEqual([]);
  });
});

describe("Movie Look preset injection", () => {
  it("exposes 30 movie looks across four palette groups", () => {
    expect(HOOK_MOVIE_LOOKS).toHaveLength(30);
    expect(HOOK_MOVIE_LOOKS.filter((l) => l.group === "warm")).toHaveLength(8);
    expect(HOOK_MOVIE_LOOKS.filter((l) => l.group === "cool")).toHaveLength(8);
    expect(HOOK_MOVIE_LOOKS.filter((l) => l.group === "muted")).toHaveLength(11);
    expect(HOOK_MOVIE_LOOKS.filter((l) => l.group === "vivid")).toHaveLength(3);
    expect(new Set(HOOK_MOVIE_LOOKS.map((l) => l.id)).size).toBe(30);
  });

  it("injects the selected movie look into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedMovieLookId: "neon-cyberpunk" });
    expect(suffix).toContain("Movie look (#neon-cyberpunk)");
    expect(suffix.toLowerCase()).toContain("magenta and cyan neon");
  });

  it("keeps every preset id unique across all four new tabs", () => {
    const all = [
      ...HOOK_SHOT_TYPES.map((x) => x.id),
      ...HOOK_FILM_STOCKS.map((x) => x.id),
      ...HOOK_MOVIE_LOOKS.map((x) => x.id),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("stacks film stock and movie look together without conflict", () => {
    const suffix = buildPresetPromptSuffix({
      selectedFilmStockId: "cinema-tungsten",
      selectedMovieLookId: "candlelit-period",
    });
    expect(suffix).toContain("Film stock (#cinema-tungsten)");
    expect(suffix).toContain("Movie look (#candlelit-period)");
  });
});

describe("Lighting preset injection", () => {
  it("exposes 18 lighting patterns across three groups", () => {
    expect(HOOK_LIGHTING).toHaveLength(18);
    expect(HOOK_LIGHTING.filter((l) => l.group === "portrait")).toHaveLength(9);
    expect(HOOK_LIGHTING.filter((l) => l.group === "natural")).toHaveLength(5);
    expect(HOOK_LIGHTING.filter((l) => l.group === "dramatic")).toHaveLength(4);
    expect(new Set(HOOK_LIGHTING.map((l) => l.id)).size).toBe(18);
  });

  it("injects the selected lighting pattern into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedLightingId: "split-lighting" });
    expect(suffix).toContain("Lighting (#split)");
    expect(suffix.toLowerCase()).toContain("90 degrees to the side");
  });
});

describe("Effects de-duplication", () => {
  it("no longer carries presets that a new tab now owns", () => {
    const gone = ["goldenhour", "backlight", "hardlight", "volumetric", "chiaroscuro", "studiolight", "bw", "longexposure"];
    const ids = HOOK_EFFECTS.map((e) => e.id);
    for (const id of gone) expect(ids).not.toContain(id);
    expect(HOOK_EFFECTS).toHaveLength(22);
  });

  it("keeps the effects presets that have no replacement elsewhere", () => {
    const ids = HOOK_EFFECTS.map((e) => e.id);
    for (const id of ["sepia", "duotone", "redscale", "iridescent", "highflash", "glitching", "spinning"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("All five preset tabs together", () => {
  it("keeps every id unique across every new tab", () => {
    const all = [
      ...HOOK_SHOT_TYPES.map((x) => x.id),
      ...HOOK_FILM_STOCKS.map((x) => x.id),
      ...HOOK_MOVIE_LOOKS.map((x) => x.id),
      ...HOOK_LIGHTING.map((x) => x.id),
      ...HOOK_MOTION_BLURS.map((x) => x.id),
      ...HOOK_GRAINS.map((x) => x.id),
      ...HOOK_HALATIONS.map((x) => x.id),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("stacks lighting, film stock, movie look, shot type and style in one suffix", () => {
    const suffix = buildPresetPromptSuffix({
      selectedStyleId: "cyberpunk",
      selectedShotTypeId: "cu-profile",
      selectedLightingId: "rembrandt-lighting",
      selectedFilmStockId: "cinema-tungsten",
      selectedMovieLookId: "neon-cyberpunk",
    });
    expect(suffix).toContain("Style:");
    expect(suffix).toContain("Shot type (#cu-profile)");
    expect(suffix).toContain("Lighting (#rembrandt)");
    expect(suffix).toContain("Film stock (#cinema-tungsten)");
    expect(suffix).toContain("Movie look (#neon-cyberpunk)");
  });
});

describe("Motion Blur preset injection", () => {
  it("exposes 9 motion-blur presets split into amount and technique", () => {
    expect(HOOK_MOTION_BLURS).toHaveLength(9);
    expect(HOOK_MOTION_BLURS.filter((b) => b.group === "amount")).toHaveLength(4);
    expect(HOOK_MOTION_BLURS.filter((b) => b.group === "technique")).toHaveLength(5);
    expect(new Set(HOOK_MOTION_BLURS.map((b) => b.id)).size).toBe(9);
  });

  it("injects the selected motion blur into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedMotionBlurId: "zoom-blur" });
    expect(suffix).toContain("Motion blur (#zoom-blur)");
    expect(suffix.toLowerCase()).toContain("radially");
  });

  it("treats None as an explicit instruction, not an empty selection", () => {
    const suffix = buildPresetPromptSuffix({ selectedMotionBlurId: "no-blur" });
    expect(suffix).toContain("Motion blur (#no-blur)");
    expect(suffix.toLowerCase()).toContain("no motion blur at all");
    expect(buildPresetPromptSuffix({})).toBe("");
  });

  it("points every motion blur at its own prefixed thumbnail", () => {
    for (const b of HOOK_MOTION_BLURS) {
      expect(b.imageUrl.startsWith("/api/media/reference-thumbnails/blur-")).toBe(true);
    }
  });
});

describe("Grain preset injection", () => {
  it("exposes 4 grain textures with unique ids", () => {
    expect(HOOK_GRAINS).toHaveLength(4);
    expect(new Set(HOOK_GRAINS.map((g) => g.id)).size).toBe(4);
  });

  it("points every grain at its own prefixed thumbnail", () => {
    for (const g of HOOK_GRAINS) {
      expect(g.imageUrl.startsWith("/api/media/reference-thumbnails/grain-")).toBe(true);
    }
  });

  it("injects the selected grain into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedGrainId: "coarse-16mm" });
    expect(suffix).toContain("Grain (#16mm-grain)");
    expect(suffix.toLowerCase()).toContain("large chunky");
  });

  it("stacks grain with film stock, which describes a whole emulsion", () => {
    const suffix = buildPresetPromptSuffix({
      selectedFilmStockId: "cinema-daylight",
      selectedGrainId: "barely-visible-shadow",
    });
    expect(suffix).toContain("Film stock (#cinema-daylight)");
    expect(suffix).toContain("Grain (#shadow-grain)");
  });
});

describe("Halation preset injection", () => {
  it("exposes 4 halation presets with unique ids", () => {
    expect(HOOK_HALATIONS).toHaveLength(4);
    expect(new Set(HOOK_HALATIONS.map((h) => h.id)).size).toBe(4);
  });

  it("points every halation at its own prefixed thumbnail", () => {
    for (const h of HOOK_HALATIONS) {
      expect(h.imageUrl.startsWith("/api/media/reference-thumbnails/halation-")).toBe(true);
    }
  });

  it("injects the selected halation into the prompt suffix", () => {
    const suffix = buildPresetPromptSuffix({ selectedHalationId: "green-yellow-fringe" });
    expect(suffix).toContain("Halation (#green-fringe)");
    expect(suffix.toLowerCase()).toContain("green-yellow halo");
  });

  it("treats None as an explicit instruction, not an empty selection", () => {
    const suffix = buildPresetPromptSuffix({ selectedHalationId: "no-halation" });
    expect(suffix).toContain("Halation (#no-halation)");
    expect(suffix.toLowerCase()).toContain("no halation at all");
    expect(buildPresetPromptSuffix({})).toBe("");
  });

  it("stacks grain and halation as independent film-artefact layers", () => {
    const suffix = buildPresetPromptSuffix({
      selectedGrainId: "coarse-16mm",
      selectedHalationId: "strong-warm-bloom",
    });
    expect(suffix).toContain("Grain (#16mm-grain)");
    expect(suffix).toContain("Halation (#strong-bloom)");
  });
});

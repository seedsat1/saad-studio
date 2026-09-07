import { describe, it, expect } from "vitest";
import { buildPresetPromptSuffix } from "@/lib/reference-prompt-injector";
import { HOOK_SHOT_TYPES, HOOK_FILM_STOCKS, HOOK_MOVIE_LOOKS } from "@/lib/hook-studio-config";

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

import { describe, it, expect } from "vitest";
import { buildPresetPromptSuffix } from "@/lib/reference-prompt-injector";
import { HOOK_SHOT_TYPES } from "@/lib/hook-studio-config";

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

  it("combines shot type with style and camera", () => {
    const suffix = buildPresetPromptSuffix({
      selectedStyleId: "cyberpunk",
      selectedShotTypeId: "ecu-profile",
      selectedCameraId: "dolly-in",
    });
    expect(suffix).toContain("Style:");
    expect(suffix).toContain("Shot type (#ecu-profile)");
    expect(suffix).toContain("Camera (#dolly-in)");
  });

  it("returns nothing when no shot type is selected", () => {
    expect(buildPresetPromptSuffix({})).toBe("");
  });
});

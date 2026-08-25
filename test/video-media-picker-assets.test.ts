import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const videoPage = readFileSync("app/(dash)/(routes)/video/page.tsx", "utf8");

describe("Video media picker generated assets", () => {
  it("loads generated image, video, and audio assets through the central assets API", () => {
    expect(videoPage).toContain('useState<"upload" | "images" | "videos" | "audio">("images")');
    expect(videoPage).toContain('async (type: "image" | "video" | "audio")');
    expect(videoPage).toContain("/api/assets?type=${type}");
    expect(videoPage).toContain("Generated Audio");
    expect(videoPage).toContain('setPickerTab("audio"); await loadPickerAssets("audio")');
  });

  it("keeps generated audio tied to reference media capability instead of start or end frames", () => {
    expect(videoPage).toContain('mediaPicker === "referenceImages" && canPickReferenceAudio');
    expect(videoPage).toContain('mediaPicker === "motionVideo" || (mediaPicker === "referenceImages" && canPickReferenceVideos)');
    expect(videoPage).toContain('accept={canPickReferenceMedia ? "image/*,video/*,audio/*" : "image/*"}');
    expect(videoPage).toContain("getReferenceFileLimits(selectedModel)");
  });
});

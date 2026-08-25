import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const videoPage = readFileSync("app/(dash)/(routes)/video/page.tsx", "utf8");

describe("Video media picker generated assets", () => {
  it("loads generated image, video, and audio assets through the central assets API with expanded limit", () => {
    expect(videoPage).toContain('useState<"upload" | "images" | "videos" | "audio">("images")');
    expect(videoPage).toContain('async (type: "image" | "video" | "audio")');
    expect(videoPage).toContain("/api/assets?type=${type}&validOnly=true&limit=60");
    expect(videoPage).toContain("Generated Images");
    expect(videoPage).toContain("Generated Videos");
    expect(videoPage).toContain("Generated Audio");
    expect(videoPage).toContain('setPickerTab("audio"); await loadPickerAssets("audio")');
    expect(videoPage).toContain('setPickerTab("videos"); await loadPickerAssets("video")');
    expect(videoPage).toContain('setPickerTab("images"); await loadPickerAssets("image")');
  });

  it("provides universal access to generated images, videos, and audio in media picker", () => {
    expect(videoPage).toContain('accept={canPickReferenceMedia ? "image/*,video/*,audio/*" : "image/*"}');
    expect(videoPage).toContain("getReferenceFileLimits(selectedModel)");
  });
});

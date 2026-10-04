import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveDynamicVideoSubRoute } from "@/lib/dynamic-model-loader";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

const videoRouteCode = readFileSync("app/api/video/route.ts", "utf8");

describe("Seedance reference video routing", () => {
  it("keeps Seedance 2.5 reference media on the text/reference route", () => {
    const seedance25 = VIDEO_MODEL_REGISTRY.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");
    expect(seedance25).toBeDefined();

    expect(resolveDynamicVideoSubRoute(seedance25!, false, true, false, false)).toBe(
      "bytedance/seedance-2.5/text-to-video-turbo",
    );
  });

  it("does not treat reference_video_urls as direct video input in /api/video", () => {
    const match = videoRouteCode.match(/const dynamicHasVideoInput =([\s\S]*?);[\r\n]\s*const dynamicHasStartEndInput =/);
    expect(match?.[1]).toBeTruthy();
    expect(match?.[1]).toContain("payload.video");
    expect(match?.[1]).toContain("payload.video_url");
    expect(match?.[1]).toContain("payload.videoUrl");
    expect(match?.[1]).not.toContain("reference_video_urls");
    expect(match?.[1]).not.toContain("referenceVideoUrls");

    expect(videoRouteCode).toContain("hasNonEmptyStringList(payload.reference_video_urls)");
    expect(videoRouteCode).toContain("hasNonEmptyStringList(payload.referenceVideoUrls)");
  });
});

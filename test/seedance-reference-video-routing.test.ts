import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeDynamicVideoModels, resolveDynamicVideoSubRoute } from "@/lib/dynamic-model-loader";
import { validateAndBuildSeedanceExactPayload } from "@/lib/seedance-validation";
import { getModelGroups, VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

const videoRouteCode = readFileSync("app/api/video/route.ts", "utf8");
const videoPageCode = readFileSync("app/(dash)/(routes)/video/page.tsx", "utf8");

describe("Seedance reference video routing", () => {
  it("keeps Seedance 2.5 and Seedance 2.5 Turbo as separate visible registry cards", () => {
    const standard = VIDEO_MODEL_REGISTRY.find((model) => model.id === "bytedance-seedance-v25-t2v");
    const turbo = VIDEO_MODEL_REGISTRY.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");

    expect(standard?.name).toBe("Seedance 2.5");
    expect(standard?.api_route).toBe("bytedance/seedance-2.5/text-to-video");
    expect(standard?.image_api_route).toBe("bytedance/seedance-2.5/image-to-video");
    expect(standard?.capabilities.resolutions).toEqual(["480p", "720p", "1080p", "4k"]);
    expect(standard?.capabilities.durations.at(0)).toBe(4);
    expect(standard?.capabilities.durations.at(-1)).toBe(30);
    expect(standard?.capabilities.max_reference_images).toBe(30);
    expect(standard?.capabilities.max_reference_videos).toBe(10);
    expect(standard?.capabilities.max_reference_audios).toBe(10);

    expect(turbo?.name).toBe("Seedance 2.5 Turbo");
    expect(turbo?.api_route).toBe("bytedance/seedance-2.5/text-to-video-turbo");
    expect(turbo?.image_api_route).toBe("bytedance/seedance-2.5/image-to-video-turbo");
    expect(turbo?.capabilities.resolutions).toEqual(["720p", "1080p"]);
    expect(turbo?.capabilities.durations.at(0)).toBe(4);
    expect(turbo?.capabilities.durations.at(-1)).toBe(30);
    expect(turbo?.capabilities.max_reference_images).toBe(30);
    expect(turbo?.capabilities.max_reference_videos).toBe(10);
    expect(turbo?.capabilities.max_reference_audios).toBe(10);
  });

  it("hides standalone Seedance 2.5 I2V variants from normalized and fallback model lists", () => {
    const normalized = normalizeDynamicVideoModels([] as any);
    const normalizedSeedance25Names = normalized
      .filter((model) => model.api_route.startsWith("bytedance/seedance-2.5"))
      .map((model) => model.name);
    const fallbackSeedance25Names = getModelGroups()
      .flatMap((group) => group.models)
      .filter((model) => model.api_route.startsWith("bytedance/seedance-2.5"))
      .map((model) => model.name);

    for (const seedance25Names of [normalizedSeedance25Names, fallbackSeedance25Names]) {
      expect(seedance25Names).toContain("Seedance 2.5");
      expect(seedance25Names).toContain("Seedance 2.5 Turbo");
      expect(seedance25Names).not.toContain("Seedance 2.5 I2V Turbo");
      expect(seedance25Names).not.toContain("Seedance 2.5 Spicy");
    }
  });


  it("repairs stale dynamic Seedance 2.5 Turbo labels so the standard model keeps all four qualities", () => {
    const normalized = normalizeDynamicVideoModels([
      {
        id: "bytedance-seedance-v25-t2v-turbo",
        name: "Seedance 2.5",
        api_route: "bytedance/seedance-2.5/text-to-video-turbo",
        family: "seedance",
        family_label: "Bytedance",
        family_color: "#10b981",
        capabilities: {
          aspect_ratios: ["16:9", "9:16"],
          sizes: [],
          durations: [5, 10],
          resolutions: ["720p", "1080p"],
          quality_param: "resolution",
          max_reference_images: 30,
          max_reference_videos: 10,
          max_reference_video_total_seconds: 30,
          max_reference_audios: 10,
          max_reference_audio_total_seconds: 30,
          has_sound: true,
          has_seed: false,
        },
      } as any,
    ]);

    const standard = normalized.find((model) => model.id === "bytedance-seedance-v25-t2v");
    const turbo = normalized.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");

    expect(standard?.name).toBe("Seedance 2.5");
    expect(standard?.capabilities.resolutions).toEqual(["480p", "720p", "1080p", "4k"]);
    expect(turbo?.name).toBe("Seedance 2.5 Turbo");
    expect(turbo?.capabilities.resolutions).toEqual(["720p", "1080p"]);
  });
  it("keeps Seedance 2.5 reference media on the text/reference route", () => {
    const seedance25 = VIDEO_MODEL_REGISTRY.find((model) => model.id === "bytedance-seedance-v25-t2v-turbo");
    expect(seedance25).toBeDefined();

    expect(resolveDynamicVideoSubRoute(seedance25!, false, true, false, false)).toBe(
      "bytedance/seedance-2.5/text-to-video-turbo",
    );
  });

  it("routes Seedance 2.5 start/end frames to the matching non-turbo or turbo image route", () => {
    expect(videoPageCode).toContain('baseRoute === "bytedance/seedance-2.5/text-to-video"');
    expect(videoPageCode).toContain('return "bytedance/seedance-2.5/image-to-video";');
    expect(videoPageCode).toContain('baseRoute !== "bytedance/seedance-2.5/text-to-video-turbo"');
    expect(videoPageCode).toContain('return "bytedance/seedance-2.5/image-to-video-turbo";');
    expect(videoRouteCode).toContain('baseRoute === "bytedance/seedance-2.5/text-to-video"');
    expect(videoRouteCode).toContain('return "bytedance/seedance-2.5/image-to-video";');
  });

  it("builds exact Seedance 2.5 text/reference payload fields", () => {
    const exact = validateAndBuildSeedanceExactPayload(
      "bytedance/seedance-2.5/text-to-video",
      {
        prompt: "Use @image1, @video1, and @audio1 in order.",
        aspect_ratio: "21:9",
        duration: 30,
        resolution: "4k",
        generate_audio: true,
        reference_image_urls: ["https://cdn.example/image.png"],
        reference_video_urls: ["https://cdn.example/video.mp4"],
        reference_audio_urls: ["https://cdn.example/audio.mp3"],
      },
      {},
    );

    expect(exact).toMatchObject({
      prompt: "Use @image1, @video1, and @audio1 in order.",
      aspect_ratio: "21:9",
      duration: 30,
      resolution: "4k",
      generate_audio: true,
      reference_images: ["https://cdn.example/image.png"],
      reference_videos: ["https://cdn.example/video.mp4"],
      reference_audios: ["https://cdn.example/audio.mp3"],
    });
    expect(exact).not.toHaveProperty("image");
    expect(exact).not.toHaveProperty("last_image");
  });

  it("builds exact Seedance 2.5 image-to-video payload without aspect_ratio", () => {
    const exact = validateAndBuildSeedanceExactPayload(
      "bytedance/seedance-2.5/image-to-video-turbo",
      {
        prompt: "Animate the start frame.",
        image: "https://cdn.example/start.png",
        last_image: "https://cdn.example/end.png",
        aspect_ratio: "9:16",
        duration: 4,
        resolution: "1080p",
        generate_audio: false,
      },
      {},
    );

    expect(exact).toMatchObject({
      prompt: "Animate the start frame.",
      image: "https://cdn.example/start.png",
      last_image: "https://cdn.example/end.png",
      duration: 4,
      resolution: "1080p",
      generate_audio: false,
    });
    expect(exact).not.toHaveProperty("aspect_ratio");
  });

  it("rejects unsupported Seedance 2.5 Turbo resolution instead of silently downgrading", () => {
    expect(() => validateAndBuildSeedanceExactPayload(
      "bytedance/seedance-2.5/text-to-video-turbo",
      { prompt: "test", resolution: "4k", duration: 5 },
      {},
    )).toThrow(/Resolution '4k' not supported/);
  });

  it("does not promote Seedance 2.5 reference images into image-to-video start frames", () => {
    expect(() => validateAndBuildSeedanceExactPayload(
      "bytedance/seedance-2.5/image-to-video",
      {
        prompt: "Animate this.",
        duration: 5,
        resolution: "720p",
        reference_image_urls: ["https://cdn.example/reference.png"],
      },
      {},
    )).toThrow(/does not accept any reference_images|requires a start image/);
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

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  BLOCKED_VIDEO_ROUTE_CODE,
  BlockedVideoRouteError,
  assertVideoRouteAllowed,
  isBlockedVideoRoute,
} from "@/lib/generation/video-route-policy";
import { normalizeDynamicVideoModels } from "@/lib/dynamic-model-loader";

describe("video route safety", () => {
  it("blocks every spicy route spelling at the server boundary", () => {
    const blocked = [
      "bytedance/seedance-2.5/image-to-video-spicy",
      "bytedance/seedance-2.0-mini/image_to_video_spicy",
      "seedance-spicy",
    ];

    for (const route of blocked) {
      expect(isBlockedVideoRoute(route)).toBe(true);
      expect(() => assertVideoRouteAllowed(route)).toThrow(BlockedVideoRouteError);
    }

    expect(BLOCKED_VIDEO_ROUTE_CODE).toBe("blocked_unsafe_video_route");
    expect(isBlockedVideoRoute("bytedance/seedance-2.5/image-to-video")).toBe(false);
    expect(isBlockedVideoRoute("bytedance/seedance-2.5/image-to-video-turbo")).toBe(false);
  });

  it("removes spicy models supplied by the database or curated registry", () => {
    const normalized = normalizeDynamicVideoModels([
      {
        id: "custom-seedance-spicy",
        name: "Unsafe route",
        provider: "wavespeed",
        family: "seedance",
        family_label: "Seedance",
        family_color: "#10b981",
        badge: null,
        description: "blocked test model",
        api_route: "bytedance/seedance-2.5/image-to-video-spicy",
        route_confirmed: true,
        capabilities: {} as never,
      },
    ]);

    expect(normalized.some((model) => isBlockedVideoRoute(model.id) || isBlockedVideoRoute(model.api_route))).toBe(false);
  });

  it("keeps 480p image generation but routes it to the normal Seedance endpoint", () => {
    const apiVideo = fs.readFileSync(path.join(__dirname, "../app/api/video/route.ts"), "utf8");
    const panelVideo = fs.readFileSync(path.join(__dirname, "../app/api/panel/generate/video/route.ts"), "utf8");
    const videoPage = fs.readFileSync(path.join(__dirname, "../app/(dash)/(routes)/video/page.tsx"), "utf8");

    for (const source of [apiVideo, panelVideo, videoPage]) {
      expect(source).toContain('return "bytedance/seedance-2.5/image-to-video";');
      expect(source).not.toMatch(/requestedResolution[^}]+return "bytedance\/seedance-2\.5\/image-to-video-spicy"/s);
      expect(source).not.toMatch(/normalizedResolution[^}]+return "bytedance\/seedance-2\.5\/image-to-video-spicy"/s);
    }
  });

  it("does not advertise the blocked route through the Smart CLI model list", () => {
    const smartCli = fs.readFileSync(path.join(__dirname, "../app/api/smart-cli/mcp/route.ts"), "utf8");
    expect(smartCli).not.toContain('{ id: "bytedance/seedance-2.5/image-to-video-spicy"');
  });
});

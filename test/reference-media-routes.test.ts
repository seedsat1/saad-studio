import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function src(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function lineOf(source: string, needle: string) {
  const i = source.indexOf(needle);
  expect(i, `not found: ${needle}`).toBeGreaterThan(-1);
  return source.slice(0, i).split("\n").length;
}

describe("reference media routes validate before billing/provider dispatch", () => {
  it("panel video validates images, videos, audio, start frame and end frame before dispatch", () => {
    const s = src("app/api/panel/generate/video/route.ts");
    expect(s).toContain('assetType: "image", label: "firstFrameUrl"');
    expect(s).toContain('assetType: "image", label: "lastFrameUrl"');
    expect(s).toContain('assetType: "video", label: "referenceVideoUrls[" + index + "]"');
    expect(s).toContain('assetType: "audio", label: "referenceAudioUrls[" + index + "]"');
    const validate = lineOf(s, "referenceAudioUrls[");
    const direct = lineOf(s, "dispatchDirectVideo({");
    const inline = lineOf(s, "runInlineGeneration({");
    expect(validate).toBeLessThan(direct);
    expect(validate).toBeLessThan(inline);
  });

  it("main video route verifies provider media kind and fails on any bad WaveSpeed reference", () => {
    const s = src("app/api/video/route.ts");
    expect(s).toContain("{ expectedMediaKind: getAssetTypeFromKey(key) }");
    expect(s).toContain("{ expectedMediaKind: assetType }");
    expect(s).not.toContain("Skipping unreachable reference media");
    const verify = lineOf(s, "await resolveMediaList(\"reference_audio_urls\"");
    const wsCharge = s.indexOf("const charge = await spendCredits({", s.indexOf("const wsCostEst"));
    expect(wsCharge).toBeGreaterThan(-1);
    expect(verify).toBeLessThan(s.slice(0, wsCharge).split("\n").length);
  });

  it("audio routes validate input audio/video/image media before charging", () => {
    const s = src("app/api/generate/audio/route.ts");
    expect(s).toContain('verifyPublicMediaUrl(resolved, "audioUrl", { expectedMediaKind: "audio" })');
    expect(s).toContain('verifyPublicMediaUrl(resolved, "videoUrl", { expectedMediaKind: "video" })');
    expect(s).toContain('verifyPublicMediaUrl(resolved, "imageUrl", { expectedMediaKind: "image" })');
    expect(s).toContain('verifyPublicMediaUrl(resolved, "sampleAudioUrl", { expectedMediaKind: "audio" })');
    const validate = lineOf(s, "sampleAudioUrl");
    const charge = lineOf(s, "const charge = await spendCredits({");
    expect(validate).toBeLessThan(charge);
  });

  it("panel image and tool routes validate references before credit spend", () => {
    for (const file of [
      "app/api/panel/generate/image/route.ts",
      "app/api/panel/generate/transition/route.ts",
      "app/api/panel/generate/avatar-pro/route.ts",
      "app/api/panel/generate/expand/route.ts",
      "app/api/generate/face-swap/route.ts",
      "app/api/generate/upscale/route.ts",
    ]) {
      const s = src(file);
      expect(s, file).toContain("resolveAndVerifyProviderMediaUrl");
      const validate = lineOf(s, "resolveAndVerifyProviderMediaUrl");
      const spend = s.includes("await spendCredits(") ? lineOf(s, "await spendCredits(") : lineOf(s, "runInlineGeneration({");
      expect(validate, file).toBeLessThan(spend);
    }
  });
});

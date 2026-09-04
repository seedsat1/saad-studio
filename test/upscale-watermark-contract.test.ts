import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("upscale watermark contract", () => {
  it("returns provider output directly without adding the Saad Studio image watermark", () => {
    const route = readFileSync(join(process.cwd(), "app/api/generate/upscale/route.ts"), "utf8");

    expect(route).not.toContain("applyImageWatermark");
    expect(route).toContain("const url = rawUrl;");
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Exercises the real module. A pass here means a generated image URL comes back
// untouched — no fetch of the original, no sharp composite, no re-upload.
const ORIGINAL = "https://example.com/generated/abc123.png";

describe("watermark kill switch", () => {
  const saved = process.env.SAAD_WATERMARK_ENABLED;
  let fetchSpy: any;

  beforeEach(() => {
    vi.resetModules();
    // if the watermark ever runs, it must fetch the original first — so a fetch
    // call is proof it did NOT short-circuit
    fetchSpy = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (saved === undefined) delete process.env.SAAD_WATERMARK_ENABLED;
    else process.env.SAAD_WATERMARK_ENABLED = saved;
  });

  it("returns the url untouched and never fetches when disabled", async () => {
    process.env.SAAD_WATERMARK_ENABLED = "false";
    const { applyImageWatermark } = await import("@/lib/watermark");
    const out = await applyImageWatermark(ORIGINAL, { userId: "u1" });
    expect(out).toBe(ORIGINAL);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("leaves every url in a batch untouched when disabled", async () => {
    process.env.SAAD_WATERMARK_ENABLED = "false";
    const { applyImageWatermarkMany } = await import("@/lib/watermark");
    const urls = [ORIGINAL, "https://example.com/generated/def456.png"];
    const out = await applyImageWatermarkMany(urls, { userId: "u1" });
    expect(out).toEqual(urls);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still attempts to watermark when the flag is absent, so the switch is what disables it", async () => {
    delete process.env.SAAD_WATERMARK_ENABLED;
    const { applyImageWatermark } = await import("@/lib/watermark");
    await applyImageWatermark(ORIGINAL, { userId: "u1" });
    expect(fetchSpy).toHaveBeenCalled();
  });
});

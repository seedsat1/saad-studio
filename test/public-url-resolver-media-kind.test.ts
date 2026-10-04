import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  headObject: vi.fn(),
  putObject: vi.fn(),
  resolveMediaObject: vi.fn(() => null),
  resolveProviderPublicUrl: vi.fn((bucket: string, path: string) => `https://cdn.example/${bucket}/${path}`),
}));

vi.mock("@/lib/supabase-storage", () => ({
  uploadBufferToStorage: vi.fn(),
}));

import { ValidationError, verifyPublicMediaUrl } from "@/lib/media/public-url-resolver";

function response(body: BodyInit | null, init: ResponseInit) {
  return new Response(body, init);
}

describe("verifyPublicMediaUrl media-kind validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects reachable non-image responses before provider dispatch", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return response("<html>not an image</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/not-image", "wavespeed_ref_image", {
        expectedMediaKind: "image",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts decodable image bytes even when content type is generic", async () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        });
      }
      return response(jpegHeader, {
        status: 206,
        headers: { "content-type": "application/octet-stream" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/image-bin", "wavespeed_ref_image", {
        expectedMediaKind: "image",
      }),
    ).resolves.toBeUndefined();
  });
});

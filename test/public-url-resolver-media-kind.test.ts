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

import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { ValidationError, resolveProviderMediaUrl, verifyPublicMediaUrl } from "@/lib/media/public-url-resolver";

function response(body: BodyInit | null, init: ResponseInit) {
  return new Response(body, init);
}

describe("reference media upload and validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uploads browser data URLs to durable storage before provider verification", async () => {
    vi.mocked(uploadBufferToStorage).mockResolvedValueOnce("images/user-1/input-123/input.png" as any);

    const resolved = await resolveProviderMediaUrl("data:image/png;base64,iVBORw0KGgo=", {
      userId: "user-1",
      assetType: "image",
    });

    expect(uploadBufferToStorage).toHaveBeenCalledWith(expect.objectContaining({
      assetType: "image",
      userId: "user-1",
      contentType: "image/png",
    }));
    expect(resolved).toBe("https://cdn.example/images/user-1/input-123/input.png");
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

  it("rejects corrupt image bytes even when the server claims image content type", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, { status: 200, headers: { "content-type": "image/png" } });
      }
      return response(new Uint8Array([0x6e, 0x6f, 0x74, 0x2d, 0x70, 0x6e, 0x67]), {
        status: 206,
        headers: { "content-type": "image/png" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/corrupt.png", "reference_image", { expectedMediaKind: "image" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts valid video signatures and rejects image bytes passed as video references", async () => {
    const mp4Header = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, { status: 200, headers: { "content-type": url.includes("good") ? "video/mp4" : "video/mp4" } });
      }
      return response(url.includes("good") ? mp4Header : pngHeader, { status: 206, headers: { "content-type": "video/mp4" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/good.mp4", "reference_video", { expectedMediaKind: "video" }),
    ).resolves.toBeUndefined();
    await expect(
      verifyPublicMediaUrl("https://cdn.example/bad.mp4", "reference_video", { expectedMediaKind: "video" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts valid audio signatures and rejects video bytes passed as audio references", async () => {
    const mp3Header = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]);
    const mp4Header = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, { status: 200, headers: { "content-type": "audio/mpeg" } });
      }
      return response(url.includes("good") ? mp3Header : mp4Header, { status: 206, headers: { "content-type": "audio/mpeg" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/good.mp3", "reference_audio", { expectedMediaKind: "audio" }),
    ).resolves.toBeUndefined();
    await expect(
      verifyPublicMediaUrl("https://cdn.example/bad.mp3", "reference_audio", { expectedMediaKind: "audio" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it("accepts supported MP4, MOV, WebM, and M4A/AAC-style signatures", async () => {
    const samples: Record<string, { kind: "video" | "audio"; contentType: string; bytes: Uint8Array }> = {
      mp4: { kind: "video", contentType: "video/mp4", bytes: new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]) },
      mov: { kind: "video", contentType: "video/quicktime", bytes: new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) },
      webm: { kind: "video", contentType: "video/webm", bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]) },
      m4a: { kind: "audio", contentType: "audio/mp4", bytes: new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]) },
      aac: { kind: "audio", contentType: "audio/aac", bytes: new Uint8Array([0xff, 0xf1, 0x50, 0x80, 0x00, 0x1f]) },
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const key = Object.keys(samples).find((name) => url.endsWith(name)) || "mp4";
      const sample = samples[key];
      if (init?.method === "HEAD") {
        return response(null, { status: 200, headers: { "content-type": sample.contentType } });
      }
      return response(sample.bytes, { status: 206, headers: { "content-type": sample.contentType } });
    });
    vi.stubGlobal("fetch", fetchMock);

    for (const [name, sample] of Object.entries(samples)) {
      await expect(
        verifyPublicMediaUrl("https://cdn.example/" + name, "reference_" + name, { expectedMediaKind: sample.kind }),
      ).resolves.toBeUndefined();
    }
  });

  it("reads only a small prefix when storage ignores the Range request", async () => {
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) {
          const prefix = new Uint8Array(64);
          prefix.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
          controller.enqueue(prefix);
          return;
        }
        throw new Error("validator attempted to read past the media header");
      },
    });
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return response(null, { status: 200, headers: { "content-type": "video/mp4", "content-length": "987654321" } });
      }
      expect(init?.headers).toEqual({ Range: "bytes=0-63" });
      return new Response(stream, { status: 200, headers: { "content-type": "video/mp4", "content-length": "987654321" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyPublicMediaUrl("https://cdn.example/large.mp4", "reference_video", { expectedMediaKind: "video" }),
    ).resolves.toBeUndefined();
    expect(pulls).toBeLessThanOrEqual(2);
  });
});

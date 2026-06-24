import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as proxyImageHandler } from "../app/api/proxy-image/route";
import { GET as downloadHandler } from "../app/api/download/route";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "mock-user-id" })),
}));

// Mock getFallbackUrls to return mock urls
vi.mock("../lib/utils", () => ({
  getFallbackUrls: vi.fn((url, isDownload) => {
    if (isDownload) {
      return ["https://media.saadstudio.app/mock", "https://pub.r2.dev/mock", "/api/media/mock"];
    }
    return ["https://media.saadstudio.app/mock", "https://pub.r2.dev/mock"];
  }),
}));

describe("Proxy Image Endpoint", () => {
  it("rejects non-image extensions (videos) early", async () => {
    const req = new NextRequest("http://localhost/api/proxy-image?url=https://example.com/movie.mp4");
    const response = await proxyImageHandler(req);
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain("Videos cannot be proxied");
  });

  it("handles valid requests and fetches them", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    };
    const originFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    try {
      const req = new NextRequest("http://localhost/api/proxy-image?url=https://example.com/pic.png");
      const response = await proxyImageHandler(req);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
    } finally {
      global.fetch = originFetch;
    }
  });

  it("rejects non-image content-types returned from upstream", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    };
    const originFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    try {
      const req = new NextRequest("http://localhost/api/proxy-image?url=https://example.com/pic.png");
      const response = await proxyImageHandler(req);
      expect(response.status).toBe(415);
      const body = await response.text();
      expect(body).toContain("Upstream resource is not an image");
    } finally {
      global.fetch = originFetch;
    }
  });
});

describe("Download Endpoint", () => {
  it("uses the fallback loop and fetches successfully", async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "video/mp4" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    };
    const originFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    try {
      const req = new NextRequest("http://localhost/api/download?url=https://example.com/movie.mp4&filename=video.mp4");
      const response = await downloadHandler(req);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("video/mp4");
      expect(response.headers.get("content-disposition")).toContain("filename=\"video.mp4\"");
    } finally {
      global.fetch = originFetch;
    }
  });
});

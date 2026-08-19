import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as assetsHandler } from "../app/api/assets/route";
import prismadb from "../lib/prismadb";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "mock-user-id" })),
}));

// Mock BytePlus reconcile
vi.mock("../lib/providers/byteplus-reconcile", () => ({
  reconcilePendingBytePlusGenerations: vi.fn(() => Promise.resolve()),
}));

// Mock prismadb
vi.mock("../lib/prismadb", () => ({
  default: {
    generation: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Assets API Endpoint", () => {
  it("returns assets and counts successfully", async () => {
    const mockGenerations = [
      {
        id: "gen-1",
        mediaUrl: "https://media.saadstudio.app/userId/gen-1.mp4",
        outputUrl: null,
        prompt: "A beautiful cinematic video",
        modelUsed: "wavespeed-video",
        assetType: "video",
        cost: 10,
        createdAt: new Date("2026-06-25T00:00:00Z"),
      },
      {
        id: "gen-2",
        mediaUrl: null,
        outputUrl: "https://media.saadstudio.app/userId/gen-2.png",
        prompt: "A beautiful cinematic image",
        modelUsed: "google-image",
        assetType: "image",
        cost: 5,
        createdAt: new Date("2026-06-25T01:00:00Z"),
      },
    ];

    vi.mocked(prismadb.generation.findMany).mockResolvedValue(mockGenerations as any);
    vi.mocked(prismadb.generation.count).mockResolvedValue(1 as any);

    const req = new NextRequest("http://localhost/api/assets?type=video");
    const response = await assetsHandler(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.assets).toBeDefined();
    expect(data.counts).toBeDefined();

    // Verify type=video returns only video
    expect(data.assets.length).toBe(1);
    expect(data.assets[0].id).toBe("gen-1");
    expect(data.assets[0].type).toBe("video");
    expect(data.counts.video).toBe(1);
    expect(data.counts.image).toBe(1);
  });

  it("returns unauthorized when userId is missing", async () => {
    const clerk = await import("@clerk/nextjs/server");
    vi.mocked(clerk.auth).mockResolvedValueOnce({ userId: null } as any);

    const req = new NextRequest("http://localhost/api/assets?type=video");
    const response = await assetsHandler(req);

    expect(response.status).toBe(401);
  });
});

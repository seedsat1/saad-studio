import { beforeEach, describe, it, expect, vi } from "vitest";
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("infers generated media tabs from stored type and URLs when assetType is not canonical", async () => {
    const mockGenerations = [
      {
        id: "gen-image-url",
        type: null,
        mediaUrl: "https://media.saadstudio.app/assets/generated/photo.webp",
        outputUrl: null,
        status: "completed",
        prompt: "Generated image",
        modelUsed: "nano-banana-pro",
        assetType: "generation",
        cost: 3,
        isFavorite: false,
        providerRequestId: null,
        resolution: null,
        aspectRatio: "1:1",
        duration: null,
        generationRequestSnapshot: null,
        posterUrl: null,
        posterStatus: null,
        posterGeneratedAt: null,
        posterError: null,
        createdAt: new Date("2026-06-25T01:00:00Z"),
      },
      {
        id: "gen-video-type",
        type: "video",
        mediaUrl: "https://media.saadstudio.app/outputs/result",
        outputUrl: null,
        status: "completed",
        prompt: "Generated video",
        modelUsed: "alibaba-wan-3.0-video",
        assetType: "generation",
        cost: 8,
        isFavorite: false,
        providerRequestId: null,
        resolution: "720p",
        aspectRatio: "16:9",
        duration: 2,
        generationRequestSnapshot: null,
        posterUrl: null,
        posterStatus: null,
        posterGeneratedAt: null,
        posterError: null,
        createdAt: new Date("2026-06-25T02:00:00Z"),
      },
      {
        id: "gen-audio-url",
        type: null,
        mediaUrl: null,
        outputUrl: "https://media.saadstudio.app/audio/result.mp3",
        status: "completed",
        prompt: "Generated audio",
        modelUsed: "music-generator",
        assetType: "generation",
        cost: 4,
        isFavorite: false,
        providerRequestId: null,
        resolution: null,
        aspectRatio: null,
        duration: 12,
        generationRequestSnapshot: null,
        posterUrl: null,
        posterStatus: null,
        posterGeneratedAt: null,
        posterError: null,
        createdAt: new Date("2026-06-25T03:00:00Z"),
      },
    ];

    vi.mocked(prismadb.generation.findMany).mockResolvedValue(mockGenerations as any);
    vi.mocked(prismadb.generation.count).mockResolvedValue(3 as any);

    const videoResponse = await assetsHandler(new NextRequest("http://localhost/api/assets?type=video"));
    const videoData = await videoResponse.json();
    expect(videoData.assets).toHaveLength(1);
    expect(videoData.assets[0]).toMatchObject({ id: "gen-video-type", type: "video" });
    expect(videoData.limit).toBe(25);

    const audioResponse = await assetsHandler(new NextRequest("http://localhost/api/assets?type=audio"));
    const audioData = await audioResponse.json();
    expect(audioData.assets).toHaveLength(1);
    expect(audioData.assets[0]).toMatchObject({ id: "gen-audio-url", type: "audio" });

    const imageResponse = await assetsHandler(new NextRequest("http://localhost/api/assets?type=image"));
    const imageData = await imageResponse.json();
    expect(imageData.assets).toHaveLength(1);
    expect(imageData.assets[0]).toMatchObject({ id: "gen-image-url", type: "image" });
  });

  it("returns unauthorized when userId is missing", async () => {
    const clerk = await import("@clerk/nextjs/server");
    vi.mocked(clerk.auth).mockResolvedValueOnce({ userId: null } as any);

    const req = new NextRequest("http://localhost/api/assets?type=video");
    const response = await assetsHandler(req);

    expect(response.status).toBe(401);
  });
});

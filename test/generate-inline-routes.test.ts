import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_route" })),
}));

vi.mock("@/lib/pricing", () => ({
  getGenerationCost: vi.fn(async () => 7),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })),
  rateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/security", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  isAllowedOrigin: vi.fn(() => true),
  isSafePublicHttpUrl: vi.fn((url: string) => /^https:\/\//i.test(url)),
}));

vi.mock("@/lib/generation/inline-orchestrator", () => ({
  runInlineGeneration: vi.fn(async () => ({
    generationId: "gen_route",
    remainingCredits: 93,
    chargedCredits: 7,
    route: { provider: "wavespeed", route: "mock-route" },
    providerResult: { mediaUrl: "https://cdn.example/result.mp4", taskId: "task_route" },
  })),
}));

import { runInlineGeneration } from "@/lib/generation/inline-orchestrator";
import { getGenerationCost } from "@/lib/pricing";

const runInlineGenerationMock = vi.mocked(runInlineGeneration);
const getGenerationCostMock = vi.mocked(getGenerationCost);

function jsonRequest(body: unknown): Request {
  return new Request("https://saadstudio.test/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://saadstudio.test",
    },
    body: JSON.stringify(body),
  });
}

describe("Pattern A inline generation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGenerationCostMock.mockResolvedValue(7);
    runInlineGenerationMock.mockResolvedValue({
      generationId: "gen_route",
      remainingCredits: 93,
      chargedCredits: 7,
      route: { provider: "wavespeed", route: "mock-route" },
      providerResult: { mediaUrl: "https://cdn.example/result.mp4", taskId: "task_route" },
    });
  });

  it("routes upscale through the inline orchestrator without changing response shape", async () => {
    const { POST } = await import("@/app/api/generate/upscale/route");

    const response = await POST(jsonRequest({
      imageUrl: "https://cdn.example/source.png",
      resolution: "720",
    }) as never);
    const json = await response.json();

    expect(getGenerationCostMock).toHaveBeenCalledWith("tool:upscale", 0, 1, "4k");
    expect(runInlineGenerationMock).toHaveBeenCalledWith(expect.objectContaining({
      modelId: "tool:upscale",
      modality: "image",
      currentRoute: { provider: "wavespeed", route: "wavespeed-ai/image-upscaler" },
      attachMediaFailure: "log",
      logPrefix: "upscale",
      charge: expect.objectContaining({
        userId: "user_route",
        credits: 7,
        assetType: "IMAGE",
        modelUsed: "wavespeed-ai/image-upscaler",
      }),
      execute: expect.any(Function),
    }));
    expect(json).toEqual({
      generationId: "gen_route",
      imageUrl: "https://cdn.example/result.mp4",
      mediaUrl: "https://cdn.example/result.mp4",
      provider: "wavespeed",
      modelUsed: "wavespeed-ai/image-upscaler",
      chargedCredits: 7,
    });
  });

  it("routes watermark-remove through the inline orchestrator without changing response shape", async () => {
    const { POST } = await import("@/app/api/generate/watermark-remove/route");

    const response = await POST(jsonRequest({
      videoUrl: "https://cdn.example/source.mp4",
      duration: 12,
    }) as never);
    const json = await response.json();

    expect(getGenerationCostMock).toHaveBeenCalledWith("tool:watermark-remover", 12);
    expect(runInlineGenerationMock).toHaveBeenCalledWith(expect.objectContaining({
      modelId: "tool:watermark-remover",
      modality: "video",
      currentRoute: { provider: "wavespeed", route: "wavespeed-ai/video-watermark-remover" },
      attachMediaFailure: "log",
      logPrefix: "watermark-remove",
      charge: expect.objectContaining({
        userId: "user_route",
        credits: 7,
        assetType: "VIDEO",
        modelUsed: "wavespeed-ai/video-watermark-remover",
      }),
      execute: expect.any(Function),
    }));
    expect(json).toEqual({
      generationId: "gen_route",
      imageUrl: "https://cdn.example/result.mp4",
      videoUrl: "https://cdn.example/result.mp4",
    });
  });
});

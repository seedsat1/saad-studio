import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/credit-ledger", () => ({
  ensureUserRow: vi.fn(),
  recordFreeGeneration: vi.fn(),
  rollbackGenerationCharge: vi.fn(),
  saveAdditionalGenerationUrls: vi.fn(),
  setGenerationMediaUrl: vi.fn(),
  spendCredits: vi.fn(),
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}));

vi.mock("@/lib/credit-pricing", () => ({
  getVideoCreditsByModelIdAsync: vi.fn(),
}));

vi.mock("@/lib/pricing", () => ({
  getGenerationCost: vi.fn(),
}));

vi.mock("@/lib/prismadb", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    platformConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@/lib/provider-router", () => ({
  generateImage: vi.fn(),
  generateVideo: vi.fn(),
}));

vi.mock("@/lib/providers/persist-output", () => ({
  persistProviderUrl: vi.fn(),
}));

import {
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { getVideoCreditsByModelIdAsync } from "@/lib/credit-pricing";
import prismadb from "@/lib/prismadb";
import { generateVideo } from "@/lib/provider-router";
import { dispatchDirectVideo } from "@/lib/providers/dispatch";
import { persistProviderUrl } from "@/lib/providers/persist-output";

const ensureUserRowMock = vi.mocked(ensureUserRow);
const rollbackGenerationChargeMock = vi.mocked(rollbackGenerationCharge);
const setGenerationMediaUrlMock = vi.mocked(setGenerationMediaUrl);
const spendCreditsMock = vi.mocked(spendCredits);
const getVideoCreditsByModelIdAsyncMock = vi.mocked(getVideoCreditsByModelIdAsync);
const generateVideoMock = vi.mocked(generateVideo);
const persistProviderUrlMock = vi.mocked(persistProviderUrl);

describe("direct video dispatch orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserRowMock.mockResolvedValue(undefined);
    vi.mocked(prismadb.user.findUnique).mockResolvedValue(null);
    getVideoCreditsByModelIdAsyncMock.mockResolvedValue(42);
    spendCreditsMock.mockResolvedValue({
      generationId: "gen_video_1",
      remainingCredits: 58,
    });
    setGenerationMediaUrlMock.mockResolvedValue(undefined);
    rollbackGenerationChargeMock.mockResolvedValue(undefined);
    generateVideoMock.mockResolvedValue({
      urls: ["https://provider.example/video.mp4"],
    });
    persistProviderUrlMock.mockResolvedValue("https://cdn.example/video.mp4");
  });

  it("keeps direct video charge, provider execution, persistence, and response lifecycle", async () => {
    const result = await dispatchDirectVideo({
      userId: "user_1",
      modelId: "google/veo3-fast-text-to-video",
      prompt: "A cinematic clip",
      durationSec: 8,
      quality: "720p",
      aspect: "16:9",
    });

    expect(getVideoCreditsByModelIdAsyncMock).toHaveBeenCalledWith(
      "google/veo3-fast-text-to-video",
      { duration: 8, quality: "720p" },
    );
    expect(spendCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        assetType: "VIDEO",
        modelUsed: "google/veo3-fast-text-to-video",
        credits: 42,
      }),
    );
    expect(generateVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "google/veo3-fast-text-to-video",
        prompt: "A cinematic clip",
        durationSec: 8,
        quality: "720p",
      }),
      "google",
    );
    expect(persistProviderUrlMock).toHaveBeenCalledWith({
      url: "https://provider.example/video.mp4",
      userId: "user_1",
      generationId: "gen_video_1",
      assetType: "VIDEO",
    });
    expect(setGenerationMediaUrlMock).toHaveBeenCalledWith(
      "gen_video_1",
      "https://cdn.example/video.mp4",
    );
    expect(rollbackGenerationChargeMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      videoUrl: "https://cdn.example/video.mp4",
      generationId: "gen_video_1",
      creditsCharged: 42,
    });
  });

  it("rolls back the same direct video charge when provider execution fails", async () => {
    generateVideoMock.mockRejectedValueOnce(new Error("provider failed"));

    await expect(
      dispatchDirectVideo({
        userId: "user_1",
        modelId: "google/veo3-fast-text-to-video",
        prompt: "A cinematic clip",
        durationSec: 8,
        quality: "720p",
      }),
    ).rejects.toThrow("provider failed");

    expect(rollbackGenerationChargeMock).toHaveBeenCalledWith("gen_video_1", "user_1", 42);
    expect(setGenerationMediaUrlMock).not.toHaveBeenCalled();
  });
});

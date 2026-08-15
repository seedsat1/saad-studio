import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/credit-ledger", () => ({
  spendCredits: vi.fn(),
  setGenerationMediaUrl: vi.fn(),
  refundGenerationCharge: vi.fn(),
  rollbackGenerationCharge: vi.fn(),
}));

import {
  refundGenerationCharge,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import {
  resolveInlineGenerationRoute,
  runInlineGeneration,
} from "@/lib/generation/inline-orchestrator";
import type { ModelRoutingConfig } from "@/lib/model-routing-registry";

const spendCreditsMock = vi.mocked(spendCredits);
const setGenerationMediaUrlMock = vi.mocked(setGenerationMediaUrl);
const refundGenerationChargeMock = vi.mocked(refundGenerationCharge);
const rollbackGenerationChargeMock = vi.mocked(rollbackGenerationCharge);

const routeCases = [
  {
    name: "remove-bg",
    modelId: "tool:remove-bg",
    providerRoute: "wavespeed-ai/image-background-remover",
    credits: 0.4,
    responseUrl: "https://cdn.example/remove-bg.png",
    modality: "image",
    assetType: "IMAGE",
  },
  {
    name: "face-swap",
    modelId: "tool:face-swap",
    providerRoute: "wavespeed-ai/image-face-swap-pro",
    credits: 4,
    responseUrl: "https://cdn.example/face-swap.png",
    modality: "image",
    assetType: "IMAGE",
  },
  {
    name: "edit-tool",
    modelId: "qwen2/image-edit",
    providerRoute: "wavespeed-ai/qwen-image/edit",
    credits: 2,
    responseUrl: "https://cdn.example/edit-tool.png",
    modality: "image",
    assetType: "IMAGE",
  },
  {
    name: "upscale",
    modelId: "tool:upscale",
    providerRoute: "wavespeed-ai/image-upscaler",
    credits: 6,
    responseUrl: "https://cdn.example/upscale.jpg",
    modality: "image",
    assetType: "IMAGE",
  },
  {
    name: "watermark-remove",
    modelId: "tool:watermark-remover",
    providerRoute: "wavespeed-ai/video-watermark-remover",
    credits: 5,
    responseUrl: "https://cdn.example/watermark-remove.mp4",
    modality: "video",
    assetType: "VIDEO",
  },
];

describe("inline generation orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spendCreditsMock.mockResolvedValue({
      generationId: "gen_123",
      remainingCredits: 99,
    });
    setGenerationMediaUrlMock.mockResolvedValue(undefined);
    refundGenerationChargeMock.mockResolvedValue(undefined);
    rollbackGenerationChargeMock.mockResolvedValue(undefined);
  });

  it.each(routeCases)("$name keeps charge, provider route, result URL, and completed attach behavior", async (testCase) => {
    const execute = vi.fn(async ({ generationId, route }) => {
      expect(generationId).toBe("gen_123");
      expect(route).toEqual({ provider: "wavespeed", route: testCase.providerRoute });
      return { mediaUrl: testCase.responseUrl, taskId: "task_123" };
    });

    const result = await runInlineGeneration({
      modelId: testCase.modelId,
      modality: testCase.modality,
      currentRoute: { provider: "wavespeed", route: testCase.providerRoute },
      charge: {
        userId: "user_1",
        credits: testCase.credits,
        prompt: testCase.name,
        assetType: testCase.assetType,
        modelUsed: testCase.providerRoute,
      },
      execute,
    });

    expect(spendCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        credits: testCase.credits,
        assetType: testCase.assetType,
        modelUsed: testCase.providerRoute,
      }),
    );
    expect(setGenerationMediaUrlMock).toHaveBeenCalledWith("gen_123", testCase.responseUrl);
    expect(refundGenerationChargeMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      generationId: "gen_123",
      remainingCredits: 99,
      chargedCredits: testCase.credits,
      providerResult: { mediaUrl: testCase.responseUrl, taskId: "task_123" },
    });
  });

  it("refunds the same user charge when provider execution fails after spend", async () => {
    await expect(
      runInlineGeneration({
        modelId: "tool:remove-bg",
        modality: "image",
        currentRoute: { provider: "wavespeed", route: "wavespeed-ai/image-background-remover" },
        charge: {
          userId: "user_1",
          credits: 0.4,
          prompt: "Remove background",
          assetType: "IMAGE",
          modelUsed: "wavespeed-ai/image-background-remover",
        },
        execute: async () => {
          throw new Error("provider failed");
        },
      }),
    ).rejects.toThrow("provider failed");

    expect(setGenerationMediaUrlMock).not.toHaveBeenCalled();
    expect(refundGenerationChargeMock).toHaveBeenCalledWith("gen_123", "user_1", 0.4, {
      reason: "generation_refund_provider_failed",
      clearMediaUrl: true,
    });
  });

  it("can preserve rollback-based image route failure behavior", async () => {
    await expect(
      runInlineGeneration({
        modelId: "gpt-image-2",
        modality: "image",
        currentRoute: { provider: "openai", route: "gpt-image-2" },
        charge: {
          userId: "user_1",
          credits: 6,
          prompt: "direct image",
          assetType: "IMAGE",
          modelUsed: "gpt-image-2",
        },
        failureCreditAction: "rollback",
        execute: async () => {
          throw new Error("direct provider failed");
        },
      }),
    ).rejects.toThrow("direct provider failed");

    expect(refundGenerationChargeMock).not.toHaveBeenCalled();
    expect(rollbackGenerationChargeMock).toHaveBeenCalledWith("gen_123", "user_1", 6);
  });

  it("runs an after-charge hook before provider execution", async () => {
    const events: string[] = [];

    await runInlineGeneration({
      modelId: "gpt-image-2",
      modality: "image",
      currentRoute: { provider: "openai", route: "gpt-image-2" },
      charge: {
        userId: "user_1",
        credits: 4,
        prompt: "direct image",
        assetType: "IMAGE",
        modelUsed: "gpt-image-2",
      },
      afterCharge: async ({ generationId, remainingCredits }) => {
        events.push(`after:${generationId}:${remainingCredits}`);
      },
      execute: async () => {
        events.push("execute");
        return {
          mediaUrl: "https://cdn.example/image.png",
          imageUrls: ["https://cdn.example/image.png", "https://cdn.example/image-2.png"],
        };
      },
    });

    expect(events).toEqual(["after:gen_123:99", "execute"]);
  });

  it("preserves face-swap attach failure behavior when the route asks to log instead of fail", async () => {
    setGenerationMediaUrlMock.mockRejectedValueOnce(new Error("db attach failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runInlineGeneration({
      modelId: "tool:face-swap",
      modality: "image",
      currentRoute: { provider: "wavespeed", route: "wavespeed-ai/image-face-swap-pro" },
      charge: {
        userId: "user_1",
        credits: 4,
        prompt: "Face swap",
        assetType: "IMAGE",
        modelUsed: "wavespeed-ai/image-face-swap-pro",
      },
      attachMediaFailure: "log",
      logPrefix: "face-swap",
      execute: async () => ({ mediaUrl: "https://cdn.example/face.png", taskId: "task_123" }),
    });

    expect(result.providerResult.mediaUrl).toBe("https://cdn.example/face.png");
    expect(refundGenerationChargeMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("keeps panel music inline lifecycle with Google route, rollback policy, and best-effort attach", async () => {
    const execute = vi.fn(async ({ generationId, route }) => {
      expect(generationId).toBe("gen_123");
      expect(route).toEqual({
        provider: "google",
        route: "google/lyria-3-clip/music",
      });

      return {
        mediaUrl: "https://cdn.example/lyria.mp3",
        audioUrl: "https://cdn.example/lyria.mp3",
        lyrics: "Generated lyric block",
      };
    });

    const result = await runInlineGeneration({
      modelId: "google/lyria-3-clip/music",
      modality: "audio",
      currentRoute: {
        provider: "google",
        route: "google/lyria-3-clip/music",
      },
      charge: {
        userId: "user_1",
        credits: 12,
        prompt: "panel music",
        assetType: "AUDIO",
        modelUsed: "google/lyria-3-clip/music",
        duration: 30,
      },
      attachMediaFailure: "log",
      failureCreditAction: "rollback",
      logPrefix: "panel-generate-music",
      execute,
    });

    expect(spendCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        credits: 12,
        assetType: "AUDIO",
        modelUsed: "google/lyria-3-clip/music",
        duration: 30,
      }),
    );
    expect(setGenerationMediaUrlMock).toHaveBeenCalledWith("gen_123", "https://cdn.example/lyria.mp3");
    expect(refundGenerationChargeMock).not.toHaveBeenCalled();
    expect(rollbackGenerationChargeMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      generationId: "gen_123",
      chargedCredits: 12,
      providerResult: {
        audioUrl: "https://cdn.example/lyria.mp3",
        lyrics: "Generated lyric block",
      },
    });
  });

  it("uses the current provider route when the action is not represented by the supplied routing config", () => {
    const routingConfig: ModelRoutingConfig = {
      modelId: "gpt-image-2",
      modelName: "GPT Image 2",
      modality: "image",
      enabled: true,
      runtimeSource: "openai",
      primaryRoute: { provider: "openai", route: "gpt-image-2" },
      fallbackRoutes: [],
      pricingProvider: "openai",
      automaticFallback: false,
      healthRequirement: true,
    };

    expect(
      resolveInlineGenerationRoute({
        modelId: "tool:remove-bg",
        currentRoute: { provider: "wavespeed", route: "wavespeed-ai/image-background-remover" },
        routingConfig,
      }),
    ).toEqual({ provider: "wavespeed", route: "wavespeed-ai/image-background-remover" });
  });
});

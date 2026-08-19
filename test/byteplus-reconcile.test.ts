import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundGenerationCharge, setGenerationMediaUrl } from "@/lib/credit-ledger";

vi.mock("@/lib/prismadb", () => ({
  default: {
    generation: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({ modelUsed: "bytedance/seedance-2" })),
      update: vi.fn(async () => ({})),
    },
    generationRequestSnapshot: {
      findUnique: vi.fn(async () => null),
    },
    providerUsageRecord: {
      updateMany: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/credit-ledger", () => ({
  refundGenerationCharge: vi.fn(async () => {}),
  setGenerationMediaUrl: vi.fn(async () => {}),
}));

import {
  fetchBytePlusTask,
  reconcileBytePlusGeneration,
} from "@/lib/providers/byteplus-reconcile";

describe("BytePlus task reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.BYTEPLUS_API_KEY = "test-key";
  });

  it("parses a completed Seedance task video URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "succeeded",
      content: { video_url: "https://cdn.example/video.mp4" },
    }), { status: 200 })));

    await expect(fetchBytePlusTask("task-1")).resolves.toEqual({
      status: "completed",
      outputs: ["https://cdn.example/video.mp4"],
      error: null,
      missing: false,
    });
  });

  it("treats a missing provider task as failed so credits can be refunded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));

    const result = await fetchBytePlusTask("missing");
    expect(result.status).toBe("failed");
    expect(result.missing).toBe(true);
  });

  it("keeps running tasks in processing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "running",
    }), { status: 200 })));

    const result = await fetchBytePlusTask("task-2");
    expect(result.status).toBe("processing");
    expect(result.outputs).toEqual([]);
  });

  it("stores a completed task on the generation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "succeeded",
      content: { video_url: "https://cdn.example/final.mp4" },
    }), { status: 200 })));

    const status = await reconcileBytePlusGeneration({
      id: "generation-1",
      userId: "user-1",
      cost: 105,
      mediaUrl: "task:ark:task-3",
      createdAt: new Date(Date.now() - 60_000),
    });

    expect(status).toBe("completed");
    expect(setGenerationMediaUrl).toHaveBeenCalledWith(
      "generation-1",
      "https://cdn.example/final.mp4",
    );
    expect(refundGenerationCharge).not.toHaveBeenCalled();
  });

  it("refunds an old missing task", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));

    const status = await reconcileBytePlusGeneration({
      id: "generation-2",
      userId: "user-2",
      cost: 105,
      mediaUrl: "task:ark:missing",
      createdAt: new Date(Date.now() - 20 * 60_000),
    });

    expect(status).toBe("failed");
    expect(refundGenerationCharge).toHaveBeenCalledWith(
      "generation-2",
      "user-2",
      105,
      {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      },
    );
  });
});

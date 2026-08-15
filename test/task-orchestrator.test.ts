import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/credit-ledger", () => ({
  rollbackGenerationCharge: vi.fn(),
  setGenerationMediaUrl: vi.fn(),
  setGenerationTaskMarker: vi.fn(),
  spendCredits: vi.fn(),
}));

import {
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";
import {
  completeTaskGeneration,
  failTaskGenerationWithRefund,
  runTaskGenerationStart,
} from "@/lib/generation/task-orchestrator";

const rollbackGenerationChargeMock = vi.mocked(rollbackGenerationCharge);
const setGenerationMediaUrlMock = vi.mocked(setGenerationMediaUrl);
const setGenerationTaskMarkerMock = vi.mocked(setGenerationTaskMarker);
const spendCreditsMock = vi.mocked(spendCredits);

const charge = {
  userId: "user_1",
  prompt: "cinematic product shot",
  assetType: "video",
  modelUsed: "google/veo-3.1-fast",
  credits: 24,
};

describe("task generation orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spendCreditsMock.mockResolvedValue({
      generationId: "gen_123",
      remainingCredits: 76,
    });
    setGenerationTaskMarkerMock.mockResolvedValue(undefined);
    setGenerationMediaUrlMock.mockResolvedValue(undefined);
    rollbackGenerationChargeMock.mockResolvedValue(undefined);
  });

  it("starts task generations with the same charge, provider submit, and task marker flow", async () => {
    const submit = vi.fn(async ({ generationId }) => {
      expect(generationId).toBe("gen_123");
      return {
        taskId: "operations/veo-task-1",
        model: "veo-3.1-generate-preview",
      };
    });

    const result = await runTaskGenerationStart({
      charge,
      submit,
    });

    expect(spendCreditsMock).toHaveBeenCalledWith(charge);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(setGenerationTaskMarkerMock).toHaveBeenCalledWith(
      "gen_123",
      "operations/veo-task-1",
    );
    expect(rollbackGenerationChargeMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      generationId: "gen_123",
      remainingCredits: 76,
      chargedCredits: 24,
      providerResult: {
        taskId: "operations/veo-task-1",
        model: "veo-3.1-generate-preview",
      },
    });
  });

  it("refunds the same user credits when provider submit fails after charge", async () => {
    await expect(
      runTaskGenerationStart({
        charge,
        submit: async () => {
          throw new Error("provider failed");
        },
      }),
    ).rejects.toThrow("provider failed");

    expect(setGenerationTaskMarkerMock).not.toHaveBeenCalled();
    expect(rollbackGenerationChargeMock).toHaveBeenCalledWith(
      "gen_123",
      "user_1",
      24,
    );
  });

  it("refunds the same user credits when task marker persistence fails", async () => {
    setGenerationTaskMarkerMock.mockRejectedValueOnce(new Error("db marker failed"));

    await expect(
      runTaskGenerationStart({
        charge,
        submit: async () => ({ taskId: "operations/veo-task-1" }),
      }),
    ).rejects.toThrow("db marker failed");

    expect(rollbackGenerationChargeMock).toHaveBeenCalledWith(
      "gen_123",
      "user_1",
      24,
    );
  });

  it("preserves best-effort task marker behavior when requested by Reap-style routes", async () => {
    setGenerationTaskMarkerMock.mockRejectedValueOnce(new Error("db marker failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runTaskGenerationStart({
      charge,
      taskMarkerFailure: "log",
      logPrefix: "panel/reap/start",
      submit: async () => ({
        taskId: "reap:project_123",
        projectId: "project_123",
      }),
    });

    expect(setGenerationTaskMarkerMock).toHaveBeenCalledWith("gen_123", "reap:project_123");
    expect(rollbackGenerationChargeMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    expect(result.providerResult).toEqual({
      taskId: "reap:project_123",
      projectId: "project_123",
    });

    consoleSpy.mockRestore();
  });

  it("marks completed task generations with the media URL from status polling", async () => {
    await completeTaskGeneration({
      generationId: "gen_123",
      mediaUrl: "https://cdn.example/video.mp4",
    });

    expect(setGenerationMediaUrlMock).toHaveBeenCalledWith(
      "gen_123",
      "https://cdn.example/video.mp4",
    );
  });

  it("keeps task failure refunds on rollbackGenerationCharge", async () => {
    await failTaskGenerationWithRefund({
      generationId: "gen_123",
      userId: "user_1",
      credits: 24,
    });

    expect(rollbackGenerationChargeMock).toHaveBeenCalledWith(
      "gen_123",
      "user_1",
      24,
    );
  });
});

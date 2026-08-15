import { describe, expect, it } from "vitest";

import {
  detectJobDiagnostics,
  mapGenerationToUnifiedJob,
  mapReapJobToUnifiedJob,
  mapTransitionJobToUnifiedJob,
  mapVariationJobToUnifiedJob,
  normalizeJobStatus,
  summarizeUnifiedJobs,
} from "@/lib/admin/jobs-read-model";

const now = new Date("2026-08-15T12:00:00.000Z");

describe("admin jobs read model", () => {
  it("normalizes source statuses without changing raw status values", () => {
    expect(normalizeJobStatus("pending")).toBe("queued");
    expect(normalizeJobStatus("prepped")).toBe("processing");
    expect(normalizeJobStatus("succeeded")).toBe("completed");
    expect(normalizeJobStatus("canceled")).toBe("cancelled");
    expect(normalizeJobStatus("anything-new")).toBe("queued");
    expect(normalizeJobStatus("queued", "task:ws:123")).toBe("processing");
    expect(normalizeJobStatus("processing", "failed:no-output")).toBe("failed");
  });

  it("maps Generation rows and keeps unknown feature ids unknown when not proven", () => {
    const job = mapGenerationToUnifiedJob({
      id: "gen_1",
      userId: "user_1",
      prompt: "hello",
      mediaUrl: "task:ws:123",
      outputUrl: null,
      status: "processing",
      assetType: "VIDEO",
      modelUsed: "bytedance/seedance",
      cost: 12,
      providerName: "WaveSpeed",
      providerRequestId: "ws:123",
      createdAt: new Date("2026-08-15T11:00:00.000Z"),
      providerUsageRecords: [{
        id: "usage_1",
        providerName: "WaveSpeed",
        providerModel: "bytedance/seedance",
        providerRequestId: "ws:123",
        status: "processing",
        providerCostUsd: 0.1,
        providerCostSource: "estimated",
      }],
      generationRequestSnapshot: {
        provider: "WaveSpeed",
        model: "bytedance/seedance",
        requestPayload: {
          routing: {
            routingSource: "control_center",
            effectiveProvider: "wavespeed",
          },
        },
      },
    }, now);

    expect(job.sourceType).toBe("generation");
    expect(job.featureId).toBeNull();
    expect(job.provider).toBe("WaveSpeed");
    expect(job.providerTaskId).toBe("ws:123");
    expect(job.routingSource).toBe("control_center");
    expect(job.status).toBe("processing");
    expect(job.providerUsage?.provider).toBe("WaveSpeed");
  });

  it("maps approved tool generations only when metadata is unambiguous", () => {
    const removeBg = mapGenerationToUnifiedJob({
      id: "gen_remove_bg",
      userId: "user_1",
      mediaUrl: "https://cdn.test/out.png",
      outputUrl: "https://cdn.test/out.png",
      status: "completed",
      assetType: "IMAGE",
      modelUsed: "wavespeed-ai/image-background-remover",
      cost: 2,
      providerName: "WaveSpeed",
      createdAt: now,
      providerUsageRecords: [],
      generationRequestSnapshot: null,
    }, now);

    const ambiguousUpscale = mapGenerationToUnifiedJob({
      id: "gen_upscale",
      userId: "user_1",
      mediaUrl: "https://cdn.test/out.png",
      outputUrl: "https://cdn.test/out.png",
      status: "completed",
      assetType: "IMAGE",
      modelUsed: "wavespeed-ai/image-upscaler",
      cost: 4,
      providerName: "WaveSpeed",
      createdAt: now,
      providerUsageRecords: [],
      generationRequestSnapshot: null,
    }, now);

    expect(removeBg.featureId).toBe("edit-background-remove");
    expect(ambiguousUpscale.featureId).toBeNull();
  });

  it("maps workflow/job tables into the unified shape", () => {
    const transition = mapTransitionJobToUnifiedJob({
      id: "transition_1",
      userId: "user_1",
      presetId: "spin",
      status: "processing",
      taskId: "kie_task",
      creditsCost: 8,
      resultUrl: null,
      error: null,
      payload: {
        selectedModelId: "kling-3.0/video",
        routing: { routingSource: "legacy_fallback", effectiveProvider: "kie" },
      },
      createdAt: new Date("2026-08-15T11:30:00.000Z"),
      updatedAt: new Date("2026-08-15T11:30:00.000Z"),
      output: null,
    }, now);
    const variation = mapVariationJobToUnifiedJob({
      id: "variation_1",
      userId: "user_1",
      status: "completed",
      error: null,
      outputs: [{
        modelUsed: "kie/model",
        assetUrl: "https://cdn.test/variation.png",
        creditCost: 1,
        kieTaskId: "kie_1",
      }],
      createdAt: now,
      updatedAt: now,
    }, now);
    const reap = mapReapJobToUnifiedJob({
      id: "reap_1",
      userId: "user_1",
      projectId: "project_1",
      tool: "captions",
      status: "completed",
      sourceUrl: "https://cdn.test/source.mp4",
      outputUrls: ["https://cdn.test/out.mp4"],
      creditsCost: 2,
      error: null,
      options: {},
      createdAt: now,
      updatedAt: now,
    }, now);

    expect(transition.featureId).toBe("video-transitions");
    expect(transition.routingSource).toBe("legacy_fallback");
    expect(variation.featureId).toBeNull();
    expect(variation.result).toBe("https://cdn.test/variation.png");
    expect(reap.sourceType).toBe("reap");
    expect(reap.provider).toBe("Reap");
  });

  it("detects read-only stuck and integrity diagnostics", () => {
    const oldProcessing = mapGenerationToUnifiedJob({
      id: "gen_old",
      userId: "user_1",
      mediaUrl: "task:",
      outputUrl: null,
      status: "processing",
      assetType: "VIDEO",
      modelUsed: "model",
      cost: 5,
      providerName: "WaveSpeed",
      providerRequestId: null,
      createdAt: new Date("2026-08-15T08:00:00.000Z"),
      providerUsageRecords: [],
      generationRequestSnapshot: null,
    }, now);

    expect(oldProcessing.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(["processing_too_long", "provider_task_id_missing", "provider_usage_missing"]),
    );
    expect(detectJobDiagnostics(oldProcessing, now).length).toBeGreaterThan(0);
  });

  it("summarizes displayed jobs by normalized status and source", () => {
    const jobs = [
      mapTransitionJobToUnifiedJob({
        id: "transition_1",
        userId: "u",
        presetId: "p",
        status: "queued",
        taskId: null,
        creditsCost: 1,
        resultUrl: null,
        error: null,
        payload: {},
        createdAt: now,
        updatedAt: now,
        output: null,
      }, now),
      mapVariationJobToUnifiedJob({
        id: "variation_1",
        userId: "u",
        status: "completed",
        error: null,
        outputs: [],
        createdAt: now,
        updatedAt: now,
      }, now),
    ];

    expect(summarizeUnifiedJobs(jobs)).toMatchObject({
      totalDisplayed: 2,
      byStatus: { queued: 1, processing: 0, completed: 1, failed: 0, cancelled: 0 },
      bySource: { generation: 0, transition: 1, variation: 1, reap: 0, cinema: 0 },
    });
  });
});

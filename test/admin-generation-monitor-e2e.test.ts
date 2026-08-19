import { describe, it, expect } from "vitest";

import {
  mapGenerationToHistoryRow,
  resolveHumanToolName,
  inferModality,
  summarizeHistoryRows,
} from "@/lib/admin/history-read-model";

describe("ADMIN GENERATION MONITOR E2E CONTRACT SUITE", () => {
  const mockCreatedAt = new Date("2026-08-18T10:00:00.000Z");
  const mockCompletedAt = new Date("2026-08-18T10:01:20.000Z");

  it("1. maps generation with real aspect ratio, user email, human tool name and media output", () => {
    const row = mapGenerationToHistoryRow({
      id: "gen_video_916",
      userId: "user_pro_99",
      prompt: "Portrait cinematography of neon rain cyberpunk dancer",
      mediaUrl: "videos/neon_dancer.mp4",
      outputUrl: "videos/neon_dancer.mp4",
      status: "completed",
      assetType: "video",
      modelUsed: "bytedance/seedance-2.5",
      cost: 28,
      providerName: "wavespeed",
      providerModel: "bytedance/seedance-2.5/text-to-video-turbo",
      providerRequestId: "ws_task_88329",
      providerCostUsd: 0.18,
      providerCostSource: "actual",
      duration: 10,
      aspectRatio: "9:16",
      resolution: "720p",
      quality: "high",
      posterUrl: "thumbnails/neon_dancer_poster.jpg",
      isFlagged: false,
      isFavorite: true,
      createdAt: mockCreatedAt,
      user: {
        id: "user_pro_99",
        name: "Sara Connor",
        email: "sara.connor@cyber.io",
      },
      providerUsageRecords: [
        {
          id: "pur_1",
          providerName: "wavespeed",
          providerModel: "bytedance/seedance-2.5/text-to-video-turbo",
          providerRequestId: "ws_task_88329",
          providerCostUsd: 0.18,
          providerCostSource: "actual",
          status: "completed",
          createdAt: mockCreatedAt,
          updatedAt: mockCompletedAt,
        },
      ],
      generationRequestSnapshot: {
        id: "snap_1",
        model: "bytedance/seedance-2.5",
        generationType: "image-to-video",
        duration: 10,
        resolution: "720p",
        aspectRatio: "9:16",
        quality: "high",
        userCreditsCharged: 28,
        estimatedProviderCostUsd: 0.18,
        requestPayload: {
          referenceImageUrls: ["https://r2.saadstudio.com/images/ref1.jpg"],
          first_frame_url: "https://r2.saadstudio.com/images/first.jpg",
          last_frame_url: "https://r2.saadstudio.com/images/last.jpg",
        },
      },
    });

    expect(row.generationId).toBe("gen_video_916");
    expect(row.userEmail).toBe("sara.connor@cyber.io");
    expect(row.userName).toBe("Sara Connor");
    expect(row.toolName).toBe("Image to Video");
    expect(row.aspectRatio).toBe("9:16");
    expect(row.modality).toBe("video");
    expect(row.officialProvider).toBe("BytePlus");
    expect(row.provider).toBe("wavespeed");
    expect(row.creditsCharged).toBe(28);
    expect(row.providerActualCost).toBe(0.18);
    expect(row.status).toBe("completed");
    expect(row.posterUrl).toBe("thumbnails/neon_dancer_poster.jpg");
  });

  it("2. resolves human-readable tool names accurately across all modalities", () => {
    expect(resolveHumanToolName("relight")).toBe("AI Relighting");
    expect(resolveHumanToolName("makeup")).toBe("Beauty & Makeup");
    expect(resolveHumanToolName("storyboard")).toBe("Storyboard Creator");
    expect(resolveHumanToolName("transition")).toBe("Video Transition");
    expect(resolveHumanToolName("dubbing")).toBe("AI Dubbing");
    expect(resolveHumanToolName("captions")).toBe("Auto Captions");
    expect(resolveHumanToolName("reframe")).toBe("Video Reframe");
    expect(resolveHumanToolName("inpaint")).toBe("Inpainting");
    expect(resolveHumanToolName("video", null, "text-to-video")).toBe("Text to Video");
    expect(resolveHumanToolName("image")).toBe("Image Generation");
  });

  it("3. correctly infers modality from assetType and model identifiers", () => {
    expect(inferModality("video", "google/veo-3.1-fast")).toBe("video");
    expect(inferModality("image", "openai/dall-e-3")).toBe("image");
    expect(inferModality("audio", "elevenlabs/speech")).toBe("audio");
    expect(inferModality("3d", "tripo/mesh")).toBe("3d");
  });

  it("4. handles failed generation states with zero credit charges or explicit refund status", () => {
    const row = mapGenerationToHistoryRow(
      {
        id: "gen_failed_1",
        userId: "user_2",
        prompt: "Failed render test",
        mediaUrl: "failed:504_gateway_timeout",
        outputUrl: null,
        status: "failed",
        assetType: "video",
        modelUsed: "google/veo-3.1-fast",
        cost: 22.4,
        createdAt: mockCreatedAt,
        providerUsageRecords: [],
      },
      [
        {
          id: "ledg_charge",
          userId: "user_2",
          generationId: "gen_failed_1",
          delta: -22.4,
          reason: "generation_charge",
          createdAt: mockCreatedAt,
        },
        {
          id: "ledg_refund",
          userId: "user_2",
          generationId: "gen_failed_1",
          delta: 22.4,
          reason: "generation_refund_provider_failed",
          createdAt: mockCompletedAt,
        },
      ]
    );

    expect(row.status).toBe("failed");
    expect(row.creditState).toBe("refunded");
    expect(row.creditsRefunded).toBe(22.4);
  });

  it("5. computes accurate summary statistics across diverse rows", () => {
    const rows = [
      mapGenerationToHistoryRow({
        id: "g1",
        userId: "u1",
        status: "completed",
        assetType: "image",
        modelUsed: "openai/dall-e-3",
        cost: 5,
        providerCostUsd: 0.04,
        providerCostSource: "actual",
        createdAt: mockCreatedAt,
      }),
      mapGenerationToHistoryRow({
        id: "g2",
        userId: "u2",
        status: "processing",
        assetType: "video",
        modelUsed: "google/veo-3.1-fast",
        cost: 20,
        createdAt: mockCreatedAt,
      }),
      mapGenerationToHistoryRow({
        id: "g3",
        userId: "u3",
        status: "failed",
        assetType: "video",
        modelUsed: "bytedance/seedance-2.5",
        cost: 0,
        createdAt: mockCreatedAt,
      }),
    ];

    const summary = summarizeHistoryRows(rows, { total: 10, linked: 8, unlinked: 2 }, 100);

    expect(summary.totalGenerations).toBe(100);
    expect(summary.completed).toBe(1);
    expect(summary.processing).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.creditsCharged).toBe(25);
    expect(summary.totalProviderCostUsd).toBe(0.04);
  });
});

import { describe, expect, it } from "vitest";

import {
  mapGenerationToHistoryRow,
  summarizeCreditLedger,
  summarizeHistoryRows,
} from "@/lib/admin/history-read-model";

const createdAt = new Date("2026-08-15T10:00:00.000Z");
const updatedAt = new Date("2026-08-15T10:03:00.000Z");

describe("admin history read model", () => {
  it("maps generation, provider usage, routing metadata, and explicit credit ledger entries", () => {
    const row = mapGenerationToHistoryRow({
      id: "gen_1",
      userId: "user_1",
      prompt: "Create video",
      mediaUrl: "https://cdn.test/video.mp4",
      outputUrl: "https://cdn.test/video.mp4",
      status: "completed",
      assetType: "VIDEO",
      modelUsed: "veo-3.1-fast",
      cost: 10,
      providerName: "Google",
      providerRequestId: "gvo:abc",
      providerCostUsd: 1.25,
      providerCostSource: "actual",
      duration: 8,
      createdAt,
      providerUsageRecords: [{
        id: "usage_1",
        providerName: "Google",
        providerModel: "veo-3.1-fast",
        providerRequestId: "gvo:abc",
        providerCostUsd: 1.25,
        providerCostSource: "actual",
        status: "completed",
        createdAt,
        updatedAt,
      }],
      generationRequestSnapshot: {
        provider: "Google",
        model: "veo-3.1-fast",
        duration: 8,
        userCreditsCharged: 10,
        estimatedProviderCostUsd: 1.1,
        requestPayload: {
          routing: {
            routingSource: "control_center",
            effectiveProvider: "google",
          },
        },
      },
    }, [
      {
        id: "ledger_charge",
        userId: "user_1",
        generationId: "gen_1",
        delta: -10,
        reason: "generation_charge",
        createdAt,
      },
    ]);

    expect(row.generationId).toBe("gen_1");
    expect(row.provider).toBe("Google");
    expect(row.routingSource).toBe("control_center");
    expect(row.providerTaskId).toBe("gvo:abc");
    expect(row.status).toBe("completed");
    expect(row.creditState).toBe("charged");
    expect(row.creditsCharged).toBe(10);
    expect(row.creditsRefunded).toBeNull();
    expect(row.providerActualCost).toBe(1.25);
    expect(row.providerEstimatedCost).toBe(1.1);
    expect(row.latencyMs).toBe(180000);
    expect(row.primaryResult).toBe("https://cdn.test/video.mp4");
  });

  it("uses explicit refund ledger entries instead of inferring refunds from failed status", () => {
    const refunded = summarizeCreditLedger([
      {
        id: "charge",
        userId: "u",
        generationId: "g",
        delta: -12,
        reason: "generation_charge",
        createdAt,
      },
      {
        id: "refund",
        userId: "u",
        generationId: "g",
        delta: 12,
        reason: "generation_refund_provider_failed",
        createdAt: updatedAt,
      },
    ]);
    const noLedger = summarizeCreditLedger([]);

    expect(refunded.charged).toBe(12);
    expect(refunded.refunded).toBe(12);
    expect(noLedger.charged).toBeNull();
    expect(noLedger.refunded).toBeNull();
  });

  it("marks failed rows with unknown refund when explicit ledger proof is absent", () => {
    const row = mapGenerationToHistoryRow({
      id: "gen_failed",
      userId: "user_1",
      prompt: "fail",
      mediaUrl: "failed:task:provider-error",
      outputUrl: null,
      status: "failed",
      assetType: "VIDEO",
      modelUsed: "model",
      cost: 7,
      providerName: "WaveSpeed",
      providerRequestId: "task",
      createdAt,
      providerUsageRecords: [],
      generationRequestSnapshot: null,
    }, []);

    expect(row.creditState).toBe("charged");
    expect(row.creditsRefunded).toBeNull();
    expect(row.error).toBe("task:provider-error");
    expect(row.observabilityGaps).toContain("Refund state cannot be proven without CreditLedgerEntry data.");
    expect(row.observabilityGaps).toContain("ProviderUsageRecord missing for a paid generation.");
  });

  it("summarizes history rows without revenue or margin analytics", () => {
    const rows = [
      mapGenerationToHistoryRow({
        id: "gen_1",
        userId: "u",
        mediaUrl: "https://cdn.test/out.png",
        outputUrl: "https://cdn.test/out.png",
        status: "completed",
        assetType: "IMAGE",
        modelUsed: "model",
        cost: 2,
        providerName: "WaveSpeed",
        createdAt,
        providerUsageRecords: [],
        generationRequestSnapshot: null,
      }, []),
      mapGenerationToHistoryRow({
        id: "gen_2",
        userId: "u",
        mediaUrl: "task:abc",
        outputUrl: null,
        status: "processing",
        assetType: "VIDEO",
        modelUsed: "model",
        cost: 5,
        providerName: "Google",
        createdAt,
        providerUsageRecords: [{ id: "usage", providerName: "Google", status: "processing", createdAt, updatedAt }],
        generationRequestSnapshot: null,
      }, []),
    ];

    expect(summarizeHistoryRows(rows, { total: 3, linked: 2, unlinked: 1 })).toMatchObject({
      totalGenerations: 2,
      completed: 1,
      failed: 0,
      processing: 1,
      providerUsageRecords: 3,
      providerUsageLinked: 2,
      providerUsageUnlinked: 1,
      rowsMissingProviderUsage: 1,
    });
  });
});

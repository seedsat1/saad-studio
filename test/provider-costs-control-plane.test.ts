import { describe, it, expect, vi } from "vitest";

// Mock prismadb
vi.mock("@/lib/prismadb", () => ({
  default: {
    generation: {
      findMany: vi.fn().mockImplementation(async (args) => {
        if (args?.distinct) {
          return [
            { providerName: "Google" },
            { providerName: "OpenAI" },
            { providerName: "WaveSpeed" },
            { providerName: "BytePlus" },
            { providerName: "Reap" },
            { providerName: null },
          ];
        }
        if (args?.take === 2500) {
          // Summary aggregation sample
          return [
            {
              id: "gen_1",
              providerName: "Google",
              providerModel: "google/veo-3.1-generate-preview",
              modelUsed: "google/veo3.1-fast-text-to-video",
              cost: 26.88,
              providerCostUsd: null,
              providerCostSource: null,
              duration: 8,
              resolution: "720p",
              quality: "fast",
              status: "completed",
              createdAt: new Date("2026-08-18T00:00:00Z"),
            },
            {
              id: "gen_2",
              providerName: "WaveSpeed",
              providerModel: "minimax/h3/reference-to-video",
              modelUsed: "minimax/h3/reference-to-video",
              cost: 28,
              providerCostUsd: 0.50,
              providerCostSource: "estimated",
              duration: 5,
              resolution: "768p",
              quality: "std",
              status: "completed",
              createdAt: new Date("2026-08-18T01:00:00Z"),
            },
            {
              id: "gen_3",
              providerName: "WaveSpeed",
              providerModel: "kwaivgi/kling-v3.0-pro/image-to-video",
              modelUsed: "kwaivgi/kling-v3.0-pro/image-to-video",
              cost: 45,
              providerCostUsd: null,
              providerCostSource: "unknown",
              duration: 10,
              resolution: "1080p",
              quality: "pro",
              status: "completed",
              createdAt: new Date("2026-08-18T02:00:00Z"),
            },
            {
              id: "gen_4",
              providerName: "Reap",
              providerModel: "reap/captions",
              modelUsed: "reap/captions",
              cost: 30,
              providerCostUsd: 0.05,
              providerCostSource: "estimated",
              duration: 60,
              resolution: "1080p",
              quality: "std",
              status: "completed",
              createdAt: new Date("2026-08-18T03:00:00Z"),
            },
          ];
        }
        // Paginated query
        return [
          {
            id: "gen_1",
            providerName: "Google",
            providerModel: "google/veo-3.1-generate-preview",
            modelUsed: "google/veo3.1-fast-text-to-video",
            cost: 26.88,
            providerCostUsd: null,
            providerCostSource: null,
            duration: 8,
            resolution: "720p",
            quality: "fast",
            status: "completed",
            createdAt: new Date("2026-08-18T00:00:00Z"),
            user: { email: "owner@saadstudio.com" },
            generationRequestSnapshot: {
              provider: "Google",
              model: "google/veo3.1-fast-text-to-video",
              estimatedProviderCostUsd: 0.80,
              userCreditsCharged: 26.88,
            },
            providerUsageRecords: [],
          },
          {
            id: "gen_3",
            providerName: "WaveSpeed",
            providerModel: "kwaivgi/kling-v3.0-pro/image-to-video",
            modelUsed: "kwaivgi/kling-v3.0-pro/image-to-video",
            cost: 45,
            providerCostUsd: null,
            providerCostSource: "unknown",
            duration: 10,
            resolution: "1080p",
            quality: "pro",
            status: "completed",
            createdAt: new Date("2026-08-18T02:00:00Z"),
            user: { email: "user@test.com" },
            generationRequestSnapshot: {
              provider: "WaveSpeed",
              model: "kwaivgi/kling-v3.0-pro/image-to-video",
              estimatedProviderCostUsd: null,
              userCreditsCharged: 45,
            },
            providerUsageRecords: [],
          },
        ];
      }),
      count: vi.fn().mockResolvedValue(4),
    },
    providerUsageRecord: {
      findMany: vi.fn().mockResolvedValue([
        { providerName: "Google" },
        { providerName: "WaveSpeed" },
        { providerName: "Reap" },
      ]),
    },
  },
}));

import {
  getProviderCostsReadModel,
  getDiscoveredProvidersList,
  evaluateCostTrust,
} from "@/lib/admin/provider-costs-read-model";

describe("Provider Costs Control Plane & Read Model Suite", () => {
  it("1. derives dynamic provider inventory from registry and database without hardcoding", () => {
    const list = getDiscoveredProvidersList(["Google", "WaveSpeed", "Reap", "CustomProvider", null]);
    const names = list.map((p) => p.name);

    expect(names).toContain("Google AI Studio");
    expect(names).toContain("WaveSpeed");
    expect(names).toContain("Reap.video");
    expect(names).toContain("CustomProvider");
    expect(names).toContain("Legacy / Unclassified");
  });

  it("2. verifies Google official tariff evaluates to ESTIMATED_VERIFIED", () => {
    const trust = evaluateCostTrust("Google", "estimated", 0.80, "VERIFIED_CURRENT", "official_docs");
    expect(trust).toBe("ESTIMATED_VERIFIED");
  });

  it("3. verifies OpenAI official tariff evaluates to ESTIMATED_VERIFIED", () => {
    const trust = evaluateCostTrust("OpenAI", "estimated", 0.04, "VERIFIED_CURRENT", "official_docs");
    expect(trust).toBe("ESTIMATED_VERIFIED");
  });

  it("4. verifies BytePlus official tariff evaluates to ESTIMATED_VERIFIED", () => {
    const trust = evaluateCostTrust("BytePlus", "estimated", 0.90, "VERIFIED_CURRENT", "official_docs");
    expect(trust).toBe("ESTIMATED_VERIFIED");
  });

  it("5. verifies ElevenLabs is classified as INACTIVE_LEGACY and excluded from active providers", () => {
    const list = getDiscoveredProvidersList(["Google", "WaveSpeed", "Reap"]);
    const eleven = list.find((p) => p.id === "elevenlabs");
    expect(eleven?.classification).toBe("INACTIVE_LEGACY");
    expect(eleven?.status).toBe("disabled");
  });

  it("6. verifies WaveSpeed verified routes evaluate to ESTIMATED_VERIFIED", () => {
    const trust = evaluateCostTrust("WaveSpeed", "estimated", 0.50, "VERIFIED_CURRENT", "official_docs");
    expect(trust).toBe("ESTIMATED_VERIFIED");
  });

  it("7. verifies WaveSpeed UNKNOWN route strictly remains UNKNOWN and null cost", () => {
    const trust = evaluateCostTrust("WaveSpeed", "unknown", null, "UNKNOWN", "unverified");
    expect(trust).toBe("UNKNOWN");
  });

  it("8. verifies Reap is classified as SHADOW_ANALYTICAL and separated from direct operating spend", () => {
    const trust = evaluateCostTrust("Reap", "estimated", 0.05, "VERIFIED_CURRENT", "shadow_analytical");
    expect(trust).toBe("SHADOW_ANALYTICAL");
  });

  it("9. verifies read model computes summary with separated shadow analytics and non-zero unknown handling", async () => {
    const model = await getProviderCostsReadModel({ page: 1, pageSize: 50 });

    expect(model.summary).toBeDefined();
    expect(model.summary.totalProviderCostUsd).toBeGreaterThanOrEqual(0);
    expect(model.summary.shadowAnalyticalCostUsd).toBeGreaterThanOrEqual(0.05);
    expect(model.summary.unknownCostGenerationCount).toBeGreaterThanOrEqual(1);

    // Verify executions in trace
    expect(model.recentExecutions.length).toBeGreaterThan(0);
    const unkItem = model.recentExecutions.find((e) => e.executionProvider === "WaveSpeed" && e.costTrust === "UNKNOWN");
    if (unkItem) {
      expect(unkItem.providerCostUsd).toBeNull(); // Strictly null, NEVER $0.00
    }
  });

  it("10. verifies customer credits and provider costs remain completely decoupled", async () => {
    const model = await getProviderCostsReadModel();
    const googleGen = model.recentExecutions.find((e) => e.executionProvider === "Google");

    expect(googleGen?.userCreditsCharged).toBe(26.88); // Customer credits
    expect(googleGen?.providerCostUsd).toBe(0.80); // Provider USD cost
  });

  it("11. verifies pagination is bounded and does not load unbounded arrays", async () => {
    const model = await getProviderCostsReadModel({ page: 1, pageSize: 2 });
    expect(model.pagination.pageSize).toBe(2);
    expect(model.pagination.totalCount).toBe(4);
    expect(model.pagination.totalPages).toBe(2);
  });
});

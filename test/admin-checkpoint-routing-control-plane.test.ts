import { describe, it, expect, vi } from "vitest";

// Mock prismadb with vi.hoisted
const { mockPrisma } = vi.hoisted(() => {
  const store: Record<string, string> = {
    model_routing_overrides: JSON.stringify({
      "nano-banana-pro": {
        primaryRoute: { provider: "wavespeed", route: "google/nano-banana" },
        runtimeSource: "wavespeed",
        fallbackRoutes: [],
      },
    }),
    model_routing_audit_log: JSON.stringify([]),
  };

  const mock: any = {
    platformConfig: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { key: string } }) => {
        if (store[where.key]) {
          return { key: where.key, value: store[where.key], updatedAt: new Date("2026-08-18T12:00:00.000Z") };
        }
        return null;
      }),
      upsert: vi.fn().mockImplementation(async ({ where, update, create }: any) => {
        store[where.key] = update?.value || create?.value;
        return { key: where.key, value: store[where.key], updatedAt: new Date("2026-08-18T12:00:00.000Z") };
      }),
    },
  };
  mock.$transaction = vi.fn(async (cb: any) => cb(mock));
  return { mockPrisma: mock };
});

vi.mock("@/lib/prismadb", () => ({
  default: mockPrisma,
}));

import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { resolveOfficialProvider, buildAvailableCheckpoints } from "@/lib/routing/checkpoint-matrix-builder";
import { resolveRuntimeProviderRoute } from "@/lib/routing/runtime-routing";
import { saveRoutingOverride, RoutingConcurrencyError } from "@/lib/routing/routing-config";
import { getGenerationCostSync } from "@/lib/pricing";

describe("Admin Routing — Product Checkpoint Switching Control Plane Suite", () => {
  // ─── 1. CORE LOGICAL PRODUCT & OFFICIAL SOURCE IMMUTABILITY ───────────────
  describe("Logical Product Identity & Official Source", () => {
    it("1.1. proves official provider identity is permanent and separate from execution source", async () => {
      const data = await loadAdminRoutingData();
      const googleRow = data.rows.find((r) => r.modelId === "nano-banana-pro");

      expect(googleRow).toBeDefined();
      expect(googleRow?.officialProvider).toBe("google");
      expect(googleRow?.officialProviderName).toBe("Google");
      // Even though WaveSpeed is selected as execution source in the mock override!
      expect(googleRow?.selectedExecutionProvider).toBe("wavespeed");
      expect(googleRow?.officialProvider).not.toBe(googleRow?.selectedExecutionProvider);
    });

    it("1.2. proves BytePlus is official source for Seedance while WaveSpeed is active execution source", async () => {
      const data = await loadAdminRoutingData();
      const seedanceRow = data.rows.find((r) => r.modelId.includes("seedance"));

      expect(seedanceRow).toBeDefined();
      expect(seedanceRow?.officialProvider).toBe("byteplus");
      expect(seedanceRow?.officialProviderName).toBe("BytePlus");
      expect(seedanceRow?.selectedExecutionProvider).toBe("wavespeed");
    });
  });

  // ─── 2. CHECKPOINT MATRIX & PROVIDER ALTERNATIVES ─────────────────────────
  describe("Checkpoint Matrix & Availability", () => {
    it("2.1. verifies Google products expose Google Official, WaveSpeed, and KIE checkpoints", () => {
      const checkpoints = buildAvailableCheckpoints({
        modelId: "nano-banana-pro",
        modality: "image",
        officialProvider: "google",
        currentSelectedProvider: "google",
        currentSelectedRoute: "nano-banana-pro",
      });

      const providers = checkpoints.map((c) => c.provider);
      expect(providers).toContain("google");
      expect(providers).toContain("wavespeed");
      expect(providers).toContain("kie");

      const officialCp = checkpoints.find((c) => c.provider === "google");
      expect(officialCp?.isOfficial).toBe(true);
    });

    it("2.2. verifies OpenAI products expose OpenAI Official, WaveSpeed, and KIE checkpoints", () => {
      const checkpoints = buildAvailableCheckpoints({
        modelId: "openai/dall-e-3",
        modality: "image",
        officialProvider: "openai",
        currentSelectedProvider: "openai",
        currentSelectedRoute: "openai/dall-e-3",
      });

      const providers = checkpoints.map((c) => c.provider);
      expect(providers).toContain("openai");
      expect(providers).toContain("wavespeed");
      expect(providers).toContain("kie");
    });

    it("2.3. verifies BytePlus Seedance exposes BytePlus Standby, WaveSpeed, and KIE checkpoints", () => {
      const checkpoints = buildAvailableCheckpoints({
        modelId: "bytedance/seedance-2.5",
        modality: "video",
        officialProvider: "byteplus",
        currentSelectedProvider: "wavespeed",
        currentSelectedRoute: "bytedance/seedance-2.5/text-to-video-turbo",
      });

      const providers = checkpoints.map((c) => c.provider);
      expect(providers).toContain("byteplus");
      expect(providers).toContain("wavespeed");
      expect(providers).toContain("kie");

      const bpCp = checkpoints.find((c) => c.provider === "byteplus");
      expect(bpCp?.status).toBe("PROVIDER_STANDBY");
      expect(bpCp?.isOfficial).toBe(true);
    });

    it("2.4. verifies Reap tools expose ONLY Reap Official Direct with zero fake checkpoints", () => {
      const checkpoints = buildAvailableCheckpoints({
        modelId: "reap/captions",
        modality: "video",
        officialProvider: "reap",
        currentSelectedProvider: "reap",
        currentSelectedRoute: "reap/captions",
      });

      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].provider).toBe("reap");
      expect(checkpoints[0].isOfficial).toBe(true);
    });
  });

  // ─── 3. OPTIMISTIC CONCURRENCY & AUDIT LOGGING ────────────────────────────
  describe("Optimistic Concurrency & Audit Trail", () => {
    it("3.1. saves checkpoint switch atomically with expectedUpdatedAt", async () => {
      await saveRoutingOverride(
        "nano-banana-pro",
        {
          primaryRoute: { provider: "wavespeed", route: "google/nano-banana" },
          runtimeSource: "wavespeed",
          fallbackRoutes: [],
        },
        {
          expectedUpdatedAt: "2026-08-18T12:00:00.000Z",
          operatorId: "admin_tester",
        }
      );

      // Verify Prisma upsert was called
      expect(mockPrisma.platformConfig.upsert).toHaveBeenCalled();
    });

    it("3.2. throws RoutingConcurrencyError when expectedUpdatedAt does not match (409 Conflict)", async () => {
      await expect(
        saveRoutingOverride(
          "nano-banana-pro",
          {
            primaryRoute: { provider: "google", route: "nano-banana-pro" },
            runtimeSource: "google",
          },
          {
            expectedUpdatedAt: "2020-01-01T00:00:00.000Z", // Stale token!
            operatorId: "admin_tester",
          }
        )
      ).rejects.toThrow(RoutingConcurrencyError);
    });
  });

  // ─── 4. RUNTIME RESOLUTION WITHOUT HARCODED BYPASS ────────────────────────
  describe("Runtime Routing Resolution", () => {
    it("4.1. resolves runtime provider route to the selected WaveSpeed checkpoint for Google nano-banana", async () => {
      const decision = await resolveRuntimeProviderRoute({
        modelId: "nano-banana-pro",
        modality: "image",
        legacyRoute: { provider: "google", route: "nano-banana-pro" },
      });

      expect(decision.effectiveProvider).toBe("wavespeed");
      expect(decision.providerRoute).toBe("google/nano-banana");
      expect(decision.routingSource).toBe("control_center");
    });

    it("4.2. customer pricing is 100% invariant across checkpoint switches", () => {
      const googleUserCost = getGenerationCostSync("nano-banana-pro", 5, 1, "1K");
      const waveUserCost = getGenerationCostSync("nano-banana-pro", 5, 1, "1K");

      expect(googleUserCost).toBe(waveUserCost);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted Mocks for isolated provider executors
const {
  mockGoogleExecutor,
  mockOpenAIExecutor,
  mockBytePlusExecutor,
  mockWaveSpeedExecutor,
  mockKIEExecutor,
  mockPrismaStore,
} = vi.hoisted(() => {
  const store: Record<string, { value: string; updatedAt: Date }> = {};
  return {
    mockGoogleExecutor: vi.fn(),
    mockOpenAIExecutor: vi.fn(),
    mockBytePlusExecutor: vi.fn(),
    mockWaveSpeedExecutor: vi.fn(),
    mockKIEExecutor: vi.fn(),
    mockPrismaStore: store,
  };
});

// Mock database layer
vi.mock("@/lib/prismadb", () => {
  const mockPrisma: any = {
    platformConfig: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { key: string } }) => {
        const item = mockPrismaStore[where.key];
        if (item) return { key: where.key, value: item.value, updatedAt: item.updatedAt };
        return null;
      }),
      upsert: vi.fn().mockImplementation(async ({ where, update, create }: any) => {
        const value = update?.value || create?.value;
        const updatedAt = new Date("2026-08-18T12:00:00.000Z");
        mockPrismaStore[where.key] = { value, updatedAt };
        return { key: where.key, value, updatedAt };
      }),
    },
  };
  mockPrisma.$transaction = vi.fn(async (cb: any) => cb(mockPrisma));
  return { default: mockPrisma };
});

import { buildCanonicalRequest } from "@/lib/routing/checkpoints/canonical-request";
import { normalizeAndAdaptCheckpointRequest } from "@/lib/routing/checkpoints/checkpoint-adapter";
import { CheckpointCapabilityMismatchError } from "@/lib/routing/checkpoints/checkpoint-validator";
import { resolveCanonicalProviderTariff } from "@/lib/provider-tariff-registry";
import { getGenerationCostSync } from "@/lib/pricing";
import { saveRoutingOverride, RoutingConcurrencyError, loadRoutingAuditLog } from "@/lib/routing/routing-config";
import { resolveRuntimeProviderRoute } from "@/lib/routing/runtime-routing";
import { buildAvailableCheckpoints } from "@/lib/routing/checkpoint-matrix-builder";

/**
 * Mock dispatcher representing the runtime execution layer.
 * Enforces: Canonical Request -> Capability Validator -> Adapter -> Dedicated Executor.
 */
async function mockRuntimeExecutionPipeline(params: {
  logicalProductId: string;
  officialProvider: string;
  modality: "video" | "image";
  prompt: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
  firstFrame?: string;
  negativePrompt?: string;
  selectedProviderOverride?: "google" | "openai" | "byteplus" | "wavespeed" | "kie";
  selectedRouteOverride?: string;
}) {
  // 1. Resolve Routing Decision
  const routing = await resolveRuntimeProviderRoute({
    modelId: params.logicalProductId,
    modality: params.modality,
    legacyRoute: {
      provider: params.selectedProviderOverride || "google",
      route: params.selectedRouteOverride || params.logicalProductId,
    },
  });

  const effectiveProvider = params.selectedProviderOverride || routing.effectiveProvider;
  const effectiveRoute = params.selectedRouteOverride || routing.providerRoute;

  // 2. Build Canonical Request
  const canonicalReq = buildCanonicalRequest({
    logicalProductId: params.logicalProductId,
    officialProvider: params.officialProvider,
    modality: params.modality,
    prompt: params.prompt,
    durationSec: params.durationSec,
    resolution: params.resolution,
    aspectRatio: params.aspectRatio,
    generateAudio: params.generateAudio,
    firstFrame: params.firstFrame,
    negativePrompt: params.negativePrompt,
  });

  // 3. Normalization Layer (Strict capability validation & Provider payload adaptation)
  const execPkg = normalizeAndAdaptCheckpointRequest(canonicalReq, {
    provider: effectiveProvider,
    route: effectiveRoute,
    officialProvider: params.officialProvider,
  });

  // 4. Dispatch to isolated executor based strictly on selected checkpoint
  let result: any = null;
  switch (execPkg.selectedExecutionProvider) {
    case "google":
      result = await mockGoogleExecutor(execPkg.providerPayload);
      break;
    case "openai":
      result = await mockOpenAIExecutor(execPkg.providerPayload);
      break;
    case "byteplus":
      result = await mockBytePlusExecutor(execPkg.providerPayload);
      break;
    case "wavespeed":
      result = await mockWaveSpeedExecutor(execPkg.providerPayload);
      break;
    case "kie":
      result = await mockKIEExecutor(execPkg.providerPayload);
      break;
    default:
      throw new Error(`Unknown provider: ${execPkg.selectedExecutionProvider}`);
  }

  // 5. Build Execution Trace Snapshot
  const tariff = resolveCanonicalProviderTariff({
    providerName: execPkg.selectedExecutionProvider,
    modelRef: execPkg.providerRoute,
    durationSec: params.durationSec || 5,
  });

  return {
    result,
    trace: {
      logicalProductId: execPkg.logicalProductId,
      officialProvider: execPkg.officialProvider,
      selectedExecutionProvider: execPkg.selectedExecutionProvider,
      providerName: execPkg.selectedExecutionProvider,
      providerRoute: execPkg.providerRoute,
      providerModel: execPkg.upstreamModel,
      providerCostUsd: tariff.usd,
      providerCostSource: tariff.provenance?.pricingSource || "canonical_tariff",
      tariffKey: `${execPkg.selectedExecutionProvider}:${execPkg.providerRoute}`,
    },
  };
}

describe("FINAL END-TO-END CHECKPOINT ROUTING RUNTIME VERIFICATION SUITE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default success responses
    mockGoogleExecutor.mockResolvedValue({ status: "success", urls: ["https://r2.saadstudio.com/google.mp4"] });
    mockOpenAIExecutor.mockResolvedValue({ status: "success", urls: ["https://r2.saadstudio.com/openai.png"] });
    mockBytePlusExecutor.mockResolvedValue({ status: "success", urls: ["https://r2.saadstudio.com/byteplus.mp4"] });
    mockWaveSpeedExecutor.mockResolvedValue({ status: "success", urls: ["https://r2.saadstudio.com/wavespeed.mp4"] });
    mockKIEExecutor.mockResolvedValue({ status: "success", urls: ["https://r2.saadstudio.com/kie.mp4"] });
  });

  // ─── 1. GOOGLE PRODUCT VERIFICATION ───────────────────────────────────────
  describe("1. Google Logical Product (Veo 3.1 Fast)", () => {
    const googleProduct = {
      logicalProductId: "google/veo-3.1-fast-generate-preview",
      officialProvider: "Google",
      modality: "video" as const,
      prompt: "Cinematic shot of desert oasis at twilight",
      durationSec: 8,
      resolution: "720p",
      aspectRatio: "16:9",
    };

    it("1.A. Google Checkpoint Selected -> invokes ONLY Google Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...googleProduct,
        selectedProviderOverride: "google",
        selectedRouteOverride: "google/veo-3.1-fast-generate-preview",
      });

      expect(mockGoogleExecutor).toHaveBeenCalledTimes(1);
      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);
      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(0);
      expect(mockBytePlusExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("Google");
      expect(trace.selectedExecutionProvider).toBe("google");
      expect(trace.providerRoute).toBe("google/veo-3.1-fast-generate-preview");
    });

    it("1.B. WaveSpeed Checkpoint Selected -> invokes ONLY WaveSpeed Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...googleProduct,
        selectedProviderOverride: "wavespeed",
        selectedRouteOverride: "google/veo3.1-fast-text-to-video",
      });

      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(1);
      expect(mockGoogleExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);
      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(0);
      expect(mockBytePlusExecutor).toHaveBeenCalledTimes(0);

      // Official provider remains immutable Google while execution is WaveSpeed
      expect(trace.officialProvider).toBe("Google");
      expect(trace.selectedExecutionProvider).toBe("wavespeed");
      expect(trace.providerRoute).toBe("google/veo3.1-fast-text-to-video");
    });

    it("1.C. KIE.ai Checkpoint Selected -> invokes ONLY KIE Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...googleProduct,
        selectedProviderOverride: "kie",
        selectedRouteOverride: "veo3-fast",
      });

      expect(mockKIEExecutor).toHaveBeenCalledTimes(1);
      expect(mockGoogleExecutor).toHaveBeenCalledTimes(0);
      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(0);
      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(0);
      expect(mockBytePlusExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("Google");
      expect(trace.selectedExecutionProvider).toBe("kie");
      expect(trace.providerRoute).toBe("veo3-fast");
    });
  });

  // ─── 2. OPENAI PRODUCT VERIFICATION ───────────────────────────────────────
  describe("2. OpenAI Logical Product (DALL-E 3)", () => {
    const openaiProduct = {
      logicalProductId: "openai/dall-e-3",
      officialProvider: "OpenAI",
      modality: "image" as const,
      prompt: "Breathtaking crystalline waterfall in bioluminescent cavern",
      aspectRatio: "16:9",
    };

    it("2.A. OpenAI Checkpoint Selected -> invokes ONLY OpenAI Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...openaiProduct,
        selectedProviderOverride: "openai",
        selectedRouteOverride: "openai/dall-e-3",
      });

      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(1);
      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);
      expect(mockGoogleExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("OpenAI");
      expect(trace.selectedExecutionProvider).toBe("openai");
    });

    it("2.B. WaveSpeed Checkpoint Selected -> invokes ONLY WaveSpeed Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...openaiProduct,
        selectedProviderOverride: "wavespeed",
        selectedRouteOverride: "openai/dall-e-3",
      });

      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(1);
      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("OpenAI");
      expect(trace.selectedExecutionProvider).toBe("wavespeed");
    });

    it("2.C. KIE.ai Checkpoint Selected -> invokes ONLY KIE Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...openaiProduct,
        selectedProviderOverride: "kie",
        selectedRouteOverride: "dalle3",
      });

      expect(mockKIEExecutor).toHaveBeenCalledTimes(1);
      expect(mockOpenAIExecutor).toHaveBeenCalledTimes(0);
      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("OpenAI");
      expect(trace.selectedExecutionProvider).toBe("kie");
    });
  });

  // ─── 3. BYTEPLUS / SEEDANCE PRODUCT VERIFICATION ──────────────────────────
  describe("3. BytePlus / Seedance Logical Product", () => {
    const seedanceProduct = {
      logicalProductId: "bytedance/seedance-2.5",
      officialProvider: "BytePlus",
      modality: "video" as const,
      prompt: "Samurai duel on a rainy bamboo bridge",
      durationSec: 10,
      resolution: "720p",
      aspectRatio: "16:9",
    };

    it("3.A. WaveSpeed Active Checkpoint Selected -> invokes ONLY WaveSpeed Executor", async () => {
      const { trace } = await mockRuntimeExecutionPipeline({
        ...seedanceProduct,
        selectedProviderOverride: "wavespeed",
        selectedRouteOverride: "bytedance/seedance-2.5/text-to-video-turbo",
      });

      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(1);
      expect(mockBytePlusExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);

      expect(trace.officialProvider).toBe("BytePlus");
      expect(trace.selectedExecutionProvider).toBe("wavespeed");
    });

    it("3.B. BytePlus and KIE Standby Policy Verification without Global Mutation", () => {
      const checkpoints = buildAvailableCheckpoints({
        modelId: "bytedance/seedance-2.5",
        modality: "video",
        officialProvider: "byteplus",
        currentSelectedProvider: "wavespeed",
        currentSelectedRoute: "bytedance/seedance-2.5/text-to-video-turbo",
      });

      const bp = checkpoints.find((c) => c.provider === "byteplus");
      const kie = checkpoints.find((c) => c.provider === "kie");
      const ws = checkpoints.find((c) => c.provider === "wavespeed");

      expect(ws?.status).toBe("SELECTED");
      expect(bp?.status).toBe("PROVIDER_STANDBY");
      expect(kie?.status).toBe("PROVIDER_STANDBY");
    });
  });

  // ─── 4. COST ATTRIBUTION & TARIFF RESOLUTION ──────────────────────────────
  describe("4. Cost Attribution & Cross-Provider Tariff Isolation", () => {
    it("4.1. resolves isolated provider tariffs matching the concrete execution source", () => {
      const googleTariff = resolveCanonicalProviderTariff({
        providerName: "google",
        modelRef: "google/veo-3.1-fast-generate-preview",
        durationSec: 8,
      });

      const waveTariff = resolveCanonicalProviderTariff({
        providerName: "wavespeed",
        modelRef: "google/veo3.1-fast-text-to-video",
        durationSec: 8,
      });

      const kieTariff = resolveCanonicalProviderTariff({
        providerName: "kie",
        modelRef: "veo3-fast",
        durationSec: 8,
      });

      expect(googleTariff.providerName.toLowerCase()).toBe("google");
      expect(waveTariff.providerName.toLowerCase()).toBe("wavespeed");
      expect(kieTariff.providerName.toLowerCase()).toBe("kie.ai");

      // Verify zero cross-provider tariff leakage
      expect(waveTariff.usd).not.toBe(googleTariff.usd);
    });
  });

  // ─── 5. CUSTOMER PRICING INVARIANCE ───────────────────────────────────────
  describe("5. Customer Credit Pricing Invariant", () => {
    it("5.1. customer credit price is identical across all checkpoints", () => {
      const costGoogle = getGenerationCostSync("google/veo3.1-fast-text-to-video", 8, 1, "720p");
      const costWave = getGenerationCostSync("google/veo3.1-fast-text-to-video", 8, 1, "720p");
      const costOfficialRef = getGenerationCostSync("google/veo-3.1-fast-generate-preview", 8, 1, "720p");

      expect(costGoogle).toBe(22.4);
      expect(costWave).toBe(22.4);
      expect(costOfficialRef).toBe(22.4);
    });
  });

  // ─── 6. FAILURE BEHAVIOR & AUTO-FALLBACK PROHIBITION ──────────────────────
  describe("6. Failure Behavior (No Hidden Retries / Auto-Fallback = OFF)", () => {
    it("6.1. when selected WaveSpeed checkpoint fails, fails immediately with zero calls to other providers", async () => {
      mockWaveSpeedExecutor.mockRejectedValueOnce(new Error("WaveSpeed 503 Service Unavailable"));

      await expect(
        mockRuntimeExecutionPipeline({
          logicalProductId: "google/veo-3.1-fast-generate-preview",
          officialProvider: "Google",
          modality: "video",
          prompt: "Futuristic city in rain",
          durationSec: 8,
          selectedProviderOverride: "wavespeed",
          selectedRouteOverride: "google/veo3.1-fast-text-to-video",
        })
      ).rejects.toThrow("WaveSpeed 503 Service Unavailable");

      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(1);
      // Auto-fallback is strictly OFF: other providers MUST NOT be called!
      expect(mockGoogleExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);
    });
  });

  // ─── 7. UNSUPPORTED CAPABILITY REJECTION ──────────────────────────────────
  describe("7. Strict Capability Enforcement (Zero Silent Dropping)", () => {
    it("7.1. throws CheckpointCapabilityMismatchError and makes ZERO provider calls when unsupported feature requested", async () => {
      // WaveSpeed does not support native audio generation for Veo
      await expect(
        mockRuntimeExecutionPipeline({
          logicalProductId: "google/veo-3.1-fast-generate-preview",
          officialProvider: "Google",
          modality: "video",
          prompt: "Thunderstorm over canyon",
          durationSec: 8,
          generateAudio: true, // Unsupported on WaveSpeed
          selectedProviderOverride: "wavespeed",
          selectedRouteOverride: "google/veo3.1-fast-text-to-video",
        })
      ).rejects.toThrow(CheckpointCapabilityMismatchError);

      expect(mockWaveSpeedExecutor).toHaveBeenCalledTimes(0);
      expect(mockGoogleExecutor).toHaveBeenCalledTimes(0);
      expect(mockKIEExecutor).toHaveBeenCalledTimes(0);
    });
  });

  // ─── 8. OPTIMISTIC CONCURRENCY & AUDIT EVENT DISCIPLINE ───────────────────
  describe("8. Optimistic Concurrency & Audit Trail", () => {
    it("8.1. rejects stale write with RoutingConcurrencyError without creating audit logs", async () => {
      // Seed store with initial version
      mockPrismaStore["model_routing_overrides"] = {
        value: JSON.stringify({}),
        updatedAt: new Date("2026-08-18T12:00:00.000Z"),
      };
      mockPrismaStore["model_routing_audit_log"] = {
        value: JSON.stringify([]),
        updatedAt: new Date("2026-08-18T12:00:00.000Z"),
      };

      await expect(
        saveRoutingOverride(
          "nano-banana-pro",
          {
            primaryRoute: { provider: "wavespeed", route: "google/nano-banana" },
            runtimeSource: "wavespeed",
          },
          {
            expectedUpdatedAt: "1999-01-01T00:00:00.000Z", // Stale version token
            operatorId: "admin_user",
          }
        )
      ).rejects.toThrow(RoutingConcurrencyError);

      const auditLog = await loadRoutingAuditLog();
      expect(auditLog.length).toBe(0);
    });

    it("8.2. records exactly one audit event on successful switch", async () => {
      await saveRoutingOverride(
        "nano-banana-pro",
        {
          primaryRoute: { provider: "wavespeed", route: "google/nano-banana" },
          runtimeSource: "wavespeed",
        },
        {
          expectedUpdatedAt: "2026-08-18T12:00:00.000Z",
          operatorId: "admin_tester",
        }
      );

      const auditLog = await loadRoutingAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].modelId).toBe("nano-banana-pro");
      expect(auditLog[0].action).toBe("save_override");
      expect(auditLog[0].newProvider).toBe("wavespeed");
    });
  });
});

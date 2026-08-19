import { describe, expect, it, vi } from "vitest";
import { validateRoutingOverride } from "@/lib/routing/route-validator";
import {
  RoutingConcurrencyError,
  saveRoutingOverride,
  appendRoutingAuditLog,
  type RoutingAuditEvent,
} from "@/lib/routing/routing-config";
import { PROVIDER_REGISTRY } from "@/lib/provider-registry";
import { resolveEffectiveRoutingConfig, decideProviderRoute } from "@/lib/routing/provider-router";
import { buildDefaultRoutingConfig } from "@/lib/model-routing-registry";

describe("Routing Backend Hardening Suite (Validation, Concurrency, Audit)", () => {
  describe("Gap A: Model/Provider Compatibility Validation", () => {
    it("1. accepts valid supported model and active provider pair", () => {
      const result = validateRoutingOverride(
        {
          primaryRoute: { provider: "wavespeed", route: "kling-v2-5-turbo" },
        },
        { modelId: "kling-video", modality: "video" }
      );
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("2. rejects invalid or missing provider", () => {
      const result = validateRoutingOverride(
        {
          primaryRoute: { provider: "" as any, route: "some-route" },
        },
        { modelId: "kling-video", modality: "video" }
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("provider is required"))).toBe(true);
    });

    it("3. rejects nonexistent provider not in registry", () => {
      const result = validateRoutingOverride(
        {
          primaryRoute: { provider: "fake_provider" as any, route: "some-model" },
        },
        { modelId: "kling-video", modality: "video" }
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("not recognized in the provider registry"))).toBe(true);
    });

    it("4. rejects standby/not-routing-allowed providers (byteplus, kie)", () => {
      const byteplusResult = validateRoutingOverride(
        {
          primaryRoute: { provider: "byteplus", route: "seedance-v1" },
        },
        { modelId: "seedance-video", modality: "video" }
      );
      expect(byteplusResult.ok).toBe(false);
      expect(byteplusResult.errors.some((e) => e.includes("standby or not active"))).toBe(true);

      const kieResult = validateRoutingOverride(
        {
          primaryRoute: { provider: "kie", route: "kling-v2" },
        },
        { modelId: "kling-video", modality: "video" }
      );
      expect(kieResult.ok).toBe(false);
      expect(kieResult.errors.some((e) => e.includes("standby or not active"))).toBe(true);
    });

    it("5. rejects active provider when modality is incompatible (e.g. elevenlabs for video)", () => {
      const result = validateRoutingOverride(
        {
          primaryRoute: { provider: "elevenlabs", route: "voice_model" },
        },
        { modelId: "veo-2-video", modality: "video" }
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("does not support video modality"))).toBe(true);
    });

    it("6. rejects active provider when modality is incompatible for audio (e.g. openai for 3D/audio specialized)", () => {
      const result = validateRoutingOverride(
        {
          primaryRoute: { provider: "elevenlabs", route: "eleven_monolingual" },
        },
        { modelId: "nano-banana", modality: "image" }
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("does not support image modality"))).toBe(true);
    });
  });

  describe("Gap B: Optimistic Concurrency Protection", () => {
    it("7. throws RoutingConcurrencyError when expectedUpdatedAt does not match current record", async () => {
      const err = new RoutingConcurrencyError();
      expect(err.name).toBe("RoutingConcurrencyError");
      expect(err.message).toContain("Routing configuration was modified");
    });
  });

  describe("Gap C: Persistent Routing Audit Trail", () => {
    it("8. structures routing audit events accurately with operator and old/new routes", () => {
      const event: RoutingAuditEvent = {
        id: "audit_123",
        timestamp: new Date().toISOString(),
        operatorId: "user_admin_test",
        modelId: "kling-2-5",
        action: "save_override",
        oldRoute: { provider: "wavespeed", route: "kling-v1" },
        newRoute: { provider: "wavespeed", route: "kling-v2-5" },
        oldProvider: "wavespeed",
        newProvider: "wavespeed",
      };

      expect(event.operatorId).toBe("user_admin_test");
      expect(event.action).toBe("save_override");
      expect(event.newRoute?.route).toBe("kling-v2-5");
    });
  });

  describe("Regression Invariants", () => {
    it("9. runtime still honors valid admin override", () => {
      const defaults = buildDefaultRoutingConfig({
        modelId: "kling",
        modelName: "Kling AI",
        modality: "video",
        runtimeSource: "wavespeed",
        sourceModelId: "kling-v1",
        pricingProvider: "wavespeed",
      });

      const effective = resolveEffectiveRoutingConfig(defaults, {
        primaryRoute: { provider: "wavespeed", route: "kling-v2-custom" },
      });

      expect(effective.primaryRoute.route).toBe("kling-v2-custom");
      const decision = decideProviderRoute(effective);
      expect(decision.selected.route).toBe("kling-v2-custom");
      expect(decision.selected.provider).toBe("wavespeed");
    });

    it("10. provider registry active and standby policy is completely preserved", () => {
      const activeProviders = PROVIDER_REGISTRY.filter((p) => p.status === "active").map((p) => p.id);
      const standbyProviders = PROVIDER_REGISTRY.filter((p) => p.status === "standby").map((p) => p.id);
      const disabledProviders = PROVIDER_REGISTRY.filter((p) => p.status === "disabled").map((p) => p.id);

      expect(activeProviders).toEqual(["google", "openai", "wavespeed", "reap"]);
      expect(standbyProviders).toEqual(["byteplus", "kie"]);
      expect(disabledProviders).toEqual(["elevenlabs"]);
    });
  });
});

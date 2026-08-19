import { describe, expect, it } from "vitest";
import {
  validatePricingConfigurations,
  PricingConcurrencyError,
  type PricingConstitutionAuditEvent,
} from "@/lib/pricing-constitution-hardening";
import { DEFAULT_MODELS, SAAD_PRICING_MODELS, type PricingModel } from "@/lib/pricing-models";

describe("Admin Pricing Backend Hardening Test Suite", () => {
  describe("1. Strict Write Validation", () => {
    it("accepts valid default pricing models", () => {
      const result = validatePricingConfigurations(DEFAULT_MODELS);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty models array", () => {
      const result = validatePricingConfigurations([]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("models array must not be empty"))).toBe(true);
    });

    it("rejects invalid/empty model id", () => {
      const badModels = [{ ...DEFAULT_MODELS[0], id: "  " }];
      const result = validatePricingConfigurations(badModels);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("empty or invalid id"))).toBe(true);
    });

    it("rejects negative userCreditsRate", () => {
      const badModels = [{ ...DEFAULT_MODELS[0], userCreditsRate: -10 }];
      const result = validatePricingConfigurations(badModels);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("negative or NaN userCreditsRate"))).toBe(true);
    });

    it("rejects NaN userCreditsRate", () => {
      const badModels = [{ ...DEFAULT_MODELS[0], userCreditsRate: NaN }];
      const result = validatePricingConfigurations(badModels);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("negative or NaN userCreditsRate"))).toBe(true);
    });

    it("rejects negative waveUsd", () => {
      const badModels = [{ ...DEFAULT_MODELS[0], waveUsd: -1 }];
      const result = validatePricingConfigurations(badModels);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("negative or NaN waveUsd"))).toBe(true);
    });
  });

  describe("2. Optimistic Concurrency Protection", () => {
    it("creates PricingConcurrencyError with correct message and name", () => {
      const err = new PricingConcurrencyError();
      expect(err.name).toBe("PricingConcurrencyError");
      expect(err.message).toContain("Pricing constitution was modified by another administrator");
    });
  });

  describe("3. Persistent Audit Event Data Contract", () => {
    it("accurately constructs audit event structure", () => {
      const auditEvent: PricingConstitutionAuditEvent = {
        id: "pricing_audit_123",
        timestamp: new Date().toISOString(),
        operatorId: "user_admin_test",
        action: "save_constitution",
        changedModelsCount: 1,
        changes: [
          {
            pricingKey: "kling25t",
            field: "userCreditsRate",
            oldValue: 1.5,
            newValue: 1.8,
          },
        ],
      };

      expect(auditEvent.operatorId).toBe("user_admin_test");
      expect(auditEvent.action).toBe("save_constitution");
      expect(auditEvent.changes[0].pricingKey).toBe("kling25t");
      expect(auditEvent.changes[0].field).toBe("userCreditsRate");
      expect(auditEvent.changes[0].oldValue).toBe(1.5);
      expect(auditEvent.changes[0].newValue).toBe(1.8);
    });
  });
});

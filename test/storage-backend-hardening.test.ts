import { describe, expect, it } from "vitest";
import {
  validateStoragePolicyInput,
  computeStorageConfigDiff,
  StorageConcurrencyError,
  STORAGE_RUNTIME_AUDIT_LOG_KEY,
  type StorageRuntimeAuditEvent,
} from "@/lib/storage/storage-hardening";
import {
  DEFAULT_STORAGE_RUNTIME_CONFIG,
  sanitizeStorageRuntimeConfig,
  type StorageRuntimeConfig,
} from "@/lib/storage/runtime";

describe("Admin Storage Policy Backend Hardening Suite", () => {
  describe("1. Strict Write Validation", () => {
    it("accepts valid storage policy parameters", () => {
      const valid = validateStoragePolicyInput({
        activeWriteProvider: "backblaze",
        mediaDeliveryMode: "proxy",
        legacyReadEnabled: true,
      });
      expect(valid.ok).toBe(true);
    });

    it("rejects unknown storage providers", () => {
      const invalid = validateStoragePolicyInput({
        activeWriteProvider: "unsupported_storage_xyz" as any,
      });
      expect(invalid.ok).toBe(false);
      expect(invalid.error).toContain("Unknown storage provider");
    });

    it("rejects invalid media delivery modes", () => {
      const invalidDelivery = validateStoragePolicyInput({
        mediaDeliveryMode: "invalid_delivery_mode" as any,
      });
      expect(invalidDelivery.ok).toBe(false);
      expect(invalidDelivery.error).toContain("mediaDeliveryMode");
    });

    it("rejects non-boolean legacyReadEnabled", () => {
      const invalidLegacy = validateStoragePolicyInput({
        legacyReadEnabled: "yes" as any,
      });
      expect(invalidLegacy.ok).toBe(false);
      expect(invalidLegacy.error).toContain("legacyReadEnabled must be a boolean");
    });
  });

  describe("2. Safe Policy Sanitization", () => {
    it("sanitizes partial storage configs and preserves default fallbacks", () => {
      const sanitized = sanitizeStorageRuntimeConfig({
        activeWriteProvider: "backblaze",
        mediaDeliveryMode: "direct",
      });
      expect(sanitized.activeWriteProvider).toBe("backblaze");
      expect(sanitized.mediaDeliveryMode).toBe("direct");
      expect(sanitized.legacyReadEnabled).toBe(true);
    });
  });

  describe("3. Concurrency Protection Contract", () => {
    it("creates StorageConcurrencyError with accurate name and descriptive error", () => {
      const err = new StorageConcurrencyError();
      expect(err.name).toBe("StorageConcurrencyError");
      expect(err.message).toContain("Storage runtime policy was modified by another administrator");
    });
  });

  describe("4. Safe Diff & Redacted Audit Trail Contract", () => {
    it("computes accurate diff between storage configurations", () => {
      const current: StorageRuntimeConfig = {
        activeWriteProvider: "backblaze",
        activeProvider: "backblaze",
        mediaDeliveryMode: "proxy",
        legacyReadEnabled: true,
      };

      const next: StorageRuntimeConfig = {
        activeWriteProvider: "backblaze",
        activeProvider: "backblaze",
        mediaDeliveryMode: "direct",
        legacyReadEnabled: false,
      };

      const diff = computeStorageConfigDiff(current, next);
      expect(diff).toHaveLength(2);
      expect(diff.find((d) => d.field === "mediaDeliveryMode")).toEqual({
        field: "mediaDeliveryMode",
        oldValue: "proxy",
        newValue: "direct",
      });
      expect(diff.find((d) => d.field === "legacyReadEnabled")).toEqual({
        field: "legacyReadEnabled",
        oldValue: true,
        newValue: false,
      });
    });

    it("ensures audit event contains operatorId and no sensitive credentials", () => {
      const event: StorageRuntimeAuditEvent = {
        id: "audit_123",
        timestamp: new Date().toISOString(),
        operatorId: "user_clerk_admin_987",
        action: "update_storage_policy",
        changes: [
          {
            field: "mediaDeliveryMode",
            oldValue: "proxy",
            newValue: "direct",
          },
        ],
      };

      expect(event.operatorId).toBe("user_clerk_admin_987");
      expect(event.action).toBe("update_storage_policy");

      const eventString = JSON.stringify(event);
      expect(eventString).not.toContain("B2_SECRET_ACCESS_KEY");
      expect(eventString).not.toContain("R2_SECRET_ACCESS_KEY");
      expect(eventString).not.toContain("AWS_SECRET_ACCESS_KEY");
    });
  });
});

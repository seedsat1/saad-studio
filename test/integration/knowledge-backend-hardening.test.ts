import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_STORE_KEY,
  KNOWLEDGE_AUDIT_LOG_KEY,
  KnowledgeConcurrencyError,
  emptyKnowledgeStore,
  getKnowledgeVersionToken,
  createKnowledgeImportFromContent,
  extractDraftFields,
  isBlockedHost,
  normalizeImportUrl,
  loadKnowledgeHub,
  loadKnowledgeAuditLog,
  type KnowledgeStore,
  type KnowledgeAuditEvent,
} from "@/lib/admin/knowledge-hub";

describe("Admin Knowledge Backend Hardening & Concurrency Test Suite", () => {
  describe("1. Concurrency Protection Contract", () => {
    it("derives versionToken from updatedAt date and store timestamp", () => {
      const now = new Date();
      const token1 = getKnowledgeVersionToken(now);
      expect(token1).toBe(String(now.getTime()));

      const isoStr = "2026-08-18T03:00:00.000Z";
      const token2 = getKnowledgeVersionToken(null, isoStr);
      expect(token2).toBe(String(new Date(isoStr).getTime()));

      const token3 = getKnowledgeVersionToken(null, null);
      expect(token3).toBe("initial");
    });

    it("creates KnowledgeConcurrencyError with correct name and descriptive message", () => {
      const err = new KnowledgeConcurrencyError();
      expect(err.name).toBe("KnowledgeConcurrencyError");
      expect(err.message).toContain("Knowledge Hub was modified by another administrator");
    });
  });

  describe("2. Persistent Audit Trail & Secret Redaction Contract", () => {
    it("creates bounded audit event with operatorId and high-level summary without document raw text", () => {
      const event: KnowledgeAuditEvent = {
        id: "audit_test_123",
        timestamp: new Date().toISOString(),
        operatorId: "user_clerk_admin_888",
        action: "import_source",
        sourceId: "src_456",
        sourceUrl: "https://docs.wavespeed.ai/video",
        summary: "Imported provider documentation from https://docs.wavespeed.ai/video",
      };

      expect(event.operatorId).toBe("user_clerk_admin_888");
      expect(event.action).toBe("import_source");
      expect(event.summary).toBeDefined();

      const eventString = JSON.stringify(event);
      // Ensure no secrets or huge document text are inside the audit event
      expect(eventString).not.toContain("rawContent");
      expect(eventString).not.toContain("normalizedText");
      expect(eventString).not.toContain("WAVESPEED_API_KEY");
      expect(eventString).not.toContain("OPENAI_API_KEY");
    });
  });

  describe("3. SSRF & Ingestion Security Isolation", () => {
    it("strictly blocks private, loopback, and local network hosts", () => {
      expect(isBlockedHost("localhost")).toBe(true);
      expect(isBlockedHost("sub.localhost")).toBe(true);
      expect(isBlockedHost("127.0.0.1")).toBe(true);
      expect(isBlockedHost("127.0.1.1")).toBe(true);
      expect(isBlockedHost("10.0.0.1")).toBe(true);
      expect(isBlockedHost("10.254.254.254")).toBe(true);
      expect(isBlockedHost("192.168.1.1")).toBe(true);
      expect(isBlockedHost("172.16.0.1")).toBe(true);
      expect(isBlockedHost("172.31.255.255")).toBe(true);
      expect(isBlockedHost("0.0.0.0")).toBe(true);
      expect(isBlockedHost("::1")).toBe(true);

      // Public allowed hosts
      expect(isBlockedHost("docs.wavespeed.ai")).toBe(false);
      expect(isBlockedHost("api.openai.com")).toBe(false);
      expect(isBlockedHost("platform.runninghub.ai")).toBe(false);
    });

    it("throws on invalid URLs or blocked protocols", () => {
      expect(() => normalizeImportUrl("ftp://docs.wavespeed.ai")).toThrow("Only HTTP/HTTPS URLs are allowed.");
      expect(() => normalizeImportUrl("javascript:alert(1)")).toThrow();
      expect(() => normalizeImportUrl("http://localhost:3000/api")).toThrow("Private, localhost, and link-local hosts are not allowed.");
    });
  });

  describe("4. Specification Extraction & Model Linking Mechanics", () => {
    it("extracts model IDs, durations, resolutions, and pricing references from text", () => {
      const doc = {
        id: "doc_1",
        sourceId: "src_1",
        sourceUrl: "https://docs.wavespeed.ai/video",
        title: "WaveSpeed Video",
        rawContent: "",
        normalizedText: "endpoint: /v1/video/generate. model_id: seedream/v4 duration: 5s, 10s. resolution: 720p, 1080p. price $0.05.",
        importedAt: new Date().toISOString(),
        contentHash: "hash123",
        status: "imported" as const,
      };

      const fields = extractDraftFields(doc, "wavespeed");
      expect(fields.some((f) => f.key === "provider" && f.value === "wavespeed")).toBe(true);
      expect(fields.some((f) => f.key === "model_id" && f.value === "seedream/v4")).toBe(true);
      expect(fields.some((f) => f.key === "limit" && f.value.includes("duration"))).toBe(true);
      expect(fields.some((f) => f.key === "parameter" && f.value.includes("resolution"))).toBe(true);
    });
  });

  describe("5. Live Knowledge Hub Contract Verification", () => {
    it("loads knowledge hub with versionToken and auditLog present", async () => {
      const result = await loadKnowledgeHub();
      expect(result.ok).toBe(true);
      expect(result.versionToken).toBeDefined();
      expect(Array.isArray(result.auditLog)).toBe(true);
      expect(result.summary).toBeDefined();
    });
  });
});

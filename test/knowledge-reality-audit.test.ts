import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_STORE_KEY,
  KNOWLEDGE_PROVIDERS,
  KNOWLEDGE_SOURCE_TYPES,
  KNOWLEDGE_DOCUMENT_STATUSES,
  emptyKnowledgeStore,
  summarizeKnowledgeStore,
  normalizeKnowledgeProvider,
  normalizeImportUrl,
  createKnowledgeImportFromContent,
  loadKnowledgeHub,
  type KnowledgeStore,
} from "@/lib/admin/knowledge-hub";

describe("Knowledge Hub Reality & Architecture Deep Audit (Read-Only)", () => {
  it("1. verifies knowledge data store contract and provider definitions", () => {
    expect(KNOWLEDGE_STORE_KEY).toBe("knowledge_hub_v1");
    expect(KNOWLEDGE_PROVIDERS).toContain("google");
    expect(KNOWLEDGE_PROVIDERS).toContain("openai");
    expect(KNOWLEDGE_PROVIDERS).toContain("wavespeed");
    expect(KNOWLEDGE_PROVIDERS).toContain("byteplus");
    expect(KNOWLEDGE_PROVIDERS).toContain("kie");
    expect(KNOWLEDGE_SOURCE_TYPES).toEqual(["url", "pasted_text", "markdown", "json"]);
    expect(KNOWLEDGE_DOCUMENT_STATUSES).toEqual(["imported", "parse_failed", "needs_review", "approved", "rejected", "outdated"]);
  });

  it("2. verifies URL normalization and SSRF blocked host protection", () => {
    expect(normalizeImportUrl("https://docs.wavespeed.ai/api/v1")).toBe("https://docs.wavespeed.ai/api/v1");
    expect(() => normalizeImportUrl("http://localhost:3000")).toThrow("Private, localhost, and link-local hosts are not allowed.");
    expect(() => normalizeImportUrl("http://127.0.0.1:8080")).toThrow("Private, localhost, and link-local hosts are not allowed.");
    expect(() => normalizeImportUrl("http://192.168.1.1")).toThrow("Private, localhost, and link-local hosts are not allowed.");
    expect(() => normalizeImportUrl("http://10.0.0.1")).toThrow("Private, localhost, and link-local hosts are not allowed.");
  });

  it("3. verifies in-memory draft field extraction without Vector/Embeddings", () => {
    const store = emptyKnowledgeStore();
    const imported = createKnowledgeImportFromContent(store, {
      provider: "wavespeed",
      sourceName: "WaveSpeed Video API",
      page: {
        url: "https://docs.wavespeed.ai/video",
        title: "WaveSpeed Video Generation",
        contentType: "text/html",
        rawContent: "<html><body>model_id: seedream/v4 duration: 5s, 10s resolution: 720p, 1080p</body></html>",
      },
    });

    expect(imported.sources).toHaveLength(1);
    expect(imported.documents).toHaveLength(1);
    expect(imported.drafts).toHaveLength(1);

    const draft = imported.drafts[0];
    expect(draft.fields.some((f) => f.key === "model_id" && f.value === "seedream/v4")).toBe(true);
    expect(draft.fields.some((f) => f.key === "limit" && f.value.includes("5s"))).toBe(true);

    const summary = summarizeKnowledgeStore(imported);
    expect(summary.sources).toBe(1);
    expect(summary.documents).toBe(1);
    expect(summary.drafts).toBe(1);
  });

  it("4. loads live Knowledge Hub store and measures payload size", async () => {
    const result = await loadKnowledgeHub();
    expect(result.ok).toBe(true);
    expect(result.databaseAvailable).toBe(true);

    const jsonStr = JSON.stringify(result);
    const byteLength = Buffer.byteLength(jsonStr, "utf-8");
    console.log(`[MEASUREMENT] Knowledge Hub Payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB)`);
    expect(byteLength).toBeLessThan(100_000);
  });
});

import { describe, expect, it } from "vitest";

import {
  createKnowledgeImportFromContent,
  emptyKnowledgeStore,
  normalizeImportUrl,
  summarizeKnowledgeStore,
} from "@/lib/admin/knowledge-hub";

describe("Knowledge Hub phase 1", () => {
  it("imports a URL document as draft knowledge with provenance only", () => {
    const store = createKnowledgeImportFromContent(emptyKnowledgeStore(), {
      provider: "wavespeed",
      sourceName: "WaveSpeed Seedream docs",
      page: {
        url: "https://docs.wavespeed.ai/seedream",
        title: "Seedream API",
        contentType: "text/html",
        rawContent: `
          <html><title>Seedream API</title><body>
            <h1>Seedream API</h1>
            model_id: wavespeed-ai/seedream-v5-lite
            endpoint: /api/v3/wavespeed-ai/seedream-v5-lite
            duration 5 seconds. resolution 1080p. callback webhook supported.
            Authentication requires API key.
          </body></html>
        `,
      },
    });

    expect(store.sources).toHaveLength(1);
    expect(store.documents).toHaveLength(1);
    expect(store.drafts).toHaveLength(1);
    expect(store.sources[0].provider).toBe("wavespeed");
    expect(store.documents[0].status).toBe("imported");
    expect(store.drafts[0].status).toBe("draft");
    expect(store.modelChanges).toEqual([]);
    expect(store.drafts[0].fields.length).toBeGreaterThan(0);
    expect(store.drafts[0].fields.every((field) => field.provenance.documentId === store.documents[0].id)).toBe(true);
    expect(store.drafts[0].fields.every((field) => field.provenance.sourceUrl === "https://docs.wavespeed.ai/seedream")).toBe(true);
  });

  it("summarizes approved knowledge separately from runtime registries", () => {
    const store = createKnowledgeImportFromContent(emptyKnowledgeStore(), {
      provider: "openai",
      sourceName: "OpenAI docs",
      page: {
        url: "https://platform.openai.com/docs",
        rawContent: "model: gpt-image-2 endpoint: /v1/images",
      },
    });
    store.drafts[0].status = "approved";

    const summary = summarizeKnowledgeStore(store);

    expect(summary.sources).toBe(1);
    expect(summary.documents).toBe(1);
    expect(summary.drafts).toBe(0);
    expect(summary.approvedKnowledge).toBe(1);
    expect(summary.proposedModelChanges).toBe(0);
    expect(summary.publishedModelChanges).toBe(0);
  });

  it("rejects unsafe import URLs before fetching", () => {
    expect(() => normalizeImportUrl("file:///etc/passwd")).toThrow(/HTTP\/HTTPS/);
    expect(() => normalizeImportUrl("http://localhost:3000/admin")).toThrow(/Private/);
    expect(() => normalizeImportUrl("http://127.0.0.1:3000/admin")).toThrow(/Private/);
    expect(normalizeImportUrl("https://docs.example.com/a#section")).toBe("https://docs.example.com/a");
  });
});

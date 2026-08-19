import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin Knowledge Visuals & Architecture Suite", () => {
  const knowledgePagePath = path.resolve(__dirname, "../app/admin/knowledge/page.tsx");
  const knowledgePageContent = fs.readFileSync(knowledgePagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(knowledgePageContent).toContain("<AdminShell>");
    expect(knowledgePageContent).toContain("flex-1 w-full min-w-0");
    expect(knowledgePageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Knowledge Intelligence Control Plane and Snapshot Strip without fake zeros", () => {
    expect(knowledgePageContent).toContain("Knowledge Intelligence Control Plane");
    expect(knowledgePageContent).toContain("Documentation Sources");
    expect(knowledgePageContent).toContain("Imported Documents");
    expect(knowledgePageContent).toContain("Pending Drafts");
    expect(knowledgePageContent).toContain("Approved Drafts");
    expect(knowledgePageContent).toContain("Model Proposals");
    expect(knowledgePageContent).toContain("Published Changes");
  });

  it("3. displays Knowledge Pipeline Infographic with explicit non-vector/non-RAG labels", () => {
    expect(knowledgePageContent).toContain("Knowledge Intelligence & Spec Extraction Pipeline");
    expect(knowledgePageContent).toContain("NO VECTOR DB");
    expect(knowledgePageContent).toContain("NO EMBEDDINGS");
    expect(knowledgePageContent).toContain("NO RAG");
    expect(knowledgePageContent).toContain("SSRF Guard");
    expect(knowledgePageContent).toContain("SHA-256 Hash");
  });

  it("4. contains operational tabs for Sources, Specifications, Proposals, Audit, and Integrity", () => {
    expect(knowledgePageContent).toContain("Documentation Sources");
    expect(knowledgePageContent).toContain("Extracted Specifications");
    expect(knowledgePageContent).toContain("Model Change Proposals");
    expect(knowledgePageContent).toContain("Policy Audit Log");
    expect(knowledgePageContent).toContain("Architecture & Integrity");
  });

  it("5. implements Safe Import Drawer with SSRF validation notice and expectedVersionToken", () => {
    expect(knowledgePageContent).toContain("Import Provider Documentation");
    expect(knowledgePageContent).toContain("SSRF Ingestion Protection");
    expect(knowledgePageContent).toContain("expectedVersionToken");
  });

  it("6. implements Publish Confirmation Modal for model proposals", () => {
    expect(knowledgePageContent).toContain("Confirm Registry Publishing");
    expect(knowledgePageContent).toContain("Publish to Dynamic Registry");
    expect(knowledgePageContent).toContain("Publishing modifies the Dynamic Model Registry in production.");
  });

  it("7. implements Concurrency 409 conflict handling and persistent audit log", () => {
    expect(knowledgePageContent).toContain("Optimistic Concurrency Conflict");
    expect(knowledgePageContent).toContain("Knowledge state changed since this workspace was loaded. Please refresh before saving.");
    expect(knowledgePageContent).toContain("Refresh Current Knowledge State");
    expect(knowledgePageContent).toContain("auditLog");
    expect(knowledgePageContent).not.toContain("WAVESPEED_API_KEY");
    expect(knowledgePageContent).not.toContain("OPENAI_API_KEY");
  });
});

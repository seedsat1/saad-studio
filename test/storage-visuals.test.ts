import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin Storage Visuals & Architecture Suite", () => {
  const storagePagePath = path.resolve(__dirname, "../app/admin/storage/page.tsx");
  const storagePageContent = fs.readFileSync(storagePagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(storagePageContent).toContain("<AdminShell>");
    expect(storagePageContent).toContain("flex-1 w-full min-w-0");
    expect(storagePageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Storage Operations Control Plane and Snapshot Strip", () => {
    expect(storagePageContent).toContain("Storage Operations Control Plane");
    expect(storagePageContent).toContain("Active Write");
    expect(storagePageContent).toContain("Legacy Read");
    expect(storagePageContent).toContain("Delivery Mode");
    expect(storagePageContent).toContain("Streaming Gateway");
  });

  it("3. displays Provider Topology for Write and Read Fallback chains", () => {
    expect(storagePageContent).toContain("Media Persistence & Write Topology");
    expect(storagePageContent).toContain("Media Delivery & Fallback Read Chain");
    expect(storagePageContent).toContain("Backblaze B2");
    expect(storagePageContent).toContain("Cloudflare R2 (Fallback)");
  });

  it("4. accurately details /api/media streaming gateway with Range 206 semantics", () => {
    expect(storagePageContent).toContain("Video Streaming & Proxy Gateway Specifications (/api/media)");
    expect(storagePageContent).toContain("HTTP 206 Partial Content");
    expect(storagePageContent).toContain("Video Scrubbing & Seeking");
    expect(storagePageContent).toContain("Content-Type Normalization");
  });

  it("5. implements Safe Policy Editor with Concurrency token, 409 handling, and Diff Preview", () => {
    expect(storagePageContent).toContain("Storage Policy Safe Editor");
    expect(storagePageContent).toContain("Policy Transition Preview");
    expect(storagePageContent).toContain("expectedVersionToken");
    expect(storagePageContent).toContain("Storage policy changed since you loaded it. Refresh before saving.");
    expect(storagePageContent).toContain("Refresh Storage Policy");
  });

  it("6. displays persistent audit trail without sensitive secrets", () => {
    expect(storagePageContent).toContain("Policy Audit Log");
    expect(storagePageContent).not.toContain("B2_SECRET_ACCESS_KEY");
    expect(storagePageContent).not.toContain("R2_SECRET_ACCESS_KEY");
  });

  it("7. links to migration tool and highlights canonical media identity gap without destructive controls", () => {
    expect(storagePageContent).toContain('href="/admin/migrate-storage"');
    expect(storagePageContent).toContain("Canonical Media Identity");
    expect(storagePageContent).not.toContain("Delete Bucket");
    expect(storagePageContent).not.toContain("Clean Storage");
    expect(storagePageContent).not.toContain("Delete Orphans");
  });
});

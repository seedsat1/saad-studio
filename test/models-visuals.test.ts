import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin Models Visuals & Architecture Suite", () => {
  const modelsPagePath = path.resolve(__dirname, "../app/admin/models/page.tsx");
  const modelsPageContent = fs.readFileSync(modelsPagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(modelsPageContent).toContain("<AdminShell>");
    expect(modelsPageContent).toContain("flex-1 w-full min-w-0");
    expect(modelsPageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Model Fleet Snapshot Strip and Modality Distribution", () => {
    expect(modelsPageContent).toContain("Model Registry Control Plane");
    expect(modelsPageContent).toContain("Total Models");
    expect(modelsPageContent).toContain("Active Routable");
    expect(modelsPageContent).toContain("Pricing Linked");
    expect(modelsPageContent).toContain("Modality Distribution:");
    expect(modelsPageContent).toContain("Image Models:");
    expect(modelsPageContent).toContain("Video Models:");
  });

  it("3. implements Model Inspector & Safe Editor Drawer with Immutable Model ID", () => {
    expect(modelsPageContent).toContain("Immutable Registry Identity");
    expect(modelsPageContent).toContain("Model ID is permanently immutable");
    expect(modelsPageContent).toContain("Configuration Transition Preview");
  });

  it("4. transmits versionToken on save and handles 409 concurrency conflict", () => {
    expect(modelsPageContent).toContain("expectedVersionToken: versionToken");
    expect(modelsPageContent).toContain("CONCURRENCY_CONFLICT");
    expect(modelsPageContent).toContain("Model registry changed since you loaded it");
    expect(modelsPageContent).toContain("Refresh Model Registry Configuration");
  });

  it("5. displays persistent model audit log and registry integrity verification", () => {
    expect(modelsPageContent).toContain("Recent Model Mutations");
    expect(modelsPageContent).toContain("Registry Integrity Verification");
    expect(modelsPageContent).toContain("operatorId");
  });

  it("6. accurately states that LoRA is not supported in current runtime", () => {
    expect(modelsPageContent).toContain("Not supported in current runtime");
  });

  it("7. links routing management to /admin/routing", () => {
    expect(modelsPageContent).toContain('href="/admin/routing"');
  });
});

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin Features Visuals & Architecture Suite", () => {
  const featuresPagePath = path.resolve(__dirname, "../app/admin/features/page.tsx");
  const featuresPageContent = fs.readFileSync(featuresPagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(featuresPageContent).toContain("<AdminShell>");
    expect(featuresPageContent).toContain("flex-1 w-full min-w-0");
    expect(featuresPageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Feature Fleet Snapshot Strip and Category Breakdown", () => {
    expect(featuresPageContent).toContain("Feature Registry Control Plane");
    expect(featuresPageContent).toContain("Total Features");
    expect(featuresPageContent).toContain("Active Features");
    expect(featuresPageContent).toContain("Category Breakdown:");
    expect(featuresPageContent).toContain("Video Features:");
    expect(featuresPageContent).toContain("Image Features:");
  });

  it("3. implements read-only Feature Inspector Drawer with Immutable Registry Identity", () => {
    expect(featuresPageContent).toContain("Registry Identity");
    expect(featuresPageContent).toContain("Operational State");
    expect(featuresPageContent).toContain("Control Level");
    expect(featuresPageContent).not.toContain("Save Feature");
    expect(featuresPageContent).not.toContain("handleSaveFeature");
    expect(featuresPageContent).not.toContain("setEditMode");
  });

  it("4. accurately handles UI-only and unknown feature semantics without false failure labels", () => {
    expect(featuresPageContent).toContain("UI Only by Design");
    expect(featuresPageContent).toContain("Future / Placeholder Surface");
  });

  it("5. links to models, routing, and pricing control planes without inline mutations", () => {
    expect(featuresPageContent).toContain('href="/admin/models"');
    expect(featuresPageContent).toContain('href="/admin/routing"');
    expect(featuresPageContent).toContain('href="/admin/pricing"');
  });

  it("6. displays feature registry integrity verification panel", () => {
    expect(featuresPageContent).toContain("Feature Registry Integrity & Operational Governance");
    expect(featuresPageContent).toContain("40 Approved Features");
  });
});

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin Pricing Visuals & Architecture Suite", () => {
  const pricingPagePath = path.resolve(__dirname, "../app/admin/pricing/page.tsx");
  const pricingPageContent = fs.readFileSync(pricingPagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(pricingPageContent).toContain("<AdminShell>");
    expect(pricingPageContent).toContain("flex-1 w-full min-w-0");
    expect(pricingPageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Pricing Snapshot Strip and Billing Distribution", () => {
    expect(pricingPageContent).toContain("Pricing Constitution Control Plane");
    expect(pricingPageContent).toContain("Total Pricing Entries");
    expect(pricingPageContent).toContain("Runtime Active Models");
    expect(pricingPageContent).toContain("Per-Second Billing:");
    expect(pricingPageContent).toContain("Flat Rate Billing:");
  });

  it("3. clearly separates User Credit Price from Provider Cost with Trust Labels", () => {
    expect(pricingPageContent).toContain("Provider-Independent Pricing");
    expect(pricingPageContent).toContain("User Base Rate");
    expect(pricingPageContent).toContain("Provider Cost");
    expect(pricingPageContent).toContain("ESTIMATED");
    expect(pricingPageContent).toContain("Heuristic • Non-Auditable");
  });

  it("4. implements Safe Pricing Drawer with Transition Preview and Immutable Key", () => {
    expect(pricingPageContent).toContain("Immutable Pricing Key");
    expect(pricingPageContent).toContain("Rate Transition Preview");
    expect(pricingPageContent).toContain("expectedVersionToken: versionToken");
    expect(pricingPageContent).toContain("CONCURRENCY_CONFLICT");
    expect(pricingPageContent).toContain("Refresh Current Constitution");
  });

  it("5. displays persistent pricing audit log and integrity verification", () => {
    expect(pricingPageContent).toContain("Recent Pricing Mutations");
    expect(pricingPageContent).toContain("Pricing Constitution Integrity & Linkage Verification");
    expect(pricingPageContent).toContain("operatorId");
  });

  it("6. links routing to /admin/routing without inline route mutation", () => {
    expect(pricingPageContent).toContain('href="/admin/routing"');
  });
});

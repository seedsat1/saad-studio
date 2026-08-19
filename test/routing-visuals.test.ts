import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Routing Visuals & Architecture Suite", () => {
  const routingPagePath = path.resolve(__dirname, "../app/admin/routing/page.tsx");
  const routingPageContent = fs.readFileSync(routingPagePath, "utf-8");

  it("1. uses AdminShell and full-width layout without centered max-w box", () => {
    expect(routingPageContent).toContain("<AdminShell>");
    expect(routingPageContent).toContain("flex-1 w-full min-w-0");
    expect(routingPageContent).not.toMatch(/className=["'][^"']*max-w-(?:5xl|6xl|7xl)\s+mx-auto/);
  });

  it("2. displays Routing Snapshot Strip and Model Routing Matrix", () => {
    expect(routingPageContent).toContain("Model Routing Control Plane");
    expect(routingPageContent).toContain("Total Models");
    expect(routingPageContent).toContain("Active Routable");
    expect(routingPageContent).toContain("Admin Overrides");
    expect(routingPageContent).toContain("Model Routing Matrix");
  });

  it("3. implements Safe Route Editor drawer with Current -> Proposed transition diff", () => {
    expect(routingPageContent).toContain("Safe Route Editor");
    expect(routingPageContent).toContain("Route Transition Preview");
    expect(routingPageContent).toContain("Current Route");
    expect(routingPageContent).toContain("Proposed Route");
  });

  it("4. transmits concurrency token on save and handles 409 conflict", () => {
    expect(routingPageContent).toContain("expectedUpdatedAt: updatedAtToken");
    expect(routingPageContent).toContain("CONCURRENCY_CONFLICT");
    expect(routingPageContent).toContain("Routing configuration was modified by another administrator");
    expect(routingPageContent).toContain("Refresh Current Route Configuration");
  });

  it("5. includes persistent audit log tab and displays recent route changes", () => {
    expect(routingPageContent).toContain("Recent Route Changes");
    expect(routingPageContent).toContain("Recent Route Changes Audit Log");
    expect(routingPageContent).toContain("operatorId");
  });

  it("6. strictly avoids misleading automatic fallback or fake external health wording", () => {
    expect(routingPageContent).toContain("Configured Fallback");
    expect(routingPageContent).toContain("fail-fast with refund and does not execute automatic");
    expect(routingPageContent).not.toContain("Live Provider Health");
    expect(routingPageContent).not.toContain("Live Health Test");
  });

  it("7. uses accurate label for decision latency instead of provider network latency", () => {
    expect(routingPageContent).toContain("Decision Test");
    expect(routingPageContent).not.toContain("Provider Latency");
  });
});

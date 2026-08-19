import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadUnifiedAnalytics } from "@/lib/admin/analytics-read-model";

describe("Admin Analytics Read Model & Performance Architecture", () => {
  const pagePath = path.join(process.cwd(), "app", "admin", "analytics", "page.tsx");
  const routePath = path.join(process.cwd(), "app", "api", "admin", "analytics", "route.ts");

  it("verifies analytics page does not use limit=5000 overfetching parameter", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    expect(pageContent).not.toContain('limit", "5000"');
    expect(pageContent).not.toContain("limit=5000");
  });

  it("verifies API route does not enforce 5000 rows limit", () => {
    const routeContent = fs.readFileSync(routePath, "utf-8");
    expect(routeContent).not.toContain("5000");
  });

  it("strictly enforces that Latency is null and not calculated from unproven timestamps", async () => {
    const result = await loadUnifiedAnalytics();
    expect(result.overview.averageCompletionLatencyMs).toBeNull();
    expect(result.performance.averageCompletionLatencyMs).toBeNull();
    for (const p of result.providers) {
      expect(p.averageLatencyMs).toBeNull();
    }
    for (const m of result.models) {
      expect(m.averageLatencyMs).toBeNull();
    }
    expect(result.refusedMetrics).toContain(
      "Average Completion Latency is not computed because Generation model does not record completedAt timestamp.",
    );
  }, 15000);

  it("strictly enforces financial trust boundary and refuses profit/margin calculations", async () => {
    const result = await loadUnifiedAnalytics();
    expect(result.costCoverage.financialAnalyticsTrustworthy).toBe(false);
    expect((result.costCoverage as any).profit).toBeUndefined();
    expect((result.costCoverage as any).netMargin).toBeUndefined();
    expect((result.costCoverage as any).roi).toBeUndefined();
    expect(result.refusedMetrics).toContain(
      "Total Profit is not computed because actual provider cost coverage is incomplete.",
    );
    expect(result.refusedMetrics).toContain(
      "True Margin is not computed because estimated costs and missing costs cannot be treated as actual cost.",
    );
  }, 15000);

  it("returns structured aggregated summary without heavy domain objects or raw prompts/media", async () => {
    const result = await loadUnifiedAnalytics();
    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("overview");
    expect(result).toHaveProperty("jobs");
    expect(result).toHaveProperty("models");
    expect(result).toHaveProperty("providers");
    expect(result).toHaveProperty("costCoverage");
    expect(result).toHaveProperty("dataQuality");

    // Ensure no raw arrays of rows exist in the response
    expect((result as any).generations).toBeUndefined();
    expect((result as any).historyRows).toBeUndefined();
    expect((result as any).jobViews).toBeUndefined();
  }, 15000);
});

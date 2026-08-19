import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadControlCenterSummary } from "@/lib/admin/control-center";

describe("Control Center Server-Side Performance Optimization Invariants", () => {
  const pagePath = path.join(process.cwd(), "app", "admin", "control-center", "page.tsx");
  const apiRoutePath = path.join(process.cwd(), "app", "api", "admin", "control-center", "route.ts");

  it("verifies single dedicated endpoint route exists", () => {
    expect(fs.existsSync(apiRoutePath)).toBe(true);
    const apiCode = fs.readFileSync(apiRoutePath, "utf-8");
    expect(apiCode).toContain("loadControlCenterSummary");
    expect(apiCode).toContain("isAdmin");
  });

  it("verifies control-center page calls only /api/admin/control-center and eliminated the 10 endpoints scatter", () => {
    expect(fs.existsSync(pagePath)).toBe(true);
    const content = fs.readFileSync(pagePath, "utf-8");

    expect(content).toContain('fetch("/api/admin/control-center"');
    expect(content).not.toContain("/api/admin/analytics?limit=5000");
    expect(content).not.toContain("/api/admin/jobs?limit=200");
    expect(content).not.toContain("/api/admin/history?limit=250");
    expect(content).not.toContain("CONTROL_ENDPOINTS");
  });

  it("verifies fake-zero loading states are eliminated", () => {
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must render loading/synchronizing placeholders when snapshot is null
    expect(content).toContain('{readySystems ?? "—"}');
    expect(content).toContain("ready");
    expect(content).toContain("in flight");
    expect(content).toContain("issues");
    expect(content).toContain("actual verified");
  });

  it("executes loadControlCenterSummary without internal HTTP calls and returns structured snapshot", async () => {
    const result = await loadControlCenterSummary();

    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("snapshot");
    expect(result.snapshot).toHaveProperty("cards");
    expect(result.snapshot).toHaveProperty("systems");
    expect(result.snapshot).toHaveProperty("alerts");
    expect(result.snapshot.cards).toHaveProperty("generation");
    expect(result.snapshot.cards).toHaveProperty("jobs");
    expect(result.snapshot.cards).toHaveProperty("financial");
    expect(result.snapshot.cards.financial.trustworthy).toBe(false);
  }, 15000);
});

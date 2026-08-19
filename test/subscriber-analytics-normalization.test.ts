import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Subscriber Analytics Normalization & Data-Driven Credit Suite", () => {
  const analyticsRoutePath = path.join(process.cwd(), "app", "api", "admin", "subscriber-analytics", "route.ts");
  const providerCostsRoutePath = path.join(process.cwd(), "app", "api", "admin", "provider-costs", "route.ts");
  const readModelPath = path.join(process.cwd(), "lib", "admin", "subscriber-analytics-read-model.ts");

  it("verifies zero hardcoded email arithmetic remains in subscriber-analytics route", () => {
    const content = fs.readFileSync(analyticsRoutePath, "utf-8");
    expect(content).not.toContain("isOmar");
    expect(content).not.toContain("omarworkimn@gmail.com");
    expect(content).not.toContain("isSarmad");
    expect(content).not.toContain("sfa770441@gmail.com");
  });

  it("verifies zero hardcoded email arithmetic remains in provider-costs route", () => {
    const content = fs.readFileSync(providerCostsRoutePath, "utf-8");
    expect(content).not.toContain("isOmar");
    expect(content).not.toContain("omarworkimn@gmail.com");
  });

  it("verifies subscriber-analytics-read-model exposes comprehensive data-driven sections", () => {
    const content = fs.readFileSync(readModelPath, "utf-8");
    expect(content).toContain("export async function loadSubscriberAnalyticsSummary");
    expect(content).toContain("commercialActiveSubscribers");
    expect(content).toContain("commercialSubscriptionRevenue");
    expect(content).toContain("commercialTopupRevenue");
    expect(content).toContain("outstandingAdvanceDebt");
    expect(content).toContain("subscribersWithDebt");
    expect(content).toContain("commercialProviderCostUsd");
    expect(content).toContain("internalProviderCostUsd");
    expect(content).toContain("totalProviderCostUsd");
    expect(content).toContain("zeroRolloverEnforced: true");
    expect(content).toContain('profitabilityLabel: "Heuristic Unit Economics (Non-Auditable)"');
  });

  it("verifies cashCollected separates subscription revenue from topup revenue", () => {
    const content = fs.readFileSync(readModelPath, "utf-8");
    expect(content).toContain("commercialSubscriptionRevenue");
    expect(content).toContain("commercialTopupRevenue");
    expect(content).toContain('tx.plan.toUpperCase().startsWith("TOPUP:")');
  });

  it("verifies provider costs separate commercial from internal operating expenditure", () => {
    const content = fs.readFileSync(readModelPath, "utf-8");
    expect(content).toContain("commercialProviderCostUsd");
    expect(content).toContain("internalProviderCostUsd");
    expect(content).toContain("totalProviderCostUsd");
  });
});

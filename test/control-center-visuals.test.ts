import { describe, expect, it } from "vitest";
import { buildAdminControlCenterSnapshot } from "@/lib/admin/control-center";

describe("Admin Control Center — Visual Analytics & Data Integrity", () => {
  it("builds correct generation snapshot metrics without invented numbers", () => {
    const input = {
      analytics: {
        overview: {
          totalGenerations: 1107,
          completed: 726,
          failed: 208,
          processing: 57,
          successRate: 77.7,
        },
      },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    expect(snapshot.cards.generation.total).toBe(1107);
    expect(snapshot.cards.generation.completed).toBe(726);
    expect(snapshot.cards.generation.failed).toBe(208);
    expect(snapshot.cards.generation.processing).toBe(57);
    expect(snapshot.cards.analytics.successRate).toBe(77.7);
  });

  it("builds correct jobs pipeline metrics without mocking completed jobs if not provided", () => {
    const input = {
      jobs: {
        summary: {
          byStatus: { queued: 5, processing: 10, failed: 25 },
          diagnostics: 15,
        },
      },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    expect(snapshot.cards.jobs.queued).toBe(5);
    expect(snapshot.cards.jobs.processing).toBe(10);
    expect(snapshot.cards.jobs.failed).toBe(25);
    expect(snapshot.cards.jobs.stuckDiagnostics).toBe(15);
  });

  it("strictly enforces that financial data is NOT trustworthy when actual cost coverage is low", () => {
    const input = {
      analytics: {
        costCoverage: {
          actualCostCoverage: 0.6,
          estimatedCostCoverage: 39.9,
          financialAnalyticsTrustworthy: false,
        },
      },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    expect(snapshot.cards.financial.actualCostCoverage).toBe(0.6);
    expect(snapshot.cards.financial.estimatedCostCoverage).toBe(39.9);
    expect(snapshot.cards.financial.trustworthy).toBe(false);
    // Ensure no profit/margin fields exist on financial snapshot
    expect((snapshot.cards.financial as any).profit).toBeUndefined();
    expect((snapshot.cards.financial as any).netMargin).toBeUndefined();
  });

  it("builds data linkage metrics with unlinked provider usage alert", () => {
    const input = {
      history: {
        summary: {
          providerUsageRecords: 659,
          providerUsageLinked: 493,
          providerUsageUnlinked: 166,
        },
      },
      analytics: {
        usage: {
          total: 659,
          linked: 493,
          unlinked: 166,
          linkCoverage: 74.8,
        },
      },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    expect(snapshot.cards.usage.total).toBe(659);
    expect(snapshot.cards.usage.linked).toBe(493);
    expect(snapshot.cards.usage.unlinked).toBe(166);
    expect(snapshot.cards.usage.coverage).toBe(74.8);

    const unlinkedAlert = snapshot.alerts.find((a) => a.title.includes("Unlinked"));
    expect(unlinkedAlert).toBeDefined();
    expect(unlinkedAlert?.href).toBe("/admin/history");
  });

  it("maps feature governance categories faithfully", () => {
    const input = {
      features: {
        summary: {
          byOverallControl: {
            CONTROLLED: 25,
            PARTIAL: 6,
            UNCONTROLLED: 1,
            UNKNOWN: 8,
          },
        },
      },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    expect(snapshot.cards.features.controlled).toBe(25);
    expect(snapshot.cards.features.partial).toBe(6);
    expect(snapshot.cards.features.uncontrolled).toBe(1);
    expect(snapshot.cards.features.unknown).toBe(8);
  });

  it("verifies all alert destinations point to existing admin routes", () => {
    const input = {
      routing: { databaseAvailable: false },
      jobs: { summary: { diagnostics: 3 } },
      history: { summary: { providerUsageUnlinked: 5 } },
      analytics: { costCoverage: { actualCostCoverage: 10 } },
      storage: { summary: { health: { writeEnabled: false } } },
    };

    const snapshot = buildAdminControlCenterSnapshot(input);
    const validRoutes = [
      "/admin/routing",
      "/admin/jobs",
      "/admin/history",
      "/admin/analytics",
      "/admin/features",
      "/admin/storage",
      "/admin/providers",
      "/admin/models",
      "/admin/pricing",
      "/admin/knowledge",
    ];

    for (const alert of snapshot.alerts) {
      expect(validRoutes).toContain(alert.href);
    }
  });
});

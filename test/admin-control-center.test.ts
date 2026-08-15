import { describe, expect, it } from "vitest";

import { buildAdminControlCenterSnapshot } from "@/lib/admin/control-center";

describe("Admin Control Center snapshot", () => {
  it("aggregates existing read-model payloads without making financial analytics trustworthy", () => {
    const snapshot = buildAdminControlCenterSnapshot({
      providers: {
        providers: [
          { status: "online", operationalStatus: "active" },
          { status: "standby", operationalStatus: "standby" },
          { status: "offline", operationalStatus: "disabled" },
        ],
      },
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
      routing: {
        databaseAvailable: true,
        summary: {
          enabledModels: 44,
          invalidRoutes: 0,
        },
      },
      jobs: {
        summary: {
          byStatus: {
            queued: 2,
            processing: 3,
            failed: 4,
          },
          diagnostics: 5,
        },
      },
      history: {
        summary: {
          providerUsageRecords: 618,
          providerUsageLinked: 458,
          providerUsageUnlinked: 160,
          rowsMissingProviderUsage: 11,
        },
        rows: [
          { routingSource: "control_center" },
          { routingSource: "legacy_fallback" },
        ],
      },
      analytics: {
        ok: true,
        overview: {
          totalGenerations: 1072,
          completed: 552,
          failed: 212,
          processing: 31,
          successRate: 72.3,
          failureRate: 27.7,
        },
        usage: {
          total: 618,
          linked: 458,
          unlinked: 160,
          linkCoverage: 74.1,
        },
        dataQuality: {
          providerUsageLinkCoverage: 74.1,
          rowsMissingProviderUsage: 11,
        },
        costCoverage: {
          actualCostCoverage: 0.4,
          estimatedCostCoverage: 49.4,
          financialAnalyticsTrustworthy: false,
        },
      },
      models: {
        imageModels: [{}],
        videoModels: [{}],
      },
      pricing: {
        models: [{ modelId: "x" }],
      },
      knowledge: {
        ok: true,
        summary: {
          sources: 0,
          approvedKnowledge: 0,
          drafts: 0,
        },
      },
    });

    expect(snapshot.cards.providers).toEqual({ active: 1, standby: 1, offline: 1 });
    expect(snapshot.cards.features).toEqual({ controlled: 25, partial: 6, uncontrolled: 1, unknown: 8 });
    expect(snapshot.cards.routing).toEqual({
      databaseAvailable: true,
      controlCenterRoutes: 44,
      legacyFallbackCount: 1,
    });
    expect(snapshot.cards.financial.trustworthy).toBe(false);
    expect(snapshot.systems.find((row) => row.system === "Knowledge")?.status).toBe("READY");
    expect(snapshot.systems.find((row) => row.system === "Features")?.status).toBe("PARTIAL");
    expect(snapshot.systems.find((row) => row.system === "Jobs")?.status).toBe("PARTIAL");
    expect(snapshot.alerts.map((alert) => alert.title)).toEqual(
      expect.arrayContaining([
        "Job diagnostics detected",
        "Unlinked ProviderUsage records",
        "Missing provider usage",
        "Low actual-cost coverage",
        "Partial or unknown features",
        "Financial data not fully trustworthy",
      ]),
    );
  });

  it("marks routing degraded when the routing read model reports unavailable database", () => {
    const snapshot = buildAdminControlCenterSnapshot({
      routing: {
        databaseAvailable: false,
        summary: {
          enabledModels: 0,
          invalidRoutes: 0,
        },
      },
    });

    expect(snapshot.systems.find((row) => row.system === "Routing")?.status).toBe("DEGRADED");
    expect(snapshot.alerts.map((alert) => alert.title)).toContain("Routing DB unavailable");
  });

  it("marks storage degraded when the active writable provider is unavailable", () => {
    const snapshot = buildAdminControlCenterSnapshot({
      storage: {
        ok: true,
        summary: {
          activeProviderLabel: "Backblaze B2",
          legacyReadEnabled: true,
          health: {
            activeConfigured: false,
            writeEnabled: false,
            readEnabled: false,
            mediaGatewayReady: false,
          },
        },
      },
    });

    expect(snapshot.systems.find((row) => row.system === "Storage")?.status).toBe("DEGRADED");
    expect(snapshot.alerts.map((alert) => alert.title)).toContain("Storage write unavailable");
  });
});

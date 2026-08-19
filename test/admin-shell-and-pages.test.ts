import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROVIDER_REGISTRY,
  isProviderFallbackAllowed,
  isProviderRoutingAllowed,
} from "@/lib/provider-registry";
import { buildAdminControlCenterSnapshot } from "@/lib/admin/control-center";
import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("Admin Shell & Visual Workspace Integrity Tests", () => {
  it("enforces centralized single-source navigation configuration", () => {
    expect(ADMIN_NAV_CONFIG.length).toBeGreaterThanOrEqual(3);
    const titles = ADMIN_NAV_CONFIG.map((g) => g.title);
    expect(titles).toContain("OVERVIEW");
    expect(titles).toContain("OPERATIONS");

    const allRoutes = ADMIN_NAV_CONFIG.flatMap((g) => g.items.map((i) => i.href));
    expect(allRoutes).toContain("/admin/control-center");
    expect(allRoutes).toContain("/admin/providers");
    expect(allRoutes).toContain("/admin/models");
    expect(allRoutes).toContain("/admin/routing");
    expect(allRoutes).toContain("/admin/pricing");
    expect(allRoutes).toContain("/admin/features");
    expect(allRoutes).toContain("/admin/storage");
    expect(allRoutes).toContain("/admin/knowledge");
    expect(allRoutes).toContain("/admin/jobs");
    expect(allRoutes).toContain("/admin/history");
    expect(allRoutes).toContain("/admin/analytics");
  });

  it("verifies all core admin subpages are wrapped in AdminShell without centered page-level max-w wrappers", () => {
    const coreRoutes = [
      "control-center",
      "providers",
      "history",
      "jobs",
      "analytics",
      "routing",
      "models",
      "pricing",
      "features",
      "storage",
      "knowledge",
      "provider-costs",
      "subscriber-analytics",
      "cinematic-presets",
      "model-test",
      "migrate-storage",
      "smart-cli-debug",
      "voice-samples",
    ];

    for (const route of coreRoutes) {
      const filePath = path.join(process.cwd(), "app", "admin", route, "page.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("<AdminShell");
      expect(content).not.toMatch(/<main[^>]*mx-auto[^>]*max-w-/);
    }
  });

  it("enforces that BytePlus and KIE are strictly standby and prohibited from routing", () => {
    const byteplus = PROVIDER_REGISTRY.find((p) => p.id === "byteplus");
    const kie = PROVIDER_REGISTRY.find((p) => p.id === "kie");

    expect(byteplus?.status).toBe("standby");
    expect(byteplus?.allowRouting).toBe(false);
    expect(isProviderRoutingAllowed("byteplus")).toBe(false);

    expect(kie?.status).toBe("standby");
    expect(kie?.allowRouting).toBe(false);
    expect(isProviderRoutingAllowed("kie")).toBe(false);
  });

  it("handles missing/empty data honestly without inventing fake healthy signals", () => {
    const snapshot = buildAdminControlCenterSnapshot({});

    expect(snapshot.cards.generation.total).toBe(0);
    expect(snapshot.cards.generation.completed).toBe(0);
    expect(snapshot.cards.jobs.queued).toBe(0);
    expect(snapshot.cards.financial.actualCostCoverage).toBeNull();
    expect(snapshot.cards.financial.trustworthy).toBe(false);
  });

  it("populates actual metrics accurately when unified data is present", () => {
    const mockPayload = {
      analytics: {
        ok: true,
        overview: {
          totalGenerations: 1109,
          completed: 850,
          failed: 200,
          processing: 59,
        },
        costCoverage: {
          actualCostCoverage: 15.5,
          estimatedCostCoverage: 45.2,
        },
        usage: {
          total: 661,
          linked: 495,
          unlinked: 166,
          linkCoverage: 74.8,
        },
      },
      jobs: {
        ok: true,
        summary: {
          byStatus: {
            queued: 5,
            processing: 10,
            failed: 20,
          },
          diagnostics: 2,
        },
      },
      features: {
        ok: true,
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

    const snapshot = buildAdminControlCenterSnapshot(mockPayload);
    expect(snapshot.cards.generation.total).toBe(1109);
    expect(snapshot.cards.generation.completed).toBe(850);
    expect(snapshot.cards.jobs.queued).toBe(5);
    expect(snapshot.cards.features.controlled).toBe(25);
    expect(snapshot.cards.usage.coverage).toBe(74.8);
  });

  it("strictly preserves pricing boundary with zero profit/margin calculations", () => {
    for (const provider of PROVIDER_REGISTRY) {
      expect((provider as any).profitMargin).toBeUndefined();
      expect((provider as any).userCreditMarkup).toBeUndefined();
    }
  });
});

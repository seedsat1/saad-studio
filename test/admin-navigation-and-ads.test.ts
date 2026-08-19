import { describe, it, expect } from "vitest";

import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("ADMIN INFORMATION ARCHITECTURE & NAVIGATION TEST SUITE", () => {
  it("1. verifies all 7 canonical responsibility groups exist with non-empty items", () => {
    const groupIds = ADMIN_NAV_CONFIG.map((g) => g.id);
    expect(groupIds).toEqual([
      "overview",
      "operations",
      "finance",
      "ai_engine",
      "content_cms",
      "ads",
      "utilities",
    ]);

    for (const group of ADMIN_NAV_CONFIG) {
      expect(group.title).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("2. proves every primary active daily admin surface is directly reachable with unique hrefs", () => {
    const allHrefs = ADMIN_NAV_CONFIG.flatMap((g) => g.items.map((i) => i.href));
    const uniqueHrefs = new Set(allHrefs);

    // Zero duplicate primary navigation links
    expect(uniqueHrefs.size).toBe(allHrefs.length);

    // Essential daily surfaces reachable
    expect(uniqueHrefs.has("/admin/control-center")).toBe(true);
    expect(uniqueHrefs.has("/admin/history")).toBe(true); // Generation Monitor
    expect(uniqueHrefs.has("/admin/jobs")).toBe(true); // Job Queues
    expect(uniqueHrefs.has("/admin/users")).toBe(true); // Users & Accounts
    expect(uniqueHrefs.has("/admin/subscriber-analytics")).toBe(true); // Subscriber Economics
    expect(uniqueHrefs.has("/admin/transactions")).toBe(true); // Transactions & Billing
    expect(uniqueHrefs.has("/admin/pricing")).toBe(true); // Pricing Constitution
    expect(uniqueHrefs.has("/admin/provider-costs")).toBe(true); // Provider Costs
    expect(uniqueHrefs.has("/admin/routing")).toBe(true); // Checkpoint Routing
    expect(uniqueHrefs.has("/admin/models")).toBe(true); // AI Models
    expect(uniqueHrefs.has("/admin/features")).toBe(true); // Features
    expect(uniqueHrefs.has("/admin/providers")).toBe(true); // Provider Fleet
    expect(uniqueHrefs.has("/admin/storage")).toBe(true); // Storage
    expect(uniqueHrefs.has("/admin/knowledge")).toBe(true); // Knowledge
    expect(uniqueHrefs.has("/admin/cms")).toBe(true); // Content & CMS Hub
    expect(uniqueHrefs.has("/admin/ads")).toBe(true); // Ad Campaigns & Banners
  });

  it("3. verifies semantic separation between Generation Monitor and Job Queues", () => {
    const operationsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "operations");
    expect(operationsGroup).toBeDefined();

    const monitorItem = operationsGroup?.items.find((i) => i.href === "/admin/history");
    const jobsItem = operationsGroup?.items.find((i) => i.href === "/admin/jobs");

    expect(monitorItem).toBeDefined();
    expect(monitorItem?.label).toBe("Generation Monitor");

    expect(jobsItem).toBeDefined();
    expect(jobsItem?.label).toBe("Job Queues & Workers");
  });

  it("4. verifies strict separation between Marketing Pricing Copy and Pricing Constitution", () => {
    const financeGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "finance");
    const cmsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "content_cms");

    const constitutionItem = financeGroup?.items.find((i) => i.href === "/admin/pricing");
    const marketingPricingItem = cmsGroup?.items.find((i) => i.href === "/admin/cms/pricing");

    expect(constitutionItem).toBeDefined();
    expect(constitutionItem?.label).toBe("Pricing Constitution");

    expect(marketingPricingItem).toBeDefined();
    expect(marketingPricingItem?.label).toBe("Marketing Pricing Copy");

    // They point to completely separate URLs and responsibilities
    expect(constitutionItem?.href).not.toBe(marketingPricingItem?.href);
  });

  it("5. verifies Ads & Campaigns domain is active and points to /admin/ads", () => {
    const adsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "ads");
    expect(adsGroup).toBeDefined();
    expect(adsGroup?.items[0].href).toBe("/admin/ads");
    expect(adsGroup?.items[0].label).toBe("Ad Campaigns & Banners");
  });

  it("6. verifies Content & CMS child editors are registered under CMS Hub", () => {
    const cmsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "content_cms");
    const cmsHrefs = cmsGroup?.items.map((i) => i.href);

    expect(cmsHrefs).toContain("/admin/cms");
    expect(cmsHrefs).toContain("/admin/cms/studio-img");
    expect(cmsHrefs).toContain("/admin/cms/explore");
    expect(cmsHrefs).toContain("/admin/cms/discover");
    expect(cmsHrefs).toContain("/admin/cms/apps");
    expect(cmsHrefs).toContain("/admin/cms/pricing");
    expect(cmsHrefs).toContain("/admin/cinematic-presets");
    expect(cmsHrefs).toContain("/admin/voice-samples");
    expect(cmsHrefs).toContain("/admin/page-builder");
  });

  it("7. verifies Advanced Utilities are cleanly categorized in utilities group", () => {
    const utilsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "utilities");
    const utilHrefs = utilsGroup?.items.map((i) => i.href);

    expect(utilHrefs).toContain("/admin/migrate-storage");
    expect(utilHrefs).toContain("/admin/generation-lab");
    expect(utilHrefs).toContain("/admin/model-test");
    expect(utilHrefs).toContain("/admin/smart-cli-debug");
  });
});

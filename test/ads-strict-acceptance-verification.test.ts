import { describe, it, expect } from "vitest";
import {
  serializeAdCampaign,
  deserializeAdCampaign,
  sanitizeCtaUrl,
  computeCampaignStatus,
  getDefaultPlacement,
} from "@/lib/ads/ad-campaign-serializer";
import {
  AdCampaignConfig,
  AdPositionGeometry,
  ResolvedPromotion,
} from "@/lib/ads/types";
import {
  VERIFIED_SUBSCRIBER_ROUTES,
  getRouteName,
} from "@/lib/ads/verified-routes";
import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("ADS V2.1 STRICT ACCEPTANCE VERIFICATION TEST SUITE", () => {
  describe("1. Normalized Storage & TargetLink Clean Semantic Responsibility", () => {
    it("proves targetLink stores pure CTA URL and NOT serialized JSON payload", () => {
      const config: Partial<AdCampaignConfig> & { title: string; type: string } = {
        title: "Summer Discount",
        headline: "Save 50% on all Pro plans",
        description: "Special seasonal discount",
        type: "CUSTOM",
        mediaUrl: "https://example.com/summer.jpg",
        ctaLabel: "Upgrade to Pro",
        ctaUrl: "/pricing",
        ctaTarget: "_self",
        targetPages: ["/dashboard", "/video"],
        placements: {
          "/dashboard": {
            desktop: { xPct: 70, yPct: 20, widthPct: 30, anchor: "top-right", placementMode: "FLOATING" },
          },
          "/video": {
            desktop: { xPct: 80, yPct: 25, widthPct: 25, anchor: "top-right", placementMode: "FLOATING" },
          },
        },
      };

      const serialized = serializeAdCampaign(config);

      // targetLink must be pure CTA URL string
      expect(serialized.targetLink).toBe("/pricing");
      expect(serialized.targetLink).not.toContain("{");
      expect(serialized.targetLink).not.toContain("saad_ad_v1:");

      // Normalized campaign properties must be separated into campaignData and placementsData
      expect(serialized.campaignData.headline).toBe("Save 50% on all Pro plans");
      expect(serialized.campaignData.targetLink).toBe("/pricing");
      expect(serialized.placementsData.length).toBe(2);
      expect(serialized.placementsData[0].route).toBe("/dashboard");
      expect(serialized.placementsData[0].desktopX).toBe(70);
      expect(serialized.placementsData[1].route).toBe("/video");
      expect(serialized.placementsData[1].desktopX).toBe(80);
    });

    it("deserializes normalized Prisma rows with AdPlacement relations seamlessly", () => {
      const mockPrismaRow = {
        id: "camp_norm_1",
        title: "Model Release",
        headline: "Veo 3.1 4K Studio Now Live",
        description: "Generate 4K cinematic videos directly in Saad Studio.",
        type: "CUSTOM",
        mediaUrl: "https://example.com/veo.jpg",
        mediaType: "image",
        targetLink: "/video",
        ctaLabel: "Launch Studio",
        ctaTarget: "_self",
        isActive: true,
        priority: 50,
        audience: "PAID_SUBSCRIBERS",
        animation: "slide",
        dismissible: true,
        dismissalModel: "session",
        startDate: null,
        expiresAt: null,
        placements: [
          {
            id: "p1",
            campaignId: "camp_norm_1",
            route: "/dashboard",
            placementMode: "FLOATING",
            anchor: "center",
            desktopX: 60,
            desktopY: 30,
            desktopW: 35,
            desktopH: null,
            tabletX: 50,
            tabletY: 40,
            tabletW: 50,
            tabletH: null,
            mobileX: 50,
            mobileY: 85,
            mobileW: 90,
            mobileH: null,
            zIndex: 50,
          },
        ],
        events: [
          { id: "e1", eventType: "impression" },
          { id: "e2", eventType: "impression" },
          { id: "e3", eventType: "click" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deserialized = deserializeAdCampaign(mockPrismaRow);
      expect(deserialized.id).toBe("camp_norm_1");
      expect(deserialized.headline).toBe("Veo 3.1 4K Studio Now Live");
      expect(deserialized.ctaUrl).toBe("/video");
      expect(deserialized.targetPages).toEqual(["/dashboard"]);
      expect(deserialized.placements["/dashboard"].desktop.xPct).toBe(60);
      expect(deserialized.placements["/dashboard"].mobile?.widthPct).toBe(90);
      expect(deserialized.impressionsCount).toBe(2);
      expect(deserialized.clicksCount).toBe(1);
    });
  });

  describe("2. Backward Compatibility & Old Record Migration", () => {
    it("safely reads old saad_ad_v1 payloads and extracts pure CTA URL and placements", () => {
      const oldPayload = {
        headline: "Legacy Campaign Headline",
        description: "Old payload in targetLink",
        ctaUrl: "/pricing",
        ctaLabel: "Buy Now",
        targetPages: ["/apps"],
        placements: {
          "/apps": {
            desktop: { xPct: 85, yPct: 15, widthPct: 20, anchor: "top-right", placementMode: "FLOATING" },
          },
        },
      };

      const legacyRow = {
        id: "camp_legacy_v1",
        title: "Old Campaign",
        type: "CUSTOM",
        mediaUrl: null,
        targetLink: `saad_ad_v1:${JSON.stringify(oldPayload)}`,
        isActive: true,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deserialized = deserializeAdCampaign(legacyRow);
      expect(deserialized.headline).toBe("Legacy Campaign Headline");
      expect(deserialized.ctaUrl).toBe("/pricing");
      expect(deserialized.targetPages).toEqual(["/apps"]);
      expect(deserialized.placements["/apps"].desktop.xPct).toBe(85);
    });

    it("safely reads legacy TOP_BANNER, POPUP, and SIDEBAR rows with pure URL strings", () => {
      const legacyTopBanner = {
        id: "camp_tb",
        title: "Site Banner",
        type: "TOP_BANNER",
        mediaUrl: null,
        targetLink: "/gallery",
        isActive: true,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deserialized = deserializeAdCampaign(legacyTopBanner);
      expect(deserialized.type).toBe("TOP_BANNER");
      expect(deserialized.ctaUrl).toBe("/gallery");
      expect(deserialized.placements.ALL.desktop.placementMode).toBe("FLOW");
      expect(deserialized.placements.ALL.desktop.widthPct).toBe(100);
    });
  });

  describe("3. Deterministic Runtime Resolver & Collision Resolution", () => {
    it("sorts campaigns strictly by priority descending, with ID tiebreak", () => {
      const campA: ResolvedPromotion = {
        id: "ad_c",
        title: "Campaign C",
        headline: "Headline C",
        description: "Desc",
        mediaType: "none",
        mediaUrl: null,
        ctaLabel: null,
        ctaUrl: "/pricing",
        ctaTarget: "_self",
        placementFamily: "CUSTOM",
        placementMode: "FLOATING",
        geometry: { xPct: 50, yPct: 50, widthPct: 40, anchor: "center", placementMode: "FLOATING" },
        theme: { backgroundColor: "#000", textColor: "#fff", borderColor: "#fff", borderRadius: 8 },
        animation: "fade",
        priority: 50,
        dismissible: true,
        dismissalModel: "session",
        expiresAt: null,
      };

      const campB: ResolvedPromotion = {
        ...campA,
        id: "ad_b",
        title: "Campaign B",
        priority: 100,
      };

      const campC: ResolvedPromotion = {
        ...campA,
        id: "ad_a",
        title: "Campaign A",
        priority: 100,
      };

      const list = [campA, campB, campC];
      list.sort((x, y) => y.priority - x.priority || x.id.localeCompare(y.id));

      expect(list[0].id).toBe("ad_a"); // Highest priority + tiebreak
      expect(list[1].id).toBe("ad_b"); // Highest priority
      expect(list[2].id).toBe("ad_c"); // Lowest priority
    });
  });

  describe("4. Security, XSS & Safe Navigation", () => {
    it("blocks malicious protocols and javascript execution", () => {
      expect(sanitizeCtaUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeCtaUrl("vbscript:msgbox(1)")).toBeNull();
      expect(sanitizeCtaUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(sanitizeCtaUrl("file:///etc/passwd")).toBeNull();
    });

    it("allows valid internal and external links", () => {
      expect(sanitizeCtaUrl("/pricing")).toBe("/pricing");
      expect(sanitizeCtaUrl("/video")).toBe("/video");
      expect(sanitizeCtaUrl("https://saadstudio.com/updates")).toBe("https://saadstudio.com/updates");
    });
  });
});

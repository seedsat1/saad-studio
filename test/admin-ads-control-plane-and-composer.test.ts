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
  AdCampaignRow,
  AdPositionGeometry,
} from "@/lib/ads/types";
import {
  VERIFIED_SUBSCRIBER_ROUTES,
  getRouteName,
} from "@/lib/ads/verified-routes";
import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("SAAD STUDIO — ADS & PROMOTIONS CONTROL PLANE TEST SUITE", () => {
  describe("1. Admin Navigation & IA Canonical Route Integrity", () => {
    it("proves /admin/ads is the canonical Ads & Campaigns destination", () => {
      const adsGroup = ADMIN_NAV_CONFIG.find((g) => g.id === "ads");
      expect(adsGroup).toBeDefined();
      expect(adsGroup?.items.some((i) => i.href === "/admin/ads")).toBe(true);

      // Verify no duplicate/competing ad routes exist in navigation
      const allHrefs = ADMIN_NAV_CONFIG.flatMap((g) => g.items.map((i) => i.href));
      const adRoutes = allHrefs.filter((h) => h.includes("ad-builder") || h.includes("campaign-manager") || h.includes("promotions"));
      expect(adRoutes.length).toBe(0);
    });
  });

  describe("2. CTA Sanitization & XSS Protection", () => {
    it("blocks dangerous javascript: and data: URLs", () => {
      expect(sanitizeCtaUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeCtaUrl("JAVASCRIPT:document.cookie")).toBeNull();
      expect(sanitizeCtaUrl("vbscript:msgbox(1)")).toBeNull();
      expect(sanitizeCtaUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(sanitizeCtaUrl("file:///etc/passwd")).toBeNull();
    });

    it("allows valid internal routes and external http/https URLs", () => {
      expect(sanitizeCtaUrl("/pricing")).toBe("/pricing");
      expect(sanitizeCtaUrl("/video")).toBe("/video");
      expect(sanitizeCtaUrl("https://example.com/promo")).toBe("https://example.com/promo");
      expect(sanitizeCtaUrl("http://example.com/promo")).toBe("http://example.com/promo");
      expect(sanitizeCtaUrl("pricing")).toBe("/pricing");
    });
  });

  describe("3. Legacy AdCampaign Backward Compatibility", () => {
    it("seamlessly deserializes legacy TOP_BANNER, POPUP, and SIDEBAR rows", () => {
      const legacyRow: AdCampaignRow = {
        id: "camp_legacy_1",
        title: "Spring Sale",
        type: "TOP_BANNER",
        mediaUrl: "https://example.com/banner.jpg",
        targetLink: "/pricing",
        isActive: true,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deserialized = deserializeAdCampaign(legacyRow);
      expect(deserialized.id).toBe("camp_legacy_1");
      expect(deserialized.title).toBe("Spring Sale");
      expect(deserialized.ctaUrl).toBe("/pricing");
      expect(deserialized.type).toBe("TOP_BANNER");
      expect(deserialized.status).toBe("LIVE");
      expect(deserialized.placements.ALL).toBeDefined();
      expect(deserialized.placements.ALL.desktop.placementMode).toBe("FLOW");
    });

    it("seamlessly deserializes legacy POPUP rows with floating placement", () => {
      const legacyPopup: AdCampaignRow = {
        id: "camp_popup_1",
        title: "New AI Model",
        type: "POPUP",
        mediaUrl: "https://example.com/popup.jpg",
        targetLink: "https://external.com/announcement",
        isActive: true,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deserialized = deserializeAdCampaign(legacyPopup);
      expect(deserialized.id).toBe("camp_popup_1");
      expect(deserialized.ctaUrl).toBe("https://external.com/announcement");
      expect(deserialized.placements.ALL.desktop.placementMode).toBe("FLOATING");
      expect(deserialized.placements.ALL.desktop.widthPct).toBe(40);
    });
  });

  describe("4. Campaign Lifecycle & Schedule Evaluation", () => {
    it("computes LIVE for active campaigns within schedule", () => {
      expect(computeCampaignStatus(true, null, null)).toBe("LIVE");
    });

    it("computes PAUSED for inactive campaigns", () => {
      expect(computeCampaignStatus(false, null, null)).toBe("PAUSED");
    });

    it("computes SCHEDULED when start date is in the future", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      expect(computeCampaignStatus(true, futureDate, null)).toBe("SCHEDULED");
    });

    it("computes EXPIRED when expiry date is in the past", () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      expect(computeCampaignStatus(true, null, pastDate)).toBe("EXPIRED");
    });
  });

  describe("5. Visual Composer Geometry & Placement Serialization", () => {
    it("serializes and deserializes rich responsive placement maps without loss", () => {
      const customConfig: Partial<AdCampaignConfig> & { title: string; type: string } = {
        title: "Black Friday Banner",
        headline: "Save 50% on all plans",
        description: "Special seasonal discount",
        type: "CUSTOM",
        mediaUrl: "https://example.com/bf.jpg",
        mediaType: "image",
        ctaLabel: "Claim Discount",
        ctaUrl: "/pricing",
        ctaTarget: "_self",
        audience: "FREE_TIER",
        priority: 25,
        targetPages: ["/dashboard", "/video"],
        placements: {
          "/dashboard": {
            desktop: {
              xPct: 75,
              yPct: 20,
              widthPct: 30,
              anchor: "top-right",
              placementMode: "FLOATING",
            },
            mobile: {
              xPct: 50,
              yPct: 90,
              widthPct: 90,
              anchor: "bottom-right",
              placementMode: "FLOATING",
            },
          },
        },
        isActive: true,
        impressionsCount: 150,
        clicksCount: 12,
        dismissalsCount: 3,
      };

      const serialized = serializeAdCampaign(customConfig);
      expect(serialized.title).toBe("Black Friday Banner");
      expect(serialized.targetLink).toBe("/pricing");
      expect(serialized.placementsData.length).toBe(2);
      expect(serialized.placementsData[0].route).toBe("/dashboard");
      expect(serialized.placementsData[1].route).toBe("/video");

      const simulatedDbRow: any = {
        id: "camp_custom_123",
        title: serialized.title,
        headline: serialized.campaignData.headline,
        description: serialized.campaignData.description,
        type: serialized.type,
        mediaUrl: serialized.mediaUrl,
        mediaType: serialized.campaignData.mediaType,
        targetLink: serialized.targetLink,
        ctaLabel: serialized.campaignData.ctaLabel,
        ctaTarget: serialized.campaignData.ctaTarget,
        audience: serialized.campaignData.audience,
        priority: serialized.campaignData.priority,
        isActive: serialized.isActive,
        expiresAt: serialized.expiresAt,
        placements: serialized.placementsData.map((p, idx) => ({
          id: `p_${idx}`,
          campaignId: "camp_custom_123",
          ...p,
        })),
        events: [
          { id: "e1", eventType: "impression" },
          { id: "e2", eventType: "click" },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const restored = deserializeAdCampaign(simulatedDbRow);
      expect(restored.headline).toBe("Save 50% on all plans");
      expect(restored.ctaUrl).toBe("/pricing");
      expect(restored.audience).toBe("FREE_TIER");
      expect(restored.priority).toBe(25);
      expect(restored.placements["/dashboard"].desktop.xPct).toBe(75);
      expect(restored.placements["/dashboard"].mobile?.widthPct).toBe(90);
      expect(restored.impressionsCount).toBe(1);
      expect(restored.clicksCount).toBe(1);
    });
  });

  describe("6. Verified Subscriber Routes Registry", () => {
    it("contains core generation studios and key subscriber hubs", () => {
      const paths = VERIFIED_SUBSCRIBER_ROUTES.map((r) => r.path);
      expect(paths).toContain("/dashboard");
      expect(paths).toContain("/video");
      expect(paths).toContain("/image");
      expect(paths).toContain("/audio");
      expect(paths).toContain("/pricing");
      expect(paths).toContain("/gallery");
      expect(paths).toContain("/apps");
      expect(paths).toContain("/explore");

      expect(getRouteName("/dashboard")).toBe("Dashboard Overview");
      expect(getRouteName("/video")).toBe("Video Studio");
      expect(getRouteName("ALL")).toBe("All Subscriber Pages (Site-Wide)");
    });
  });
});

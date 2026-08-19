import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("OWNER-DEFINED PRODUCTION PURGE & NAVIGATION ARCHITECTURE VERIFICATION", () => {
  describe("1. Canonical Owner-Approved Studios & Features", () => {
    it("verifies all owner-approved primary and specialized production studios exist", () => {
      const approvedStudios = [
        "app/(dash)/(routes)/dashboard/page.tsx",
        "app/(dash)/(routes)/image/page.tsx",
        "app/(dash)/(routes)/video/page.tsx",
        "app/(dash)/(routes)/audio/page.tsx",
        "app/(dash)/(routes)/3d/page.tsx",
        "app/(dash)/(routes)/canvas/page.tsx",
        "app/(dash)/(routes)/influencers/page.tsx",
        "app/(dash)/(routes)/clipcraft-studio/page.tsx",
        "app/(dash)/(routes)/cinema-studio/page.tsx",
        "app/(dash)/(routes)/lipsync/page.tsx",
        "app/(dash)/(routes)/edit/page.tsx",
        "app/(dash)/(routes)/video-edit/page.tsx",
        "app/(dash)/(routes)/video-editor/page.tsx",
        "app/(dash)/(routes)/video-extend/page.tsx",
        "app/(dash)/(routes)/cinematic-video/page.tsx",
        "app/(dash)/(routes)/video-project-editor/page.tsx",
        "app/(dash)/(routes)/cinema-flow/page.tsx",
        "app/(dash)/(routes)/cinema-board/page.tsx",
        "app/(dash)/(routes)/shots/page.tsx",
        "app/(dash)/(routes)/variations/page.tsx",
        "app/(dash)/(routes)/storyboard/page.tsx",
        "app/(dash)/(routes)/hook-studio/page.tsx",
        "app/(dash)/(routes)/character/page.tsx",
        "app/(dash)/(routes)/prompt-extractor/page.tsx",
        "app/(dash)/(routes)/gallery/page.tsx",
        "app/(dash)/(routes)/explore/page.tsx",
        "app/(dash)/(routes)/apps/page.tsx",
      ];

      for (const relPath of approvedStudios) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Approved studio missing: ${relPath}`).toBe(true);
      }
    });
  });

  describe("2. Verification of Dead/Obsolete Purged Routes", () => {
    it("verifies dead prototypes, staging, and legacy template routes were completely removed", () => {
      const purgedRoutes = [
        "app/(dash)/(routes)/cinema-studio-vso/page.tsx",
        "app/(dash)/(routes)/beauty2.html/page.tsx",
        "app/admin/cms/beauty2/page.tsx",
        "app/(dash)/(routes)/code/page.tsx",
        "app/(dash)/(routes)/conversation/page.tsx",
        "app/(dash)/(routes)/lingerie/page.tsx",
        "app/(dash)/(routes)/world-cup-studio/page.tsx",
        "app/(dash)/(routes)/studio-edit/page.tsx",
        "app/(dash)/(routes)/image-presets/page.tsx",
        "app/(dash)/(routes)/moodboard/page.tsx",
        "app/(dash)/(routes)/image/generate/page.tsx",
        "app/(dash)/(routes)/image/ai-influencer/page.tsx",
        "app/(dash)/(routes)/image/soul-id-character/page.tsx",
        "app/(dash)/(routes)/video/create-video/page.tsx",
        "app/(landing)/promo/page.tsx",
        "app/(dash)/(routes)/talent-studio/page.tsx",
      ];

      for (const relPath of purgedRoutes) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Purged route still exists: ${relPath}`).toBe(false);
      }
    });
  });

  describe("3. Influencers Sub-Route Integrity", () => {
    it("verifies all canonical /influencers sub-routes exist", () => {
      const influencerSubRoutes = [
        "app/(dash)/(routes)/influencers/canvas/page.tsx",
        "app/(dash)/(routes)/influencers/faceswap/page.tsx",
        "app/(dash)/(routes)/influencers/image/page.tsx",
        "app/(dash)/(routes)/influencers/library/page.tsx",
        "app/(dash)/(routes)/influencers/motion/page.tsx",
        "app/(dash)/(routes)/influencers/nsfw/page.tsx",
        "app/(dash)/(routes)/influencers/upscale/page.tsx",
        "app/(dash)/(routes)/influencers/video/page.tsx",
      ];

      for (const relPath of influencerSubRoutes) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Influencer sub-route missing: ${relPath}`).toBe(true);
      }
    });
  });

  describe("4. Admin Navigation & Production API Integrity", () => {
    it("verifies all core admin consoles and endpoints exist", () => {
      const adminPages = [
        "app/admin/control-center/page.tsx",
        "app/admin/history/page.tsx",
        "app/admin/jobs/page.tsx",
        "app/admin/transactions/page.tsx",
        "app/admin/pricing/page.tsx",
        "app/admin/routing/page.tsx",
        "app/admin/models/page.tsx",
        "app/admin/features/page.tsx",
        "app/admin/storage/page.tsx",
        "app/admin/ads/page.tsx",
        "app/admin/cms/page.tsx",
        "app/admin/smart-cli-debug/page.tsx",
      ];

      for (const relPath of adminPages) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Admin page missing: ${relPath}`).toBe(true);
      }
    });

    it("verifies all primary generation APIs are active", () => {
      const apiRoutes = [
        "app/api/generate/image/route.ts",
        "app/api/generate/video/route.ts",
        "app/api/music/route.ts",
        "app/api/3d/route.ts",
        "app/api/cron/generation-reconcile/route.ts",
        "app/api/cron/storage-cleanup/route.ts",
      ];

      for (const relPath of apiRoutes) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `API route missing: ${relPath}`).toBe(true);
      }
    });
  });
});

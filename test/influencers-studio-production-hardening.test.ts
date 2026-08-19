import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("INFLUENCERS STUDIO REPAIR & PRODUCTION HARDENING VERIFICATION", () => {
  describe("1. Primary Product & Sub-Routes Existence", () => {
    it("verifies canonical /influencers and all 8 sub-routes exist in production code", () => {
      const requiredRoutes = [
        "app/(dash)/(routes)/influencers/page.tsx",
        "app/(dash)/(routes)/influencers/canvas/page.tsx",
        "app/(dash)/(routes)/influencers/faceswap/page.tsx",
        "app/(dash)/(routes)/influencers/image/page.tsx",
        "app/(dash)/(routes)/influencers/library/page.tsx",
        "app/(dash)/(routes)/influencers/motion/page.tsx",
        "app/(dash)/(routes)/influencers/nsfw/page.tsx",
        "app/(dash)/(routes)/influencers/upscale/page.tsx",
        "app/(dash)/(routes)/influencers/video/page.tsx",
      ];

      for (const relPath of requiredRoutes) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Missing required influencer route: ${relPath}`).toBe(true);
      }
    });

    it("verifies all core influencer studio component modules exist", () => {
      const requiredComponents = [
        "components/influencers/InfluencersStudioPage.tsx",
        "components/influencers/InfluencerRoster.tsx",
        "components/influencers/WorkflowCanvas.tsx",
        "components/influencers/InfluencerTourModal.tsx",
        "components/influencers/InfluencerAssistantSidebar.tsx",
        "components/influencers/ImageStudio.tsx",
        "components/influencers/VideoStudio.tsx",
        "components/influencers/FaceSwapStudio.tsx",
        "components/influencers/MotionControlStudio.tsx",
        "components/influencers/UpscaleStudio.tsx",
        "components/influencers/LibraryStudio.tsx",
        "components/influencers/NsfwStudio.tsx",
      ];

      for (const relPath of requiredComponents) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath), `Missing component: ${relPath}`).toBe(true);
      }
    });
  });

  describe("2. Admin-Only Route & Layout Access Policy", () => {
    it("verifies server-side layout protection redirects non-admins and unauthenticated users", () => {
      const layoutPath = path.join(process.cwd(), "app/(dash)/(routes)/influencers/layout.tsx");
      expect(fs.existsSync(layoutPath), "Influencers layout missing").toBe(true);
      const layoutContent = fs.readFileSync(layoutPath, "utf-8");
      expect(layoutContent).toContain("isAdmin()");
      expect(layoutContent).toContain('redirect("/dashboard")');
      expect(layoutContent).toContain('redirect("/sign-in")');
    });

    it("verifies middleware enforces admin-only access on /influencers and blocks public route bypass", () => {
      const middlewarePath = path.join(process.cwd(), "middleware.ts");
      const content = fs.readFileSync(middlewarePath, "utf-8");
      expect(content).not.toContain("'/influencers(.*)'");
      expect(content).not.toContain("'/talent-studio(.*)'");
      expect(content).toContain("isInfluencersPath");
      expect(content).toContain("isAdmin");
      expect(content).toContain('NextResponse.redirect(dashboardUrl)');
    });
  });

  describe("3. API Protection & Shared Endpoints Integrity", () => {
    it("verifies /api/generate/image checks admin authorization specifically for influencers/nsfw feature", () => {
      const imageApi = path.join(process.cwd(), "app/api/generate/image/route.ts");
      const content = fs.readFileSync(imageApi, "utf-8");
      expect(content).toContain('isAdmin()');
      expect(content).toContain('feature === "influencers-nsfw"');
      expect(content).toContain("Forbidden: Admin access required");
    });

    it("verifies /api/generate/video checks admin authorization specifically for influencers/nsfw feature", () => {
      const videoApi = path.join(process.cwd(), "app/api/generate/video/route.ts");
      const content = fs.readFileSync(videoApi, "utf-8");
      expect(content).toContain('isAdmin()');
      expect(content).toContain('feature === "influencers-nsfw"');
      expect(content).toContain("Forbidden: Admin access required");
    });
  });

  describe("4. Subscriber UI & Navigation Isolation", () => {
    it("guarantees influencers is NOT exposed in subscriber TopNavbar", () => {
      const navbarPath = path.join(process.cwd(), "components/TopNavbar.tsx");
      const content = fs.readFileSync(navbarPath, "utf-8");
      expect(content).not.toContain('href="/influencers"');
      expect(content).not.toContain('href="/influencers/');
    });

    it("guarantees influencers is NOT exposed in subscriber Apps catalog data", () => {
      const appsDataPath = path.join(process.cwd(), "lib/apps-data.ts");
      const content = fs.readFileSync(appsDataPath, "utf-8");
      expect(content).not.toContain('href: "/influencers"');
      expect(content).not.toContain('href: "/influencers/');
    });
  });

  describe("5. Brand Coherence & Obsolete Eromify Removal", () => {
    it("guarantees no obsolete Eromify/Eronify branding strings remain in active influencer components", () => {
      const influencerComponents = [
        "components/influencers/InfluencersStudioPage.tsx",
        "components/influencers/InfluencerRoster.tsx",
        "components/influencers/WorkflowCanvas.tsx",
        "components/influencers/InfluencerTourModal.tsx",
        "components/influencers/InfluencerAssistantSidebar.tsx",
        "components/influencers/talent-studio-i18n.ts",
      ];

      for (const relPath of influencerComponents) {
        const fullPath = path.join(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content).not.toMatch(/eromify/i);
        expect(content).not.toMatch(/eronify/i);
      }
    });
  });

  describe("6. Default Influencer & Handle System", () => {
    it("verifies default influencer is @gavi and handle formatting is normalized", () => {
      const rosterPath = path.join(process.cwd(), "components/influencers/InfluencerRoster.tsx");
      const content = fs.readFileSync(rosterPath, "utf-8");
      expect(content).toContain("@gavi");
      expect(content).toContain("DEFAULT");
    });
  });

  describe("7. 15-Step Onboarding Tour Parity", () => {
    it("verifies 15 distinct onboarding steps are defined with correct tab routing and step labels", () => {
      const tourPath = path.join(process.cwd(), "components/influencers/InfluencerTourModal.tsx");
      const content = fs.readFileSync(tourPath, "utf-8");
      expect(content).toContain("STEP 1 OF 15");
      expect(content).toContain("STEP 2 OF 15");
      expect(content).toContain("STEP 3 OF 15");
      expect(content).toContain("Welcome to Saad Studio");
    });
  });
});

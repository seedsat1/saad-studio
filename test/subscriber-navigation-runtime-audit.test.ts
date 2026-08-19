import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("SUBSCRIBER NAVIGATION & FEATURE WIRING RUNTIME AUDIT", () => {
  const navbarPath = path.join(process.cwd(), "components/TopNavbar.tsx");
  const navbarContent = fs.readFileSync(navbarPath, "utf-8");

  describe("1. Canonical Top Navigation Items", () => {
    const canonicalTopLinks = [
      { label: "Explore", route: "/dash", file: "app/(dash)/(routes)/dashboard/page.tsx" },
      { label: "Image", route: "/image", file: "app/(dash)/(routes)/image/page.tsx" },
      { label: "Video", route: "/video", file: "app/(dash)/(routes)/video/page.tsx" },
      { label: "Audio", route: "/audio", file: "app/(dash)/(routes)/audio/page.tsx" },
      { label: "Edit", route: "/edit", file: "app/(dash)/(routes)/edit/page.tsx" },
      { label: "Adobe Plugin", route: "/plugin", file: "app/(landing)/(routes)/plugin/page.tsx" },
      { label: "Cinematic Styles", route: "/apps/tool/cinematic-styles", file: "app/(dash)/(routes)/apps/tool/cinematic-styles/page.tsx" },
      { label: "Transitions", route: "/apps/tool/transitions", file: "app/(dash)/(routes)/apps/tool/transitions/page.tsx" },
      { label: "Storyboard", route: "/storyboard", file: "app/(dash)/(routes)/storyboard/page.tsx" },
      { label: "Hook Studio", route: "/hook-studio", file: "app/(dash)/(routes)/hook-studio/page.tsx" },
      { label: "Gallery", route: "/gallery", file: "app/(dash)/(routes)/gallery/page.tsx" },
    ];

    for (const item of canonicalTopLinks) {
      it(`verifies ${item.label} connects to ${item.route} and page file exists`, () => {
        expect(navbarContent).toContain(item.route);
        const filePath = path.join(process.cwd(), item.file);
        expect(fs.existsSync(filePath), `Target file for ${item.label} does not exist: ${item.file}`).toBe(true);
      });
    }
  });

  describe("2. Image Menu Feature Actions", () => {
    const imageFeatures = [
      "Create Image",
      "Prompt",
      "Prompt Extractor",
      "Cinema Studio Image 2.0",
      "Relight",
      "Inpaint",
      "Image Upscale",
      "Face Swap",
      "Character Swap",
      "Draw to Edit",
    ];

    for (const feat of imageFeatures) {
      it(`verifies image feature "${feat}" is defined in TopNavbar`, () => {
        expect(navbarContent).toContain(`label: "${feat}"`);
      });
    }
  });

  describe("3. Video Menu Feature Actions", () => {
    const videoFeatures = [
      { label: "Hook Studio", href: "/hook-studio" },
      { label: "Agent Studio", href: "/agent-studio" },
      { label: "Cinema Flow", href: "/cinema-flow" },
      { label: "Create Video", href: "/video" },
      { label: "Cinema Edit", href: "/video-edit" },
      { label: "Transitions", href: "/apps/tool/transitions" },
      { label: "Storyboard Studio", href: "/storyboard" },
      { label: "Draw to Video", href: "/apps/tool/draw-to-video" },
      { label: "Cinematic Styles", href: "/apps/tool/cinematic-styles" },
      { label: "Edit Video", href: "/edit" },
      { label: "Video Extend", href: "/video-extend" },
      { label: "Lipsync Studio", href: "/lipsync" },
      { label: "ClipCraft Studio", href: "/clipcraft-studio" },
      { label: "Video Upscale", href: "/video?tool=video-upscale" },
      { label: "AI Canvas", href: "/canvas" },
      { label: "3D Studio", href: "/3d" },
      { label: "Assist", href: "/assist" },
      { label: "Smart CLI", href: "/smart-cli" },
    ];

    for (const feat of videoFeatures) {
      it(`verifies video feature "${feat.label}" routes to ${feat.href}`, () => {
        expect(navbarContent).toContain(`label: "${feat.label}"`);
        expect(navbarContent).toContain(`href: "${feat.href}"`);
      });
    }
  });

  describe("4. Audio Menu Feature Actions", () => {
    const audioFeatures = [
      "Text to Music",
      "Voice Cloning",
      "Sound Effects",
      "Podcast Studio",
      "Music Stems",
      "Lyrics Writer",
    ];

    for (const feat of audioFeatures) {
      it(`verifies audio feature "${feat}" is defined in TopNavbar`, () => {
        expect(navbarContent).toContain(`label: "${feat}"`);
      });
    }
  });

  describe("5. Edit Menu Feature Actions", () => {
    const editFeatures = [
      "Background Remove",
      "AI Inpainting",
      "Upscale & Enhance",
      "Style Transfer",
      "Smart Crop",
      "Colorize",
    ];

    for (const feat of editFeatures) {
      it(`verifies edit feature "${feat}" is defined in TopNavbar`, () => {
        expect(navbarContent).toContain(`label: "${feat}"`);
      });
    }
  });

  describe("6. Adobe Plugin Full Ecosystem Chain", () => {
    it("verifies public plugin landing page exists", () => {
      const pluginPage = path.join(process.cwd(), "app/(landing)/(routes)/plugin/page.tsx");
      expect(fs.existsSync(pluginPage)).toBe(true);
    });

    it("verifies download artifact exists in public/downloads", () => {
      const setupExe = path.join(process.cwd(), "public/downloads/SaadStudio-Setup.exe");
      expect(fs.existsSync(setupExe)).toBe(true);
    });

    it("verifies CEP panel browser token and connect routes exist", () => {
      const panelPage = path.join(process.cwd(), "app/panel/page.tsx");
      const connectPage = path.join(process.cwd(), "app/panel/connect/page.tsx");
      expect(fs.existsSync(panelPage)).toBe(true);
      expect(fs.existsSync(connectPage)).toBe(true);
    });

    it("verifies admin CEP CMS editor and Smart CLI debug exist", () => {
      const cepAdmin = path.join(process.cwd(), "app/admin/cms/cep/page.tsx");
      const cliDebug = path.join(process.cwd(), "app/admin/smart-cli-debug/page.tsx");
      expect(fs.existsSync(cepAdmin)).toBe(true);
      expect(fs.existsSync(cliDebug)).toBe(true);
    });
  });

  describe("7. Dedicated Creative Workspaces Delineation", () => {
    it("verifies Storyboard, Cinema Board, Cinema Studio, and Shots are independent routes", () => {
      const routes = [
        "app/(dash)/(routes)/storyboard/page.tsx",
        "app/(dash)/(routes)/cinema-board/page.tsx",
        "app/(dash)/(routes)/cinema-studio/page.tsx",
        "app/(dash)/(routes)/shots/page.tsx",
      ];
      for (const relPath of routes) {
        expect(fs.existsSync(path.join(process.cwd(), relPath))).toBe(true);
      }
    });
  });

  describe("8. Deep-Link Safety & No Deleted Routes References", () => {
    const deletedRoutes = [
      "/video/create-video",
      "/image/generate",
      "/image/ai-influencer",
      "/image/soul-id-character",
      "/talent-studio",
      "/studio-edit",
      "/image-presets",
      "/moodboard",
      "/beauty2.html",
      "/code",
      "/conversation",
      "/cinema-studio-vso",
    ];

    for (const deleted of deletedRoutes) {
      it(`guarantees visible TopNavbar has NO links to deleted route: ${deleted}`, () => {
        expect(navbarContent).not.toContain(`href="${deleted}"`);
        expect(navbarContent).not.toContain(`href: "${deleted}"`);
      });
    }
  });

  describe("9. Influencers Route Isolation from Subscriber UI", () => {
    it("guarantees TopNavbar contains zero links to /influencers", () => {
      expect(navbarContent).not.toContain('href="/influencers"');
      expect(navbarContent).not.toContain('href="/influencers/');
      expect(navbarContent).not.toContain('href: "/influencers"');
      expect(navbarContent).not.toContain('href: "/influencers/');
    });
  });
});

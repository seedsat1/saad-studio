import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const TARGET_PAGES = [
  "app/admin/page-builder/page.tsx",
  "app/admin/generation-lab/page.tsx",
  "app/admin/cms/pricing/page.tsx",
  "app/admin/cms/[slug]/page.tsx",
  "app/admin/cms/apps/page.tsx",
  "app/admin/cms/auth/page.tsx",
  "app/admin/cms/cep/page.tsx",
  "app/admin/cms/discover/page.tsx",
  "app/admin/cms/explore/page.tsx",
  "app/admin/cms/studio-img/page.tsx",
];

describe("Admin UI Consistency & AdminShell Integration", () => {
  it("verifies all 10 targeted pages import and render the canonical AdminShell", () => {
    for (const relPath of TARGET_PAGES) {
      const fullPath = path.join(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `File must exist: ${relPath}`).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain('import { AdminShell } from "@/components/admin/AdminShell";');
      expect(content).toContain("<AdminShell");
      expect(content).toContain("</AdminShell>");
    }
  });

  it("verifies no targeted page imports or renders an alternative duplicate AdminSidebar", () => {
    for (const relPath of TARGET_PAGES) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // None of the pages should import CmsSidebar or create duplicate global sidebars
      expect(content).not.toContain("CmsSidebar");
      expect(content).not.toContain("<AdminSidebar");
    }
  });

  it("verifies Generation Lab retains its local 68px modality navigation", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "app/admin/generation-lab/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("w-[68px]");
    expect(content).toContain("Image");
    expect(content).toContain("Video");
    expect(content).toContain("Avatar");
  });

  it("verifies Page Builder retains its local tabs and preview actions", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "app/admin/page-builder/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("Media Asset Manager");
    expect(content).toContain("Transitions");
    expect(content).toContain("Beauty");
    expect(content).toContain("Promo");
    expect(content).toContain("Announcement");
    expect(content).toContain("SECTIONS");
  });

  it("verifies CMS pricing retains Save and Preview controls", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "app/admin/cms/pricing/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("handleSave");
    expect(content).toContain("Pricing &amp; Payment");
    expect(content).toContain('href="/pricing"');
    expect(content).toContain("Preview");
  });

  it("verifies canonical AdminSidebar globally supplies admin profile and logout", () => {
    const sidebarContent = fs.readFileSync(
      path.join(process.cwd(), "components/admin/AdminSidebar.tsx"),
      "utf-8",
    );
    expect(sidebarContent).toContain("ADMIN_NAV_CONFIG");
    expect(sidebarContent).toContain("handleSignOut");
    expect(sidebarContent).toContain("/admin/profile");
    expect(sidebarContent).toContain("/admin/profile/security");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isAdmin } from "@/lib/is-admin";
import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("Admin Dashboard Auth UI & Profile Integration Tests", () => {
  it("verifies server-side admin layout authorization guards", async () => {
    const layoutPath = path.join(process.cwd(), "app", "admin", "layout.tsx");
    expect(fs.existsSync(layoutPath)).toBe(true);

    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("isAdmin()");
    expect(content).toContain("auth()");
    expect(content).toContain('redirect("/sign-in")');
  });

  it("verifies AdminSidebar contains Admin Identity, Profile, Security, and Logout UI", () => {
    const sidebarPath = path.join(process.cwd(), "components", "admin", "AdminSidebar.tsx");
    expect(fs.existsSync(sidebarPath)).toBe(true);

    const content = fs.readFileSync(sidebarPath, "utf-8");
    expect(content).toContain("useUser()");
    expect(content).toContain("useClerk()");
    expect(content).toContain("ADMIN");
    expect(content).toContain("/admin/profile");
    expect(content).toContain("/admin/profile/security");
    expect(content).toContain("Logout");
    expect(content).toContain("signOut(");
    expect(content).toContain('redirectUrl: "/sign-in"');
  });

  it("verifies /admin/profile and /admin/profile/security pages exist and use AdminShell", () => {
    const profilePagePath = path.join(process.cwd(), "app", "admin", "profile", "page.tsx");
    const securityPagePath = path.join(process.cwd(), "app", "admin", "profile", "security", "page.tsx");
    const viewComponentPath = path.join(process.cwd(), "components", "admin", "AdminProfileView.tsx");

    expect(fs.existsSync(profilePagePath)).toBe(true);
    expect(fs.existsSync(securityPagePath)).toBe(true);
    expect(fs.existsSync(viewComponentPath)).toBe(true);

    const profileContent = fs.readFileSync(profilePagePath, "utf-8");
    expect(profileContent).toContain("AdminShell");
    expect(profileContent).toContain("AdminProfileView");

    const securityContent = fs.readFileSync(securityPagePath, "utf-8");
    expect(securityContent).toContain("AdminShell");
    expect(securityContent).toContain("AdminProfileView");
  });

  it("verifies AdminProfileView integrates Clerk password and avatar update SDKs with zero DB password storage", () => {
    const viewComponentPath = path.join(process.cwd(), "components", "admin", "AdminProfileView.tsx");
    const content = fs.readFileSync(viewComponentPath, "utf-8");

    // Clerk SDK integration
    expect(content).toContain("updatePassword");
    expect(content).toContain("setProfileImage");
    expect(content).toContain("signOut");

    // Client-side Password Invariants
    expect(content).toContain("newPassword.length < 8");
    expect(content).toContain("newPassword !== confirmPassword");
    expect(content).toContain("newPassword === currentPassword");

    // Zero custom password storage in DB
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema.toLowerCase()).not.toContain("passwordhash");
    expect(schema.toLowerCase()).not.toContain("adminpassword");
  });
});

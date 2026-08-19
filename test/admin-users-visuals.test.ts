import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Users Visual & Interaction Suite", () => {
  const usersPagePath = path.join(process.cwd(), "app", "admin", "users", "page.tsx");
  const sidebarPath = path.join(process.cwd(), "components", "admin", "AdminSidebar.tsx");

  it("verifies Users is present in AdminSidebar navigation", () => {
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    expect(sidebarContent).toContain('href: "/admin/users"');
    expect(sidebarContent).toContain('label: "Users & Accounts"');
  });

  it("verifies dedicated users page uses AdminShell with activeRoute", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain('<AdminShell activeRoute="/admin/users">');
  });

  it("verifies server-side pagination, search, and filters are hooked", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("fetch(`/api/admin/users?${params.toString()}`)");
    expect(pageContent).toContain("statusFilter");
    expect(pageContent).toContain("roleFilter");
    expect(pageContent).toContain("debouncedSearch");
  });

  it("verifies on-demand slide-over inspector", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("fetch(`/api/admin/users/${userId}`)");
    expect(pageContent).toContain("inspectorData");
    expect(pageContent).toContain("Credit Ledger Audit Trail");
    expect(pageContent).toContain("Recent Financial Invoices");
  });

  it("verifies Adjust Credits modal requires explicit reason and displays before/after preview", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("isCreditModalOpen");
    expect(pageContent).toContain("Audit Reason (Required)");
    expect(pageContent).toContain("Projected Balance:");
    expect(pageContent).toContain('action: "credits"');
  });

  it("verifies Ban / Unban uses confirmation dialog", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("isBanModalOpen");
    expect(pageContent).toContain('action: "ban"');
    expect(pageContent).toContain("Confirm Ban");
  });

  it("verifies Delete action is permanently DISABLED in UI with safety notice", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("Delete is temporarily disabled pending financial audit-safety hardening.");
    expect(pageContent).toContain("disabled");
    // Ensure no client-side fetch calls method: "DELETE" on this page
    expect(pageContent).not.toContain('method: "DELETE"');
  });

  it("verifies Zero Credit Rollover invariant note is clearly displayed", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).toContain("Zero Rollover Policy:");
    expect(pageContent).toContain("Unused credits expire automatically at the end of the 30-day cycle.");
  });

  it("verifies no inline +/-100 quick credit inputs exist on table rows", () => {
    const pageContent = fs.readFileSync(usersPagePath, "utf-8");
    expect(pageContent).not.toContain('placeholder="±100"');
    expect(pageContent).not.toContain("+ Apply");
  });
});

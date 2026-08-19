import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Subscriber Analytics Visual & Information Architecture Suite", () => {
  const pagePath = path.join(process.cwd(), "app", "admin", "subscriber-analytics", "page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  it("verifies full-width Enterprise Workspace inside AdminShell", () => {
    expect(content).toContain("<AdminShell");
    expect(content).toContain("flex-1 w-full min-w-0");
    // Must NOT have centered restricted max-w containers at the page root
    expect(content).not.toContain("max-w-7xl mx-auto");
    expect(content).not.toContain("max-w-6xl mx-auto");
    expect(content).not.toContain("max-w-5xl mx-auto");
  });

  it("verifies page is strictly read-only analytical intelligence with zero user management mutations", () => {
    expect(content).not.toContain("Adjust Credits");
    expect(content).not.toContain("Ban User");
    expect(content).not.toContain("Delete User");
    expect(content).not.toContain("Change Subscription");
    expect(content).not.toContain("Approve Payment");
    expect(content).toContain("/admin/users");
  });

  it("verifies all visual levels are present in the layout", () => {
    // LEVEL 1: Header
    expect(content).toContain("Subscriber Analytics");
    expect(content).toContain("Commercial Accounts Only");

    // LEVEL 2: Commercial Snapshot
    expect(content).toContain("Commercial Subs");
    expect(content).toContain("Annual Subscribers");
    expect(content).toContain("Subscription Cash");

    // LEVEL 3: Credit Flow & Zero Rollover
    expect(content).toContain("Credit Flow & Allocation");
    expect(content).toContain("Zero Credit Rollover Invariant");

    // LEVEL 4: Annual Advance Exposure
    expect(content).toContain("Annual Credit Advance Exposure");
    expect(content).toContain("Total Outstanding Debt");

    // LEVEL 5: Provider Cost & Heuristic Label
    expect(content).toContain("Operating Provider Expenditure");
    expect(content).toContain("Heuristic Unit Economics (Non-Auditable)");

    // LEVEL 6: Plan Distribution
    expect(content).toContain("Plan & Billing Split");

    // LEVEL 7: Cost Coverage
    expect(content).toContain("Data Integrity & System Cleanliness");

    // LEVEL 8: Analytical Matrix
    expect(content).toContain("Subscriber Intelligence Matrix");
  });

  it("verifies absence of fake zeros during loading state", () => {
    expect(content).toContain('loading ? "—" :');
  });

  it("verifies zero email-specific hardcoded overrides exist", () => {
    expect(content).not.toContain("isOmar");
    expect(content).not.toContain("omarworkimn@gmail.com");
    expect(content).not.toContain("sfa770441@gmail.com");
  });
});

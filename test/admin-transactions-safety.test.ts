import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV_CONFIG } from "@/components/admin/AdminSidebar";

describe("Admin Transactions & Payment Approval Safety Hardening", () => {
  const transactionsPagePath = path.join(process.cwd(), "app", "admin", "transactions", "page.tsx");
  const approvalRoutePath = path.join(process.cwd(), "app", "api", "admin", "transactions", "[id]", "route.ts");

  it("verifies Transactions navigation entry exists in ADMIN_NAV_CONFIG", () => {
    const txItem = ADMIN_NAV_CONFIG.flatMap((g) => g.items).find((i) => i.href === "/admin/transactions");
    expect(txItem).toBeDefined();
    expect(txItem?.label).toContain("Transactions");
  });

  it("verifies dedicated transactions page exists and uses AdminShell", () => {
    expect(fs.existsSync(transactionsPagePath)).toBe(true);
    const content = fs.readFileSync(transactionsPagePath, "utf-8");
    expect(content).toContain("<AdminShell");
    expect(content).toContain('activeRoute="/admin/transactions"');
    expect(content).toContain("Confirm Manual Payment Approval");
    expect(content).toContain("Reject Payment Request");
    expect(content).toContain("Payment Proof Receipt");
  });

  it("verifies approval endpoint uses atomic Compare-And-Swap (CAS) claim", () => {
    const content = fs.readFileSync(approvalRoutePath, "utf-8");
    expect(content).toContain("updateMany");
    expect(content).toContain('where: { id, paymentStatus: "PENDING" }');
    expect(content).toContain('paymentStatus: "COMPLETED"');
    expect(content).toContain("claim.count === 0");
  });

  it("verifies approval endpoint wraps financial mutations inside a single prismadb.$transaction", () => {
    const content = fs.readFileSync(approvalRoutePath, "utf-8");
    expect(content).toContain("await prismadb.$transaction(async (tx) =>");
    expect(content).toContain("tx.user.update");
    expect(content).toContain("tx.userSubscription.upsert");
    expect(content).toContain("tryCreateCreditLedgerEntry(tx");
  });

  it("verifies approval email dispatch happens strictly post-commit and does not duplicate financial mutation", () => {
    const content = fs.readFileSync(approvalRoutePath, "utf-8");
    // Verify email invocation is strictly outside and after the transaction block
    const txIndex = content.indexOf("await prismadb.$transaction(async (tx) =>");
    const emailCallIndex = content.indexOf("await sendApprovalEmail(");
    expect(txIndex).toBeGreaterThan(0);
    expect(emailCallIndex).toBeGreaterThan(txIndex);
    expect(content).toContain("approval email error (post-commit):");
  });

  it("verifies reject flow only updates status to FAILED without altering credits or subscriptions", () => {
    const content = fs.readFileSync(approvalRoutePath, "utf-8");
    expect(content).toContain('paymentStatus: "FAILED"');
    // Ensure reject section does not call user.update or userSubscription.upsert
    const failedSection = content.slice(content.indexOf('nextStatus === "FAILED"'));
    expect(failedSection).not.toContain("tx.user.update");
    expect(failedSection).not.toContain("tx.userSubscription");
    expect(failedSection).not.toContain("creditBalance");
  });

  it("verifies annual credit advance reset behavior is preserved on subscription approval", () => {
    const content = fs.readFileSync(approvalRoutePath, "utf-8");
    expect(content).toContain("creditAdvanceBalance: 0");
    expect(content).toContain("creditAdvanceRequestedAt: null");
    expect(content).toContain("creditAdvanceCycleEnd: null");
  });
});

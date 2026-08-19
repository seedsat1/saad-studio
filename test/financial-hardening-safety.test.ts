import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Financial P0 Hardening Safety Suite", () => {
  const usersRoutePath = path.join(process.cwd(), "app", "api", "admin", "users", "[userId]", "route.ts");
  const creditLedgerPath = path.join(process.cwd(), "lib", "credit-ledger.ts");
  const subscriberAnalyticsDetailRoutePath = path.join(
    process.cwd(),
    "app",
    "api",
    "admin",
    "subscriber-analytics",
    "[userId]",
    "route.ts"
  );

  describe("Task 1 & 2: Admin Manual Credit Adjustment", () => {
    const routeContent = fs.readFileSync(usersRoutePath, "utf-8");

    it("verifies explicit reason validation with minimum length", () => {
      expect(routeContent).toContain("trimmedReason.length < 3");
      expect(routeContent).toContain("A clear reason (at least 3 characters) is required");
    });

    it("verifies amount must be a non-zero finite integer", () => {
      expect(routeContent).toContain("Number.isFinite(amount)");
      expect(routeContent).toContain("parsedAmount === 0");
      expect(routeContent).toContain("Amount must be a non-zero integer");
    });

    it("verifies negative balance floor protection prevents balance from going negative", () => {
      expect(routeContent).toContain("creditBalance: { gte: absAmount }");
      expect(routeContent).toContain("creditBalance: { decrement: absAmount }");
      expect(routeContent).toContain("updateCount.count === 0");
      expect(routeContent).toContain("Insufficient balance");
    });

    it("verifies atomic transaction wraps balance update and ledger entry", () => {
      expect(routeContent).toContain("await prismadb.$transaction(async (tx) =>");
      expect(routeContent).toContain("tryCreateCreditLedgerEntry(tx");
      expect(routeContent).toContain("admin_credit_adjustment:");
    });

    it("verifies admin identity is recorded in ledger reason", () => {
      expect(routeContent).toContain("const { userId: adminUserId } = await auth();");
      expect(routeContent).toContain("adminUserId ? ` by ${adminUserId}` : \" by admin\"");
    });
  });

  describe("Task 3 & 4: Annual Credit Advance Atomic CAS & Ledger", () => {
    const ledgerContent = fs.readFileSync(creditLedgerPath, "utf-8");

    it("verifies annual advance is wrapped inside prismadb.$transaction", () => {
      const advanceFunction = ledgerContent.slice(ledgerContent.indexOf("export async function requestAnnualCreditAdvance"));
      expect(advanceFunction).toContain("return await prismadb.$transaction(async (tx) =>");
    });

    it("verifies atomic CAS update claim prevents concurrent double advance draws", () => {
      const advanceFunction = ledgerContent.slice(ledgerContent.indexOf("export async function requestAnnualCreditAdvance"));
      expect(advanceFunction).toContain("await tx.user.updateMany(");
      expect(advanceFunction).toContain("creditAdvanceCycleEnd: { not: user.creditsExpireAt }");
      expect(advanceFunction).toContain("if (updateClaim.count === 0)");
      expect(advanceFunction).toContain('throw new CreditAdvanceError("already_requested_this_cycle"');
    });

    it("verifies advance draw creates ledger entry with reason annual_credit_advance_draw", () => {
      const advanceFunction = ledgerContent.slice(ledgerContent.indexOf("export async function requestAnnualCreditAdvance"));
      expect(advanceFunction).toContain("tryCreateCreditLedgerEntry(tx, {");
      expect(advanceFunction).toContain("annual_credit_advance_draw:");
    });
  });

  describe("Task 5, 6 & 7: Expiry Engine & Renewal Ledger Audit Trails", () => {
    const ledgerContent = fs.readFileSync(creditLedgerPath, "utf-8");

    it("verifies annual monthly renewal records ledger entry", () => {
      expect(ledgerContent).toContain('reason: "annual_monthly_renewal"');
    });

    it("verifies advance repayment records ledger entry without altering repayment arithmetic", () => {
      expect(ledgerContent).toContain('reason: "annual_advance_repayment"');
      expect(ledgerContent).toContain("delta: -advanceDeduction");
    });

    it("verifies monthly credits expiry records ledger entry when balance > 0", () => {
      expect(ledgerContent).toContain('reason: "monthly_credits_expired"');
      expect(ledgerContent).toContain("delta: -expiredCredits");
    });

    it("verifies allocation and topup functions write ledger proof", () => {
      expect(ledgerContent).toContain('reason: "subscription_grant"');
      expect(ledgerContent).toContain('reason: "topup_grant"');
    });
  });

  describe("Task 8: Hardcoded Credit Exception Removal", () => {
    it("verifies hardcoded omarworkimn exception is completely removed from subscriber analytics detail", () => {
      const analyticsContent = fs.readFileSync(subscriberAnalyticsDetailRoutePath, "utf-8");
      expect(analyticsContent).not.toContain("omarworkimn@gmail.com");
      expect(analyticsContent).not.toContain("isOmar ? 2700 : 0");
      expect(analyticsContent).toContain("const creditsGranted = txCredits;");
    });
  });
});

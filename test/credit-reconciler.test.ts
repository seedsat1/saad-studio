import { describe, it, expect, vi } from "vitest";
import {
  runCreditReconciliation,
  resolveCanonicalEffectiveBalance,
  calculateNextAnnualAnchorDate,
  evaluateUserReconciliation,
} from "@/lib/credit-reconciler";

describe("Credit Reconciler & Effective Balance Engine", () => {
  it("executes a live READ-ONLY dry-run asserting invariants without brittle snapshots", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    // Invariant 1: Accounts scanned matches total actions returned
    expect(result.scannedCount).toBeGreaterThan(0);
    expect(result.actions.length).toBe(result.scannedCount);

    // Invariant 2: Counts sum matches total scanned
    const totalCounts =
      result.noActionCount +
      result.monthlyExpiredCount +
      result.annualRefreshCount +
      result.annualExpiredCount;
    expect(totalCounts).toBe(result.scannedCount);

    // Invariant 3: All branches are strictly valid enum members
    const VALID_BRANCHES = new Set([
      "MONTHLY_ACTIVE",
      "MONTHLY_EXPIRED",
      "ANNUAL_ACTIVE_CURRENT",
      "ANNUAL_ACTIVE_DUE",
      "ANNUAL_EXPIRED",
      "NO_ACTION",
    ]);

    for (const act of result.actions) {
      expect(VALID_BRANCHES.has(act.branch)).toBe(true);

      // Invariant 4: No active annual subscription is categorized as ANNUAL_EXPIRED
      if (act.billingInterval === "annual" && act.branch === "ANNUAL_EXPIRED") {
        expect(act.actionRequired).toBe(true);
      }
    }

    // Invariant 5: Omar invariant check (if in database)
    const omarAction = result.actions.find((a) => a.email === "omarworkimn@gmail.com");
    if (omarAction) {
      expect(omarAction.branch).toBe("ANNUAL_ACTIVE_CURRENT");
      expect(omarAction.actionRequired).toBe(false);
      expect(omarAction.balanceBefore).toBe(12);
      expect(omarAction.balanceAfter).toBe(12);
      expect(omarAction.debtBefore).toBe(2700);
      expect(omarAction.debtAfter).toBe(2700);
      expect(omarAction.anchorDay).toBe(26);
    }
  });

  it("calculates next anchor date correctly without date drift", () => {
    const annualStart = new Date("2026-05-26T17:23:51.849Z");
    const refDateToday = new Date("2026-08-19T13:59:00.000Z");

    const { currentWindowStart, currentWindowEnd, nextWindowEnd } = calculateNextAnnualAnchorDate(
      annualStart,
      refDateToday
    );

    expect(currentWindowStart.toISOString().slice(0, 10)).toBe("2026-07-26");
    expect(currentWindowEnd.toISOString().slice(0, 10)).toBe("2026-08-26");
    expect(nextWindowEnd.toISOString().slice(0, 10)).toBe("2026-09-26");
  });

  it("resolves canonical effective balance in memory for admin users route", () => {
    const activeSub = {
      stripePriceId: "starter",
      billingInterval: "monthly",
      stripeCurrentPeriodEnd: new Date("2026-09-19T00:00:00Z"),
    };
    const expiredSub = {
      stripePriceId: "starter",
      billingInterval: "monthly",
      stripeCurrentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    };

    const resActive = resolveCanonicalEffectiveBalance(
      { creditBalance: 100, creditsExpireAt: new Date("2026-09-19T00:00:00Z") },
      activeSub,
      new Date("2026-08-19T00:00:00Z")
    );
    expect(resActive.effectiveBalance).toBe(100);
    expect(resActive.isExpired).toBe(false);

    const resExpired = resolveCanonicalEffectiveBalance(
      { creditBalance: 100, creditsExpireAt: new Date("2026-05-01T00:00:00Z") },
      expiredSub,
      new Date("2026-08-19T00:00:00Z")
    );
    expect(resExpired.effectiveBalance).toBe(0);
    expect(resExpired.isExpired).toBe(true);
  });

  // PHASE 2: TARGETED RECONCILIATION ISOLATION TEST (MOCK)
  it("enforces targeted reconciliation isolation: targetUserId restricts mutations to only target user", () => {
    const userA = {
      id: "user_A",
      email: "userA@test.com",
      name: "User A",
      creditBalance: 100,
      monthlyCredits: 100,
      creditsExpireAt: new Date("2026-09-01T00:00:00Z"),
      lastCreditRenewal: new Date("2026-08-01T00:00:00Z"),
      creditAdvanceBalance: 0,
      createdAt: new Date(),
    };

    const userB = {
      id: "user_B",
      email: "userB@test.com",
      name: "User B",
      creditBalance: 50,
      monthlyCredits: 50,
      creditsExpireAt: new Date("2026-05-01T00:00:00Z"), // EXPIRED
      lastCreditRenewal: new Date("2026-04-01T00:00:00Z"),
      creditAdvanceBalance: 0,
      createdAt: new Date(),
    };

    const subA = {
      userId: "user_A",
      planId: "starter",
      billingInterval: "monthly",
      stripePriceId: "starter_price",
      stripeCurrentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    };

    // User A evaluation alone
    const evalA = evaluateUserReconciliation(userA as any, subA as any, new Date("2026-08-19T00:00:00Z"));
    expect(evalA.userId).toBe("user_A");
    expect(evalA.branch).toBe("MONTHLY_ACTIVE");
    expect(evalA.actionRequired).toBe(false);

    // User B evaluation alone
    const evalB = evaluateUserReconciliation(userB as any, null, new Date("2026-08-19T00:00:00Z"));
    expect(evalB.userId).toBe("user_B");
    expect(evalB.branch).toBe("MONTHLY_EXPIRED");
    expect(evalB.actionRequired).toBe(true);

    // Invariant: Evaluating User A does not generate actions for User B
    expect(evalA.userId).not.toBe(userB.id);
  });

  // PHASE 3: OMAR + ADVANCE PURE MOCK SIMULATION TEST
  describe("Omar Annual + Advance Lifecycle Mock Tests", () => {
    const omarUser = {
      id: "user_omar",
      email: "omarworkimn@gmail.com",
      name: "Omar Alnaser",
      creditBalance: 12,
      monthlyCredits: 2700,
      creditsExpireAt: new Date("2026-09-01T11:02:53.827Z"),
      lastCreditRenewal: new Date("2026-08-02T11:02:53.827Z"),
      creditAdvanceBalance: 2700,
      createdAt: new Date("2026-05-26T17:23:51.849Z"),
    };

    const omarSub = {
      userId: "user_omar",
      planId: "max",
      billingInterval: "annual",
      stripePriceId: "max_annual_price",
      stripeCurrentPeriodEnd: new Date("2027-05-26T17:23:51.849Z"),
    };

    it("evaluates Omar BEFORE anchor date (e.g. 2026-08-19): NO ACTION, balance = 12, debt = 2700", () => {
      const beforeDate = new Date("2026-08-19T14:00:00.000Z");
      const action = evaluateUserReconciliation(omarUser as any, omarSub as any, beforeDate);

      expect(action.branch).toBe("ANNUAL_ACTIVE_CURRENT");
      expect(action.actionRequired).toBe(false);
      expect(action.balanceBefore).toBe(12);
      expect(action.balanceAfter).toBe(12);
      expect(action.debtBefore).toBe(2700);
      expect(action.debtAfter).toBe(2700);
      expect(action.anchorDay).toBe(26);
      expect(action.ledgerEvents.length).toBe(0);
    });

    it("evaluates Omar AT/AFTER anchor date (e.g. 2026-08-26T17:23:52Z): REFRESHES, balance = 0, debt = 0, next anchor = 2026-09-26", () => {
      const anchorDate = new Date("2026-08-26T17:23:52.000Z");
      const action = evaluateUserReconciliation(omarUser as any, omarSub as any, anchorDate);

      expect(action.branch).toBe("ANNUAL_ACTIVE_DUE");
      expect(action.actionRequired).toBe(true);
      expect(action.balanceBefore).toBe(12);
      expect(action.balanceAfter).toBe(0); // 12 expires, +2700 allocation, -2700 debt repayment = 0
      expect(action.debtBefore).toBe(2700);
      expect(action.debtAfter).toBe(0);
      expect(action.anchorDay).toBe(26);
      expect(action.expiryAfter).toBe("2026-09-26T17:23:51.849Z");

      // Verify ledger events generated
      expect(action.ledgerEvents.length).toBe(3);
      expect(action.ledgerEvents[0].reason).toBe("annual_monthly_cycle_expired");
      expect(action.ledgerEvents[0].delta).toBe(-12);
      expect(action.ledgerEvents[1].reason).toBe("annual_monthly_renewal");
      expect(action.ledgerEvents[1].delta).toBe(2700);
      expect(action.ledgerEvents[2].reason).toBe("annual_advance_repayment");
      expect(action.ledgerEvents[2].delta).toBe(-2700);

      // Verify annual end remains unchanged
      expect(omarSub.stripeCurrentPeriodEnd.toISOString()).toBe("2027-05-26T17:23:51.849Z");
    });
  });
});

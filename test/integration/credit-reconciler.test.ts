import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCreditReconciliation } from "@/lib/credit-reconciler";

import { disconnectTestPrisma, fixtureId, resetDatabase, testPrisma } from "./database";

/**
 * The end-to-end half of the reconciler: that it reads every account from the
 * database, classifies each into exactly one branch, and reports counts that
 * add up. The branch arithmetic itself is covered in-memory by
 * test/credit-reconciler.test.ts, which needs no database.
 *
 * This used to run against whatever was in production. That made the result
 * depend on who happened to be signed up — it asserted `scannedCount > 0` and
 * the last run returned 0 — and it carried an assertion keyed to one named
 * customer's email address. It now seeds the accounts it reasons about, so it
 * proves the classification rather than the contents of the live system.
 *
 * Everything here runs with dryRun, and against the local test database, so no
 * balance is ever modified.
 */
describe("credit reconciliation over a populated database", () => {
  const monthlyActive = fixtureId("user");
  const monthlyExpired = fixtureId("user");
  const annualCurrent = fixtureId("user");
  const noSubscription = fixtureId("user");

  const DAY = 24 * 60 * 60 * 1000;

  beforeAll(async () => {
    await resetDatabase();
    const prisma = testPrisma();
    const now = Date.now();

    await prisma.user.createMany({
      data: [
        {
          id: monthlyActive,
          email: `${monthlyActive}@example.test`,
          creditBalance: 300,
          monthlyCredits: 800,
          creditsExpireAt: new Date(now + 20 * DAY),
          lastCreditRenewal: new Date(now - 10 * DAY),
        },
        {
          id: monthlyExpired,
          email: `${monthlyExpired}@example.test`,
          creditBalance: 40,
          monthlyCredits: 800,
          // Already past its expiry, so the sweep must notice.
          creditsExpireAt: new Date(now - 3 * DAY),
          lastCreditRenewal: new Date(now - 33 * DAY),
        },
        {
          id: annualCurrent,
          email: `${annualCurrent}@example.test`,
          creditBalance: 1200,
          monthlyCredits: 2700,
          creditsExpireAt: new Date(now + 15 * DAY),
          lastCreditRenewal: new Date(now - 15 * DAY),
        },
        {
          id: noSubscription,
          email: `${noSubscription}@example.test`,
          creditBalance: 0,
          monthlyCredits: 0,
        },
      ],
    });

    await prisma.userSubscription.createMany({
      data: [
        {
          userId: monthlyActive,
          planId: "plus",
          billingInterval: "monthly",
          stripeCurrentPeriodEnd: new Date(now + 20 * DAY),
        },
        {
          userId: monthlyExpired,
          planId: "plus",
          billingInterval: "monthly",
          stripeCurrentPeriodEnd: new Date(now - 3 * DAY),
        },
        {
          userId: annualCurrent,
          planId: "max",
          billingInterval: "annual",
          stripeCurrentPeriodEnd: new Date(now + 300 * DAY),
        },
      ],
    });
  });

  afterAll(async () => {
    await resetDatabase();
    await disconnectTestPrisma();
  });

  const VALID_BRANCHES = new Set([
    "MONTHLY_ACTIVE",
    "MONTHLY_EXPIRED",
    "ANNUAL_ACTIVE_CURRENT",
    "ANNUAL_ACTIVE_DUE",
    "ANNUAL_EXPIRED",
    "NO_ACTION",
  ]);

  it("scans every account and returns one action per account", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    expect(result.scannedCount).toBe(4);
    expect(result.actions.length).toBe(result.scannedCount);
  });

  it("reports counts that add up to the number scanned", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    const total =
      result.noActionCount +
      result.monthlyExpiredCount +
      result.annualRefreshCount +
      result.annualExpiredCount;

    expect(total).toBe(result.scannedCount);
  });

  it("puts every account in exactly one known branch", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    for (const action of result.actions) {
      expect(VALID_BRANCHES.has(action.branch)).toBe(true);
    }
    // One action per seeded account, no duplicates.
    expect(new Set(result.actions.map((a) => a.email)).size).toBe(4);
  });

  it("flags an annual account classified as expired as needing action", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    for (const action of result.actions) {
      if (action.billingInterval === "annual" && action.branch === "ANNUAL_EXPIRED") {
        expect(action.actionRequired).toBe(true);
      }
    }
  });

  it("narrows the sweep to one account when given a target", async () => {
    const result = await runCreditReconciliation({ dryRun: true, targetUserId: monthlyActive });

    expect(result.scannedCount).toBe(1);
    expect(result.actions[0]?.email).toBe(`${monthlyActive}@example.test`);
  });

  it("changes no balance in dry-run mode", async () => {
    const prisma = testPrisma();
    const before = await prisma.user.findMany({
      select: { id: true, creditBalance: true, monthlyCredits: true },
      orderBy: { id: "asc" },
    });

    await runCreditReconciliation({ dryRun: true });

    const after = await prisma.user.findMany({
      select: { id: true, creditBalance: true, monthlyCredits: true },
      orderBy: { id: "asc" },
    });

    expect(after).toEqual(before);
  });
});

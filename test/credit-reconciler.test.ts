import { describe, it, expect } from "vitest";
import { runCreditReconciliation, resolveCanonicalEffectiveBalance, calculateNextAnnualAnchorDate } from "@/lib/credit-reconciler";

describe("Credit Reconciler & Effective Balance Engine", () => {
  it("executes a live READ-ONLY dry-run on current database records", async () => {
    const result = await runCreditReconciliation({ dryRun: true });

    console.log("EXACT_JSON_SUMMARY:" + JSON.stringify({
      scannedCount: result.scannedCount,
      monthlyExpiredCount: result.monthlyExpiredCount,
      annualRefreshCount: result.annualRefreshCount,
      annualExpiredCount: result.annualExpiredCount,
      noActionCount: result.noActionCount,
    }));

    console.log("\n=== DETAILED PROPOSED ACTIONS (DRY-RUN) ===");
    for (const act of result.actions) {
      if (act.actionRequired || act.branch.startsWith("ANNUAL")) {
        console.log({
          user: act.email,
          name: act.name,
          plan: act.planId,
          branch: act.branch,
          anchor: act.anchorDay,
          balanceBefore: act.balanceBefore,
          balanceAfter: act.balanceAfter,
          debtBefore: act.debtBefore,
          debtAfter: act.debtAfter,
          expiryBefore: act.expiryBefore,
          expiryAfter: act.expiryAfter,
          cycleId: act.cycleId,
          ledgerEvents: act.ledgerEvents,
        });
      }
    }

    expect(result.scannedCount).toBeGreaterThan(0);

    // Verify Omar specifically
    const omarAction = result.actions.find((a) => a.email === "omarworkimn@gmail.com");
    expect(omarAction).toBeDefined();
    expect(omarAction?.branch).toBe("ANNUAL_ACTIVE_CURRENT");
    expect(omarAction?.actionRequired).toBe(false);
    expect(omarAction?.balanceBefore).toBe(12);
    expect(omarAction?.balanceAfter).toBe(12);
    expect(omarAction?.debtBefore).toBe(2700);
    expect(omarAction?.debtAfter).toBe(2700);
    expect(omarAction?.anchorDay).toBe(26);

    // Verify Saad Design
    const saadAction = result.actions.find((a) => a.email === "seedsat@googlemail.com");
    expect(saadAction).toBeDefined();
    expect(saadAction?.branch).toBe("ANNUAL_ACTIVE_CURRENT");
    expect(saadAction?.balanceBefore).toBe(1725);
    expect(saadAction?.debtBefore).toBe(2700);

    // Verify seedsat2
    const seedsat2Action = result.actions.find((a) => a.email === "cookwife5@gmail.com");
    expect(seedsat2Action).toBeDefined();
    expect(seedsat2Action?.branch).toBe("ANNUAL_ACTIVE_DUE");
    expect(seedsat2Action?.balanceAfter).toBe(1200);

    // Verify Wathiq
    const wathiqAction = result.actions.find((a) => a.email === "wathiq.mohmed@gmail.com");
    expect(wathiqAction).toBeDefined();
    expect(wathiqAction?.branch).toBe("MONTHLY_EXPIRED");
    expect(wathiqAction?.balanceBefore).toBe(350);
    expect(wathiqAction?.balanceAfter).toBe(0);

    // Verify Ali Hatem
    const aliAction = result.actions.find((a) => a.email === "alihatemart1996@gmail.com");
    expect(aliAction).toBeDefined();
    expect(aliAction?.branch).toBe("MONTHLY_EXPIRED");
    expect(aliAction?.balanceBefore).toBe(41);
    expect(aliAction?.balanceAfter).toBe(0);
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
      stripeCurrentPeriodEnd: new Date("2026-06-29T00:00:00Z"),
    };

    // User with active sub and future expiry
    const userActive = {
      creditBalance: 300,
      creditsExpireAt: new Date("2026-09-19T00:00:00Z"),
      monthlyCredits: 300,
    };
    expect(resolveCanonicalEffectiveBalance(userActive, activeSub).effectiveBalance).toBe(300);

    // Wathiq-like user with expired sub and past expiry
    const userExpired = {
      creditBalance: 350,
      creditsExpireAt: new Date("2026-06-29T00:00:00Z"),
      monthlyCredits: 300,
    };
    expect(resolveCanonicalEffectiveBalance(userExpired, expiredSub).effectiveBalance).toBe(0);
  });
});

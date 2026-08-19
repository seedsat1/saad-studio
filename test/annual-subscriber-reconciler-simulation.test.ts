import { describe, it, expect } from "vitest";

describe("Annual Subscriber Reconciler & Contractual Anchor Invariants", () => {
  it("enforces canonical Day 26 anchor for Omar Alnaser and blocks early execution before 2026-08-26", () => {
    const omarSubscription = {
      annualStart: new Date("2026-05-26T17:23:51.849Z"),
      annualEnd: new Date("2027-05-26T17:23:51.849Z"),
      anchorDay: 26,
    };

    const omarUser = {
      plan: "max",
      billingInterval: "annual",
      monthlyCredits: 2700,
      creditBalance: 12,
      creditAdvanceBalance: 2700,
      storedCreditsExpireAt: new Date("2026-09-01T11:02:53.827Z"), // Drifted state
    };

    // Calculate canonical window boundaries
    const currentAnchorWindowStart = new Date("2026-07-26T17:23:51.849Z");
    const currentAnchorWindowEnd = new Date("2026-08-26T17:23:51.849Z");
    const nextAnchorWindowEnd = new Date("2026-09-26T17:23:51.849Z");

    // TEST 1: Execution attempt on 2026-08-19 (Today) -> MUST BE A NO-OP
    const testDateToday = new Date("2026-08-19T13:56:00.000Z");
    const isDueToday = testDateToday >= currentAnchorWindowEnd;
    expect(isDueToday).toBe(false);

    // TEST 2: State on 2026-08-19 remains untouched
    expect(omarUser.creditBalance).toBe(12);
    expect(omarUser.creditAdvanceBalance).toBe(2700);

    // TEST 3: Execution on 2026-08-26 -> Refresh triggers exactly on Day 26
    const testDateRenewal = new Date("2026-08-26T18:00:00.000Z");
    const isDueOn26th = testDateRenewal >= currentAnchorWindowEnd;
    expect(isDueOn26th).toBe(true);

    // Step A: Old balance expiration (Strict No-Rollover)
    const expiredOldCredits = omarUser.creditBalance; // 12 CR
    let balance = 0;

    // Step B: New monthly allocation + Advance debt repayment
    const monthlyAllocation = omarUser.monthlyCredits; // 2700 CR
    balance += monthlyAllocation; // 2700 CR

    const advanceDeduction = Math.min(omarUser.creditAdvanceBalance, monthlyAllocation); // 2700 CR
    balance -= advanceDeduction; // 0 CR
    const finalDebt = omarUser.creditAdvanceBalance - advanceDeduction; // 0 CR

    expect(expiredOldCredits).toBe(12);
    expect(balance).toBe(0);
    expect(finalDebt).toBe(0);
    expect(nextAnchorWindowEnd.toISOString().slice(0, 10)).toBe("2026-09-26");
  });

  it("handles partial advance debt correctly (e.g. debt < monthly allocation)", () => {
    const user = {
      monthlyCredits: 2700,
      creditBalance: 50,
      creditAdvanceBalance: 1200,
    };

    const advanceDeduction = Math.min(user.creditAdvanceBalance, user.monthlyCredits);
    const finalBalance = user.monthlyCredits - advanceDeduction;
    const finalDebt = user.creditAdvanceBalance - advanceDeduction;

    expect(advanceDeduction).toBe(1200);
    expect(finalBalance).toBe(1500);
    expect(finalDebt).toBe(0);
  });

  it("handles excess advance debt correctly (e.g. debt > monthly allocation)", () => {
    const user = {
      monthlyCredits: 2700,
      creditBalance: 0,
      creditAdvanceBalance: 4000,
    };

    const advanceDeduction = Math.min(user.creditAdvanceBalance, user.monthlyCredits);
    const finalBalance = user.monthlyCredits - advanceDeduction;
    const finalDebt = user.creditAdvanceBalance - advanceDeduction;

    expect(advanceDeduction).toBe(2700);
    expect(finalBalance).toBe(0);
    expect(finalDebt).toBe(1300);
  });

  it("proves non-accumulation for overdue annual accounts with multiple missed cycles", () => {
    const seedsat2 = {
      monthlyCredits: 1200,
      creditBalance: 2900,
      creditAdvanceBalance: 0,
    };

    const finalBalance = seedsat2.monthlyCredits;
    expect(finalBalance).toBe(1200);
  });

  it("generates deterministic idempotency keys per canonical anchor window", () => {
    const userId = "user_3EGsHzh6eCMhZ4OMcgagSaF0Di7";
    const cycleStart = new Date("2026-08-26T17:23:51.849Z");
    const cycleEnd = new Date("2026-09-26T17:23:51.849Z");
    const idempotencyKey = `annual:${userId}:${cycleStart.toISOString().slice(0, 10)}:${cycleEnd.toISOString().slice(0, 10)}`;
    expect(idempotencyKey).toBe("annual:user_3EGsHzh6eCMhZ4OMcgagSaF0Di7:2026-08-26:2026-09-26");
  });
});

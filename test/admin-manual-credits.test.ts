// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ user: {} as any, subscription: null as any, ledger: [] as any[], admin: true, failLedger: false }));
vi.mock("@/lib/is-admin", () => ({ isAdmin: async () => state.admin }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "admin-test" }),
  clerkClient: async () => ({ users: {} }),
}));
vi.mock("@/lib/prismadb", () => {
  const db: any = {
    user: {
      findUnique: async () => ({ ...state.user }),
      findMany: async () => [{ ...state.user }],
      update: async ({ data }: any) => {
        for (const [key, value] of Object.entries(data)) {
          if (key === "creditBalance" && typeof value === "object" && value !== null) {
            state.user[key] += (value as any).increment ?? -(value as any).decrement;
          } else state.user[key] = value;
        }
        return { ...state.user };
      },
      updateMany: async ({ where, data }: any) => {
        if (state.user.creditBalance < where.creditBalance.gte) return { count: 0 };
        await db.user.update({ data });
        return { count: 1 };
      },
    },
    userSubscription: { findMany: async () => state.subscription ? [state.subscription] : [] },
    creditLedgerEntry: { create: async ({ data }: any) => {
      if (state.failLedger) throw new Error("Ledger unavailable");
      state.ledger.push(data);
      return data;
    } },
    $transaction: async (fn: any) => {
      const before = { ...state.user };
      const length = state.ledger.length;
      try { return await fn(db); } catch (error) {
        state.user = before;
        state.ledger.length = length;
        throw error;
      }
    },
  };
  return { default: db };
});

import { PATCH } from "@/app/api/admin/users/[userId]/route";
import { handleCreditExpiry } from "@/lib/credit-ledger";
import { resolveCanonicalEffectiveBalance } from "@/lib/credit-reconciler";

const now = new Date("2026-09-18T12:00:00Z");
const future = new Date("2026-10-01T12:00:00Z");
const past = new Date("2026-09-17T12:00:00Z");
async function adjust(amount = 100, reason = "Manual support grant") {
  return PATCH(new NextRequest("http://localhost/api/admin/users/user-test", {
    method: "PATCH", body: JSON.stringify({ action: "credits", amount, reason }),
  }), { params: { userId: "user-test" } });
}

describe("manual credits survive expiry reconciliation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    state.admin = true;
    state.failLedger = false;
    state.ledger = [];
    state.subscription = null;
    state.user = {
      id: "user-test", email: "test@example.test", name: "Test", creditBalance: 0,
      monthlyCredits: 0, creditsExpireAt: past, lastCreditRenewal: null,
      creditAdvanceBalance: 0, createdAt: new Date("2026-04-01T00:00:00Z"),
    };
  });
  afterEach(() => vi.useRealTimers());

  it.each([null, "monthly", "annual"])("grants usable credits after an expired %s cycle", async (interval) => {
    state.user.creditBalance = 25;
    if (interval) {
      state.user.monthlyCredits = 1200;
      state.subscription = { userId: "user-test", billingInterval: interval, planId: "pro", stripePriceId: "price-test", stripeCurrentPeriodEnd: past };
    }
    expect((await adjust()).status).toBe(200);
    expect(state.user.creditBalance).toBe(100); // Old 25 credits must not be revived.
    expect(state.user.creditsExpireAt).toEqual(new Date("2026-10-18T12:00:00Z"));
    expect(state.user.monthlyCredits).toBe(0);
    expect(state.ledger.map((entry) => entry.delta)).toEqual([-25, 100]);
    await handleCreditExpiry("user-test");
    await handleCreditExpiry("user-test");
    expect(state.user.creditBalance).toBe(100);
    expect(resolveCanonicalEffectiveBalance(state.user, state.subscription, now).effectiveBalance).toBe(100);
    expect(state.ledger).toHaveLength(2);
    vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
    await handleCreditExpiry("user-test");
    expect(state.user.creditBalance).toBe(0);
  });

  it.each([null, "monthly", "annual"])("preserves the expiry and allocation of an active %s cycle", async (interval) => {
    state.user.creditBalance = 40;
    state.user.creditsExpireAt = future;
    state.user.lastCreditRenewal = now;
    if (interval) {
      state.user.monthlyCredits = 1200;
      state.subscription = { userId: "user-test", billingInterval: interval, planId: "pro", stripePriceId: "price-test", stripeCurrentPeriodEnd: new Date("2027-09-18T12:00:00Z") };
    }
    expect((await adjust()).status).toBe(200);
    expect(state.user.creditBalance).toBe(140);
    expect(state.user.creditsExpireAt).toEqual(future);
    expect(state.user.monthlyCredits).toBe(interval ? 1200 : 0);
    await handleCreditExpiry("user-test");
    expect(state.user.creditBalance).toBe(140);
  });

  it("opens the existing 30-day policy for an account without a cycle", async () => {
    state.user.creditsExpireAt = null;
    expect((await adjust()).status).toBe(200);
    expect(state.user.creditsExpireAt).toEqual(new Date("2026-10-18T12:00:00Z"));
    expect(state.ledger[0].reason).toContain("by admin-test");
  });

  it("keeps deduction protection and does not renew expiry on deductions", async () => {
    state.user.creditBalance = 40;
    state.user.creditsExpireAt = future;
    expect((await adjust(-10)).status).toBe(200);
    expect(state.user.creditBalance).toBe(30);
    expect(state.user.creditsExpireAt).toEqual(future);
    expect((await adjust(-31)).status).toBe(400);
    expect(state.user.creditBalance).toBe(30);
  });

  it("rolls back the grant if its audit entry fails", async () => {
    state.user.creditsExpireAt = null;
    state.failLedger = true;
    expect((await adjust()).status).toBe(500);
    expect(state.user.creditBalance).toBe(0);
    expect(state.user.creditsExpireAt).toBeNull();
  });

  it("rejects unauthorized and invalid adjustments without mutations", async () => {
    state.admin = false;
    expect((await adjust()).status).toBe(401);
    state.admin = true;
    expect((await adjust(0)).status).toBe(400);
    expect((await adjust(100, "")).status).toBe(400);
    expect(state.user.creditBalance).toBe(0);
    expect(state.ledger).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  ONLINE_THRESHOLD_MS,
  resolvePresenceState,
  resolveUserStatusCategory,
  formatUserCompositeStatus,
  type UserStatusInput,
} from "@/lib/admin/user-status";

describe("Admin User Status & Presence Classification Suite", () => {
  const FIXED_NOW = 1771340000000; // deterministic timestamp

  describe("1. Presence Classification (Clerk lastActiveAt)", () => {
    it("classifies lastActiveAt = now - 1 minute as Online", () => {
      const lastActiveAt = FIXED_NOW - 1 * 60 * 1000;
      const presence = resolvePresenceState(lastActiveAt, FIXED_NOW);
      expect(presence).toBe("Online");
    });

    it("classifies lastActiveAt = now - 4m59s as Online", () => {
      const lastActiveAt = FIXED_NOW - (4 * 60 + 59) * 1000;
      const presence = resolvePresenceState(lastActiveAt, FIXED_NOW);
      expect(presence).toBe("Online");
    });

    it("classifies lastActiveAt = now - 5m00s (boundary) as Online", () => {
      const lastActiveAt = FIXED_NOW - ONLINE_THRESHOLD_MS;
      const presence = resolvePresenceState(lastActiveAt, FIXED_NOW);
      expect(presence).toBe("Online");
    });

    it("classifies lastActiveAt = now - 5m01s as Offline", () => {
      const lastActiveAt = FIXED_NOW - (5 * 60 + 1) * 1000;
      const presence = resolvePresenceState(lastActiveAt, FIXED_NOW);
      expect(presence).toBe("Offline");
    });

    it("classifies lastActiveAt = null as Offline", () => {
      const presence = resolvePresenceState(null, FIXED_NOW);
      expect(presence).toBe("Offline");
    });

    it("classifies lastActiveAt = undefined as Offline", () => {
      const presence = resolvePresenceState(undefined, FIXED_NOW);
      expect(presence).toBe("Offline");
    });

    it("classifies Clerk lookup failure as Unknown", () => {
      const presence = resolvePresenceState(FIXED_NOW - 1000, FIXED_NOW, true);
      expect(presence).toBe("Unknown");
    });
  });

  describe("2. Status Classification & Precedence", () => {
    it("enforces Priority 1: Banned preempts active annual subscription", () => {
      const input: UserStatusInput = {
        isBanned: true,
        isSubscriber: true,
        billingInterval: "annual",
        planId: "max",
        stripeCurrentPeriodEnd: new Date(FIXED_NOW + 10000000),
        creditBalance: 2700,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Banned");
    });

    it("classifies active annual subscriber as Annual Active", () => {
      const input: UserStatusInput = {
        isBanned: false,
        isSubscriber: true,
        billingInterval: "annual",
        planId: "max",
        stripeCurrentPeriodEnd: new Date(FIXED_NOW + 10000000),
        creditBalance: 1725,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Annual Active");
    });

    it("classifies active monthly subscriber as Monthly Active", () => {
      const input: UserStatusInput = {
        isBanned: false,
        isSubscriber: true,
        billingInterval: "monthly",
        planId: "pro",
        stripeCurrentPeriodEnd: new Date(FIXED_NOW + 10000000),
        creditBalance: 500,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Monthly Active");
    });

    it("classifies non-active user with prior plan as Expired", () => {
      const input: UserStatusInput = {
        isBanned: false,
        isSubscriber: false,
        billingInterval: "monthly",
        planId: "pro",
        stripeCurrentPeriodEnd: new Date(FIXED_NOW - 10000000), // in the past
        creditBalance: 0,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Expired");
    });

    it("classifies free tier user with credits as Free + Credits", () => {
      const input: UserStatusInput = {
        isBanned: false,
        isSubscriber: false,
        billingInterval: null,
        planId: null,
        stripeCurrentPeriodEnd: null,
        creditBalance: 150,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Free + Credits");
    });

    it("classifies free tier user with 0 credits as Inactive", () => {
      const input: UserStatusInput = {
        isBanned: false,
        isSubscriber: false,
        billingInterval: null,
        planId: null,
        stripeCurrentPeriodEnd: null,
        creditBalance: 0,
      };
      const status = resolveUserStatusCategory(input, FIXED_NOW);
      expect(status).toBe("Inactive");
    });
  });

  describe("3. Composite Status String Formatting", () => {
    it("formats Annual Active with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Annual Active", "Online")).toBe("Annual Active (Online)");
      expect(formatUserCompositeStatus("Annual Active", "Offline")).toBe("Annual Active (Offline)");
    });

    it("formats Monthly Active with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Monthly Active", "Online")).toBe("Monthly Active (Online)");
      expect(formatUserCompositeStatus("Monthly Active", "Offline")).toBe("Monthly Active (Offline)");
    });

    it("formats Expired with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Expired", "Online")).toBe("Expired (Online)");
      expect(formatUserCompositeStatus("Expired", "Offline")).toBe("Expired (Offline)");
    });

    it("formats Free + Credits with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Free + Credits", "Online")).toBe("Free + Credits (Online)");
      expect(formatUserCompositeStatus("Free + Credits", "Offline")).toBe("Free + Credits (Offline)");
    });

    it("formats Inactive with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Inactive", "Online")).toBe("Inactive (Online)");
      expect(formatUserCompositeStatus("Inactive", "Offline")).toBe("Inactive (Offline)");
    });

    it("formats Banned with Online and Offline presence", () => {
      expect(formatUserCompositeStatus("Banned", "Online")).toBe("Banned (Online)");
      expect(formatUserCompositeStatus("Banned", "Offline")).toBe("Banned (Offline)");
    });
  });
});

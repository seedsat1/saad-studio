/**
 * Central User Status & Presence Classification
 * Single Source of Truth for /admin/users status & presence classification.
 *
 * PRECEDENCE:
 * 1. Banned (user.isBanned === true)
 * 2. Annual Active (isSubscriber && billingInterval === "annual")
 * 3. Monthly Active (isSubscriber && billingInterval !== "annual")
 * 4. Expired (!isSubscriber && planId !== null && planId !== "free")
 * 5. Free + Credits (!isSubscriber && effectiveSpendableBalance > 0)
 * 6. Inactive (!isSubscriber && effectiveSpendableBalance <= 0)
 *
 * PRESENCE (Clerk lastActiveAt):
 * - Online: lastActiveAt != null && (now - lastActiveAt <= 5 minutes)
 * - Offline: lastActiveAt == null || (now - lastActiveAt > 5 minutes)
 * - Unknown: Clerk lookup failure / service degradation
 */

export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export type PresenceState = "Online" | "Offline" | "Unknown";

export type UserStatusCategory =
  | "Banned"
  | "Annual Active"
  | "Monthly Active"
  | "Expired"
  | "Free + Credits"
  | "Inactive";

export interface UserStatusInput {
  isBanned: boolean;
  isSubscriber: boolean;
  billingInterval?: string | null;
  planId?: string | null;
  stripeCurrentPeriodEnd?: string | Date | null;
  creditBalance: number;
  creditsExpireAt?: string | Date | null;
}

/**
 * Resolves the presence state strictly based on Clerk lastActiveAt timestamp.
 */
export function resolvePresenceState(
  lastActiveAt: number | Date | null | undefined,
  nowMs: number = Date.now(),
  lookupFailed: boolean = false
): PresenceState {
  if (lookupFailed) return "Unknown";
  if (lastActiveAt == null) return "Offline";

  const lastActiveMs = typeof lastActiveAt === "number" ? lastActiveAt : new Date(lastActiveAt).getTime();
  if (isNaN(lastActiveMs) || lastActiveMs <= 0) return "Offline";

  return nowMs - lastActiveMs <= ONLINE_THRESHOLD_MS ? "Online" : "Offline";
}

/**
 * Resolves the primary subscription / account classification.
 */
export function resolveUserStatusCategory(
  input: UserStatusInput,
  nowMs: number = Date.now()
): UserStatusCategory {
  // 1. Priority 1: Banned (preempts any active subscription or credits)
  if (input.isBanned) {
    return "Banned";
  }

  // 2. Active Subscription check
  const hasActiveSub = Boolean(
    input.isSubscriber ||
    (input.stripeCurrentPeriodEnd && new Date(input.stripeCurrentPeriodEnd).getTime() > nowMs)
  );

  if (hasActiveSub) {
    const isAnnual = (input.billingInterval || "").toLowerCase() === "annual";
    return isAnnual ? "Annual Active" : "Monthly Active";
  }

  // 3. Expired Subscription (had a subscription plan before, but period ended)
  if (input.planId && input.planId.toLowerCase() !== "free" && input.planId.toLowerCase() !== "none") {
    return "Expired";
  }

  // 4. Free Tier with spendable credits
  if (input.creditBalance > 0) {
    return "Free + Credits";
  }

  // 5. Inactive (Free Tier with 0 or negative balance)
  return "Inactive";
}

/**
 * Formats the composite string: `${status} (${presence})`
 * e.g., "Annual Active (Online)", "Free + Credits (Offline)"
 */
export function formatUserCompositeStatus(
  status: UserStatusCategory,
  presence: PresenceState
): string {
  return `${status} (${presence})`;
}

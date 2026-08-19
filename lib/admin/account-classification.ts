/**
 * Central Account Classification & Commercial Analytics Isolation
 * Single Source of Truth for platform account classification.
 *
 * COMMERCIAL INVARIANT:
 * Non-commercial accounts (Owner test, Admin, and Legacy test accounts)
 * must NEVER contaminate commercial revenue, paying subscriber counts,
 * cash receipts, or customer profitability metrics.
 */

export const OWNER_TEST_ACCOUNTS: readonly string[] = [
  "seedsat81@gmail.com",
  "seedsat@gmail.com",
  "cookwife5@gmail.com",
] as const;

export const ADMIN_ACCOUNTS: readonly string[] = [
  "seedsat2@gmail.com",
] as const;

export const LEGACY_TEST_ACCOUNTS: readonly string[] = [
  "seedsat@googlemail.com",
] as const;

/**
 * All non-commercial emails that must be excluded from commercial metrics,
 * revenue calculations, subscriber counts, and margin heuristics.
 */
export const EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS: readonly string[] = [
  ...OWNER_TEST_ACCOUNTS,
  ...ADMIN_ACCOUNTS,
  ...LEGACY_TEST_ACCOUNTS,
] as const;

/**
 * Returns true if the email belongs to a genuine paying commercial customer.
 */
export function isCommercialCustomerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return !EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS.some(
    (e) => e.toLowerCase() === normalized
  );
}

/**
 * Returns true if the email belongs to an owner test, admin, or legacy test account.
 */
export function isExcludedFromCommercialAnalytics(email: string | null | undefined): boolean {
  return !isCommercialCustomerEmail(email);
}

import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";

export type ReconcileBranch =
  | "NO_ACTION"
  | "MONTHLY_ACTIVE"
  | "MONTHLY_EXPIRED"
  | "ANNUAL_ACTIVE_CURRENT"
  | "ANNUAL_ACTIVE_DUE"
  | "ANNUAL_EXPIRED";

export type ReconcileLedgerEvent = {
  delta: number;
  reason: string;
  cycleId: string;
  metadata?: Record<string, unknown>;
};

export type ProposedUserAction = {
  userId: string;
  email: string | null;
  name: string | null;
  planId: string | null;
  billingInterval: "monthly" | "annual" | null;
  branch: ReconcileBranch;
  anchorDay: number | null;
  balanceBefore: number;
  balanceAfter: number;
  debtBefore: number;
  debtAfter: number;
  expiryBefore: string | null;
  expiryAfter: string | null;
  renewalBefore: string | null;
  renewalAfter: string | null;
  ledgerEvents: ReconcileLedgerEvent[];
  cycleId: string;
  driftDetected: boolean;
  actionRequired: boolean;
};

export type ReconcileResult = {
  scannedCount: number;
  monthlyExpiredCount: number;
  annualRefreshCount: number;
  annualExpiredCount: number;
  noActionCount: number;
  actions: ProposedUserAction[];
};

/**
 * Calculates the next anchor date given an original start date anchor and current reference date.
 * Guarantees that billing anchors (e.g. Day 26 of every month) do not drift across cron executions.
 */
export function calculateNextAnnualAnchorDate(
  annualStartDate: Date,
  currentReferenceDate: Date
): { currentWindowStart: Date; currentWindowEnd: Date; nextWindowEnd: Date } {
  const startDay = annualStartDate.getUTCDate();
  const refYear = currentReferenceDate.getUTCFullYear();
  const refMonth = currentReferenceDate.getUTCMonth();

  // Construct target candidate in current reference month
  const lastDayOfRefMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(startDay, lastDayOfRefMonth);
  const anchorInRefMonth = new Date(Date.UTC(
    refYear,
    refMonth,
    clampedDay,
    annualStartDate.getUTCHours(),
    annualStartDate.getUTCMinutes(),
    annualStartDate.getUTCSeconds(),
    annualStartDate.getUTCMilliseconds()
  ));

  let currentWindowStart: Date;
  let currentWindowEnd: Date;
  let nextWindowEnd: Date;

  if (currentReferenceDate.getTime() < anchorInRefMonth.getTime()) {
    // Current date is before anchor in this month -> current window ends on anchorInRefMonth
    currentWindowEnd = anchorInRefMonth;
    const prevYear = refMonth === 0 ? refYear - 1 : refYear;
    const prevMonth = refMonth === 0 ? 11 : refMonth - 1;
    const lastDayOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate();
    const clampedPrevDay = Math.min(startDay, lastDayOfPrevMonth);
    currentWindowStart = new Date(Date.UTC(
      prevYear,
      prevMonth,
      clampedPrevDay,
      annualStartDate.getUTCHours(),
      annualStartDate.getUTCMinutes(),
      annualStartDate.getUTCSeconds(),
      annualStartDate.getUTCMilliseconds()
    ));

    const nextYear = refMonth === 11 ? refYear + 1 : refYear;
    const nextMonth = refMonth === 11 ? 0 : refMonth + 1;
    const lastDayOfNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
    const clampedNextDay = Math.min(startDay, lastDayOfNextMonth);
    nextWindowEnd = new Date(Date.UTC(
      nextYear,
      nextMonth,
      clampedNextDay,
      annualStartDate.getUTCHours(),
      annualStartDate.getUTCMinutes(),
      annualStartDate.getUTCSeconds(),
      annualStartDate.getUTCMilliseconds()
    ));
  } else {
    // Current date is on or after anchor in this month -> current window started on anchorInRefMonth
    currentWindowStart = anchorInRefMonth;
    const nextYear = refMonth === 11 ? refYear + 1 : refYear;
    const nextMonth = refMonth === 11 ? 0 : refMonth + 1;
    const lastDayOfNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
    const clampedNextDay = Math.min(startDay, lastDayOfNextMonth);
    currentWindowEnd = new Date(Date.UTC(
      nextYear,
      nextMonth,
      clampedNextDay,
      annualStartDate.getUTCHours(),
      annualStartDate.getUTCMinutes(),
      annualStartDate.getUTCSeconds(),
      annualStartDate.getUTCMilliseconds()
    ));

    const afterNextYear = nextMonth === 11 ? nextYear + 1 : nextYear;
    const afterNextMonth = nextMonth === 11 ? 0 : nextMonth + 1;
    const lastDayOfAfterNextMonth = new Date(Date.UTC(afterNextYear, afterNextMonth + 1, 0)).getUTCDate();
    const clampedAfterNextDay = Math.min(startDay, lastDayOfAfterNextMonth);
    nextWindowEnd = new Date(Date.UTC(
      afterNextYear,
      afterNextMonth,
      clampedAfterNextDay,
      annualStartDate.getUTCHours(),
      annualStartDate.getUTCMinutes(),
      annualStartDate.getUTCSeconds(),
      annualStartDate.getUTCMilliseconds()
    ));
  }

  return { currentWindowStart, currentWindowEnd, nextWindowEnd };
}

/**
 * Resolves the canonical effective balance for a user in memory at read time.
 * Shared across Admin User listings, profile, and spend pre-checks.
 */
export function resolveCanonicalEffectiveBalance(
  user: {
    creditBalance: number;
    creditsExpireAt?: Date | null;
    monthlyCredits?: number | null;
    creditAdvanceBalance?: number | null;
  },
  subscription?: {
    billingInterval?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
    stripePriceId?: string | null;
  } | null,
  now = new Date()
): {
  effectiveBalance: number;
  isExpired: boolean;
  isAnnualActive: boolean;
  status: "ACTIVE" | "EXPIRED" | "NONE";
} {
  const isAnnual = subscription?.billingInterval === "annual";
  const hasSubPrice = Boolean(subscription?.stripePriceId);
  const periodEnd = subscription?.stripeCurrentPeriodEnd ? new Date(subscription.stripeCurrentPeriodEnd) : null;
  const isTermActive = Boolean(hasSubPrice && periodEnd && periodEnd.getTime() > now.getTime());

  if (isAnnual && isTermActive) {
    return {
      effectiveBalance: user.creditBalance,
      isExpired: false,
      isAnnualActive: true,
      status: "ACTIVE",
    };
  }

  const creditsExpireAt = user.creditsExpireAt ? new Date(user.creditsExpireAt) : null;
  const isWindowExpired = Boolean(creditsExpireAt && creditsExpireAt.getTime() <= now.getTime());

  if (isWindowExpired || (!isTermActive && (user.monthlyCredits ?? 0) > 0)) {
    return {
      effectiveBalance: 0,
      isExpired: true,
      isAnnualActive: false,
      status: isTermActive ? "ACTIVE" : "EXPIRED",
    };
  }

  return {
    effectiveBalance: user.creditBalance,
    isExpired: false,
    isAnnualActive: false,
    status: isTermActive ? "ACTIVE" : "NONE",
  };
}

/**
 * Evaluates a single user record against the canonical Saad Studio 4-branch reconciliation matrix.
 */
export function evaluateUserReconciliation(
  user: {
    id: string;
    email: string | null;
    name: string | null;
    creditBalance: number;
    monthlyCredits: number;
    creditsExpireAt: Date | null;
    lastCreditRenewal: Date | null;
    creditAdvanceBalance: number;
    createdAt: Date;
  },
  subscription: {
    planId: string | null;
    billingInterval: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
  } | null,
  now = new Date()
): ProposedUserAction {
  const isAnnual = subscription?.billingInterval === "annual";
  const hasSubPrice = Boolean(subscription?.stripePriceId);
  const periodEnd = subscription?.stripeCurrentPeriodEnd ? new Date(subscription.stripeCurrentPeriodEnd) : null;
  const isTermActive = Boolean(hasSubPrice && periodEnd && periodEnd.getTime() > now.getTime());
  const storedCreditsExpireAt = user.creditsExpireAt ? new Date(user.creditsExpireAt) : null;
  const balanceBefore = Number(user.creditBalance ?? 0);
  const debtBefore = Math.max(0, Math.floor(Number(user.creditAdvanceBalance ?? 0)));

  // ──────────────────────────────────────────────────────────────────────────
  // BRANCH C & D: ANNUAL SUBSCRIPTIONS
  // ──────────────────────────────────────────────────────────────────────────
  if (isAnnual) {
    if (isTermActive && periodEnd) {
      // Annual Subscription is ACTIVE.
      // Derives canonical anchor from annual subscription period end minus 1 year (or creation).
      const annualStartDate = new Date(periodEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
      const anchorDay = annualStartDate.getUTCDate();
      const { currentWindowStart, currentWindowEnd, nextWindowEnd } = calculateNextAnnualAnchorDate(
        annualStartDate,
        now
      );

      // Check drift: does stored creditsExpireAt mismatch the current anchor window?
      const driftDetected = Boolean(
        storedCreditsExpireAt &&
        Math.abs(storedCreditsExpireAt.getTime() - currentWindowEnd.getTime()) > 36 * 60 * 60 * 1000
      );

      // Determine if a monthly refresh is due:
      // A refresh is due if current time is on or past currentWindowEnd OR storedCreditsExpireAt is past
      const isWindowOverdue = Boolean(
        (storedCreditsExpireAt && storedCreditsExpireAt.getTime() <= now.getTime()) ||
        now.getTime() >= currentWindowEnd.getTime()
      );

      if (!isWindowOverdue) {
        // CASE: Annual active, in middle of current month (e.g. Omar before Aug 26)
        const cycleId = `annual:${user.id}:${currentWindowStart.toISOString().slice(0, 10)}:${currentWindowEnd.toISOString().slice(0, 10)}`;
        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          planId: subscription?.planId ?? "max",
          billingInterval: "annual",
          branch: "ANNUAL_ACTIVE_CURRENT",
          anchorDay,
          balanceBefore,
          balanceAfter: balanceBefore,
          debtBefore,
          debtAfter: debtBefore,
          expiryBefore: storedCreditsExpireAt?.toISOString() ?? null,
          expiryAfter: storedCreditsExpireAt?.toISOString() ?? null,
          renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
          renewalAfter: user.lastCreditRenewal?.toISOString() ?? null,
          ledgerEvents: [],
          cycleId,
          driftDetected,
          actionRequired: false,
        };
      }

      // CASE: Annual active, DUE FOR MONTHLY REFRESH
      // Contractual allocation (respects legacy stored monthlyCredits if valid e.g. seedsat2=1200)
      const planConfig = SAAD_PLANS.find((p) => p.id === subscription?.planId);
      const monthlyAllocation = user.monthlyCredits > 0 ? user.monthlyCredits : (planConfig?.credits ?? 2700);

      // Triple-Event Accounting Calculation:
      const advanceDeduction = Math.min(debtBefore, monthlyAllocation);
      const balanceAfter = monthlyAllocation - advanceDeduction;
      const debtAfter = debtBefore - advanceDeduction;

      // Target cycle window to advance to
      const targetWindowEnd = now.getTime() >= currentWindowEnd.getTime() ? nextWindowEnd : currentWindowEnd;
      const targetWindowStart = currentWindowStart;
      const cycleId = `annual:${user.id}:${targetWindowStart.toISOString().slice(0, 10)}:${targetWindowEnd.toISOString().slice(0, 10)}`;

      const ledgerEvents: ReconcileLedgerEvent[] = [];
      if (balanceBefore > 0) {
        ledgerEvents.push({
          delta: -balanceBefore,
          reason: "annual_monthly_cycle_expired",
          cycleId,
          metadata: { balanceBefore, balanceExpired: balanceBefore },
        });
      }
      ledgerEvents.push({
        delta: monthlyAllocation,
        reason: "annual_monthly_renewal",
        cycleId,
        metadata: { monthlyAllocation },
      });
      if (advanceDeduction > 0) {
        ledgerEvents.push({
          delta: -advanceDeduction,
          reason: "annual_advance_repayment",
          cycleId,
          metadata: { debtBefore, advanceDeduction, debtAfter },
        });
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        planId: subscription?.planId ?? "max",
        billingInterval: "annual",
        branch: "ANNUAL_ACTIVE_DUE",
        anchorDay,
        balanceBefore,
        balanceAfter,
        debtBefore,
        debtAfter,
        expiryBefore: storedCreditsExpireAt?.toISOString() ?? null,
        expiryAfter: targetWindowEnd.toISOString(),
        renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
        renewalAfter: now.toISOString(),
        ledgerEvents,
        cycleId,
        driftDetected,
        actionRequired: true,
      };
    } else {
      // BRANCH D: ANNUAL EXPIRED (Full 1-year term ended)
      const cycleId = `annual_expired:${user.id}:${periodEnd?.toISOString().slice(0, 10) ?? "unknown"}`;
      const actionRequired = balanceBefore > 0 || storedCreditsExpireAt !== null || (user.monthlyCredits ?? 0) > 0;
      const ledgerEvents: ReconcileLedgerEvent[] = [];

      if (balanceBefore > 0) {
        ledgerEvents.push({
          delta: -balanceBefore,
          reason: "annual_term_expired",
          cycleId,
          metadata: { balanceBefore },
        });
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        planId: subscription?.planId ?? null,
        billingInterval: "annual",
        branch: "ANNUAL_EXPIRED",
        anchorDay: null,
        balanceBefore,
        balanceAfter: 0,
        debtBefore,
        debtAfter: 0,
        expiryBefore: storedCreditsExpireAt?.toISOString() ?? null,
        expiryAfter: null,
        renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
        renewalAfter: null,
        ledgerEvents,
        cycleId,
        driftDetected: false,
        actionRequired,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BRANCH A & B: MONTHLY SUBSCRIPTIONS / FREE USERS
  // ──────────────────────────────────────────────────────────────────────────
  const isMonthlyActive = Boolean(isTermActive && subscription?.billingInterval === "monthly");
  const isMonthlyExpired = Boolean(
    !isMonthlyActive &&
    ((storedCreditsExpireAt && storedCreditsExpireAt.getTime() <= now.getTime()) ||
      (periodEnd && periodEnd.getTime() <= now.getTime()))
  );

  if (isMonthlyActive && storedCreditsExpireAt && storedCreditsExpireAt.getTime() > now.getTime()) {
    // BRANCH A: MONTHLY ACTIVE (Window still valid)
    const cycleId = `monthly:${user.id}:${storedCreditsExpireAt.toISOString().slice(0, 10)}`;
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      planId: subscription?.planId ?? null,
      billingInterval: "monthly",
      branch: "MONTHLY_ACTIVE",
      anchorDay: null,
      balanceBefore,
      balanceAfter: balanceBefore,
      debtBefore,
      debtAfter: debtBefore,
      expiryBefore: storedCreditsExpireAt.toISOString(),
      expiryAfter: storedCreditsExpireAt.toISOString(),
      renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
      renewalAfter: user.lastCreditRenewal?.toISOString() ?? null,
      ledgerEvents: [],
      cycleId,
      driftDetected: false,
      actionRequired: false,
    };
  }

  if (isMonthlyExpired || (storedCreditsExpireAt && storedCreditsExpireAt.getTime() <= now.getTime())) {
    // BRANCH B: MONTHLY EXPIRED
    const cycleId = `monthly_expired:${user.id}:${storedCreditsExpireAt?.toISOString().slice(0, 10) ?? "past"}`;
    const actionRequired = balanceBefore > 0 || storedCreditsExpireAt !== null || (user.monthlyCredits ?? 0) > 0;
    const ledgerEvents: ReconcileLedgerEvent[] = [];

    if (balanceBefore > 0) {
      ledgerEvents.push({
        delta: -balanceBefore,
        reason: "monthly_cycle_expired",
        cycleId,
        metadata: { balanceBefore },
      });
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      planId: subscription?.planId ?? null,
      billingInterval: "monthly",
      branch: "MONTHLY_EXPIRED",
      anchorDay: null,
      balanceBefore,
      balanceAfter: 0,
      debtBefore,
      debtAfter: 0,
      expiryBefore: storedCreditsExpireAt?.toISOString() ?? null,
      expiryAfter: null,
      renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
      renewalAfter: null,
      ledgerEvents,
      cycleId,
      driftDetected: false,
      actionRequired,
    };
  }

  // DEFAULT NO-ACTION
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    planId: subscription?.planId ?? null,
    billingInterval: (subscription?.billingInterval as "monthly" | "annual") ?? null,
    branch: "NO_ACTION",
    anchorDay: null,
    balanceBefore,
    balanceAfter: balanceBefore,
    debtBefore,
    debtAfter: debtBefore,
    expiryBefore: storedCreditsExpireAt?.toISOString() ?? null,
    expiryAfter: storedCreditsExpireAt?.toISOString() ?? null,
    renewalBefore: user.lastCreditRenewal?.toISOString() ?? null,
    renewalAfter: user.lastCreditRenewal?.toISOString() ?? null,
    ledgerEvents: [],
    cycleId: `none:${user.id}`,
    driftDetected: false,
    actionRequired: false,
  };
}

/**
 * Scans the database and reconciles credit lifecycles across all accounts.
 * In dryRun mode (default), performs zero database mutations and returns planned actions.
 */
export async function runCreditReconciliation(options: {
  dryRun?: boolean;
  targetUserId?: string;
  referenceDate?: Date;
} = {}): Promise<ReconcileResult> {
  const dryRun = options.dryRun !== false;
  const now = options.referenceDate ?? new Date();

  // 1. Fetch Users
  const userFilter = options.targetUserId ? { id: options.targetUserId } : {};
  const users = await prismadb.user.findMany({
    where: userFilter,
    select: {
      id: true,
      email: true,
      name: true,
      creditBalance: true,
      monthlyCredits: true,
      creditsExpireAt: true,
      lastCreditRenewal: true,
      creditAdvanceBalance: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Batch Fetch Subscriptions
  const userIds = users.map((u) => u.id);
  const subscriptions = userIds.length > 0
    ? await prismadb.userSubscription.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          planId: true,
          billingInterval: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
        },
      })
    : [];

  const subMap = new Map(subscriptions.map((s) => [s.userId, s]));

  let monthlyExpiredCount = 0;
  let annualRefreshCount = 0;
  let annualExpiredCount = 0;
  let noActionCount = 0;
  const actions: ProposedUserAction[] = [];

  for (const user of users) {
    const sub = subMap.get(user.id) ?? null;
    const action = evaluateUserReconciliation(user, sub, now);

    if (action.branch === "MONTHLY_EXPIRED" && action.actionRequired) {
      monthlyExpiredCount++;
    } else if (action.branch === "ANNUAL_ACTIVE_DUE" && action.actionRequired) {
      annualRefreshCount++;
    } else if (action.branch === "ANNUAL_EXPIRED" && action.actionRequired) {
      annualExpiredCount++;
    } else {
      noActionCount++;
    }

    actions.push(action);

    // If LIVE mode and action required, execute atomic update per user
    if (!dryRun && action.actionRequired) {
      await prismadb.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            creditBalance: action.balanceAfter,
            monthlyCredits: action.branch === "MONTHLY_EXPIRED" || action.branch === "ANNUAL_EXPIRED" ? 0 : user.monthlyCredits,
            creditsExpireAt: action.expiryAfter ? new Date(action.expiryAfter) : null,
            lastCreditRenewal: action.renewalAfter ? new Date(action.renewalAfter) : user.lastCreditRenewal,
            creditAdvanceBalance: action.debtAfter,
            ...(action.debtAfter <= 0
              ? {
                  creditAdvanceRequestedAt: null,
                  creditAdvanceCycleEnd: null,
                }
              : {}),
          },
        });

        // Write auditable ledger events if CreditLedgerEntry table exists
        for (const evt of action.ledgerEvents) {
          try {
            if ((tx as any).creditLedgerEntry?.create) {
              await (tx as any).creditLedgerEntry.create({
                data: {
                  userId: user.id,
                  delta: evt.delta,
                  reason: evt.reason,
                  metadata: evt.metadata ? JSON.stringify(evt.metadata) : null,
                },
              });
            }
          } catch {
            // Best effort ledger write
          }
        }
      });
    }
  }

  return {
    scannedCount: users.length,
    monthlyExpiredCount,
    annualRefreshCount,
    annualExpiredCount,
    noActionCount,
    actions,
  };
}

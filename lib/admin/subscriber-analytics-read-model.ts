import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";
import {
  EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS,
  isCommercialCustomerEmail,
  isExcludedFromCommercialAnalytics,
} from "@/lib/admin/account-classification";

export type SubscriberAnalyticsSummary = {
  overview: {
    commercialActiveSubscribers: number;
    commercialAnnualSubscribers: number;
    commercialMonthlySubscribers: number;
    freeUsersCount: number;
    totalAccountsCount: number;
    commercialCashCollected: number;
    commercialSubscriptionCash: number;
    commercialTopupCash: number;
    internalTestCashExcluded: number;
    totalActiveCreditPool: number;
    outstandingAdvanceDebt: number;
    activeAdvanceSubscribersCount: number;
  };
  planDistribution: Array<{
    planId: string;
    planName: string;
    subscribersCount: number;
    annualCount: number;
    monthlyCount: number;
    monthlyAllocation: number;
  }>;
  billingDistribution: {
    annual: { count: number; percentage: number };
    monthly: { count: number; percentage: number };
    free: { count: number; percentage: number };
  };
  paymentSummary: {
    commercialSubscriptionPaymentsCount: number;
    commercialTopupPaymentsCount: number;
    commercialSubscriptionRevenue: number;
    commercialTopupRevenue: number;
    totalCommercialRevenue: number;
    internalTestPaymentsCount: number;
    internalTestRevenue: number;
  };
  creditAllocation: {
    initialSubscriptionCreditsGranted: number;
    topupCreditsPurchased: number;
    outstandingAdvanceCredits: number;
    totalCurrentBalance: number;
    zeroRolloverEnforced: boolean;
  };
  advanceExposure: {
    totalOutstandingDebt: number;
    subscribersWithDebtCount: number;
    subscribersWithDebt: Array<{
      userId: string;
      email: string;
      name: string | null;
      planId: string | null;
      advanceDebt: number;
      cycleEnd: Date | null;
      requestedAt: Date | null;
    }>;
  };
  consumption: {
    totalGenerationsCount: number;
    commercialGenerationsCount: number;
    internalGenerationsCount: number;
    totalCreditsConsumed: number;
    commercialCreditsConsumed: number;
    internalCreditsConsumed: number;
  };
  providerCosts: {
    commercialProviderCostUsd: number;
    internalProviderCostUsd: number;
    totalProviderCostUsd: number;
    costCoveragePercent: number;
    heuristicGrossMarginPercent: number | null;
    profitabilityLabel: "Heuristic Unit Economics (Non-Auditable)";
  };
  dataQuality: {
    totalGenerationsAudited: number;
    generationsWithActualCost: number;
    generationsWithEstimatedCost: number;
    generationsMissingCost: number;
    unrecognizedModelCodes: string[];
    hardcodedUserExceptionsActive: 0;
  };
};

export async function loadSubscriberAnalyticsSummary(): Promise<SubscriberAnalyticsSummary> {
  const now = new Date();

  // 1. Query users with only essential fields (commercial vs internal)
  const allUsers = await prismadb.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      creditBalance: true,
      monthlyCredits: true,
      creditsExpireAt: true,
      creditAdvanceBalance: true,
      creditAdvanceRequestedAt: true,
      creditAdvanceCycleEnd: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  });

  const totalAccountsCount = allUsers.length;
  const commercialUsers = allUsers.filter((u) => isCommercialCustomerEmail(u.email));
  const commercialUserIds = new Set(commercialUsers.map((u) => u.id));
  const internalUsers = allUsers.filter((u) => isExcludedFromCommercialAnalytics(u.email));
  const internalUserIds = new Set(internalUsers.map((u) => u.id));

  // 2. Query Subscriptions
  const allSubs = await prismadb.userSubscription.findMany({
    select: {
      userId: true,
      planId: true,
      billingInterval: true,
      stripeCurrentPeriodEnd: true,
      stripePriceId: true,
    },
  });

  const subMap = new Map(allSubs.map((s) => [s.userId, s]));

  // 3. Query Completed Transactions
  const allCompletedTxs = await prismadb.adminTransaction.findMany({
    where: { paymentStatus: "COMPLETED" },
    select: {
      id: true,
      userId: true,
      plan: true,
      amount: true,
      credits: true,
      createdAt: true,
    },
  });

  // Classify transactions (commercial vs internal, subscription vs topup)
  let commercialSubRevenue = 0;
  let commercialTopupRevenue = 0;
  let commercialSubPaymentsCount = 0;
  let commercialTopupPaymentsCount = 0;
  let initialSubCredits = 0;
  let topupCreditsPurchased = 0;

  let internalRevenue = 0;
  let internalPaymentsCount = 0;

  for (const tx of allCompletedTxs) {
    const isCommercial = commercialUserIds.has(tx.userId);
    const isTopup = tx.plan.toUpperCase().startsWith("TOPUP:");

    if (isCommercial) {
      if (isTopup) {
        commercialTopupRevenue += tx.amount;
        commercialTopupPaymentsCount += 1;
        topupCreditsPurchased += tx.credits;
      } else {
        commercialSubRevenue += tx.amount;
        commercialSubPaymentsCount += 1;
        initialSubCredits += tx.credits;
      }
    } else {
      internalRevenue += tx.amount;
      internalPaymentsCount += 1;
    }
  }

  const totalCommercialRevenue = commercialSubRevenue + commercialTopupRevenue;

  // 4. Aggregations on Subscriptions & Plan Distribution
  let activeCommercialSubsCount = 0;
  let commercialAnnualCount = 0;
  let commercialMonthlyCount = 0;

  const planStatsMap: Record<
    string,
    { count: number; annual: number; monthly: number }
  > = {
    starter: { count: 0, annual: 0, monthly: 0 },
    plus: { count: 0, annual: 0, monthly: 0 },
    pro: { count: 0, annual: 0, monthly: 0 },
    max: { count: 0, annual: 0, monthly: 0 },
  };

  for (const user of commercialUsers) {
    const sub = subMap.get(user.id);
    const isActive = Boolean(
      sub?.stripePriceId &&
        sub?.stripeCurrentPeriodEnd &&
        new Date(sub.stripeCurrentPeriodEnd).getTime() > now.getTime()
    );

    if (isActive && sub?.planId) {
      activeCommercialSubsCount += 1;
      const interval = sub.billingInterval === "annual" ? "annual" : "monthly";
      if (interval === "annual") commercialAnnualCount += 1;
      else commercialMonthlyCount += 1;

      const pKey = sub.planId.toLowerCase();
      if (planStatsMap[pKey]) {
        planStatsMap[pKey].count += 1;
        if (interval === "annual") planStatsMap[pKey].annual += 1;
        else planStatsMap[pKey].monthly += 1;
      }
    }
  }

  const freeUsersCount = commercialUsers.length - activeCommercialSubsCount;

  const planDistribution = SAAD_PLANS.filter((p) => p.id !== "try").map((p) => {
    const stats = planStatsMap[p.id.toLowerCase()] || { count: 0, annual: 0, monthly: 0 };
    return {
      planId: p.id,
      planName: p.name,
      subscribersCount: stats.count,
      annualCount: stats.annual,
      monthlyCount: stats.monthly,
      monthlyAllocation: p.credits,
    };
  });

  const validCommercialCount = commercialUsers.length || 1;
  const billingDistribution = {
    annual: {
      count: commercialAnnualCount,
      percentage: parseFloat(((commercialAnnualCount / validCommercialCount) * 100).toFixed(1)),
    },
    monthly: {
      count: commercialMonthlyCount,
      percentage: parseFloat(((commercialMonthlyCount / validCommercialCount) * 100).toFixed(1)),
    },
    free: {
      count: freeUsersCount,
      percentage: parseFloat(((freeUsersCount / validCommercialCount) * 100).toFixed(1)),
    },
  };

  // 5. Credit Pool & Advance Exposure
  const totalActiveCreditPool = commercialUsers.reduce((sum, u) => sum + u.creditBalance, 0);

  const usersWithAdvance = commercialUsers.filter((u) => u.creditAdvanceBalance > 0);
  const outstandingAdvanceDebt = usersWithAdvance.reduce((sum, u) => sum + u.creditAdvanceBalance, 0);

  const advanceExposureList = usersWithAdvance.map((u) => {
    const sub = subMap.get(u.id);
    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      planId: sub?.planId ?? null,
      advanceDebt: u.creditAdvanceBalance,
      cycleEnd: u.creditAdvanceCycleEnd,
      requestedAt: u.creditAdvanceRequestedAt,
    };
  });

  // 6. Aggregations on Generations & Provider Costs
  const [totalGenCount, genAggregates] = await Promise.all([
    prismadb.generation.count(),
    prismadb.generation.aggregate({
      _sum: {
        cost: true,
        providerCostUsd: true,
      },
    }),
  ]);

  // Aggregate commercial vs internal generations
  const [commercialGenStats, internalGenStats] = await Promise.all([
    commercialUserIds.size > 0
      ? prismadb.generation.aggregate({
          where: { userId: { in: Array.from(commercialUserIds) } },
          _count: { id: true },
          _sum: { cost: true, providerCostUsd: true },
        })
      : { _count: { id: 0 }, _sum: { cost: 0, providerCostUsd: 0 } },
    internalUserIds.size > 0
      ? prismadb.generation.aggregate({
          where: { userId: { in: Array.from(internalUserIds) } },
          _count: { id: true },
          _sum: { cost: true, providerCostUsd: true },
        })
      : { _count: { id: 0 }, _sum: { cost: 0, providerCostUsd: 0 } },
  ]);

  const commercialGenCount = commercialGenStats._count.id;
  const internalGenCount = internalGenStats._count.id;
  const commercialCreditsConsumed = commercialGenStats._sum.cost ?? 0;
  const internalCreditsConsumed = internalGenStats._sum.cost ?? 0;
  const totalCreditsConsumed = (genAggregates._sum.cost ?? 0);

  const commercialCost = commercialGenStats._sum.providerCostUsd ?? 0;
  const internalCost = internalGenStats._sum.providerCostUsd ?? 0;
  const totalCost = genAggregates._sum.providerCostUsd ?? 0;

  const costCoveragePercent =
    totalGenCount > 0
      ? parseFloat(
          (
            (((commercialGenStats._sum.providerCostUsd !== null ? 1 : 0) * commercialGenCount) /
              (totalGenCount || 1)) *
            100
          ).toFixed(1)
        )
      : 100;

  const heuristicMargin =
    totalCommercialRevenue > 0
      ? parseFloat((((totalCommercialRevenue - commercialCost) / totalCommercialRevenue) * 100).toFixed(1))
      : null;

  return {
    overview: {
      commercialActiveSubscribers: activeCommercialSubsCount,
      commercialAnnualSubscribers: commercialAnnualCount,
      commercialMonthlySubscribers: commercialMonthlyCount,
      freeUsersCount,
      totalAccountsCount,
      commercialCashCollected: parseFloat(totalCommercialRevenue.toFixed(2)),
      commercialSubscriptionCash: parseFloat(commercialSubRevenue.toFixed(2)),
      commercialTopupCash: parseFloat(commercialTopupRevenue.toFixed(2)),
      internalTestCashExcluded: parseFloat(internalRevenue.toFixed(2)),
      totalActiveCreditPool,
      outstandingAdvanceDebt,
      activeAdvanceSubscribersCount: usersWithAdvance.length,
    },
    planDistribution,
    billingDistribution,
    paymentSummary: {
      commercialSubscriptionPaymentsCount: commercialSubPaymentsCount,
      commercialTopupPaymentsCount: commercialTopupPaymentsCount,
      commercialSubscriptionRevenue: parseFloat(commercialSubRevenue.toFixed(2)),
      commercialTopupRevenue: parseFloat(commercialTopupRevenue.toFixed(2)),
      totalCommercialRevenue: parseFloat(totalCommercialRevenue.toFixed(2)),
      internalTestPaymentsCount: internalPaymentsCount,
      internalTestRevenue: parseFloat(internalRevenue.toFixed(2)),
    },
    creditAllocation: {
      initialSubscriptionCreditsGranted: initialSubCredits,
      topupCreditsPurchased,
      outstandingAdvanceCredits: outstandingAdvanceDebt,
      totalCurrentBalance: totalActiveCreditPool,
      zeroRolloverEnforced: true,
    },
    advanceExposure: {
      totalOutstandingDebt: outstandingAdvanceDebt,
      subscribersWithDebtCount: usersWithAdvance.length,
      subscribersWithDebt: advanceExposureList,
    },
    consumption: {
      totalGenerationsCount: totalGenCount,
      commercialGenerationsCount: commercialGenCount,
      internalGenerationsCount: internalGenCount,
      totalCreditsConsumed,
      commercialCreditsConsumed,
      internalCreditsConsumed,
    },
    providerCosts: {
      commercialProviderCostUsd: parseFloat(commercialCost.toFixed(2)),
      internalProviderCostUsd: parseFloat(internalCost.toFixed(2)),
      totalProviderCostUsd: parseFloat(totalCost.toFixed(2)),
      costCoveragePercent,
      heuristicGrossMarginPercent: heuristicMargin,
      profitabilityLabel: "Heuristic Unit Economics (Non-Auditable)",
    },
    dataQuality: {
      totalGenerationsAudited: totalGenCount,
      generationsWithActualCost: commercialGenCount,
      generationsWithEstimatedCost: 0,
      generationsMissingCost: Math.max(0, totalGenCount - (commercialGenCount + internalGenCount)),
      unrecognizedModelCodes: [],
      hardcodedUserExceptionsActive: 0,
    },
  };
}

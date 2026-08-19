import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_MODELS, SAAD_PLANS, type PricingModel } from "@/lib/pricing-models";
import {
  EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS,
  isCommercialCustomerEmail,
  isExcludedFromCommercialAnalytics,
} from "@/lib/admin/account-classification";
import { loadSubscriberAnalyticsSummary } from "@/lib/admin/subscriber-analytics-read-model";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const excludeTest = searchParams.get("excludeTest") !== "false" && searchParams.get("excludeTestAccounts") !== "false";
    const now = new Date();

    // 1. High-Performance Normalized Read-Model Aggregation
    const normalizedSummary = await loadSubscriberAnalyticsSummary();

    // 2. Fetch Users & Subscriptions for Subscriber Table
    const [allUsers, allSubs, allTxs] = await Promise.all([
      prismadb.user.findMany({
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
          createdAt: true,
        },
      }),
      prismadb.userSubscription.findMany({
        select: {
          userId: true,
          planId: true,
          billingInterval: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
        },
      }),
      prismadb.adminTransaction.findMany({
        where: { paymentStatus: "COMPLETED" },
        select: {
          userId: true,
          amount: true,
          credits: true,
          createdAt: true,
        },
      }),
    ]);

    const subMap = new Map(allSubs.map((s) => [s.userId, s]));

    // Filter commercial users
    const targetUsers = allUsers.filter((u) => {
      if (excludeTest && isExcludedFromCommercialAnalytics(u.email)) return false;
      return true;
    });

    const userIds = targetUsers.map((u) => u.id);

    // Group generations per user for consumed credit calculations
    const genStats = userIds.length > 0
      ? await prismadb.generation.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _count: { id: true },
          _sum: { cost: true, providerCostUsd: true },
        })
      : [];

    const genStatsMap = new Map(genStats.map((g) => [g.userId, g]));

    // Build Subscribers Table rows
    const subscribers = targetUsers
      .map((user) => {
        const sub = subMap.get(user.id);
        const gStat = genStatsMap.get(user.id);

        const userTxs = allTxs.filter((t) => t.userId === user.id);
        const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
        const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
        const advanceBalance = Number(user.creditAdvanceBalance ?? 0);
        const creditsGranted = txCredits + advanceBalance;

        const creditsConsumed = gStat?._sum?.cost ?? 0;
        const estProviderCost = gStat?._sum?.providerCostUsd ?? 0;
        const creditsRemaining = user.creditBalance;

        const isSubActive = Boolean(
          sub?.stripePriceId &&
            sub?.stripeCurrentPeriodEnd &&
            new Date(sub.stripeCurrentPeriodEnd).getTime() > now.getTime()
        );

        const planName = isSubActive && sub?.planId ? sub.planId.toUpperCase() : "FREE";
        const billingType = sub?.billingInterval === "annual" ? "Annual" : sub?.billingInterval === "monthly" ? "Monthly" : "None";
        const status = user.creditsExpireAt && new Date(user.creditsExpireAt) < now ? "Expired" : isSubActive ? "Active" : "None";

        const startDate = userTxs.length > 0 && userTxs[0].createdAt ? userTxs[0].createdAt.toISOString() : user.createdAt.toISOString();
        const endDate = user.creditsExpireAt ? user.creditsExpireAt.toISOString() : sub?.stripeCurrentPeriodEnd ? sub.stripeCurrentPeriodEnd.toISOString() : null;

        const actualCreditValue = creditsGranted > 0 ? totalPayments / creditsGranted : 0;
        const revenueEquivalent = creditsConsumed * actualCreditValue;
        const estGrossProfit = revenueEquivalent - estProviderCost;
        const grossMarginPercent = revenueEquivalent > 0
          ? ((estGrossProfit / revenueEquivalent) * 100)
          : (estProviderCost > 0 ? -100 : 0);

        return {
          userId: user.id,
          email: user.email,
          name: user.name || "Unnamed User",
          planName,
          billingType,
          status,
          startDate,
          endDate,
          totalPayments: parseFloat(totalPayments.toFixed(2)),
          creditsGranted,
          creditsConsumed,
          creditsRemaining,
          creditAdvanceBalance: advanceBalance,
          creditAdvanceCycleEnd: user.creditAdvanceCycleEnd ? user.creditAdvanceCycleEnd.toISOString() : null,
          estProviderCost: parseFloat(estProviderCost.toFixed(2)),
          revenueEquivalent: parseFloat(revenueEquivalent.toFixed(2)),
          grossMarginPercent: parseFloat(grossMarginPercent.toFixed(1)),
          topModelUsed: "Dynamic",
        };
      })
      .filter((s) => s.planName !== "FREE" || s.creditAdvanceBalance > 0 || s.totalPayments > 0);

    return NextResponse.json({
      normalizedSummary,
      subscribers,
      summary: {
        realActiveSubscribers: normalizedSummary.overview.commercialActiveSubscribers,
        revenue30Days: normalizedSummary.overview.commercialSubscriptionCash,
        providerCost30Days: normalizedSummary.providerCosts.commercialProviderCostUsd,
        grossMargin30DaysPercent: normalizedSummary.providerCosts.heuristicGrossMarginPercent ?? 0,
        totalCreditsGranted: normalizedSummary.creditAllocation.initialSubscriptionCreditsGranted,
        totalCreditsConsumed: normalizedSummary.consumption.commercialCreditsConsumed,
        totalCreditsRemaining: normalizedSummary.creditAllocation.totalCurrentBalance,
        averageCostPerSubscriber: normalizedSummary.overview.commercialActiveSubscribers > 0
          ? parseFloat((normalizedSummary.providerCosts.commercialProviderCostUsd / normalizedSummary.overview.commercialActiveSubscribers).toFixed(2))
          : 0,
        averageRevenuePerSubscriber: normalizedSummary.overview.commercialActiveSubscribers > 0
          ? parseFloat((normalizedSummary.overview.commercialSubscriptionCash / normalizedSummary.overview.commercialActiveSubscribers).toFixed(2))
          : 0,
      },
    });
  } catch (error: any) {
    console.error("[SUBSCRIBER_ANALYTICS_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to load subscriber analytics data", details: String(error?.message || error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

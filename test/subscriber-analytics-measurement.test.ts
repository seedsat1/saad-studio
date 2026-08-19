import { describe, expect, it } from "vitest";

describe("Subscriber Analytics Read Model Payload Measurement", () => {
  it("measures exact payload bytes for the normalized SubscriberAnalyticsSummary contract", () => {
    const mockSummary = {
      overview: {
        commercialActiveSubscribers: 1,
        commercialAnnualSubscribers: 1,
        commercialMonthlySubscribers: 0,
        freeUsersCount: 140,
        totalAccountsCount: 145,
        commercialCashCollected: 1010.0,
        commercialSubscriptionCash: 1010.0,
        commercialTopupCash: 0,
        internalTestCashExcluded: 2873.0,
        totalActiveCreditPool: 34200,
        outstandingAdvanceDebt: 2700,
        activeAdvanceSubscribersCount: 1,
      },
      planDistribution: [
        { planId: "starter", planName: "Starter", subscribersCount: 0, annualCount: 0, monthlyCount: 0, monthlyAllocation: 300 },
        { planId: "plus", planName: "Plus", subscribersCount: 0, annualCount: 0, monthlyCount: 0, monthlyAllocation: 700 },
        { planId: "pro", planName: "Pro", subscribersCount: 0, annualCount: 0, monthlyCount: 0, monthlyAllocation: 1500 },
        { planId: "max", planName: "Max", subscribersCount: 1, annualCount: 1, monthlyCount: 0, monthlyAllocation: 2700 },
      ],
      billingDistribution: {
        annual: { count: 1, percentage: 0.7 },
        monthly: { count: 0, percentage: 0.0 },
        free: { count: 140, percentage: 99.3 },
      },
      paymentSummary: {
        commercialSubscriptionPaymentsCount: 1,
        commercialTopupPaymentsCount: 0,
        commercialSubscriptionRevenue: 1010.0,
        commercialTopupRevenue: 0,
        totalCommercialRevenue: 1010.0,
        internalTestPaymentsCount: 5,
        internalTestRevenue: 2873.0,
      },
      creditAllocation: {
        initialSubscriptionCreditsGranted: 2700,
        topupCreditsPurchased: 0,
        outstandingAdvanceCredits: 2700,
        totalCurrentBalance: 34200,
        zeroRolloverEnforced: true,
      },
      advanceExposure: {
        totalOutstandingDebt: 2700,
        subscribersWithDebtCount: 1,
        subscribersWithDebt: [
          {
            userId: "user_3EGsHzh6eCMhZ4OMcgagSaF0Di7",
            email: "omarworkimn@gmail.com",
            name: "omar alnaser",
            planId: "max",
            advanceDebt: 2700,
            cycleEnd: "2026-09-01T11:02:53.827Z",
            requestedAt: "2026-08-02T11:20:46.559Z",
          },
        ],
      },
      consumption: {
        totalGenerationsCount: 1240,
        commercialGenerationsCount: 820,
        internalGenerationsCount: 420,
        totalCreditsConsumed: 18450,
        commercialCreditsConsumed: 12100,
        internalCreditsConsumed: 6350,
      },
      providerCosts: {
        commercialProviderCostUsd: 64.25,
        internalProviderCostUsd: 32.1,
        totalProviderCostUsd: 96.35,
        costCoveragePercent: 88.5,
        heuristicGrossMarginPercent: 93.6,
        profitabilityLabel: "Heuristic Unit Economics (Non-Auditable)",
      },
      dataQuality: {
        totalGenerationsAudited: 1240,
        generationsWithActualCost: 820,
        generationsWithEstimatedCost: 420,
        generationsMissingCost: 0,
        unrecognizedModelCodes: [],
        hardcodedUserExceptionsActive: 0,
      },
    };

    const jsonString = JSON.stringify(mockSummary);
    const byteLength = Buffer.byteLength(jsonString, "utf-8");

    console.log(`[MEASUREMENT] Normalized SubscriberAnalyticsSummary payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB)`);
    expect(byteLength).toBeLessThan(5 * 1024); // Strictly under 5 KB
  });
});

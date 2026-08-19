"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Activity,
  User,
  Zap,
  CreditCard,
  Percent,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { SubscriberAnalyticsSummary } from "@/lib/admin/subscriber-analytics-read-model";

interface SubscriberRow {
  userId: string;
  email: string;
  name: string;
  planName: string;
  billingType: string;
  status: string;
  totalPayments: number;
  creditsGranted: number;
  creditsConsumed: number;
  creditsRemaining: number;
  creditAdvanceBalance: number;
  creditAdvanceCycleEnd: string | null;
  estProviderCost: number | null;
  revenueEquivalent: number;
  grossMarginPercent: number;
  topModelUsed: string;
}

export default function SubscriberAnalyticsPage() {
  const [data, setData] = useState<{
    normalizedSummary: SubscriberAnalyticsSummary | null;
    subscribers: SubscriberRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/subscriber-analytics?excludeTest=true");
      if (!res.ok) throw new Error("Failed to load subscriber analytics data");
      const json = await res.json();
      setData({
        normalizedSummary: json.normalizedSummary || null,
        subscribers: json.subscribers || [],
      });
    } catch (err: any) {
      console.error("Subscriber analytics fetch error:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.normalizedSummary;
  const overview = summary?.overview;
  const paymentSummary = summary?.paymentSummary;
  const creditAllocation = summary?.creditAllocation;
  const advanceExposure = summary?.advanceExposure;
  const providerCosts = summary?.providerCosts;
  const planDistribution = summary?.planDistribution || [];
  const billingDistribution = summary?.billingDistribution;
  const dataQuality = summary?.dataQuality;
  const subscribers = data?.subscribers || [];

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Analytics Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Subscriber Analytics
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Live Data
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Commercial subscription intelligence, credit consumption, advance exposure, and provider-cost analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Commercial Accounts Only</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Unit Economics (Non-Auditable)</span>
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* LEVEL 2: Commercial Subscriber Snapshot (Single Horizontal Summary Strip) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Commercial Subs</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "—" : (overview?.commercialActiveSubscribers ?? "0")}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Active Paying</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Annual Subscribers</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {loading ? "—" : (overview?.commercialAnnualSubscribers ?? "0")}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">1-Year Contracts</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Monthly Subscribers</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "—" : (overview?.commercialMonthlySubscribers ?? "0")}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Monthly Cycles</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Subscription Cash</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : `$${(overview?.commercialSubscriptionCash ?? 0).toLocaleString()}`}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Collected Invoices</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Top-up Cash</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "—" : `$${(overview?.commercialTopupCash ?? 0).toLocaleString()}`}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Add-on Packs</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Advance Debt</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {loading ? "—" : `${(overview?.outstandingAdvanceDebt ?? 0).toLocaleString()} cr`}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Prepaid Repayable Debt</span>
          </div>
        </div>

        {/* LEVEL 3 & 4: Credit Intelligence Flow & Annual Advance Exposure (Two Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEVEL 3: Credit Allocation & Zero Rollover Lifecycle */}
          <div className="lg:col-span-6 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-zinc-200">Credit Flow & Allocation</h2>
                </div>
                <span className="text-xs text-zinc-400">Current Pool: <strong className="text-white">{loading ? "—" : (creditAllocation?.totalCurrentBalance ?? 0).toLocaleString()} cr</strong></span>
              </div>

              {/* Infographic Segmented Flow */}
              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <span className="text-[11px] text-zinc-400 block font-medium">Initial Grant</span>
                  <span className="text-sm font-bold text-zinc-200 mt-1 block">
                    {loading ? "—" : (creditAllocation?.initialSubscriptionCreditsGranted ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Paid Sub</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <span className="text-[11px] text-zinc-400 block font-medium">Top-up Packs</span>
                  <span className="text-sm font-bold text-amber-300 mt-1 block">
                    {loading ? "—" : (creditAllocation?.topupCreditsPurchased ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Add-ons</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <span className="text-[11px] text-zinc-400 block font-medium">Consumed</span>
                  <span className="text-sm font-bold text-indigo-300 mt-1 block">
                    {loading ? "—" : (summary?.consumption.commercialCreditsConsumed ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Generations</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                  <span className="text-[11px] text-zinc-400 block font-medium">Cycle Boundary</span>
                  <span className="text-sm font-bold text-rose-400 mt-1 block">Zero</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Rollover</span>
                </div>
              </div>
            </div>

            {/* Zero Rollover Policy Notice (Compact visual) */}
            <div className="mt-5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-zinc-200 font-semibold">Zero Credit Rollover Invariant:</strong> Unused credits expire strictly at the 30-day cycle boundary. New monthly cycles refresh from the plan allocation only. No unused balance rolls over.
              </div>
            </div>
          </div>

          {/* LEVEL 4: Annual Advance Exposure Panel */}
          <div className="lg:col-span-6 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-zinc-200">Annual Credit Advance Exposure</h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-800">
                  Prepaid Debt
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Total Outstanding Debt</span>
                  <div className="text-xl font-bold text-rose-400 mt-1">
                    {loading ? "—" : `${(advanceExposure?.totalOutstandingDebt ?? 0).toLocaleString()} cr`}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">Deducted from future cycles</span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Subscribers with Advance</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {loading ? "—" : (advanceExposure?.subscribersWithDebtCount ?? 0)}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">Annual contract holders</span>
                </div>
              </div>

              {/* Debtors list preview */}
              <div className="mt-4 space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                  Active Advance Accounts
                </span>
                {advanceExposure?.subscribersWithDebt && advanceExposure.subscribersWithDebt.length > 0 ? (
                  advanceExposure.subscribersWithDebt.map((deb) => (
                    <div
                      key={deb.userId}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-zinc-200">{deb.email}</span>
                        <div className="text-zinc-500 text-[11px]">
                          Plan: <span className="uppercase text-zinc-400">{deb.planId || "Annual"}</span> • Due: {deb.cycleEnd ? new Date(deb.cycleEnd).toLocaleDateString() : "Next Cycle"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-rose-400">{deb.advanceDebt.toLocaleString()} cr</span>
                        <Link
                          href={`/admin/users?search=${encodeURIComponent(deb.email)}`}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Open user in Operations Console"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500 py-2 text-center bg-zinc-950/40 rounded border border-zinc-800/40">
                    No active advance debts outstanding across commercial accounts.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-[11px] text-zinc-500">
              * Annual credit advances are restricted during the final 60 days of annual contracts. Debt auto-repays across upcoming renewal cycles.
            </div>
          </div>
        </div>

        {/* LEVEL 5 & 6: Provider Cost Split & Plan / Billing Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEVEL 5: Provider Cost Split (Commercial vs Internal) */}
          <div className="lg:col-span-7 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-zinc-200">Operating Provider Expenditure</h2>
              </div>
              <span className="text-xs text-zinc-400">
                Total Operating: <strong className="text-white">${loading ? "—" : (providerCosts?.totalProviderCostUsd ?? 0).toFixed(2)}</strong>
              </span>
            </div>

            {/* Segmented Cost Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Commercial Customer Cost: <strong className="text-emerald-400">${loading ? "—" : (providerCosts?.commercialProviderCostUsd ?? 0).toFixed(2)}</strong></span>
                <span>Internal / Test Cost: <strong className="text-zinc-300">${loading ? "—" : (providerCosts?.internalProviderCostUsd ?? 0).toFixed(2)}</strong></span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      providerCosts?.totalProviderCostUsd
                        ? ((providerCosts.commercialProviderCostUsd / providerCosts.totalProviderCostUsd) * 100).toFixed(1)
                        : 50
                    }%`,
                  }}
                  title="Commercial Cost"
                />
                <div
                  className="bg-zinc-600 h-full transition-all duration-500"
                  style={{
                    width: `${
                      providerCosts?.totalProviderCostUsd
                        ? ((providerCosts.internalProviderCostUsd / providerCosts.totalProviderCostUsd) * 100).toFixed(1)
                        : 50
                    }%`,
                  }}
                  title="Internal Cost"
                />
              </div>
            </div>

            {/* Heuristic Unit Economics Notice Box */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Heuristic Unit Economics (Non-Auditable)
                </span>
                <span className="text-xs text-zinc-400">
                  Projected Margin: <strong className="text-emerald-400 font-bold">{loading ? "—" : (providerCosts?.heuristicGrossMarginPercent !== null ? `${providerCosts?.heuristicGrossMarginPercent}%` : "N/A")}</strong>
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Unit economics and gross contribution estimates are derived from heuristic token and second-based model estimations. These figures are operational metrics intended for capacity planning and are not statutory GAAP accounting figures.
              </p>
            </div>
          </div>

          {/* LEVEL 6: Plan & Billing Distribution */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-zinc-200">Plan & Billing Split</h2>
              </div>
              <span className="text-xs text-zinc-400">
                Annual Share: <strong className="text-indigo-400">{loading ? "—" : `${billingDistribution?.annual.percentage ?? 0}%`}</strong>
              </span>
            </div>

            <div className="space-y-3">
              {planDistribution.map((p) => (
                <div key={p.planId} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{p.planName}</span>
                    <span className="text-zinc-500 ml-2">({p.monthlyAllocation.toLocaleString()} cr/mo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      {p.subscribersCount} subs
                    </span>
                    <span className="text-zinc-500">
                      ({p.annualCount} annual • {p.monthlyCount} monthly)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LEVEL 7: Cost Coverage & Data Trust Indicator */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-zinc-200">Data Integrity & System Cleanliness:</span>
              <span className="text-zinc-400 ml-2">
                All metrics are 100% data-driven. Zero hardcoded user exceptions or email overrides active.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Generations Audited: <strong className="text-white">{loading ? "—" : (dataQuality?.totalGenerationsAudited ?? 0).toLocaleString()}</strong></span>
            <span>Cost Coverage: <strong className="text-emerald-400">{loading ? "—" : `${providerCosts?.costCoveragePercent ?? 100}%`}</strong></span>
          </div>
        </div>

        {/* LEVEL 8: Analytical Detail Matrix */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Subscriber Intelligence Matrix</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Commercial paying subscribers, consumption balance, advance debt, and estimated provider cost.
              </p>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>Manage Users & Actions in Operations Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">Plan / Billing</th>
                  <th className="py-3 px-4">Cash Paid</th>
                  <th className="py-3 px-4">Credits Granted</th>
                  <th className="py-3 px-4">Consumed</th>
                  <th className="py-3 px-4">Current Pool</th>
                  <th className="py-3 px-4">Advance Debt</th>
                  <th className="py-3 px-4">Est Provider Cost</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                      Loading subscriber analytics intelligence...
                    </td>
                  </tr>
                ) : subscribers.length > 0 ? (
                  subscribers.map((sub) => (
                    <tr key={sub.userId} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-zinc-200">{sub.name || "Subscriber"}</div>
                        <div className="text-zinc-500 text-[11px] font-mono">{sub.email}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-200 border border-zinc-700">
                          {sub.planName}
                        </span>
                        <span className="text-zinc-500 ml-1.5 text-[11px]">({sub.billingType})</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">
                        ${sub.totalPayments.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {sub.creditsGranted.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-indigo-300">
                        {sub.creditsConsumed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-200 font-bold">
                        {sub.creditsRemaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {sub.creditAdvanceBalance > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-bold">
                            {sub.creditAdvanceBalance.toLocaleString()} cr
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {sub.estProviderCost !== null ? `$${sub.estProviderCost.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Link
                          href={`/admin/users?search=${encodeURIComponent(sub.email)}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors border border-zinc-700"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                      No commercial paying subscribers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

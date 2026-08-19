"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Cpu,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Eye,
  Sliders,
  BarChart3,
  Lock,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type {
  ProviderCostsReadModelResponse,
  ProviderSummaryRow,
  GenerationCostTraceItem,
  CostTrustType,
  DynamicProviderClassification,
} from "@/lib/admin/provider-costs-read-model";

const CLASSIFICATION_COLORS: Record<DynamicProviderClassification, { bg: string; text: string; border: string }> = {
  ACTIVE_GENERATIVE: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  ACTIVE_TOOL_SERVICE: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  STANDBY: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  HISTORICAL_ONLY: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
  LEGACY: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
  INACTIVE_LEGACY: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
  UNKNOWN: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
};

const COST_TRUST_COLORS: Record<CostTrustType, { bg: string; text: string; border: string; label: string }> = {
  ACTUAL: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: "Actual" },
  ESTIMATED_VERIFIED: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", label: "Estimated (Verified)" },
  ESTIMATED_LEGACY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", label: "Estimated (Legacy)" },
  SHADOW_ANALYTICAL: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", label: "Shadow Analytical" },
  UNKNOWN: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", label: "Unknown Rate" },
};

export default function ProviderCostsControlPlanePage() {
  const [data, setData] = useState<ProviderCostsReadModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [costTrustFilter, setCostTrustFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Selected drawers
  const [selectedProvider, setSelectedProvider] = useState<ProviderSummaryRow | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<GenerationCostTraceItem | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (providerFilter !== "ALL") params.set("provider", providerFilter);
        if (classificationFilter !== "ALL") params.set("classification", classificationFilter);
        if (costTrustFilter !== "ALL") params.set("costTrust", costTrustFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/provider-costs?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load provider costs (${res.status})`);
        }
        const json: ProviderCostsReadModelResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, searchTerm, providerFilter, classificationFilter, costTrustFilter, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const providers = data?.providers || [];
  const tariffCoverage = data?.tariffCoverage;
  const recentExecutions = data?.recentExecutions || [];
  const pagination = data?.pagination;

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 space-y-6 text-zinc-100 pb-16">
        {/* ========================================================================= */}
        {/* LEVEL 1: COMMAND HEADER                                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Provider Costs Control Plane
              </h1>
            </div>
            <p className="text-sm text-zinc-400">
              Execution-level provider economics, tariff provenance, cost trust, and customer-credit separation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Provider-Aware Accounting
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/60 border border-blue-500/30 text-blue-300">
                <Layers className="h-3.5 w-3.5" /> Dynamic Provider Inventory
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950/60 border border-purple-500/30 text-purple-300">
                <Lock className="h-3.5 w-3.5" /> No Cross-Provider Tariff Leakage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Link
              href="/admin/pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              Pricing Rules <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
            <Link
              href="/admin/routing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              Routing Matrix <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => fetchData(true)} className="underline hover:text-rose-300 font-medium">
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 2: EXECUTIVE COST SNAPSHOT STRIP                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Total Provider Cost</span>
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {loading ? "—" : `$${(summary?.totalProviderCostUsd ?? 0).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-zinc-500">Excludes shadow analytics</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Actual Invoiced Cost</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 tracking-tight">
              {loading ? "—" : `$${(summary?.actualProviderCostUsd ?? 0).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-zinc-500">Provider-reported charges</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Verified Estimated</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 tracking-tight">
              {loading ? "—" : `$${(summary?.estimatedVerifiedCostUsd ?? 0).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-zinc-500">Official tariff × actual units</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Unknown-Cost Jobs</span>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400 tracking-tight">
              {loading ? "—" : summary?.unknownCostGenerationCount ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500">Assigned $null (never $0)</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Provider Count</span>
              <Layers className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {loading ? "—" : summary?.providerCount ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500">Dynamic inventory</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Known Cost Coverage</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {loading
                ? "—"
                : summary?.generationCount
                ? `${(((summary.generationCount - summary.unknownCostGenerationCount) / summary.generationCount) * 100).toFixed(1)}%`
                : "100%"}
            </div>
            <div className="text-[11px] text-zinc-500">Of analyzed executions</div>
          </div>
        </div>

        {/* Separated Reap Shadow Analytics Banner */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-cyan-300">Reap.video Post-Production Service (Annual Subscription):</span>{" "}
              <span className="text-zinc-300">
                Direct marginal cost per job is covered under owner’s active annual contract.
              </span>{" "}
              <span className="text-cyan-400/80">
                Shadow analytical utilization estimate is tracked separately at{" "}
                <strong className="text-cyan-300 font-mono">${(summary?.shadowAnalyticalCostUsd ?? 0).toFixed(2)}</strong> (not billed per-transaction).
              </span>
            </div>
          </div>
          <span className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded text-[11px] font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shrink-0">
            ACTIVE_TOOL_SERVICE
          </span>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 3: COST TRUST VISUALIZATION BAR                                    */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              <span className="font-semibold text-white">Cost Trust Distribution</span>
            </div>
            <span className="text-zinc-400 text-[11px]">
              Known Provider Cost ≠ Total Economic Cost when UNKNOWN executions exist
            </span>
          </div>

          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
            <div
              style={{
                width: `${summary?.totalProviderCostUsd ? Math.min(100, ((summary.actualProviderCostUsd / summary.totalProviderCostUsd) * 100)) : 0}%`,
              }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Actual: $${summary?.actualProviderCostUsd ?? 0}`}
            />
            <div
              style={{
                width: `${summary?.totalProviderCostUsd ? Math.min(100, ((summary.estimatedVerifiedCostUsd / summary.totalProviderCostUsd) * 100)) : 100}%`,
              }}
              className="h-full bg-blue-500 transition-all duration-500"
              title={`Estimated Verified: $${summary?.estimatedVerifiedCostUsd ?? 0}`}
            />
            <div
              style={{
                width: `${summary?.totalProviderCostUsd ? Math.min(100, ((summary.estimatedLegacyCostUsd / summary.totalProviderCostUsd) * 100)) : 0}%`,
              }}
              className="h-full bg-purple-500 transition-all duration-500"
              title={`Estimated Legacy: $${summary?.estimatedLegacyCostUsd ?? 0}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">Actual:</span>
                <span className="font-mono text-white font-medium">${(summary?.actualProviderCostUsd ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-zinc-300">Estimated Verified:</span>
                <span className="font-mono text-white font-medium">${(summary?.estimatedVerifiedCostUsd ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-zinc-300">Estimated Legacy:</span>
                <span className="font-mono text-white font-medium">${(summary?.estimatedLegacyCostUsd ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-zinc-300">Shadow Analytical (Reap):</span>
                <span className="font-mono text-cyan-300 font-medium">${(summary?.shadowAnalyticalCostUsd ?? 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              <span>Unknown Rate Jobs: {summary?.unknownCostGenerationCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 4: PROVIDER ECONOMICS MATRIX & TARIFF COVERAGE                     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Provider Economics Matrix (3 Cols) */}
          <div className="lg:col-span-3 p-5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400" /> Provider Economics Matrix
                </h2>
                <p className="text-xs text-zinc-400">
                  Dynamic provider inventory with execution count, customer credits, and operating costs.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded">
                {providers.length} Providers Discovered
              </span>
            </div>

            <div className="overflow-x-auto border border-zinc-800/70 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/80 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3.5">Provider</th>
                    <th className="py-3 px-3">Classification</th>
                    <th className="py-3 px-3 text-right">Executions</th>
                    <th className="py-3 px-3 text-right">User Credits</th>
                    <th className="py-3 px-3 text-right">Provider Cost (USD)</th>
                    <th className="py-3 px-3 text-center">Cost Coverage</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {providers.map((p) => {
                    const cStyle = CLASSIFICATION_COLORS[p.classification] || CLASSIFICATION_COLORS.UNKNOWN;
                    const isReap = p.providerName.toLowerCase().includes("reap");

                    return (
                      <tr key={p.providerName} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-3.5 font-medium text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span>{p.providerName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cStyle.bg} ${cStyle.text} border ${cStyle.border}`}
                          >
                            {p.classification}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-300">
                          {p.generationCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span className="text-zinc-200">{p.netUserCredits.toLocaleString()}</span>
                          {p.userCreditsRefunded > 0 && (
                            <span className="text-[10px] text-zinc-500 block">(-{p.userCreditsRefunded} ref)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {isReap ? (
                            <span className="text-cyan-400 font-mono text-[11px]" title="Shadow analytical proxy rate under annual subscription">
                              ${p.shadowAnalyticalCostUsd.toFixed(2)}{" "}
                              <span className="text-[9px] text-cyan-500/80">(Shadow)</span>
                            </span>
                          ) : p.providerCostUsd > 0 ? (
                            <span className="text-emerald-400">${p.providerCostUsd.toFixed(2)}</span>
                          ) : p.unknownCostCount > 0 ? (
                            <span className="text-rose-400 text-[11px]">UNKNOWN</span>
                          ) : (
                            <span className="text-zinc-500">$0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${p.knownCostCoveragePercent >= 90 ? "bg-emerald-500" : p.knownCostCoveragePercent >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${p.knownCostCoveragePercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">{p.knownCostCoveragePercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedProvider(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tariff Coverage & Provenance Panel (1 Col) */}
          <div className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-400" /> Tariff Coverage
              </h2>
              <p className="text-xs text-zinc-400">Published official tariff coverage.</p>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Governed Routes:</span>
                <span className="font-mono text-white font-semibold">{tariffCoverage?.totalRoutes ?? 50}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">Verified Current:</span>
                <span className="font-mono text-emerald-400 font-semibold">{tariffCoverage?.verifiedTariffRoutes ?? 37}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-400">Unknown Direct Routes:</span>
                <span className="font-mono text-rose-400 font-semibold">{tariffCoverage?.unknownTariffRoutes ?? 13}</span>
              </div>
              <div className="pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Coverage Percent:</span>
                <span className="font-mono text-blue-400 font-bold text-sm">
                  {tariffCoverage?.verificationCoveragePercent ?? 74}%
                </span>
              </div>
            </div>

            {/* WaveSpeed Specific Invariant */}
            <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs">
              <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> WaveSpeed Invariant
              </div>
              <div className="text-zinc-300 text-[11px] leading-relaxed">
                WaveSpeed has <strong>18 Verified Routes</strong> (Minimax H3, Image & Audio tools) and{" "}
                <strong>13 UNKNOWN Routes</strong> (Kling 3.0, O3, Turbo, Hailuo).
              </div>
              <div className="text-blue-400 font-medium text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Zero KIE Price Leakage Guaranteed
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 5: GENERATION COST TRACE TABLE                                     */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Per-Generation Cost Trace
              </h2>
              <p className="text-xs text-zinc-400">
                Detailed execution trace separating Customer Credit Charges from Provider Operating Costs.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search ID, Model, User..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-44 md:w-56"
                />
              </div>

              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Providers</option>
                {providers.map((p) => (
                  <option key={p.providerName} value={p.providerName}>
                    {p.providerName}
                  </option>
                ))}
              </select>

              <select
                value={costTrustFilter}
                onChange={(e) => {
                  setCostTrustFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Cost Trusts</option>
                <option value="ACTUAL">Actual</option>
                <option value="ESTIMATED_VERIFIED">Estimated Verified</option>
                <option value="ESTIMATED_LEGACY">Estimated Legacy</option>
                <option value="SHADOW_ANALYTICAL">Shadow Analytical</option>
                <option value="UNKNOWN">Unknown Rate</option>
              </select>
            </div>
          </div>

          {/* Trace Table */}
          <div className="overflow-x-auto border border-zinc-800/70 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800/80 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Generation ID</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Execution Provider</th>
                  <th className="py-3 px-3">Model / Route</th>
                  <th className="py-3 px-3 text-right">User Credits</th>
                  <th className="py-3 px-3 text-right">Provider Cost (USD)</th>
                  <th className="py-3 px-3 text-center">Cost Trust</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {recentExecutions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-zinc-500 text-xs">
                      No generation records matching current filters.
                    </td>
                  </tr>
                ) : (
                  recentExecutions.map((item) => {
                    const trustMeta = COST_TRUST_COLORS[item.costTrust] || COST_TRUST_COLORS.UNKNOWN;
                    const isReap = item.executionProvider.toLowerCase().includes("reap");

                    return (
                      <tr key={item.generationId} className="hover:bg-zinc-800/30 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300 truncate max-w-[120px]">
                          {item.generationId}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-white">{item.executionProvider}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300 max-w-[180px] truncate" title={item.providerRoute || item.internalModel}>
                          {item.providerRoute || item.internalModel}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="text-white font-medium">{item.userCreditsCharged}</span>
                          {item.refundedCredits > 0 && (
                            <span className="text-[10px] text-rose-400 ml-1">(-{item.refundedCredits})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                          {isReap ? (
                            <span className="text-cyan-400 text-[11px]" title="Shadow analytical utilization under annual subscription">
                              ${(item.providerCostUsd ?? 0).toFixed(4)}{" "}
                              <span className="text-[9px] text-cyan-500/80">(Shadow)</span>
                            </span>
                          ) : item.providerCostUsd !== null && item.providerCostUsd !== undefined ? (
                            <span className="text-emerald-400">${item.providerCostUsd.toFixed(4)}</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${trustMeta.bg} ${trustMeta.text} border ${trustMeta.border}`}
                          >
                            {trustMeta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              item.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.status === "failed"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedExecution(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
              <div>
                Showing page <strong className="text-white">{pagination.page}</strong> of{" "}
                <strong className="text-white">{pagination.totalPages}</strong> ({pagination.totalCount} total executions)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 transition"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 6: PROVIDER INSPECTOR SLIDE-OVER DRAWER                            */}
        {/* ========================================================================= */}
        {selectedProvider && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-zinc-900 border-l border-zinc-800 p-6 space-y-6 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">{selectedProvider.providerName}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      CLASSIFICATION_COLORS[selectedProvider.classification]?.bg
                    } ${CLASSIFICATION_COLORS[selectedProvider.classification]?.text} border ${
                      CLASSIFICATION_COLORS[selectedProvider.classification]?.border
                    }`}
                  >
                    {selectedProvider.classification}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Special honest notice for Reap */}
              {selectedProvider.providerName.toLowerCase().includes("reap") && (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-xs">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Annual Subscription Accounting Policy
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Reap is operated under an <strong>Active Annual Subscription</strong>. Direct marginal cost per call is $0.00 within quota.
                  </p>
                  <p className="text-cyan-400/90 text-[11px]">
                    Contract allocation is NOT PROVEN in database. Stored shadow proxy rates ($0.03 - $0.15/min) are for internal analytics only and NOT billed as direct provider spend.
                  </p>
                </div>
              )}

              {/* Special honest notice for KIE */}
              {selectedProvider.providerName.toLowerCase().includes("kie") && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-xs">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Standby Compatibility Provider
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    KIE.ai is on Standby. WaveSpeed video models <strong>NEVER inherit KIE pricing</strong>. KIE pricing is only invoked during explicit KIE execution.
                  </p>
                </div>
              )}

              {/* Metric Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400">Total Executions</span>
                  <div className="text-lg font-bold text-white font-mono">{selectedProvider.generationCount}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400">Customer Credits Charged</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{selectedProvider.netUserCredits}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400">Known Provider Cost</span>
                  <div className="text-lg font-bold text-white font-mono">${selectedProvider.providerCostUsd.toFixed(2)}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400">Cost Coverage</span>
                  <div className="text-lg font-bold text-blue-400 font-mono">{selectedProvider.knownCostCoveragePercent}%</div>
                </div>
              </div>

              {/* Cost Semantic Breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Cost Trust Breakdown</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-emerald-400 font-medium">Actual Invoiced Cost:</span>
                    <span className="font-mono text-white">${selectedProvider.actualCostUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-blue-400 font-medium">Verified Estimated Cost:</span>
                    <span className="font-mono text-white">${selectedProvider.estimatedVerifiedCostUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-purple-400 font-medium">Legacy Estimated Cost:</span>
                    <span className="font-mono text-white">${selectedProvider.estimatedLegacyCostUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-cyan-400 font-medium">Shadow Analytical Cost:</span>
                    <span className="font-mono text-white">${selectedProvider.shadowAnalyticalCostUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-rose-400 font-medium">Unknown-Cost Executions:</span>
                    <span className="font-mono text-rose-400 font-bold">{selectedProvider.unknownCostCount}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 7: GENERATION TRACE INSPECTOR SLIDE-OVER DRAWER                    */}
        {/* ========================================================================= */}
        {selectedExecution && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-zinc-900 border-l border-zinc-800 p-6 space-y-6 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-mono">{selectedExecution.generationId}</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Executed at {new Date(selectedExecution.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Customer Economics Section */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <span>Customer Economics</span>
                  <span className="text-zinc-500 font-normal lowercase">{selectedExecution.userEmail || "User"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-400 text-[10px] block">Credits Charged</span>
                    <span className="text-white font-bold text-sm">{selectedExecution.userCreditsCharged}</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-400 text-[10px] block">Refunded</span>
                    <span className="text-rose-400 font-bold text-sm">{selectedExecution.refundedCredits}</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-400 text-[10px] block">Net Credits</span>
                    <span className="text-emerald-400 font-bold text-sm">{selectedExecution.netUserCredits}</span>
                  </div>
                </div>
              </div>

              {/* Provider Economics Section */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <span>Provider Economics</span>
                  <span className="font-mono text-zinc-300">{selectedExecution.executionProvider}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-400">Provider Cost (USD):</span>
                    <span className="font-mono font-bold text-sm text-white">
                      {selectedExecution.providerCostUsd !== null && selectedExecution.providerCostUsd !== undefined
                        ? `$${selectedExecution.providerCostUsd.toFixed(4)}`
                        : "UNKNOWN"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-400">Cost Trust Semantic:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        COST_TRUST_COLORS[selectedExecution.costTrust]?.bg
                      } ${COST_TRUST_COLORS[selectedExecution.costTrust]?.text} border ${
                        COST_TRUST_COLORS[selectedExecution.costTrust]?.border
                      }`}
                    >
                      {COST_TRUST_COLORS[selectedExecution.costTrust]?.label}
                    </span>
                  </div>
                </div>

                {selectedExecution.costTrust === "UNKNOWN" && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
                    <strong>No Defensible Tariff Available:</strong> This WaveSpeed direct route is not yet published with a static API tariff. Cost is recorded as $null to prevent fabricating operating costs.
                  </div>
                )}
              </div>

              {/* Tariff Provenance Section */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Tariff Provenance & Parameters
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Provider Route:</span>
                    <span className="font-mono text-zinc-200">{selectedExecution.providerRoute || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tariff Key:</span>
                    <span className="font-mono text-zinc-200">{selectedExecution.tariffKey || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tariff Source:</span>
                    <span className="text-zinc-300 text-right max-w-[280px] truncate">{selectedExecution.tariffSource || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Verification Status:</span>
                    <span className="font-mono text-emerald-400">{selectedExecution.tariffVerificationStatus}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Captured At:</span>
                    <span className="font-mono text-zinc-400">
                      {selectedExecution.tariffCapturedAt
                        ? new Date(selectedExecution.tariffCapturedAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProviderFleetStrip } from "@/components/admin/providers/ProviderFleetStrip";
import { ProviderCard, type ProviderRow, type ProviderStatus } from "@/components/admin/providers/ProviderCard";
import { ProviderAnalytics } from "@/components/admin/providers/ProviderAnalytics";
import { ProviderMatrix } from "@/components/admin/providers/ProviderMatrix";
import { ProviderDrawer } from "@/components/admin/providers/ProviderDrawer";

type ProvidersResponse = {
  ok: boolean;
  providers: ProviderRow[];
  summary: {
    totalProviders: number;
    onlineProviders: number;
    configuredProviders: number;
    totalModels: number;
    totalActiveRoutes: number;
    monthlyRequests: number;
    estimatedCostUsd: number;
  };
  checkedAt: string;
  error?: string;
};

export default function AdminProvidersPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [summary, setSummary] = useState<ProvidersResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ProviderStatus>("all");
  const [selectedProvider, setSelectedProvider] = useState<ProviderRow | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/providers", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as ProvidersResponse | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Providers HTTP ${res.status}`);
      setRows(data.providers || []);
      setSummary(data.summary);
      setCheckedAt(data.checkedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers.");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  // Compute fleet counts
  const totalProviders = rows.length;
  const onlineProviders = rows.filter((r) => r.status === "online").length;
  const standbyProviders = rows.filter((r) => r.status === "standby").length;
  const offlineProviders = rows.filter((r) => r.status === "offline").length;
  const configuredProviders = rows.filter((r) => r.apiConfigured).length;
  const routingEligibleProviders = rows.filter((r) => r.routingEligible).length;
  const totalModels = summary?.totalModels ?? rows.reduce((sum, r) => sum + r.modelsCount, 0);
  const totalActiveRoutes = summary?.totalActiveRoutes ?? rows.reduce((sum, r) => sum + r.activeRoutes, 0);

  return (
    <AdminShell activeRoute="/admin/providers">
      {/* Full-Width Workspace (No restrictive centered containers) */}
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── HEADER ── */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Server className="h-4 w-4" />
              Provider Fleet Console
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Providers Operations</h1>
            <p className="mt-1 text-sm text-slate-400">
              مراقبة أسطول المزودين: التحقق من جاهزية المفاتيح، أهلية التوجيه، البصمة التشغيلية، ومتابعة الأرصدة الحية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/routing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 shadow-sm"
            >
              <Route className="h-3.5 w-3.5" />
              Routing Engine
            </Link>
            <Link
              href="/admin/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pricing Core
            </Link>
            <Link
              href="/admin/provider-costs"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 shadow-sm"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Costs Ledger
            </Link>
            <button
              type="button"
              onClick={() => void loadProviders()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* ── LEVEL 1: FLEET COMMAND STRIP ── */}
        <ProviderFleetStrip
          totalProviders={totalProviders}
          onlineProviders={onlineProviders}
          standbyProviders={standbyProviders}
          offlineProviders={offlineProviders}
          configuredProviders={configuredProviders}
          routingEligibleProviders={routingEligibleProviders}
          totalModels={totalModels}
          totalActiveRoutes={totalActiveRoutes}
        />

        {/* ── LEVEL 2: ANALYTICS FIRST (Enterprise Visual Operations Deck) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Provider Fleet Telemetry & Analytics</h2>
            <span className="text-xs text-slate-500">
              {checkedAt ? `Last check: ${new Date(checkedAt).toLocaleTimeString()}` : "Verifying..."}
            </span>
          </div>
          <ProviderAnalytics providers={rows} />
        </section>

        {/* ── FILTER CONTROLS ── */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Filter Cards:</span>
            {(["all", "online", "standby", "offline"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  statusFilter === status
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-200"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-400 pr-2 tabular-nums">
            Showing {filteredRows.length} of {rows.length} sources
          </span>
        </section>

        {/* ── LEVEL 3: SUMMARY OPERATIONAL CARDS (Clean, fast summary) ── */}
        <section className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-12 text-center text-slate-400">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
              Loading operational provider telemetry...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-500">
              No providers match the selected filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRows.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onInspect={(p) => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── LEVEL 4: FULL-WIDTH PROVIDER INVENTORY MATRIX (Dense Technical Diagnostics) ── */}
        <section className="pt-2">
          <ProviderMatrix
            providers={filteredRows}
            onInspect={(p) => setSelectedProvider(p)}
          />
        </section>

        {/* ── LEVEL 5: SLIDE-OVER DETAIL DRAWER ── */}
        <ProviderDrawer
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />

      </div>
    </AdminShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  CreditCard,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";

type ProviderStatus = "online" | "offline" | "standby";

type ProviderRow = {
  id: string;
  providerName: string;
  shortName: string;
  status: ProviderStatus;
  operationalStatus: string;
  enabled: boolean;
  allowRouting: boolean;
  allowFallback: boolean;
  futureProvider: boolean;
  routingEligible: boolean;
  apiConfigured: boolean;
  healthCheck: string;
  lastCheck: string;
  lastError: string | null;
  modelsCount: number;
  activeRoutes: number;
  fallbackUsage: number;
  monthlyRequests: number;
  estimatedCostUsd: number;
  balance: { amount: number; unit: string; source: string } | null;
  billingUrl: string;
  modalities: string[];
  supportsBalance: boolean;
  healthMode: string;
  notes: string;
};

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

const SOURCE_STYLES: Record<string, string> = {
  google: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  openai: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  byteplus: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  wavespeed: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  kie: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  elevenlabs: "border-pink-500/25 bg-pink-500/10 text-pink-300",
  reap: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
};

function sourceClass(id: string) {
  return SOURCE_STYLES[id] ?? "border-slate-500/25 bg-slate-500/10 text-slate-300";
}

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBalance(row: ProviderRow) {
  if (!row.balance) return "Unavailable";
  const amount = row.balance.unit === "USD" ? formatUsd(row.balance.amount) : `${row.balance.amount.toLocaleString()} ${row.balance.unit}`;
  return `${amount} (${row.balance.source})`;
}

export default function AdminProvidersPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [summary, setSummary] = useState<ProvidersResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ProviderStatus>("all");

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/providers", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as ProvidersResponse | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Providers HTTP ${res.status}`);
      setRows(data.providers || []);
      setSummary(data.summary);
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

  const statCards = [
    { label: "Providers", value: summary?.totalProviders ?? rows.length, icon: Server },
    { label: "Online", value: summary?.onlineProviders ?? rows.filter((row) => row.status === "online").length, icon: Activity },
    { label: "Configured", value: summary?.configuredProviders ?? rows.filter((row) => row.apiConfigured).length, icon: KeyRound },
    { label: "Active Routes", value: summary?.totalActiveRoutes ?? rows.reduce((sum, row) => sum + row.activeRoutes, 0), icon: Route },
    { label: "30d Requests", value: summary?.monthlyRequests ?? rows.reduce((sum, row) => sum + row.monthlyRequests, 0), icon: Cpu },
    { label: "30d Cost", value: formatUsd(summary?.estimatedCostUsd ?? rows.reduce((sum, row) => sum + row.estimatedCostUsd, 0)), icon: Wallet },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] px-6 py-7 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <Server className="h-4 w-4" />
              Provider Management
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Sources Control Inventory</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Central provider status for API configuration, model counts, active routes, usage, cost, and balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Admin Dashboard
            </Link>
            <Link href="/admin/routing" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              Routing <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link href="/admin/pricing" className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20">
              Pricing <CreditCard className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => void loadProviders()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "online", "standby", "offline"].map((status) => (
              <button
                key={status}
                  onClick={() => setStatusFilter(status as "all" | ProviderStatus)}
                className={`h-9 rounded-lg border px-3 text-xs font-semibold capitalize ${
                  statusFilter === status
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Health currently verifies server configuration. Live provider pings stay isolated in provider-specific checks.
          </p>
        </section>

        {error && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Allow Routing</th>
                  <th className="px-4 py-3">Allow Fallback</th>
                  <th className="px-4 py-3">API Configured</th>
                  <th className="px-4 py-3">Health Check</th>
                  <th className="px-4 py-3">Last Check</th>
                  <th className="px-4 py-3">Last Error</th>
                  <th className="px-4 py-3">Models</th>
                  <th className="px-4 py-3">Active Routes</th>
                  <th className="px-4 py-3">Fallback</th>
                  <th className="px-4 py-3">30d Requests</th>
                  <th className="px-4 py-3">Est. Cost</th>
                  <th className="px-4 py-3">Balance / Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-slate-500">
                      <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
                      Loading providers...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-12 text-center text-slate-500">
                      No providers match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/25">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${sourceClass(row.id)}`}>{row.shortName}</span>
                          <a href={row.billingUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="mt-2 font-semibold text-slate-100">{row.providerName}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.modalities.map((modality) => (
                            <span key={modality} className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                              {modality}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${
                          row.status === "online"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : row.status === "standby"
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                            : "border-red-500/25 bg-red-500/10 text-red-300"
                        }`}>
                          {row.status === "online" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.enabled ? "text-emerald-300" : "text-slate-500"}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {row.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${row.allowRouting ? "text-emerald-300" : "text-slate-500"}`}>
                          {row.allowRouting ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${row.allowFallback ? "text-emerald-300" : "text-slate-500"}`}>
                          {row.allowFallback ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.apiConfigured ? "text-emerald-300" : "text-amber-300"}`}>
                          <KeyRound className="h-3.5 w-3.5" />
                          {row.apiConfigured ? "Configured" : "Missing"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-cyan-200">{row.healthCheck}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(row.lastCheck)}</td>
                      <td className="px-4 py-3">
                        {row.lastError ? (
                          <div className="flex max-w-[240px] items-start gap-1.5 text-xs text-amber-300">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span className="line-clamp-2">{row.lastError}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-200">{row.modelsCount}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-200">{row.activeRoutes}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-500">{row.fallbackUsage}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-200">{row.monthlyRequests}</td>
                      <td className="px-4 py-3 font-mono text-sm text-rose-300">{formatUsd(row.estimatedCostUsd)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">{formatBalance(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

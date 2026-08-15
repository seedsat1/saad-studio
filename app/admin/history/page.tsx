"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Coins,
  Database,
  ExternalLink,
  Filter,
  History,
  RefreshCw,
  Search,
  Server,
} from "lucide-react";

type UnifiedJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
type CreditState = "charged" | "free" | "refunded" | "partially_refunded" | "unknown";

type HistoryRow = {
  generationId: string;
  jobId: string | null;
  featureId: string | null;
  userId: string;
  modelId: string | null;
  provider: string | null;
  routingSource: "control_center" | "legacy_fallback" | null;
  providerTaskId: string | null;
  status: UnifiedJobStatus;
  rawStatus: string | null;
  creditState: CreditState;
  creditsCharged: number | null;
  creditsRefunded: number | null;
  providerEstimatedCost: number | null;
  providerActualCost: number | null;
  createdAt: string | null;
  completedAt: string | null;
  duration: number | null;
  latencyMs: number | null;
  primaryResult: string | null;
  additionalOutputsCount: number | null;
  error: string | null;
  errorCode: string | null;
  providerUsage: Array<{
    id: string;
    provider: string | null;
    model: string | null;
    requestId: string | null;
    providerCostUsd: number | null;
    providerCostSource: string | null;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  creditLedger: {
    charged: number | null;
    refunded: number | null;
    entries: Array<{ id: string; delta: number; reason: string; createdAt: string | null }>;
  };
  observabilityGaps: string[];
};

type HistoryResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  rows: HistoryRow[];
  summary: {
    totalGenerations: number;
    completed: number;
    failed: number;
    processing: number;
    creditsCharged: number | null;
    creditsRefunded: number | null;
    providerUsageRecords: number;
    providerUsageLinked: number;
    providerUsageUnlinked: number;
    rowsWithProviderCost: number;
    rowsMissingProviderUsage: number;
  };
  sources: string[];
  observabilityGaps: string[];
  error?: string;
};

const STATUS_OPTIONS = ["all", "queued", "processing", "completed", "failed", "cancelled"];
const CREDIT_OPTIONS = ["all", "charged", "free", "refunded", "partially_refunded", "unknown"];
const BOOLEAN_OPTIONS = ["all", "yes", "no"];

const STATUS_STYLES: Record<UnifiedJobStatus, string> = {
  queued: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  processing: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  completed: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/25 bg-red-500/10 text-red-300",
  cancelled: "border-amber-500/25 bg-amber-500/10 text-amber-300",
};

const CREDIT_STYLES: Record<CreditState, string> = {
  charged: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  free: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  refunded: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  partially_refunded: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  unknown: "border-violet-500/25 bg-violet-500/10 text-violet-300",
};

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMs(value: number | null) {
  if (value === null) return "-";
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

export default function AdminHistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [creditState, setCreditState] = useState("all");
  const [featureId, setFeatureId] = useState("all");
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [hasError, setHasError] = useState("all");
  const [hasProviderCost, setHasProviderCost] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (overrides: { query?: string } = {}) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (creditState !== "all") params.set("creditState", creditState);
    if (featureId !== "all") params.set("featureId", featureId);
    if (provider.trim()) params.set("provider", provider.trim());
    if (modelId.trim()) params.set("modelId", modelId.trim());
    if (hasError !== "all") params.set("hasError", hasError);
    if (hasProviderCost !== "all") params.set("hasProviderCost", hasProviderCost);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const effectiveQuery = overrides.query ?? query;
    if (effectiveQuery.trim()) params.set("query", effectiveQuery.trim());
    params.set("limit", "150");

    try {
      const res = await fetch(`/api/admin/history?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as HistoryResponse | null;
      if (!json) throw new Error(`History HTTP ${res.status}`);
      setData(json);
      setSelectedId((current) => current && json.rows.some((row) => row.generationId === current) ? current : json.rows[0]?.generationId ?? null);
      if (!res.ok || !json.ok) setError(json.error ?? "History read model is unavailable.");
    } catch (err) {
      setData(null);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("query") ?? "";
    if (initialQuery) {
      setQuery(initialQuery);
      void loadHistory({ query: initialQuery });
      return;
    }
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.rows ?? [];
  const selected = useMemo(
    () => rows.find((row) => row.generationId === selectedId) ?? rows[0] ?? null,
    [rows, selectedId],
  );
  const featureOptions = useMemo(() => {
    const ids = Array.from(new Set(rows.map((row) => row.featureId ?? "unknown"))).sort();
    return ["all", ...ids];
  }, [rows]);

  const stats = [
    { label: "Total Generations", value: data?.summary.totalGenerations ?? 0, icon: History },
    { label: "Completed", value: data?.summary.completed ?? 0, icon: Database },
    { label: "Failed", value: data?.summary.failed ?? 0, icon: AlertTriangle },
    { label: "Processing", value: data?.summary.processing ?? 0, icon: Server },
    { label: "Credits Charged", value: valueOrDash(data?.summary.creditsCharged), icon: Coins },
    { label: "Credits Refunded", value: valueOrDash(data?.summary.creditsRefunded), icon: Coins },
    { label: "Provider Usage", value: data?.summary.providerUsageRecords ?? 0, icon: Server },
    { label: "With Provider Cost", value: data?.summary.rowsWithProviderCost ?? 0, icon: Database },
    { label: "Missing Usage", value: data?.summary.rowsMissingProviderUsage ?? 0, icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1720px] px-6 py-7 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <History className="h-4 w-4" />
              History / Logs / Usage
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Unified Generation History</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Read-only operational history built from persisted generation, provider usage, credit ledger, and job metadata. No analytics or runtime changes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Admin Dashboard
            </Link>
            <Link href="/admin/jobs" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              Jobs <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => void loadHistory()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {stats.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        {!data?.databaseAvailable && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Database unavailable. History is not loaded and no runtime state was changed.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        {data?.observabilityGaps.length ? (
          <section className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">Observability Gaps</div>
            <div className="grid gap-2 lg:grid-cols-2">
              {data.observabilityGaps.map((gap) => (
                <div key={gap} className="rounded-md border border-amber-500/20 bg-slate-950/40 px-3 py-2 text-xs text-amber-100">
                  {gap}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.35fr_repeat(7,minmax(0,1fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search generation, task, provider, model..." className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
            </label>
            <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <FilterSelect label="Credit" value={creditState} options={CREDIT_OPTIONS} onChange={setCreditState} />
            <FilterSelect label="Feature" value={featureId} options={featureOptions} onChange={setFeatureId} />
            <FilterSelect label="Has Error" value={hasError} options={BOOLEAN_OPTIONS} onChange={setHasError} />
            <FilterSelect label="Has Cost" value={hasProviderCost} options={BOOLEAN_OPTIONS} onChange={setHasProviderCost} />
            <FilterInput label="Provider" value={provider} onChange={setProvider} />
            <button onClick={() => void loadHistory()} className="mt-5 h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-bold uppercase text-cyan-200 hover:bg-cyan-500/20">
              Apply
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterInput label="Model" value={modelId} onChange={setModelId} />
            <FilterInput label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
            <FilterInput label="Date To" type="date" value={dateTo} onChange={setDateTo} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Generation</th>
                    <th className="px-4 py-3">Feature</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Provider Cost</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Gaps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {rows.map((row) => (
                    <tr key={row.generationId} onClick={() => setSelectedId(row.generationId)} className={`cursor-pointer hover:bg-slate-800/35 ${selected?.generationId === row.generationId ? "bg-cyan-500/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-200">{row.generationId}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-500">{row.providerTaskId ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.featureId ?? "unknown"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-300">{valueOrDash(row.provider)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{valueOrDash(row.modelId)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${CREDIT_STYLES[row.creditState]}`}>
                          {row.creditState.replaceAll("_", " ")}
                        </span>
                        <div className="mt-1 text-xs text-slate-400">{valueOrDash(row.creditsCharged)} / refund {valueOrDash(row.creditsRefunded)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        actual {valueOrDash(row.providerActualCost)}
                        <div className="text-slate-500">est {valueOrDash(row.providerEstimatedCost)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">{row.observabilityGaps.length || "-"}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                        No history rows match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <HistoryDetails row={selected} sources={data?.sources ?? []} />
        </section>
      </div>
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold uppercase text-slate-200 outline-none focus:border-cyan-500/50">
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-950 text-slate-200">
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
    </label>
  );
}

function HistoryDetails({ row, sources }: { row: HistoryRow | null; sources: string[] }) {
  if (!row) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-900/45 p-5 text-sm text-slate-500">
        Select a generation to inspect history and usage.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/45 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Generation History</p>
          <h2 className="mt-2 font-mono text-sm font-bold text-white">{row.generationId}</h2>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[row.status]}`}>
          {row.status}
        </span>
      </div>

      <DetailGroup title="Identity">
        <DetailRow label="Job ID" value={row.jobId ?? "-"} mono />
        <DetailRow label="Feature" value={row.featureId ?? "unknown"} mono />
        <DetailRow label="User" value={row.userId} mono />
      </DetailGroup>

      <DetailGroup title="Provider / Routing">
        <DetailRow label="Provider" value={row.provider ?? "-"} />
        <DetailRow label="Model" value={row.modelId ?? "-"} mono />
        <DetailRow label="Routing Source" value={row.routingSource ?? "-"} />
        <DetailRow label="Request / Task ID" value={row.providerTaskId ?? "-"} mono />
      </DetailGroup>

      <DetailGroup title="Credits / Cost">
        <DetailRow label="Credit State" value={row.creditState.replaceAll("_", " ")} />
        <DetailRow label="Credits Charged" value={valueOrDash(row.creditsCharged)} />
        <DetailRow label="Credits Refunded" value={valueOrDash(row.creditsRefunded)} />
        <DetailRow label="Provider Estimated Cost" value={valueOrDash(row.providerEstimatedCost)} />
        <DetailRow label="Provider Actual Cost" value={valueOrDash(row.providerActualCost)} />
      </DetailGroup>

      <DetailGroup title="Timeline">
        <DetailRow label="Created" value={formatDate(row.createdAt)} />
        <DetailRow label="Completed" value={formatDate(row.completedAt)} />
        <DetailRow label="Latency" value={formatMs(row.latencyMs)} />
        <DetailRow label="Duration" value={valueOrDash(row.duration)} />
      </DetailGroup>

      <DetailGroup title="Result / Error">
        <DetailRow label="Primary Result" value={row.primaryResult ?? "-"} mono />
        <DetailRow label="Additional Outputs" value={valueOrDash(row.additionalOutputsCount)} />
        <DetailRow label="Error" value={row.error ?? "-"} />
        <DetailRow label="Error Code" value={row.errorCode ?? "-"} />
      </DetailGroup>

      <DetailGroup title="Provider Usage">
        <div className="space-y-2">
          {row.providerUsage.length ? row.providerUsage.map((usage) => (
            <div key={usage.id} className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
              <div className="font-semibold text-slate-200">{usage.provider ?? "-"} / {usage.status ?? "-"}</div>
              <div className="mt-1 font-mono text-slate-500">{usage.requestId ?? "-"}</div>
              <div className="mt-1 text-slate-400">cost {valueOrDash(usage.providerCostUsd)} / {usage.providerCostSource ?? "unknown"}</div>
            </div>
          )) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-500">No ProviderUsageRecord linked.</div>
          )}
        </div>
      </DetailGroup>

      <DetailGroup title="Credit Ledger">
        <div className="space-y-2">
          {row.creditLedger.entries.length ? row.creditLedger.entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
              <div className="font-semibold text-slate-200">{entry.reason}</div>
              <div className="mt-1">delta {entry.delta} / {formatDate(entry.createdAt)}</div>
            </div>
          )) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-500">No explicit CreditLedgerEntry loaded.</div>
          )}
        </div>
      </DetailGroup>

      <DetailGroup title="Observability Gaps">
        <div className="space-y-2">
          {row.observabilityGaps.length ? row.observabilityGaps.map((gap) => (
            <div key={gap} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {gap}
            </div>
          )) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-500">No row-level gap detected.</div>
          )}
        </div>
      </DetailGroup>

      <DetailGroup title="Sources">
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source} className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
              {source}
            </div>
          ))}
        </div>
      </DetailGroup>
    </aside>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 break-words text-slate-200 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</div>
    </div>
  );
}

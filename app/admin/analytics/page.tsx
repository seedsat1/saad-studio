"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Database,
  Filter,
  RefreshCw,
  Server,
  TrendingUp,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";

type UnifiedJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
type JobSourceType = "generation" | "transition" | "variation" | "reap" | "cinema";

type AnalyticsBucket = {
  key: string;
  total: number;
  completed: number;
  failed: number;
  processing: number;
  successRate: number | null;
  failureRate: number | null;
  averageLatencyMs: number | null;
};

type UsageBucket = {
  key: string;
  total: number;
  linked: number;
  unlinked: number;
  withActualCost: number;
  withEstimatedCost: number;
  missingActualCost: number;
  missingEstimatedCost: number;
  missingRequestIdentifiers: number;
};

type AnalyticsResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  sources: string[];
  overview: {
    totalGenerations: number;
    completed: number;
    failed: number;
    processing: number;
    successRate: number | null;
    failureRate: number | null;
    averageCompletionLatencyMs: number | null;
  };
  performance: {
    averageCompletionLatencyMs: number | null;
    queuedTooLong: number;
    processingTooLong: number;
    stuckJobs: number;
  };
  providers: AnalyticsBucket[];
  models: AnalyticsBucket[];
  features: AnalyticsBucket[];
  unknownFeatureCount: number;
  jobs: {
    total: number;
    byStatus: Record<UnifiedJobStatus, number>;
    bySource: Record<JobSourceType, number>;
    diagnostics: number;
  };
  usage: {
    total: number;
    linked: number;
    unlinked: number;
    linkCoverage: number | null;
    missingRequestIdentifiers: number;
    missingActualCost: number;
    missingEstimatedCost: number;
    byProvider: UsageBucket[];
    byModel: UsageBucket[];
    byStatus: Array<{ key: string; total: number }>;
  };
  credits: {
    totalCreditsCharged: number | null;
    totalCreditsRefunded: number | null;
    netCredits: number | null;
    freeGenerations: number;
    refundCoverageWarning: string | null;
  };
  costCoverage: {
    rowsWithActualCost: number;
    rowsWithEstimatedCostOnly: number;
    rowsWithNoCost: number;
    actualProviderCostTotal: number | null;
    estimatedProviderCostTotal: number | null;
    actualCostCoverage: number | null;
    estimatedCostCoverage: number | null;
    financialAnalyticsTrustworthy: false;
    warnings: string[];
  };
  dataQuality: {
    generationRows: number;
    providerUsageRows: number;
    linkedUsage: number;
    unlinkedUsage: number;
    providerUsageLinkCoverage: number | null;
    actualCostCoverage: number | null;
    estimatedCostCoverage: number | null;
    featureMappingCoverage: number | null;
    errorDataCoverage: number | null;
    rowsMissingProviderUsage: number;
    rowsMissingFeatureId: number;
  };
  partialMetrics: string[];
  refusedMetrics: string[];
  error?: string;
};

const STATUS_OPTIONS = ["all", "queued", "processing", "completed", "failed", "cancelled"];

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function percent(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatMs(value: number | null) {
  if (value === null) return "-";
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function money(value: number | null) {
  return value === null ? "-" : `$${value.toFixed(4)}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [featureId, setFeatureId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (provider.trim()) params.set("provider", provider.trim());
    if (modelId.trim()) params.set("modelId", modelId.trim());
    if (featureId.trim()) params.set("featureId", featureId.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const res = await fetch(`/api/admin/analytics?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as AnalyticsResponse | null;
      if (!json) throw new Error(`Analytics HTTP ${res.status}`);
      setData(json);
      if (!res.ok || !json.ok) setError(json.error ?? "Analytics read model is unavailable.");
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topProviders = data?.providers.slice(0, 8) ?? [];
  const topModels = data?.models.slice(0, 10) ?? [];
  const topFeatures = data?.features.slice(0, 10) ?? [];
  const usageProviders = data?.usage.byProvider.slice(0, 8) ?? [];
  const usageModels = data?.usage.byModel.slice(0, 8) ?? [];

  const overviewCards = [
    { label: "Total Generations", value: data?.overview.totalGenerations ?? 0, icon: BarChart3 },
    { label: "Completed", value: data?.overview.completed ?? 0, icon: Database },
    { label: "Failed", value: data?.overview.failed ?? 0, icon: AlertTriangle },
    { label: "Processing", value: data?.overview.processing ?? 0, icon: Server },
    { label: "Success Rate", value: percent(data?.overview.successRate ?? null), icon: TrendingUp },
    { label: "Failure Rate", value: percent(data?.overview.failureRate ?? null), icon: AlertTriangle },
    { label: "Link Coverage", value: percent(data?.dataQuality.providerUsageLinkCoverage ?? null), icon: TrendingUp },
    { label: "Stuck Jobs", value: data?.performance.stuckJobs ?? 0, icon: AlertTriangle },
  ];

  return (
    <AdminShell activeRoute="/admin/analytics">
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <BarChart3 className="h-4 w-4" />
              Operational Analytics
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Analytics Control Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Read-only analytics from persisted history, jobs, usage, and feature registry data. Financial views are coverage-limited and never mix actual with estimated cost.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/history" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              History
            </Link>
            <Link href="/admin/jobs" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Jobs
            </Link>
            <button onClick={() => void loadAnalytics()} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {overviewCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <FilterInput label="Provider" value={provider} onChange={setProvider} />
            <FilterInput label="Model" value={modelId} onChange={setModelId} />
            <FilterInput label="Feature" value={featureId} onChange={setFeatureId} />
            <FilterInput label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
            <FilterInput label="Date To" type="date" value={dateTo} onChange={setDateTo} />
            <button onClick={() => void loadAnalytics()} className="mt-5 h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-bold uppercase text-cyan-200 hover:bg-cyan-500/20">
              Apply
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_440px]">
          <div className="space-y-5">
            <MetricSection title="Providers" rows={topProviders} />
            <MetricSection title="Models" rows={topModels} />
            <MetricSection title="Features" rows={topFeatures} emptyLabel="Only proven feature ids are shown here." />
            <UsageSection title="Usage By Provider" rows={usageProviders} />
            <UsageSection title="Usage By Model" rows={usageModels} />
          </div>

          <aside className="space-y-5">
            <Panel title="Jobs">
              <SmallGrid rows={[
                ["Total", valueOrDash(data?.jobs.total)],
                ["Queued", valueOrDash(data?.jobs.byStatus.queued)],
                ["Processing", valueOrDash(data?.jobs.byStatus.processing)],
                ["Completed", valueOrDash(data?.jobs.byStatus.completed)],
                ["Failed", valueOrDash(data?.jobs.byStatus.failed)],
                ["Diagnostics", valueOrDash(data?.jobs.diagnostics)],
              ]} />
              <div className="mt-3 grid gap-2">
                {data ? Object.entries(data.jobs.bySource).map(([source, count]) => (
                  <div key={source} className="flex justify-between rounded-md bg-slate-950/45 px-3 py-2 text-xs">
                    <span className="uppercase text-slate-500">{source}</span>
                    <span className="font-semibold text-slate-200">{count}</span>
                  </div>
                )) : null}
              </div>
            </Panel>

            <Panel title="Credits">
              <SmallGrid rows={[
                ["Charged", valueOrDash(data?.credits.totalCreditsCharged)],
                ["Refunded", valueOrDash(data?.credits.totalCreditsRefunded)],
                ["Net Credits", valueOrDash(data?.credits.netCredits)],
                ["Free Generations", valueOrDash(data?.credits.freeGenerations)],
              ]} />
              {data?.credits.refundCoverageWarning ? (
                <Warning text={data.credits.refundCoverageWarning} />
              ) : null}
            </Panel>

            <Panel title="Cost Coverage">
              <SmallGrid rows={[
                ["Rows Actual", valueOrDash(data?.costCoverage.rowsWithActualCost)],
                ["Rows Estimated Only", valueOrDash(data?.costCoverage.rowsWithEstimatedCostOnly)],
                ["Rows No Cost", valueOrDash(data?.costCoverage.rowsWithNoCost)],
                ["Actual Cost Total", money(data?.costCoverage.actualProviderCostTotal ?? null)],
                ["Estimated Cost Total", money(data?.costCoverage.estimatedProviderCostTotal ?? null)],
                ["Actual Coverage", percent(data?.costCoverage.actualCostCoverage ?? null)],
                ["Estimated Coverage", percent(data?.costCoverage.estimatedCostCoverage ?? null)],
              ]} />
              <Warning text="Financial analytics are PARTIAL / COVERAGE-LIMITED. Profit, true margin, and net revenue are intentionally not computed." />
            </Panel>

            <Panel title="Data Quality / Coverage">
              <SmallGrid rows={[
                ["Generation Rows", valueOrDash(data?.dataQuality.generationRows)],
                ["ProviderUsage Rows", valueOrDash(data?.dataQuality.providerUsageRows)],
                ["Linked Usage", valueOrDash(data?.dataQuality.linkedUsage)],
                ["Unlinked Usage", valueOrDash(data?.dataQuality.unlinkedUsage)],
                ["Usage Link Coverage", percent(data?.dataQuality.providerUsageLinkCoverage ?? null)],
                ["Actual Cost Coverage", percent(data?.dataQuality.actualCostCoverage ?? null)],
                ["Estimated Cost Coverage", percent(data?.dataQuality.estimatedCostCoverage ?? null)],
                ["Feature Mapping Coverage", percent(data?.dataQuality.featureMappingCoverage ?? null)],
                ["Error Data Coverage", percent(data?.dataQuality.errorDataCoverage ?? null)],
                ["Rows Missing Usage", valueOrDash(data?.dataQuality.rowsMissingProviderUsage)],
                ["Rows Missing Feature", valueOrDash(data?.dataQuality.rowsMissingFeatureId)],
              ]} />
            </Panel>

            <Panel title="Partial Metrics">
              <NoticeList items={data?.partialMetrics ?? []} empty="No partial metric warning for the current filtered rows." />
            </Panel>

            <Panel title="Refused Metrics">
              <NoticeList items={data?.refusedMetrics ?? []} empty="No refused metrics." />
            </Panel>

            <Panel title="Sources">
              <NoticeList items={data?.sources ?? []} empty="No sources loaded." />
            </Panel>
          </aside>
        </section>
      </div>
    </AdminShell>
  );
}

function MetricSection({ title, rows, emptyLabel = "No rows." }: { title: string; rows: AnalyticsBucket[]; emptyLabel?: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
      <div className="border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Processing</th>
              <th className="px-4 py-3">Success Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">{row.key}</td>
                <td className="px-4 py-3 text-slate-300">{row.total}</td>
                <td className="px-4 py-3 text-emerald-300">{row.completed}</td>
                <td className="px-4 py-3 text-red-300">{row.failed}</td>
                <td className="px-4 py-3 text-cyan-300">{row.processing}</td>
                <td className="px-4 py-3 text-slate-300">{percent(row.successRate)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsageSection({ title, rows }: { title: string; rows: UsageBucket[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
      <div className="border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Linked</th>
              <th className="px-4 py-3">Unlinked</th>
              <th className="px-4 py-3">Actual Cost</th>
              <th className="px-4 py-3">Estimated Cost</th>
              <th className="px-4 py-3">Missing Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">{row.key}</td>
                <td className="px-4 py-3 text-slate-300">{row.total}</td>
                <td className="px-4 py-3 text-emerald-300">{row.linked}</td>
                <td className="px-4 py-3 text-amber-300">{row.unlinked}</td>
                <td className="px-4 py-3 text-slate-300">{row.withActualCost}</td>
                <td className="px-4 py-3 text-slate-300">{row.withEstimatedCost}</td>
                <td className="px-4 py-3 text-slate-300">{row.missingRequestIdentifiers}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No usage rows.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function SmallGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-md bg-slate-950/45 px-3 py-2 text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="font-semibold text-slate-200">{value}</span>
        </div>
      ))}
    </div>
  );
}

function NoticeList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
          {item}
        </div>
      ))}
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      {text}
    </div>
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

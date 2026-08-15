"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  Braces,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

type UnifiedJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
type JobSourceType = "generation" | "transition" | "variation" | "reap" | "cinema";

type UnifiedJobView = {
  jobId: string;
  sourceType: JobSourceType;
  generationId: string | null;
  featureId: string | null;
  userId: string | null;
  modelId: string | null;
  provider: string | null;
  providerTaskId: string | null;
  routingSource: "control_center" | "legacy_fallback" | null;
  status: UnifiedJobStatus;
  rawStatus: string | null;
  progress: number | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  creditsCharged: number | null;
  mediaUrl: string | null;
  result: string | null;
  refundState: string;
  providerUsage: {
    id: string;
    provider: string | null;
    providerModel: string | null;
    providerRequestId: string | null;
    status: string | null;
    providerCostUsd: number | null;
    providerCostSource: string | null;
  } | null;
  diagnostics: Array<{ code: string; label: string; severity: "warning" | "error" }>;
};

type JobsResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  jobs: UnifiedJobView[];
  summary: {
    totalDisplayed: number;
    byStatus: Record<UnifiedJobStatus, number>;
    bySource: Record<JobSourceType, number>;
    diagnostics: number;
  };
  sources: Array<{ sourceType: JobSourceType; linked: boolean; count: number; reason?: string }>;
  diagnosticsCatalog: Array<{ code: string; label: string }>;
  unlinkedSources: Array<{ sourceType: JobSourceType; reason: string }>;
  error?: string;
};

const STATUS_OPTIONS = ["all", "queued", "processing", "completed", "failed", "cancelled"];
const SOURCE_OPTIONS = ["all", "generation", "transition", "variation", "reap", "cinema"];

const STATUS_STYLES: Record<UnifiedJobStatus, string> = {
  queued: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  processing: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  completed: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/25 bg-red-500/10 text-red-300",
  cancelled: "border-amber-500/25 bg-amber-500/10 text-amber-300",
};

const SOURCE_STYLES: Record<JobSourceType, string> = {
  generation: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300",
  transition: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  variation: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  reap: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  cinema: "border-amber-500/25 bg-amber-500/10 text-amber-300",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export default function AdminJobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [featureId, setFeatureId] = useState("all");
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (sourceType !== "all") params.set("sourceType", sourceType);
    if (featureId !== "all") params.set("featureId", featureId);
    if (provider.trim()) params.set("provider", provider.trim());
    if (modelId.trim()) params.set("modelId", modelId.trim());
    if (query.trim()) params.set("query", query.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("limit", "100");

    try {
      const res = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as JobsResponse | null;
      if (!json) throw new Error(`Jobs HTTP ${res.status}`);
      setData(json);
      setSelectedId((current) => current && json.jobs.some((job) => job.jobId === current) ? current : json.jobs[0]?.jobId ?? null);
      if (!res.ok || !json.ok) setError(json.error ?? "Jobs read model is unavailable.");
    } catch (err) {
      setData(null);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobs = data?.jobs ?? [];
  const selected = useMemo(
    () => jobs.find((job) => job.jobId === selectedId) ?? jobs[0] ?? null,
    [jobs, selectedId],
  );
  const featureOptions = useMemo(() => {
    const ids = Array.from(new Set(jobs.map((job) => job.featureId ?? "unknown"))).sort();
    return ["all", ...ids];
  }, [jobs]);

  const stats = [
    { label: "All Jobs", value: data?.summary.totalDisplayed ?? 0, icon: Database },
    { label: "Queued", value: data?.summary.byStatus.queued ?? 0, icon: Clock3 },
    { label: "Processing", value: data?.summary.byStatus.processing ?? 0, icon: Activity },
    { label: "Completed", value: data?.summary.byStatus.completed ?? 0, icon: Braces },
    { label: "Failed", value: data?.summary.byStatus.failed ?? 0, icon: AlertTriangle },
    { label: "Diagnostics", value: data?.summary.diagnostics ?? 0, icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1680px] px-6 py-7 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <Database className="h-4 w-4" />
              Jobs Control Layer
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Unified Jobs Read Model</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Read-only view over current generation, workflow, and provider task records. No queue, worker, retry, cancel, or runtime behavior is changed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Admin Dashboard
            </Link>
            <Link href="/admin/features" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              Features <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => void loadJobs()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        {!data?.databaseAvailable && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Database unavailable. Jobs are not loaded and no runtime state was changed.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.35fr_repeat(6,minmax(0,1fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job, task, model, provider..." className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
            </label>
            <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <FilterSelect label="Job Source" value={sourceType} options={SOURCE_OPTIONS} onChange={setSourceType} />
            <FilterSelect label="Feature" value={featureId} options={featureOptions} onChange={setFeatureId} />
            <FilterInput label="Provider" value={provider} onChange={setProvider} />
            <FilterInput label="Model" value={modelId} onChange={setModelId} />
            <button onClick={() => void loadJobs()} className="mt-5 h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-bold uppercase text-cyan-200 hover:bg-cyan-500/20">
              Apply
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterInput label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
            <FilterInput label="Date To" type="date" value={dateTo} onChange={setDateTo} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Feature</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {jobs.map((job) => (
                    <tr key={`${job.sourceType}:${job.jobId}`} onClick={() => setSelectedId(job.jobId)} className={`cursor-pointer hover:bg-slate-800/35 ${selected?.jobId === job.jobId ? "bg-cyan-500/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-200">{job.jobId}</div>
                        <div className="mt-2">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${SOURCE_STYLES[job.sourceType]}`}>
                            {job.sourceType}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{job.featureId ?? "unknown"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-300">{valueOrDash(job.provider)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{valueOrDash(job.modelId)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[job.status]}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-300">{valueOrDash(job.creditsCharged)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">{job.diagnostics.length ? job.diagnostics.map((item) => item.label).join(", ") : "-"}</td>
                    </tr>
                  ))}
                  {!loading && jobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                        No jobs match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <JobDetails job={selected} sources={data?.sources ?? []} />
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

function JobDetails({ job, sources }: { job: UnifiedJobView | null; sources: JobsResponse["sources"] }) {
  if (!job) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-900/45 p-5 text-sm text-slate-500">
        Select a job to inspect its read-only state.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/45 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Job Details</p>
          <h2 className="mt-2 font-mono text-sm font-bold text-white">{job.jobId}</h2>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold uppercase ${STATUS_STYLES[job.status]}`}>
          {job.status}
        </span>
      </div>

      <DetailGroup title="Identity">
        <DetailRow label="Source Type" value={job.sourceType} />
        <DetailRow label="Feature" value={job.featureId ?? "unknown"} mono />
        <DetailRow label="Generation ID" value={job.generationId ?? "-"} mono />
        {job.generationId ? (
          <Link href={`/admin/history?query=${encodeURIComponent(job.generationId)}`} className="block rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
            Open Generation History
          </Link>
        ) : null}
        <DetailRow label="User" value={job.userId ?? "-"} mono />
      </DetailGroup>

      <DetailGroup title="Provider">
        <DetailRow label="Model" value={job.modelId ?? "-"} mono />
        <DetailRow label="Provider" value={job.provider ?? "-"} />
        <DetailRow label="Routing Source" value={job.routingSource ?? "-"} />
        <DetailRow label="Provider Task ID" value={job.providerTaskId ?? "-"} mono />
      </DetailGroup>

      <DetailGroup title="Pricing/Credits">
        <DetailRow label="Credits Charged" value={valueOrDash(job.creditsCharged)} />
        <DetailRow label="Refund State" value={job.refundState} />
        <DetailRow label="Provider Cost" value={valueOrDash(job.providerUsage?.providerCostUsd)} />
        <DetailRow label="Provider Usage" value={job.providerUsage ? `${job.providerUsage.provider ?? "-"} / ${job.providerUsage.status ?? "-"}` : "-"} />
      </DetailGroup>

      <DetailGroup title="Timeline">
        <DetailRow label="Created" value={formatDate(job.createdAt)} />
        <DetailRow label="Started" value={formatDate(job.startedAt)} />
        <DetailRow label="Completed" value={formatDate(job.completedAt)} />
        <DetailRow label="Progress" value={job.progress == null ? "-" : `${job.progress}%`} />
      </DetailGroup>

      <DetailGroup title="Result/Error">
        <DetailRow label="Result" value={job.result ?? "-"} mono />
        <DetailRow label="Media URL" value={job.mediaUrl ?? "-"} mono />
        <DetailRow label="Error" value={job.error ?? "-"} />
      </DetailGroup>

      <DetailGroup title="Diagnostics">
        <div className="space-y-2">
          {job.diagnostics.length ? job.diagnostics.map((item) => (
            <div key={item.code} className={`rounded-lg border px-3 py-2 text-xs ${item.severity === "error" ? "border-red-500/25 bg-red-500/10 text-red-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
              {item.label}
            </div>
          )) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-500">No diagnostics detected.</div>
          )}
        </div>
      </DetailGroup>

      <DetailGroup title="Sources">
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.sourceType} className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
              <span className="font-bold uppercase">{source.sourceType}</span>
              <span className="ml-2 text-slate-500">{source.count} rows</span>
              {!source.linked && source.reason ? <div className="mt-1 text-slate-500">{source.reason}</div> : null}
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

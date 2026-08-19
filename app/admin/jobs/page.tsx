"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
  Copy,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";

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
  updatedAt: string | null;
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

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "generation", label: "Generation" },
  { value: "transition", label: "Transition" },
  { value: "variation", label: "Variation" },
  { value: "reap", label: "Reap" },
  { value: "cinema", label: "Cinema" },
];

const STATUS_BADGE_STYLES: Record<UnifiedJobStatus, { bg: string; text: string; border: string; dot: string }> = {
  queued: {
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
  },
  processing: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    dot: "bg-cyan-400 animate-pulse",
  },
  completed: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  failed: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400",
  },
  cancelled: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
};

const SOURCE_TAG_STYLES: Record<JobSourceType, { bg: string; text: string; border: string }> = {
  generation: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-300", border: "border-fuchsia-500/25" },
  transition: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/25" },
  variation: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/25" },
  reap: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/25" },
  cinema: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/25" },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function timeAgo(value: string | null) {
  if (!value) return "-";
  try {
    const ms = Date.now() - new Date(value).getTime();
    if (ms < 0) return "just now";
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "-";
  }
}

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export default function AdminJobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [selectedJob, setSelectedJob] = useState<UnifiedJobView | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters State
  const [status, setStatus] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [featureId, setFeatureId] = useState("all");
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [diagnosticsOnly, setDiagnosticsOnly] = useState(false);
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

      // Keep drawer in sync if open
      if (selectedJob) {
        const updated = json.jobs.find((j) => j.jobId === selectedJob.jobId);
        if (updated) setSelectedJob(updated);
      }

      if (!res.ok || !json.ok) setError(json.error ?? "Jobs read model is unavailable.");
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sourceType, featureId]);

  const rawJobs = data?.jobs ?? [];

  // Client-side diagnostics-only filter toggle
  const jobs = useMemo(() => {
    if (!diagnosticsOnly) return rawJobs;
    return rawJobs.filter((j) => j.diagnostics && j.diagnostics.length > 0);
  }, [rawJobs, diagnosticsOnly]);

  const featureOptions = useMemo(() => {
    const ids = Array.from(new Set(rawJobs.map((job) => job.featureId ?? "unknown"))).sort();
    return ["all", ...ids];
  }, [rawJobs]);

  const handleRowClick = (job: UnifiedJobView) => {
    setSelectedJob(job);
    setDrawerOpen(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasActiveFilters =
    status !== "all" ||
    sourceType !== "all" ||
    featureId !== "all" ||
    provider.trim() !== "" ||
    modelId.trim() !== "" ||
    query.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    diagnosticsOnly;

  const clearFilters = () => {
    setStatus("all");
    setSourceType("all");
    setFeatureId("all");
    setProvider("");
    setModelId("");
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setDiagnosticsOnly(false);
  };

  return (
    <AdminShell activeRoute="/admin/jobs">
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ══════════════════════════════════════════════════════════════════
            LEVEL 1: JOBS COMMAND HEADER
            ══════════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                Jobs Operations Layer
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400">
                {data?.summary.totalDisplayed ?? 0} In-Memory Telemetry Records
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Unified Jobs & Queue Operations
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Live operational read model unifying Generation, Transition, Variation, Reap, and Cinema task lifecycles with anomaly diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/features"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Product Features
              <ArrowUpRight className="h-3 w-3 opacity-60" />
            </Link>
            <button
              onClick={() => void loadJobs()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              Refresh Queue
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════
            LEVEL 2: QUEUE LIFECYCLE COMMAND STRIP & SOURCE DISTRIBUTION
            ══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          {/* Main Connected Stage Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Stage: ALL */}
            <button
              type="button"
              onClick={() => { setStatus("all"); setDiagnosticsOnly(false); }}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                status === "all" && !diagnosticsOnly
                  ? "border-cyan-500/60 bg-cyan-500/10 shadow-sm shadow-cyan-950/50 ring-1 ring-cyan-500/30"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">All Workloads</span>
                <Database className="h-3.5 w-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold text-white font-mono">
                {data?.summary.totalDisplayed ?? 0}
              </div>
            </button>

            {/* Stage: QUEUED */}
            <button
              type="button"
              onClick={() => { setStatus("queued"); setDiagnosticsOnly(false); }}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                status === "queued"
                  ? "border-slate-400 bg-slate-500/20 shadow-sm ring-1 ring-slate-400/30"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-slate-300 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">Queued</span>
                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-200 font-mono">
                {data?.summary.byStatus.queued ?? 0}
              </div>
            </button>

            {/* Stage: PROCESSING */}
            <button
              type="button"
              onClick={() => { setStatus("processing"); setDiagnosticsOnly(false); }}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                status === "processing"
                  ? "border-cyan-500 bg-cyan-500/20 shadow-sm shadow-cyan-950/50 ring-1 ring-cyan-500/40"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">In-Flight</span>
                <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-cyan-300 font-mono">
                {data?.summary.byStatus.processing ?? 0}
              </div>
            </button>

            {/* Stage: COMPLETED */}
            <button
              type="button"
              onClick={() => { setStatus("completed"); setDiagnosticsOnly(false); }}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                status === "completed"
                  ? "border-emerald-500 bg-emerald-500/20 shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-500/40"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">Completed</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-300 font-mono">
                {data?.summary.byStatus.completed ?? 0}
              </div>
            </button>

            {/* Stage: FAILED */}
            <button
              type="button"
              onClick={() => { setStatus("failed"); setDiagnosticsOnly(false); }}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                status === "failed"
                  ? "border-rose-500 bg-rose-500/20 shadow-sm shadow-rose-950/50 ring-1 ring-rose-500/40"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">Failed</span>
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-rose-300 font-mono">
                {data?.summary.byStatus.failed ?? 0}
              </div>
            </button>

            {/* Stage: DIAGNOSTICS */}
            <button
              type="button"
              onClick={() => setDiagnosticsOnly((prev) => !prev)}
              className={`rounded-xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                diagnosticsOnly
                  ? "border-amber-500 bg-amber-500/20 shadow-sm shadow-amber-950/50 ring-1 ring-amber-500/40"
                  : "border-slate-800/80 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span className="uppercase tracking-wider text-[10px]">Diagnostics</span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-300 font-mono">
                  {data?.summary.diagnostics ?? 0}
                </span>
                {(data?.summary.diagnostics ?? 0) > 0 && (
                  <span className="text-[10px] uppercase font-bold text-amber-400/80">
                    Needs Triage
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Compact Source Distribution Strip */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/40 px-3.5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
              <Layers className="h-3 w-3" />
              Source Split:
            </span>
            {SOURCE_OPTIONS.filter((s) => s.value !== "all").map((s) => {
              const count = data?.summary.bySource[s.value as JobSourceType] ?? 0;
              const active = sourceType === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSourceType((current) => (current === s.value ? "all" : s.value))}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white border border-white/20 shadow-sm"
                      : "bg-slate-950/40 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span className="capitalize">{s.label}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Database Offline Banner */}
        {!data?.databaseAvailable && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">Database Read Layer Unavailable</p>
              <p className="text-xs text-red-300/80 mt-0.5">
                Jobs telemetry could not be loaded from database replicas. No execution or queue state was modified.
              </p>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            LEVEL 3: ENTERPRISE FILTER / SEARCH TOOLBAR
            ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
              Filter & Search Control
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-2 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void loadJobs(); }}
                placeholder="Search Job ID, Task ID, Model, Error..."
                className="h-9 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>

            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500/60"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-950">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Source Select */}
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500/60"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-950">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Feature Select */}
            <select
              value={featureId}
              onChange={(e) => setFeatureId(e.target.value)}
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500/60"
            >
              <option value="all" className="bg-slate-950">All Features</option>
              {featureOptions.filter((f) => f !== "all").map((f) => (
                <option key={f} value={f} className="bg-slate-950">
                  {f}
                </option>
              ))}
            </select>

            {/* Provider Input */}
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void loadJobs(); }}
              placeholder="Filter Provider..."
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/60"
            />

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs px-3 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Filter className="h-3 w-3" />
              Apply
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            LEVEL 4: FULL-WIDTH ENTERPRISE JOBS TABLE
            ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800/90 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 w-32">Status</th>
                  <th className="px-4 py-3.5">Job / Source</th>
                  <th className="px-4 py-3.5">Product Feature</th>
                  <th className="px-4 py-3.5">Model</th>
                  <th className="px-4 py-3.5">Provider & Task ID</th>
                  <th className="px-4 py-3.5">Credits / Cost</th>
                  <th className="px-4 py-3.5">Age / Created</th>
                  <th className="px-4 py-3.5">Diagnostics</th>
                  <th className="px-4 py-3.5 text-right w-20">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {jobs.map((job) => {
                  const statusStyle = STATUS_BADGE_STYLES[job.status];
                  const sourceStyle = SOURCE_TAG_STYLES[job.sourceType];
                  const isSelected = selectedJob?.jobId === job.jobId;

                  return (
                    <tr
                      key={`${job.sourceType}:${job.jobId}`}
                      onClick={() => handleRowClick(job)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-cyan-500/10"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {job.status}
                        </span>
                        {job.progress !== null && (
                          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                            {job.progress}%
                          </span>
                        )}
                      </td>

                      {/* Job ID & Source */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {job.jobId}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${sourceStyle.bg} ${sourceStyle.text} ${sourceStyle.border}`}
                          >
                            {job.sourceType}
                          </span>
                          {job.routingSource && (
                            <span className="text-[9px] font-mono text-slate-500">
                              {job.routingSource === "control_center" ? "CC" : "Fallback"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Feature */}
                      <td className="px-4 py-3">
                        {job.featureId ? (
                          <span className="font-mono text-xs text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                            {job.featureId}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Model */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-300">
                          {valueOrDash(job.modelId)}
                        </span>
                      </td>

                      {/* Provider & Task ID */}
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-200">
                          {valueOrDash(job.provider)}
                        </div>
                        {job.providerTaskId ? (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5" title={job.providerTaskId}>
                            {job.providerTaskId}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">No Task ID</span>
                        )}
                      </td>

                      {/* Credits / Cost */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-200 font-semibold font-mono">
                          <span>{valueOrDash(job.creditsCharged)}</span>
                          <span className="text-[10px] text-slate-500 font-sans font-normal">credits</span>
                        </div>
                        {job.providerUsage?.providerCostUsd !== null && job.providerUsage?.providerCostUsd !== undefined ? (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            ${job.providerUsage.providerCostUsd.toFixed(4)}
                          </div>
                        ) : null}
                      </td>

                      {/* Age / Created */}
                      <td className="px-4 py-3">
                        <div className="text-slate-300 font-medium">{timeAgo(job.createdAt)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{formatDate(job.createdAt)}</div>
                      </td>

                      {/* Diagnostics */}
                      <td className="px-4 py-3">
                        {job.diagnostics && job.diagnostics.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {job.diagnostics.map((diag) => (
                              <span
                                key={diag.code}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  diag.severity === "error"
                                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{diag.label}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800/60 text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 transition-all">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {!loading && jobs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500 space-y-2">
                      <Database className="h-8 w-8 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-400">No jobs match the active filters.</p>
                      <p className="text-xs text-slate-600">Try adjusting status, source, or query parameters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            LEVEL 5: SLIDE-OVER JOB INSPECTOR DRAWER
            ══════════════════════════════════════════════════════════════════ */}
        {drawerOpen && selectedJob && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Slide-Over Panel */}
            <aside className="relative w-full max-w-[500px] h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col z-10 overflow-y-auto font-sans">
              {/* Drawer Header */}
              <div className="sticky top-0 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 p-5 flex items-start justify-between gap-3 z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_BADGE_STYLES[selectedJob.status].bg
                      } ${STATUS_BADGE_STYLES[selectedJob.status].text} ${
                        STATUS_BADGE_STYLES[selectedJob.status].border
                      }`}
                    >
                      {selectedJob.status}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        SOURCE_TAG_STYLES[selectedJob.sourceType].bg
                      } ${SOURCE_TAG_STYLES[selectedJob.sourceType].text} ${
                        SOURCE_TAG_STYLES[selectedJob.sourceType].border
                      }`}
                    >
                      {selectedJob.sourceType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <h2 className="font-mono text-sm font-bold text-white break-all">
                      {selectedJob.jobId}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedJob.jobId, "jobId")}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      title="Copy Job ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {copiedId === "jobId" && (
                      <span className="text-[10px] text-emerald-400 font-semibold">Copied!</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="p-5 space-y-5 text-xs">
                {/* Diagnostics Alert Box */}
                {selectedJob.diagnostics && selectedJob.diagnostics.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Active Diagnostics ({selectedJob.diagnostics.length})
                    </div>
                    {selectedJob.diagnostics.map((diag) => (
                      <div
                        key={diag.code}
                        className={`rounded-lg border p-2.5 text-xs ${
                          diag.severity === "error"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <p className="font-semibold">{diag.label}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">Code: {diag.code}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section: Job Identity & Workflow */}
                <DrawerSection title="Identity & Product Link">
                  <DrawerRow label="Source Type" value={selectedJob.sourceType} />
                  <DrawerRow label="Raw Status" value={selectedJob.rawStatus ?? "-"} mono />
                  <DrawerRow label="Product Feature" value={selectedJob.featureId ?? "Unlinked"} mono />
                  <DrawerRow label="User ID" value={selectedJob.userId ?? "-"} mono />
                  {selectedJob.generationId && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Generation ID:</span>
                        <span className="font-mono text-slate-200">{selectedJob.generationId}</span>
                      </div>
                      <Link
                        href={`/admin/history?query=${encodeURIComponent(selectedJob.generationId)}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Open Generation in History
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </DrawerSection>

                {/* Section: Provider Telemetry */}
                <DrawerSection title="Provider & Routing Telemetry">
                  <DrawerRow label="Provider" value={selectedJob.provider ?? "-"} />
                  <DrawerRow label="Model Route" value={selectedJob.modelId ?? "-"} mono />
                  <DrawerRow label="Routing Engine" value={selectedJob.routingSource ?? "-"} />
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                      <span>Provider Task ID</span>
                      {selectedJob.providerTaskId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedJob.providerTaskId!, "taskId")}
                          className="text-cyan-400 hover:text-cyan-300 text-[10px]"
                        >
                          {copiedId === "taskId" ? "Copied!" : "Copy"}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-xs text-slate-200 break-all">
                      {selectedJob.providerTaskId ?? "None (No external task registered)"}
                    </div>
                  </div>
                </DrawerSection>

                {/* Section: Financial & Credit Breakdown */}
                <DrawerSection title="Credits & Provider Cost">
                  <DrawerRow
                    label="Credits Charged"
                    value={selectedJob.creditsCharged !== null ? `${selectedJob.creditsCharged} credits` : "-"}
                  />
                  <DrawerRow label="Refund State" value={selectedJob.refundState} />
                  {selectedJob.providerUsage ? (
                    <>
                      <DrawerRow
                        label="Provider Incurred Cost"
                        value={
                          selectedJob.providerUsage.providerCostUsd !== null
                            ? `$${selectedJob.providerUsage.providerCostUsd.toFixed(4)} USD`
                            : "-"
                        }
                      />
                      <DrawerRow
                        label="Cost Source"
                        value={selectedJob.providerUsage.providerCostSource ?? "-"}
                      />
                    </>
                  ) : (
                    <DrawerRow label="Provider Cost Record" value="No provider cost record attached" />
                  )}
                </DrawerSection>

                {/* Section: Execution Timeline */}
                <DrawerSection title="Execution Timeline">
                  <DrawerRow label="Created At" value={formatDate(selectedJob.createdAt)} mono />
                  {selectedJob.updatedAt && (
                    <DrawerRow label="Last Updated" value={formatDate(selectedJob.updatedAt)} mono />
                  )}
                  <DrawerRow
                    label="Started At"
                    value={selectedJob.startedAt ? formatDate(selectedJob.startedAt) : "Not tracked"}
                    mono={Boolean(selectedJob.startedAt)}
                  />
                  <DrawerRow
                    label="Completed At"
                    value={selectedJob.completedAt ? formatDate(selectedJob.completedAt) : "Not tracked"}
                    mono={Boolean(selectedJob.completedAt)}
                  />
                  {selectedJob.progress !== null && (
                    <DrawerRow label="Reported Progress" value={`${selectedJob.progress}%`} />
                  )}
                </DrawerSection>

                {/* Section: Artifacts & Error Details */}
                <DrawerSection title="Artifacts & Error Output">
                  {selectedJob.result && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Result Output URL
                      </div>
                      <a
                        href={selectedJob.result}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-cyan-400 hover:underline break-all block"
                      >
                        {selectedJob.result}
                      </a>
                    </div>
                  )}

                  {selectedJob.error && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                        Error Reason
                      </div>
                      <pre className="font-mono text-xs text-rose-200 whitespace-pre-wrap break-all">
                        {selectedJob.error}
                      </pre>
                    </div>
                  )}

                  {!selectedJob.result && !selectedJob.error && (
                    <p className="text-slate-500 italic">No output URL or error reported.</p>
                  )}
                </DrawerSection>
              </div>
            </aside>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DrawerRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/40 last:border-0">
      <span className="text-slate-400">{label}:</span>
      <span className={`text-slate-200 text-right ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

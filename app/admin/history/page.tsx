"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  History,
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  Maximize2,
  X,
  Sparkles,
  Coins,
  DollarSign,
  User,
  Film,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Download,
  Eye,
  ShieldAlert,
  Server,
  Workflow,
  Radio,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type {
  HistoryReadModelResult,
  UnifiedGenerationHistoryRow,
  HistoryCreditState,
} from "@/lib/admin/history-read-model";

type ViewMode = "gallery" | "list";

type GenerationDetailResponse = {
  ok: boolean;
  detail?: {
    id: string;
    userId: string;
    user?: { id: string; email: string; name: string | null; role: string; creditBalance: number };
    prompt: string;
    negativePrompt?: string | null;
    modelUsed: string;
    officialProvider: string;
    executionProvider: string;
    providerModel?: string | null;
    providerRequestId?: string | null;
    providerCostUsd?: number | null;
    providerCostSource: string;
    customerCreditsCharged: number;
    status: string;
    assetType: string;
    toolName: string;
    modality: "image" | "video" | "audio" | "3d";
    resolution?: string | null;
    aspectRatio?: string | null;
    duration?: number | null;
    quality?: string | null;
    mode?: string | null;
    seed?: string | null;
    cameraControls?: any;
    motionControls?: any;
    rawUrl?: string | null;
    resolvedOutputUrl?: string | null;
    posterUrl?: string | null;
    isFlagged: boolean;
    isFavorite: boolean;
    createdAt: string;
    inputs: {
      referenceImageUrls: string[];
      firstFrameUrl?: string | null;
      lastFrameUrl?: string | null;
      inputVideoUrl?: string | null;
      inputAudioUrl?: string | null;
    };
    providerUsageRecords: Array<{
      id: string;
      providerName?: string | null;
      providerModel?: string | null;
      providerRequestId?: string | null;
      providerCostUsd?: number | null;
      providerCostSource?: string | null;
      status?: string | null;
      createdAt: string;
    }>;
    creditLedgerEntries: Array<{
      id: string;
      delta: number;
      reason: string;
      createdAt: string;
    }>;
  };
  error?: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  completed: {
    label: "Completed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    dot: "bg-cyan-400 animate-pulse",
    icon: Clock,
  },
  queued: {
    label: "Queued",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    icon: AlertTriangle,
  },
};

function formatAspectRatio(ratio?: string | null): string {
  if (!ratio) return "16/9";
  const clean = ratio.trim().replace(":", "/");
  return clean.includes("/") ? clean : "16/9";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatUsd(val?: number | null): string {
  if (val === null || val === undefined) return "—";
  return `$${val.toFixed(val >= 10 ? 2 : 4)}`;
}

export default function AdminGenerationMonitorPage() {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  // Read model state
  const [data, setData] = useState<HistoryReadModelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creditStateFilter, setCreditStateFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Inspector Drawer State
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<GenerationDetailResponse["detail"] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Lightbox Media Viewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<{ url: string; type: "image" | "video"; title: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Date range resolver from preset
  const dateRange = useMemo(() => {
    if (datePreset === "all") return { from: null, to: null };
    const now = new Date();
    const to = now.toISOString();
    if (datePreset === "today") {
      const from = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      return { from, to };
    }
    if (datePreset === "7d") {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { from, to };
    }
    if (datePreset === "30d") {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { from, to };
    }
    return { from: null, to: null };
  }, [datePreset]);

  // Fetch paginated generation history
  const fetchGenerations = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        if (debouncedSearch.trim()) params.set("query", debouncedSearch.trim());
        if (modalityFilter !== "all") params.set("modality", modalityFilter);
        if (providerFilter !== "all") params.set("provider", providerFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (creditStateFilter !== "all") params.set("creditState", creditStateFilter);
        if (dateRange.from) params.set("dateFrom", dateRange.from);
        if (dateRange.to) params.set("dateTo", dateRange.to);

        const res = await fetch(`/api/admin/history?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load generation monitor`);
        const json: HistoryReadModelResult = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load generations");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, debouncedSearch, modalityFilter, providerFilter, statusFilter, creditStateFilter, dateRange]
  );

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Fetch detailed generation snapshot on-demand when Inspector opens
  const openInspector = async (genId: string) => {
    setSelectedGenerationId(genId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/generations/${genId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load details");
      const json: GenerationDetailResponse = await res.json();
      if (json.ok && json.detail) {
        setDetailData(json.detail);
      }
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeInspector = () => {
    setSelectedGenerationId(null);
    setDetailData(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openLightbox = (url: string, type: "image" | "video", title: string) => {
    setLightboxAsset({ url, type, title });
    setLightboxOpen(true);
  };

  const summary = data?.summary;
  const rows = data?.rows || [];
  const pagination = data?.pagination;

  return (
    <AdminShell activeRoute="/admin/history">
      {/* Full-Width Workspace Container */}
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
        {/* ── LEVEL 1: COMPACT COMMAND HEADER ── */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              <Sparkles className="h-4 w-4" />
              Subscriber Generation Operations & Content Monitor
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Generation Monitor
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              مركز الرصد والرقابة البصرية المباشرة: متابعة كافة توليدات المشتركين، الوسائط المرجعية، المدخلات، ومطابقة التكاليف اللحظية.
            </p>
          </div>

          {/* Top Actions & Job Boundary Link */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/jobs"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-sm"
              title="Inspect background queues, workers, and Redis latency on the dedicated Jobs page"
            >
              <Workflow className="h-3.5 w-3.5 text-cyan-400" />
              Worker Queues & Jobs
            </Link>

            <button
              type="button"
              onClick={() => void fetchGenerations(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-60 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing || loading ? "animate-spin" : ""}`} />
              Refresh Feed
            </button>
          </div>
        </header>

        {/* ── LEVEL 2: SINGLE INTEGRATED OPERATIONAL METRIC STRIP ── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
            {/* Total Generations */}
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Feed</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight tabular-nums">
                  {summary ? summary.totalGenerations.toLocaleString() : "—"}
                </span>
                <span className="text-[10px] text-slate-500">records</span>
              </div>
            </div>

            {/* Completed */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-300 tabular-nums">
                  {summary ? summary.completed.toLocaleString() : "—"}
                </span>
                {summary && summary.totalGenerations > 0 && (
                  <span className="text-[10px] text-emerald-500/80 font-mono">
                    {((summary.completed / summary.totalGenerations) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Processing */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Clock className="h-3 w-3 animate-spin" /> In-Flight
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-cyan-300 tabular-nums">
                  {summary ? summary.processing.toLocaleString() : "—"}
                </span>
                <span className="text-[10px] text-cyan-500/80">active</span>
              </div>
            </div>

            {/* Failed */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Failed / Error
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-rose-400 tabular-nums">
                  {summary ? summary.failed.toLocaleString() : "—"}
                </span>
                <span className="text-[10px] text-rose-500/80">refunded</span>
              </div>
            </div>

            {/* Customer Credits Charged */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Coins className="h-3 w-3" /> Credits Charged
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-amber-300 tabular-nums font-mono">
                  {summary?.creditsCharged !== null && summary?.creditsCharged !== undefined
                    ? summary.creditsCharged.toLocaleString()
                    : "—"}
                </span>
                <span className="text-[10px] text-amber-500/80">credits</span>
              </div>
            </div>

            {/* Provider Operating Spend */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Provider USD Cost
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-purple-300 tabular-nums font-mono">
                  {summary ? formatUsd(summary.totalProviderCostUsd) : "—"}
                </span>
                <span className="text-[10px] text-purple-500/80">upstream</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── LEVEL 3: FILTERS & VIEW CONTROLS ── */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by User Email, Prompt, Model, Tool Name, or Generation ID..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Modality Filter & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Modality Selector */}
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                {(["all", "video", "image"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModalityFilter(m);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold capitalize rounded-md transition ${
                      modalityFilter === m
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m === "all" ? "All Media" : m === "video" ? "Videos" : "Images"}
                  </button>
                ))}
              </div>

              {/* Date Preset Buttons */}
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 hidden sm:inline-flex">
                {(
                  [
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "7d", label: "7 Days" },
                    { id: "30d", label: "30 Days" },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDatePreset(d.id);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition ${
                      datePreset === d.id
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Advanced Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  showAdvancedFilters || providerFilter !== "all" || statusFilter !== "all" || creditStateFilter !== "all"
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
              </button>

              {/* View Switcher: Gallery vs List */}
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("gallery")}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === "gallery"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="Visual Gallery View"
                  aria-label="Gallery View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition ${
                    viewMode === "list"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="Operational List Table"
                  aria-label="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Expandable Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="queued">Queued</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Execution Provider Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Execution Provider
                </label>
                <select
                  value={providerFilter}
                  onChange={(e) => {
                    setProviderFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Providers</option>
                  <option value="wavespeed">WaveSpeed</option>
                  <option value="google">Google Cloud</option>
                  <option value="openai">OpenAI</option>
                  <option value="byteplus">BytePlus</option>
                  <option value="kie">KIE.ai</option>
                  <option value="reap">Reap</option>
                </select>
              </div>

              {/* Credit State Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Billing & Credit State
                </label>
                <select
                  value={creditStateFilter}
                  onChange={(e) => {
                    setCreditStateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Credit States</option>
                  <option value="charged">Charged (Paid)</option>
                  <option value="refunded">Refunded</option>
                  <option value="free">Free Tier (0 Credits)</option>
                  <option value="partially_refunded">Partially Refunded</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setModalityFilter("all");
                    setProviderFilter("all");
                    setStatusFilter("all");
                    setCreditStateFilter("all");
                    setDatePreset("all");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  Reset All Filters
                </button>
              </div>

            </div>
          )}
        </section>

        {/* ── LEVEL 4: PRIMARY GENERATION GALLERY / OPERATIONAL LIST ── */}
        {loading && !refreshing ? (
          <div className="p-16 text-center rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Loading subscriber generation feed...</p>
            <p className="text-xs text-slate-500">Querying live PostgreSQL generation ledger with user relations.</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <span>Failed to load generation monitor</span>
            </div>
            <p className="text-xs font-mono">{error}</p>
            <button
              type="button"
              onClick={() => void fetchGenerations()}
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <History className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No generation records found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No generation activities match the active query and filters. Try adjusting your search or date preset.
            </p>
          </div>
        ) : viewMode === "gallery" ? (
          /* ── GALLERY VIEW (Mixed Aspect-Ratio Layout) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {rows.map((row) => {
              const statusCfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.processing;
              const StatusIcon = statusCfg.icon;
              const ratioStyle = formatAspectRatio(row.aspectRatio);

              return (
                <div
                  key={row.generationId}
                  className="group relative rounded-xl border border-slate-800/90 bg-slate-900/80 overflow-hidden shadow-sm hover:border-cyan-500/50 hover:shadow-cyan-500/5 transition flex flex-col justify-between"
                >
                  {/* Media Hero Container with Real Aspect Ratio */}
                  <div
                    className="relative w-full bg-slate-950 flex items-center justify-center overflow-hidden"
                    style={{ aspectRatio: ratioStyle }}
                  >
                    {row.status === "processing" ? (
                      /* Processing Placeholder */
                      <div className="p-4 text-center space-y-2 flex flex-col items-center justify-center h-full w-full bg-cyan-950/20 border-b border-cyan-500/20">
                        <Clock className="h-6 w-6 text-cyan-400 animate-spin" />
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Generating...</span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[140px] font-mono">{row.modelId}</span>
                      </div>
                    ) : row.status === "failed" ? (
                      /* Failed Placeholder */
                      <div className="p-4 text-center space-y-2 flex flex-col items-center justify-center h-full w-full bg-rose-950/20 border-b border-rose-500/20">
                        <XCircle className="h-6 w-6 text-rose-400" />
                        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Failed</span>
                        <span className="text-[9px] text-slate-400 line-clamp-2 px-2">
                          {row.error || "Generation error occurred"}
                        </span>
                      </div>
                    ) : row.modality === "video" ? (
                      /* Video Player / Poster */
                      <div className="relative w-full h-full group/video flex items-center justify-center">
                        {row.posterUrl ? (
                          <img
                            src={row.posterUrl}
                            alt={row.prompt || "Video generation"}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : row.resolvedUrl ? (
                          <video
                            src={row.resolvedUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center text-slate-600">
                            <Film className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/video:bg-black/10 transition">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/90 text-slate-950 shadow-md">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : row.resolvedUrl ? (
                      /* Image Output */
                      <img
                        src={row.resolvedUrl}
                        alt={row.prompt || "AI generation"}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-slate-600 h-full">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}

                    {/* Top Overlay Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      {/* Tool Badge */}
                      <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white border border-white/10 uppercase tracking-tight truncate max-w-[120px]">
                        {row.toolName}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase border backdrop-blur-md ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Quick Action Overlay on Hover */}
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-200 line-clamp-3 leading-relaxed font-medium">
                          {row.prompt || "No text prompt recorded."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openInspector(row.generationId)}
                          className="flex-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 py-1.5 text-center text-xs font-bold text-slate-950 shadow transition"
                        >
                          Inspect
                        </button>
                        {row.resolvedUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openLightbox(
                                row.resolvedUrl!,
                                row.modality === "video" ? "video" : "image",
                                row.prompt || row.toolName
                              )
                            }
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 transition"
                            title="Fullscreen Media View"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Card Compact Footer (Level 3 Info) */}
                  <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                    {/* User Identity */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-300 font-bold truncate" title={row.userEmail || row.userId}>
                        {row.userEmail || `User: ${row.userId.slice(0, 8)}...`}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">
                        {row.aspectRatio || "16:9"}
                      </span>
                    </div>

                    {/* Model & Provider */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate font-mono" title={row.modelId || undefined}>
                        {row.modelId || "—"}
                      </span>
                      <span className="text-[9px] font-semibold uppercase text-cyan-400 shrink-0">
                        {row.provider || "—"}
                      </span>
                    </div>

                    {/* Economics & Timestamp */}
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-amber-300 font-bold">
                        {row.creditsCharged ?? 0} cr
                      </span>
                      <span className="font-mono text-purple-300 text-[9px]">
                        {formatUsd(row.providerActualCost ?? row.providerEstimatedCost)}
                      </span>
                      <span className="text-slate-500 text-[9px]">
                        {formatDate(row.createdAt)}
                      </span>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* ── LIST / TABLE VIEW (High-Density Operational Audit) ── */
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-slate-800 bg-slate-950 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Media</th>
                    <th className="px-4 py-3 font-semibold">Subscriber</th>
                    <th className="px-4 py-3 font-semibold">Tool & Model</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Execution Route</th>
                    <th className="px-4 py-3 font-semibold text-right">Credits</th>
                    <th className="px-4 py-3 font-semibold text-right">Provider Cost</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {rows.map((row) => {
                    const statusCfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.processing;

                    return (
                      <tr
                        key={row.generationId}
                        onClick={() => openInspector(row.generationId)}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <td className="px-4 py-2.5">
                          <div className="h-10 w-14 rounded-md bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                            {row.posterUrl ? (
                              <img src={row.posterUrl} alt="" className="h-full w-full object-cover" />
                            ) : row.resolvedUrl ? (
                              <img src={row.resolvedUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-slate-600" />
                            )}
                          </div>
                        </td>

                        {/* Subscriber */}
                        <td className="px-4 py-2.5">
                          <span className="text-white font-bold block text-xs truncate max-w-[160px]">
                            {row.userEmail || "—"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {row.userId.slice(0, 10)}...
                          </span>
                        </td>

                        {/* Tool & Model */}
                        <td className="px-4 py-2.5">
                          <span className="text-slate-200 font-bold block text-xs">{row.toolName}</span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] block">
                            {row.modelId}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-2.5">
                          <span className="text-cyan-300 font-semibold block text-xs uppercase">{row.provider || "—"}</span>
                          <span className="text-[10px] text-slate-500">Official: {row.officialProvider}</span>
                        </td>

                        {/* Credits */}
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300">
                          {row.creditsCharged ?? 0} cr
                        </td>

                        {/* Cost */}
                        <td className="px-4 py-2.5 text-right font-mono text-purple-300">
                          {formatUsd(row.providerActualCost ?? row.providerEstimatedCost)}
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-2.5 text-slate-400 text-[10px] whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInspector(row.generationId);
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200 transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {pagination && pagination.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              Showing <strong className="text-white">{((page - 1) * pageSize) + 1}</strong> to{" "}
              <strong className="text-white">{Math.min(page * pageSize, pagination.total)}</strong> of{" "}
              <strong className="text-white">{pagination.total.toLocaleString()}</strong> generations
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <div className="text-xs font-mono px-2 text-slate-400">
                Page <strong className="text-white">{page}</strong> / {pagination.totalPages}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasMore || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}

        {/* ── LEVEL 5: GENERATION INSPECTOR DRAWER (Desktop 680px, Mobile full-width) ── */}
        {selectedGenerationId && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            <div
              className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Sticky Header */}
              <div className="sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Generation Inspector
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {selectedGenerationId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedGenerationId, "genId")}
                      className="text-slate-500 hover:text-cyan-400"
                    >
                      {copiedKey === "genId" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeInspector}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="p-6 space-y-6 flex-1">
                {detailLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">Loading deep generation snapshot...</p>
                  </div>
                ) : detailData ? (
                  <div className="space-y-6">
                    {/* SECTION A: HERO OUTPUT MEDIA */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        A. Generated Output Media
                      </span>

                      <div
                        className="relative w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-lg"
                        style={{ aspectRatio: formatAspectRatio(detailData.aspectRatio) }}
                      >
                        {detailData.modality === "video" && detailData.resolvedOutputUrl ? (
                          <video
                            src={detailData.resolvedOutputUrl}
                            controls
                            playsInline
                            poster={detailData.posterUrl || undefined}
                            className="w-full h-full object-contain"
                          />
                        ) : detailData.resolvedOutputUrl ? (
                          <img
                            src={detailData.resolvedOutputUrl}
                            alt="Generated Output"
                            className="w-full h-full object-contain cursor-zoom-in"
                            onClick={() =>
                              openLightbox(detailData.resolvedOutputUrl!, "image", detailData.prompt)
                            }
                          />
                        ) : (
                          <div className="p-8 text-center text-slate-500 space-y-2">
                            <XCircle className="h-8 w-8 mx-auto text-rose-500" />
                            <p className="text-xs font-semibold">No renderable media available</p>
                          </div>
                        )}
                      </div>

                      {/* Dimensions & Specs Strip */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                          Ratio: <strong>{detailData.aspectRatio || "16:9"}</strong>
                        </span>
                        {detailData.resolution && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                            Res: <strong>{detailData.resolution}</strong>
                          </span>
                        )}
                        {detailData.duration && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                            Duration: <strong>{detailData.duration}s</strong>
                          </span>
                        )}
                        {detailData.quality && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                            Quality: <strong>{detailData.quality}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SECTION B: SUBSCRIBER IDENTITY */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        B. Subscriber Identity
                      </span>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-white font-bold block text-sm">
                            {detailData.user?.email || "Email Unknown"}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            User ID: {detailData.userId}
                          </span>
                        </div>
                        {detailData.user?.creditBalance !== undefined && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase block">Current Balance</span>
                            <span className="font-mono font-bold text-amber-300">
                              {detailData.user.creditBalance.toLocaleString()} cr
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION C: INPUTS, PROMPT & REFERENCE MEDIA */}
                    <div className="space-y-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        C. Generation Prompt & Inputs
                      </span>

                      {/* Prompt */}
                      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                          <span>Prompt Text</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(detailData.prompt, "prompt")}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400"
                          >
                            {copiedKey === "prompt" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="text-slate-100 leading-relaxed font-medium select-text">
                          {detailData.prompt}
                        </p>
                      </div>

                      {/* Negative Prompt if available */}
                      {detailData.negativePrompt && (
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Negative Prompt</span>
                          <p className="text-slate-300 text-xs">{detailData.negativePrompt}</p>
                        </div>
                      )}

                      {/* Reference Media Grid (When Present) */}
                      {(detailData.inputs.referenceImageUrls.length > 0 ||
                        detailData.inputs.firstFrameUrl ||
                        detailData.inputs.lastFrameUrl) && (
                        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                            Visual Inputs & Reference Media
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* First Frame */}
                            {detailData.inputs.firstFrameUrl && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">First Frame</span>
                                <div
                                  className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden cursor-pointer aspect-video"
                                  onClick={() =>
                                    openLightbox(detailData.inputs.firstFrameUrl!, "image", "First Frame Input")
                                  }
                                >
                                  <img
                                    src={detailData.inputs.firstFrameUrl}
                                    alt="First Frame"
                                    className="w-full h-full object-cover hover:scale-105 transition"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Last Frame */}
                            {detailData.inputs.lastFrameUrl && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Last Frame</span>
                                <div
                                  className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden cursor-pointer aspect-video"
                                  onClick={() =>
                                    openLightbox(detailData.inputs.lastFrameUrl!, "image", "Last Frame Input")
                                  }
                                >
                                  <img
                                    src={detailData.inputs.lastFrameUrl}
                                    alt="Last Frame"
                                    className="w-full h-full object-cover hover:scale-105 transition"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Reference Images */}
                            {detailData.inputs.referenceImageUrls.map((refUrl, idx) => (
                              <div key={idx} className="space-y-1">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">
                                  Reference {idx + 1}
                                </span>
                                <div
                                  className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden cursor-pointer aspect-square"
                                  onClick={() =>
                                    openLightbox(refUrl, "image", `Reference Image ${idx + 1}`)
                                  }
                                >
                                  <img
                                    src={refUrl}
                                    alt={`Reference ${idx + 1}`}
                                    className="w-full h-full object-cover hover:scale-105 transition"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION D: REAL GENERATION FLOW INFOGRAPHIC */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        D. Operational Generation Flow
                      </span>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-1 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">Subscriber</span>
                          <strong className="text-white text-[11px] truncate block">
                            {detailData.user?.email || "User"}
                          </strong>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mx-auto hidden sm:block shrink-0" />

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-1 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">Tool</span>
                          <strong className="text-cyan-300 text-[11px] block">{detailData.toolName}</strong>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mx-auto hidden sm:block shrink-0" />

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-1 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">Provider</span>
                          <strong className="text-purple-300 text-[11px] uppercase block">
                            {detailData.executionProvider}
                          </strong>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mx-auto hidden sm:block shrink-0" />

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-1 text-center">
                          <span className="text-[9px] text-slate-500 uppercase block">Output</span>
                          <strong className="text-emerald-300 text-[11px] capitalize block">
                            {detailData.status}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* SECTION E: ROUTING & PROVIDER ATTRIBUTION */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        E. Checkpoint & Routing Attribution
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Official Lab Owner:</span>
                          <strong className="text-slate-200">{detailData.officialProvider}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Selected Checkpoint:</span>
                          <strong className="text-cyan-300 uppercase">{detailData.executionProvider}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Logical Model:</span>
                          <strong className="text-slate-200 font-mono text-[10px] truncate block">
                            {detailData.modelUsed}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Provider Route / Upstream ID:</span>
                          <strong className="text-slate-200 font-mono text-[10px] truncate block">
                            {detailData.providerModel || detailData.modelUsed}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* SECTION F: ECONOMICS & BILLING */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        F. Economics & Accounting Invariants
                      </span>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Customer Credit Charge</span>
                          <span className="text-base font-black font-mono text-amber-300 block">
                            {detailData.customerCreditsCharged} Credits
                          </span>
                          <span className="text-[9px] text-slate-500">Decoupled Pricing Constitution</span>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Provider Operating Cost</span>
                          <span className="text-base font-black font-mono text-purple-300 block">
                            {formatUsd(detailData.providerCostUsd)}
                          </span>
                          <span className="text-[9px] text-slate-500">Source: {detailData.providerCostSource}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-500">
                    Could not load generation details.
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="sticky bottom-0 bg-slate-950 border-t border-slate-800 px-6 py-3.5 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[10px]">
                  Saad Studio Secure Generation Audit
                </span>
                <button
                  type="button"
                  onClick={closeInspector}
                  className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── LEVEL 6: LIGHTBOX FULLSCREEN MEDIA VIEWER ── */}
        {lightboxOpen && lightboxAsset && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Lightbox Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <a
                href={lightboxAsset.url}
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition"
                title="Download Asset"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Media Content */}
            <div
              className="max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxAsset.type === "video" ? (
                <video
                  src={lightboxAsset.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                />
              ) : (
                <img
                  src={lightboxAsset.url}
                  alt={lightboxAsset.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              )}
            </div>

            <p className="mt-3 text-xs text-slate-400 text-center max-w-xl truncate">
              {lightboxAsset.title}
            </p>
          </div>
        )}

      </div>
    </AdminShell>
  );
}

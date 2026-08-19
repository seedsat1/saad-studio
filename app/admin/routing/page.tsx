"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Route,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Layers,
  Activity,
  History,
  Save,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  User,
  ArrowRight,
  Radio,
  Volume2,
  VolumeX,
  Film,
  Image as ImageIcon,
  Music,
  Box,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { ProviderCheckpointCapability } from "@/lib/routing/checkpoints/checkpoint-capabilities";
import type { ExecutionCheckpointItem } from "@/lib/routing/checkpoint-matrix-builder";

type ProviderId = "google" | "openai" | "wavespeed" | "byteplus" | "elevenlabs" | "kie" | "reap" | string;
type Modality = "image" | "video" | "audio" | "3d";

type RouteTarget = {
  provider: ProviderId;
  route: string;
};

type ProviderOption = {
  id: ProviderId;
  name: string;
  shortName: string;
  status: "active" | "disabled" | "standby" | "deprecated";
  enabled: boolean;
  allowRouting: boolean;
  allowFallback: boolean;
  futureProvider: boolean;
  routingEligible: boolean;
  fallbackEligible: boolean;
};

type RoutingDiagnostics = {
  lastAttemptAt: string | null;
  selectedProvider: ProviderId | null;
  selectedRoute: string | null;
  fallbackUsed: boolean;
  latencyMs: number | null;
  lastError: string | null;
};

type RoutingRow = {
  modelId: string;
  modelName: string;
  modality: Modality;
  enabled: boolean;
  runtimeSource: ProviderId;
  primaryRoute: RouteTarget;
  fallbackRoutes: RouteTarget[];
  pricingProvider: string;
  automaticFallback: boolean;
  healthRequirement: boolean;
  hasOverride: boolean;
  configSource: "persisted" | "default";
  databaseAvailable: boolean;
  diagnostics: RoutingDiagnostics;
  validation: { ok: boolean; errors: string[] };
  logicalProductId?: string;
  officialProvider?: ProviderId;
  officialProviderName?: string;
  selectedExecutionProvider?: ProviderId;
  selectedRoute?: string;
  availableCheckpoints?: ExecutionCheckpointItem[];
  capabilities?: ProviderCheckpointCapability;
};

type RoutingAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  modelId: string;
  action: "save_override" | "reset_override" | "checkpoint_switch";
  oldRoute: RouteTarget | null;
  newRoute: RouteTarget | null;
  oldProvider: string | null;
  newProvider: string | null;
};

type RoutingResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  configSource: "persisted" | "default";
  updatedAt: string | null;
  warning: string | null;
  routing: RoutingRow[];
  providers: ProviderOption[];
  auditLog: RoutingAuditEvent[];
  summary: {
    totalModels: number;
    enabledModels: number;
    overriddenModels: number;
    activeProviders: number;
    invalidRoutes: number;
  };
  error?: string;
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  google: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  openai: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  wavespeed: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  byteplus: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  kie: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  reap: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  elevenlabs: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
};

function getProviderStyle(provider?: string) {
  const p = (provider || "wavespeed").toLowerCase();
  return PROVIDER_COLORS[p] || { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" };
}

function getModalityIcon(modality: Modality) {
  switch (modality) {
    case "video": return <Film className="w-3.5 h-3.5" />;
    case "image": return <ImageIcon className="w-3.5 h-3.5" />;
    case "audio": return <Music className="w-3.5 h-3.5" />;
    case "3d": return <Box className="w-3.5 h-3.5" />;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function encodedModelPath(modelId: string) {
  return modelId.split("/").map(encodeURIComponent).join("/");
}

export default function AdminRoutingPage() {
  const [rows, setRows] = useState<RoutingRow[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [auditLog, setAuditLog] = useState<RoutingAuditEvent[]>([]);
  const [summary, setSummary] = useState<RoutingResponse["summary"] | null>(null);
  const [updatedAtToken, setUpdatedAtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Safe Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RoutingRow | null>(null);
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [officialFilter, setOfficialFilter] = useState<string>("ALL");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("ALL");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [hasAlternativesOnly, setHasAlternativesOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"matrix" | "audit">("matrix");

  const loadRouting = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/routing", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load routing data (HTTP ${res.status})`);
      const data: RoutingResponse = await res.json();
      if (!data.ok) throw new Error(data.error || "Routing API error");

      setRows(data.routing || []);
      setProviders(data.providers || []);
      setAuditLog(data.auditLog || []);
      setSummary(data.summary || null);
      setUpdatedAtToken(data.updatedAt || null);
    } catch (err: any) {
      console.error("[AdminRouting] Load error:", err);
      setError(err.message || "Failed to load routing configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRouting();
  }, [loadRouting]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !searchQuery.trim() ||
        r.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.primaryRoute.route.toLowerCase().includes(searchQuery.toLowerCase());

      const matchModality = modalityFilter === "ALL" || r.modality.toUpperCase() === modalityFilter.toUpperCase();
      const matchOfficial = officialFilter === "ALL" || (r.officialProvider || "").toLowerCase() === officialFilter.toLowerCase();
      const matchSelected = selectedProviderFilter === "ALL" || r.primaryRoute.provider.toLowerCase() === selectedProviderFilter.toLowerCase();
      const matchAlternatives = !hasAlternativesOnly || ((r.availableCheckpoints?.length || 0) > 1);

      return matchSearch && matchModality && matchOfficial && matchSelected && matchAlternatives;
    });
  }, [rows, searchQuery, modalityFilter, officialFilter, selectedProviderFilter, hasAlternativesOnly]);

  const openDrawer = (row: RoutingRow) => {
    setSelectedRow(row);
    const checkpoints = row.availableCheckpoints || [];
    const activeIdx = checkpoints.findIndex((c) => c.provider === row.primaryRoute.provider);
    setSelectedCheckpointIndex(activeIdx >= 0 ? activeIdx : 0);
    setSaveError(null);
    setConcurrencyConflict(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRow(null);
    setSaveError(null);
    setConcurrencyConflict(false);
  };

  const proposedCheckpoint = useMemo(() => {
    if (!selectedRow || !selectedRow.availableCheckpoints) return null;
    return selectedRow.availableCheckpoints[selectedCheckpointIndex] || null;
  }, [selectedRow, selectedCheckpointIndex]);

  const capabilityLosses = useMemo(() => {
    if (!selectedRow || !proposedCheckpoint) return [];
    const currentCap = selectedRow.capabilities;
    const propCap = proposedCheckpoint.capabilities;
    if (!currentCap || !propCap) return [];

    const losses: string[] = [];
    if (currentCap.supportsAudioGeneration && !propCap.supportsAudioGeneration) {
      losses.push("Native Synchronized Audio Generation");
    }
    if (currentCap.supportsFirstLastFrames && !propCap.supportsFirstLastFrames) {
      losses.push("First & Last Frame Dual Interpolation");
    }
    if (currentCap.supportsNegativePrompt && !propCap.supportsNegativePrompt) {
      losses.push("Negative Prompt Filtering");
    }
    if (currentCap.supportsMotionControls && !propCap.supportsMotionControls) {
      losses.push("Camera & Character Motion Controls");
    }
    return losses;
  }, [selectedRow, proposedCheckpoint]);

  const handleSaveCheckpointSwitch = async () => {
    if (!selectedRow || !proposedCheckpoint) return;
    setSaving(true);
    setSaveError(null);
    setConcurrencyConflict(false);
    setActionNotice(null);

    try {
      const payload: any = {
        primaryRoute: {
          provider: proposedCheckpoint.provider,
          route: proposedCheckpoint.route.trim(),
        },
        runtimeSource: proposedCheckpoint.provider,
        fallbackRoutes: [], // Auto fallback is strictly OFF
        expectedUpdatedAt: updatedAtToken,
      };

      const res = await fetch(`/api/admin/routing/${encodedModelPath(selectedRow.modelId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setConcurrencyConflict(true);
        setSaveError("Routing configuration was modified by another administrator. Please refresh.");
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to switch checkpoint.`);
      }

      setActionNotice(`Successfully switched checkpoint for ${selectedRow.modelName} to ${proposedCheckpoint.providerName}.`);
      closeDrawer();
      await loadRouting();
    } catch (err: any) {
      console.error("[handleSaveCheckpointSwitch]", err);
      setSaveError(err.message || "Failed to switch checkpoint.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedRow) return;
    setSaving(true);
    setSaveError(null);
    setConcurrencyConflict(false);

    try {
      const res = await fetch(`/api/admin/routing/${encodedModelPath(selectedRow.modelId)}/reset`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to reset route.`);
      }

      setActionNotice(`Reset routing for ${selectedRow.modelName} to default official configuration.`);
      closeDrawer();
      await loadRouting();
    } catch (err: any) {
      console.error("[handleResetToDefault]", err);
      setSaveError(err.message || "Failed to reset routing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
        {/* LEVEL 1: Compact Header */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              <Route className="h-4 w-4" />
              Checkpoint Routing Engine
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Model Routing Control Plane
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Universal execution checkpoint management, single-source selection, and capability matrix for all logical products.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Optimistic Concurrency Active</span>
            </div>
            <button
              onClick={loadRouting}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              Decision Test
            </button>
          </div>
        </header>

        {/* LEVEL 2: INTEGRATED OPERATIONAL STATUS STRIP */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Models</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight tabular-nums">
                  {summary?.totalModels || rows.length}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">registered</span>
              </div>
            </div>

            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Server className="h-3 w-3" /> Active Routable
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-300 tabular-nums">
                  {providers.filter((p) => p.status === "active" && p.enabled).length}
                </span>
                <span className="text-[10px] text-emerald-500 font-mono">providers active</span>
              </div>
            </div>

            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Admin Overrides
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-purple-300 tabular-nums">
                  {summary?.overriddenModels || 0}
                </span>
                <span className="text-[10px] text-purple-500 font-mono">custom checkpoints</span>
              </div>
            </div>

            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Configured Fallback
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs text-slate-300">
                  Runtime is fail-fast with refund and does not execute automatic fallback.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LEVEL 3: REAL ROUTING FLOW INFOGRAPHIC */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5" /> Runtime Checkpoint Pipeline
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {selectedRow ? `Active Flow: ${selectedRow.modelName}` : "Deterministic Dispatch Architecture"}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {selectedRow ? `Selected: ${selectedRow.selectedExecutionProvider?.toUpperCase()}` : "Universal"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">1. Logical Product</span>
              <strong className="text-white text-xs block truncate" title={selectedRow?.modelId || "Logical Catalog"}>
                {selectedRow?.modelName || "Selected Model"}
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedRow?.modality || "Modality Schema"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">2. Official Lab</span>
              <strong className="text-cyan-300 text-xs block truncate">
                {selectedRow?.officialProviderName || "Lab Definition"}
              </strong>
              <span className="text-[10px] text-cyan-400">Official Creator</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">3. Normalization</span>
              <strong className="text-indigo-300 text-xs block truncate">
                Strict Schema Pass
              </strong>
              <span className="text-[10px] text-indigo-400">Zero Param Drop</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">4. Execution Checkpoint</span>
              <strong className="text-purple-300 text-xs block truncate uppercase">
                {selectedRow?.selectedExecutionProvider || "Provider Route"}
              </strong>
              <span className="text-[10px] text-purple-400">Active Target</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">5. Dispatch Policy</span>
              <strong className="text-amber-300 text-xs block truncate">
                Fail-Fast + Refund
              </strong>
              <span className="text-[10px] text-amber-400">No Auto-Fallback</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">6. Provider Cost</span>
              <strong className="text-emerald-300 text-xs block truncate">
                Concrete Tariff
              </strong>
              <span className="text-[10px] text-emerald-400">Reconciled USD</span>
            </div>
          </div>
        </section>

        {actionNotice && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab & Filter Controls */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("matrix")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "matrix"
                    ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Model Routing Matrix ({rows.length})
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "audit"
                    ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Recent Route Changes Audit Log ({auditLog.length})
              </button>
            </div>

            <button
              onClick={loadRouting}
              disabled={loading}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border border-zinc-700/60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Decision Test
            </button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search logical products, slugs, routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <select
              value={officialFilter}
              onChange={(e) => setOfficialFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="ALL">Official Source: All</option>
              <option value="google">Official: Google</option>
              <option value="openai">Official: OpenAI</option>
              <option value="byteplus">Official: BytePlus</option>
              <option value="wavespeed">Official: WaveSpeed</option>
              <option value="reap">Official: Reap.video</option>
            </select>

            <select
              value={selectedProviderFilter}
              onChange={(e) => setSelectedProviderFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="ALL">Selected Execution: All</option>
              <option value="google">Selected: Google</option>
              <option value="openai">Selected: OpenAI</option>
              <option value="wavespeed">Selected: WaveSpeed</option>
              <option value="byteplus">Selected: BytePlus</option>
              <option value="kie">Selected: KIE.ai</option>
              <option value="reap">Selected: Reap</option>
            </select>

            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="ALL">Modality: All</option>
              <option value="VIDEO">Video</option>
              <option value="IMAGE">Image</option>
              <option value="AUDIO">Audio</option>
              <option value="3D">3D</option>
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        {activeTab === "matrix" && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-medium">
                    <th className="py-3 px-4">Logical Product</th>
                    <th className="py-3 px-4">Official Source</th>
                    <th className="py-3 px-4">Selected Execution Source</th>
                    <th className="py-3 px-4">Available Checkpoints</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No logical products match current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const officialStyle = getProviderStyle(row.officialProvider);
                      const selectedStyle = getProviderStyle(row.primaryRoute.provider);
                      const checkpoints = row.availableCheckpoints || [];
                      const hasMulti = checkpoints.length > 1;

                      return (
                        <tr
                          key={row.modelId}
                          onClick={() => openDrawer(row)}
                          className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          {/* 1. Logical Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-400">
                                {getModalityIcon(row.modality)}
                              </span>
                              <div>
                                <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                  {row.modelName}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono tracking-tight">{row.modelId}</p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Official Source */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${officialStyle.bg} ${officialStyle.text} ${officialStyle.border}`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {row.officialProviderName || row.officialProvider || "WaveSpeed"}
                            </span>
                          </td>

                          {/* 3. Selected Execution */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${selectedStyle.bg} ${selectedStyle.text} ${selectedStyle.border}`}
                              >
                                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                                {row.primaryRoute.provider.toUpperCase()}
                              </span>
                              <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">
                                {row.primaryRoute.route}
                              </p>
                            </div>
                          </td>

                          {/* 4. Available Checkpoints */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {checkpoints.map((cp) => {
                                const isCurrent = cp.provider === row.primaryRoute.provider;
                                return (
                                  <span
                                    key={cp.id}
                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                      isCurrent
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                                        : "bg-zinc-800/60 border-zinc-700 text-zinc-400"
                                    }`}
                                  >
                                    {cp.providerName}
                                    {isCurrent ? " (active)" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* 5. Capabilities */}
                          <td className="py-3.5 px-4 text-[11px] text-zinc-400">
                            <div className="space-y-0.5">
                              {row.capabilities?.supportsAudioGeneration ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                                  <Volume2 className="w-3 h-3" /> Audio Sync
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-zinc-500 text-[10px]">
                                  <VolumeX className="w-3 h-3" /> Video Only
                                </span>
                              )}
                              <p className="text-[10px] text-zinc-500 truncate">
                                {row.capabilities?.allowedResolutions?.slice(0, 3).join(", ") || "Standard"}
                              </p>
                            </div>
                          </td>

                          {/* 6. Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDrawer(row);
                              }}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-zinc-700/60 transition-all inline-flex items-center gap-1 group-hover:border-zinc-600"
                            >
                              {hasMulti ? "Switch Checkpoint" : "Configure"}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === "audit" && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/40">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                Recent Route Changes Audit Log
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every manual checkpoint switch is atomically recorded with operator ID and route transitions.
              </p>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {auditLog.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">No routing audit events logged yet.</div>
              ) : (
                auditLog.map((event) => (
                  <div key={event.id} className="p-3.5 hover:bg-zinc-800/20 transition-colors flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{event.modelId}</span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono">
                          {event.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                        <span className="text-zinc-500">{event.oldProvider || "default"}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                        <span className="text-emerald-400 font-semibold">{event.newProvider}</span>
                        <span className="text-zinc-500">({event.newRoute?.route || "—"})</span>
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-zinc-500 space-y-0.5">
                      <p className="flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(event.timestamp)}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-[10px]">
                        <User className="w-3 h-3" /> {event.operatorId}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Safe Route Editor Drawer */}
      {drawerOpen && selectedRow && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full sm:max-w-xl md:max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                    {getModalityIcon(selectedRow.modality)}
                  </span>
                  <h3 className="text-base font-bold text-white">Safe Route Editor — {selectedRow.modelName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-mono">{selectedRow.modelId}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[11px] font-medium text-emerald-400">
                    Official Source: {selectedRow.officialProviderName || selectedRow.officialProvider}
                  </span>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Concurrency Conflict Banner */}
              {concurrencyConflict && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    CONCURRENCY_CONFLICT
                  </div>
                  <p className="text-xs text-rose-300">
                    Routing configuration was modified by another administrator. Please refresh.
                  </p>
                  <button
                    onClick={async () => {
                      await loadRouting();
                      closeDrawer();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                  >
                    Refresh Current Route Configuration
                  </button>
                </div>
              )}

              {saveError && !concurrencyConflict && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* 1. Current Route */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-300">Current Route</p>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
                  <div>
                    <span className="font-semibold text-white">{selectedRow.primaryRoute.provider.toUpperCase()}</span>
                    <p className="text-[11px] text-zinc-400 font-mono">{selectedRow.primaryRoute.route}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500">Auto-Fallback</span>
                    <p className="text-xs font-medium text-zinc-300">Disabled</p>
                  </div>
                </div>
              </div>

              {/* 2. Available Execution Checkpoints Single-Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Available Execution Checkpoints
                  </h4>
                  <span className="text-[11px] text-zinc-500">Select ONE source</span>
                </div>

                <div className="space-y-2">
                  {(selectedRow.availableCheckpoints || []).map((cp, idx) => {
                    const isSelected = selectedCheckpointIndex === idx;
                    const isStandby = cp.status === "PROVIDER_STANDBY";
                    const isDisabled = cp.status === "DISABLED";

                    return (
                      <div
                        key={cp.id}
                        onClick={() => !isDisabled && setSelectedCheckpointIndex(idx)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                            : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="checkpoint_selection"
                              checked={isSelected}
                              onChange={() => setSelectedCheckpointIndex(idx)}
                              className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-700 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{cp.providerName}</span>
                                {cp.isOfficial && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold">
                                    OFFICIAL UPSTREAM
                                  </span>
                                )}
                                {isStandby && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-semibold">
                                    STANDBY
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{cp.route}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono text-emerald-400">{cp.tariffRate}</span>
                            <p className="text-[9px] text-zinc-500">{cp.tariffStatus}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Capability Loss Warning */}
              {capabilityLosses.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    CAPABILITY DIFFERENCE DETECTED
                  </div>
                  <p className="text-xs text-amber-200">
                    Switching to {proposedCheckpoint?.providerName} will drop the following features supported by the current route:
                  </p>
                  <ul className="list-disc list-inside text-xs text-amber-300 font-medium space-y-0.5">
                    {capabilityLosses.map((loss) => (
                      <li key={loss}>{loss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4. Cost Context & Customer Pricing Invariance Notice */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <span className="text-zinc-400">Selected Provider Tariff:</span>
                  <span className="font-semibold text-white">
                    {proposedCheckpoint?.tariffRate || "Unknown Rate"} ({proposedCheckpoint?.tariffStatus})
                  </span>
                </div>
                <div className="p-2 bg-zinc-950/60 border border-zinc-800/60 rounded text-[11px] text-zinc-400 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    <strong>Customer Pricing Invariant:</strong> User credit pricing is strictly decoupled from provider selection and remains unchanged.
                  </span>
                </div>
              </div>

              {/* 5. Proposed Route / Route Transition Preview */}
              {proposedCheckpoint && proposedCheckpoint.provider !== selectedRow.primaryRoute.provider && (
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-purple-300">Route Transition Preview</p>
                  <div className="flex items-center justify-between text-xs pt-1 font-mono">
                    <div className="text-zinc-400">
                      <p className="text-[10px] text-zinc-500">Current Route</p>
                      <p className="font-semibold text-white">{selectedRow.primaryRoute.provider}</p>
                      <p className="text-[10px] text-zinc-400">{selectedRow.primaryRoute.route}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Proposed Route</p>
                      <p className="font-semibold text-emerald-400">{proposedCheckpoint.provider}</p>
                      <p className="text-[10px] text-emerald-300">{proposedCheckpoint.route}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              {selectedRow.hasOverride ? (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={saving}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:bg-zinc-800 rounded-lg flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Default
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={saving}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCheckpointSwitch}
                  disabled={saving || !proposedCheckpoint || proposedCheckpoint.status === "DISABLED"}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Switching..." : "Confirm & Switch Checkpoint"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

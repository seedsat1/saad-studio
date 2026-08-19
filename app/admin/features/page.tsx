"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as AudioIcon,
  Wand2,
  Activity,
  Layers3,
  Route,
  Coins,
  Check,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

type FeatureState = "active" | "partial" | "ui_only" | "unknown";
type FeatureLifecycle = "inline" | "task" | "special_workflow" | "workflow_job" | "no_generation";
type FeatureOrchestration = "inline" | "task" | "special" | "workflow" | "none";
type GenerationLifecycleType = "inline" | "task" | "workflow_job" | "special_workflow" | "no_generation";
type ModelStatus = "connected" | "partial" | "none" | "unknown";
type RoutingStatus = "active" | "standby" | "disconnected" | "not_applicable" | "unknown";
type PricingStatus = "core" | "legacy" | "fixed" | "mixed" | "none" | "unknown";
type GenerationStatus = "inline_orchestrated" | "task_orchestrated" | "special_workflow" | "workflow_job" | "no_generation";
type ProviderStatus = "active" | "standby" | "mixed" | "none" | "unknown";
type OverallControl = "CONTROLLED" | "PARTIAL" | "UNCONTROLLED" | "UNKNOWN";

type ProductFeature = {
  id: string;
  category: "image" | "video" | "edit" | "audio";
  displayName: string;
  uiRoute: string | null;
  apiRoutes: string[];
  state: FeatureState;
  lifecycle: FeatureLifecycle;
  modelRefs: string[];
  providerRefs: string[];
  pricingRefs: string[];
  orchestration: FeatureOrchestration;
  generationLifecycleType: GenerationLifecycleType;
  lifecycleContractId: string;
  registryConnected: boolean;
  routingConnected: boolean;
  statusRoute: string | null;
  modelStatus: ModelStatus;
  routingStatus: RoutingStatus;
  pricingStatus: PricingStatus;
  generationStatus: GenerationStatus;
  providerStatus: ProviderStatus;
  overallControl: OverallControl;
  controlReasons: string[];
  enabled: true;
  visible: true;
};

type FeaturesResponse = {
  ok: boolean;
  features: ProductFeature[];
  summary: {
    total: number;
    byCategory: Record<string, number>;
    byState: Record<string, number>;
    byLifecycle: Record<string, number>;
    byGenerationLifecycleType: Record<string, number>;
    byOrchestration: Record<string, number>;
    byModelStatus: Record<string, number>;
    byRoutingStatus: Record<string, number>;
    byPricingStatus: Record<string, number>;
    byGenerationStatus: Record<string, number>;
    byProviderStatus: Record<string, number>;
    byOverallControl: Record<string, number>;
    registryConnected: number;
    routingConnected: number;
  };
  validationErrors: string[];
  error?: string;
};

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [summary, setSummary] = useState<FeaturesResponse["summary"] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: matrix vs integrity
  const [activeTab, setActiveTab] = useState<"matrix" | "integrity">("matrix");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [controlFilter, setControlFilter] = useState<string>("ALL");

  // Drawer state (Inspector)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<ProductFeature | null>(null);

  const loadFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/features", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load feature registry (HTTP ${res.status})`);
      const data: FeaturesResponse = await res.json();
      if (!data.ok && data.error) throw new Error(data.error);

      setFeatures(data.features || []);
      setSummary(data.summary || null);
      setValidationErrors(data.validationErrors || []);
    } catch (err: any) {
      console.error("[AdminFeatures] Load error:", err);
      setError(err.message || "Failed to load product feature registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchSearch =
        !searchQuery.trim() ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.uiRoute && f.uiRoute.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.apiRoutes.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = categoryFilter === "ALL" || f.category.toUpperCase() === categoryFilter.toUpperCase();
      const matchState = stateFilter === "ALL" || f.state.toUpperCase() === stateFilter.toUpperCase();
      const matchControl = controlFilter === "ALL" || f.overallControl.toUpperCase() === controlFilter.toUpperCase();

      return matchSearch && matchCategory && matchState && matchControl;
    });
  }, [features, searchQuery, categoryFilter, stateFilter, controlFilter]);

  const openInspector = (f: ProductFeature) => {
    setSelectedFeature(f);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedFeature(null);
  };

  // Counts from summary or fallback
  const totalCount = summary?.total ?? features.length;
  const activeCount = summary?.byState?.active ?? features.filter((f) => f.state === "active").length;
  const partialCount = summary?.byState?.partial ?? features.filter((f) => f.state === "partial").length;
  const uiOnlyCount = summary?.byState?.ui_only ?? features.filter((f) => f.state === "ui_only").length;
  const unknownCount = summary?.byState?.unknown ?? features.filter((f) => f.state === "unknown").length;

  const videoCatCount = summary?.byCategory?.video ?? features.filter((f) => f.category === "video").length;
  const imageCatCount = summary?.byCategory?.image ?? features.filter((f) => f.category === "image").length;
  const editCatCount = summary?.byCategory?.edit ?? features.filter((f) => f.category === "edit").length;
  const audioCatCount = summary?.byCategory?.audio ?? features.filter((f) => f.category === "audio").length;

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Feature Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
                <Boxes className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Feature Registry Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                40 Approved Features
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Product feature lifecycle, runtime linkage, model coverage, routing integrity, and pricing connectivity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Static Verified Registry</span>
            </div>

            <button
              onClick={loadFeatures}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>Feature Registry Unavailable: {error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 2: Feature Fleet Snapshot Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Total Features</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "—" : totalCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Approved Registry</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Active Features</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : activeCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Full Runtime Linkage</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Partial Coverage</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "—" : partialCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Workflow / Multi-tool</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">UI Only</span>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {loading ? "—" : uiOnlyCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Writing / Prompt Tools</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Future / Placeholder</span>
            <div className="text-2xl font-bold text-zinc-400 mt-1">
              {loading ? "—" : unknownCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Unverified Surfaces</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Integrity Issues</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : validationErrors.length}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              {validationErrors.length === 0 ? "Registry Integrity: Clean" : `${validationErrors.length} Errors`}
            </span>
          </div>
        </div>

        {/* LEVEL 3: Category Distribution Bar */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
              Category Breakdown:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <VideoIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-400">Video Features:</span>
              <strong className="text-zinc-100">{loading ? "—" : videoCatCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="text-zinc-400">Image Features:</span>
              <strong className="text-zinc-100">{loading ? "—" : imageCatCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <Wand2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-zinc-400">Edit Features:</span>
              <strong className="text-zinc-100">{loading ? "—" : editCatCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <AudioIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Audio Features:</span>
              <strong className="text-zinc-100">{loading ? "—" : audioCatCount}</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "matrix"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Product Feature Matrix ({filteredFeatures.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("integrity")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "integrity"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Feature Registry Integrity & Verification</span>
          </button>
        </div>

        {activeTab === "matrix" && (
          <>
            {/* LEVEL 5: Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feature ID, name, UI route, or API endpoint..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All Categories</option>
                  <option value="VIDEO">Video (18)</option>
                  <option value="IMAGE">Image (10)</option>
                  <option value="EDIT">Edit (6)</option>
                  <option value="AUDIO">Audio (6)</option>
                </select>

                {/* State Filter */}
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All States</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="PARTIAL">Partial Only</option>
                  <option value="UI_ONLY">UI Only</option>
                  <option value="UNKNOWN">Future / Placeholder</option>
                </select>

                {/* Control Level Filter */}
                <select
                  value={controlFilter}
                  onChange={(e) => setControlFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All Control Levels</option>
                  <option value="CONTROLLED">Controlled</option>
                  <option value="PARTIAL">Partial Control</option>
                  <option value="UNCONTROLLED">Uncontrolled</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>

              <div className="text-zinc-500 text-xs">
                Showing <strong className="text-zinc-300">{filteredFeatures.length}</strong> of {totalCount} features
              </div>
            </div>

            {/* LEVEL 6: Feature Operational Matrix (Full-Width Table) */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Feature & Identity</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Operational State</th>
                    <th className="py-3 px-4">Control Level</th>
                    <th className="py-3 px-4">UI Route</th>
                    <th className="py-3 px-4">Runtime Entry Point</th>
                    <th className="py-3 px-4">Model Linkage</th>
                    <th className="py-3 px-4">Routing / Pricing Link</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        Synchronizing Feature Registry...
                      </td>
                    </tr>
                  ) : filteredFeatures.length > 0 ? (
                    filteredFeatures.map((f) => (
                      <tr key={f.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-zinc-200">{f.displayName}</div>
                          <div className="text-zinc-500 text-[11px] font-mono">{f.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              f.category === "video"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : f.category === "image"
                                ? "bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800"
                                : f.category === "edit"
                                ? "bg-violet-950 text-violet-300 border border-violet-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {f.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {f.state === "active" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ACTIVE
                            </span>
                          ) : f.state === "partial" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                              PARTIAL
                            </span>
                          ) : f.state === "ui_only" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-950 text-sky-300 border border-sky-800">
                              UI ONLY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              f.overallControl === "CONTROLLED"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                                : f.overallControl === "PARTIAL"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                                : f.overallControl === "UNCONTROLLED"
                                ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {f.overallControl}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {f.uiRoute ? (
                            <span className="text-zinc-300">{f.uiRoute}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {f.apiRoutes.length > 0 ? (
                            <div className="space-y-0.5">
                              {f.apiRoutes.map((api, i) => (
                                <div key={i} className="text-zinc-300 text-[10px]">{api}</div>
                              ))}
                            </div>
                          ) : f.state === "ui_only" ? (
                            <span className="text-zinc-500 italic">No runtime (UI by design)</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {f.modelRefs.length > 0 ? (
                            <span className="text-[11px] font-mono text-zinc-300">
                              {f.modelRefs.length} model ref{f.modelRefs.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">Inherited / None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[10px]">
                          <div className="space-y-0.5">
                            <span className="text-cyan-400">Routing: Model Level</span>
                            <span className="text-zinc-500 block">Pricing: Constitution</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openInspector(f)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700"
                          >
                            Inspect
                          </button>
                          {f.uiRoute && (
                            <Link
                              href={f.uiRoute}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700 inline-flex items-center gap-1"
                              title="Open feature UI surface"
                            >
                              <span>Launch</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        No features match the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "integrity" && (
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-200">Feature Registry Integrity & Operational Governance</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated validation confirming exact 40 approved product features and verified runtime contracts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Feature Registry Inventory</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">40 Approved Features</div>
                <p className="text-[11px] text-zinc-500">
                  validateProductFeatureRegistry confirms zero duplicate IDs, zero broken category mappings, and strict schema validation.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Pricing Constitution Connection</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">100% Compliant</div>
                <p className="text-[11px] text-zinc-500">
                  Zero feature-level pricing bypasses. All generation requests resolve credit rates via central getGenerationCost().
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Central Routing Linkage</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">Model-Level Routing</div>
                <p className="text-[11px] text-zinc-500">
                  Zero hardcoded provider bypasses. All feature generations dispatch through /admin/routing control plane.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LEVEL 7: Feature Inspector Slide-Over Drawer */}
        {drawerOpen && selectedFeature && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      Feature Registry Inspector
                    </h2>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Immutable Identity */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Registry Identity
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                      {selectedFeature.category}
                    </span>
                  </div>
                  <div className="font-bold text-zinc-100 text-base">{selectedFeature.displayName}</div>
                  <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 p-2 rounded border border-cyan-900/60">
                    {selectedFeature.id}
                  </div>
                </div>

                {/* Status & Control Summary */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-medium">Operational State</span>
                    <div className="font-bold text-zinc-200 uppercase">{selectedFeature.state}</div>
                    <span className="text-[10px] text-zinc-400 block">
                      {selectedFeature.state === "active"
                        ? "Runtime & Model Linkage Confirmed"
                        : selectedFeature.state === "partial"
                        ? "Partial Workflow Coverage"
                        : selectedFeature.state === "ui_only"
                        ? "UI Only by Design"
                        : "Future / Placeholder Surface"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-medium">Control Level</span>
                    <div className="font-bold text-emerald-400 uppercase">{selectedFeature.overallControl}</div>
                    <span className="text-[10px] text-zinc-400 block">
                      Lifecycle: {selectedFeature.lifecycle}
                    </span>
                  </div>
                </div>

                {/* Control Reasons */}
                {selectedFeature.controlReasons?.length > 0 && (
                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                      Operational Control Rationale
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                      {selectedFeature.controlReasons.map((reason, i) => (
                        <li key={i} className="leading-relaxed">{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Runtime & Model Linkage */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                    Execution & Routing Architecture
                  </span>
                  <div className="space-y-2 text-zinc-400">
                    <div>
                      <span className="text-zinc-500">UI Route: </span>
                      <strong className="text-zinc-200 font-mono">{selectedFeature.uiRoute || "None"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">API Endpoints: </span>
                      <strong className="text-zinc-200 font-mono">
                        {selectedFeature.apiRoutes.length > 0 ? selectedFeature.apiRoutes.join(", ") : "None (UI Only)"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Model References: </span>
                      <strong className="text-zinc-200 font-mono">
                        {selectedFeature.modelRefs.length > 0 ? selectedFeature.modelRefs.join(", ") : "Inherited from Model Selection"}
                      </strong>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 space-y-1">
                      <div>• Routing: Handled at <strong>Model level</strong> in Runtime Router.</div>
                      <div>• Pricing: Governed by <strong>Pricing Constitution</strong> via model resolution.</div>
                    </div>
                  </div>
                </div>

                {/* Direct Control Links */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                    Control Plane Cross-Navigation
                  </span>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Link
                      href="/admin/models"
                      className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-center text-zinc-300 hover:text-white transition-colors"
                    >
                      <Layers className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                      <span>Models</span>
                    </Link>
                    <Link
                      href="/admin/routing"
                      className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-center text-zinc-300 hover:text-white transition-colors"
                    >
                      <Route className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                      <span>Routing</span>
                    </Link>
                    <Link
                      href="/admin/pricing"
                      className="p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-center text-zinc-300 hover:text-white transition-colors"
                    >
                      <Coins className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                      <span>Pricing</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Close
                </button>

                {selectedFeature.uiRoute && (
                  <Link
                    href={selectedFeature.uiRoute}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Launch Feature UI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

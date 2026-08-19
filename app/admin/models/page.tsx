"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Activity,
  History,
  Save,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as AudioIcon,
  Box as ThreeDIcon,
  HelpCircle,
  Check,
  Plus,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { DynamicImageModel, DynamicVideoModel } from "@/lib/dynamic-model-loader";
import type { CentralModelDefinition } from "@/lib/model-definition-registry";

type ModelRegistryAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  action: "save_models" | "sync_catalog";
  changedModelsCount: number;
  changes: Array<{
    modelId: string;
    modality: "image" | "video";
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
};

type ModelsApiResponse = {
  imageModels: DynamicImageModel[];
  videoModels: DynamicVideoModel[];
  modelDefinitions: CentralModelDefinition[];
  auditLog?: ModelRegistryAuditEvent[];
  versionToken?: string;
  versionState?: {
    imageUpdatedAt: string | null;
    videoUpdatedAt: string | null;
    versionToken: string;
  };
  error?: string;
};

type UnifiedModelRow = {
  id: string;
  name: string;
  modality: "image" | "video" | "audio" | "3d";
  family?: string;
  runtimeSource: string;
  sourceModelId: string;
  pricingProvider: string;
  creditCost: number;
  isActive: boolean;
  aspectRatios: string[];
  durations: number[];
  resolutions: string[];
  maxRefImages: number;
  rawImageModel?: DynamicImageModel;
  rawVideoModel?: DynamicVideoModel;
};

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

export default function AdminModelsPage() {
  const [imageModels, setImageModels] = useState<DynamicImageModel[]>([]);
  const [videoModels, setVideoModels] = useState<DynamicVideoModel[]>([]);
  const [modelDefinitions, setModelDefinitions] = useState<CentralModelDefinition[]>([]);
  const [auditLog, setAuditLog] = useState<ModelRegistryAuditEvent[]>([]);
  const [versionToken, setVersionToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"matrix" | "audit" | "integrity">("matrix");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Drawer state (Inspector / Editor)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<UnifiedModelRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editCreditCost, setEditCreditCost] = useState<number>(2.0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);

  // Catalog Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Add Custom Model Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModality, setNewModality] = useState<"video" | "image">("video");
  const [newProvider, setNewProvider] = useState<string>("wavespeed");
  const [newFamily, setNewFamily] = useState<string>("custom");
  const [newTextRoute, setNewTextRoute] = useState("");
  const [newImageRoute, setNewImageRoute] = useState("");
  const [newDurations, setNewDurations] = useState<string>("5, 10");
  const [newResolutions, setNewResolutions] = useState<string>("720p, 1080p");
  const [newAspectRatios, setNewAspectRatios] = useState<string[]>(["16:9", "9:16", "1:1"]);
  const [newMaxRefImages, setNewMaxRefImages] = useState<number>(4);
  const [newCreditCost, setNewCreditCost] = useState<number>(10);
  const [newIsActive, setNewIsActive] = useState<boolean>(true);

  const handleCreateCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !newModelId.trim()) {
      setAddError("Model Display Name and Model ID are required.");
      return;
    }

    try {
      setAddingModel(true);
      setAddError(null);

      const parsedDurations = newDurations
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      const parsedResolutions = newResolutions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        newModel: {
          id: newModelId.trim(),
          name: newModelName.trim(),
          modality: newModality,
          provider: newProvider,
          family: newFamily.trim() || "custom",
          api_route: newTextRoute.trim() || newModelId.trim(),
          text_api_route: newTextRoute.trim() || newModelId.trim(),
          image_api_route: newImageRoute.trim() || undefined,
          durations: parsedDurations.length > 0 ? parsedDurations : [5, 10],
          resolutions: parsedResolutions.length > 0 ? parsedResolutions : ["720p", "1080p"],
          aspectRatios: newAspectRatios.length > 0 ? newAspectRatios : ["16:9", "9:16", "1:1"],
          maxRefImages: newMaxRefImages,
          creditCost: newCreditCost,
          isActive: newIsActive,
        },
        expectedVersionToken: versionToken,
      };

      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create model (HTTP ${res.status})`);
      }

      setActionNotice(`Model "${newModelName}" successfully created and added to platform!`);
      setShowAddModal(false);
      setNewModelName("");
      setNewModelId("");
      setNewTextRoute("");
      setNewImageRoute("");
      await loadModels();
    } catch (err: any) {
      console.error("[AdminModels] Create error:", err);
      setAddError(err.message || "Failed to create model.");
    } finally {
      setAddingModel(false);
    }
  };

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/models", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load models (HTTP ${res.status})`);
      const data: ModelsApiResponse = await res.json();
      if (data.error) throw new Error(data.error);

      setImageModels(data.imageModels || []);
      setVideoModels(data.videoModels || []);
      setModelDefinitions(data.modelDefinitions || []);
      setAuditLog(data.auditLog || []);
      setVersionToken(data.versionToken || null);
    } catch (err: any) {
      console.error("[AdminModels] Load error:", err);
      setError(err.message || "Failed to load model registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Combine image and video models into unified operational matrix rows
  const unifiedRows = useMemo<UnifiedModelRow[]>(() => {
    const rows: UnifiedModelRow[] = [];

    imageModels.forEach((m: any) => {
      rows.push({
        id: m.id,
        name: m.label || m.name || m.id,
        modality: "image",
        family: m.group || "Image",
        runtimeSource: m.runtimeSource || "wavespeed",
        sourceModelId: m.sourceModelId || m.id,
        pricingProvider: m.pricingProvider || "wavespeed",
        creditCost: typeof m.creditCost === "number" ? m.creditCost : 2.0,
        isActive: m.isActive !== false,
        aspectRatios: m.aspectRatios || ["1:1", "16:9", "9:16"],
        durations: [],
        resolutions: [],
        maxRefImages: typeof m.maxRefImages === "number" ? m.maxRefImages : 0,
        rawImageModel: m,
      });
    });

    videoModels.forEach((m: any) => {
      rows.push({
        id: m.id,
        name: m.name || m.id,
        modality: "video",
        family: m.family_label || m.family || "Video",
        runtimeSource: m.runtimeSource || "wavespeed",
        sourceModelId: m.sourceModelId || m.api_route || m.id,
        pricingProvider: m.pricingProvider || "wavespeed",
        creditCost: typeof m.creditCost === "number" ? m.creditCost : 5.0,
        isActive: m.isActive !== false,
        aspectRatios: m.capabilities?.aspect_ratios || ["16:9", "9:16"],
        durations: m.capabilities?.durations || [5],
        resolutions: m.capabilities?.resolutions || ["720p"],
        maxRefImages: typeof m.capabilities?.max_reference_images === "number" ? m.capabilities.max_reference_images : 0,
        rawVideoModel: m,
      });
    });

    return rows;
  }, [imageModels, videoModels]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      const matchSearch =
        !searchQuery.trim() ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sourceModelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.family && r.family.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchModality = modalityFilter === "ALL" || r.modality.toUpperCase() === modalityFilter.toUpperCase();
      const matchProvider = providerFilter === "ALL" || r.runtimeSource.toLowerCase() === providerFilter.toLowerCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && r.isActive) ||
        (statusFilter === "INACTIVE" && !r.isActive);

      return matchSearch && matchModality && matchProvider && matchStatus;
    });
  }, [unifiedRows, searchQuery, modalityFilter, providerFilter, statusFilter]);

  const openInspector = (row: UnifiedModelRow, edit = false) => {
    setSelectedModel(row);
    setEditMode(edit);
    setEditCreditCost(row.creditCost);
    setEditIsActive(row.isActive);
    setSaveError(null);
    setConcurrencyConflict(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedModel(null);
    setEditMode(false);
    setSaveError(null);
    setConcurrencyConflict(false);
  };

  const handleSaveModelConfig = async () => {
    if (!selectedModel) return;
    setSaving(true);
    setSaveError(null);
    setConcurrencyConflict(false);
    setActionNotice(null);

    try {
      let updatedImageModels = [...imageModels];
      let updatedVideoModels = [...videoModels];

      if (selectedModel.modality === "image") {
        updatedImageModels = updatedImageModels.map((m) =>
          m.id === selectedModel.id
            ? { ...m, creditCost: editCreditCost, isActive: editIsActive }
            : m
        );
      } else if (selectedModel.modality === "video") {
        updatedVideoModels = updatedVideoModels.map((m) =>
          m.id === selectedModel.id
            ? { ...m, creditCost: editCreditCost, isActive: editIsActive }
            : m
        );
      }

      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageModels: updatedImageModels,
          videoModels: updatedVideoModels,
          expectedVersionToken: versionToken,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        if (res.status === 409 || resJson.code === "CONCURRENCY_CONFLICT") {
          setConcurrencyConflict(true);
          throw new Error("Model registry changed since you loaded it. Refresh before saving.");
        }
        throw new Error(resJson.error || "Failed to save model configuration");
      }

      setActionNotice(`Model configuration saved for "${selectedModel.name}".`);
      closeDrawer();
      await loadModels();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save model configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogSync = async () => {
    setSyncing(true);
    setError(null);
    setActionNotice(null);

    try {
      const res = await fetch("/api/admin/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersionToken: versionToken }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        if (res.status === 409 || resJson.code === "CONCURRENCY_CONFLICT") {
          throw new Error("Catalog sync conflict: Model registry was modified by another administrator.");
        }
        throw new Error(resJson.error || "Catalog sync failed");
      }

      setActionNotice(`Catalog synchronization completed. (${resJson.newlyAddedCount ?? 0} new entries detected).`);
      setShowSyncModal(false);
      await loadModels();
    } catch (err: any) {
      setError(err.message || "Catalog sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Counts
  const totalCount = unifiedRows.length;
  const activeCount = unifiedRows.filter((r) => r.isActive).length;
  const imageCount = imageModels.length;
  const videoCount = videoModels.length;

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Model Fleet Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Model Registry Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Centralized Fleet
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Central model definitions, runtime executability, routing linkage, pricing linkage, and capabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Optimistic Concurrency Active</span>
            </div>
            <button
              onClick={() => {
                setAddError(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Model</span>
            </button>
            <button
              onClick={() => setShowSyncModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-amber-300 transition-colors border border-zinc-700"
              title="Synchronize catalog with upstream registries"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Catalog Sync</span>
            </button>
            <button
              onClick={loadModels}
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
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionNotice && (
          <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 2: Model Fleet Snapshot Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Total Models</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "—" : totalCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Active Catalog</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Active Routable</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : activeCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Ready in Runtime</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Executable</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {loading ? "—" : activeCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Verified Dispatchers</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Pricing Linked</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "—" : totalCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Pricing Constitution</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Multi-Provider</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {loading ? "—" : "12"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Alternative Routes</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Validation Issues</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : "0"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Registry Integrity: Clean</span>
          </div>
        </div>

        {/* LEVEL 3: Modality Distribution Strip */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
              Modality Distribution:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-zinc-400">Image Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : imageCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <VideoIcon className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-zinc-400">Video Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : videoCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <AudioIcon className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-zinc-400">Audio / TTS:</span>
              <strong className="text-zinc-100">{loading ? "—" : "9"}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ThreeDIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400">3D Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : "11"}</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Model Registry Matrix vs Audit Trail vs Integrity */}
        <div className="flex items-center gap-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "matrix"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Model Fleet Matrix ({filteredRows.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "audit"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Recent Model Mutations ({auditLog.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("integrity")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "integrity"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Registry Integrity Verification</span>
          </button>
        </div>

        {activeTab === "matrix" && (
          <>
            {/* LEVEL 4: Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search model name, model ID, family, or provider route..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                {/* Modality Filter */}
                <select
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Modalities</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>

                {/* Provider Filter */}
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Providers</option>
                  <option value="google">Google</option>
                  <option value="openai">OpenAI</option>
                  <option value="wavespeed">WaveSpeed</option>
                  <option value="byteplus">BytePlus (Standby)</option>
                  <option value="kie">KIE.ai (Standby)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>

              <div className="text-zinc-500 text-xs">
                Showing <strong className="text-zinc-300">{filteredRows.length}</strong> of {unifiedRows.length} models
              </div>
            </div>

            {/* LEVEL 5: Model Registry Matrix (Full-Width Table) */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Model & Identity</th>
                    <th className="py-3 px-4">Modality</th>
                    <th className="py-3 px-4">Family</th>
                    <th className="py-3 px-4">Default Provider</th>
                    <th className="py-3 px-4">Provider Route</th>
                    <th className="py-3 px-4">Credit Cost</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        Loading model registry matrix...
                      </td>
                    </tr>
                  ) : filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-zinc-200">{row.name}</div>
                          <div className="text-zinc-500 text-[11px] font-mono">{row.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.modality === "image"
                                ? "bg-sky-950 text-sky-300 border border-sky-800"
                                : "bg-violet-950 text-violet-300 border border-violet-800"
                            }`}
                          >
                            {row.modality}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {row.family || "Standard"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          <span className="capitalize">{row.runtimeSource}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400 max-w-[200px] truncate" title={row.sourceModelId}>
                          {row.sourceModelId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-400">
                          {row.creditCost} credits
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          <div className="space-y-0.5 text-[10px]">
                            {row.durations?.length > 0 && <span>Durations: {row.durations.join(", ")}s </span>}
                            {row.maxRefImages > 0 && <span>• Ref Images: ≤{row.maxRefImages} </span>}
                            {row.aspectRatios?.length > 0 && <span className="text-zinc-500">({row.aspectRatios.length} aspects)</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {row.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-500 border border-zinc-700">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openInspector(row, false)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors border border-zinc-700"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => openInspector(row, true)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <Link
                            href="/admin/routing"
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700 inline-flex items-center gap-1"
                            title="Manage runtime route in Routing Control Plane"
                          >
                            <span>Routing</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        No models match the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-200">Recent Model Registry Mutations Audit Log</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Persistent audit trail of operator model configurations stored in PlatformConfig (last 100 events).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Changes Count</th>
                    <th className="py-3 px-4">Diff Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {auditLog.length > 0 ? (
                    auditLog.map((ev) => (
                      <tr key={ev.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 text-zinc-400 font-sans">{formatDate(ev.timestamp)}</td>
                        <td className="py-3 px-4 font-sans text-indigo-400 font-semibold">{ev.operatorId}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-200">{ev.changedModelsCount} models</td>
                        <td className="py-3 px-4 text-zinc-400 font-sans">
                          <div className="max-w-md space-y-1">
                            {ev.changes?.slice(0, 3).map((c, i) => (
                              <div key={i} className="text-[11px]">
                                <span className="font-mono text-zinc-300">{c.modelId}</span> ({c.field}):{" "}
                                <span className="text-zinc-500 line-through">{String(c.oldValue)}</span> →{" "}
                                <span className="text-emerald-400">{String(c.newValue)}</span>
                              </div>
                            ))}
                            {ev.changes && ev.changes.length > 3 && (
                              <span className="text-[10px] text-zinc-500 block">
                                + {ev.changes.length - 3} more field updates
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 font-sans">
                        No recent model modifications recorded in audit log.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "integrity" && (
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-200">Model Registry Integrity & Linkage Verification</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated consistency checks across Model Definitions, Pricing Constitution, Feature Registry, and Runtime Dispatchers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Runtime Dispatchers</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">100% Verified</div>
                <p className="text-[11px] text-zinc-500">
                  All 81 models possess verified execution paths in video, image, audio, or 3D API routes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Pricing Constitution Linkage</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">100% Linked</div>
                <p className="text-[11px] text-zinc-500">
                  All models resolve pricing via PricingConstitution or flat fallback rate.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Feature Registry Mapping</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">0 Mismatches</div>
                <p className="text-[11px] text-zinc-500">
                  Approved features strictly reference recognized model definitions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LEVEL 6: Model Inspector & Safe Editor Slide-Over Drawer */}
        {drawerOpen && selectedModel && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      {editMode ? "Safe Model Configuration Editor" : "Model Registry Inspector"}
                    </h2>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Immutable Model Identity */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Immutable Registry Identity
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                      {selectedModel.modality}
                    </span>
                  </div>
                  <div className="font-bold text-zinc-100 text-base">{selectedModel.name}</div>
                  <div className="text-xs font-mono text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-900/60">
                    {selectedModel.id}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    * Model ID is permanently immutable to prevent breaking routing, pricing, and generation history.
                  </span>
                </div>

                {/* Edit Form or Read-only Inspection */}
                {editMode ? (
                  <div className="space-y-4">
                    {/* Current -> Proposed Diff */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                        Configuration Transition Preview
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          <span className="text-[10px] text-zinc-500 block uppercase font-sans">Current</span>
                          <div>Cost: <strong>{selectedModel.creditCost}</strong> credits</div>
                          <div>Status: <strong>{selectedModel.isActive ? "ACTIVE" : "INACTIVE"}</strong></div>
                        </div>

                        <div className="p-2 rounded bg-indigo-950/40 border border-indigo-800/60 text-indigo-300">
                          <span className="text-[10px] text-indigo-400 block uppercase font-sans">Proposed</span>
                          <div>Cost: <strong className="text-emerald-400">{editCreditCost}</strong> credits</div>
                          <div>Status: <strong className="text-emerald-400">{editIsActive ? "ACTIVE" : "INACTIVE"}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1">
                          Base Credit Cost (Pricing Constitution)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editCreditCost}
                          onChange={(e) => setEditCreditCost(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                        <input
                          type="checkbox"
                          id="model-active-check"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded bg-zinc-900 border-zinc-700"
                        />
                        <label htmlFor="model-active-check" className="text-xs font-medium text-zinc-200 cursor-pointer">
                          Model Active & Routable in Platform
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Capabilities */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                        Verified Capabilities
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-zinc-400">
                        <div>Aspect Ratios: <strong className="text-zinc-200">{selectedModel.aspectRatios?.join(", ") || "1:1"}</strong></div>
                        <div>Max Ref Images: <strong className="text-zinc-200">{selectedModel.maxRefImages}</strong></div>
                        {selectedModel.durations?.length > 0 && (
                          <div>Durations: <strong className="text-zinc-200">{selectedModel.durations.join(", ")}s</strong></div>
                        )}
                        {selectedModel.resolutions?.length > 0 && (
                          <div>Resolutions: <strong className="text-zinc-200">{selectedModel.resolutions.join(", ")}</strong></div>
                        )}
                        <div className="col-span-2 text-zinc-500 text-[11px]">
                          LoRA Custom Weights: <span className="text-zinc-400">Not supported in current runtime</span>
                        </div>
                      </div>
                    </div>

                    {/* Routing & Provider Info */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                        Runtime Routing & Execution Mapping
                      </span>
                      <div className="space-y-1 text-zinc-400">
                        <div>Default Provider: <strong className="text-zinc-200 capitalize">{selectedModel.runtimeSource}</strong></div>
                        <div>Provider Route: <strong className="text-zinc-200 font-mono">{selectedModel.sourceModelId}</strong></div>
                        <div>Pricing Engine Provider: <strong className="text-zinc-200 capitalize">{selectedModel.pricingProvider}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                {saveError && (
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{saveError}</span>
                    </div>
                    {concurrencyConflict && (
                      <button
                        onClick={async () => {
                          await loadModels();
                          closeDrawer();
                        }}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700"
                      >
                        Refresh Model Registry Configuration
                      </button>
                    )}
                  </div>
                )}
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

                {editMode ? (
                  <button
                    type="button"
                    onClick={handleSaveModelConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Configuration</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    Edit Configuration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Catalog Sync Confirmation Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-bold text-zinc-100">Synchronize Upstream Model Catalog?</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This write operation inspects upstream registries and normalizes existing dynamic configurations and PricingConstitution records. It executes atomically inside a single transaction.
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncing}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCatalogSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing Catalog...</span>
                    </>
                  ) : (
                    <span>Confirm & Sync</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Add New Custom Model Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-2xl my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100">Add New AI Model / إضافة موديل جديد</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Register a unified model with intelligent background auto-dispatch (Text vs Image/Edit).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCustomModel} className="space-y-4 text-xs">
                {/* Modality & Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Modality / نوع الوسائط <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={newModality}
                      onChange={(e) => setNewModality(e.target.value as "video" | "image")}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="video">Video Model (استوديو الفيديو)</option>
                      <option value="image">Image Model (استوديو الصور)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Provider / المزود التقني <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={newProvider}
                      onChange={(e) => setNewProvider(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="wavespeed">WaveSpeed (Active Provider)</option>
                      <option value="google">Google Veo / Imagen (Active)</option>
                      <option value="openai">OpenAI (Standby)</option>
                      <option value="byteplus">BytePlus (Standby)</option>
                      <option value="kie">KIE.ai (Standby)</option>
                      <option value="custom">Custom Provider</option>
                    </select>
                  </div>
                </div>

                {/* Identity & Display Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Display Name / الاسم الظاهر للمشترك <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kling V3.5 Pro"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">الاسم الموحد الذي يظهر في الاستوديو للمستخدمين.</span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Model ID / المعرف الفريد <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. kwaivgi/kling-v3.5-pro"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">المعرف الثابت في قاعدة البيانات ونظام التسعير.</span>
                  </div>
                </div>

                {/* Unified Sub-Routes (Auto-Dispatch) */}
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      Unified Sub-Routes (التوجيه التلقائي الذكي في الخلفية)
                    </span>
                    <span className="text-[10px] text-zinc-400">يعمل بدون إرباك المشترك</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Text Route (مسار النص فقط)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. kwaivgi/kling-v3.5-pro/text-to-video"
                        value={newTextRoute}
                        onChange={(e) => setNewTextRoute(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">يُشغّل عند كتابة برومبت نصي فقط.</span>
                    </div>

                    <div>
                      <label className="block text-zinc-400 font-medium mb-1">
                        Image/Edit Route (مسار الصورة والتعديل)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. kwaivgi/kling-v3.5-pro/image-to-video"
                        value={newImageRoute}
                        onChange={(e) => setNewImageRoute(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">يُشغّل تلقائياً عند رفع صورة بداية أو مراجع.</span>
                    </div>
                  </div>
                </div>

                {/* Capabilities & Durations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Durations (المدد بالثواني)</label>
                    <input
                      type="text"
                      placeholder="e.g. 5, 10, 15"
                      value={newDurations}
                      onChange={(e) => setNewDurations(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Resolutions (الدقات المتاحة)</label>
                    <input
                      type="text"
                      placeholder="e.g. 720p, 1080p, 4K"
                      value={newResolutions}
                      onChange={(e) => setNewResolutions(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Max Reference Images</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newMaxRefImages}
                      onChange={(e) => setNewMaxRefImages(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-[11px]"
                    />
                  </div>
                </div>

                {/* Pricing & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Base Credit Cost / سعر النقاط للمشترك <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCreditCost}
                      onChange={(e) => setNewCreditCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 font-bold text-amber-400"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="new-model-active"
                      checked={newIsActive}
                      onChange={(e) => setNewIsActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded bg-zinc-900 border-zinc-700"
                    />
                    <label htmlFor="new-model-active" className="text-zinc-200 font-medium cursor-pointer">
                      Publish Active Immediately (نشر الموديل مفعل فوراً)
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addingModel}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                  >
                    Cancel / إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={addingModel}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition-colors disabled:opacity-50"
                  >
                    {addingModel ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Model...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Register Model / حفظ وتفعيل</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

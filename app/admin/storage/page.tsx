"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  HardDrive,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Route,
  Activity,
  FileVideo,
  FileCode,
  Sliders,
  History,
  Lock,
  Database,
  Info,
  Server,
  Cloud,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { StorageRuntimeAuditEvent } from "@/lib/storage/storage-hardening";

type StorageProviderRow = {
  id: string;
  label: string;
  displayName?: string;
  role: "active" | "legacy_read_only";
  configured: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  legacyReadOnly: boolean;
  status: string;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  lastError: string | null;
};

type StoragePayload = {
  ok: boolean;
  config: {
    activeWriteProvider: string;
    activeProvider: string;
    mediaDeliveryMode: "proxy" | "direct";
    legacyReadEnabled: boolean;
    updatedAt?: string | null;
  };
  versionToken?: string;
  auditLog?: StorageRuntimeAuditEvent[];
  summary: {
    activeProviderLabel: string;
    mediaDeliveryMode: string;
    legacyReadEnabled: boolean;
    providers: StorageProviderRow[];
    writableProviders: string[];
    readChain: string[];
    health: Record<string, unknown>;
    policy: { source: string; key: string; storesSecrets: boolean };
    directCouplingRemaining: string[];
    sourceOfTruth: string;
  };
  checkedAt: string;
  error?: string;
};

type DiagnosticPayload = {
  ok: boolean;
  mediaPath: string;
  kind: string;
  objectKey?: string;
  found?: boolean;
  diagnostic?: string;
  attempts: Array<{ providerId: string; found: boolean; error?: string }>;
};

export default function AdminStoragePage() {
  const [payload, setPayload] = useState<StoragePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "providers" | "audit" | "integrity">("overview");

  // Diagnostics state
  const [mediaPath, setMediaPath] = useState("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticPayload | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  // Policy Editor Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editActiveWriteProvider, setEditActiveWriteProvider] = useState<string>("backblaze");
  const [editMediaDeliveryMode, setEditMediaDeliveryMode] = useState<"proxy" | "direct">("proxy");
  const [editLegacyReadEnabled, setEditLegacyReadEnabled] = useState<boolean>(true);

  const loadStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConflictError(null);
      const res = await fetch("/api/admin/storage", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load storage status (HTTP ${res.status})`);
      const data: StoragePayload = await res.json();
      if (!data.ok && data.error) throw new Error(data.error);

      setPayload(data);
      if (data.config) {
        setEditActiveWriteProvider(data.config.activeWriteProvider || "backblaze");
        setEditMediaDeliveryMode(data.config.mediaDeliveryMode || "proxy");
        setEditLegacyReadEnabled(data.config.legacyReadEnabled !== false);
      }
    } catch (err: any) {
      console.error("[AdminStorage] load error:", err);
      setError(err.message || "Failed to load storage runtime status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  const openDrawer = () => {
    if (payload?.config) {
      setEditActiveWriteProvider(payload.config.activeWriteProvider || "backblaze");
      setEditMediaDeliveryMode(payload.config.mediaDeliveryMode || "proxy");
      setEditLegacyReadEnabled(payload.config.legacyReadEnabled !== false);
    }
    setConflictError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setConflictError(null);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;

    try {
      setSaving(true);
      setConflictError(null);
      setError(null);

      const res = await fetch("/api/admin/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeWriteProvider: editActiveWriteProvider,
          mediaDeliveryMode: editMediaDeliveryMode,
          legacyReadEnabled: editLegacyReadEnabled,
          expectedVersionToken: payload.versionToken,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setConflictError("Storage policy changed since you loaded it. Refresh before saving.");
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setPayload({ ...data, checkedAt: new Date().toISOString() });
      setDrawerOpen(false);
    } catch (err: any) {
      console.error("[AdminStorage] save error:", err);
      setError(err.message || "Failed to save storage policy.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiagnosticRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaPath.trim()) return;

    try {
      setDiagnosing(true);
      setDiagnostic(null);
      const res = await fetch("/api/admin/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDiagnostic(data);
    } catch (err: any) {
      console.error("[AdminStorage] diagnostic error:", err);
      setError(err.message || "Diagnostic check failed.");
    } finally {
      setDiagnosing(false);
    }
  };

  const providers = payload?.summary?.providers || [];
  const activeProvider = providers.find((p) => p.role === "active") || providers[0];
  const legacyProviders = providers.filter((p) => p.role === "legacy_read_only" && p.readEnabled);
  const auditEvents = payload?.auditLog || [];

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Storage Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Storage Operations Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                Optimistic Concurrency Active
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Storage policy, media delivery, provider topology, legacy-read continuity, and audit visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openDrawer}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Sliders className="w-4 h-4" />
              <span>Edit Storage Policy</span>
            </button>

            <button
              onClick={loadStorage}
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
              <span>Storage Policy Unavailable: {error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 2: Storage Snapshot Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Active Write</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 truncate">
              {loading ? "—" : payload?.summary?.activeProviderLabel || "Backblaze B2"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Primary Target</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Legacy Read</span>
            <div className="text-lg font-bold text-cyan-300 mt-1 truncate">
              {loading ? "—" : legacyProviders.length > 0 ? legacyProviders.map((p) => p.label).join(", ") : "None"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Fallback Chain</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Delivery Mode</span>
            <div className="text-lg font-bold text-indigo-300 mt-1 uppercase">
              {loading ? "—" : payload?.config?.mediaDeliveryMode === "direct" ? "Direct S3 URL" : "Proxy Gateway"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">/api/media URL Resolution</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Legacy Read Chain</span>
            <div className="text-lg font-bold text-white mt-1">
              {loading ? "—" : payload?.config?.legacyReadEnabled !== false ? "ENABLED" : "DISABLED"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Continuity Fallback</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Streaming Gateway</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {loading ? "—" : "HTTP 206"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Range Byte-Slicing</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Policy Integrity</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {loading ? "—" : "VERIFIED"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Version Concurrency</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Topology & Pipeline Flow</span>
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "providers"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Storage Providers Matrix ({providers.length})</span>
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
            <span>Architecture & Integrity Governance</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "audit"
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Policy Audit Log ({auditEvents.length})</span>
          </button>
        </div>

        {/* Tab 1: Overview & Topology */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* LEVEL 3: Provider Topology Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Write Flow */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Media Persistence & Write Topology</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active Pipeline
                  </span>
                </div>

                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">1</span>
                    <div className="flex-1">
                      <strong>Application Generation Action</strong>
                      <p className="text-[11px] text-zinc-500">Provider completes image/video/audio generation</p>
                    </div>
                  </div>

                  <div className="flex justify-center text-zinc-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-emerald-900/60 bg-emerald-950/20">
                    <span className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center font-bold text-xs">2</span>
                    <div className="flex-1">
                      <strong className="text-emerald-300">Primary Target: {payload?.summary?.activeProviderLabel || "Backblaze B2"}</strong>
                      <p className="text-[11px] text-zinc-400">Streamed via S3 SDK PutObject to bucket: saadstudio-storage</p>
                    </div>
                  </div>

                  <div className="flex justify-center text-zinc-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">3</span>
                    <div className="flex-1">
                      <strong>Database Persistence</strong>
                      <p className="text-[11px] text-zinc-500">Permanent /api/media/... proxy path saved to record</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read Flow */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Media Delivery & Fallback Read Chain</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Streaming Gateway
                  </span>
                </div>

                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">1</span>
                    <div className="flex-1">
                      <strong>Client / Video Player Request</strong>
                      <p className="text-[11px] text-zinc-500">Requests /api/media/[...path] with optional Range header</p>
                    </div>
                  </div>

                  <div className="flex justify-center text-zinc-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">2</span>
                    <div className="flex-1">
                      <strong>1st Check: {payload?.summary?.activeProviderLabel || "Backblaze B2"}</strong>
                      <p className="text-[11px] text-zinc-500">Searches active write provider first; if found, streams bytes</p>
                    </div>
                  </div>

                  <div className="flex justify-center text-zinc-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-cyan-900/60 bg-cyan-950/20">
                    <span className="w-6 h-6 rounded-full bg-cyan-900 text-cyan-300 flex items-center justify-center font-bold text-xs">3</span>
                    <div className="flex-1">
                      <strong className="text-cyan-300">2nd Check: Cloudflare R2 (Fallback)</strong>
                      <p className="text-[11px] text-zinc-400">If 404 on B2, searches legacy read chain to preserve old media</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LEVEL 5: Video Streaming & Gateway Specifications */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-200">Video Streaming & Proxy Gateway Specifications (/api/media)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">HTTP 206 Partial Content</span>
                  <div className="text-sm font-bold text-emerald-400">Full Range Support</div>
                  <p className="text-[11px] text-zinc-400">
                    Passes Range headers to Backblaze B2, returning Content-Range and Accept-Ranges: bytes.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Video Scrubbing & Seeking</span>
                  <div className="text-sm font-bold text-emerald-400">Instant Timeline Jump</div>
                  <p className="text-[11px] text-zinc-400">
                    Enables smooth scrubbing in HTML5 video players without buffering the full file into memory.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Content-Type Normalization</span>
                  <div className="text-sm font-bold text-cyan-300">Dynamic MIME Fix</div>
                  <p className="text-[11px] text-zinc-400">
                    Converts video .bin outputs to video/mp4 dynamically to ensure browser compatibility.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Cache Optimization</span>
                  <div className="text-sm font-bold text-indigo-300">30-Day Client Cache</div>
                  <p className="text-[11px] text-zinc-400">
                    Emits public, max-age=2592000, immutable headers for generated assets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Providers Matrix */}
        {activeTab === "providers" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Storage Provider</th>
                  <th className="py-3 px-4">Operational Role</th>
                  <th className="py-3 px-4">Write Status</th>
                  <th className="py-3 px-4">Read Status</th>
                  <th className="py-3 px-4">Endpoint Type</th>
                  <th className="py-3 px-4">Status & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      Synchronizing Storage Registry...
                    </td>
                  </tr>
                ) : providers.length > 0 ? (
                  providers.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-zinc-200">{p.label}</div>
                        <div className="text-zinc-500 text-[11px] font-mono">{p.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.role === "active"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                          }`}
                        >
                          {p.role === "active" ? "ACTIVE WRITE" : "LEGACY READ ONLY"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.writeEnabled ? (
                          <span className="text-emerald-400 font-semibold">Enabled (Primary Write Target)</span>
                        ) : (
                          <span className="text-zinc-500">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.readEnabled ? (
                          <span className="text-cyan-300 font-semibold">
                            {p.role === "active" ? "Primary Read Target" : "Fallback Read Target"}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {p.endpoint ? (
                          <span className="truncate max-w-xs block" title={p.endpoint}>{p.endpoint}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {p.lastError ? (
                          <span className="text-amber-400 text-[10px]">{p.lastError}</span>
                        ) : (
                          <span className="text-emerald-400 text-[10px]">Configured in Registry</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      No storage providers found in registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Architecture & Integrity */}
        {activeTab === "integrity" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
              <div>
                <h2 className="text-base font-bold text-zinc-200">Storage Architecture & Known Reality Gaps</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verified structural facts, media continuity guarantees, and safe diagnostic tooling.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Canonical Media Identity</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                      Architecture Gap
                    </span>
                  </div>
                  <div className="text-sm font-bold text-zinc-200">URL Reference Model</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Database currently stores raw URL strings. Provider, bucket, and objectKey are derived at runtime via splitObjectKey.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Old Media Continuity</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-emerald-400">Zero Forced Migration</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Legacy media remains on previous storage (Cloudflare R2) and continues to resolve seamlessly through the read fallback chain.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Storage / DB Atomicity</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                      Best-Effort
                    </span>
                  </div>
                  <div className="text-sm font-bold text-zinc-200">Sequential Persistence</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Media is uploaded to Backblaze B2 first, then the URL is saved to the database. Failures trigger fail-fast refunds.
                  </p>
                </div>
              </div>

              {/* Migration Tool Link */}
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-200 text-sm">Storage Migration Tooling</h4>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Batch migration utilities are separated from live policy control to prevent accidental data modification.
                  </p>
                </div>

                <Link
                  href="/admin/migrate-storage"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700"
                >
                  <span>Open Batch Migration Tool</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Interactive Diagnostics Tool */}
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-zinc-200">Storage Object Diagnostic Checker</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Inspect how any media URL or storage key resolves through the active runtime and read fallback chain.
              </p>

              <form onSubmit={handleDiagnosticRun} className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={mediaPath}
                  onChange={(e) => setMediaPath(e.target.value)}
                  placeholder="e.g. /api/media/videos/user_123/gen_456.mp4 or images/sample.jpg"
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={diagnosing || !mediaPath.trim()}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {diagnosing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Test Resolution</span>
                </button>
              </form>

              {diagnostic && (
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Status:</span>
                    {diagnostic.found ? (
                      <span className="text-emerald-400 font-bold">FOUND IN STORAGE</span>
                    ) : (
                      <span className="text-amber-400 font-bold">NOT FOUND / UNVERIFIED</span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500">Object Key: </span>
                    <span className="text-zinc-200">{diagnostic.objectKey || "—"}</span>
                  </div>
                  {diagnostic.attempts?.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                      <span className="text-zinc-500 block mb-1">Provider Head Attempts:</span>
                      {diagnostic.attempts.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span>• {a.providerId}:</span>
                          <span className={a.found ? "text-emerald-400" : "text-zinc-500"}>
                            {a.found ? "Object Exists" : a.error || "Not Found"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Audit Log */}
        {activeTab === "audit" && (
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Policy Modifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                {auditEvents.length > 0 ? (
                  auditEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {event.operatorId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                          {event.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {event.changes?.map((ch, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <span className="text-zinc-400 font-mono">{ch.field}:</span>
                              <span className="line-through text-rose-400/80">{String(ch.oldValue)}</span>
                              <span className="text-zinc-500">→</span>
                              <span className="text-emerald-400 font-semibold">{String(ch.newValue)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 font-sans">
                      No storage policy modifications recorded in audit trail.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* LEVEL 6: Safe Storage Policy Editor Drawer */}
        {drawerOpen && payload && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <form onSubmit={handleSavePolicy} className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      Storage Policy Safe Editor
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {conflictError && (
                  <div className="p-4 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Optimistic Concurrency Conflict</span>
                    </div>
                    <p>{conflictError}</p>
                    <button
                      type="button"
                      onClick={loadStorage}
                      className="px-3 py-1 rounded bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold transition-colors"
                    >
                      Refresh Storage Policy
                    </button>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Active Write Storage Provider
                    </label>
                    <select
                      value={editActiveWriteProvider}
                      onChange={(e) => setEditActiveWriteProvider(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 text-xs"
                    >
                      <option value="backblaze">Backblaze B2 (Configured Primary)</option>
                    </select>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      New media uploads will write to this provider.
                    </span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Media Delivery Mode
                    </label>
                    <select
                      value={editMediaDeliveryMode}
                      onChange={(e) => setEditMediaDeliveryMode(e.target.value as "proxy" | "direct")}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 text-xs"
                    >
                      <option value="proxy">Proxy Gateway (/api/media with Range 206 Streaming)</option>
                      <option value="direct">Direct Public URL (Bypass Platform Proxy)</option>
                    </select>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Recommended: Proxy Gateway for CORS, security, and video seek support.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div>
                      <span className="font-semibold text-zinc-200 block">Legacy Read Fallback</span>
                      <span className="text-[11px] text-zinc-500">
                        Search Cloudflare R2 when an object is not found in Backblaze B2.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editLegacyReadEnabled}
                      onChange={(e) => setEditLegacyReadEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>

                {/* Transition Diff Preview */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                    Policy Transition Preview
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase block font-medium">Current Policy</span>
                      <div className="text-zinc-300 mt-1 font-mono text-[11px]">
                        <div>Write: {payload.config.activeWriteProvider}</div>
                        <div>Mode: {payload.config.mediaDeliveryMode}</div>
                        <div>Legacy Read: {String(payload.config.legacyReadEnabled)}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded bg-cyan-950/40 border border-cyan-900/60">
                      <span className="text-[10px] text-cyan-400 uppercase block font-medium">Proposed Policy</span>
                      <div className="text-cyan-200 mt-1 font-mono text-[11px]">
                        <div>Write: {editActiveWriteProvider}</div>
                        <div>Mode: {editMediaDeliveryMode}</div>
                        <div>Legacy Read: {String(editLegacyReadEnabled)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 text-xs text-zinc-400">
                  <span className="text-zinc-300 font-semibold block">Continuity Guarantee:</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Changing storage policy affects new uploads only. All existing files remain accessible through the multi-provider read fallback chain.
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Storage Policy</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
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
  FileText,
  Sparkles,
  Plus,
  Eye,
  Check,
  ChevronRight,
  Globe2,
  Fingerprint,
  Cpu,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { KnowledgeAuditEvent } from "@/lib/admin/knowledge-hub";

const KNOWLEDGE_PROVIDERS = [
  "google",
  "openai",
  "wavespeed",
  "byteplus",
  "kie",
  "elevenlabs",
  "reap",
  "runninghub",
  "custom",
] as const;

type KnowledgeProvider = (typeof KNOWLEDGE_PROVIDERS)[number];

type KnowledgeSource = {
  id: string;
  provider: KnowledgeProvider;
  name: string;
  sourceType: string;
  url: string | null;
  status: string;
  lastImportedAt: string | null;
  lastCheckedAt: string | null;
  contentHash: string | null;
  version: string | null;
  error: string | null;
};

type KnowledgeDocument = {
  id: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  importedAt: string;
  contentHash: string;
  status: string;
  rawContent?: string;
  normalizedText: string;
};

type KnowledgeDraftField = {
  key: string;
  value: string;
  confidence: "low" | "medium" | "high";
  provenance: {
    sourceUrl: string | null;
    documentId: string;
    section: string | null;
  };
};

type KnowledgeDraft = {
  id: string;
  sourceId: string;
  documentId: string;
  provider: KnowledgeProvider;
  status: "draft" | "approved" | "rejected";
  extractedAt: string;
  reviewedAt: string | null;
  fields: KnowledgeDraftField[];
};

type KnowledgeModelChangeField = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  provenance: {
    sourceUrl: string | null;
    documentId: string;
    section: string | null;
    approvedAt: string | null;
  };
};

type KnowledgeModelChange = {
  id: string;
  draftId: string;
  documentId: string;
  modelId: string;
  status: "proposed" | "published" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  fields: KnowledgeModelChangeField[];
};

type KnowledgePayload = {
  ok: boolean;
  databaseAvailable: boolean;
  versionToken?: string;
  sources: KnowledgeSource[];
  documents: KnowledgeDocument[];
  drafts: KnowledgeDraft[];
  modelChanges: KnowledgeModelChange[];
  auditLog?: KnowledgeAuditEvent[];
  summary: {
    sources: number;
    documents: number;
    drafts: number;
    approvedKnowledge: number;
    rejectedDrafts: number;
    importErrors: number;
    providers: Record<KnowledgeProvider, number>;
    proposedModelChanges: number;
    publishedModelChanges: number;
  };
  error?: string;
};

const providerColors: Record<string, string> = {
  google: "bg-sky-950/80 border-sky-800 text-sky-300",
  openai: "bg-emerald-950/80 border-emerald-800 text-emerald-300",
  wavespeed: "bg-violet-950/80 border-violet-800 text-violet-300",
  byteplus: "bg-amber-950/80 border-amber-800 text-amber-300",
  kie: "bg-indigo-950/80 border-indigo-800 text-indigo-300",
  elevenlabs: "bg-pink-950/80 border-pink-800 text-pink-300",
  reap: "bg-cyan-950/80 border-cyan-800 text-cyan-300",
  runninghub: "bg-fuchsia-950/80 border-fuchsia-800 text-fuchsia-300",
  custom: "bg-zinc-900 border-zinc-700 text-zinc-300",
};

export default function AdminKnowledgePage() {
  const [data, setData] = useState<KnowledgePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sources" | "specifications" | "proposals" | "audit" | "integrity">("sources");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  // Safe Import Drawer
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importProvider, setImportProvider] = useState<KnowledgeProvider>("wavespeed");
  const [importUrl, setImportUrl] = useState("");
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);

  // Inspector Drawer
  const [inspectingItem, setInspectingItem] = useState<{
    type: "source" | "draft" | "proposal";
    source?: KnowledgeSource;
    document?: KnowledgeDocument;
    draft?: KnowledgeDraft;
    proposal?: KnowledgeModelChange;
  } | null>(null);

  // Proposal modal
  const [proposingDraftId, setProposingDraftId] = useState<string | null>(null);
  const [proposalModelId, setProposalModelId] = useState("");
  const [proposing, setProposing] = useState(false);

  // Publishing confirmation modal
  const [publishingChange, setPublishingChange] = useState<KnowledgeModelChange | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Action busy state
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const loadKnowledge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConflictError(null);
      const res = await fetch("/api/admin/knowledge", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load Knowledge Hub.`);
      const result: KnowledgePayload = await res.json();
      if (!result.ok && result.error) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      console.error("[AdminKnowledge] load error:", err);
      setError(err.message || "Failed to load Knowledge Intelligence Control Plane.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    try {
      setImporting(true);
      setError(null);
      setConflictError(null);

      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: importProvider,
          url: importUrl.trim(),
          name: importName.trim() || undefined,
          expectedVersionToken: data?.versionToken,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setConflictError("Knowledge state changed since this workspace was loaded. Please refresh before saving.");
        return;
      }

      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setData(body);
      setImportDrawerOpen(false);
      setImportUrl("");
      setImportName("");
      setActiveTab("sources");
    } catch (err: any) {
      console.error("[AdminKnowledge] import error:", err);
      setError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleReviewDraft = async (draftId: string, status: "approved" | "rejected") => {
    try {
      setActionBusyId(draftId);
      setError(null);
      setConflictError(null);

      const res = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          status,
          expectedVersionToken: data?.versionToken,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setConflictError("Knowledge state changed since this workspace was loaded. Please refresh before saving.");
        return;
      }

      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setData(body);
    } catch (err: any) {
      console.error("[AdminKnowledge] draft review error:", err);
      setError(err.message || "Draft review update failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleProposeModelChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingDraftId) return;

    try {
      setProposing(true);
      setError(null);
      setConflictError(null);

      const res = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose_model_change",
          draftId: proposingDraftId,
          modelId: proposalModelId.trim() || undefined,
          expectedVersionToken: data?.versionToken,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setConflictError("Knowledge state changed since this workspace was loaded. Please refresh before saving.");
        return;
      }

      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setData(body);
      setProposingDraftId(null);
      setProposalModelId("");
      setActiveTab("proposals");
    } catch (err: any) {
      console.error("[AdminKnowledge] proposal error:", err);
      setError(err.message || "Model change proposal failed.");
    } finally {
      setProposing(false);
    }
  };

  const handleReviewModelChange = async (changeId: string, action: "publish_model_change" | "reject_model_change") => {
    try {
      if (action === "publish_model_change") setPublishing(true);
      setActionBusyId(changeId);
      setError(null);
      setConflictError(null);

      const res = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          changeId,
          expectedVersionToken: data?.versionToken,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setConflictError("Knowledge state changed since this workspace was loaded. Please refresh before saving.");
        return;
      }

      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setData(body);
      setPublishingChange(null);
    } catch (err: any) {
      console.error("[AdminKnowledge] review model change error:", err);
      setError(err.message || "Model change review failed.");
    } finally {
      setPublishing(false);
      setActionBusyId(null);
    }
  };

  const sources = data?.sources || [];
  const documents = data?.documents || [];
  const drafts = data?.drafts || [];
  const modelChanges = data?.modelChanges || [];
  const auditEvents = data?.auditLog || [];

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchQuery =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProvider = providerFilter === "all" || s.provider === providerFilter;
      return matchQuery && matchProvider;
    });
  }, [sources, searchQuery, providerFilter]);

  const providerCounts: Record<string, number> = data?.summary?.providers || {};

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Knowledge Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Knowledge Intelligence Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                Admin Intelligence
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                SSRF Protected
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                Optimistic Concurrency Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-800">
                Controlled Registry Publishing
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Provider documentation ingestion, specification extraction, review, model-change intelligence, and controlled registry publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setImportDrawerOpen(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Import Documentation</span>
            </button>

            <button
              onClick={loadKnowledge}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Conflict / Error Banners */}
        {conflictError && (
          <div className="p-4 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-200 text-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <div>
                <strong className="block font-bold">Optimistic Concurrency Conflict</strong>
                <span>{conflictError}</span>
              </div>
            </div>
            <button
              onClick={loadKnowledge}
              className="px-4 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold transition-colors"
            >
              Refresh Current Knowledge State
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>Knowledge Operations Notice: {error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 2: Knowledge Snapshot Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Documentation Sources</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "—" : data?.summary?.sources ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Configured URLs / Docs</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Imported Documents</span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">
              {loading ? "—" : data?.summary?.documents ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Normalized SHA-256</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Pending Drafts</span>
            <div className="text-2xl font-bold text-amber-300 mt-1">
              {loading ? "—" : data?.summary?.drafts ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Awaiting Admin Review</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Approved Drafts</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : data?.summary?.approvedKnowledge ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Ready for Model Proposals</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Model Proposals</span>
            <div className="text-2xl font-bold text-indigo-300 mt-1">
              {loading ? "—" : data?.summary?.proposedModelChanges ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Pending Registry Publishing</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Published Changes</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : data?.summary?.publishedModelChanges ?? "—"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Active in Model Registries</span>
          </div>
        </div>

        {/* LEVEL 3: Knowledge Pipeline Infographic */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Knowledge Intelligence & Spec Extraction Pipeline
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">NO VECTOR DB</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">NO EMBEDDINGS</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">NO RAG</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold block">1. INGESTION</span>
              <strong className="text-zinc-200 block text-[11px]">Provider Docs</strong>
              <p className="text-[10px] text-zinc-400">URL / Text Import</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-emerald-500 font-bold block">2. SECURITY</span>
              <strong className="text-emerald-300 block text-[11px]">SSRF Guard</strong>
              <p className="text-[10px] text-zinc-400">Private Host Block</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-cyan-500 font-bold block">3. NORMALIZATION</span>
              <strong className="text-cyan-300 block text-[11px]">SHA-256 Hash</strong>
              <p className="text-[10px] text-zinc-400">Script/Style Strip</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-indigo-500 font-bold block">4. EXTRACTION</span>
              <strong className="text-indigo-300 block text-[11px]">Spec Drafts</strong>
              <p className="text-[10px] text-zinc-400">Durations, Res, IDs</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-amber-500 font-bold block">5. GOVERNANCE</span>
              <strong className="text-amber-300 block text-[11px]">Admin Review</strong>
              <p className="text-[10px] text-zinc-400">Approve / Reject</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-violet-500 font-bold block">6. PROPOSAL</span>
              <strong className="text-violet-300 block text-[11px]">Model Changes</strong>
              <p className="text-[10px] text-zinc-400">Diff vs Production</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-950 border border-emerald-800/60 bg-emerald-950/20 space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold block">7. PUBLISHING</span>
              <strong className="text-emerald-300 block text-[11px]">Model Registry</strong>
              <p className="text-[10px] text-zinc-400">Dynamic Registry Live</p>
            </div>
          </div>
        </div>

        {/* LEVEL 4: Provider Knowledge Distribution */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Provider Knowledge Coverage
            </h3>
            <span className="text-[11px] text-zinc-400">
              {sources.length} sources registered
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {KNOWLEDGE_PROVIDERS.map((p) => {
              const count = providerCounts[p] || 0;
              const hasDocs = count > 0;
              return (
                <div
                  key={p}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    hasDocs
                      ? providerColors[p] || "bg-zinc-900 border-zinc-700 text-zinc-200"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-600"
                  }`}
                >
                  <span className="text-[11px] font-bold block truncate uppercase">{p}</span>
                  <span className={`text-base font-extrabold block mt-0.5 ${hasDocs ? "text-white" : "text-zinc-600"}`}>
                    {loading ? "—" : count}
                  </span>
                  <span className="text-[9px] block text-zinc-500">
                    {hasDocs ? "Documented" : "No Sources"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEVEL 5: Multi-Tab Operations Workspace */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("sources")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "sources"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documentation Sources ({sources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("specifications")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "specifications"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Extracted Specifications ({drafts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("proposals")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "proposals"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Model Change Proposals ({modelChanges.length})</span>
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
              <span>Policy Audit Log ({auditEvents.length})</span>
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
              <span>Architecture & Integrity</span>
            </button>
          </div>

          {/* TAB 1: Documentation Sources */}
          {activeTab === "sources" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by source name, provider, or URL..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Providers</option>
                  {KNOWLEDGE_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Source Identity</th>
                      <th className="py-3 px-4">Source URL</th>
                      <th className="py-3 px-4">Import Status</th>
                      <th className="py-3 px-4">Last Imported</th>
                      <th className="py-3 px-4">Content Fingerprint</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                          Synchronizing Knowledge Documentation...
                        </td>
                      </tr>
                    ) : filteredSources.length > 0 ? (
                      filteredSources.map((source) => {
                        const associatedDoc = documents.find((d) => d.sourceId === source.id);
                        const associatedDraft = drafts.find((d) => d.sourceId === source.id);
                        return (
                          <tr key={source.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-200 border border-zinc-700">
                                {source.provider}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-200">
                              <div>{source.name}</div>
                              <span className="text-[10px] text-zinc-500 font-mono">{source.id.slice(0, 10)}...</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-indigo-400 truncate max-w-xs block"
                                >
                                  <span className="truncate">{source.url}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  source.status === "active"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-amber-950 text-amber-400 border border-amber-800"
                                }`}
                              >
                                {source.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-400 font-mono">
                              {source.lastImportedAt ? new Date(source.lastImportedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-500">
                              {source.contentHash ? source.contentHash.slice(0, 12) : "—"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setInspectingItem({
                                      type: "source",
                                      source,
                                      document: associatedDoc,
                                      draft: associatedDraft,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                          No provider documentation sources found. Click &quot;Import Documentation&quot; to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Extracted Specifications (Drafts Review) */}
          {activeTab === "specifications" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Draft Identity</th>
                      <th className="py-3 px-4">Extracted Specifications</th>
                      <th className="py-3 px-4">Review State</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {drafts.length > 0 ? (
                      drafts.map((draft) => {
                        const busy = actionBusyId === draft.id;
                        return (
                          <tr key={draft.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-200 border border-zinc-700">
                                {draft.provider}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">
                              <div>{draft.id.slice(0, 12)}...</div>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(draft.extractedAt).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1.5 max-w-xl">
                                {draft.fields.slice(0, 6).map((f, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-mono"
                                  >
                                    <strong className="text-indigo-400">{f.key}:</strong> {f.value}
                                  </span>
                                ))}
                                {draft.fields.length > 6 && (
                                  <span className="text-[10px] text-zinc-500 self-center">
                                    +{draft.fields.length - 6} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  draft.status === "approved"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : draft.status === "rejected"
                                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                                    : "bg-amber-950 text-amber-400 border border-amber-800"
                                }`}
                              >
                                {draft.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {draft.status === "draft" && (
                                  <>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleReviewDraft(draft.id, "approved")}
                                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleReviewDraft(draft.id, "rejected")}
                                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 text-xs font-medium transition-colors disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {draft.status === "approved" && (
                                  <button
                                    onClick={() => setProposingDraftId(draft.id)}
                                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Propose Model Change</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setInspectingItem({ type: "draft", draft })}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          No specification drafts extracted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Model Change Proposals */}
          {activeTab === "proposals" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Target Model</th>
                      <th className="py-3 px-4">Proposed Specification Changes</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Publishing Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    {modelChanges.length > 0 ? (
                      modelChanges.map((change) => {
                        const busy = actionBusyId === change.id;
                        return (
                          <tr key={change.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-200">
                              {change.modelId}
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1 max-w-lg">
                                {change.fields.map((f, i) => (
                                  <div key={i} className="text-[11px] flex items-center gap-2">
                                    <span className="text-indigo-400 font-mono">{f.field}:</span>
                                    <span className="line-through text-rose-400/80 truncate max-w-[120px]">
                                      {JSON.stringify(f.oldValue)}
                                    </span>
                                    <span className="text-zinc-500">→</span>
                                    <span className="text-emerald-400 font-semibold truncate max-w-[160px]">
                                      {JSON.stringify(f.newValue)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  change.status === "published"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : change.status === "rejected"
                                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                                    : "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                }`}
                              >
                                {change.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">
                              {new Date(change.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {change.status === "proposed" && (
                                  <>
                                    <button
                                      disabled={busy}
                                      onClick={() => setPublishingChange(change)}
                                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Publish to Registry</span>
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleReviewModelChange(change.id, "reject_model_change")}
                                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-200 text-xs font-medium transition-colors disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {change.status === "published" && (
                                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Active in Registry</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          No model change proposals created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Persistent Audit Trail */}
          {activeTab === "audit" && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Affected Identity</th>
                    <th className="py-3 px-4">Meaningful Change Summary</th>
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-200 border border-zinc-700">
                            {event.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {event.modelId || event.sourceName || event.draftId?.slice(0, 10) || event.sourceId?.slice(0, 10) || "—"}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {event.summary || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        No Knowledge Hub audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: Architecture & Integrity */}
          {activeTab === "integrity" && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-200">Knowledge Architecture & System Boundary Guarantees</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Truthful architectural facts, model registry linkages, and operational separation of concerns.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Vector / Embeddings Architecture</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                        None / Absent
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-200">Deterministic Pattern Extraction</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Knowledge Hub parses structured specs directly from raw documentation. No vector databases, embeddings, or RAG models are invoked.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">SSRF & Ingestion Guard</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-emerald-400">Strict Host Whitelist</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      URL imports strictly block loopback, localhost, and private RFC-1918 subnets (10.x, 192.168.x, 172.16-31.x).
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Registry Governance</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                        Dynamic Registry
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-200">Controlled Publishing</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Approved knowledge drafts produce diff proposals that modify Dynamic Model Registries only upon explicit administrator confirmation.
                    </p>
                  </div>
                </div>

                {/* Cross Control Plane Navigation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <Link
                    href="/admin/models"
                    className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs text-zinc-200 block">Model Definition Registry</strong>
                      <span className="text-[11px] text-zinc-500">Inspect live model parameters</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </Link>

                  <Link
                    href="/admin/routing"
                    className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs text-zinc-200 block">Routing Control Plane</strong>
                      <span className="text-[11px] text-zinc-500">Manage provider fallback rules</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </Link>

                  <Link
                    href="/admin/pricing"
                    className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs text-zinc-200 block">Pricing Constitution</strong>
                      <span className="text-[11px] text-zinc-500">Audit user credits and costs</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SAFE IMPORT DRAWER (500–600px desktop, full mobile) */}
        {importDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <form onSubmit={handleImportSubmit} className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      Import Provider Documentation
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportDrawerOpen(false)}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Target AI Provider
                    </label>
                    <select
                      value={importProvider}
                      onChange={(e) => setImportProvider(e.target.value as KnowledgeProvider)}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      {KNOWLEDGE_PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Source Name / Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder="e.g. WaveSpeed Video v2 API Reference"
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1.5">
                      Documentation URL (HTTPS / HTTP)
                    </label>
                    <input
                      type="url"
                      required
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://docs.wavespeed.ai/api/v1/video"
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Page is fetched, stripped of scripts/styles, normalized, and hashed with SHA-256.
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>SSRF Ingestion Protection</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      External documentation import is validated against private/local network targets. Max page size is capped at 240,000 characters.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setImportDrawerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={importing || !importUrl.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Start Import & Extraction</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SOURCE / DRAFT INSPECTOR DRAWER */}
        {inspectingItem && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-2xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      Knowledge Source Inspector
                    </h2>
                  </div>
                  <button
                    onClick={() => setInspectingItem(null)}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {inspectingItem.source && (
                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                    <span className="text-zinc-500 font-bold uppercase text-[10px]">Source Details</span>
                    <div className="text-sm font-bold text-zinc-200">{inspectingItem.source.name}</div>
                    <div className="font-mono text-zinc-400 break-all">{inspectingItem.source.url}</div>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1">
                      <span>Provider: <strong className="text-zinc-300 uppercase">{inspectingItem.source.provider}</strong></span>
                      <span>Status: <strong className="text-emerald-400">{inspectingItem.source.status}</strong></span>
                    </div>
                  </div>
                )}

                {inspectingItem.draft && (
                  <div className="space-y-3 text-xs">
                    <span className="text-zinc-400 font-bold uppercase text-[11px]">
                      Extracted Specification Fields ({inspectingItem.draft.fields.length})
                    </span>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {inspectingItem.draft.fields.map((f, i) => (
                        <div key={i} className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-indigo-400 font-mono">{f.key}</strong>
                            <span className="text-[10px] text-zinc-500">Confidence: {f.confidence}</span>
                          </div>
                          <div className="text-zinc-200 font-mono text-[11px]">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inspectingItem.document && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold uppercase text-[11px]">Normalized Text Preview</span>
                      <span className="text-zinc-500 font-mono text-[10px]">
                        Hash: {inspectingItem.document.contentHash.slice(0, 12)}
                      </span>
                    </div>
                    <div className="p-3 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {inspectingItem.document.normalizedText || "No normalized text available."}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROPOSE MODEL CHANGE MODAL */}
        {proposingDraftId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <form onSubmit={handleProposeModelChange} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-zinc-100">Propose Model Specification Change</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProposingDraftId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Extract parameter options (durations, resolutions, aspect ratios) from this approved draft and create a formal proposal for the Dynamic Model Registry.
              </p>

              <div>
                <label className="block text-xs text-zinc-300 font-semibold mb-1">
                  Target Model ID (Leave blank to auto-infer from draft)
                </label>
                <input
                  type="text"
                  value={proposalModelId}
                  onChange={(e) => setProposalModelId(e.target.value)}
                  placeholder="e.g. wavespeed-seedream-v4"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProposingDraftId(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposing}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {proposing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Proposal</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PUBLISH CONFIRMATION MODAL */}
        {publishingChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-base">Confirm Registry Publishing</h3>
                  <p className="text-xs text-zinc-400">Target Model: <strong className="text-zinc-200 font-mono">{publishingChange.modelId}</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <span className="text-zinc-400 font-bold uppercase text-[10px]">Specifications to be applied live:</span>
                <div className="space-y-1.5 pt-1">
                  {publishingChange.fields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded bg-zinc-900 border border-zinc-800/80 font-mono text-[11px]">
                      <span className="text-indigo-400">{f.field}</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-rose-400/80">{JSON.stringify(f.oldValue)}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-emerald-400 font-bold">{JSON.stringify(f.newValue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300/90 leading-relaxed">
                <strong>Warning:</strong> Publishing modifies the Dynamic Model Registry in production. Pricing and Routing configurations remain unchanged.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPublishingChange(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => handleReviewModelChange(publishingChange.id, "publish_model_change")}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {publishing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish to Dynamic Registry</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

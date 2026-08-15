"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

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

type KnowledgeResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  sources: Array<{
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
  }>;
  documents: Array<{
    id: string;
    sourceId: string;
    sourceUrl: string | null;
    title: string;
    importedAt: string;
    contentHash: string;
    status: string;
    normalizedText: string;
  }>;
  drafts: Array<{
    id: string;
    sourceId: string;
    documentId: string;
    provider: KnowledgeProvider;
    status: "draft" | "approved" | "rejected";
    extractedAt: string;
    reviewedAt: string | null;
    fields: Array<{
      key: string;
      value: string;
      confidence: "low" | "medium" | "high";
      provenance: {
        sourceUrl: string | null;
        documentId: string;
        section: string | null;
      };
    }>;
  }>;
  modelChanges: Array<{
    id: string;
    draftId: string;
    documentId: string;
    modelId: string;
    status: "proposed" | "published" | "rejected";
    createdAt: string;
    reviewedAt: string | null;
    publishedAt: string | null;
    fields: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
      provenance: {
        sourceUrl: string | null;
        documentId: string;
        section: string | null;
        approvedAt: string | null;
      };
    }>;
  }>;
  summary: {
    sources: number;
    documents: number;
    drafts: number;
    approvedKnowledge: number;
    rejectedDrafts: number;
    importErrors: number;
    proposedModelChanges?: number;
    publishedModelChanges?: number;
  };
  error?: string;
};

type Tab = "sources" | "documents" | "drafts" | "model-changes";

const emptyKnowledge: KnowledgeResponse = {
  ok: true,
  databaseAvailable: true,
  sources: [],
  documents: [],
  drafts: [],
  modelChanges: [],
  summary: {
    sources: 0,
    documents: 0,
    drafts: 0,
    approvedKnowledge: 0,
    rejectedDrafts: 0,
    importErrors: 0,
  },
};

const providerStyles: Record<string, string> = {
  google: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  openai: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  wavespeed: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  byteplus: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  kie: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  elevenlabs: "border-pink-500/25 bg-pink-500/10 text-pink-300",
  reap: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  runninghub: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300",
  custom: "border-zinc-500/25 bg-zinc-500/10 text-zinc-300",
};

export default function AdminKnowledgePage() {
  const [data, setData] = useState<KnowledgeResponse>(emptyKnowledge);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<KnowledgeProvider>("google");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("sources");
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [proposalModelId, setProposalModelId] = useState("");

  async function loadKnowledge() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as KnowledgeResponse | null;
      if (!response.ok || !body) throw new Error(body?.error || `Knowledge HTTP ${response.status}`);
      setData(body);
      setSelectedDraftId((current) => current ?? body.drafts[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Knowledge Hub.");
    } finally {
      setLoading(false);
    }
  }

  async function importSource() {
    setImporting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, url, name }),
      });
      const body = (await response.json().catch(() => null)) as KnowledgeResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || `Import HTTP ${response.status}`);
      setData(body);
      setUrl("");
      setName("");
      setTab("drafts");
      setSelectedDraftId(body.drafts[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function reviewDraft(draftId: string, status: "approved" | "rejected") {
    setReviewingId(draftId);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId, status }),
      });
      const body = (await response.json().catch(() => null)) as KnowledgeResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || `Review HTTP ${response.status}`);
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review update failed.");
    } finally {
      setReviewingId(null);
    }
  }

  async function proposeModelChange(draftId: string) {
    setReviewingId(draftId);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "propose_model_change", draftId, modelId: proposalModelId || undefined }),
      });
      const body = (await response.json().catch(() => null)) as KnowledgeResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || `Proposal HTTP ${response.status}`);
      setData(body);
      setProposalModelId("");
      setTab("model-changes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model change proposal failed.");
    } finally {
      setReviewingId(null);
    }
  }

  async function reviewModelChange(changeId: string, action: "publish_model_change" | "reject_model_change") {
    setReviewingId(changeId);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, changeId }),
      });
      const body = (await response.json().catch(() => null)) as KnowledgeResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || `Model change HTTP ${response.status}`);
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model change review failed.");
    } finally {
      setReviewingId(null);
    }
  }

  useEffect(() => {
    void loadKnowledge();
  }, []);

  const selectedDraft = useMemo(
    () => data.drafts.find((draft) => draft.id === selectedDraftId) ?? data.drafts[0] ?? null,
    [data.drafts, selectedDraftId],
  );
  const selectedDocument = selectedDraft ? data.documents.find((document) => document.id === selectedDraft.documentId) : null;

  const cards = [
    { label: "Sources", value: data.summary.sources, icon: Globe2 },
    { label: "Documents", value: data.summary.documents, icon: FileText },
    { label: "Drafts", value: data.summary.drafts, icon: Sparkles },
    { label: "Approved", value: data.summary.approvedKnowledge, icon: CheckCircle2 },
    { label: "Model Changes", value: data.summary.proposedModelChanges ?? 0, icon: ChevronRight },
    { label: "Rejected", value: data.summary.rejectedDrafts, icon: XCircle },
    { label: "Import Errors", value: data.summary.importErrors, icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-7">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <BookOpen className="h-4 w-4" />
              Knowledge Hub
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Documentation Sources</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Import documentation into reviewed Knowledge drafts, compare approved knowledge against current model definitions, then publish model configuration only after admin review.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Admin Control Center
            </Link>
            <button onClick={() => void loadKnowledge()} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <p className="font-bold">Knowledge is not Runtime.</p>
              <p className="mt-1 text-amber-100/80">
                Approve هنا يعني approved knowledge فقط. لا يوجد auto-publish إلى Model Registry أو Routing أو Pricing.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <div key={card.label} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                <card.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-bold text-white">Add Source</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-[180px_1fr_1fr_auto]">
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as KnowledgeProvider)}
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
            >
              {KNOWLEDGE_PROVIDERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://docs.provider.com/..."
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional source name"
              className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={importSource}
              disabled={importing || !url.trim()}
              className="h-10 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Phase 2 still imports one safe HTTP/HTTPS URL. Approval alone does not publish production model configuration.
          </p>
        </section>

        {error ? (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        <section className="flex flex-wrap gap-2">
          {(["sources", "documents", "drafts", "model-changes"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-9 rounded-md border px-3 text-xs font-bold capitalize ${
                tab === item
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                  : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </section>

        {tab === "sources" ? <SourcesTable sources={data.sources} loading={loading} /> : null}
        {tab === "documents" ? <DocumentsTable documents={data.documents} loading={loading} /> : null}
        {tab === "drafts" ? (
          <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <DraftList drafts={data.drafts} selectedDraftId={selectedDraft?.id ?? null} onSelect={setSelectedDraftId} loading={loading} />
            <DraftDetail
              draft={selectedDraft}
              document={selectedDocument}
              reviewingId={reviewingId}
              proposalModelId={proposalModelId}
              onProposalModelIdChange={setProposalModelId}
              onReview={(status) => selectedDraft && void reviewDraft(selectedDraft.id, status)}
              onPropose={() => selectedDraft && void proposeModelChange(selectedDraft.id)}
            />
          </section>
        ) : null}
        {tab === "model-changes" ? (
          <ModelChangesTable
            changes={data.modelChanges}
            loading={loading}
            reviewingId={reviewingId}
            onPublish={(changeId) => void reviewModelChange(changeId, "publish_model_change")}
            onReject={(changeId) => void reviewModelChange(changeId, "reject_model_change")}
          />
        ) : null}
      </div>
    </main>
  );
}

function SourcesTable({ sources, loading }: { sources: KnowledgeResponse["sources"]; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/35">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Imported</th>
            <th className="px-4 py-3">Version</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {loading ? (
            <EmptyRow colSpan={7} label="Loading sources..." />
          ) : sources.length ? (
            sources.map((source) => (
              <tr key={source.id} className="hover:bg-slate-800/25">
                <td className="px-4 py-3"><ProviderBadge provider={source.provider} /></td>
                <td className="px-4 py-3 font-semibold text-slate-200">{source.name}</td>
                <td className="px-4 py-3 text-slate-400">{source.sourceType}</td>
                <td className="px-4 py-3">
                  {source.url ? <ExternalUrl href={source.url} /> : <span className="text-slate-600">None</span>}
                </td>
                <td className="px-4 py-3 text-slate-300">{source.status}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(source.lastImportedAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{source.version ?? "-"}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={7} label="No knowledge sources yet." />
          )}
        </tbody>
      </table>
    </section>
  );
}

function DocumentsTable({ documents, loading }: { documents: KnowledgeResponse["documents"]; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/35">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Imported</th>
            <th className="px-4 py-3">Hash</th>
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {loading ? (
            <EmptyRow colSpan={5} label="Loading documents..." />
          ) : documents.length ? (
            documents.map((document) => (
              <tr key={document.id} className="hover:bg-slate-800/25">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">{document.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{document.normalizedText}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">{document.status}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(document.importedAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{document.contentHash.slice(0, 12)}</td>
                <td className="px-4 py-3">{document.sourceUrl ? <ExternalUrl href={document.sourceUrl} /> : "-"}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5} label="No imported documents yet." />
          )}
        </tbody>
      </table>
    </section>
  );
}

function DraftList({
  drafts,
  selectedDraftId,
  onSelect,
  loading,
}: {
  drafts: KnowledgeResponse["drafts"];
  selectedDraftId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900/35 p-3">
      <h2 className="mb-3 text-sm font-bold text-white">Extracted Drafts</h2>
      <div className="space-y-2">
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-slate-500">Loading drafts...</p>
        ) : drafts.length ? (
          drafts.map((draft) => (
            <button
              key={draft.id}
              onClick={() => onSelect(draft.id)}
              className={`w-full rounded-md border px-3 py-3 text-left transition ${
                selectedDraftId === draft.id
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-950/70 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <ProviderBadge provider={draft.provider} />
                <span className="text-xs text-slate-500">{draft.status}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-200">{draft.fields.length} extracted fields</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(draft.extractedAt)}</p>
            </button>
          ))
        ) : (
          <p className="px-2 py-8 text-center text-sm text-slate-500">No extraction drafts yet.</p>
        )}
      </div>
    </section>
  );
}

function DraftDetail({
  draft,
  document,
  reviewingId,
  proposalModelId,
  onProposalModelIdChange,
  onReview,
  onPropose,
}: {
  draft: KnowledgeResponse["drafts"][number] | null;
  document: KnowledgeResponse["documents"][number] | null | undefined;
  reviewingId: string | null;
  proposalModelId: string;
  onProposalModelIdChange: (value: string) => void;
  onReview: (status: "approved" | "rejected") => void;
  onPropose: () => void;
}) {
  if (!draft) {
    return (
      <section className="rounded-md border border-slate-800 bg-slate-900/35 p-8 text-center text-sm text-slate-500">
        Select a draft to review.
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900/35">
      <div className="border-b border-slate-800 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ProviderBadge provider={draft.provider} />
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-400">{draft.status}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-white">{document?.title ?? "Knowledge Draft"}</h2>
            <p className="mt-1 text-xs text-slate-500">Original source: {document?.sourceUrl ? <ExternalUrl href={document.sourceUrl} /> : "Unknown"}</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={reviewingId === draft.id || draft.status === "approved"}
              onClick={() => onReview("approved")}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
            <button
              disabled={reviewingId === draft.id || draft.status === "rejected"}
              onClick={() => onReview("rejected")}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        </div>
        {draft.status === "approved" ? (
          <div className="mt-4 grid gap-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3 md:grid-cols-[1fr_auto]">
            <input
              value={proposalModelId}
              onChange={(event) => onProposalModelIdChange(event.target.value)}
              placeholder="Optional modelId if it cannot be inferred from approved knowledge"
              className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-500"
            />
            <button
              disabled={reviewingId === draft.id}
              onClick={onPropose}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
              Propose Model Change
            </button>
          </div>
        ) : null}
      </div>
      <div className="divide-y divide-slate-800">
        {draft.fields.length ? (
          draft.fields.map((field, index) => (
            <div key={`${field.key}-${field.value}-${index}`} className="grid gap-3 p-4 lg:grid-cols-[180px_1fr_240px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.key}</p>
                <p className="mt-1 text-xs text-slate-400">confidence: {field.confidence}</p>
              </div>
              <p className="text-sm leading-6 text-slate-200">{field.value}</p>
              <div className="text-xs text-slate-500">
                <p>document: {field.provenance.documentId.slice(0, 8)}</p>
                <p>section: {field.provenance.section ?? "unknown"}</p>
                {field.provenance.sourceUrl ? <ExternalUrl href={field.provenance.sourceUrl} /> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="p-6 text-sm text-slate-500">No extracted fields. Document may need manual review.</p>
        )}
      </div>
    </section>
  );
}

function ModelChangesTable({
  changes,
  loading,
  reviewingId,
  onPublish,
  onReject,
}: {
  changes: KnowledgeResponse["modelChanges"];
  loading: boolean;
  reviewingId: string | null;
  onPublish: (changeId: string) => void;
  onReject: (changeId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/35">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Diff</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {loading ? (
            <EmptyRow colSpan={5} label="Loading model changes..." />
          ) : changes.length ? (
            changes.map((change) => (
              <tr key={change.id} className="hover:bg-slate-800/25">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-100">{change.modelId}</td>
                <td className="px-4 py-3 text-slate-300">{change.status}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {change.fields.map((field) => (
                      <div key={`${change.id}-${field.field}`} className="font-mono text-[11px] text-slate-400">
                        <span className="text-cyan-300">{field.field}</span>: {JSON.stringify(field.oldValue)} -&gt; {JSON.stringify(field.newValue)}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(change.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      disabled={change.status !== "proposed" || reviewingId === change.id}
                      onClick={() => onPublish(change.id)}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      disabled={change.status !== "proposed" || reviewingId === change.id}
                      onClick={() => onReject(change.id)}
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5} label="No proposed model changes yet." />
          )}
        </tbody>
      </table>
    </section>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${providerStyles[provider] ?? providerStyles.custom}`}>
      {provider}
    </span>
  );
}

function ExternalUrl({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-[360px] items-center gap-1 truncate text-xs text-cyan-300 hover:text-cyan-200">
      <span className="truncate">{href}</span>
      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
    </a>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
        {label}
      </td>
    </tr>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

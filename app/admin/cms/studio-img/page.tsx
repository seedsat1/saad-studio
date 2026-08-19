"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { confirmAction } from "@/lib/confirm-action";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Database,
  Edit3,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeMediaUrl } from "@/lib/storage";
import { AdminShell } from "@/components/admin/AdminShell";

// ── Types (mirrored from lib/studio-img.ts) ──────────────────────────────────

type StepDto = {
  id: string;
  label: string;
  content: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  viewMode: "slider" | "side";
  sortOrder: number;
};

type ItemDto = {
  id: string;
  title: string;
  prompt: string;
  params: string;
  model: string;
  category: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  mediaType: "image" | "video" | "both";
  isPublished: boolean;
  sortOrder: number;
  steps: StepDto[];
  createdAt: string;
  updatedAt: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function uploadToSupabase(file: File): Promise<string> {
  const assetType = file.type.startsWith("video/") ? "video" : "image";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);
  
  const res = await fetch("/api/studio/upload-url", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Upload failed");
  const { publicUrl } = await res.json();
  return publicUrl;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CmsStudioImgPage() {
  const [items, setItems] = useState<ItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingSeed, setImportingSeed] = useState(false);
  const [importStats, setImportStats] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/studio-img");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data?.error === "string" && data.error) {
        setError(data.error);
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items],
  );
  const allModels = useMemo(
    () => Array.from(new Set(items.map((i) => i.model).filter(Boolean))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (modelFilter !== "all" && it.model !== modelFilter) return false;
      if (statusFilter === "published" && !it.isPublished) return false;
      if (statusFilter === "draft" && it.isPublished) return false;
      if (needle) {
        const hay = [it.title, it.prompt, it.params, it.model, it.category, ...it.steps.flatMap((s) => [s.label, s.content])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, query, categoryFilter, modelFilter, statusFilter]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createNew = async () => {
    try {
      const res = await fetch("/api/admin/studio-img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "بطاقة جديدة",
          prompt: "",
          mediaType: "image",
          isPublished: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
      setEditingId(item.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  };

  const togglePublished = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/studio-img/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-published" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { item } = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? item : it)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    }
  };

  const deleteItem = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Delete selected generations?",
      description: "This Studio Image card will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/admin/studio-img/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const updateItem = async (id: string, patch: Partial<ItemDto>) => {
    try {
      const current = items.find((it) => it.id === id);
      if (!current) return;
      const merged = { ...current, ...patch };
      const res = await fetch(`/api/admin/studio-img/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: merged.title,
          prompt: merged.prompt,
          params: merged.params,
          model: merged.model,
          category: merged.category,
          beforeUrl: merged.beforeUrl ?? null,
          afterUrl: merged.afterUrl ?? null,
          videoUrl: merged.videoUrl ?? null,
          posterUrl: merged.posterUrl ?? null,
          mediaType: merged.mediaType,
          isPublished: merged.isPublished,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { item } = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? item : it)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const runSeedImport = async (wipe: boolean) => {
    if (wipe) {
      const confirmed = await confirmAction({
        title: "Delete selected generations?",
        description: "All existing Studio Image cards will be deleted before importing the seed data. This cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
    }
    setImportingSeed(true);
    setImportStats(null);
    try {
      const res = await fetch("/api/admin/studio-img/seed-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: wipe ? "wipe" : "append" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImportStats(
        `تم: ${data.inserted} بطاقة · ${data.categories} تصنيف · ${data.models} موديل` +
          (data.failed ? ` · فشل: ${data.failed}` : ""),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed import failed");
    } finally {
      setImportingSeed(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const editingItem = items.find((it) => it.id === editingId) || null;

  if (editingItem) {
    return (
      <AdminShell activeRoute="/admin/cms/studio-img">
        <ItemEditor
          item={editingItem}
          allCategories={allCategories}
          allModels={allModels}
          onBack={() => setEditingId(null)}
          onUpdate={(patch) => updateItem(editingItem.id, patch)}
          onRefresh={refresh}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell activeRoute="/admin/cms/studio-img">
      <div className="w-full min-w-0 flex-1 bg-[#050911] text-slate-100 pb-12">
        <div className="border-b border-slate-800/60 bg-[#070d1a]/80 px-8 py-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Studio Image Library</h1>
              <p className="text-xs text-slate-400">
                إدارة مكتبة الصور والفيديوهات والبرومبتات · {items.length} بطاقة ·{" "}
                {items.filter((i) => i.isPublished).length} منشورة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runSeedImport(false)}
              disabled={importingSeed}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-bold text-slate-200 hover:border-indigo-400/40 hover:text-white disabled:opacity-50"
              title="استيراد البذرة (append)"
            >
              {importingSeed ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              استيراد البذرة
            </button>
            <button
              onClick={() => runSeedImport(true)}
              disabled={importingSeed}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 text-xs font-bold text-pink-100 hover:border-pink-400/60 hover:bg-pink-500/20 disabled:opacity-50"
              title="استيراد البذرة (wipe)"
            >
              <Trash2 className="h-4 w-4" />
              مسح + استيراد
            </button>
            <button
              onClick={refresh}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:border-violet-400/40 hover:text-white"
              title="تحديث"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={createNew}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm font-bold text-white shadow shadow-violet-500/40"
            >
              <Plus className="h-4 w-4" />
              بطاقة جديدة
            </button>
          </div>
        </div>
        {importStats && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
            <Check className="h-3.5 w-3.5" />
            {importStats}
          </div>
        )}
        {error && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-pink-400/30 bg-pink-500/10 px-3 py-1.5 text-xs text-pink-100">
            <X className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="border-b border-slate-800/60 px-8 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في العنوان أو البرومبت..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400/60"
            />
          </div>
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[{ value: "all", label: "كل التصنيفات" }, ...allCategories.map((c) => ({ value: c, label: c }))]}
            icon={<Tag className="h-3.5 w-3.5" />}
          />
          <FilterSelect
            value={modelFilter}
            onChange={setModelFilter}
            options={[{ value: "all", label: "كل الموديلات" }, ...allModels.map((m) => ({ value: m, label: m }))]}
            icon={<Wand2 className="h-3.5 w-3.5" />}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | "published" | "draft")}
            options={[
              { value: "all", label: "كل الحالات" },
              { value: "published", label: "منشور" },
              { value: "draft", label: "مسودة" },
            ]}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center text-slate-400">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-pink-500/20 ring-1 ring-white/10">
              <Sparkles className="h-7 w-7 text-violet-300" />
            </div>
            <p className="text-sm font-bold text-slate-200">
              {items.length === 0 ? "المكتبة فارغة" : "لا توجد نتائج"}
            </p>
            <p className="mt-1 text-xs">
              {items.length === 0
                ? "اضغط 'استيراد البذرة' لتحميل المحتوى الافتراضي، أو 'بطاقة جديدة' للبدء يدوياً."
                : "جرّب تصفية مختلفة."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingId(item.id)}
                onTogglePublished={() => togglePublished(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </AdminShell>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-9 text-xs font-semibold text-slate-200 outline-none focus:border-violet-400/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-300">{icon}</span>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ItemCard({
  item,
  onEdit,
  onTogglePublished,
  onDelete,
}: {
  item: ItemDto;
  onEdit: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  const hasVideo = Boolean(item.videoUrl);
  const cover = item.posterUrl || item.afterUrl || item.beforeUrl;

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222] shadow-lg shadow-black/40 transition hover:border-violet-400/40">
      <button onClick={onEdit} className="relative block aspect-[4/3] w-full overflow-hidden bg-black/40 text-left">
        {cover ? (
          <img src={normalizeMediaUrl(cover) || ""} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {hasVideo && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-pink-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Video className="h-3 w-3" />
            فيديو
          </span>
        )}
        {!item.isPublished && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            مسودة
          </span>
        )}
        {item.steps.length > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-violet-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            +{item.steps.length} steps
          </span>
        )}
      </button>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-white">{item.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {item.model && (
            <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
              {item.model}
            </span>
          )}
          {item.category && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              {item.category}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-xs font-bold text-white shadow shadow-violet-500/30"
          >
            <Edit3 className="h-3.5 w-3.5" />
            تحرير
          </button>
          <button
            onClick={onTogglePublished}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition",
              item.isPublished
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-amber-400/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
            )}
            title={item.isPublished ? "تحويل لمسودة" : "نشر"}
          >
            {item.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-pink-300 hover:border-pink-400/40 hover:bg-pink-500/20"
            title="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  allCategories,
  allModels,
  onBack,
  onUpdate,
  onRefresh,
}: {
  item: ItemDto;
  allCategories: string[];
  allModels: string[];
  onBack: () => void;
  onUpdate: (patch: Partial<ItemDto>) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [local, setLocal] = useState<ItemDto>(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [stepEditingId, setStepEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setLocal(item);
  }, [item]);

  const dirty = JSON.stringify(local) !== JSON.stringify(item);

  const handleUpload = async (file: File, target: "beforeUrl" | "afterUrl" | "videoUrl" | "posterUrl") => {
    setUploading(target);
    try {
      const url = await uploadToSupabase(file);
      setLocal((prev) => ({ ...prev, [target]: url }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title: local.title,
        prompt: local.prompt,
        params: local.params,
        model: local.model,
        category: local.category,
        beforeUrl: local.beforeUrl,
        afterUrl: local.afterUrl,
        videoUrl: local.videoUrl,
        posterUrl: local.posterUrl,
        mediaType: local.mediaType,
        isPublished: local.isPublished,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSteps = async (steps: StepDto[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/studio-img/${item.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.item) setLocal(data.item);
      await onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Steps save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050911] text-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-800/60 bg-[#070d1a]/90 px-8 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white hover:border-violet-400/40"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300">
                {dirty ? "تعديل غير محفوظ" : "محفوظ"}
              </p>
              <h2 className="text-base font-bold text-white">{local.title || "بطاقة جديدة"}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocal((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition",
                local.isPublished
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-200",
              )}
            >
              {local.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {local.isPublished ? "منشور" : "مسودة"}
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 text-sm font-bold text-white shadow shadow-violet-500/40 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {/* Basic fields */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="العنوان">
            <input
              value={local.title}
              onChange={(e) => setLocal({ ...local, title: e.target.value })}
              className="studio-input"
            />
          </Field>
          <Field label="نوع المحتوى">
            <select
              value={local.mediaType}
              onChange={(e) =>
                setLocal({ ...local, mediaType: e.target.value as "image" | "video" | "both" })
              }
              className="studio-input"
            >
              <option value="image">صورة (Before/After)</option>
              <option value="video">فيديو</option>
              <option value="both">صورة + فيديو</option>
            </select>
          </Field>
          <Field label="التصنيف">
            <input
              list="cat-list"
              value={local.category}
              onChange={(e) => setLocal({ ...local, category: e.target.value })}
              className="studio-input"
              placeholder="مثلاً: Retouche Photo"
            />
            <datalist id="cat-list">
              {allCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="الموديل">
            <input
              list="model-list"
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
              className="studio-input"
              placeholder="مثلاً: Nano Banana - Pro"
            />
            <datalist id="model-list">
              {allModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* Media uploads */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-bold text-violet-200">الوسائط (Cover)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {(local.mediaType === "image" || local.mediaType === "both") && (
              <>
                <MediaSlot
                  label="صورة قبل (Before)"
                  url={local.beforeUrl}
                  uploading={uploading === "beforeUrl"}
                  accept="image/*"
                  onUpload={(f) => handleUpload(f, "beforeUrl")}
                  onRemove={() => setLocal({ ...local, beforeUrl: undefined })}
                />
                <MediaSlot
                  label="صورة بعد (After)"
                  url={local.afterUrl}
                  uploading={uploading === "afterUrl"}
                  accept="image/*"
                  onUpload={(f) => handleUpload(f, "afterUrl")}
                  onRemove={() => setLocal({ ...local, afterUrl: undefined })}
                />
              </>
            )}
            {(local.mediaType === "video" || local.mediaType === "both") && (
              <>
                <MediaSlot
                  label="فيديو (mp4 / webm)"
                  url={local.videoUrl}
                  uploading={uploading === "videoUrl"}
                  accept="video/*"
                  isVideo
                  onUpload={(f) => handleUpload(f, "videoUrl")}
                  onRemove={() => setLocal({ ...local, videoUrl: undefined })}
                />
                <MediaSlot
                  label="صورة Poster (مصغرة الفيديو)"
                  url={local.posterUrl}
                  uploading={uploading === "posterUrl"}
                  accept="image/*"
                  onUpload={(f) => handleUpload(f, "posterUrl")}
                  onRemove={() => setLocal({ ...local, posterUrl: undefined })}
                />
              </>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <Field label="البرومبت (Prompt)">
            <textarea
              value={local.prompt}
              onChange={(e) => setLocal({ ...local, prompt: e.target.value })}
              className="studio-input min-h-32 resize-y font-mono text-xs"
              placeholder="البرومبت الرئيسي..."
            />
          </Field>
        </div>

        {/* Params */}
        <div className="mb-6">
          <Field label="الباراميترز (اختياري)">
            <textarea
              value={local.params}
              onChange={(e) => setLocal({ ...local, params: e.target.value })}
              className="studio-input min-h-16 resize-y font-mono text-xs"
              placeholder="aspect_ratio: 16:9 ..."
            />
          </Field>
        </div>

        {/* Steps */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-200">
              الخطوات (ETAPES) · {local.steps.length}
            </h3>
            <button
              onClick={() => {
                const newStep: StepDto = {
                  id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  label: `ETAPE ${local.steps.length + 1}`,
                  content: "",
                  viewMode: "slider",
                  sortOrder: local.steps.length,
                };
                setLocal({ ...local, steps: [...local.steps, newStep] });
                setStepEditingId(newStep.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة خطوة
            </button>
          </div>
          {local.steps.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              لا توجد خطوات. أضف الخطوة الأولى لرسم تسلسل التعديل.
            </p>
          ) : (
            <div className="space-y-2">
              {local.steps.map((step, idx) => (
                <StepRow
                  key={step.id}
                  step={step}
                  index={idx}
                  editing={stepEditingId === step.id}
                  onToggleEdit={() => setStepEditingId(stepEditingId === step.id ? null : step.id)}
                  onUpdate={(patch) =>
                    setLocal({
                      ...local,
                      steps: local.steps.map((s) => (s.id === step.id ? { ...s, ...patch } : s)),
                    })
                  }
                  onDelete={async () => {
                    const confirmed = await confirmAction({
                      title: "Delete selected generations?",
                      description: `${step.label || `Step ${idx + 1}`} will be permanently deleted. This cannot be undone.`,
                      confirmLabel: "Delete",
                      destructive: true,
                    });
                    if (!confirmed) return;
                    setLocal({ ...local, steps: local.steps.filter((s) => s.id !== step.id) });
                  }}
                  isDragging={dragId === step.id}
                  onDragStart={() => setDragId(step.id)}
                  onDragEnd={() => setDragId(null)}
                  onDrop={() => {
                    if (!dragId || dragId === step.id) return;
                    const from = local.steps.findIndex((s) => s.id === dragId);
                    const to = local.steps.findIndex((s) => s.id === step.id);
                    if (from < 0 || to < 0) return;
                    const next = [...local.steps];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    setLocal({ ...local, steps: next });
                  }}
                  uploadFn={uploadToSupabase}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => saveSteps(local.steps)}
            disabled={saving}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-bold text-slate-200 hover:border-violet-400/40 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ الخطوات
          </button>
        </div>
      </div>

      <style jsx global>{`
        .studio-input {
          width: 100%;
          border-radius: 0.65rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.6rem 0.7rem;
          color: white;
          outline: none;
          transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .studio-input:focus {
          border-color: rgba(139, 92, 246, 0.6);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
        }
      `}</style>
    </div>
  );
}

function StepRow({
  step,
  index,
  editing,
  onToggleEdit,
  onUpdate,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  uploadFn,
}: {
  step: StepDto;
  index: number;
  editing: boolean;
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<StepDto>) => void;
  onDelete: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  uploadFn: (file: File) => Promise<string>;
}) {
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>, target: "beforeUrl" | "afterUrl") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingTarget(target);
    try {
      const url = await uploadFn(file);
      onUpdate({ [target]: url });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingTarget(null);
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "rounded-xl border bg-white/[0.02] p-3 transition",
        editing ? "border-pink-400/40 bg-pink-500/[0.04]" : "border-white/10 hover:border-violet-400/30",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="cursor-grab text-slate-500 hover:text-violet-300 active:cursor-grabbing" title="اسحب للترتيب">
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="rounded-md bg-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-100">
          #{index + 1}
        </span>
        <input
          value={step.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder={`ETAPE ${index + 1}`}
          className="flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-bold text-white outline-none focus:bg-white/5"
        />
        <button
          onClick={onToggleEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:border-violet-400/40 hover:text-white"
          title={editing ? "طي" : "تحرير"}
        >
          {editing ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Edit3 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-pink-300 hover:border-pink-400/40 hover:bg-pink-500/20"
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <MiniMediaSlot
              label="قبل"
              url={step.beforeUrl}
              uploading={uploadingTarget === "beforeUrl"}
              onUpload={(e) => handleUpload(e, "beforeUrl")}
              onRemove={() => onUpdate({ beforeUrl: undefined })}
            />
            <MiniMediaSlot
              label="بعد"
              url={step.afterUrl}
              uploading={uploadingTarget === "afterUrl"}
              onUpload={(e) => handleUpload(e, "afterUrl")}
              onRemove={() => onUpdate({ afterUrl: undefined })}
            />
          </div>
          {step.beforeUrl && step.afterUrl && (
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
              <button
                onClick={() => onUpdate({ viewMode: "side" })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-bold",
                  step.viewMode === "side" ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white" : "text-slate-400",
                )}
              >
                Côte à côte
              </button>
              <button
                onClick={() => onUpdate({ viewMode: "slider" })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-bold",
                  step.viewMode === "slider" ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white" : "text-slate-400",
                )}
              >
                Slider
              </button>
            </div>
          )}
          <textarea
            value={step.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="محتوى الخطوة..."
            className="studio-input min-h-20 resize-y font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}

function MediaSlot({
  label,
  url,
  uploading,
  accept,
  isVideo,
  onUpload,
  onRemove,
}: {
  label: string;
  url?: string;
  uploading: boolean;
  accept: string;
  isVideo?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] transition hover:border-violet-400/40">
      <span className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
        {label}
      </span>
      {url ? (
        <>
          {isVideo ? (
            <video src={normalizeMediaUrl(url) || ""} controls className="h-full w-full object-contain" />
          ) : (
            <img src={normalizeMediaUrl(url) || ""} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-10 rounded-lg bg-black/70 p-1 text-white hover:bg-pink-500/80"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : uploading ? (
        <div className="flex flex-col items-center gap-2 text-xs text-violet-200">
          <Loader2 className="h-6 w-6 animate-spin" />
          جاري الرفع...
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-xs font-semibold text-slate-400">
          <Upload className="h-6 w-6 text-violet-300/70" />
          اضغط للرفع
        </div>
      )}
      <input
        type="file"
        accept={accept}
        disabled={uploading}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onUpload(f);
        }}
      />
    </div>
  );
}

function MiniMediaSlot({
  label,
  url,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  url?: string;
  uploading: boolean;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative flex aspect-[7/3] items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-white/[0.02]">
      <span className="absolute left-1.5 top-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
        {label}
      </span>
      {url ? (
        <>
          <img src={normalizeMediaUrl(url) || ""} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-1.5 top-1.5 rounded bg-black/70 p-0.5 text-white hover:bg-pink-500/80"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : uploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
      ) : (
        <Upload className="h-4 w-4 text-slate-500" />
      )}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={onUpload}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-violet-300/70">
        {label}
      </span>
      {children}
    </label>
  );
}

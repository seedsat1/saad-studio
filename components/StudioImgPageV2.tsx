"use client";

import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Grid3x3,
  GripVertical,
  HelpCircle,
  ImagePlus,
  LayoutGrid,
  List,
  Maximize2,
  MousePointerClick,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Square,
  Tag,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StudioStep = {
  id: string;
  label: string;
  content: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  viewMode?: "slider" | "side";
};

type StudioImage = {
  id: string;
  title: string;
  prompt: string;
  params?: string;
  model: string;
  category: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  mediaType?: "image" | "video" | "both";
  createdAt: string;
  steps: StudioStep[];
};

/** Mirror of the API payload (lib/studio-img.ts DTO) */
type ApiStudioImg = {
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
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    label: string;
    content: string;
    beforeUrl?: string;
    afterUrl?: string;
    videoUrl?: string;
    posterUrl?: string;
    viewMode: "slider" | "side";
    sortOrder: number;
  }>;
};

type DraftImage = {
  title: string;
  prompt: string;
  params: string;
  model: string;
  category: string;
  beforeUrl: string;
  afterUrl: string;
};

type ViewMode = "masonry" | "grid" | "list";
type SortMode = "newest" | "oldest" | "title" | "model";

const STORAGE_KEY = "saad_studio_img_library_v1";
const CATEGORY_KEY = "saad_studio_img_categories_v1";
const MODEL_KEY = "saad_studio_img_models_v1";
const SEED_KEY = "saad_studio_img_seeded_v1";
const FRESH_KEY = "saad_studio_img_fresh_token";

const DEFAULT_CATEGORIES = ["Bricolage", "Retouche Photo", "Restauration Photo", "top"];

const emptyDraft: DraftImage = {
  title: "",
  prompt: "",
  params: "",
  model: "",
  category: "",
  beforeUrl: "",
  afterUrl: "",
};

const uid = (prefix = "img") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    window.alert("Storage is full. Export your library, then remove heavy items.");
  }
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

type ImportedStep = {
  id?: string;
  label?: string;
  content?: string;
  img?: string;
  imgAfter?: string;
  deleted?: boolean;
};

type ImportedImage = Omit<Partial<StudioImage>, "steps"> & {
  imgBefore?: string;
  imgAfter?: string;
  categoryId?: string;
  steps?: ImportedStep[];
};

function normalizeImportedImage(item: ImportedImage, categoryNameById: Map<string, string>): StudioImage {
  return {
    id: item.id || uid(),
    title: item.title || "Untitled",
    prompt: item.prompt || "",
    params: item.params || "",
    model: item.model || "",
    category: item.category || (item.categoryId ? categoryNameById.get(item.categoryId) || "" : ""),
    beforeUrl: item.beforeUrl || item.imgBefore,
    afterUrl: item.afterUrl || item.imgAfter,
    createdAt: item.createdAt || new Date().toISOString(),
    steps: Array.isArray(item.steps)
      ? item.steps
          .filter((step) => !step.deleted)
          .map((step, index) => ({
            id: step.id || uid("step"),
            label: step.label || `Step ${index + 1}`,
            content: step.content || "",
            beforeUrl: step.img,
            afterUrl: step.imgAfter,
          }))
      : [],
  };
}

export default function StudioImgPage() {
  const [items, setItems] = useState<StudioImage[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [models, setModels] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [model, setModel] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [draft, setDraft] = useState<DraftImage>(emptyDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<StudioImage | null>(null);
  const [lightboxItem, setLightboxItem] = useState<StudioImage | null>(null);
  const [comparePosition, setComparePosition] = useState(50);
  const [copied, setCopied] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  /** True when data came from server API (read-only mode for subscribers) */
  const [serverMode, setServerMode] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Initial load: try server API first, fall back to seed/localStorage
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => undefined);
    }
    if ("caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }

    const url = new URL(window.location.href);
    const freshToken = url.searchParams.get("fresh");
    const lastFreshToken = window.localStorage.getItem(FRESH_KEY);
    const forceFresh = freshToken && freshToken !== lastFreshToken;
    const useLocal = url.searchParams.get("local") === "1";

    if (forceFresh) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SEED_KEY);
      window.localStorage.setItem(FRESH_KEY, freshToken);
    }

    // Helper: load from local seed JSON
    const loadFromSeed = () => {
      const storedItems = readJson<StudioImage[]>(STORAGE_KEY, []);
      if (!forceFresh && storedItems.length > 0) {
        setItems(storedItems.map((item) => ({ ...item, steps: Array.isArray(item.steps) ? item.steps : [] })));
        setCategories(readJson<string[]>(CATEGORY_KEY, DEFAULT_CATEGORIES));
        setModels(readJson<string[]>(MODEL_KEY, []));
        setLoading(false);
        return;
      }
      fetch("/studio-img-seed.json", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!payload || !Array.isArray(payload.imageLibrary)) {
            setLoading(false);
            return;
          }
          const importedCategories: { id: string; name: string }[] = Array.isArray(payload.imgCategories)
            ? payload.imgCategories.filter(
                (cat: { id?: unknown; name?: unknown }) => typeof cat.id === "string" && typeof cat.name === "string",
              )
            : [];
          const categoryNameById = new Map(importedCategories.map((cat) => [cat.id, cat.name]));
          const seededItems = payload.imageLibrary
            .map((item: unknown) => normalizeImportedImage(item as ImportedImage, categoryNameById))
            .filter(Boolean) as StudioImage[];

          setItems(seededItems);
          setCategories(uniqueList([...DEFAULT_CATEGORIES, ...importedCategories.map((cat) => cat.name)]));
          setModels([]);
          window.localStorage.setItem(SEED_KEY, "1");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    // If ?local=1 was passed, force local mode (admin/preview)
    if (useLocal) {
      loadFromSeed();
      return;
    }

    // Try server first
    fetch("/api/studio-img", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (!payload || !Array.isArray(payload.items)) {
          loadFromSeed();
          return;
        }
        // Server data — convert to local StudioImage shape
        const apiItems: StudioImage[] = payload.items.map((it: ApiStudioImg) => ({
          id: it.id,
          title: it.title,
          prompt: it.prompt || "",
          params: it.params || "",
          model: it.model || "",
          category: it.category || "",
          beforeUrl: it.beforeUrl,
          afterUrl: it.afterUrl,
          videoUrl: it.videoUrl,
          posterUrl: it.posterUrl,
          mediaType: it.mediaType,
          createdAt: it.createdAt,
          steps: (it.steps || []).map((s) => ({
            id: s.id,
            label: s.label || "",
            content: s.content || "",
            beforeUrl: s.beforeUrl,
            afterUrl: s.afterUrl,
            videoUrl: s.videoUrl,
            posterUrl: s.posterUrl,
            viewMode: s.viewMode === "side" ? "side" : "slider",
          })),
        }));
        setItems(apiItems);
        setCategories(Array.isArray(payload.categories) ? payload.categories : []);
        setModels(Array.isArray(payload.models) ? payload.models : []);
        setServerMode(true);
        setLoading(false);
      })
      .catch(() => loadFromSeed());
  }, []);

  useEffect(() => {
    if (!loading && !serverMode) saveJson(STORAGE_KEY, items);
  }, [items, loading, serverMode]);
  useEffect(() => {
    if (!loading && !serverMode) saveJson(CATEGORY_KEY, categories);
  }, [categories, loading, serverMode]);
  useEffect(() => {
    if (!loading && !serverMode) saveJson(MODEL_KEY, models);
  }, [models, loading, serverMode]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesCategory =
        category === "all" ||
        (category === "none" ? !item.category : item.category === category);
      const matchesModel = model === "all" || item.model === model;
      const matchesQuery =
        !needle ||
        [item.title, item.prompt, item.params, item.model, item.category, ...item.steps.flatMap((step) => [step.label, step.content])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      return matchesCategory && matchesModel && matchesQuery;
    });

    const sorted = [...filtered];
    if (sortMode === "newest") sorted.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (sortMode === "oldest") sorted.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    if (sortMode === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === "model") sorted.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
    return sorted;
  }, [category, items, model, query, sortMode]);

  const allModels = useMemo(() => uniqueList(items.map((i) => i.model)), [items]);
  const allCategories = useMemo(() => uniqueList([...categories, ...items.map((i) => i.category)]), [categories, items]);

  const saveItem = () => {
    const title = draft.title.trim();
    if (!title) return window.alert("Title is required.");
    if (!draft.beforeUrl && !draft.afterUrl) return window.alert("Add at least one cover image.");

    const next: StudioImage = {
      id: uid(),
      title,
      prompt: draft.prompt.trim(),
      params: draft.params.trim(),
      model: draft.model.trim(),
      category: draft.category,
      beforeUrl: draft.beforeUrl || undefined,
      afterUrl: draft.afterUrl || undefined,
      createdAt: new Date().toISOString(),
      steps: [],
    };

    setItems((prev) => [next, ...prev]);
    if (draft.category) setCategories((prev) => uniqueList([...prev, draft.category]));
    setDraft({ ...emptyDraft, category: draft.category });
    setEditorOpen(false);
  };

  const removeItem = (id: string) => {
    if (!window.confirm("Delete this item?")) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (detailItem?.id === id) setDetailItem(null);
    if (lightboxItem?.id === id) setLightboxItem(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} item(s)?`)) return;
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const copyText = async (key: string, text?: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1200);
  };



  const reloadSeed = () => {
    if (!window.confirm("سيتم استبدال المكتبة الحالية بنسخة البذرة الأصلية. متابعة؟")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SEED_KEY);
    window.location.href = `${window.location.pathname}?fresh=${Date.now()}`;
  };

  // Lightbox navigation between filtered items
  const lightboxIndex = lightboxItem ? filteredItems.findIndex((i) => i.id === lightboxItem.id) : -1;
  const nextInLightbox = () => {
    if (lightboxIndex < 0 || lightboxIndex >= filteredItems.length - 1) return;
    setLightboxItem(filteredItems[lightboxIndex + 1]);
    setComparePosition(50);
  };
  const prevInLightbox = () => {
    if (lightboxIndex <= 0) return;
    setLightboxItem(filteredItems[lightboxIndex - 1]);
    setComparePosition(50);
  };

  useEffect(() => {
    if (!lightboxItem) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxItem(null);
      if (event.key === "ArrowRight") nextInLightbox();
      if (event.key === "ArrowLeft") prevInLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxItem, filteredItems]);

  // Global keyboard shortcuts: Ctrl/Cmd+F (search), Ctrl/Cmd+N (new), Esc (close)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const meta = event.ctrlKey || event.metaKey;

      if (meta && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (meta && event.key.toLowerCase() === "n" && !isInput) {
        event.preventDefault();
        setEditorOpen(true);
        return;
      }
      if (event.key === "Escape") {
        if (selectionMode) {
          setSelectionMode(false);
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectionMode]);

  if (detailItem) {
    const liveItem = items.find((item) => item.id === detailItem.id) || detailItem;
    return (
      <DetailView
        item={liveItem}
        copied={copied}
        onBack={() => setDetailItem(null)}
        onCopy={copyText}
        onPreview={() => {
          setLightboxItem(liveItem);
          setComparePosition(50);
        }}
        onDelete={() => removeItem(liveItem.id)}
        onUpdate={(patch) =>
          setItems((prev) => prev.map((item) => (item.id === liveItem.id ? { ...item, ...patch } : item)))
        }
        onAddStep={(step) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === liveItem.id ? { ...item, steps: [...item.steps, step] } : item,
            ),
          );
        }}
        onUpdateStep={(stepId, patch) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === liveItem.id
                ? { ...item, steps: item.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
                : item,
            ),
          );
        }}
        onDeleteStep={(stepId) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === liveItem.id ? { ...item, steps: item.steps.filter((s) => s.id !== stepId) } : item,
            ),
          );
        }}
        onReorderSteps={(steps) => {
          setItems((prev) => prev.map((item) => (item.id === liveItem.id ? { ...item, steps } : item)));
        }}
        lightbox={lightboxItem ? (
          <Lightbox
            item={lightboxItem}
            comparePosition={comparePosition}
            setComparePosition={setComparePosition}
            onClose={() => setLightboxItem(null)}
            onPrev={lightboxIndex > 0 ? prevInLightbox : undefined}
            onNext={lightboxIndex < filteredItems.length - 1 ? nextInLightbox : undefined}
            indexLabel={`${lightboxIndex + 1} / ${filteredItems.length}`}
          />
        ) : null}
      />
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full bg-[#060c18] text-slate-100">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-pink-600/5 blur-[140px]" />
      </div>

      <div className="relative w-full px-4 py-5 sm:px-6 lg:px-8">
        {/* Toolbar Row 1: Search + view modes + actions */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث (Ctrl+F)..."
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-400/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            <ViewModeBtn active={viewMode === "masonry"} onClick={() => setViewMode("masonry")} title="Masonry">
              <LayoutGrid className="h-4 w-4" />
            </ViewModeBtn>
            <ViewModeBtn active={viewMode === "grid"} onClick={() => setViewMode("grid")} title="Grid">
              <Grid3x3 className="h-4 w-4" />
            </ViewModeBtn>
            <ViewModeBtn active={viewMode === "list"} onClick={() => setViewMode("list")} title="List">
              <List className="h-4 w-4" />
            </ViewModeBtn>
          </div>

          <SortMenu value={sortMode} onChange={setSortMode} />

          {!serverMode && (
            <button
              onClick={() => {
                if (selectionMode) {
                  setSelectionMode(false);
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition",
                selectionMode
                  ? "border-pink-400/40 bg-pink-500/15 text-pink-100"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-violet-400/40 hover:text-white",
              )}
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden md:inline">{selectionMode ? "إنهاء" : "تحديد متعدد"}</span>
            </button>
          )}

          {!serverMode && (
            <>
              <IconButton title="إدارة التصنيفات" onClick={() => setCategoryManagerOpen(true)}>
                <Tag className="h-4 w-4" />
              </IconButton>
              <IconButton title="إدارة الموديلات" onClick={() => setModelManagerOpen(true)}>
                <Wand2 className="h-4 w-4" />
              </IconButton>
              <IconButton title="الإعدادات والنسخ الاحتياطي" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </IconButton>
              <button
                onClick={() => setEditorOpen(true)}
                className="flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-violet-500/50"
                title="صورة جديدة (Ctrl+N)"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">إضافة</span>
              </button>
            </>
          )}
          {/* Removed JSON import/export */}
        </div>

        {/* Category pills */}
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
          <FilterPill active={category === "all"} onClick={() => setCategory("all")} count={items.length}>
            All
          </FilterPill>
          <FilterPill
            active={category === "none"}
            onClick={() => setCategory("none")}
            count={items.filter((i) => !i.category).length}
          >
            Uncategorized
          </FilterPill>
          {allCategories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <FilterPill key={cat} active={category === cat} onClick={() => setCategory(cat)} count={count}>
                {cat}
              </FilterPill>
            );
          })}
        </div>

        {/* Model filter (only if there are models) */}
        {allModels.length > 0 && (
          <div className="-mx-1 mb-4 flex items-center gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Model:
            </span>
            <ModelPill active={model === "all"} onClick={() => setModel("all")}>All</ModelPill>
            {allModels.map((m) => (
              <ModelPill key={m} active={model === m} onClick={() => setModel(m)}>
                {m}
              </ModelPill>
            ))}
          </div>
        )}

        {/* Selection bar */}
        {selectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 py-2.5 backdrop-blur"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-pink-100">{selectedIds.size}</span>
              <span className="text-pink-200/70">selected</span>
              <button onClick={selectAll} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10">
                Select All
              </button>
              <button onClick={clearSelection} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10">
                Clear
              </button>
            </div>
            <button
              onClick={bulkDelete}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-md bg-pink-500 px-3 py-1.5 text-xs font-bold text-white shadow shadow-pink-500/30 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && <LoadingSkeleton viewMode={viewMode} />}

        {/* Empty state */}
        {!loading && filteredItems.length === 0 && (
          <EmptyState
            hasItems={items.length > 0}
            onReset={() => {
              setQuery("");
              setCategory("all");
              setModel("all");
            }}
            onAdd={() => setEditorOpen(true)}
            onReloadSeed={reloadSeed}
          />
        )}

        {/* Gallery */}
        {!loading && filteredItems.length > 0 && (
          <>
            {viewMode === "masonry" && (
              <div className="columns-[210px] gap-4 sm:columns-[230px] lg:columns-[250px] 2xl:columns-[270px]">
                {filteredItems.map((item) => (
                  <div key={item.id} className="mb-3 break-inside-avoid">
                    <StudioCard
                      item={item}
                      mode="masonry"
                      selectionMode={selectionMode}
                      selected={selectedIds.has(item.id)}
                      onOpen={() => (selectionMode ? toggleSelected(item.id) : setDetailItem(item))}
                      onPreview={() => {
                        setLightboxItem(item);
                        setComparePosition(50);
                      }}
                      onDelete={() => removeItem(item.id)}
                      onSelectToggle={() => toggleSelected(item.id)}
                      readOnly={serverMode}
                    />
                  </div>
                ))}
              </div>
            )}

            {viewMode === "grid" && (
              <div className="grid content-start items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                {filteredItems.map((item) => (
                  <StudioCard
                    key={item.id}
                    item={item}
                    mode="grid"
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.id)}
                    onOpen={() => (selectionMode ? toggleSelected(item.id) : setDetailItem(item))}
                    onPreview={() => {
                      setLightboxItem(item);
                      setComparePosition(50);
                    }}
                    onDelete={() => removeItem(item.id)}
                    onSelectToggle={() => toggleSelected(item.id)}
                    readOnly={serverMode}
                  />
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <ListRow
                    key={item.id}
                    item={item}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.id)}
                    onOpen={() => (selectionMode ? toggleSelected(item.id) : setDetailItem(item))}
                    onPreview={() => {
                      setLightboxItem(item);
                      setComparePosition(50);
                    }}
                    onDelete={() => removeItem(item.id)}
                    onCopy={(text) => copyText(`row_${item.id}`, text)}
                    copied={copied === `row_${item.id}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {editorOpen && (
          <ImageEditorModal
            draft={draft}
            categories={allCategories}
            setDraft={setDraft}
            onClose={() => setEditorOpen(false)}
            onSave={saveItem}
          />
        )}

        {lightboxItem && (
          <Lightbox
            item={lightboxItem}
            comparePosition={comparePosition}
            setComparePosition={setComparePosition}
            onClose={() => setLightboxItem(null)}
            onPrev={lightboxIndex > 0 ? prevInLightbox : undefined}
            onNext={lightboxIndex < filteredItems.length - 1 ? nextInLightbox : undefined}
            indexLabel={`${lightboxIndex + 1} / ${filteredItems.length}`}
            onCopyPrompt={() => copyText(`lightbox_${lightboxItem.id}`, lightboxItem.prompt)}
            promptCopied={copied === `lightbox_${lightboxItem.id}`}
          />
        )}

        {tourOpen && <InteractiveGuide onClose={() => setTourOpen(false)} />}

        {categoryManagerOpen && (
          <CategoryManagerModal
            categories={allCategories}
            setCategories={(next) => {
              setCategories(next);
              // also rename across items if user edited a name
            }}
            itemsCount={(name) => items.filter((i) => i.category === name).length}
            onClose={() => setCategoryManagerOpen(false)}
          />
        )}

        {modelManagerOpen && (
          <ModelManagerModal
            models={uniqueList([...models, ...items.map((i) => i.model)])}
            setModels={(next) => setModels(next)}
            itemsCount={(name) => items.filter((i) => i.model === name).length}
            onClose={() => setModelManagerOpen(false)}
          />
        )}

        {settingsOpen && (
          <SettingsModal
            itemsCount={items.length}
            categoriesCount={allCategories.length}
            modelsCount={uniqueList([...models, ...items.map((i) => i.model)]).length}
            onReloadSeed={() => {
              setSettingsOpen(false);
              reloadSeed();
            }}
            onClearAll={() => {
              if (!window.confirm("All data will be deleted permanently. Continue?")) return;
              window.localStorage.removeItem(STORAGE_KEY);
              window.localStorage.removeItem(CATEGORY_KEY);
              window.localStorage.removeItem(MODEL_KEY);
              window.localStorage.removeItem(SEED_KEY);
              window.localStorage.removeItem(FRESH_KEY);
              window.location.reload();
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-violet-400/40 hover:bg-white/[0.08] hover:text-white"
    >
      {children}
    </button>
  );
}

function ViewModeBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition",
        active ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow" : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function SortMenu({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const labelMap: Record<SortMode, string> = {
    newest: "Newest",
    oldest: "Oldest",
    title: "Title",
    model: "Model",
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition hover:border-violet-400/40 hover:text-white"
      >
        <ArrowUpDown className="h-4 w-4" />
        <span className="hidden md:inline">{labelMap[value]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-12 z-40 w-40 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-xl">
            {(Object.keys(labelMap) as SortMode[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-white/5",
                  value === k ? "text-violet-300" : "text-slate-300",
                )}
              >
                {labelMap[k]}
                {value === k && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, count, children }: { active?: boolean; onClick: () => void; count?: number; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-transparent bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-violet-400/30 hover:text-white",
      )}
    >
      {children}
      {typeof count === "number" && (
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-white/20" : "bg-white/5 text-slate-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

function ModelPill({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
        active ? "border-pink-400/40 bg-pink-500/20 text-pink-100" : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const skeletonCount = viewMode === "list" ? 6 : 18;
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01]"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyState({
  hasItems,
  onReset,
  onAdd,
  onReloadSeed,
}: {
  hasItems: boolean;
  onReset: () => void;
  onAdd: () => void;
  onReloadSeed: () => void;
}) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center text-slate-400">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-pink-500/20 ring-1 ring-white/10">
        <ImagePlus className="h-8 w-8 text-violet-300" />
      </div>
      <p className="text-base font-bold text-slate-200">
        {hasItems ? "No matching results" : "Library is empty"}
      </p>
      <p className="mt-1 text-xs">
        {hasItems
          ? "Try a different filter or clear search."
          : "Add a new image or load the original seed to get started."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hasItems ? (
          <button
            onClick={onReset}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            Clear Filters
          </button>
        ) : (
          <>
            <button
              onClick={onAdd}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow shadow-violet-500/30"
            >
              + New Image
            </button>
            <button
              onClick={onReloadSeed}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              Load Seed
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StudioCard({
  item,
  mode,
  selectionMode,
  selected,
  readOnly,
  onOpen,
  onPreview,
  onDelete,
  onSelectToggle,
}: {
  item: StudioImage;
  mode: "masonry" | "grid";
  selectionMode: boolean;
  selected: boolean;
  readOnly?: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onSelectToggle: () => void;
}) {
  const [position, setPosition] = useState(50);
  const hasCompare = Boolean(item.beforeUrl && item.afterUrl);
  const hasVideo = Boolean(item.videoUrl);
  const image = item.afterUrl || item.beforeUrl || item.posterUrl;
  const ratioClass = "aspect-[4/5]";

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative h-fit self-start overflow-hidden rounded-2xl border bg-[#0b1222] shadow-lg shadow-black/40 transition",
        selected
          ? "border-pink-400/60 ring-2 ring-pink-400/40"
          : "border-white/10 hover:border-violet-400/40 hover:shadow-violet-500/10",
        ratioClass,
      )}
      onMouseMove={(event) => {
        if (!hasCompare) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)));
      }}
      onMouseLeave={() => setPosition(50)}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
          className="absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-black/60 text-white backdrop-blur transition hover:border-pink-400"
        >
          {selected ? <CheckSquare className="h-4 w-4 text-pink-300" /> : <Square className="h-4 w-4" />}
        </button>
      )}

      {/* Delete button (hidden in selection mode or read-only) */}
      {!selectionMode && !readOnly && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-pink-300 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-pink-500/90 hover:text-white"
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Video badge */}
      {hasVideo && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-pink-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur">
          <Video className="h-3 w-3" />
          فيديو
        </span>
      )}

      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-full w-full overflow-hidden">
          {hasCompare ? (
            <CompareImage beforeUrl={item.beforeUrl!} afterUrl={item.afterUrl!} position={position} />
          ) : hasVideo ? (
            <video
              src={item.videoUrl}
              poster={item.posterUrl}
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => undefined)}
              onMouseLeave={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                v.pause();
                v.currentTime = 0;
              }}
              className="h-full w-full object-cover transition duration-500"
            />
          ) : image ? (
            <img
              src={image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/[0.02] text-slate-600">
              <ImagePlus className="h-8 w-8" />
            </div>
          )}

          {/* Gradient overlay with title */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3">
            <h3 className="line-clamp-2 text-sm font-extrabold text-white">{item.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.model && (
                <span className="inline-flex max-w-full rounded-md bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-100 ring-1 ring-violet-400/30">
                  <span className="truncate">{item.model}</span>
                </span>
              )}
              {item.category && (
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-200">
                  {item.category}
                </span>
              )}
              {item.steps.length > 0 && (
                <span className="rounded-md bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-bold text-pink-200">
                  {item.steps.length} steps
                </span>
              )}
            </div>
          </div>

          {/* Hover preview button */}
          {!selectionMode && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onPreview();
              }}
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-violet-500/50"
              title="معاينة"
            >
              <Maximize2 className="h-4 w-4" />
            </span>
          )}
        </div>
      </button>
    </motion.article>
  );
}

function ListRow({
  item,
  selectionMode,
  selected,
  onOpen,
  onPreview,
  onDelete,
  onCopy,
  copied,
}: {
  item: StudioImage;
  selectionMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const image = item.afterUrl || item.beforeUrl;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-2.5 transition",
        selected ? "border-pink-400/60 bg-pink-500/5" : "border-white/10 bg-white/[0.03] hover:border-violet-400/40 hover:bg-white/[0.05]",
      )}
    >
      {selectionMode && (
        <button
          onClick={onOpen}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 text-white"
        >
          {selected ? <CheckSquare className="h-4 w-4 text-pink-300" /> : <Square className="h-4 w-4" />}
        </button>
      )}
      <button onClick={onPreview} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
        <p className="line-clamp-1 text-xs text-slate-400">{item.prompt || "بدون برومبت"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.model && (
            <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">{item.model}</span>
          )}
          {item.category && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">{item.category}</span>
          )}
          {item.steps.length > 0 && (
            <span className="rounded-md bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-200">{item.steps.length} steps</span>
          )}
        </div>
      </button>
      {!selectionMode && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(item.prompt)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:border-violet-400/40 hover:text-white"
            title="نسخ البرومبت"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-pink-300 hover:border-pink-400/40 hover:bg-pink-500/20"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function CompareImage({ beforeUrl, afterUrl, position, cover }: { beforeUrl: string; afterUrl: string; position: number; cover?: boolean }) {
  const mode = cover === false ? "object-contain" : "object-cover";
  return (
    <div className="relative h-full w-full">
      <img src={beforeUrl} alt="" className={cn("h-full w-full", mode)} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={afterUrl} alt="" className={cn("h-full w-full", mode)} />
      </div>
      <div
        className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-violet-300 via-indigo-300 to-pink-300 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-[11px] text-white shadow-lg">
          ↔
        </span>
      </div>
    </div>
  );
}

function ImageEditorModal({
  draft,
  categories,
  setDraft,
  onClose,
  onSave,
}: {
  draft: DraftImage;
  categories: string[];
  setDraft: (draft: DraftImage) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1222]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1222]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow shadow-violet-500/40">
              <Wand2 className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">إنشاء صورة جديدة</h2>
              <p className="text-[11px] text-slate-400">أضف العنوان، الموديل، الصور، والبرومبت</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="studio-input" />
            </Field>
            <Field label="التصنيف">
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="studio-input">
                <option value="">(بدون)</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="موديل الذكاء الاصطناعي">
            <input
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="اكتب اسم الموديل..."
              autoComplete="new-password"
              name="studio-img-free-model"
              className="studio-input"
            />
          </Field>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-violet-300/80">Cover</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ImagePicker label="قبل" value={draft.beforeUrl} onChange={(value) => setDraft({ ...draft, beforeUrl: value })} />
              <ImagePicker label="بعد" value={draft.afterUrl} onChange={(value) => setDraft({ ...draft, afterUrl: value })} />
            </div>
          </div>
          <Field label="البرومبت">
            <textarea value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} className="studio-input min-h-28 resize-y" />
          </Field>
          <Field label="باراميترز">
            <textarea value={draft.params} onChange={(e) => setDraft({ ...draft, params: e.target.value })} className="studio-input min-h-14 resize-y" />
          </Field>
          <button
            onClick={onSave}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-violet-500/50"
          >
            حفظ
          </button>
        </div>
      </motion.div>
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

function DetailView({
  item,
  copied,
  onBack,
  onCopy,
  onPreview,
  onDelete,
  onUpdate,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
  lightbox,
}: {
  item: StudioImage;
  copied: string | null;
  onBack: () => void;
  onCopy: (key: string, text?: string) => void;
  onPreview: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<StudioImage>) => void;
  onAddStep: (step: StudioStep) => void;
  onUpdateStep: (id: string, patch: Partial<StudioStep>) => void;
  onDeleteStep: (id: string) => void;
  onReorderSteps: (steps: StudioStep[]) => void;
  lightbox: ReactNode;
}) {
  const [editingField, setEditingField] = useState<"title" | "prompt" | "params" | null>(null);
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const fromIndex = item.steps.findIndex((s) => s.id === dragId);
    const toIndex = item.steps.findIndex((s) => s.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...item.steps];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderSteps(next);
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full bg-[#060c18] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute right-0 top-60 h-[360px] w-[360px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-3 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:border-violet-400/40 hover:bg-white/[0.08]"
              title="رجوع"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {editingField === "title" ? (
                <input
                  autoFocus
                  defaultValue={item.title}
                  onBlur={(e) => {
                    onUpdate({ title: e.target.value });
                    setEditingField(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  className="studio-input text-lg font-extrabold"
                />
              ) : (
                <h1
                  onClick={() => setEditingField("title")}
                  className="cursor-pointer truncate text-lg font-extrabold text-white hover:text-violet-200"
                  title="انقر للتعديل"
                >
                  {item.title}
                </h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {item.model && (
                  <span className="inline-flex rounded-md bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-100 ring-1 ring-violet-400/30">
                    {item.model}
                  </span>
                )}
                {item.category && (
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">{item.category}</span>
                )}
                <span className="text-[10px] text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString("ar")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPreview}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 transition hover:border-violet-400/40 hover:text-white"
              title="معاينة كبيرة"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-pink-400/40 hover:text-pink-300"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={onPreview}
          className="relative mb-5 flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 md:h-[400px]"
        >
          {item.beforeUrl && item.afterUrl ? (
            <CompareImage beforeUrl={item.beforeUrl} afterUrl={item.afterUrl} position={50} cover={false} />
          ) : item.afterUrl || item.beforeUrl ? (
            <img src={item.afterUrl || item.beforeUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-10 w-10 text-slate-600" />
          )}
        </button>

        <SectionBlock
          accent="violet"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Prompt"
          value={item.prompt || ""}
          editable
          onChange={(v) => onUpdate({ prompt: v })}
          editing={editingField === "prompt"}
          onToggleEdit={() => setEditingField(editingField === "prompt" ? null : "prompt")}
          copyKey={`prompt_${item.id}`}
          copied={copied}
          onCopy={() => onCopy(`prompt_${item.id}`, item.prompt)}
        />

        {(item.params || editingField === "params") && (
          <SectionBlock
            accent="indigo"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            label="Parameters"
            value={item.params || ""}
            editable
            onChange={(v) => onUpdate({ params: v })}
            editing={editingField === "params"}
            onToggleEdit={() => setEditingField(editingField === "params" ? null : "params")}
            copyKey={`params_${item.id}`}
            copied={copied}
            onCopy={() => onCopy(`params_${item.id}`, item.params)}
          />
        )}

        {!item.params && editingField !== "params" && (
          <button
            onClick={() => {
              onUpdate({ params: " " });
              setEditingField("params");
            }}
            className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-2.5 text-xs font-bold text-slate-400 hover:border-indigo-400/40 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة Parameters
          </button>
        )}

        {item.steps.length > 0 && (
          <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
            <GripVertical className="h-3 w-3" />
            اسحب الخطوات لإعادة الترتيب · {item.steps.length} خطوات
          </div>
        )}

        <div className="relative ml-5 border-l border-white/10 pl-5">
          {item.steps.map((step, index) => (
            <StepBlock
              key={step.id}
              step={step}
              index={index}
              editing={editStepId === step.id}
              copied={copied === `step_${step.id}`}
              isDragging={dragId === step.id}
              isDragOver={dragOverId === step.id}
              onToggleEdit={() => setEditStepId(editStepId === step.id ? null : step.id)}
              onUpdate={(patch) => onUpdateStep(step.id, patch)}
              onCopy={() => onCopy(`step_${step.id}`, step.content)}
              onDelete={() => {
                if (window.confirm("حذف هذه الخطوة؟")) onDeleteStep(step.id);
              }}
              onDragStart={() => setDragId(step.id)}
              onDragOver={() => setDragOverId(step.id)}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              onDrop={() => handleDrop(step.id)}
            />
          ))}
          <button
            onClick={() => {
              const label = window.prompt("عنوان الخطوة (مثلاً: ETAPE 1)");
              if (!label) return;
              const content = window.prompt("محتوى الخطوة") || "";
              onAddStep({ id: uid("step"), label, content, viewMode: "slider" });
            }}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-sm font-bold text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.04] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            إضافة خطوة
          </button>
        </div>

        {lightbox}
      </div>
    </div>
  );
}

function SectionBlock({
  accent,
  icon,
  label,
  value,
  copyKey,
  copied,
  onCopy,
  editable,
  editing,
  onToggleEdit,
  onChange,
  onDelete,
}: {
  accent: "violet" | "indigo" | "pink";
  icon: ReactNode;
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: () => void;
  editable?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  onChange?: (value: string) => void;
  onDelete?: () => void;
}) {
  const accentMap = {
    violet: "from-violet-500 to-violet-600",
    indigo: "from-indigo-500 to-indigo-600",
    pink: "from-pink-500 to-pink-600",
  } as const;
  const ringMap = {
    violet: "hover:border-violet-400/30",
    indigo: "hover:border-indigo-400/30",
    pink: "hover:border-pink-400/30",
  } as const;
  return (
    <div className={cn("mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur transition", ringMap[accent])}>
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm", accentMap[accent])}>
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {editable && (
            <button
              onClick={onToggleEdit}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition hover:border-violet-400/40 hover:text-white"
            >
              {editing ? "تم" : "تعديل"}
            </button>
          )}
          <button
            onClick={onCopy}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition hover:border-violet-400/40 hover:text-white"
          >
            {copied === copyKey ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === copyKey ? "تم النسخ" : "نسخ"}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-pink-400/40 hover:text-pink-300"
              title="حذف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {editing && onChange ? (
        <textarea
          defaultValue={value}
          onBlur={(e) => onChange(e.target.value)}
          autoFocus
          className="studio-input min-h-28 resize-y font-mono text-xs"
        />
      ) : (
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs leading-relaxed text-slate-200">
          {value || "—"}
        </div>
      )}
    </div>
  );
}

function Lightbox({
  item,
  comparePosition,
  setComparePosition,
  onClose,
  onPrev,
  onNext,
  indexLabel,
  onCopyPrompt,
  promptCopied,
}: {
  item: StudioImage;
  comparePosition: number;
  setComparePosition: (value: number) => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  indexLabel?: string;
  onCopyPrompt?: () => void;
  promptCopied?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const hasCompare = Boolean(item.beforeUrl && item.afterUrl);
  const zoomActive = zoom > 1;

  // Reset zoom when item changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [item.id]);

  const wheelHandler = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom((z) => Math.max(0.25, Math.min(8, z + delta)));
  };

  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "center center",
    transition: isPanning ? "none" : "transform 0.12s ease-out",
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#060c18]/97 p-4 text-white backdrop-blur-md">
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
          <h2 className="truncate text-sm font-bold text-white">{item.title}</h2>
          {indexLabel && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">{indexLabel}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
              title="تصغير"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-[11px] font-bold text-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(8, z + 0.25))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
              title="تكبير"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
              title="إعادة (1:1)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {onCopyPrompt && (
            <button
              onClick={onCopyPrompt}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:border-violet-400/40 hover:bg-violet-500/20"
              title="نسخ البرومبت"
            >
              {promptCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              نسخ البرومبت
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-pink-400/40 hover:bg-pink-500/20"
            title="إغلاق (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {onPrev && (
        <button
          onClick={onPrev}
          className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur transition hover:border-violet-400/40 hover:bg-violet-500/20"
          title="السابق"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur transition hover:border-violet-400/40 hover:bg-violet-500/20"
          title="التالي"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="mx-auto flex h-full max-w-7xl flex-col justify-center gap-4 pt-20 pb-4">
        <div
          onWheel={wheelHandler}
          onDoubleClick={() => {
            setZoom((z) => (z === 1 ? 2 : 1));
            setPan({ x: 0, y: 0 });
          }}
          onMouseDown={(e) => {
            if (!zoomActive) return;
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
          onMouseMove={(event) => {
            if (isPanning) {
              setPan({
                x: panStart.panX + (event.clientX - panStart.x),
                y: panStart.panY + (event.clientY - panStart.y),
              });
              return;
            }
            if (zoomActive || !hasCompare) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setComparePosition(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)));
          }}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222]/60",
            zoomActive ? (isPanning ? "cursor-grabbing" : "cursor-grab") : hasCompare ? "cursor-ew-resize" : "cursor-zoom-in",
          )}
        >
          <div style={transformStyle} className="flex h-full w-full items-center justify-center">
            {hasCompare ? (
              <div className="relative h-full w-full">
                <CompareImage beforeUrl={item.beforeUrl!} afterUrl={item.afterUrl!} position={comparePosition} cover={false} />
              </div>
            ) : (
              <img
                src={item.afterUrl || item.beforeUrl}
                alt=""
                className="h-full w-full object-contain"
                draggable={false}
              />
            )}
          </div>

          {/* Hint */}
          {!zoomActive && (
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur">
              عجلة الفأرة للتكبير · نقرة مزدوجة للتبديل {hasCompare ? "· حرّك الماوس للمقارنة" : ""}
            </div>
          )}
        </div>
        {item.prompt && (
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur">
            <p className="line-clamp-3 max-w-4xl text-xs text-slate-300">{item.prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const GUIDE_STEPS = [
  {
    title: "ابحث داخل المكتبة",
    body: "اكتب أي كلمة من العنوان أو البرومبت أو الباراميتر. يتم الفلترة لحظياً داخل المعرض.",
    visual: "search",
    icon: Search,
  },
  {
    title: "بدّل وضع العرض",
    body: "اختر بين Masonry (طول طبيعي للصور) أو Grid (مربعات منتظمة) أو List (قائمة مدمجة).",
    visual: "viewmode",
    icon: LayoutGrid,
  },
  {
    title: "أضف صورة جديدة",
    body: "اضغط زر الإضافة، اكتب العنوان واسم الموديل، ارفع Before و After، ثم احفظ.",
    visual: "add",
    icon: Plus,
  },
  {
    title: "افتح تفاصيل الصورة",
    body: "اضغط على أي كارت. ستفتح التفاصيل: العنوان، الصورة، البرومبت، والباراميترز، والخطوات. كلها قابلة للتعديل المباشر.",
    visual: "detail",
    icon: Eye,
  },
  {
    title: "قارن Before / After",
    body: "إذا كان عندك صورتان مرر الماوس فوق الكارت أو افتح المعاينة لترى السلايدر بين النسختين.",
    visual: "compare",
    icon: SplitSquareHorizontal,
  },
  {
    title: "تحديد متعدد + حذف جماعي",
    body: "فعّل وضع التحديد المتعدد، اختر العناصر، ثم احذفها جميعاً بضغطة.",
    visual: "select",
    icon: CheckSquare,
  },
  {
    title: "انسخ البرومبت والخطوات",
    body: "من شاشة التفاصيل أو اللايت بوكس استخدم Copy لنسخ البرومبت أو أي Step مباشرة.",
    visual: "copy",
    icon: Copy,
  },
  {
    title: "انقل مكتبتك بـ JSON",
    body: "Import يجلب نسخة AI Master Studio، و Export يحفظ مكتبتك الحالية كملف قابل للنقل.",
    visual: "json",
    icon: Download,
  },
] as const;

function InteractiveGuide({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = GUIDE_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1222]/95 shadow-2xl shadow-violet-500/10 backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/40">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">Interactive Guide</p>
              <h2 className="bg-gradient-to-r from-violet-300 via-white to-indigo-300 bg-clip-text text-base font-extrabold text-transparent sm:text-lg">
                شرح استخدام Studio Image
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:border-pink-400/40 hover:text-white"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex gap-1.5 border-b border-white/5 px-6 py-3">
          {GUIDE_STEPS.map((s, index) => {
            const isActive = index === stepIndex;
            const isDone = index < stepIndex;
            return (
              <button
                key={s.title}
                onClick={() => setStepIndex(index)}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"
                title={s.title}
              >
                <span
                  className={cn(
                    "absolute inset-0 origin-left transition-transform duration-500",
                    isActive
                      ? "scale-x-100 bg-gradient-to-r from-violet-400 via-indigo-400 to-pink-400"
                      : isDone
                      ? "scale-x-100 bg-gradient-to-r from-violet-500/60 to-indigo-500/60"
                      : "scale-x-0",
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="relative grid gap-5 p-6 md:grid-cols-[1.15fr_0.85fr]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`visual-${stepIndex}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner shadow-black/40"
            >
              <GuideVisual type={step.visual} />
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/40">
                  <StepIcon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-bold tracking-wider text-slate-400">
                  الخطوة {stepIndex + 1} / {GUIDE_STEPS.length}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${stepIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h3 className="text-xl font-extrabold leading-tight text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                disabled={isFirst}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-slate-200 transition hover:border-violet-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                السابق
              </button>
              <span className="text-[11px] font-semibold text-slate-500">
                {stepIndex + 1} / {GUIDE_STEPS.length}
              </span>
              <button
                onClick={() => {
                  if (isLast) onClose();
                  else setStepIndex((current) => current + 1);
                }}
                className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-violet-500/40 transition hover:shadow-violet-500/60"
              >
                {isLast ? "إنهاء" : "التالي"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GuideVisual({ type }: { type: (typeof GUIDE_STEPS)[number]["visual"] }) {
  if (type === "search") {
    return (
      <div className="space-y-3">
        <motion.div
          initial={{ width: "60%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex h-10 items-center rounded-xl border border-violet-400/30 bg-white/5 px-4 text-sm text-slate-200 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
        >
          <Search className="mr-2 h-4 w-4 text-violet-300" />
          <span className="text-slate-300">portrait makeup</span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="ml-0.5 inline-block h-4 w-px bg-violet-300"
          />
        </motion.div>
        <div className="grid grid-cols-3 gap-2">
          <MockCard active label="Portrait" gradient="from-violet-500/20 to-indigo-500/20" delay={0} />
          <MockCard label="Map" dim delay={0.1} />
          <MockCard active label="Makeup" gradient="from-indigo-500/20 to-pink-500/20" delay={0.2} />
        </div>
      </div>
    );
  }

  if (type === "viewmode") {
    return (
      <div className="space-y-3">
        <div className="flex justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400">
            <Grid3x3 className="h-5 w-5" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400">
            <List className="h-5 w-5" />
          </div>
        </div>
        <div className="columns-3 gap-2">
          {[60, 40, 80, 50, 70, 45].map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="mb-2 break-inside-avoid rounded-lg bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-pink-500/10 ring-1 ring-white/10"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "add") {
    return (
      <div className="space-y-3">
        <MockInput label="العنوان" placeholder="Portrait..." />
        <MockInput label="الموديل" placeholder="GPT Image 2" />
        <div className="grid grid-cols-2 gap-3">
          <MockUpload label="قبل" delay={0.1} />
          <MockUpload label="بعد" delay={0.2} />
        </div>
        <motion.div
          initial={{ scale: 0.96, opacity: 0.5 }}
          animate={{ scale: [0.96, 1.02, 1], opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
          className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30"
        >
          حفظ
        </motion.div>
      </div>
    );
  }

  if (type === "detail") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-white/80" />
            <div className="inline-flex h-3 w-20 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600" />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="h-32 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-pink-500/20 ring-1 ring-white/10"
        >
          <motion.div
            animate={{ x: [-20, 0, -20] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.5),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.4),transparent_55%)]"
          />
        </motion.div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            <Sparkles className="h-3 w-3" />
            Prompt
          </span>
          <div className="space-y-1">
            <div className="h-2 rounded bg-white/15" />
            <div className="h-2 w-4/5 rounded bg-white/12" />
            <div className="h-2 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "compare") {
    return (
      <div className="space-y-3">
        <div className="relative h-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b1222]">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "linear-gradient(90deg, #475569 0%, #475569 30%, #c026d3 30%, #c026d3 100%)",
                "linear-gradient(90deg, #475569 0%, #475569 70%, #c026d3 70%, #c026d3 100%)",
                "linear-gradient(90deg, #475569 0%, #475569 30%, #c026d3 30%, #c026d3 100%)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-violet-300 via-indigo-300 to-pink-300 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
            animate={{ left: ["30%", "70%", "30%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-xs font-bold text-white shadow-lg">
              ↔
            </span>
          </motion.div>
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white">Before</span>
          <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-violet-500/80 to-indigo-500/80 px-2.5 py-0.5 text-[10px] font-bold text-white">After</span>
        </div>
        <p className="text-center text-[11px] text-slate-400">حرّك الماوس فوق الكارت لرؤية المقارنة</p>
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[true, false, true, false, true, true].map((selected, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={cn(
                "relative aspect-square rounded-lg ring-1 ring-white/10",
                selected
                  ? "bg-gradient-to-br from-pink-500/40 to-violet-500/30 ring-pink-400/60"
                  : "bg-white/[0.03]",
              )}
            >
              {selected && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-pink-500 text-white">
                  <CheckSquare className="h-3 w-3" />
                </span>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-pink-500 text-xs font-bold text-white shadow shadow-pink-500/40"
        >
          <Trash2 className="h-4 w-4" />
          حذف 4 عناصر
        </motion.div>
      </div>
    );
  }

  if (type === "copy") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            <Sparkles className="h-3 w-3" />
            Prompt
          </span>
          <div className="space-y-1.5 rounded-lg bg-black/30 p-2.5 font-mono">
            <div className="h-2 rounded bg-violet-300/30" />
            <div className="h-2 w-5/6 rounded bg-violet-300/25" />
            <div className="h-2 w-2/3 rounded bg-violet-300/20" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-violet-400/10 text-xs font-bold text-violet-100"
          >
            <Copy className="h-3.5 w-3.5" />
            نسخ البرومبت
          </motion.div>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-3 text-center text-sm font-semibold text-slate-300">
          + إضافة خطوة
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        whileHover={{ y: -3 }}
        className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-sm font-bold text-violet-100"
      >
        <Upload className="h-7 w-7" />
        Import JSON
        <span className="text-[10px] font-medium text-slate-400">استيراد مكتبة</span>
      </motion.div>
      <motion.div
        whileHover={{ y: -3 }}
        className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/10 to-indigo-500/5 text-sm font-bold text-pink-100"
      >
        <Download className="h-7 w-7" />
        Export JSON
        <span className="text-[10px] font-medium text-slate-400">حفظ نسخة</span>
      </motion.div>
    </div>
  );
}

function MockCard({
  label,
  active,
  dim,
  gradient,
  delay = 0,
}: {
  label: string;
  active?: boolean;
  dim?: boolean;
  gradient?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dim ? 0.3 : 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "flex h-28 flex-col justify-end rounded-xl border p-3 transition",
        active ? "border-violet-400/30" : "border-white/10",
        gradient ? `bg-gradient-to-br ${gradient}` : "bg-white/[0.03]",
      )}
    >
      <div className="h-2.5 w-16 rounded bg-white/90" />
      <p className="mt-2 text-[10px] font-bold text-slate-200">{label}</p>
    </motion.div>
  );
}

function MockInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-violet-300/70">{label}</span>
      <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-slate-400 focus-within:border-violet-400/60">
        {placeholder}
      </div>
    </div>
  );
}

function MockUpload({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-[10px] font-semibold text-slate-400"
    >
      <Upload className="h-4 w-4 text-violet-300/70" />
      {label}
    </motion.div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-violet-300/70">{label}</span>
      {children}
    </label>
  );
}

function ImagePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex aspect-[7/3] min-h-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03] transition hover:border-violet-400/40">
      {value ? (
        <>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1 text-white backdrop-blur transition hover:bg-pink-500/80"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-400">
          <Upload className="h-5 w-5 text-violet-300/70" />
          {label}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onChange(await fileToDataUrl(file));
        }}
      />
    </div>
  );
}

function StepBlock({
  step,
  index,
  editing,
  copied,
  isDragging,
  isDragOver,
  onToggleEdit,
  onUpdate,
  onCopy,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  step: StudioStep;
  index: number;
  editing: boolean;
  copied: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<StudioStep>) => void;
  onCopy: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const [comparePos, setComparePos] = useState(50);
  const hasBoth = Boolean(step.beforeUrl && step.afterUrl);
  const mode = step.viewMode || "slider";
  const oneImage = step.beforeUrl || step.afterUrl;

  return (
    <div className="relative mb-4">
      <span className="absolute -left-[27px] top-3 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-[9px] font-bold text-white ring-4 ring-[#060c18]">
        {index + 1}
      </span>

      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", step.id);
          onDragStart();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDragEnd={onDragEnd}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        className={cn(
          "rounded-2xl border bg-white/[0.03] p-4 backdrop-blur transition",
          editing
            ? "border-pink-400/40 bg-pink-500/[0.06]"
            : isDragOver
            ? "border-violet-400/60 bg-violet-500/[0.08]"
            : "border-white/10 hover:border-pink-400/30",
          isDragging && "opacity-40",
        )}
      >
        {/* Header: drag handle + label + actions */}
        <div className="mb-3 flex items-center gap-2">
          <span className="cursor-grab text-slate-500 hover:text-violet-300 active:cursor-grabbing" title="اسحب للترتيب">
            <GripVertical className="h-4 w-4" />
          </span>
          {editing ? (
            <input
              autoFocus
              defaultValue={step.label}
              onBlur={(e) => onUpdate({ label: e.target.value })}
              placeholder="ETAPE 1"
              className="studio-input flex-1 text-sm font-bold"
            />
          ) : (
            <span className="inline-flex flex-1 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              <MousePointerClick className="h-3.5 w-3.5" />
              {step.label || `ETAPE ${index + 1}`}
            </span>
          )}
          {hasBoth && !editing && (
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
              <button
                onClick={() => onUpdate({ viewMode: "side" })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-bold transition",
                  mode === "side" ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white",
                )}
                title="عرض جنباً إلى جنب"
              >
                Côte à côte
              </button>
              <button
                onClick={() => onUpdate({ viewMode: "slider" })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-bold transition",
                  mode === "slider" ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white",
                )}
                title="عرض بسلايدر"
              >
                Slider
              </button>
            </div>
          )}
          <button
            onClick={onToggleEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-violet-400/40 hover:text-white"
            title={editing ? "تم" : "تعديل"}
          >
            {editing ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Wand2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onCopy}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-violet-400/40 hover:text-white"
            title="نسخ"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-pink-400/40 hover:text-pink-300"
            title="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Image area */}
        {editing ? (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <ImagePicker
              label="قبل (Before)"
              value={step.beforeUrl || ""}
              onChange={(v) => onUpdate({ beforeUrl: v || undefined })}
            />
            <ImagePicker
              label="بعد (After)"
              value={step.afterUrl || ""}
              onChange={(v) => onUpdate({ afterUrl: v || undefined })}
            />
          </div>
        ) : (hasBoth || oneImage) ? (
          <div className="mb-3">
            {hasBoth && mode === "side" ? (
              <div className="grid h-40 grid-cols-2 gap-2 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <img src={step.beforeUrl} alt="" className="h-full w-full object-contain" />
                <img src={step.afterUrl} alt="" className="h-full w-full object-contain" />
              </div>
            ) : hasBoth ? (
              <div
                className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-black/30"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setComparePos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                }}
              >
                <CompareImage beforeUrl={step.beforeUrl!} afterUrl={step.afterUrl!} position={comparePos} cover={false} />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <img src={oneImage} alt="" className="h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        ) : null}

        {/* Content */}
        {editing ? (
          <textarea
            defaultValue={step.content}
            onBlur={(e) => onUpdate({ content: e.target.value })}
            placeholder="محتوى الخطوة (البرومبت)..."
            className="studio-input min-h-24 resize-y font-mono text-xs"
          />
        ) : (
          <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs leading-relaxed text-slate-200">
            {step.content || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryManagerModal({
  categories,
  setCategories,
  itemsCount,
  onClose,
}: {
  categories: string[];
  setCategories: (next: string[]) => void;
  itemsCount: (name: string) => number;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Tag className="h-4 w-4 text-white" />
            </span>
            <h2 className="text-base font-bold text-white">إدارة التصنيفات</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  setCategories(uniqueList([...categories, name.trim()]));
                  setName("");
                }
              }}
              placeholder="اسم التصنيف الجديد..."
              className="studio-input flex-1"
            />
            <button
              onClick={() => {
                if (!name.trim()) return;
                setCategories(uniqueList([...categories, name.trim()]));
                setName("");
              }}
              className="h-11 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm font-bold text-white shadow shadow-violet-500/30"
            >
              إضافة
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">لا توجد تصنيفات</p>
            ) : (
              categories.map((cat) => {
                const count = itemsCount(cat);
                return (
                  <div
                    key={cat}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <Tag className="h-4 w-4 text-violet-300" />
                    <input
                      defaultValue={cat}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (!newName || newName === cat) return;
                        setCategories(categories.map((c) => (c === cat ? newName : c)));
                      }}
                      className="flex-1 bg-transparent text-sm text-white outline-none focus:text-violet-200"
                    />
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {count}
                    </span>
                    <button
                      onClick={() => {
                        if (!window.confirm(`حذف "${cat}"؟`)) return;
                        setCategories(categories.filter((c) => c !== cat));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-pink-300 hover:bg-pink-500/20"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ModelManagerModal({
  models,
  setModels,
  itemsCount,
  onClose,
}: {
  models: string[];
  setModels: (next: string[]) => void;
  itemsCount: (name: string) => number;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
              <Wand2 className="h-4 w-4 text-white" />
            </span>
            <h2 className="text-base font-bold text-white">إدارة الموديلات</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  setModels(uniqueList([...models, name.trim()]));
                  setName("");
                }
              }}
              placeholder="اسم الموديل (مثلاً: Nano Banana - Pro)..."
              className="studio-input flex-1"
            />
            <button
              onClick={() => {
                if (!name.trim()) return;
                setModels(uniqueList([...models, name.trim()]));
                setName("");
              }}
              className="h-11 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-sm font-bold text-white shadow shadow-violet-500/30"
            >
              إضافة
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {models.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">لا توجد موديلات</p>
            ) : (
              models.map((m) => {
                const count = itemsCount(m);
                return (
                  <div key={m} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <Wand2 className="h-4 w-4 text-pink-300" />
                    <input
                      defaultValue={m}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (!newName || newName === m) return;
                        setModels(models.map((x) => (x === m ? newName : x)));
                      }}
                      className="flex-1 bg-transparent text-sm text-white outline-none focus:text-pink-200"
                    />
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">{count}</span>
                    <button
                      onClick={() => {
                        if (!window.confirm(`حذف "${m}"؟`)) return;
                        setModels(models.filter((x) => x !== m));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-pink-300 hover:bg-pink-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SettingsModal({
  itemsCount,
  categoriesCount,
  modelsCount,
  // onExport,
  // onImportClick,
  onReloadSeed,
  onClearAll,
  onClose,
}: {
  itemsCount: number;
  categoriesCount: number;
  modelsCount: number;
  // onExport: () => void;
  // onImportClick: () => void;
  onReloadSeed: () => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Settings className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Settings</h2>
              <p className="text-[11px] text-slate-400">Manage your local library</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Images" value={itemsCount} accent="violet" />
            <StatChip label="Categories" value={categoriesCount} accent="indigo" />
            <StatChip label="Models" value={modelsCount} accent="pink" />
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-pink-400/20 bg-pink-500/[0.04] p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-pink-300/80">Danger Zone</p>
            <button
              onClick={onReloadSeed}
              className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:border-indigo-400/40 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reload original seed
            </button>
            <button
              onClick={onClearAll}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 text-xs font-bold text-pink-100 hover:border-pink-400/60 hover:bg-pink-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete all data
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-500">
            Data is stored locally in your browser. For cloud backup and sharing, database integration is required (phase 2).
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent: "violet" | "indigo" | "pink" }) {
  const accentMap = {
    violet: "from-violet-500/20 to-violet-600/20 text-violet-200 ring-violet-400/30",
    indigo: "from-indigo-500/20 to-indigo-600/20 text-indigo-200 ring-indigo-400/30",
    pink: "from-pink-500/20 to-pink-600/20 text-pink-200 ring-pink-400/30",
  } as const;
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl bg-gradient-to-br p-3 ring-1", accentMap[accent])}>
      <span className="text-xl font-extrabold text-white">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

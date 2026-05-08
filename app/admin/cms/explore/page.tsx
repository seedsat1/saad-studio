"use client";

import { type CSSProperties, ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Edit3,
  Eye,
  Film,
  GripVertical,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CmsSidebar } from "@/components/admin/cms-sidebar";
import { cn } from "@/lib/utils";

const uid = () => Math.random().toString(36).slice(2, 10);

type ShowcaseItem = {
  id: string;
  title: string;
  slug: string;
  model: string;
  provider: string;
  video_url: string;
  thumbnail_url: string;
  prompt: string;
  tags: string[];
  featured: boolean;
  status: "draft" | "published";
  views: number;
  likes: number;
  created_at: string;
};

type ShowcaseForm = {
  id?: string;
  title: string;
  slug: string;
  model: string;
  provider: string;
  video_url: string;
  thumbnail_url: string;
  prompt: string;
  tags: string;
  featured: boolean;
  status: "draft" | "published";
};

const emptyForm: ShowcaseForm = {
  title: "",
  slug: "",
  model: "",
  provider: "",
  video_url: "",
  thumbnail_url: "",
  prompt: "",
  tags: "",
  featured: false,
  status: "draft",
};

async function uploadToSupabase(file: File): Promise<{ publicUrl: string; isVideo: boolean }> {
  const signRes = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to create upload URL");
  }

  const { signedUrl, publicUrl, isVideo } = (await signRes.json()) as {
    signedUrl: string;
    publicUrl: string;
    isVideo: boolean;
  };

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) throw new Error("Upload to storage failed");
  return { publicUrl, isVideo };
}

type ExploreMedia = {
  type: "image" | "video";
  url: string;
  posterUrl?: string | null;
};

type ExploreModule = {
  _id: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  badges: string[];
  media: ExploreMedia[];
};

type ExploreCmsLayout = {
  modules?: ExploreModule[];
};

function parseBadges(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function SortableModuleRow({
  module,
  onChange,
  onDelete,
  onUploadMedia,
  onUploadPoster,
}: {
  module: ExploreModule;
  onChange: (patch: Partial<ExploreModule>) => void;
  onDelete: () => void;
  onUploadMedia: (index: number, file: File) => Promise<void>;
  onUploadPoster: (index: number, file: File) => Promise<void>;
}) {
  const [adSlug, setAdSlug] = useState("");
  const [creatingAd, setCreatingAd] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module._id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badgesText = module.badges.join(", ");

  const ensureMediaSlot = (idx: number) => {
    const media = [...(module.media ?? [])];
    while (media.length <= idx) media.push({ type: "image", url: "" });
    return media;
  };

  const setMediaUrl = (idx: number, url: string) => {
    const media = ensureMediaSlot(idx);
    media[idx] = { ...media[idx], url };
    onChange({ media });
  };

  const setMediaType = (idx: number, type: "image" | "video") => {
    const media = ensureMediaSlot(idx);
    media[idx] = { ...media[idx], type };
    onChange({ media });
  };

  const setPosterUrl = (idx: number, posterUrl: string) => {
    const media = ensureMediaSlot(idx);
    media[idx] = { ...media[idx], posterUrl };
    onChange({ media });
  };

  const slot0 = module.media?.[0];
  const slot1 = module.media?.[1];
  const slot2 = module.media?.[2];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] p-4",
        isDragging && "opacity-80 ring-2 ring-cyan-300/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-1 inline-flex cursor-grab items-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{module.kicker || "MODULE"}</div>
            <div className="mt-1 truncate text-lg font-black text-white">{module.title || "Untitled"}</div>
            <div className="mt-1 line-clamp-1 text-xs text-slate-400">{module.subtitle || "—"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={module.ctaHref || "#"}
            target="_blank"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            Preview link
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={module.kicker}
          onChange={(e) => onChange({ kicker: e.target.value })}
          placeholder="Kicker (e.g. NEW MODEL)"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
        />
        <input
          value={module.ctaLabel}
          onChange={(e) => onChange({ ctaLabel: e.target.value })}
          placeholder="CTA label (e.g. Try Model)"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
        />
        <input
          value={module.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 md:col-span-2"
        />
        <textarea
          value={module.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="Subtitle"
          rows={3}
          className="resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 md:col-span-2"
        />
        <input
          value={module.ctaHref}
          onChange={(e) => onChange({ ctaHref: e.target.value })}
          placeholder="CTA href (e.g. /image?tool=create&model=...)"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 md:col-span-2"
        />
        <div className="md:col-span-2 grid gap-2 rounded-xl border border-white/10 bg-slate-950 p-3">
          <div className="text-xs font-bold text-slate-400">Ad Page (optional)</div>
          <div className="flex flex-wrap gap-2">
            <input
              value={adSlug}
              onChange={(e) => setAdSlug(e.target.value)}
              placeholder="Slug (e.g. gpt-image-2)"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
            />
            <button
              type="button"
              disabled={creatingAd || !adSlug.trim()}
              onClick={async () => {
                const slug = adSlug.trim().toLowerCase().replace(/\s+/g, "-");
                if (!slug) return;
                setCreatingAd(true);
                try {
                  const pageName = `ad-${slug}`;
                  const payload: ExploreCmsLayout = { modules: [module] };
                  const res = await fetch("/api/admin/layouts", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pageName, layoutBlocks: payload }),
                  });
                  if (!res.ok) throw new Error("Failed to create ad page");
                  onChange({ ctaHref: `/ad/${slug}` });
                  setAdSlug(slug);
                } catch {} finally {
                  setCreatingAd(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              {creatingAd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create page
            </button>
            {module.ctaHref?.startsWith("/ad/") && (
              <>
                <Link
                  href={module.ctaHref}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  Open
                </Link>
                <Link
                  href={`/admin/cms/ad/${module.ctaHref.replace("/ad/", "")}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  Edit page
                </Link>
              </>
            )}
          </div>
        </div>
        <input
          value={badgesText}
          onChange={(e) => onChange({ badges: parseBadges(e.target.value) })}
          placeholder="Badges (comma separated)"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 md:col-span-2"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {([slot0, slot1, slot2] as Array<ExploreMedia | undefined>).map((slot, idx) => {
          const label = idx === 0 ? "Primary" : idx === 1 ? "Top-right" : "Bottom-right";
          const isVideo = slot?.type === "video";
          const url = slot?.url ?? "";
          const posterUrl = slot?.posterUrl ?? "";

          return (
            <div key={`${module._id}-slot-${idx}`} className="rounded-2xl border border-white/10 bg-slate-950 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300">{label}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaType(idx, "image")}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                      slot?.type === "image" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType(idx, "video")}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                      slot?.type === "video" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                  >
                    Video
                  </button>
                </div>
              </div>

              <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {isVideo && url ? (
                  <video src={url} poster={posterUrl || undefined} muted loop playsInline className="h-full w-full object-cover" />
                ) : url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">No media</div>
                )}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setMediaUrl(idx, e.target.value)}
                  placeholder="Media URL"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept={slot?.type === "video" ? "video/*" : "image/*"}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadMedia(idx, file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {isVideo && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(idx, e.target.value)}
                    placeholder="Poster URL (optional)"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                    <Upload className="h-3.5 w-3.5" />
                    Poster
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUploadPoster(idx, file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toForm(item: ShowcaseItem): ShowcaseForm {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    model: item.model,
    provider: item.provider,
    video_url: item.video_url,
    thumbnail_url: item.thumbnail_url,
    prompt: item.prompt,
    tags: item.tags.join(", "),
    featured: item.featured,
    status: item.status,
  };
}

export default function ExploreCmsPage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [form, setForm] = useState<ShowcaseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"video" | "thumbnail" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"layout" | "showcase">("layout");

  const [modules, setModules] = useState<ExploreModule[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [savingLayout, setSavingLayout] = useState(false);
  const [savedLayout, setSavedLayout] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const stats = useMemo(() => {
    return {
      total: items.length,
      featured: items.filter((item) => item.featured).length,
      published: items.filter((item) => item.status === "published").length,
      views: items.reduce((sum, item) => sum + item.views, 0),
      likes: items.reduce((sum, item) => sum + item.likes, 0),
    };
  }, [items]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/showcase", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load showcase CMS");
      const json = (await res.json()) as { items: ShowcaseItem[] };
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load showcase CMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const loadLayout = useCallback(async () => {
    setLoadingLayout(true);
    try {
      const res = await fetch("/api/admin/layouts?page=cms-explore", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load Explore layout");
      const row = await res.json();
      const b = row?.layoutBlocks as ExploreCmsLayout | null;
      const next = Array.isArray(b?.modules) ? b?.modules : [];
      setModules(next);
    } catch (err) {
      setModules([]);
      setError(err instanceof Error ? err.message : "Failed to load Explore layout");
    } finally {
      setLoadingLayout(false);
    }
  }, []);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  const addModule = () => {
    setModules((prev) => [
      ...prev,
      {
        _id: `m-${uid()}`,
        kicker: "NEW MODEL",
        title: "New module",
        subtitle: "",
        ctaLabel: "Open",
        ctaHref: "/",
        badges: ["Demos", "Tutorials", "Best settings"],
        media: [{ type: "image", url: "" }, { type: "image", url: "" }, { type: "image", url: "" }],
      },
    ]);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((prev) => {
      const oldIndex = prev.findIndex((m) => m._id === String(active.id));
      const newIndex = prev.findIndex((m) => m._id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveLayout = useCallback(async () => {
    setSavingLayout(true);
    setError(null);
    try {
      const payload: ExploreCmsLayout = { modules };
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-explore", layoutBlocks: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedLayout(true);
      setTimeout(() => setSavedLayout(false), 1500);
    } catch (err) {
      setSavedLayout(false);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingLayout(false);
    }
  }, [modules]);

  const updateModule = (id: string, patch: Partial<ExploreModule>) => {
    setModules((prev) => prev.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  };

  const deleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m._id !== id));
  };

  const uploadModuleMedia = async (moduleId: string, index: number, file: File) => {
    setError(null);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      setModules((prev) =>
        prev.map((m) => {
          if (m._id !== moduleId) return m;
          const media = [...(m.media ?? [])];
          while (media.length <= index) media.push({ type: "image", url: "" });
          media[index] = { ...media[index], url: publicUrl, type: isVideo ? "video" : "image" };
          return { ...m, media };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const uploadModulePoster = async (moduleId: string, index: number, file: File) => {
    setError(null);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      if (isVideo) throw new Error("Poster must be an image");
      setModules((prev) =>
        prev.map((m) => {
          if (m._id !== moduleId) return m;
          const media = [...(m.media ?? [])];
          while (media.length <= index) media.push({ type: "video", url: "" });
          media[index] = { ...media[index], posterUrl: publicUrl };
          return { ...m, media };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const updateField = (field: keyof ShowcaseForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>, type: "video" | "thumbnail") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(type);
    setError(null);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      if (type === "video" && !isVideo) throw new Error("Please upload a video file for video URL");
      if (type === "thumbnail" && isVideo) throw new Error("Please upload an image file for thumbnail");
      updateField(type === "video" ? "video_url" : "thumbnail_url", publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const endpoint = form.id ? `/api/admin/showcase/${form.id}` : "/api/admin/showcase";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          model: form.model,
          provider: form.provider,
          video_url: form.video_url,
          thumbnail_url: form.thumbnail_url,
          prompt: form.prompt,
          tags: form.tags,
          featured: form.featured,
          status: form.status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Save failed");
      }

      setForm(emptyForm);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (item: ShowcaseItem) => {
    await fetch(`/api/admin/showcase/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-featured" }),
    });
    await loadItems();
  };

  const deleteItem = async (item: ShowcaseItem) => {
    if (!window.confirm(`Delete "${item.title}" from showcase?`)) return;
    await fetch(`/api/admin/showcase/${item.id}`, { method: "DELETE" });
    if (form.id === item.id) setForm(emptyForm);
    await loadItems();
  };

  return (
    <div className="flex min-h-screen bg-[#050812] text-white">
      <CmsSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                <Film className="h-3.5 w-3.5" />
                Explore CMS
              </div>
              <h1 className="mt-4 text-3xl font-black">{tab === "layout" ? "Explore Page Builder" : "Explore Feed Manager"}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {tab === "layout"
                  ? "Edit the public /explore layout: text + images/videos + ordering."
                  : "Control the cinematic showcase library used by the site feed."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setTab("layout")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold transition",
                    tab === "layout" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10",
                  )}
                >
                  Page Builder
                </button>
                <button
                  type="button"
                  onClick={() => setTab("showcase")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold transition",
                    tab === "showcase" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10",
                  )}
                >
                  Showcase Feed
                </button>
              </div>

              {tab === "layout" ? (
                <>
                  <Link
                    href="/explore"
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                  >
                    Preview /explore
                  </Link>
                  <button
                    type="button"
                    onClick={addModule}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add module
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveLayout()}
                    disabled={savingLayout}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {savingLayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savedLayout ? "Saved" : "Save"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void loadItems()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="mt-1 text-xs text-slate-500">Total items</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-amber-300">{stats.featured}</div>
              <div className="mt-1 text-xs text-slate-500">Featured</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-emerald-300">{stats.published}</div>
              <div className="mt-1 text-xs text-slate-500">Published</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-pink-300">{stats.likes}</div>
              <div className="mt-1 text-xs text-slate-500">Likes</div>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

          {tab === "layout" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Modules</h2>
                <button
                  type="button"
                  onClick={() => void loadLayout()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-500">اسحب بالماوس لإعادة الترتيب. عدّل النصوص وارفع صور/فيديو، ثم احفظ.</p>

              {loadingLayout ? (
                <div className="flex h-60 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                </div>
              ) : modules.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-6 text-sm text-slate-400">
                  No modules yet. Click “Add module”.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={modules.map((m) => m._id)} strategy={verticalListSortingStrategy}>
                      {modules.map((m) => (
                        <SortableModuleRow
                          key={m._id}
                          module={m}
                          onChange={(patch) => updateModule(m._id, patch)}
                          onDelete={() => deleteModule(m._id)}
                          onUploadMedia={(index, file) => uploadModuleMedia(m._id, index, file)}
                          onUploadPoster={(index, file) => uploadModulePoster(m._id, index, file)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">{form.id ? "Edit showcase" : "Upload showcase"}</h2>
                {form.id ? (
                  <button type="button" onClick={() => setForm(emptyForm)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Plus className="h-5 w-5 text-cyan-300" />
                )}
              </div>

              <div className="grid gap-3">
                <input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Title" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
                <input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="Slug (optional)" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.model} onChange={(e) => updateField("model", e.target.value)} placeholder="Model" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
                  <input value={form.provider} onChange={(e) => updateField("provider", e.target.value)} placeholder="Provider" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
                </div>
                <textarea value={form.prompt} onChange={(e) => updateField("prompt", e.target.value)} placeholder="Prompt" rows={4} className="resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />
                <input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} placeholder="Tags separated by commas" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" />

                <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                  <label className="text-xs font-bold text-slate-400">Video</label>
                  <div className="flex gap-2">
                    <input value={form.video_url} onChange={(e) => updateField("video_url", e.target.value)} placeholder="Video URL" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50" />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                      {uploading === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="video/*" className="hidden" onChange={(e) => void uploadFile(e, "video")} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                  <label className="text-xs font-bold text-slate-400">Thumbnail</label>
                  <div className="flex gap-2">
                    <input value={form.thumbnail_url} onChange={(e) => updateField("thumbnail_url", e.target.value)} placeholder="Thumbnail URL" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50" />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                      {uploading === "thumbnail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadFile(e, "thumbnail")} />
                    </label>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  <input type="checkbox" checked={form.featured} onChange={(e) => updateField("featured", e.target.checked)} />
                  Feature this showcase
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950 p-2">
                  {(["draft", "published"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateField("status", status)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs font-bold capitalize transition",
                        form.status === status ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? "Save changes" : "Create showcase"}
              </button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 p-5">
                <h2 className="text-lg font-black">Showcase library</h2>
                <p className="mt-1 text-sm text-slate-500">Newest items are shown first.</p>
              </div>

              {loading ? (
                <div className="flex h-72 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No showcase items yet.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 p-4">
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-bold text-white">{item.title}</h3>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", item.status === "published" ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-500/20 text-slate-300")}>
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{item.provider} / {item.model}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => void toggleFeatured(item)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs", item.featured ? "border-amber-400/40 bg-amber-400/15 text-amber-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")}>
                              <Star className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setForm(toForm(item))} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => void deleteItem(item)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.prompt || "No prompt"}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{item.views}</span>
                          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{item.likes}</span>
                          {item.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}

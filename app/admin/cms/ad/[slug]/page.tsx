"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
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
import { CmsSidebar } from "@/components/admin/cms-sidebar";
import { cn } from "@/lib/utils";
import { GripVertical, Loader2, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);

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

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={module.kicker}
          onChange={(e) => onChange({ kicker: e.target.value })}
          placeholder="Kicker"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
        />
        <input
          value={module.ctaLabel}
          onChange={(e) => onChange({ ctaLabel: e.target.value })}
          placeholder="CTA label"
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
          placeholder="CTA href"
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400/50 md:col-span-2"
        />
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

export default function AdminAdCmsPage({ params }: { params: { slug: string } }) {
  const pageName = `ad-${params.slug}`;
  const [modules, setModules] = useState<ExploreModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/layouts?page=${encodeURIComponent(pageName)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load layout");
      const row = await res.json();
      const b = row?.layoutBlocks as ExploreCmsLayout | null;
      setModules(Array.isArray(b?.modules) ? b.modules : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load layout");
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [pageName]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: ExploreCmsLayout = { modules };
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName, layoutBlocks: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setSaved(false);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [modules, pageName]);

  const addModule = () => {
    setModules((prev) => [
      ...prev,
      {
        _id: `m-${uid()}`,
        kicker: "AD",
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

  const updateModule = (id: string, patch: Partial<ExploreModule>) => {
    setModules((prev) => prev.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  };

  const deleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m._id !== id));
  };

  const uploadMedia = async (moduleId: string, index: number, file: File) => {
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

  const uploadPoster = async (moduleId: string, index: number, file: File) => {
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

  const title = useMemo(() => params.slug.replace(/-/g, " "), [params.slug]);

  return (
    <div className="flex min-h-screen bg-[#050812] text-white">
      <CmsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                Ad Page CMS
              </div>
              <h1 className="mt-4 text-3xl font-black">{title}</h1>
              <p className="mt-2 text-sm text-slate-400">Edit this ad page. Save then open the public URL.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/ad/${params.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                Preview
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
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Reload
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
              </div>
            ) : modules.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-6 text-sm text-slate-400">
                No modules yet. Click “Add module”.
              </div>
            ) : (
              <div className="space-y-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={modules.map((m) => m._id)} strategy={verticalListSortingStrategy}>
                    {modules.map((m) => (
                      <SortableModuleRow
                        key={m._id}
                        module={m}
                        onChange={(patch) => updateModule(m._id, patch)}
                        onDelete={() => deleteModule(m._id)}
                        onUploadMedia={(index, file) => uploadMedia(m._id, index, file)}
                        onUploadPoster={(index, file) => uploadPoster(m._id, index, file)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  Film,
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
  };
}

export default function ShowcaseCmsPage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [form, setForm] = useState<ShowcaseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"video" | "thumbnail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: items.length,
      featured: items.filter((item) => item.featured).length,
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
                Dynamic Showcase CMS
              </div>
              <h1 className="mt-4 text-3xl font-black">Showcase Feed Manager</h1>
              <p className="mt-2 text-sm text-slate-400">Upload, edit, feature, and delete cinematic showcase cards rendered on /explore.</p>
            </div>
            <button
              onClick={() => void loadItems()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
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
              <div className="text-2xl font-black text-cyan-300">{stats.views}</div>
              <div className="mt-1 text-xs text-slate-500">Views</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-pink-300">{stats.likes}</div>
              <div className="mt-1 text-xs text-slate-500">Likes</div>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

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
                            <h3 className="truncate font-bold text-white">{item.title}</h3>
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
        </div>
      </main>
    </div>
  );
}

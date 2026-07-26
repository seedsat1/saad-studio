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
import { DEFAULT_EXPLORE_MODULES, type ExploreMedia, type ExploreModule, type ExploreModuleLayout } from "@/lib/explore-cms";

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
  type: "video" | "image";
  aspect_ratio: string;
};

type PromoMediaMap = Record<string, { url: string; type: string }>;
type PromoContent = { title?: string; subtitle?: string; cta?: string; ctaHref?: string; badge?: string };
type PromoContentMap = Record<string, PromoContent>;
type ExploreAdCms = {
  slotId: string;
  name: string;
  fallbackHero: string;
  gallery?: string[];
  defaults: PromoContent;
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
  type: "video",
  aspect_ratio: "16:9",
};

const EXPLORE_ADS: ExploreAdCms[] = [
  {
    slotId: "explore/ad/gpt-image-2",
    name: "GPT Image 2",
    fallbackHero: "/GPT%20Image%202/SHOT%201.webp",
    gallery: [
      "/GPT%20Image%202/SHOT%202.webp",
      "/GPT%20Image%202/SHOT%203.webp",
      "/GPT%20Image%202/SHOT%204.webp",
      "/GPT%20Image%202/SHOT%205.webp",
      "/GPT%20Image%202/SHOT%206.webp",
      "/GPT%20Image%202/SHOT%207.webp",
      "/GPT%20Image%202/SHOT%208.webp",
      "/GPT%20Image%202/SHOT%209.webp",
    ],
    defaults: {
      badge: "NEW MODEL",
      title: "Meet GPT Image 2",
      subtitle: "4K images with near-perfect text rendering",
      cta: "Try Model",
      ctaHref: "/image?tool=create&model=gpt-image-2-text-to-image",
    },
  },
  {
    slotId: "explore/ad/canvas",
    name: "Canvas",
    fallbackHero: "/canvas.webp",
    defaults: { title: "Canvas", cta: "Open", ctaHref: "https://www.saadstudio.app/canvas" },
  },
  {
    slotId: "explore/ad/seedance-2",
    name: "Seedance 2",
    fallbackHero: "/seedance%202/Hero.webp",
    gallery: [
      "/seedance%202/1%20(1).webp",
      "/seedance%202/1%20(2).webp",
      "/seedance%202/1%20(3).webp",
      "/seedance%202/1%20(4).webp",
      "/seedance%202/1%20(5).webp",
      "/seedance%202/1%20(6).webp",
      "/seedance%202/1%20(7).webp",
      "/seedance%202/1%20(8).webp",
    ],
    defaults: {
      badge: "VIDEO MODEL",
      title: "Seedance 2",
      subtitle: "Fast cinematic video generation with smooth motion and flexible references.",
      cta: "Try Model",
      ctaHref: "/video?tool=create-video&model=bytedance-seedance-v2-t2v",
    },
  },
  {
    slotId: "explore/ad/next-scene-engine",
    name: "NEXT SCENE ENGINE",
    fallbackHero: "/NEXT%20SCENE%20ENGINE.webp",
    defaults: { title: "NEXT SCENE ENGINE", cta: "Open", ctaHref: "https://www.saadstudio.app/cinema-studio" },
  },
  {
    slotId: "explore/ad/transitions",
    name: "Transitions",
    fallbackHero: "/transitions/Hero.webp",
    gallery: [
      "/transitions/1%20(1).webp",
      "/transitions/1%20(2).webp",
      "/transitions/1%20(3).webp",
      "/transitions/1%20(4).webp",
      "/transitions/1%20(5).webp",
      "/transitions/1%20(6).webp",
      "/transitions/1%20(7).webp",
      "/transitions/1%20(8).webp",
      "/transitions/1%20(9).webp",
    ],
    defaults: {
      badge: "VIDEO TOOL",
      title: "Transitions",
      subtitle: "Create stylized scene changes and motion bridges between your clips.",
      cta: "Open Tool",
      ctaHref: "https://www.saadstudio.app/apps/tool/transitions",
    },
  },
  {
    slotId: "explore/ad/nano-banana",
    name: "Nano Banana",
    fallbackHero: "/nano.webp",
    defaults: { title: "نانوبنانا", cta: "Open", ctaHref: "/image?tool=create&model=nano-banana-pro" },
  },
  {
    slotId: "explore/ad/kling-3",
    name: "Kling 3.0",
    fallbackHero: "/Kling%203.0/Hero.webp",
    gallery: [
      "/Kling%203.0/1%20(1).webp",
      "/Kling%203.0/1%20(2).webp",
      "/Kling%203.0/1%20(3).webp",
      "/Kling%203.0/1%20(4).webp",
      "/Kling%203.0/1%20(5).webp",
      "/Kling%203.0/1%20(6).webp",
      "/Kling%203.0/1%20(7).webp",
      "/Kling%203.0/1%20(8).webp",
    ],
    defaults: {
      badge: "VIDEO MODEL",
      title: "Kling 3.0",
      subtitle: "Cinematic motion, strong scene continuity, and polished video generation.",
      cta: "Try Model",
      ctaHref: "/video?tool=create-video&model=kling-v3.0-pro-t2v",
    },
  },
];

async function uploadToSupabase(file: File): Promise<{ publicUrl: string; isVideo: boolean }> {
  try {
    const signRes = await fetch("/api/admin/media/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
    });

    if (!signRes.ok) {
      throw new Error("Failed to create upload URL");
    }

    const { signedUrl, publicUrl, isVideo } = (await signRes.json()) as {
      signedUrl: string;
      publicUrl: string;
      isVideo: boolean;
    };

    if (signedUrl.includes("fallback-trigger")) {
      throw new Error("Local environment: triggering server upload fallback");
    }

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) throw new Error("Upload to storage failed");
    return { publicUrl, isVideo };
  } catch (err) {
    const formData = new FormData();
    formData.append("file", file);

    const fallbackRes = await fetch("/api/admin/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!fallbackRes.ok) {
      const errorJson = await fallbackRes.json().catch(() => ({}));
      throw new Error(errorJson?.error ?? "Upload failed completely");
    }

    const { publicUrl, isVideo } = (await fallbackRes.json()) as {
      publicUrl: string;
      isVideo: boolean;
    };
    return { publicUrl, isVideo };
  }
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
    type: (item as any).type ?? "video",
    aspect_ratio: (item as any).aspect_ratio ?? "16:9",
  };
}

export default function ExploreCmsPage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [form, setForm] = useState<ShowcaseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"video" | "thumbnail" | null>(null);
  const [promoMedia, setPromoMedia] = useState<PromoMediaMap>({});
  const [promoContent, setPromoContent] = useState<PromoContentMap>({});
  const [promoDrafts, setPromoDrafts] = useState<PromoContentMap>({});
  const [promoSaving, setPromoSaving] = useState<string | null>(null);
  const [promoUploading, setPromoUploading] = useState<string | null>(null);
  const [exploreModules, setExploreModules] = useState<ExploreModule[]>(DEFAULT_EXPLORE_MODULES);
  const [exploreSaving, setExploreSaving] = useState(false);
  const [exploreUploading, setExploreUploading] = useState<string | null>(null);
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedMedia, setDraggedMedia] = useState<{ moduleId: string; mediaId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const loadPromo = async () => {
    try {
      const [mediaRes, contentRes] = await Promise.all([
        fetch("/api/admin/promo/media", { cache: "no-store" }),
        fetch("/api/admin/promo/content", { cache: "no-store" }),
      ]);
      const mediaJson = mediaRes.ok ? await mediaRes.json() : { media: {} };
      const contentJson = contentRes.ok ? await contentRes.json() : { content: {} };
      const loadedContent = (contentJson.content ?? {}) as PromoContentMap;
      setPromoMedia((mediaJson.media ?? {}) as PromoMediaMap);
      setPromoContent(loadedContent);
      setPromoDrafts(
        EXPLORE_ADS.reduce<PromoContentMap>((acc, ad) => {
          acc[ad.slotId] = { ...ad.defaults, ...(loadedContent[ad.slotId] ?? {}) };
          return acc;
        }, {}),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load explore ad CMS");
    }
  };

  const loadExploreCms = async () => {
    try {
      const res = await fetch("/api/admin/explore/cms", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load Explore page CMS");
      setExploreModules(Array.isArray(json?.config?.modules) ? json.config.modules : DEFAULT_EXPLORE_MODULES);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Explore page CMS");
    }
  };

  useEffect(() => {
    void loadItems();
    void loadPromo();
    void loadExploreCms();
  }, []);

  const updateModule = (moduleId: string, patch: Partial<ExploreModule>) => {
    setExploreModules((current) => current.map((module) => (module.id === moduleId ? { ...module, ...patch } : module)));
  };

  const updateHero = (moduleId: string, patch: Partial<ExploreMedia>) => {
    setExploreModules((current) =>
      current.map((module) =>
        module.id === moduleId ? { ...module, hero: { ...module.hero, ...patch } } : module,
      ),
    );
  };

  const updateGalleryMedia = (moduleId: string, mediaId: string, patch: Partial<ExploreMedia>) => {
    setExploreModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? { ...module, gallery: module.gallery.map((media) => (media.id === mediaId ? { ...media, ...patch } : media)) }
          : module,
      ),
    );
  };

  const moveModule = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setExploreModules((current) => {
      const fromIndex = current.findIndex((module) => module.id === fromId);
      const toIndex = current.findIndex((module) => module.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const moveGalleryMedia = (moduleId: string, fromId: string, toId: string) => {
    if (fromId === toId) return;
    setExploreModules((current) =>
      current.map((module) => {
        if (module.id !== moduleId) return module;
        const fromIndex = module.gallery.findIndex((media) => media.id === fromId);
        const toIndex = module.gallery.findIndex((media) => media.id === toId);
        if (fromIndex < 0 || toIndex < 0) return module;
        const gallery = [...module.gallery];
        const [item] = gallery.splice(fromIndex, 1);
        gallery.splice(toIndex, 0, item);
        return { ...module, gallery };
      }),
    );
  };

  const addModule = (layout: ExploreModuleLayout) => {
    const id = `custom-${Date.now()}`;
    setExploreModules((current) => [
      ...current,
      {
        id,
        enabled: true,
        layout,
        badge: layout === "banner" ? "NEW" : "MODEL",
        title: layout === "banner" ? "New Hero" : "New Model Ad",
        subtitle: "",
        cta: "Open",
        href: "/explore",
        hero: { id: "hero", url: "/canvas.webp", type: "image", alt: "New Explore ad" },
        gallery: layout === "banner" ? [] : [{ id: `gallery-${Date.now()}`, url: "/canvas.webp", type: "image" }],
      },
    ]);
  };

  const duplicateModule = (module: ExploreModule) => {
    const id = `${module.id}-copy-${Date.now()}`;
    setExploreModules((current) => [
      ...current,
      {
        ...module,
        id,
        title: `${module.title} Copy`,
        hero: { ...module.hero, id: "hero" },
        gallery: module.gallery.map((media, index) => ({ ...media, id: `gallery-${index + 1}-${Date.now()}` })),
      },
    ]);
  };

  const addGalleryCard = (moduleId: string) => {
    setExploreModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              gallery: [
                ...module.gallery,
                { id: `gallery-${Date.now()}`, url: module.hero.url, type: module.hero.type, alt: module.title },
              ],
            }
          : module,
      ),
    );
  };

  const removeGalleryCard = (moduleId: string, mediaId: string) => {
    setExploreModules((current) =>
      current.map((module) =>
        module.id === moduleId ? { ...module, gallery: module.gallery.filter((media) => media.id !== mediaId) } : module,
      ),
    );
  };

  const uploadExploreMedia = async (moduleId: string, target: "hero" | string, file: File | undefined) => {
    if (!file) return;
    const uploadKey = `${moduleId}:${target}`;
    setExploreUploading(uploadKey);
    setError(null);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      const patch: Partial<ExploreMedia> = { url: publicUrl, type: isVideo ? "video" : "image" };
      if (target === "hero") updateHero(moduleId, patch);
      else updateGalleryMedia(moduleId, target, patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setExploreUploading(null);
    }
  };

  const saveExploreCms = async () => {
    setExploreSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/explore/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { modules: exploreModules } }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to save Explore page CMS");
      setExploreModules(Array.isArray(json?.config?.modules) ? json.config.modules : exploreModules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Explore page CMS");
    } finally {
      setExploreSaving(false);
    }
  };

  const updatePromoDraft = (slotId: string, field: keyof PromoContent, value: string) => {
    setPromoDrafts((current) => ({
      ...current,
      [slotId]: { ...(current[slotId] ?? {}), [field]: value },
    }));
  };

  const savePromoContent = async (ad: ExploreAdCms) => {
    setPromoSaving(ad.slotId);
    setError(null);
    try {
      const draft = promoDrafts[ad.slotId] ?? ad.defaults;
      const res = await fetch("/api/admin/promo/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: ad.slotId, ...draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save ad content");
      }
      await loadPromo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ad content");
    } finally {
      setPromoSaving(null);
    }
  };

  const savePromoMedia = async (slotId: string, url: string) => {
    if (!url.trim()) return;
    setPromoSaving(slotId);
    setError(null);
    try {
      const res = await fetch("/api/admin/promo/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, url: url.trim(), mediaType: "image" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save media");
      }
      await loadPromo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save media");
    } finally {
      setPromoSaving(null);
    }
  };

  const uploadPromoFile = async (slotId: string, file: File | undefined) => {
    if (!file) return;
    setPromoUploading(slotId);
    setError(null);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      if (isVideo) throw new Error("Please upload an image for Explore ads");
      await savePromoMedia(slotId, publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPromoUploading(null);
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
      if (form.type === "image") {
        updateField("thumbnail_url", publicUrl);
        updateField("video_url", publicUrl);
      } else {
        if (type === "video" && !isVideo) throw new Error("Please upload a video file for video URL");
        if (type === "thumbnail" && isVideo) throw new Error("Please upload an image file for thumbnail");
        updateField(type === "video" ? "video_url" : "thumbnail_url", publicUrl);
      }
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
          type: form.type,
          aspect_ratio: form.aspect_ratio,
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
                Explore Showcase CMS
              </div>
              <h1 className="mt-4 text-3xl font-black">Explore Feed Manager</h1>
              <p className="mt-2 text-sm text-slate-400">Control the cinematic showcase cards rendered on the public /explore page.</p>
            </div>
            <button
              onClick={() => void loadItems()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.035] p-5 shadow-2xl shadow-black/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Live Explore Page Builder</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                  This is the real source for /explore. Drag modules or cards to reorder, edit any text, upload image/video, add hero banners or gallery ads, then save.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addModule("banner")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10">
                  <Plus className="h-4 w-4" /> Add hero
                </button>
                <button onClick={() => addModule("gallery-right")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10">
                  <Plus className="h-4 w-4" /> Add cards ad
                </button>
                <button onClick={() => void saveExploreCms()} disabled={exploreSaving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-60">
                  {exploreSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Explore
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {exploreModules.map((module, moduleIndex) => (
                <div
                  key={module.id}
                  draggable
                  onDragStart={() => setDraggedModuleId(module.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedModuleId) moveModule(draggedModuleId, module.id);
                    setDraggedModuleId(null);
                  }}
                  className={cn(
                    "rounded-2xl border border-white/10 bg-slate-950/80 p-4 transition",
                    draggedModuleId === module.id && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">#{moduleIndex + 1} {module.title || "Untitled"}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{module.id}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={module.layout} onChange={(event) => updateModule(module.id, { layout: event.target.value as ExploreModuleLayout })} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white">
                        <option value="banner">Hero banner</option>
                        <option value="gallery-right">Hero left / cards right</option>
                        <option value="gallery-left">Cards left / hero right</option>
                      </select>
                      <button onClick={() => updateModule(module.id, { enabled: !module.enabled })} className={cn("rounded-lg px-2 py-1.5 text-xs font-bold", module.enabled ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-slate-400")}>
                        {module.enabled ? "Visible" : "Hidden"}
                      </button>
                      <button onClick={() => duplicateModule(module)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white hover:bg-white/10">Duplicate</button>
                      <button onClick={() => setExploreModules((current) => current.filter((item) => item.id !== module.id))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-200 hover:bg-red-500/20">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-xs text-slate-400">
                        Badge
                        <input value={module.badge ?? ""} onChange={(event) => updateModule(module.id, { badge: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
                      </label>
                      <label className="space-y-1.5 text-xs text-slate-400">
                        CTA
                        <input value={module.cta ?? ""} onChange={(event) => updateModule(module.id, { cta: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
                      </label>
                      <label className="space-y-1.5 text-xs text-slate-400 md:col-span-2">
                        Title
                        <input value={module.title} onChange={(event) => updateModule(module.id, { title: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
                      </label>
                      <label className="space-y-1.5 text-xs text-slate-400 md:col-span-2">
                        Subtitle
                        <textarea value={module.subtitle ?? ""} onChange={(event) => updateModule(module.id, { subtitle: event.target.value })} rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
                      </label>
                      <label className="space-y-1.5 text-xs text-slate-400 md:col-span-2">
                        Ad page / target link
                        <input value={module.href} onChange={(event) => updateModule(module.id, { href: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                        <div className="flex gap-3">
                          {module.hero.type === "video" ? (
                            <video src={module.hero.url} className="h-24 w-36 rounded-lg object-cover ring-1 ring-white/10" muted playsInline />
                          ) : (
                            <img src={module.hero.url} alt={module.hero.alt || module.title} className="h-24 w-36 rounded-lg object-cover ring-1 ring-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white">Hero media</p>
                            <input value={module.hero.url} onChange={(event) => updateHero(module.id, { url: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400/50" />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <select value={module.hero.type} onChange={(event) => updateHero(module.id, { type: event.target.value as "image" | "video" })} className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-white">
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                              </select>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white hover:bg-white/10">
                                {exploreUploading === `${module.id}:hero` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                Upload
                                <input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => void uploadExploreMedia(module.id, "hero", event.target.files?.[0])} />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {module.layout !== "banner" ? (
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-black text-white">Gallery cards</p>
                            <button onClick={() => addGalleryCard(module.id)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-950">
                              <Plus className="h-3 w-3" /> Add card
                            </button>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {module.gallery.map((media, mediaIndex) => (
                              <div
                                key={media.id}
                                draggable
                                onDragStart={() => setDraggedMedia({ moduleId: module.id, mediaId: media.id })}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => {
                                  if (draggedMedia?.moduleId === module.id) moveGalleryMedia(module.id, draggedMedia.mediaId, media.id);
                                  setDraggedMedia(null);
                                }}
                                className="rounded-lg border border-white/10 bg-slate-900/70 p-2"
                              >
                                <div className="flex gap-2">
                                  {media.type === "video" ? (
                                    <video src={media.url} className="h-14 w-20 rounded object-cover" muted playsInline />
                                  ) : (
                                    <img src={media.url} alt={media.alt || ""} className="h-14 w-20 rounded object-cover" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-slate-400">Card {mediaIndex + 1}</p>
                                    <input value={media.url} onChange={(event) => updateGalleryMedia(module.id, media.id, { url: event.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/35 px-2 py-1 text-[11px] text-white outline-none" />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <select value={media.type} onChange={(event) => updateGalleryMedia(module.id, media.id, { type: event.target.value as "image" | "video" })} className="rounded border border-white/10 bg-black/35 px-2 py-1 text-[11px] text-white">
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                  </select>
                                  <label className="cursor-pointer rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white hover:bg-white/10">
                                    Upload
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => void uploadExploreMedia(module.id, media.id, event.target.files?.[0])} />
                                  </label>
                                  <button onClick={() => removeGalleryCard(module.id, media.id)} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Media Type</label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950 p-2">
                    {(["video", "image"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField("type", type)}
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs font-bold capitalize transition",
                          form.type === type ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Aspect Ratio</label>
                  <select
                    value={form.aspect_ratio}
                    onChange={(e) => updateField("aspect_ratio", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="16:9">16:9 (Horizontal)</option>
                    <option value="9:16">9:16 (Vertical/Reel)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Classic)</option>
                    <option value="3:4">3:4 (Portrait)</option>
                  </select>
                </div>

                {form.type === "video" ? (
                  <>
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
                      <label className="text-xs font-bold text-slate-400">Video Thumbnail</label>
                      <div className="flex gap-2">
                        <input value={form.thumbnail_url} onChange={(e) => updateField("thumbnail_url", e.target.value)} placeholder="Thumbnail URL" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50" />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                          {uploading === "thumbnail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadFile(e, "thumbnail")} />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                    <label className="text-xs font-bold text-slate-400">Image</label>
                    <div className="flex gap-2">
                      <input value={form.thumbnail_url} onChange={(e) => { updateField("thumbnail_url", e.target.value); updateField("video_url", e.target.value); }} placeholder="Image URL" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-cyan-400/50" />
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                        {uploading === "thumbnail" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadFile(e, "thumbnail")} />
                      </label>
                    </div>
                  </div>
                )}

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
        </div>
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Clapperboard,
  Eye,
  Flame,
  Heart,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tags,
  Video,
} from "lucide-react";
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

type FeedResponse = {
  items: ShowcaseItem[];
  nextCursor?: string | null;
};

function compactNumber(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function ShowcaseCard({ item, priority = false }: { item: ShowcaseItem; priority?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const startPreview = async () => {
    if (!videoRef.current) return;
    setIsPreviewing(true);
    try {
      videoRef.current.currentTime = 0;
      await videoRef.current?.play();
    } catch {
      setIsPreviewing(false);
    }
  };

  const stopPreview = () => {
    setIsPreviewing(false);
    videoRef.current?.pause();
  };

  const likeItem = async () => {
    await fetch(`/api/showcase/${item.id}`, { method: "PATCH" });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onMouseEnter={() => void startPreview()}
      onMouseLeave={stopPreview}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-[#090f1d] shadow-2xl shadow-black/30",
        priority ? "md:col-span-2 md:row-span-2" : "",
      )}
    >
      <div className={cn("relative bg-slate-950", priority ? "aspect-[16/10]" : "aspect-[4/5]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition duration-500",
            isPreviewing ? "opacity-0 scale-105" : "opacity-100 scale-100",
          )}
        />
        <video
          ref={videoRef}
          src={item.video_url}
          muted
          loop
          playsInline
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition duration-500",
            isPreviewing ? "opacity-100 scale-100" : "opacity-0 scale-105",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-100">
              <Star className="h-3 w-3" />
              Featured
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-100">
            {item.provider}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur">
          <Play className="h-4 w-4 fill-white text-white" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className={cn("font-black leading-tight text-white", priority ? "text-2xl" : "text-base")}>{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.prompt}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="rounded-full bg-white/10 px-2 py-1">{item.model}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {compactNumber(item.views)}
            </span>
            <button onClick={() => void likeItem()} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 hover:bg-pink-500/20">
              <Heart className="h-3.5 w-3.5" />
              {compactNumber(item.likes)}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ExplorePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [featured, setFeatured] = useState<ShowcaseItem[]>([]);
  const [trending, setTrending] = useState<ShowcaseItem[]>([]);
  const [activeFeed, setActiveFeed] = useState<"latest" | "featured" | "trending">("latest");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShowcase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestRes, featuredRes, trendingRes] = await Promise.all([
        fetch("/api/showcase", { cache: "no-store" }),
        fetch("/api/showcase/featured", { cache: "no-store" }),
        fetch("/api/showcase/trending", { cache: "no-store" }),
      ]);

      if (!latestRes.ok) throw new Error("Failed to load showcase feed");

      const latestJson = (await latestRes.json()) as FeedResponse;
      const featuredJson = featuredRes.ok ? ((await featuredRes.json()) as FeedResponse) : { items: [] };
      const trendingJson = trendingRes.ok ? ((await trendingRes.json()) as FeedResponse) : { items: [] };

      setItems(latestJson.items ?? []);
      setFeatured(featuredJson.items ?? []);
      setTrending(trendingJson.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load showcase");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const feedItems = useMemo(() => {
    const source = activeFeed === "featured" ? featured : activeFeed === "trending" ? trending : items;
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((item) => {
      return [
        item.title,
        item.prompt,
        item.model,
        item.provider,
        item.tags.join(" "),
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeFeed, featured, items, query, trending]);

  const hero = featured[0] ?? trending[0] ?? items[0] ?? null;

  return (
    <main className="min-h-screen bg-[#050812] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        {hero ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050812]/70 via-[#050812]/90 to-[#050812]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.16),transparent_32%)]" />
        )}

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-12 md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.8fr)] md:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Showcase Feed
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Explore cinematic AI work from Saad Studio.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              A dynamic gallery powered by the showcase database, tuned for premium hover previews and scalable discovery feeds.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveFeed("featured")}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                <Star className="h-4 w-4" />
                Featured
              </button>
              <button
                onClick={() => setActiveFeed("trending")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Flame className="h-4 w-4" />
                Trending
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Video className="h-4 w-4 text-cyan-300" />
              Live Feed Stats
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <div className="text-2xl font-black text-cyan-300">{items.length}</div>
                <div className="mt-1 text-[11px] text-slate-400">Latest</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <div className="text-2xl font-black text-amber-300">{featured.length}</div>
                <div className="mt-1 text-[11px] text-slate-400">Featured</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <div className="text-2xl font-black text-pink-300">{trending.length}</div>
                <div className="mt-1 text-[11px] text-slate-400">Trending</div>
              </div>
            </div>
            {hero && (
              <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Hero pick</div>
                <div className="mt-2 text-lg font-black text-white">{hero.title}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {hero.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFeed("latest")}
              className={cn("rounded-xl px-4 py-2 text-sm font-bold", activeFeed === "latest" ? "bg-white text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10")}
            >
              Latest
            </button>
            <button
              onClick={() => setActiveFeed("featured")}
              className={cn("rounded-xl px-4 py-2 text-sm font-bold", activeFeed === "featured" ? "bg-white text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10")}
            >
              Featured
            </button>
            <button
              onClick={() => setActiveFeed("trending")}
              className={cn("rounded-xl px-4 py-2 text-sm font-bold", activeFeed === "trending" ? "bg-white text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10")}
            >
              Trending
            </button>
          </div>
          <div className="flex flex-1 gap-3 md:max-w-lg">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search model, provider, prompt, tags"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
            </label>
            <button
              onClick={() => void loadShowcase()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">{error}</div>
        ) : feedItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <Clapperboard className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-xl font-black">No showcase items yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Upload cinematic showcase videos from the admin CMS. Once added, this feed will populate automatically.
            </p>
            <a
              href="/admin/cms/showcase"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Open Showcase CMS
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="grid auto-rows-auto grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {feedItems.map((item, index) => (
              <ShowcaseCard key={item.id} item={item} priority={index === 0 && activeFeed !== "latest"} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Tags className="h-4 w-4" />
              Dynamic Showcase System
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Every card is served from the database through `/api/showcase`, with featured and trending routes ready for larger feeds.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

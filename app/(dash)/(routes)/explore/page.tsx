"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Flame, Heart, Play, Search, Sparkles, Star } from "lucide-react";
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

function PreviewVideo({ item, className }: { item: ShowcaseItem; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = async () => {
    if (!videoRef.current) return;
    setPlaying(true);
    try {
      videoRef.current.currentTime = 0;
      await videoRef.current.play();
    } catch {
      setPlaying(false);
    }
  };

  const pause = () => {
    setPlaying(false);
    videoRef.current?.pause();
  };

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} onMouseEnter={() => void play()} onMouseLeave={pause}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumbnail_url}
        alt={item.title}
        className={cn("absolute inset-0 h-full w-full object-cover transition duration-700", playing ? "scale-110 opacity-0" : "scale-100 opacity-100")}
      />
      <video
        ref={videoRef}
        src={item.video_url}
        muted
        loop
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 h-full w-full object-cover transition duration-700", playing ? "scale-100 opacity-100" : "scale-110 opacity-0")}
      />
    </div>
  );
}

function ReelCard({ item, size = "normal" }: { item: ShowcaseItem; size?: "wide" | "tall" | "normal" }) {
  const likeItem = async () => {
    await fetch(`/api/showcase/${item.id}`, { method: "PATCH" });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "group relative mb-5 break-inside-avoid overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30",
        size === "wide" && "lg:col-span-2",
      )}
    >
      <div className={cn("relative", size === "wide" ? "aspect-[16/9]" : size === "tall" ? "aspect-[3/4]" : "aspect-[4/5]")}>
        <PreviewVideo item={item} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-95" />
        <div className="absolute inset-0 bg-cyan-300/0 transition group-hover:bg-cyan-300/[0.03]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 backdrop-blur">
              <Star className="h-3 w-3" />
              Featured
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur">
            {item.model}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur transition group-hover:scale-110 group-hover:bg-white group-hover:text-black">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">{item.provider}</div>
          <h3 className="mt-2 text-xl font-black leading-tight text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.prompt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <Eye className="h-3.5 w-3.5" />
              {compactNumber(item.views)}
            </span>
            <button onClick={() => void likeItem()} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 transition hover:bg-pink-500/25">
              <Heart className="h-3.5 w-3.5" />
              {compactNumber(item.likes)}
            </button>
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function AmbientCinemaWall() {
  const panels = [
    "from-cyan-400/35 via-fuchsia-500/25 to-black",
    "from-amber-300/30 via-rose-500/20 to-black",
    "from-emerald-300/25 via-cyan-500/20 to-black",
    "from-violet-400/30 via-blue-500/20 to-black",
    "from-white/20 via-slate-500/20 to-black",
    "from-pink-400/25 via-orange-400/20 to-black",
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/40">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {panels.map((panel, index) => (
          <motion.div
            key={panel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.5 }}
            className={cn(
              "relative overflow-hidden rounded-2xl bg-gradient-to-br",
              panel,
              index % 3 === 0 ? "aspect-[4/5]" : "aspect-video",
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-40 animate-pulse" />
            <div className="absolute inset-x-3 bottom-3 h-10 rounded-full bg-black/25 blur-xl" />
          </motion.div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050812] via-transparent to-transparent" />
      <div className="absolute bottom-5 left-5 right-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
          Curated films are arriving
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [featured, setFeatured] = useState<ShowcaseItem[]>([]);
  const [trending, setTrending] = useState<ShowcaseItem[]>([]);
  const [activeFeed, setActiveFeed] = useState<"latest" | "featured" | "trending">("latest");
  const [query, setQuery] = useState("");

  const loadShowcase = useCallback(async () => {
    const [latestRes, featuredRes, trendingRes] = await Promise.all([
      fetch("/api/showcase", { cache: "no-store" }),
      fetch("/api/showcase/featured", { cache: "no-store" }),
      fetch("/api/showcase/trending", { cache: "no-store" }),
    ]);

    const latestJson = latestRes.ok ? ((await latestRes.json()) as FeedResponse) : { items: [] };
    const featuredJson = featuredRes.ok ? ((await featuredRes.json()) as FeedResponse) : { items: [] };
    const trendingJson = trendingRes.ok ? ((await trendingRes.json()) as FeedResponse) : { items: [] };

    setItems(latestJson.items ?? []);
    setFeatured(featuredJson.items ?? []);
    setTrending(trendingJson.items ?? []);
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const feedItems = useMemo(() => {
    const source = activeFeed === "featured" ? featured : activeFeed === "trending" ? trending : items;
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((item) => [item.title, item.prompt, item.model, item.provider, item.tags.join(" ")].some((value) => value.toLowerCase().includes(needle)));
  }, [activeFeed, featured, items, query, trending]);

  const hero = featured[0] ?? trending[0] ?? items[0] ?? null;
  const carouselItems = (trending.length ? trending : items).slice(0, 10);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      <section className="relative min-h-[72vh] overflow-hidden">
        {hero ? (
          <PreviewVideo item={hero} className="absolute inset-0 opacity-55" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_72%_12%,rgba(236,72,153,0.18),transparent_26%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#050812]/45 to-[#050812]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050812] to-transparent" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-24 md:px-8 lg:pb-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/85 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Explore
            </div>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Discover the next language of motion.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
              Watch cinematic AI worlds, product films, character studies, and visual experiments from Saad Studio creators.
            </p>
            {hero && (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02]">
                  <Play className="h-4 w-4 fill-current" />
                  Watch reel
                </button>
                <div className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-slate-200 backdrop-blur">
                  {hero.title} / {hero.model}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["latest", "New visions"],
              ["featured", "Featured"],
              ["trending", "Trending"],
            ] as const).map(([feed, label]) => (
              <button
                key={feed}
                onClick={() => setActiveFeed(feed)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  activeFeed === feed ? "border-white bg-white text-slate-950" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative w-full md:w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search moods, models, creators"
              className="w-full rounded-full border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none backdrop-blur transition focus:border-cyan-300/50"
            />
          </label>
        </div>
      </section>

      {carouselItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-10 md:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
            <Flame className="h-4 w-4 text-pink-300" />
            Trending reels
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {carouselItems.map((item) => (
              <div key={item.id} className="w-[280px] flex-none md:w-[360px]">
                <ReelCard item={item} size="wide" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        {feedItems.length > 0 ? (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {feedItems.map((item, index) => (
              <ReelCard key={item.id} item={item} size={index % 5 === 0 ? "tall" : "normal"} />
            ))}
          </div>
        ) : (
          <AmbientCinemaWall />
        )}
      </section>
    </main>
  );
}

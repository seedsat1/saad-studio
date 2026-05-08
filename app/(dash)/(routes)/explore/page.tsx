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

type CommunityFeedItem = {
  id: string;
  type: "video" | "image";
  title: string;
  model: string;
  creator: string;
  durationSec: number | null;
  mediaUrl: string;
  thumbnailUrl: string | null;
  prompt: string;
  status: string | null;
  createdAt: string;
};

type CommunityFeedResponse = {
  items: CommunityFeedItem[];
  nextCursor?: string | null;
};

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function PreviewVideo({
  videoUrl,
  posterUrl,
  title,
  className,
  onDuration,
}: {
  videoUrl: string;
  posterUrl?: string | null;
  title: string;
  className?: string;
  onDuration?: (seconds: number) => void;
}) {
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
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className={cn("absolute inset-0 h-full w-full object-cover transition duration-700", playing ? "scale-110 opacity-0" : "scale-100 opacity-100")}
        />
      ) : (
        <div className={cn("absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)] transition duration-700", playing ? "scale-110 opacity-0" : "scale-100 opacity-100")} />
      )}
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const duration = (event.currentTarget as HTMLVideoElement).duration;
          if (Number.isFinite(duration) && duration > 0) onDuration?.(duration);
        }}
        className={cn("absolute inset-0 h-full w-full object-cover transition duration-700", playing ? "scale-100 opacity-100" : "scale-110 opacity-0")}
      />
    </div>
  );
}

type MediaCardItem = {
  key: string;
  kind: "showcase" | "community";
  id: string;
  type: "video" | "image";
  title: string;
  model: string;
  creator: string;
  prompt: string;
  tags: string[];
  featured: boolean;
  views: number;
  likes: number;
  createdAt: string;
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

function toMediaCardItemFromShowcase(item: ShowcaseItem): MediaCardItem {
  return {
    key: `showcase:${item.id}`,
    kind: "showcase",
    id: item.id,
    type: "video",
    title: item.title,
    model: item.model,
    creator: item.provider,
    prompt: item.prompt,
    tags: item.tags ?? [],
    featured: Boolean(item.featured),
    views: Number(item.views ?? 0),
    likes: Number(item.likes ?? 0),
    createdAt: item.created_at,
    videoUrl: item.video_url,
    imageUrl: null,
    thumbnailUrl: item.thumbnail_url,
  };
}

function toMediaCardItemFromCommunity(item: CommunityFeedItem): MediaCardItem {
  return {
    key: `gen:${item.id}`,
    kind: "community",
    id: item.id,
    type: item.type,
    title: item.title,
    model: item.model,
    creator: item.creator,
    prompt: item.prompt,
    tags: [],
    featured: false,
    views: 0,
    likes: 0,
    createdAt: item.createdAt,
    videoUrl: item.type === "video" ? item.mediaUrl : null,
    imageUrl: item.type === "image" ? item.mediaUrl : null,
    thumbnailUrl: item.thumbnailUrl,
  };
}

function ReelCard({ item, size = "normal" }: { item: MediaCardItem; size?: "wide" | "tall" | "normal" }) {
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const likeItem = async () => {
    if (item.kind !== "showcase") return;
    await fetch(`/api/showcase/${item.id}`, { method: "PATCH" });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "group relative mb-5 break-inside-avoid overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 transition",
        size === "wide" && "lg:col-span-2",
      )}
    >
      <div className={cn("relative", size === "wide" ? "aspect-[16/9]" : size === "tall" ? "aspect-[3/4]" : "aspect-[4/5]")}>
        {item.type === "video" && item.videoUrl ? (
          <PreviewVideo
            videoUrl={item.videoUrl}
            posterUrl={item.thumbnailUrl}
            title={item.title}
            onDuration={setDurationSec}
          />
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
        )}
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
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">{item.creator}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {item.type === "video" ? formatDuration(durationSec) : "Image"}
            </div>
          </div>
          <h3 className="mt-2 text-xl font-black leading-tight text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.prompt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            {item.kind === "showcase" ? (
              <>
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
              </>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                Live
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ExplorePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [itemsCursor, setItemsCursor] = useState<string | null>(null);
  const [featured, setFeatured] = useState<ShowcaseItem[]>([]);
  const [featuredCursor, setFeaturedCursor] = useState<string | null>(null);
  const [trending, setTrending] = useState<ShowcaseItem[]>([]);
  const [trendingCursor, setTrendingCursor] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityFeedItem[]>([]);
  const [communityCursor, setCommunityCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFeed, setActiveFeed] = useState<"latest" | "featured" | "trending">("latest");
  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadInitial = useCallback(async () => {
    const [latestRes, featuredRes, trendingRes, communityRes] = await Promise.all([
      fetch("/api/showcase?take=30", { cache: "no-store" }),
      fetch("/api/showcase/featured?take=18", { cache: "no-store" }),
      fetch("/api/showcase/trending?take=30", { cache: "no-store" }),
      fetch("/api/explore/feed?take=30&type=video", { cache: "no-store" }),
    ]);

    const latestJson = latestRes.ok ? ((await latestRes.json()) as FeedResponse) : { items: [] };
    const featuredJson = featuredRes.ok ? ((await featuredRes.json()) as FeedResponse) : { items: [] };
    const trendingJson = trendingRes.ok ? ((await trendingRes.json()) as FeedResponse) : { items: [] };
    const communityJson = communityRes.ok ? ((await communityRes.json()) as CommunityFeedResponse) : { items: [] };

    setItems(latestJson.items ?? []);
    setItemsCursor(latestJson.nextCursor ?? null);
    setFeatured(featuredJson.items ?? []);
    setFeaturedCursor((featuredJson as any).nextCursor ?? null);
    setTrending(trendingJson.items ?? []);
    setTrendingCursor((trendingJson as any).nextCursor ?? null);
    setCommunity(communityJson.items ?? []);
    setCommunityCursor(communityJson.nextCursor ?? null);
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const havePrimaryMore =
      activeFeed === "latest"
        ? Boolean(itemsCursor)
        : activeFeed === "featured"
          ? Boolean(featuredCursor)
          : Boolean(trendingCursor);
    const haveCommunityMore = Boolean(communityCursor);
    if (!havePrimaryMore && !haveCommunityMore) return;

    setLoadingMore(true);
    try {
      const primaryCursor = activeFeed === "latest" ? itemsCursor : activeFeed === "featured" ? featuredCursor : trendingCursor;
      const primaryEndpoint =
        activeFeed === "latest"
          ? primaryCursor
            ? `/api/showcase?take=30&cursor=${encodeURIComponent(primaryCursor)}`
            : null
          : activeFeed === "featured"
            ? primaryCursor
              ? `/api/showcase/featured?take=18&cursor=${encodeURIComponent(primaryCursor)}`
              : null
            : primaryCursor
              ? `/api/showcase/trending?take=30&cursor=${encodeURIComponent(primaryCursor)}`
              : null;

      const primaryRes = primaryEndpoint ? fetch(primaryEndpoint, { cache: "no-store" }) : Promise.resolve(new Response(null, { status: 204 }));
      const communityRes = communityCursor
        ? fetch(`/api/explore/feed?take=30&type=video&cursor=${encodeURIComponent(communityCursor)}`, { cache: "no-store" })
        : Promise.resolve(new Response(null, { status: 204 }));

      const [primary, communityPage] = await Promise.all([primaryRes, communityRes]);

      if (primary.ok) {
        const json = (await primary.json().catch(() => null)) as FeedResponse | null;
        if (json && Array.isArray(json.items) && json.items.length > 0) {
          if (activeFeed === "latest") {
            setItems((prev) => [...prev, ...json.items]);
            setItemsCursor(json.nextCursor ?? null);
          } else if (activeFeed === "featured") {
            setFeatured((prev) => [...prev, ...json.items]);
            setFeaturedCursor((json as any).nextCursor ?? null);
          } else {
            setTrending((prev) => [...prev, ...json.items]);
            setTrendingCursor((json as any).nextCursor ?? null);
          }
        } else {
          if (activeFeed === "latest") setItemsCursor(null);
          if (activeFeed === "featured") setFeaturedCursor(null);
          if (activeFeed === "trending") setTrendingCursor(null);
        }
      }

      if (communityPage.ok) {
        const json = (await communityPage.json().catch(() => null)) as CommunityFeedResponse | null;
        if (json && Array.isArray(json.items) && json.items.length > 0) {
          setCommunity((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            const merged = [...prev];
            for (const item of json.items) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              merged.push(item);
            }
            return merged;
          });
          setCommunityCursor(json.nextCursor ?? null);
        } else {
          setCommunityCursor(null);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeFeed, communityCursor, featuredCursor, itemsCursor, loadingMore, trendingCursor]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void loadMore();
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const feedItems = useMemo(() => {
    const source = activeFeed === "featured" ? featured : activeFeed === "trending" ? trending : items;
    const combined = [...source.map(toMediaCardItemFromShowcase), ...community.map(toMediaCardItemFromCommunity)];
    const needle = query.trim().toLowerCase();
    if (!needle) return combined;
    return combined.filter((item) =>
      [item.title, item.prompt, item.model, item.creator, item.tags.join(" ")].some((value) => value.toLowerCase().includes(needle))
    );
  }, [activeFeed, community, featured, items, query, trending]);

  const hero = featured[0] ?? trending[0] ?? items[0] ?? null;
  const heroReelItems = (featured.length ? featured : trending.length ? trending : items).slice(0, 8);
  const carouselItems = (trending.length ? trending : items).slice(0, 10);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      <section className="relative min-h-[60vh] overflow-hidden">
        {hero ? (
          <PreviewVideo
            videoUrl={hero.video_url}
            posterUrl={hero.thumbnail_url}
            title={hero.title}
            className="absolute inset-0 opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_72%_12%,rgba(236,72,153,0.18),transparent_26%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#050812]/45 to-[#050812]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050812] to-transparent" />

        <div className="relative mx-auto flex min-h-[60vh] max-w-7xl flex-col justify-end px-5 pb-10 pt-20 md:px-8 lg:pb-12">
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
          {heroReelItems.length > 0 && (
            <div className="mt-10 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {heroReelItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="group relative h-[150px] w-[280px] flex-none overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03]"
                >
                  <PreviewVideo videoUrl={item.video_url} posterUrl={item.thumbnail_url} title={item.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                      <span className="truncate">{item.model}</span>
                      <span className="truncate">{item.provider}</span>
                    </div>
                    <div className="mt-2 text-base font-black leading-tight text-white line-clamp-1">{item.title}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
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
            {carouselItems.map((item) => {
              const mapped = toMediaCardItemFromShowcase(item);
              return (
                <div key={mapped.key} className="w-[280px] flex-none md:w-[360px]">
                  <ReelCard item={mapped} size="wide" />
                </div>
              );
            })}
            {community.slice(0, 6).map((item) => {
              const mapped = toMediaCardItemFromCommunity(item);
              return (
                <div key={mapped.key} className="w-[280px] flex-none md:w-[360px]">
                  <ReelCard item={mapped} size="wide" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        {feedItems.length > 0 ? (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {feedItems.map((item, index) => (
              <ReelCard key={item.key} item={item} size={index % 6 === 0 ? "tall" : "normal"} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">No media yet</div>
              <div className="mt-3 text-2xl font-black text-white">Generate something cinematic to start the feed.</div>
            </div>
          </div>
        )}
        <div ref={sentinelRef} className="h-px w-full" />
        <div className="mt-10 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/70">
            {loadingMore ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                Loading more
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                {communityCursor || itemsCursor || featuredCursor || trendingCursor ? "Scroll for more" : "End of feed"}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { SaadLoader } from "@/components/saad-loader";
import {
  ArrowUpRight,
  Eye,
  Heart,
  Play,
  Sparkles,
  Star,
  Zap,
  Wand2,
  Video,
  Layers,
  ChevronDown,
  Copy,
  Check,
  Search,
  Loader2,
  X,
  Camera,
  Film,
  Filter,
  Grid,
  TrendingUp,
  Flame,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";
import Footer from "@/components/Footer";

export interface ShowcaseItem {
  id: string;
  title: string;
  slug?: string;
  model: string;
  provider: string;
  video_url: string;
  thumbnail_url: string;
  prompt: string;
  tags?: string[];
  featured?: boolean;
  views: number;
  likes: number;
  created_at: string;
  aspect_ratio?: string;
}

interface FeedResponse {
  items: ShowcaseItem[];
  nextCursor?: string | null;
}

function PreviewVideo({
  videoUrl,
  posterUrl,
  title,
  shouldPlay,
}: {
  videoUrl: string;
  posterUrl: string;
  title: string;
  shouldPlay: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [shouldPlay]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={posterUrl}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={title}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
  );
}

export default function StudioCreationsPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [featured, setFeatured] = useState<ShowcaseItem[]>([]);
  const [trending, setTrending] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFeed, setActiveFeed] = useState<"latest" | "featured" | "trending">("latest");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image">("all");
  const [selectedModel, setSelectedModel] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoplayKey, setAutoplayKey] = useState<string | null>(null);
  const [activeMediaItem, setActiveMediaItem] = useState<ShowcaseItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Column calculations for masonry layout
  const [columnCount, setColumnCount] = useState(4);
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 640) setColumnCount(1);
      else if (w < 1024) setColumnCount(2);
      else if (w < 1440) setColumnCount(3);
      else setColumnCount(4);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const loadCreations = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, featuredRes, trendingRes] = await Promise.all([
        fetch("/api/showcase?take=50", { cache: "no-store" }),
        fetch("/api/showcase/featured?take=30", { cache: "no-store" }),
        fetch("/api/showcase/trending?take=50", { cache: "no-store" }),
      ]);

      const latestJson = latestRes.ok ? ((await latestRes.json()) as FeedResponse) : { items: [] };
      const featuredJson = featuredRes.ok ? ((await featuredRes.json()) as FeedResponse) : { items: [] };
      const trendingJson = trendingRes.ok ? ((await trendingRes.json()) as FeedResponse) : { items: [] };

      setItems(latestJson.items ?? []);
      setFeatured(featuredJson.items ?? []);
      setTrending(trendingJson.items ?? []);
    } catch (err) {
      console.error("Failed to load studio creations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreations();
  }, [loadCreations]);

  // Increment views
  useEffect(() => {
    if (activeMediaItem) {
      fetch(`/api/showcase/${activeMediaItem.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.item) {
            const updated = data.item;
            const updateList = (list: ShowcaseItem[]) =>
              list.map((u) => (u.id === updated.id ? { ...u, views: updated.views } : u));
            setItems(updateList);
            setFeatured(updateList);
            setTrending(updateList);
            setActiveMediaItem((curr) => (curr && curr.id === updated.id ? { ...curr, views: updated.views } : curr));
          }
        })
        .catch(() => {});
    }
  }, [activeMediaItem?.id]);

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Base list by active feed tab
  const baseList = useMemo(() => {
    if (activeFeed === "featured") return featured;
    if (activeFeed === "trending") return trending;
    return items;
  }, [activeFeed, items, featured, trending]);

  // Filter models
  const availableModels = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.model) set.add(item.model);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return baseList.filter((item) => {
      const isVideo = item.video_url && 
        !item.video_url.endsWith(".png") && 
        !item.video_url.endsWith(".jpg") && 
        !item.video_url.endsWith(".jpeg") && 
        !item.video_url.endsWith(".webp") &&
        !item.video_url.endsWith(".gif");

      if (mediaFilter === "video" && !isVideo) return false;
      if (mediaFilter === "image" && isVideo) return false;
      if (selectedModel !== "All" && item.model !== selectedModel) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesPrompt = item.prompt?.toLowerCase().includes(q);
        const matchesModel = item.model?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesPrompt && !matchesModel) return false;
      }

      return true;
    });
  }, [baseList, mediaFilter, selectedModel, searchQuery]);

  // Columns distribution
  const columnsData = useMemo(() => {
    const cols: ShowcaseItem[][] = Array.from({ length: columnCount }, () => []);
    filteredItems.forEach((item, index) => {
      cols[index % columnCount].push(item);
    });
    return cols;
  }, [filteredItems, columnCount]);

  return (
    <main className="min-h-screen bg-[#030508] text-white selection:bg-cyan-500/30">
      {/* ── Header Hero Section ── */}
      <section className="relative w-full pt-28 pb-12 px-4 md:px-8 border-b border-white/5 bg-gradient-to-b from-[#080d18] via-[#05070d] to-[#030508]">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3.5 py-1 text-xs font-bold text-cyan-300 mb-4">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{isAr ? "معرض أعمال الاستوديو الحي" : "Studio Creations Live Feed"}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                {isAr ? "أحدث إبداعات ونماذج الاستوديو" : "Studio Creations & AI Showcase"}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                {isAr
                  ? "تصفح أحدث وأبرز الأعمال المولدة بالذكاء الاصطناعي، انسخ البرومبتات بنقرة واحدة، واستكشف النماذج السينمائية الحديثة."
                  : "Explore latest cinematic videos, photo-realistic renders, and prompt blueprints generated across Saad Studio models."}
              </p>
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/image"
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:scale-105"
              >
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? "توليد صورة جديدة" : "Generate Image"}</span>
              </Link>
              <Link
                href="/video"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-black text-black shadow-lg shadow-cyan-500/20 transition hover:scale-105"
              >
                <Video className="w-4 h-4" />
                <span>{isAr ? "توليد فيديو سينمائي" : "Create AI Video"}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* ── Filters & Search Bar ── */}
          <div className="mt-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t border-white/5">
            {/* Feed Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5 self-start">
              {[
                { id: "latest", label: isAr ? "الأحدث" : "Latest", icon: Clock },
                { id: "featured", label: isAr ? "المميزة" : "Featured", icon: Star },
                { id: "trending", label: isAr ? "الشائعة" : "Trending", icon: Flame },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFeed(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition",
                    activeFeed === tab.id
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Media Type & Search */}
            <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
              {/* Media Type Pill */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                  { id: "all", label: isAr ? "الكل" : "All" },
                  { id: "video", label: isAr ? "فيديو" : "Videos" },
                  { id: "image", label: isAr ? "صور" : "Images" },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setMediaFilter(type.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                      mediaFilter === type.id ? "bg-white/10 text-white font-black" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث في الأعمال والبرومبتات..." : "Search creations or prompt..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Model Filter Pills */}
          {availableModels.length > 2 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {availableModels.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setSelectedModel(model)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition border",
                    selectedModel === model
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                  )}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Main Masonry Grid ── */}
      <section className="w-full px-4 md:px-8 py-10 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="w-full py-24 flex flex-col items-center justify-center">
            <SaadLoader toolLabel={isAr ? "جاري تحميل إبداعات الاستوديو..." : "Loading studio creations..."} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="w-full py-24 text-center border border-white/5 rounded-3xl bg-white/[0.01]">
            <p className="text-zinc-400 font-medium">
              {isAr ? "لم يتم العثور على أعمال مطابقة." : "No creations found matching your filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {columnsData.map((columnItems, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-6">
                {columnItems.map((item) => {
                  const isVideo = item.video_url && 
                    !item.video_url.endsWith(".png") && 
                    !item.video_url.endsWith(".jpg") && 
                    !item.video_url.endsWith(".jpeg") && 
                    !item.video_url.endsWith(".webp") &&
                    !item.video_url.endsWith(".gif");

                  const aspectMap: Record<string, string> = {
                    "16:9": "aspect-[16/9]",
                    "9:16": "aspect-[9/16]",
                    "1:1": "aspect-[1/1]",
                    "4:3": "aspect-[4/3]",
                    "3:4": "aspect-[3/4]",
                  };
                  const aspectClass = aspectMap[item.aspect_ratio || "16:9"] || "aspect-[16/9]";

                  return (
                    <motion.article
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#080b11] shadow-2xl hover:border-cyan-400/40 transition-all duration-300 flex flex-col"
                    >
                      {/* Media Area */}
                      <div className={cn("relative w-full overflow-hidden bg-slate-950", aspectClass)}>
                        {isVideo ? (
                          <PreviewVideo
                            videoUrl={item.video_url}
                            posterUrl={item.thumbnail_url}
                            title={item.title}
                            shouldPlay={autoplayKey === `creations:${item.id}`}
                          />
                        ) : (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#02050e] via-transparent to-transparent opacity-90" />
                        
                        {/* Hover trigger */}
                        <div 
                          className="absolute inset-0 z-10 cursor-pointer"
                          onMouseEnter={() => setAutoplayKey(`creations:${item.id}`)}
                          onMouseLeave={() => setAutoplayKey(null)}
                          onClick={() => setActiveMediaItem(item)}
                        />

                        {/* Top Badges */}
                        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5 pointer-events-none">
                          <span className="bg-black/70 border border-white/10 text-[9px] font-black text-cyan-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md">
                            {item.model}
                          </span>
                        </div>

                        {isVideo && (
                          <div className="absolute right-3 top-3 z-20 w-8 h-8 rounded-full border border-white/20 bg-black/50 backdrop-blur flex items-center justify-center text-white pointer-events-none">
                            <Video className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-[#080b11]">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold tracking-wider">
                            <span>{item.provider}</span>
                            <span>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                          <h3 className="mt-1 text-base font-extrabold text-white leading-tight group-hover:text-cyan-400 transition-colors">
                            {item.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-xs text-zinc-400 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 font-mono select-all">
                            {item.prompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-bold">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {item.views}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                              {item.likes}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(item.id, item.prompt)}
                            className="flex items-center gap-1.5 text-xs font-black text-cyan-400 hover:text-cyan-300 transition"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">{isAr ? "تم النسخ!" : "Copied!"}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{isAr ? "نسخ البرومبت" : "Copy Prompt"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Fullscreen Lightbox Modal ── */}
        <AnimatePresence>
          {activeMediaItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
              onClick={() => setActiveMediaItem(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative max-w-5xl w-full bg-[#080b11] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: Media View */}
                <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-0">
                  {activeMediaItem.video_url && 
                    !activeMediaItem.video_url.endsWith(".png") && 
                    !activeMediaItem.video_url.endsWith(".jpg") && 
                    !activeMediaItem.video_url.endsWith(".jpeg") && 
                    !activeMediaItem.video_url.endsWith(".webp") &&
                    !activeMediaItem.video_url.endsWith(".gif") ? (
                    <video
                      src={activeMediaItem.video_url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain max-h-[70vh] md:max-h-[80vh]"
                    />
                  ) : (
                    <img
                      src={activeMediaItem.thumbnail_url}
                      alt={activeMediaItem.title}
                      className="w-full h-full object-contain max-h-[70vh] md:max-h-[80vh]"
                    />
                  )}
                </div>

                {/* Right: Info Panel */}
                <div className="w-full md:w-[380px] p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-wider">
                      <span>{activeMediaItem.provider}</span>
                      <span>{new Date(activeMediaItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-extrabold text-white leading-tight">
                      {activeMediaItem.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="bg-cyan-500/15 border border-cyan-500/30 text-[9px] font-black text-cyan-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                        {activeMediaItem.model}
                      </span>
                    </div>

                    <div className="mt-5 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Prompt</label>
                      <p className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 font-mono leading-relaxed select-all">
                        {activeMediaItem.prompt}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(activeMediaItem.id, activeMediaItem.prompt)}
                      className="flex items-center gap-1.5 text-xs font-black text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {copiedId === activeMediaItem.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">{isAr ? "تم النسخ!" : "Prompt Copied!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>{isAr ? "نسخ البرومبت" : "Copy Prompt"}</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveMediaItem(null)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition"
                    >
                      {isAr ? "إغلاق" : "Close"}
                    </button>
                  </div>
                </div>

                {/* Modal close X */}
                <button
                  type="button"
                  onClick={() => setActiveMediaItem(null)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white border border-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Footer />
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  ImageIcon,
  VideoIcon,
  Music,
  Box,
  GalleryHorizontalEnd,
  Settings,
  Zap,
  Sparkles,
  ChevronRight,
  Clock,
  RefreshCw,
  AlertTriangle,
  Crown,
  Layers,
  Wand2,
  ScanFace,
  Sun,
  AudioLines,
  ArrowRight,
  FolderOpen,
  Film,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsApiResponse {
  profile: {
    name: string;
    email: string;
    phone: string | null;
  };
  subscription: {
    plan: string;
    planId?: string | null;
    active?: boolean;
    billingInterval?: string | null;
    nextBillingAt: string | null;
  };
  credits: number;
}

interface GalleryAsset {
  id: string;
  type: "image" | "video" | "audio" | "3d" | "text";
  url?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  textContent?: string;
  prompt?: string;
  model?: string;
  date?: string;
  createdAt?: string;
  status?: string;
}

interface AssetCounts {
  all: number;
  image: number;
  video: number;
  audio: number;
  "3d": number;
  text: number;
}

interface AssetsApiResponse {
  assets: GalleryAsset[];
  total: number;
  counts: AssetCounts;
}

// ─── Primary Studio Cards ─────────────────────────────────────────────────────

const PRIMARY_STUDIOS = [
  {
    title: "Video Studio",
    subtitle: "Veo 3.1, Sora 2, Kling 3.0, Seedance",
    icon: VideoIcon,
    href: "/video",
    gradient: "from-blue-600/20 via-indigo-600/15 to-transparent",
    border: "border-blue-500/30 hover:border-blue-400/60",
    glow: "hover:shadow-blue-500/10",
    iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    tag: "Flagship",
  },
  {
    title: "Image Studio",
    subtitle: "Flux Pro, Ideogram, Seedream, Recraft",
    icon: ImageIcon,
    href: "/image",
    gradient: "from-violet-600/20 via-purple-600/15 to-transparent",
    border: "border-violet-500/30 hover:border-violet-400/60",
    glow: "hover:shadow-violet-500/10",
    iconBg: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    tag: "Popular",
  },
  {
    title: "Audio & Music Studio",
    subtitle: "AI Voice, TTS & Music Generation",
    icon: Music,
    href: "/audio",
    gradient: "from-emerald-600/20 via-teal-600/15 to-transparent",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "hover:shadow-emerald-500/10",
    iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    tag: "Studio",
  },
  {
    title: "App Catalog",
    subtitle: "Explore 40+ specialized creative tools",
    icon: Layers,
    href: "/apps",
    gradient: "from-amber-600/20 via-orange-600/15 to-transparent",
    border: "border-amber-500/30 hover:border-amber-400/60",
    glow: "hover:shadow-amber-500/10",
    iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    tag: "40+ Tools",
  },
];

// ─── Curated Secondary Tools ──────────────────────────────────────────────────

const CURATED_TOOLS = [
  {
    title: "3D Mesh Studio",
    category: "3D Modeling",
    icon: Box,
    href: "/3d",
    color: "text-amber-400",
  },
  {
    title: "ClipCraft Studio",
    category: "Short-Form Video",
    icon: Film,
    href: "/clipcraft-studio",
    color: "text-sky-400",
  },
  {
    title: "Studio Relighting",
    category: "Image Enhancer",
    icon: Sun,
    href: "/apps/tool/relight",
    color: "text-yellow-400",
  },
  {
    title: "Face Swap Studio",
    category: "Identity Swap",
    icon: ScanFace,
    href: "/apps/tool/face-swap",
    color: "text-purple-400",
  },
  {
    title: "Lip Synchronization",
    category: "Audio / Video",
    icon: AudioLines,
    href: "/lipsync",
    color: "text-pink-400",
  },
  {
    title: "Prompt Extractor",
    category: "Prompt Reverse",
    icon: Wand2,
    href: "/prompt-extractor",
    color: "text-emerald-400",
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ─── Dashboard Component ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();

  const [settings, setSettings] = useState<SettingsApiResponse | null>(null);
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [counts, setCounts] = useState<AssetCounts>({
    all: 0,
    image: 0,
    video: 0,
    audio: 0,
    "3d": 0,
    text: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, assetsRes] = await Promise.all([
        fetch("/api/profile/settings", { cache: "no-store" }),
        fetch("/api/assets?type=all&limit=6", { cache: "no-store" }),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (assetsRes.ok) {
        const assetsData: AssetsApiResponse = await assetsRes.json();
        if (Array.isArray(assetsData?.assets)) {
          setAssets(assetsData.assets);
        }
        if (assetsData?.counts) {
          setCounts(assetsData.counts);
        }
      }
    } catch (err: any) {
      console.error("[Dashboard] Fetch error:", err);
      setError(err?.message || "Failed to load dashboard workspace data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      void fetchDashboardData();
    } else if (userLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [userLoaded, isSignedIn, fetchDashboardData]);

  // Listen to live credit balance updates from generation events
  useEffect(() => {
    const handleCreditsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ balance?: number }>;
      if (typeof customEvent.detail?.balance === "number") {
        setSettings((prev) =>
          prev ? { ...prev, credits: customEvent.detail.balance! } : null
        );
      }
    };

    window.addEventListener("saad-credits-updated", handleCreditsUpdate);
    return () => {
      window.removeEventListener("saad-credits-updated", handleCreditsUpdate);
    };
  }, []);

  // Compute subscriber display details
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Creator";

  const userPlan = settings?.subscription?.plan || "Free";
  const creditBalance = settings?.credits ?? 0;
  const processingCount = assets.filter(
    (a) => a.status === "processing" || a.status === "pending" || a.status === "queued"
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-6 md:p-10">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-16 left-1/4 h-96 w-96 rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="absolute top-48 right-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* ========================================================================= */}
        {/* LEVEL 1: SUBSCRIBER IDENTITY & OPERATIONAL METRIC STRIP                   */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-zinc-400">
              Saad Studio Creative Workspace • Multi-Modal Generation & Asset Vault
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Real Credit Balance Widget */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">
                  Available Credits
                </span>
                <div className="text-lg font-bold text-amber-300 font-mono leading-none mt-0.5">
                  {loading ? (
                    <span className="text-zinc-500 text-sm">Loading...</span>
                  ) : (
                    creditBalance.toLocaleString()
                  )}
                </div>
              </div>
            </div>

            {/* Plan Badge & Upgrade CTA */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
              <Crown className="w-4 h-4 text-violet-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 leading-none">Plan</span>
                <span className="font-semibold text-white leading-tight">
                  {loading ? "—" : `${userPlan} Plan`}
                </span>
              </div>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Get Credits</span>
            </Link>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              title="Refresh Workspace Data"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEVEL 2: PRIMARY CREATION ACTIONS                                         */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Primary Generation Studios
            </h2>
            <span className="text-[11px] text-zinc-400">Direct Workspace Entry</span>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {PRIMARY_STUDIOS.map((studio) => (
              <motion.div key={studio.title} variants={slideUp}>
                <Link href={studio.href} className="block group h-full">
                  <div
                    className={cn(
                      "relative h-full flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/70 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
                      studio.gradient,
                      studio.border,
                      studio.glow
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("p-3 rounded-xl border", studio.iconBg)}>
                          <studio.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                          {studio.tag}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition-colors">
                        {studio.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {studio.subtitle}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">
                      <span>Launch Studio</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ========================================================================= */}
        {/* LEVEL 3: OPERATIONAL CREATIVE FLOW & RECENT GENERATIONS                    */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* Creative Pipeline Infographic (Real Subscriber State) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Creative Generation Pipeline
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-400">
                  Active In-Flight:{" "}
                  <strong className="text-cyan-300 font-mono">
                    {loading ? "—" : processingCount}
                  </strong>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">
                  Vault Assets:{" "}
                  <strong className="text-emerald-300 font-mono">
                    {loading ? "—" : counts.all}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold block">1. INGRESS</span>
                <strong className="text-zinc-200 block text-xs">Prompt & Media</strong>
                <p className="text-[10px] text-zinc-400">Text, images, or audio</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-indigo-400 font-bold block">2. MODEL</span>
                <strong className="text-indigo-300 block text-xs">Model Fleet</strong>
                <p className="text-[10px] text-zinc-400">Image, Video, Audio, 3D</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-violet-400 font-bold block">3. DISPATCH</span>
                <strong className="text-violet-300 block text-xs">Atomic Ledger</strong>
                <p className="text-[10px] text-zinc-400">Idempotency & pricing check</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-cyan-800/60 bg-cyan-950/10 space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold block">4. PROCESSING</span>
                <strong className="text-cyan-200 block text-xs">
                  {processingCount > 0 ? `${processingCount} In-Flight` : "Queue Ready"}
                </strong>
                <p className="text-[10px] text-zinc-400">Real-time status polling</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-800/60 bg-emerald-950/10 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block">5. VAULT</span>
                <strong className="text-emerald-200 block text-xs">
                  {counts.all} Total Assets
                </strong>
                <p className="text-[10px] text-zinc-400">Persisted in /gallery</p>
              </div>
            </div>
          </div>

          {/* Recent Generations Strip */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GalleryHorizontalEnd className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Recent Generations (Creative Vault)
                </h3>
              </div>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                <span>View Complete Vault ({counts.all})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
                  />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 text-zinc-400 mx-auto flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-semibold text-zinc-200">No Generations Yet</h4>
                  <p className="text-xs text-zinc-400">
                    Your creative vault is empty. Generate your first video, image, or audio track to see it here.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href="/video"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    Generate Video
                  </Link>
                  <Link
                    href="/image"
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                  >
                    Generate Image
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {assets.map((asset) => {
                  const mediaSrc = asset.thumbnailUrl || asset.url || asset.originalUrl;
                  const isVideo = asset.type === "video";
                  const isAudio = asset.type === "audio";

                  return (
                    <Link
                      key={asset.id}
                      href="/gallery"
                      className="group relative rounded-xl overflow-hidden border border-zinc-800/90 bg-zinc-900 hover:border-zinc-700 transition-all duration-200 block"
                    >
                      <div className="aspect-square w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                        {mediaSrc && !isAudio ? (
                          <Image
                            src={mediaSrc}
                            alt={asset.prompt || "Generated asset"}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : isAudio ? (
                          <div className="p-4 text-center space-y-1">
                            <Music className="w-6 h-6 text-emerald-400 mx-auto" />
                            <span className="text-[10px] text-zinc-400 block truncate">Audio</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-600 font-mono">No Preview</div>
                        )}

                        {/* Type badge overlay */}
                        <div className="absolute top-2 left-2">
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md",
                              isVideo
                                ? "bg-blue-500/30 text-blue-200 border border-blue-400/30"
                                : isAudio
                                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                                : "bg-violet-500/30 text-violet-200 border border-violet-400/30"
                            )}
                          >
                            {asset.type}
                          </span>
                        </div>
                      </div>

                      {/* Prompt & Date Footer */}
                      <div className="p-2.5 bg-zinc-900/95 border-t border-zinc-800/60 space-y-0.5">
                        <p className="text-[11px] font-medium text-zinc-200 truncate" title={asset.prompt}>
                          {asset.prompt || "Untitled Asset"}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>{asset.model ? asset.model.split("/").pop() : "AI"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {asset.date ? asset.date.split(" ")[0] : "Recent"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LEVEL 4 & 5: CURATED TOOL DISCOVERY & ACCOUNT OVERVIEW                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 pb-8">
          {/* LEVEL 4: Curated Tool Discovery (8 Cols) */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  Curated Studio Tools
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Specialized workflow tools for editing, relighting, and 3D generation.
                </p>
              </div>
              <Link
                href="/apps"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                <span>All Apps</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CURATED_TOOLS.map((tool) => (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700">
                    <tool.icon className={cn("w-4 h-4", tool.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-xs text-zinc-200 group-hover:text-white block truncate">
                      {tool.title}
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">{tool.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* LEVEL 5: Subscription & Account Card (4 Cols) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Subscription & Account
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {userPlan}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Current Plan</span>
                  <span className="font-semibold text-white">{userPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Active Balance</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {creditBalance.toLocaleString()} cr
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Billing Cycle</span>
                  <span className="text-zinc-200">
                    {settings?.subscription?.billingInterval || "Standard"}
                  </span>
                </div>
                {settings?.subscription?.nextBillingAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Renewal Date</span>
                    <span className="text-zinc-200 font-mono text-[11px]">
                      {new Date(settings.subscription.nextBillingAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex gap-2">
              <Link
                href="/settings"
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold text-center transition-colors"
              >
                Manage Settings
              </Link>
              <Link
                href="/pricing"
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold text-center transition-colors"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

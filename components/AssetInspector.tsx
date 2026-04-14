"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  Download,
  Play,
  Pause,
  Volume2,
  ZoomIn,
  RotateCcw,
  Box,
  ImageIcon,
  VideoIcon,
  Music,
  Mic2,
  Scissors,
  RefreshCcw,
  Film,
  Clapperboard,
  Aperture,
  Copy,
  Share2,
  Zap,
  Info,
  Layers,
  ChevronDown,
  Cpu,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetType = "image" | "video" | "audio" | "3d";

export interface Asset {
  id?: string;
  type: AssetType;
  url?: string;
  title?: string;
  prompt?: string;
  model?: string;
  resolution?: string;
  duration?: string;
  date?: string;
}

// ── Per-type design tokens ─────────────────────────────────────────────────────

const TYPE_CONFIG = {
  image: {
    label: "Image",
    Icon: ImageIcon,
    gradientFrom: "from-pink-600",
    gradientTo: "to-fuchsia-600",
    glowCss: "0 0 24px rgba(236,72,153,0.45), 0 4px 24px rgba(0,0,0,0.5)",
    textColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    badgeBg: "bg-pink-500/15 text-pink-300 ring-pink-500/30",
    shimmerColor: "from-pink-500/0 via-pink-300/20 to-pink-500/0",
    studioLabel: "Image Studio",
  },
  video: {
    label: "Video",
    Icon: VideoIcon,
    gradientFrom: "from-orange-600",
    gradientTo: "to-amber-500",
    glowCss: "0 0 24px rgba(249,115,22,0.45), 0 4px 24px rgba(0,0,0,0.5)",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    badgeBg: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    shimmerColor: "from-orange-500/0 via-orange-300/20 to-orange-500/0",
    studioLabel: "Video Studio",
  },
  audio: {
    label: "Audio",
    Icon: Music,
    gradientFrom: "from-emerald-600",
    gradientTo: "to-cyan-500",
    glowCss: "0 0 24px rgba(52,211,153,0.45), 0 4px 24px rgba(0,0,0,0.5)",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    shimmerColor: "from-emerald-500/0 via-emerald-300/20 to-emerald-500/0",
    studioLabel: "Audio Studio",
  },
  "3d": {
    label: "3D Model",
    Icon: Box,
    gradientFrom: "from-violet-600",
    gradientTo: "to-indigo-600",
    glowCss: "0 0 24px rgba(139,92,246,0.45), 0 4px 24px rgba(0,0,0,0.5)",
    textColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    badgeBg: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    shimmerColor: "from-violet-500/0 via-violet-300/20 to-violet-500/0",
    studioLabel: "3D Studio",
  },
};

// ── Action definitions per asset type ─────────────────────────────────────────

type ActionDef = {
  label: string;
  description: string;
  Icon: React.ElementType;
  isPrimary?: boolean;
};

const ASSET_ACTIONS: Record<AssetType, ActionDef[]> = {
  image: [
    {
      label: "Animate → Video",
      description: "Send to Video Studio",
      Icon: VideoIcon,
      isPrimary: true,
    },
    {
      label: "Upscale 4K",
      description: "AI 4× resolution boost",
      Icon: Aperture,
    },
    {
      label: "Remove Background",
      description: "Clean transparent BG",
      Icon: Scissors,
    },
    {
      label: "Download",
      description: "Export full resolution",
      Icon: Download,
    },
  ],
  video: [
    {
      label: "Lipsync / Dubbing",
      description: "Sync audio to face",
      Icon: Mic2,
      isPrimary: true,
    },
    {
      label: "Extend Video",
      description: "Continue the scene",
      Icon: Film,
    },
    {
      label: "Add Voiceover",
      description: "AI narration layer",
      Icon: Volume2,
    },
    {
      label: "Download",
      description: "Export MP4 / WebM",
      Icon: Download,
    },
  ],
  audio: [
    {
      label: "Use for Lipsync",
      description: "Drive facial animation",
      Icon: Clapperboard,
      isPrimary: true,
    },
    {
      label: "Add to Video",
      description: "Mix with video track",
      Icon: VideoIcon,
    },
    {
      label: "Download",
      description: "Export WAV / MP3",
      Icon: Download,
    },
  ],
  "3d": [
    {
      label: "Export .GLB / .OBJ",
      description: "Export 3D formats",
      Icon: Box,
      isPrimary: true,
    },
    {
      label: "Retopologize Mesh",
      description: "Optimize polygon count",
      Icon: RefreshCcw,
    },
    {
      label: "Download",
      description: "Export full model",
      Icon: Download,
    },
  ],
};

// ── Waveform bar heights (static — no hydration mismatch) ─────────────────────

const WAVEFORM = [
  0.35, 0.65, 0.48, 0.90, 0.55, 0.28, 0.78, 0.52, 0.70, 0.38,
  0.62, 0.85, 0.45, 0.72, 0.30, 0.80, 0.58, 0.42, 0.92, 0.50,
  0.68, 0.32, 0.82, 0.48, 0.60, 0.40, 0.88, 0.65, 0.28, 0.58,
  0.50, 0.76, 0.38, 0.70, 0.55, 0.88, 0.30, 0.48, 0.75, 0.38,
  0.62, 0.72, 0.46, 0.28, 0.90, 0.42, 0.80, 0.55, 0.48, 0.68,
];

// ── Canvas components ──────────────────────────────────────────────────────────

function ImageCanvas({ asset }: { asset: Asset }) {
  return (
    <div className="relative h-full w-full bg-[#080810] flex items-center justify-center overflow-hidden">
      {/* Checkerboard bg */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #141428 25%, transparent 25%),
            linear-gradient(-45deg, #141428 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #141428 75%),
            linear-gradient(-45deg, transparent 75%, #141428 75%)
          `,
          backgroundSize: "14px 14px",
          backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
        }}
      />

      {asset.url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={asset.url}
          alt={asset.title ?? "Generated Image"}
          className="relative z-10 max-h-full max-w-full object-contain rounded shadow-2xl"
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-pink-600/20 to-fuchsia-600/20 border border-pink-500/25 flex items-center justify-center shadow-2xl shadow-pink-500/10">
            <ImageIcon className="h-16 w-16 text-pink-400/40" />
          </div>
          <p className="text-zinc-600 text-sm">No preview available</p>
        </div>
      )}
    </div>
  );
}

function VideoCanvas({ asset }: { asset: Asset }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(18);

  return (
    <div
      className="relative h-full w-full bg-black flex items-center justify-center"
      onMouseEnter={() => {}}
    >
      {asset.url ? (
        <video src={asset.url} className="h-full w-full object-contain" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-72 aspect-video rounded-xl bg-gradient-to-br from-orange-600/15 to-amber-600/15 border border-orange-500/20 flex items-center justify-center shadow-2xl">
              <VideoIcon className="h-14 w-14 text-orange-400/40" />
            </div>
          </div>
        </div>
      )}

      {/* Cinematic controls overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-5">
        {/* Center play button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setPlaying(!playing)}
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-orange-500/30 transition-colors"
          >
            {playing ? (
              <Pause className="h-7 w-7 text-white fill-white" />
            ) : (
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            )}
          </motion.button>
        </div>

        {/* Progress + controls */}
        <div className="space-y-2">
          <div
            className="h-[3px] w-full bg-white/15 rounded-full cursor-pointer overflow-hidden"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setProgress(Math.round(((e.clientX - r.left) / r.width) * 100));
            }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                className="text-white hover:text-orange-400 transition-colors"
              >
                {playing ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>
              <Volume2 className="h-4 w-4 text-white/50" />
              <span className="text-xs text-white/50 font-mono">
                0:18 / {asset.duration ?? "1:42"}
              </span>
            </div>
            <ZoomIn className="h-4 w-4 text-white/50 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioCanvas({ asset }: { asset: Asset }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(32);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-10 gap-8 bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950/20">
      {/* Rotating disc */}
      <motion.div
        animate={{ rotate: playing ? 360 : 0 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-600/25 to-cyan-600/25 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/15 ring-1 ring-white/5"
      >
        <Music className="h-14 w-14 text-emerald-400/70" />
      </motion.div>

      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-base tracking-tight">
          {asset.title ?? "Untitled Track"}
        </p>
        <p className="text-zinc-500 text-xs">
          {asset.model ?? "Suno V4.5"} &middot; {asset.duration ?? "3:42"}
        </p>
      </div>

      {/* Waveform */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-center gap-[2px] h-16">
          {WAVEFORM.map((h, i) => {
            const isPast = i / WAVEFORM.length < progress / 100;
            return (
              <motion.div
                key={i}
                className={cn(
                  "w-[3px] rounded-full",
                  isPast ? "bg-emerald-400" : "bg-slate-600"
                )}
                animate={
                  playing
                    ? {
                        height: [`${h * 100}%`, `${h * 28}%`, `${h * 100}%`],
                      }
                    : { height: `${h * 55}%` }
                }
                style={{ height: `${h * 55}%` }}
                transition={{
                  duration: 1.1 + h * 0.9,
                  repeat: playing ? Infinity : 0,
                  delay: i * 0.025,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="h-[3px] w-full bg-slate-700 rounded-full cursor-pointer overflow-hidden"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setProgress(Math.round(((e.clientX - r.left) / r.width) * 100));
          }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
          <span>1:12</span>
          <span>{asset.duration ?? "3:42"}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button className="text-zinc-500 hover:text-white transition-colors">
          <RotateCcw className="h-4 w-4" />
        </button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setPlaying(!playing)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-xl shadow-emerald-500/30"
        >
          {playing ? (
            <Pause className="h-6 w-6 text-white fill-white" />
          ) : (
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          )}
        </motion.button>
        <button className="text-zinc-500 hover:text-white transition-colors">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ThreeDCanvas({ asset: _ }: { asset: Asset }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.10) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.12)_0%,_transparent_65%)]" />

      {/* Rotating wireframe box */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotateY: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          style={{ perspective: 800 }}
        >
          <div className="relative w-44 h-44 border border-violet-400/35 bg-violet-500/5 backdrop-blur-sm rounded-sm flex items-center justify-center shadow-2xl shadow-violet-500/10">
            <Box className="h-14 w-14 text-violet-400/60" />
            {/* Corner markers */}
            {[
              "-top-1.5 -left-1.5",
              "-top-1.5 -right-1.5",
              "-bottom-1.5 -left-1.5",
              "-bottom-1.5 -right-1.5",
            ].map((pos, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-3 h-3 border-2 border-violet-400 bg-slate-950",
                  pos
                )}
              />
            ))}
            {/* Edge glow lines */}
            <div className="absolute inset-0 rounded-sm ring-1 ring-violet-500/20" />
          </div>
        </motion.div>
      </div>

      {/* Mesh stats overlay */}
      <div className="absolute top-4 left-4 space-y-1.5">
        {[
          { label: "Vertices", value: "12,847" },
          { label: "Faces", value: "24,519" },
          { label: "Format", value: "GLB" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[11px] ring-1 ring-white/8"
          >
            <span className="text-zinc-500">{label}:</span>
            <span className="text-violet-300 font-mono font-semibold">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Viewport controls */}
      <div className="absolute bottom-4 left-4 flex gap-1.5">
        {[
          { icon: RotateCcw, label: "Orbit" },
          { icon: ZoomIn, label: "Zoom" },
          { icon: Layers, label: "Layers" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white ring-1 ring-white/10 hover:ring-violet-500/40 transition-all"
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inspector Section (collapsible) ───────────────────────────────────────────

function InspectorSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-600 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Primary glowing action button ────────────────────────────────────────────

function PrimaryActionButton({
  action,
  assetType,
  loading,
  onClick,
}: {
  action: ActionDef;
  assetType: AssetType;
  loading?: boolean;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[assetType];
  return (
    <motion.button
      whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!loading ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "relative w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 overflow-hidden",
        "bg-gradient-to-r text-white font-semibold text-sm",
        loading ? "opacity-75 cursor-not-allowed" : "",
        cfg.gradientFrom,
        cfg.gradientTo
      )}
      style={{ boxShadow: cfg.glowCss }}
    >
      {/* Shimmer sweep */}
      {!loading && (
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-r",
            cfg.shimmerColor
          )}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          style={{ skewX: "-20deg" }}
        />
      )}
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="relative z-10 h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        <Zap className="h-4 w-4 relative z-10 fill-white/40" />
      )}
      <span className="relative z-10">{loading ? "Processing..." : action.label}</span>
      {!loading && (
        <span className="relative z-10 text-[10px] font-normal opacity-70">
          {action.description}
        </span>
      )}
    </motion.button>
  );
}

// ── Secondary action button ────────────────────────────────────────────────────

function SecondaryActionButton({
  action,
  loading,
  onClick,
}: {
  action: ActionDef;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={!loading ? { scale: 1.02, backgroundColor: "rgba(255,255,255,0.07)" } : {}}
      whileTap={!loading ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/10 hover:ring-white/20 transition-all text-left w-full",
        loading ? "opacity-60 cursor-not-allowed" : ""
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-zinc-300"
          />
        ) : (
          <action.Icon className="h-3.5 w-3.5 text-zinc-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-200 truncate">
          {loading ? "Processing..." : action.label}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{action.description}</p>
      </div>
    </motion.button>
  );
}

// ── Main AssetInspector ────────────────────────────────────────────────────────

interface AssetInspectorProps {
  asset: Asset;
  onClose?: () => void;
}

export function AssetInspector({ asset, onClose }: AssetInspectorProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[asset.type];
  const TypeIcon = cfg.Icon;
  const actions = ASSET_ACTIONS[asset.type];
  const primary = actions.find((a) => a.isPrimary)!;
  const secondary = actions.filter((a) => !a.isPrimary);
  const [copied, setCopied] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ message: string; ok: boolean } | null>(null);

  const fullPrompt =
    asset.prompt?.trim() ||
    "A cinematic ultra-detailed shot, volumetric lighting, photorealistic render, 8K resolution, dramatic shadows.";
  const promptPreviewLimit = 180;
  const isPromptLong = fullPrompt.length > promptPreviewLimit;
  const promptPreview = isPromptLong
    ? `${fullPrompt.slice(0, promptPreviewLimit).trimEnd()}...`
    : fullPrompt;

  // The effective URL used for operations (may be replaced by processed result)
  const effectiveUrl = processedUrl ?? asset.url;

  const handleCopyPrompt = () => {
    if (asset.prompt) {
      navigator.clipboard.writeText(asset.prompt).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsset = useCallback(async (url: string, ext: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${asset.title?.slice(0, 40) ?? "asset"}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }, [asset.title]);

  const handleAction = useCallback(async (label: string) => {
    setActionStatus(null);
    const url = effectiveUrl;

    switch (label) {
      // ── IMAGE ─────────────────────────────────────────────────────────────
      case "Animate → Video":
        if (url) {
          router.push(
            `/video/create-video?imageUrl=${encodeURIComponent(url)}&prompt=${encodeURIComponent(asset.prompt ?? "")}`
          );
          onClose?.();
        }
        break;

      case "Upscale 4K":
        if (!url) return;
        setActiveAction(label);
        try {
          const res = await fetch("/api/generate/upscale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ imageUrl: url }),
          });
          const raw = await res.text();
          let data: { imageUrl?: string; error?: string } = {};
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            data = { error: raw || `Request failed (${res.status})` };
          }
          if (data.imageUrl) {
            setProcessedUrl(data.imageUrl);
            setActionStatus({ message: "Image upscaled to 4K!", ok: true });
          } else {
            setActionStatus({ message: data.error ?? "Upscale failed.", ok: false });
          }
        } catch {
          setActionStatus({ message: "Network error. Try again.", ok: false });
        }
        setActiveAction(null);
        break;

      case "Remove Background":
        if (!url) return;
        setActiveAction(label);
        try {
          const res = await fetch("/api/generate/remove-bg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ imageUrl: url }),
          });
          const raw = await res.text();
          let data: { imageUrl?: string; error?: string } = {};
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            data = { error: raw || `Request failed (${res.status})` };
          }
          if (data.imageUrl) {
            setProcessedUrl(data.imageUrl);
            setActionStatus({ message: "Background removed!", ok: true });
          } else {
            setActionStatus({ message: data.error ?? "BG removal failed.", ok: false });
          }
        } catch {
          setActionStatus({ message: "Network error. Try again.", ok: false });
        }
        setActiveAction(null);
        break;

      // ── VIDEO ─────────────────────────────────────────────────────────────
      case "Lipsync / Dubbing":
        router.push("/video/create-video?tab=lipsync" + (url ? `&videoUrl=${encodeURIComponent(url)}` : ""));
        onClose?.();
        break;

      case "Extend Video":
        router.push("/video/create-video" + (url ? `?videoUrl=${encodeURIComponent(url)}` : ""));
        onClose?.();
        break;

      case "Add Voiceover":
        router.push("/audio");
        onClose?.();
        break;

      // ── AUDIO ─────────────────────────────────────────────────────────────
      case "Use for Lipsync":
        router.push("/video/create-video?tab=lipsync" + (url ? `&audioUrl=${encodeURIComponent(url)}` : ""));
        onClose?.();
        break;

      case "Add to Video":
        router.push("/video/create-video" + (url ? `?audioUrl=${encodeURIComponent(url)}` : ""));
        onClose?.();
        break;

      // ── 3D ────────────────────────────────────────────────────────────────
      case "Export .GLB / .OBJ":
        if (url) await downloadAsset(url, ".glb");
        break;

      case "Retopologize Mesh":
        setActionStatus({ message: "Retopology is queued — coming soon.", ok: true });
        break;

      // ── UNIVERSAL ─────────────────────────────────────────────────────────
      case "Download": {
        if (!url) return;
        const extMap: Record<AssetType, string> = { image: ".png", video: ".mp4", audio: ".mp3", "3d": ".glb" };
        await downloadAsset(url, extMap[asset.type]);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUrl, asset, router, onClose, downloadAsset]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 rounded-2xl ring-1 ring-white/10 shadow-2xl shadow-black/60">

      {/* ── Left: Masterpiece Canvas ──────────────────────────────────────────── */}
      <motion.div
        animate={{ width: expanded ? "100%" : "70%" }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="relative h-full shrink-0 overflow-hidden"
      >
        {/* Canvas */}
        {asset.type === "image" && <ImageCanvas asset={{ ...asset, url: effectiveUrl }} />}
        {asset.type === "video" && <VideoCanvas asset={{ ...asset, url: effectiveUrl }} />}
        {asset.type === "audio" && <AudioCanvas asset={{ ...asset, url: effectiveUrl }} />}
        {asset.type === "3d" && <ThreeDCanvas asset={asset} />}

        {/* Top-left: type badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1",
              cfg.badgeBg,
              "backdrop-blur-md bg-slate-950/70"
            )}
          >
            <TypeIcon className={cn("h-3 w-3", cfg.textColor)} />
            {cfg.label}
          </div>
          {asset.title && (
            <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[11px] text-zinc-300 ring-1 ring-white/10 truncate max-w-[180px]">
              {asset.title}
            </span>
          )}
        </div>

        {/* Top-right: expand + close */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-md ring-1 ring-white/10 hover:ring-white/20 text-zinc-400 hover:text-white transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setExpanded(!expanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-md ring-1 ring-white/10 hover:ring-white/20 text-zinc-400 hover:text-white transition-colors"
            title={expanded ? "Shrink canvas" : "Expand to fullscreen"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Right: Dynamic Inspector Panel ───────────────────────────────────── */}
      <motion.div
        animate={{
          width: expanded ? "0%" : "30%",
          opacity: expanded ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="shrink-0 h-full overflow-hidden border-l border-white/[0.08]"
      >
        <div className="flex h-full w-full min-w-[280px] flex-col bg-slate-950/80 backdrop-blur-2xl">

          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  cfg.bgColor,
                  `ring-1 ${cfg.borderColor}`
                )}
                animate={{ boxShadow: [`0 0 0px ${cfg.glowCss.split(",")[0].slice(7)}`, `0 0 12px ${cfg.glowCss.split(",")[0].slice(7)}`, `0 0 0px ${cfg.glowCss.split(",")[0].slice(7)}`] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <TypeIcon className={cn("h-3.5 w-3.5", cfg.textColor)} />
              </motion.div>
              <div>
                <p className="text-xs font-bold text-white">Asset Inspector</p>
                <p className={cn("text-[10px]", cfg.textColor)}>{cfg.studioLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyPrompt}
                title="Copy prompt"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
              >
                <Copy className={cn("h-3.5 w-3.5", copied && "text-emerald-400")} />
              </button>
              <button
                title="Share"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable sections */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">

            {/* ── Section 1: Prompt Details */}
            <InspectorSection title="Prompt Details" icon={Sparkles}>
              <p className="text-[12px] leading-relaxed text-zinc-300">
                {promptPreview}
              </p>
              {isPromptLong && (
                <p className="mt-1 text-[10px] text-zinc-500">Prompt is truncated here. Use copy for full text.</p>
              )}
              <button
                onClick={handleCopyPrompt}
                className={cn(
                  "mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all ring-1",
                  copied
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : "bg-white/5 text-zinc-400 ring-white/10 hover:bg-white/10 hover:text-zinc-200"
                )}
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied!" : "Copy Prompt"}
              </button>
            </InspectorSection>

            {/* ── Section 2: Model Info */}
            <InspectorSection title="Model Info" icon={Cpu}>
              <div className="space-y-2">
                {[
                  {
                    label: "AI Engine",
                    value: asset.model ?? getDefaultModel(asset.type),
                    Icon: ScanFace,
                  },
                  {
                    label: "Resolution",
                    value: asset.resolution ?? getDefaultResolution(asset.type),
                    Icon: Aperture,
                  },
                  {
                    label: "Type",
                    value: cfg.label,
                    Icon: TypeIcon,
                  },
                  ...(asset.duration
                    ? [{ label: "Duration", value: asset.duration, Icon: Film }]
                    : []),
                ].map(({ label, value, Icon: RowIcon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      <RowIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-[11px] text-zinc-400">{label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold font-mono",
                        cfg.textColor
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </InspectorSection>

            {/* ── Section 3: Assistance Tools */}
            <InspectorSection title="Assistance Tools" icon={Info} defaultOpen>
              <div className="space-y-2.5">
                {/* Primary glowing action */}
                <PrimaryActionButton
                  action={primary}
                  assetType={asset.type}
                  loading={activeAction === primary.label}
                  onClick={() => handleAction(primary.label)}
                />

                {/* Secondary actions */}
                <div className="space-y-1.5">
                  {secondary.map((action) => (
                    <SecondaryActionButton
                      key={action.label}
                      action={action}
                      loading={activeAction === action.label}
                      onClick={() => handleAction(action.label)}
                    />
                  ))}
                </div>

                {/* Action status banner */}
                <AnimatePresence>
                  {actionStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium ring-1",
                        actionStatus.ok
                          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
                          : "bg-red-500/10 text-red-300 ring-red-500/25"
                      )}
                    >
                      <Sparkles className={cn("h-3.5 w-3.5 shrink-0", actionStatus.ok ? "text-emerald-400" : "text-red-400")} />
                      <span>{actionStatus.message}</span>
                      <button
                        onClick={() => setActionStatus(null)}
                        className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Processed result badge */}
                {processedUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10">
                    <p className="text-[10px] text-zinc-400">Processed version loaded in canvas</p>
                    <button
                      onClick={() => { setProcessedUrl(null); setActionStatus(null); }}
                      className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors underline underline-offset-2"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </InspectorSection>

          </div>

          {/* Panel footer */}
          <div className="shrink-0 border-t border-white/[0.08] px-5 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-600">
                Generated with{" "}
                <span className={cn("font-semibold", cfg.textColor)}>
                  {asset.model ?? getDefaultModel(asset.type)}
                </span>
              </p>
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  asset.type === "image" && "bg-pink-400",
                  asset.type === "video" && "bg-orange-400",
                  asset.type === "audio" && "bg-emerald-400",
                  asset.type === "3d" && "bg-violet-400"
                )}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultModel(type: AssetType): string {
  return {
    image: "Nano Banana Pro",
    video: "Kling 3.0",
    audio: "Suno V4.5",
    "3d": "Tripo3D v2",
  }[type];
}

function getDefaultResolution(type: AssetType): string {
  return {
    image: "1024 × 1024",
    video: "1920 × 1080",
    audio: "44.1 kHz / 320 kbps",
    "3d": "High Poly · GLB",
  }[type];
}

export default AssetInspector;

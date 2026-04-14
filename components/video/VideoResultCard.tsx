"use client";

import { motion } from "framer-motion";
import { Play, Download, Plus, ArrowUp, RefreshCw, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelBadge } from "@/lib/video-models";

export interface GeneratedVideo {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  familyColor: string;
  badge: ModelBadge;
  duration: number;
  aspectRatio: string;
  quality: string;
  camera: string;
  creditCost: number;
  gradient: string;
  createdAt: Date;
}

interface VideoResultCardProps {
  result: GeneratedVideo;
  isHero?: boolean;
  isSkeleton?: boolean;
  skeletonModelName?: string;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

function BadgePill({ badge }: { badge: ModelBadge }) {
  if (!badge) return null;
  const styles: Record<string, string> = {
    TOP: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    NEW: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    PRO: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
    FAST: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  };
  return (
    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider", styles[badge])}>
      {badge}
    </span>
  );
}

// Skeleton loading card
function SkeletonCard({ isHero, modelName }: { isHero?: boolean; modelName?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        isHero ? "col-span-2 row-span-2" : ""
      )}
      style={{ aspectRatio: "16/9", background: "#0b1225" }}
    >
      {/* Shimmer */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Zap className="h-6 w-6 text-cyan-500/40 animate-pulse" />
        <p className="text-xs text-slate-500">Generating...</p>
        {modelName && (
          <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <span className="text-[10px] text-slate-400">{modelName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoResultCard({
  result,
  isHero = false,
  isSkeleton = false,
  skeletonModelName,
  onClick,
  onDelete,
}: VideoResultCardProps) {
  if (isSkeleton) {
    return <SkeletonCard isHero={isHero} modelName={skeletonModelName} />;
  }

  const actions = [
    { icon: <Download className="h-3 w-3" />, label: "Download", onClick: (e: React.MouseEvent) => e.stopPropagation() },
    { icon: <Plus className="h-3 w-3" />,     label: "+5s Extend", onClick: (e: React.MouseEvent) => e.stopPropagation() },
    { icon: <ArrowUp className="h-3 w-3" />,  label: "4K Upscale", onClick: (e: React.MouseEvent) => e.stopPropagation() },
    { icon: <RefreshCw className="h-3 w-3" />,label: "Remix",      onClick: (e: React.MouseEvent) => e.stopPropagation() },
    { icon: <Trash2 className="h-3 w-3" />,   label: "Delete",     onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(result.id); } },
  ];

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        isHero ? "col-span-2 row-span-2" : ""
      )}
      style={{ aspectRatio: "16/9" }}
    >
      {/* Gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", result.gradient)} />

      {/* HERO: auto-play pulse */}
      {isHero && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">LATEST</span>
        </div>
      )}

      {/* Model pill — top-left (not hero) */}
      {!isHero && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: result.familyColor }} />
          <span className="text-[9px] font-medium text-white/80 max-w-[80px] truncate">{result.modelName}</span>
        </div>
      )}

      {/* Hero model pill */}
      {isHero && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
          <span className="w-2 h-2 rounded-full" style={{ background: result.familyColor }} />
          <span className="text-[10px] font-semibold text-white/80">{result.modelName}</span>
          <BadgePill badge={result.badge} />
        </div>
      )}

      {/* Duration pill — top-right (not hero) */}
      {!isHero && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
          <span className="text-[9px] text-white/70">{result.duration}s</span>
        </div>
      )}

      {/* Hover overlay */}
      <motion.div
        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      {/* Hover: play button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <Play className="h-5 w-5 text-white fill-white" />
        </div>
      </div>

      {/* Hover: bottom info + actions */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-200",
        isHero ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <div className="bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3">
          <div className="flex items-end justify-between gap-2">
            <p className="text-xs text-white/80 line-clamp-2 flex-1 leading-tight">{result.prompt}</p>
            <div className="flex items-center gap-1 shrink-0">
              {actions.map((a) => (
                <button
                  key={a.label}
                  title={a.label}
                  onClick={a.onClick}
                  className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

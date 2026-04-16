"use client";

import { motion } from "framer-motion";
import { VideoIcon } from "lucide-react";
import { GeneratedVideo } from "./VideoResultCard";
import MediaGrid, { MediaItem } from "@/components/MediaGrid";

const FAMILY_FILTERS = ["All", "Kling", "Hailuo", "Sora", "Runway", "Grok", "Seedance", "ByteDance"];

interface VideoGalleryProps {
  results: GeneratedVideo[];
  skeletonModels?: Array<{ name: string; aspectRatio?: string }>;
  activeFilter: string;
  setActiveFilter: (v: string) => void;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  onDelete: (id: string) => void;
}

function toMediaItem(r: GeneratedVideo): MediaItem {
  return {
    id: r.id,
    type: "video",
    src: "",                     // no real URL yet — placeholder mode
    model: r.modelName,
    modelColor: r.familyColor,
    ratio: r.aspectRatio ?? "16:9",
    duration: r.duration ? `${r.duration}s` : undefined,
    prompt: r.prompt,
    gradient: r.gradient,
    createdAt: r.createdAt,
  };
}

export default function VideoGallery({
  results,
  skeletonModels,
  activeFilter,
  setActiveFilter,
  sortOrder,
  setSortOrder,
  onDelete,
}: VideoGalleryProps) {
  // Family filter
  const filtered =
    activeFilter === "All"
      ? results
      : results.filter((r) =>
          r.modelName.toLowerCase().includes(activeFilter.toLowerCase()) ||
          r.modelId.toLowerCase().includes(activeFilter.toLowerCase())
        );

  // Sort
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === "newest"
      ? b.createdAt.getTime() - a.createdAt.getTime()
      : a.createdAt.getTime() - b.createdAt.getTime()
  );

  const totalCount = sorted.length + (skeletonModels?.length ?? 0);

  return (
    <div className="pt-2 pb-[180px]">
      {/* Family filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px 14px", flexWrap: "wrap" }}>
        {FAMILY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: "4px 12px", borderRadius: 20, border: "1px solid",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: activeFilter === f ? "#06b6d4" : "rgba(255,255,255,0.04)",
              color: activeFilter === f ? "#000" : "#64748b",
              borderColor: activeFilter === f ? "#06b6d4" : "rgba(255,255,255,0.08)",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {/* Sort toggle */}
        <button
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          style={{
            padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: "rgba(255,255,255,0.04)", color: "#64748b",
          }}
        >
          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {totalCount === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)" }}
          >
            <VideoIcon className="h-10 w-10 text-cyan-500/40" />
          </motion.div>
          <div className="text-center">
            <p className="text-lg font-medium text-white">Create your first video</p>
            <p className="mt-1 text-sm text-slate-500">
              Write a prompt and hit Generate to start creating
            </p>
          </div>
        </div>
      ) : (
        <MediaGrid
          items={sorted.map(toMediaItem)}
          skeletonModels={(skeletonModels ?? []).map(s => ({ name: s.name, ratio: s.aspectRatio }))}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

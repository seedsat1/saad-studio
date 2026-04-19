"use client";

import { useStudioStore } from "@/hooks/use-studio-store";
import { STATUS_CONFIG } from "@/lib/scene-studio-constants";
import { CAMERA_MOVES } from "@/lib/scene-studio-constants";

export default function FilmstripThumb({
  idx,
}: {
  idx: number;
}) {
  const scene = useStudioStore((s) => s.scenes[idx]);
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const setActiveIdx = useStudioStore((s) => s.setActiveIdx);

  if (!scene) return null;

  const isActive = activeIdx === idx;
  const cfg = STATUS_CONFIG[scene.status];
  const cam = CAMERA_MOVES.find((c) => c.id === scene.cameraMove);

  return (
    <button
      onClick={() => setActiveIdx(idx)}
      className={`relative flex-shrink-0 w-32 h-20 rounded-md overflow-hidden transition-all snap-start ${
        isActive
          ? "ring-2 ring-blue-500 scale-105"
          : "ring-1 ring-gray-700 hover:ring-gray-500"
      }`}
    >
      {scene.image ? (
        <img
          src={scene.image}
          alt={`Scene ${idx + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500 text-lg font-bold">
          {idx + 1}
        </div>
      )}

      {/* bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />

      {/* info row */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 pb-1 text-[10px] text-white">
        <span>
          {cam?.icon} {scene.duration}s
        </span>
        <span
          className={`rounded px-1 py-0.5 text-[9px] font-medium ${cfg.bg} ${cfg.text}`}
        >
          {cfg.label}
        </span>
      </div>
    </button>
  );
}

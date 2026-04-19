"use client";

import { useStudioStore } from "@/hooks/use-studio-store";
import { STATUS_CONFIG } from "@/lib/scene-studio-constants";

export default function SceneInfoCard() {
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const scene = useStudioStore((s) => s.scenes[s.activeIdx]);
  const total = useStudioStore((s) => s.scenes.length);

  if (!scene) return null;

  const cfg = STATUS_CONFIG[scene.status];

  return (
    <div className="rounded-lg bg-gray-800/60 p-3 space-y-1.5">
      <p className="text-xs font-medium text-gray-300">
        Scene {activeIdx + 1} of {total}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Status</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      {scene.taskId && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Task ID</span>
          <span className="font-mono text-gray-400 truncate max-w-[140px]">
            {scene.taskId}
          </span>
        </div>
      )}
      {scene.fileName && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">File</span>
          <span className="font-mono text-gray-400 truncate max-w-[140px]">
            {scene.fileName}
          </span>
        </div>
      )}
    </div>
  );
}

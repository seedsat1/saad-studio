"use client";

import { useStudioStore } from "@/hooks/use-studio-store";

export default function DurationSlider() {
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const duration = useStudioStore(
    (s) => s.scenes[s.activeIdx]?.duration ?? 4
  );
  const updateScene = useStudioStore((s) => s.updateScene);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-400">Duration</span>
        <span className="font-mono text-xs text-white">{duration}s</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={duration}
        onChange={(e) =>
          updateScene(activeIdx, { duration: Number(e.target.value) })
        }
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>1s</span>
        <span>10s</span>
      </div>
    </div>
  );
}

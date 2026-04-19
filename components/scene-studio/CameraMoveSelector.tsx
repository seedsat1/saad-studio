"use client";

import { useStudioStore } from "@/hooks/use-studio-store";
import { CAMERA_MOVES } from "@/lib/scene-studio-constants";

export default function CameraMoveSelector() {
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const cameraMove = useStudioStore(
    (s) => s.scenes[s.activeIdx]?.cameraMove ?? "static"
  );
  const updateScene = useStudioStore((s) => s.updateScene);

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-400">Camera Move</p>
      <div className="grid grid-cols-4 gap-1.5">
        {CAMERA_MOVES.map((cam) => {
          const selected = cameraMove === cam.id;
          return (
            <button
              key={cam.id}
              title={cam.desc}
              onClick={() => updateScene(activeIdx, { cameraMove: cam.id })}
              className={`flex flex-col items-center justify-center rounded-md border px-1 py-1.5 transition ${
                selected
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              <span className="text-base leading-none">{cam.icon}</span>
              <span className="mt-0.5 text-[10px] leading-tight">
                {cam.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

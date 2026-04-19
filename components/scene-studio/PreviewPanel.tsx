"use client";

import { useRef } from "react";
import { useStudioStore } from "@/hooks/use-studio-store";
import { STATUS_CONFIG } from "@/lib/scene-studio-constants";

export default function PreviewPanel() {
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const scene = useStudioStore((s) => s.scenes[s.activeIdx]);
  const updateScene = useStudioStore((s) => s.updateScene);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!scene) return null;

  const isProcessing =
    scene.status === "uploading" ||
    scene.status === "queued" ||
    scene.status === "running";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateScene(activeIdx, {
        image: reader.result as string,
        imageFile: file,
        status: "idle",
        outputUrl: null,
        outputType: null,
        error: null,
        taskId: null,
        fileName: null,
      });
    };
    reader.readAsDataURL(file);
  };

  const cfg = STATUS_CONFIG[scene.status];

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!scene.image ? (
        /* Empty state */
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 text-gray-500 transition hover:border-gray-500 hover:text-gray-300"
        >
          <span className="mb-1 text-3xl">+</span>
          <span className="text-sm">Upload reference frame</span>
        </button>
      ) : (
        <div
          className="relative h-full w-full cursor-pointer rounded-xl overflow-hidden"
          onClick={() => {
            if (!isProcessing && scene.status !== "success")
              inputRef.current?.click();
          }}
        >
          {/* background image */}
          <img
            src={scene.image}
            alt="Reference"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className={`text-sm font-medium ${cfg.text}`}>
                {cfg.label}
              </span>
            </div>
          )}

          {/* Success overlay */}
          {scene.status === "success" && scene.outputUrl && (
            <div className="absolute inset-0 bg-black/40">
              {scene.outputType === "video" ? (
                <video
                  src={scene.outputUrl}
                  autoPlay
                  loop
                  muted
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={scene.outputUrl}
                  alt="Output"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          )}

          {/* Failed overlay */}
          {scene.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <span className="text-sm text-red-400">
                {scene.error ?? "Generation failed"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

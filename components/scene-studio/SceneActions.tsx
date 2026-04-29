"use client";

import { useStudioStore } from "@/hooks/use-studio-store";
import { useGenerationGate } from "@/hooks/use-generation-gate";

export default function SceneActions() {
  const { guardGeneration } = useGenerationGate();
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const scene = useStudioStore((s) => s.scenes[s.activeIdx]);
  const scenesLength = useStudioStore((s) => s.scenes.length);
  const generating = useStudioStore((s) => s.generating);
  const generateScene = useStudioStore((s) => s.generateScene);
  const duplicateScene = useStudioStore((s) => s.duplicateScene);
  const removeScene = useStudioStore((s) => s.removeScene);

  if (!scene) return null;

  const isBusy =
    scene.status === "uploading" ||
    scene.status === "queued" ||
    scene.status === "running";

  const handleGenerate = async () => {
    if (!scene.image) {
      alert("Please upload an image for this scene first.");
      return;
    }
    const gate = await guardGeneration({
      requiredCredits: 6,
      action: "variations:generate-scene",
    });
    if (!gate.ok) return;
    void generateScene(activeIdx);
  };

  return (
    <div className="flex flex-col gap-2">
      {!scene.image && (
        <p className="text-xs text-amber-400">⚠ Upload an image to start generating.</p>
      )}
      <div className="flex items-center gap-2">
        <button
          disabled={isBusy || generating}
          onClick={handleGenerate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isBusy ? "Working..." : "Generate this scene"}
        </button>
        <button
          onClick={() => duplicateScene(activeIdx)}
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          Duplicate
        </button>
        <button
          disabled={scenesLength <= 1}
          onClick={() => removeScene(activeIdx)}
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-red-400 transition hover:border-red-600 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

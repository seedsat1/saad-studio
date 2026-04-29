"use client";

import { useStudioStore } from "@/hooks/use-studio-store";
import { useGenerationGate } from "@/hooks/use-generation-gate";

export default function SceneStudioHeader() {
  const { guardGeneration } = useGenerationGate();
  const scenes = useStudioStore((s) => s.scenes);
  const generating = useStudioStore((s) => s.generating);
  const apiKey = useStudioStore((s) => s.apiKey);
  const workflowId = useStudioStore((s) => s.workflowId);
  const generateAll = useStudioStore((s) => s.generateAll);

  const total = scenes.length;
  const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
  const done = scenes.filter((s) => s.status === "success").length;
  const hasImages = scenes.some((s) => s.image);
  const canGenerate = !generating && !!apiKey && !!workflowId && hasImages;
  const handleGenerateAll = async () => {
    const sceneCount = scenes.filter((s) => s.image).length;
    const gate = await guardGeneration({
      requiredCredits: sceneCount * 6,
      action: "variations:generate-all",
    });
    if (!gate.ok) return;
    void generateAll();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div>
        <h1 className="text-xl font-medium text-white">Next Scene Studio</h1>
        <p className="text-sm text-gray-400">
          {total} scene{total !== 1 ? "s" : ""} · {totalDuration}s · {done}{" "}
          rendered
        </p>
      </div>
      <button
        disabled={!canGenerate}
        onClick={handleGenerateAll}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? "Generating..." : "Generate all"}
      </button>
    </div>
  );
}

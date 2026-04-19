"use client";

import { useStudioStore } from "@/hooks/use-studio-store";

export default function PromptInput() {
  const activeIdx = useStudioStore((s) => s.activeIdx);
  const prompt = useStudioStore((s) => s.scenes[s.activeIdx]?.prompt ?? "");
  const updateScene = useStudioStore((s) => s.updateScene);

  return (
    <textarea
      rows={3}
      value={prompt}
      onChange={(e) => updateScene(activeIdx, { prompt: e.target.value })}
      placeholder="Describe the scene motion, mood, and transition..."
      className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
    />
  );
}

"use client";

import SceneStudioHeader from "@/components/scene-studio/Header";
import SettingsPanel from "@/components/scene-studio/SettingsPanel";
import FilmstripTimeline from "@/components/scene-studio/FilmstripTimeline";
import PreviewPanel from "@/components/scene-studio/PreviewPanel";
import PromptInput from "@/components/scene-studio/PromptInput";
import SceneActions from "@/components/scene-studio/SceneActions";
import CameraMoveSelector from "@/components/scene-studio/CameraMoveSelector";
import DurationSlider from "@/components/scene-studio/DurationSlider";
import SceneInfoCard from "@/components/scene-studio/SceneInfoCard";
import LogPanel from "@/components/scene-studio/LogPanel";

export default function SceneStudioPage() {
  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Header */}
      <SceneStudioHeader />

      {/* Settings */}
      <SettingsPanel />

      {/* Filmstrip */}
      <FilmstripTimeline />

      {/* Main editor */}
      <div className="mt-4 grid gap-4 px-4 sm:px-6 md:grid-cols-[1fr_240px]">
        {/* Left column */}
        <div className="space-y-3">
          <PreviewPanel />
          <PromptInput />
          <SceneActions />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <CameraMoveSelector />
          <DurationSlider />
          <SceneInfoCard />
        </div>
      </div>

      {/* Log */}
      <div className="mt-4 px-4 sm:px-6">
        <LogPanel />
      </div>
    </div>
  );
}

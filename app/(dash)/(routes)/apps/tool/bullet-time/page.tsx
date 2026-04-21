"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Camera,
  Clapperboard,
  Film,
  Gauge,
  Layers,
  Lightbulb,
  Mic2,
  MonitorPlay,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Wand2,
  Waves,
} from "lucide-react";

type StudioThemeKey = "darkSteel" | "midnightGold" | "newsroomPro";
type InspectorTab =
  | "script"
  | "storyboard"
  | "characters"
  | "voice"
  | "camera"
  | "lighting"
  | "motion"
  | "transitions"
  | "presets"
  | "render";

interface Scene {
  id: string;
  title: string;
  duration: string;
  status: "Draft" | "Queued" | "Ready";
  camera: string;
  transition: string;
}

const STUDIO_THEMES: Record<
  StudioThemeKey,
  {
    label: string;
    page: string;
    panel: string;
    soft: string;
    accent: string;
    ring: string;
    badge: string;
    button: string;
    textMute: string;
  }
> = {
  darkSteel: {
    label: "Dark Steel + Cyan",
    page: "bg-[radial-gradient(circle_at_20%_20%,#15485a_0%,#07101a_35%,#05080e_100%)]",
    panel: "border-cyan-300/15 bg-slate-950/65",
    soft: "border-cyan-200/10 bg-cyan-500/8",
    accent: "text-cyan-200",
    ring: "ring-cyan-300/50",
    badge: "bg-cyan-400/15 text-cyan-100 border-cyan-300/35",
    button: "from-cyan-500 to-sky-500",
    textMute: "text-slate-300/75",
  },
  midnightGold: {
    label: "Midnight Gold",
    page: "bg-[radial-gradient(circle_at_20%_20%,#5d3d08_0%,#1a1208_38%,#080706_100%)]",
    panel: "border-amber-300/15 bg-zinc-950/65",
    soft: "border-amber-200/10 bg-amber-500/8",
    accent: "text-amber-100",
    ring: "ring-amber-300/55",
    badge: "bg-amber-400/15 text-amber-50 border-amber-200/35",
    button: "from-amber-500 to-yellow-500",
    textMute: "text-zinc-300/80",
  },
  newsroomPro: {
    label: "Newsroom Pro",
    page: "bg-[radial-gradient(circle_at_18%_25%,#08305f_0%,#071327_42%,#050910_100%)]",
    panel: "border-blue-300/15 bg-slate-950/70",
    soft: "border-blue-200/10 bg-blue-500/10",
    accent: "text-blue-100",
    ring: "ring-blue-300/55",
    badge: "bg-blue-400/15 text-blue-100 border-blue-200/35",
    button: "from-blue-500 to-indigo-500",
    textMute: "text-slate-300/80",
  },
};

const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "script", label: "Script" },
  { id: "storyboard", label: "Storyboard" },
  { id: "characters", label: "Characters" },
  { id: "voice", label: "Voice" },
  { id: "camera", label: "Camera" },
  { id: "lighting", label: "Lighting" },
  { id: "motion", label: "Motion" },
  { id: "transitions", label: "Transitions" },
  { id: "presets", label: "Presets" },
  { id: "render", label: "Render" },
];

const SCENES: Scene[] = [
  { id: "SC-01", title: "City Introduction", duration: "08s", status: "Ready", camera: "Alexa LF", transition: "Match Cut" },
  { id: "SC-02", title: "Character Arrival", duration: "06s", status: "Queued", camera: "Sony Venice", transition: "Whip Pan" },
  { id: "SC-03", title: "Breaking News Desk", duration: "05s", status: "Draft", camera: "Broadcast ENG", transition: "Clean Cut" },
  { id: "SC-04", title: "Drama Closeup", duration: "07s", status: "Draft", camera: "Anamorphic", transition: "L-Cut" },
];

const PRESETS = [
  "Cinematic Blockbuster",
  "TV News Report",
  "Emotional Drama",
  "True Crime",
  "Fantasy Epic",
  "Tech Promo",
  "Anime Stylized",
  "Trailer Mode",
];

const JOB_LOGS = [
  "Storyboard image: Imagen 4 Ultra -> success (2.8s)",
  "Scene video: Kling 3 -> queued",
  "Voice preview: eleven_v3 -> success (1.2s)",
  "Transition pass: Match Cut optimizer -> ready",
];

export default function BulletTimeStudioPage() {
  const [themeKey, setThemeKey] = useState<StudioThemeKey>("darkSteel");
  const [selectedSceneId, setSelectedSceneId] = useState<string>(SCENES[0].id);
  const [activeTab, setActiveTab] = useState<InspectorTab>("presets");
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0]);

  const theme = STUDIO_THEMES[themeKey];
  const selectedScene = useMemo(
    () => SCENES.find((scene) => scene.id === selectedSceneId) ?? SCENES[0],
    [selectedSceneId]
  );

  return (
    <section className={`min-h-[calc(100vh-64px)] ${theme.page} p-4 md:p-6`}>
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <header className={`rounded-2xl border p-4 backdrop-blur ${theme.panel}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.24em] ${theme.textMute}`}>Hollywood AI Studio</p>
              <h1 className="text-2xl font-semibold text-white">Bullet Time - Production Control Room</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STUDIO_THEMES) as StudioThemeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    themeKey === key
                      ? `text-white ring-2 ${theme.ring} ${STUDIO_THEMES[key].soft}`
                      : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {STUDIO_THEMES[key].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Project", "Project Hydra"],
              ["Credits", "1,870 remaining"],
              ["Render Queue", "2 active jobs"],
              ["Plan", "Director Pro"],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-xl border px-3 py-2 ${theme.soft}`}>
                <p className={`text-[11px] uppercase tracking-widest ${theme.textMute}`}>{label}</p>
                <p className="mt-1 text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className={`rounded-2xl border p-3 backdrop-blur ${theme.panel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Scene Timeline</h2>
              <span className={`rounded-full border px-2 py-1 text-[10px] ${theme.badge}`}>{SCENES.length} scenes</span>
            </div>
            <div className="space-y-2">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    scene.id === selectedSceneId
                      ? `ring-2 ${theme.ring} ${theme.soft}`
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{scene.id}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] ${theme.badge}`}>{scene.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-white">{scene.title}</p>
                  <p className={`mt-1 text-xs ${theme.textMute}`}>{scene.duration} - {scene.camera} - {scene.transition}</p>
                </button>
              ))}
            </div>
          </aside>

          <main className="space-y-4">
            <section className={`rounded-2xl border p-3 backdrop-blur ${theme.panel}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className={`text-[11px] uppercase tracking-[0.2em] ${theme.textMute}`}>Preview Stage</p>
                  <h3 className="text-lg font-semibold text-white">{selectedScene.title}</h3>
                </div>
                <button className={`rounded-lg bg-gradient-to-r px-4 py-2 text-sm font-medium text-white ${theme.button}`}>
                  Generate Scene Video
                </button>
              </div>
              <div className="aspect-video rounded-xl border border-white/15 bg-gradient-to-br from-white/5 via-black/30 to-black/70 p-3">
                <div className="flex h-full flex-col justify-between rounded-lg border border-dashed border-white/20 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <MonitorPlay className="h-4 w-4" />
                    Live Preview Canvas
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    {[
                      ["Camera", selectedScene.camera],
                      ["Lighting", "Low Key / Rim"],
                      ["Motion", "Dolly In"],
                      ["Transition", selectedScene.transition],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-white/90">
                        <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
                        <p className="truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={`grid gap-3 rounded-2xl border p-3 md:grid-cols-4 ${theme.panel}`}>
              {[
                [Camera, "Camera Lab", "ARRI / RED / Venice / ENG"],
                [Lightbulb, "Lighting Matrix", "High-Key, Low-Key, Rembrandt"],
                [Waves, "Motion Engine", "Dolly, Crane, Orbit, Handheld"],
                [Film, "Transition Lab", "J/L Cut, Match Cut, Whip, Dissolve"],
              ].map(([Icon, title, desc]) => (
                <article key={title as string} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Icon className={`h-5 w-5 ${theme.accent}`} />
                  <h4 className="mt-2 text-sm font-semibold text-white">{title as string}</h4>
                  <p className={`mt-1 text-xs ${theme.textMute}`}>{desc as string}</p>
                </article>
              ))}
            </section>
          </main>

          <aside className={`rounded-2xl border p-3 backdrop-blur ${theme.panel}`}>
            <h2 className="text-sm font-semibold text-white">Inspector Mega Tabs</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {INSPECTOR_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    activeTab === tab.id ? `${theme.soft} text-white` : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
              {activeTab === "presets" && (
                <div className="space-y-2">
                  <p className={`text-xs ${theme.textMute}`}>Preset Stack</p>
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSelectedPreset(preset)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                        selectedPreset === preset ? `${theme.soft} text-white` : "border-white/10 bg-white/5 text-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "camera" && (
                <div className="space-y-3 text-xs text-slate-100">
                  <p className={theme.textMute}>Camera + Shot Controls</p>
                  <Field label="Camera Body" value="ARRI Alexa LF" />
                  <Field label="Lens" value="Anamorphic 50mm" />
                  <Field label="Shot Type" value="Medium Close-Up" />
                  <Field label="Frame Rate" value="24 fps" />
                </div>
              )}

              {activeTab === "voice" && (
                <div className="space-y-3 text-xs text-slate-100">
                  <p className={theme.textMute}>Voice + Clone Routing</p>
                  <Field label="TTS Model" value="eleven_v3" />
                  <Field label="Clone Model" value="ElevenLabs PVC" />
                  <Field label="Narration Style" value="Cinematic Serious" />
                  <label className="flex items-center gap-2 text-[11px] text-slate-200">
                    <input type="checkbox" className="h-4 w-4" defaultChecked />
                    Consent checkbox wired in UI
                  </label>
                </div>
              )}

              {activeTab !== "presets" && activeTab !== "camera" && activeTab !== "voice" && (
                <div className="space-y-2 text-xs text-slate-100">
                  <p className={theme.textMute}>Active Module: {activeTab}</p>
                  <Field label="Primary Model" value="Kling 3" />
                  <Field label="Secondary Model" value="Seedance 2" />
                  <Field label="Image Model" value="Imagen 4 Ultra / FLUX" />
                  <Field label="Script Model" value="GPT-5.4" />
                </div>
              )}
            </div>
          </aside>
        </div>

        <section className={`rounded-2xl border p-3 backdrop-blur ${theme.panel}`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Job Console</h2>
            <span className={`rounded-md border px-2 py-1 text-[10px] ${theme.badge}`}>Mock Mode Active</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [Clapperboard, "Scene Jobs", "4 running"],
              [Mic2, "Audio Jobs", "1 running"],
              [Sparkles, "Image Jobs", "2 completed"],
              [Gauge, "Render", "63% encoding"],
            ].map(([Icon, label, stat]) => (
              <div key={label as string} className="rounded-lg border border-white/10 bg-white/5 p-2">
                <div className="flex items-center gap-2 text-white">
                  <Icon className={`h-4 w-4 ${theme.accent}`} />
                  <span className="text-xs font-medium">{label as string}</span>
                </div>
                <p className={`mt-1 text-xs ${theme.textMute}`}>{stat as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-black/30 p-2">
            {JOB_LOGS.map((log) => (
              <p key={log} className={`text-xs ${theme.textMute}`}>
                <Timer className="mr-1 inline h-3 w-3" />
                {log}
              </p>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border p-3 ${theme.panel}`}>
          <h2 className="text-sm font-semibold text-white">Model Routing Used In This Page</h2>
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
            <RoutePill icon={<Wand2 className="h-3.5 w-3.5" />} label="Script + QA" value="GPT-5.4 / GPT-5.4-mini" />
            <RoutePill icon={<Layers className="h-3.5 w-3.5" />} label="Images" value="Imagen 4 Ultra + FLUX" />
            <RoutePill icon={<Film className="h-3.5 w-3.5" />} label="Video" value="Kling 3 + Seedance 2" />
            <RoutePill icon={<SlidersHorizontal className="h-3.5 w-3.5" />} label="Voice" value="eleven_v3 + PVC" />
          </div>
        </section>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="text-xs text-white">{value}</p>
    </div>
  );
}

function RoutePill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-slate-100">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/70">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xs">{value}</p>
    </div>
  );
}

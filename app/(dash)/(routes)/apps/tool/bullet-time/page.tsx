"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Camera,
  Clapperboard,
  Film,
  Gauge,
  Layers,
  Lightbulb,
  Loader2,
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

interface StudioState {
  projectName: string;
  credits: number;
  plan: string;
  renderQueue: number;
  jobs: {
    scene: { running: number; completedToday: number };
    audio: { running: number; completedToday: number };
    image: { running: number; completedToday: number };
  };
  modelRouting: {
    script: string;
    images: string;
    video: string;
    voice: string;
  };
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

const VIDEO_ROUTES = [
  { value: "kwaivgi/kling-v3.0-pro/text-to-video", label: "Kling 3 Pro" },
  { value: "bytedance/seedance-v2/text-to-video", label: "Seedance 2" },
  { value: "bytedance/seedance-v2/text-to-video-fast", label: "Seedance 2 Fast" },
];

const IMAGE_MODELS = [
  { value: "google/nano-banana", label: "Nano Banana" },
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
];

const FALLBACK_STATE: StudioState = {
  projectName: "Bullet Time Studio",
  credits: 0,
  plan: "Free",
  renderQueue: 0,
  jobs: {
    scene: { running: 0, completedToday: 0 },
    audio: { running: 0, completedToday: 0 },
    image: { running: 0, completedToday: 0 },
  },
  modelRouting: {
    script: "GPT-5.4 / GPT-5.4-mini",
    images: "Nano Banana + Nano Banana Edit",
    video: "Kling 3 + Seedance 2",
    voice: "eleven_v3 + PVC",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return `Request failed (${res.status})`;
  try {
    const json = JSON.parse(raw) as { error?: string; message?: string };
    return json.error || json.message || raw;
  } catch {
    return raw;
  }
}

export default function BulletTimeStudioPage() {
  const [themeKey, setThemeKey] = useState<StudioThemeKey>("darkSteel");
  const [selectedSceneId, setSelectedSceneId] = useState<string>(SCENES[0].id);
  const [activeTab, setActiveTab] = useState<InspectorTab>("presets");
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0]);

  const [state, setState] = useState<StudioState>(FALLBACK_STATE);
  const [prompt, setPrompt] = useState("A dramatic cinematic shot of a reporter walking through a rainy neon street at night.");
  const [voiceText, setVoiceText] = useState("Breaking news update from Saad Studio. Live broadcast begins now.");
  const [videoRoute, setVideoRoute] = useState(VIDEO_ROUTES[0].value);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].value);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [videoLoading, setVideoLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const theme = STUDIO_THEMES[themeKey];
  const selectedScene = useMemo(
    () => SCENES.find((scene) => scene.id === selectedSceneId) ?? SCENES[0],
    [selectedSceneId]
  );

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} - ${line}`, ...prev].slice(0, 8));
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch("/api/apps/tool/bullet-time/state", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as StudioState;
      setState(json);
    } catch {
      // keep fallback state
    }
  }, []);

  useEffect(() => {
    void refreshState();
    const interval = setInterval(() => {
      void refreshState();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshState]);

  async function generateVideo() {
    if (!prompt.trim() || videoLoading) return;
    setVideoLoading(true);
    setError("");
    try {
      pushLog(`Submitting video generation with ${videoRoute}`);
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRoute: videoRoute,
          payload: {
            prompt: prompt.trim(),
            duration: 5,
            aspect_ratio: "16:9",
          },
        }),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const json = (await res.json()) as { taskId?: string; videoUrl?: string; outputs?: string[] };
      if (json.videoUrl) {
        setVideoUrl(json.videoUrl);
        pushLog("Video completed instantly.");
        await refreshState();
        return;
      }

      if (!json.taskId) {
        throw new Error("Video taskId missing.");
      }

      for (let attempt = 0; attempt < 100; attempt++) {
        await sleep(3000);
        const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(json.taskId)}`, { cache: "no-store" });
        if (!pollRes.ok) {
          throw new Error(await parseError(pollRes));
        }
        const poll = (await pollRes.json()) as { status?: string; outputs?: string[]; error?: string };
        if (poll.status === "completed") {
          const url = poll.outputs?.[0];
          if (!url) throw new Error("Video completed without URL.");
          setVideoUrl(url);
          pushLog("Video generated successfully.");
          await refreshState();
          return;
        }
        if (poll.status === "failed") {
          throw new Error(poll.error || "Video generation failed.");
        }
      }

      throw new Error("Video generation timed out.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Video generation failed.";
      setError(msg);
      pushLog(`Video error: ${msg}`);
    } finally {
      setVideoLoading(false);
    }
  }

  async function generateImage() {
    if (!prompt.trim() || imageLoading) return;
    setImageLoading(true);
    setError("");
    try {
      pushLog(`Submitting image generation with ${imageModel}`);
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId: imageModel,
          aspectRatio: "16:9",
          numImages: 1,
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as { imageUrls?: string[] };
      const url = json.imageUrls?.[0];
      if (!url) throw new Error("Image URL missing.");
      setImageUrl(url);
      pushLog("Image generated successfully.");
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed.";
      setError(msg);
      pushLog(`Image error: ${msg}`);
    } finally {
      setImageLoading(false);
    }
  }

  async function generateVoice() {
    if (!voiceText.trim() || audioLoading) return;
    setAudioLoading(true);
    setError("");
    try {
      pushLog("Submitting TTS generation with eleven_v3");
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "tts",
          text: voiceText.trim(),
          voice: "Aria",
          model: "elevenlabs/eleven-v3",
          output_format: "mp3_44100_128",
        }),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as { audioUrl?: string };
      if (!json.audioUrl) throw new Error("Audio URL missing.");
      setAudioUrl(json.audioUrl);
      pushLog("TTS generated successfully.");
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audio generation failed.";
      setError(msg);
      pushLog(`Audio error: ${msg}`);
    } finally {
      setAudioLoading(false);
    }
  }

  return (
    <section className={`min-h-[calc(100vh-64px)] w-full ${theme.page} px-2 py-3 md:px-4 md:py-4`}>
      <div className="flex w-full min-w-0 flex-col gap-4">
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
              ["Project", state.projectName],
              ["Credits", `${state.credits.toLocaleString()} remaining`],
              ["Render Queue", `${state.renderQueue} active jobs`],
              ["Plan", state.plan],
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
                <button
                  onClick={generateVideo}
                  disabled={videoLoading || !prompt.trim()}
                  className={`rounded-lg bg-gradient-to-r px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${theme.button}`}
                >
                  {videoLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span> : "Generate Scene Video"}
                </button>
              </div>

              <div className="mb-3 grid gap-2 md:grid-cols-4">
                <div className="md:col-span-3">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/45"
                    placeholder="Describe your cinematic scene..."
                  />
                </div>
                <div className="space-y-2">
                  <select
                    value={videoRoute}
                    onChange={(e) => setVideoRoute(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/35 px-2 py-2 text-xs text-white"
                  >
                    {VIDEO_ROUTES.map((route) => (
                      <option key={route.value} value={route.value} className="bg-slate-900">
                        {route.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={generateImage}
                    disabled={imageLoading || !prompt.trim()}
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-xs text-white disabled:opacity-50"
                  >
                    {imageLoading ? "Generating Image..." : "Generate Storyboard Image"}
                  </button>
                </div>
              </div>

              <div className="aspect-video rounded-xl border border-white/15 bg-gradient-to-br from-white/5 via-black/30 to-black/70 p-3">
                {videoUrl ? (
                  <video src={videoUrl} controls className="h-full w-full rounded-lg object-cover" />
                ) : (
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
                )}
              </div>

              {(imageUrl || audioUrl) && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                    <p className="mb-2 text-xs text-slate-300">Latest Storyboard Image</p>
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="Generated storyboard" className="w-full rounded-lg border border-white/10" />
                    ) : (
                      <p className="text-xs text-slate-400">No generated image yet.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                    <p className="mb-2 text-xs text-slate-300">Latest Voice Preview</p>
                    {audioUrl ? <audio src={audioUrl} controls className="w-full" /> : <p className="text-xs text-slate-400">No generated audio yet.</p>}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}
            </section>

            <section className={`grid gap-3 rounded-2xl border p-3 md:grid-cols-4 ${theme.panel}`}>
              {[
                [Camera, "Camera Lab", "ARRI / RED / Venice / ENG"],
                [Lightbulb, "Lighting Matrix", "High-Key, Low-Key, Rembrandt"],
                [Waves, "Motion Engine", "Dolly, Crane, Orbit, Handheld"],
                [Film, "Transition Lab", "J/L Cut, Match Cut, Whip, Dissolve"],
              ].map(([Icon, title, desc]) => (
                <button key={title as string} onClick={() => setActiveTab(title === "Camera Lab" ? "camera" : title === "Lighting Matrix" ? "lighting" : title === "Motion Engine" ? "motion" : "transitions")} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                  <Icon className={`h-5 w-5 ${theme.accent}`} />
                  <h4 className="mt-2 text-sm font-semibold text-white">{title as string}</h4>
                  <p className={`mt-1 text-xs ${theme.textMute}`}>{desc as string}</p>
                </button>
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

              {activeTab === "storyboard" && (
                <div className="space-y-3 text-xs text-slate-100">
                  <p className={theme.textMute}>Storyboard Generator (Live)</p>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/35 px-2 py-2 text-xs text-white"
                  >
                    {IMAGE_MODELS.map((model) => (
                      <option key={model.value} value={model.value} className="bg-slate-900">
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={generateImage} disabled={imageLoading || !prompt.trim()} className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-xs text-white disabled:opacity-50">
                    {imageLoading ? "Generating..." : "Generate Image Now"}
                  </button>
                </div>
              )}

              {activeTab === "voice" && (
                <div className="space-y-3 text-xs text-slate-100">
                  <p className={theme.textMute}>Voice + Clone Routing (Live TTS)</p>
                  <Field label="TTS Model" value="eleven_v3" />
                  <Field label="Clone Model" value="ElevenLabs PVC" />
                  <textarea
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/15 bg-black/35 px-2 py-2 text-xs text-white outline-none"
                  />
                  <button onClick={generateVoice} disabled={audioLoading || !voiceText.trim()} className="w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-xs text-white disabled:opacity-50">
                    {audioLoading ? "Generating Voice..." : "Generate Voice Preview"}
                  </button>
                </div>
              )}

              {activeTab !== "presets" && activeTab !== "storyboard" && activeTab !== "voice" && (
                <div className="space-y-2 text-xs text-slate-100">
                  <p className={theme.textMute}>Active Module: {activeTab}</p>
                  <Field label="Primary Model" value="Kling 3" />
                  <Field label="Secondary Model" value="Seedance 2" />
                  <Field label="Image Model" value="Nano Banana" />
                  <Field label="Script Model" value="GPT-5.4" />
                </div>
              )}
            </div>
          </aside>
        </div>

        <section className={`rounded-2xl border p-3 backdrop-blur ${theme.panel}`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Job Console</h2>
            <span className={`rounded-md border px-2 py-1 text-[10px] ${theme.badge}`}>Live Mode</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [Clapperboard, "Scene Jobs", `${state.jobs.scene.running} running • ${state.jobs.scene.completedToday} done today`],
              [Mic2, "Audio Jobs", `${state.jobs.audio.running} running • ${state.jobs.audio.completedToday} done today`],
              [Sparkles, "Image Jobs", `${state.jobs.image.running} running • ${state.jobs.image.completedToday} done today`],
              [Gauge, "Render", state.renderQueue > 0 ? `${state.renderQueue} jobs in queue` : "idle"],
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
            {logs.length === 0 ? (
              <p className={`text-xs ${theme.textMute}`}>No runtime logs yet. Start by generating video, image, or voice.</p>
            ) : (
              logs.map((log) => (
                <p key={log} className={`text-xs ${theme.textMute}`}>
                  <Timer className="mr-1 inline h-3 w-3" />
                  {log}
                </p>
              ))
            )}
          </div>
        </section>

        <section className={`rounded-2xl border p-3 ${theme.panel}`}>
          <h2 className="text-sm font-semibold text-white">Model Routing Used In This Page</h2>
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
            <RoutePill icon={<Wand2 className="h-3.5 w-3.5" />} label="Script + QA" value={state.modelRouting.script} />
            <RoutePill icon={<Layers className="h-3.5 w-3.5" />} label="Images" value={state.modelRouting.images} />
            <RoutePill icon={<Film className="h-3.5 w-3.5" />} label="Video" value={state.modelRouting.video} />
            <RoutePill icon={<SlidersHorizontal className="h-3.5 w-3.5" />} label="Voice" value={state.modelRouting.voice} />
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

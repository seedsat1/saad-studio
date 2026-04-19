"use client";

import { useCallback, useRef, useState } from "react";

/* ───────────────────────── static scene data ───────────────────────── */

interface Scene {
  id: string;
  title: string;
  category: string;
  videoSrc: string;
  poster: string;
  hiddenPrompt: string;
}

const CATEGORIES = [
  "All",
  "Cinematic",
  "Action",
  "Luxury",
  "Emotional",
  "Sci-Fi",
  "Nature",
  "Urban",
] as const;

const MODELS = [
  { value: "wan", label: "WAN 2.1" },
  { value: "kling", label: "Kling 2.0" },
  { value: "higgsfield", label: "Higgsfield" },
  { value: "runway", label: "Runway Gen-4" },
  { value: "minimax", label: "MiniMax Video" },
] as const;

const SCENE_MEDIA = [
  { video: "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4", poster: "https://images.pexels.com/videos/3571264/free-video-3571264.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/1526909/1526909-hd_1920_1080_24fps.mp4", poster: "https://images.pexels.com/videos/1526909/free-video-1526909.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4", poster: "https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_30fps.mp4",  poster: "https://images.pexels.com/videos/856973/free-video-856973.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4", poster: "https://images.pexels.com/videos/2491284/free-video-2491284.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4", poster: "https://images.pexels.com/videos/1093662/free-video-1093662.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",  poster: "https://images.pexels.com/videos/857251/free-video-857251.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/3214448/3214448-hd_1920_1080_25fps.mp4", poster: "https://images.pexels.com/videos/3214448/free-video-3214448.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4", poster: "https://images.pexels.com/videos/4763824/free-video-4763824.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/5680034/5680034-hd_1920_1080_24fps.mp4", poster: "https://images.pexels.com/videos/5680034/free-video-5680034.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/3015510/3015510-hd_1920_1080_24fps.mp4", poster: "https://images.pexels.com/videos/3015510/free-video-3015510.jpg?auto=compress&w=640" },
  { video: "https://videos.pexels.com/video-files/2795173/2795173-hd_1920_1080_25fps.mp4", poster: "https://images.pexels.com/videos/2795173/free-video-2795173.jpg?auto=compress&w=640" },
];

const SCENES: Scene[] = [
  {
    id: "s1",
    title: "Golden Hour Chase",
    category: "Cinematic",
    videoSrc: SCENE_MEDIA[0].video,
    poster: SCENE_MEDIA[0].poster,
    hiddenPrompt:
      "A cinematic golden hour car chase through narrow European streets, aerial drone shot, warm light flares, 4K filmic grain, 24fps",
  },
  {
    id: "s2",
    title: "Neon Rain Walk",
    category: "Urban",
    videoSrc: SCENE_MEDIA[1].video,
    poster: SCENE_MEDIA[1].poster,
    hiddenPrompt:
      "A lone figure walking through neon-lit rain-soaked Tokyo streets at midnight, reflections on wet pavement, cyberpunk atmosphere, slow motion",
  },
  {
    id: "s3",
    title: "Ocean Titan",
    category: "Nature",
    videoSrc: SCENE_MEDIA[2].video,
    poster: SCENE_MEDIA[2].poster,
    hiddenPrompt:
      "Massive ocean wave crashing in slow motion, underwater perspective transitioning to above surface, crystal clear turquoise water, 8K cinematic",
  },
  {
    id: "s4",
    title: "Velvet Gala",
    category: "Luxury",
    videoSrc: SCENE_MEDIA[3].video,
    poster: SCENE_MEDIA[3].poster,
    hiddenPrompt:
      "Elegant ballroom gala with crystal chandeliers, slow dolly shot through dancing couples in designer gowns, shallow depth of field, warm amber tones",
  },
  {
    id: "s5",
    title: "Supernova Drift",
    category: "Sci-Fi",
    videoSrc: SCENE_MEDIA[4].video,
    poster: SCENE_MEDIA[4].poster,
    hiddenPrompt:
      "Spaceship drifting past a dying star going supernova, volumetric nebula clouds, lens flare, Interstellar-style visuals, IMAX aspect ratio",
  },
  {
    id: "s6",
    title: "Rooftop Farewell",
    category: "Emotional",
    videoSrc: SCENE_MEDIA[5].video,
    poster: SCENE_MEDIA[5].poster,
    hiddenPrompt:
      "Two silhouettes on a city rooftop at sunset, one walking away, emotional close-up with shallow DOF, warm desaturated color grade, handheld camera",
  },
  {
    id: "s7",
    title: "Bullet Time Clash",
    category: "Action",
    videoSrc: SCENE_MEDIA[6].video,
    poster: SCENE_MEDIA[6].poster,
    hiddenPrompt:
      "Martial arts fight scene frozen in bullet-time, 360-degree camera rotation around mid-air kick, particles suspended, hyper-detailed 4K",
  },
  {
    id: "s8",
    title: "Midnight Yacht",
    category: "Luxury",
    videoSrc: SCENE_MEDIA[7].video,
    poster: SCENE_MEDIA[7].poster,
    hiddenPrompt:
      "Luxury mega-yacht anchored in Mediterranean bay at night, drone circling shot, ambient deck lighting reflecting on calm water, cinematic color grade",
  },
  {
    id: "s9",
    title: "Aurora Borealis Camp",
    category: "Nature",
    videoSrc: SCENE_MEDIA[8].video,
    poster: SCENE_MEDIA[8].poster,
    hiddenPrompt:
      "Time-lapse of northern lights dancing over a campfire in Norwegian wilderness, wide-angle, vivid green and purple aurora, 8K resolution",
  },
  {
    id: "s10",
    title: "Cyberpunk Alley",
    category: "Sci-Fi",
    videoSrc: SCENE_MEDIA[9].video,
    poster: SCENE_MEDIA[9].poster,
    hiddenPrompt:
      "Futuristic cyberpunk alleyway with holographic billboards, steam rising from grates, a hooded figure with glowing cybernetic arm, Blade Runner aesthetic",
  },
  {
    id: "s11",
    title: "Desert Storm Rider",
    category: "Action",
    videoSrc: SCENE_MEDIA[10].video,
    poster: SCENE_MEDIA[10].poster,
    hiddenPrompt:
      "Motorcycle racing through a desert sandstorm, low-angle tracking shot, dust particles catching sunlight, Mad Max style cinematography, 120fps slow-mo",
  },
  {
    id: "s12",
    title: "Last Dance",
    category: "Emotional",
    videoSrc: SCENE_MEDIA[11].video,
    poster: SCENE_MEDIA[11].poster,
    hiddenPrompt:
      "Elderly couple slow dancing alone in an empty vintage ballroom, single spotlight, dust particles floating, deeply emotional, Kodak film look",
  },
];

/* ───────────────────────── category color map ───────────────────────── */

const CAT_COLORS: Record<string, string> = {
  Cinematic: "from-amber-500/80 to-orange-600/80",
  Action: "from-red-500/80 to-rose-600/80",
  Luxury: "from-yellow-400/80 to-amber-500/80",
  Emotional: "from-pink-400/80 to-fuchsia-500/80",
  "Sci-Fi": "from-cyan-400/80 to-blue-500/80",
  Nature: "from-emerald-400/80 to-green-500/80",
  Urban: "from-violet-400/80 to-purple-500/80",
};

/* ───────────────────────── video card component ───────────────────────── */

function SceneCard({
  scene,
  onUse,
}: {
  scene: Scene;
  onUse: (prompt: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleVideoError = useCallback(() => setVideoFailed(true), []);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:scale-[1.025] hover:border-violet-500/20 hover:shadow-[0_0_48px_rgba(139,92,246,0.12)]">
      {/* video preview */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={scene.videoSrc}
            poster={scene.poster}
            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={handleVideoError}
          />
        ) : (
          /* fallback gradient if video fails */
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-slate-900">
            <svg className="h-10 w-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
            </svg>
          </div>
        )}

        {/* gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

        {/* category badge */}
        <span
          className={`absolute left-3 top-3 rounded-full border border-white/10 bg-gradient-to-r ${
            CAT_COLORS[scene.category] ?? "from-slate-400/80 to-slate-500/80"
          } px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md`}
        >
          {scene.category}
        </span>

        {/* play icon overlay on hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <svg className="ml-0.5 h-5 w-5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* card info */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-[15px] font-bold tracking-tight text-white">
          {scene.title}
        </h3>

        <button
          onClick={() => onUse(scene.hiddenPrompt)}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/10 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/30 active:scale-[0.97]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Use this scene
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── main page ───────────────────────── */

export default function NextSceneEnginePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].value);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const filteredScenes =
    activeCategory === "All"
      ? SCENES
      : SCENES.filter((s) => s.category === activeCategory);

  const handleUseScene = (hiddenPrompt: string) => {
    setPrompt(hiddenPrompt);
    promptRef.current?.focus();
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
        <div className="absolute -right-32 top-60 h-[400px] w-[400px] rounded-full bg-indigo-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ─── header ─── */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs font-medium tracking-widest text-violet-300/80 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            AI-POWERED VIDEO ENGINE
          </div>
          <h1 className="bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Next Scene Engine
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-400">
            Craft cinematic scenes with AI. Pick a template, refine your prompt,
            and generate studio-quality video in seconds.
          </p>
        </div>

        {/* ─── prompt area ─── */}
        <div className="mx-auto mb-12 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] shadow-2xl shadow-black/20 backdrop-blur-xl">
            {/* textarea */}
            <textarea
              ref={promptRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your scene — or pick one below…"
              className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm leading-relaxed text-white/90 placeholder-slate-500 outline-none"
            />

            {/* bottom bar */}
            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] px-5 py-3">
              {/* model selector */}
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-8 text-xs font-medium text-white/80 outline-none transition hover:border-white/[0.15] focus:border-violet-500/40"
                >
                  {MODELS.map((m) => (
                    <option
                      key={m.value}
                      value={m.value}
                      className="bg-[#0b1730] text-slate-100"
                    >
                      {m.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* spacer */}
              <div className="flex-1" />

              {/* generate button — disabled until API connected */}
              <div className="group/gen relative">
                <button
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600/50 to-indigo-600/50 px-5 py-2 text-sm font-semibold text-white/50 shadow-lg shadow-violet-500/10"
                  disabled
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Generate
                </button>
                {/* coming soon tooltip */}
                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-3 py-1 text-[11px] font-medium text-violet-300 opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-200 group-hover/gen:opacity-100">
                  Coming soon
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-black/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── category filter ─── */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide transition-all duration-300 ${
                activeCategory === cat
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:text-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ─── scene grid ─── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredScenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} onUse={handleUseScene} />
          ))}
        </div>

        {filteredScenes.length === 0 && (
          <div className="py-20 text-center text-sm text-slate-500">
            No scenes in this category yet.
          </div>
        )}

        {/* ─── footer note ─── */}
        <p className="mt-16 text-center text-xs text-slate-600">
          Scene previews are placeholders. Generation will be connected in a
          future update.
        </p>
      </div>
    </div>
  );
}
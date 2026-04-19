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
  { value: "kling", label: "Kling 3.0" },
  { value: "seedance", label: "Seedance 2.0" },
  { value: "minimax", label: "Minimax Hailuo 2.3" },
] as const;

const MODEL_DURATIONS: Record<string, { value: number; label: string }[]> = {
  kling:    [{ value: 5, label: "5s" }, { value: 10, label: "10s" }],
  seedance: [{ value: 4, label: "4s" }, { value: 8, label: "8s" }],
  minimax:  [{ value: 6, label: "6s" }],
};

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
      "Cinematic chase scene through narrow European cobblestone streets during golden hour. Aerial drone tracking shot following a black sports car at high speed. Warm amber light flares streaming between buildings, motion blur on background, dramatic pacing with quick cuts. Handheld camera energy, anamorphic lens distortion, 4K filmic grain, 24fps, color graded with warm orange highlights and deep teal shadows, Deakins-style cinematography.",
  },
  {
    id: "s2",
    title: "Neon Rain Walk",
    category: "Urban",
    videoSrc: SCENE_MEDIA[1].video,
    poster: SCENE_MEDIA[1].poster,
    hiddenPrompt:
      "Night scene set in rain-soaked Tokyo backstreets. A lone figure in a long dark coat walks slowly through neon-lit alleyways. Vivid pink, cyan, and purple neon reflections shimmer on wet asphalt. Slow cinematic walk, moody low-key lighting, cyberpunk atmosphere. Shot on anamorphic lens with shallow depth of field, volumetric rain particles, steam rising from street vents. Film noir meets Blade Runner aesthetic, 4K, 24fps.",
  },
  {
    id: "s3",
    title: "Ocean Titan",
    category: "Nature",
    videoSrc: SCENE_MEDIA[2].video,
    poster: SCENE_MEDIA[2].poster,
    hiddenPrompt:
      "Massive 60-foot ocean wave building and crashing in ultra slow motion. Camera starts underwater looking up through crystal-clear turquoise water, then breaches the surface as the wave curls overhead. Sunlight refracts through the translucent wave lip creating prismatic light rays. Captured at 240fps, 8K cinematic resolution, IMAX aspect ratio. Sound design: deep rumbling bass with ethereal underwater ambience transitioning to thunderous crash.",
  },
  {
    id: "s4",
    title: "Velvet Gala",
    category: "Luxury",
    videoSrc: SCENE_MEDIA[3].video,
    poster: SCENE_MEDIA[3].poster,
    hiddenPrompt:
      "Elegant black-tie gala in a grand Venetian ballroom. Slow dolly shot gliding through dancing couples in haute couture gowns and tailored tuxedos. Enormous crystal chandeliers cast warm amber light across marble floors. Shallow depth of field with creamy bokeh, champagne glasses catching light in foreground. Rich warm color palette — deep burgundy, gold, ivory. Shot on 65mm film with subtle grain, Kubrick-inspired symmetrical framing.",
  },
  {
    id: "s5",
    title: "Supernova Drift",
    category: "Sci-Fi",
    videoSrc: SCENE_MEDIA[4].video,
    poster: SCENE_MEDIA[4].poster,
    hiddenPrompt:
      "A lone spacecraft drifts silently past a dying star on the edge of supernova collapse. Massive volumetric nebula clouds of crimson and violet swirl around the stellar core. Intense lens flare from the star's surface, god rays piercing through gas clouds. Interior cockpit reflections visible on the ship's hull. Interstellar and 2001: A Space Odyssey visual language, IMAX 1.43:1 aspect ratio, photorealistic VFX, Hans Zimmer-style score implied through visual tension.",
  },
  {
    id: "s6",
    title: "Rooftop Farewell",
    category: "Emotional",
    videoSrc: SCENE_MEDIA[5].video,
    poster: SCENE_MEDIA[5].poster,
    hiddenPrompt:
      "Two silhouettes standing on a city rooftop at golden hour sunset. One figure slowly turns and walks away while the other remains still. Emotional close-up on trembling hands letting go, then a wide shot showing the vast city skyline. Shallow depth of field, warm desaturated color grade with lifted blacks. Handheld camera with subtle movement, lens breathing effect. Inspired by Wong Kar-wai's visual poetry — melancholic, intimate, deeply human.",
  },
  {
    id: "s7",
    title: "Bullet Time Clash",
    category: "Action",
    videoSrc: SCENE_MEDIA[6].video,
    poster: SCENE_MEDIA[6].poster,
    hiddenPrompt:
      "Martial arts fight scene frozen in bullet-time. 360-degree camera rotation around a warrior executing a mid-air spinning kick. Sweat droplets and shattered glass particles suspended in the air, each catching light individually. Hyper-detailed muscle tension visible, fabric rippling in slow motion. Shot at 1000fps equivalent, 4K resolution, dramatic rim lighting from behind. Matrix-meets-John Wick choreography with precise, brutal elegance.",
  },
  {
    id: "s8",
    title: "Midnight Yacht",
    category: "Luxury",
    videoSrc: SCENE_MEDIA[7].video,
    poster: SCENE_MEDIA[7].poster,
    hiddenPrompt:
      "Luxury 200-foot mega-yacht anchored in a secluded Mediterranean bay under a star-filled sky. Smooth drone circling shot starting from water level, rising to reveal the full vessel. Warm amber deck lighting reflects on perfectly calm dark water. Interior glimpses through panoramic windows show a lavish lounge. Moonlight creates a silver path on the sea surface. Cinematic color grade — deep navy blues, warm golds, cool silvers. Shot in 6K with gimbal stabilization.",
  },
  {
    id: "s9",
    title: "Aurora Borealis Camp",
    category: "Nature",
    videoSrc: SCENE_MEDIA[8].video,
    poster: SCENE_MEDIA[8].poster,
    hiddenPrompt:
      "Breathtaking time-lapse of the northern lights dancing across the Arctic sky above a remote wilderness campsite. A warm campfire crackles in the foreground casting orange light on snow-covered pine trees. Vivid green, purple, and pink aurora curtains ripple and fold across the star-filled sky. Ultra-wide 14mm lens perspective, 8K resolution, 6-hour time-lapse compressed to 10 seconds. Foreground perfectly sharp with deep depth of field, Milky Way visible between aurora waves.",
  },
  {
    id: "s10",
    title: "Cyberpunk Alley",
    category: "Sci-Fi",
    videoSrc: SCENE_MEDIA[9].video,
    poster: SCENE_MEDIA[9].poster,
    hiddenPrompt:
      "Futuristic cyberpunk back-alley in a sprawling megacity, year 2089. Holographic billboards flicker with advertisements in Japanese and Arabic script. Dense steam rises from grated vents, diffusing neon light into volumetric haze. A hooded figure with a glowing cybernetic arm walks through frame, face obscured. Flying drones buzz overhead. Blade Runner 2049 color palette — deep orange, teal, magenta. Anamorphic widescreen, rain-slicked surfaces reflecting every light source, 4K.",
  },
  {
    id: "s11",
    title: "Desert Storm Rider",
    category: "Action",
    videoSrc: SCENE_MEDIA[10].video,
    poster: SCENE_MEDIA[10].poster,
    hiddenPrompt:
      "Lone motorcycle rider racing at full speed through a massive desert sandstorm. Low-angle tracking shot from ground level, sand particles blasting past the camera catching harsh sunlight. Rider in weathered leather gear, goggles reflecting the orange sky. Dramatic dust plume trails behind. Mad Max: Fury Road inspired cinematography — bleach bypass look, crushed blacks, blown-out highlights. Shot at 120fps for dramatic slow-motion moments, intercutting with real-time speed bursts.",
  },
  {
    id: "s12",
    title: "Last Dance",
    category: "Emotional",
    videoSrc: SCENE_MEDIA[11].video,
    poster: SCENE_MEDIA[11].poster,
    hiddenPrompt:
      "An elderly couple slow dancing alone in a vast empty vintage ballroom. A single warm spotlight illuminates them from above while the rest of the grand space fades into soft darkness. Dust particles float through the light beam like tiny stars. Her head rests on his shoulder, his weathered hand gently holds hers. Shot on vintage Kodak 5219 film stock with natural grain. Camera slowly orbits them in a gentle arc. Deeply emotional, timeless, celebrating a lifetime of love in a single unbroken take.",
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

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function NextSceneEnginePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].value);
  const [duration, setDuration] = useState<number>(MODEL_DURATIONS[MODELS[0].value][0].value);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [promptHighlight, setPromptHighlight] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const availableDurations = MODEL_DURATIONS[selectedModel] ?? MODEL_DURATIONS.kling;

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    const durations = MODEL_DURATIONS[model] ?? MODEL_DURATIONS.kling;
    setDuration((prev) => {
      if (durations.some((d) => d.value === prev)) return prev;
      return durations[0].value;
    });
  }, []);

  const filteredScenes =
    activeCategory === "All"
      ? SCENES
      : SCENES.filter((s) => s.category === activeCategory);

  /* ── image helpers ── */
  const processFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    if (file.size > MAX_SIZE) return;
    if (uploadedImage) URL.revokeObjectURL(uploadedImage.preview);
    setUploadedImage({ file, preview: URL.createObjectURL(file) });
  }, [uploadedImage]);

  const removeImage = useCallback(() => {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage.preview);
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadedImage]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  /* ── scene selection (keeps uploaded image) ── */
  const handleUseScene = useCallback((hiddenPrompt: string) => {
    setPrompt(hiddenPrompt);
    setPromptHighlight(true);
    promptBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(hiddenPrompt.length, hiddenPrompt.length);
    }, 400);
    setTimeout(() => setPromptHighlight(false), 1500);
  }, []);

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
          <div
            ref={promptBoxRef}
            className={`overflow-hidden rounded-2xl border bg-white/[0.03] shadow-2xl backdrop-blur-xl transition-all duration-700 ${
              promptHighlight
                ? "border-violet-500/40 shadow-[0_0_32px_rgba(139,92,246,0.2)]"
                : "border-white/[0.06] shadow-black/20"
            }`}
          >
            {/* textarea */}
            <textarea
              ref={promptRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your scene — or pick one below…"
              className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm leading-relaxed text-white/90 placeholder-slate-500 outline-none"
            />

            {/* ── image upload zone ── */}
            <div className="px-5 pb-3">
              {!uploadedImage ? (
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group/upload flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition-all duration-300 ${
                    isDragging
                      ? "border-violet-400/60 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 hover:bg-violet-500/[0.04] hover:shadow-[0_0_16px_rgba(139,92,246,0.06)]"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                    isDragging ? "bg-violet-500/20" : "bg-white/[0.04] group-hover/upload:bg-violet-500/10"
                  }`}>
                    <svg className={`h-4.5 w-4.5 transition-colors duration-300 ${isDragging ? "text-violet-300" : "text-slate-500 group-hover/upload:text-violet-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.068 2.068M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium transition-colors duration-300 ${isDragging ? "text-violet-300" : "text-slate-400 group-hover/upload:text-slate-300"}`}>
                      {isDragging ? "Drop image here" : "Upload a reference image"}
                    </p>
                    <p className="text-[10px] text-slate-600">JPG, PNG, WebP — max 10 MB</p>
                  </div>
                </div>
              ) : (
                /* ── uploaded image preview ── */
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImage.preview}
                      alt="Upload preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80">{uploadedImage.file.name}</p>
                    <p className="text-[10px] text-slate-500">{(uploadedImage.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-500 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                    title="Remove image"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* bottom bar */}
            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] px-5 py-3">
              {/* model selector */}
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
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

              {/* duration selector */}
              <div className="flex items-center gap-1">
                {availableDurations.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      duration === d.value
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                        : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-white/[0.12] hover:text-slate-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
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
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SimpleToast from "../../../../components/SimpleToast";
import { useGenerationGate } from "@/hooks/use-generation-gate";

/* ───────────────────────── static scene data ───────────────────────── */

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  videoSrc: string;
  poster: string;
  hiddenPrompt: string;
}

const CATEGORIES = [
  "All",
  "Emotion",
  "Tension",
  "Reveal",
  "Framing",
  "Narrative",
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
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
  { video: "", poster: "" },
];

const SCENES: Scene[] = [
  {
    id: "s1",
    title: "Reaction Shot",
    subtitle: "Capture a character's immediate emotional response",
    category: "Emotion",
    videoSrc: SCENE_MEDIA[0].video,
    poster: SCENE_MEDIA[0].poster,
    hiddenPrompt:
      "Tight medium close-up of a person's face reacting to unexpected news. Eyes widen subtly, jaw tightens, a micro-expression shifts from composure to shock. Shallow depth of field isolates the face against a soft bokeh background. Natural side lighting from a window casts gentle shadows across features. Handheld camera with minimal breathing movement, Kodak 5219 film stock warmth, intimate and psychologically revealing. 24fps, aspect ratio 2.39:1.",
  },
  {
    id: "s2",
    title: "Close-up Emotion",
    subtitle: "An extreme intimate look at raw vulnerability",
    category: "Emotion",
    videoSrc: SCENE_MEDIA[1].video,
    poster: SCENE_MEDIA[1].poster,
    hiddenPrompt:
      "Extreme close-up on a person's eyes filling with tears, a single tear rolling down their cheek catching the light. Camera holds completely still on a tripod, the stillness amplifying the vulnerability. Soft diffused golden-hour light from the left, rest of the face slightly in shadow. Macro lens detail \u2014 every eyelash visible, skin texture photorealistic. Sound design implies silence broken only by a shaky breath. Deeply emotional, Wong Kar-wai inspired color palette, 4K.",
  },
  {
    id: "s3",
    title: "Wide Establishing",
    subtitle: "Set the world, scale, and geography of the scene",
    category: "Framing",
    videoSrc: SCENE_MEDIA[2].video,
    poster: SCENE_MEDIA[2].poster,
    hiddenPrompt:
      "Sweeping aerial establishing shot slowly revealing a vast landscape at dawn. Camera starts tight on mist-covered treetops then pulls back and rises to unveil an entire city or environment below. Volumetric god rays pierce through morning clouds. Ultra-wide 14mm perspective, 8K resolution, perfectly smooth gimbal movement. Color grade shifts from cool pre-dawn blues to warm golden tones as the sun crests the horizon. Sets the stage for everything that follows.",
  },
  {
    id: "s4",
    title: "Over-the-Shoulder",
    subtitle: "Lock the viewer inside a tense conversation",
    category: "Tension",
    videoSrc: SCENE_MEDIA[3].video,
    poster: SCENE_MEDIA[3].poster,
    hiddenPrompt:
      "Over-the-shoulder shot from behind one character looking at another during a tense exchange. The foreground shoulder and head are slightly out of focus, framing the sharp face of the person being addressed. Eye-level camera, 85mm lens compression creating intimacy and claustrophobia. Subtle rack focus between the two characters during pauses. Moody low-key lighting with a single practical source. The power dynamic is implied through framing — who is larger in frame dominates the moment. Cinematic 2.39:1.",
  },
  {
    id: "s5",
    title: "Follow Tracking",
    subtitle: "Steadicam movement trailing a character through space",
    category: "Framing",
    videoSrc: SCENE_MEDIA[4].video,
    poster: SCENE_MEDIA[4].poster,
    hiddenPrompt:
      "Steadicam tracking shot following a character from behind as they walk purposefully through a long corridor or street. Camera maintains consistent distance, floating smoothly at shoulder height. The environment tells the story — walls, light, passing figures all add context. Perspective creates leading lines drawing the eye forward. Atmospheric haze or dust particles catch cross-light. Kubrick one-point perspective composition, 35mm focal length, 4K, 24fps, building anticipation with every step.",
  },
  {
    id: "s6",
    title: "Push-In Reveal",
    subtitle: "A slow dolly forward uncovering critical information",
    category: "Reveal",
    videoSrc: SCENE_MEDIA[5].video,
    poster: SCENE_MEDIA[5].poster,
    hiddenPrompt:
      "Slow deliberate dolly push-in toward an object, document, or screen that holds crucial information. Camera starts from a medium-wide framing the surrounding environment, then creeps forward over 8 seconds until the key detail fills the frame. Rack focus transition from background context to foreground subject. Tension builds through pacing alone — no dialogue needed. Low ambient lighting with a single pool of light on the reveal point. Hitchcock-inspired suspense framing, 4K, 24fps.",
  },
  {
    id: "s7",
    title: "Conflict Escalation",
    subtitle: "Raise the stakes through rapid cutting and tension",
    category: "Tension",
    videoSrc: SCENE_MEDIA[6].video,
    poster: SCENE_MEDIA[6].poster,
    hiddenPrompt:
      "Two figures face each other across a table or narrow space, tension escalating. Quick cutting between tight close-ups — clenched fist, narrowing eyes, a hand reaching slowly. Camera angles become increasingly Dutch-tilted as conflict builds. Lighting shifts from balanced to harsh single-source, casting deep shadows. Sound design implies rising tension through low frequency drone. Editing rhythm accelerates from 3-second cuts to 1-second cuts. Inspired by Michael Mann and Denis Villeneuve confrontation scenes. 4K, anamorphic.",
  },
  {
    id: "s8",
    title: "Discovery Moment",
    subtitle: "The character encounters something unexpected",
    category: "Reveal",
    videoSrc: SCENE_MEDIA[7].video,
    poster: SCENE_MEDIA[7].poster,
    hiddenPrompt:
      "A character rounds a corner or opens a door and freezes — their expression shifts as they process what they see. Camera captures their face in a slow push-in, then reverses to reveal what they're looking at from their POV. The cut between their reaction and the discovery creates dramatic weight. Spielberg-inspired sense of wonder or dread depending on lighting — warm uplighting for awe, cold toplight for horror. Musical score swell implied through visual pacing. 4K, 2.39:1, shallow depth of field.",
  },
  {
    id: "s9",
    title: "Silhouette Framing",
    subtitle: "Define a character through shape and negative space",
    category: "Framing",
    videoSrc: SCENE_MEDIA[8].video,
    poster: SCENE_MEDIA[8].poster,
    hiddenPrompt:
      "A lone figure stands in a doorway or window frame, their body rendered as a dark silhouette against a bright backlit source — sunset, neon, or a stark white room. The composition is perfectly symmetrical, the character defined entirely by posture and outline rather than facial detail. Negative space dominates the frame, conveying isolation or resolve. Strong rim lighting traces the edges of hair and shoulders. Shot on anamorphic lens, 4K, 24fps, deep shadows with no fill, inspired by Roger Deakins' silhouette work.",
  },
  {
    id: "s10",
    title: "Dolly Zoom Tension",
    subtitle: "Vertigo effect — background shifts while subject stays fixed",
    category: "Tension",
    videoSrc: SCENE_MEDIA[9].video,
    poster: SCENE_MEDIA[9].poster,
    hiddenPrompt:
      "Dolly zoom (Vertigo effect) on a character's face as they experience a sudden realization or dread. Camera dollies backward while zooming in simultaneously, keeping the subject the same size while the background warps and stretches unnervingly. The spatial distortion creates a visceral feeling of psychological unease. Character frozen mid-expression, eyes locked on something off-screen. Hitchcock and Spielberg signature technique, dramatic single-source lighting, 4K, 24fps, 2.39:1 widescreen.",
  },
  {
    id: "s11",
    title: "Slow Motion Emphasis",
    subtitle: "Stretch a pivotal moment to amplify its weight",
    category: "Narrative",
    videoSrc: SCENE_MEDIA[10].video,
    poster: SCENE_MEDIA[10].poster,
    hiddenPrompt:
      "A key story moment captured in dramatic slow motion at 120fps. A hand reaching out, a glass shattering, a figure turning to look back, or feet lifting off the ground. Every micro-detail is amplified — fabric ripples, light particles drift, hair moves in slow waves. The deceleration signals narrative importance, telling the audience this moment matters. Shallow depth of field, warm rim lighting, controlled color grade emphasizing a single dominant hue. Cinematic 4K, 2.39:1 aspect ratio, Zack Snyder and Christopher Nolan-inspired temporal manipulation.",
  },
  {
    id: "s12",
    title: "Final Beat",
    subtitle: "The last image that lingers after the cut",
    category: "Narrative",
    videoSrc: SCENE_MEDIA[11].video,
    poster: SCENE_MEDIA[11].poster,
    hiddenPrompt:
      "The closing shot of a sequence — camera slowly pulls back from the character as they stand alone in a vast space. Or a slow fade as a door closes, a light goes out, a figure disappears around a corner. The visual rhythm decelerates, cuts become longer, the world expands. Color grade cools or warms to signal emotional resolution. This is the last image the audience holds — make it resonate. Slow crane-up or dolly-back, 4K, 24fps, 2.39:1 widescreen, deeply cinematic closure.",
  },
];

/* ───────────────────────── category color map ───────────────────────── */

const CAT_COLORS: Record<string, string> = {
  Emotion:   "from-pink-400/80 to-rose-500/80",
  Tension:   "from-red-500/80 to-rose-600/80",
  Reveal:    "from-violet-400/80 to-purple-500/80",
  Framing:   "from-cyan-400/80 to-blue-500/80",
  Narrative: "from-amber-500/80 to-orange-600/80",
};

/* ───────────────────────── video card component ───────────────────────── */

function SceneCard({
  scene,
  onUse,
  activeId,
  setActiveId,
}: {
  scene: Scene;
  onUse: (prompt: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleVideoError = useCallback(() => setVideoFailed(true), []);

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:scale-[1.025] hover:border-violet-500/20 hover:shadow-[0_0_48px_rgba(139,92,246,0.12)] ${activeId===scene.id ? "ring-2 ring-violet-400/60" : ""}`}>
      {/* video preview */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
        {!videoFailed && scene.videoSrc ? (
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
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[15px] font-bold tracking-tight text-white">
          {scene.title}
        </h3>
        <p className="text-[12px] leading-relaxed text-slate-400">
          {scene.subtitle}
        </p>

        <button
          onClick={() => {
            setActiveId(scene.id);
            onUse(scene.hiddenPrompt);
            setTimeout(() => setActiveId(null), 600);
          }}
          className={`mt-auto flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/10 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/30 active:scale-[0.97] ${activeId===scene.id ? "scale-95 bg-violet-700/90" : ""}`}
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

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", icon: "▭" },
  { value: "9:16", label: "9:16", icon: "▯" },
  { value: "1:1",  label: "1:1",  icon: "□" },
  { value: "4:3",  label: "4:3",  icon: "▭" },
  { value: "21:9", label: "21:9", icon: "━" },
] as const;

const QUALITY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "high",     label: "High" },
] as const;

async function uploadImageToStorage(file: File): Promise<string> {
  const signRes = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });

  const signJson = await signRes.json().catch(() => ({})) as {
    signedUrl?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!signRes.ok || !signJson.signedUrl || !signJson.publicUrl) {
    throw new Error(signJson.error || "Failed to prepare image upload");
  }

  const uploadRes = await fetch(signJson.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image");
  }

  return signJson.publicUrl;
}

export default function NextSceneEnginePage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
    const [toast, setToast] = useState("");
    const [activeSceneId, setActiveSceneId] = useState<string|null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].value);
  const [duration, setDuration] = useState<number>(MODEL_DURATIONS[MODELS[0].value][0].value);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [quality, setQuality] = useState<string>("standard");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [promptHighlight, setPromptHighlight] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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
    // Smooth scroll to prompt
    promptBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(hiddenPrompt.length, hiddenPrompt.length);
    }, 400);
    setTimeout(() => setPromptHighlight(false), 1500);
    setToast("Scene applied");
  }, []);

  /* ── model route map ── */
  const MODEL_ROUTE_MAP: Record<string, { t2v: string; i2v: string }> = {
    // Use route keys recognized by /api/video (KIE-first, stable mappings)
    kling:    { t2v: "kwaivgi/kling-v3.0-pro/text-to-video", i2v: "kwaivgi/kling-v3.0-pro/text-to-video" },
    seedance: { t2v: "bytedance/seedance-v2/text-to-video",  i2v: "bytedance/seedance-v2/text-to-video" },
    minimax:  { t2v: "kling/v2-5-turbo-text-to-video-pro",   i2v: "minimax/hailuo-2.3/i2v-pro" },
  };

  /* ── generate ── */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    const gate = await guardGeneration({
      requiredCredits: 6,
      action: "cinema-studio:video",
    });
    if (!gate.ok) {
      if (gate.reason === "error") setToast(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }

    setGenerating(true);
    setResultUrl(null);
    setToast("");

    try {
      let imageUrl: string | undefined;
      if (uploadedImage) {
        imageUrl = await uploadImageToStorage(uploadedImage.file);
      }

      const routes = MODEL_ROUTE_MAP[selectedModel] ?? MODEL_ROUTE_MAP.kling;
      const modelRoute = imageUrl ? routes.i2v : routes.t2v;

      const body: Record<string, unknown> = {
        modelRoute,
        payload: {
          prompt: prompt.trim(),
          duration,
          aspect_ratio: aspectRatio,
          resolution: quality === "high" ? "1080p" : "720p",
          ...(imageUrl ? { image_url: imageUrl } : {}),
        },
      };

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const json = await res.json() as { taskId?: string; outputs?: string[]; videoUrl?: string };

      if (json.videoUrl) {
        setResultUrl(json.videoUrl);
        setToast("Video ready!");
        return;
      }

      if (json.taskId) {
        // Persist taskId so we can resume polling after page refresh
        try {
          localStorage.setItem("ff_cinema_pending_job", JSON.stringify({
            taskId: json.taskId,
            startedAt: Date.now(),
            prompt: prompt.trim(),
            modelRoute,
          }));
        } catch {}
        // poll
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const poll = await fetch(`/api/video?taskId=${encodeURIComponent(json.taskId)}`, { cache: "no-store" });
          const p = await poll.json() as { status?: string; outputs?: string[]; videoUrl?: string };
          if (p.status === "completed" || p.videoUrl) {
            const url = p.videoUrl || p.outputs?.[0];
            if (url) { setResultUrl(url); setToast("Video ready!"); try { localStorage.removeItem("ff_cinema_pending_job"); } catch {} ; return; }
          }
          if (p.status === "failed") { try { localStorage.removeItem("ff_cinema_pending_job"); } catch {} ; throw new Error("Generation failed."); }
        }
        try { localStorage.removeItem("ff_cinema_pending_job"); } catch {}
        throw new Error("Timed out.");
      }
    } catch (err) {
      setToast(getSafeErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating, guardGeneration, getSafeErrorMessage, uploadedImage, selectedModel, duration, aspectRatio, quality]);

  // Resume in-flight cinema-studio video generation interrupted by a page refresh.
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem("ff_cinema_pending_job");
      if (!raw) return;
      const saved = JSON.parse(raw) as { taskId: string; startedAt: number; prompt: string; modelRoute: string };
      if (!saved || !saved.taskId) { localStorage.removeItem("ff_cinema_pending_job"); return; }
      if (Date.now() - saved.startedAt > 15 * 60 * 1000) { localStorage.removeItem("ff_cinema_pending_job"); return; }
      setGenerating(true);
      setResultUrl(null);
      (async () => {
        for (let i = 0; i < 90 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          if (cancelled) return;
          try {
            const poll = await fetch(`/api/video?taskId=${encodeURIComponent(saved.taskId)}`, { cache: "no-store" });
            const p = await poll.json() as { status?: string; outputs?: string[]; videoUrl?: string };
            if (p.status === "completed" || p.videoUrl) {
              const url = p.videoUrl || p.outputs?.[0];
              if (url) {
                if (cancelled) return;
                setResultUrl(url);
                setToast("Video ready!");
                try { localStorage.removeItem("ff_cinema_pending_job"); } catch {}
                setGenerating(false);
                return;
              }
            }
            if (p.status === "failed") {
              if (cancelled) return;
              setToast("Generation failed.");
              try { localStorage.removeItem("ff_cinema_pending_job"); } catch {}
              setGenerating(false);
              return;
            }
          } catch { /* keep polling */ }
        }
        if (!cancelled) {
          setToast("Timed out.");
          try { localStorage.removeItem("ff_cinema_pending_job"); } catch {}
          setGenerating(false);
        }
      })();
    } catch { /* ignore */ }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <div className="relative">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-8 text-xs font-medium text-white/80 outline-none transition hover:border-white/[0.15] focus:border-violet-500/40"
                >
                  {availableDurations.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[#0b1730] text-slate-100">
                      {d.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* aspect ratio */}
              <div className="relative">
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-8 text-xs font-medium text-white/80 outline-none transition hover:border-white/[0.15] focus:border-violet-500/40"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.value} value={ar.value} className="bg-[#0b1730] text-slate-100">
                      {ar.icon} {ar.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* quality */}
              <div className="relative">
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-3 pr-8 text-xs font-medium text-white/80 outline-none transition hover:border-white/[0.15] focus:border-violet-500/40"
                >
                  {QUALITY_OPTIONS.map((q) => (
                    <option key={q.value} value={q.value} className="bg-[#0b1730] text-slate-100">
                      {q.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* spacer */}
              <div className="flex-1" />

              {/* generate button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                  !prompt.trim() || generating
                    ? "cursor-not-allowed bg-gradient-to-r from-violet-600/40 to-indigo-600/40 text-white/40"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 active:scale-95"
                }`}
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── result ─── */}
        {resultUrl && (
          <div className="mx-auto mb-12 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl">
            <video
              src={resultUrl}
              controls
              autoPlay
              loop
              className="w-full"
              playsInline
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-400">Generated video</span>
              <a
                href={resultUrl}
                download
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>
        )}

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
            <SceneCard key={scene.id} scene={scene} onUse={handleUseScene} activeId={activeSceneId} setActiveId={setActiveSceneId} />
          ))}
          <SimpleToast message={toast} show={!!toast} onHide={() => setToast("")} />
        </div>

        {filteredScenes.length === 0 && (
          <div className="py-20 text-center text-sm text-slate-500">
            No scenes in this category yet.
          </div>
        )}

        {/* ─── footer note ─── */}
        <p className="mt-16 text-center text-xs text-slate-600">
          Pick a scene below to pre-fill the prompt, then press Generate.
        </p>
      </div>
    </div>
  );
}

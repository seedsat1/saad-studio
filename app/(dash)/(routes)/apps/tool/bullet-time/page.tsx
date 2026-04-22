"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Camera,
  Clapperboard,
  Film,
  Gauge,
  Lightbulb,
  Loader2,
  Mic2,
  MonitorPlay,
  Pause,
  Play,
  Sparkles,
  Timer,
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

type TimelineTrack = "V1" | "A1" | "A2" | "SFX" | "TXT";

interface TimelineClip {
  id: string;
  track: TimelineTrack;
  title: string;
  startSec: number;
  durationSec: number;
  colorClass: string;
  sourceUrl?: string;
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

const INITIAL_SCENES: Scene[] = [
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

const WRITING_PRESETS = [
  {
    id: "cinema",
    label: "Cinematic Narrative",
    template:
      "Write a cinematic scene with strong emotional arc. Include location, character goal, conflict, and visual mood. End with a transition cue.",
  },
  {
    id: "news",
    label: "News Report",
    template:
      "Write a newsroom script: headline, key facts, on-location quote, and anchor outro. Tone: professional and urgent.",
  },
  {
    id: "drama",
    label: "Emotional Drama",
    template:
      "Write a dramatic dialogue scene between two characters with hidden tension, one reveal, and a cliffhanger ending.",
  },
  {
    id: "trailer",
    label: "Trailer Voiceover",
    template:
      "Write a trailer voiceover in 6 short beats with escalating stakes and one memorable closing line.",
  },
] as const;

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

const GENERATION_MODES = [
  { value: "single", label: "Single Shot" },
  { value: "multi", label: "Multi-shot" },
] as const;

const DURATION_OPTIONS = [5, 8, 10, 15] as const;
const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"] as const;
const QUALITY_OPTIONS = [
  { value: "std", label: "Standard" },
  { value: "pro", label: "Pro" },
] as const;

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
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(INITIAL_SCENES[0].id);
  const [activeTab, setActiveTab] = useState<InspectorTab>("presets");
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0]);
  const [selectedWritingPreset, setSelectedWritingPreset] = useState<(typeof WRITING_PRESETS)[number]["id"]>(WRITING_PRESETS[0].id);
  const [scriptText, setScriptText] = useState<string>(WRITING_PRESETS[0].template);
  const [newSceneTitle, setNewSceneTitle] = useState<string>("");

  const [state, setState] = useState<StudioState>(FALLBACK_STATE);
  const [prompt, setPrompt] = useState("A dramatic cinematic shot of a reporter walking through a rainy neon street at night.");
  const [multiShotText, setMultiShotText] = useState("Wide establishing shot - 4\nMedium tracking shot with character movement - 4");
  const [voiceText, setVoiceText] = useState("Breaking news update from Saad Studio. Live broadcast begins now.");
  const [videoRoute, setVideoRoute] = useState(VIDEO_ROUTES[0].value);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].value);
  const [generationMode, setGenerationMode] = useState<(typeof GENERATION_MODES)[number]["value"]>("single");
  const [duration, setDuration] = useState<(typeof DURATION_OPTIONS)[number]>(5);
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIO_OPTIONS)[number]>("16:9");
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]["value"]>("pro");
  const [referenceImages, setReferenceImages] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [referenceVideoUrlsText, setReferenceVideoUrlsText] = useState("");

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [sfxUrl, setSfxUrl] = useState<string | null>(null);
  const [clonedVoiceUrl, setClonedVoiceUrl] = useState<string | null>(null);

  const [videoLoading, setVideoLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [sfxLoading, setSfxLoading] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [musicPrompt, setMusicPrompt] = useState("cinematic orchestral soundtrack, emotional, modern trailer");
  const [sfxPrompt, setSfxPrompt] = useState("heavy whoosh transition and cinematic impact hit");
  const [cloneName, setCloneName] = useState("Studio Voice Clone");
  const [cloneSampleDataUrl, setCloneSampleDataUrl] = useState<string>("");
  const [cloneSampleName, setCloneSampleName] = useState<string>("");
  const [mixPlaying, setMixPlaying] = useState(false);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const clonedVoiceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const imageRefInput = useRef<HTMLInputElement | null>(null);
  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);

  const theme = STUDIO_THEMES[themeKey];
  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0],
    [selectedSceneId, scenes]
  );
  const timelineTracks = useMemo<TimelineTrack[]>(() => ["V1", "A1", "A2", "SFX", "TXT"], []);
  const pxPerSec = 26;
  const timelineTotalSec = useMemo(
    () => Math.max(60, Math.ceil(Math.max(...timelineClips.map((c) => c.startSec + c.durationSec), 0) + 10)),
    [timelineClips]
  );
  const selectedClip = useMemo(
    () => timelineClips.find((clip) => clip.id === selectedClipId) ?? null,
    [timelineClips, selectedClipId]
  );
  const isKlingRoute = useMemo(
    () => videoRoute === "kwaivgi/kling-v3.0-pro/text-to-video",
    [videoRoute]
  );
  const isSeedanceRoute = useMemo(
    () =>
      videoRoute === "bytedance/seedance-v2/text-to-video" ||
      videoRoute === "bytedance/seedance-v2/text-to-video-fast",
    [videoRoute]
  );
  const isSeedanceFastRoute = useMemo(
    () => videoRoute === "bytedance/seedance-v2/text-to-video-fast",
    [videoRoute]
  );
  const supportedAspectRatios = useMemo<(typeof ASPECT_RATIO_OPTIONS)[number][]>(() => {
    if (isKlingRoute) return ["16:9", "9:16", "1:1"];
    if (isSeedanceRoute) return ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "adaptive"];
    return [...ASPECT_RATIO_OPTIONS];
  }, [isKlingRoute, isSeedanceRoute]);
  const refLimits = useMemo(() => {
    if (isKlingRoute) {
      return {
        maxImageRefs: generationMode === "multi" ? 1 : 2,
        maxVideoRefs: 0,
        label: generationMode === "multi" ? "Kling 3 Multi-shot: 1 image reference max." : "Kling 3 Single: up to 2 image references.",
      };
    }
    if (isSeedanceRoute) {
      return {
        maxImageRefs: 9,
        maxVideoRefs: 3,
        label: "Seedance 2: up to 9 image refs and 3 video refs.",
      };
    }
    return {
      maxImageRefs: 1,
      maxVideoRefs: 0,
      label: "This model accepts limited references.",
    };
  }, [generationMode, isKlingRoute, isSeedanceRoute]);

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} - ${line}`, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    setReferenceImages((prev) => prev.slice(0, refLimits.maxImageRefs));
  }, [refLimits.maxImageRefs]);
  useEffect(() => {
    if (!supportedAspectRatios.includes(aspectRatio)) {
      setAspectRatio(supportedAspectRatios[0]);
    }
  }, [aspectRatio, supportedAspectRatios]);
  useEffect(() => {
    if (isSeedanceFastRoute && quality === "pro") {
      setQuality("std");
    }
  }, [isSeedanceFastRoute, quality]);

  const onReferenceImagesChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const slotsLeft = Math.max(0, refLimits.maxImageRefs - referenceImages.length);
    if (slotsLeft <= 0) {
      setError(`This model allows only ${refLimits.maxImageRefs} image reference(s).`);
      return;
    }
    const accepted = files.slice(0, slotsLeft);
    const encoded = await Promise.all(
      accepted.map(async (file) => ({
        name: file.name,
        dataUrl: await readFileAsDataUrl(file),
      }))
    );
    setReferenceImages((prev) => [...prev, ...encoded].slice(0, refLimits.maxImageRefs));
    e.target.value = "";
  }, [refLimits.maxImageRefs, referenceImages.length]);

  const removeReferenceImage = useCallback((idx: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const createClip = useCallback(
    (track: TimelineTrack, title: string, durationSec: number, sourceUrl?: string) => {
      const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const currentMaxEnd = timelineClips.reduce((max, c) => Math.max(max, c.startSec + c.durationSec), 0);
      const colorClass =
        track === "V1"
          ? "bg-cyan-500/25 border-cyan-300/40"
          : track === "A1"
            ? "bg-fuchsia-500/20 border-fuchsia-300/35"
            : track === "A2"
              ? "bg-emerald-500/20 border-emerald-300/35"
              : track === "SFX"
                ? "bg-amber-500/20 border-amber-300/35"
                : "bg-sky-500/20 border-sky-300/35";
      const clip: TimelineClip = {
        id,
        track,
        title,
        startSec: Math.max(0, Math.floor(currentMaxEnd)),
        durationSec: Math.max(1, durationSec),
        colorClass,
        sourceUrl,
      };
      setTimelineClips((prev) => [...prev, clip]);
      setSelectedClipId(id);
      return clip;
    },
    [timelineClips]
  );

  const addNewScene = useCallback(() => {
    const trimmed = newSceneTitle.trim();
    if (!trimmed) return;
    const idNum = scenes.length + 1;
    const nextId = `SC-${String(idNum).padStart(2, "0")}`;
    const scene: Scene = {
      id: nextId,
      title: trimmed,
      duration: `${duration}s`,
      status: "Draft",
      camera: "Director Cam",
      transition: "Cut",
    };
    setScenes((prev) => [...prev, scene]);
    setSelectedSceneId(nextId);
    createClip("V1", `${nextId} ${trimmed}`, duration);
    setNewSceneTitle("");
    pushLog(`Scene added: ${nextId}`);
  }, [createClip, duration, newSceneTitle, pushLog, scenes.length]);

  const splitSelectedClip = useCallback(() => {
    if (!selectedClip) return;
    const local = playheadSec - selectedClip.startSec;
    if (local <= 0 || local >= selectedClip.durationSec) return;
    const firstDur = Math.max(1, Math.floor(local));
    const secondDur = Math.max(1, selectedClip.durationSec - firstDur);
    const secondId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTimelineClips((prev) =>
      prev.flatMap((clip) => {
        if (clip.id !== selectedClip.id) return [clip];
        return [
          { ...clip, durationSec: firstDur, title: `${clip.title} A` },
          {
            ...clip,
            id: secondId,
            title: `${clip.title} B`,
            startSec: clip.startSec + firstDur,
            durationSec: secondDur,
          },
        ];
      })
    );
    setSelectedClipId(secondId);
    pushLog(`Clip split at ${playheadSec.toFixed(1)}s`);
  }, [playheadSec, pushLog, selectedClip]);

  const deleteSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    setTimelineClips((prev) => prev.filter((clip) => clip.id !== selectedClipId));
    setSelectedClipId(null);
  }, [selectedClipId]);

  const setSelectedClipTrim = useCallback((nextStart: number, nextDuration: number) => {
    if (!selectedClip) return;
    setTimelineClips((prev) =>
      prev.map((clip) =>
        clip.id === selectedClip.id
          ? { ...clip, startSec: Math.max(0, nextStart), durationSec: Math.max(1, nextDuration) }
          : clip
      )
    );
  }, [selectedClip]);

  const dropClipOnTrack = useCallback(
    (track: TimelineTrack, e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggingClipId) return;
      const canvas = timelineCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + canvas.scrollLeft;
      const nextStart = Math.max(0, Math.floor(x / pxPerSec));
      setTimelineClips((prev) =>
        prev.map((clip) => (clip.id === draggingClipId ? { ...clip, track, startSec: nextStart } : clip))
      );
      setDraggingClipId(null);
    },
    [draggingClipId]
  );

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
      if (generationMode === "multi" && !isKlingRoute) {
        throw new Error("Multi-shot is available with Kling 3 Pro only. Switch the video model to Kling.");
      }
      const referenceVideoUrls = referenceVideoUrlsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^https?:\/\//i.test(line))
        .slice(0, refLimits.maxVideoRefs);
      if (!isSeedanceRoute && referenceVideoUrls.length > 0) {
        throw new Error("Video references are supported with Seedance models only.");
      }
      if (referenceImages.length > refLimits.maxImageRefs) {
        throw new Error(`Too many image references for selected model. Max is ${refLimits.maxImageRefs}.`);
      }
      const multiPrompt =
        generationMode === "multi"
          ? multiShotText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => ({ prompt: line, duration: Math.max(1, Math.min(12, Math.floor(duration / 2) || 4)) }))
              .slice(0, 8)
          : [];
      const effectiveQuality = isSeedanceFastRoute && quality === "pro" ? "std" : quality;
      const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        duration,
        aspect_ratio: aspectRatio,
        mode: effectiveQuality,
        resolution: isSeedanceFastRoute ? "720p" : (effectiveQuality === "pro" ? "1080p" : "720p"),
        multi_shots: generationMode === "multi",
        multi_prompt: multiPrompt,
      };

      if (isKlingRoute) {
        if (generationMode === "multi") {
          if (referenceImages[0]?.dataUrl) {
            payload.image_urls = [referenceImages[0].dataUrl];
          }
        } else if (referenceImages.length === 1) {
          payload.image_url = referenceImages[0].dataUrl;
        } else if (referenceImages.length >= 2) {
          payload.image_urls = [referenceImages[0].dataUrl, referenceImages[1].dataUrl];
        }
      } else if (isSeedanceRoute) {
        if (referenceImages.length === 1) {
          payload.first_frame_url = referenceImages[0].dataUrl;
        } else if (referenceImages.length === 2) {
          payload.first_frame_url = referenceImages[0].dataUrl;
          payload.last_frame_url = referenceImages[1].dataUrl;
        } else if (referenceImages.length > 2) {
          payload.reference_image_urls = referenceImages.map((img) => img.dataUrl).slice(0, refLimits.maxImageRefs);
        }
        if (referenceVideoUrls.length > 0) {
          payload.reference_video_urls = referenceVideoUrls;
        }
      } else if (referenceImages.length > 0) {
        payload.image_url = referenceImages[0].dataUrl;
      }

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRoute: videoRoute,
          payload,
        }),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const json = (await res.json()) as { taskId?: string; videoUrl?: string; outputs?: string[] };
      if (json.videoUrl) {
        setVideoUrl(json.videoUrl);
        createClip("V1", `${selectedScene.id} ${selectedScene.title}`, duration, json.videoUrl);
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
          createClip("V1", `${selectedScene.id} ${selectedScene.title}`, duration, url);
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
          aspectRatio: aspectRatio,
          numImages: 1,
          quality,
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
      createClip("A1", "Narration Voice", Math.max(3, duration), json.audioUrl);
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

  async function generateMusic() {
    if (!musicPrompt.trim() || musicLoading) return;
    setMusicLoading(true);
    setError("");
    try {
      pushLog("Submitting background music generation");
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "music",
          prompt: musicPrompt.trim(),
          model: "elevenlabs/music",
          musicDuration: Math.max(5, duration),
          force_instrumental: true,
          output_format: "mp3_standard",
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as { audioUrl?: string };
      if (!json.audioUrl) throw new Error("Music URL missing.");
      setMusicUrl(json.audioUrl);
      createClip("A2", "Background Music", Math.max(5, duration), json.audioUrl);
      pushLog("Music generated successfully.");
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Music generation failed.";
      setError(msg);
      pushLog(`Music error: ${msg}`);
    } finally {
      setMusicLoading(false);
    }
  }

  async function generateSfx() {
    if (!sfxPrompt.trim() || sfxLoading) return;
    setSfxLoading(true);
    setError("");
    try {
      pushLog("Submitting SFX generation");
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "music",
          prompt: `sound effect only: ${sfxPrompt.trim()}`,
          model: "elevenlabs/music",
          musicDuration: 5,
          force_instrumental: true,
          output_format: "mp3_standard",
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as { audioUrl?: string };
      if (!json.audioUrl) throw new Error("SFX URL missing.");
      setSfxUrl(json.audioUrl);
      createClip("SFX", "Sound Effects", 5, json.audioUrl);
      pushLog("SFX generated successfully.");
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SFX generation failed.";
      setError(msg);
      pushLog(`SFX error: ${msg}`);
    } finally {
      setSfxLoading(false);
    }
  }

  async function onCloneSampleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setCloneSampleDataUrl(dataUrl);
    setCloneSampleName(file.name);
  }

  async function generateVoiceClone() {
    if (!cloneSampleDataUrl || !voiceText.trim() || cloneLoading) return;
    setCloneLoading(true);
    setError("");
    try {
      pushLog("Submitting voice cloning task");
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "voice-cloning",
          cloneName: cloneName.trim() || "Studio Voice Clone",
          sampleAudioUrls: [cloneSampleDataUrl],
          text: voiceText.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as { audioUrl?: string };
      if (!json.audioUrl) throw new Error("Cloned voice URL missing.");
      setClonedVoiceUrl(json.audioUrl);
      createClip("A1", "Cloned Voice", Math.max(3, duration), json.audioUrl);
      pushLog("Voice cloning generated successfully.");
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice cloning failed.";
      setError(msg);
      pushLog(`Voice cloning error: ${msg}`);
    } finally {
      setCloneLoading(false);
    }
  }

  function playMix() {
    const media = [videoRef.current, voiceRef.current, clonedVoiceRef.current, musicRef.current, sfxRef.current].filter(
      (item): item is HTMLMediaElement => Boolean(item)
    );
    if (media.length === 0) return;
    media.forEach((m) => {
      m.currentTime = 0;
      void m.play().catch(() => null);
    });
    setMixPlaying(true);
    pushLog("Preview mix playback started.");
  }

  function pauseMix() {
    const media = [videoRef.current, voiceRef.current, clonedVoiceRef.current, musicRef.current, sfxRef.current].filter(
      (item): item is HTMLMediaElement => Boolean(item)
    );
    if (media.length === 0) return;
    media.forEach((m) => m.pause());
    setMixPlaying(false);
    pushLog("Preview mix playback paused.");
  }

  return (
    <section className={`min-h-[calc(100vh-64px)] w-full ${theme.page} px-2 py-2 md:px-3`}>
      <div className="mx-auto flex max-w-[1920px] flex-col gap-3">
        <header className={`rounded-xl border p-3 backdrop-blur ${theme.panel}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.24em] ${theme.textMute}`}>Hollywood AI Studio</p>
              <h1 className="text-2xl font-semibold text-white">Bullet Time - Production Control Room</h1>
            </div>
            <div className="flex gap-2">
              {(Object.keys(STUDIO_THEMES) as StudioThemeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    themeKey === key ? `${STUDIO_THEMES[key].soft} text-white` : "border-white/15 bg-white/5 text-slate-200"
                  }`}
                >
                  {STUDIO_THEMES[key].label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className={`rounded-xl border p-2 ${theme.panel}`}>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">برومبت / Scenes</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-white/15 bg-black/35 px-2 py-1.5 text-xs text-white"
              />
              <div className="mt-2 flex gap-2">
                <input
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-black/35 px-2 py-1 text-xs text-white"
                  placeholder="New scene title"
                />
                <button onClick={addNewScene} className="rounded-md border border-white/20 px-2 text-xs text-white">Add</button>
              </div>
              <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                {scenes.map((scene) => (
                  <button key={scene.id} onClick={() => setSelectedSceneId(scene.id)} className={`w-full rounded border px-2 py-1 text-left text-[11px] ${scene.id === selectedSceneId ? `${theme.soft}` : "border-white/10 bg-white/5"}`}>
                    {scene.id} - {scene.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">الإضاءة</p>
              <div className="space-y-2 text-xs">
                <Field label="Mode" value="High-Key / Low-Key / Rim" />
                <Field label="Current" value="Low Key / Rim" />
                <Field label="Camera" value={selectedScene.camera} />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">الانتقالات / الحركة</p>
              <div className="space-y-2 text-xs">
                <Field label="Transition" value={selectedScene.transition} />
                <Field label="Motion" value="Dolly In / Orbit / Crane" />
                <Field label="Shot Mode" value={generationMode === "multi" ? "Multi-shot" : "Single Shot"} />
              </div>
              <textarea
                value={multiShotText}
                onChange={(e) => setMultiShotText(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-white/15 bg-black/35 px-2 py-1.5 text-xs text-white"
                placeholder="Multi-shot lines..."
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">بريستات + كتابة</p>
              <div className="grid grid-cols-1 gap-1">
                {PRESETS.slice(0, 4).map((preset) => (
                  <button key={preset} onClick={() => setSelectedPreset(preset)} className={`rounded border px-2 py-1 text-left text-[11px] ${selectedPreset === preset ? `${theme.soft}` : "border-white/10 bg-white/5 text-slate-200"}`}>{preset}</button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {WRITING_PRESETS.map((preset) => (
                  <button key={preset.id} onClick={() => { setSelectedWritingPreset(preset.id); setScriptText(preset.template); }} className={`rounded border px-1.5 py-1 text-[10px] ${selectedWritingPreset === preset.id ? `${theme.soft}` : "border-white/10 bg-white/5 text-slate-200"}`}>{preset.label}</button>
                ))}
              </div>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-white/15 bg-black/35 px-2 py-1.5 text-xs text-white"
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button onClick={() => setPrompt(scriptText)} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white">Use Prompt</button>
                <button onClick={() => createClip("TXT", "Text Layer", Math.max(3, duration))} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white">Add TXT</button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">توليد الفيديو</p>
              <div className="grid grid-cols-2 gap-1">
                <select value={videoRoute} onChange={(e) => setVideoRoute(e.target.value)} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white">
                  {VIDEO_ROUTES.map((route) => <option key={route.value} value={route.value} className="bg-slate-900">{route.label}</option>)}
                </select>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as (typeof DURATION_OPTIONS)[number])} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white">
                  {DURATION_OPTIONS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}s</option>)}
                </select>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as (typeof ASPECT_RATIO_OPTIONS)[number])} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white">
                  {supportedAspectRatios.map((ratio) => <option key={ratio} value={ratio} className="bg-slate-900">{ratio}</option>)}
                </select>
                <select value={quality} onChange={(e) => setQuality(e.target.value as (typeof QUALITY_OPTIONS)[number]["value"])} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white">
                  {QUALITY_OPTIONS.map((q) => <option key={q.value} value={q.value} className="bg-slate-900">{q.label}</option>)}
                </select>
              </div>
              <button onClick={generateVideo} disabled={videoLoading || !prompt.trim()} className={`mt-2 w-full rounded-md bg-gradient-to-r py-1.5 text-xs font-semibold text-white ${theme.button} disabled:opacity-50`}>
                {videoLoading ? "Generating..." : "Generate Scene Video"}
              </button>
              <button onClick={generateImage} disabled={imageLoading || !prompt.trim()} className="mt-1 w-full rounded-md border border-white/20 bg-white/10 py-1.5 text-xs text-white disabled:opacity-50">
                {imageLoading ? "Generating Image..." : "Generate Image"}
              </button>
              <div className="mt-2 rounded-md border border-white/10 p-1">
                {videoUrl ? <video ref={videoRef} src={videoUrl} controls className="aspect-video w-full rounded object-cover" /> : <p className="p-2 text-[11px] text-slate-400">Live Preview Canvas</p>}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <p className="mb-2 text-xs font-semibold text-white">الصوت / النسخ / الموسيقى / المؤثرات</p>
              <textarea value={voiceText} onChange={(e) => setVoiceText(e.target.value)} rows={2} className="w-full rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white" />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button onClick={generateVoice} className="rounded border border-white/20 bg-white/10 py-1 text-[11px] text-white">Voice</button>
                <button onClick={generateMusic} className="rounded border border-white/20 bg-white/10 py-1 text-[11px] text-white">Music</button>
                <button onClick={generateSfx} className="rounded border border-white/20 bg-white/10 py-1 text-[11px] text-white">SFX</button>
                <button onClick={generateVoiceClone} disabled={!cloneSampleDataUrl} className="rounded border border-white/20 bg-white/10 py-1 text-[11px] text-white disabled:opacity-40">Clone</button>
              </div>
              <label className="mt-1 block rounded border border-dashed border-white/15 px-2 py-1 text-[11px] text-slate-300">
                {cloneSampleName || "Upload clone sample"}
                <input type="file" accept="audio/*" className="mt-1 w-full text-[10px]" onChange={onCloneSampleChange} />
              </label>
              <div className="mt-2 space-y-1">
                {audioUrl && <audio ref={voiceRef} src={audioUrl} controls className="w-full" />}
                {clonedVoiceUrl && <audio ref={clonedVoiceRef} src={clonedVoiceUrl} controls className="w-full" />}
                {musicUrl && <audio ref={musicRef} src={musicUrl} controls className="w-full" />}
                {sfxUrl && <audio ref={sfxRef} src={sfxUrl} controls className="w-full" />}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button onClick={playMix} className="rounded border border-white/20 bg-white/10 py-1 text-xs text-white"><Play className="mr-1 inline h-3 w-3" />Play Mix</button>
                <button onClick={pauseMix} className="rounded border border-white/20 bg-white/10 py-1 text-xs text-white"><Pause className="mr-1 inline h-3 w-3" />Pause</button>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-xl border p-3 ${theme.panel}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Real Timeline Editor</h2>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={timelineTotalSec} value={playheadSec} onChange={(e) => setPlayheadSec(Number(e.target.value))} className="w-48" />
              <span className="rounded border border-white/20 px-2 py-1 text-xs text-white">{playheadSec.toFixed(1)}s</span>
              <button onClick={splitSelectedClip} disabled={!selectedClip} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white disabled:opacity-50">Cut</button>
              <button onClick={deleteSelectedClip} disabled={!selectedClip} className="rounded border border-rose-400/35 bg-rose-500/15 px-2 py-1 text-xs text-rose-100 disabled:opacity-50">Delete</button>
            </div>
          </div>

          {selectedClip && (
            <div className="mb-2 grid gap-2 rounded-lg border border-white/10 bg-black/25 p-2 md:grid-cols-4">
              <p className="truncate text-xs text-white">{selectedClip.title}</p>
              <input type="number" min={0} value={selectedClip.startSec} onChange={(e) => setSelectedClipTrim(Number(e.target.value), selectedClip.durationSec)} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white" />
              <input type="number" min={1} value={selectedClip.durationSec} onChange={(e) => setSelectedClipTrim(selectedClip.startSec, Number(e.target.value))} className="rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-white" />
              <button onClick={() => setPlayheadSec(selectedClip.startSec)} className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white">Jump</button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">
            <div ref={timelineCanvasRef} style={{ width: `${timelineTotalSec * pxPerSec}px` }} className="relative space-y-2">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
                <div />
                <div className="relative h-5 border-b border-white/10">
                  {Array.from({ length: Math.floor(timelineTotalSec / 5) + 1 }).map((_, i) => (
                    <span key={i} className="absolute -top-0.5 text-[10px] text-slate-400" style={{ left: `${i * 5 * pxPerSec}px` }}>{i * 5}s</span>
                  ))}
                </div>
              </div>
              {timelineTracks.map((track) => (
                <div key={track} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
                  <div className="rounded border border-white/15 bg-white/5 px-2 py-1 text-center text-[11px] font-semibold text-white">{track}</div>
                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropClipOnTrack(track, e)} className="relative h-12 rounded border border-white/10 bg-black/45">
                    {timelineClips.filter((clip) => clip.track === track).map((clip) => (
                      <button
                        key={clip.id}
                        draggable
                        onDragStart={() => setDraggingClipId(clip.id)}
                        onDragEnd={() => setDraggingClipId(null)}
                        onClick={() => setSelectedClipId(clip.id)}
                        className={`absolute top-1 h-10 rounded border px-2 text-left text-[11px] text-white ${clip.colorClass} ${selectedClipId === clip.id ? "ring-2 ring-cyan-300/70" : ""}`}
                        style={{ left: `${clip.startSec * pxPerSec}px`, width: `${Math.max(44, clip.durationSec * pxPerSec)}px` }}
                      >
                        <p className="truncate font-medium">{clip.title}</p>
                        <p className="text-[10px] text-white/70">{clip.durationSec}s</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pointer-events-none absolute top-0 h-full w-[2px] bg-cyan-300/90" style={{ left: `${playheadSec * pxPerSec + 80}px` }} />
            </div>
          </div>
        </section>

        <section className={`rounded-xl border p-2 ${theme.panel}`}>
          <div className="grid gap-2 md:grid-cols-4">
            {[["Project", state.projectName], ["Credits", `${state.credits.toLocaleString()} remaining`], ["Queue", `${state.renderQueue} jobs`], ["Plan", state.plan]].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] uppercase text-slate-400">{label}</p>
                <p className="text-xs text-white">{value}</p>
              </div>
            ))}
          </div>
          {error && <div className="mt-2 rounded border border-red-400/30 bg-red-900/20 px-2 py-1 text-xs text-red-200">{error}</div>}
          <div className="mt-2 max-h-24 space-y-1 overflow-y-auto rounded border border-white/10 bg-black/25 p-2">
            {logs.map((log) => <p key={log} className="text-[11px] text-slate-300"><Timer className="mr-1 inline h-3 w-3" />{log}</p>)}
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

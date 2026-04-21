"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense, type DragEvent } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Film, Sparkles, ChevronDown, ImageIcon,
  Video, Clapperboard, Layers, Pencil, ShoppingBag, TrendingUp,
  Mic2, PenTool, Factory, ArrowUpCircle, Zap, Music2, Users,
  X, AlertCircle, Loader2, Upload, CheckCircle2, Settings,
} from "lucide-react";

import MediaGrid, { MediaItem } from "@/components/MediaGrid";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import {
  WaveSpeedVideoModel,
  getModelGroups,
  DEFAULT_MODEL,
} from "@/lib/video-model-registry";
import { getGenerationCostSync } from "@/lib/pricing";
import { useAssetStore } from "@/hooks/use-asset-store";

// -- Utilities -----------------------------------------------------------------

/** Translate opaque KIE API error messages into user-friendly text. */
function normalizeGenerationError(raw: string | null | undefined): string {
  if (!raw) return "Generation failed. Please try again.";
  const lower = raw.toLowerCase();
  if (lower.includes("models task execute failed") || lower.includes("task execute failed")) {
    return "The model failed to execute your request. This is usually temporary — please try again.";
  }
  if (lower.includes("content") && (lower.includes("policy") || lower.includes("violation") || lower.includes("sensitive"))) {
    return "Your prompt may have triggered a content filter. Please revise it and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  return raw;
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

async function fileToDataURL(file: File, maxPx = 1920, quality = 0.85): Promise<string> {
  // For non-image files (video) return raw data URL without compression
  if (!file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          const scale = maxPx / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function sizeToRatio(size: string): string {
  const [w, h] = size.split("*").map(Number);
  if (!w || !h) return "16:9";
  return w > h ? "16:9" : "9:16";
}

function sizeLabel(size: string): string {
  const MAP: Record<string, string> = {
    "1280*720": "Landscape 16:9",
    "720*1280": "Portrait  9:16",
    "854*480":  "Landscape 16:9",
    "480*854":  "Portrait  9:16",
  };
  return MAP[size] ?? size;
}

function prettyModelName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
}

function splitShotDurations(totalDuration: number, shotCount: number): number[] {
  if (shotCount <= 0 || totalDuration <= 0) return [];
  const base = Math.floor(totalDuration / shotCount);
  const remainder = totalDuration % shotCount;
  if (base < 1) return [];
  return Array.from({ length: shotCount }, (_, idx) => base + (idx === shotCount - 1 ? remainder : 0));
}

// -- Constants -----------------------------------------------------------------

const BADGE_STYLE = {
  TOP:  { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24" },
  NEW:  { bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  PRO:  { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa" },
  FAST: { bg: "rgba(14,165,233,0.15)",  text: "#38bdf8" },
};

const TOOLS = [
  { id: "create-video",       label: "Create Video",         icon: Video },
  { id: "cinema-studio",      label: "Next Scene Video",    icon: Clapperboard },
  { id: "mixed-media",        label: "Mixed Media",          icon: Layers },
  { id: "edit-video",         label: "Edit Video",           icon: Pencil },
  { id: "click-to-ad",        label: "Click to Ad",          icon: ShoppingBag },
  { id: "sora-trends",        label: "Sora 2 Trends",        icon: TrendingUp },
  { id: "lipsync",            label: "Lipsync Studio",       icon: Mic2 },
  { id: "draw-to-video",      label: "Draw to Video",        icon: PenTool },
  { id: "sketch-to-video",    label: "Sketch to Video",      icon: PenTool },
  { id: "ugc-factory",        label: "UGC Factory",          icon: Factory },
  { id: "video-upscale",      label: "Video Upscale",        icon: ArrowUpCircle },
  { id: "higgsfield-animate", label: "Character Animate",    icon: Zap },
  { id: "vibe-motion",        label: "Vibe Motion",          icon: Music2 },
  { id: "recast-studio",      label: "Recast Studio",        icon: Users },
];

const TOOL_DEFAULT_MODEL_ID: Record<string, string> = {
  "create-video": "kling-v3.0-pro-t2v",
  "cinema-studio": "bytedance-seedance-v2-t2v",
  // mixed-media / edit-video previously defaulted to Kling 3.0 Omni (removed — KIE has no Omni endpoint).
  "mixed-media": "kling-v3.0-pro-t2v",
  "edit-video": "kling-v3.0-pro-t2v",
  "click-to-ad": "google-veo3.1-fast-t2v",
  "sora-trends": "openai-sora-2-pro-t2v",
  "lipsync": "kling-v3.0-pro-motion",
  "draw-to-video": "minimax-hailuo-2.3-i2v-fast",
  "sketch-to-video": "minimax-hailuo-2.3-i2v-pro",
  "ugc-factory": "google-veo3.1-lite-t2v",
  "video-upscale": "xai-grok-imagine-edit",
  "higgsfield-animate": "bytedance-seedance-v2-t2v-fast",
  "vibe-motion": "xai-grok-imagine-t2v",
  "recast-studio": "xai-grok-imagine-edit",
};

const TOOL_PROMPT_PREFIX: Record<string, string> = {
  "create-video": "",
  "cinema-studio": "",
  "mixed-media": "",
  "edit-video": "",
  "click-to-ad": "",
  "sora-trends": "",
  "lipsync": "",
  "draw-to-video": "",
  "sketch-to-video": "",
  "ugc-factory": "",
  "video-upscale": "",
  "higgsfield-animate": "",
  "vibe-motion": "",
  "recast-studio": "",
};

const FAMILY_GRADIENTS: Record<string, string> = {
  wan22:     "from-orange-900 via-orange-800 to-slate-900",
  kling:     "from-cyan-900   via-cyan-800   to-slate-900",
  veo:       "from-blue-900   via-sky-800    to-slate-900",
  sora:      "from-violet-900 via-purple-800 to-slate-900",
  hailuo:    "from-amber-900  via-amber-800  to-slate-900",
  seedance:  "from-emerald-900 via-emerald-800 to-slate-900",
  luma:      "from-purple-900 via-purple-800 to-slate-900",
  pika:      "from-pink-900   via-pink-800   to-slate-900",
  pixverse:  "from-rose-900   via-rose-800   to-slate-900",
  runway:    "from-teal-900   via-teal-800   to-slate-900",
  grok:      "from-red-900    via-red-800    to-slate-900",
};

const MODEL_GROUPS = getModelGroups();

// -- Main Component -------------------------------------------------------------

function VideoPageInner() {
  const searchParams = useSearchParams();
  const [activeTool,    setActiveTool]    = useState("create-video");
  const [selectedModel, setSelectedModel] = useState<WaveSpeedVideoModel>(DEFAULT_MODEL);
  const [modelOpen,     setModelOpen]     = useState(false);

  useEffect(() => {
    const requestedTool = searchParams.get("tool");
    if (requestedTool && TOOLS.some((tool) => tool.id === requestedTool)) {
      setActiveTool(requestedTool);
    }

    const requestedModel = searchParams.get("model");
    if (requestedModel) {
      const allModels = MODEL_GROUPS.flatMap((group) => group.models);
      const matched = allModels.find((model) => model.api_route === requestedModel || model.id === requestedModel);
      if (matched) {
        setSelectedModel(matched);
        const c = matched.capabilities;
        setDuration(c.durations[0] ?? null);
        setAspectRatio(c.aspect_ratios[0] ?? null);
        setSize(c.sizes[0] ?? null);
        setResolution(c.resolutions[0] ?? null);
      }
    }
  }, [searchParams]);

  // Prompt fields
  const [prompt,    setPrompt]    = useState("");
  const [negPrompt, setNegPrompt] = useState("");

  // Output controls — reset when model changes
  const [duration,    setDuration]    = useState<number | null>(DEFAULT_MODEL.capabilities.durations[0] ?? null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(DEFAULT_MODEL.capabilities.aspect_ratios[0] ?? null);
  const [size,        setSize]        = useState<string | null>(DEFAULT_MODEL.capabilities.sizes[0] ?? null);
  const [resolution,  setResolution]  = useState<string | null>(DEFAULT_MODEL.capabilities.resolutions[0] ?? null);

  // Advanced controls
  const [cfgScale,      setCfgScale]      = useState(0.5);
  const [sound,         setSound]         = useState(false);
  const [shotType,      setShotType]      = useState<"intelligent" | "customize">("intelligent");
  const [multiPrompts,  setMultiPrompts]  = useState<string[]>([""]);
  const [elementList,   setElementList]   = useState<string[]>([""]);
  const [sceneControl,  setSceneControl]  = useState(false);
  const [orientation,   setOrientation]   = useState<"video" | "image">("video");
  const [omniTab,       setOmniTab]       = useState<"elements" | "frames">("elements");

  // Kling 3.0 structured elements (name + description + 2-4 images each, max 3 elements)
  type KlingEl = { name: string; description: string; files: File[]; previews: string[]; };
  const [klingEls, setKlingEls] = useState<KlingEl[]>([]);

  // Kling 3.0 multi-shot state (separate from generic multiPrompts — avoids cross-model pollution)
  const [kling30MultiEnabled, setKling30MultiEnabled] = useState(false);
  const [kling30MultiMode, setKling30MultiMode] = useState<"auto" | "custom">("auto");
  // custom shots: each has prompt + individual duration
  const [kling30CustomShots, setKling30CustomShots] = useState<Array<{ prompt: string; duration: number }>>([
    { prompt: "", duration: 5 },
  ]);

  // Image inputs
  const [startFrame,   setStartFrame]   = useState<File | null>(null);
  const [endFrame,     setEndFrame]     = useState<File | null>(null);
  const [motionVideo,  setMotionVideo]  = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  // Detected aspect ratio of the uploaded start frame (Kling 3.0 i2v auto-adapts to this)
  const [startFrameRatio, setStartFrameRatio] = useState<string | null>(null);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const startFrameRef  = useRef<HTMLInputElement>(null);
  const endFrameRef    = useRef<HTMLInputElement>(null);
  const motionVideoRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<HTMLInputElement>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Model info banner (shown briefly after model switch)
  const [modelBanner, setModelBanner] = useState<WaveSpeedVideoModel | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media gallery picker
  type PickerTarget = "startFrame" | "endFrame" | "motionVideo" | "referenceImages";
  const [mediaPicker, setMediaPicker]     = useState<PickerTarget | null>(null);
  const [pickerGallery, setPickerGallery] = useState<Array<{ id: string; url: string; type: string }>>([]);
  const [pickerTab, setPickerTab]         = useState<"upload" | "images" | "videos">("images");
  const [pickerLoading, setPickerLoading] = useState(false);

  const allowDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const markDropZone = useCallback((event: DragEvent<HTMLElement>, zone: string) => {
    event.preventDefault();
    setActiveDropZone(zone);
  }, []);

  const clearDropZone = useCallback((event: DragEvent<HTMLElement>, zone: string) => {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setActiveDropZone((current) => (current === zone ? null : current));
  }, []);

  const handleDropSingleImage = useCallback((event: DragEvent<HTMLElement>, setter: (file: File | null) => void) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (!dropped || !dropped.type.startsWith("image/")) return;
    setter(dropped);
  }, []);

  const handleDropSingleVideo = useCallback((event: DragEvent<HTMLElement>, setter: (file: File | null) => void) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (!dropped || !dropped.type.startsWith("video/")) return;
    setter(dropped);
  }, []);

  const handleDropReferenceImages = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!dropped.length) return;
    const isKling30 =
      selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
    const maxRefs = isKling30 ? 3 : selectedModel.capabilities.max_reference_images;
    if (maxRefs <= 0) return;
    setReferenceImages(dropped.slice(0, maxRefs));
  }, [selectedModel]);

  useEffect(() => {
    if (!startFrame) {
      setStartFramePreview(null);
      setStartFrameRatio(null);
      return;
    }
    const url = URL.createObjectURL(startFrame);
    setStartFramePreview(url);
    // Detect actual aspect ratio of the image so we can mirror Kling 3.0's auto-adapt behavior
    const img = new window.Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      const snapped = Math.abs(r - 1) < 0.15 ? "1:1" : (r > 1 ? "16:9" : "9:16");
      setStartFrameRatio(snapped);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [startFrame]);

  useEffect(() => {
    if (!endFrame) {
      setEndFramePreview(null);
      return;
    }
    const url = URL.createObjectURL(endFrame);
    setEndFramePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [endFrame]);

  useEffect(() => {
    if (!referenceImages.length) {
      setReferencePreviews([]);
      return;
    }
    const urls = referenceImages.map((f) => URL.createObjectURL(f));
    setReferencePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [referenceImages]);

  // Generation state
  type PendingTask = { model: WaveSpeedVideoModel; promptText: string; ratio: string; duration: number | null };
  const [pendingTasks,    setPendingTasks]    = useState<Map<string, PendingTask>>(new Map());
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Results
  const [results, setResults] = useState<MediaItem[]>([]);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const allModels = useMemo(() => MODEL_GROUPS.flatMap((group) => group.models), []);

  useEffect(() => {
    let cancelled = false;
    const loadPersisted = async () => {
      try {
        const res = await fetch("/api/assets?type=video", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;

        const mapped: MediaItem[] = data.assets.map((asset: any) => {
          const model = allModels.find((m) => m.api_route === asset.model || m.name === asset.model);
          return {
            id: asset.id,
            type: "video",
            src: asset.url,
            model: model?.name ?? (asset.model || "Video"),
            modelColor: model?.family_color ?? "#06b6d4",
            ratio: "16:9",
            duration: "auto",
            prompt: asset.prompt || "",
            gradient: model ? (FAMILY_GRADIENTS[model.family] ?? "from-slate-900 via-slate-800 to-slate-900") : "from-slate-900 via-slate-800 to-slate-900",
            createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
          };
        });

        setResults(mapped);
      } catch {
        // keep local results only
      }
    };

    void loadPersisted();
    return () => {
      cancelled = true;
    };
  }, [allModels]);

  // Capability shorthand
  const caps = selectedModel.capabilities;
  const isSoraModel = selectedModel.api_route.includes("openai/sora-2");
  const durationChoices = isSoraModel ? [4, 8, 12] : caps.durations;
  const resolutionChoices = isSoraModel ? [] : caps.resolutions;

  // -- Model selection ---------------------------------------------------------

  const selectModel = useCallback((m: WaveSpeedVideoModel) => {
    setSelectedModel(m);
    setModelOpen(false);
    const c = m.capabilities;
    setDuration(c.durations[0] ?? null);
    setAspectRatio(c.aspect_ratios[0] ?? null);
    setSize(c.sizes[0] ?? null);
    setResolution(c.resolutions[0] ?? null);
    setStartFrame(null);
    setEndFrame(null);
    setMotionVideo(null);
    setReferenceImages([]);
    setShotType("intelligent");
    setMultiPrompts([""]);
    setElementList([""]);
    setKlingEls([]);
    setKling30MultiEnabled(false);
    setKling30MultiMode("auto");
    setKling30CustomShots([{ prompt: "", duration: 5 }]);
    setCfgScale(0.5);
    setSound(false);
    setSceneControl(false);
    setOrientation("video");
    setOmniTab("elements");
    // Show info banner
    setModelBanner(m);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setModelBanner(null), 5000);
    // Clear any stale error from a previous model
    setGenerationError(null);
  }, []);

  useEffect(() => {
    const toolModelId = TOOL_DEFAULT_MODEL_ID[activeTool];
    if (!toolModelId) return;
    const targetModel = allModels.find((m) => m.id === toolModelId);
    if (!targetModel) return;
    selectModel(targetModel);

    if (activeTool === "vibe-motion") setSound(true);
    if (activeTool === "lipsync") {
      setSceneControl(true);
      setOrientation("video");
    }
  }, [activeTool, allModels, selectModel]);

  useEffect(() => {
    if (!isSoraModel) return;
    if (duration == null || ![4, 8, 12].includes(duration)) {
      setDuration(4);
    }
    if (resolution != null) {
      setResolution(null);
    }
  }, [isSoraModel, duration, resolution]);

  // -- Polling -----------------------------------------------------------------
  // Cleanup all active intervals on unmount
  useEffect(() => {
    return () => { pollRefs.current.forEach(id => clearInterval(id)); };
  }, []);

  // -- Media picker -----------------------------------------------------------

  const loadPickerAssets = useCallback(async (type: "image" | "video") => {
    setPickerLoading(true);
    try {
      const res  = await fetch(`/api/assets?type=${type}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.assets)) {
        setPickerGallery(data.assets);
      } else {
        setPickerGallery([]);
      }
    } catch {
      setPickerGallery([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const openMediaPicker = useCallback(async (target: PickerTarget) => {
    setMediaPicker(target);
    setPickerGallery([]);
    const defaultType = target === "motionVideo" ? "video" : "image";
    setPickerTab(defaultType === "video" ? "videos" : "images");
    await loadPickerAssets(defaultType);
  }, [loadPickerAssets]);

  const pickGalleryAsset = useCallback(async (url: string, target: PickerTarget) => {
    setMediaPicker(null);
    try {
      // Route the fetch through the server-side proxy to avoid CORS issues with
      // external CDN URLs (KIE, WaveSpeed, etc.) that don't send CORS headers.
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res  = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
      const blob = await res.blob();
      const ext  = (url.split(".").pop()?.split("?")[0] ?? "jpg").toLowerCase();
      const mime = blob.type || (ext === "mp4" ? "video/mp4" : "image/jpeg");
      const file = new File([blob], `gallery-pick.${ext}`, { type: mime });
      if (target === "startFrame")       setStartFrame(file);
      else if (target === "endFrame")    setEndFrame(file);
      else if (target === "motionVideo") setMotionVideo(file);
      else if (target === "referenceImages") {
        const maxR = caps.max_reference_images || 9;
        setReferenceImages(prev => [...prev, file].slice(0, maxR));
      }
    } catch (err) {
      console.error("[pickGalleryAsset] Failed to load gallery asset:", err);
      // Fallback: show a user-visible toast or error here if needed
    }
  }, [caps.max_reference_images]);

  // -- Generate -----------------------------------------------------------------

  const guard = useAuthGuard();
  const { addAsset } = useAssetStore();

  const startPolling = useCallback((taskId: string, ctx: { model: WaveSpeedVideoModel; promptText: string; ratio: string; duration: number | null }) => {
    const removePending = () => {
      setPendingTasks(prev => { const n = new Map(prev); n.delete(taskId); return n; });
      if (pollRefs.current.has(taskId)) { clearInterval(pollRefs.current.get(taskId)!); pollRefs.current.delete(taskId); }
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/video?taskId=${taskId}`);
        let data: { taskId: string; status: "created" | "processing" | "completed" | "failed"; outputs: string[]; error: string | null; } | null = null;
        const cloned = res.clone();
        try { data = await res.json(); } catch {
          if (!res.ok) { const text = await cloned.text().catch(() => ""); setGenerationError(text || `Server error (${res.status})`); removePending(); }
          return;
        }
        if (!res.ok || !data) { setGenerationError(data?.error ?? "Generation check failed"); removePending(); return; }
        if (data.status === "completed" && data.outputs.length > 0) {
          const videoUrl = data.outputs[0];
          const newItem: MediaItem = {
            id: "gen-" + Date.now(), type: "video", src: videoUrl,
            model: ctx.model.name, modelColor: ctx.model.family_color,
            ratio: ctx.ratio, duration: ctx.duration != null ? `${ctx.duration}s` : "auto",
            prompt: ctx.promptText,
            gradient: FAMILY_GRADIENTS[ctx.model.family] ?? "from-slate-900 via-slate-800 to-slate-900",
            createdAt: new Date(),
          };
          setResults(prev => [newItem, ...prev]);
          addAsset({ type: "video", url: videoUrl, prompt: ctx.promptText, model: ctx.model.name, duration: ctx.duration != null ? `${ctx.duration}s` : undefined });
          removePending();
          setGenerationError(null);
        } else if (data.status === "failed") {
          setGenerationError(normalizeGenerationError(data.error)); removePending();
        }
      } catch { setGenerationError("Failed to check generation status"); removePending(); }
    };

    poll();
    const intervalId = setInterval(poll, 4000);
    pollRefs.current.set(taskId, intervalId);
  }, [addAsset]);

  const handleGenerate = useCallback(async () => {
    if (!guard()) return;
    const hasMain = prompt.trim().length > 0;
    const hasMulti = multiPrompts.some((s) => s.trim().length > 0);
    const multiOn = caps.has_multi_prompt && (multiPrompts.length > 1 || multiPrompts[0] !== "");

    // Kling 3.0 detected early — its own validation runs inside the block below
    const isKling30VideoEarly =
      selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
    // Skip the generic prompt guard for Kling 3.0 (multi-shot can have no main prompt)
    if (!isKling30VideoEarly && !hasMain && !(multiOn && hasMulti)) return;
    setIsSubmitting(true);
    setGenerationError(null);

    try {
      const payload: Record<string, unknown> = {};
      const toolPrefix = TOOL_PROMPT_PREFIX[activeTool] ?? "";

      const filledMultiPrompts = multiPrompts.filter((s) => s.trim());
      const basePrompt = hasMain
        ? prompt.trim()
        : filledMultiPrompts.map((s) => s.trim()).join(" | ");
      payload.prompt = toolPrefix ? `${toolPrefix} ${basePrompt}` : basePrompt;

      const isSeedanceV2 = selectedModel.id.startsWith("bytedance-seedance-v2");
      const isKling30Video =
        selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";

      // Image inputs — reference images take priority for ALL models
      if (referenceImages.length > 0) {
        payload.reference_image_urls = await Promise.all(
          referenceImages.map((f) => fileToDataURL(f))
        );
        // For Seedance V2, also allow end frame alongside references
        if (isSeedanceV2 && caps.has_end_frame && endFrame) {
          payload.last_frame_url = await fileToDataURL(endFrame);
        }
      } else if ((caps.requires_image || caps.optional_image) && startFrame) {
        payload[isSeedanceV2 ? "first_frame_url" : "image"] = await fileToDataURL(startFrame);
      }
      if (caps.requires_video && motionVideo) {
        payload.video = await fileToDataURL(motionVideo);
      }
      if (caps.has_end_frame && endFrame && referenceImages.length === 0) {
        const endKey = isSeedanceV2
          ? "last_frame_url"
          : selectedModel.api_route.startsWith("wavespeed-ai/wan")
            ? "last_image"
            : "end_image";
        payload[endKey] = await fileToDataURL(endFrame);
      }

      // Size / Aspect ratio
      if (caps.sizes.length > 0 && size) {
        payload.size = size;
      }
      if (caps.aspect_ratios.length > 0 && aspectRatio) {
        payload.aspect_ratio = aspectRatio;
      }

      // Duration
      if (durationChoices.length > 0 && duration != null) {
        payload.duration = duration;
      }

      // Quality / Resolution
      if (resolutionChoices.length > 0 && resolution) {
        payload[caps.quality_param] = resolution;
      }

      // Prompt controls
      if (caps.has_negative_prompt && negPrompt.trim()) {
        payload.negative_prompt = negPrompt.trim();
      }
      if (caps.has_cfg_scale) {
        payload.cfg_scale = cfgScale;
      }
      if (caps.has_sound) {
        payload[caps.sound_param] = sound;
      }
      if (caps.has_shot_type) {
        payload.shot_type = shotType;
      }
      if (caps.has_multi_prompt) {
        const filled = multiPrompts
          .map((text, index) => ({ text: text.trim(), index }))
          .filter((item) => item.text.length > 0);
        if (filled.length > 0 && (multiOn || !caps.has_omni_tabs)) {
          if (duration != null && filled.length > duration) {
            setGenerationError(`For ${duration}s duration, maximum shots is ${duration}.`);
            setIsSubmitting(false);
            return;
          }
          const splitDurations = duration != null ? splitShotDurations(duration, filled.length) : [];
          if (duration != null && splitDurations.length !== filled.length) {
            setGenerationError("Invalid multi-shot split. Reduce shot count or increase duration.");
            setIsSubmitting(false);
            return;
          }
          // Validate each shot prompt length (API limit: 500 chars per shot)
          for (const item of filled) {
            if (item.text.length > 500) {
              setGenerationError(`Shot ${item.index + 1} prompt is too long (${item.text.length}/500 chars). Please shorten it.`);
              setIsSubmitting(false);
              return;
            }
          }
          payload.multi_prompt = filled.map((item, idx) => ({
            prompt: item.text,   // shot prompts are pure scene descriptions — no toolPrefix
            ...(duration != null ? { duration: splitDurations[idx] } : {}),
          }));
        }
      }
      if (caps.has_element_list) {
        // Reference images are passed as image_urls — element_list is for text IDs only
        const filled = elementList.filter(s => s.trim());
        if (filled.length > 0) {
          payload.element_list = filled.map(id => ({ id: id.trim() }));
        }
      }
      if (caps.has_scene_control) {
        payload.scene_control_mode = sceneControl;
      }
      if (caps.has_orientation) {
        payload.orientation = orientation;
      }

      if (isKling30Video) {
        // ── Kling 3.0 — fully spec-compliant payload builder ─────────────────
        const resolvedDuration = duration ?? 9;

        // Validate duration
        if (resolvedDuration < 3 || resolvedDuration > 15) {
          setGenerationError("Kling 3.0 duration must be between 3 and 15 seconds.");
          setIsSubmitting(false);
          return;
        }

        // Validate elements: each element needs 2+ images
        const invalidEl = klingEls.find(el => el.name.trim() && el.files.length < 2);
        if (invalidEl) {
          setGenerationError(`Element "${invalidEl.name}" needs at least 2 images.`);
          setIsSubmitting(false);
          return;
        }

        // Validate custom shots total duration
        if (kling30MultiEnabled && kling30MultiMode === "custom") {
          const activeCustom = kling30CustomShots.filter(s => s.prompt.trim());
          if (!activeCustom.length) {
            setGenerationError("Add at least one shot prompt in custom mode.");
            setIsSubmitting(false);
            return;
          }
          if (!kling30CustomDurationValid) {
            setGenerationError(
              `Shot durations must total exactly ${resolvedDuration}s (currently ${kling30CustomTotalDuration}s).`
            );
            setIsSubmitting(false);
            return;
          }
          if (activeCustom.length > 5) {
            setGenerationError("Maximum 5 shots allowed.");
            setIsSubmitting(false);
            return;
          }
        }

        // Validate single-shot prompt
        if (!kling30MultiEnabled && !hasMain) {
          setGenerationError("Kling 3.0 single-shot requires a prompt.");
          setIsSubmitting(false);
          return;
        }

        // Resolution → mode: "std" | "pro"
        const modeValue = resolution === "pro" ? "pro" : "std";

        // ── image_urls: read DIRECTLY from React state (authoritative source) ──
        // payload.image / payload.end_image are set by the generic block above,
        // but we re-read from state to guarantee no silent data loss.
        const imageUrls: string[] = [];
        const firstFrameDataUrl = startFrame ? await fileToDataURL(startFrame) : null;
        const lastFrameDataUrl =
          !kling30MultiEnabled && endFrame ? await fileToDataURL(endFrame) : null;
        if (firstFrameDataUrl) imageUrls.push(firstFrameDataUrl);
        if (lastFrameDataUrl) imageUrls.push(lastFrameDataUrl);
        // Log so we can verify images are included
        console.log(
          `[Kling 3.0] image_urls built: start=${firstFrameDataUrl ? "✓ (" + firstFrameDataUrl.slice(0, 40) + "…)" : "✗ none"}, end=${lastFrameDataUrl ? "✓" : kling30MultiEnabled ? "skipped (multi-shot)" : "✗ none"}`
        );

        // ── kling_elements ───────────────────────────────────────────────────
        delete payload.element_list;
        delete payload.reference_image_urls;
        const validKlingEls = klingEls
          .slice(0, 3)
          .filter((el) => el.name.trim() && el.description.trim() && el.files.length >= 2);

        // ── multi_prompt: build from auto or custom mode ─────────────────────
        let multiPromptList: Array<{ prompt: string; duration: number }> = [];
        if (kling30MultiEnabled) {
          if (kling30MultiMode === "auto") {
            const shotCount = Math.min(5, Math.max(1, Math.floor(resolvedDuration / 3)));
            const splitD = splitShotDurations(resolvedDuration, shotCount);
            const baseP = prompt.trim() || "Continue the scene";
            multiPromptList = Array.from({ length: shotCount }, (_, i) => ({
              prompt: baseP,
              duration: splitD[i] ?? 3,
            }));
          } else {
            multiPromptList = kling30CustomShots
              .filter(s => s.prompt.trim())
              .slice(0, 5)
              .map(s => ({ prompt: s.prompt.trim(), duration: s.duration }));
          }
        }

        // ── Build final payload ──────────────────────────────────────────────
        // Remove all generic keys — Kling 3.0 uses its own field names
        delete payload.image; delete payload.first_frame_url;
        delete payload.end_image; delete payload.last_frame_url;
        delete payload.multi_prompt; delete payload.element_list;

        payload.image_urls = imageUrls;
        payload.multi_shots = kling30MultiEnabled;
        payload.multi_prompt = multiPromptList;
        payload.mode = modeValue;
        payload.sound = !!sound;
        payload.duration = resolvedDuration;
        payload.aspect_ratio = aspectRatio ?? "16:9";
        payload.prompt = kling30MultiEnabled ? "" : (toolPrefix ? `${toolPrefix} ${prompt.trim()}` : prompt.trim());

        if (validKlingEls.length > 0) {
          payload.kling_elements = await Promise.all(
            validKlingEls.map(async (el) => ({
              name: el.name.trim(),
              description: el.description.trim(),
              element_input_urls: await Promise.all(el.files.slice(0, 4).map((f) => fileToDataURL(f))),
            }))
          );
        } else {
          delete payload.kling_elements;
        }

        // ── PAYLOAD VERIFICATION LOG ─────────────────────────────────────────
        // Logs a compact diagnostic payload (data URLs truncated to 60 chars)
        const debugPayload = {
          model: "kling-3.0/video",
          prompt: payload.prompt,
          mode: payload.mode,
          duration: payload.duration,
          aspect_ratio: payload.aspect_ratio,
          multi_shots: payload.multi_shots,
          sound: payload.sound,
          image_urls: (payload.image_urls as string[]).map(
            (u, i) => `[frame_${i}] ${u.slice(0, 60)}…`
          ),
          multi_prompt: payload.multi_prompt,
          kling_elements: Array.isArray(payload.kling_elements)
            ? (payload.kling_elements as Array<{name:string;description:string;element_input_urls:string[]}>).map(el => ({
                name: el.name,
                description: el.description,
                images: el.element_input_urls.map((u,i)=>`[el_img_${i}] ${u.slice(0,60)}…`),
              }))
            : [],
        };
        console.log("[Kling 3.0] ✅ Final payload (before send):", JSON.stringify(debugPayload, null, 2));
      }

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelRoute: selectedModel.api_route, payload }),
      });

      let data: { taskId?: string; error?: string } = {};
      const clonedRes = res.clone();
      try {
        data = await res.json();
      } catch {
        const text = await clonedRes.text().catch(() => "");
        const preview = text.slice(0, 200);
        console.error("[video POST] non-JSON response", res.status, preview);
        setGenerationError(preview || `Server error (${res.status})`);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || !data.taskId) {
        setGenerationError(data.error ?? "Failed to start generation");
        setIsSubmitting(false);
        return;
      }

      // Kling 3.0 i2v auto-adapts to the start frame's aspect — prefer detected ratio when available
      const isKling30 = selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
      const _capturedRatio = (isKling30 && startFrame && startFrameRatio)
        ? startFrameRatio
        : (aspectRatio ?? (size ? sizeToRatio(size) : "16:9"));
      setPendingTasks(prev => new Map(prev).set(data.taskId!, { model: selectedModel, promptText: basePrompt, ratio: _capturedRatio, duration }));
      setIsSubmitting(false);
      startPolling(data.taskId, { model: selectedModel, promptText: basePrompt, ratio: _capturedRatio, duration });
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
    }
  }, [
    activeTool, prompt, selectedModel, caps,
    startFrame, endFrame, motionVideo, referenceImages, size, aspectRatio, startFrameRatio, duration, resolution,
    negPrompt, cfgScale, sound, shotType, multiPrompts, elementList,
    sceneControl, orientation, startPolling,
    klingEls, kling30MultiEnabled, kling30MultiMode, kling30CustomShots,
  ]);

  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const bStyle = selectedModel.badge
    ? BADGE_STYLE[selectedModel.badge as keyof typeof BADGE_STYLE]
    : null;

  const isKling30Video =
    selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
  const multiShotEnabled = caps.has_multi_prompt && (multiPrompts.length > 1 || multiPrompts[0] !== "");
  const showImageInput = caps.requires_image || caps.optional_image;
  // Kling 3.0 spec: end frame is NOT supported in multi-shot mode — uses kling30MultiEnabled (not generic)
  const showEndFrame   = caps.has_end_frame && !(isKling30Video && kling30MultiEnabled);
  const showVideoInput = caps.requires_video;
  const showOmniTabs   = caps.has_omni_tabs;
  // Kling 3.0 uses image_urls for start/end frames — no separate reference images section
  const showReferenceImages = caps.max_reference_images > 0 && !isKling30Video;
  const showSimpleKlingRefs = false; // Kling 3.0 now uses start/end frame inputs directly
  const showKling30Elements = isKling30Video && caps.has_element_list;

  // Kling 3.0 computed values
  const kling30ShotCount = Math.min(5, Math.max(1, Math.floor((duration ?? 9) / 3)));
  const kling30CustomTotalDuration = kling30CustomShots.reduce((sum, s) => sum + s.duration, 0);
  const kling30DurationTarget = duration ?? 9;
  const kling30CustomDurationValid = kling30CustomTotalDuration === kling30DurationTarget;
  const kling30CustomDurationRemaining = kling30DurationTarget - kling30CustomTotalDuration;
  const maxShotsAllowed = (() => {
    if (!caps.has_multi_prompt) return 1;
    const hardMax = 5;
    if (duration == null) return hardMax;
    return Math.max(1, Math.min(hardMax, Math.floor(duration / 3)));
  })();
  const canAddMoreShots = multiPrompts.length < maxShotsAllowed;
  const hasMainPrompt = prompt.trim().length > 0;
  const hasMultiPrompt = multiPrompts.some((s) => s.trim().length > 0);
  const isSeedanceV2Model = selectedModel.id.startsWith("bytedance-seedance-v2");
  const hasRequiredImageInput =
    !caps.requires_image || !!startFrame || referenceImages.length > 0;
  const hasRequiredVideoInput = !caps.requires_video || !!motionVideo;
  const canGenerate = isKling30Video
    ? (
        (kling30MultiEnabled
          ? (kling30MultiMode === "auto"
              ? true // auto builds prompts automatically
              : kling30CustomShots.some(s => s.prompt.trim()) && kling30CustomDurationValid)
          : hasMainPrompt) &&
        hasRequiredImageInput &&
        hasRequiredVideoInput
      )
    : (
        (hasMainPrompt || (multiShotEnabled && hasMultiPrompt)) &&
        hasRequiredImageInput &&
        hasRequiredVideoInput
      );
  const activeMultiPromptIndexes = multiPrompts
    .map((value, index) => ({ value: value.trim(), index }))
    .filter((item) => item.value.length > 0);
  const shotDurationsByIndex = (() => {
    const out: Record<number, number> = {};
    if (duration == null || activeMultiPromptIndexes.length === 0) return out;
    const count = activeMultiPromptIndexes.length;
    const split = splitShotDurations(duration, count);
    activeMultiPromptIndexes.forEach((item, idx) => {
      out[item.index] = split[idx] ?? 0;
    });
    return out;
  })();

  useEffect(() => {
    if (!caps.has_multi_prompt) return;
    setMultiPrompts((prev) => {
      if (prev.length <= maxShotsAllowed) return prev;
      return prev.slice(0, maxShotsAllowed);
    });
  }, [caps.has_multi_prompt, maxShotsAllowed]);

  const estimatedCredits = (() => {
    const base = getGenerationCostSync(
      selectedModel.api_route,
      duration ?? 5,
      1,
      resolution ?? undefined,
    );
    const soundMultiplier = caps.has_sound && sound ? 1.5 : 1;
    return parseFloat((base * soundMultiplier).toFixed(2));
  })();

  // -- Render -------------------------------------------------------------------

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - 56px)", background: "#03060f", color: "#e2e8f0" }}
    >
      {/* -- Left Sidebar --------------------------------------------------- */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col overflow-y-auto border-r"
        style={{ width: 220, borderColor: "rgba(255,255,255,0.05)", background: "#050a14" }}
      >
        <div className="px-3 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
            Video Tools
          </span>
        </div>
        {TOOLS.map(t => {
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className="group relative flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-all"
              style={{
                borderLeft: active ? "2px solid #06b6d4" : "2px solid transparent",
                background:  active ? "rgba(6,182,212,0.08)" : "transparent",
                color:       active ? "#e2e8f0" : "#64748b",
              }}
            >
              <t.icon size={14} style={{ color: active ? "#06b6d4" : "#475569", flexShrink: 0 }} />
              <span className="text-[13px] font-medium leading-tight">{t.label}</span>
              {active && (
                <motion.div
                  layoutId="active-tool-glow"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.06) 0%, transparent 100%)" }}
                />
              )}
            </button>
          );
        })}
      </aside>

      {/* -- Center Panel --------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[60px] lg:pb-0">
        {/* Results grid */}
        <div className="flex-1 overflow-y-auto px-4">
          {results.length === 0 && pendingTasks.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 80, height: 80, borderRadius: 20,
                  background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)",
                }}
              >
                <Film size={40} style={{ color: "rgba(6,182,212,0.4)" }} />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-medium text-white">Generate your first video</p>
                <p className="mt-1 text-sm" style={{ color: "#475569" }}>
                  Write a prompt below and hit Generate
                </p>
              </div>
            </div>
          ) : (
            <MediaGrid
              items={results}
              skeletonModels={Array.from(pendingTasks.values()).map(t => ({ name: t.model.name, ratio: t.ratio }))}
              onInspect={(item) => setInspectorAsset({ id: item.id, type: item.type, url: item.src, prompt: item.prompt ?? "", model: item.model, date: item.createdAt ? item.createdAt.toISOString() : undefined })}
              onDelete={async (id) => {
                setResults(prev => prev.filter(r => r.id !== id));
                try {
                  await fetch("/api/assets", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                  });
                } catch { /* rollback not needed — next refresh will re-fetch */ }
              }}
            />
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {generationError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
              <span className="text-[12px] flex-1" style={{ color: "#fca5a5" }}>{generationError}</span>
              <button onClick={() => setGenerationError(null)}>
                <X size={12} style={{ color: "#6b7280" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned prompt bar */}
        <div
          className="flex-shrink-0 mx-4 mb-4 mt-2 rounded-xl flex items-center gap-2 px-3"
          style={{
            minHeight: 52,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(isSubmitting || pendingTasks.size > 0)
            ? <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "#06b6d4" }} />
            : <Sparkles size={14} style={{ color: "#06b6d4", flexShrink: 0 }} />
          }
          <textarea
            rows={1}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={
              isKling30Video
                ? "Describe the video… use @image1 for references"
                : "Describe the video you want to create…"
            }
            className="flex-1 bg-transparent outline-none text-[13px] resize-none py-3 leading-relaxed"
            style={{ color: "#e2e8f0" }}
          />
          {prompt && (
            <button onClick={() => setPrompt("")}>
              <X size={13} style={{ color: "#475569" }} />
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              background:   isSubmitting || !canGenerate ? "rgba(255,255,255,0.05)" : "rgba(6,182,212,0.15)",
              border:       `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.06)" : "rgba(6,182,212,0.35)"}`,
              color:        isSubmitting || !canGenerate ? "#475569" : "#06b6d4",
              cursor:       isSubmitting || !canGenerate ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Film size={12} />
                <span>Generate</span>
                {pendingTasks.size > 0 && (
                  <span style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.35)", borderRadius: 10, padding: "0 5px", fontSize: 10, color: "#06b6d4", lineHeight: 1.6 }}>
                    {pendingTasks.size}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* -- Right Sidebar --------------------------------------------------- */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col border-l overflow-y-auto"
        style={{ width: 288, borderColor: "rgba(255,255,255,0.05)", background: "#050a14" }}
      >
        <div className="flex flex-col gap-5 p-4 flex-1">

          {/* -- Model info banner (shown on model switch) ----------------- */}
          <AnimatePresence>
            {modelBanner && (
              <motion.div
                key={modelBanner.id}
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,   scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-xl p-3 overflow-hidden"
                style={{
                  background: hexA(modelBanner.family_color, 0.1),
                  border: `1px solid ${hexA(modelBanner.family_color, 0.35)}`,
                }}
              >
                {/* Glow accent */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${modelBanner.family_color}, transparent)` }}
                />
                <div className="flex items-start gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: modelBanner.family_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: modelBanner.family_color }}>
                        {prettyModelName(modelBanner.name)}
                      </span>
                      {modelBanner.badge && BADGE_STYLE[modelBanner.badge as keyof typeof BADGE_STYLE] && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: BADGE_STYLE[modelBanner.badge as keyof typeof BADGE_STYLE].bg,
                            color:      BADGE_STYLE[modelBanner.badge as keyof typeof BADGE_STYLE].text,
                          }}
                        >
                          {modelBanner.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#94a3b8" }}>
                      {modelBanner.description}
                    </p>
                    {/* Capability pills */}
                    <div className="flex flex-wrap gap-1">
                      {modelBanner.capabilities.durations.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          ⏱ {modelBanner.capabilities.durations[0]}–{modelBanner.capabilities.durations[modelBanner.capabilities.durations.length - 1]}s
                        </span>
                      )}
                      {modelBanner.capabilities.resolutions.map(r => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          {r}
                        </span>
                      ))}
                      {modelBanner.capabilities.requires_image && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          🖼 Image req.
                        </span>
                      )}
                      {modelBanner.capabilities.max_reference_images > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          Max {modelBanner.capabilities.max_reference_images} refs
                        </span>
                      )}
                      {modelBanner.capabilities.aspect_ratios.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          {modelBanner.capabilities.aspect_ratios.length} ratios
                        </span>
                      )}
                      {modelBanner.capabilities.has_sound && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                          🔊 Audio
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setModelBanner(null); if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); }}
                    className="flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
                  >
                    <X size={11} style={{ color: "#475569" }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -- Motion Control inputs (video + character) ----------------- */}
          {showVideoInput && (
            <div className="flex gap-2">
              {/* Motion reference video */}
              <button
                onClick={() => openMediaPicker("motionVideo")}
                onDragOver={allowDrop}
                onDragEnter={(event) => markDropZone(event, "motionVideo")}
                onDragLeave={(event) => clearDropZone(event, "motionVideo")}
                onDrop={(event) => handleDropSingleVideo(event, setMotionVideo)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all"
                style={{
                  height: 100,
                  borderColor: motionVideo ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                  background:  motionVideo ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  ref={motionVideoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => setMotionVideo(e.target.files?.[0] ?? null)}
                />
                {motionVideo ? (
                  <>
                    <Film size={18} style={{ color: selectedModel.family_color }} />
                    <span className="text-[10px] px-1 text-center leading-tight" style={{ color: selectedModel.family_color }}>
                      {motionVideo.name.slice(0, 12)}…
                    </span>
                    <button className="absolute top-2 left-2" onClick={e => { e.stopPropagation(); setMotionVideo(null); }}>
                      <X size={11} style={{ color: "#475569" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Film size={16} style={{ color: "#475569" }} />
                    </div>
                    <span className="text-[10px] text-center leading-tight px-1" style={{ color: "#475569" }}>Add motion to copy *</span>
                    <span className="text-[9px]" style={{ color: "#334155" }}>3–30 seconds</span>
                  </>
                )}
                {activeDropZone === "motionVideo" && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                    Drop video here
                  </span>
                )}
              </button>

              {/* Character image */}
              <button
                onClick={() => openMediaPicker("startFrame")}
                onDragOver={allowDrop}
                onDragEnter={(event) => markDropZone(event, "startFrame")}
                onDragLeave={(event) => clearDropZone(event, "startFrame")}
                onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all"
                style={{
                  height: 100,
                  borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                  background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  ref={startFrameRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                />
                {startFrame ? (
                  <>
                    {startFramePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={startFramePreview}
                        alt="Character image preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                      />
                    )}
                    <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                      {startFrame.name}
                    </span>
                    <button className="absolute top-2 left-2" onClick={e => { e.stopPropagation(); setStartFrame(null); }}>
                      <X size={11} style={{ color: "#475569" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <ImageIcon size={16} style={{ color: "#475569" }} />
                    </div>
                    <span className="text-[10px] text-center leading-tight px-1" style={{ color: "#475569" }}>Add your character *</span>
                    <span className="text-[9px] text-center px-1" style={{ color: "#334155" }}>Face and body</span>
                  </>
                )}
                {activeDropZone === "startFrame" && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                    Drop image here
                  </span>
                )}
              </button>
            </div>
          )}

          {/* -- Omni: Elements / Frames tabs ------------------------------- */}
          {showOmniTabs && (
            <div className="flex flex-col gap-2">
              {/* Tab switcher */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {(["elements", "frames"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOmniTab(tab)}
                    className="flex-1 py-2 text-[12px] font-semibold capitalize transition-all"
                    style={{
                      background: omniTab === tab ? hexA(selectedModel.family_color, 0.15) : "transparent",
                      color:      omniTab === tab ? selectedModel.family_color : "#64748b",
                      borderBottom: omniTab === tab ? `2px solid ${selectedModel.family_color}` : "2px solid transparent",
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Elements tab — element reference image */}
              {omniTab === "elements" && (
                <button
                  onClick={() => openMediaPicker("startFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "startFrame")}
                  onDragLeave={(event) => clearDropZone(event, "startFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all w-full"
                  style={{
                    height: 110,
                    borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={startFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                  />
                  {startFrame ? (
                    <>
                      {startFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={startFramePreview}
                          alt="Element image preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                        {startFrame.name}
                      </span>
                      <button className="absolute top-2 left-2" onClick={e => { e.stopPropagation(); setStartFrame(null); }}>
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <ImageIcon size={18} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Add consistent element</span>
                      <span className="text-[11px]" style={{ color: "#475569" }}>Character, person or object</span>
                    </>
                  )}
                </button>
              )}

              {/* Frames tab — Start + End frame */}
              {omniTab === "frames" && (
                <div className="flex gap-2">
                  {/* Start frame */}
                  <button
                    onClick={() => openMediaPicker("startFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "startFrame")}
                    onDragLeave={(event) => clearDropZone(event, "startFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                    style={{
                      height: 110,
                      borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                      background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <input
                      ref={startFrameRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                    />
                    {startFrame ? (
                      <>
                        {startFramePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={startFramePreview}
                            alt="Start frame preview"
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          />
                        )}
                        <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                          {startFrame.name}
                        </span>
                        <button className="absolute top-2 left-2" onClick={e => { e.stopPropagation(); setStartFrame(null); }}>
                          <X size={11} style={{ color: "#475569" }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ImageIcon size={16} style={{ color: "#475569" }} />
                        </div>
                        <span className="text-[11px]" style={{ color: "#475569" }}>Start frame</span>
                      </>
                    )}
                    {activeDropZone === "startFrame" && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                        Drop image here
                      </span>
                    )}
                  </button>

                  {/* End frame */}
                  <button
                    onClick={() => openMediaPicker("endFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "endFrame")}
                    onDragLeave={(event) => clearDropZone(event, "endFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                    style={{
                      height: 110,
                      borderColor: endFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                      background:  endFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <input
                      ref={endFrameRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setEndFrame(e.target.files?.[0] ?? null)}
                    />
                    <span
                      className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                    >
                      Optional
                    </span>
                    {endFrame ? (
                      <>
                        {endFramePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={endFramePreview}
                            alt="End frame preview"
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          />
                        )}
                        <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                          {endFrame.name}
                        </span>
                        <button className="absolute top-2 left-2" onClick={e => { e.stopPropagation(); setEndFrame(null); }}>
                          <X size={11} style={{ color: "#475569" }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ImageIcon size={16} style={{ color: "#475569" }} />
                        </div>
                        <span className="text-[11px]" style={{ color: "#475569" }}>End frame</span>
                      </>
                    )}
                    {activeDropZone === "endFrame" && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                        Drop image here
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* -- Omni: Reference images (shown alongside Omni tabs) -------- */}
          {showOmniTabs && (showReferenceImages || showSimpleKlingRefs) && (
            <button
              onClick={() => openMediaPicker("referenceImages")}
              onDragOver={allowDrop}
              onDragEnter={(event) => markDropZone(event, "referenceImages")}
              onDragLeave={(event) => clearDropZone(event, "referenceImages")}
              onDrop={handleDropReferenceImages}
              className="relative w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
              style={{
                height: 100,
                borderColor: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                background:  referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
              }}
            >
              <input
                ref={referenceImagesRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  const maxRefs = showSimpleKlingRefs ? 3 : selectedModel.capabilities.max_reference_images;
                  setReferenceImages(files.slice(0, maxRefs));
                }}
              />
              <span
                className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
              >
                {`Max ${showSimpleKlingRefs ? 3 : caps.max_reference_images}`}
              </span>
              {referenceImages.length > 0 ? (
                <>
                  {referencePreviews.length > 0 && (
                    <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1">
                      {referencePreviews.slice(0, 3).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`Reference preview ${i + 1}`}
                          className="w-full h-full object-cover rounded-md opacity-75"
                        />
                      ))}
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200 text-center leading-tight">
                    {`${referenceImages.length} reference image(s)`}
                  </span>
                  <button
                    className="absolute top-2 left-2"
                    onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                  >
                    <X size={11} style={{ color: "#475569" }} />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <ImageIcon size={16} style={{ color: "#475569" }} />
                  </div>
                  <span className="text-[11px]" style={{ color: "#475569" }}>Reference images</span>
                </>
              )}
              {activeDropZone === "referenceImages" && (
                <span className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                  Drop images here
                </span>
              )}
            </button>
          )}

          {/* -- Image inputs (Start / End frame) -------------------------- */}
          {/* NOTE: Kling 3.0 has its own dedicated FRAMES section below — hide generic here */}
          {!showVideoInput && !showOmniTabs && !isKling30Video && (showImageInput || showEndFrame) && (
            <div className="flex gap-2">
              {showImageInput && (
                <button
                  onClick={() => openMediaPicker("startFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "startFrame")}
                  onDragLeave={(event) => clearDropZone(event, "startFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={startFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                  />
                  {!caps.requires_image && (
                    <span
                      className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                    >
                      Optional
                    </span>
                  )}
                  {startFrame ? (
                    <>
                      {startFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={startFramePreview}
                          alt="Start frame preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                        {startFrame.name}
                      </span>
                      <button
                        className="absolute top-2 left-2"
                        onClick={e => { e.stopPropagation(); setStartFrame(null); }}
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>
                        {caps.requires_image ? "Upload image *" : "Start frame"}
                      </span>
                    </>
                  )}
                  {activeDropZone === "startFrame" && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      Drop image here
                    </span>
                  )}
                </button>
              )}

              {showEndFrame && (
                <button
                  onClick={() => openMediaPicker("endFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "endFrame")}
                  onDragLeave={(event) => clearDropZone(event, "endFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: endFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  endFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={endFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setEndFrame(e.target.files?.[0] ?? null)}
                  />
                  <span
                    className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                  >
                    Optional
                  </span>
                  {endFrame ? (
                    <>
                      {endFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={endFramePreview}
                          alt="End frame preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200">
                        {endFrame.name}
                      </span>
                      <button
                        className="absolute top-2 left-2"
                        onClick={e => { e.stopPropagation(); setEndFrame(null); }}
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>End frame</span>
                    </>
                  )}
                  {activeDropZone === "endFrame" && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      Drop image here
                    </span>
                  )}
                </button>
              )}

              {(showReferenceImages || showSimpleKlingRefs) && (
                <button
                  onClick={() => openMediaPicker("referenceImages")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "referenceImages")}
                  onDragLeave={(event) => clearDropZone(event, "referenceImages")}
                  onDrop={handleDropReferenceImages}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={referenceImagesRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      const maxRefs = showSimpleKlingRefs ? 3 : selectedModel.capabilities.max_reference_images;
                      setReferenceImages(files.slice(0, maxRefs));
                    }}
                  />
                  <span
                    className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                  >
                    {`Max ${showSimpleKlingRefs ? 3 : caps.max_reference_images}`}
                  </span>
                  {referenceImages.length > 0 ? (
                    <>
                      {referencePreviews.length > 0 && (
                        <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                          {referencePreviews.slice(0, 4).map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={src}
                              alt={`Reference preview ${i + 1}`}
                              className="w-full h-full object-cover rounded-md opacity-75"
                            />
                          ))}
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200 text-center leading-tight">
                        {`${referenceImages.length} reference image(s)`}
                      </span>
                      <button
                        className="absolute top-2 left-2"
                        onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>Reference images</span>
                    </>
                  )}
                  {activeDropZone === "referenceImages" && (
                    <span className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      Drop images here
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

              {(showReferenceImages || showSimpleKlingRefs) && referenceImages.length > 0 && (
                <p className="text-[10px] -mt-3" style={{ color: "#64748b" }}>
                  {showSimpleKlingRefs
                    ? "Use @image1, @image2, @image3 inside prompt/shot prompts to activate references."
                    : "Reference images mode is active; first/last frame inputs will be ignored for this generation."}
                </p>
              )}

          {/* -- AI Model dropdown ------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
              AI Model
            </label>
            <div className="relative">
              <button
                onClick={() => setModelOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedModel.family_color }} />
                <span className="flex-1 text-[13px]" style={{ color: "#e2e8f0" }}>{prettyModelName(selectedModel.name)}</span>
                {bStyle && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                    style={{ background: bStyle.bg, color: bStyle.text }}
                  >
                    {selectedModel.badge}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  style={{
                    color: "#475569",
                    transform: modelOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>

              <AnimatePresence>
                {modelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-y-auto py-1"
                    style={{
                      background: "#0a1220",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 16px 32px rgba(0,0,0,0.6)",
                      maxHeight: 320,
                    }}
                  >
                    {MODEL_GROUPS.map(g => (
                      <div key={g.family}>
                        <div className="flex items-center gap-2 px-3 pt-3 pb-1 select-none">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.family_color }} />
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: g.family_color, opacity: 0.85 }}
                          >
                            {g.family_label}
                          </span>
                          <div className="flex-1 h-px" style={{ background: hexA(g.family_color, 0.2) }} />
                        </div>
                        {g.models.map(m => {
                          const bs = m.badge ? BADGE_STYLE[m.badge as keyof typeof BADGE_STYLE] : null;
                          return (
                            <button
                              key={m.id}
                              onClick={() => selectModel(m)}
                              className="w-full flex items-center gap-2 px-4 py-2 transition-all"
                              style={{
                                background: selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent",
                                color:      selectedModel.id === m.id ? "#e2e8f0" : "#94a3b8",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                              onMouseLeave={e => (e.currentTarget.style.background = selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent")}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.family_color }} />
                              <span className="flex-1 text-left text-[13px]">{prettyModelName(m.name)}</span>
                              {bs && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                                  style={{ background: bs.bg, color: bs.text }}
                                >
                                  {m.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              KLING 3.0 — Dedicated full-spec panel
              ════════════════════════════════════════════════════════════ */}
          {isKling30Video && (
            <div className="flex flex-col gap-4">

              {/* -- Start / End Frame ---------------------------------------- */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Frames</label>

                {/* Side-by-side cards */}
                <div className="grid grid-cols-2 gap-3">

                  {/* ── Start frame ── */}
                  <button
                    onClick={() => openMediaPicker("startFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "startFrame")}
                    onDragLeave={(event) => clearDropZone(event, "startFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                    className="relative flex flex-col items-center justify-center gap-2 rounded-2xl transition-all overflow-hidden aspect-square w-full"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${startFrame ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <input ref={startFrameRef} type="file" accept="image/*" className="hidden" onChange={e => setStartFrame(e.target.files?.[0] ?? null)} />
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md z-10" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>Optional</span>
                    {startFrame ? (
                      <>
                        {startFramePreview && <img src={startFramePreview} alt="Start" className="absolute inset-0 w-full h-full object-contain" style={{ padding: 8, background: "#000" }} />}
                        <button className="absolute top-2 left-2 z-10 rounded-full p-1" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { e.stopPropagation(); setStartFrame(null); }}><X size={14} style={{ color: "#fff" }} /></button>
                      </>
                    ) : (
                      <>
                        <div className="rounded-full p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <ImageIcon size={20} style={{ color: "#64748b" }} />
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Start frame</span>
                      </>
                    )}
                    {activeDropZone === "startFrame" && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-cyan-500/15 text-[11px] font-semibold text-cyan-300">Drop here</span>}
                  </button>

                  {/* ── End frame ── */}
                  {!kling30MultiEnabled ? (
                    <button
                      onClick={() => openMediaPicker("endFrame")}
                      onDragOver={allowDrop}
                      onDragEnter={(event) => markDropZone(event, "endFrame")}
                      onDragLeave={(event) => clearDropZone(event, "endFrame")}
                      onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl transition-all overflow-hidden aspect-square w-full"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${endFrame ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <input ref={endFrameRef} type="file" accept="image/*" className="hidden" onChange={e => setEndFrame(e.target.files?.[0] ?? null)} />
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md z-10" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>Optional</span>
                      {endFrame ? (
                        <>
                          {endFramePreview && <img src={endFramePreview} alt="End" className="absolute inset-0 w-full h-full object-contain" style={{ padding: 8, background: "#000" }} />}
                          <button className="absolute top-2 left-2 z-10 rounded-full p-1" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { e.stopPropagation(); setEndFrame(null); }}><X size={14} style={{ color: "#fff" }} /></button>
                        </>
                      ) : (
                        <>
                          <div className="rounded-full p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <ImageIcon size={20} style={{ color: "#64748b" }} />
                          </div>
                          <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>End frame</span>
                        </>
                      )}
                      {activeDropZone === "endFrame" && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-purple-500/15 text-[11px] font-semibold text-purple-300">Drop here</span>}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl aspect-square w-full opacity-25" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-[10px] text-center px-2" style={{ color: "#334155" }}>N/A in multi-shot</span>
                    </div>
                  )}
                </div>

                {/* Duplicate warning */}
                {startFrame && endFrame && !kling30MultiEnabled && startFrame.size === endFrame.size && (
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span className="text-[9px] font-semibold" style={{ color: "#f87171" }}>⚠ Both slots have the same image!</span>
                  </div>
                )}
              </div>

              {/* -- Duration slider ------------------------------------------ */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Duration</label>
                  <span className="text-[13px] font-bold" style={{ color: selectedModel.family_color }}>{duration ?? 9}s</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={1}
                  value={duration ?? 9}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setDuration(v);
                    // Auto mode: clamp custom shots if over new max
                    if (kling30MultiMode === "custom") {
                      const maxShots = Math.min(5, Math.floor(v / 3));
                      setKling30CustomShots(prev => prev.slice(0, Math.max(1, maxShots)));
                    }
                  }}
                  className="w-full h-1.5 rounded outline-none cursor-pointer"
                  style={{ accentColor: selectedModel.family_color }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: "#334155" }}>
                  <span>3s</span>
                  {kling30MultiEnabled && kling30MultiMode === "auto" && (
                    <span style={{ color: "#64748b" }}>→ {kling30ShotCount} shot{kling30ShotCount > 1 ? "s" : ""}</span>
                  )}
                  <span>15s</span>
                </div>
              </div>

              {/* -- Aspect Ratio --------------------------------------------- */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Aspect Ratio</label>
                <div className="flex gap-1">
                  {(["16:9", "9:16", "1:1"] as const).map(r => {
                    const effectiveRatio = startFrame ? (startFrameRatio ?? aspectRatio) : aspectRatio;
                    const isActive = effectiveRatio === r;
                    const isDisabled = !!startFrame;
                    return (
                      <button
                        key={r}
                        onClick={() => !isDisabled && setAspectRatio(r)}
                        disabled={isDisabled}
                        className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                        style={{
                          background: isActive ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                          border:     isActive ? `1px solid ${hexA(selectedModel.family_color, 0.5)}` : "1px solid rgba(255,255,255,0.06)",
                          color:      isActive ? selectedModel.family_color : "#64748b",
                          opacity:    isDisabled && !isActive ? 0.4 : 1,
                          cursor:     isDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* -- Resolution (720p std / 1080p pro) ------------------------ */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Resolution</label>
                <div className="flex gap-1">
                  {([["std", "720p"], ["pro", "1080p"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setResolution(val)}
                      className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: resolution === val ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                        border:     resolution === val ? `1px solid ${hexA(selectedModel.family_color, 0.5)}` : "1px solid rgba(255,255,255,0.06)",
                        color:      resolution === val ? selectedModel.family_color : "#64748b",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px]" style={{ color: "#334155" }}>
                  {resolution === "pro"
                    ? (aspectRatio === "16:9" ? "1920×1080" : aspectRatio === "9:16" ? "1080×1920" : "1080×1080")
                    : (aspectRatio === "16:9" ? "1280×720" : aspectRatio === "9:16" ? "720×1280" : "720×720")}
                </p>
              </div>

              {/* -- Multi-shot toggle ---------------------------------------- */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Multi-shot</span>
                  <span className="text-[10px]" style={{ color: "#475569" }}>Multiple scenes in one video</span>
                </div>
                <button
                  onClick={() => {
                    const next = !kling30MultiEnabled;
                    setKling30MultiEnabled(next);
                    if (next && endFrame) setEndFrame(null); // clear end frame when enabling multi-shot
                  }}
                  className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                  style={{ background: kling30MultiEnabled ? hexA(selectedModel.family_color, 0.7) : "rgba(255,255,255,0.08)" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: kling30MultiEnabled ? "calc(100% - 18px)" : 2 }}
                  />
                </button>
              </div>

              {/* -- Multi-shot Builder --------------------------------------- */}
              {kling30MultiEnabled && (
                <div className="flex flex-col gap-3">
                  {/* Auto / Custom tabs */}
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {(["auto", "custom"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setKling30MultiMode(mode)}
                        className="flex-1 py-2 text-[12px] font-semibold capitalize transition-all"
                        style={{
                          background: kling30MultiMode === mode ? hexA(selectedModel.family_color, 0.15) : "transparent",
                          color:      kling30MultiMode === mode ? selectedModel.family_color : "#64748b",
                          borderBottom: kling30MultiMode === mode ? `2px solid ${selectedModel.family_color}` : "2px solid transparent",
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* AUTO MODE */}
                  {kling30MultiMode === "auto" && (
                    <div
                      className="rounded-xl p-3 flex flex-col gap-1"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>Shots</span>
                        <span className="text-[14px] font-bold" style={{ color: selectedModel.family_color }}>{kling30ShotCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>Duration per shot</span>
                        <span className="text-[12px]" style={{ color: "#64748b" }}>≈ {Math.floor((duration ?? 9) / kling30ShotCount)}s each</span>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                        Auto divides {duration ?? 9}s into {kling30ShotCount} scene{kling30ShotCount > 1 ? "s" : ""} using your prompt.
                      </p>
                    </div>
                  )}

                  {/* CUSTOM MODE */}
                  {kling30MultiMode === "custom" && (
                    <div className="flex flex-col gap-2">
                      {/* Duration status bar */}
                      <div
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          background: kling30CustomDurationValid ? "rgba(16,185,129,0.08)" : kling30CustomDurationRemaining < 0 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                          border: `1px solid ${kling30CustomDurationValid ? "rgba(16,185,129,0.3)" : kling30CustomDurationRemaining < 0 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                        }}
                      >
                        <span className="text-[11px]" style={{ color: kling30CustomDurationValid ? "#34d399" : kling30CustomDurationRemaining < 0 ? "#f87171" : "#fbbf24" }}>
                          {kling30CustomDurationValid
                            ? `✓ ${kling30CustomTotalDuration}s — matches target`
                            : kling30CustomDurationRemaining > 0
                              ? `${kling30CustomTotalDuration}s / ${kling30DurationTarget}s — ${kling30CustomDurationRemaining}s remaining`
                              : `${kling30CustomTotalDuration}s / ${kling30DurationTarget}s — ${Math.abs(kling30CustomDurationRemaining)}s over`}
                        </span>
                      </div>

                      {/* Shot list */}
                      <div className="flex flex-col gap-1.5">
                        {kling30CustomShots.map((shot, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-1 rounded-xl p-2"
                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}` }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: hexA(selectedModel.family_color, 0.15), color: selectedModel.family_color }}
                              >
                                Shot {i + 1}
                              </span>
                              {/* Duration input */}
                              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                                <button
                                  onClick={() => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Math.max(1, s.duration - 1) } : s))}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[12px] font-bold"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                                >−</button>
                                <span className="text-[11px] w-6 text-center" style={{ color: selectedModel.family_color }}>{shot.duration}s</span>
                                <button
                                  onClick={() => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Math.min(12, s.duration + 1) } : s))}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[12px] font-bold"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                                >+</button>
                              </div>
                              {kling30CustomShots.length > 1 && (
                                <button onClick={() => setKling30CustomShots(prev => prev.filter((_, idx) => idx !== i))}>
                                  <X size={10} style={{ color: "#475569" }} />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={shot.prompt}
                              onChange={e => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, prompt: e.target.value } : s))}
                              placeholder={`Scene ${i + 1} description…`}
                              rows={2}
                              className="w-full bg-transparent rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
                              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}`, color: "#94a3b8" }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Add shot button */}
                      {kling30CustomShots.length < Math.min(5, Math.floor((duration ?? 9) / 1)) && (
                        <button
                          onClick={() => setKling30CustomShots(prev => [...prev, { prompt: "", duration: 3 }])}
                          className="text-[11px] py-2 rounded-lg transition-all"
                          style={{ background: hexA(selectedModel.family_color, 0.08), color: selectedModel.family_color, border: `1px dashed ${hexA(selectedModel.family_color, 0.3)}` }}
                        >
                          + Add Shot ({kling30CustomShots.length}/5 max)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* -- Elements system ------------------------------------------ */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                    Elements
                  </label>
                  {klingEls.length < 3 && (
                    <button
                      onClick={() => setKlingEls(prev => [...prev, { name: "", description: "", files: [], previews: [] }])}
                      className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                      style={{ background: hexA(selectedModel.family_color, 0.12), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.3)}` }}
                    >
                      + Add Element
                    </button>
                  )}
                </div>
                {klingEls.length === 0 && (
                  <p className="text-[10px]" style={{ color: "#334155" }}>
                    Elements let you reference consistent characters or objects using <span style={{ color: "#64748b" }}>@element_name</span> in your prompt.
                  </p>
                )}
                {klingEls.map((el, elIdx) => {
                  const trimmedName = el.name.trim();
                  const trimmedDesc = el.description.trim();
                  const validImages = el.files.filter(Boolean).length;
                  const isInPrompt = trimmedName ? new RegExp(`@${trimmedName}\\b`, "i").test(prompt) : false;
                  const isComplete = trimmedName && trimmedDesc && validImages >= 2 && isInPrompt;
                  return (
                  <div
                    key={elIdx}
                    className="flex flex-col gap-2 rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isComplete ? "rgba(16,185,129,0.4)" : hexA(selectedModel.family_color, 0.2)}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium" style={{ color: selectedModel.family_color }}>Element {elIdx + 1}</span>
                        {isComplete ? (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>✓ Ready</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>⚠ Incomplete</span>
                        )}
                      </div>
                      <button onClick={() => setKlingEls(prev => prev.filter((_, i) => i !== elIdx))}><X size={11} style={{ color: "#475569" }} /></button>
                    </div>
                    <input
                      value={el.name}
                      onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") } : v))}
                      placeholder="Name (letters/digits only — used as @name)"
                      className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${trimmedName ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`, color: "#94a3b8" }}
                    />
                    <input
                      value={el.description}
                      onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, description: e.target.value } : v))}
                      placeholder="Brief description of this element"
                      className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${trimmedDesc ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`, color: "#94a3b8" }}
                    />
                    {/* Image slots (2 required + 2 optional) */}
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 4 }).map((_, imgIdx) => {
                        const preview = el.previews[imgIdx];
                        const hasFile = !!el.files[imgIdx];
                        const isRequired = imgIdx < 2;
                        return (
                          <label
                            key={imgIdx}
                            className="relative flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer overflow-hidden"
                            style={{ height: 52, borderColor: hasFile ? hexA(selectedModel.family_color, 0.5) : isRequired ? "rgba(100,116,139,0.4)" : "rgba(255,255,255,0.06)", background: hasFile ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)" }}
                          >
                            <input
                              type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = URL.createObjectURL(file);
                                setKlingEls(prev => prev.map((v, i) => {
                                  if (i !== elIdx) return v;
                                  const newFiles = [...v.files];
                                  const newPreviews = [...v.previews];
                                  if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                  newFiles[imgIdx] = file;
                                  newPreviews[imgIdx] = url;
                                  return { ...v, files: newFiles, previews: newPreviews };
                                }));
                              }}
                            />
                            {preview ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <button
                                  type="button" className="absolute top-0.5 right-0.5 z-10"
                                  onClick={e => {
                                    e.preventDefault();
                                    setKlingEls(prev => prev.map((v, i) => {
                                      if (i !== elIdx) return v;
                                      const nf = [...v.files]; const np = [...v.previews];
                                      if (np[imgIdx]) URL.revokeObjectURL(np[imgIdx]);
                                      nf.splice(imgIdx, 1); np.splice(imgIdx, 1);
                                      return { ...v, files: nf, previews: np };
                                    }));
                                  }}
                                ><X size={9} style={{ color: "#fff" }} /></button>
                              </>
                            ) : (
                              <span className="text-[8px] text-center px-1" style={{ color: isRequired ? "#64748b" : "#334155" }}>
                                {isRequired ? "Req." : "Opt."}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {el.files.filter(Boolean).length < 2 && (
                      <span className="text-[10px]" style={{ color: "#ef4444" }}>⚠ Upload at least 2 images for this element.</span>
                    )}
                    {trimmedName && (
                      <div className="flex items-center gap-1.5 flex-wrap rounded-lg px-2 py-1.5" style={{
                        background: isInPrompt ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                        border: `1px solid ${isInPrompt ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}>
                        {isInPrompt ? (
                          <span className="text-[9px] font-semibold" style={{ color: "#34d399" }}>✓ @{trimmedName} is in prompt</span>
                        ) : (
                          <>
                            <span className="text-[9px]" style={{ color: "#f87171" }}>⚠ Add to prompt:</span>
                            <button
                              onClick={() => setPrompt(prev => prev.trimEnd() + (prev ? " " : "") + `@${trimmedName}`)}
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ background: hexA(selectedModel.family_color, 0.18), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.4)}` }}
                            >
                              + Insert @{trimmedName}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* -- Sound ---------------------------------------------------- */}
              {caps.has_sound && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 size={13} style={{ color: "#475569" }} />
                    <div className="flex flex-col">
                      <span className="text-[12px]" style={{ color: "#64748b" }}>Generate Sound</span>
                      <span className="text-[10px]" style={{ color: "#475569" }}>AI-generated audio track · ×1.5 cost</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSound(v => !v)}
                    className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                    style={{ background: sound ? hexA(selectedModel.family_color, 0.7) : "rgba(255,255,255,0.08)" }}
                  >
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: sound ? "calc(100% - 18px)" : 2 }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              GENERIC controls — shown for all models EXCEPT Kling 3.0
              ════════════════════════════════════════════════════════════ */}
          {!isKling30Video && (<>

          {/* -- Duration ---------------------------------------------------- */}
          {durationChoices.length > 0 && duration != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Duration
              </label>
              <div className="relative">
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {durationChoices.map(d => (
                    <option key={d} value={d} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {d}s
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Aspect ratio ------------------------------------------------ */}
          {caps.aspect_ratios.length > 0 && aspectRatio != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Aspect Ratio
              </label>
              <div className="relative">
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {caps.aspect_ratios.map(r => (
                    <option key={r} value={r} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Orientation / Size (for size-based models like Sora 2) ------- */}
          {caps.sizes.length > 0 && size != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Orientation
              </label>
              <div className="relative">
                <select
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {caps.sizes.map(s => (
                    <option key={s} value={s} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {sizeLabel(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Quality ----------------------------------------------------- */}
          {resolutionChoices.length > 0 && resolution != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Quality
              </label>
              <div className="relative">
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#e2e8f0",
                  }}
                >
                  {resolutionChoices.map(r => (
                    <option key={r} value={r} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {r === "std" ? "std" : r === "pro" ? "pro" : r}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#475569" }}
                />
              </div>
            </div>
          )}

          {/* -- Scene Control Mode (Kling Motion) -------------------------- */}
          {caps.has_scene_control && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: "#64748b" }}>Scene Control Mode</span>
              </div>
              <button
                onClick={() => setSceneControl(v => !v)}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: sceneControl ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: sceneControl ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}

          {/* -- Orientation (Kling Motion) ---------------------------------- */}
          {caps.has_orientation && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Orientation
              </label>
              <div className="flex gap-1">
                {(["video", "image"] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    className="flex-1 py-2 rounded-lg text-[12px] font-medium capitalize transition-all"
                    style={{
                      background: orientation === o ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     orientation === o ? `1px solid ${hexA(selectedModel.family_color, 0.4)}` : "1px solid rgba(255,255,255,0.06)",
                      color:      orientation === o ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- CFG Scale --------------------------------------------------- */}
          {caps.has_cfg_scale && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  CFG Scale
                </label>
                <span className="text-[12px]" style={{ color: selectedModel.family_color }}>
                  {cfgScale.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={cfgScale}
                onChange={e => setCfgScale(parseFloat(e.target.value))}
                className="w-full h-1 rounded outline-none"
                style={{ accentColor: selectedModel.family_color }}
              />
              <div className="flex justify-between text-[10px]" style={{ color: "#334155" }}>
                <span>Flexible</span>
                <span>Strict</span>
              </div>
            </div>
          )}

          {/* -- Shot Type (Kling) -------------------------------------------- */}
          {caps.has_shot_type && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Shot Type
              </label>
              <div className="flex gap-1">
                {(["intelligent", "customize"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setShotType(st)}
                    className="flex-1 py-2 rounded-lg text-[12px] font-medium capitalize transition-all"
                    style={{
                      background: shotType === st ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     shotType === st ? `1px solid ${hexA(selectedModel.family_color, 0.4)}` : "1px solid rgba(255,255,255,0.06)",
                      color:      shotType === st ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- Multi-Prompt (Kling) ----------------------------------------- */}
          {caps.has_multi_prompt && showOmniTabs && (
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#64748b" }}>Multi-shot</span>
              <button
                onClick={() => setMultiPrompts(prev => prev.length === 1 && prev[0] === "" ? ["", ""] : [""])}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: multiShotEnabled ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: multiShotEnabled ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}
          {caps.has_multi_prompt && showOmniTabs && multiShotEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Multi-Shot Prompts
                </label>
                <button
                  onClick={() => {
                    if (!canAddMoreShots) return;
                    setMultiPrompts(prev => [...prev, ""]);
                  }}
                  disabled={!canAddMoreShots}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: hexA(selectedModel.family_color, 0.12),
                    color: canAddMoreShots ? selectedModel.family_color : "#64748b",
                    border: `1px solid ${canAddMoreShots ? hexA(selectedModel.family_color, 0.3) : "rgba(100,116,139,0.4)"}`,
                    cursor: canAddMoreShots ? "pointer" : "not-allowed",
                    opacity: canAddMoreShots ? 1 : 0.6,
                  }}
                >
                  + Add Shot
                </button>
              </div>
                {duration != null && activeMultiPromptIndexes.length > 0 && (
                  <span className="text-[10px]" style={{ color: "#64748b" }}>
                    Total {duration}s split across {activeMultiPromptIndexes.length} shot(s). Remainder goes to the last shot.
                  </span>
                )}
              <span className="text-[10px]" style={{ color: "#64748b" }}>
                Max shots for current duration: {maxShotsAllowed}
              </span>
              <div className="flex flex-col gap-1.5">
                {multiPrompts.map((mp, i) => (
                  <div key={i} className="relative">
                    <textarea
                      value={mp}
                      onChange={e => setMultiPrompts(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={isKling30Video ? `Shot ${i + 1} scene… use @image${Math.min(i + 1, 3)}` : `Shot ${i + 1} scene…`}
                      rows={2}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-16 text-[12px] outline-none resize-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${hexA(selectedModel.family_color, 0.2)}`,
                        color: "#94a3b8",
                      }}
                    />
                    {shotDurationsByIndex[i] != null && (
                      <span
                        className="absolute top-1.5 right-7 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                      >
                        {shotDurationsByIndex[i]}s
                      </span>
                    )}
                    {multiPrompts.length > 2 && (
                      <button
                        onClick={() => setMultiPrompts(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {caps.has_multi_prompt && !showOmniTabs && (
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#64748b" }}>Multi-shot</span>
              <button
                onClick={() => setMultiPrompts(prev => prev.length === 1 && prev[0] === "" ? ["", ""] : [""])}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: multiShotEnabled ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: multiShotEnabled ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}
          {caps.has_multi_prompt && !showOmniTabs && multiShotEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Multi-Shot Prompts
                </label>
                <button
                  onClick={() => {
                    if (!canAddMoreShots) return;
                    setMultiPrompts(prev => [...prev, ""]);
                  }}
                  disabled={!canAddMoreShots}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: hexA(selectedModel.family_color, 0.12),
                    color:      canAddMoreShots ? selectedModel.family_color : "#64748b",
                    border:     `1px solid ${canAddMoreShots ? hexA(selectedModel.family_color, 0.3) : "rgba(100,116,139,0.4)"}`,
                    cursor:     canAddMoreShots ? "pointer" : "not-allowed",
                    opacity:    canAddMoreShots ? 1 : 0.6,
                  }}
                >
                  + Add Shot
                </button>
              </div>
              {duration != null && activeMultiPromptIndexes.length > 0 && (
                <span className="text-[10px]" style={{ color: "#64748b" }}>
                  Total {duration}s split across {activeMultiPromptIndexes.length} shot(s). Remainder goes to the last shot.
                </span>
              )}
              <span className="text-[10px]" style={{ color: "#64748b" }}>
                Max shots for current duration: {maxShotsAllowed}
              </span>
              <div className="flex flex-col gap-1.5">
                {multiPrompts.map((mp, i) => (
                  <div key={i} className="relative">
                    <textarea
                      value={mp}
                      onChange={e => setMultiPrompts(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={isKling30Video ? `Shot ${i + 1} scene… use @image${Math.min(i + 1, 3)}` : `Shot ${i + 1} scene…`}
                      rows={2}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-7 text-[12px] outline-none resize-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border:     `1px solid ${hexA(selectedModel.family_color, 0.2)}`,
                        color:      "#94a3b8",
                      }}
                    />
                    {shotDurationsByIndex[i] != null && (
                      <span
                        className="absolute top-1.5 right-7 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                      >
                        {shotDurationsByIndex[i]}s
                      </span>
                    )}
                    {multiPrompts.length > 1 && (
                      <button
                        onClick={() => setMultiPrompts(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Element List (Kling) ----------------------------------------- */}
          {caps.has_element_list && !showOmniTabs && !isKling30Video && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Element List
                </label>
                <button
                  onClick={() => setElementList((prev) => [...prev, ""])}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {elementList.map((el, i) => (
                  <div key={i} className="relative">
                    <input
                      value={el}
                      onChange={e => setElementList(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={`Element ID ${i + 1}`}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-7 text-[12px] outline-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border:     "1px solid rgba(255,255,255,0.06)",
                        color:      "#94a3b8",
                      }}
                    />
                    {elementList.length > 1 && (
                      <button
                        onClick={() => setElementList(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Kling 3.0 Elements (name + description + 2-4 images, max 3) -- */}
          {showKling30Elements && !showOmniTabs && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Elements
                </label>
                {klingEls.length < 3 && (
                  <button
                    onClick={() => setKlingEls(prev => [...prev, { name: "", description: "", files: [], previews: [] }])}
                    className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                    style={{ background: hexA(selectedModel.family_color, 0.12), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.3)}` }}
                  >
                    + Add Element
                  </button>
                )}
              </div>
              <p className="text-[10px] -mt-2" style={{ color: "#64748b" }}>
                Each element needs 2–4 images. Reference it in your prompt as <span style={{ color: "#94a3b8" }}>@element_name</span>.
              </p>
              {klingEls.map((el, elIdx) => (
                <div
                  key={elIdx}
                  className="flex flex-col gap-2 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.2)}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: selectedModel.family_color }}>Element {elIdx + 1}</span>
                    <button onClick={() => setKlingEls(prev => prev.filter((_, i) => i !== elIdx))}>
                      <X size={11} style={{ color: "#475569" }} />
                    </button>
                  </div>
                  <input
                    value={el.name}
                    onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, name: e.target.value } : v))}
                    placeholder="Name (e.g. hero, car, logo)"
                    className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                  />
                  <input
                    value={el.description}
                    onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, description: e.target.value } : v))}
                    placeholder="Brief description of this element"
                    className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                  />
                  {/* Image slots (2-4) */}
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, imgIdx) => {
                      const preview = el.previews[imgIdx];
                      const hasFile = !!el.files[imgIdx];
                      return (
                        <label
                          key={imgIdx}
                          className="relative flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer overflow-hidden"
                          style={{
                            height: 56,
                            borderColor: hasFile ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                            background:  hasFile ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = URL.createObjectURL(file);
                              setKlingEls(prev => prev.map((v, i) => {
                                if (i !== elIdx) return v;
                                const newFiles = [...v.files];
                                const newPreviews = [...v.previews];
                                // Revoke old preview if present
                                if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                newFiles[imgIdx] = file;
                                newPreviews[imgIdx] = url;
                                return { ...v, files: newFiles, previews: newPreviews };
                              }));
                            }}
                          />
                          {preview ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-0.5 right-0.5 z-10"
                                onClick={e => {
                                  e.preventDefault();
                                  setKlingEls(prev => prev.map((v, i) => {
                                    if (i !== elIdx) return v;
                                    const newFiles = [...v.files];
                                    const newPreviews = [...v.previews];
                                    if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                    newFiles.splice(imgIdx, 1);
                                    newPreviews.splice(imgIdx, 1);
                                    return { ...v, files: newFiles, previews: newPreviews };
                                  }));
                                }}
                              >
                                <X size={9} style={{ color: "#fff" }} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[9px]" style={{ color: imgIdx < 2 ? "#64748b" : "#334155" }}>
                              {imgIdx < 2 ? "Required" : "Optional"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {el.files.length < 2 && (
                    <span className="text-[10px]" style={{ color: "#ef4444" }}>Upload at least 2 images for this element.</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* -- Sound toggle ------------------------------------------------ */}
          {caps.has_sound && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 size={13} style={{ color: "#475569" }} />
                <span className="text-[12px]" style={{ color: "#64748b" }}>Generate Sound</span>
                <span
                  className="text-[10px] px-1 rounded"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}
                >
                  ×1.5 cost
                </span>
              </div>
              <button
                onClick={() => setSound(v => !v)}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: sound ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: sound ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}

          {/* -- Negative Prompt --------------------------------------------- */}
          {caps.has_negative_prompt && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Negative Prompt
              </label>
              <textarea
                value={negPrompt}
                onChange={e => setNegPrompt(e.target.value)}
                placeholder="Things to avoid…"
                rows={3}
                className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border:     "1px solid rgba(255,255,255,0.06)",
                  color:      "#94a3b8",
                }}
              />
            </div>
          )}

          </>)} {/* end !isKling30Video generic controls */}

          {/* -- Generate button (always visible) ----------------------------- */}
          <button
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: isSubmitting || !canGenerate
                ? "rgba(255,255,255,0.05)"
                : `linear-gradient(135deg, ${hexA(selectedModel.family_color, 0.8)}, ${hexA(selectedModel.family_color, 0.5)})`,
              border:  `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.06)" : hexA(selectedModel.family_color, 0.4)}`,
              color:   isSubmitting || !canGenerate ? "#475569" : "#fff",
              cursor:  isSubmitting || !canGenerate ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Film size={15} />
                <span>
                  Generate Video ·{" "}
                  <span
                    style={{
                      color: isSubmitting || !canGenerate ? "#64748b" : "#fbb11f",
                      fontWeight: 700,
                    }}
                  >
                    {estimatedCredits} cr
                  </span>
                </span>
                {pendingTasks.size > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>
                    {pendingTasks.size} running
                  </span>
                )}
              </>
            )}
          </button>

        </div>
      </aside>

      {/* ── Media Gallery Picker Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {mediaPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
            onClick={() => setMediaPicker(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y: 0 }}
              exit={{ scale: 0.94,    opacity: 0, y: 8 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{
                width: "min(720px, 92vw)",
                height: "min(540px, 82vh)",
                background: "#0a1220",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 32px 72px rgba(0,0,0,0.85)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  {mediaPicker === "motionVideo"
                    ? <Film size={15} style={{ color: selectedModel.family_color }} />
                    : <ImageIcon size={15} style={{ color: selectedModel.family_color }} />
                  }
                  <span className="text-[14px] font-semibold" style={{ color: "#e2e8f0" }}>
                    {mediaPicker === "motionVideo"
                      ? "Select Video"
                      : mediaPicker === "referenceImages"
                        ? `Select Reference Image (${referenceImages.length}/${isSeedanceV2Model ? 9 : caps.max_reference_images})`
                        : mediaPicker === "endFrame" ? "Select End Frame" : "Select Start Frame"}
                  </span>
                </div>
                <button
                  onClick={() => setMediaPicker(null)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/08 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <X size={13} style={{ color: "#64748b" }} />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex items-center gap-1 px-5 py-2.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                {/* Upload from device */}
                <button
                  onClick={() => setPickerTab("upload")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: pickerTab === "upload" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${pickerTab === "upload" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                    color:      pickerTab === "upload" ? selectedModel.family_color : "#64748b",
                  }}
                >
                  <Upload size={11} />
                  Device
                </button>
                {/* Generated images */}
                {mediaPicker !== "motionVideo" && (
                  <button
                    onClick={async () => { setPickerTab("images"); await loadPickerAssets("image"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: pickerTab === "images" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     `1px solid ${pickerTab === "images" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                      color:      pickerTab === "images" ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    <ImageIcon size={11} />
                    Generated Images
                  </button>
                )}
                {/* Generated videos */}
                <button
                  onClick={async () => { setPickerTab("videos"); await loadPickerAssets("video"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: pickerTab === "videos" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${pickerTab === "videos" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                    color:      pickerTab === "videos" ? selectedModel.family_color : "#64748b",
                  }}
                >
                  <Film size={11} />
                  Generated Videos
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-4">
                {pickerTab === "upload" ? (
                  /* Device upload zone */
                  <button
                    className="w-full h-full min-h-48 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all hover:border-opacity-60"
                    style={{ borderColor: hexA(selectedModel.family_color, 0.3) }}
                    onClick={() => {
                      if (mediaPicker === "startFrame")        startFrameRef.current?.click();
                      else if (mediaPicker === "endFrame")     endFrameRef.current?.click();
                      else if (mediaPicker === "motionVideo")  motionVideoRef.current?.click();
                      else if (mediaPicker === "referenceImages") referenceImagesRef.current?.click();
                      setMediaPicker(null);
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: hexA(selectedModel.family_color, 0.1) }}
                    >
                      <Upload size={24} style={{ color: selectedModel.family_color }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[14px] font-semibold" style={{ color: "#e2e8f0" }}>
                        Upload from device
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: "#475569" }}>
                        {mediaPicker === "motionVideo" ? "MP4, MOV, WebM" : "PNG, JPG, WebP"}
                      </p>
                    </div>
                  </button>
                ) : pickerLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 size={24} className="animate-spin" style={{ color: "#475569" }} />
                  </div>
                ) : pickerGallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    {pickerTab === "images"
                      ? <ImageIcon size={32} style={{ color: "#334155" }} />
                      : <Film      size={32} style={{ color: "#334155" }} />
                    }
                    <p className="text-[12px]" style={{ color: "#475569" }}>
                      No {pickerTab === "images" ? "generated images" : "generated videos"} yet
                    </p>
                    <button
                      onClick={() => {
                        setPickerTab("upload");
                      }}
                      className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: hexA(selectedModel.family_color, 0.12),
                        border: `1px solid ${hexA(selectedModel.family_color, 0.3)}`,
                        color: selectedModel.family_color,
                      }}
                    >
                      <Upload size={11} /> Upload from device
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {pickerGallery.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => pickGalleryAsset(asset.url, mediaPicker!)}
                        className="group relative overflow-hidden rounded-xl transition-all ring-0 hover:ring-2"
                        style={{
                          aspectRatio: "1",
                          // @ts-expect-error ring color
                          "--tw-ring-color": selectedModel.family_color,
                          ringColor: selectedModel.family_color,
                        }}
                      >
                        {asset.type === "video" ? (
                          <video
                            src={asset.url}
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.url}
                            alt="Gallery asset"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          style={{ background: hexA(selectedModel.family_color, 0.35) }}
                        >
                          <CheckCircle2 size={22} style={{ color: "#fff" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Mobile Bottom Tool Bar (lg:hidden) -------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-0 border-t lg:hidden" style={{ background: "#050a14", borderColor: "rgba(255,255,255,0.08)", height: 60 }}>
        <div className="flex-1 flex items-center gap-0 overflow-x-auto scrollbar-none px-2">
          {TOOLS.map(t => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all"
                style={{ minWidth: 52, color: active ? "#06b6d4" : "#475569" }}
              >
                <t.icon size={16} />
                <span className="text-[9px] font-medium leading-tight whitespace-nowrap" style={{ maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setMobileSettingsOpen(true)}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 h-full border-l"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
        >
          <Settings size={18} />
          <span className="text-[9px] font-medium">Settings</span>
        </button>
      </div>

      {/* -- Mobile Settings Overlay (lg:hidden) -------------------------------- */}
      <AnimatePresence>
        {mobileSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setMobileSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto"
              style={{ background: "#050a14", maxHeight: "85vh", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="text-sm font-semibold text-white">Model Settings</span>
                <button onClick={() => setMobileSettingsOpen(false)} className="p-1 rounded-lg" style={{ color: "#64748b" }}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-4 py-4">
                {/* Model selector button */}
                <div className="mb-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Model</label>
                  <button
                    onClick={() => { setModelOpen(true); setMobileSettingsOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: hexA(selectedModel.family_color, 0.08), border: `1px solid ${hexA(selectedModel.family_color, 0.3)}`, color: "#e2e8f0" }}
                  >
                    <span className="text-sm font-medium">{selectedModel.name}</span>
                    {bStyle && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bStyle.bg, color: bStyle.text }}>{selectedModel.badge}</span>
                    )}
                  </button>
                </div>

                {/* Duration */}
                {durationChoices.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Duration</label>
                    <div className="flex flex-wrap gap-2">
                      {durationChoices.map(d => (
                        <button key={d} onClick={() => setDuration(d)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ background: duration === d ? hexA(selectedModel.family_color, 0.2) : "rgba(255,255,255,0.04)", color: duration === d ? selectedModel.family_color : "#64748b", border: `1px solid ${duration === d ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.06)"}` }}
                        >{d}s</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aspect ratio */}
                {caps.aspect_ratios.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {caps.aspect_ratios.map(r => (
                        <button key={r} onClick={() => setAspectRatio(r)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ background: aspectRatio === r ? hexA(selectedModel.family_color, 0.2) : "rgba(255,255,255,0.04)", color: aspectRatio === r ? selectedModel.family_color : "#64748b", border: `1px solid ${aspectRatio === r ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.06)"}` }}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference Images (mobile) */}
                {(showReferenceImages || showSimpleKlingRefs) && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Reference Images</label>
                    <button
                      onClick={() => { setMobileSettingsOpen(false); openMediaPicker("referenceImages"); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                      style={{
                        background: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                        border: `1px solid ${referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                        color: referenceImages.length > 0 ? selectedModel.family_color : "#64748b",
                      }}
                    >
                      <ImageIcon size={14} />
                      <span className="text-sm font-medium">
                        {referenceImages.length > 0
                          ? `${referenceImages.length} reference image(s)`
                          : "Add reference images"
                        }
                      </span>
                      {referenceImages.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                          className="ml-auto"
                        >
                          <X size={13} style={{ color: "#64748b" }} />
                        </button>
                      )}
                    </button>
                    {showSimpleKlingRefs && (
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                        Use @image1, @image2, @image3 in your prompt
                      </p>
                    )}
                  </div>
                )}

                {/* Start Frame (mobile) */}
                {(showImageInput || showEndFrame) && !showVideoInput && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Image Input</label>
                    <div className="flex gap-2">
                      {showImageInput && (
                        <button
                          onClick={() => { setMobileSettingsOpen(false); openMediaPicker("startFrame"); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                          style={{
                            background: startFrame ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                            border: `1px solid ${startFrame ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                            color: startFrame ? selectedModel.family_color : "#64748b",
                          }}
                        >
                          <ImageIcon size={14} />
                          <span className="text-[12px] font-medium truncate">
                            {startFrame ? startFrame.name : "Start frame"}
                          </span>
                        </button>
                      )}
                      {showEndFrame && (
                        <button
                          onClick={() => { setMobileSettingsOpen(false); openMediaPicker("endFrame"); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                          style={{
                            background: endFrame ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                            border: `1px solid ${endFrame ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                            color: endFrame ? selectedModel.family_color : "#64748b",
                          }}
                        >
                          <ImageIcon size={14} />
                          <span className="text-[12px] font-medium truncate">
                            {endFrame ? endFrame.name : "End frame"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Credits estimate */}
                <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xs" style={{ color: "#475569" }}>Estimated cost</span>
                  <span className="text-sm font-semibold" style={{ color: selectedModel.family_color }}>{estimatedCredits} credits</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Inspector Modal */}
      <AnimatePresence>
        {inspectorAsset ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 p-4"
            onClick={() => setInspectorAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// -- Export --------------------------------------------------------------------

export default function VideoPage() {
  return (
    <Suspense>
      <VideoPageInner />
    </Suspense>
  );
}

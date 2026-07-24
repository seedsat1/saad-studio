"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  Database,
  Download,
  Eraser,
  ExternalLink,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Video,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";

type LabMode = "image" | "video" | "avatar";
type LabStatus = "idle" | "uploading" | "submitting" | "polling" | "done" | "error";

type LabModel = {
  id: string;
  label: string;
  route: string;
  badge?: "New" | "Hot" | "Pro" | "Custom";
  group: string;
  kind: LabMode;
  maxRefs: number;
  ratios: string[];
  resolutions: string[];
  durations?: number[];
  formats?: string[];
  requiresImage?: boolean;
  requiresAudio?: boolean;
  supportsEndImage?: boolean;
};

type UploadedItem = {
  id: string;
  file?: File;
  url: string;
  name: string;
  type: "image" | "video" | "audio";
};

type OutputPreview = {
  url: string;
  index: number;
} | null;

const IMAGE_MODELS: LabModel[] = [
  {
    id: "seedream-5-pro",
    label: "Seedream 5 Pro",
    route: "bytedance/seedream-v5.0-pro",
    badge: "New",
    group: "Seedream",
    kind: "image",
    maxRefs: 10,
    ratios: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
    resolutions: ["1k", "2k"],
    formats: ["jpeg", "png"],
  },
  {
    id: "seedream-5-pro-edit",
    label: "Seedream 5 Pro Edit",
    route: "bytedance/seedream-v5.0-pro/edit",
    badge: "Hot",
    group: "Seedream",
    kind: "image",
    maxRefs: 10,
    ratios: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
    resolutions: ["1k", "2k"],
    formats: ["jpeg", "png"],
    requiresImage: true,
  },
  {
    id: "custom-image",
    label: "Custom WaveSpeed Image",
    route: "",
    badge: "Custom",
    group: "Custom",
    kind: "image",
    maxRefs: 10,
    ratios: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"],
    resolutions: ["1k", "2k", "4k"],
    formats: ["jpeg", "png", "webp"],
  },
];

const VIDEO_MODELS: LabModel[] = VIDEO_MODEL_REGISTRY
  .filter((model) => !model.api_route.startsWith("google/") && !model.api_route.startsWith("openai/"))
  .map((model) => ({
    id: model.id,
    label: model.name,
    route: model.api_route,
    badge: model.badge === "FAST" ? "Hot" : model.badge === "NEW" ? "New" : model.badge === "PRO" || model.badge === "TOP" ? "Pro" : undefined,
    group: model.family_label,
    kind: "video" as const,
    maxRefs: Math.max(model.capabilities.max_reference_images, model.capabilities.requires_image ? 1 : 0),
    ratios: model.capabilities.aspect_ratios.length ? model.capabilities.aspect_ratios : ["auto"],
    resolutions: model.capabilities.resolutions.length ? model.capabilities.resolutions : ["auto"],
    durations: model.capabilities.durations.length ? model.capabilities.durations : [5],
    requiresImage: model.capabilities.requires_image,
    supportsEndImage: model.capabilities.has_end_frame,
  }));

const AVATAR_MODELS: LabModel[] = [
  {
    id: "custom-avatar",
    label: "Custom WaveSpeed Avatar",
    route: "",
    badge: "Custom",
    group: "Avatar",
    kind: "avatar",
    maxRefs: 1,
    ratios: ["auto"],
    resolutions: ["480p", "720p", "1080p"],
    durations: [5],
    requiresImage: true,
    requiresAudio: true,
  },
];

const MODELS: Record<LabMode, LabModel[]> = {
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  avatar: AVATAR_MODELS,
};

function badgeClass(badge?: LabModel["badge"]) {
  if (badge === "Hot") return "bg-orange-500 text-black";
  if (badge === "New") return "bg-fuchsia-500 text-black";
  if (badge === "Pro") return "bg-cyan-400 text-black";
  if (badge === "Custom") return "bg-zinc-700 text-zinc-100";
  return "";
}

function mediaKind(file: File): UploadedItem["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

function firstValue<T>(values: T[], fallback: T): T {
  return values.length ? values[0] : fallback;
}

function outputExtension(url: string, mode: LabMode): string {
  const path = url.split("?")[0] || "";
  const match = path.match(/\.([a-z0-9]{2,5})$/i);
  if (match?.[1]) return match[1].toLowerCase();
  return mode === "image" ? "png" : "mp4";
}

function outputFilename(url: string, mode: LabMode, index: number): string {
  return `generation-lab-${mode}-${index + 1}.${outputExtension(url, mode)}`;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    body: form,
  });
  const data = (await res.json().catch(() => null)) as { publicUrl?: string; error?: string } | null;
  if (!res.ok || !data?.publicUrl) {
    throw new Error(data?.error || `Upload failed (${res.status})`);
  }
  return data.publicUrl;
}

export default function AdminGenerationLabPage() {
  const [mode, setMode] = useState<LabMode>("image");
  const [modelId, setModelId] = useState(IMAGE_MODELS[0].id);
  const [customRoute, setCustomRoute] = useState("");
  const [prompt, setPrompt] = useState("A serene landscape with mountains and a lake at sunset.");
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [resolution, setResolution] = useState("1k");
  const [format, setFormat] = useState("jpeg");
  const [duration, setDuration] = useState(5);
  const [seed, setSeed] = useState("-1");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [refs, setRefs] = useState<UploadedItem[]>([]);
  const [startImage, setStartImage] = useState<UploadedItem | null>(null);
  const [lastImage, setLastImage] = useState<UploadedItem | null>(null);
  const [audio, setAudio] = useState<UploadedItem | null>(null);
  const [status, setStatus] = useState<LabStatus>("idle");
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [submittedRoute, setSubmittedRoute] = useState("");
  const [preview, setPreview] = useState<OutputPreview>(null);
  const refInput = useRef<HTMLInputElement>(null);
  const startInput = useRef<HTMLInputElement>(null);
  const lastInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentModel = useMemo(() => {
    return MODELS[mode].find((item) => item.id === modelId) || MODELS[mode][0];
  }, [mode, modelId]);

  const activeRoute = currentModel.route || customRoute.trim();
  const isRunning = status === "uploading" || status === "submitting" || status === "polling";

  const switchMode = (nextMode: LabMode) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setMode(nextMode);
    const nextModel = MODELS[nextMode][0];
    setModelId(nextModel.id);
    setAspectRatio(firstValue(nextModel.ratios, "auto"));
    setResolution(firstValue(nextModel.resolutions, "auto"));
    setDuration(firstValue(nextModel.durations || [], 5));
    setFormat(firstValue(nextModel.formats || [], "jpeg"));
    setStatus("idle");
    setError("");
    setTaskId("");
    setOutputs([]);
    setPreview(null);
    setRefs([]);
    setStartImage(null);
    setLastImage(null);
    setAudio(null);
    setCustomRoute("");
  };

  const onModelChange = (id: string) => {
    const next = MODELS[mode].find((item) => item.id === id);
    if (!next) return;
    setModelId(id);
    setAspectRatio(firstValue(next.ratios, "auto"));
    setResolution(firstValue(next.resolutions, "auto"));
    setDuration(firstValue(next.durations || [], 5));
    setFormat(firstValue(next.formats || [], "jpeg"));
    setCustomRoute("");
  };

  const addFiles = async (files: FileList | null, target: "refs" | "start" | "last" | "audio") => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setStatus("uploading");
    setError("");
    try {
      const uploaded = await Promise.all(
        list.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          type: mediaKind(file),
          url: await uploadFile(file),
        })),
      );
      if (target === "refs") {
        const onlyAllowed = uploaded.filter((item) => mode === "video" ? item.type !== "audio" : item.type === "image");
        setRefs((prev) => [...prev, ...onlyAllowed].slice(0, currentModel.maxRefs || 10));
      } else if (target === "start") {
        setStartImage(uploaded.find((item) => item.type === "image") || null);
      } else if (target === "last") {
        setLastImage(uploaded.find((item) => item.type === "image") || null);
      } else {
        setAudio(uploaded.find((item) => item.type === "audio") || null);
      }
      setStatus("idle");
    } catch (uploadError) {
      setStatus("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  };

  const buildPayload = useCallback(() => {
    const refImages = refs.filter((item) => item.type === "image").map((item) => item.url);
    const refVideos = refs.filter((item) => item.type === "video").map((item) => item.url);
    const base: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio === "auto" ? undefined : aspectRatio,
      resolution: resolution === "auto" ? undefined : resolution,
    };

    if (mode === "image") {
      base.output_format = format;
      base.images = refImages;
      base.image_urls = refImages;
    }

    if (mode === "video") {
      base.duration = duration;
      base.generate_audio = generateAudio;
      if (startImage?.url) {
        base.image = startImage.url;
        base.image_url = startImage.url;
        base.first_frame_url = startImage.url;
      }
      if (lastImage?.url) {
        base.last_image = lastImage.url;
        base.last_frame_url = lastImage.url;
        base.end_image = lastImage.url;
      }
      if (refImages.length) {
        base.image_urls = refImages;
        base.reference_image_urls = refImages;
      }
      if (refVideos.length) {
        base.reference_video_urls = refVideos;
      }
    }

    if (mode === "avatar") {
      base.image_url = startImage?.url;
      base.image = startImage?.url;
      base.audio_url = audio?.url;
      base.seed = Number(seed);
    }

    Object.keys(base).forEach((key) => {
      const value = base[key];
      if (value === undefined || value === "" || value === null) delete base[key];
      if (Array.isArray(value) && value.length === 0) delete base[key];
    });

    return base;
  }, [aspectRatio, audio, duration, format, generateAudio, lastImage, mode, prompt, refs, resolution, seed, startImage]);

  const poll = useCallback((nextTaskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("polling");
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/generation-lab?taskId=${encodeURIComponent(nextTaskId)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          status?: string;
          outputs?: string[];
          error?: string | null;
        } | null;
        if (!res.ok || !data) return;
        if (data.status === "completed" && data.outputs?.length) {
          if (pollRef.current) clearInterval(pollRef.current);
          setOutputs(data.outputs);
          setStatus("done");
        } else if (data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(data.error || "WaveSpeed generation failed.");
          setStatus("error");
        }
      } catch {
        // Keep polling transient network failures.
      }
    }, 3500);
  }, []);

  const generate = async () => {
    if (!activeRoute) {
      setStatus("error");
      setError("Enter a WaveSpeed route for this custom model.");
      return;
    }
    if (currentModel.requiresImage && !startImage && refs.length === 0) {
      setStatus("error");
      setError("This model needs an image input.");
      return;
    }
    if (currentModel.requiresAudio && !audio) {
      setStatus("error");
      setError("This avatar test needs a driving audio file.");
      return;
    }

    setStatus("submitting");
    setError("");
    setOutputs([]);
    setTaskId("");
    setPreview(null);

    try {
      const payload = buildPayload();
      const res = await fetch("/api/admin/generation-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: mode, route: activeRoute, payload }),
      });
      const data = (await res.json().catch(() => null)) as {
        taskId?: string;
        route?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.taskId) {
        throw new Error(data?.error || `WaveSpeed submit failed (${res.status})`);
      }
      setTaskId(data.taskId);
      setSubmittedRoute(data.route || activeRoute);
      poll(data.taskId);
    } catch (submitError) {
      setStatus("error");
      setError(submitError instanceof Error ? submitError.message : "Submit failed.");
    }
  };

  const openOutput = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadOutput = (url: string, index: number) => {
    const download = `/api/admin/generation-lab?downloadUrl=${encodeURIComponent(url)}&filename=${encodeURIComponent(outputFilename(url, mode, index))}`;
    const link = document.createElement("a");
    link.href = download;
    link.download = outputFilename(url, mode, index);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("idle");
    setError("");
    setTaskId("");
    setOutputs([]);
  };

  const sideItems = [
    { mode: "image" as const, label: "Image", icon: ImageIcon },
    { mode: "video" as const, label: "Video", icon: Video },
    { mode: "avatar" as const, label: "Avatar", icon: UserRound },
    { mode: "audio" as const, label: "Audio", icon: Music },
    { mode: "three" as const, label: "3D", icon: Box },
    { mode: "tools" as const, label: "Tools", icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-[#101010] text-white">
      <div className="flex min-h-screen">
        <aside className="w-[68px] border-r border-white/10 bg-[#0b0b0b] px-2 py-4">
          <div className="space-y-2">
            {sideItems.map((item) => {
              const Icon = item.icon;
              const active = item.mode === mode;
              const disabled = item.mode !== "image" && item.mode !== "video" && item.mode !== "avatar";
              return (
                <button
                  key={item.label}
                  disabled={disabled}
                  onClick={() => !disabled && switchMode(item.mode as LabMode)}
                  className={`relative flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition ${
                    active ? "bg-[#242424] text-white" : disabled ? "text-zinc-600" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && <span className="absolute left-0 top-2 h-8 w-1 rounded-full bg-white" />}
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex w-[360px] flex-col border-r border-white/10 bg-[#1b1b1b]">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <h1 className="text-lg font-bold">{mode === "image" ? "Image Generator" : mode === "video" ? "Video Generator" : "Avatar Generator"}</h1>

            <div className="mt-4">
              <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                Model <span className="rounded-full border border-zinc-600 px-1 text-[10px] text-zinc-500">i</span>
              </label>
              <div className="relative">
                <select
                  value={modelId}
                  onChange={(event) => onModelChange(event.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-[#101010] px-4 pr-9 text-sm font-semibold outline-none focus:border-lime-400/70"
                >
                  {MODELS[mode].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-500" />
              </div>
              {currentModel.badge && (
                <span className={`mt-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass(currentModel.badge)}`}>
                  {currentModel.badge}
                </span>
              )}
            </div>

            {!currentModel.route && (
              <div className="mt-4">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">WaveSpeed Route</label>
                <input
                  value={customRoute}
                  onChange={(event) => setCustomRoute(event.target.value)}
                  placeholder={mode === "avatar" ? "wavespeed-ai/infinitetalk" : "provider/model-route"}
                  className="h-10 w-full rounded border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none focus:border-lime-400/70"
                />
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                Prompt <span className="text-red-400">*</span> <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={mode === "video" ? "Describe the video you want to generate..." : "Describe the desired output..."}
                className="h-24 w-full resize-none rounded-lg border border-white/10 bg-[#111] p-3 text-sm leading-relaxed text-sky-100 outline-none focus:border-lime-400/70"
              />
            </div>

            {mode !== "image" && (
              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                  {mode === "avatar" ? "Image" : "Start Image"}
                </label>
                <input ref={startInput} type="file" accept="image/*" className="hidden" onChange={(event) => addFiles(event.target.files, "start")} />
                <UploadBox item={startImage} onClick={() => startInput.current?.click()} onClear={() => setStartImage(null)} />
                <p className="mt-2 text-[11px] text-sky-200/70">
                  {mode === "avatar" ? "The face/person image to animate" : "Optional - switches to image-to-video when present"}
                </p>
              </div>
            )}

            {mode === "video" && currentModel.supportsEndImage && (
              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">Last Image</label>
                <input ref={lastInput} type="file" accept="image/*" className="hidden" onChange={(event) => addFiles(event.target.files, "last")} />
                <UploadBox item={lastImage} onClick={() => lastInput.current?.click()} onClear={() => setLastImage(null)} />
                <p className="mt-2 text-[11px] text-sky-200/70">Optional - defines the ending frame</p>
              </div>
            )}

            {mode === "avatar" && (
              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">Audio</label>
                <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={(event) => addFiles(event.target.files, "audio")} />
                <UploadBox item={audio} onClick={() => audioInput.current?.click()} onClear={() => setAudio(null)} icon={<Mic className="h-4 w-4" />} />
                <p className="mt-2 text-[11px] text-sky-200/70">The driving audio, speech or singing</p>
              </div>
            )}

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                  {mode === "video" ? "Reference Media" : "Reference Images"}
                </label>
                <span className="text-xs text-sky-100">{refs.length}/{currentModel.maxRefs || 10}</span>
              </div>
              <input
                ref={refInput}
                type="file"
                multiple
                accept={mode === "video" ? "image/*,video/*" : "image/*"}
                className="hidden"
                onChange={(event) => addFiles(event.target.files, "refs")}
              />
              <button
                onClick={() => refInput.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-[#151515] text-xs font-bold text-zinc-200 hover:border-lime-400/60"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
              <div className="mt-2 space-y-2">
                {refs.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded border border-white/10 bg-[#101010] px-2 py-2 text-xs text-sky-100">
                    {item.type === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <button onClick={() => setRefs((prev) => prev.filter((ref) => ref.id !== item.id))} className="text-zinc-400 hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <label className="mb-4 block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">Settings</label>
              <div className="space-y-4">
                <SelectField label="Aspect Ratio" value={aspectRatio} values={currentModel.ratios} onChange={setAspectRatio} />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Resolution" value={resolution} values={currentModel.resolutions} onChange={setResolution} />
                  {mode === "image" ? (
                    <SelectField label="Format" value={format} values={currentModel.formats || ["jpeg"]} onChange={setFormat} />
                  ) : (
                    <SelectField label="Duration" value={String(duration)} values={(currentModel.durations || [5]).map(String)} onChange={(value) => setDuration(Number(value))} />
                  )}
                </div>
                {mode === "avatar" && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-zinc-200">Seed</label>
                    <input
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      className="h-9 w-full rounded border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none focus:border-lime-400/70"
                    />
                  </div>
                )}
                {mode === "video" && (
                  <button
                    onClick={() => setGenerateAudio((value) => !value)}
                    className={`flex h-9 w-full items-center justify-between rounded border px-3 text-xs font-semibold ${
                      generateAudio ? "border-lime-400/50 bg-lime-400/10 text-lime-200" : "border-white/10 bg-[#101010] text-zinc-400"
                    }`}
                  >
                    Native audio
                    <span>{generateAudio ? "On" : "Off"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-5">
            <button
              onClick={generate}
              disabled={isRunning}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-lime-500 text-sm font-black text-black transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {status === "uploading" ? "Uploading" : status === "submitting" ? "Submitting" : status === "polling" ? "Generating" : "Generate"}
            </button>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>Admin WaveSpeed Lab</span>
              <button onClick={reset} className="flex items-center gap-1 text-lime-400 hover:text-lime-300">
                <RefreshCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </section>

        <main className="min-w-0 flex-1 bg-[#111]">
          <div className="flex h-10 items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-5 text-sm font-semibold">
              <span className="border-b border-white pb-2 text-white">My Generations</span>
              <span className="text-zinc-500">Examples</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <Database className="h-4 w-4" />
              <span>{submittedRoute || activeRoute || "WaveSpeed route"}</span>
            </div>
          </div>

          <div className="flex min-h-[calc(100vh-40px)] items-center justify-center p-6">
            {status === "polling" || status === "submitting" || status === "uploading" ? (
              <div className="text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-lime-400" />
                <p className="mt-3 text-sm text-sky-100">Loading your generations...</p>
                {taskId && <p className="mt-2 font-mono text-xs text-zinc-500">{taskId}</p>}
              </div>
            ) : status === "error" ? (
              <div className="max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                <p className="font-semibold text-red-200">{error}</p>
              </div>
            ) : outputs.length ? (
              <div className="grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {outputs.map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-[#181818]">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-zinc-400">
                      <span>Result {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreview({ url, index })}
                          className="rounded p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openOutput(url)}
                          className="rounded p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white"
                          title="Open"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadOutput(url, index)}
                          className="rounded p-1.5 text-lime-400 hover:bg-lime-400/10 hover:text-lime-300"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {mode === "image" ? (
                      <button onClick={() => setPreview({ url, index })} className="block w-full cursor-zoom-in bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Generated result ${index + 1}`} className="h-auto w-full object-contain" />
                      </button>
                    ) : (
                      <div className="bg-black">
                        <video src={url} controls className="h-auto w-full bg-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-zinc-500">
                <Sparkles className="mx-auto mb-3 h-7 w-7 text-zinc-700" />
                <p>Ready for WaveSpeed experiments.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5">
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151515] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-zinc-300">
              <span className="font-semibold text-white">Result {preview.index + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openOutput(preview.url)}
                  className="rounded p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
                  title="Open"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => downloadOutput(preview.url, preview.index)}
                  className="rounded p-2 text-lime-400 hover:bg-lime-400/10 hover:text-lime-300"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-4">
              {mode === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={`Generated result ${preview.index + 1}`} className="max-h-[80vh] w-auto max-w-full object-contain" />
              ) : (
                <video src={preview.url} controls autoPlay className="max-h-[80vh] w-full max-w-full bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-zinc-200">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded border border-white/10 bg-[#101010] px-3 pr-8 text-sm font-semibold text-zinc-100 outline-none focus:border-lime-400/70"
        >
          {values.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-zinc-500" />
      </div>
    </div>
  );
}

function UploadBox({
  item,
  onClick,
  onClear,
  icon,
}: {
  item: UploadedItem | null;
  onClick: () => void;
  onClear: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded border border-dashed border-white/10 bg-[#151515] p-3">
      <div className="flex h-10 items-center gap-2 border border-white/10 bg-[#101010] px-3">
        <button onClick={onClick} className="min-w-0 flex-1 truncate text-left text-sm text-sky-100/80">
          {item?.name || "https://example.com/image.png"}
        </button>
        {icon || <Upload className="h-4 w-4 text-zinc-300" />}
        {item && (
          <button onClick={onClear} className="text-zinc-400 hover:text-white">
            <Eraser className="h-4 w-4" />
          </button>
        )}
      </div>
      <button onClick={onClick} className="mt-2 text-xs text-sky-100/80 hover:text-white">
        Drag & drop or click to upload
      </button>
    </div>
  );
}

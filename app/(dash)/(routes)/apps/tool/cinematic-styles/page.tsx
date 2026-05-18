"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Film,
  Layers,
  Loader2,
  Palette,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FpsMode = "4" | "8" | "10" | "12" | "24" | "manual";
type ResolutionMode = "1K" | "2K" | "4K";
type RenderStatus = "idle" | "ready" | "processing" | "completed" | "failed";
type ProviderMode = "kie" | "wavespeed" | "local";

type PresetId =
  | "layer-mixed-media"
  | "sketch"
  | "canvas"
  | "flash-comic"
  | "overexposed"
  | "paper"
  | "noir"
  | "particles"
  | "hand-paint";

type Preset = {
  id: PresetId;
  name: string;
  family: string;
  description: string;
  accent: string;
  prompt: string;
};

type OutputItem = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  fps: number;
  resolution: ResolutionMode;
};

type Rgb = { r: number; g: number; b: number };

const PRESETS: Preset[] = [
  {
    id: "layer-mixed-media",
    name: "Urban Cutout",
    family: "Scene Layers",
    description: "Three-tone subject separation with gritty grain, hard edges, and poster contrast.",
    accent: "#06b6d4",
    prompt: "stylized urban cutout motion, layered graphic composition, gritty editorial poster texture, hard subject edges, cinematic social video",
  },
  {
    id: "sketch",
    name: "Pencil Pulse",
    family: "Draft Look",
    description: "Edge extraction with clean paper brightness and subtle pencil-shadow motion.",
    accent: "#ef4444",
    prompt: "animated pencil draft style, clean paper background, visible sketch contours, subtle graphite shadows, cinematic motion",
  },
  {
    id: "canvas",
    name: "Studio Brush",
    family: "Paint Pass",
    description: "Soft color blocks with animated marker strokes over the source frame.",
    accent: "#38bdf8",
    prompt: "painterly studio brush treatment, soft color blocks, moving marker strokes, refined cinematic texture",
  },
  {
    id: "flash-comic",
    name: "Impact Ink",
    family: "Pop Action",
    description: "Posterized saturation, inked shadows, and high-energy color punches.",
    accent: "#f97316",
    prompt: "high-impact inked action style, posterized saturation, bold shadows, energetic graphic punch, dynamic camera motion",
  },
  {
    id: "overexposed",
    name: "Hot Light",
    family: "Exposure FX",
    description: "Lifted whites with compressed shadows and a clean washed broadcast feel.",
    accent: "#f8fafc",
    prompt: "bright hot-light cinematic exposure, lifted whites, compressed shadows, premium commercial broadcast look",
  },
  {
    id: "paper",
    name: "Archive Grain",
    family: "Tactile Film",
    description: "Warm toning, softened contrast, and fine ink texture over the moving image.",
    accent: "#facc15",
    prompt: "warm archive grain film texture, softened contrast, tactile ink surface, documentary editorial motion",
  },
  {
    id: "noir",
    name: "Shadow Reel",
    family: "Mono Drama",
    description: "High-contrast monochrome with crushed blacks and heavy film grain.",
    accent: "#94a3b8",
    prompt: "dramatic monochrome shadow reel, crushed blacks, heavy film grain, cinematic noir lighting, clean subject continuity",
  },
  {
    id: "particles",
    name: "Signal Trails",
    family: "Motion Marks",
    description: "Darkened source plate with light traces and tracked energy marks.",
    accent: "#22d3ee",
    prompt: "dark cinematic plate with elegant signal trails, tracked light marks, subtle energy streaks, futuristic editorial motion",
  },
  {
    id: "hand-paint",
    name: "Pastel Motion",
    family: "Soft Frames",
    description: "Reduced color bands, gentle edges, and pastel brush texture.",
    accent: "#fb7185",
    prompt: "soft pastel motion illustration, reduced color bands, gentle edges, handmade brush texture, calm cinematic flow",
  },
];

const FPS_OPTIONS: Array<{ value: FpsMode; label: string; helper?: string }> = [
  { value: "4", label: "4 FPS" },
  { value: "8", label: "8 FPS" },
  { value: "10", label: "10 FPS" },
  { value: "12", label: "12 FPS" },
  { value: "24", label: "24 FPS" },
  { value: "manual", label: "Manual", helper: "Choose a custom frame rate" },
];

const RESOLUTION_OPTIONS: ResolutionMode[] = ["1K", "2K", "4K"];
const PROVIDER_OPTIONS: Array<{ value: ProviderMode; label: string; helper?: string }> = [
  { value: "kie", label: "KIE.ai", helper: "Kling 3 image-to-video" },
  { value: "wavespeed", label: "WaveSpeed", helper: "Seedance image-to-video" },
  { value: "local", label: "Local", helper: "Browser render fallback" },
];
const DEFAULT_COLORS = {
  background: "#ffffff",
  mid: "#0c33a5",
  object: "#f90000",
};

function clamp(value: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "").trim();
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const numberValue = Number.parseInt(value, 16);
  if (Number.isNaN(numberValue)) return { r: 255, g: 255, b: 255 };
  return {
    r: (numberValue >> 16) & 255,
    g: (numberValue >> 8) & 255,
    b: numberValue & 255,
  };
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function posterize(value: number, steps: number) {
  const size = 255 / Math.max(2, steps - 1);
  return Math.round(value / size) * size;
}

function mixChannel(a: number, b: number, amount: number) {
  return clamp(a * (1 - amount) + b * amount);
}

function deterministicNoise(x: number, y: number, frame: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + frame * 0.37) * 43758.5453;
  return value - Math.floor(value);
}

function getRenderSize(videoWidth: number, videoHeight: number, resolution: ResolutionMode) {
  const maxWidth = resolution === "4K" ? 3840 : resolution === "2K" ? 2048 : 1024;
  const aspect = videoHeight > 0 ? videoWidth / videoHeight : 16 / 9;
  const width = Math.min(maxWidth, Math.max(320, videoWidth || maxWidth));
  const height = Math.round(width / aspect);
  return { width, height };
}

function getMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function resolutionToProviderValue(resolution: ResolutionMode, provider: ProviderMode) {
  if (provider === "wavespeed") return resolution === "1K" ? "720p" : "1080p";
  return resolution === "1K" ? "720p" : resolution === "2K" ? "1080p" : "1080p";
}

function buildStylePrompt(
  preset: Preset,
  colors: { background: string; mid: string; object: string },
  fps: number,
  resolution: ResolutionMode
) {
  return [
    preset.prompt,
    `use a controlled palette: background ${colors.background}, mid layer ${colors.mid}, key accent ${colors.object}`,
    `maintain subject identity, stable composition, temporal consistency, clean motion, no text overlays, no watermark`,
    `short social cinematic style clip, ${fps} fps feel, ${resolution} target`,
  ].join(". ");
}

function readVideoMetadata(videoSrc: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoSrc;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("The video could not be loaded."));
  });
}

async function extractKeyframe(videoSrc: string): Promise<string> {
  const video = await readVideoMetadata(videoSrc);
  const seekTime = Math.min(Math.max(0.1, video.duration * 0.18), Math.max(0, video.duration - 0.1));
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error("Could not extract a keyframe from the video."));
    video.currentTime = Number.isFinite(seekTime) ? seekTime : 0;
  });
  const canvas = document.createElement("canvas");
  const maxWidth = 1280;
  const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
  canvas.width = Math.max(320, Math.round((video.videoWidth || 1280) * scale));
  canvas.height = Math.max(180, Math.round((video.videoHeight || 720) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  video.removeAttribute("src");
  video.load();
  return canvas.toDataURL("image/jpeg", 0.92);
}

function applyPixelPreset(
  imageData: ImageData,
  presetId: PresetId,
  colors: { background: string; mid: string; object: string },
  frame: number
) {
  const data = imageData.data;
  const bg = hexToRgb(colors.background);
  const mid = hexToRgb(colors.mid);
  const obj = hexToRgb(colors.object);
  const source = new Uint8ClampedArray(data);
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = source[i];
      const g = source[i + 1];
      const b = source[i + 2];
      const l = luminance(r, g, b);
      const noise = deterministicNoise(x, y, frame);

      if (presetId === "layer-mixed-media") {
        const target = l < 82 ? obj : l < 170 ? mid : bg;
        const edgeBoost = noise > 0.84 ? 34 : 0;
        data[i] = clamp(mixChannel(r, target.r, 0.78) - edgeBoost);
        data[i + 1] = clamp(mixChannel(g, target.g, 0.78) - edgeBoost);
        data[i + 2] = clamp(mixChannel(b, target.b, 0.78) - edgeBoost);
      } else if (presetId === "sketch") {
        const right = x < width - 1 ? (y * width + x + 1) * 4 : i;
        const down = y < height - 1 ? ((y + 1) * width + x) * 4 : i;
        const lr = luminance(source[right], source[right + 1], source[right + 2]);
        const ld = luminance(source[down], source[down + 1], source[down + 2]);
        const edge = clamp(Math.abs(l - lr) + Math.abs(l - ld), 0, 255);
        const paper = clamp(250 - edge * 1.85);
        data[i] = clamp(paper + edge * 0.18);
        data[i + 1] = clamp(paper - edge * 0.16);
        data[i + 2] = clamp(paper - edge * 0.12);
      } else if (presetId === "canvas") {
        data[i] = clamp(posterize(mixChannel(r, bg.r, 0.12), 7) + (noise - 0.5) * 18);
        data[i + 1] = clamp(posterize(mixChannel(g, mid.g, 0.15), 7) + (noise - 0.5) * 18);
        data[i + 2] = clamp(posterize(mixChannel(b, obj.b, 0.1), 7) + (noise - 0.5) * 18);
      } else if (presetId === "flash-comic") {
        data[i] = clamp(posterize(r * 1.24 + obj.r * 0.16, 5));
        data[i + 1] = clamp(posterize(g * 1.12 + mid.g * 0.12, 5));
        data[i + 2] = clamp(posterize(b * 1.2 + bg.b * 0.08, 5));
      } else if (presetId === "overexposed") {
        data[i] = clamp(r * 1.55 + 30);
        data[i + 1] = clamp(g * 1.55 + 30);
        data[i + 2] = clamp(b * 1.45 + 38);
      } else if (presetId === "paper") {
        data[i] = clamp(mixChannel(r, 245, 0.22) + noise * 16);
        data[i + 1] = clamp(mixChannel(g, 225, 0.22) + noise * 12);
        data[i + 2] = clamp(mixChannel(b, 188, 0.28) + noise * 8);
      } else if (presetId === "noir") {
        const contrast = clamp((l - 128) * 1.85 + 128 + (noise - 0.5) * 42);
        data[i] = contrast;
        data[i + 1] = contrast;
        data[i + 2] = contrast;
      } else if (presetId === "particles") {
        data[i] = clamp(r * 0.48 + mid.r * 0.1);
        data[i + 1] = clamp(g * 0.54 + mid.g * 0.18);
        data[i + 2] = clamp(b * 0.7 + obj.b * 0.12);
      } else if (presetId === "hand-paint") {
        data[i] = clamp(posterize(mixChannel(r, bg.r, 0.18), 6));
        data[i + 1] = clamp(posterize(mixChannel(g, mid.g, 0.1), 6));
        data[i + 2] = clamp(posterize(mixChannel(b, obj.b, 0.08), 6));
      }
    }
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, presetId: PresetId, width: number, height: number, frame: number, colors: { background: string; mid: string; object: string }) {
  if (presetId === "layer-mixed-media" || presetId === "noir") {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = presetId === "noir" ? "rgba(255,255,255,0.16)" : colors.object;
    ctx.lineWidth = Math.max(1, width / 640);
    for (let y = 0; y < height; y += Math.max(10, Math.round(height / 34))) {
      ctx.beginPath();
      ctx.moveTo(0, y + ((frame + y) % 4));
      ctx.lineTo(width, y + ((frame + y) % 4));
      ctx.stroke();
    }
    ctx.restore();
  }

  if (presetId === "particles" || presetId === "canvas" || presetId === "hand-paint") {
    ctx.save();
    ctx.globalCompositeOperation = presetId === "particles" ? "screen" : "source-over";
    for (let i = 0; i < 36; i++) {
      const x = ((i * 97 + frame * 9) % width);
      const y = ((i * 53 + frame * 5) % height);
      const length = 20 + (i % 7) * 10;
      ctx.globalAlpha = presetId === "particles" ? 0.35 : 0.16;
      ctx.strokeStyle = i % 3 === 0 ? colors.object : i % 3 === 1 ? colors.mid : colors.background;
      ctx.lineWidth = presetId === "particles" ? 1.4 : 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(i + frame * 0.05) * length, y + Math.sin(i * 1.7) * length);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (presetId === "flash-comic") {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#111827";
    const dot = Math.max(6, Math.round(width / 140));
    for (let y = 0; y < height; y += dot * 2) {
      for (let x = 0; x < width; x += dot * 2) {
        ctx.beginPath();
        ctx.arc(x + (y % (dot * 4) ? dot : 0), y, dot * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function SelectMenu<T extends string>({
  value,
  label,
  options,
  onChange,
}: {
  value: T;
  label: string;
  options: Array<{ value: T; label: string; helper?: string }>;
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-full items-center justify-between rounded-lg border border-white/8 bg-[#171b22] px-4 text-left transition hover:border-white/16"
      >
        <span>
          <span className="block text-[11px] font-medium text-slate-400">{label}</span>
          <span className="block text-sm font-semibold text-white">{selected.label}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-lg border border-white/10 bg-[#0c1016] py-1 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition",
                option.value === value ? "bg-white/[0.04] text-white" : "text-slate-300 hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <span>
                <span className="block">{option.label}</span>
                {option.helper ? <span className="block text-xs font-normal text-slate-500">{option.helper}</span> : null}
              </span>
              {option.value === value ? <Check className="h-4 w-4 text-cyan-300" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="flex h-11 items-center gap-3 rounded-lg border border-white/8 bg-[#11161d] px-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
          aria-label={label}
        />
        <input
          value={value.toUpperCase()}
          onChange={(event) => {
            const next = event.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(next)) onChange(next);
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(value)) onChange("#ffffff");
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
        />
        <Palette className="h-4 w-4 text-slate-500" />
      </span>
    </label>
  );
}

export default function CinematicStylesPage() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceDuration, setSourceDuration] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>("layer-mixed-media");
  const [providerMode, setProviderMode] = useState<ProviderMode>("kie");
  const [fpsMode, setFpsMode] = useState<FpsMode>("24");
  const [manualFps, setManualFps] = useState(16);
  const [resolution, setResolution] = useState<ResolutionMode>("1K");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrls = useRef<string[]>([]);

  const selectedPreset = useMemo(
    () => PRESETS.find((preset) => preset.id === selectedPresetId) ?? PRESETS[0],
    [selectedPresetId]
  );
  const effectiveFps = fpsMode === "manual" ? manualFps : Number(fpsMode);
  const canGenerate = Boolean(sourceUrl) && status !== "processing" && effectiveFps > 0;

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const clearOutput = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setProgress(0);
    setStatus(sourceUrl ? "ready" : "idle");
  }, [outputUrl, sourceUrl]);

  const handleFile = useCallback((file: File) => {
    setError("");
    clearOutput();
    if (!file.type.startsWith("video/")) {
      setError("Upload a video file to continue.");
      setStatus("failed");
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setSourceUrl(url);
    setSourceName(file.name);
    setSourceDuration(null);
    setStatus("ready");
  }, [clearOutput]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  const renderVideo = useCallback(async () => {
    if (!sourceUrl || status === "processing") return;
    setStatus("processing");
    setProgress(0);
    setError("");
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }

    const video = document.createElement("video");
    video.src = sourceUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("The video could not be loaded."));
      });

      const duration = Math.min(video.duration || 0, 10);
      if (!duration || duration < 1) throw new Error("The video must be at least 1 second long.");
      if ((video.duration || 0) > 10.2) throw new Error("Use a clip between 1 and 10 seconds for this tool.");

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      const size = getRenderSize(video.videoWidth, video.videoHeight, resolution);
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas rendering is not available in this browser.");

      const stream = canvas.captureStream(effectiveFps);
      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const completed = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Video recording failed."));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
      });

      let frame = 0;
      const startedAt = performance.now();
      const frameInterval = 1000 / effectiveFps;
      let lastFrameAt = 0;

      const draw = (now: number) => {
        if (video.paused || video.ended) return;
        const elapsed = now - startedAt;
        if (elapsed - lastFrameAt >= frameInterval) {
          lastFrameAt = elapsed;
          frame += 1;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          applyPixelPreset(frameData, selectedPresetId, colors, frame);
          ctx.putImageData(frameData, 0, 0);
          drawOverlay(ctx, selectedPresetId, canvas.width, canvas.height, frame, colors);
          setProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        }
        if (video.currentTime < duration) {
          requestAnimationFrame(draw);
        }
      };

      recorder.start(250);
      video.currentTime = 0;
      await video.play();
      requestAnimationFrame(draw);

      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          if (video.currentTime >= duration || video.ended) {
            window.clearInterval(timer);
            video.pause();
            resolve();
          }
        }, 80);
      });

      if (recorder.state !== "inactive") recorder.stop();
      const blob = await completed;
      const nextOutputUrl = URL.createObjectURL(blob);
      objectUrls.current.push(nextOutputUrl);
      setOutputUrl(nextOutputUrl);
      setOutputs((items) => [
        {
          id: `${Date.now()}`,
          name: selectedPreset.name,
          url: nextOutputUrl,
          createdAt: new Date().toLocaleTimeString(),
          fps: effectiveFps,
          resolution,
        },
        ...items,
      ].slice(0, 8));
      setProgress(100);
      setStatus("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rendering failed.");
      setStatus("failed");
      setProgress(0);
    } finally {
      video.removeAttribute("src");
      video.load();
    }
  }, [colors, effectiveFps, outputUrl, resolution, selectedPreset.name, selectedPresetId, sourceUrl, status]);

  const resetSettings = () => {
    setProviderMode("kie");
    setFpsMode("24");
    setManualFps(16);
    setResolution("1K");
    setColors(DEFAULT_COLORS);
    setSelectedPresetId("layer-mixed-media");
  };

  const runCloudGeneration = useCallback(async () => {
    if (!sourceUrl || status === "processing") return;
    setStatus("processing");
    setProgress(5);
    setError("");
    setTaskId(null);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }

    try {
      const sourceVideo = await readVideoMetadata(sourceUrl);
      const duration = Math.min(sourceVideo.duration || 5, 10);
      if (!duration || duration < 1) throw new Error("The video must be at least 1 second long.");
      if ((sourceVideo.duration || 0) > 10.2) throw new Error("Use a clip between 1 and 10 seconds for this tool.");
      sourceVideo.removeAttribute("src");
      sourceVideo.load();

      setProgress(15);
      const keyframe = await extractKeyframe(sourceUrl);
      setProgress(25);

      const prompt = buildStylePrompt(selectedPreset, colors, effectiveFps, resolution);
      const modelRoute =
        providerMode === "wavespeed"
          ? "bytedance/v1-pro-image-to-video"
          : "kwaivgi/kling-v3.0-pro/text-to-video";
      const providerResolution = resolutionToProviderValue(resolution, providerMode);
      const payload: Record<string, unknown> =
        providerMode === "wavespeed"
          ? {
              prompt,
              image_url: keyframe,
              duration: Math.max(4, Math.min(10, Math.round(duration))),
              resolution: providerResolution,
              aspect_ratio: "16:9",
            }
          : {
              prompt,
              image_urls: [keyframe],
              duration: String(Math.max(3, Math.min(10, Math.round(duration)))),
              aspect_ratio: "16:9",
              mode: "std",
              sound: false,
              multi_shots: false,
              multi_prompt: [],
            };

      const submitRes = await fetch("/api/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `cinematic-styles-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: JSON.stringify({ modelRoute, payload }),
      });
      const submitJson = await submitRes.json().catch(() => null);
      if (!submitRes.ok || !submitJson?.taskId) {
        throw new Error(submitJson?.error || "Provider generation could not be started.");
      }

      const nextTaskId = String(submitJson.taskId);
      setTaskId(nextTaskId);
      setProgress(35);

      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        setProgress(Math.min(92, 35 + Math.round((attempt / 90) * 55)));
        const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(nextTaskId)}`, { cache: "no-store" });
        const pollJson = await pollRes.json().catch(() => null);
        if (!pollRes.ok) {
          throw new Error(pollJson?.error || "Provider status check failed.");
        }
        if (pollJson?.status === "failed") {
          throw new Error(pollJson?.error || "Provider generation failed.");
        }
        const outputs = Array.isArray(pollJson?.outputs) ? pollJson.outputs.filter((item: unknown): item is string => typeof item === "string") : [];
        if (pollJson?.status === "completed" && outputs.length > 0) {
          const finalUrl = outputs[0];
          setOutputUrl(finalUrl);
          setOutputs((items) => [
            {
              id: `${Date.now()}`,
              name: `${selectedPreset.name} · ${providerMode === "kie" ? "KIE.ai" : "WaveSpeed"}`,
              url: finalUrl,
              createdAt: new Date().toLocaleTimeString(),
              fps: effectiveFps,
              resolution,
            },
            ...items,
          ].slice(0, 8));
          setProgress(100);
          setStatus("completed");
          return;
        }
      }

      throw new Error("Provider generation timed out.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provider generation failed.");
      setStatus("failed");
      setProgress(0);
    }
  }, [colors, effectiveFps, outputUrl, providerMode, resolution, selectedPreset, sourceUrl, status]);

  const handleGenerate = useCallback(() => {
    if (providerMode === "local") {
      void renderVideo();
      return;
    }
    void runCloudGeneration();
  }, [providerMode, renderVideo, runCloudGeneration]);

  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#070a0f] text-slate-100">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-white/8 bg-[#0a0e14] p-5 xl:border-b-0 xl:border-r">
          <div className="rounded-lg border border-white/8 bg-[#11161d] p-3">
            <div className="relative aspect-video overflow-hidden rounded-md bg-[#0d1118]">
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.1) 42%, rgba(139,92,246,0.12)), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 9px)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-lg font-black uppercase tracking-tight text-cyan-300">Cinematic Styles</p>
                <p className="text-xs font-medium text-slate-300">Layered motion presets for short-form edits</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex aspect-[1.85] w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-[#171b22] text-center transition hover:border-cyan-300/50 hover:bg-[#1a2029]"
          >
            {sourceUrl ? (
              <span className="flex flex-col items-center gap-2">
                <Video className="h-6 w-6 text-cyan-300" />
                <span className="max-w-[240px] truncate text-sm font-semibold text-white">{sourceName}</span>
                <span className="text-xs text-slate-500">
                  {sourceDuration ? `${sourceDuration.toFixed(1)}s loaded` : "Reading metadata"}
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <Upload className="h-5 w-5 text-slate-300" />
                </span>
                <span className="text-sm font-semibold text-white">Upload video to edit</span>
                <span className="text-xs text-slate-500">Duration required: 1-10 seconds</span>
              </span>
            )}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <SelectMenu<ProviderMode>
                value={providerMode}
                label="Provider"
                options={PROVIDER_OPTIONS}
                onChange={setProviderMode}
              />
            </div>
            <SelectMenu<FpsMode>
              value={fpsMode}
              label="Frame rate"
              options={FPS_OPTIONS}
              onChange={setFpsMode}
            />
            <SelectMenu<ResolutionMode>
              value={resolution}
              label="Resolution"
              options={RESOLUTION_OPTIONS.map((item) => ({ value: item, label: item }))}
              onChange={setResolution}
            />
          </div>

          {fpsMode === "manual" ? (
            <label className="mt-3 block rounded-lg border border-white/8 bg-[#171b22] p-4">
              <span className="flex items-center justify-between text-xs font-medium text-slate-400">
                Custom frame rate
                <span className="text-sm font-semibold text-white">{manualFps} FPS</span>
              </span>
              <input
                type="range"
                min={1}
                max={30}
                value={manualFps}
                onChange={(event) => setManualFps(Number(event.target.value))}
                className="mt-3 w-full accent-cyan-400"
              />
            </label>
          ) : null}

          <div className="mt-4 rounded-lg border border-white/8 bg-[#171b22] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Settings</p>
                <p className="text-xs text-slate-500">Controls used by the render pass</p>
              </div>
              <button
                type="button"
                onClick={resetSettings}
                className="text-xs font-semibold text-slate-400 transition hover:text-white"
              >
                Reset
              </button>
            </div>
            <div className="space-y-3">
              <ColorControl label="Background color" value={colors.background} onChange={(background) => setColors((current) => ({ ...current, background }))} />
              <ColorControl label="Mid layer color" value={colors.mid} onChange={(mid) => setColors((current) => ({ ...current, mid }))} />
              <ColorControl label="Main object color" value={colors.object} onChange={(object) => setColors((current) => ({ ...current, object }))} />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/8 bg-[#11161d] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
              Render pipeline
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <p>Frame extraction: {effectiveFps} FPS</p>
              <p>Output target: {resolution}</p>
              <p>Processor: {providerMode === "kie" ? "KIE.ai cloud generation" : providerMode === "wavespeed" ? "WaveSpeed cloud generation" : "browser canvas + MediaRecorder"}</p>
              {taskId ? <p>Task: {taskId.slice(0, 18)}...</p> : null}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => previewVideoRef.current?.play()}
              disabled={!sourceUrl}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Play preview"
            >
              <Play className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {status === "processing" ? `Rendering ${progress}%` : "Generate"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["All Presets", "Processing", "Outputs"].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
                    index === 0 ? "border-white/10 bg-white/8 text-white" : "border-white/6 bg-transparent text-slate-500 hover:text-slate-300"
                  )}
                >
                  {index === 0 ? <Layers className="h-4 w-4" /> : index === 1 ? <Wand2 className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                  {item}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-white/8 bg-[#11161d] px-3 py-2 text-xs font-medium text-slate-400">
              Real-time local render. No mock output.
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-lg border bg-[#11161d] text-left transition",
                      selectedPresetId === preset.id ? "border-cyan-300 shadow-[0_0_0_1px_rgba(6,182,212,0.45)]" : "border-white/8 hover:border-white/20"
                    )}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${preset.accent}33, rgba(15,23,42,0.2) 42%, ${colors.mid}22), radial-gradient(circle at 74% 22%, ${colors.object}55, transparent 30%), linear-gradient(0deg, rgba(0,0,0,0.84), rgba(0,0,0,0.06))`,
                      }}
                    />
                    <div className="absolute inset-0 opacity-30 mix-blend-screen">
                      <div className="h-full w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_18px)]" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="mb-2 inline-flex rounded bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {preset.family}
                      </div>
                      <p className="text-sm font-black text-white">{preset.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300">{preset.description}</p>
                    </div>
                    {selectedPresetId === preset.id ? (
                      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-white/8 bg-[#11161d] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Selected preset</p>
                    <h1 className="mt-1 text-xl font-black text-white">{selectedPreset.name}</h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOutputUrl(null);
                      setProgress(0);
                      setStatus(sourceUrl ? "ready" : "idle");
                      setError("");
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:text-white"
                    aria-label="Clear current output"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm leading-6 text-slate-400">{selectedPreset.description}</p>

                <div className="mt-4 overflow-hidden rounded-lg border border-white/8 bg-black">
                  {outputUrl ? (
                    <video src={outputUrl} controls className="aspect-video w-full object-contain" />
                  ) : sourceUrl ? (
                    <video
                      ref={previewVideoRef}
                      src={sourceUrl}
                      controls
                      className="aspect-video w-full object-contain"
                      onLoadedMetadata={(event) => {
                        setSourceDuration(event.currentTarget.duration);
                      }}
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-sm text-slate-500">
                      Upload a clip to preview
                    </div>
                  )}
                </div>

                {status === "processing" ? (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>Processing frames</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                ) : null}

                {outputUrl ? (
                  <a
                    href={outputUrl}
                    download={`saad-mixed-media-${selectedPreset.id}.webm`}
                    className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-slate-950 transition hover:bg-slate-200"
                  >
                    <Download className="h-4 w-4" />
                    Download output
                  </a>
                ) : null}
              </div>

              <div className="rounded-lg border border-white/8 bg-[#11161d] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Output history</p>
                {outputs.length ? (
                  <div className="space-y-2">
                    {outputs.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setOutputUrl(item.url);
                          setStatus("completed");
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/16"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{item.name}</span>
                          <span className="block text-xs text-slate-500">{item.resolution} · {item.fps} FPS · {item.createdAt}</span>
                        </span>
                        <Film className="h-4 w-4 text-slate-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Rendered clips will appear here.</p>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </section>
  );
}

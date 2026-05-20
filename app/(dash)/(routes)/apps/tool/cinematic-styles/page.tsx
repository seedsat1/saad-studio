"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Film,
  Info,
  Layers,
  Loader2,
  Palette,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESETS, type LocalEffectId, type PresetId, type Preset } from "@/lib/cinematic-presets";

type FpsMode = "4" | "8" | "10" | "12" | "24" | "manual";
type ResolutionMode = "1K" | "2K" | "4K";
type RenderStatus = "idle" | "ready" | "processing" | "completed" | "failed";
type ProviderMode = "kie" | "wavespeed" | "local";
type ActiveTab = "presets" | "processing" | "outputs";

type OutputItem = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  fps?: number;
  resolution?: ResolutionMode;
};

type Rgb = { r: number; g: number; b: number };


const FPS_OPTIONS: Array<{ value: FpsMode; label: string; helper?: string }> = [
  { value: "4", label: "4 FPS" },
  { value: "8", label: "8 FPS" },
  { value: "10", label: "10 FPS" },
  { value: "12", label: "12 FPS" },
  { value: "24", label: "24 FPS" },
  { value: "manual", label: "Manual", helper: "Choose a custom frame rate" },
];

const RESOLUTION_OPTIONS: ResolutionMode[] = ["1K", "2K", "4K"];
const KIE_IMAGE_TO_VIDEO_ROUTE = "kling/v2-5-turbo-image-to-video-pro";
const WAVESPEED_IMAGE_TO_VIDEO_ROUTE = "bytedance/v1-pro-image-to-video";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;
const CLOUD_NEGATIVE_PROMPT = "subtitles, video player UI, watermark, flicker, distorted face, unstable identity, cartoon exaggeration, jitter, face deformation";
const CLOUD_CFG_SCALE = 0.8;
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

function getModelRoute(provider: ProviderMode) {
  return provider === "wavespeed" ? WAVESPEED_IMAGE_TO_VIDEO_ROUTE : KIE_IMAGE_TO_VIDEO_ROUTE;
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, data] = dataUrl.split(",");
  const mime = header?.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

function safeErrorMessage(error: unknown, fallback = "Generation failed.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function outputMetaLabel(item: OutputItem) {
  const parts = [
    item.resolution,
    typeof item.fps === "number" ? `${item.fps} FPS` : null,
    item.createdAt,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" - ");
}

async function preflightGeneration(requiredCredits: number) {
  const response = await fetch("/api/generation/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requiredCredits,
      action: "apps:cinematic-styles:generate",
    }),
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) {
    return { ok: false as const, message: "Sign in to generate with Saad Cloud." };
  }
  if (response.status === 402) {
    return { ok: false as const, message: payload?.error || "Insufficient credits. Please purchase more credits to continue." };
  }
  if (!response.ok) {
    return { ok: false as const, message: payload?.error || "Generation preflight failed." };
  }
  return { ok: true as const };
}

async function quoteVideoCredits(modelRoute: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/video/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelRoute, payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.credits !== "number") {
    throw new Error(data?.error || "Could not calculate credits for this generation.");
  }
  return data.credits as number;
}

async function loadPersistedVideoOutputs() {
  const response = await fetch("/api/assets?type=video", { cache: "no-store" });
  if (response.status === 401) return [];
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.assets)) return [];
  return data.assets
    .filter((asset: Record<string, unknown>) => {
      const url = asset.url;
      return typeof url === "string" && /^https?:\/\//i.test(url);
    })
    .map((asset: Record<string, unknown>) => ({
      id: String(asset.id || asset.url),
      name: "Saad Cloud video",
      url: String(asset.url),
      createdAt: typeof asset.date === "string" ? asset.date : "Saved",
    }))
    .slice(0, 8);
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

async function uploadKeyframe(dataUrl: string) {
  const file = dataUrlToFile(dataUrl, `cinematic-style-keyframe-${Date.now()}.jpg`);
  const urlRes = await fetch("/api/studio/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      assetType: "image",
    }),
  });
  const urlJson = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !urlJson?.signedUrl || !urlJson?.publicUrl) {
    throw new Error(urlJson?.error || "Could not prepare a storage upload.");
  }

  const uploadRes = await fetch(String(urlJson.signedUrl), {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Keyframe upload failed.");
  return String(urlJson.publicUrl);
}

async function persistOutputUrl(mediaUrl: string, generationId?: string) {
  const persistRes = await fetch("/api/assets/persist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationId,
      mediaUrl,
      assetType: "video",
    }),
  });
  const persistJson = await persistRes.json().catch(() => null);
  if (!persistRes.ok) return mediaUrl;
  return typeof persistJson?.url === "string" ? persistJson.url : mediaUrl;
}

function applyPixelPreset(
  imageData: ImageData,
  effect: LocalEffectId,
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

      if (effect === "layer-mixed-media") {
        const target = l < 82 ? obj : l < 170 ? mid : bg;
        const edgeBoost = noise > 0.84 ? 34 : 0;
        data[i] = clamp(mixChannel(r, target.r, 0.78) - edgeBoost);
        data[i + 1] = clamp(mixChannel(g, target.g, 0.78) - edgeBoost);
        data[i + 2] = clamp(mixChannel(b, target.b, 0.78) - edgeBoost);
      } else if (effect === "sketch") {
        const right = x < width - 1 ? (y * width + x + 1) * 4 : i;
        const down = y < height - 1 ? ((y + 1) * width + x) * 4 : i;
        const lr = luminance(source[right], source[right + 1], source[right + 2]);
        const ld = luminance(source[down], source[down + 1], source[down + 2]);
        const edge = clamp(Math.abs(l - lr) + Math.abs(l - ld), 0, 255);
        const paper = clamp(250 - edge * 1.85);
        data[i] = clamp(paper + edge * 0.18);
        data[i + 1] = clamp(paper - edge * 0.16);
        data[i + 2] = clamp(paper - edge * 0.12);
      } else if (effect === "canvas") {
        data[i] = clamp(posterize(mixChannel(r, bg.r, 0.12), 7) + (noise - 0.5) * 18);
        data[i + 1] = clamp(posterize(mixChannel(g, mid.g, 0.15), 7) + (noise - 0.5) * 18);
        data[i + 2] = clamp(posterize(mixChannel(b, obj.b, 0.1), 7) + (noise - 0.5) * 18);
      } else if (effect === "flash-comic") {
        data[i] = clamp(posterize(r * 1.24 + obj.r * 0.16, 5));
        data[i + 1] = clamp(posterize(g * 1.12 + mid.g * 0.12, 5));
        data[i + 2] = clamp(posterize(b * 1.2 + bg.b * 0.08, 5));
      } else if (effect === "overexposed") {
        data[i] = clamp(r * 1.55 + 30);
        data[i + 1] = clamp(g * 1.55 + 30);
        data[i + 2] = clamp(b * 1.45 + 38);
      } else if (effect === "paper") {
        data[i] = clamp(mixChannel(r, 245, 0.22) + noise * 16);
        data[i + 1] = clamp(mixChannel(g, 225, 0.22) + noise * 12);
        data[i + 2] = clamp(mixChannel(b, 188, 0.28) + noise * 8);
      } else if (effect === "noir") {
        const contrast = clamp((l - 128) * 1.85 + 128 + (noise - 0.5) * 42);
        data[i] = contrast;
        data[i + 1] = contrast;
        data[i + 2] = contrast;
      } else if (effect === "particles") {
        data[i] = clamp(r * 0.48 + mid.r * 0.1);
        data[i + 1] = clamp(g * 0.54 + mid.g * 0.18);
        data[i + 2] = clamp(b * 0.7 + obj.b * 0.12);
      } else if (effect === "hand-paint") {
        data[i] = clamp(posterize(mixChannel(r, bg.r, 0.18), 6));
        data[i + 1] = clamp(posterize(mixChannel(g, mid.g, 0.1), 6));
        data[i + 2] = clamp(posterize(mixChannel(b, obj.b, 0.08), 6));
      }
    }
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, effect: LocalEffectId, width: number, height: number, frame: number, colors: { background: string; mid: string; object: string }) {
  if (effect === "layer-mixed-media" || effect === "noir") {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = effect === "noir" ? "rgba(255,255,255,0.16)" : colors.object;
    ctx.lineWidth = Math.max(1, width / 640);
    for (let y = 0; y < height; y += Math.max(10, Math.round(height / 34))) {
      ctx.beginPath();
      ctx.moveTo(0, y + ((frame + y) % 4));
      ctx.lineTo(width, y + ((frame + y) % 4));
      ctx.stroke();
    }
    ctx.restore();
  }

  if (effect === "particles" || effect === "canvas" || effect === "hand-paint") {
    ctx.save();
    ctx.globalCompositeOperation = effect === "particles" ? "screen" : "source-over";
    for (let i = 0; i < 36; i++) {
      const x = ((i * 97 + frame * 9) % width);
      const y = ((i * 53 + frame * 5) % height);
      const length = 20 + (i % 7) * 10;
      ctx.globalAlpha = effect === "particles" ? 0.35 : 0.16;
      ctx.strokeStyle = i % 3 === 0 ? colors.object : i % 3 === 1 ? colors.mid : colors.background;
      ctx.lineWidth = effect === "particles" ? 1.4 : 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(i + frame * 0.05) * length, y + Math.sin(i * 1.7) * length);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (effect === "flash-comic") {
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
  const [providerMode] = useState<ProviderMode>("kie");
  const [activeTab, setActiveTab] = useState<ActiveTab>("presets");
  const [fpsMode, setFpsMode] = useState<FpsMode>("24");
  const [manualFps, setManualFps] = useState(16);
  const [resolution, setResolution] = useState<ResolutionMode>("1K");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("Upload a short clip to begin.");
  const [quotedCredits, setQuotedCredits] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [presetMedia, setPresetMedia] = useState<Record<string, { type: "image" | "video"; url: string; poster?: string }>>({});
  const [lightboxPresetId, setLightboxPresetId] = useState<string | null>(null);
  const [lightboxCopied, setLightboxCopied] = useState(false);
  const [lightboxReferenceSaved, setLightboxReferenceSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrls = useRef<string[]>([]);

  const selectedPreset = useMemo(
    () => PRESETS.find((preset) => preset.id === selectedPresetId) ?? PRESETS[0],
    [selectedPresetId]
  );
  const lightboxPreset = useMemo(
    () => (lightboxPresetId ? PRESETS.find((preset) => preset.id === lightboxPresetId) ?? null : null),
    [lightboxPresetId]
  );
  const lightboxMedia = lightboxPresetId ? presetMedia[lightboxPresetId] : null;
  const effectiveFps = fpsMode === "manual" ? manualFps : Number(fpsMode);
  const canGenerate = Boolean(sourceUrl) && status !== "processing" && effectiveFps > 0;

  const closeLightbox = useCallback(() => {
    setLightboxPresetId(null);
    setLightboxCopied(false);
    setLightboxReferenceSaved(false);
  }, []);

  const downloadLightboxMedia = useCallback(async () => {
    if (!lightboxMedia?.url || !lightboxPreset) return;
    try {
      const res = await fetch(lightboxMedia.url, { mode: "cors" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = lightboxMedia.type === "video" ? "mp4" : "jpg";
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `cinematic-styles-${lightboxPreset.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(lightboxMedia.url, "_blank", "noopener,noreferrer");
    }
  }, [lightboxMedia, lightboxPreset]);

  const copyLightboxUrl = useCallback(async () => {
    if (!lightboxMedia?.url) return;
    try {
      await navigator.clipboard.writeText(lightboxMedia.url);
      setLightboxCopied(true);
      setTimeout(() => setLightboxCopied(false), 2000);
    } catch {
      /* noop */
    }
  }, [lightboxMedia]);

  const saveLightboxAsReference = useCallback(async () => {
    if (!lightboxMedia?.url || !lightboxPreset) return;
    try {
      const reference = {
        id: lightboxPreset.id,
        type: lightboxMedia.type,
        url: lightboxMedia.url,
        prompt: lightboxPreset.prompt,
        model: "Saad Cloud",
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem("saad_studio_reference_asset", JSON.stringify(reference));
      await navigator.clipboard.writeText(lightboxMedia.url);
      setLightboxReferenceSaved(true);
      setTimeout(() => setLightboxReferenceSaved(false), 2000);
    } catch {
      /* noop */
    }
  }, [lightboxMedia, lightboxPreset]);

  useEffect(() => {
    if (!lightboxPresetId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxPresetId, closeLightbox]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/layouts?page=${encodeURIComponent("cms-cinematic-styles")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const blocks = res?.layoutBlocks;
        const next = (blocks && typeof blocks === "object" && !Array.isArray(blocks))
          ? (blocks as Record<string, unknown>)
          : null;
        const m = next?.presetMedia;
        if (m && typeof m === "object" && !Array.isArray(m)) {
          setPresetMedia(m as Record<string, { type: "image" | "video"; url: string; poster?: string }>);
        } else {
          setPresetMedia({});
        }
      })
      .catch(() => {
        if (!cancelled) setPresetMedia({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadPersistedVideoOutputs()
      .then((items) => {
        if (alive && items.length) setOutputs(items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setQuotedCredits(null);
  }, [effectiveFps, providerMode, resolution, selectedPresetId, sourceUrl]);

  const clearOutput = useCallback(() => {
    // Don't revoke the blob URL — it may still be referenced by entries in
    // the outputs array (Outputs tab). The unmount cleanup will revoke all
    // tracked URLs on navigate-away.
    setOutputUrl(null);
    setProgress(0);
    setStatus(sourceUrl ? "ready" : "idle");
    setStatusMessage(sourceUrl ? "Ready to generate." : "Upload a short clip to begin.");
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
    setStatusMessage("Clip loaded. Choose a preset and generate.");
  }, [clearOutput]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  const renderVideo = useCallback(async () => {
    if (!sourceUrl || status === "processing") return;
    setStatus("processing");
    setActiveTab("processing");
    setProgress(0);
    setError("");
    setStatusMessage("Rendering locally in the browser.");
    setOutputUrl(null);

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
          applyPixelPreset(frameData, selectedPreset.effect, colors, frame);
          ctx.putImageData(frameData, 0, 0);
          drawOverlay(ctx, selectedPreset.effect, canvas.width, canvas.height, frame, colors);
          setStatusMessage("Applying the selected preset to video frames.");
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
      setStatusMessage("Local output is ready.");
      setActiveTab("outputs");
    } catch (err) {
      setError(safeErrorMessage(err, "Rendering failed."));
      setStatus("failed");
      setStatusMessage("Rendering failed.");
      setProgress(0);
    } finally {
      video.removeAttribute("src");
      video.load();
    }
  }, [colors, effectiveFps, outputUrl, resolution, selectedPreset.name, selectedPresetId, sourceUrl, status]);

  const resetSettings = () => {
    setFpsMode("24");
    setManualFps(16);
    setResolution("1K");
    setColors(DEFAULT_COLORS);
    setSelectedPresetId("layer-mixed-media");
  };

  const runCloudGeneration = useCallback(async () => {
    if (!sourceUrl || status === "processing") return;
    setStatus("processing");
    setActiveTab("processing");
    setProgress(5);
    setError("");
    setQuotedCredits(null);
    setStatusMessage("Checking account and credits.");
    setTaskId(null);
    setOutputUrl(null);

    try {
      const sourceVideo = await readVideoMetadata(sourceUrl);
      const duration = Math.min(sourceVideo.duration || 5, 10);
      if (!duration || duration < 1) throw new Error("The video must be at least 1 second long.");
      if ((sourceVideo.duration || 0) > 10.2) throw new Error("Use a clip between 1 and 10 seconds for this tool.");
      sourceVideo.removeAttribute("src");
      sourceVideo.load();

      const prompt = buildStylePrompt(selectedPreset, colors, effectiveFps, resolution);
      const modelRoute = getModelRoute(providerMode);
      const providerResolution = resolutionToProviderValue(resolution, providerMode);
      const outputDuration = Math.max(providerMode === "wavespeed" ? 4 : 5, Math.min(10, Math.round(duration)));
      const basePayload: Record<string, unknown> =
        providerMode === "wavespeed"
          ? {
              prompt,
              duration: outputDuration,
              resolution: providerResolution,
              aspect_ratio: "16:9",
              negative_prompt: CLOUD_NEGATIVE_PROMPT,
              cfg_scale: CLOUD_CFG_SCALE,
            }
          : {
              prompt,
              duration: String(outputDuration),
              resolution: providerResolution,
              negative_prompt: CLOUD_NEGATIVE_PROMPT,
              cfg_scale: CLOUD_CFG_SCALE,
            };
      const credits = await quoteVideoCredits(modelRoute, basePayload);
      setQuotedCredits(credits);
      const gate = await preflightGeneration(credits);
      if (!gate.ok) {
        setStatus(sourceUrl ? "ready" : "idle");
        setStatusMessage("Generation was not started.");
        if (gate.message) setError(gate.message);
        setProgress(0);
        return;
      }

      setProgress(15);
      setStatusMessage("Extracting a keyframe from the uploaded clip.");
      const keyframe = await extractKeyframe(sourceUrl);
      setProgress(22);
      setStatusMessage("Uploading the keyframe to storage.");
      const keyframeUrl = await uploadKeyframe(keyframe);
      setProgress(30);

      const payload: Record<string, unknown> =
        providerMode === "wavespeed"
          ? {
              ...basePayload,
              image_url: keyframeUrl,
            }
          : {
              ...basePayload,
              image_url: keyframeUrl,
            };

      setStatusMessage("Submitting to Saad Cloud.");
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
        throw new Error(submitJson?.error || "Cloud generation could not be started.");
      }

      const nextTaskId = String(submitJson.taskId);
      const generationId = typeof submitJson.generationId === "string" ? submitJson.generationId : undefined;
      setTaskId(nextTaskId);
      setProgress(35);
      setStatusMessage("Saad Cloud is processing the video.");

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
        setProgress(Math.min(92, 35 + Math.round((attempt / MAX_POLL_ATTEMPTS) * 55)));
        const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(nextTaskId)}`, { cache: "no-store" });
        const pollJson = await pollRes.json().catch(() => null);
        if (!pollRes.ok) {
          throw new Error(pollJson?.error || "Cloud status check failed.");
        }
        if (pollJson?.status === "failed") {
          throw new Error(pollJson?.error || "Cloud generation failed.");
        }
        const outputs = Array.isArray(pollJson?.outputs) ? pollJson.outputs.filter((item: unknown): item is string => typeof item === "string") : [];
        if (pollJson?.status === "completed" && outputs.length > 0) {
          setStatusMessage("Saving the Saad Cloud output to storage.");
          const finalUrl = await persistOutputUrl(outputs[0], generationId);
          setOutputUrl(finalUrl);
          setOutputs((items) => [
            {
              id: `${Date.now()}`,
              name: `${selectedPreset.name} - Saad Cloud`,
              url: finalUrl,
              createdAt: new Date().toLocaleTimeString(),
              fps: effectiveFps,
              resolution,
            },
            ...items,
          ].slice(0, 8));
          setProgress(100);
          setStatus("completed");
          setStatusMessage("Cloud output is ready.");
          setActiveTab("outputs");
          return;
        }
      }

      throw new Error("Cloud generation timed out.");
    } catch (err) {
      setError(safeErrorMessage(err, "Cloud generation failed."));
      setStatus("failed");
      setStatusMessage("Cloud generation failed.");
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

  const handleQuickPreview = useCallback(() => {
    void renderVideo();
  }, [renderVideo]);

  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#070a0f] text-slate-100">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-white/8 bg-[#0a0e14] p-5 xl:border-b-0 xl:border-r">
          <div className="rounded-lg border border-white/8 bg-[#11161d] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Selected preset</p>
                <h1 className="mt-1 truncate text-lg font-black text-white">{selectedPreset.name}</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOutputUrl(null);
                  setProgress(0);
                  setStatus(sourceUrl ? "ready" : "idle");
                  setError("");
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:text-white"
                aria-label="Clear current output"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-400 line-clamp-3">{selectedPreset.description}</p>

            <div className="mt-3 overflow-hidden rounded-lg border border-white/8 bg-black">
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
                <div className="flex aspect-video items-center justify-center text-xs text-slate-500">
                  Upload a clip to preview
                </div>
              )}
            </div>

            {status === "processing" ? (
              <div className="mt-3" aria-live="polite">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span className="truncate pr-2">{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-100">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            {outputUrl ? (
              <a
                href={outputUrl}
                download={`cinematic-styles-${selectedPreset.id}.webm`}
                className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-white text-xs font-bold text-slate-950 transition hover:bg-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download output
              </a>
            ) : null}
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
            <div className="col-span-2 rounded-lg border border-white/8 bg-[#171b22] p-4">
              <p className="text-xs font-medium text-slate-400">Engine</p>
              <p className="mt-1 text-sm font-black text-white">Saad Cloud</p>
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

          <div className="mt-5 space-y-2">
            <div className="flex gap-2">
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
                {status === "processing" ? "Processing" : "Generate"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleQuickPreview}
              disabled={!canGenerate}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 className="h-3.5 w-3.5 text-cyan-300" />
              Quick Preview (Local · Free)
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "presets" as const, label: "All Presets", icon: Layers },
                { id: "processing" as const, label: "Processing", icon: Wand2 },
                { id: "outputs" as const, label: "Outputs", icon: Film },
              ].map((item) => {
                const Icon = item.icon;
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
                    activeTab === item.id ? "border-white/10 bg-white/8 text-white" : "border-white/6 bg-transparent text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
                );
              })}
            </div>
            <div className="rounded-lg border border-white/8 bg-[#11161d] px-3 py-2 text-xs font-medium text-slate-400">
              {providerMode === "local"
                ? "Local browser render."
                : quotedCredits
                  ? `${quotedCredits} credits quoted by server.`
                  : "Credits are checked before submit."}
            </div>
          </div>

          <div className="grid gap-4">
            <section className="min-w-0">
              {activeTab === "presets" ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPresetId(preset.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPresetId(preset.id); } }}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-lg border bg-[#11161d] text-left transition cursor-pointer",
                      selectedPresetId === preset.id ? "border-cyan-300 shadow-[0_0_0_1px_rgba(6,182,212,0.45)]" : "border-white/8 hover:border-white/20"
                    )}
                  >
                    {presetMedia[preset.id]?.url ? (
                      presetMedia[preset.id]?.type === "video" ? (
                        <video
                          src={presetMedia[preset.id]?.url}
                          poster={presetMedia[preset.id]?.poster}
                          className="absolute inset-0 h-full w-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          onCanPlay={(e) => {
                            const el = e.currentTarget;
                            try { void el.play(); } catch {}
                          }}
                        />
                      ) : (
                        <img
                          src={presetMedia[preset.id]?.url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      )
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${preset.accent}33, rgba(15,23,42,0.2) 42%, ${colors.mid}22), radial-gradient(circle at 74% 22%, ${colors.object}55, transparent 30%), linear-gradient(0deg, rgba(0,0,0,0.84), rgba(0,0,0,0.06))`,
                        }}
                      />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="mb-2 inline-flex rounded bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {preset.family}
                      </div>
                      <p className="text-sm font-black text-white">{preset.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300">{preset.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxPresetId(preset.id);
                      }}
                      className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                      aria-label="View preset details"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    {selectedPresetId === preset.id ? (
                      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              ) : activeTab === "processing" ? (
                <div className="rounded-lg border border-white/8 bg-[#11161d] p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                      {status === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Pipeline status</p>
                      <p className="text-sm text-slate-400" aria-live="polite">{statusMessage}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Engine</p>
                      <p className="mt-1 text-sm font-semibold text-white">Saad Cloud</p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost check</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {providerMode === "local"
                          ? "No cloud credits"
                          : quotedCredits
                            ? `${quotedCredits} credits quoted by server`
                            : "Checked before submit"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Task</p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">{taskId || "Pending"}</p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preset</p>
                      <p className="mt-1 text-sm font-semibold text-white">{selectedPreset.name}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {outputs.length ? outputs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOutputUrl(item.url);
                        setStatus("completed");
                      }}
                      className="overflow-hidden rounded-lg border border-white/8 bg-[#11161d] text-left transition hover:border-white/20"
                    >
                      <video src={item.url} className="aspect-video w-full bg-black object-cover" muted />
                      <div className="p-3">
                        <p className="truncate text-sm font-black text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{outputMetaLabel(item)}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-lg border border-white/8 bg-[#11161d] p-6 text-sm text-slate-500">
                      Completed outputs will appear here.
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {lightboxPreset ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <div className="grid max-h-[88vh] w-full max-w-6xl grid-cols-1 gap-4 overflow-y-auto px-4 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-black/50 p-3 shadow-2xl">
              {lightboxMedia?.url ? (
                lightboxMedia.type === "video" ? (
                  <video
                    src={lightboxMedia.url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[76vh] max-w-full rounded-xl object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lightboxMedia.url}
                    alt={lightboxPreset.name}
                    className="max-h-[76vh] max-w-full rounded-xl object-contain"
                  />
                )
              ) : (
                <div
                  className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-xl text-sm text-slate-400"
                  style={{
                    background: `linear-gradient(135deg, ${lightboxPreset.accent}33, rgba(15,23,42,0.4) 60%, rgba(0,0,0,0.7))`,
                  }}
                >
                  No preview media uploaded yet.
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1222] p-5">
              <div>
                <div
                  className="inline-flex rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: lightboxPreset.accent }}
                >
                  {lightboxPreset.family}
                </div>
                <h2 className="mt-4 text-xl font-black text-white">{lightboxPreset.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{lightboxPreset.id}</p>
              </div>

              <p className="text-sm leading-6 text-slate-300">{lightboxPreset.description}</p>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 max-h-72 overflow-y-auto">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Prompt</p>
                <p className="mt-1 text-sm leading-6 text-slate-200 whitespace-pre-wrap">{lightboxPreset.prompt}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {lightboxMedia?.url ? (
                  <button
                    type="button"
                    onClick={() => void downloadLightboxMedia()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                ) : null}
                {lightboxMedia?.url ? (
                  <button
                    type="button"
                    onClick={() => void saveLightboxAsReference()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-500/20"
                  >
                    {lightboxReferenceSaved ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {lightboxReferenceSaved ? "Saved as reference" : "Use as reference"}
                  </button>
                ) : null}
                {lightboxMedia?.url ? (
                  <a
                    href={lightboxMedia.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open original
                  </a>
                ) : null}
                {lightboxMedia?.url ? (
                  <button
                    type="button"
                    onClick={() => void copyLightboxUrl()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10"
                  >
                    {lightboxCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {lightboxCopied ? "Copied!" : "Copy URL"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPresetId(lightboxPreset.id);
                    closeLightbox();
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100 transition-colors hover:bg-violet-500/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  Select this preset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

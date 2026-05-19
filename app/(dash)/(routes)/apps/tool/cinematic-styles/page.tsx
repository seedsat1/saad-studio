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
type ActiveTab = "presets" | "processing" | "outputs";

type LocalEffectId =
  | "layer-mixed-media"
  | "sketch"
  | "canvas"
  | "flash-comic"
  | "overexposed"
  | "paper"
  | "noir"
  | "particles"
  | "hand-paint";

type PresetId =
  | LocalEffectId
  | "cinematic-trailer"
  | "k-drama-soft"
  | "vhs-memories"
  | "cyberpunk-neon"
  | "paparazzi-flash"
  | "anime-pulse"
  | "polaroid-snap"
  | "y2k-camcorder"
  | "golden-hour"
  | "synthwave-drive"
  | "watercolor-dream"
  | "studio-portrait"
  | "manga-lines"
  | "hip-hop-visual"
  | "pixel-arcade"
  | "comic-action"
  | "storm-light"
  | "cafe-window"
  | "toxic-glow"
  | "motion-tracker"
  | "black-light"
  | "liquid-chrome"
  | "duotone-bold"
  | "shattered-frame"
  | "paper-fold"
  | "glow-drift"
  | "old-hollywood"
  | "soap-bubbles"
  | "glossy-page"
  | "frost-bite"
  | "mirror-shards"
  | "magma-heat"
  | "marble-bust"
  | "deep-tide"
  | "editorial-modern"
  | "graffiti-spray";

type Preset = {
  id: PresetId;
  effect: LocalEffectId;
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
  fps?: number;
  resolution?: ResolutionMode;
};

type Rgb = { r: number; g: number; b: number };

export const PRESETS: Preset[] = [
  {
    id: "layer-mixed-media",
    effect: "layer-mixed-media",
    name: "Urban Cutout",
    family: "Scene Layers",
    description: "Three-tone subject separation with gritty grain, hard edges, and poster contrast.",
    accent: "#06b6d4",
    prompt: "stylized urban cutout motion, layered graphic composition, gritty editorial poster texture, hard subject edges, cinematic social video",
  },
  {
    id: "sketch",
    effect: "sketch",
    name: "Pencil Pulse",
    family: "Draft Look",
    description: "Edge extraction with clean paper brightness and subtle pencil-shadow motion.",
    accent: "#ef4444",
    prompt: "animated pencil draft style, clean paper background, visible sketch contours, subtle graphite shadows, cinematic motion",
  },
  {
    id: "canvas",
    effect: "canvas",
    name: "Studio Brush",
    family: "Paint Pass",
    description: "Soft color blocks with animated marker strokes over the source frame.",
    accent: "#38bdf8",
    prompt: "painterly studio brush treatment, soft color blocks, moving marker strokes, refined cinematic texture",
  },
  {
    id: "flash-comic",
    effect: "flash-comic",
    name: "Impact Ink",
    family: "Pop Action",
    description: "Posterized saturation, inked shadows, and high-energy color punches.",
    accent: "#f97316",
    prompt: "high-impact inked action style, posterized saturation, bold shadows, energetic graphic punch, dynamic camera motion",
  },
  {
    id: "overexposed",
    effect: "overexposed",
    name: "Hot Light",
    family: "Exposure FX",
    description: "Lifted whites with compressed shadows and a clean washed broadcast feel.",
    accent: "#f8fafc",
    prompt: "bright hot-light cinematic exposure, lifted whites, compressed shadows, premium commercial broadcast look",
  },
  {
    id: "paper",
    effect: "paper",
    name: "Archive Grain",
    family: "Tactile Film",
    description: "Warm toning, softened contrast, and fine ink texture over the moving image.",
    accent: "#facc15",
    prompt: "warm archive grain film texture, softened contrast, tactile ink surface, documentary editorial motion",
  },
  {
    id: "noir",
    effect: "noir",
    name: "Shadow Reel",
    family: "Mono Drama",
    description: "High-contrast monochrome with crushed blacks and heavy film grain.",
    accent: "#94a3b8",
    prompt: "dramatic monochrome shadow reel, crushed blacks, heavy film grain, cinematic noir lighting, clean subject continuity",
  },
  {
    id: "particles",
    effect: "particles",
    name: "Signal Trails",
    family: "Motion Marks",
    description: "Darkened source plate with light traces and tracked energy marks.",
    accent: "#22d3ee",
    prompt: "dark cinematic plate with elegant signal trails, tracked light marks, subtle energy streaks, futuristic editorial motion",
  },
  {
    id: "hand-paint",
    effect: "hand-paint",
    name: "Pastel Motion",
    family: "Soft Frames",
    description: "Reduced color bands, gentle edges, and pastel brush texture.",
    accent: "#fb7185",
    prompt: "soft pastel motion illustration, reduced color bands, gentle edges, handmade brush texture, calm cinematic flow",
  },
  {
    id: "cinematic-trailer",
    effect: "layer-mixed-media",
    name: "Cinematic Trailer",
    family: "Cinema",
    description: "Hollywood blockbuster grade with teal-orange contrast and anamorphic lens feel.",
    accent: "#fb923c",
    prompt: "epic Hollywood cinematic trailer aesthetic, anamorphic lens flares, teal and orange color grading, dramatic atmosphere, premium movie quality",
  },
  {
    id: "k-drama-soft",
    effect: "hand-paint",
    name: "K-Drama",
    family: "Cinema",
    description: "Korean drama softness with dreamy bokeh, pastel rose tints, and gentle motion.",
    accent: "#f9a8d4",
    prompt: "Korean drama romantic cinematic aesthetic, dreamy bokeh, pastel rose hues, soft skin tones, gentle slow motion, emotional close-up feel",
  },
  {
    id: "vhs-memories",
    effect: "paper",
    name: "VHS Memories",
    family: "Retro",
    description: "1980s VHS tape feel with chromatic edges and warm tape wear.",
    accent: "#a78bfa",
    prompt: "1980s VHS analog tape aesthetic, chromatic aberration, tracking lines, warm color shift, nostalgic home video texture, low-fi charm",
  },
  {
    id: "cyberpunk-neon",
    effect: "particles",
    name: "Cyberpunk Neon",
    family: "Future",
    description: "Blade Runner palette with magenta-cyan neon reflections and rain-soaked highlights.",
    accent: "#d946ef",
    prompt: "Blade Runner cyberpunk aesthetic, magenta and cyan neon lights, wet street reflections, futuristic city atmosphere, moody high contrast",
  },
  {
    id: "paparazzi-flash",
    effect: "overexposed",
    name: "Paparazzi Flash",
    family: "Celebrity",
    description: "Sudden strobe pops with high-key whites and tabloid candid feel.",
    accent: "#fef3c7",
    prompt: "celebrity paparazzi flash photography aesthetic, harsh strobe burst, blown highlights, candid tabloid moment, glamorous chaos",
  },
  {
    id: "anime-pulse",
    effect: "flash-comic",
    name: "Anime Pulse",
    family: "Anime",
    description: "Japanese anime cel shading with bold outlines and emotional motion lines.",
    accent: "#ec4899",
    prompt: "japanese anime cel-shaded motion, bold ink outlines, dramatic eyes, emotional speed lines, vibrant saturated palette, studio Ghibli energy",
  },
  {
    id: "polaroid-snap",
    effect: "paper",
    name: "Polaroid Snap",
    family: "Retro",
    description: "Faded Polaroid warmth with soft borders and instant-film nostalgia.",
    accent: "#fde68a",
    prompt: "instant Polaroid photograph aesthetic, faded warm yellows, soft white border, slight color shift, vintage memory texture, sun-faded charm",
  },
  {
    id: "y2k-camcorder",
    effect: "paper",
    name: "Y2K Camcorder",
    family: "Retro",
    description: "Year 2000 mini-DV feel with soft compression and low-fi pixel charm.",
    accent: "#67e8f9",
    prompt: "year 2000 digital camcorder footage aesthetic, soft compression artifacts, mini-DV color cast, low-fi nostalgic Y2K vibe, early 2000s home movie",
  },
  {
    id: "golden-hour",
    effect: "overexposed",
    name: "Golden Hour",
    family: "Mood",
    description: "Warm sun-kissed amber tones with long shadows and magic-hour glow.",
    accent: "#fbbf24",
    prompt: "warm golden hour cinematic light, sun-kissed amber tones, long soft shadows, magic hour atmosphere, dreamy summer afternoon glow",
  },
  {
    id: "synthwave-drive",
    effect: "particles",
    name: "Synthwave Drive",
    family: "Future",
    description: "80s retro-future palette with palm silhouettes and pink neon sunset grid.",
    accent: "#f472b6",
    prompt: "retro synthwave aesthetic, palm tree silhouettes, magenta pink sunset, 80s neon grid horizon, outrun chrome, retro-futurism",
  },
  {
    id: "watercolor-dream",
    effect: "hand-paint",
    name: "Watercolor Dream",
    family: "Art",
    description: "Soft watercolor bleed with paper texture and gentle pigment flow.",
    accent: "#7dd3fc",
    prompt: "soft watercolor painting motion, gentle pigment bleed, cold-press paper texture, dreamy washes, artisan illustration, calm flowing brushwork",
  },
  {
    id: "studio-portrait",
    effect: "overexposed",
    name: "Studio Portrait",
    family: "Fashion",
    description: "Professional studio lighting with diffused softboxes and magazine clarity.",
    accent: "#e2e8f0",
    prompt: "professional photo studio portrait, diffused softbox lighting, clean seamless backdrop, magazine cover quality, refined skin tones, editorial polish",
  },
  {
    id: "manga-lines",
    effect: "sketch",
    name: "Manga Lines",
    family: "Anime",
    description: "Black-and-white manga panel with screen tone halftone and dramatic ink.",
    accent: "#cbd5e1",
    prompt: "japanese manga panel aesthetic, black and white ink linework, screen tone halftone shading, dramatic perspective, dynamic action panel",
  },
  {
    id: "hip-hop-visual",
    effect: "flash-comic",
    name: "Hip-Hop Visual",
    family: "Music",
    description: "Music-video swagger with bold saturation, gold tones, and slow-mo grit.",
    accent: "#fbbf24",
    prompt: "hip hop music video aesthetic, bold saturated colors, gold tones, urban grit, slow motion swagger, street style cinematic moment",
  },
  {
    id: "pixel-arcade",
    effect: "canvas",
    name: "Pixel Arcade",
    family: "Game",
    description: "16-bit pixel art look with limited palette and retro arcade vibes.",
    accent: "#a3e635",
    prompt: "16-bit pixel art animation aesthetic, retro arcade game look, limited 8-color palette, blocky pixelation, nostalgic gaming feel",
  },
  {
    id: "comic-action",
    effect: "flash-comic",
    name: "Comic Action",
    family: "Pop Action",
    description: "Comic-book panel motion with halftone dots and dynamic bold outlines.",
    accent: "#f43f5e",
    prompt: "american comic book panel aesthetic, halftone Ben Day dots, bold ink outlines, dynamic action pose, vibrant superhero palette, BAM POW energy",
  },
  {
    id: "storm-light",
    effect: "noir",
    name: "Storm Light",
    family: "Mood",
    description: "Dramatic stormy weather with overcast tension and silver-blue tones.",
    accent: "#64748b",
    prompt: "dramatic stormy weather cinematic, overcast moody atmosphere, silver-blue cold tones, lightning hints, brooding tension, atmospheric depth",
  },
  {
    id: "cafe-window",
    effect: "hand-paint",
    name: "Café Window",
    family: "Lifestyle",
    description: "Cozy café interior with warm tungsten glow and soft rain-on-glass mood.",
    accent: "#fb923c",
    prompt: "cozy café window aesthetic, warm tungsten interior light, soft rain droplets on glass, calm lifestyle moment, intimate atmosphere",
  },
  {
    id: "toxic-glow",
    effect: "flash-comic",
    name: "Toxic Glow",
    family: "Future",
    description: "Acidic neon greens with UV-reactive surfaces and eerie post-apocalyptic glow.",
    accent: "#a3e635",
    prompt: "toxic radioactive glow aesthetic, neon green and acid yellow palette, fluorescent UV reactive surfaces, eerie post-apocalyptic atmosphere, hazardous beauty",
  },
  {
    id: "motion-tracker",
    effect: "particles",
    name: "Motion Tracker",
    family: "Future",
    description: "Surveillance HUD with target reticles, timestamps, and military thermal feel.",
    accent: "#22d3ee",
    prompt: "surveillance camera tracking HUD aesthetic, target reticle overlays, frame timestamps, military thermal vision, intelligence operative atmosphere",
  },
  {
    id: "black-light",
    effect: "particles",
    name: "Black Light",
    family: "Future",
    description: "UV blacklight party glow with fluorescent neon paint and dark room atmosphere.",
    accent: "#c084fc",
    prompt: "blacklight UV nightclub aesthetic, fluorescent neon purple and magenta paint glow, dark room party atmosphere, ultraviolet reactive surfaces",
  },
  {
    id: "liquid-chrome",
    effect: "hand-paint",
    name: "Liquid Chrome",
    family: "Art",
    description: "Psychedelic chrome distortion with fluid metallic surfaces and surreal motion.",
    accent: "#94a3b8",
    prompt: "liquid chrome psychedelic distortion aesthetic, fluid mirror metallic surfaces, surreal abstract motion, melting reflective material",
  },
  {
    id: "duotone-bold",
    effect: "noir",
    name: "Duotone Bold",
    family: "Art",
    description: "Bold two-color graphic style with magazine-cover contrast and poster impact.",
    accent: "#fb7185",
    prompt: "bold duotone graphic aesthetic, exactly two contrasting colors, high contrast poster look, magazine cover style, screen print energy",
  },
  {
    id: "shattered-frame",
    effect: "layer-mixed-media",
    name: "Shattered Frame",
    family: "Art",
    description: "Fragmented broken-glass composition with collage panels and cubist motion.",
    accent: "#f97316",
    prompt: "shattered fragmented composition aesthetic, broken glass panels, dimensional rifts between fragments, collage cubist motion, identity dissolution",
  },
  {
    id: "paper-fold",
    effect: "canvas",
    name: "Paper Fold",
    family: "Art",
    description: "Origami-style geometric creases with sharp paper-craft texture and sculpted shadows.",
    accent: "#fde68a",
    prompt: "origami paper folding aesthetic, sharp geometric creases, paper craft texture, sculpted dimensional shadows, minimal craft beauty",
  },
  {
    id: "glow-drift",
    effect: "particles",
    name: "Glow Drift",
    family: "Mood",
    description: "Dreamy glowing orbs drifting through frame with bokeh and magical light dust.",
    accent: "#fde047",
    prompt: "random glowing orbs drifting through frame, soft bokeh lights, magical particle dust, dreamy atmospheric light leaks, fairytale shimmer",
  },
  {
    id: "old-hollywood",
    effect: "paper",
    name: "Old Hollywood",
    family: "Vintage",
    description: "Golden age cinema glamour with classic black-and-white grain and starry lighting.",
    accent: "#fef3c7",
    prompt: "old Hollywood golden age cinematic aesthetic, classic black and white film grain, soft glamour starlight, vintage diva portrait, timeless elegance",
  },
  {
    id: "soap-bubbles",
    effect: "particles",
    name: "Soap Bubbles",
    family: "Whimsy",
    description: "Floating soap bubbles with rainbow reflections and slow dreamy drifting motion.",
    accent: "#a5f3fc",
    prompt: "floating soap bubbles aesthetic, rainbow reflections on spherical surfaces, dreamy childhood whimsy, slow drifting motion, magical iridescent shimmer",
  },
  {
    id: "glossy-page",
    effect: "canvas",
    name: "Glossy Page",
    family: "Fashion",
    description: "Editorial fashion magazine page with print-quality polish and commercial sheen.",
    accent: "#f5d0fe",
    prompt: "glossy magazine page aesthetic, editorial fashion print quality, clean typography negative space, high-end commercial polish, designer brand sheen",
  },
  {
    id: "frost-bite",
    effect: "noir",
    name: "Frost Bite",
    family: "Mood",
    description: "Frostbitten cold vision with icy blue tones, frozen breath, and arctic chill.",
    accent: "#bae6fd",
    prompt: "frostbitten cold vision aesthetic, icy blue and frozen white palette, breath fog atmosphere, arctic chill mood, deep winter cinematic",
  },
  {
    id: "mirror-shards",
    effect: "layer-mixed-media",
    name: "Mirror Shards",
    family: "Art",
    description: "Reflective broken-mirror facets with sharp geometric fragments and dimensional fracture.",
    accent: "#e2e8f0",
    prompt: "broken mirror shards reflective aesthetic, fragmented mirror reflections, sharp geometric facets, dimensional fracture, kaleidoscopic identity",
  },
  {
    id: "magma-heat",
    effect: "flash-comic",
    name: "Magma Heat",
    family: "Mood",
    description: "Molten volcanic energy with glowing embers, intense heat, and primal fire tones.",
    accent: "#f97316",
    prompt: "molten magma volcanic aesthetic, glowing red and orange embers, intense heat distortion shimmer, primal fire energy, lava flow texture",
  },
  {
    id: "marble-bust",
    effect: "paper",
    name: "Marble Bust",
    family: "Vintage",
    description: "Classical marble sculpture with smooth stone texture and museum-quality lighting.",
    accent: "#f1f5f9",
    prompt: "marble sculpture classical aesthetic, smooth carved stone texture, museum gallery lighting, ancient Greek bust dignity, timeless white marble",
  },
  {
    id: "deep-tide",
    effect: "particles",
    name: "Deep Tide",
    family: "Mood",
    description: "Underwater submerged feel with blue-green caustics and fluid drifting motion.",
    accent: "#67e8f9",
    prompt: "underwater deep ocean aesthetic, blue green caustic light patterns, fluid motion through water, submerged dreamy atmosphere, drifting marine quality",
  },
  {
    id: "editorial-modern",
    effect: "overexposed",
    name: "Editorial Modern",
    family: "Fashion",
    description: "Contemporary editorial cinema with minimal composition and bright commercial polish.",
    accent: "#fafafa",
    prompt: "modern editorial cinematic aesthetic, clean minimal composition, contemporary commercial polish, bright spacious mood, premium magazine quality",
  },
  {
    id: "graffiti-spray",
    effect: "flash-comic",
    name: "Graffiti Spray",
    family: "Urban",
    description: "Street graffiti energy with spray-paint texture, bold tags, and urban grit.",
    accent: "#a78bfa",
    prompt: "street graffiti spray paint aesthetic, bold spray paint texture, urban wall tags, hip hop alley grit, raw street art energy",
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
const KIE_IMAGE_TO_VIDEO_ROUTE = "kling/v2-5-turbo-image-to-video-pro";
const WAVESPEED_IMAGE_TO_VIDEO_ROUTE = "bytedance/v1-pro-image-to-video";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;
const CLOUD_NEGATIVE_PROMPT = "text overlays, subtitles, watermark, flicker, distorted face, unstable identity";
const CLOUD_CFG_SCALE = 0.5;
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

          <div className="mt-4 rounded-lg border border-white/8 bg-[#11161d] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
              Render pipeline
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <p>Frame extraction: {effectiveFps} FPS</p>
              <p>Output target: {resolution}</p>
              <p>Processor: Saad Cloud generation</p>
              {taskId ? <p>Task: {taskId.slice(0, 18)}...</p> : null}
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              {activeTab === "presets" ? (
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
                    {presetMedia[preset.id]?.url ? (
                      presetMedia[preset.id]?.type === "video" ? (
                        <video
                          src={presetMedia[preset.id]?.url}
                          poster={presetMedia[preset.id]?.poster}
                          className="absolute inset-0 h-full w-full object-cover opacity-65"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={presetMedia[preset.id]?.url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-65"
                          loading="lazy"
                        />
                      )
                    ) : null}
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
                  <div className="mt-4" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>{statusMessage}</span>
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
                    download={`cinematic-styles-${selectedPreset.id}.webm`}
                    className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-slate-950 transition hover:bg-slate-200"
                  >
                    <Download className="h-4 w-4" />
                    Download output
                  </a>
                ) : null}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </section>
  );
}

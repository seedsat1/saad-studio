"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ChangeEvent, type DragEvent, type MouseEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Aperture,
  ArrowUp,
  Brush,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Folder,
  FolderPlus,
  ImageIcon,
  Lightbulb,
  Paperclip,
  ScanFace,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IMAGE_MODELS, getImageCreditCost, type ImageModel } from "@/lib/image-models";
import { DEFAULT_GOOGLE_IMAGE_MODEL_ID, getDefaultImageModel } from "@/lib/google-image-model-specs";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { useAssetStore } from "@/hooks/use-asset-store";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { useLanguage } from "@/lib/use-language";
import { useDynamicKieModels } from "@/hooks/use-dynamic-models";
import { ReferenceStudioModal } from "@/components/ReferenceStudioModal";
import { ReferenceActionTiles } from "@/components/ReferenceActionTiles";
import { withPresetsAppended } from "@/lib/reference-prompt-injector";

type ToolId = "create" | "relight" | "inpaint" | "upscale" | "face-swap" | "enhance";

const ANNUAL_UNLIMITED_IMAGE_MODEL_IDS = new Set([
  "flux-2/pro",
  "flux-2/flex",
  "seedream/4.5-text-to-image",
  "seedream/4.5-edit",
  "seedream/5-pro",
  "google/nano-banana",
  "gpt-image/1.5-text-to-image",
  "gpt-image/1.5-image-to-image",
  "gpt-image-2-text-to-image",
  "gpt-image-2-image-to-image",
  "nano-banana-2",
  "nano-banana-pro",
  "nano-banana-2-lite",
]);
const ANNUAL_UNLIMITED_IMAGE_PLAN_IDS = new Set(["pro", "max"]);
const EXCLUDED_ANNUAL_UNLIMITED_IMAGE_MODEL_IDS = new Set([
  "google/imagen4-ultra",
  "flux-2/max",
]);
const HIDDEN_IMAGE_PAGE_MODEL_IDS = new Set([
  "wan/2-7-image-pro",
  "flux-2/pro",
  "flux-2/flex",
  "flux-2/max",
  "grok-imagine/text-to-image",
  "grok-imagine/image-to-image",
  "qwen2/text-to-image",
  "qwen2/image-edit",
  "qwen/image-to-image",
  "seedream/4.5-text-to-image",
  "seedream/4.5-edit",
  "seedream/5-lite-text-to-image",
  "seedream/5-lite-image-to-image",
  "seedream/5-pro-text-to-image",
  "seedream/5-pro-image-to-image",
  "gpt-image-2-image-to-image",
  "gpt-image/1.5-text-to-image",
  "gpt-image/1.5-image-to-image",
  "z-image",
]);
const HIDDEN_IMAGE_PAGE_MODEL_LABELS = new Set([
  "wan 2.7 image pro",
  "flux.2 pro",
  "flux.2 flex",
  "flux.2 max",
  "grok imagine",
  "grok imagine i2i",
  "qwen image t2i",
  "qwen2 image edit",
  "qwen image i2i",
  "seedream 4.5 t2i",
  "seedream 4.5 edit",
  "seedream 5 lite t2i",
  "seedream 5 lite i2i",
  "z-image",
]);
const isBlockedDynamicImageModel = (id: string, label: string) =>
  id.includes("kling-" + "image-o1") || label === "kling 01 image";
const isHiddenImagePageModel = (model: Pick<ImageModel, "id" | "label">) =>
  HIDDEN_IMAGE_PAGE_MODEL_IDS.has(model.id.toLowerCase()) ||
  HIDDEN_IMAGE_PAGE_MODEL_LABELS.has(model.label.trim().toLowerCase());
const VISIBLE_IMAGE_MODELS = IMAGE_MODELS.filter((model) => !isHiddenImagePageModel(model));
const DEFAULT_VISIBLE_IMAGE_MODEL = getDefaultImageModel(VISIBLE_IMAGE_MODELS) ?? IMAGE_MODELS.find((model) => model.id === DEFAULT_GOOGLE_IMAGE_MODEL_ID) ?? IMAGE_MODELS[0];

function isAnnualUnlimitedImageQuality(value?: string | null) {
  const normalized = String(value ?? "1K").trim().toLowerCase();
  return ["1k", "1024", "1024x1024", "basic", "low", "medium", "speed", "standard"].includes(normalized);
}

function isAnnualUnlimitedImageModel(modelId: string) {
  if (EXCLUDED_ANNUAL_UNLIMITED_IMAGE_MODEL_IDS.has(modelId)) return false;
  return ANNUAL_UNLIMITED_IMAGE_MODEL_IDS.has(modelId);
}

// Shared with /gallery so albums sync across pages
const ALBUMS_STORAGE_KEY = "saad_studio_gallery_albums_v1";
interface Album { id: string; name: string; assetIds: string[] }
function loadAlbums(): Album[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALBUMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((a: any) => a && a.id && a.name) : [];
  } catch { return []; }
}
function saveAlbums(albums: Album[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums)); } catch { /* quota */ }
}

function normalizeImageResponseUrls(data: any): string[] {
  const collect = (value: unknown): string[] => {
    if (!value) return [];
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    if (Array.isArray(value)) return value.flatMap(collect);
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      return collect(rec.url ?? rec.imageUrl ?? rec.mediaUrl ?? rec.downloadUrl);
    }
    return [];
  };

  for (const candidate of [
    data?.imageUrls,
    data?.resultUrls,
    data?.outputs,
    data?.images,
    data?.urls,
    data?.imageUrl,
    data?.mediaUrl,
    data?.url,
  ]) {
    const urls = collect(candidate);
    if (urls.length) return urls;
  }

  return [];
}

type ResultItem = {
  id: string;
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  tool: ToolId;
  model: string;
  prompt: string;
  aspect: string;
  isPending?: boolean;
  status?: string;
  isFailed?: boolean;
  failureReason?: string;
  creditsRefunded?: boolean;
};

function resultOriginalUrl(item: ResultItem): string {
  return item.originalUrl || item.url;
}

function resultThumbnailUrl(item: ResultItem): string {
  return item.thumbnailUrl || item.url;
}

function imageDownloadHref(item: ResultItem): string {
  const originalUrl = resultOriginalUrl(item);
  const filename = `saadstudio-image-${item.id}`;
  return `/api/download?url=${encodeURIComponent(originalUrl)}&filename=${encodeURIComponent(filename)}`;
}
function resultAspectRatioNumber(item: Pick<ResultItem, "width" | "height" | "aspect" | "isFailed">): number {
  if (item.isFailed) return 16 / 9;
  if (typeof item.width === "number" && typeof item.height === "number" && item.width > 0 && item.height > 0) {
    return item.width / item.height;
  }

  const aspect = String(item.aspect || "").trim().toLowerCase();
  const ratioMatch = aspect.match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (ratioMatch) {
    const width = Number(ratioMatch[1]);
    const height = Number(ratioMatch[2]);
    if (width > 0 && height > 0) return width / height;
  }

  const sizeMatch = aspect.match(/(\d{2,5})\s*[xÃ—]\s*(\d{2,5})/);
  if (sizeMatch) {
    const width = Number(sizeMatch[1]);
    const height = Number(sizeMatch[2]);
    if (width > 0 && height > 0) return width / height;
  }

  if (aspect.includes("portrait")) return 9 / 16;
  if (aspect.includes("landscape")) return 16 / 9;
  if (aspect.includes("source")) return 1;
  return 1;
}

function resultAspectRatioValue(item: Pick<ResultItem, "width" | "height" | "aspect" | "isFailed">): string {
  const ratio = resultAspectRatioNumber(item);
  return `${Math.max(0.35, Math.min(3.2, ratio))} / 1`;
}


function normalizeGenerationError(value?: string | null): string {
  const text = String(value || "").trim();
  if (!text) return "Generation failed. Please try again.";
  return text
    .replace(/^failed:\s*/i, "")
    .replace(/^error:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim() || "Generation failed. Please try again.";
}

function imageFailureTitle(reason?: string | null): string {
  const lower = normalizeGenerationError(reason).toLowerCase();
  if (lower.includes("restricted") || lower.includes("content") || lower.includes("policy") || lower.includes("copyright")) {
    return "Restricted content detected";
  }
  return "Generation failed";
}

function mapAssetToResultItem(asset: any, fallback?: Partial<ResultItem>): ResultItem {
  const isFailed = Boolean(asset?.isFailed || ["failed", "error", "cancelled", "canceled"].includes(String(asset?.status || "").toLowerCase()));
  return {
    id: String(asset?.id || fallback?.id || uid("img")),
    url: isFailed ? "" : String(asset?.originalUrl || asset?.url || fallback?.url || ""),
    originalUrl: isFailed ? "" : String(asset?.originalUrl || asset?.url || fallback?.originalUrl || fallback?.url || ""),
    thumbnailUrl: isFailed ? undefined : (typeof asset?.thumbnailUrl === "string" ? asset.thumbnailUrl : fallback?.thumbnailUrl),
    width: typeof asset?.width === "number" ? asset.width : fallback?.width,
    height: typeof asset?.height === "number" ? asset.height : fallback?.height,
    tool: fallback?.tool || "create",
    model: String(asset?.model || fallback?.model || "Image"),
    prompt: String(asset?.prompt || fallback?.prompt || ""),
    aspect: String(asset?.resolution || fallback?.aspect || "1:1"),
    status: typeof asset?.status === "string" ? asset.status : fallback?.status,
    isFailed,
    failureReason: typeof asset?.failureReason === "string" ? asset.failureReason : fallback?.failureReason,
    creditsRefunded: Boolean(asset?.creditsRefunded || fallback?.creditsRefunded),
  };
}

function resultInspectorAsset(item: ResultItem): Asset {
  return {
    type: "image",
    url: resultOriginalUrl(item),
    prompt: item.prompt,
    model: item.model,
    title: "Generated image",
    resolution: item.aspect,
  };
}

type CharacterReference = {
  id: string;
  name: string;
  description?: string;
  referenceUrls: string[];
  coverUrl?: string | null;
  status: string;
  metadata?: {
    characterPackage?: {
      mainIdentity?: string;
      faceMemory?: string;
      bodyProfile?: string;
      outfitMemory?: string;
      styleDna?: string;
      consistencyProfile?: string;
      cinematicMetadata?: string[];
      states?: Record<string, string>;
    };
  };
};

const RATIO_OPTIONS = [
  { value: "1:1", width: 1024, height: 1024, cls: "ratio-1-1" },
  { value: "1:4", width: 512, height: 2048, cls: "ratio-1-4" },
  { value: "1:8", width: 512, height: 4096, cls: "ratio-1-8" },
  { value: "2:3", width: 1080, height: 1620, cls: "ratio-2-3" },
  { value: "3:2", width: 1620, height: 1080, cls: "ratio-3-2" },
  { value: "3:4", width: 1080, height: 1440, cls: "ratio-3-4" },
  { value: "4:1", width: 4096, height: 1024, cls: "ratio-4-1" },
  { value: "4:3", width: 1440, height: 1080, cls: "ratio-4-3" },
  { value: "4:5", width: 1080, height: 1350, cls: "ratio-4-5" },
  { value: "5:4", width: 1350, height: 1080, cls: "ratio-5-4" },
  { value: "8:1", width: 4096, height: 512, cls: "ratio-8-1" },
  { value: "9:16", width: 1080, height: 1920, cls: "ratio-9-16" },
  { value: "16:9", width: 1920, height: 1080, cls: "ratio-16-9" },
  { value: "21:9", width: 2560, height: 1080, cls: "ratio-21-9" },
] as const;

const LIGHTING_PRESETS = [
  { id: "studio", name: "Studio Light", prompt: "Professional studio lighting setup, three-point lighting" },
  { id: "golden-hour", name: "Golden Hour", prompt: "Warm golden hour sunlight, sunset lighting" },
  { id: "moonlight", name: "Moonlight", prompt: "Cool blue moonlight illumination" },
  { id: "softbox", name: "Soft Box", prompt: "Large soft diffused lighting" },
  { id: "spotlight", name: "Spotlight", prompt: "Dramatic single spotlight" },
  { id: "neon", name: "Neon", prompt: "Vibrant neon lighting, cyberpunk atmosphere" },
  { id: "candle", name: "Candlelight", prompt: "Warm candlelight illumination" },
  { id: "overcast", name: "Overcast", prompt: "Soft overcast diffused daylight" },
  { id: "dramatic", name: "Dramatic", prompt: "High contrast dramatic lighting" },
] as const;

type LightingPresetId = (typeof LIGHTING_PRESETS)[number]["id"];

const TOOLS = [
  { id: "create" as ToolId, label: "CREATE", icon: Wand2 },
  { id: "enhance" as ToolId, label: "ENHANCE", icon: Zap },
  { id: "relight" as ToolId, label: "RELIGHT", icon: Lightbulb },
  { id: "inpaint" as ToolId, label: "INPAINT", icon: Brush },
  { id: "upscale" as ToolId, label: "UPSCALE", icon: Aperture },
  { id: "face-swap" as ToolId, label: "FACE SWAP", icon: ScanFace },
];

const EDIT_MODELS = IMAGE_MODELS.filter((m) =>
  [
    "google/nano-banana-edit",
    "gpt-image-2-image-to-image",
    "gpt-image/1.5-image-to-image",
  ].includes(m.id) && !isHiddenImagePageModel(m),
);

// All models that accept real image inputs (any inputType) Ã¢â‚¬â€ includes Nano Banana (up to 14 imgs), edit, and pure img2img
const ENHANCE_MODELS = IMAGE_MODELS.filter(
  (m) => m.imageInputField !== undefined && m.maxRefImages > 0 && !isHiddenImagePageModel(m),
);

const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => {
      const raw = String(reader.result || "");
      // Compress to max 1536px & JPEG 85% to stay under Vercel 4.5MB body limit
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1536;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = dataUrl;
  });
}

async function buildInpaintGuideImage(sourceDataUrl: string, maskDataUrl: string): Promise<string> {
  const [source, mask] = await Promise.all([dataUrlToImage(sourceDataUrl), dataUrlToImage(maskDataUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(source, 0, 0);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(mask, 0, 0, source.width, source.height);
  ctx.globalAlpha = 1;
  return canvas.toDataURL("image/png");
}

function ToolButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-14 flex-col items-center gap-1 rounded-xl border-l-2 py-3 transition-all",
        active
          ? "border-pink-400 bg-gradient-to-b from-pink-500/25 to-pink-500/5 text-pink-300 shadow-[0_0_24px_rgba(236,72,153,0.3)]"
          : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[9px] font-bold tracking-wider">{label}</span>
    </button>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const { t, lang } = useImageTranslation();
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-400"><span>{t(label)}</span><span>{value}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-pink-500" />
    </section>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { t, lang } = useImageTranslation();
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
      <span>{t(label)}</span>
      <span className={cn("inline-flex h-5 w-9 items-center rounded-full p-0.5 transition", checked ? "bg-pink-500" : "bg-zinc-700")}>
        <span className={cn("h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function CountSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { t, lang } = useImageTranslation();
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{t(label)}</p>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => onChange(n)} className={cn("rounded-lg border py-2 text-sm", value === n ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{n}</button>
        ))}
      </div>
    </section>
  );
}

function ModelDropdown({ selected, onSelect }: { selected: ImageModel; onSelect: (m: ImageModel) => void }) {
  const { t, lang } = useImageTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const { models: dynamicModels } = useDynamicKieModels("image");

  const grouped = useMemo(() => {
    const knownIds = new Set(IMAGE_MODELS.map((m) => m.id.toLowerCase()));
    // Convert detected KIE models into ImageModel stubs so the dropdown can render them.
    const dynamicAsImage: ImageModel[] = dynamicModels
      .filter((dm) => {
        const id = dm.id.toLowerCase();
        const label = dm.label.toLowerCase();
        return !knownIds.has(id) &&
          !id.startsWith("flux-2/") &&
          !isBlockedDynamicImageModel(id, label) &&
          !isHiddenImagePageModel({ id, label });
      })
      .map((dm) => {
        const isEdit = /(edit|image-to-image|i2i|inpaint)/i.test(dm.id);
        return {
          id: dm.id,
          label: dm.label,
          sublabel: dm.family,
          badge: dm.isNew ? "NEW" : "AUTO",
          group: "New from Saad Studio",
          inputType: isEdit ? "image-to-image" : "text-to-image",
          aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
          maxImages: 1,
          maxRefImages: isEdit ? 1 : 0,
          creditCost: 5,
        } as ImageModel;
      });

    const all = [...dynamicAsImage, ...VISIBLE_IMAGE_MODELS];
    const q = query.trim().toLowerCase();
    const list = q
      ? all.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
      : all;
    const map = new Map<string, ImageModel[]>();
    for (const model of list) {
      if (!map.has(model.group)) map.set(model.group, []);
      map.get(model.group)?.push(model);
    }
    return Array.from(map.entries());
  }, [query, dynamicModels]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={handleToggle} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10 hover:ring-white/20">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/15 ring-1 ring-pink-500/30">
          <ImageIcon className="h-4 w-4 text-pink-400" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-semibold text-white">{selected.label}</p>
          <p className="truncate text-[10px] text-zinc-400">{selected.sublabel || selected.id}</p>
        </div>
        {selected.badge ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">{selected.badge}</span> : null}
        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
              className="fixed z-[9999] max-h-[380px] overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl"
            >
              <div className="border-b border-white/10 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                  <Search className="h-3.5 w-3.5 text-zinc-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search model")} className="w-full bg-transparent text-xs text-white placeholder:text-zinc-400 focus:outline-none" />
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {grouped.map(([group, models], gi) => (
                  <div key={group} className={cn(gi > 0 && "border-t border-white/10")}>
                    <p className="px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">{t(group)}</p>
                    {models.map((model) => (
                      <button key={model.id} onClick={() => { onSelect(model); setOpen(false); }} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.07]", selected.id === model.id && "bg-white/10")}>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-xs font-semibold text-zinc-100">{model.label}</p>
                            {model.badge ? <span className="shrink-0 rounded-full bg-lime-300 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">{model.badge}</span> : null}
                          </div>
                          <p className="truncate text-[10px] text-zinc-400">{model.sublabel || model.id}</p>
                        </div>
                        {selected.id === model.id ? <Check className="h-3.5 w-3.5 text-pink-400" /> : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function UploadBox({ label, file, onFile, required = false, accept = "image/*" }: { label: string; file: File | null; onFile: (f: File | null) => void; required?: boolean; accept?: string }) {
  const { t, lang } = useImageTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const acceptVideo = accept.includes("video");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0] || null;
    const isImage = Boolean(dropped?.type?.startsWith("image/"));
    const isVideo = Boolean(dropped?.type?.startsWith("video/"));
    if (dropped && (isImage || (acceptVideo && isVideo))) {
      onFile(dropped);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="space-y-1.5">
      {label ? <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{t(label)}{required ? " *" : ""}</p> : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-white/[0.03] hover:border-pink-400/40 select-none",
          dragActive ? "border-pink-400/60 bg-pink-500/[0.08]" : "border-white/15",
        )}
      >
        {preview ? (
          file?.type.startsWith("video/") ? (
            <video src={preview} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <img src={preview} alt="upload" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-zinc-400">
            <UploadCloud className="h-5 w-5" />
            <span className="text-xs">{dragActive ? "Drop here" : acceptVideo ? "Upload or drag media" : "Upload or drag image"}</span>
          </div>
        )}
        {file ? (
          <span
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </div>
  );
}

function SettingsAccordion({ label, summary, children, defaultOpen = false }: { label: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const { t, lang } = useImageTranslation();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03]">
      <button
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-400">{label}</span>
        <div className="flex items-center gap-2">
          {summary && !open ? <span className="text-[11px] text-pink-400">{summary}</span> : null}
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-3 pb-3 pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Gateway card Ã¢â‚¬â€ leads to /image-presets Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function StyleLibraryGatewayCard() {
  const { t, lang } = useImageTranslation();
  return (
    <a
      href="/image-presets"
      className="group relative block overflow-hidden rounded-2xl border border-amber-400/25 bg-black/40 transition-all hover:border-amber-400/55 hover:shadow-xl hover:shadow-amber-500/20"
    >
      {/* Hero image Ã¢â‚¬â€ tall to give the collage room to breathe */}
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/preset/card.webp"
          alt="Style Library Ã¢â‚¬â€ featured styles"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          fetchPriority="high"
        />
        {/* Vignette so text below remains separable from the art */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
      </div>

      {/* Text */}
      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/40">
            {t("New")}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-amber-300/70">
            {t("18 styles")}
          </span>
        </div>
        <h3 className="mt-1.5 text-sm font-black text-white">
          {t("Style Library")}
        </h3>
        <p className="mt-0.5 text-[11px] leading-5 text-zinc-400">
          {t("Tap a curated style Ã¢â‚¬â€ the prompt, model, and aspect ratio apply instantly.")}
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 group-hover:text-amber-200">
          {t("Browse styles")}
          <span className="transition-transform group-hover:translate-x-0.5">Ã¢â€ â€™</span>
        </div>
      </div>
    </a>
  );
}

function CompareSlider({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="relative h-full min-h-[260px] overflow-hidden rounded-2xl ring-1 ring-white/10">
      <img src={before} alt="before" className="absolute inset-0 h-full w-full object-contain bg-black" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={after} alt="after" className="h-full w-full object-contain bg-black" />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[11px] text-zinc-300">Before</div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-[11px] text-zinc-300">After</div>
      <input type="range" min={0} max={100} value={position} onChange={(e) => setPosition(Number(e.target.value))} className="absolute bottom-4 left-1/2 w-56 -translate-x-1/2 accent-pink-500" />
    </div>
  );
}

function FailedImageResultCard({ item, onDelete }: { item: ResultItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const detail = normalizeGenerationError(item.failureReason || item.prompt || "Generation failed. Please try again.");
  const title = imageFailureTitle(detail);
  const copyText = item.prompt?.trim() || detail;

  const copyPrompt = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [copyText]);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="result-card group relative overflow-hidden rounded-[3px] border border-black/70 bg-[#202225] ring-1 ring-white/10"
      style={{ aspectRatio: resultAspectRatioValue(item) }}
      data-ratio={item.aspect}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.18),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-extrabold text-white">
        <ShieldAlert className="h-3.5 w-3.5" />
        Failed
      </div>
      {item.creditsRefunded ? (
        <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-extrabold text-white">
          Credits refunded
        </div>
      ) : null}
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <div className="rounded-2xl bg-[#2b2d31]/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/8">
          <h3 className="text-sm font-extrabold text-white">{title}</h3>
          <p className={expanded ? "mt-2 text-xs font-semibold leading-5 text-zinc-400" : "mt-2 text-xs font-semibold leading-5 text-zinc-400 line-clamp-2"}>
            {detail}
          </p>
          {detail.length > 90 ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}
              className="mt-2 text-xs font-extrabold text-white hover:text-zinc-300"
            >
              {expanded ? "View less" : "View more"}
            </button>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-white transition-colors hover:bg-white/18"
              aria-label="Copy prompt"
              title="Copy prompt"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onDelete(item.id); }}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-red-500/20 hover:text-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
          {copied ? <p className="mt-2 text-[11px] font-semibold text-emerald-300">Copied</p> : null}
        </div>
      </div>
    </motion.div>
  );
}

function DeleteImageDialog({
  open,
  count,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-[500px] rounded-[28px] border border-white/10 bg-[#202124] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-image-generation-title"
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-slate-300 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-60"
              aria-label="Cancel delete"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="delete-image-generation-title" className="pr-12 text-xl font-extrabold text-white">
              Delete selected generations?
            </h2>
            <p className="mt-6 max-w-[390px] text-base font-medium leading-6 text-zinc-400">
              {count > 1 ? `${count} selected generations` : "Selected generation"} will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="rounded-xl border border-white/12 bg-transparent px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-white/8 disabled:cursor-wait disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="rounded-xl bg-[#ff3347] px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-[#ff4658] disabled:cursor-wait disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
const MASONRY_ROW_HEIGHT = 4;
const MASONRY_GAP = 3;

function ResultGrid({ items, onInspect, onRemix, onUse, onDelete, onBulkDelete, hasMore, onLoadMore, loadingMore }: { items: ResultItem[]; onInspect: (asset: Asset) => void; onRemix: (item: ResultItem) => void; onUse: (item: ResultItem) => void; onDelete: (id: string) => void; onBulkDelete: (ids: string[]) => void; hasMore?: boolean; onLoadMore?: () => void; loadingMore?: boolean }) {
  const { t, lang } = useImageTranslation();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadError, setBulkDownloadError] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [masonryColumnWidth, setMasonryColumnWidth] = useState(180);

  useEffect(() => { setAlbums(loadAlbums()); }, []);
  useEffect(() => { saveAlbums(albums); }, [albums]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumnWidth = () => {
      const width = grid.getBoundingClientRect().width;
      if (!Number.isFinite(width) || width <= 0) return;
      const isSmall = window.innerWidth <= 640;
      const minColumn = isSmall ? 118 : Math.min(Math.max(width * 0.10, 132), 210);
      const columns = Math.max(1, Math.floor((width + MASONRY_GAP) / (minColumn + MASONRY_GAP)));
      const nextWidth = Math.max(1, (width - MASONRY_GAP * (columns - 1)) / columns);
      setMasonryColumnWidth((current) => Math.abs(current - nextWidth) > 1 ? nextWidth : current);
    };

    updateColumnWidth();
    const observer = new ResizeObserver(updateColumnWidth);
    observer.observe(grid);
    window.addEventListener("resize", updateColumnWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateColumnWidth);
    };
  }, []);

  const addSelectionToAlbum = useCallback((albumId: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setAlbums((prev) => prev.map((a) => a.id === albumId ? { ...a, assetIds: Array.from(new Set([...a.assetIds, ...ids])) } : a));
    setShowAlbumPicker(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds]);

  const createAlbumWithSelection = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ids = Array.from(selectedIds);
    const newAlbum: Album = { id: `album_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: trimmed, assetIds: ids };
    setAlbums((prev) => [...prev, newAlbum]);
    setShowAlbumPicker(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectableItems = items.filter((i) => !i.isPending);
  const allSelected = selectableItems.length > 0 && selectableItems.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const all = selectableItems.every((i) => prev.has(i.id));
      const next = new Set(prev);
      if (all) for (const i of selectableItems) next.delete(i.id);
      else for (const i of selectableItems) next.add(i.id);
      return next;
    });
  }, [selectableItems]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onBulkDelete(ids);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, onBulkDelete]);

  const handleBulkDownload = useCallback(async () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id) && resultOriginalUrl(item) && !item.isPending && !item.isFailed);
    if (selectedItems.length === 0 || isBulkDownloading) return;

    setIsBulkDownloading(true);
    setBulkDownloadError("");
    try {
      const response = await fetch("/api/download/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((item, index) => ({
            url: resultOriginalUrl(item),
            filename: `saadstudio-image-${index + 1}`,
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Could not prepare the selected images.");
      }

      const archive = await response.blob();
      const objectUrl = URL.createObjectURL(archive);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `saadstudio-images-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch (error) {
      setBulkDownloadError(error instanceof Error ? error.message : "Could not download the selected images.");
    } finally {
      setIsBulkDownloading(false);
    }
  }, [isBulkDownloading, items, selectedIds]);

  if (!items.length) return <div className="flex h-full items-center justify-center text-sm text-zinc-500">{t("Start generating to see results.")}</div>;

  return (
    <>
      <style>{`
        .result-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(132px, 10vw, 210px), 1fr));
          grid-auto-rows: 4px;
          align-items: stretch;
          gap: 3px;
          width: 100%;
          max-width: none;
          margin: 0;
        }

        .result-card {
          width: 100%;
          min-height: 72px;
        }

        @media (max-width: 640px) {
          .result-masonry {
            grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
            gap: 2px;
          }
        }
      `}</style>
      {/* Selection toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setSelectionMode((s) => !s); setSelectedIds(new Set()); }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold",
            selectionMode ? "border-pink-400/40 bg-pink-500/20 text-pink-100" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
          )}
        >
          <Check className="h-3 w-3" />
          {selectionMode ? t("Exit selection") : t("Select")}
        </button>
        {selectionMode && (
          <>
            <button onClick={toggleSelectAll} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10">
              {allSelected ? t("Unselect all") : t("Select all")}
            </button>
            <span className="text-[11px] text-zinc-400">{selectedIds.size} {t("selected")}</span>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => void handleBulkDownload()}
                  disabled={isBulkDownloading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                  <Download className="h-3 w-3" /> {isBulkDownloading ? t("Preparing ZIP...") : t("Download")}
                </button>
                <button onClick={() => setShowAlbumPicker(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20">
                  <FolderPlus className="h-3 w-3" /> {t("Add to album")}
                </button>
                <button onClick={handleBulkDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-500/20">
                  <X className="h-3 w-3" /> {t("Delete selected")}
                </button>
              </>
            )}
            {bulkDownloadError && <span className="text-[11px] text-red-300">{bulkDownloadError}</span>}
          </>
        )}
      </div>

      <div ref={gridRef} className="result-masonry w-full">
        <AnimatePresence initial={false}>
          {items.map((item, itemIndex) => {
                const masonryRows = Math.max(18, Math.ceil(((masonryColumnWidth / resultAspectRatioNumber(item)) + MASONRY_GAP) / (MASONRY_ROW_HEIGHT + MASONRY_GAP)));
                if (item.isFailed) {
                  return <FailedImageResultCard key={item.id} item={item} onDelete={onDelete} />;
                }
                const isSelected = selectedIds.has(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "result-card group relative cursor-pointer overflow-hidden rounded-[3px] border border-black/70 bg-black ring-1 transition",
                      isSelected ? "ring-2 ring-pink-400/70" : "ring-white/10",
                    )}
                    style={{ gridRowEnd: `span ${masonryRows}` }}
                    data-ratio={item.aspect}
                    onClick={() => {
                      if (item.isPending) return;
                      if (selectionMode) { toggleSelected(item.id); return; }
                      onInspect(resultInspectorAsset(item));
                    }}
                  >
                    {item.isPending ? (
                      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <motion.div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(105deg, transparent 20%, rgba(236,72,153,0.16) 50%, transparent 80%)" }}
                          animate={{ x: ["-120%", "120%"] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                          <div className="rounded-full bg-pink-500/20 px-3 py-1 text-[11px] font-semibold text-pink-300 ring-1 ring-pink-400/30">{t("Generating...")}</div>
                          <div className="text-[11px] text-zinc-400">{item.model}</div>
                        </div>
                      </div>
                    ) : (
                      <NextImage
                        src={resultThumbnailUrl(item)}
                        alt={item.prompt || "Generated image"}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 1280px) 18vw, 14vw"
                        className="block h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]"
                        unoptimized={resultThumbnailUrl(item).startsWith("/api/assets/thumbnail")}
                        priority={itemIndex === 0}
                        loading={itemIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={itemIndex === 0 ? "high" : "auto"}
                        quality={78}
                      />
                    )}

                    {!item.isPending && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelected(item.id); if (!selectionMode) setSelectionMode(true); }}
                        className={cn(
                          "absolute right-2 top-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur transition",
                          isSelected
                            ? "border-pink-400 bg-pink-500 text-white opacity-100"
                            : "border-white/30 bg-black/60 text-white/80 opacity-0 group-hover:opacity-100",
                          selectionMode && "opacity-100",
                        )}
                        title={isSelected ? t("Unselect") : t("Select")}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {!item.isPending && !selectionMode ? (
                      <div className="absolute inset-0 bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                        <div className="absolute left-2 top-2 z-10 flex gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); onInspect(resultInspectorAsset(item)); }} className="rounded-lg bg-black/55 p-2 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70" title={t("Preview")}><Eye className="h-4 w-4" /></button>
                          <a href={imageDownloadHref(item)} download onClick={(e) => e.stopPropagation()} className="rounded-lg bg-black/55 p-2 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70" title={t("Download")}><Download className="h-4 w-4" /></a>
                        </div>
                        <div className="absolute inset-x-2 bottom-2 z-10 flex flex-wrap justify-center gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); onUse(item); }} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-pink-500/85 px-2.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-pink-300/40 hover:bg-pink-500" title={t("Use as reference image")}><Wand2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t("Use")}</span></button>
                          <button onClick={(e) => { e.stopPropagation(); onRemix(item); }} className="max-w-full rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70">{t("Remix")}</button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="max-w-full rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70">{t("Delete")}</button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                );
          })}
        </AnimatePresence>
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? t("Loading...") : t("Load more")}
          </button>
        </div>
      ) : null}

      {showAlbumPicker && (
        <AlbumPicker
          albums={albums}
          count={selectedIds.size}
          onPick={addSelectionToAlbum}
          onCreate={createAlbumWithSelection}
          onClose={() => setShowAlbumPicker(false)}
        />
      )}
    </>
  );
}

// Album Picker modal Ã¢â‚¬â€ shared visual with /gallery
function AlbumPicker({ albums, count, onPick, onCreate, onClose }: { albums: Album[]; count: number; onPick: (id: string) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const { t, lang } = useImageTranslation();
  const [newName, setNewName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1222] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{lang === "ar" ? "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã˜Â§Ã˜ÂµÃ˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯Ã˜Â© Ã™â€žÃ™â€žÃ˜Â£Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€¦" : `Add ${count} item(s) to album`}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        {albums.length > 0 && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => onPick(album.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
                <span className="inline-flex items-center gap-2"><Folder className="h-4 w-4 text-amber-300" />{album.name}</span>
                <span className="text-xs text-slate-400">{album.assetIds.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-xs text-slate-400">{t("Create new album")}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onCreate(newName); }}
              placeholder={t("Album name")}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
            <button onClick={() => onCreate(newName)} disabled={!newName.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-500/20 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <FolderPlus className="h-3.5 w-3.5" />
              {t("Create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InpaintWorkspace({ source, setSource, brushSize, setBrushSize, maskVersion, setMaskVersion, registerMaskExporter }: { source: File | null; setSource: (f: File | null) => void; brushSize: number; setBrushSize: (v: number) => void; maskVersion: number; setMaskVersion: Dispatch<SetStateAction<number>>; registerMaskExporter: (fn: () => string | null) => void; }) {
  const { t, lang } = useImageTranslation();
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const undoStackRef = useRef<ImageData[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const sourceUrl = useMemo(() => (source ? URL.createObjectURL(source) : null), [source]);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  const saveUndo = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    undoStackRef.current.push(ctx.getImageData(0, 0, mask.width, mask.height));
  }, []);

  useEffect(() => {
    registerMaskExporter(() => {
      const mask = maskCanvasRef.current;
      if (!mask) return null;
      return mask.toDataURL("image/png");
    });
  }, [registerMaskExporter]);

  useEffect(() => {
    if (!sourceUrl) return;
    const img = new Image();
    img.onload = () => {
      const base = baseCanvasRef.current;
      const mask = maskCanvasRef.current;
      if (!base || !mask) return;
      const maxW = 980;
      const maxH = 620;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      base.width = w; base.height = h; mask.width = w; mask.height = h;
      const baseCtx = base.getContext("2d");
      const maskCtx = mask.getContext("2d", { willReadFrequently: true });
      if (!baseCtx || !maskCtx) return;
      baseCtx.clearRect(0, 0, w, h);
      baseCtx.drawImage(img, 0, 0, w, h);
      maskCtx.fillStyle = "#000";
      maskCtx.fillRect(0, 0, w, h);
      undoStackRef.current = [];
      setMaskVersion((v) => v + 1);
    };
    img.src = sourceUrl;
  }, [sourceUrl, setMaskVersion]);

  const paint = (x: number, y: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    if (lastPointRef.current) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    lastPointRef.current = { x, y };
  };

  const pointFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mask = maskCanvasRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = mask && rect.width ? mask.width / rect.width : 1;
    const scaleY = mask && rect.height ? mask.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const undo = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    ctx.putImageData(prev, 0, 0);
    setMaskVersion(maskVersion + 1);
  };

  const clearMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    saveUndo();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, mask.width, mask.height);
    setMaskVersion(maskVersion + 1);
  };

  return (
    <div className="h-full min-h-[320px] space-y-3">
      <UploadBox label="Upload image" file={source} onFile={setSource} required />
      <div className="flex items-center gap-2">
        <button onClick={undo} className="rounded-lg bg-white/7 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">{t("Undo")}</button>
        <button onClick={clearMask} className="rounded-lg bg-white/7 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">{t("Clear Mask")}</button>
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">{t("Brush")}
          <input type="range" min={5} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-28 accent-pink-500" />
          <span>{brushSize}px</span>
        </div>
      </div>
      <div className="flex h-[420px] items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4">
        {!source ? <p className="text-sm text-zinc-500">{t("Upload image to start painting mask.")}</p> : null}
        <div className={cn("relative shrink-0", !source && "hidden")}>
          <canvas ref={baseCanvasRef} className="block" />
          <canvas
            ref={maskCanvasRef}
            className="absolute inset-0 block cursor-crosshair"
            style={{ opacity: 0.4 }}
            onMouseDown={(e) => { isDrawingRef.current = true; saveUndo(); const p = pointFromEvent(e); paint(p.x, p.y); }}
            onMouseMove={(e) => { if (!isDrawingRef.current) return; const p = pointFromEvent(e); paint(p.x, p.y); }}
            onMouseUp={() => { isDrawingRef.current = false; lastPointRef.current = null; setMaskVersion((v) => v + 1); }}
            onMouseLeave={() => { isDrawingRef.current = false; lastPointRef.current = null; }}
          />
        </div>
      </div>
    </div>
  );
}

function useImageTranslation() {
  const { lang } = useLanguage();

  const dict: Record<string, Record<string, string>> = {
    en: {
      "Ratio: ": "Ratio: ",
      "Style: ": "Style: ",
      "Sort: ": "Sort: ",
      "Image": "Image",
      "Video": "Video"
    },
    ar: {
      // Sidebar Accordion Headers
      "Model": "Ã˜Â§Ã™â€žÃ™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬",
      "Character Reference": "Ã™â€¦Ã˜Â±Ã˜Â¬Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â©",
      "Aspect Ratio": "Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Â¯",
      "Number of Images": "Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±",
      "Resolution": "Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€šÃ˜Â©",
      "Quality": "Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã˜Â¯Ã˜Â©",

      // Workspace status messages
      "ENHANCE Ã¢â‚¬â€ Photo Restoration": "Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã¢â‚¬â€ Ã˜ÂªÃ˜Â±Ã™â€¦Ã™Å Ã™â€¦ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±",
      "Upload a photo in the settings panel Ã¢â€ â€™ click Enhance Photo": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™ÂÃ™Å  Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â²Ã˜Â± Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©",
      "Uses true image-to-image AI to preserve identity while improving quality": "Ã™Å Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂµÃ˜Â·Ã™â€ Ã˜Â§Ã˜Â¹Ã™Å  Ã˜Â§Ã™â€žÃ™ÂÃ˜Â¹Ã™â€žÃ™Å  (Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©) Ã™â€žÃ™â€žÃ˜Â­Ã™ÂÃ˜Â§Ã˜Â¸ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™â€¦Ã˜Â­ Ã™â€¦Ã˜Â¹ Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¬Ã™Ë†Ã˜Â¯Ã˜Â©",
      "Upload image and relight": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â©",
      "Upload media and upscale": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â³Ã˜Â§Ã˜Â¦Ã˜Â· Ã™Ë†Ã™Æ’Ã˜Â¨Ã™â€˜Ã˜Â± Ã˜Â¯Ã™â€šÃ˜ÂªÃ™â€¡Ã˜Â§",
      "Upload source and target images": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â¯Ã˜Â± Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â¯Ã™Â Ã™â€žÃ˜ÂªÃ˜Â¨Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",
      "Start generating to see results.": "Ã˜Â§Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã™â€žÃ˜Â±Ã˜Â¤Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬.",
      "Load more": "Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â²Ã™Å Ã˜Â¯",
      "Loading...": "Ã˜Â¬Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž...",
      "Upload image to start painting mask.": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™â€žÃ™â€žÃ˜Â¨Ã˜Â¯Ã˜Â¡ Ã™ÂÃ™Å  Ã˜Â±Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¹.",

      // Sidebar Right Panel Settings
      "New from Saad Studio": "Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯ Ã™â€¦Ã™â€  Ã˜Â§Ã˜Â³Ã˜ÂªÃ™Ë†Ã˜Â¯Ã™Å Ã™Ë† Ã˜Â³Ã˜Â¹Ã˜Â¯",
      "No saved character": "Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â© Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©",
      "Create a reusable character": "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â© Ã™â€šÃ˜Â§Ã˜Â¨Ã™â€žÃ˜Â© Ã™â€žÃ™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦",
      "This model does not accept reference images. Choose an image-to-image model to use this character.": "Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã™â€žÃ˜Â§ Ã™Å Ã™â€šÃ˜Â¨Ã™â€ž Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â§Ã™â€¹ Ã™â€¦Ã˜Â±Ã˜Â¬Ã˜Â¹Ã™Å Ã˜Â©. Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â©.",
      "Upload image to relight": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™â€žÃ˜Â¶Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â©",
      "Lighting Preset": "Ã™â€šÃ˜Â§Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â©",
      "Brightness": "Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â·Ã™Ë†Ã˜Â¹",
      "Contrast": "Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¨Ã˜Â§Ã™Å Ã™â€ ",
      "Temperature": "Ã˜Â¯Ã˜Â±Ã˜Â¬Ã˜Â© Ã˜Â­Ã˜Â±Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã™â€ ",
      "Shadow Intensity": "Ã˜Â´Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¸Ã™â€žÃ˜Â§Ã™â€ž",
      "Light Direction": "Ã˜Â§Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â¶Ã™Ë†Ã˜Â¡",
      "Number of Variations": "Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜ÂºÃ™Å Ã˜Â±Ã˜Â§Ã˜Âª",
      "Edit Model": "Ã™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž",
      "Brush Size": "Ã˜Â­Ã˜Â¬Ã™â€¦ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â´Ã˜Â§Ã˜Â©",
      "Enhancement Model": "Ã™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€ ",
      "Input Images": "Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã˜Â®Ã™â€žÃ˜Â©",
      "Required": "Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨",
      "Optional": "Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Å ",
      "Ã¢Å“Â¦ True Image-to-Image": "Ã¢Å“Â¦ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™ÂÃ˜Â¹Ã™â€žÃ™Å ",
      "ENHANCE sends your photo directly as input to the AI Ã¢â‚¬â€ preserves identity. Unlike CREATE which uses it as loose inspiration.": "Ã˜Â®Ã˜Â§Ã˜ÂµÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜ÂªÃ˜Â±Ã˜Â³Ã™â€ž Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜ÂªÃ™Æ’ Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã™Æ’Ã™â€¦Ã˜Â¯Ã˜Â®Ã™â€ž Ã™â€žÃ™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂµÃ˜Â·Ã™â€ Ã˜Â§Ã˜Â¹Ã™Å  Ã™â€žÃ™â€žÃ˜Â­Ã™ÂÃ˜Â§Ã˜Â¸ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â§Ã™â€¦Ã˜Â­ Ã˜Â¨Ã˜Â¯Ã™â€šÃ˜Â©Ã˜Å’ Ã˜Â¨Ã˜Â®Ã™â€žÃ˜Â§Ã™Â Ã˜Â®Ã˜Â§Ã˜ÂµÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã˜ÂªÃ˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™â€¡Ã˜Â§ Ã™Æ’Ã™â€¦Ã˜Â¬Ã˜Â±Ã˜Â¯ Ã˜Â¥Ã™â€žÃ™â€¡Ã˜Â§Ã™â€¦.",
      "Upload image": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©",
      "Scale Factor": "Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã˜Â¨Ã™Å Ã˜Â±",
      "Denoise": "Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¶Ã™Ë†Ã˜Â¶Ã˜Â§Ã˜Â¡",
      "Sharpen": "Ã˜Â²Ã™Å Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯Ã˜Â©",
      "Face Enhancement": "Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã™â€¦Ã™â€žÃ˜Â§Ã™â€¦Ã˜Â­ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",
      "Color Enhancement": "Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ™Ë†Ã˜Â§Ã™â€ ",
      "Output Format": "Ã˜ÂµÃ™Å Ã˜ÂºÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â®Ã˜Â±Ã˜Â¬Ã˜Â§Ã˜Âª",
      "Source face": "Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â¯Ã˜Â±",
      "Target image": "Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â¯Ã™Â",
      "Face Blend": "Ã˜Â¯Ã™â€¦Ã˜Â¬ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",
      "Keep target expression": "Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â§Ã˜Â¸ Ã˜Â¹Ã™â€žÃ™â€° Ã˜ÂªÃ˜Â¹Ã˜Â§Ã˜Â¨Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡ Ã˜Â§Ã™â€žÃ™â€¡Ã˜Â¯Ã™Â",
      "Match skin tones": "Ã™â€¦Ã˜Â·Ã˜Â§Ã˜Â¨Ã™â€šÃ˜Â© Ã™â€žÃ™Ë†Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â´Ã˜Â±Ã˜Â©",
      "Target Face Index": "Ã™â€¦Ã˜Â¤Ã˜Â´Ã˜Â± Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ™â€¡Ã˜Â¯Ã™Â",

      // Selection toolbar
      "Exit selection": "Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯",
      "Select": "Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯",
      "Unselect all": "Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž",
      "Select all": "Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™Æ’Ã™â€ž",
      "selected": "Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯",
      "Preparing ZIP...": "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¬Ã™â€¡Ã™Å Ã˜Â²...",
      "Download": "Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž",
      "Add to album": "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€¦",
      "Delete selected": "Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯",

      // Album Picker Modal
      "Add {count} item(s) to album": "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã˜Â§Ã˜ÂµÃ˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯Ã˜Â© Ã™â€žÃ™â€žÃ˜Â£Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€¦",
      "Create new album": "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â£Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€¦ Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯",
      "Album name": "Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€¦",
      "Create": "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡",

      // Tool buttons
      "CREATE": "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡",
      "ENHANCE": "Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€ ",
      "RELIGHT": "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â©",
      "INPAINT": "Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â³Ã™â€¦",
      "UPSCALE": "Ã˜ÂªÃ™Æ’Ã˜Â¨Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€šÃ˜Â©",
      "FACE SWAP": "Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",

      // Main UI Controls
      "Add character": "Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â©",
      "Unlimited": "Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã™Ë†Ã˜Â¯",
      "Drop images here to add as reference": "Ã˜Â£Ã™ÂÃ™â€žÃ˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â± Ã™â€¡Ã™â€ Ã˜Â§ Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜ÂªÃ™â€¡Ã˜Â§ Ã™Æ’Ã™â€¦Ã˜Â±Ã˜Â¬Ã˜Â¹",
      "Describe what you want to generate...": "Ã˜ÂµÃ™Â Ã™â€¦Ã˜Â§ Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯Ã™â€¡...",
      "Generate Image - Unlimited": "Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© - Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã™Ë†Ã˜Â¯",
      "Generate Image": "Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©",
      "Generate another": "Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°",
      "cr": "Ã™â€ Ã™â€šÃ˜Â·Ã˜Â©",
      "Image Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©",
      "Enhance Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€ ",
      "Relight Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â©",
      "Inpaint Workspace": "Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â³Ã™â€¦",
      "Inpaint Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â³Ã™â€¦",
      "Upscale Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜ÂªÃ™Æ’Ã˜Â¨Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€šÃ˜Â©",
      "Face Swap Settings": "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",
      "Settings": "Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª",
      "Undo": "Ã˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹",
      "Clear Mask": "Ã™â€¦Ã˜Â³Ã˜Â­ Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¹",
      "Brush": "Ã˜Â§Ã™â€žÃ™ÂÃ˜Â±Ã˜Â´Ã˜Â§Ã˜Â©",
      "Upload or drag media": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â£Ã™Ë† Ã˜Â§Ã˜Â³Ã˜Â­Ã˜Â¨ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â³Ã˜Â§Ã˜Â¦Ã˜Â· Ã™â€¡Ã™â€ Ã˜Â§",
      "Upload or drag image": "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â£Ã™Ë† Ã˜Â§Ã˜Â³Ã˜Â­Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã™â€¡Ã™â€ Ã˜Â§",
      "Drop here": "Ã˜Â£Ã™ÂÃ™â€žÃ˜ÂªÃ™â€¡ Ã™â€¡Ã™â€ Ã˜Â§",
      "Style Library": "Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â·",
      "Tap a curated style Ã¢â‚¬â€ the prompt, model, and aspect ratio apply instantly.": "Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· Ã˜Â¹Ã™â€žÃ™â€° Ã™â€ Ã™â€¦Ã˜Â· Ã™â€¦Ã™â€ Ã˜Â³Ã™â€š Ã¢â‚¬â€ Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Â Ã™Ë†Ã˜Â§Ã™â€žÃ™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¨Ã˜Â¹Ã˜Â§Ã˜Â¯ Ã™ÂÃ™Ë†Ã˜Â±Ã˜Â§Ã™â€¹.",
      "Browse styles": "Ã˜ÂªÃ˜ÂµÃ™ÂÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â·",
      "New": "Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯",
      "18 styles": "18 Ã™â€ Ã™â€¦Ã˜Â·Ã˜Â§Ã™â€¹",
      "Preview": "Ã™â€¦Ã˜Â¹Ã˜Â§Ã™Å Ã™â€ Ã˜Â©",
      "Unselect": "Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â¯",
      "Use": "Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦",
      "Remix": "Ã˜Â±Ã™Å Ã™â€¦Ã™Æ’Ã˜Â³",
      "Delete": "Ã˜Â­Ã˜Â°Ã™Â",
      "Enhancement instructions (optional) Ã¢â‚¬â€ e.g. \"cinematic, 8K, sharp\"...": "Ã˜ÂªÃ˜Â¹Ã™â€žÃ™Å Ã™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  (Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Å ) Ã¢â‚¬â€ Ã™â€¦Ã˜Â«Ã™â€ž: Ã˜Â³Ã™Å Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â¦Ã™Å Ã˜Å’ Ã˜Â¨Ã˜Â¯Ã™â€šÃ˜Â© 8KÃ˜Å’ Ã˜Â­Ã˜Â§Ã˜Â¯...",
      "Enhance Photo": "Ã˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©",
      "Describe the lighting you want...": "Ã˜ÂµÃ™Â Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¶Ã˜Â§Ã˜Â¡Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯Ã™â€¡Ã˜Â§...",
      "Describe what should replace the painted area...": "Ã˜ÂµÃ™Â Ã™â€¦Ã˜Â§ Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã™Å Ã˜Â­Ã™â€ž Ã™â€¦Ã˜Â­Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â·Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â³Ã™Ë†Ã™â€¦Ã˜Â©...",
      "Swap Face": "Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¬Ã™â€¡",
      "Search model": "Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¹Ã™â€  Ã™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬",
      
      // Model families
      "Cinema Studio": "Ã˜Â³Ã™Å Ã™â€ Ã™â€¦Ã˜Â§ Ã˜Â§Ã˜Â³Ã˜ÂªÃ™Ë†Ã˜Â¯Ã™Å Ã™Ë†",
      "Nano Banana": "Ã™â€ Ã˜Â§Ã™â€ Ã™Ë† Ã˜Â¨Ã™â€ Ã˜Â§Ã™â€ Ã˜Â§",
      "Seedance": "Ã˜Â³Ã™Å Ã˜Â¯Ã˜Â§Ã™â€ Ã˜Â³",
      "Kling": "Ã™Æ’Ã™â€žÃ™Å Ã™â€ Ã˜Âº",
      "GPT Image": "GPT Ã˜ÂµÃ™Ë†Ã˜Â±"
    }
  };

  const t = (key: string) => {
    if (!key) return "";
    const cleanKey = key.trim();
    return dict[lang]?.[cleanKey] || key;
  };

  return { t, lang };
}

export default function ImageWorkspacePage() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { t, lang } = useImageTranslation();
  const searchParams = useSearchParams();
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const { addAsset } = useAssetStore();

  const [activeTool, setActiveTool] = useState<ToolId>("create");
  const [selectedModel, setSelectedModel] = useState<ImageModel>(DEFAULT_VISIBLE_IMAGE_MODEL);
  const [hasAnnualUnlimitedImages, setHasAnnualUnlimitedImages] = useState(false);
  const [annualUnlimitedEnabled, setAnnualUnlimitedEnabled] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState("standard");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [characters, setCharacters] = useState<CharacterReference[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [relightFile, setRelightFile] = useState<File | null>(null);
  const [relightPreset, setRelightPreset] = useState<LightingPresetId>(LIGHTING_PRESETS[0].id);
  const [relightBrightness, setRelightBrightness] = useState(50);
  const [relightContrast, setRelightContrast] = useState(50);
  const [relightTemperature, setRelightTemperature] = useState(50);
  const [relightShadow, setRelightShadow] = useState(50);
  const [relightDirection, setRelightDirection] = useState("center");
  const [relightVariations, setRelightVariations] = useState(1);
  const [inpaintFile, setInpaintFile] = useState<File | null>(null);
  const [inpaintModelId, setInpaintModelId] = useState(EDIT_MODELS[0]?.id || "google/nano-banana-edit");
  const [inpaintVariations, setInpaintVariations] = useState(1);
  const [brushSize, setBrushSize] = useState(30);
  const [maskVersion, setMaskVersion] = useState(0);
  const maskExporterRef = useRef<() => string | null>(() => null);
  const [upscaleFile, setUpscaleFile] = useState<File | null>(null);
  const [upscaleScale, setUpscaleScale] = useState(2);
  const [upDenoise, setUpDenoise] = useState(true);
  const [upSharpen, setUpSharpen] = useState(true);
  const [upFace, setUpFace] = useState(false);
  const [upColor, setUpColor] = useState(false);
  const [upFormat, setUpFormat] = useState<"png" | "webp" | "jpg">("png");
  const [upQuality, setUpQuality] = useState(95);
  const [faceSource, setFaceSource] = useState<File | null>(null);
  const [faceTarget, setFaceTarget] = useState<File | null>(null);
  const [faceBlend, setFaceBlend] = useState(80);
  const [faceExpression, setFaceExpression] = useState(true);
  const [faceSkin, setFaceSkin] = useState(true);
  const [faceIndex, setFaceIndex] = useState(0);
  const [enhanceFiles, setEnhanceFiles] = useState<File[]>([]);
  const [enhanceModelId, setEnhanceModelId] = useState(
    ENHANCE_MODELS.find((m) => m.id === "google/nano-banana-edit")?.id ?? ENHANCE_MODELS[0]?.id ?? "google/nano-banana-edit",
  );
  const [activeGenerationCount, setActiveGenerationCount] = useState(0);
  const generating = activeGenerationCount > 0;
  const beginGeneration = useCallback(() => setActiveGenerationCount((count) => count + 1), []);
  const finishGeneration = useCallback(() => setActiveGenerationCount((count) => Math.max(0, count - 1)), []);
  const lastSubmitAtRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ResultItem[]>([]);
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsHasMore, setResultsHasMore] = useState(false);
  const [loadingMoreResults, setLoadingMoreResults] = useState(false);
  const [compare, setCompare] = useState<{ before: string; after: string } | null>(null);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [aspectRatioDropdownOpen, setAspectRatioDropdownOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deletingImages, setDeletingImages] = useState(false);

  const [showReferenceStudioModal, setShowReferenceStudioModal] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState("style");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [selectedCharacterPresetId, setSelectedCharacterPresetId] = useState<string | null>(null);
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<{ id: string; name: string; colors: string[] } | null>(null);

  useEffect(() => {
    const requestedTool = searchParams.get("tool");
    if (requestedTool && TOOLS.some((tool) => tool.id === requestedTool)) {
      setActiveTool(requestedTool as ToolId);
      setCompare(null);
    }

    const requestedModel = searchParams.get("model");
    if (requestedModel) {
      const model = VISIBLE_IMAGE_MODELS.find((m) => m.id === requestedModel);
      if (model) setSelectedModel(model);
    }

    const requestedCharacter = searchParams.get("characterId");
    if (requestedCharacter) setSelectedCharacterId(requestedCharacter);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Style Library preset hydration Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // When the user clicks a card on /image-presets, we land here with
    // ?prompt= ?aspect= ?quality= ?preset=Ã¢â‚¬Â¦ params. Apply them once.
    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt) setPrompt(requestedPrompt);

    const requestedAspect = searchParams.get("aspect");
    if (requestedAspect) setAspectRatio(requestedAspect);

    const requestedQuality = searchParams.get("quality");
    if (requestedQuality) setQuality(requestedQuality);

    // If we applied any preset params, strip them from the URL so a
    // page refresh doesn't reapply them on top of the user's edits.
    if (
      searchParams.get("preset") ||
      requestedPrompt ||
      requestedAspect ||
      requestedQuality
    ) {
      const url = new URL(window.location.href);
      ["prompt", "aspect", "quality", "preset"].forEach((k) =>
        url.searchParams.delete(k),
      );
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) return;
    let cancelled = false;
    const loadCharacters = async () => {
      try {
        const res = await fetch("/api/characters", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(data?.characters)) {
          setCharacters(data.characters);
        }
      } catch {
        if (!cancelled) setCharacters([]);
      }
    };
    void loadCharacters();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoaded, isSignedIn]);

  const loadPersistedImages = useCallback(async (nextPage = 0, mode: "replace" | "append" = "replace") => {
    if (isAuthLoaded && !isSignedIn) return;
    if (mode === "append") setLoadingMoreResults(true);
    try {
      const params = new URLSearchParams({ type: "image", page: String(nextPage), limit: "25" });
      const res = await fetch(`/api/assets?${params.toString()}`, { cache: "no-cache" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.assets)) return;

      const mapped: ResultItem[] = data.assets.map((asset: any) => mapAssetToResultItem(asset));
      setResults((prev) => mode === "append" ? [...prev, ...mapped.filter((item) => !prev.some((existing) => existing.id === item.id))] : mapped);
      setResultsPage(typeof data?.page === "number" ? data.page : nextPage);
      setResultsHasMore(Boolean(data?.hasMore));
    } catch {
      // no-op: keep current state
    } finally {
      if (mode === "append") setLoadingMoreResults(false);
    }
  }, [isAuthLoaded, isSignedIn]);

  useEffect(() => {
    void loadPersistedImages(0, "replace");
  }, [loadPersistedImages]);

  // Recover an in-flight generation that was interrupted by a page refresh.
  // Strategy: if a pending marker exists in localStorage, show placeholders + poll
  // /api/assets every 3s until a new image (createdAt > startedAt) appears, OR until
  // 5 minutes pass (then auto-clear).
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const raw = localStorage.getItem("ff_image_pending_job");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        startedAt: number; tool: ToolId; model: string; prompt: string; aspect: string; expectedCount: number;
      };
      if (!saved || !saved.startedAt) { localStorage.removeItem("ff_image_pending_job"); return; }
      // Auto-discard markers older than 5 min
      if (Date.now() - saved.startedAt > 5 * 60 * 1000) { localStorage.removeItem("ff_image_pending_job"); return; }

      // Re-show placeholders so the user knows generation is still being recovered
      const placeholders: ResultItem[] = Array.from({ length: Math.max(1, saved.expectedCount || 1) }, () => ({
        id: uid("recover"),
        url: "",
        tool: saved.tool,
        model: saved.model,
        prompt: saved.prompt,
        aspect: saved.aspect,
        isPending: true,
      }));
      setPendingItems((prev) => [...placeholders, ...prev]);
      beginGeneration();

      const finish = (matched: ResultItem[] | null) => {
        if (cancelled) return;
        if (matched && matched.length) {
          setResults((prev) => {
            const known = new Set(prev.map((r) => r.id));
            const fresh = matched.filter((m) => !known.has(m.id));
            return [...fresh, ...prev];
          });
        }
        setPendingItems((prev) => prev.filter((p) => !placeholders.some((ph) => ph.id === p.id)));
        finishGeneration();
        try { localStorage.removeItem("ff_image_pending_job"); } catch {}
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      };

      const tryRecover = async () => {
        try {
          const res = await fetch("/api/assets?type=image", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (!res.ok || !Array.isArray(data?.assets)) return;
          const fresh = data.assets.filter((a: any) => {
            const t = new Date(a.createdAt || 0).getTime();
            return t >= saved.startedAt - 2000; // small clock-skew tolerance
          });
          if (fresh.length > 0) {
            const matched: ResultItem[] = fresh.map((a: any) => mapAssetToResultItem(a, { tool: saved.tool, model: saved.model, prompt: saved.prompt, aspect: saved.aspect }));
            finish(matched);
          } else if (Date.now() - saved.startedAt > 5 * 60 * 1000) {
            finish(null);
          }
        } catch {/* keep polling */}
      };

      void tryRecover();
      pollTimer = setInterval(tryRecover, 3000);
    } catch {/* ignore */}

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [beginGeneration, finishGeneration]);

  const selectedRatio = useMemo(() => RATIO_OPTIONS.find((r) => r.value === aspectRatio) || RATIO_OPTIONS[0], [aspectRatio]);
  const availableRatioOptions = useMemo(
    () => RATIO_OPTIONS.filter((ratio) => selectedModel.aspectRatios.includes(ratio.value)),
    [selectedModel.aspectRatios],
  );
  const createNeedsImage = selectedModel.inputType !== "text-to-image";
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || null,
    [characters, selectedCharacterId],
  );
  const qualityOptions = useMemo(() => {
    const options = selectedModel.qualityParam ?? [];
    return options;
  }, [selectedModel]);
  const selectedQuality = qualityOptions.length ? (quality || qualityOptions[0]) : undefined;
  const canUseAnnualUnlimitedCreate = activeTool === "create" &&
    hasAnnualUnlimitedImages &&
    isAnnualUnlimitedImageModel(selectedModel.id) &&
    isAnnualUnlimitedImageQuality(selectedQuality);
  const isAnnualUnlimitedCreate = canUseAnnualUnlimitedCreate && annualUnlimitedEnabled;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const subscription = data?.subscription;
        const planId = String(subscription?.planId ?? "").toLowerCase();
        setHasAnnualUnlimitedImages(Boolean(
          subscription?.active &&
            subscription?.billingInterval === "annual" &&
            ANNUAL_UNLIMITED_IMAGE_PLAN_IDS.has(planId),
        ));
      })
      .catch(() => {
        if (!cancelled) setHasAnnualUnlimitedImages(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canUseAnnualUnlimitedCreate && annualUnlimitedEnabled) {
      setAnnualUnlimitedEnabled(false);
    }
  }, [annualUnlimitedEnabled, canUseAnnualUnlimitedCreate]);

  const composer = useMemo(() => {
    if (activeTool === "create") {
      if (isAnnualUnlimitedCreate) {
        return { placeholder: t("Describe what you want to generate..."), button: t("Generate Image - Unlimited"), promptEnabled: true };
      }
      const credits = getImageCreditCost(selectedModel, numImages, selectedQuality);
      return { placeholder: t("Describe what you want to generate..."), button: t("Generate Image") + " Ã‚Â· " + credits + " " + t("cr"), promptEnabled: true };
    }
    if (activeTool === "enhance") return { placeholder: t("Enhancement instructions (optional) Ã¢â‚¬â€ e.g. \"cinematic, 8K, sharp\"..."), button: t("Enhance Photo") + " Ã‚Â· 2 " + t("cr"), promptEnabled: true };
    if (activeTool === "relight") return { placeholder: t("Describe the lighting you want..."), button: t("Relight Image") + " Ã¢Å“Â¦ " + (3 * relightVariations), promptEnabled: true };
    if (activeTool === "inpaint") return { placeholder: t("Describe what should replace the painted area..."), button: t("Inpaint") + " Ã¢Å“Â¦ " + (3 * inpaintVariations), promptEnabled: true };
    if (activeTool === "upscale") return { placeholder: t("Upload media to upscale"), button: t("Upscale Image") + " Ã¢Å“Â¦ 2", promptEnabled: false };
    return { placeholder: t("Upload source face and target above"), button: t("Swap Face") + " Ã¢Å“Â¦ 4", promptEnabled: false };
  }, [activeTool, inpaintVariations, isAnnualUnlimitedCreate, numImages, relightVariations, selectedModel, selectedQuality]);

  useEffect(() => {
    setNumImages(Math.min(Math.max(1, numImages), selectedModel.maxImages));
    if (selectedModel.aspectRatios.length && !selectedModel.aspectRatios.includes(aspectRatio)) setAspectRatio(selectedModel.aspectRatios[0]);
    if (qualityOptions.length && !qualityOptions.includes(quality)) setQuality(qualityOptions[0]);
  }, [selectedModel, numImages, aspectRatio, quality, qualityOptions]);

  const canGenerate = useMemo(() => {
    if (activeTool === "create") return Boolean(prompt.trim()) && (!createNeedsImage || referenceFiles.length > 0 || Boolean(selectedCharacter));
    if (activeTool === "relight") return Boolean(relightFile && prompt.trim());
    if (activeTool === "inpaint") return Boolean(inpaintFile && prompt.trim());
    if (activeTool === "upscale") return Boolean(upscaleFile);
    if (activeTool === "enhance") return enhanceFiles.length > 0;
    return Boolean(faceSource && faceTarget);
  }, [activeTool, createNeedsImage, enhanceFiles.length, faceSource, faceTarget, inpaintFile, prompt, referenceFiles.length, relightFile, selectedCharacter, upscaleFile]);

  const estimatedCredits = useMemo(() => {
    if (activeTool === "create") {
      if (isAnnualUnlimitedCreate) return 0;
      return getImageCreditCost(selectedModel, numImages, selectedQuality);
    }
    if (activeTool === "enhance") return ENHANCE_MODELS.find((m) => m.id === enhanceModelId)?.creditCost ?? 2;
    if (activeTool === "relight") return 3 * relightVariations;
    if (activeTool === "inpaint") return 3 * inpaintVariations;
    if (activeTool === "upscale") return 2;
    return 4;
  }, [activeTool, enhanceModelId, inpaintVariations, isAnnualUnlimitedCreate, numImages, relightVariations, selectedModel, selectedQuality]);

  const addResultItems = useCallback((urls: string[], tool: ToolId, model: string, p: string, aspect: string, records?: Partial<ResultItem>[]) => {
    const newItems = urls.map((url, index) => ({
      id: records?.[index]?.id || uid("img"),
      url,
      originalUrl: records?.[index]?.originalUrl || url,
      thumbnailUrl: records?.[index]?.thumbnailUrl,
      width: records?.[index]?.width,
      height: records?.[index]?.height,
      tool,
      model,
      prompt: p,
      aspect,
    }));
    setResults((prev) => [...newItems, ...prev]);
    newItems.forEach((item) => addAsset({ type: "image", url: resultOriginalUrl(item), prompt: item.prompt, model: item.model, resolution: item.aspect, title: item.prompt.slice(0, 60) }));
  }, [addAsset]);

  const generateCreate = useCallback(async () => {
    const maxRef = selectedModel.maxRefImages;
    const filesToSend = maxRef > 0 ? referenceFiles.slice(0, maxRef) : [];
    const uploadedReferenceUrls = await Promise.all(filesToSend.map(fileToDataUrl));
    const characterReferenceUrls = selectedCharacter?.referenceUrls?.slice(0, Math.max(0, maxRef)) ?? [];
    const imageUrls = maxRef > 0
      ? [...characterReferenceUrls, ...uploadedReferenceUrls].slice(0, maxRef)
      : [];
    const pkg = selectedCharacter?.metadata?.characterPackage;
    const characterPrompt = selectedCharacter
      ? [
          `Use the selected Character Package: ${selectedCharacter.name}.`,
          pkg?.mainIdentity ? `Main Identity: ${pkg.mainIdentity}` : selectedCharacter.description,
          pkg?.faceMemory ? `Face Memory: ${pkg.faceMemory}` : "Preserve the same face, identity, ethnicity, proportions, and recognizable features.",
          pkg?.bodyProfile ? `Body Profile: ${pkg.bodyProfile}` : "",
          pkg?.outfitMemory ? `Outfit Memory: ${pkg.outfitMemory}` : "",
          pkg?.styleDna ? `Style DNA: ${pkg.styleDna}` : "",
          pkg?.states?.hero ? `Active State: ${pkg.states.hero}` : "",
          pkg?.consistencyProfile ? `Consistency Profile: ${pkg.consistencyProfile}` : "",
        ].filter(Boolean).join("\n")
      : "";
    const basePrompt = characterPrompt ? `${characterPrompt}\n\n${prompt}` : prompt;
    // Inject Style/Effect/Camera/Sketch/Location/Element systemPromptAddon into the prompt
    // so the model actually applies the selected preset (thumbnails are just index cards).
    const effectivePrompt = withPresetsAppended(basePrompt, {
      selectedStyleId: selectedStyle,
      selectedEffectId,
      selectedCameraId,
      selectedSketchId,
      selectedLocationId,
      selectedElementId,
      selectedPalette,
    });
    const body: Record<string, unknown> = {
      prompt: effectivePrompt,
      modelId: selectedModel.id,
      aspectRatio,
      numImages,
      quality: qualityOptions.length ? (quality || qualityOptions[0]) : undefined,
      useAnnualUnlimited: isAnnualUnlimitedCreate,
    };
    if (imageUrls.length > 0) {
      // Always send imageInputField so the route knows which API field to use
      if (selectedModel.imageInputField) body.imageInputField = selectedModel.imageInputField;
      if (imageUrls.length === 1) body.imageUrl = imageUrls[0];
      else body.imageUrls = imageUrls;
    }
    // 1. Call /api/generate/image
    const res = await fetch("/api/generate/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
    const urls = normalizeImageResponseUrls(data);
    if (!urls.length) throw new Error("Generation completed but no image URL was returned");

    // 2. Call /api/assets/persist for each result
    const generationId = data.generationId || data.taskId || data.id; // try to get generationId from response
    let persistedUrls: string[] = [];
    if (generationId && urls.length) {
      // Only persist the first image (main record), as backend saves additional ones
      try {
        const persistRes = await fetch("/api/assets/persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationId, mediaUrl: urls[0] }),
        });
        const persistData = await persistRes.json();
        if (persistRes.ok && persistData.url) {
          // Replace the first URL with the permanent one
          persistedUrls = [persistData.url, ...urls.slice(1)];
        } else {
          persistedUrls = urls;
        }
      } catch {
        persistedUrls = urls;
      }
    } else {
      persistedUrls = urls;
    }

    const persistedRecords: Partial<ResultItem>[] = generationId && persistedUrls[0]
      ? [{ id: String(generationId), originalUrl: persistedUrls[0], thumbnailUrl: `/api/assets/thumbnail?id=${encodeURIComponent(String(generationId))}` }]
      : [];

    // 3. Update UI state with permanent original URL(s); cards render thumbnailUrl when a DB id is available.
    addResultItems(persistedUrls, "create", selectedModel.label, prompt, aspectRatio, persistedRecords);
    void loadPersistedImages(0, "replace");
  }, [addResultItems, aspectRatio, isAnnualUnlimitedCreate, loadPersistedImages, numImages, prompt, quality, qualityOptions, referenceFiles, selectedCharacter, selectedModel, selectedStyle, selectedEffectId, selectedCameraId, selectedSketchId, selectedLocationId, selectedElementId, selectedPalette]);

  const generateRelight = useCallback(async () => {
    if (!relightFile) throw new Error("Upload image first");
    const preset = LIGHTING_PRESETS.find((p) => p.id === relightPreset) || LIGHTING_PRESETS[0];
    const imgData = await fileToDataUrl(relightFile);
    const payload = { model: "seedream/4.5-edit", prompt: `Relight this image with ${preset.prompt}. Brightness:${relightBrightness} Contrast:${relightContrast} Temperature:${relightTemperature > 50 ? "warm" : "cool"} Direction:${relightDirection}`, image: imgData, num_images: relightVariations };
    console.log("RELIGHT_PAYLOAD", payload);
    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: payload.prompt,
        modelId: "seedream/4.5-edit",
        numImages: relightVariations,
        imageInputField: "image_urls",
        imageUrl: imgData,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Relight failed");
    const urls = normalizeImageResponseUrls(data);
    if (!urls.length) throw new Error("Relight completed but no image URL was returned");
    const before = URL.createObjectURL(relightFile);
    if (urls[0]) setCompare({ before, after: urls[0] });
    addResultItems(urls, "relight", "Seedream 4.5 Edit", payload.prompt, "source");
  }, [addResultItems, relightBrightness, relightContrast, relightDirection, relightFile, relightPreset, relightTemperature, relightVariations]);

  const generateInpaint = useCallback(async () => {
    if (!inpaintFile) throw new Error("Upload image first");
    const maskData = maskExporterRef.current();
    if (!maskData) throw new Error("Mask is missing");
    const imageData = await fileToDataUrl(inpaintFile);
    const guideImage = await buildInpaintGuideImage(imageData, maskData);
    const payload = { model: inpaintModelId, prompt, image: imageData, mask: maskData, guide: guideImage, num_images: inpaintVariations };
    console.log("INPAINT_PAYLOAD", payload);
    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt}. Apply edits only where the mask/painted area is indicated.`,
        modelId: inpaintModelId,
        numImages: inpaintVariations,
        imageInputField: "image_urls",
        imageUrl: guideImage,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Inpaint failed");
    const urls = normalizeImageResponseUrls(data);
    if (!urls.length) throw new Error("Inpaint completed but no image URL was returned");
    const before = URL.createObjectURL(inpaintFile);
    if (urls[0]) setCompare({ before, after: urls[0] });
    addResultItems(urls, "inpaint", inpaintModelId, prompt, "source");
  }, [addResultItems, inpaintFile, inpaintModelId, inpaintVariations, prompt]);

  const generateUpscale = useCallback(async () => {
    if (!upscaleFile) throw new Error("Upload media first");
    if (!upscaleFile.type.startsWith("image/")) {
      throw new Error("Image page upscale supports image files only.");
    }
    const data = await fileToDataUrl(upscaleFile);
    const payload = { endpoint: "/api/upscale", media: data, scale: upscaleScale, denoise: upDenoise, sharpen: upSharpen, face_enhance: upFace, color_enhance: upColor, format: upFormat, quality: upQuality };
    console.log("UPSCALE_PAYLOAD", payload);
    const res = await fetch("/api/generate/upscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: data,
        scale: upscaleScale,
        denoise: upDenoise,
        sharpen: upSharpen,
        faceEnhance: upFace,
        colorEnhance: upColor,
        format: upFormat,
        quality: upQuality,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "Upscale failed");
    const out = (json.videoUrl || json.imageUrl || json.mediaUrl) as string | undefined;
    if (!out) throw new Error("Upscale did not return output URL");
    const before = URL.createObjectURL(upscaleFile);
    setCompare({ before, after: out });
    addResultItems([out], "upscale", "Video Upscaler Pro", "Upscaled media", "source");
  }, [addResultItems, upColor, upDenoise, upFace, upFormat, upQuality, upSharpen, upscaleFile, upscaleScale]);

  const generateFaceSwap = useCallback(async () => {
    if (!faceSource || !faceTarget) throw new Error("Upload source and target");
    const sourceData = await fileToDataUrl(faceSource);
    const targetData = await fileToDataUrl(faceTarget);
    const payload = {
      model: "wavespeed-ai/image-face-swap-pro",
      sourceImageUrl: sourceData,
      targetImageUrl: targetData,
      face_index: faceIndex,
      blend: faceBlend / 100,
      match_expression: faceExpression,
      match_skin: faceSkin,
    };
    console.log("FACE_SWAP_PAYLOAD", payload);
    const res = await fetch("/api/generate/face-swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Face swap failed");
    const out = data.imageUrl as string | undefined;
    if (!out) throw new Error("Face swap did not return image URL");
    const before = URL.createObjectURL(faceTarget);
    setCompare({ before, after: out });
    addResultItems([out], "face-swap", "Image Face Swap Pro", "Face swap result", "source");
  }, [addResultItems, faceBlend, faceExpression, faceIndex, faceSkin, faceSource, faceTarget]);

  const generateEnhance = useCallback(async () => {
    if (!enhanceFiles.length) throw new Error("Upload at least one image first");
    const enhanceModel = ENHANCE_MODELS.find((m) => m.id === enhanceModelId) ?? ENHANCE_MODELS[0];
    if (!enhanceModel) throw new Error("No enhancement model available");
    const maxRef = enhanceModel.maxRefImages;
    const filesToSend = enhanceFiles.slice(0, maxRef > 0 ? maxRef : 1);
    const imgDataArray = await Promise.all(filesToSend.map(fileToDataUrl));
    const enhancePrompt =
      prompt.trim() ||
      "Enhance and restore this photo. Preserve the subject's exact identity, face features, skin tone, and appearance. Improve sharpness, detail, and remove noise and blur. Photorealistic, high quality.";
    const body: Record<string, unknown> = {
      prompt: enhancePrompt,
      modelId: enhanceModel.id,
      numImages: 1,
      imageInputField: enhanceModel.imageInputField,
    };
    if (imgDataArray.length === 1) {
      body.imageUrl = imgDataArray[0];
    } else {
      body.imageUrls = imgDataArray;
    }
    const res = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Enhancement failed");
    const urls = normalizeImageResponseUrls(data);
    if (!urls.length) throw new Error("Enhancement completed but no image URL was returned");
    const before = URL.createObjectURL(enhanceFiles[0]);
    if (urls[0]) setCompare({ before, after: urls[0] });
    addResultItems(urls, "enhance", enhanceModel.label, enhancePrompt, "source");
  }, [addResultItems, enhanceFiles, enhanceModelId, prompt]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 800) return;
    lastSubmitAtRef.current = now;
    const gate = await guardGeneration({ requiredCredits: estimatedCredits, action: `image:${activeTool}` });
    if (!gate.ok) {
      if (gate.reason === "error") setError(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }
    const pendingCount = activeTool === "create" ? numImages : activeTool === "relight" ? relightVariations : activeTool === "inpaint" ? inpaintVariations : 1;
    const pendingModel = activeTool === "create" ? selectedModel.label : activeTool === "enhance" ? (ENHANCE_MODELS.find((m) => m.id === enhanceModelId)?.label ?? enhanceModelId) : activeTool === "relight" ? "Seedream 4.5 Edit" : activeTool === "inpaint" ? inpaintModelId : activeTool === "upscale" ? "Upscaler" : "Face Swap";
    const pendingAspect = activeTool === "create" ? aspectRatio : "source";
    const pendingPrompt = prompt || t("Generating...");
    const placeholders: ResultItem[] = Array.from({ length: pendingCount }, () => ({
      id: uid("pending"),
      url: "",
      tool: activeTool,
      model: pendingModel,
      prompt: pendingPrompt,
      aspect: pendingAspect,
      isPending: true,
    }));

    setPendingItems((prev) => [...placeholders, ...prev]);
    beginGeneration();
    setError(null);
    // Persist generation marker so we can recover after a page refresh
    try {
      localStorage.setItem("ff_image_pending_job", JSON.stringify({
        startedAt: Date.now(),
        tool: activeTool,
        model: pendingModel,
        prompt: pendingPrompt,
        aspect: pendingAspect,
        expectedCount: pendingCount,
      }));
    } catch {}
    try {
      if (activeTool === "create") await generateCreate();
      if (activeTool === "enhance") await generateEnhance();
      if (activeTool === "relight") await generateRelight();
      if (activeTool === "inpaint") await generateInpaint();
      if (activeTool === "upscale") await generateUpscale();
      if (activeTool === "face-swap") await generateFaceSwap();
    } catch (e) {
      console.error("[image generation] actual error:", e);
      setError(getSafeErrorMessage(e));
    } finally {
      setPendingItems((prev) => prev.filter((item) => !placeholders.some((ph) => ph.id === item.id)));
      finishGeneration();
      try { localStorage.removeItem("ff_image_pending_job"); } catch {}
    }
  }, [activeTool, aspectRatio, beginGeneration, canGenerate, enhanceModelId, estimatedCredits, finishGeneration, generateCreate, generateEnhance, generateFaceSwap, generateInpaint, generateRelight, generateUpscale, getSafeErrorMessage, guardGeneration, inpaintModelId, inpaintVariations, numImages, prompt, relightVariations, selectedModel.label]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTargetIds([id]);
  }, []);

  const handleBulkDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteTargetIds(ids);
  }, []);

  const cancelImageDelete = useCallback(() => {
    if (deletingImages) return;
    setDeleteTargetIds([]);
  }, [deletingImages]);

  const confirmImageDelete = useCallback(async () => {
    if (deleteTargetIds.length === 0 || deletingImages) return;
    const ids = deleteTargetIds;
    setDeletingImages(true);
    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids }),
      });
      if (!response.ok) throw new Error("Failed to delete image generation.");
      const idSet = new Set(ids);
      setResults((prev) => prev.filter((item) => !idSet.has(item.id)));
      setDeleteTargetIds([]);
    } catch {
      void loadPersistedImages(0, "replace");
    } finally {
      setDeletingImages(false);
    }
  }, [deleteTargetIds, deletingImages, loadPersistedImages]);

  // Use a generated image as a reference for the next generation. If the active
  // model doesn't accept references, switch to a sensible image-to-image default.
  const handleUseAsReference = useCallback(async (item: ResultItem) => {
    try {
      // Try direct fetch first; many CDNs (KIE temp domain) block CORS, so
      // fall back to our authenticated server-side proxy when that happens.
      let blob: Blob | null = null;
      const requiresProxy = item.url.includes("backblazeb2.com") ||
                            item.url.includes("r2.dev") ||
                            item.url.includes("supabase.co") ||
                            item.url.includes("cloudflare");
      if (!requiresProxy) {
        try {
          const direct = await fetch(resultOriginalUrl(item), { mode: "cors" });
          if (direct.ok) blob = await direct.blob();
        } catch { /* CORS or network Ã¢â‚¬â€ fall through to proxy */ }
      }
      if (!blob) {
        const proxied = await fetch(`/api/proxy-image?url=${encodeURIComponent(resultOriginalUrl(item))}`);
        if (!proxied.ok) throw new Error(`Proxy returned ${proxied.status}`);
        blob = await proxied.blob();
      }
      const ext = (blob.type.split("/")[1] || "png").split("+")[0];
      const file = new File([blob], `result_${item.id}.${ext}`, { type: blob.type || "image/png" });

      // Pick a target model that accepts image references.
      const acceptsRefs = selectedModel.imageInputField !== undefined && selectedModel.maxRefImages > 0;
      const targetModel = acceptsRefs
        ? selectedModel
        : (VISIBLE_IMAGE_MODELS.find((m) => m.id === "google/nano-banana-edit")
            ?? VISIBLE_IMAGE_MODELS.find((m) => m.imageInputField !== undefined && m.maxRefImages > 0)
            ?? selectedModel);

      if (targetModel.id !== selectedModel.id) setSelectedModel(targetModel);
      setActiveTool("create");
      setReferenceFiles((prev) => {
        const cap = Math.max(1, targetModel.maxRefImages || 1);
        return [...prev, file].slice(-cap);
      });
    } catch (err) {
      console.error("Failed to use image as reference", err);
    }
  }, [selectedModel]);

  const renderWorkspace = () => {
    if (activeTool === "create") return <ResultGrid items={[...pendingItems, ...results]} onInspect={setInspectorAsset} onRemix={(item) => { setActiveTool("create"); setPrompt(`Remix this style: ${item.prompt}`); }} onUse={handleUseAsReference} onDelete={handleDelete} onBulkDelete={handleBulkDelete} hasMore={resultsHasMore} loadingMore={loadingMoreResults} onLoadMore={() => void loadPersistedImages(resultsPage + 1, "append")} />;
    if (activeTool === "inpaint") return <InpaintWorkspace source={inpaintFile} setSource={setInpaintFile} brushSize={brushSize} setBrushSize={setBrushSize} maskVersion={maskVersion} setMaskVersion={setMaskVersion} registerMaskExporter={(fn) => { maskExporterRef.current = fn; }} />;
    if (compare) return <CompareSlider before={compare.before} after={compare.after} />;
    if (activeTool === "enhance") {
      return <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-zinc-400">
        <Zap className="h-10 w-10 text-amber-400/60" />
        <div className="text-center">
          <p className="text-sm font-semibold text-amber-300">{t("ENHANCE Ã¢â‚¬â€ Photo Restoration")}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("Upload a photo in the settings panel Ã¢â€ â€™ click Enhance Photo")}</p>
          <p className="mt-1 text-xs text-zinc-600">{t("Uses true image-to-image AI to preserve identity while improving quality")}</p>
        </div>
      </div>;
    }
    return <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-500">{activeTool === "relight" ? t("Upload image and relight") : activeTool === "upscale" ? t("Upload media and upscale") : t("Upload source and target images")}</div>;
  };

  const renderRightPanel = () => {
    if (activeTool === "create") {
      return <>
        <SettingsAccordion label="References & Styling" summary={selectedStyle || "None"} defaultOpen>
          <ReferenceActionTiles
            onOpenStudio={(tab) => {
              setActiveStudioTab(tab);
              setShowReferenceStudioModal(true);
            }}
            selectedStyle={selectedStyle}
            selectedElementId={selectedElementId}
            selectedLocationId={selectedLocationId}
            selectedCameraId={selectedCameraId}
            selectedEffectId={selectedEffectId}
            selectedCharacterId={selectedCharacterPresetId}
            onClearStyle={() => setSelectedStyle(null)}
            onClearElement={() => setSelectedElementId(null)}
            onClearLocation={() => setSelectedLocationId(null)}
            onClearCamera={() => setSelectedCameraId(null)}
            onClearEffect={() => setSelectedEffectId(null)}
            onClearCharacter={() => setSelectedCharacterPresetId(null)}
            isAr={lang === "ar"}
          />
        </SettingsAccordion>

        <SettingsAccordion label="Model" summary={selectedModel.label} defaultOpen>
          <div className="mb-2 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/[0.10] via-pink-500/[0.08] to-sky-500/[0.10] px-3 py-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-pink-200/90">
              <Sparkles className="h-3.5 w-3.5" />
              {t("New from Saad Studio")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_MODELS.filter((m) => m.id === "gpt-image-2-text-to-image").map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m)}
                  className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <ModelDropdown selected={selectedModel} onSelect={setSelectedModel} />
        </SettingsAccordion>

        <SettingsAccordion label="Character Reference" summary={selectedCharacter?.name || "None"} defaultOpen={Boolean(selectedCharacter)}>
          <div className="space-y-3">
            <select
              aria-label={t("Character reference selection")}
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="">{t("No saved character")}</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>

            {selectedCharacter ? (
              <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
                <div className="flex gap-3">
                  {selectedCharacter.coverUrl ? (
                    <img src={selectedCharacter.coverUrl} alt={selectedCharacter.name} className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-zinc-500">
                      <ScanFace className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-100">{selectedCharacter.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{selectedCharacter.description || "Identity reference set"}</p>
                    <p className="mt-1 text-[11px] text-fuchsia-200">{selectedCharacter.referenceUrls.length} reference image(s)</p>
                  </div>
                </div>
                {selectedModel.maxRefImages <= 0 ? (
                  <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
                    {t("This model does not accept reference images. Choose an image-to-image model to use this character.")}
                  </p>
                ) : null}
              </div>
            ) : (
              <a href="/character" className="flex items-center justify-center rounded-xl border border-dashed border-white/15 px-3 py-3 text-xs font-semibold text-zinc-400 hover:border-fuchsia-400/50 hover:text-fuchsia-200">
                {t("Create a reusable character")}
              </a>
            )}
          </div>
        </SettingsAccordion>

        {selectedModel.aspectRatios.length ? (
          <SettingsAccordion label="Aspect Ratio" summary={aspectRatio} defaultOpen>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={aspectRatioDropdownOpen}
                onClick={() => setAspectRatioDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <span className="flex items-center gap-3">
                  <span className={cn("ratio-menu-icon", selectedRatio.cls)}>
                    <span className="ratio-shape" />
                  </span>
                  <span className="font-semibold">{selectedRatio.value}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition", aspectRatioDropdownOpen && "rotate-180")} />
              </button>

              {aspectRatioDropdownOpen ? (
                <div role="listbox" className="absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#080a12] p-1.5 shadow-2xl shadow-black/50">
                  {availableRatioOptions.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      role="option"
                      aria-selected={aspectRatio === ratio.value}
                      onClick={() => {
                        setAspectRatio(ratio.value);
                        setAspectRatioDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 hover:bg-white/8 hover:text-white",
                        aspectRatio === ratio.value && "bg-pink-500/10 text-pink-200",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className={cn("ratio-menu-icon", ratio.cls, aspectRatio === ratio.value && "active")}>
                          <span className="ratio-shape" />
                        </span>
                        <span className="font-semibold">{ratio.value}</span>
                      </span>
                      {aspectRatio === ratio.value ? <Check className="h-4 w-4 text-pink-300" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </SettingsAccordion>
        ) : null}

        {selectedModel.maxImages > 1 ? (
          <SettingsAccordion label="Number of Images" summary={String(numImages)} defaultOpen>
            <div className="num-selector">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => setNumImages(Math.min(n, selectedModel.maxImages))} className={cn("num-btn", numImages === n && "active")} disabled={n > selectedModel.maxImages}>{n}</button>
              ))}
            </div>
          </SettingsAccordion>
        ) : null}

        {qualityOptions.length ? (
          <SettingsAccordion label={qualityOptions.some((q) => /k$/i.test(q)) ? "Resolution" : "Quality"} summary={quality || qualityOptions[0]} defaultOpen>
            <select
              aria-label={t("Image quality or resolution")}
              value={quality || qualityOptions[0]}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              {qualityOptions.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </SettingsAccordion>
        ) : null}

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Gateway card Ã¢â€ â€™ /image-presets Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <StyleLibraryGatewayCard />

      </>;
    }

    if (activeTool === "relight") {
      return <>
        <UploadBox label="Upload image to relight" file={relightFile} onFile={setRelightFile} required />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Lighting Preset</p><div className="grid grid-cols-3 gap-2">{LIGHTING_PRESETS.map((preset) => <button key={preset.id} onClick={() => setRelightPreset(preset.id)} className={cn("rounded-xl border px-2 py-2 text-left text-[11px]", relightPreset === preset.id ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{preset.name}</button>)}</div></section>
        <SliderField label="Brightness" value={relightBrightness} onChange={setRelightBrightness} />
        <SliderField label="Contrast" value={relightContrast} onChange={setRelightContrast} />
        <SliderField label="Temperature" value={relightTemperature} onChange={setRelightTemperature} />
        <SliderField label="Shadow Intensity" value={relightShadow} onChange={setRelightShadow} />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Light Direction</p><div className="grid grid-cols-3 gap-1.5 text-xs">{["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"].map((d) => <button key={d} onClick={() => setRelightDirection(d)} className={cn("rounded-md border py-1.5", relightDirection === d ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{d}</button>)}</div></section>
        <CountSelector label="Number of Variations" value={relightVariations} onChange={setRelightVariations} />
      </>;
    }

    if (activeTool === "inpaint") {
      return <>
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Edit Model</p><select aria-label={t("Edit model selection")} value={inpaintModelId} onChange={(e) => setInpaintModelId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100">{EDIT_MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></section>
        <CountSelector label="Number of Variations" value={inpaintVariations} onChange={setInpaintVariations} />
        <SliderField label="Brush Size" value={brushSize} onChange={setBrushSize} min={5} max={100} />
      </>;
    }

    if (activeTool === "enhance") {
      const currentEnhanceModel = ENHANCE_MODELS.find((m) => m.id === enhanceModelId) ?? ENHANCE_MODELS[0];
      const maxSlots = currentEnhanceModel?.maxRefImages ?? 1;
      return <>
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Enhancement Model</p>
          <select
            aria-label={t("Enhancement model selection")}
            value={enhanceModelId}
            onChange={(e) => { setEnhanceModelId(e.target.value); setEnhanceFiles([]); }}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            {ENHANCE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>{model.label} (max {model.maxRefImages} img)</option>
            ))}
          </select>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            Input Images
            <span className="ml-2 font-normal normal-case text-zinc-600">{enhanceFiles.length}/{maxSlots} added</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: Math.min(maxSlots, 6) }).map((_, i) => {
              const file = enhanceFiles[i] ?? null;
              const preview = file ? URL.createObjectURL(file) : null;
              return (
                <div key={i} className="relative">
                  <label className={cn(
                    "flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border text-xs transition",
                    file ? "border-pink-400/50 bg-pink-500/5" : "border-dashed border-white/15 bg-white/3 text-zinc-600 hover:border-white/30",
                  )}>
                    {preview ? (
                      <img src={preview} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <><UploadCloud className="mb-1 h-5 w-5" /><span>{i === 0 ? t("Required") : t("Optional")}</span></>
                    )}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setEnhanceFiles((prev) => {
                          const next = [...prev];
                          next[i] = f;
                          return next.filter(Boolean);
                        });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {file && (
                    <button
                      onClick={() => setEnhanceFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-zinc-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-200">
          <strong className="text-amber-300">{t("Ã¢Å“Â¦ True Image-to-Image")}</strong><br />
          {t("ENHANCE sends your photo directly as input to the AI Ã¢â‚¬â€ preserves identity. Unlike CREATE which uses it as loose inspiration.")}
        </div>
      </>;
    }

    if (activeTool === "upscale") {
      return <>
        <UploadBox label="Upload image" file={upscaleFile} onFile={setUpscaleFile} required accept="image/*" />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Scale Factor</p><div className="grid grid-cols-2 gap-2">{[2, 4].map((n) => <button key={n} onClick={() => setUpscaleScale(n)} className={cn("rounded-xl border py-2 text-sm font-semibold", upscaleScale === n ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{n}x</button>)}</div></section>
        <ToggleField label="Denoise" checked={upDenoise} onChange={setUpDenoise} />
        <ToggleField label="Sharpen" checked={upSharpen} onChange={setUpSharpen} />
        <ToggleField label="Face Enhancement" checked={upFace} onChange={setUpFace} />
        <ToggleField label="Color Enhancement" checked={upColor} onChange={setUpColor} />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Output Format</p><div className="grid grid-cols-3 gap-2">{(["png", "webp", "jpg"] as const).map((f) => <button key={f} onClick={() => setUpFormat(f)} className={cn("rounded-lg border py-2 text-sm uppercase", upFormat === f ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{f}</button>)}</div>{(upFormat === "jpg" || upFormat === "webp") ? <SliderField label="Quality" value={upQuality} onChange={setUpQuality} min={80} max={100} /> : null}</section>
      </>;
    }

    return <>
      <UploadBox label="Source face" file={faceSource} onFile={setFaceSource} required />
      <UploadBox label="Target image" file={faceTarget} onFile={setFaceTarget} required />
      <SliderField label="Face Blend" value={faceBlend} onChange={setFaceBlend} min={0} max={100} />
      <ToggleField label="Keep target expression" checked={faceExpression} onChange={setFaceExpression} />
      <ToggleField label="Match skin tones" checked={faceSkin} onChange={setFaceSkin} />
      <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Target Face Index</p><div className="grid grid-cols-4 gap-2">{[0,1,2,3].map((i) => <button key={i} onClick={() => setFaceIndex(i)} className={cn("rounded-lg border py-2 text-sm", faceIndex === i ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{i+1}</button>)}</div></section>
    </>;
  };

  const handleAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files).filter((f) => f.type.startsWith("image/")) : [];
    if (!files.length) return;
    setReferenceFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const [composerDragActive, setComposerDragActive] = useState(false);

  const handleComposerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setComposerDragActive(true);
  };

  const handleComposerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setComposerDragActive(false);
  };

  const handleComposerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setComposerDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (dropped.length) setReferenceFiles((prev) => [...prev, ...dropped]);
  };

  return (
    <>
      <style jsx global>{`
        .ratio-card { width: 64px; height: 64px; border: 2px solid rgba(255,255,255,0.12); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; background: transparent; color: #7f8aa3; }
        .ratio-card.active { border-color: #ec4899; background: rgba(236,72,153,0.08); color: #ec4899; }
        .ratio-card .ratio-shape { border: 1.5px solid currentColor; border-radius: 2px; }
        .ratio-menu-icon { width: 42px; height: 34px; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; }
        .ratio-menu-icon.active { color: #f9a8d4; }
        .ratio-auto .ratio-shape { width: 28px; height: 28px; border-style: dashed; }
        .ratio-1-1 .ratio-shape { width: 28px; height: 28px; }
        .ratio-1-4 .ratio-shape { width: 10px; height: 40px; }
        .ratio-1-8 .ratio-shape { width: 8px; height: 42px; }
        .ratio-2-3 .ratio-shape { width: 22px; height: 34px; }
        .ratio-3-2 .ratio-shape { width: 34px; height: 22px; }
        .ratio-3-4 .ratio-shape { width: 24px; height: 32px; }
        .ratio-4-1 .ratio-shape { width: 42px; height: 10px; }
        .ratio-4-3 .ratio-shape { width: 32px; height: 24px; }
        .ratio-4-5 .ratio-shape { width: 24px; height: 30px; }
        .ratio-5-4 .ratio-shape { width: 30px; height: 24px; }
        .ratio-8-1 .ratio-shape { width: 42px; height: 8px; }
        .ratio-9-16 .ratio-shape { width: 20px; height: 36px; }
        .ratio-16-9 .ratio-shape { width: 36px; height: 20px; }
        .ratio-21-9 .ratio-shape { width: 42px; height: 18px; }        .ratio-label { margin-top: 4px; font-size: 10px; color: inherit; }
        .num-selector { display:flex; gap:8px; }
        .num-btn { width:48px; height:40px; border-radius:8px; border:1.5px solid rgba(255,255,255,.12); background:transparent; color:#7f8aa3; font-size:15px; font-weight:600; }
        .num-btn.active { background:#ec4899; border-color:#ec4899; color:#fff; }
        .btn-generate { background: linear-gradient(135deg, #ec4899, #be185d); color: white; font-weight: 700; font-size: 15px; border: none; transition: transform 0.15s, box-shadow 0.15s; }
        .btn-generate:hover { transform: scale(1.02); box-shadow: 0 0 24px rgba(236, 72, 153, 0.3); }
      `}</style>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 pb-[60px] md:pb-0">
        <aside className="hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-black/30 py-4 md:flex">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600/80 to-violet-600/80"><Camera className="h-4 w-4 text-white" /></div>
          {TOOLS.map((tool) => <ToolButton key={tool.id} active={activeTool === tool.id} icon={tool.icon} label={t(tool.label)} onClick={() => { setActiveTool(tool.id); setCompare(null); }} />)}
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10 flex-1 overflow-y-auto p-4">{error ? <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}{renderWorkspace()}</div>
          <div className="relative z-10 border-t border-white/10 p-3">
            <div
              className={cn("rounded-2xl border p-2 backdrop-blur-xl transition-colors", composerDragActive ? "border-pink-400/60 bg-pink-500/[0.06]" : "border-white/10 bg-black/55")}
              onDragOver={handleComposerDragOver}
              onDragEnter={handleComposerDragOver}
              onDragLeave={handleComposerDragLeave}
              onDrop={handleComposerDrop}
            >
              {composerDragActive ? (
                <div className="mb-2 flex items-center justify-center rounded-xl border border-dashed border-pink-400/50 bg-pink-500/5 py-2 text-xs text-pink-300">{t("Drop images here to add as reference")}</div>
              ) : (
                <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                  {activeTool === "create" ? (
                    selectedCharacter ? (
                      <button
                        type="button"
                        onClick={() => setMobileSettingsOpen(true)}
                        className="relative flex items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1.5 text-xs text-fuchsia-100 hover:bg-fuchsia-500/15"
                        title="Selected character reference"
                      >
                        {selectedCharacter.coverUrl ? (
                          <img src={selectedCharacter.coverUrl} alt={selectedCharacter.name} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-500">
                            <ScanFace className="h-4 w-4" />
                          </div>
                        )}
                        <span className="max-w-[160px] truncate font-semibold">{selectedCharacter.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedCharacterId(""); }}
                          className="ml-1 rounded-full bg-black/40 p-0.5 text-white/80 hover:text-white"
                          title="Clear character"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    ) : (
                      <a
                        href="/character"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
                        title="Create a character reference"
                      >
                        <ScanFace className="h-4 w-4 text-fuchsia-300" />
                        <span className="font-semibold">{t("Add character")}</span>
                      </a>
                    )
                  ) : null}

                  {canUseAnnualUnlimitedCreate ? (
                    <button
                      type="button"
                      onClick={() => setAnnualUnlimitedEnabled((value) => !value)}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
                        annualUnlimitedEnabled
                          ? "border-pink-400/30 bg-pink-500/10 text-pink-200"
                          : "border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-300",
                      )}
                      title={annualUnlimitedEnabled ? "Unlimited generation enabled" : "Use credits instead of unlimited"}
                    >
                      <span>{t("Unlimited")}</span>
                      <span
                        className={cn(
                          "relative h-5 w-9 rounded-full transition",
                          annualUnlimitedEnabled ? "bg-gradient-to-r from-pink-500 to-violet-500" : "bg-zinc-700",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                            annualUnlimitedEnabled ? "left-4" : "left-0.5",
                          )}
                        />
                      </span>
                    </button>
                  ) : null}

                  {referenceFiles.map((file, i) => {
                    const u = URL.createObjectURL(file);
                    return (
                      <div key={`${file.name}_${i}`} className="relative">
                        <img src={u} alt={file.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-violet-400/30" />
                        <button onClick={() => setReferenceFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-zinc-200"><X className="h-3 w-3" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl">
                {referenceFiles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-white/5">
                    {referenceFiles.map((file, i) => {
                      const u = URL.createObjectURL(file);
                      return (
                        <div key={`${file.name}_${i}`} className="relative">
                          <img src={u} alt={file.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-pink-400/30" />
                          <button onClick={() => setReferenceFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5 text-zinc-200 hover:text-white"><X className="h-3 w-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="w-full flex-1 min-h-[64px]">
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onPaste={(e) => { if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) { const pastedFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/")); if (pastedFiles.length > 0) { e.preventDefault(); setReferenceFiles(prev => [...prev, ...pastedFiles]); } } }} placeholder={composer.placeholder} disabled={!composer.promptEnabled} rows={Math.min(8, Math.max(3, prompt.split('\n').length))} className="w-full flex-1 resize-y bg-transparent p-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-60 overflow-y-auto leading-relaxed custom-scrollbar min-h-[64px] max-h-[220px]" />
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2 gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/30"><Sparkles className="h-4 w-4" /></div>
                    {activeTool === "create" && selectedModel.maxRefImages > 0 ? (
                      <>
                        <input type="file" multiple={selectedModel.maxRefImages > 1} accept="image/*" className="hidden" id="image-attach" onChange={handleAttach} />
                        <label htmlFor="image-attach" title={`Attach reference image (max ${selectedModel.maxRefImages})`} className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:text-zinc-200">
                          <Paperclip className="h-4 w-4" />
                          {selectedModel.maxRefImages > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white">{selectedModel.maxRefImages}</span>}
                        </label>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {prompt && (
                      <button onClick={() => setPrompt("")} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
                    )}
                    <button onClick={handleGenerate} disabled={!canGenerate} className={cn("btn-generate rounded-xl px-4 py-2 text-sm font-semibold shadow-md", !canGenerate && "cursor-not-allowed opacity-40")}>{generating ? t("Generate another") : composer.button}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/10 bg-black/25 lg:flex">
          <div className="border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-white"><SlidersHorizontal className="h-4 w-4 text-pink-400" /> {activeTool === "create" ? t("Image Settings") : activeTool === "enhance" ? t("Enhance Settings") : activeTool === "relight" ? t("Relight Settings") : activeTool === "inpaint" ? t("Inpaint Settings") : activeTool === "upscale" ? t("Upscale Settings") : t("Face Swap Settings")}</div></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">{renderRightPanel()}</div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/90 p-1.5 md:hidden">
          {TOOLS.map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => { setActiveTool(tool.id); setCompare(null); }} className={cn("rounded-xl px-2 py-1.5 text-[9px]", activeTool === tool.id ? "bg-white/10 text-pink-300" : "text-zinc-500")}><Icon className="mx-auto mb-0.5 h-4 w-4" />{t(tool.label)}</button>; })}
          <button onClick={() => setMobileSettingsOpen(true)} className="rounded-xl px-2 py-1.5 text-[9px] text-zinc-500"><Settings2 className="mx-auto mb-0.5 h-4 w-4" />{t("Settings")}</button>
        </div>

        <AnimatePresence>{mobileSettingsOpen ? <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileSettingsOpen(false)} /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-950 p-4 md:hidden"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-white">{t("Settings")}</p><button onClick={() => setMobileSettingsOpen(false)} className="rounded-lg bg-white/5 p-2 text-zinc-400"><X className="h-4 w-4" /></button></div><div className="space-y-4">{renderRightPanel()}</div></motion.div></> : null}</AnimatePresence>

        {/* Unified Reference Studio Modal */}
        <ReferenceStudioModal
          isOpen={showReferenceStudioModal}
          onClose={() => setShowReferenceStudioModal(false)}
          activeTab={activeStudioTab}
          setActiveTab={setActiveStudioTab}
          selectedStyle={selectedStyle}
          onSelectStyle={(id) => {
            setSelectedStyle(id);
            setShowReferenceStudioModal(false);
          }}
          selectedElementId={selectedElementId}
          onSelectElement={(id) => {
            setSelectedElementId(id);
            setShowReferenceStudioModal(false);
          }}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(id) => {
            setSelectedLocationId(id);
            setShowReferenceStudioModal(false);
          }}
          selectedCameraId={selectedCameraId}
          onSelectCamera={(id) => {
            setSelectedCameraId(id);
            setShowReferenceStudioModal(false);
          }}
          selectedEffectId={selectedEffectId}
          onSelectEffect={(id) => {
            setSelectedEffectId(id);
            setShowReferenceStudioModal(false);
          }}
          selectedCharacterId={selectedCharacterPresetId}
          onSelectCharacter={(id) => {
            setSelectedCharacterPresetId(id);
            setShowReferenceStudioModal(false);
          }}
          selectedSketchId={selectedSketchId}
          onSelectSketch={(id) => {
            setSelectedSketchId(id);
            setShowReferenceStudioModal(false);
          }}
          onSelectPalette={(pal) => {
            setSelectedPalette(pal);
          }}
          onAttachFile={(file) => {
            const targetUrl = file.url.startsWith("blob:") || file.url.startsWith("data:")
              ? file.url
              : `/api/proxy-image?url=${encodeURIComponent(file.url)}`;
            fetch(targetUrl)
              .then((r) => r.blob())
              .then((blob) => {
                const f = new File([blob], `${file.name || "ref"}.jpg`, { type: "image/jpeg" });
                setReferenceFiles((prev) => [...prev, f]);
              })
              .catch((err) => console.error("Failed to attach reference file:", err));
          }}
          isAr={lang === "ar"}
        />
      </div>

      <DeleteImageDialog
        open={deleteTargetIds.length > 0}
        count={deleteTargetIds.length}
        deleting={deletingImages}
        onCancel={cancelImageDelete}
        onConfirm={() => void confirmImageDelete()}
      />
      <AnimatePresence>{inspectorAsset ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 p-4" onClick={() => setInspectorAsset(null)}><motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}><AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} /></motion.div></motion.div> : null}</AnimatePresence>
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ChangeEvent, type DragEvent } from "react";
import {
  Aperture,
  ArrowUp,
  Brush,
  Camera,
  Check,
  ChevronDown,
  Download,
  Eye,
  ImageIcon,
  Lightbulb,
  Paperclip,
  ScanFace,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IMAGE_MODELS, type ImageModel } from "@/lib/image-models";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { useAssetStore } from "@/hooks/use-asset-store";
import { useSearchParams } from "next/navigation";

type ToolId = "create" | "relight" | "inpaint" | "upscale" | "face-swap";

type ResultItem = {
  id: string;
  url: string;
  tool: ToolId;
  model: string;
  prompt: string;
  aspect: string;
  isPending?: boolean;
};

const RATIO_OPTIONS = [
  { value: "1:1", width: 1024, height: 1024, cls: "ratio-1-1" },
  { value: "16:9", width: 1920, height: 1080, cls: "ratio-16-9" },
  { value: "9:16", width: 1080, height: 1920, cls: "ratio-9-16" },
  { value: "4:3", width: 1440, height: 1080, cls: "ratio-4-3" },
  { value: "3:4", width: 1080, height: 1440, cls: "ratio-3-4" },
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
  { id: "relight" as ToolId, label: "RELIGHT", icon: Lightbulb },
  { id: "inpaint" as ToolId, label: "INPAINT", icon: Brush },
  { id: "upscale" as ToolId, label: "UPSCALE", icon: Aperture },
  { id: "face-swap" as ToolId, label: "FACE SWAP", icon: ScanFace },
];

const EDIT_MODELS = IMAGE_MODELS.filter((m) =>
  ["google/nano-banana-edit", "seedream/4.5-edit", "gpt-image/1.5-image-to-image", "flux-2/pro-image-to-image"].includes(m.id),
);

const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
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
          : "border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[9px] font-bold tracking-wider">{label}</span>
    </button>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-400"><span>{label}</span><span>{value}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-pink-500" />
    </section>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
      <span>{label}</span>
      <span className={cn("inline-flex h-5 w-9 items-center rounded-full p-0.5 transition", checked ? "bg-pink-500" : "bg-zinc-700")}>
        <span className={cn("h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function CountSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => onChange(n)} className={cn("rounded-lg border py-2 text-sm", value === n ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{n}</button>
        ))}
      </div>
    </section>
  );
}

function ModelDropdown({ selected, onSelect }: { selected: ImageModel; onSelect: (m: ImageModel) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? IMAGE_MODELS.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
      : IMAGE_MODELS;
    const map = new Map<string, ImageModel[]>();
    for (const model of list) {
      if (!map.has(model.group)) map.set(model.group, []);
      map.get(model.group)?.push(model);
    }
    return Array.from(map.entries());
  }, [query]);

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
          <p className="truncate text-[10px] text-zinc-500">{selected.id}</p>
        </div>
        {selected.badge ? <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">{selected.badge}</span> : null}
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", open && "rotate-180")} />
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
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search model" className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none" />
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {grouped.map(([group, models], gi) => (
                  <div key={group} className={cn(gi > 0 && "border-t border-white/10")}>
                    <p className="px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">{group}</p>
                    {models.map((model) => (
                      <button key={model.id} onClick={() => { onSelect(model); setOpen(false); }} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.07]", selected.id === model.id && "bg-white/10")}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-100">{model.label}</p>
                          <p className="truncate text-[10px] text-zinc-500">{model.id}</p>
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
      {label ? <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{label}{required ? " *" : ""}</p> : null}
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
          <div className="flex flex-col items-center gap-1 text-zinc-500">
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

function ratioToNumber(ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return 1;
  return w / h;
}

type JustifiedRow = {
  height: number;
  items: Array<ResultItem & { ratio: number; width: number }>;
};

function buildJustifiedRows(
  items: ResultItem[],
  containerWidth: number,
  gap: number,
  targetHeight: number,
): JustifiedRow[] {
  if (!containerWidth || !items.length) return [];

  const rows: JustifiedRow[] = [];
  let current: Array<ResultItem & { ratio: number }> = [];
  let ratioSum = 0;

  const pushRow = (rowItems: Array<ResultItem & { ratio: number }>, forcedLast = false) => {
    if (!rowItems.length) return;
    const rowRatioSum = rowItems.reduce((sum, r) => sum + r.ratio, 0);
    const rawHeight = (containerWidth - gap * (rowItems.length - 1)) / rowRatioSum;
    const maxLastRow = Math.max(targetHeight, 220); // last row never shrinks below 220 or targetHeight
    const boundedHeight = forcedLast
      ? Math.max(120, Math.min(maxLastRow, rawHeight))
      : Math.max(100, Math.min(targetHeight * 1.5, rawHeight));
    rows.push({
      height: boundedHeight,
      items: rowItems.map((r) => ({ ...r, width: boundedHeight * r.ratio })),
    });
  };

  for (const item of items) {
    const ratio = ratioToNumber(item.aspect);
    current.push({ ...item, ratio });
    ratioSum += ratio;
    const estimatedWidth = ratioSum * targetHeight + gap * (current.length - 1);
    if (estimatedWidth >= containerWidth * 0.92) {
      pushRow(current, false);
      current = [];
      ratioSum = 0;
    }
  }

  if (current.length) pushRow(current, true);
  return rows;
}

function ResultGrid({ items, onInspect, onRemix, onDelete }: { items: ResultItem[]; onInspect: (asset: Asset) => void; onRemix: (item: ResultItem) => void; onDelete: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const resize = () => setContainerWidth(node.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!items.length) return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Start generating to see results.</div>;

  const w = Math.max(containerWidth, 320);
  // targetHeight adapts: few images → larger; many images → ~6 per row
  const targetHeight =
    items.length <= 2  ? Math.round(w * 0.44) :
    items.length <= 4  ? Math.round(w * 0.30) :
    items.length <= 8  ? Math.round(w * 0.22) :
    Math.max(150, Math.round((w - 5 * 8) / 6));
  const rows = buildJustifiedRows(items, w, 8, targetHeight);

  return (
    <div ref={containerRef} className="space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-2">
          {row.items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/10"
              style={{ width: item.width, height: row.height }}
              onClick={() => {
                if (item.isPending) return;
                onInspect({ type: "image", url: item.url, prompt: item.prompt, model: item.model, title: "Generated image" });
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
                <div className="rounded-full bg-pink-500/20 px-3 py-1 text-[11px] font-semibold text-pink-300 ring-1 ring-pink-400/30">Generating...</div>
                <div className="text-[11px] text-zinc-400">{item.model}</div>
              </div>
            </div>
          ) : (
            <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
          )}
          <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-zinc-200">{item.model} • {item.aspect}</div>
          {!item.isPending ? (
            <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/0 pb-3 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); onInspect({ type: "image", url: item.url, prompt: item.prompt, model: item.model, title: "Generated image" }); }} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Eye className="h-4 w-4" /></button>
              <a href={item.url} download onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Download className="h-4 w-4" /></a>
              <button onClick={(e) => { e.stopPropagation(); onRemix(item); }} className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20">Remix</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20">Delete</button>
            </div>
          ) : null}
        </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

function InpaintWorkspace({ source, setSource, brushSize, setBrushSize, maskVersion, setMaskVersion, registerMaskExporter }: { source: File | null; setSource: (f: File | null) => void; brushSize: number; setBrushSize: (v: number) => void; maskVersion: number; setMaskVersion: Dispatch<SetStateAction<number>>; registerMaskExporter: (fn: () => string | null) => void; }) {
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
    const ctx = mask.getContext("2d");
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
      const maskCtx = mask.getContext("2d");
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
    const ctx = mask.getContext("2d");
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
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const undo = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    ctx.putImageData(prev, 0, 0);
    setMaskVersion(maskVersion + 1);
  };

  const clearMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
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
        <button onClick={undo} className="rounded-lg bg-white/7 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">Undo</button>
        <button onClick={clearMask} className="rounded-lg bg-white/7 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">Clear Mask</button>
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">Brush
          <input type="range" min={5} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-28 accent-pink-500" />
          <span>{brushSize}px</span>
        </div>
      </div>
      <div className="relative flex h-[420px] items-center justify-center overflow-auto rounded-2xl border border-white/10 bg-black/40">
        {!source ? <p className="text-sm text-zinc-500">Upload image to start painting mask.</p> : null}
        <canvas ref={baseCanvasRef} className={cn(!source && "hidden")} />
        <canvas
          ref={maskCanvasRef}
          className={cn("absolute cursor-crosshair", !source && "hidden")}
          style={{ opacity: 0.4 }}
          onMouseDown={(e) => { isDrawingRef.current = true; saveUndo(); const p = pointFromEvent(e); paint(p.x, p.y); }}
          onMouseMove={(e) => { if (!isDrawingRef.current) return; const p = pointFromEvent(e); paint(p.x, p.y); }}
          onMouseUp={() => { isDrawingRef.current = false; lastPointRef.current = null; setMaskVersion(maskVersion + 1); }}
          onMouseLeave={() => { isDrawingRef.current = false; lastPointRef.current = null; }}
        />
      </div>
    </div>
  );
}

export default function ImageWorkspacePage() {
  const searchParams = useSearchParams();
  const guard = useAuthGuard();
  const { addAsset } = useAssetStore();

  const [activeTool, setActiveTool] = useState<ToolId>("create");
  const [selectedModel, setSelectedModel] = useState<ImageModel>(IMAGE_MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState("standard");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ResultItem[]>([]);
  const [compare, setCompare] = useState<{ before: string; after: string } | null>(null);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  useEffect(() => {
    const requestedTool = searchParams.get("tool");
    if (requestedTool && TOOLS.some((tool) => tool.id === requestedTool)) {
      setActiveTool(requestedTool as ToolId);
      setCompare(null);
    }

    const requestedModel = searchParams.get("model");
    if (requestedModel) {
      const model = IMAGE_MODELS.find((m) => m.id === requestedModel);
      if (model) setSelectedModel(model);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loadPersisted = async () => {
      try {
        const res = await fetch("/api/assets?type=image", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;

        const mapped: ResultItem[] = data.assets.map((asset: any) => ({
          id: asset.id,
          url: asset.url,
          tool: "create",
          model: asset.model || "Image",
          prompt: asset.prompt || "",
          aspect: asset.resolution || "1:1",
        }));
        setResults(mapped);
      } catch {
        // no-op: keep current state
      }
    };

    void loadPersisted();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRatio = useMemo(() => RATIO_OPTIONS.find((r) => r.value === aspectRatio) || RATIO_OPTIONS[0], [aspectRatio]);
  const createNeedsImage = selectedModel.inputType !== "text-to-image";

  const composer = useMemo(() => {
    if (activeTool === "create") {
      const perImage = createNeedsImage ? 3 : 2;
      return { placeholder: "Describe what you want to generate...", button: `Generate Image · ${perImage * numImages} cr`, promptEnabled: true };
    }
    if (activeTool === "relight") return { placeholder: "Describe the lighting you want...", button: `Relight Image ✦ ${3 * relightVariations}`, promptEnabled: true };
    if (activeTool === "inpaint") return { placeholder: "Describe what should replace the painted area...", button: `Inpaint ✦ ${3 * inpaintVariations}`, promptEnabled: true };
    if (activeTool === "upscale") return { placeholder: "Upload media to upscale", button: "Upscale Image ✦ 2", promptEnabled: false };
    return { placeholder: "Upload source face and target above", button: "Swap Face ✦ 4", promptEnabled: false };
  }, [activeTool, createNeedsImage, inpaintVariations, numImages, relightVariations]);

  useEffect(() => {
    setNumImages(Math.min(Math.max(1, numImages), selectedModel.maxImages));
    if (selectedModel.aspectRatios.length && !selectedModel.aspectRatios.includes(aspectRatio)) setAspectRatio(selectedModel.aspectRatios[0]);
  }, [selectedModel, numImages, aspectRatio]);

  const canGenerate = useMemo(() => {
    if (generating) return false;
    if (activeTool === "create") return Boolean(prompt.trim());
    if (activeTool === "relight") return Boolean(relightFile && prompt.trim());
    if (activeTool === "inpaint") return Boolean(inpaintFile && prompt.trim());
    if (activeTool === "upscale") return Boolean(upscaleFile);
    return Boolean(faceSource && faceTarget);
  }, [activeTool, faceSource, faceTarget, generating, inpaintFile, prompt, relightFile, upscaleFile]);

  const addResultItems = useCallback((urls: string[], tool: ToolId, model: string, p: string, aspect: string) => {
    const newItems = urls.map((url) => ({ id: uid("img"), url, tool, model, prompt: p, aspect }));
    setResults((prev) => [...newItems, ...prev]);
    newItems.forEach((item) => addAsset({ type: "image", url: item.url, prompt: item.prompt, model: item.model, resolution: item.aspect, title: item.prompt.slice(0, 60) }));
  }, [addAsset]);

  const generateCreate = useCallback(async () => {
    const maxRef = selectedModel.maxRefImages;
    const filesToSend = maxRef > 0 ? referenceFiles.slice(0, maxRef) : [];
    const imageUrls = await Promise.all(filesToSend.map(fileToDataUrl));
    const body: Record<string, unknown> = { prompt, modelId: selectedModel.id, aspectRatio, numImages, quality: quality || undefined };
    if (imageUrls.length > 0) {
      // Always send imageInputField so the route knows which API field to use
      if (selectedModel.imageInputField) body.imageInputField = selectedModel.imageInputField;
      if (imageUrls.length === 1) body.imageUrl = imageUrls[0];
      else body.imageUrls = imageUrls;
    }
    const res = await fetch("/api/generate/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
    const urls: string[] = data.imageUrls || [];
    addResultItems(urls, "create", selectedModel.label, prompt, aspectRatio);
  }, [addResultItems, aspectRatio, numImages, prompt, quality, referenceFiles, selectedModel]);

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
        imageUrl: imgData,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Relight failed");
    const urls: string[] = data.imageUrls || [];
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
        imageUrl: guideImage,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Inpaint failed");
    const urls: string[] = data.imageUrls || [];
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

  const handleGenerate = useCallback(async () => {
    if (!guard()) return;
    if (!canGenerate) return;
    const pendingCount = activeTool === "create" ? numImages : activeTool === "relight" ? relightVariations : activeTool === "inpaint" ? inpaintVariations : 1;
    const pendingModel = activeTool === "create" ? selectedModel.label : activeTool === "relight" ? "Seedream 4.5 Edit" : activeTool === "inpaint" ? inpaintModelId : activeTool === "upscale" ? "Upscaler" : "Face Swap";
    const pendingAspect = activeTool === "create" ? aspectRatio : "source";
    const pendingPrompt = prompt || "Generating...";
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
    setGenerating(true);
    setError(null);
    try {
      if (activeTool === "create") await generateCreate();
      if (activeTool === "relight") await generateRelight();
      if (activeTool === "inpaint") await generateInpaint();
      if (activeTool === "upscale") await generateUpscale();
      if (activeTool === "face-swap") await generateFaceSwap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPendingItems((prev) => prev.filter((item) => !placeholders.some((ph) => ph.id === item.id)));
      setGenerating(false);
    }
  }, [activeTool, aspectRatio, canGenerate, generateCreate, generateFaceSwap, generateInpaint, generateRelight, generateUpscale, guard, inpaintModelId, inpaintVariations, numImages, prompt, relightVariations, selectedModel.label]);

  const renderWorkspace = () => {
    if (activeTool === "create") return <ResultGrid items={[...pendingItems, ...results]} onInspect={setInspectorAsset} onRemix={(item) => { setActiveTool("create"); setPrompt(`Remix this style: ${item.prompt}`); }} onDelete={(id) => setResults((prev) => prev.filter((i) => i.id !== id))} />;
    if (activeTool === "inpaint") return <InpaintWorkspace source={inpaintFile} setSource={setInpaintFile} brushSize={brushSize} setBrushSize={setBrushSize} maskVersion={maskVersion} setMaskVersion={setMaskVersion} registerMaskExporter={(fn) => { maskExporterRef.current = fn; }} />;
    if (compare) return <CompareSlider before={compare.before} after={compare.after} />;
    return <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-500">{activeTool === "relight" ? "Upload image and relight" : activeTool === "upscale" ? "Upload media and upscale" : "Upload source and target images"}</div>;
  };

  const renderRightPanel = () => {
    if (activeTool === "create") {
      return <>
        <SettingsAccordion label="Model" summary={selectedModel.label} defaultOpen>
          <ModelDropdown selected={selectedModel} onSelect={setSelectedModel} />
        </SettingsAccordion>

        {selectedModel.aspectRatios.length ? (
          <SettingsAccordion label="Aspect Ratio" summary={aspectRatio} defaultOpen>
            <div className="grid grid-cols-3 gap-2">
              {RATIO_OPTIONS.filter((r) => selectedModel.aspectRatios.includes(r.value)).map((ratio) => (
                <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} className={cn("ratio-card", ratio.cls, aspectRatio === ratio.value && "active")}>
                  <span className="ratio-shape" /><span className="ratio-label">{ratio.value}</span>
                </button>
              ))}
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

        {selectedModel.qualityParam?.length ? (
          <SettingsAccordion label="Quality" summary={quality || selectedModel.qualityParam[0]} defaultOpen>
            <select
              value={quality || selectedModel.qualityParam[0]}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              {selectedModel.qualityParam.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </SettingsAccordion>
        ) : (
          <SettingsAccordion label="Quality" summary={quality || "1K"} defaultOpen>
            <select
              value={quality || "1K"}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0e0e1a] px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </SettingsAccordion>
        )}

        {selectedModel.maxRefImages > 0 ? (
          <SettingsAccordion label="Reference Image" summary={referenceFiles.length ? `${referenceFiles.length} attached` : undefined}>
            <UploadBox label="" file={referenceFiles[0] || null} onFile={(f) => setReferenceFiles(f ? [f] : [])} />
          </SettingsAccordion>
        ) : null}
      </>;
    }

    if (activeTool === "relight") {
      return <>
        <UploadBox label="Upload image to relight" file={relightFile} onFile={setRelightFile} required />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Lighting Preset</p><div className="grid grid-cols-3 gap-2">{LIGHTING_PRESETS.map((preset) => <button key={preset.id} onClick={() => setRelightPreset(preset.id)} className={cn("rounded-xl border px-2 py-2 text-left text-[11px]", relightPreset === preset.id ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{preset.name}</button>)}</div></section>
        <SliderField label="Brightness" value={relightBrightness} onChange={setRelightBrightness} />
        <SliderField label="Contrast" value={relightContrast} onChange={setRelightContrast} />
        <SliderField label="Temperature" value={relightTemperature} onChange={setRelightTemperature} />
        <SliderField label="Shadow Intensity" value={relightShadow} onChange={setRelightShadow} />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Light Direction</p><div className="grid grid-cols-3 gap-1.5 text-xs">{["nw", "n", "ne", "w", "center", "e", "sw", "s", "se"].map((d) => <button key={d} onClick={() => setRelightDirection(d)} className={cn("rounded-md border py-1.5", relightDirection === d ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-500")}>{d}</button>)}</div></section>
        <CountSelector label="Number of Variations" value={relightVariations} onChange={setRelightVariations} />
      </>;
    }

    if (activeTool === "inpaint") {
      return <>
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Edit Model</p><select value={inpaintModelId} onChange={(e) => setInpaintModelId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100">{EDIT_MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></section>
        <CountSelector label="Number of Variations" value={inpaintVariations} onChange={setInpaintVariations} />
        <SliderField label="Brush Size" value={brushSize} onChange={setBrushSize} min={5} max={100} />
      </>;
    }

    if (activeTool === "upscale") {
      return <>
        <UploadBox label="Upload image" file={upscaleFile} onFile={setUpscaleFile} required accept="image/*" />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Scale Factor</p><div className="grid grid-cols-2 gap-2">{[2, 4].map((n) => <button key={n} onClick={() => setUpscaleScale(n)} className={cn("rounded-xl border py-2 text-sm font-semibold", upscaleScale === n ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{n}x</button>)}</div></section>
        <ToggleField label="Denoise" checked={upDenoise} onChange={setUpDenoise} />
        <ToggleField label="Sharpen" checked={upSharpen} onChange={setUpSharpen} />
        <ToggleField label="Face Enhancement" checked={upFace} onChange={setUpFace} />
        <ToggleField label="Color Enhancement" checked={upColor} onChange={setUpColor} />
        <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Output Format</p><div className="grid grid-cols-3 gap-2">{(["png", "webp", "jpg"] as const).map((f) => <button key={f} onClick={() => setUpFormat(f)} className={cn("rounded-lg border py-2 text-sm uppercase", upFormat === f ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{f}</button>)}</div>{(upFormat === "jpg" || upFormat === "webp") ? <SliderField label="Quality" value={upQuality} onChange={setUpQuality} min={80} max={100} /> : null}</section>
      </>;
    }

    return <>
      <UploadBox label="Source face" file={faceSource} onFile={setFaceSource} required />
      <UploadBox label="Target image" file={faceTarget} onFile={setFaceTarget} required />
      <SliderField label="Face Blend" value={faceBlend} onChange={setFaceBlend} min={0} max={100} />
      <ToggleField label="Keep target expression" checked={faceExpression} onChange={setFaceExpression} />
      <ToggleField label="Match skin tones" checked={faceSkin} onChange={setFaceSkin} />
      <section className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Target Face Index</p><div className="grid grid-cols-4 gap-2">{[0,1,2,3].map((i) => <button key={i} onClick={() => setFaceIndex(i)} className={cn("rounded-lg border py-2 text-sm", faceIndex === i ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>{i+1}</button>)}</div></section>
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
        .ratio-1-1 .ratio-shape { width: 28px; height: 28px; }
        .ratio-16-9 .ratio-shape { width: 36px; height: 20px; }
        .ratio-9-16 .ratio-shape { width: 20px; height: 36px; }
        .ratio-4-3 .ratio-shape { width: 32px; height: 24px; }
        .ratio-3-4 .ratio-shape { width: 24px; height: 32px; }
        .ratio-21-9 .ratio-shape { width: 42px; height: 18px; }
        .ratio-label { margin-top: 4px; font-size: 10px; color: inherit; }
        .num-selector { display:flex; gap:8px; }
        .num-btn { width:48px; height:40px; border-radius:8px; border:1.5px solid rgba(255,255,255,.12); background:transparent; color:#7f8aa3; font-size:15px; font-weight:600; }
        .num-btn.active { background:#ec4899; border-color:#ec4899; color:#fff; }
        .btn-generate { background: linear-gradient(135deg, #ec4899, #be185d); color: white; font-weight: 700; font-size: 15px; border: none; transition: transform 0.15s, box-shadow 0.15s; }
        .btn-generate:hover { transform: scale(1.02); box-shadow: 0 0 24px rgba(236, 72, 153, 0.3); }
      `}</style>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 pb-[60px] md:pb-0">
        <aside className="hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-black/30 py-4 md:flex">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600/80 to-violet-600/80"><Camera className="h-4 w-4 text-white" /></div>
          {TOOLS.map((tool) => <ToolButton key={tool.id} active={activeTool === tool.id} icon={tool.icon} label={tool.label} onClick={() => { setActiveTool(tool.id); setCompare(null); }} />)}
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
                <div className="mb-2 flex items-center justify-center rounded-xl border border-dashed border-pink-400/50 bg-pink-500/5 py-2 text-xs text-pink-300">Drop images here to add as reference</div>
              ) : (
                <div className="mb-2 flex flex-wrap items-center gap-2 px-1">{referenceFiles.map((file, i) => { const u = URL.createObjectURL(file); return <div key={`${file.name}_${i}`} className="relative"><img src={u} alt={file.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-violet-400/30" /><button onClick={() => setReferenceFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-zinc-200"><X className="h-3 w-3" /></button></div>; })}</div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/30"><Sparkles className="h-4 w-4" /></div>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={composer.placeholder} disabled={!composer.promptEnabled} rows={1} className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-60" />
                {activeTool === "create" && selectedModel.maxRefImages > 0 ? (
                  <>
                    <input type="file" multiple={selectedModel.maxRefImages > 1} accept="image/*" className="hidden" id="image-attach" onChange={handleAttach} />
                    <label htmlFor="image-attach" title={`Attach reference image (max ${selectedModel.maxRefImages})`} className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:text-zinc-200">
                      <Paperclip className="h-4 w-4" />
                      {selectedModel.maxRefImages > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white">{selectedModel.maxRefImages}</span>}
                    </label>
                  </>
                ) : null}
                <button onClick={handleGenerate} disabled={!canGenerate} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", canGenerate ? "bg-pink-600 text-white" : "bg-white/5 text-zinc-600")}><ArrowUp className="h-4 w-4" /></button>
                <button onClick={handleGenerate} disabled={!canGenerate} className={cn("btn-generate rounded-xl px-4 py-2.5 text-sm", !canGenerate && "cursor-not-allowed opacity-40")}>{generating ? "Generating..." : composer.button}</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/10 bg-black/25 lg:flex">
          <div className="border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-white"><SlidersHorizontal className="h-4 w-4 text-pink-400" /> {activeTool === "create" ? "Image Settings" : activeTool === "relight" ? "Relight Settings" : activeTool === "inpaint" ? "Inpaint Settings" : activeTool === "upscale" ? "Upscale Settings" : "Face Swap Settings"}</div></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">{renderRightPanel()}</div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/90 p-1.5 md:hidden">
          {TOOLS.map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => { setActiveTool(tool.id); setCompare(null); }} className={cn("rounded-xl px-2 py-1.5 text-[9px]", activeTool === tool.id ? "bg-white/10 text-pink-300" : "text-zinc-500")}><Icon className="mx-auto mb-0.5 h-4 w-4" />{tool.label}</button>; })}
          <button onClick={() => setMobileSettingsOpen(true)} className="rounded-xl px-2 py-1.5 text-[9px] text-zinc-500"><Settings2 className="mx-auto mb-0.5 h-4 w-4" />Settings</button>
        </div>

        <AnimatePresence>{mobileSettingsOpen ? <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileSettingsOpen(false)} /><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-950 p-4 md:hidden"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-white">Settings</p><button onClick={() => setMobileSettingsOpen(false)} className="rounded-lg bg-white/5 p-2 text-zinc-400"><X className="h-4 w-4" /></button></div><div className="space-y-4">{renderRightPanel()}</div></motion.div></> : null}</AnimatePresence>
      </div>

      <AnimatePresence>{inspectorAsset ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 p-4" onClick={() => setInspectorAsset(null)}><motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}><AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} /></motion.div></motion.div> : null}</AnimatePresence>
    </>
  );
}

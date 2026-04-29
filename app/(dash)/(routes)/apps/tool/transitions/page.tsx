"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Film,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  MonitorPlay,
  RotateCcw,
  Save,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageLayout } from "@/lib/use-page-layout";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// ─── Types ────────────────────────────────────────────────────────────────────

type InputType = "image" | "video";

type ClientSafePreset = {
  id: string;
  name: string;
  category: string;
  previewVideoUrl: string;
  previewGradient: string;
  supportedInputs: string[];
  durationRange: [number, number];
  costMultiplier: number;
  engineType: string;
  motionProfile: string;
  description: string;
};

type TransitionProject = {
  id: string;
  title: string;
  inputAUrl: string | null;
  inputAType: string;
  inputBUrl: string | null;
  inputBType: string;
  presetId: string | null;
  aspectRatio: string;
  duration: number;
  intensity: number;
  smoothness: number;
  cinematicStr: number;
  preserveFraming: boolean;
  subjectFocus: boolean;
  resolution: string;
  fps: number;
  enhance: boolean;
  updatedAt?: string;
  jobs?: TransitionJob[];
  outputs?: TransitionOutput[];
};

type TransitionJob = {
  id: string;
  presetId: string;
  status: string;
  taskId: string | null;
  creditsCost: number;
  error: string | null;
  resultUrl: string | null;
  createdAt: string;
  output?: TransitionOutput | null;
};

type TransitionOutput = {
  id: string;
  url: string;
  presetId: string;
  presetName: string;
  aspectRatio: string;
  duration: number;
  inputAUrl: string | null;
  inputBUrl: string | null;
  createdAt: string;
  job?: { creditsCost: number };
};

type GenerationStatus = "idle" | "validating" | "queued" | "processing" | "completed" | "failed";

type Controls = {
  intensity: number;
  smoothness: number;
  cinematicStr: number;
  preserveFraming: boolean;
  subjectFocus: boolean;
  resolution: string;
  fps: number;
  enhance: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "saad_transitions_last_project";
const AUTOSAVE_INTERVAL = 4000;
const POLL_INTERVAL = 3500;

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const DURATIONS = [3, 4, 5, 6, 7, 8, 10];
const RESOLUTIONS = ["720p", "1080p", "1440p", "4K"];
const FPS_OPTIONS = [24, 30, 60];

const CATEGORY_LABELS: Record<string, string> = {
  transformation: "Transformation",
  fx_material: "FX / Material",
  camera_motion: "Camera / Motion",
  object_reveal: "Object / Reveal",
  stylized_special: "Stylized / Special",
};

const CATEGORY_ORDER = ["transformation", "fx_material", "camera_motion", "object_reveal", "stylized_special"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectMediaType(file: File): InputType {
  return file.type.startsWith("video/") ? "video" : "image";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractVideoFrame(videoSrc: string, position: "first" | "last"): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = videoSrc;
    video.onloadedmetadata = () => {
      video.currentTime = position === "last" ? Math.max(0, video.duration - 0.1) : 0;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    video.onerror = () => reject(new Error("Video load failed"));
  });
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GenerationStatus | string }) {
  const config: Record<string, { label: string; cls: string }> = {
    idle: { label: "Ready", cls: "text-slate-400 bg-slate-800/60 border-slate-700/40" },
    validating: { label: "Validating…", cls: "text-blue-400 bg-blue-950/40 border-blue-800/40" },
    queued: { label: "Queued", cls: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
    processing: { label: "Processing…", cls: "text-violet-400 bg-violet-950/40 border-violet-800/40" },
    completed: { label: "Completed", cls: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
    failed: { label: "Failed", cls: "text-red-400 bg-red-950/40 border-red-800/40" },
  };
  const c = config[status] ?? config.idle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border", c.cls)}>
      {(status === "processing" || status === "queued" || status === "validating") && (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      )}
      {c.label}
    </span>
  );
}

function RangeSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-bold text-slate-300 tabular-nums">{value}</span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-violet-400 pointer-events-none"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 6px)`,
            background: "#1e1b4b",
          }}
        />
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 group"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest group-hover:text-slate-100 transition-colors">{label}</p>
        {description && <p className="text-[9px] text-slate-600 mt-0.5">{description}</p>}
      </div>
      <div
        className={cn(
          "relative shrink-0 h-4 w-7 rounded-full transition-all duration-200",
          checked ? "bg-violet-600" : "bg-slate-700"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full transition-all duration-200",
            checked ? "left-3.5 bg-white" : "left-0.5 bg-slate-400"
          )}
        />
      </div>
    </button>
  );
}

function ChipSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150",
              value === opt
                ? "bg-violet-700/80 text-violet-100 border border-violet-500/50"
                : "bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-200"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Input Slot ───────────────────────────────────────────────────────────────

function InputSlot({
  label,
  slot,
  mediaUrl,
  mediaType,
  frameReady,
  onFile,
  onClear,
  onUrlPaste,
}: {
  label: string;
  slot: "A" | "B";
  mediaUrl: string | null;
  mediaType: InputType;
  frameReady?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onUrlPaste: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const commitUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed.startsWith("http")) {
      onUrlPaste(trimmed);
      setUrlInput("");
      setUrlMode(false);
    }
  };

  const slotColor = slot === "A" ? "#7c3aed" : "#4f46e5";

  if (mediaUrl) {
    const isVideo = mediaType === "video";
    return (
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {isVideo ? (
          <video src={mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt={label} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 h-5 w-5 rounded flex items-center justify-center text-[9px] font-black text-white" style={{ background: slotColor }}>
          {slot}
        </div>
        <button
          onClick={onClear}
          className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <X className="h-2.5 w-2.5 text-white/80" />
        </button>
        <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
          {isVideo ? <Video className="h-2.5 w-2.5 text-white/50" /> : <ImageIcon className="h-2.5 w-2.5 text-white/50" />}
          <span className="text-[8px] text-white/50">{mediaType}</span>
          {isVideo && frameReady && (
            <span className="text-[8px] text-emerald-400 font-semibold">· frame ✓</span>
          )}
          {isVideo && !frameReady && (
            <span className="text-[8px] text-amber-400 font-semibold">· extracting…</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <AnimatePresence mode="wait">
        {urlMode ? (
          <motion.div
            key="url"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-2.5 space-y-2"
            style={{ border: "1px solid rgba(148,163,184,0.1)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Input {slot} — URL</p>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitUrl()}
              placeholder="https://…"
              className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-600 outline-none"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={commitUrl}
                className="flex-1 py-1 rounded text-[10px] font-semibold text-violet-300 transition-colors"
                style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
              >
                Use URL
              </button>
              <button
                onClick={() => setUrlMode(false)}
                className="px-2 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all duration-150 relative"
            style={{
              aspectRatio: "4/3",
              border: drag ? `1.5px dashed ${slotColor}55` : "1.5px dashed rgba(148,163,184,0.1)",
              background: drag ? `${slotColor}08` : "rgba(255,255,255,0.015)",
            }}
          >
            <div className="absolute top-1.5 left-1.5 h-4 w-4 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ background: slotColor }}>
              {slot}
            </div>
            <Upload className="h-4 w-4 text-slate-600" />
            <p className="text-[9px] text-slate-600">Drop or click</p>
          </motion.div>
        )}
      </AnimatePresence>
      {!urlMode && (
        <button
          onClick={() => setUrlMode(true)}
          className="w-full text-[9px] text-slate-700 hover:text-slate-400 transition-colors flex items-center justify-center gap-1"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Paste a URL
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
    </div>
  );
}

// ─── Preset Card ──────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  selected,
  creditEstimate,
  onClick,
}: {
  preset: ClientSafePreset;
  selected: boolean;
  creditEstimate: number;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setHovering(true);
        if (videoRef.current && preset.previewVideoUrl && !videoError) {
          videoRef.current.play().catch(() => {});
        }
      }}
      onMouseLeave={() => {
        setHovering(false);
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      }}
      className="w-full text-left rounded-xl overflow-hidden transition-all duration-200 group"
      style={{
        border: selected ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.05)",
        background: selected ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)",
        boxShadow: selected ? "0 0 0 1px rgba(124,58,237,0.25) inset" : "none",
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {preset.previewVideoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={preset.previewVideoUrl}
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn("w-full h-full bg-gradient-to-br transition-transform duration-500", preset.previewGradient, hovering && "scale-105")}>
            <AnimatePresence>
              {hovering && (
                <motion.div
                  initial={{ x: "-100%", opacity: 0.5 }}
                  animate={{ x: "200%", opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)" }}
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className={cn("h-4 w-4 transition-opacity duration-200", hovering ? "opacity-60" : "opacity-20", "text-white")} />
            </div>
          </div>
        )}
        {selected && (
          <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        <div
          className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", color: "#a78bfa" }}
        >
          <Zap className="h-2 w-2" />
          {creditEstimate}
        </div>
      </div>
      <div className="p-2">
        <p className="text-[11px] font-bold text-slate-200 group-hover:text-white transition-colors leading-tight truncate">
          {preset.name}
        </p>
        <p className="text-[9px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">{preset.description}</p>
      </div>
    </motion.button>
  );
}

// ─── Output Card (bottom strip) ───────────────────────────────────────────────

function OutputCard({
  output,
  active,
  onSelect,
  onReuseAsA,
  onReuseAsB,
  onOpenEditor,
  onDownload,
}: {
  output: TransitionOutput;
  active: boolean;
  onSelect: () => void;
  onReuseAsA: () => void;
  onReuseAsB: () => void;
  onOpenEditor: () => void;
  onDownload: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <motion.div
      className="shrink-0 relative rounded-xl overflow-hidden cursor-pointer"
      style={{
        width: 150,
        border: active ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.07)",
        background: active ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
      }}
      onClick={onSelect}
      onMouseEnter={() => {
        setHovered(true);
        videoRef.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <video ref={videoRef} src={output.url} muted loop playsInline className="w-full h-full object-cover" />
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-end justify-center gap-1 p-1"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={onReuseAsA} title="Reuse as A" className="flex-1 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: "rgba(124,58,237,0.5)" }}>→A</button>
              <button onClick={onReuseAsB} title="Reuse as B" className="flex-1 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: "rgba(79,70,229,0.5)" }}>→B</button>
              <button onClick={onDownload} className="h-5 w-5 rounded flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                <Download className="h-2.5 w-2.5 text-white/80" />
              </button>
              <button onClick={onOpenEditor} className="h-5 w-5 rounded flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                <ExternalLink className="h-2.5 w-2.5 text-white/80" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="p-1.5">
        <p className="text-[9px] font-semibold text-slate-300 truncate">{output.presetName}</p>
        <p className="text-[8px] text-slate-600 mt-0.5">{formatRelativeTime(output.createdAt)}</p>
      </div>
    </motion.div>
  );
}

// ─── Processing Stage ─────────────────────────────────────────────────────────

function ProcessingStage({ status, error, onReset }: { status: GenerationStatus; error: string | null; onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full w-full">
      {(status === "processing" || status === "queued" || status === "validating") && (
        <>
          <div className="relative h-16 w-16">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid rgba(124,58,237,0.15)" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "#7c3aed" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-1.5 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "#a78bfa" }}
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">
              {status === "validating" && "Validating inputs…"}
              {status === "queued" && "Queued for generation…"}
              {status === "processing" && "Generating transition…"}
            </p>
            <p className="text-xs text-slate-600 mt-1.5">This typically takes 30–90 seconds</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="h-1 w-1 rounded-full bg-violet-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
            >
              <RotateCcw className="h-3 w-3" />
              Cancel / Start Over
            </button>
          )}
        </>
      )}
      {status === "failed" && (
        <>
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <X className="h-6 w-6 text-red-400" />
          </div>
          <div className="text-center max-w-xs px-4">
            <p className="text-sm font-semibold text-red-400">Generation Failed</p>
            {error && <p className="text-xs text-slate-500 mt-1.5 break-words leading-relaxed">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransitionsStudioPage() {
  const { hero } = usePageLayout("apps-tool-transitions");
  const {
    guardGeneration,
    getSafeErrorMessage,
    insufficientCreditsMessage,
  } = useGenerationGate();
  // Project
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("Untitled Transition");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Inputs
  const [inputAUrl, setInputAUrl] = useState<string | null>(null);
  const [inputAType, setInputAType] = useState<InputType>("image");
  const [inputAFrameUrl, setInputAFrameUrl] = useState<string | null>(null);
  const [inputBUrl, setInputBUrl] = useState<string | null>(null);
  const [inputBType, setInputBType] = useState<InputType>("image");
  const [inputBFrameUrl, setInputBFrameUrl] = useState<string | null>(null);

  // Settings
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [controls, setControls] = useState<Controls>({
    intensity: 50,
    smoothness: 60,
    cinematicStr: 65,
    preserveFraming: true,
    subjectFocus: true,
    resolution: "1080p",
    fps: 24,
    enhance: true,
  });

  // UI
  const [presets, setPresets] = useState<ClientSafePreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [rightTab, setRightTab] = useState<"presets" | "controls">("presets");
  const [leftTab, setLeftTab] = useState<"inputs" | "history">("inputs");

  // Generation
  const [genStatus, setGenStatus] = useState<GenerationStatus>("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditEstimate, setCreditEstimate] = useState(0);

  // Outputs
  const [outputs, setOutputs] = useState<TransitionOutput[]>([]);
  const [currentOutput, setCurrentOutput] = useState<TransitionOutput | null>(null);
  const [stageMode, setStageMode] = useState<"input" | "output">("input");
  const [gallerySaved, setGallerySaved] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const projectIdRef = useRef<string | null>(null);
  projectIdRef.current = projectId;

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load presets
    fetch("/api/transitions/presets")
      .then((r) => { if (!r.ok) throw new Error("presets fetch failed"); return r.json(); })
      .then((d) => setPresets(Array.isArray(d.presets) ? d.presets : []))
      .catch(() => {})
      .finally(() => setPresetsLoading(false));

    // Load credit balance
    fetch("/api/admin/users/me")
      .then((r) => r.json())
      .then((d) => { if (typeof d?.creditBalance === "number") setCreditBalance(d.creditBalance); })
      .catch(() => {});

    // Restore session
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { projectId: pid } = JSON.parse(saved) as { projectId?: string };
        if (pid) {
          setProjectId(pid);
          fetch(`/api/transitions/project/${pid}`)
            .then((r) => {
              if (r.status === 404) {
                // Stale project — clear localStorage so we start fresh
                localStorage.removeItem(STORAGE_KEY);
                setProjectId(null);
                return null;
              }
              return r.json();
            })
            .then((d) => {
              if (!d || !d.project) return;
              const p: TransitionProject = d.project;
              setProjectTitle(p.title);
              if (p.inputAUrl && !p.inputAUrl.startsWith("__")) setInputAUrl(p.inputAUrl);
              setInputAType((p.inputAType as InputType) ?? "image");
              if (p.inputBUrl && !p.inputBUrl.startsWith("__")) setInputBUrl(p.inputBUrl);
              setInputBType((p.inputBType as InputType) ?? "image");
              setSelectedPresetId(p.presetId);
              setAspectRatio(p.aspectRatio);
              setDuration(p.duration);
              setControls({
                intensity: p.intensity,
                smoothness: p.smoothness,
                cinematicStr: p.cinematicStr,
                preserveFraming: p.preserveFraming,
                subjectFocus: p.subjectFocus,
                resolution: p.resolution,
                fps: p.fps,
                enhance: p.enhance,
              });
              if (p.outputs?.length) {
                setOutputs(p.outputs);
                setCurrentOutput(p.outputs[0]);
              }
              const lastJob = p.jobs?.[0];
              if (lastJob?.status === "completed" && p.outputs?.[0]) {
                setStageMode("output");
                setGenStatus("completed");
              } else if (lastJob && (lastJob.status === "processing" || lastJob.status === "queued")) {
                // Only resume polling if job was created within the last 10 minutes
                const jobAge = Date.now() - new Date(lastJob.createdAt).getTime();
                if (jobAge < 10 * 60 * 1000) {
                  setCurrentJobId(lastJob.id);
                  setGenStatus("processing");
                }
                // else: job is stale — leave as idle so user can start fresh
              }
            })
            .catch(() => {});
        }
      }
    } catch (_) {}
  }, []);

  // ── Credit estimate ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedPresetId || !presets.length) { setCreditEstimate(0); return; }
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (preset) setCreditEstimate(Math.ceil(4 * duration * preset.costMultiplier));
  }, [selectedPresetId, duration, presets]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const markDirty = useCallback(() => { isDirtyRef.current = true; }, []);

  useEffect(() => { markDirty(); }, [selectedPresetId, aspectRatio, duration, controls, markDirty]);

  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      if (!isDirtyRef.current) return;
      isDirtyRef.current = false;
      setAutoSaveStatus("saving");
      const pid = projectIdRef.current;
      const body = { title: projectTitle, presetId: selectedPresetId, aspectRatio, duration, ...controls };
      try {
        if (pid) {
          await fetch(`/api/transitions/project/${pid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          const res = await fetch("/api/transitions/project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (data.project?.id) {
            setProjectId(data.project.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: data.project.id }));
          }
        }
        setAutoSaveStatus("saved");
      } catch (_) {
        setAutoSaveStatus("idle");
        return;
      }
      setTimeout(() => setAutoSaveStatus("idle"), 2200);
    }, AUTOSAVE_INTERVAL);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [projectTitle, selectedPresetId, aspectRatio, duration, controls]);

  // ── Polling ────────────────────────────────────────────────────────────────

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/transitions/job/${jobId}`);
      const data = await res.json();
      const job: TransitionJob = data.job;
      if (!job) return;
      if (job.status === "completed" && job.output) {
        setGenStatus("completed");
        setCurrentOutput(job.output);
        setOutputs((prev) => [job.output!, ...prev.filter((o) => o.id !== job.output!.id)]);
        setStageMode("output");
        setCreditBalance((b) => (b !== null ? Math.max(0, b - job.creditsCost) : null));
        setGallerySaved(true);
        setTimeout(() => setGallerySaved(false), 5000);
      } else if (job.status === "failed") {
        setGenStatus("failed");
        setGenError(getSafeErrorMessage(job.error ?? "Generation failed. Please try again."));
      } else {
        pollRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL);
      }
    } catch (_) {
      pollRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL * 2);
    }
  }, [getSafeErrorMessage]);

  useEffect(() => {
    if (currentJobId && (genStatus === "processing" || genStatus === "queued")) {
      pollRef.current = setTimeout(() => pollJob(currentJobId), POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [currentJobId, genStatus, pollJob]);

  // ── Reset (cancel stuck generation) ───────────────────────────────────────

  const handleReset = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setGenStatus("idle");
    setGenError(null);
    setCurrentJobId(null);
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────────

  const handleFileA = async (file: File) => {
    const base64 = await fileToBase64(file);
    const type = detectMediaType(file);
    setInputAType(type);
    setInputAUrl(base64);
    if (type === "video") {
      const frame = await extractVideoFrame(base64, "first").catch(() => null);
      setInputAFrameUrl(frame);
    } else {
      setInputAFrameUrl(null);
    }
    markDirty();
  };

  const handleFileB = async (file: File) => {
    const base64 = await fileToBase64(file);
    const type = detectMediaType(file);
    setInputBType(type);
    setInputBUrl(base64);
    if (type === "video") {
      const frame = await extractVideoFrame(base64, "last").catch(() => null);
      setInputBFrameUrl(frame);
    } else {
      setInputBFrameUrl(null);
    }
    markDirty();
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!inputAUrl || !inputBUrl) { alert("Please add both Input A and Input B."); return; }
    if (!selectedPresetId) { setRightTab("presets"); return; }

    const gate = await guardGeneration({
      requiredCredits: creditEstimate,
      action: "apps:transitions",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setGenStatus("failed");
        setGenError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setGenStatus("validating");
    setGenError(null);
    setStageMode("input");

    try {
      let pid = projectIdRef.current;
      if (!pid) {
        const pRes = await fetch("/api/transitions/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: projectTitle }),
        });
        const pData = await pRes.json();
        pid = pData.project?.id ?? null;
        if (pid) {
          setProjectId(pid);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: pid }));
        }
      }
      if (!pid) throw new Error("Failed to create project.");

      // Save input URLs (non-base64) to project
      await fetch(`/api/transitions/project/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputAUrl: inputAUrl.startsWith("data:") ? "__local__" : inputAUrl,
          inputAType,
          inputBUrl: inputBUrl.startsWith("data:") ? "__local__" : inputBUrl,
          inputBType,
          presetId: selectedPresetId,
          aspectRatio,
          duration,
          ...controls,
        }),
      });

      setGenStatus("queued");

      const res = await fetch("/api/transitions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pid,
          presetId: selectedPresetId,
          inputAUrl: inputAFrameUrl ?? inputAUrl,
          inputBUrl: inputBFrameUrl ?? inputBUrl,
          duration,
          aspectRatio,
          ...controls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setGenStatus("failed");
          setGenError(insufficientCreditsMessage);
          return;
        }
        throw new Error(data.error ?? "Generation failed");
      }

      setCurrentJobId(data.jobId);
      setGenStatus("processing");
      if (typeof data.remainingCredits === "number") setCreditBalance(data.remainingCredits);
    } catch (err) {
      setGenStatus("failed");
      setGenError(getSafeErrorMessage(err));
    }
  };

  // ── Output actions ─────────────────────────────────────────────────────────

  const handleReuseAsA = (output: TransitionOutput) => {
    setInputAUrl(output.url);
    setInputAType("video");
    setStageMode("input");
    setGenStatus("idle");
    markDirty();
  };

  const handleReuseAsB = (output: TransitionOutput) => {
    setInputBUrl(output.url);
    setInputBType("video");
    setStageMode("input");
    setGenStatus("idle");
    markDirty();
  };

  const handleOpenEditor = async (output: TransitionOutput) => {
    const res = await fetch("/api/transitions/send-to-editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputId: output.id }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      if (data.editorUrl) window.open(data.editorUrl, "_blank");
    }
  };

  const handleDownload = (output: TransitionOutput) => {
    const a = document.createElement("a");
    a.href = output.url;
    a.download = `saad-transition-${output.presetId}.mp4`;
    a.target = "_blank";
    a.click();
  };

  // ── Filtered presets ───────────────────────────────────────────────────────

  const filteredPresets = useMemo(() => {
    if (activeCategory === "all") return presets;
    return presets.filter((p) => p.category === activeCategory);
  }, [presets, activeCategory]);

  const selectedPreset = useMemo(() => presets.find((p) => p.id === selectedPresetId) ?? null, [presets, selectedPresetId]);
  const isGenerating = genStatus === "processing" || genStatus === "queued" || genStatus === "validating";
  const canGenerate = !isGenerating && !!inputAUrl && !!inputBUrl && !!selectedPresetId;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 64px)", background: "#050911", color: "#e2e8f0" }}
    >
      {/* ══ TOP BAR ════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-2 px-4 h-12 shrink-0 z-20"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(5,9,17,0.97)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Back to dashboard */}
        <a
          href="/explore"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-300 transition-colors shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="hidden sm:block">Back</span>
        </a>

        {/* Studio brand */}
        <div className="flex items-center gap-2 mr-2">
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[11px] font-black text-white uppercase tracking-widest hidden sm:block">Transitions</span>
        </div>

        {hero?.title ? (
          <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-lg border border-violet-500/20 bg-violet-500/10 mr-2">
            <span className="text-[10px] font-semibold text-violet-200 truncate max-w-[220px]">{hero.title}</span>
          </div>
        ) : null}

        {/* Title */}
        <input
          value={projectTitle}
          onChange={(e) => { setProjectTitle(e.target.value); markDirty(); }}
          className="bg-transparent text-xs font-semibold text-slate-300 outline-none max-w-[140px] truncate"
          placeholder="Project title…"
        />

        {/* Auto-save */}
        <div className="flex items-center gap-1 shrink-0">
          {autoSaveStatus === "saving" && <Loader2 className="h-3 w-3 text-slate-600 animate-spin" />}
          {autoSaveStatus === "saved" && <Check className="h-2.5 w-2.5 text-emerald-500" />}
          {autoSaveStatus === "idle" && <Save className="h-2.5 w-2.5 text-slate-700" />}
          <span className="text-[9px] text-slate-700 hidden sm:block">
            {autoSaveStatus === "saving" ? "Saving…" : autoSaveStatus === "saved" ? "Saved" : "Auto-save"}
          </span>
        </div>

        <div className="flex-1" />

        <StatusBadge status={genStatus} />

        {/* Aspect ratio picker */}
        <div className="relative group">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
          >
            {aspectRatio}
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          <div
            className="absolute top-full mt-1 right-0 rounded-lg py-1 z-30 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
            style={{ background: "#0d1321", border: "1px solid rgba(255,255,255,0.08)", minWidth: 70 }}
          >
            {ASPECT_RATIOS.map((ar) => (
              <button key={ar} onClick={() => { setAspectRatio(ar); markDirty(); }} className={cn("w-full text-left px-3 py-1 text-[10px] font-semibold transition-colors", ar === aspectRatio ? "text-violet-400" : "text-slate-400 hover:text-white")}>
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Duration picker */}
        <div className="relative group">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
          >
            {duration}s
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          <div
            className="absolute top-full mt-1 right-0 rounded-lg py-1 z-30 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
            style={{ background: "#0d1321", border: "1px solid rgba(255,255,255,0.08)", minWidth: 55 }}
          >
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => { setDuration(d); markDirty(); }} className={cn("w-full text-left px-3 py-1 text-[10px] font-semibold transition-colors", d === duration ? "text-violet-400" : "text-slate-400 hover:text-white")}>
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-1 px-2 py-1 rounded shrink-0" style={{ border: "1px solid rgba(167,139,250,0.2)", background: "rgba(124,58,237,0.08)" }}>
          <Zap className="h-3 w-3 text-violet-400" />
          <span className="text-[10px] font-bold text-violet-300">{creditBalance !== null ? creditBalance : "—"}</span>
        </div>

        {/* Generate */}
        <motion.button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
            canGenerate ? "text-white" : "opacity-40 cursor-not-allowed text-slate-400"
          )}
          style={
            canGenerate
              ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.35)" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
          }
          whileHover={canGenerate ? { scale: 1.02 } : {}}
          whileTap={canGenerate ? { scale: 0.98 } : {}}
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {isGenerating ? "Generating…" : `Generate${creditEstimate > 0 ? ` · ${creditEstimate}` : ""}`}
        </motion.button>

        {currentOutput && (
          <>
            <button
              onClick={() => handleDownload(currentOutput)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Download className="h-3 w-3" /> Export
            </button>
            <button
              onClick={() => handleOpenEditor(currentOutput)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-violet-300 hover:text-violet-100 transition-colors"
              style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)" }}
            >
              <ExternalLink className="h-3 w-3" /> Open in Editor
            </button>
          </>
        )}
      </div>

      {/* ══ MAIN AREA ══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="w-[290px] shrink-0 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {(["inputs", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-colors",
                  leftTab === tab ? "text-violet-400" : "text-slate-600 hover:text-slate-400"
                )}
                style={leftTab === tab ? { borderBottom: "2px solid #7c3aed" } : {}}
              >
                {tab === "inputs" ? <Upload className="h-3 w-3" /> : <History className="h-3 w-3" />}
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
            <AnimatePresence mode="wait">
              {leftTab === "inputs" ? (
                <motion.div key="inputs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <InputSlot
                    label="Input A"
                    slot="A"
                    mediaUrl={inputAUrl}
                    mediaType={inputAType}
                    frameReady={inputAType === "video" ? !!inputAFrameUrl : undefined}
                    onFile={handleFileA}
                    onClear={() => { setInputAUrl(null); setInputAFrameUrl(null); markDirty(); }}
                    onUrlPaste={(url) => { setInputAUrl(url); setInputAType("image"); markDirty(); }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                      <span className="text-[8px] font-black text-violet-400">→</span>
                    </div>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                  <InputSlot
                    label="Input B"
                    slot="B"
                    mediaUrl={inputBUrl}
                    mediaType={inputBType}
                    frameReady={inputBType === "video" ? !!inputBFrameUrl : undefined}
                    onFile={handleFileB}
                    onClear={() => { setInputBUrl(null); setInputBFrameUrl(null); markDirty(); }}
                    onUrlPaste={(url) => { setInputBUrl(url); setInputBType("image"); markDirty(); }}
                  />

                  {selectedPreset && (
                    <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider truncate">{selectedPreset.name}</p>
                        <span className="text-[8px] font-bold text-violet-300 shrink-0 flex items-center gap-0.5"><Zap className="h-2 w-2" />{creditEstimate}</span>
                      </div>
                      <p className="text-[8px] text-slate-600 leading-relaxed line-clamp-2">{selectedPreset.description}</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  {outputs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <History className="h-6 w-6 text-slate-700" />
                      <p className="text-[10px] text-slate-600">No outputs yet</p>
                    </div>
                  ) : outputs.map((output) => (
                    <motion.div
                      key={output.id}
                      className="rounded-xl overflow-hidden cursor-pointer group"
                      style={{
                        border: currentOutput?.id === output.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.05)",
                        background: currentOutput?.id === output.id ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
                      }}
                      onClick={() => { setCurrentOutput(output); setStageMode("output"); }}
                      whileHover={{ y: -1 }}
                    >
                      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                        <video src={output.url} muted loop playsInline className="w-full h-full object-cover" />
                      </div>
                      <div className="p-1.5">
                        <p className="text-[9px] font-semibold text-slate-300 truncate">{output.presetName}</p>
                        <p className="text-[8px] text-slate-600 mt-0.5">{formatRelativeTime(output.createdAt)}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── CENTER STAGE ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Stage tabs */}
          <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <button
              onClick={() => setStageMode("input")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all", stageMode === "input" ? "text-white" : "text-slate-600 hover:text-slate-400")}
              style={stageMode === "input" ? { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" } : {}}
            >
              <Layers className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => { if (currentOutput) setStageMode("output"); }}
              disabled={!currentOutput}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all", stageMode === "output" ? "text-white" : "text-slate-600 hover:text-slate-400", !currentOutput && "opacity-30 cursor-not-allowed")}
              style={stageMode === "output" ? { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" } : {}}
            >
              <MonitorPlay className="h-3 w-3" />
              Output
              {currentOutput && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          {/* Stage content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {isGenerating || (genStatus === "failed" && !currentOutput) ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex items-center justify-center rounded-2xl"
                  style={{ border: "1px solid rgba(124,58,237,0.12)", background: "rgba(124,58,237,0.03)" }}
                >
                  <ProcessingStage status={genStatus} error={genError} onReset={handleReset} />
                </motion.div>
              ) : stageMode === "output" && currentOutput ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center w-full max-h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800 pb-4"
                  style={{ maxWidth: 900 }}
                >
                  {/* Video */}
                  <div className="relative w-full">
                    <video
                      src={currentOutput.url}
                      controls
                      autoPlay
                      loop
                      muted
                      className="rounded-2xl w-full"
                      style={{ boxShadow: "0 0 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07)" }}
                    />
                    {/* Top-left meta */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
                      <Film className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-[10px] font-bold text-slate-200">{currentOutput.presetName}</span>
                      <span className="text-[9px] text-slate-500">· {currentOutput.duration}s · {currentOutput.aspectRatio}</span>
                    </div>
                    {/* Top-right actions */}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button
                        onClick={() => handleDownload(currentOutput)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-colors hover:bg-white/10"
                        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      <button
                        onClick={() => handleOpenEditor(currentOutput)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-violet-300 transition-all hover:text-violet-100"
                        style={{ background: "rgba(124,58,237,0.3)", backdropFilter: "blur(8px)", border: "1px solid rgba(124,58,237,0.4)" }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open in Editor
                      </button>
                    </div>
                    {/* Gallery saved badge */}
                    <AnimatePresence>
                      {gallerySaved && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                          style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)", backdropFilter: "blur(8px)" }}
                        >
                          <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-300">Saved to Gallery</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Use in other tools row */}
                  <div className="mt-4 w-full rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />Use this video in other tools
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Lipsync Studio", href: "/video/lipsync", emoji: "🎙️", desc: "Add lip-synced audio" },
                        { label: "Next Scene", href: "/video/cinema-studio", emoji: "🎬", desc: "Cinematic production" },
                        { label: "Video Editor", href: "/video/edit", emoji: "✂️", desc: "AI timeline editing" },
                        { label: "Video Upscale", href: "/video/upscale", emoji: "⬆️", desc: "Enhance to 4K/8K" },
                        { label: "Mixed Media", href: "/video/mixed-media", emoji: "🎭", desc: "Combine visual styles" },
                        { label: "View in Gallery", href: "/gallery", emoji: "🗂️", desc: "All your creations" },
                      ].map((tool) => (
                        <a
                          key={tool.href}
                          href={tool.href}
                          className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all hover:scale-[1.03] group"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <span className="text-lg">{tool.emoji}</span>
                          <span className="text-[9px] font-bold text-slate-300 text-center leading-tight group-hover:text-violet-300 transition-colors">{tool.label}</span>
                          <span className="text-[7px] text-slate-600 text-center">{tool.desc}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex items-center justify-center gap-4"
                >
                  {/* A preview */}
                  <div
                    className="flex-1 max-w-[380px] rounded-2xl overflow-hidden relative"
                    style={{ aspectRatio: "16/9", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                  >
                    {inputAUrl ? (
                      inputAType === "video"
                        ? <video src={inputAUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                        : <img src={inputAUrl} alt="A" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-base font-black text-white" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>A</div>
                        <p className="text-[9px] text-slate-600">Add Input A</p>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 h-5 w-5 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ background: "#7c3aed" }}>A</div>
                  </div>

                  {/* Center arrow with preset name */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-center"
                      style={{
                        background: selectedPreset ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                        border: selectedPreset ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        color: selectedPreset ? "#a78bfa" : "#475569",
                        maxWidth: 120,
                      }}
                    >
                      {selectedPreset ? selectedPreset.name : "Select preset →"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-px w-4" style={{ background: "rgba(124,58,237,0.4)" }} />
                      <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                        <span className="text-[9px] font-black text-violet-400">→</span>
                      </div>
                      <div className="h-px w-4" style={{ background: "rgba(79,70,229,0.4)" }} />
                    </div>
                  </div>

                  {/* B preview */}
                  <div
                    className="flex-1 max-w-[380px] rounded-2xl overflow-hidden relative"
                    style={{ aspectRatio: "16/9", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                  >
                    {inputBUrl ? (
                      inputBType === "video"
                        ? <video src={inputBUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                        : <img src={inputBUrl} alt="B" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-base font-black text-white" style={{ background: "rgba(79,70,229,0.2)", border: "1px solid rgba(79,70,229,0.3)" }}>B</div>
                        <p className="text-[9px] text-slate-600">Add Input B</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 h-5 w-5 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ background: "#4f46e5" }}>B</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div className="w-[310px] shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {(["presets", "controls"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-colors",
                  rightTab === tab ? "text-violet-400" : "text-slate-600 hover:text-slate-400"
                )}
                style={rightTab === tab ? { borderBottom: "2px solid #7c3aed" } : {}}
              >
                {tab === "presets" ? <Film className="h-3 w-3" /> : <Sliders className="h-3 w-3" />}
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {rightTab === "presets" ? (
              <motion.div key="presets-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
                {/* Category pills */}
                <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={cn("px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all", activeCategory === "all" ? "bg-violet-700/70 text-violet-100 border border-violet-500/50" : "text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12]")}
                    >
                      All ({presets.length})
                    </button>
                    {CATEGORY_ORDER.map((cat) => {
                      const count = presets.filter((p) => p.category === cat).length;
                      if (!count) return null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={cn("px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all", activeCategory === cat ? "bg-violet-700/70 text-violet-100 border border-violet-500/50" : "text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12]")}
                        >
                          {CATEGORY_LABELS[cat]?.split(" / ")[0] ?? cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-2.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                  {presetsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 text-slate-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredPresets.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          selected={selectedPresetId === preset.id}
                          creditEstimate={Math.ceil(4 * duration * preset.costMultiplier)}
                          onClick={() => { setSelectedPresetId(preset.id); markDirty(); }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected info */}
                {selectedPreset && (
                  <div className="px-3 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-violet-300 truncate">{selectedPreset.name}</p>
                        <p className="text-[8px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">{selectedPreset.motionProfile}</p>
                      </div>
                      <div className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold text-violet-300 flex items-center gap-0.5" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                        <Zap className="h-2 w-2" />{creditEstimate}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="controls-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                {/* Motion */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                    <Sliders className="h-3 w-3" />Motion
                  </p>
                  <RangeSlider label="Intensity" value={controls.intensity} onChange={(v) => { setControls((c) => ({ ...c, intensity: v })); markDirty(); }} />
                  <RangeSlider label="Smoothness" value={controls.smoothness} onChange={(v) => { setControls((c) => ({ ...c, smoothness: v })); markDirty(); }} />
                  <RangeSlider label="Cinematic Strength" value={controls.cinematicStr} onChange={(v) => { setControls((c) => ({ ...c, cinematicStr: v })); markDirty(); }} />
                </div>

                {/* Framing */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                    <Settings2 className="h-3 w-3" />Framing
                  </p>
                  <ToggleSwitch label="Preserve Framing" description="Lock original composition" checked={controls.preserveFraming} onChange={(v) => { setControls((c) => ({ ...c, preserveFraming: v })); markDirty(); }} />
                  <ToggleSwitch label="Subject Focus" description="Keep subject sharp throughout" checked={controls.subjectFocus} onChange={(v) => { setControls((c) => ({ ...c, subjectFocus: v })); markDirty(); }} />
                </div>

                {/* Quality */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />Quality
                  </p>
                  <ChipSelect label="Resolution" options={RESOLUTIONS} value={controls.resolution} onChange={(v) => { setControls((c) => ({ ...c, resolution: v })); markDirty(); }} />
                  <ChipSelect label="FPS" options={FPS_OPTIONS.map(String)} value={String(controls.fps)} onChange={(v) => { setControls((c) => ({ ...c, fps: Number(v) })); markDirty(); }} />
                  <ToggleSwitch label="Enhancement" description="AI quality enhancement pass" checked={controls.enhance} onChange={(v) => { setControls((c) => ({ ...c, enhance: v })); markDirty(); }} />
                </div>

                <button
                  onClick={() => {
                    setControls({ intensity: 50, smoothness: 60, cinematicStr: 65, preserveFraming: true, subjectFocus: true, resolution: "1080p", fps: 24, enhance: true });
                    markDirty();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-300 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <RotateCcw className="h-3 w-3" />Reset to Defaults
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ BOTTOM STRIP (output history) ══════════════════════════════════ */}
      <AnimatePresence>
        {outputs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,9,17,0.9)" }}
          >
            <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto scrollbar-none">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 shrink-0">Outputs</p>
              {outputs.map((output) => (
                <OutputCard
                  key={output.id}
                  output={output}
                  active={currentOutput?.id === output.id}
                  onSelect={() => { setCurrentOutput(output); setStageMode("output"); }}
                  onReuseAsA={() => handleReuseAsA(output)}
                  onReuseAsB={() => handleReuseAsB(output)}
                  onOpenEditor={() => handleOpenEditor(output)}
                  onDownload={() => handleDownload(output)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {genStatus === "failed" && genError && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-5 left-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl z-50 shadow-2xl max-w-sm"
            style={{ background: "#150d0d", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <X className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300 flex-1">{genError}</p>
            <button
              onClick={() => { setGenStatus("idle"); setGenError(null); }}
              className="h-5 w-5 rounded flex items-center justify-center text-red-500 hover:text-red-300 transition-colors ml-1 shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

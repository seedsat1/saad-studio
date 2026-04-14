"use client";

// ─── Unified Edit Studio ──────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Wand2,
  Lightbulb,
  PenTool,
  Scissors,
  Maximize2,
  Palette,
  Clapperboard,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Eraser,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Star,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type EditTool = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  border: string;
  glow: string;
  hex: string;
  glowHex: string;
};

type EditModel = {
  id: string;
  label: string;
  sublabel: string;
  badge: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const EDIT_TOOLS: EditTool[] = [
  {
    id: "inpaint",
    label: "Smart Inpaint",
    icon: Wand2,
    color: "text-violet-400",
    border: "border-violet-500",
    glow: "shadow-violet-500/50",
    hex: "#8b5cf6",
    glowHex: "rgba(139,92,246,0.45)",
  },
  {
    id: "replace",
    label: "Object Replace",
    icon: RefreshCw,
    color: "text-cyan-400",
    border: "border-cyan-500",
    glow: "shadow-cyan-500/50",
    hex: "#06b6d4",
    glowHex: "rgba(6,182,212,0.45)",
  },
  {
    id: "relight",
    label: "AI Relight",
    icon: Lightbulb,
    color: "text-amber-400",
    border: "border-amber-500",
    glow: "shadow-amber-500/50",
    hex: "#f59e0b",
    glowHex: "rgba(245,158,11,0.45)",
  },
  {
    id: "bgremove",
    label: "Background Remove",
    icon: Scissors,
    color: "text-rose-400",
    border: "border-rose-500",
    glow: "shadow-rose-500/50",
    hex: "#f43f5e",
    glowHex: "rgba(244,63,94,0.45)",
  },
  {
    id: "outpaint",
    label: "Expand & Outpaint",
    icon: Maximize2,
    color: "text-emerald-400",
    border: "border-emerald-500",
    glow: "shadow-emerald-500/50",
    hex: "#10b981",
    glowHex: "rgba(16,185,129,0.45)",
  },
  {
    id: "style",
    label: "Style Transfer",
    icon: Palette,
    color: "text-pink-400",
    border: "border-pink-500",
    glow: "shadow-pink-500/50",
    hex: "#ec4899",
    glowHex: "rgba(236,72,153,0.45)",
  },
  {
    id: "draw",
    label: "Draw to Edit",
    icon: PenTool,
    color: "text-blue-400",
    border: "border-blue-500",
    glow: "shadow-blue-500/50",
    hex: "#3b82f6",
    glowHex: "rgba(59,130,246,0.45)",
  },
  {
    id: "motion",
    label: "Motion Track Edit",
    icon: Clapperboard,
    color: "text-orange-400",
    border: "border-orange-500",
    glow: "shadow-orange-500/50",
    hex: "#f97316",
    glowHex: "rgba(249,115,22,0.45)",
  },
];

const EDIT_MODELS: EditModel[] = [
  {
    id: "google/nano-banana-edit",
    label: "Nano Banana Edit",
    sublabel: "Google · Inpainting Engine",
    badge: "DEFAULT",
  },
  {
    id: "seedream/4.5-edit",
    label: "Seedream 4.5 Edit",
    sublabel: "Seedream · Creative Editing",
    badge: "",
  },
  {
    id: "kling-01-edit",
    label: "Kling 01 Edit",
    sublabel: "Kling · Motion-Aware Edit",
    badge: "NEW",
  },
  {
    id: "flux-2/pro-image-to-image",
    label: "FLUX.2 Pro I2I",
    sublabel: "FLUX.2 · Image-to-Image",
    badge: "PRO",
  },
];

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarBtn({
  icon: Icon,
  label,
  shortcut,
}: {
  icon: React.ElementType;
  label: string;
  shortcut: string;
}) {
  return (
    <button
      title={`${label} (${shortcut})`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] transition-all duration-150 text-xs font-medium select-none"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

// ─── Premium Slider ───────────────────────────────────────────────────────────
function PremiumSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[11px] font-bold text-violet-300 tabular-nums font-mono">
          {displayValue}
        </span>
      </div>
      <div className="relative h-5 flex items-center group">
        {/* Track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-pink-500 rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Thumb indicator */}
        <div
          className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-lg shadow-violet-500/40 border-2 border-violet-400 -translate-x-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${pct}%` }}
        />
        {/* Range input (invisible) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────
export default function EditPage() {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState<string>("inpaint");
  const [selectedModel, setSelectedModel] = useState<EditModel>(EDIT_MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [editStrength, setEditStrength] = useState(0.75);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const currentTool = EDIT_TOOLS.find((t) => t.id === activeTool)!;

  useEffect(() => {
    const requestedTool = (searchParams.get("tool") || "").trim().toLowerCase();
    if (!requestedTool) return;

    const aliasMap: Record<string, string> = {
      inpaint: "inpaint",
      replace: "replace",
      relight: "relight",
      bgremove: "bgremove",
      "bg-remove": "bgremove",
      "background-remove": "bgremove",
      style: "style",
      draw: "draw",
      motion: "motion",
      outpaint: "inpaint",
      "expand-image": "inpaint",
      "sketch-to-real": "draw",
      "color-grading": "relight",
      "expression-edit": "replace",
    };

    const resolved = aliasMap[requestedTool] ?? requestedTool;
    if (EDIT_TOOLS.some((tool) => tool.id === resolved)) {
      setActiveTool(resolved);
      setShowResult(false);
    }
  }, [searchParams]);

  const handleApply = useCallback(() => {
    if (isProcessing || !prompt.trim()) return;
    setShowResult(false);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowResult(true);
    }, 3000);
  }, [isProcessing, prompt]);

  const handleToolSelect = (id: string) => {
    setActiveTool(id);
    setShowResult(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white select-none">

      {/* ════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — Edit Toolbelt
      ════════════════════════════════════════════════════════════════ */}
      <aside className="w-[250px] shrink-0 flex flex-col border-r border-white/[0.06] bg-slate-950/90 backdrop-blur-xl z-10">
        {/* Header */}
        <div className="px-4 pt-5 pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center ring-1 ring-violet-500/30">
              <Layers className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Edit Toolbelt
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">Select an editing mode</p>
            </div>
          </div>
        </div>

        {/* Tool List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {EDIT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <motion.button
                key={tool.id}
                whileHover={{ x: isActive ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "w-full relative flex items-center gap-3 px-3.5 py-[10px] rounded-xl text-left transition-all duration-200 border group",
                  isActive
                    ? cn(
                        "bg-white/[0.07]",
                        tool.border,
                        `shadow-lg ${tool.glow}`
                      )
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                )}
              >
                {/* Active side bar accent */}
                {isActive && (
                  <motion.div
                    layoutId="tool-accent"
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                    style={{ backgroundColor: tool.hex }}
                  />
                )}

                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                    isActive
                      ? "bg-white/[0.08]"
                      : "bg-transparent group-hover:bg-white/[0.04]"
                  )}
                >
                  <tool.icon
                    className={cn(
                      "h-3.5 w-3.5 transition-all duration-200",
                      isActive ? tool.color : "text-slate-600 group-hover:text-slate-400"
                    )}
                  />
                </div>

                <span
                  className={cn(
                    "text-[13px] font-medium leading-none transition-colors duration-200",
                    isActive ? "text-slate-100" : "text-slate-500 group-hover:text-slate-300"
                  )}
                >
                  {tool.label}
                </span>

                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn("ml-auto h-1.5 w-1.5 rounded-full shrink-0")}
                    style={{ backgroundColor: tool.hex }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Select a tool · paint the mask · describe the edit
          </p>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          CENTER — Masking Canvas & Prompt Engine
      ════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* Canvas Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-xl shrink-0 z-10">
          <ToolbarBtn icon={RotateCcw} label="Undo"       shortcut="⌘Z" />
          <ToolbarBtn icon={RotateCw}  label="Redo"       shortcut="⌘⇧Z" />
          <div className="h-4 w-px bg-white/[0.08] mx-1" />
          <ToolbarBtn icon={Eraser}    label="Clear Mask" shortcut="⌘D" />
          <div className="h-4 w-px bg-white/[0.08] mx-1" />
          <ToolbarBtn icon={ZoomIn}    label="Zoom In"    shortcut="+" />
          <ToolbarBtn icon={ZoomOut}   label="Zoom Out"   shortcut="-" />

          <div className="flex-1" />

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <motion.div
              className={cn("h-1.5 w-1.5 rounded-full")}
              style={{
                backgroundColor: isProcessing
                  ? "#f59e0b"
                  : showResult
                  ? "#10b981"
                  : "#334155",
              }}
              animate={
                isProcessing
                  ? { opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                isProcessing ? { duration: 0.8, repeat: Infinity } : {}
              }
            />
            <span className="text-slate-500">
              {isProcessing
                ? "Processing…"
                : showResult
                ? "Edit Applied"
                : "Ready"}
            </span>
          </div>

          {/* Active tool badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ml-1"
            style={{
              borderColor: `${currentTool.hex}55`,
              color: currentTool.hex,
              backgroundColor: `${currentTool.hex}11`,
            }}
          >
            <currentTool.icon className="h-3 w-3" />
            <span>{currentTool.label}</span>
          </div>
        </div>

        {/* Canvas Body — dot-grid background */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(148,163,184,0.065) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#030712",
          }}
        >
          {/* Corner grid fade vignette */}
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #030712 100%)",
            }}
          />

          {/* Centered canvas card */}
          <div className="absolute inset-0 flex items-center justify-center p-6 z-[2]">
            <div className="relative w-full max-w-[700px] aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]">

              {/* ── Base image layers (before / after) ── */}
              <AnimatePresence mode="wait">
                {!showResult ? (
                  <motion.div
                    key="original"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.03 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                    style={{
                      background: `
                        radial-gradient(ellipse 55% 65% at 28% 38%, #1e1b4b 0%, transparent 65%),
                        radial-gradient(ellipse 45% 55% at 72% 62%, #0f172a 0%, transparent 60%),
                        radial-gradient(ellipse 40% 40% at 55% 20%, #1a103a 0%, transparent 50%),
                        linear-gradient(145deg, #0b0a1e 0%, #1e1a3e 45%, #0f172a 100%)
                      `,
                    }}
                  >
                    {/* Simulated scene depth layers */}
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        background:
                          "radial-gradient(ellipse 50% 70% at 25% 50%, #312e81 0%, transparent 70%)",
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background:
                          "radial-gradient(ellipse 35% 35% at 70% 30%, #1d4ed8 0%, transparent 60%)",
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1/3"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(15,10,40,0.9), transparent)",
                      }}
                    />
                    {/* Simulated objects */}
                    <div
                      className="absolute opacity-25"
                      style={{
                        top: "15%",
                        left: "28%",
                        width: "40%",
                        height: "55%",
                        background:
                          "radial-gradient(ellipse, rgba(99,102,241,0.6) 0%, transparent 70%)",
                        filter: "blur(8px)",
                      }}
                    />
                    <div
                      className="absolute opacity-15"
                      style={{
                        top: "40%",
                        right: "15%",
                        width: "25%",
                        height: "35%",
                        background:
                          "radial-gradient(ellipse, rgba(52,211,153,0.6) 0%, transparent 70%)",
                        filter: "blur(6px)",
                      }}
                    />
                    {/* File label */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      <span className="text-[10px] text-slate-400 font-mono">
                        original.png · 2048 × 1536
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                    style={{
                      background: `
                        radial-gradient(ellipse 60% 70% at 32% 40%, #2e1065 0%, transparent 65%),
                        radial-gradient(ellipse 50% 60% at 68% 58%, #1a0040 0%, transparent 60%),
                        radial-gradient(ellipse 40% 45% at 55% 18%, #3b0764 0%, transparent 55%),
                        linear-gradient(145deg, #0d0520 0%, #1f0050 45%, #0a0a1e 100%)
                      `,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        background:
                          "radial-gradient(ellipse 55% 75% at 28% 50%, #4c1d95 0%, transparent 70%)",
                      }}
                    />
                    {/* Enhanced glow on edited region */}
                    <div
                      className="absolute"
                      style={{
                        top: "18%",
                        left: "22%",
                        width: "42%",
                        height: "52%",
                        background:
                          "radial-gradient(ellipse, rgba(167,139,250,0.35) 0%, transparent 70%)",
                        filter: "blur(12px)",
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1/3"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(59,7,100,0.8), transparent)",
                      }}
                    />
                    {/* Result label */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-950/70 backdrop-blur-sm rounded-md px-2 py-1 border border-emerald-500/30">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-300 font-mono">
                        edit_result.png · AI Enhanced
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Glowing Mask Overlay (visible in idle state) ── */}
              <AnimatePresence>
                {!isProcessing && !showResult && (
                  <motion.div
                    key="mask"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    {/* Organic brush stroke region */}
                    <motion.div
                      animate={{
                        boxShadow: [
                          `0 0 12px 3px ${currentTool.glowHex}, inset 0 0 20px 5px ${currentTool.glowHex}`,
                          `0 0 22px 8px ${currentTool.glowHex}, inset 0 0 30px 10px ${currentTool.glowHex}`,
                          `0 0 12px 3px ${currentTool.glowHex}, inset 0 0 20px 5px ${currentTool.glowHex}`,
                        ],
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute"
                      style={{
                        top: "20%",
                        left: "21%",
                        width: "40%",
                        height: "48%",
                        borderRadius: "42% 58% 55% 45% / 48% 52% 42% 58%",
                        border: `1.5px solid ${currentTool.hex}99`,
                        background: `radial-gradient(ellipse, ${currentTool.hex}18 0%, transparent 70%)`,
                      }}
                    />

                    {/* Secondary mask stroke */}
                    <div
                      className="absolute opacity-40"
                      style={{
                        top: "25%",
                        left: "26%",
                        width: "28%",
                        height: "32%",
                        borderRadius: "58% 42% 48% 52% / 52% 48% 55% 45%",
                        border: `1px solid ${currentTool.hex}66`,
                        background: `radial-gradient(ellipse, ${currentTool.hex}10 0%, transparent 70%)`,
                      }}
                    />

                    {/* Brush size indicator — bottom right */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5">
                      <motion.div
                        className="rounded-full border-2 shrink-0"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          borderColor: currentTool.hex,
                          width: `${Math.max(6, Math.round(brushSize * 0.14))}px`,
                          height: `${Math.max(6, Math.round(brushSize * 0.14))}px`,
                          boxShadow: `0 0 6px 2px ${currentTool.glowHex}`,
                        }}
                      />
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {brushSize}px
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Processing Scan Animation ── */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    key="scan"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-20 overflow-hidden"
                  >
                    {/* Dim overlay */}
                    <div className="absolute inset-0 bg-slate-950/50" />

                    {/* Scanning line */}
                    <motion.div
                      className="absolute left-0 right-0 h-[2px] pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, ${currentTool.hex} 30%, #818cf8 50%, ${currentTool.hex} 70%, transparent 100%)`,
                        boxShadow: `0 0 24px 12px ${currentTool.glowHex}, 0 0 6px 2px ${currentTool.hex}`,
                      }}
                      initial={{ top: "-2px" }}
                      animate={{ top: "calc(100% + 2px)" }}
                      transition={{ duration: 2.6, ease: "linear" }}
                    />

                    {/* Trailing glow blur */}
                    <motion.div
                      className="absolute left-0 right-0 h-24 pointer-events-none"
                      style={{
                        background: `linear-gradient(to bottom, transparent, ${currentTool.hex}18, transparent)`,
                      }}
                      initial={{ top: "-96px" }}
                      animate={{ top: "calc(100% + 2px)" }}
                      transition={{ duration: 2.6, ease: "linear" }}
                    />

                    {/* Center status card */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-slate-950/90 backdrop-blur-2xl border border-white/[0.1] rounded-2xl px-6 py-4 flex flex-col items-center gap-3"
                        style={{
                          boxShadow: `0 0 0 1px ${currentTool.hex}33, 0 24px 48px rgba(0,0,0,0.7)`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkles
                            className="h-4 w-4 animate-pulse"
                            style={{ color: currentTool.hex }}
                          />
                          <span className="text-sm font-semibold text-slate-100">
                            Applying AI Edit...
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono max-w-[220px] text-center truncate">
                          {selectedModel.label} · {currentTool.label}
                        </div>
                        {/* Animated dots */}
                        <div className="flex gap-1.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="h-1 w-1 rounded-full"
                              style={{ backgroundColor: currentTool.hex }}
                              animate={{
                                opacity: [0.2, 1, 0.2],
                                scaleY: [0.5, 1.5, 0.5],
                              }}
                              transition={{
                                duration: 0.9,
                                delay: i * 0.14,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Floating Prompt Bar ── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none z-[10]">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto max-w-[660px] mx-auto"
          >
            <div
              className="bg-slate-900/85 backdrop-blur-2xl border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/70 p-2.5 flex items-center gap-2.5"
              style={{
                boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* Tool icon pill */}
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${currentTool.hex}18`,
                  border: `1px solid ${currentTool.hex}33`,
                }}
              >
                <currentTool.icon
                  className="h-4 w-4"
                  style={{ color: currentTool.hex }}
                />
              </div>

              {/* Text input */}
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleApply()
                }
                placeholder="Describe what to add, remove, or change in the masked area..."
                disabled={isProcessing}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none disabled:opacity-50"
              />

              {/* Apply button (in prompt bar, lightweight) */}
              <motion.button
                onClick={handleApply}
                disabled={isProcessing || !prompt.trim()}
                whileHover={
                  !isProcessing && prompt.trim() ? { scale: 1.04 } : {}
                }
                whileTap={
                  !isProcessing && prompt.trim() ? { scale: 0.95 } : {}
                }
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
                  isProcessing
                    ? "bg-violet-900/40 text-violet-500 cursor-not-allowed"
                    : prompt.trim()
                    ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/40"
                    : "bg-slate-800/80 text-slate-600 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    <span>Working</span>
                  </>
                ) : (
                  <>
                    <span>Apply</span>
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span className="text-amber-200">5</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Model & Brush Settings
      ════════════════════════════════════════════════════════════════ */}
      <aside className="w-[320px] shrink-0 flex flex-col border-l border-white/[0.06] bg-slate-900/35 backdrop-blur-2xl z-10">
        {/* Header */}
        <div className="px-4 pt-5 pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center ring-1 ring-violet-500/30">
              <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Model & Brush
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">Configure edit parameters</p>
            </div>
          </div>
        </div>

        {/* Scrollable settings */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* ── Edit Model Selector ── */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Edit Model
            </span>

            <div className="relative">
              <button
                onClick={() => setModelOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] transition-all duration-150 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-violet-400 shrink-0 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                  <div className="min-w-0 text-left">
                    <div className="text-slate-100 font-medium text-[13px] truncate">
                      {selectedModel.label}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate mt-0.5">
                      {selectedModel.sublabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedModel.badge && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ring-1",
                        selectedModel.badge === "PRO"
                          ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                          : selectedModel.badge === "NEW"
                          ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                          : "bg-violet-500/20 text-violet-300 ring-violet-500/30"
                      )}
                    >
                      {selectedModel.badge}
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: modelOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </motion.div>
                </div>
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {modelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden"
                  >
                    {EDIT_MODELS.map((model, i) => {
                      const isSelected = selectedModel.id === model.id;
                      return (
                        <motion.button
                          key={model.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => {
                            setSelectedModel(model);
                            setModelOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors text-left",
                            isSelected
                              ? "bg-violet-500/10"
                              : "hover:bg-white/[0.05]"
                          )}
                        >
                          <div
                            className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              isSelected ? "bg-violet-400" : "bg-slate-700"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "text-[13px] font-medium",
                                isSelected ? "text-slate-100" : "text-slate-300"
                              )}
                            >
                              {model.label}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              {model.sublabel}
                            </div>
                          </div>
                          {model.badge && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ring-1",
                                model.badge === "PRO"
                                  ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                                  : model.badge === "NEW"
                                  ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                                  : "bg-violet-500/20 text-violet-300 ring-violet-500/30"
                              )}
                            >
                              {model.badge}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Brush Size ── */}
          <PremiumSlider
            label="Brush Size"
            value={brushSize}
            min={1}
            max={100}
            step={1}
            displayValue={`${brushSize}px`}
            onChange={setBrushSize}
          />

          {/* ── Edit Strength ── */}
          <PremiumSlider
            label="Edit Strength"
            value={editStrength}
            min={0.1}
            max={1.0}
            step={0.01}
            displayValue={editStrength.toFixed(2)}
            onChange={setEditStrength}
          />

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* ── Active Tool Info Card ── */}
          <motion.div
            key={currentTool.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl p-4 border"
            style={{
              borderColor: `${currentTool.hex}33`,
              backgroundColor: `${currentTool.hex}0a`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${currentTool.hex}18`,
                  boxShadow: `0 0 12px 2px ${currentTool.glowHex}`,
                }}
              >
                <currentTool.icon
                  className="h-4 w-4"
                  style={{ color: currentTool.hex }}
                />
              </div>
              <div>
                <div
                  className="text-[13px] font-semibold"
                  style={{ color: currentTool.hex }}
                >
                  {currentTool.label}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Active mode
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {currentTool.id === "inpaint" &&
                "Fill or restore masked areas using AI context from surrounding pixels."}
              {currentTool.id === "replace" &&
                "Replace any selected object with an AI-generated alternative."}
              {currentTool.id === "relight" &&
                "Non-destructively shift light direction, color, and intensity."}
              {currentTool.id === "bgremove" &&
                "Instantly isolate subjects by removing the entire background layer."}
              {currentTool.id === "outpaint" &&
                "Extend image boundaries beyond the original frame with AI."}
              {currentTool.id === "style" &&
                "Transfer a visual style or texture onto the selected region."}
              {currentTool.id === "draw" &&
                "Sketch rough shapes and let AI interpret and render the result."}
              {currentTool.id === "motion" &&
                "Track and edit objects across an animated frame sequence."}
            </p>
          </motion.div>

          {/* Current params summary */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05]">
            {[
              { label: "Model", value: selectedModel.id },
              { label: "Brush", value: `${brushSize}px` },
              { label: "Strength", value: editStrength.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                  {label}
                </span>
                <span className="text-[11px] text-slate-400 font-mono truncate max-w-[160px] text-right">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pinned Action Button ── */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <motion.button
            onClick={handleApply}
            disabled={isProcessing}
            whileHover={!isProcessing ? { scale: 1.02, y: -1 } : {}}
            whileTap={!isProcessing ? { scale: 0.97 } : {}}
            className={cn(
              "w-full relative flex items-center justify-center gap-2.5 py-[18px] px-6 rounded-2xl font-bold text-[15px] tracking-wide transition-all duration-300 overflow-hidden",
              isProcessing
                ? "bg-violet-950/60 border border-violet-800/40 text-violet-500 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white border border-violet-500/30"
            )}
            style={
              !isProcessing
                ? {
                    boxShadow:
                      "0 0 0 1px rgba(139,92,246,0.35), 0 8px 32px rgba(139,92,246,0.45), 0 2px 8px rgba(0,0,0,0.4)",
                  }
                : {}
            }
          >
            {/* Shimmer sweep */}
            {!isProcessing && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent skew-x-12"
                animate={{ x: ["-140%", "140%"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
              />
            )}

            {isProcessing ? (
              <>
                <Sparkles className="h-5 w-5 animate-pulse" />
                <span>Applying AI Edit...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 drop-shadow-sm" />
                <span>Apply Edit</span>
                <span className="flex items-center gap-1 text-sm font-normal opacity-90 ml-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span className="text-amber-200 font-bold text-sm">5</span>
                </span>
              </>
            )}
          </motion.button>

          {/* Success confirmation */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[12px] text-emerald-300 font-medium">
                  Edit applied successfully
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}

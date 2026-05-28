"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Eye,
  Settings,
  HelpCircle,
  Download,
  Info,
  Trash2,
  Aperture,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
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
  description: string;
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
    description: "Fill or restore masked areas using AI context from surrounding pixels.",
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
    description: "Replace any selected object with an AI-generated alternative.",
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
    description: "Non-destructively shift light direction, color, and intensity.",
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
    description: "Instantly isolate subjects by removing the entire background layer.",
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
    description: "Extend image boundaries beyond the original frame with AI.",
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
    description: "Transfer a visual style or texture onto the selected region.",
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
    description: "Sketch rough shapes and let AI interpret and render the result.",
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
    description: "Track and edit objects across an animated frame sequence.",
  },
  {
    id: "upscale",
    label: "AI Upscale & Enhance",
    icon: Aperture,
    color: "text-teal-400",
    border: "border-teal-500",
    glow: "shadow-teal-500/50",
    hex: "#14b8a6",
    glowHex: "rgba(20,184,166,0.45)",
    description: "Enhance image resolution, restore clarity, and sharpen fine details using AI upscale.",
  },
];

const EDIT_MODELS: EditModel[] = [
  {
    id: "flux-kontext-pro",
    label: "Flux Kontext Pro",
    sublabel: "Flux Kontext · AI Image Edit",
    badge: "DEFAULT",
  },
  {
    id: "flux-kontext-max",
    label: "Flux Kontext Max",
    sublabel: "Flux Kontext · High Detail Edit",
    badge: "PRO",
  },
  {
    id: "google/nano-banana-edit",
    label: "Nano Banana Edit",
    sublabel: "Google · Inpainting Engine",
    badge: "",
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
  onClick,
  disabled,
  active,
}: {
  icon: React.ElementType;
  label: string;
  shortcut: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${label} (${shortcut})`}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 text-xs font-semibold select-none disabled:opacity-30 disabled:pointer-events-none",
        active
          ? "bg-white/10 text-white border border-white/10"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] border border-transparent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
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
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[11px] font-black text-cyan-400 tabular-nums font-mono">
          {displayValue}
        </span>
      </div>
      <div className="relative h-5 flex items-center group">
        {/* Track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Thumb indicator */}
        <div
          className="absolute h-4 w-4 rounded-full bg-white shadow-lg shadow-cyan-500/40 border-2 border-cyan-400 -translate-x-1/2 pointer-events-none transition-all duration-75"
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

// Helper to convert any image URL (local or cross-origin) to base64 Data URL in the browser
const imgToDataUrl = async (src: string): Promise<string> => {
  if (src.startsWith("data:")) return src;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
};

// ─── Page Component ────────────────────────────────────────────────────────────
export default function EditPage() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [activeTool, setActiveTool] = useState<string>("inpaint");
  const [selectedModel, setSelectedModel] = useState<EditModel>(EDIT_MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [brushOpacity, setBrushOpacity] = useState(0.6);
  const [editStrength, setEditStrength] = useState(0.75);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [simulatedWarning, setSimulatedWarning] = useState<string | null>(null);

  // Drawing & Canvas States
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showInlight, setShowInlight] = useState(true);
  const [baseImage, setBaseImage] = useState("/explore/iraq/skyline.png");

  // Advanced generation parameters
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [steps, setSteps] = useState(25);
  const [cfg, setCfg] = useState(7.5);
  const [seed, setSeed] = useState("-1");

  // Tool-specific states
  const [lightAngle, setLightAngle] = useState(180);
  const [lightIntensity, setLightIntensity] = useState(0.7);
  const [lightColor, setLightColor] = useState("#fcd34d");

  const [bgFormat, setBgFormat] = useState("png");
  const [bgFeather, setBgFeather] = useState(2);

  const [outpaintDirection, setOutpaintDirection] = useState("all");
  const [outpaintMargin, setOutpaintMargin] = useState(25);

  const [stylePreset, setStylePreset] = useState("cyberpunk");
  const [styleStrength, setStyleStrength] = useState(0.8);

  const [drawColor, setDrawColor] = useState("#ff0000");

  const [motionDirection, setMotionDirection] = useState("forward");
  const [motionSpeed, setMotionSpeed] = useState(5);

  const [upscaleFactor, setUpscaleFactor] = useState("2");
  const [upscaleDenoise, setUpscaleDenoise] = useState(0.3);
  const [upscaleFaceEnhance, setUpscaleFaceEnhance] = useState(true);

  const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const currentTool = EDIT_TOOLS.find((t) => t.id === activeTool)!;

  // Resolve base image URL from parameters
  useEffect(() => {
    const imgUrl = searchParams.get("image") || searchParams.get("url");
    if (imgUrl) {
      setBaseImage(imgUrl);
    }
  }, [searchParams]);

  // Generate cursor preview SVG based on brushSize, scale and tool color
  const displayBrushSize = brushSize * scale;
  const activeColorHex = activeTool === "draw" ? drawColor : currentTool.hex;
  const strokeColor = activeColorHex.replace('#', '%23');
  const cursorSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${displayBrushSize * 2}' height='${displayBrushSize * 2}' viewBox='0 0 ${displayBrushSize * 2} ${displayBrushSize * 2}'><circle cx='${displayBrushSize}' cy='${displayBrushSize}' r='${displayBrushSize - 1}' fill='none' stroke='${strokeColor}' stroke-width='1.5' opacity='0.8'/></svg>`;
  const cursorStyle = `url("data:image/svg+xml;utf8,${cursorSvg}") ${displayBrushSize} ${displayBrushSize}, crosshair`;

  // Resolve Tool from URL parameters
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
      outpaint: "outpaint",
      "expand-image": "outpaint",
      "sketch-to-real": "draw",
      "color-grading": "relight",
      "expression-edit": "replace",
    };

    const resolved = aliasMap[requestedTool] ?? requestedTool;
    if (EDIT_TOOLS.some((tool) => tool.id === resolved)) {
      setActiveTool(resolved);
      setShowResult(false);
      handleClearMask();
    }
  }, [searchParams]);

  // Initializing canvas with clear state
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const blank = canvas.toDataURL();
    setHistory([blank]);
    setHistoryIndex(0);
  }, []);

  // Sync canvas dimensions and background on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Handle mask drawing events
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Translate mouse screen coordinates to internal canvas pixels
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showResult || isProcessing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = activeTool === "draw" ? drawColor : currentTool.hex;
      ctx.globalAlpha = brushOpacity;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setIsDrawing(true);
    lastCoordsRef.current = { x, y };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || showResult || isProcessing || !lastCoordsRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);
    const last = lastCoordsRef.current;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = activeTool === "draw" ? drawColor : currentTool.hex;
      ctx.globalAlpha = brushOpacity;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    lastCoordsRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastCoordsRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, state]);
    setHistoryIndex(newHistory.length);
  };

  // Undo stroke
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0);
    };
  };

  // Redo stroke
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0);
    };
  };

  // Clear Mask
  const handleClearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const state = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, state]);
    setHistoryIndex(newHistory.length);
  };

  // Apply AI Generation (Attempts to call the real backend APIs, falls back to visual simulator)
  const handleApply = useCallback(async () => {
    if (isProcessing) return;
    
    // For tools that need prompts, verify prompt input
    const isPromptOptional = ["bgremove", "upscale"].includes(activeTool);
    if (!isPromptOptional && !prompt.trim()) return;

    setSimulatedWarning(null);
    setShowResult(false);
    setIsProcessing(true);

    try {
      let resultUrl = "";
      const base64Image = await imgToDataUrl(baseImage);

      if (activeTool === "bgremove") {
        const response = await fetch("/api/generate/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: base64Image }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to remove background");
        resultUrl = data.imageUrl;
      } else if (activeTool === "upscale") {
        const response = await fetch("/api/generate/upscale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: base64Image, scale: 4 }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to upscale image");
        resultUrl = data.imageUrl || data.mediaUrl;
      } else {
        // Drawing tools (inpaint, replace, etc.)
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not initialized");
        const maskDataUrl = canvas.toDataURL("image/png");

        const response = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            modelId: selectedModel.id,
            imageUrl: base64Image,
            imageUrls: [maskDataUrl],
            aspectRatio: "4:3",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate image");
        resultUrl = data.imageUrl || data.mediaUrl;
      }

      if (resultUrl) {
        setBaseImage(resultUrl);
        setShowResult(true);
        handleClearMask();
      }
    } catch (err: any) {
      console.warn("Real API failed, falling back to simulated generation:", err.message);
      
      // Fallback simulation
      setSimulatedWarning(`Running in local demo mode (Real API: ${err.message})`);
      
      setTimeout(() => {
        setIsProcessing(false);
        setShowResult(true);
      }, 3000);
      return;
    }

    setIsProcessing(false);
  }, [isProcessing, prompt, activeTool, baseImage, selectedModel]);

  const handleToolSelect = (id: string) => {
    setActiveTool(id);
    setShowResult(false);
    handleClearMask();
  };

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden bg-[#03060d] text-white select-none">
      
      {/* ════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — Slim Toolbar
      ════════════════════════════════════════════════════════════════ */}
      <aside className="w-16 shrink-0 flex flex-col items-center py-6 border-r border-white/5 bg-[#050914] z-10 gap-6">
        {/* Saad Studio Icon */}
        <Link href="/explore" className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform hover:scale-105 active:scale-95">
          <Sparkles className="h-5 w-5 text-black font-black" />
        </Link>

        <div className="w-8 h-px bg-white/5" />

        {/* Tools list */}
        <nav className="flex-1 flex flex-col gap-3 w-full px-2 overflow-y-auto scrollbar-none">
          {EDIT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                title={tool.label}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center relative transition-all duration-300 group",
                  isActive
                    ? "bg-white/[0.05] border border-white/10 shadow-lg"
                    : "border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
                )}
              >
                {/* Active Indicator spot */}
                {isActive && (
                  <motion.div
                    layoutId="tool-glow-spot"
                    className="absolute left-[-2px] top-3 bottom-3 w-[3px] rounded-r-md"
                    style={{
                      backgroundColor: tool.hex,
                      boxShadow: `0 0 10px 1px ${tool.hex}`,
                    }}
                  />
                )}

                <tool.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? tool.color : "text-zinc-500 group-hover:scale-105"
                  )}
                  style={isActive ? { filter: `drop-shadow(0 0 5px ${tool.hex}80)` } : {}}
                />

                {/* Hover label tooltip */}
                <span className="absolute left-16 bg-[#080d1a] border border-white/10 text-white text-[11px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="w-8 h-px bg-white/5" />

        {/* Settings button */}
        <Link href="/settings" className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors" title="Settings">
          <Settings className="h-5 w-5" />
        </Link>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          CENTER — Masking Canvas & Prompt Engine
      ════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[#02040a]">
        
        {/* Canvas Toolbar */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/5 bg-[#050914] shrink-0 z-10">
          <ToolbarBtn icon={RotateCcw} label="Undo" shortcut="Ctrl+Z" onClick={handleUndo} disabled={historyIndex <= 0} />
          <ToolbarBtn icon={RotateCw} label="Redo" shortcut="Ctrl+Y" onClick={handleRedo} disabled={historyIndex >= history.length - 1} />
          
          <div className="h-5 w-px bg-white/10 mx-1.5" />
          
          <ToolbarBtn icon={Eraser} label="Clear Mask" shortcut="Ctrl+D" onClick={handleClearMask} />
          <ToolbarBtn
            icon={isEraser ? PenTool : Eraser}
            label={isEraser ? "Draw Mode" : "Eraser Mode"}
            shortcut="E"
            active={isEraser}
            onClick={() => setIsEraser(!isEraser)}
          />
          
          <div className="h-5 w-px bg-white/10 mx-1.5" />
          
          <ToolbarBtn icon={ZoomIn} label="Zoom In" shortcut="+" onClick={() => setScale((s) => Math.min(s + 0.1, 2.5))} />
          <ToolbarBtn icon={ZoomOut} label="Zoom Out" shortcut="-" onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))} />

          <div className="flex-1" />

          {/* Status badge */}
          <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 shadow-md">
            <motion.div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: isProcessing ? "#eab308" : showResult ? "#10b981" : "#52525b",
              }}
              animate={isProcessing ? { opacity: [1, 0.4, 1], scale: [1, 1.3, 1] } : { opacity: 1 }}
              transition={isProcessing ? { duration: 0.8, repeat: Infinity } : {}}
            />
            <span className="text-zinc-400">
              {isProcessing ? "Applying edit..." : showResult ? "Edit Applied" : "Ready"}
            </span>
          </div>

          {/* Active tool display */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ml-1"
            style={{
              borderColor: `${currentTool.hex}40`,
              color: currentTool.hex,
              backgroundColor: `${currentTool.hex}0d`,
              filter: `drop-shadow(0 0 4px ${currentTool.hex}20)`,
            }}
          >
            <currentTool.icon className="h-3 w-3" />
            <span>{currentTool.label}</span>
          </div>
        </div>

        {/* Canvas Body Area */}
        <div
          className="flex-1 relative overflow-hidden flex items-center justify-center p-8"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Centered canvas wrapper card */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10 bg-zinc-950 transition-transform duration-200 select-none cursor-crosshair"
            style={{
              width: "700px",
              height: "525px",
              transform: `scale(${scale})`,
            }}
          >
            {/* ── Background Image layers ── */}
            <div className="absolute inset-0 select-none pointer-events-none">
              <AnimatePresence mode="wait">
                {!showResult ? (
                  <motion.div
                    key="backdrop-original"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url('${baseImage}')`,
                    }}
                  >
                    {/* Dark gradient shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Dimension Badge label */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">
                        {baseImage.split('/').pop()} · 2048 × 1536
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="backdrop-result"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url('${baseImage}')`,
                      // Apply some CSS filters to make the edit result visually distinct!
                      filter: currentTool.id === "relight" ? "hue-rotate(60deg) saturate(1.4)" : "hue-rotate(-45deg) brightness(1.15)",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Result Success badge */}
                    <div className="absolute top-4 left-4 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider">
                        AI EDIT APPLIED
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Interactive Drawing HTML5 Canvas ── */}
            <canvas
              ref={canvasRef}
              width={700}
              height={525}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ cursor: cursorStyle }}
              className={cn(
                "absolute inset-0 z-10 w-full h-full opacity-70 transition-opacity duration-300",
                showInlight ? "opacity-75" : "opacity-0 pointer-events-none"
              )}
            />

            {/* ── Processing Scan Animation overlay ── */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  key="scan-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  
                  {/* Glowing Laser Scanline */}
                  <motion.div
                    className="absolute left-0 right-0 h-[3px] pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, ${currentTool.hex} 30%, #a78bfa 50%, ${currentTool.hex} 70%, transparent 100%)`,
                      boxShadow: `0 0 20px 8px ${currentTool.glowHex}, 0 0 6px 2px ${currentTool.hex}`,
                    }}
                    initial={{ top: "-2px" }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
                  />

                  {/* Processing Status box */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-[#090e18]/90 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl backdrop-blur-2xl"
                    >
                      <Sparkles className="h-6 w-6 animate-pulse" style={{ color: currentTool.hex }} />
                      <span className="text-sm font-bold text-slate-100">Applying AI Generation</span>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                        {selectedModel.label} · {currentTool.label}
                      </span>
                      <div className="flex gap-1 mt-1">
                        {[0, 1, 2, 3].map((dot) => (
                          <motion.div
                            key={dot}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: currentTool.hex }}
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
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

        {/* ── Floating Prompt Input Bar ── */}
        <div className="absolute bottom-0 inset-x-0 p-6 pointer-events-none z-10 flex justify-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto w-full max-w-2xl"
          >
            <div className="bg-[#050914]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 shadow-[0_12px_45px_rgba(0,0,0,0.85)]">
              {/* Tool Indicator circle */}
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${currentTool.hex}15`,
                  borderColor: `${currentTool.hex}30`,
                }}
              >
                <currentTool.icon className="h-4 w-4" style={{ color: currentTool.hex }} />
              </div>

              {/* Input text prompt */}
              <input
                type="text"
                placeholder={
                  activeTool === "bgremove"
                    ? "Background removal doesn't require a prompt. Click Apply!"
                    : activeTool === "upscale"
                    ? "AI Upscale doesn't require a prompt. Click Apply!"
                    : "Describe what to add, replace, or alter in the drawn region..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                disabled={isProcessing || ["bgremove", "upscale"].includes(activeTool)}
                className="flex-1 bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0 disabled:opacity-50"
              />

              {/* Apply trigger button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing || (!["bgremove", "upscale"].includes(activeTool) && !prompt.trim())}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 shrink-0 select-none shadow-md",
                  isProcessing || (!["bgremove", "upscale"].includes(activeTool) && !prompt.trim())
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-transparent"
                    : "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-extrabold"
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
                    <Star className="h-3.5 w-3.5 fill-black text-black" />
                    <span className="font-mono">5</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

      </main>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Settings Panel
      ════════════════════════════════════════════════════════════════ */}
      <aside className="w-[320px] shrink-0 flex flex-col border-l border-white/5 bg-[#050914] z-10">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center shadow-inner">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-300">
                Model & Canvas
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Parameters & controls</p>
            </div>
          </div>
        </div>

        {/* Configuration settings widgets */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          
          {/* ────────────────────────────────────────────────────────────
              1. Inpaint & Replace Settings
          ──────────────────────────────────────────────────────────── */}
          {(activeTool === "inpaint" || activeTool === "replace") && (
            <div className="space-y-6">
              {/* AI Model Selection */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  AI Generation Model
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModelOpen(!modelOpen)}
                    className="w-full flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/15 hover:bg-white/[0.04] transition-all text-left text-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-zinc-200 font-bold text-xs truncate">
                        {selectedModel.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {selectedModel.sublabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedModel.badge && (
                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {selectedModel.badge}
                        </span>
                      )}
                      <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", modelOpen && "rotate-180")} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {modelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl bg-[#090f1d] border border-white/10 shadow-2xl overflow-hidden p-1"
                      >
                        {EDIT_MODELS.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model);
                              setModelOpen(false);
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between gap-2",
                              selectedModel.id === model.id ? "bg-white/[0.05] text-white" : "hover:bg-white/[0.02] text-zinc-400"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold">{model.label}</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5">{model.sublabel}</div>
                            </div>
                            {model.badge && (
                              <span className="bg-white/5 border border-white/10 text-[8px] font-black text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {model.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* Brush Settings */}
              <PremiumSlider
                label="Brush Radius"
                value={brushSize}
                min={4}
                max={80}
                step={1}
                displayValue={`${brushSize}px`}
                onChange={setBrushSize}
              />

              <PremiumSlider
                label="Brush Opacity"
                value={brushOpacity}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={`${Math.round(brushOpacity * 100)}%`}
                onChange={setBrushOpacity}
              />

              <PremiumSlider
                label="Edit Strength"
                value={editStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={editStrength.toFixed(2)}
                onChange={setEditStrength}
              />

              <div className="border-t border-white/5" />

              {/* Show Mask Overlay toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Show Mask Overlay
                </span>
                <button
                  type="button"
                  onClick={() => setShowInlight(!showInlight)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors relative border",
                    showInlight ? "bg-cyan-500 border-cyan-500" : "bg-zinc-900 border-white/10"
                  )}
                >
                  <div
                    className={cn(
                      "h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform",
                      showInlight ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="border-t border-white/5" />

              {/* Advanced Settings */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors"
                >
                  <span>Advanced AI Settings</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", advancedOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence initial={false}>
                  {advancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-4 pt-2 pb-1"
                    >
                      <PremiumSlider
                        label="Sampling Steps"
                        value={steps}
                        min={10}
                        max={50}
                        step={1}
                        displayValue={steps.toString()}
                        onChange={setSteps}
                      />
                      <PremiumSlider
                        label="CFG Scale"
                        value={cfg}
                        min={1.0}
                        max={20.0}
                        step={0.5}
                        displayValue={cfg.toFixed(1)}
                        onChange={setCfg}
                      />
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Seed
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-colors shrink-0"
                            onClick={() => setSeed(Math.floor(Math.random() * 99999999).toString())}
                          >
                            Random
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              2. AI Relight Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "relight" && (
            <div className="space-y-6">
              {/* Light Source Angle */}
              <PremiumSlider
                label="Light Source Angle"
                value={lightAngle}
                min={0}
                max={360}
                step={5}
                displayValue={`${lightAngle}°`}
                onChange={setLightAngle}
              />

              {/* Light Intensity */}
              <PremiumSlider
                label="Light Intensity"
                value={lightIntensity}
                min={0.1}
                max={2.0}
                step={0.05}
                displayValue={`${Math.round(lightIntensity * 100)}%`}
                onChange={setLightIntensity}
              />

              {/* Light Color temperature */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Light Color
                </span>
                {/* Quick Swatches */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  {[
                    { name: "Warm Yellow", hex: "#fcd34d" },
                    { name: "Cool White", hex: "#f8fafc" },
                    { name: "Neon Rose", hex: "#f43f5e" },
                    { name: "Cyber Cyan", hex: "#06b6d4" },
                    { name: "Lime Green", hex: "#10b981" }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setLightColor(color.hex)}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-all transform active:scale-95",
                        lightColor === color.hex ? "border-white ring-2 ring-cyan-500" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                  {/* Custom Picker */}
                  <input
                    type="color"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value)}
                    className="h-7 w-7 rounded-md cursor-pointer bg-transparent border-0"
                    title="Custom color"
                  />
                </div>
              </div>

              <div className="border-t border-white/5" />

              <PremiumSlider
                label="Relight Effect Strength"
                value={editStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={editStrength.toFixed(2)}
                onChange={setEditStrength}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              3. Background Remove Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "bgremove" && (
            <div className="space-y-6">
              {/* Output Format */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Output Format
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "png", label: "PNG", sub: "Transparent backing" },
                    { id: "jpg", label: "JPEG", sub: "Solid back (White)" }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setBgFormat(fmt.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-all text-xs flex flex-col gap-0.5",
                        bgFormat === fmt.id
                          ? "border-rose-500 bg-rose-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="font-bold">{fmt.label}</span>
                      <span className="text-[9px] text-zinc-500">{fmt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Feather */}
              <PremiumSlider
                label="Edge Feathering"
                value={bgFeather}
                min={0}
                max={10}
                step={1}
                displayValue={`${bgFeather}px`}
                onChange={setBgFeather}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              4. Expand & Outpaint Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "outpaint" && (
            <div className="space-y-6">
              {/* Outpaint directions */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Expansion direction
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All Sides", icon: LayoutGrid },
                    { id: "top", label: "Top", icon: ArrowUp },
                    { id: "bottom", label: "Bottom", icon: ArrowDown },
                    { id: "left", label: "Left", icon: ArrowLeft },
                    { id: "right", label: "Right", icon: ArrowRight }
                  ].map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setOutpaintDirection(dir.id)}
                      className={cn(
                        "rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold select-none",
                        outpaintDirection === dir.id
                          ? "border-emerald-500 bg-emerald-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                      )}
                    >
                      <dir.icon className="h-4 w-4 shrink-0" />
                      <span className="text-[9px]">{dir.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outpaint margin */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Outpaint Margin
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map((margin) => (
                    <button
                      key={margin}
                      type="button"
                      onClick={() => setOutpaintMargin(margin)}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all",
                        outpaintMargin === margin
                          ? "border-emerald-500 bg-emerald-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                      )}
                    >
                      +{margin}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5" />

              <PremiumSlider
                label="Expansion Quality"
                value={editStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={editStrength.toFixed(2)}
                onChange={setEditStrength}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              5. Style Transfer Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "style" && (
            <div className="space-y-6">
              {/* Presets Gallery */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Artistic Style Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "cyberpunk", label: "Cyberpunk 🌆" },
                    { id: "anime", label: "Anime 🌸" },
                    { id: "oil_painting", label: "Oil Paint 🎨" },
                    { id: "cinematic", label: "Cinematic 🎬" },
                    { id: "watercolor", label: "Watercolor 💧" }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setStylePreset(preset.id)}
                      className={cn(
                        "rounded-xl border p-3 text-center transition-all text-xs font-bold",
                        stylePreset === preset.id
                          ? "border-pink-500 bg-pink-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Influence */}
              <PremiumSlider
                label="Style Influence"
                value={styleStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={`${Math.round(styleStrength * 100)}%`}
                onChange={setStyleStrength}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              6. Draw to Edit Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "draw" && (
            <div className="space-y-6">
              {/* Custom Brush Color Palette */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Sketching Color
                </span>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {[
                    "#ff0000", // Red
                    "#f97316", // Orange
                    "#eab308", // Yellow
                    "#22c55e", // Green
                    "#06b6d4", // Cyan
                    "#3b82f6", // Blue
                    "#a855f7", // Violet
                    "#ffffff", // White
                    "#000000"  // Black
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDrawColor(color)}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-all transform active:scale-95",
                        drawColor === color ? "border-white ring-2 ring-blue-500" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {/* Custom Picker */}
                  <input
                    type="color"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                    className="h-7 w-7 bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* Brush radius */}
              <PremiumSlider
                label="Sketch Pen Size"
                value={brushSize}
                min={4}
                max={80}
                step={1}
                displayValue={`${brushSize}px`}
                onChange={setBrushSize}
              />

              <PremiumSlider
                label="Sketch Opacity"
                value={brushOpacity}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={`${Math.round(brushOpacity * 100)}%`}
                onChange={setBrushOpacity}
              />

              {/* Edit Strength */}
              <PremiumSlider
                label="Drawing Influence"
                value={editStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                displayValue={editStrength.toFixed(2)}
                onChange={setEditStrength}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              7. Motion Track Edit Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "motion" && (
            <div className="space-y-6">
              {/* Motion Direction */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Motion Direction
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "forward", label: "Forward" },
                    { id: "backward", label: "Backward" },
                    { id: "circular", label: "Circular" }
                  ].map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setMotionDirection(dir.id)}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all",
                        motionDirection === dir.id
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                      )}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion Speed */}
              <PremiumSlider
                label="Motion Speed"
                value={motionSpeed}
                min={1}
                max={10}
                step={1}
                displayValue={motionSpeed.toString()}
                onChange={setMotionSpeed}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              8. AI Upscale & Enhance Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "upscale" && (
            <div className="space-y-6">
              {/* Upscale factor */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Upscale Factor
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "2", label: "2x", desc: "Medium detail" },
                    { id: "4", label: "4x", desc: "HD Quality" },
                    { id: "8", label: "8x", desc: "Ultra HD (8k)" }
                  ].map((fac) => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => setUpscaleFactor(fac.id)}
                      className={cn(
                        "rounded-xl border p-2 flex flex-col gap-0.5 text-left transition-all",
                        upscaleFactor === fac.id
                          ? "border-teal-500 bg-teal-500/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="text-xs font-bold">{fac.label}</span>
                      <span className="text-[8px] text-zinc-500">{fac.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Denoise Strength */}
              <PremiumSlider
                label="Denoise Strength"
                value={upscaleDenoise}
                min={0.0}
                max={1.0}
                step={0.05}
                displayValue={`${Math.round(upscaleDenoise * 100)}%`}
                onChange={setUpscaleDenoise}
              />

              <div className="border-t border-white/5" />

              {/* Face enhance toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Face Details Enhance
                </span>
                <button
                  type="button"
                  onClick={() => setUpscaleFaceEnhance(!upscaleFaceEnhance)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors relative border",
                    upscaleFaceEnhance ? "bg-teal-500 border-teal-500" : "bg-zinc-900 border-white/10"
                  )}
                >
                  <div
                    className={cn(
                      "h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform",
                      upscaleFaceEnhance ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-white/5" />

          {/* Tool description information card */}
          <motion.div
            key={currentTool.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 border"
            style={{
              borderColor: `${currentTool.hex}25`,
              backgroundColor: `${currentTool.hex}08`,
            }}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className="h-8.5 w-8.5 rounded-lg flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${currentTool.hex}15`,
                  borderColor: `${currentTool.hex}30`,
                }}
              >
                <currentTool.icon className="h-4.5 w-4.5" style={{ color: currentTool.hex }} />
              </div>
              <div>
                <span className="text-[13px] font-extrabold block" style={{ color: currentTool.hex }}>
                  {currentTool.label}
                </span>
                <span className="text-[9px] text-zinc-500">Selected Editing Mode</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-semibold">
              {currentTool.description}
            </p>
          </motion.div>

        </div>

        {/* Bottom Pinned Trigger button */}
        <div className="p-5 border-t border-white/5 bg-[#040710] space-y-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || (!["bgremove", "upscale"].includes(activeTool) && !prompt.trim())}
            className={cn(
              "w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] border shadow-lg",
              isProcessing || (!["bgremove", "upscale"].includes(activeTool) && !prompt.trim())
                ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black border-cyan-400/20 shadow-cyan-500/10"
            )}
          >
            <Sparkles className="h-4.5 w-4.5" />
            <span>Apply Generation</span>
            {!isProcessing && (["bgremove", "upscale"].includes(activeTool) || prompt.trim()) && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-black/10 px-1.5 py-0.5 rounded font-black">
                <Star className="h-3 w-3 fill-current" />
                <span>5</span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Generation applied successfully!</span>
              </motion.div>
            )}

            {simulatedWarning && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 py-2 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold leading-relaxed"
              >
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{simulatedWarning}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

    </div>
  );
}



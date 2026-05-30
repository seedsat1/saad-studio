"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Eye,
  Sun,
  Layers,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const CREDIT_COST = 5;

type GenerationStatus = "idle" | "generating" | "success" | "failed";

// Custom Interactive Compass Sphere Controller
function LightingSphere({
  angle,
  onChange,
  thumbnailUrl,
}: {
  angle: number;
  onChange: (angle: number) => void;
  thumbnailUrl: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let newAngle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
    if (newAngle < 0) newAngle += 360;
    onChange(newAngle);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      calculateAngle(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const radius = 56;
  const rad = (angle * Math.PI) / 180;
  const lx = Math.cos(rad) * radius;
  const ly = Math.sin(rad) * radius;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-center">
        Hold and drag to change light direction
      </span>
      <div className="relative w-48 h-48 flex items-center justify-center select-none">
        
        {/* Nudge Arrows */}
        <button type="button" onClick={() => onChange(270)} className="absolute top-0 text-zinc-600 hover:text-zinc-300 font-bold font-mono text-sm leading-none transition-colors">^</button>
        <button type="button" onClick={() => onChange(90)} className="absolute bottom-0 text-zinc-600 hover:text-zinc-300 font-bold font-mono text-sm leading-none transition-colors">v</button>
        <button type="button" onClick={() => onChange(180)} className="absolute left-0 text-zinc-600 hover:text-zinc-300 font-bold font-mono text-sm leading-none transition-colors">&lt;</button>
        <button type="button" onClick={() => onChange(0)} className="absolute right-0 text-zinc-600 hover:text-zinc-300 font-bold font-mono text-sm leading-none transition-colors">&gt;</button>

        {/* Circular Grid Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className="w-36 h-36 rounded-full border border-dashed border-zinc-700/60 relative flex items-center justify-center cursor-crosshair bg-zinc-950/20"
        >
          <div className="absolute w-24 h-24 rounded-full border border-zinc-800/40" />
          <div className="absolute w-12 h-12 rounded-full border border-zinc-800/20" />
          
          <div className="absolute w-full h-[1px] bg-zinc-900/10 rotate-45" />
          <div className="absolute w-full h-[1px] bg-zinc-900/10 -rotate-45" />
          
          {/* Center Thumbnail */}
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-zinc-900 pointer-events-none">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              </div>
            )}
          </div>

          {/* Light Beam Cone SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <radialGradient id="beam-glow-relight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <polygon
              points={`72,72 ${72 + lx - ly * 0.25},${72 + ly + lx * 0.25} ${72 + lx + ly * 0.25},${72 + ly - lx * 0.25}`}
              fill="url(#beam-glow-relight)"
              className="transition-all duration-75"
            />
            <line
              x1="72"
              y1="72"
              x2={72 + lx}
              y2={72 + ly}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          </svg>

          {/* Draggable Light source node */}
          <div
            style={{
              transform: `translate(${lx}px, ${ly}px)`,
            }}
            className="absolute w-5 h-5 rounded-full bg-white shadow-lg border border-zinc-300 flex items-center justify-center cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95 shadow-white/30"
          >
            <div className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxBytes = 2_500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIDE = 2048;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

export default function RelightPage({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedMediaList, setUploadedMediaList] = useState<Array<{ url: string; type: "image" | "video" }>>([
    { url: "/explore/gallery-soul-cinema-1.jpg", type: "image" },
    { url: "/explore/gallery-soul-2-1.jpg", type: "image" },
  ]);

  // Relighting Specific Settings states
  const [lightAngle, setLightAngle] = useState(180);
  const [lightType, setLightType] = useState<"soft" | "hard">("soft");
  const [brightness, setBrightness] = useState(50);
  const [color, setColor] = useState("#ffffff");

  const isGenerating = generationStatus === "generating";

  useEffect(() => {
    if (imageDataUrl) {
      setUploadedMediaList((prev) => {
        if (prev.some((item) => item.url === imageDataUrl)) return prev;
        return [{ url: imageDataUrl, type: "image" }, ...prev].slice(0, 4);
      });
    }
  }, [imageDataUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setResultUrl(null);
    setGenerationStatus("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  async function handleGenerate() {
    if (isGenerating || !imageDataUrl) return;
    const gate = await guardGeneration({ requiredCredits: CREDIT_COST, action: "apps:relight" });
    if (!gate.ok) {
      if (gate.reason === "error") setErrorMessage(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }
    setResultUrl(null);
    setErrorMessage("");
    setGenerationStatus("generating");
    try {
      const compressedImage = await compressImage(imageDataUrl);
      
      const directionNames = {
        0: "right side",
        45: "semi-back right",
        90: "bottom",
        135: "semi-front left",
        180: "left side",
        225: "semi-front right",
        270: "top",
        315: "semi-back left"
      } as any;
      
      let closestAngle = [0, 45, 90, 135, 180, 225, 270, 315].reduce((prev, curr) => 
        Math.abs(curr - lightAngle) < Math.abs(prev - lightAngle) ? curr : prev
      );
      const dirName = directionNames[closestAngle] || "custom angle";
      const finalPrompt = `A portrait photograph with a ${lightType} ${color} light source pointing from the ${dirName}, brightness: ${brightness}%.`;

      const res = await fetch("/api/runninghub/relight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: compressedImage, prompt: finalPrompt }),
      });
      if (!res.ok) {
        let msg = "Failed to generate";
        try { const data = await res.json(); msg = data.error ?? msg; } catch { msg = `Server error (${res.status})`; }
        throw new Error(msg);
      }
      const { output } = (await res.json()) as { output: string; generationId: string };
      setResultUrl(output);
      setGenerationStatus("success");
    } catch (err) {
      setErrorMessage(getSafeErrorMessage(err));
      setGenerationStatus("failed");
    }
  }

  const presets = [
    { label: "Top", angle: 270 },
    { label: "Front", angle: 225 },
    { label: "Right", angle: 0 },
    { label: "Left", angle: 180 },
    { label: "Back", angle: 45 },
    { label: "Bottom", angle: 90 },
  ];

  return (
    <div
      className={cn(
        outfit.variable,
        plusJakarta.variable,
        "flex overflow-hidden bg-[#03060d] text-white select-none",
        isEmbedded ? "h-full flex-1" : "h-screen"
      )}
      style={{ fontFamily: "var(--font-body, sans-serif)" }}
    >
      
      {/* ─── LEFT: Viewport Workspace ─── */}
      <main
        className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[#02040a]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Back breadcrumb */}
        {!isEmbedded && (
          <div className="absolute top-5 left-6 z-30 flex items-center gap-2">
            <Link href="/apps" className="text-xs text-zinc-500 hover:text-zinc-300 font-bold transition-colors uppercase tracking-wider">
              Apps
            </Link>
            <span className="text-zinc-600 text-xs">/</span>
            <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Relight</span>
          </div>
        )}

        {/* Main image preview */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          
          {isGenerating && (
            <div className="absolute inset-0 bg-[#03060d]/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <span className="text-sm font-bold text-zinc-300">Applying AI studio relight...</span>
            </div>
          )}

          {!imageDataUrl ? (
            <div
              className="w-full max-w-lg aspect-video rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-white/20 transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm font-extrabold text-zinc-200">Drag & drop or browse</p>
              <p className="text-xs text-zinc-500 mt-1.5">Upload a photo to start relighting</p>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10 bg-zinc-950 w-[700px] h-[525px]">
              
              {/* Backdrops */}
              <div className="absolute inset-0 select-none pointer-events-none">
                <AnimatePresence mode="wait">
                  {generationStatus !== "success" || !resultUrl ? (
                    <motion.div
                      key="original"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url('${imageDataUrl}')` }}
                    />
                  ) : (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url('${resultUrl}')` }}
                    />
                  )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Status Indicator */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 z-20">
                <div className={cn("h-1.5 w-1.5 rounded-full", resultUrl ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="text-[10px] text-zinc-400 font-mono">
                  {resultUrl ? "Relight Applied" : "Original View"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Presets Sidebar on Left */}
        {imageDataUrl && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl">
            <label className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileSelect(file);
                }}
              />
              <span className="text-zinc-400 text-lg font-light group-hover:text-white transition-colors">+</span>
            </label>
            
            <div className="w-5 h-px bg-white/10" />

            {uploadedMediaList.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setImageDataUrl(item.url);
                  setResultUrl(null);
                  setGenerationStatus("idle");
                }}
                className={cn(
                  "h-9 w-9 rounded-xl overflow-hidden border transition-all duration-200 hover:scale-105 active:scale-95 relative",
                  imageDataUrl === item.url ? "border-amber-400 ring-2 ring-amber-500/20" : "border-white/10"
                )}
              >
                <img src={item.url} alt="Preset" className="h-full w-full object-cover pointer-events-none" />
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleFileSelect(f);
          }}
        />
      </main>

      {/* ─── RIGHT: Settings Sidebar Panel ─── */}
      <aside className="w-[320px] shrink-0 flex flex-col border-l border-white/5 bg-[#050914] z-10">
        
        {/* Header */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
              <Sun className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-200">Relight</p>
            </div>
          </div>
        </div>

        {/* Parameter configuration widgets */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          
          {/* Quick select */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-zinc-400 block">
              Quick select
            </span>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setLightAngle(preset.angle)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition-all border",
                    lightAngle === preset.angle
                      ? "bg-zinc-800 text-white border-zinc-700"
                      : "bg-[#0b1225]/40 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-[#0b1225]/60"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Draggable lighting compass sphere */}
          <LightingSphere
            angle={lightAngle}
            onChange={setLightAngle}
            thumbnailUrl={imageDataUrl}
          />

          <div className="border-t border-white/5" />

          {/* Light settings */}
          <div className="space-y-5">
            <span className="text-[11px] font-bold text-zinc-400 block">
              Light settings
            </span>
            
            {/* Soft vs Hard toggle */}
            <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 border border-white/5 rounded-xl p-1">
              {(["soft", "hard"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLightType(type)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                    lightType === type
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Brightness slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>Brightness</span>
                <span className="text-zinc-300">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-white bg-zinc-900 h-1 rounded-lg cursor-pointer appearance-none"
              />
            </div>

            {/* Color picker */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 block">
                Color
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-white/10 cursor-pointer shadow-md"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    const colorInput = document.getElementById("relight-color-picker");
                    colorInput?.click();
                  }}
                />
                <input
                  id="relight-color-picker"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="hidden"
                />
                <input
                  type="text"
                  value={color.toUpperCase()}
                  onChange={(e) => {
                    if (e.target.value.startsWith("#") && e.target.value.length <= 7) {
                      setColor(e.target.value);
                    }
                  }}
                  className="bg-transparent border-none text-xs text-zinc-300 font-mono text-right w-16 focus:outline-none"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Generate / Apply Button */}
        <div className="p-5 border-t border-white/5 bg-[#040710] space-y-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !imageDataUrl}
            className={cn(
              "w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] border shadow-lg",
              isGenerating || !imageDataUrl
                ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black border-transparent shadow-lg shadow-amber-500/10"
            )}
          >
            <span>Generate</span>
            <span className="inline-flex items-center text-[10px] bg-black/10 px-1.5 py-0.5 rounded font-black ml-1">
              5 Free Gens
            </span>
          </button>

          {errorMessage && (
            <div className="flex items-start gap-2 py-2.5 px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

      </aside>

    </div>
  );
}

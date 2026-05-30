"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Info,
  Lightbulb,
  Scissors,
  Smile,
  Ban,
  RefreshCw,
  Search,
  Brush,
  Zap,
  RotateCcw,
  MousePointerClick
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ToolShowcaseProps {
  activeTool: string;
}

// Public stable Unsplash URLs for showcases
const IMAGE_URLS = {
  relight: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&fit=crop&q=80", // Portrait woman
  bgSubject: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&fit=crop&q=80", // Red sneaker (transparent backdrop mockup)
  bgEnvironment: "https://images.unsplash.com/photo-1557683316-973673baf926?w=500&fit=crop&q=80", // Gradient art
  styleCity: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500&fit=crop&q=80", // City
  upscaleMan: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&fit=crop&q=80", // Portrait man
  landscapeYosemite: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&fit=crop&q=80" // Landscape
};

export default function ToolShowcase({ activeTool }: ToolShowcaseProps) {
  const [resetKey, setResetKey] = useState<number>(0);
  const [demoState, setDemoState] = useState<"initial" | "processing" | "completed">("initial");

  // ─── TOOL SPECIFIC STATES ───
  
  // Inpaint States
  const [inpaintMaskPoints, setInpaintMaskPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isInpaintDrawing, setIsInpaintDrawing] = useState(false);
  const inpaintCanvasRef = useRef<HTMLCanvasElement>(null);

  // Replace States
  const [replaceMaskPoints, setReplaceMaskPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isReplaceDrawing, setIsReplaceDrawing] = useState(false);
  const [replacePrompt, setReplacePrompt] = useState("a gold trophy");
  const replaceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Relight States
  const [lightX, setLightX] = useState<number>(50);
  const [lightY, setLightY] = useState<number>(35);
  const [lightColor, setLightColor] = useState<string>("#fcd34d"); // Gold/Yellow
  const [lightIntensity, setLightIntensity] = useState<number>(0.8);
  const relightContainerRef = useRef<HTMLDivElement>(null);

  // Background Remove States
  const [bgRemoveSlider, setBgRemoveSlider] = useState<number>(50);

  // Outpaint States
  const [outpaintScale, setOutpaintScale] = useState<number>(35);

  // Style States
  const [stylePreset, setStylePreset] = useState<"cyberpunk" | "oil" | "neon">("cyberpunk");

  // Draw States
  const [drawLines, setDrawLines] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [isDrawingSketch, setIsDrawingSketch] = useState(false);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Motion States
  const [motionTracked, setMotionTracked] = useState(false);
  const [motionCoord, setMotionCoord] = useState({ x: 45, y: 55 });

  // Upscale States
  const [upscaleLensPos, setUpscaleLensPos] = useState({ x: 50, y: 50 });
  const [isHoveringUpscale, setIsHoveringUpscale] = useState(false);
  const upscaleContainerRef = useRef<HTMLDivElement>(null);

  // Face Swap States
  const [faceSwapTarget, setFaceSwapTarget] = useState<"astronaut" | "neon_hacker" | "royal">("astronaut");

  // Watermark States
  const [watermarkScanProgress, setWatermarkScanProgress] = useState(0);

  // Reset internal states when tool changes
  useEffect(() => {
    setDemoState("initial");
    setInpaintMaskPoints([]);
    setReplaceMaskPoints([]);
    setLightX(50);
    setLightY(35);
    setLightColor("#fcd34d");
    setLightIntensity(0.8);
    setBgRemoveSlider(50);
    setOutpaintScale(35);
    setStylePreset("cyberpunk");
    setDrawLines([]);
    setMotionTracked(false);
    setMotionCoord({ x: 45, y: 55 });
    setFaceSwapTarget("astronaut");
    setWatermarkScanProgress(0);

    // Clear canvases
    clearCanvas(inpaintCanvasRef);
    clearCanvas(replaceCanvasRef);
    clearCanvas(drawCanvasRef);
  }, [activeTool, resetKey]);

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // General Simulation Trigger
  const triggerSimulation = () => {
    if (demoState !== "initial") return;
    setDemoState("processing");
    setTimeout(() => {
      setDemoState("completed");
    }, 1500);
  };

  // ─── EVENT HANDLERS ───

  // Canvas Drawing for Inpaint
  const handleInpaintDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = inpaintCanvasRef.current;
    if (!canvas || demoState !== "initial") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (e.type === "mousedown") {
      setIsInpaintDrawing(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (e.type === "mousemove" && isInpaintDrawing) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)"; // Translucent Red
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      setInpaintMaskPoints(prev => [...prev, { x, y }]);
    } else if (e.type === "mouseup" || e.type === "mouseleave") {
      setIsInpaintDrawing(false);
    }
  };

  // Canvas Drawing for Replace
  const handleReplaceDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = replaceCanvasRef.current;
    if (!canvas || demoState !== "initial") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (e.type === "mousedown") {
      setIsReplaceDrawing(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (e.type === "mousemove" && isReplaceDrawing) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.6)"; // Translucent Cyan
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      setReplaceMaskPoints(prev => [...prev, { x, y }]);
    } else if (e.type === "mouseup" || e.type === "mouseleave") {
      setIsReplaceDrawing(false);
    }
  };

  // Canvas Free Drawing for Draw to Edit
  const handleSketchDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas || demoState !== "initial") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (e.type === "mousedown") {
      setIsDrawingSketch(true);
      setDrawLines(prev => [...prev, [{ x, y }]]);
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (e.type === "mousemove" && isDrawingSketch) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#3b82f6"; // Blue Sketch Pencil
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
      setDrawLines(prev => {
        const next = [...prev];
        next[next.length - 1].push({ x, y });
        return next;
      });
    } else if (e.type === "mouseup" || e.type === "mouseleave") {
      setIsDrawingSketch(false);
    }
  };

  // Relight Drag Move
  const handleRelightMouseMove = (e: React.MouseEvent) => {
    if (!relightContainerRef.current) return;
    const rect = relightContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLightX(Math.max(0, Math.min(100, x)));
    setLightY(Math.max(0, Math.min(100, y)));
  };

  // Upscale Lens Move
  const handleUpscaleMouseMove = (e: React.MouseEvent) => {
    if (!upscaleContainerRef.current) return;
    const rect = upscaleContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setUpscaleLensPos({ x, y });
  };

  // Watermark removal scan simulation
  const startWatermarkRemoval = () => {
    if (demoState !== "initial") return;
    setDemoState("processing");
    setWatermarkScanProgress(0);
    const interval = setInterval(() => {
      setWatermarkScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDemoState("completed");
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  // ─── GET TOOL DETAILS (METADATA) ───
  const getToolMetadata = () => {
    switch (activeTool) {
      case "inpaint":
        return {
          title: "Smart Inpaint",
          description: "Effortlessly erase unwanted objects, blemishes or wires. The AI reconstructs details underneath seamlessly.",
          steps: [
            "Draw a mask directly over the object using your cursor.",
            "Adjust brush size to match the target details perfectly.",
            "Click Apply to run context-aware inpainting and heal the image."
          ]
        };
      case "replace":
        return {
          title: "Object Replace",
          description: "Swap elements inside an image. Paint over any subject and describe its replacement in text.",
          steps: [
            "Paint over the object you want to replace (e.g., an apple).",
            "Type your replacement prompt in the prompt input field.",
            "Click Apply to generate the new object blending textures and lighting."
          ]
        };
      case "relight":
        return {
          title: "AI Relight",
          description: "Alter light directions, casting, and colors in three dimensions to match customized ambient layouts.",
          steps: [
            "Configure light intensity, tone, and select a source color.",
            "Drag the virtual light bulb node around the image canvas to test shadow mapping.",
            "Click Apply to render the model with fully fused depth-aware illumination."
          ]
        };
      case "bgremove":
        return {
          title: "Background Remove",
          description: "Isolate subjects and strip backgrounds instantly. Ideal for high-quality product and portrait renders.",
          steps: [
            "Upload any image containing clear subjects or foreground elements.",
            "Choose edge-feathering radius and transparency formats (PNG/WebP).",
            "Click Apply to execute background removal and acquire clean transparency."
          ]
        };
      case "outpaint":
        return {
          title: "Expand & Outpaint",
          description: "Extend boundaries beyond the native frame. Synthesizes background textures in any aspect ratio.",
          steps: [
            "Set the outpaint scale to dictate the canvas extension size.",
            "Specify target expansion directions (all sides, horizontal, or vertical).",
            "Click Apply to run generative fill and extend your scenery."
          ]
        };
      case "style":
        return {
          title: "Style Transfer",
          description: "Blend color grading, ambient noise, and stylistic patterns onto images using preset stylistic filters.",
          steps: [
            "Pick a style preset card (Cyberpunk, Oil Painting, Neon Synthwave).",
            "Fine-tune the style intensity blend slider to control visual weight.",
            "Click Apply to fuse styling textures with the structural layout."
          ]
        };
      case "draw":
        return {
          title: "Draw to Edit",
          description: "Translate rough sketches into high-fidelity rendered artwork based on structural lines.",
          steps: [
            "Draw simple line-art shapes using the drawing canvas tool.",
            "Describe the scene (e.g. 'a glowing blue rose') to guide the generator.",
            "Click Apply to interpret the sketch contours and generate final detailed art."
          ]
        };
      case "motion":
        return {
          title: "Motion Track Edit",
          description: "Attach tracking nodes to select objects and customize movement velocity within videos.",
          steps: [
            "Load a video clip and select the tracking speed from the panel.",
            "Click on the object inside the canvas viewer to lock the motion tracker.",
            "Click Apply to generate stabilized tracking adjustments."
          ]
        };
      case "upscale":
        return {
          title: "AI Upscale & Enhance",
          description: "Boost resolution and sharpness up to 4K. Resolves texture details and enhances facial features.",
          steps: [
            "Choose the upscale scale factor (2x, 4x, or 8x).",
            "Toggle Face Enhance to reconstruct high-fidelity facial details.",
            "Click Apply to rebuild details, remove compression artifacts, and sharpen."
          ]
        };
      case "faceswap":
        return {
          title: "Face Swap Pro",
          description: "Seamlessly replace faces in images. Matches target tones, skin colors, and lighting angles automatically.",
          steps: [
            "Upload the base picture containing the target face.",
            "Upload or choose the source face portrait to swap in.",
            "Click Apply to blend face shapes, lighting angles, and skin tones."
          ]
        };
      case "watermark":
        return {
          title: "Watermark Remover",
          description: "Remove logos, burn-in captions, and watermarks from videos with temporal stability.",
          steps: [
            "Load the watermark-ridden video file (supports up to 10 minutes).",
            "The AI automatically localizes logos, corner bugs, and tickers across frames.",
            "Click Apply to execute temporal-aware inpainting with zero flickering."
          ]
        };
      default:
        return {
          title: "AI Editor Engine",
          description: "Advanced editor tool to perform smart transformations with a single click.",
          steps: ["Upload your media file.", "Configure side panel parameters.", "Apply generation."]
        };
    }
  };

  const meta = getToolMetadata();

  return (
    <div className="space-y-6">
      {/* ─── TITLE & CONTROLS ─── */}
      <div className="space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3 w-3 fill-current animate-pulse" />
            <span>Interactive Showcase</span>
          </span>
          <button
            type="button"
            onClick={() => setResetKey(prev => prev + 1)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Demo</span>
          </button>
        </div>
        <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">{meta.title}</h4>
        <p className="text-[11px] text-zinc-400 leading-relaxed font-semibold">{meta.description}</p>
      </div>

      {/* ─── REAL INTERACTIVE PLAYGROUNDS ─── */}
      <div className="bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden relative shadow-inner group select-none">
        
        {/* 1. SMART INPAINT PLAYGROUND */}
        {activeTool === "inpaint" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
              
              {/* Yosemite Landscape Image */}
              <img 
                src={IMAGE_URLS.landscapeYosemite} 
                alt="Landscape"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Target Floating Object to Remove (Red Balloon) */}
              <AnimatePresence>
                {demoState !== "completed" && (
                  <motion.div 
                    exit={{ opacity: 0, scale: 0.7, filter: "blur(8px)" }}
                    transition={{ duration: 0.6 }}
                    className="absolute"
                    style={{ top: "35%", left: "42%" }}
                  >
                    <svg className="w-10 h-10 text-rose-500 drop-shadow-md animate-bounce" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="10" r="8" />
                      <path d="M12,18 L12,24" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drawing Canvas */}
              <canvas
                ref={inpaintCanvasRef}
                width={260}
                height={162}
                onMouseDown={handleInpaintDraw}
                onMouseMove={handleInpaintDraw}
                onMouseUp={handleInpaintDraw}
                onMouseLeave={handleInpaintDraw}
                className="absolute inset-0 z-10 cursor-crosshair"
              />

              {/* Instruction banner if canvas is untouched */}
              {inpaintMaskPoints.length === 0 && demoState === "initial" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 pointer-events-none z-20">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                    <Brush className="h-3.5 w-3.5 text-rose-400" />
                    <span>Drag to Paint Over Balloon</span>
                  </span>
                </div>
              )}

              {/* Loader */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-30">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-t-rose-500 border-r-transparent animate-spin" />
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest animate-pulse">Inpainting...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2 z-20">
              {inpaintMaskPoints.length > 0 && demoState === "initial" && (
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 text-[10px] font-black text-white flex items-center gap-1.5 animate-pulse shadow-lg"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Erase Painted Object</span>
                </button>
              )}
              {demoState === "completed" && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  ✓ Object Removed Cleanly!
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2. OBJECT REPLACE PLAYGROUND */}
        {activeTool === "replace" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
              {/* Yosemite Landscape Image */}
              <img 
                src={IMAGE_URLS.landscapeYosemite} 
                alt="Landscape"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* The Target Object to Replace (An Apple) */}
              <div className="absolute" style={{ bottom: "25%", left: "42%" }}>
                <AnimatePresence mode="wait">
                  {demoState !== "completed" ? (
                    <motion.div 
                      key="apple"
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="text-center"
                    >
                      <span className="text-3xl filter drop-shadow-md select-none">🍎</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="replacement"
                      initial={{ opacity: 0, scale: 0.5, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="text-center"
                    >
                      {replacePrompt.toLowerCase().includes("trophy") || replacePrompt.toLowerCase().includes("gold") ? (
                        <span className="text-3xl filter drop-shadow-md select-none">🏆</span>
                      ) : replacePrompt.toLowerCase().includes("car") ? (
                        <span className="text-3xl filter drop-shadow-md select-none">🚗</span>
                      ) : (
                        <span className="text-3xl filter drop-shadow-md select-none">🎁</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Drawing Canvas */}
              <canvas
                ref={replaceCanvasRef}
                width={260}
                height={162}
                onMouseDown={handleReplaceDraw}
                onMouseMove={handleReplaceDraw}
                onMouseUp={handleReplaceDraw}
                onMouseLeave={handleReplaceDraw}
                className="absolute inset-0 z-10 cursor-crosshair"
              />

              {/* Mask Instruction overlay */}
              {replaceMaskPoints.length === 0 && demoState === "initial" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 pointer-events-none z-20">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                    <Brush className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Paint Over Apple First</span>
                  </span>
                </div>
              )}

              {/* Processing Loader */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-30">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-t-cyan-400 border-r-transparent animate-spin" />
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">Replacing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Replacement prompt and trigger */}
            <div className="w-full max-w-[260px] space-y-2 z-20">
              {replaceMaskPoints.length > 0 && demoState === "initial" && (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={replacePrompt}
                      onChange={(e) => setReplacePrompt(e.target.value)}
                      placeholder="Describe new object..."
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-200 outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={triggerSimulation}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[10px] font-black text-white flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                </div>
              )}
              {demoState === "completed" && (
                <div className="text-center">
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ✓ Swapped with {replacePrompt}!
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. AI RELIGHT PLAYGROUND */}
        {activeTool === "relight" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div 
              ref={relightContainerRef}
              onMouseMove={handleRelightMouseMove}
              className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-black cursor-crosshair"
            >
              {/* High-quality Portrait base */}
              <img 
                src={IMAGE_URLS.relight} 
                alt="Portrait"
                className="absolute inset-0 w-full h-full object-cover select-none filter brightness-50"
              />

              {/* Dynamic Illuminance Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-color-dodge"
                style={{
                  background: `radial-gradient(circle 90px at ${lightX}% ${lightY}%, ${lightColor} 0%, transparent 100%)`,
                  opacity: lightIntensity
                }}
              />

              {/* Floating Lightbulb Controller */}
              <div 
                className="absolute h-5 w-5 rounded-full bg-white shadow-2xl flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
                style={{
                  left: `${lightX}%`,
                  top: `${lightY}%`,
                  boxShadow: `0 0 25px 6px ${lightColor}`
                }}
              >
                <Lightbulb className="h-3 w-3 text-zinc-950 fill-current" />
              </div>
            </div>

            {/* Relight parameters panel */}
            <div className="w-full max-w-[260px] space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                <span>Drag bulb over face to shift shadows</span>
                <div className="flex gap-1.5">
                  {(["#fcd34d", "#f43f5e", "#3b82f6", "#10b981"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLightColor(c)}
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border transition-transform active:scale-90",
                        lightColor === c ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-500">Intensity:</span>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={lightIntensity}
                  onChange={(e) => setLightIntensity(Number(e.target.value))}
                  className="flex-1 accent-amber-500 h-1 bg-zinc-800 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. BACKGROUND REMOVE PLAYGROUND */}
        {activeTool === "bgremove" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
              
              {/* Checkered Transparent Grid layer */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:10px_10px]" />

              {/* The Environmental Background (clipped) */}
              <div 
                className="absolute inset-y-0 left-0 bg-zinc-900 transition-all overflow-hidden"
                style={{ width: `${bgRemoveSlider}%` }}
              >
                <img 
                  src={IMAGE_URLS.bgEnvironment} 
                  alt="Background environment"
                  className="absolute inset-0 h-full w-[260px] object-cover max-w-none select-none filter blur-[1px] brightness-75"
                />
              </div>

              {/* Isolated Subject (Sneaker) sitting on top */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <img 
                  src={IMAGE_URLS.bgSubject} 
                  alt="Sneaker cutout"
                  className="w-36 object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
                />
              </div>

              {/* Slider Split line */}
              <div 
                className="absolute inset-y-0 w-0.5 bg-rose-500 cursor-ew-resize z-20"
                style={{ left: `${bgRemoveSlider}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5.5 w-5.5 rounded-full bg-rose-500 border border-white flex items-center justify-center shadow-2xl">
                  <span className="text-[9px] font-black text-white font-mono">↔</span>
                </div>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="0"
                max="100"
                value={bgRemoveSlider}
                onChange={(e) => setBgRemoveSlider(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize z-30"
              />
            </div>

            <span className="text-[10px] font-bold text-zinc-500">Slide to reveal background removal checkerboard</span>
          </div>
        )}

        {/* 5. EXPAND & OUTPAINT PLAYGROUND */}
        {activeTool === "outpaint" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Blur-outpainted margins */}
              <img 
                src={IMAGE_URLS.landscapeYosemite} 
                alt="Blur Outpainted edges" 
                className="absolute inset-0 w-full h-full object-cover filter blur-[8px] brightness-[0.4] select-none scale-110"
              />
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />

              {/* Central Core Original Image */}
              <div 
                className="border border-emerald-500/30 rounded-lg bg-zinc-900 transition-all duration-150 overflow-hidden flex items-center justify-center shadow-2xl"
                style={{
                  width: `${100 - outpaintScale}%`,
                  height: `${100 - outpaintScale}%`
                }}
              >
                <img 
                  src={IMAGE_URLS.landscapeYosemite} 
                  alt="Original content" 
                  className="w-full h-full object-cover select-none"
                />
              </div>

              {/* Expanded labels */}
              <div className="absolute inset-y-0 left-0 flex items-center pl-1 select-none pointer-events-none">
                <span className="text-[7.5px] font-black text-emerald-400/40 uppercase tracking-widest writing-vertical rotate-180">Generated Area</span>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 select-none pointer-events-none">
                <span className="text-[7.5px] font-black text-emerald-400/40 uppercase tracking-widest writing-vertical">Generated Area</span>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-[260px] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                <span>Outpaint Canvas Scale:</span>
                <span className="text-emerald-400 font-mono">+{outpaintScale}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="65"
                value={outpaintScale}
                onChange={(e) => setOutpaintScale(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg outline-none"
              />
            </div>
          </div>
        )}

        {/* 6. STYLE TRANSFER PLAYGROUND */}
        {activeTool === "style" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Skyline Base with CSS Filter styles */}
              <img 
                src={IMAGE_URLS.styleCity} 
                alt="Skyline City"
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-all duration-500 select-none",
                  stylePreset === "cyberpunk" && "hue-rotate-[290deg] saturate-[2.1] contrast-[1.15]",
                  stylePreset === "oil" && "sepia-[0.35] saturate-[1.3] brightness-[0.95] contrast-[1.1] blur-[0.3px]",
                  stylePreset === "neon" && "hue-rotate-[160deg] saturate-[2.5] brightness-[1.05]"
                )}
              />

              {/* Ambient Glow Gradient Overlays */}
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-500"
                style={{
                  background: stylePreset === "cyberpunk" 
                    ? "linear-gradient(to top, rgba(219,39,119,0.35), rgba(124,58,237,0.15))" 
                    : stylePreset === "oil"
                    ? "linear-gradient(to top, rgba(180,83,9,0.2), rgba(59,130,246,0.1))"
                    : "linear-gradient(to top, rgba(6,182,212,0.4), transparent)"
                }}
              />
            </div>

            {/* Presets Grid */}
            <div className="flex gap-2">
              {(["cyberpunk", "oil", "neon"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStylePreset(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider transition-all",
                    stylePreset === p
                      ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {p === "cyberpunk" && "Cyberpunk"}
                  {p === "oil" && "Oil Canvas"}
                  {p === "neon" && "Synth Neon"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. DRAW TO EDIT PLAYGROUND */}
        {activeTool === "draw" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Initial Sketch Guide */}
              {drawLines.length === 0 && demoState === "initial" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 pointer-events-none z-20">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                    <Brush className="h-3.5 w-3.5 text-blue-400" />
                    <span>Sketch a Shape in Canvas</span>
                  </span>
                </div>
              )}

              {/* Free-drawing Canvas */}
              <canvas
                ref={drawCanvasRef}
                width={260}
                height={162}
                onMouseDown={handleSketchDraw}
                onMouseMove={handleSketchDraw}
                onMouseUp={handleSketchDraw}
                onMouseLeave={handleSketchDraw}
                className={cn("absolute inset-0 z-10 cursor-crosshair", demoState !== "initial" && "pointer-events-none")}
              />

              {/* Output Rendered Art */}
              <AnimatePresence>
                {demoState === "completed" && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 p-2"
                  >
                    {/* Rendered detailed flower matching line contours */}
                    <svg className="w-24 h-24 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.55)]" viewBox="0 0 100 100" fill="currentColor">
                      <circle cx="50" cy="50" r="10" fill="#3b82f6" />
                      <path d="M50,15 C42,27 42,38 50,44 C58,38 58,27 50,15 Z" fill="#60a5fa" />
                      <path d="M50,85 C42,73 42,62 50,56 C58,62 58,73 50,85 Z" fill="#60a5fa" />
                      <path d="M15,50 C27,42 38,42 44,50 C38,58 27,58 15,50 Z" fill="#93c5fd" />
                      <path d="M85,50 C73,42 62,42 56,50 C62,58 73,58 85,50 Z" fill="#93c5fd" />
                    </svg>
                    <span className="text-[9px] font-black text-blue-400 mt-1 uppercase tracking-wider animate-pulse">3D Rendered Object</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Processing state */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-30">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-t-blue-400 border-r-transparent animate-spin" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Rendering Sketch...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 z-20">
              {drawLines.length > 0 && demoState === "initial" && (
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] font-black text-white flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Render Sketch to Art</span>
                </button>
              )}
              {demoState === "completed" && (
                <span className="text-[10px] text-emerald-400 font-bold">
                  ✓ Sketch Rendered Successfully!
                </span>
              )}
            </div>
          </div>
        )}

        {/* 8. MOTION TRACK PLAYGROUND */}
        {activeTool === "motion" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div 
              onClick={() => {
                if (demoState === "initial") {
                  setMotionTracked(true);
                  triggerSimulation();
                }
              }}
              className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 cursor-crosshair flex items-center justify-center"
            >
              {/* Environment backdrop representation */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-zinc-950" />
              
              {/* Dotted path tracking grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Moving Drone Subject */}
              <motion.div 
                animate={{
                  x: [0, 40, -40, 0],
                  y: [0, -30, 20, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                onUpdate={(latest) => {
                  const x = 50 + Number(latest.x || 0) / 4.5;
                  const y = 50 + Number(latest.y || 0) / 3;
                  setMotionCoord({ x, y });
                }}
                className="absolute flex flex-col items-center"
              >
                {/* Drone SVG */}
                <svg className="w-12 h-12 text-orange-500 drop-shadow-[0_8px_16px_rgba(249,115,22,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2 C13.1,2 14,2.9 14,4 L19,4 C20.1,4 21,4.9 21,6 L21,9 L23,9 L23,11 L21,11 L21,14 L23,14 L23,16 L21,16 C21,17.1 20.1,18 19,18 L14,18 C14,19.1 13.1,20 12,20 C10.9,20 10,19.1 10,18 L5,18 C3.9,18 3,17.1 3,16 L3,13 L1,13 L1,11 L3,11 L3,8 C3,6.9 3.9,6 5,6 L10,6 C10,4.9 10.9,2 12,2 Z" />
                </svg>
              </motion.div>

              {/* Dynamic Tracking Reticle */}
              {motionTracked && (
                <div 
                  className="absolute h-10 w-10 border-2 border-dashed border-orange-400 rounded-full flex items-center justify-center transition-all duration-75 select-none pointer-events-none"
                  style={{
                    left: `${motionCoord.x}%`,
                    top: `${motionCoord.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                >
                  {/* Glowing core dot */}
                  <div className="h-1.5 w-1.5 bg-orange-400 rounded-full animate-ping" />
                  
                  {/* Coordinates tracking label */}
                  <div className="absolute top-11 bg-black/80 text-[7px] text-orange-400 font-mono px-1.5 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">
                    X: {motionCoord.x.toFixed(0)} Y: {motionCoord.y.toFixed(0)}
                  </div>
                </div>
              )}

              {/* Tap to lock banner */}
              {!motionTracked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                    <MousePointerClick className="h-4.5 w-4.5 text-orange-400" />
                    <span>Click on Drone to Lock Track</span>
                  </span>
                </div>
              )}
            </div>

            {/* Tracker status */}
            <div className="text-center">
              {demoState === "completed" ? (
                <span className="text-[10px] text-emerald-400 font-bold animate-pulse">✓ Tracking locked & stabilizing...</span>
              ) : (
                <span className="text-[9px] text-zinc-500">Real-time object coordinates calculations mapping</span>
              )}
            </div>
          </div>
        )}

        {/* 9. AI UPSCALE PLAYGROUND */}
        {activeTool === "upscale" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div 
              ref={upscaleContainerRef}
              onMouseMove={handleUpscaleMouseMove}
              onMouseEnter={() => setIsHoveringUpscale(true)}
              onMouseLeave={() => setIsHoveringUpscale(false)}
              className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 cursor-none flex items-center justify-center"
            >
              {/* Blur pixelated image (LQ version) */}
              <div className="absolute inset-0 blur-[3px] select-none filter contrast-90 brightness-95">
                <img 
                  src={IMAGE_URLS.upscaleMan} 
                  alt="LQ representation" 
                  className="w-full h-full object-cover scale-[1.01]"
                />
              </div>

              {/* Lens magnification circle (HQ version) */}
              {isHoveringUpscale && (
                <div 
                  className="absolute h-20 w-20 rounded-full border-2 border-teal-400 shadow-2xl overflow-hidden pointer-events-none flex items-center justify-center bg-zinc-950"
                  style={{
                    left: `${upscaleLensPos.x}%`,
                    top: `${upscaleLensPos.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                >
                  {/* Sharp image correctly positioned within lens frame */}
                  <img 
                    src={IMAGE_URLS.upscaleMan} 
                    alt="HQ sharp representation" 
                    className="absolute max-w-none h-[162px] object-cover"
                    style={{
                      width: "260px",
                      left: `-${(upscaleLensPos.x / 100) * 260 - 40}px`,
                      top: `-${(upscaleLensPos.y / 100) * 162 - 40}px`
                    }}
                  />
                </div>
              )}

              {/* Overlay hover banner */}
              {!isHoveringUpscale && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Search className="h-4 w-4" />
                    <span>Hover Cursor to Compare Details</span>
                  </span>
                </div>
              )}
            </div>

            <span className="text-[9px] font-bold text-zinc-500">Magnifier reveals recovered eye, skin & hair high-frequency details</span>
          </div>
        )}

        {/* 10. FACE SWAP PLAYGROUND */}
        {activeTool === "faceswap" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Background environment layer */}
              <div className="absolute inset-0 bg-zinc-950" />

              {/* Main Model Frame */}
              <div className="relative flex flex-col items-center">
                
                {/* Reference Costume template */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {faceSwapTarget === "astronaut" && (
                      <motion.div 
                        key="astro"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Astronaut Helmet outline */}
                        <svg className="w-20 h-20 text-cyan-400/90" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,2 C13.1,2 14,2.9 14,4 L19,4 L19,22 C19,22.5 17.5,23 17,23 L7,23 L7,4 Z" />
                          <circle cx="12" cy="10" r="5" fill="#0c1328" />
                        </svg>
                      </motion.div>
                    )}
                    {faceSwapTarget === "neon_hacker" && (
                      <motion.div 
                        key="hacker"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Cyber hood outline */}
                        <svg className="w-20 h-20 text-fuchsia-500/90" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,2 C6,2 3,6 3,12 L3,22 L21,22 L21,12 C21,6 18,2 12,2 Z" />
                          <polygon points="12,6 6,18 18,18" fill="#140a1c" />
                        </svg>
                      </motion.div>
                    )}
                    {faceSwapTarget === "royal" && (
                      <motion.div 
                        key="royal"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Royal crown/clothing outline */}
                        <svg className="w-20 h-20 text-amber-400/90" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2,22 L22,22 L19,8 L15,13 L12,6 L9,13 L5,8 Z" />
                          <rect x="8" y="14" width="8" height="8" fill="#1c1206" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Swapped Face Image fitted inside helmet/hood cutout */}
                  <div className="absolute h-9.5 w-9.5 rounded-full overflow-hidden border border-white/20 bg-zinc-950 flex items-center justify-center z-10" style={{ top: "34%" }}>
                    <img 
                      src={IMAGE_URLS.relight} 
                      alt="Swapped face details" 
                      className={cn(
                        "w-full h-full object-cover transition-all duration-300",
                        faceSwapTarget === "astronaut" && "brightness-105 contrast-100",
                        faceSwapTarget === "neon_hacker" && "hue-rotate-[280deg] saturate-150 contrast-125",
                        faceSwapTarget === "royal" && "sepia-[0.25] saturate-110 brightness-95"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Selection chips */}
            <div className="flex gap-2">
              {(["astronaut", "neon_hacker", "royal"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFaceSwapTarget(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider transition-all",
                    faceSwapTarget === t
                      ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {t === "astronaut" && "Astronaut"}
                  {t === "neon_hacker" && "Cyber Hacker"}
                  {t === "royal" && "Royal Noble"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 11. WATERMARK REMOVER PLAYGROUND */}
        {activeTool === "watermark" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[190px] space-y-4">
            <div className="relative w-full aspect-[16/10] max-w-[260px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
              
              {/* Backdrop video representation */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-zinc-900 to-indigo-950" />

              {/* Watermark Logo text overlay */}
              {demoState !== "completed" && (
                <div 
                  className={cn(
                    "absolute top-2 right-2 text-[8px] font-black tracking-wider bg-black/40 px-2 py-0.5 rounded border border-white/10 text-white/55",
                    demoState === "processing" && "text-red-400 animate-pulse border-red-500/10"
                  )}
                >
                  KLING WATERMARK
                </div>
              )}

              {/* Lower Captions */}
              {demoState !== "completed" && (
                <div 
                  className={cn(
                    "absolute bottom-2 left-0 right-0 text-center text-[7.5px] font-bold text-yellow-100/50 bg-black/10 py-0.5",
                    demoState === "processing" && "opacity-45"
                  )}
                >
                  [Lower-third captions overlay]
                </div>
              )}

              {/* Sweep Scanline */}
              {demoState === "processing" && (
                <div 
                  className="absolute inset-y-0 w-0.5 bg-indigo-500 shadow-[0_0_15px_#6366f1]"
                  style={{ left: `${watermarkScanProgress}%` }}
                />
              )}

              {/* Clean Output sign */}
              {demoState === "completed" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
                >
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Video Restored (Clean Plate)
                  </span>
                </motion.div>
              )}
            </div>

            {/* Sweep Control button */}
            <div className="flex gap-2">
              {demoState === "initial" && (
                <button
                  type="button"
                  onClick={startWatermarkRemoval}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-indigo-500/30 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Ban className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Scan & Clean Logo</span>
                </button>
              )}
              {demoState === "completed" && (
                <button
                  type="button"
                  onClick={() => setDemoState("initial")}
                  className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-[9px] font-bold text-zinc-400 hover:text-zinc-200"
                >
                  Reset Playback
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ─── MECHANISM OF ACTION (STEP-BY-STEP) ─── */}
      <div className="space-y-3.5 border-t border-white/5 pt-4 text-left">
        <div className="flex items-center gap-1.5 text-zinc-400 select-none">
          <Info className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-wider">Step-by-Step Instructions</span>
        </div>

        <div className="space-y-3">
          {meta.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 items-start group">
              {/* Index counter */}
              <div className="h-5 w-5 rounded-full bg-zinc-900 border border-white/10 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 text-[9px] font-black text-zinc-400 group-hover:text-cyan-400 flex items-center justify-center shrink-0 transition-colors select-none font-mono">
                {idx + 1}
              </div>
              
              {/* Step text */}
              <p className="text-[10.5px] text-zinc-400 group-hover:text-zinc-300 leading-relaxed font-semibold transition-colors mt-0.5">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

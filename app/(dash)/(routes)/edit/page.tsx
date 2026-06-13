"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Upload,
  Smile,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ToolShowcase from "@/components/ToolShowcase";
import RelightPage from "../apps/tool/relight/page";
import FaceSwapPage from "../apps/tool/face-swap/page";
import NanoBananaInpaintPage from "../apps/tool/nano-banana-pro-inpaint/page";

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
    id: "bgremove",
    label: "Background Remover",
    icon: Eraser,
    color: "text-blue-400",
    border: "border-blue-500",
    glow: "shadow-blue-500/50",
    hex: "#3b82f6",
    glowHex: "rgba(59,130,246,0.45)",
    description: "Remove image backgrounds instantly and replace them with transparency or solid colors.",
  },
  {
    id: "inpaint",
    label: "Smart Inpaint",
    icon: PenTool,
    color: "text-purple-400",
    border: "border-purple-500",
    glow: "shadow-purple-500/50",
    hex: "#a855f7",
    glowHex: "rgba(168,85,247,0.45)",
    description: "Fill or restore masked areas using AI context from surrounding pixels.",
  },
  {
    id: "replace",
    label: "Object Remover",
    icon: Ban,
    color: "text-rose-400",
    border: "border-rose-500",
    glow: "shadow-rose-500/50",
    hex: "#f43f5e",
    glowHex: "rgba(244,63,94,0.45)",
    description: "Paint an object and specify a prompt to replace it with a new AI-generated element.",
  },
  {
    id: "faceswap",
    label: "Face Swap Pro",
    icon: Smile,
    color: "text-emerald-400",
    border: "border-emerald-500",
    glow: "shadow-emerald-500/50",
    hex: "#10b981",
    glowHex: "rgba(16,185,129,0.45)",
    description: "Instant online AI face swap for photos, delivering realistic, watermark-free results.",
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
    id: "upscale",
    label: "AI Upscale & Enhance",
    icon: Layers,
    color: "text-teal-400",
    border: "border-teal-500",
    glow: "shadow-teal-500/50",
    hex: "#14b8a6",
    glowHex: "rgba(20,184,166,0.45)",
    description: "Enhance image resolution, restore clarity, and sharpen fine details using AI upscale.",
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
    description: "Apply modern artistic and cinematic styles to your images.",
  },
  {
    id: "watermark",
    label: "Watermark Remover",
    icon: Ban,
    color: "text-indigo-400",
    border: "border-indigo-500",
    glow: "shadow-indigo-500/50",
    hex: "#6366f1",
    glowHex: "rgba(99,102,241,0.45)",
    description: "Remove watermarks, logos, captions, and unwanted text from videos.",
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
  const [activeTool, setActiveTool] = useState<string>("upscale");
  const [selectedModel, setSelectedModel] = useState<EditModel>(EDIT_MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [brushOpacity, setBrushOpacity] = useState(0.6);
  const [editStrength, setEditStrength] = useState(0.75);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [simulatedWarning, setSimulatedWarning] = useState<string | null>(null);

  // Redesign states
  const [originalMediaUrl, setOriginalMediaUrl] = useState("/explore/tool-upscale.jpg");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [upscaleSharpness, setUpscaleSharpness] = useState(0.6);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Drawing & Canvas States
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showInlight, setShowInlight] = useState(true);
  const [mediaUrl, setMediaUrl] = useState("/explore/tool-upscale.jpg");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [faceImageUrl, setFaceImageUrl] = useState("");
  const [isUploadingFace, setIsUploadingFace] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);

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

  const [upscaleFactor, setUpscaleFactor] = useState("1");
  const [upscaleResolution, setUpscaleResolution] = useState("720"); // 480, 720, 1080
  const [upscaleDenoise, setUpscaleDenoise] = useState(0.3);
  const [upscaleFaceEnhance, setUpscaleFaceEnhance] = useState(true);
  const [upscaleModel, setUpscaleModel] = useState("topaz");
  const [upscaleModelOpen, setUpscaleModelOpen] = useState(false);
  const [upscaleAdvancedOpen, setUpscaleAdvancedOpen] = useState(false);
  const [uploadedMediaList, setUploadedMediaList] = useState<Array<{ url: string; type: "image" | "video" }>>([
    { url: "/explore/gallery-mixed-media-1.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-1.jpg", type: "image" },
  ]);

  const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const getActionLabel = () => {
    switch (activeTool) {
      case "upscale":
        return "Upscale";
      case "watermark":
        return "Remove Watermark";
      case "faceswap":
        return "Face Swap";
      case "bgremove":
        return "Remove Background";
      case "inpaint":
        return "Smart Inpaint";
      case "replace":
        return "Object Replace";
      case "relight":
        return "AI Relight";
      case "outpaint":
        return "Expand & Outpaint";
      case "style":
        return "Style Transfer";
      case "draw":
        return "Draw to Edit";
      case "motion":
        return "Motion Track";
      default:
        return "Apply Generation";
    }
  };

  const ALL_EDIT_TOOLS_MAP: Record<string, Omit<EditTool, "id">> = {
    upscale: {
      label: "AI Upscale & Enhance",
      icon: Layers,
      color: "text-teal-400",
      border: "border-teal-500",
      glow: "shadow-teal-500/50",
      hex: "#14b8a6",
      glowHex: "rgba(20,184,166,0.45)",
      description: "Enhance image resolution, restore clarity, and sharpen fine details using AI upscale.",
    },
    inpaint: {
      label: "Smart Inpaint",
      icon: PenTool,
      color: "text-violet-400",
      border: "border-violet-500",
      glow: "shadow-violet-500/50",
      hex: "#8b5cf6",
      glowHex: "rgba(139,92,246,0.45)",
      description: "Fill or restore masked areas using AI context from surrounding pixels.",
    },
    relight: {
      label: "AI Relight",
      icon: Lightbulb,
      color: "text-amber-400",
      border: "border-amber-500",
      glow: "shadow-amber-500/50",
      hex: "#f59e0b",
      glowHex: "rgba(245,158,11,0.45)",
      description: "Non-destructively shift light direction, color, and intensity.",
    },
    faceswap: {
      label: "Face Swap Pro",
      icon: Smile,
      color: "text-fuchsia-400",
      border: "border-fuchsia-500",
      glow: "shadow-fuchsia-500/50",
      hex: "#d946ef",
      glowHex: "rgba(217,70,239,0.45)",
      description: "Instant online AI face swap for photos, delivering realistic, watermark-free results.",
    },
    watermark: {
      label: "Watermark Remover",
      icon: Ban,
      color: "text-indigo-400",
      border: "border-indigo-500",
      glow: "shadow-indigo-500/50",
      hex: "#6366f1",
      glowHex: "rgba(99,102,241,0.45)",
      description: "Remove watermarks, logos, captions, and unwanted text from videos.",
    },
    bgremove: {
      label: "Background Remover",
      icon: Eraser,
      color: "text-rose-400",
      border: "border-rose-500",
      glow: "shadow-rose-500/50",
      hex: "#f43f5e",
      glowHex: "rgba(244,63,94,0.45)",
      description: "Remove image backgrounds instantly and replace them with transparency or solid colors.",
    },
    outpaint: {
      label: "Expand & Outpaint",
      icon: LayoutGrid,
      color: "text-emerald-400",
      border: "border-emerald-500",
      glow: "shadow-emerald-500/50",
      hex: "#10b981",
      glowHex: "rgba(16,185,129,0.45)",
      description: "Extend images outwards beyond their original margins using generative fill.",
    },
    style: {
      label: "Style Transfer",
      icon: Palette,
      color: "text-pink-400",
      border: "border-pink-500",
      glow: "shadow-pink-500/50",
      hex: "#ec4899",
      glowHex: "rgba(236,72,153,0.45)",
      description: "Apply modern artistic and cinematic styles to your images.",
    },
    draw: {
      label: "Draw to Edit",
      icon: PenTool,
      color: "text-cyan-400",
      border: "border-cyan-500",
      glow: "shadow-cyan-500/50",
      hex: "#06b6d4",
      glowHex: "rgba(6,182,212,0.45)",
      description: "Sketch and paint your edits directly onto the canvas to guide the generative process.",
    },
    motion: {
      label: "Motion Track",
      icon: Clapperboard,
      color: "text-orange-400",
      border: "border-orange-500",
      glow: "shadow-orange-500/50",
      hex: "#f97316",
      glowHex: "rgba(249,115,22,0.45)",
      description: "Track motion paths and generate camera movement patterns.",
    },
    replace: {
      label: "Object Replace",
      icon: Wand2,
      color: "text-sky-400",
      border: "border-sky-500",
      glow: "shadow-sky-500/50",
      hex: "#38bdf8",
      glowHex: "rgba(56,189,248,0.45)",
      description: "Paint an object and specify a prompt to replace it with a new AI-generated element.",
    },
  };

  const currentTool = EDIT_TOOLS.find((t) => t.id === activeTool) ?? {
    id: activeTool,
    ...(ALL_EDIT_TOOLS_MAP[activeTool] ?? {
      label: "AI Editor",
      icon: Scissors,
      color: "text-cyan-400",
      border: "border-cyan-500",
      glow: "shadow-cyan-500/50",
      hex: "#22d3ee",
      glowHex: "rgba(34,211,238,0.45)",
      description: "AI image editing tool.",
    }),
  };

  // File Upload Handler with Direct Cloud Upload Fallback (fixes 413 Payload Too Large)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setSimulatedWarning(null);
    try {
      let publicUrl = "";

      // Attempt 1: Try multipart/form-data upload via local server
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          publicUrl = data.publicUrl;
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err) {
        console.warn("Local server upload failed (possibly due to size limits), attempting direct S3/R2 upload fallback...", err);

        // Attempt 2: Direct browser PUT upload to S3/R2 using signed URL (bypasses Nginx client_max_body_size and Vercel limits)
        const signRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!signRes.ok) {
          const errText = await signRes.text();
          throw new Error(`Cloud storage signing failed: ${errText}`);
        }

        const { signedUrl, publicUrl: cloudUrl } = await signRes.json();
        if (!signedUrl || !cloudUrl) {
          throw new Error("Failed to receive signed URL from server.");
        }

        // Upload the binary directly to R2/S3
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Direct cloud upload failed.");
        }

        publicUrl = cloudUrl;
      }

      if (publicUrl) {
        setMediaUrl(publicUrl);
        setOriginalMediaUrl(publicUrl);
        const isVid = file.type.startsWith("video/");
        setMediaType(isVid ? "video" : "image");
        setShowResult(false);
        handleClearMask();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setSimulatedWarning(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFaceUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSimulatedWarning("Reference face must be an image.");
      return;
    }
    setIsUploadingFace(true);
    setSimulatedWarning(null);
    try {
      let publicUrl = "";

      // Attempt 1: Try multipart/form-data upload via local server
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          publicUrl = data.publicUrl;
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err) {
        console.warn("Local server upload failed, attempting direct cloud upload fallback...", err);

        // Attempt 2: Direct browser PUT upload to cloud storage using signed URL
        const signRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!signRes.ok) {
          const errText = await signRes.text();
          throw new Error(`Cloud storage signing failed: ${errText}`);
        }

        const { signedUrl, publicUrl: cloudUrl } = await signRes.json();
        if (!signedUrl || !cloudUrl) {
          throw new Error("Failed to receive signed URL from server.");
        }

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Direct cloud upload failed.");
        }

        publicUrl = cloudUrl;
      }

      if (publicUrl) {
        setFaceImageUrl(publicUrl);
        setShowResult(false);
      }
    } catch (err: any) {
      console.error("Face upload error:", err);
      setSimulatedWarning(`Face upload failed: ${err.message}`);
    } finally {
      setIsUploadingFace(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  // Resolve base image URL from parameters
  useEffect(() => {
    const imgUrl = searchParams.get("image") || searchParams.get("url");
    if (imgUrl) {
      setMediaUrl(imgUrl);
      setOriginalMediaUrl(imgUrl);
      const isVid = imgUrl.match(/\.(mp4|webm|mov|mkv|3gp|avi|ogg)/i) || searchParams.get("type") === "video";
      setMediaType(isVid ? "video" : "image");
    }
  }, [searchParams]);

  // Adjust upscale factor for videos (max 4x)
  useEffect(() => {
    if (mediaType === "video" && upscaleFactor === "8") {
      setUpscaleFactor("4");
    }
  }, [mediaType, upscaleFactor]);

  // Load the video metadata dynamically to resolve duration
  useEffect(() => {
    if (mediaUrl && mediaType === "video") {
      const video = document.createElement("video");
      video.src = mediaUrl;
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
      };
      video.onerror = () => {
        setVideoDuration(0);
      };
    } else {
      setVideoDuration(0);
    }
  }, [mediaUrl, mediaType]);

  // Sync uploaded media to history list
  useEffect(() => {
    if (mediaUrl) {
      setUploadedMediaList((prev) => {
        if (prev.some((item) => item.url === mediaUrl)) return prev;
        return [{ url: mediaUrl, type: mediaType }, ...prev].slice(0, 4);
      });
    }
  }, [mediaUrl, mediaType]);

  // Calculate dynamic aspect ratio when active media changes
  useEffect(() => {
    if (!mediaUrl) {
      setMediaAspectRatio(null);
      return;
    }

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.src = mediaUrl;
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setMediaAspectRatio(video.videoWidth / video.videoHeight);
        }
      };
      video.onerror = () => {
        setMediaAspectRatio(null);
      };
    } else {
      const img = new Image();
      img.src = mediaUrl;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setMediaAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
      img.onerror = () => {
        setMediaAspectRatio(null);
      };
    }
  }, [mediaUrl, mediaType]);

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
      "style-transfer": "style",
      draw: "draw",
      motion: "motion",
      outpaint: "outpaint",
      "expand-image": "outpaint",
      "sketch-to-real": "draw",
      "color-grading": "relight",
      "expression-edit": "replace",
      "face-swap": "faceswap",
      faceswap: "faceswap",
      "character-swap": "faceswap",
      "smart-crop": "outpaint",
      colorize: "style",
    };

    const resolved = aliasMap[requestedTool] ?? requestedTool;
    const allSupportedTools = [...EDIT_TOOLS.map((t) => t.id), "bgremove", "outpaint", "style", "draw", "motion", "replace"];
    if (allSupportedTools.includes(resolved)) {
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

  const handleResetTool = () => {
    setPrompt("");
    if (activeTool === "upscale") {
      setUpscaleFactor("1");
      setUpscaleResolution("720");
      setUpscaleDenoise(0.3);
      setUpscaleFaceEnhance(true);
      setUpscaleModel("topaz");
      setMediaUrl("/explore/tool-upscale.jpg");
      setOriginalMediaUrl("/explore/tool-upscale.jpg");
    } else if (activeTool === "relight") {
      setLightAngle(180);
      setLightIntensity(0.7);
      setLightColor("#fcd34d");
    } else if (activeTool === "bgremove") {
      setBgFormat("png");
      setBgFeather(2);
    } else if (activeTool === "outpaint") {
      setOutpaintDirection("all");
      setOutpaintMargin(25);
    } else if (activeTool === "style") {
      setStylePreset("cyberpunk");
      setStyleStrength(0.8);
    } else if (activeTool === "draw") {
      setDrawColor("#ff0000");
    } else if (activeTool === "motion") {
      setMotionDirection("forward");
      setMotionSpeed(5);
    } else if (activeTool === "faceswap") {
      setFaceImageUrl("");
    }
    handleClearMask();
  };

  // Apply AI Generation (Attempts to call the real backend APIs, falls back to visual simulator)
  const handleApply = useCallback(async () => {
    if (isProcessing) return;
    
    // For tools that need prompts, verify prompt input
    const isPromptOptional = ["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool);
    if (!isPromptOptional && !prompt.trim()) return;

    if (activeTool === "faceswap" && !faceImageUrl) {
      setSimulatedWarning("Please upload a reference face image first.");
      return;
    }

    if (activeTool === "watermark" && mediaType !== "video") {
      setSimulatedWarning("Video Watermark Remover only supports video files. Please upload a video first.");
      return;
    }

    setSimulatedWarning(null);
    setShowResult(false);
    setIsProcessing(true);

    try {
      let resultUrl = "";
      
      let finalMediaUrl = mediaUrl;
      if (mediaUrl.startsWith("/")) {
        if (typeof window !== "undefined") {
          finalMediaUrl = `${window.location.origin}${mediaUrl}`;
        }
      }

      const inputMedia = finalMediaUrl.startsWith("data:") || finalMediaUrl.startsWith("http")
        ? finalMediaUrl
        : await imgToDataUrl(mediaUrl);

      if (activeTool === "bgremove") {
        const response = await fetch("/api/generate/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: inputMedia }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to remove background");
        resultUrl = data.imageUrl;
      } else if (activeTool === "faceswap") {
        const response = await fetch("/api/generate/face-swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceImageUrl: faceImageUrl,
            targetImageUrl: inputMedia,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to swap face");
        resultUrl = data.imageUrl;
      } else if (activeTool === "watermark") {
        const response = await fetch("/api/generate/watermark-remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: inputMedia,
            duration: videoDuration,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to remove watermark");
        resultUrl = data.imageUrl || data.videoUrl;
      } else if (activeTool === "upscale") {
        const payload = mediaType === "video"
          ? { videoUrl: inputMedia, scale: upscaleFactor, resolution: upscaleResolution }
          : { imageUrl: inputMedia, scale: upscaleFactor, resolution: upscaleResolution };
        const response = await fetch("/api/generate/upscale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to upscale");
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
            imageUrl: inputMedia,
            imageUrls: [maskDataUrl],
            aspectRatio: "4:3",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate image");
        resultUrl = data.imageUrl || data.mediaUrl;
      }

      if (resultUrl) {
        setMediaUrl(resultUrl);
        // Update type in case the resulting file format changes (e.g. video to video or image to image)
        const isVid = resultUrl.match(/\.(mp4|webm|mov|mkv|3gp|avi|ogg)/i);
        setMediaType(isVid ? "video" : "image");
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
  }, [isProcessing, prompt, activeTool, mediaUrl, mediaType, selectedModel, upscaleFactor, upscaleResolution, faceImageUrl, videoDuration]);

  const handleToolSelect = (id: string) => {
    setActiveTool(id);
    setShowResult(false);
    handleClearMask();
    if (id === "upscale") {
      setMediaUrl("/explore/tool-upscale.jpg");
      setOriginalMediaUrl("/explore/tool-upscale.jpg");
      setMediaType("image");
    }
  };

  // Calculate dynamic dimensions for the canvas container based on aspect ratio
  let containerWidth = 700;
  let containerHeight = 525;
  if (mediaAspectRatio) {
    const maxW = 700;
    const maxH = 525;
    if (mediaAspectRatio > maxW / maxH) {
      containerWidth = maxW;
      containerHeight = maxW / mediaAspectRatio;
    } else {
      containerHeight = maxH;
      containerWidth = maxH * mediaAspectRatio;
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#03060d] text-white select-none">
      
      {/* ─── Top Tab Bar Navigation Switcher ─── */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#050914] px-6 py-2.5 shrink-0 z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {EDIT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border",
                  isActive
                    ? "bg-[#0b1528] text-white shadow-lg shadow-black/40"
                    : "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
                )}
                style={isActive ? { borderColor: `${tool.hex}40`, color: tool.hex, boxShadow: `0 0 15px -3px ${tool.hex}25` } : {}}
              >
                <tool.icon className={cn("h-4 w-4", isActive ? tool.color : "text-zinc-500")} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Right side status badge */}
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* ─── Active Tool Sub-views & Core Workspace Layout ─── */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTool === "relight" && (
          <div className="flex-1 overflow-hidden">
            <RelightPage isEmbedded />
          </div>
        )}
        {activeTool === "faceswap" && (
          <div className="flex-1 overflow-hidden">
            <FaceSwapPage isEmbedded />
          </div>
        )}
        {activeTool === "inpaint" && (
          <div className="flex-1 overflow-hidden">
            <NanoBananaInpaintPage isEmbedded />
          </div>
        )}

        {/* Standard 2-Panel layout for upscale and watermark */}
        {!["relight", "faceswap", "inpaint"].includes(activeTool) && (
          <div className="flex flex-1 overflow-hidden w-full h-full">
            {/* CENTER — Masking Canvas & Prompt Engine */}
            <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[#02040a]">
        
        {/* Canvas Toolbar */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/5 bg-[#050914] shrink-0 z-10">
          {activeTool !== "upscale" && (
            <>
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
            </>
          )}
          
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading && (
            <div className="absolute inset-0 bg-[#03060d]/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <span className="text-sm font-bold text-zinc-300">Uploading media to secure storage...</span>
            </div>
          )}

          {!mediaUrl ? (
            <div
              className={cn(
                "w-full max-w-lg aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all duration-300 backdrop-blur-xl z-20",
                isDraggingOver
                  ? "border-cyan-400 bg-cyan-950/20 scale-105 shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              )}
            >
              <label className="cursor-pointer flex flex-col items-center gap-4 group w-full h-full justify-center">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileUpload(file);
                  }}
                />
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-zinc-200">
                    Drag & drop or <span className="text-cyan-400 group-hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1.5">Supports high-res Images & Videos up to 25MB</p>
                </div>
              </label>
            </div>
          ) : (
            /* Centered canvas wrapper card */
            <div
              className={cn(
                "relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10 bg-zinc-950 transition-transform duration-200 select-none",
                activeTool === "upscale" ? "cursor-default" : "cursor-crosshair"
              )}
              style={{
                width: `${containerWidth}px`,
                height: `${containerHeight}px`,
                transform: `scale(${scale})`,
              }}
            >
              {/* ── Background Image/Video layers ── */}
              <div className="absolute inset-0 select-none pointer-events-none">
                <AnimatePresence mode="wait">
                  {!showResult ? (
                    <motion.div
                      key="backdrop-original"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      {mediaType === "video" ? (
                        <video
                          src={mediaUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <div
                          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                          style={{
                            backgroundImage: `url('${mediaUrl}')`,
                          }}
                        />
                      )}
                      {/* Dark gradient shadow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Dimension Badge label */}
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg z-20">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">
                          {mediaUrl.split('/').pop()} · {mediaType === "video" ? "Video Clip" : "2048 × 1536"}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="backdrop-result"
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      {mediaType === "video" ? (
                        <video
                          src={mediaUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          style={{
                            filter: simulatedWarning ? (currentTool.id === "relight" ? "hue-rotate(60deg) saturate(1.4)" : "hue-rotate(-45deg) brightness(1.15)") : "none",
                          }}
                        />
                      ) : (
                        <div
                          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                          style={{
                            backgroundImage: `url('${mediaUrl}')`,
                            filter: simulatedWarning ? (currentTool.id === "relight" ? "hue-rotate(60deg) saturate(1.4)" : "hue-rotate(-45deg) brightness(1.15)") : "none",
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Result Success badge */}
                      <div className="absolute top-4 left-4 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg z-20">
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider">
                          AI EDIT APPLIED
                        </span>
                      </div>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = mediaUrl;
                          link.download = mediaUrl.split("/").pop() || "result";
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg z-30 transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>Download Result</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Interactive Drawing HTML5 Canvas ── */}
              <canvas
                ref={canvasRef}
                width={containerWidth}
                height={containerHeight}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ cursor: activeTool === "upscale" ? "default" : cursorStyle }}
                className={cn(
                  "absolute inset-0 z-10 w-full h-full opacity-70 transition-opacity duration-300",
                  (showInlight && activeTool !== "upscale") ? "opacity-75" : "opacity-0 pointer-events-none"
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

            {/* Floating Upscale Button in Center of Canvas */}
            {activeTool === "upscale" && !isProcessing && !showResult && (
              <button
                type="button"
                onClick={handleApply}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.5)] border border-zinc-200/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-pulse"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current text-zinc-800" />
                <span>Upscale</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Media Gallery Bar (Left Side of Workspace) */}
        {mediaUrl && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl">
            <label className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group">
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileUpload(file);
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
                  setMediaUrl(item.url);
                  setMediaType(item.type);
                  setShowResult(false);
                  handleClearMask();
                }}
                className={cn(
                  "h-9 w-9 rounded-xl overflow-hidden border transition-all duration-200 hover:scale-105 active:scale-95 relative",
                  mediaUrl === item.url ? "border-cyan-400 ring-2 ring-cyan-500/20" : "border-white/10"
                )}
              >
                {item.type === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover pointer-events-none" />
                ) : (
                  <img src={item.url} alt="Preset" className="h-full w-full object-cover pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>



      </main>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Settings Panel
      ════════════════════════════════════════════════════════════════ */}
      <aside className="w-[320px] shrink-0 flex flex-col border-l border-white/5 bg-[#050914] z-10">
        {/* Sidebar Header */}
        <div className="relative px-5 py-5 border-b border-white/5 flex items-center justify-between overflow-visible">
          {activeTool === "upscale" && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-rose-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg z-20">
              50% OFF
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center shadow-inner">
              {activeTool === "upscale" ? (
                <Layers className="h-4 w-4 text-cyan-400" />
              ) : (
                React.createElement(currentTool.icon, { className: "h-4 w-4 text-cyan-400" })
              )}
            </div>
            <div>
              <p className={cn(
                "text-zinc-200 font-extrabold",
                activeTool === "upscale" ? "text-base font-bold tracking-normal" : "text-xs font-black uppercase tracking-widest text-zinc-300"
              )}>
                {activeTool === "upscale" ? "Upscale" : currentTool.label}
              </p>
              {activeTool !== "upscale" && (
                <p className="text-[10px] text-zinc-500 mt-0.5">Parameters & controls</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetTool}
            className={cn(
              "text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors tracking-wider flex items-center gap-1.5",
              activeTool !== "upscale" && "uppercase"
            )}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Configuration settings widgets */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          
          {/* ────────────────────────────────────────────────────────────
              0. Source Media Control (Upload & Reset)
          ──────────────────────────────────────────────────────────── */}
          <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                Source Media
              </span>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl("");
                    handleClearMask();
                  }}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                >
                  Clear Media
                </button>
              )}
            </div>

            {mediaUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-zinc-950">
                {mediaType === "video" ? (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10">
                  <Upload className="h-5 w-5 text-white mr-2" />
                  <span className="text-xs font-bold text-white">Change File</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleFileUpload(file);
                    }}
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/[0.01] transition-all cursor-pointer group">
                <Upload className="h-5 w-5 text-zinc-500 group-hover:text-cyan-400 transition-colors mb-2 animate-pulse" />
                <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  Upload Image/Video
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileUpload(file);
                  }}
                />
              </label>
            )}
          </div>
          
          {/* ────────────────────────────────────────────────────────────
              1. Inpaint & Replace Settings
          ──────────────────────────────────────────────────────────── */}
          {(activeTool === "inpaint" || activeTool === "replace") && (
            <div className="space-y-6">
              {/* Prompt Textarea */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-widest">
                  Prompt
                </span>
                <textarea
                  placeholder="Describe what to add, replace, or alter in the painted region..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none h-24"
                />
              </div>

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
              {/* Model Dropdown Selection */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 block">
                  Model
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUpscaleModelOpen(!upscaleModelOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-900/80 transition-all text-left text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center shrink-0">
                        {upscaleModel === "topaz" ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-zinc-400">
                            <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
                            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
                            <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
                          </svg>
                        ) : (
                          <Aperture className="h-4.5 w-4.5 text-teal-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-zinc-200 font-bold text-xs lowercase text-left">
                          {upscaleModel}
                        </div>
                        <div className="text-[9px] text-zinc-500 truncate mt-0.5 text-left leading-tight">
                          {upscaleModel === "topaz" ? "The default model for general-purpose..." : 
                           upscaleModel === "realesrgan" ? "Best for digital art, anime, and illustrations." : 
                           "High fidelity photographic details & face restoration."}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform duration-200 shrink-0", upscaleModelOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {upscaleModelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl bg-[#090f1d] border border-white/10 shadow-2xl overflow-hidden p-1"
                      >
                        {[
                          { id: "topaz", label: "topaz", desc: "The default model for general-purpose..." },
                          { id: "realesrgan", label: "realesrgan", desc: "Best for digital art, anime, and illustrations." },
                          { id: "realsr", label: "realsr", desc: "High fidelity photographic details & face restoration." }
                        ].map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setUpscaleModel(model.id);
                              setUpscaleModelOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center gap-3",
                              upscaleModel === model.id ? "bg-white/5 text-white" : "text-zinc-400 hover:bg-white/[0.02]"
                            )}
                          >
                            {model.id === "topaz" ? (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0">
                                <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
                                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
                                <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
                              </svg>
                            ) : (
                              <Aperture className="h-4 w-4 text-teal-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold lowercase">{model.label}</div>
                              <div className="text-[8px] text-zinc-500 truncate mt-0.5">{model.desc}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Scale Factor segmented control */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 block">
                  Scale factor
                </span>
                <div className="grid grid-cols-4 gap-1 bg-zinc-950 border border-white/5 rounded-xl p-1">
                  {["1", "2", "4", mediaType === "video" ? "4" : "8"].map((fac) => (
                    mediaType === "video" && fac === "8" ? null : (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => setUpscaleFactor(fac)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-bold transition-all",
                          upscaleFactor === fac
                            ? "bg-white text-black font-extrabold shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        x{fac}
                      </button>
                    )
                  ))}
                </div>
              </div>

              {/* Resolution selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 block">
                  Target Resolution
                </span>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 border border-white/5 rounded-xl p-1">
                  {["480", "720", "1080"].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setUpscaleResolution(res)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition-all",
                        upscaleResolution === res
                          ? "bg-white text-black font-extrabold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {res}p
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Advanced Settings */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setUpscaleAdvancedOpen(!upscaleAdvancedOpen)}
                  className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span className="text-[11px] font-bold tracking-wider">
                    Advanced Settings
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", upscaleAdvancedOpen && "rotate-180")} />
                </button>

                {upscaleAdvancedOpen && (
                  <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Denoise Strength slider */}
                    <PremiumSlider
                      label="Denoise Strength"
                      value={upscaleDenoise}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(upscaleDenoise * 100)}%`}
                      onChange={setUpscaleDenoise}
                    />

                    {/* Face Details Enhance toggle */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
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
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              9. Face Swap Pro Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "faceswap" && (
            <div className="space-y-6">
              {/* Reference Face Image Control (Upload & Reset) */}
              <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                    Reference Face Image
                  </span>
                  {faceImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFaceImageUrl("");
                      }}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                    >
                      Clear Face
                    </button>
                  )}
                </div>

                {isUploadingFace ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-white/10 rounded-xl bg-zinc-950/40">
                    <div className="h-6 w-6 rounded-full border border-t-cyan-400 border-r-transparent animate-spin mb-2" />
                    <span className="text-[10px] text-zinc-400 font-bold">Uploading face image...</span>
                  </div>
                ) : faceImageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square w-32 mx-auto bg-zinc-950">
                    <img
                      src={faceImageUrl}
                      alt="Reference Face"
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10">
                      <Upload className="h-4 w-4 text-white mr-1.5" />
                      <span className="text-[10px] font-bold text-white">Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleFaceUpload(file);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:border-fuchsia-500/50 hover:bg-white/[0.01] transition-all cursor-pointer group">
                    <Upload className="h-5 w-5 text-zinc-500 group-hover:text-fuchsia-400 transition-colors mb-2" />
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Upload Face Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleFaceUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Best Practice Note / Tips for Face Swap */}
              <div className="bg-[#120a1c]/60 border border-fuchsia-500/10 rounded-xl p-3.5 space-y-2">
                <p className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Pro Swap Tips</span>
                </p>
                <ul className="text-[9.5px] text-zinc-400 space-y-1 list-disc pl-3 leading-relaxed font-medium">
                  <li>Use high-resolution, front-facing face portraits.</li>
                  <li>Ensure consistent lighting between both images.</li>
                  <li>Avoid angles, occlusions (hands, hair), or motion blur.</li>
                  <li>Works best with human faces (anime results may vary).</li>
                </ul>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────
              10. Video Watermark Remover Settings
          ──────────────────────────────────────────────────────────── */}
          {activeTool === "watermark" && (
            <div className="space-y-6">
              {/* Media validation alert */}
              {mediaUrl && mediaType !== "video" && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold">
                    <p className="font-bold">Invalid Media Type</p>
                    <p className="text-[10px] text-rose-400/80 mt-0.5 leading-relaxed">
                      Watermark removal only supports video files. Please clear this media or upload a video.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Billing Estimator card */}
              {mediaUrl && mediaType === "video" && (
                <div className="bg-[#0c1328]/80 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                    Duration & Pricing Cost
                  </span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-semibold">Billed Duration:</span>
                    <span className="text-slate-200 font-mono font-bold">
                      {Math.max(5, Math.ceil(videoDuration || 5))}s
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                    <span className="text-zinc-400 font-semibold">Pricing Rate:</span>
                    <span className="text-slate-200 font-semibold">
                      0.4 Credits / sec
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                    <span className="text-indigo-400 font-bold">Estimated Cost:</span>
                    <span className="text-indigo-400 font-black font-mono">
                      {(Math.max(5, Math.ceil(videoDuration || 5)) * 0.4).toFixed(1)} Credits
                    </span>
                  </div>
                </div>
              )}

              {/* Best Practice Note / Tips for Watermark Removal */}
              <div className="bg-[#0b101c]/60 border border-indigo-500/10 rounded-xl p-3.5 space-y-2">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Removal Guidelines</span>
                </p>
                <ul className="text-[9.5px] text-zinc-400 space-y-1 list-disc pl-3 leading-relaxed font-medium">
                  <li>Temporal-aware inpainting avoids flickering and keeps motions stable.</li>
                  <li>Reconstructs textures, grains, and lighting beneath overlays.</li>
                  <li>Supports removing subtitles, lower-thirds, moving corner bugs, and logos.</li>
                  <li>Supports video files up to 10 minutes in length.</li>
                </ul>
              </div>
            </div>
          )}

          <div className="border-t border-white/5" />

          {/* Interactive Tool Showcase & Guide */}
          <ToolShowcase activeTool={activeTool} />

        </div>

        {/* Bottom Pinned Trigger button */}
        <div className="p-5 border-t border-white/5 bg-[#040710] space-y-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || (!["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) && !prompt.trim())}
            className={cn(
              "w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] border shadow-lg",
              isProcessing || (!["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) && !prompt.trim())
                ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black border-transparent shadow-lg shadow-cyan-500/10"
            )}
          >
            <span>{getActionLabel()}</span>
            <Sparkles className="h-4 w-4 fill-current shrink-0" />
            {!isProcessing && (["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) || prompt.trim()) && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-black/10 px-1.5 py-0.5 rounded font-black ml-1">
                <Star className="h-3 w-3 fill-current" />
                <span>{activeTool === "watermark" ? (Math.max(5, Math.ceil(videoDuration || 5)) * 0.4).toFixed(1) : "5"}</span>
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
        )}
      </div>

    </div>
  );
}



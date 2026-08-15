"use client";

import React, { useState, useCallback, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useAuth } from "@clerk/nextjs";
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
import { useLanguage } from "@/lib/use-language";
import { normalizeMediaUrl } from "@/lib/storage";
import { useAuthModal } from "@/hooks/use-auth-modal";
import ToolShowcase from "@/components/ToolShowcase";
import RelightPage from "../apps/tool/relight/page";
import FaceSwapPage from "../apps/tool/face-swap/page";
import NanoBananaInpaintPage from "../apps/tool/nano-banana-pro-inpaint/page";
import { AssetInspector, type Asset as InspectorAsset } from "@/components/AssetInspector";

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
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 text-xs font-semibold select-none disabled:opacity-30 disabled:pointer-events-none",
        active
          ? "bg-white/10 text-white border border-white/10"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-transparent"
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
  const generatedId = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <label htmlFor={generatedId} className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block cursor-pointer">
          {label}
        </label>
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
          id={generatedId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
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

function canvasToBinaryMaskDataUrl(canvas: HTMLCanvasElement): { dataUrl: string; hasMask: boolean } {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) return { dataUrl: canvas.toDataURL("image/png"), hasMask: false };

  ctx.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const pixels = imageData.data;
  let hasMask = false;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha > 8) hasMask = true;
    const value = alpha > 8 ? 255 : 0;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return { dataUrl: maskCanvas.toDataURL("image/png"), hasMask };
}

const resolveEditMediaUrl = (url: string | null | undefined): string => {
  return normalizeMediaUrl(url) || url || "";
};

const toAbsoluteEditMediaUrl = (url: string): string => {
  const resolved = resolveEditMediaUrl(url);
  if (!resolved || resolved.startsWith("data:") || /^https?:\/\//i.test(resolved)) {
    return resolved;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${resolved.startsWith("/") ? "" : "/"}${resolved}`;
  }
  return resolved;
};

// ─── Page Component ────────────────────────────────────────────────────────────
const MAX_BROWSER_MULTIPART_UPLOAD_BYTES = 4 * 1024 * 1024;

function isCreditFailureMessage(message: string | null | undefined): boolean {
  const value = String(message || "").toLowerCase();
  return (
    value.includes("insufficient credit") ||
    value.includes("credits insufficient") ||
    value.includes("current balance") ||
    value.includes("top up")
  );
}

function useEditTranslation() {
  const { lang } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      // Sidebar Tools
      "Background Remover": "مزيل الخلفية",
      "Remove image backgrounds instantly and replace them with transparency or solid colors.": "أزل خلفيات الصور فوراً واستبدلها بالشفافية أو الألوان الصلبة.",
      "Smart Inpaint": "الرسم الذكي (Inpaint)",
      "Fill or restore masked areas using AI context from surrounding pixels.": "املأ أو استعد المناطق المقنعة باستخدام سياق الذكاء الاصطناعي من البكسلات المحيطة.",
      "Object Remover": "مزيل الكائنات",
      "Paint an object and specify a prompt to replace it with a new AI-generated element.": "قم بتلوين كائن وحدد وصفاً لاستبداله بعنصر جديد تم توليده بالذكاء الاصطناعي.",
      "Face Swap Pro": "تبديل الوجوه الاحترافي",
      "Instant online AI face swap for photos, delivering realistic, watermark-free results.": "تبديل فوري للوجوه بالذكاء الاصطناعي للصور، لنتائج واقعية وخالية من العلامات المائية.",
      "AI Relight": "إعادة الإضاءة بالذكاء الاصطناعي",
      "Non-destructively shift light direction, color, and intensity.": "غير اتجاه الضوء، لونه، وشدته دون إتلاف الصورة.",
      "AI Upscale & Enhance": "تكبير وتحسين الصورة بالذكاء الاصطناعي",
      "Enhance image resolution, restore clarity, and sharpen fine details using AI upscale.": "حسن دقة الصورة، استعد الوضوح، واشحذ التفاصيل الدقيقة باستخدام التكبير بالذكاء الاصطناعي.",
      "Style Transfer": "نقل النمط",
      "Apply modern artistic and cinematic styles to your images.": "طبق أنماطاً فنية وسينمائية حديثة على صورك.",
      "Watermark Remover": "مزيل العلامة المائية",
      "Remove watermarks, logos, captions, and unwanted text from videos.": "أزل العلامات المائية، الشعارات، التعليقات، والنصوص غير المرغوب فيها من مقاطع الفيديو.",
      "Expand & Outpaint": "توسيع الصورة (Outpaint)",
      "Extend images outwards beyond their original margins using generative fill.": "مدد الصور للخارج إلى ما بعد حوافها الأصلية باستخدام التعبئة التوليدية.",
      "Draw to Edit": "الرسم للتعديل",
      "Sketch and paint your edits directly onto the canvas to guide the generative process.": "ارسم خطوطك وتعديلاتك مباشرة على اللوحة لتوجيه العملية التوليدية.",
      "Motion Track": "تتبع الحركة (Motion Track)",
      "Track motion paths and generate camera movement patterns.": "تتبع مسارات الحركة وتوليد أنماط حركة الكاميرا.",
      "Object Replace": "استبدال الكائنات",
      "AI Editor": "محرر الذكاء الاصطناعي",
      "AI image editing tool.": "أداة تعديل الصور بالذكاء الاصطناعي.",
      
      // Models
      "Flux Kontext Pro": "فلوكس كونتكست برو",
      "Flux Kontext · AI Image Edit": "Flux Kontext · تعديل الصور بالذكاء الاصطناعي",
      "Flux Kontext Max": "فلوكس كونتكست ماكس",
      "Flux Kontext · High Detail Edit": "Flux Kontext · تعديل عالي التفاصيل",
      "Nano Banana Edit": "نانو بنانا إيديت",
      "Google · Inpainting Engine": "Google · محرك الرسم الذكي",
      "Seedream 4.5 Edit": "سي دريم 4.5 إيديت",
      "Seedream · Creative Editing": "Seedream · التعديل الإبداعي",
      "Kling 01 Edit": "كلينغ 01 إيديت",
      "Kling · Motion-Aware Edit": "Kling · تعديل متوافق مع الحركة",
      "FLUX.2 Pro I2I": "FLUX.2 برو I2I",
      "FLUX.2 · Image-to-Image": "FLUX.2 · صورة إلى صورة",
      "DEFAULT": "افتراضي",
      "PRO": "برو",
      "NEW": "جديد",
      
      // Actions/Labels
      "EDIT": "تعديل",
      "AI": "ذكاء اصطناعي",
      "Undo": "تراجع",
      "Redo": "إعادة",
      "Clear Mask": "مسح القناع",
      "Draw Mode": "وضع الرسم",
      "Eraser Mode": "وضع الممحاة",
      "Zoom In": "تكبير",
      "Zoom Out": "تصغير",
      "Uploading media to secure storage...": "جاري رفع الوسائط إلى التخزين الآمن...",
      "browse": "تصفح",
      "Supports high-res Images & Videos up to 25MB": "يدعم الصور والفيديوهات عالية الدقة حتى 25 ميجابايت",
      "Download Result": "تحميل النتيجة",
      "Preview": "معاينة",
      "Download": "تحميل",
      "Use": "استخدام",
      "Use as reference for video": "استخدامها كمرجع لتوليد الفيديو",
      "Applying AI Generation": "جاري تطبيق توليد الذكاء الاصطناعي",
      "Upscale": "تكبير",
      "Parameters & controls": "المعايير وعناصر التحكم",
      "Reset": "إعادة تعيين",
      "Change File": "تغيير الملف",
      "Describe what to add, replace, or alter in the painted region...": "صف ما تريد إضافته أو استبداله أو تغييره في المنطقة الملونة...",
      "Specify details about the object to remove or replace...": "حدد التفاصيل حول الكائن الذي تريد إزالته أو استبداله...",
      "Brush Radius": "نصف قطر الفرشاة",
      "Brush Opacity": "شفافية الفرشاة",
      "Edit Strength": "قوة التعديل",
      "Advanced AI Settings": "إعدادات الذكاء الاصطناعي المتقدمة",
      "Sampling Steps": "خطوات أخذ العينات",
      "CFG Scale": "مقياس التطابق (CFG)",
      "Light Source Angle": "زاوية مصدر الضوء",
      "Light Intensity": "شدة الضوء",
      "Custom color": "لون مخصص",
      "Relight Effect Strength": "قوة تأثير إعادة الإضاءة",
      "Edge Feathering": "تنعيم الحواف",
      "Expansion Quality": "جودة التوسيع",
      "Style Influence": "تأثير النمط",
      "Removal Influence": "تأثير الإزالة",
      "Sketch Pen Size": "حجم قلم الرسم",
      "Sketch Opacity": "شفافية الرسم",
      "Drawing Influence": "تأثير الرسم",
      "Motion Speed": "سرعة الحركة",
      "Noise Reduction": "تقليل الضوضاء",
      "Sharpness": "الحدة",
      "Uploading face image...": "جاري رفع صورة الوجه...",
      "Change": "تغيير",
      "Pro Swap Tips": "نصائح التبديل الاحترافي",
      "Use high-resolution, front-facing face portraits.": "استخدم صور وجوه شخصية عالية الدقة وتواجه الأمام.",
      "Ensure consistent lighting between both images.": "تأكد من تناسق الإضاءة بين كلتا الصورتين.",
      "Avoid angles, occlusions (hands, hair), or motion blur.": "تجنب الزوايا الحادة، الحجب (الأيدي، الشعر)، أو ضبابية الحركة.",
      "Works best with human faces (anime results may vary).": "يعمل بشكل أفضل مع وجوه البشر (قد تختلف نتائج الأنمي).",
      "Invalid Media Type": "نوع وسائط غير صالح",
      "Billed Duration:": "المدة المحتسبة:",
      "Pricing Rate:": "معدل التسعير:",
      "Estimated Cost:": "التكلفة التقديرية:",
      "Removal Guidelines": "إرشادات الإزالة",
      "Temporal-aware inpainting avoids flickering and keeps motions stable.": "الرسم الذكي المتوافق مع الزمن يتجنب الارتجاف ويحافظ على استقرار الحركة.",
      "Reconstructs textures, grains, and lighting beneath overlays.": "يعيد بناء القوام، الحبيبات، والإضاءة أسفل التراكبات.",
      "Supports removing subtitles, lower-thirds, moving corner bugs, and logos.": "يدعم إزالة الترجمات المصاحبة، الثلث السفلي، العلامات المتحركة في الزوايا، والشعارات.",
      "Supports video files up to 10 minutes in length.": "يدعم ملفات الفيديو حتى طول 10 دقائق.",
      "Generation applied successfully!": "تم تطبيق التوليد بنجاح!",
      "Auto-Saved": "تم الحفظ تلقائياً",
      "GPU: 80%": "معالج الرسوميات: 80%",
      "Version 1.2": "الإصدار 1.2",
      
      // Additional Action Labels
      "Upscale ↗": "تكبير ↗",
      "Remove Watermark": "إزالة العلامة المائية",
      "Face Swap": "تبديل الوجه",
      "Remove Background": "إزالة الخلفية",
      "Apply Generation": "تطبيق التوليد",
      "Upscale & Enhance": "تكبير وتحسين الصورة"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang };
}

export default function EditPage() {
  const { t, lang } = useEditTranslation();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const { onOpen: openAuthModal } = useAuthModal();

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

  // Interactive shoe slider states for Background Remover
  const [shoeSliderPosition, setShoeSliderPosition] = useState(50);
  const [isDraggingShoe, setIsDraggingShoe] = useState(false);
  const shoeSliderRef = useRef<HTMLDivElement>(null);

  // Drawing & Canvas States
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showInlight, setShowInlight] = useState(true);
  const [mediaUrl, setMediaUrl] = useState("/explore/tool-upscale.jpg");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [inspectorAsset, setInspectorAsset] = useState<InspectorAsset | null>(null);
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

  const [upscaleFactor, setUpscaleFactor] = useState("2");
  const [upscaleResolution, setUpscaleResolution] = useState("1080"); // 480, 720, 1080
  const [upscaleDenoise, setUpscaleDenoise] = useState(0.75);
  const [upscaleFaceEnhance, setUpscaleFaceEnhance] = useState(true);
  const [upscaleModel, setUpscaleModel] = useState("topaz");
  const [upscaleModelOpen, setUpscaleModelOpen] = useState(false);
  const [upscaleAdvancedOpen, setUpscaleAdvancedOpen] = useState(false);
  const [uploadedMediaList, setUploadedMediaList] = useState<Array<{ url: string; type: "image" | "video" }>>([
    { url: "/explore/tool-upscale.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-1.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-2.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-3.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-4.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-5.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-6.jpg", type: "image" },
    { url: "/explore/gallery-mixed-media-1.jpg", type: "image" },
    { url: "/explore/gallery-mixed-media-2.jpg", type: "image" },
  ]);

  const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const getActionLabel = () => {
    switch (activeTool) {
      case "upscale":
        return "Upscale ↗";
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

  const ensureUploadAuthHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!isAuthLoaded) {
      setSimulatedWarning("Authentication is still loading. Please try again in a moment.");
      return null;
    }
    if (!isSignedIn) {
      openAuthModal("signup");
      setSimulatedWarning("Please sign in before uploading media.");
      return null;
    }

    const token = await getToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken, isAuthLoaded, isSignedIn, openAuthModal]);

  const uploadWithSignedUrl = useCallback(async (file: File, authHeaders: Record<string, string>) => {
    const fileType = file.type || "application/octet-stream";
    const signRes = await fetch("/api/media/upload", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fileName: file.name || `edit-upload-${Date.now()}`,
        fileType,
      }),
    });

    if (!signRes.ok) {
      const errText = await signRes.text();
      throw new Error(`Cloud storage signing failed: ${errText}`);
    }

    const { signedUrl, publicUrl } = await signRes.json();
    if (!signedUrl || !publicUrl) {
      throw new Error("Failed to receive signed URL from server.");
    }

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": fileType },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Direct cloud upload failed.");
    }

    return String(publicUrl);
  }, []);

  const uploadEditMediaFile = useCallback(async (file: File, authHeaders: Record<string, string>) => {
    if (file.size > MAX_BROWSER_MULTIPART_UPLOAD_BYTES) {
      return uploadWithSignedUrl(file, authHeaders);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: authHeaders,
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.publicUrl) return String(data.publicUrl);
        throw new Error("Upload response did not contain publicUrl");
      }

      throw new Error(`Server returned status ${response.status}`);
    } catch (err) {
      console.warn("Server media upload failed, attempting direct signed cloud upload fallback...", err);
      return uploadWithSignedUrl(file, authHeaders);
    }
  }, [uploadWithSignedUrl]);

  // File Upload Handler with Direct Cloud Upload Fallback (fixes 413 Payload Too Large)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setSimulatedWarning(null);
    try {
      const authHeaders = await ensureUploadAuthHeaders();
      if (!authHeaders) return;

      const publicUrl = await uploadEditMediaFile(file, authHeaders);

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
      const authHeaders = await ensureUploadAuthHeaders();
      if (!authHeaders) return;

      const publicUrl = await uploadEditMediaFile(file, authHeaders);

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
      video.src = resolveEditMediaUrl(mediaUrl);
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
      video.src = resolveEditMediaUrl(mediaUrl);
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
      img.src = resolveEditMediaUrl(mediaUrl);
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
      const finalMediaUrl = toAbsoluteEditMediaUrl(mediaUrl);

      const inputMedia = finalMediaUrl.startsWith("data:") || finalMediaUrl.startsWith("http")
        ? finalMediaUrl
        : await imgToDataUrl(resolveEditMediaUrl(mediaUrl));

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
            sourceImageUrl: toAbsoluteEditMediaUrl(faceImageUrl),
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
        // WaveSpeed-backed drawing/style tools.
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not initialized");
        const mask = canvasToBinaryMaskDataUrl(canvas);
        if ((activeTool === "inpaint" || activeTool === "replace") && !mask.hasMask) {
          throw new Error("Paint the area you want to edit first.");
        }

        const response = await fetch("/api/generate/edit-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: activeTool,
            prompt,
            imageUrl: inputMedia,
            maskImageUrl: mask.dataUrl,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to edit image");
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
      if (isCreditFailureMessage(err?.message)) {
        console.warn("Real API failed due to insufficient credits:", err.message);
        setSimulatedWarning(err.message || "Credits insufficient. Please top up to continue.");
        setIsProcessing(false);
        return;
      }

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

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingSlider) return;
    handleMove(e.touches[0].clientX);
  }, [isDraggingSlider, handleMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingSlider) return;
    handleMove(e.clientX);
  }, [isDraggingSlider, handleMove]);

  // Interactive shoe slider callbacks for Background Remover
  const handleShoeMove = useCallback((clientX: number) => {
    if (!shoeSliderRef.current) return;
    const rect = shoeSliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setShoeSliderPosition(position);
  }, []);

  const handleShoeTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingShoe) return;
    handleShoeMove(e.touches[0].clientX);
  }, [isDraggingShoe, handleShoeMove]);

  const handleShoeMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingShoe) return;
    handleShoeMove(e.clientX);
  }, [isDraggingShoe, handleShoeMove]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[#03060d] text-white select-none w-full">
      {/* ─── Left Sidebar (desktop) / Top tool tabs (mobile) ─── */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-[#05070f] border-b lg:border-b-0 lg:border-r border-white/[0.05] flex flex-col lg:p-5 lg:space-y-6 select-none z-30">
        <div className="hidden lg:block">
          <h2 className="text-sm font-black tracking-wider uppercase flex items-center gap-1">
            <span className="text-white">{t("EDIT")}</span>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("AI")}</span>
          </h2>
        </div>

        {/* Mobile: horizontal scrollable tool chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto p-3 scrollbar-none">
          {EDIT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border",
                  isActive
                    ? "bg-[#0c1224] text-white border-white/10"
                    : "bg-white/[0.02] border-white/[0.03] text-zinc-400"
                )}
                style={isActive ? { borderColor: `${tool.hex}55` } : {}}
              >
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${tool.hex} 0%, ${tool.hex}cc 100%)` }}
                >
                  <tool.icon className="h-3.5 w-3.5" />
                </div>
                <span className="whitespace-nowrap">{t(tool.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical tool list */}
        <div className="hidden lg:flex flex-1 flex-col space-y-2 overflow-y-auto scrollbar-none">
          {EDIT_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all duration-300 border text-left cursor-pointer mb-2.5",
                  isActive
                    ? "bg-[#0c1224] text-white border-white/[0.08] shadow-lg"
                    : "bg-white/[0.02] border-white/[0.03] text-zinc-400 hover:bg-white/[0.04] hover:border-white/[0.06] hover:text-zinc-200"
                )}
                style={isActive ? { borderColor: `${tool.hex}55`, boxShadow: `0 0 18px -4px ${tool.hex}30` } : {}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center shadow-inner text-white shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${tool.hex} 0%, ${tool.hex}cc 100%)`,
                      boxShadow: `0 2px 8px -1px ${tool.hex}30`
                    }}
                  >
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <span>{t(tool.label)}</span>
                </div>
                {isActive && <span className="text-zinc-400 font-normal ml-2">&gt;</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ─── Content Pane ─── */}
      <div className="flex-1 overflow-hidden relative flex flex-col h-full bg-[#02040a]">
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

        {/* Standard 2-Panel layout for upscale, watermark, bgremove, etc. */}
        {!["relight", "faceswap", "inpaint"].includes(activeTool) && (
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden w-full h-full">
            {/* CENTER PANEL — Canvas & Prompt Engine */}
            <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[#02040a]">
              {/* Canvas Toolbar */}
              <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/5 bg-[#050914] shrink-0 z-10">
                {activeTool !== "upscale" && (
                  <>
                    <ToolbarBtn icon={RotateCcw} label={t("Undo")} shortcut="Ctrl+Z" onClick={handleUndo} disabled={historyIndex <= 0} />
                    <ToolbarBtn icon={RotateCw} label={t("Redo")} shortcut="Ctrl+Y" onClick={handleRedo} disabled={historyIndex >= history.length - 1} />
                    <div className="h-5 w-px bg-white/10 mx-1.5" />
                    <ToolbarBtn icon={Eraser} label={t("Clear Mask")} shortcut="Ctrl+D" onClick={handleClearMask} />
                    <ToolbarBtn
                      icon={isEraser ? PenTool : Eraser}
                      label={isEraser ? t("Draw Mode") : t("Eraser Mode")}
                      shortcut="E"
                      active={isEraser}
                      onClick={() => setIsEraser(!isEraser)}
                    />
                    <div className="h-5 w-px bg-white/10 mx-1.5" />
                  </>
                )}
                
                <ToolbarBtn icon={ZoomIn} label={t("Zoom In")} shortcut="+" onClick={() => setScale((s) => Math.min(s + 0.1, 2.5))} />
                <ToolbarBtn icon={ZoomOut} label={t("Zoom Out")} shortcut="-" onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))} />

                <div className="flex-1" />

                {/* Status Badge */}
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

                {/* Active Tool Name */}
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

              {/* Canvas Workspace Body */}
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
                        <p className="text-xs text-zinc-400 mt-1.5">Supports high-res Images & Videos up to 25MB</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  /* Center Canvas Wrapper Card */
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
                    {/* Before/After Split Comparison Slider */}
                    {showResult ? (
                      <div 
                        ref={sliderRef}
                        className="absolute inset-0 select-none overflow-hidden z-20"
                        onMouseMove={handleMouseMove}
                        onMouseUp={() => setIsDraggingSlider(false)}
                        onMouseLeave={() => setIsDraggingSlider(false)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => setIsDraggingSlider(false)}
                      >
                        {/* BEFORE Image/Video */}
                        <div className="absolute inset-0 pointer-events-none">
                          {mediaType === "video" ? (
                            <video
                              src={resolveEditMediaUrl(originalMediaUrl || mediaUrl)}
                              className="absolute inset-0 w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          ) : (
                            <div
                              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                              style={{ backgroundImage: `url('${resolveEditMediaUrl(originalMediaUrl || mediaUrl)}')` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest z-20">
                            BEFORE
                          </div>
                        </div>

                        {/* AFTER Image/Video (Clipped) */}
                        <div 
                          className="absolute inset-0 pointer-events-none overflow-hidden"
                          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                        >
                          {mediaType === "video" ? (
                            <video
                              src={resolveEditMediaUrl(mediaUrl)}
                              className="absolute inset-0 w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          ) : (
                            <div
                              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                              style={{ backgroundImage: `url('${resolveEditMediaUrl(mediaUrl)}')` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 font-bold uppercase tracking-widest z-20">
                            AFTER
                          </div>
                        </div>

                        {/* Drag Bar & Handle */}
                        <div 
                          className="absolute inset-y-0 w-0.5 bg-cyan-400/80 cursor-ew-resize z-20"
                          style={{ left: `${sliderPosition}%` }}
                          onMouseDown={() => setIsDraggingSlider(true)}
                          onTouchStart={() => setIsDraggingSlider(true)}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/80 backdrop-blur-md border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center justify-center cursor-ew-resize select-none transition-transform hover:scale-110 active:scale-95">
                            <span className="text-cyan-400 text-xs font-black tracking-tighter">&lt;&gt;</span>
                          </div>
                        </div>

                        {/* Success Badge */}
                        <div className="absolute top-4 left-4 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg z-20">
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider">
                            AI EDIT APPLIED
                          </span>
                        </div>

                        {/* Action Buttons — same visual language as the Image page result grid */}
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-30 pointer-events-auto">
                          {/* Preview — opens the AssetInspector modal (full-size viewer with meta + actions) */}
                          <button
                            type="button"
                            onClick={() => {
                              setInspectorAsset({
                                id: `edit-${activeTool}-${Date.now()}`,
                                type: mediaType,
                                url: resolveEditMediaUrl(mediaUrl),
                                prompt: prompt || undefined,
                                model: selectedModel?.label,
                                title: t(currentTool.label),
                              });
                            }}
                            title={t("Preview")}
                            className="rounded-lg bg-black/55 p-2 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Download — proxied through /api/download which forces Content-Disposition: attachment
                              (fixes cross-origin CDN URLs where the browser was ignoring the download attribute) */}
                          <a
                            href={`/api/download?url=${encodeURIComponent(resolveEditMediaUrl(mediaUrl))}&filename=${encodeURIComponent(
                              (() => {
                                const raw = (mediaUrl.split("?")[0].split("/").pop() || "saadstudio-edit").trim();
                                const stem = raw.replace(/\.[a-z0-9]{2,5}$/i, "") || "saadstudio-edit";
                                return `${stem}${mediaType === "video" ? ".mp4" : ".png"}`;
                              })()
                            )}`}
                            download
                            title={t("Download")}
                            className="rounded-lg bg-black/55 p-2 text-white ring-1 ring-white/20 backdrop-blur hover:bg-black/70 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </a>

                          {/* Use as reference for video generation (images only) */}
                          {mediaType === "image" && (
                            <a
                              href={`/video?imageUrl=${encodeURIComponent(resolveEditMediaUrl(mediaUrl))}`}
                              title={t("Use as reference for video")}
                              className="inline-flex max-w-full items-center gap-1 rounded-lg bg-pink-500/85 px-2.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-pink-300/40 hover:bg-pink-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Wand2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{t("Use")}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Backdrop Original Image/Video when no edit is applied yet */
                      <div className="absolute inset-0 select-none pointer-events-none">
                        {mediaType === "video" ? (
                          <video
                            src={resolveEditMediaUrl(mediaUrl)}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        ) : (
                          <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url('${resolveEditMediaUrl(mediaUrl)}')` }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-lg z-20">
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                          <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px]">
                            {mediaUrl.split('/').pop()} · {mediaType === "video" ? "Video Clip" : "2048 × 1536"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Canvas overlay for drawing masks */}
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

                    {/* Scanline Processing overlay */}
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
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="relative bg-[#090e18]/90 border border-white/10 rounded-2xl px-7 py-6 flex flex-col items-center gap-3 shadow-2xl backdrop-blur-2xl min-w-[260px]"
                            >
                              <div
                                className="relative h-14 w-14 saad-edit-breath"
                                style={{ filter: "drop-shadow(0 0 10px rgba(122,165,255,.5)) drop-shadow(0 0 26px rgba(139,107,255,.35))" }}
                              >
                                <NextImage alt="Saad Studio" src="/icon-192.png" fill sizes="56px" className="object-contain" />
                              </div>
                              <div className="flex items-center gap-2 text-[11.5px] tracking-[0.6px] text-[#b7c8ff]/90 font-mono">
                                <span>SAAD</span>
                                <span
                                  className="inline-block w-[5px] h-[5px] rounded-full bg-[#7aa5ff] saad-edit-dot"
                                  style={{ boxShadow: "0 0 8px #7aa5ff" }}
                                />
                                <span>{lang === "ar" ? "جارٍ التوليد" : "Generating"}</span>
                              </div>
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#7aa5ff]" style={{ boxShadow: "0 0 6px #7aa5ff" }} />
                                <span className="max-w-[180px] truncate">{t(selectedModel.label)}</span>
                                <span className="text-slate-500">· {t(currentTool.label)}</span>
                              </div>
                              <div className="absolute left-6 right-6 bottom-3 h-[3px] rounded-full bg-[rgba(110,168,255,0.20)] overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,#7aa5ff,#8b6bff,transparent)] saad-edit-bar" />
                              </div>
                              <style jsx>{`
                                @keyframes saad-edit-breath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
                                @keyframes saad-edit-bar    { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                                @keyframes saad-edit-dot    { 0%,100% { opacity:.4 } 50% { opacity:1 } }
                                :global(.saad-edit-breath) { animation: saad-edit-breath 3.2s ease-in-out infinite; }
                                :global(.saad-edit-bar)    { animation: saad-edit-bar 1.6s ease-in-out infinite; }
                                :global(.saad-edit-dot)    { animation: saad-edit-dot 1.4s ease-in-out infinite; }
                              `}</style>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Floating Center Action trigger */}
                    {activeTool === "upscale" && !isProcessing && !showResult && (
                      <button
                        type="button"
                        onClick={handleApply}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.5)] border border-zinc-200/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-pulse cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 fill-current text-zinc-800" />
                        <span>Upscale</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Horizontal Media Gallery Bar (At Bottom of Center Area) */}
              {mediaUrl && (
                <div className="w-full flex items-center justify-center py-5 bg-transparent shrink-0">
                  <div className="flex items-center gap-4 bg-[#05070f]/90 backdrop-blur-md border border-white/[0.05] rounded-3xl p-3 px-4 shadow-2xl relative">
                    <button type="button" aria-label={t("Previous items")} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="h-6 w-px bg-white/5" />

                    <label className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all shrink-0 group">
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

                    <div className="h-6 w-px bg-white/5" />

                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none max-w-[600px] py-1 px-0.5">
                      {uploadedMediaList.map((item, idx) => {
                        const isSelected = mediaUrl === item.url;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMediaUrl(item.url);
                              setOriginalMediaUrl(item.url);
                              setMediaType(item.type);
                              setShowResult(false);
                              handleClearMask();
                            }}
                            className={cn(
                              "h-14 w-20 rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 relative cursor-pointer",
                              isSelected 
                                ? "border-cyan-400 ring-2 ring-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
                                : "border-white/5 hover:border-white/10"
                            )}
                          >
                            {item.type === "video" ? (
                              <video src={resolveEditMediaUrl(item.url)} className="h-full w-full object-cover pointer-events-none" />
                            ) : (
                              <NextImage
                                src={resolveEditMediaUrl(item.url)}
                                alt="Preset"
                                width={80}
                                height={56}
                                className="h-full w-full object-cover pointer-events-none"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-6 w-px bg-white/5" />

                    <button type="button" aria-label={t("Next items")} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </main>

            {/* RIGHT SIDEBAR — Settings Panel */}
            <aside className="w-full lg:w-[320px] shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 bg-[#050914] z-10 lg:h-full">
              {/* Sidebar Header */}
              <div className="relative px-5 py-5 border-b border-white/5 flex items-center justify-between overflow-visible shrink-0">
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
                      activeTool === "upscale" ? "text-sm tracking-normal" : "text-xs font-black uppercase tracking-widest text-zinc-300"
                    )}>
                      {activeTool === "upscale" ? t("Upscale & Enhance") : t(currentTool.label)}
                    </p>
                    {activeTool !== "upscale" && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">Parameters & controls</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetTool}
                  className={cn(
                    "text-[10px] font-bold text-zinc-400 hover:text-zinc-300 transition-colors tracking-wider flex items-center gap-1.5 cursor-pointer",
                    activeTool !== "upscale" && "uppercase"
                  )}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{t("Reset")}</span>
                </button>
              </div>

              {/* Configurations scroll area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {/* 0. Source Media Control (Upload & Reset) */}
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
                          setOriginalMediaUrl("");
                          handleClearMask();
                        }}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Clear Media
                      </button>
                    )}
                  </div>

                  {mediaUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-zinc-950">
                      {mediaType === "video" ? (
                        <video
                          src={resolveEditMediaUrl(mediaUrl)}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <NextImage
                          src={resolveEditMediaUrl(mediaUrl)}
                          alt="Source"
                          fill
                          className="w-full h-full object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority
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

                {/* 1. Inpaint & Replace Settings */}
                {(activeTool === "inpaint" || activeTool === "replace") && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-widest">
                        Prompt
                      </span>
                      <textarea
                        placeholder={t("Describe what to add, replace, or alter in the painted region...")}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none h-24"
                      />
                    </div>

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
                            <div className="text-[10px] text-zinc-400 truncate mt-0.5">
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
                                    <div className="text-[9px] text-zinc-400 mt-0.5">{model.sublabel}</div>
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

                    <PremiumSlider
                      label={t("Brush Radius")}
                      value={brushSize}
                      min={4}
                      max={80}
                      step={1}
                      displayValue={`${brushSize}px`}
                      onChange={setBrushSize}
                    />

                    <PremiumSlider
                      label={t("Brush Opacity")}
                      value={brushOpacity}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(brushOpacity * 100)}%`}
                      onChange={setBrushOpacity}
                    />

                    <PremiumSlider
                      label={t("Edit Strength")}
                      value={editStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={editStrength.toFixed(2)}
                      onChange={setEditStrength}
                    />

                    <div className="border-t border-white/5" />

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

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors"
                      >
                        <span>{t("Advanced AI Settings")}</span>
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
                              label={t("Sampling Steps")}
                              value={steps}
                              min={10}
                              max={50}
                              step={1}
                              displayValue={steps.toString()}
                              onChange={setSteps}
                            />
                            <PremiumSlider
                              label={t("CFG Scale")}
                              value={cfg}
                              min={1.0}
                              max={20.0}
                              step={0.5}
                              displayValue={cfg.toFixed(1)}
                              onChange={setCfg}
                            />
                            <div className="space-y-1.5">
                              <label htmlFor="seed-input-field" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block cursor-pointer">
                                Seed
                              </label>
                              <div className="flex gap-2">
                                <input
                                  id="seed-input-field"
                                  type="text"
                                  value={seed}
                                  aria-label="Seed"
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

                {/* 2. AI Relight Settings */}
                {activeTool === "relight" && (
                  <div className="space-y-6">
                    <PremiumSlider
                      label={t("Light Source Angle")}
                      value={lightAngle}
                      min={0}
                      max={360}
                      step={5}
                      displayValue={`${lightAngle}°`}
                      onChange={setLightAngle}
                    />

                    <PremiumSlider
                      label={t("Light Intensity")}
                      value={lightIntensity}
                      min={0.1}
                      max={2.0}
                      step={0.05}
                      displayValue={`${Math.round(lightIntensity * 100)}%`}
                      onChange={setLightIntensity}
                    />

                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Light Color
                      </span>
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
                        <input
                          type="color"
                          value={lightColor}
                          onChange={(e) => setLightColor(e.target.value)}
                          className="h-7 w-7 rounded-md cursor-pointer bg-transparent border-0"
                          title={t("Custom color")}
                          aria-label={t("Custom color")}
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/5" />

                    <PremiumSlider
                      label={t("Relight Effect Strength")}
                      value={editStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={editStrength.toFixed(2)}
                      onChange={setEditStrength}
                    />
                  </div>
                )}

                {/* 3. Background Remove Settings */}
                {activeTool === "bgremove" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Output Format
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "png", label: "PNG", sub: "Transparent Backing" },
                          { id: "jpg", label: "JPEG", sub: "Solid Back (W/H)" }
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setBgFormat(fmt.id)}
                            className={cn(
                              "rounded-xl border p-3 text-left transition-all text-xs flex flex-col gap-1 cursor-pointer",
                              bgFormat === fmt.id
                                ? "border-rose-500 bg-rose-950/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.18)]"
                                : "border-white/5 bg-zinc-950/60 text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-300"
                            )}
                          >
                            <span className="font-black text-xs">{fmt.label}</span>
                            <span className="text-[9px] text-zinc-400 font-medium">{fmt.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <PremiumSlider
                      label={t("Edge Feathering")}
                      value={bgFeather}
                      min={0}
                      max={10}
                      step={1}
                      displayValue={`${bgFeather}px`}
                      onChange={setBgFeather}
                    />

                    {/* Interactive Showcase */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-cyan-400" />
                          Interactive Showcase
                        </span>
                        <button
                          type="button"
                          onClick={() => setShoeSliderPosition(50)}
                          className="text-[9px] font-bold text-zinc-400 hover:text-zinc-300 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Reset Demo
                        </button>
                      </div>

                      <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                        <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                          Background Remove
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">
                          Isolate subjects and strip backgrounds instantly. Ideal for high-quality product and portrait renders.
                        </p>

                        {/* Shoe Before/After Slider */}
                        <div 
                          ref={shoeSliderRef}
                          className="relative rounded-xl overflow-hidden border border-white/10 aspect-[4/3] bg-[#0c0c0e] select-none cursor-ew-resize group"
                          onMouseMove={handleShoeMouseMove}
                          onMouseDown={() => setIsDraggingShoe(true)}
                          onMouseUp={() => setIsDraggingShoe(false)}
                          onMouseLeave={() => setIsDraggingShoe(false)}
                          onTouchMove={handleShoeTouchMove}
                          onTouchStart={() => setIsDraggingShoe(true)}
                          onTouchEnd={() => setIsDraggingShoe(false)}
                        >
                          {/* Background (Solid White/Dark) representing original */}
                          <div className="absolute inset-0 bg-[#080b11] flex items-center justify-center pointer-events-none">
                            <NextImage
                              src="/explore/red_sneaker.png"
                              alt="Shoe Original"
                              fill
                              className="max-h-[85%] max-w-[85%] object-contain m-auto"
                              sizes="(max-width: 768px) 100vw, 400px"
                            />
                          </div>

                          {/* Foreground (Clipped transparent Checkerboard representing cut background) */}
                          <div 
                            className="absolute inset-0 pointer-events-none overflow-hidden"
                            style={{
                              clipPath: `polygon(${shoeSliderPosition}% 0, 100% 0, 100% 100%, ${shoeSliderPosition}% 100%)`,
                              backgroundImage: `linear-gradient(45deg, #18181b 25%, transparent 25%), 
                                                linear-gradient(-45deg, #18181b 25%, transparent 25%), 
                                                linear-gradient(45deg, transparent 75%, #18181b 75%), 
                                                linear-gradient(-45deg, transparent 75%, #18181b 75%)`,
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                              backgroundColor: '#0c0c0e'
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <NextImage
                                src="/explore/red_sneaker.png"
                                alt="Shoe Removed"
                                fill
                                className="max-h-[85%] max-w-[85%] object-contain m-auto"
                                sizes="(max-width: 768px) 100vw, 400px"
                              />
                            </div>
                          </div>

                          {/* Drag line */}
                          <div 
                            className="absolute inset-y-0 w-0.5 bg-cyan-400/80 cursor-ew-resize"
                            style={{ left: `${shoeSliderPosition}%` }}
                          >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border border-cyan-400/40 flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                              <span className="text-cyan-400 text-[9px] font-bold tracking-tighter">&lt;&gt;</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-600 text-center font-semibold tracking-wider">
                          Slide to reveal background removal checkerboard
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                        Step-by-Step Instructions
                      </span>
                      <div className="space-y-3.5 text-xs text-zinc-400">
                        <div className="flex gap-3 items-start">
                          <span className="h-5 w-5 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0 mt-0.5 shadow-inner">
                            1
                          </span>
                          <p className="text-[10px] leading-relaxed font-semibold">
                            Upload any image containing clear subjects or foreground elements.
                          </p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <span className="h-5 w-5 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0 mt-0.5 shadow-inner">
                            2
                          </span>
                          <p className="text-[10px] leading-relaxed font-semibold">
                            Choose edge-feathering radius and transparency formats (PNG/WebP).
                          </p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <span className="h-5 w-5 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0 mt-0.5 shadow-inner">
                            3
                          </span>
                          <p className="text-[10px] leading-relaxed font-semibold">
                            Click Apply to execute background removal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Expand & Outpaint Settings */}
                {activeTool === "outpaint" && (
                  <div className="space-y-6">
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
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                            )}
                          >
                            <dir.icon className="h-4 w-4 shrink-0" />
                            <span className="text-[9px]">{dir.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

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
                      label={t("Expansion Quality")}
                      value={editStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={editStrength.toFixed(2)}
                      onChange={setEditStrength}
                    />
                  </div>
                )}

                {/* 5. Style Transfer Settings */}
                {activeTool === "style" && (
                  <div className="space-y-6">
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

                    <PremiumSlider
                      label={t("Style Influence")}
                      value={styleStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(styleStrength * 100)}%`}
                      onChange={setStyleStrength}
                    />
                  </div>
                )}

                {/* 6. Object Remover Settings (mappings to replace) */}
                {activeTool === "replace" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-widest">
                        Removal Prompt
                      </span>
                      <textarea
                        placeholder={t("Specify details about the object to remove or replace...")}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none h-24"
                      />
                    </div>

                    <div className="border-t border-white/5" />

                    <PremiumSlider
                      label={t("Brush Radius")}
                      value={brushSize}
                      min={4}
                      max={80}
                      step={1}
                      displayValue={`${brushSize}px`}
                      onChange={setBrushSize}
                    />

                    <PremiumSlider
                      label={t("Removal Influence")}
                      value={editStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={editStrength.toFixed(2)}
                      onChange={setEditStrength}
                    />
                  </div>
                )}

                {/* 7. Draw to Edit Settings */}
                {activeTool === "draw" && (
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Sketching Color
                      </span>
                      <div className="flex flex-wrap gap-2.5 items-center">
                        {[
                          "#ff0000", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ffffff", "#000000"
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
                        <input
                          type="color"
                          value={drawColor}
                          onChange={(e) => setDrawColor(e.target.value)}
                          className="h-7 w-7 bg-transparent border-0 cursor-pointer"
                          aria-label={t("Custom sketching color")}
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/5" />

                    <PremiumSlider
                      label={t("Sketch Pen Size")}
                      value={brushSize}
                      min={4}
                      max={80}
                      step={1}
                      displayValue={`${brushSize}px`}
                      onChange={setBrushSize}
                    />

                    <PremiumSlider
                      label={t("Sketch Opacity")}
                      value={brushOpacity}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(brushOpacity * 100)}%`}
                      onChange={setBrushOpacity}
                    />

                    <PremiumSlider
                      label={t("Drawing Influence")}
                      value={editStrength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      displayValue={editStrength.toFixed(2)}
                      onChange={setEditStrength}
                    />
                  </div>
                )}

                {/* 8. Motion Track Settings */}
                {activeTool === "motion" && (
                  <div className="space-y-6">
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

                    <PremiumSlider
                      label={t("Motion Speed")}
                      value={motionSpeed}
                      min={1}
                      max={10}
                      step={1}
                      displayValue={motionSpeed.toString()}
                      onChange={setMotionSpeed}
                    />
                  </div>
                )}

                {/* 9. AI Upscale & Enhance Settings (Mockup Aligned) */}
                {activeTool === "upscale" && (
                  <div className="space-y-6">
                    {/* Model Dropdown Selection */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Model
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setUpscaleModelOpen(!upscaleModelOpen)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-900/80 transition-all text-left text-sm"
                        >
                          <span className="text-zinc-200 font-extrabold text-xs truncate">
                            {upscaleModel === "topaz" ? "Portrait Enhancer v2.4" : 
                             upscaleModel === "realesrgan" ? "Anime & Art Enhancer" : 
                             "Photo Fidelity Enhancer"}
                          </span>
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
                                { id: "topaz", label: "Portrait Enhancer v2.4" },
                                { id: "realesrgan", label: "Anime & Art Enhancer" },
                                { id: "realsr", label: "Photo Fidelity Enhancer" }
                              ].map((model) => (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    setUpscaleModel(model.id);
                                    setUpscaleModelOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-3 rounded-lg text-left transition-colors text-xs font-bold",
                                    upscaleModel === model.id ? "bg-white/5 text-white" : "text-zinc-400 hover:bg-white/[0.02]"
                                  )}
                                >
                                  {model.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Scale Factor segmented control */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Scale factor
                      </span>
                      <div className="flex items-center gap-2">
                        {["1", "2", "4", mediaType === "video" ? "4" : "8"].map((fac) => {
                          if (mediaType === "video" && fac === "8") return null;
                          const isActive = upscaleFactor === fac;
                          return (
                            <button
                              key={fac}
                              type="button"
                              onClick={() => setUpscaleFactor(fac)}
                              className={cn(
                                "h-10 w-12 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center justify-center cursor-pointer",
                                isActive
                                  ? "bg-zinc-950 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.25)] font-black"
                                  : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-300"
                              )}
                            >
                              x{fac}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quality selector */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Quality
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-zinc-950/80 border border-white/5 rounded-2xl p-1">
                        {[
                          { id: "480", label: "Standard" },
                          { id: "720", label: "High" },
                          { id: "1080", label: "Ultra" }
                        ].map((res) => {
                          const isActive = upscaleResolution === res.id;
                          return (
                            <button
                              key={res.id}
                              type="button"
                              onClick={() => setUpscaleResolution(res.id)}
                              className={cn(
                                "py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                                isActive
                                  ? "bg-white/[0.08] text-white font-extrabold border border-white/10 shadow-inner"
                                  : "text-zinc-400 hover:text-zinc-300"
                              )}
                            >
                              {res.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Sliders for Noise and Sharpness */}
                    <PremiumSlider
                      label={t("Noise Reduction")}
                      value={upscaleDenoise}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(upscaleDenoise * 100)}%`}
                      onChange={setUpscaleDenoise}
                    />

                    <PremiumSlider
                      label={t("Sharpness")}
                      value={upscaleSharpness}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      displayValue={`${Math.round(upscaleSharpness * 100)}%`}
                      onChange={setUpscaleSharpness}
                    />

                    {/* Collapsible Face details */}
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

                {/* 10. Face Swap Pro Settings */}
                {activeTool === "faceswap" && (
                  <div className="space-y-6">
                    <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                          Reference Face Image
                        </span>
                        {faceImageUrl && (
                          <button
                            type="button"
                            onClick={() => setFaceImageUrl("")}
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
                          <NextImage
                            src={resolveEditMediaUrl(faceImageUrl)}
                            alt="Reference Face"
                            width={128}
                            height={128}
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

                    <div className="bg-[#120a1c]/60 border border-fuchsia-500/10 rounded-xl p-3.5 space-y-2">
                      <p className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Pro Swap Tips</span>
                      </p>
                      <ul className="text-[9.5px] text-zinc-400 space-y-1 list-disc pl-3 leading-relaxed font-medium">
                        <li>{t("Use high-resolution, front-facing face portraits.")}</li>
                        <li>{t("Ensure consistent lighting between both images.")}</li>
                        <li>{t("Avoid angles, occlusions (hands, hair), or motion blur.")}</li>
                        <li>{t("Works best with human faces (anime results may vary).")}</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 11. Video Watermark Remover Settings */}
                {activeTool === "watermark" && (
                  <div className="space-y-6">
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

                    <div className="bg-[#0b101c]/60 border border-indigo-500/10 rounded-xl p-3.5 space-y-2">
                      <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Removal Guidelines</span>
                      </p>
                      <ul className="text-[9.5px] text-zinc-400 space-y-1 list-disc pl-3 leading-relaxed font-medium">
                        <li>{t("Temporal-aware inpainting avoids flickering and keeps motions stable.")}</li>
                        <li>{t("Reconstructs textures, grains, and lighting beneath overlays.")}</li>
                        <li>{t("Supports removing subtitles, lower-thirds, moving corner bugs, and logos.")}</li>
                        <li>{t("Supports video files up to 10 minutes in length.")}</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5" />
                <ToolShowcase activeTool={activeTool} />
              </div>

              {/* Bottom Pinned Trigger Button */}
              <div className="p-5 border-t border-white/5 bg-[#040710] space-y-3 shrink-0">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isProcessing || (!["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) && !prompt.trim())}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] border shadow-lg cursor-pointer",
                    isProcessing || (!["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) && !prompt.trim())
                      ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-400 to-violet-600 hover:from-cyan-300 hover:to-violet-500 text-black border-transparent shadow-[0_4px_20px_rgba(20,184,166,0.25)]"
                  )}
                >
                  <span className="font-extrabold">{getActionLabel()}</span>
                  <Sparkles className="h-4 w-4 fill-current shrink-0" />
                  {!isProcessing && (["bgremove", "upscale", "faceswap", "watermark"].includes(activeTool) || prompt.trim()) && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-black/10 px-1.5 py-0.5 rounded font-black ml-1">
                      <Star className="h-3 w-3 fill-current" />
                      <span>
                        {activeTool === "watermark"
                          ? (Math.max(5, Math.ceil(videoDuration || 5)) * 0.4).toFixed(1)
                          : activeTool === "upscale"
                            ? mediaType === "video"
                              ? (Math.max(5, Math.ceil(videoDuration || 5)) * 1.2).toFixed(1)
                              : "2"
                            : activeTool === "bgremove" || activeTool === "faceswap"
                              ? "1"
                              : "2"}
                      </span>
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

              {/* Status Bar */}
              <div className="px-5 py-3.5 border-t border-white/5 bg-[#03050c] flex items-center justify-between text-[10px] text-zinc-400 font-bold shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Saved</span>
                </div>
                <div>GPU: 80%</div>
                <div>Version 1.2</div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Full-size preview / inspector — same modal used on the Image page */}
      <AnimatePresence>
        {inspectorAsset ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 p-4"
            onClick={() => setInspectorAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}



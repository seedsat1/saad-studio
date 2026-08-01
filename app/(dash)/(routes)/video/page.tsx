"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense, type DragEvent } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Film, Sparkles, ChevronDown, ImageIcon,
  Video, Clapperboard, Layers,
  PenTool, Zap, Music2, Users,
  X, AlertCircle, Loader2, Upload, CheckCircle2, Settings,
  type LucideIcon, Languages,
} from "lucide-react";

import { useLanguage } from "@/lib/use-language";
import { useAuth } from "@clerk/nextjs";

import MediaGrid, { MediaItem } from "@/components/MediaGrid";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import {
  WaveSpeedVideoModel,
  getModelGroups,
  DEFAULT_MODEL,
} from "@/lib/video-model-registry";
import { getGenerationCostSync } from "@/lib/pricing";
import { useAssetStore } from "@/hooks/use-asset-store";
import { getFallbackUrls } from "@/lib/utils";
import { NewModelsBanner } from "@/components/NewModelsBanner";
import { ReferenceStudioModal } from "@/components/ReferenceStudioModal";
import { ReferenceActionTiles } from "@/components/ReferenceActionTiles";
import { withPresetsAppended } from "@/lib/reference-prompt-injector";

// -- Utilities -----------------------------------------------------------------

/** Translate opaque provider API error messages into user-friendly text. */
function normalizeGenerationError(raw: string | null | undefined): string {
  if (!raw) return "Generation failed. Please try again.";
  const lower = raw.toLowerCase();
  if (lower.includes("models task execute failed") || lower.includes("task execute failed")) {
    return "The model failed to execute your request. This is usually temporary — please try again.";
  }
  if (lower.includes("content") && (lower.includes("policy") || lower.includes("violation") || lower.includes("sensitive"))) {
    return "Your prompt may have triggered a content filter. Please revise it and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  return raw
    .replace(/\b(kie(\.ai)?|wavespeed(\.ai)?)\b/gi, "Saad Studio")
    .replace(/https?:\/\/\S+/gi, "Saad Studio service");
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function useVideoTranslation() {
  const { lang } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      "New": "جديد",
      "18 styles": "18 نمطاً",
      "Style Library": "مكتبة الأنماط",
      "Tap a curated style. The prompt, model, and aspect ratio apply instantly.": "اضغط على نمط مخصص. يتم تطبيق الوصف والنموذج والأبعاد فوراً.",
      "Generation failed. Please try again.": "فشل التوليد. يرجى المحاولة مرة أخرى.",
      "The model failed to execute your request. This is usually temporary — please try again.": "فشل النموذج في تنفيذ طلبك. هذا مؤقت عادةً — يرجى المحاولة مرة أخرى.",
      "Video Tools": "أدوات الفيديو",
      "Video Tools & Models": "أدوات ونماذج الفيديو",
      "Video Engines": "محركات الفيديو",
      "Model Settings": "إعدادات النموذج",
      "Model": "النموذج",
      "Create high fidelity cinematic videos and animations with top AI models.": "أنشئ فيديوهات ورسوم متحركة سينمائية عالية الدقة مع أفضل نماذج الذكاء الاصطناعي.",
      
      // Sidebar tool actions
      "Text to Video": "نص إلى فيديو",
      "Generate video clips using descriptive prompt text.": "توليد مقاطع فيديو باستخدام وصف نصي.",
      "Image to Video": "صورة إلى فيديو",
      "Animate a static image into a dynamic video clip.": "تحريك صورة ثابتة إلى مقطع فيديو ديناميكي.",
      "Lipsync / Audio": "مزامنة الشفاه / الصوت",
      "Match speaker avatar movement to any audio track.": "مطابقة حركة رمز المتحدث مع أي مسار صوتي.",
      
      // Sidebar headers & buttons
      "Frames": "الإطارات",
      "Start frame": "إطار البداية",
      "End frame": "إطار النهاية",
      "Upload image *": "تحميل صورة *",
      "Drop image here": "أفلت الصورة هنا",
      "Drop media here": "أفلت الوسائط هنا",
      "Drop images here": "أفلت الصور هنا",
      "Drop here": "أفلت هنا",
      "Optional": "اختياري",
      "Max ": "الحد الأقصى ",
      "Reference media": "وسائط مرجعية",
      "Reference images": "صور مرجعية",
      "Reference images mode is active; first/last frame inputs will be ignored for this generation.": "وضع مراجع الصور نشط، وسيتم تجاهل إدخالات إطارات البداية والنهاية في هذا التوليد.",
      "Use @image1, @image2, @image3 inside prompt/shot prompts to activate references.": "استخدم @image1، @image2، @image3 داخل الوصف/لقطات الوصف لتفعيل المراجع.",
      "Seedance maps @Image1..@Image9 from image references only; video and audio references are sent separately.": "سيدانس يقوم برسم @Image1..@Image9 من مراجع الصور فقط، ويتم إرسال مراجع الفيديو والصوت بشكل منفصل.",
      "AI Model": "نموذج الذكاء الاصطناعي",
      "Character Reference": "مرجع الشخصية",
      "No saved character": "لا توجد شخصية محفوظة",
      "Create a reusable character": "إنشاء شخصية قابلة للاستخدام",
      "reusable character": "شخصية قابلة للاستخدام",
      "reference image(s)": "صور مرجعية",
      "reusable identity reference": "مرجع هوية قابل للاستخدام",
      "Kling 3.0 Elements needs at least 2 reference images for this character.": "عناصر Kling 3.0 تحتاج إلى صورتين مرجعيتين على الأقل لهذه الشخصية.",
      "Kling 3.0 Elements needs at least 3 reference images for this character.": "عناصر Kling 3.0 تحتاج إلى 3 صور مرجعية على الأقل لهذه الشخصية.",
      "N/A in multi-shot": "غير متاح في اللقطات المتعددة",
      "⚠ Both slots have the same image!": "⚠ كلا الحقلين يحتويان على نفس الصورة!",
      "Duration": "المدة",
      "Aspect Ratio": "الأبعاد",
      "Resolution": "الدقة",
      "Quality": "الجودة",
      "Orientation": "الاتجاه",
      "CFG Scale": "مقياس CFG",
      "Flexible": "مرن",
      "Strict": "دقيق",
      "Shot Type": "نوع اللقطة",
      "intelligent": "ذكية",
      "customize": "مخصصة",
      "Multi-shot": "لقطات متعددة",
      "Multiple scenes in one video": "مشاهد متعددة في فيديو واحد",
      "Shots": "لقطات",
      "Duration per shot": "مدة اللقطة",
      "each": "كل منها",
      "Auto divides ": "التقسيم التلقائي يقسم ",
      "s into ": " ثانية إلى ",
      " scene": " مشهد",
      " scenes using your prompt.": " مشاهد باستخدام الوصف الخاص بك.",
      "matches target": "يطابق الهدف",
      "remaining": "متبقي",
      "over": "زائد",
      "Shot": "لقطة",
      "Scene ": "المشهد ",
      " description…": " وصف…",
      "description…": "وصف…",
      "+ Add Shot": "+ إضافة لقطة",
      "max": "كحد أقصى",
      "Elements": "العناصر",
      "+ Add Element": "+ إضافة عنصر",
      "Elements let you reference consistent characters or objects using @element_name in your prompt.": "تسمح لك العناصر بالإشارة إلى شخصيات أو كائنات متسقة باستخدام @اسم_العنصر في الوصف الخاص بك.",
      "✓ Ready": "✓ جاهز",
      "⚠ Incomplete": "⚠ غير مكتمل",
      "Name (letters/digits only — used as @name)": "الاسم (أحرف/أرقام فقط — يُسخدم كـ @الاسم)",
      "Brief description of this element": "وصف قصير لهذا العنصر",
      "Req.": "مطلوب",
      "Opt.": "اختياري",
      "Upload at least 2 images for this element.": "ارفع صورتين على الأقل لهذا العنصر.",
      "⚠ Upload at least 2 images for this element.": "⚠ ارفع صورتين على الأقل لهذا العنصر.",
      "✓ @": "✓ @",
      " is in prompt": " موجود في الوصف",
      "⚠ Add to prompt:": "⚠ أضف إلى الوصف:",
      "+ Insert @": "+ إدراج @",
      "Generate Sound": "توليد الصوت",
      "AI-generated audio track - included": "مسار صوتي مولد بالذكاء الاصطناعي - متضمن",
      "included": "متضمن",
      "Negative Prompt": "الوصف السلبي (Negative Prompt)",
      "Things to avoid…": "أشياء يجب تجنبها…",
      "Each element needs 2–4 images. Reference it in your prompt as @element_name.": "يحتاج كل عنصر إلى 2-4 صور. أشر إليه في الوصف الخاص بك كـ @اسم_العنصر.",
      "Name (e.g. hero, car, logo)": "الاسم (مثل: بطل، سيارة، شعار)",
      "Required": "مطلوب",
      "Generate Video": "توليد الفيديو",
      "Generate Lipsync": "توليد مزامنة الشفاه",
      "Sending…": "جاري الإرسال…",
      "running": "قيد التشغيل",
      "Select Video": "حدد الفيديو",
      "Upload media - ": "رفع وسائط - ",
      "Select Reference Image (": "حدد صورة مرجعية (",
      "Select End Frame": "حدد إطار النهاية",
      "Select Start Frame": "حدد إطار البداية",
      "Device": "الجهاز",
      "Generated Images": "الصور المولدة",
      "Generated Videos": "الفيديوهات المولدة",
      "Upload from device": "الرفع من الجهاز",
      "PNG, JPG, WebP": "PNG, JPG, WebP",
      "Image, Video or Audio": "صورة، فيديو أو صوت",
      "MP4, MOV, WebM": "MP4, MOV, WebM",
      "No generated images yet": "لا توجد صور مولدة بعد",
      "No generated videos yet": "لا توجد فيديوهات مولدة بعد",
      
      // Right sidebar headers/placeholders
      "Describe your video...": "صف الفيديو الخاص بك...",
      "Describe speaker text or audio requirements...": "صف نص المتحدث أو متطلبات الصوت...",
      "Prompt Composer": "منشئ الوصف",
      "Generate": "توليد",
      "Generate Video (": "توليد الفيديو (",
      "Generate Lipsync (": "توليد مزامنة الشفاه (",
      "Settings": "الإعدادات",
      "Close Settings": "إغلاق الإعدادات",
      "Customize generation parameters.": "تخصيص معايير التوليد.",
      "Workspace Gallery": "معرض مساحة العمل",
      "Sort:": "الترتيب:",
      "Newest first": "الأحدث أولاً",
      "Oldest first": "الأقدم أولاً",
      "Filter:": "التصفية:",
      "All models": "جميع النماذج",
      "Delete": "حذف",
      "Download": "تحميل",
      "Extend": "تمديد",
      "Upscale": "تكبير الدقة",
      "Remix": "إعادة مزج",
      "All": "الكل",
      "LATEST": "الأحدث",
      "Create your first video": "أنشئ أول فيديو لك",
      "Write a prompt and hit Generate to start creating": "اكتب وصفاً واضغط على توليد لبدء الإنشاء",
      "Select an asset to view details": "حدد عنصراً لعرض التفاصيل",
      
      // Tool names/descriptions for UI mapping
      "Kling 3.0": "Kling 3.0",
      "Kling Motion": "حركة Kling",
      "Seedance 2": "Seedance 2",
      "Veo 3.1 Fast": "Veo 3.1 السريع",
      "Hailuo I2V": "Hailuo I2V",
      "Sora 2": "Sora 2",
      "Luma Dream": "Luma Dream",
      "ByteDance Fast": "ByteDance السريع",
      "Grok Video": "فيديو Grok",
      
      // Sizes mapping
      "Landscape 16:9": "أفقي 16:9",
      "Portrait  9:16": "عمودي 9:16",
      "Landscape 4:3": "أفقي 4:3",
      "Portrait 3:4": "عمودي 3:4",
      "Adaptive": "متكيف",
      "Horizontal": "أفقي",
      "Vertical": "عمودي",
      "Auto-detect from content": "كشف تلقائي من المحتوى",
      
      // Lipsync details
      "Avatar Image": "صورة الرمز (Avatar)",
      "Upload speaker photo": "ارفع صورة المتحدث",
      "Voice / Audio": "الصوت / الملف الصوتي",
      "Record or upload speech": "سجل أو ارفع حديثاً صوتاً",
      "Upload audio": "ارفع ملفاً صوتياً",
      "Voice ID": "معرف الصوت",
      "Select voice...": "اختر صوتاً...",
      "Record speech...": "تسجيل الحديث...",
      "Speak now...": "تحدث الآن...",
      "Stop recording": "إيقاف التسجيل",
      "Upload audio clip": "رفع مقطع صوتي",
      "Audio source file": "ملف مصدر الصوت",
      "Microphone": "الميكروفون",
      "Text-to-Speech": "تحويل النص إلى كلام",
      "Write what the speaker will say": "اكتب ما سيقوله المتحدث",
      "Choose voice": "اختر الصوت",
      
      // Extra details
      "Scene Control Mode": "وضع التحكم بالمشهد",
      "Element List": "قائمة العناصر",
      "Element ID ": "معرف العنصر ",
      "Estimated cost:": "التكلفة التقديرية:",
      "Both slots have the same image!": "كلا الحقلين يحتويان على نفس الصورة!",
      "First/last frame inputs will be ignored.": "سيتم تجاهل إدخالات إطارات البداية والنهاية.",
      "Use @image1, @image2, @image3 inside prompt": "استخدم @image1، @image2، @image3 داخل الوصف",
      "Element": "عنصر",
      "Element name": "اسم العنصر",
      "Element description": "وصف العنصر",
      "Upload at least 2 images": "ارفع صورتين على الأقل",
      "is in prompt": "موجود في الوصف",
      "Add to prompt:": "أضف إلى الوصف:",
      "Insert @": "إدراج @"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang };
}

function StyleLibraryGatewayCard() {
  const { t } = useVideoTranslation();
  return (
    <a
      href="/image-presets"
      className="group mx-2 mt-4 block overflow-hidden rounded-xl border transition-all hover:shadow-lg"
      style={{
        background: "rgba(0,0,0,0.34)",
        borderColor: "rgba(251,191,36,0.25)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.18)",
      }}
    >
      <div className="relative h-32 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/preset/card.webp"
          alt="Style Library featured styles"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(251,191,36,0.15)", color: "#fde68a", border: "1px solid rgba(251,191,36,0.35)" }}>
            {t("New")}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(252,211,77,0.72)" }}>
            {t("18 styles")}
          </span>
        </div>
        <h3 className="mt-1.5 text-sm font-black text-white">{t("Style Library")}</h3>
        <p className="mt-0.5 text-[11px] leading-5" style={{ color: "#94a3b8" }}>
          {t("Tap a curated style. The prompt, model, and aspect ratio apply instantly.")}
        </p>
      </div>
    </a>
  );
}

function validateVideoDuration(file: File, minSec = 3, maxSec = 15): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read video duration."));
      } else if (duration < minSec || duration > maxSec) {
        reject(
          new Error(
            `Video duration must be between ${minSec}s and ${maxSec}s. Current duration: ${Math.round(duration)}s.`
          )
        );
      } else {
        resolve(duration);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata. Make sure it is a valid video file."));
    };
  });
}

async function fileToDataURL(file: File, maxPx = 1920, quality = 0.85): Promise<string> {
  // For non-image files (video) return raw data URL without compression
  if (!file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          const scale = maxPx / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function aspectRatioToNumbers(ratio: string | null | undefined): { w: number; h: number } {
  if (ratio === "9:16") return { w: 9, h: 16 };
  if (ratio === "1:1") return { w: 1, h: 1 };
  return { w: 16, h: 9 };
}

function targetCanvasSizeForRatio(ratio: string | null | undefined, maxLongSide = 1920) {
  const { w, h } = aspectRatioToNumbers(ratio);
  if (h > w) {
    return { width: Math.round((maxLongSide * w) / h), height: maxLongSide };
  }
  if (w > h) {
    return { width: maxLongSide, height: Math.round((maxLongSide * h) / w) };
  }
  return { width: maxLongSide, height: maxLongSide };
}

async function fileToAspectDataURL(file: File, ratio: string | null | undefined, quality = 0.88): Promise<string> {
  if (!file.type.startsWith("image/")) return fileToDataURL(file);

  const raw = await fileToDataURL(file, 2400, quality);
  return imageSourceToAspectDataURL(raw, ratio, quality);
}

async function imageSourceToAspectDataURL(source: string, ratio: string | null | undefined, quality = 0.88): Promise<string> {
  if (!source || !source.startsWith("data:image/")) return source;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(source);
    img.onload = () => {
      const { width, height } = targetCanvasSizeForRatio(ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(source);
        return;
      }

      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, width, height);

      const coverScale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const coverW = img.naturalWidth * coverScale;
      const coverH = img.naturalHeight * coverScale;
      ctx.globalAlpha = 0.35;
      ctx.filter = "blur(28px)";
      ctx.drawImage(img, (width - coverW) / 2, (height - coverH) / 2, coverW, coverH);

      const containScale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
      const containW = img.naturalWidth * containScale;
      const containH = img.naturalHeight * containScale;
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.drawImage(img, (width - containW) / 2, (height - containH) / 2, containW, containH);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = source;
  });
}

function sizeToRatio(size: string): string {
  const [w, h] = size.split("*").map(Number);
  if (!w || !h) return "16:9";
  return w > h ? "16:9" : "9:16";
}

function sizeLabel(size: string): string {
  const MAP: Record<string, string> = {
    "1280*720": "Landscape 16:9",
    "720*1280": "Portrait  9:16",
    "854*480":  "Landscape 16:9",
    "480*854":  "Portrait  9:16",
  };
  return MAP[size] ?? size;
}

function prettyModelName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
}

function splitShotDurations(totalDuration: number, shotCount: number): number[] {
  if (shotCount <= 0 || totalDuration <= 0) return [];
  const base = Math.floor(totalDuration / shotCount);
  const remainder = totalDuration % shotCount;
  if (base < 1) return [];
  return Array.from({ length: shotCount }, (_, idx) => base + (idx === shotCount - 1 ? remainder : 0));
}

function compactKlingSingleShotPrompt(value: string, maxChars = 2400): string {
  const prompt = value.trim();
  if (prompt.length <= maxChars) return prompt;

  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^duration\s*:/i.test(line));
  const priority: string[] = [];
  const rules: string[] = [];

  for (const line of lines) {
    if (
      /reference|preserve|no text|no extra|no watermark|original printed|vertical|9:16|4k|ultra realistic|cinematic|product|packaging|global cinematic rules/i.test(line)
    ) {
      priority.push(line);
    } else if (/^shot\s+\d+/i.test(line)) {
      priority.push(line.replace(/^SHOT\s+\d+\s*[—-]\s*/i, "Scene beat: "));
    } else if (/rules/i.test(line)) {
      rules.push(line);
    }
  }

  const compact = [
    "Create one coherent 15-second cinematic commercial. Preserve the uploaded reference product and frame continuity.",
    ...priority,
    ...rules,
    "Keep the result vertical 9:16, polished, realistic, stable, and free of added text overlays or watermarks.",
  ].join("\n");

  return compact.length > maxChars ? `${compact.slice(0, maxChars - 1).trim()}…` : compact;
}

function isSeedanceV2VideoModel(model: WaveSpeedVideoModel): boolean {
  return model.id.startsWith("bytedance-seedance-v2");
}

function getReferenceFileLimits(model: WaveSpeedVideoModel) {
  const isKling30 = model.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
  return {
    images: isKling30 ? 3 : Math.max(0, model.capabilities.max_reference_images || 0),
    videos: Math.max(0, model.capabilities.max_reference_videos || 0),
    audios: Math.max(0, model.capabilities.max_reference_audios || 0),
  };
}

function isAllowedReferenceFile(file: File, model: WaveSpeedVideoModel): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type.startsWith("video/")) {
    return !!(model.capabilities.requires_video || model.capabilities.optional_video || model.capabilities.max_reference_videos > 0);
  }
  if (file.type.startsWith("audio/")) {
    return model.capabilities.max_reference_audios > 0;
  }
  return false;
}

function mergeReferenceFiles(current: File[], incoming: File[], model: WaveSpeedVideoModel): File[] {
  const allFiles = [...current, ...incoming].filter((file) => isAllowedReferenceFile(file, model));
  const limits = getReferenceFileLimits(model);

  if (limits.videos > 0 || limits.audios > 0) {
    const images = allFiles.filter((file) => file.type.startsWith("image/")).slice(0, limits.images);
    const videos = allFiles.filter((file) => file.type.startsWith("video/")).slice(0, limits.videos);
    const audios = allFiles.filter((file) => file.type.startsWith("audio/")).slice(0, limits.audios);
    return [...images, ...videos, ...audios];
  }

  return allFiles.filter((file) => file.type.startsWith("image/")).slice(0, limits.images);
}

function getReferenceFileSummary(files: File[], model: WaveSpeedVideoModel): string {
  const limits = getReferenceFileLimits(model);
  const imageCount = files.filter((file) => file.type.startsWith("image/")).length;

  if (limits.videos > 0 || limits.audios > 0) {
    const videoCount = files.filter((file) => file.type.startsWith("video/")).length;
    const audioCount = files.filter((file) => file.type.startsWith("audio/")).length;
    return `Images ${imageCount}/${limits.images} | Videos ${videoCount}/${limits.videos} | Audio ${audioCount}/${limits.audios}`;
  }

  return `${imageCount}/${limits.images} reference image(s)`;
}

function getReferenceFileMaxLabel(model: WaveSpeedVideoModel): string {
  const limits = getReferenceFileLimits(model);
  if (limits.videos > 0 || limits.audios > 0) {
    return `${limits.images} images + ${limits.videos} videos + ${limits.audios} audio`;
  }
  return `${limits.images}`;
}

// -- Constants -----------------------------------------------------------------

const BADGE_STYLE = {
  TOP:  { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24" },
  NEW:  { bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  PRO:  { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa" },
  FAST: { bg: "rgba(14,165,233,0.15)",  text: "#38bdf8" },
  MINI: { bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  "4K": { bg: "rgba(236,72,153,0.16)",  text: "#f472b6" },
};

type VideoToolId =
  | "create-video"
  | "image-to-video"
  | "kling-3"
  | "kling-motion"
  | "seedance-2"
  | "veo-fast"
  | "hailuo-i2v"
  | "lipsync";

type VideoTool = {
  id: VideoToolId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const TOOLS: VideoTool[] = [
  { id: "create-video", label: "Text to Video", description: "Prompt based video generation", icon: Video },
  { id: "image-to-video", label: "Image to Video", description: "Animate an uploaded start frame", icon: ImageIcon },
  { id: "kling-3", label: "Kling 3.0", description: "Structured multi-shot generation", icon: Clapperboard },
  { id: "kling-motion", label: "Kling Motion", description: "Guided motion and camera control", icon: Zap },
  { id: "seedance-2", label: "Seedance 2", description: "Reference based cinematic video", icon: Sparkles },
  { id: "veo-fast", label: "Veo 3.1 Fast", description: "Fast commercial video drafts", icon: Video },
  { id: "hailuo-i2v", label: "Hailuo I2V", description: "Image to video animation preset", icon: PenTool },
];

const TOOL_ALIASES: Record<string, VideoToolId> = {
  "cinema-studio": "seedance-2",
  "mixed-media": "kling-3",
  "edit-video": "veo-fast",
  "click-to-ad": "veo-fast",
  "sora-trends": "veo-fast",
  "draw-to-video": "hailuo-i2v",
  "sketch-to-video": "hailuo-i2v",
  "ugc-factory": "veo-fast",
  "video-upscale": "veo-fast",
  "higgsfield-animate": "seedance-2",
  "vibe-motion": "veo-fast",
  "recast-studio": "veo-fast",
};

function resolveVideoTool(toolId: string | null): VideoToolId | null {
  if (!toolId) return null;
  if (TOOLS.some((tool) => tool.id === toolId)) return toolId as VideoToolId;
  return TOOL_ALIASES[toolId] ?? null;
}

const TOOL_DEFAULT_MODEL_ID: Record<VideoToolId, string> = {
  "create-video": "google-gemini-omni-video",
  "image-to-video": "kling-v3-turbo",
  "kling-3": "kling-v3.0-pro-t2v",
  "kling-motion": "kling-v3.0-pro-t2v",
  "seedance-2": "bytedance-seedance-v2-t2v",
  "veo-fast": "google-veo3.1-fast-t2v",
  "hailuo-i2v": "minimax-hailuo-2.3-i2v-fast",
  "lipsync": "kling-ai-avatar-pro",
};

const TOOL_PROMPT_PREFIX: Record<VideoToolId, string> = {
  "create-video": "",
  "image-to-video": "Animate the uploaded start frame with natural cinematic motion. ",
  "kling-3": "Create a structured cinematic video with clear subject continuity and controlled composition. ",
  "kling-motion": "Use controlled camera motion and preserve subject identity across the motion. ",
  "seedance-2": "Create a cinematic reference-based video with smooth motion and strong scene consistency. ",
  "veo-fast": "Create a concise commercial-ready video with strong composition and clean motion. ",
  "hailuo-i2v": "Animate the uploaded image with natural movement, stable subject identity, and cinematic framing. ",
  "lipsync": "",
};

const LIPSYNC_MODELS: WaveSpeedVideoModel[] = [
  {
    id: "kling-ai-avatar-pro",
    name: "Kling AI Avatar 2.0",
    family: "kling",
    family_label: "Kling",
    family_color: "#06b6d4",
    badge: "PRO",
    description: "Sync avatar lips to audio. Provide a clear face portrait image and an audio recording.",
    api_route: "kling/ai-avatar-pro",
    route_confirmed: true,
    capabilities: {
      requires_image: true,
      optional_image: false,
      requires_video: false,
      has_end_frame: false,
      aspect_ratios: [],
      sizes: [],
      durations: [],
      resolutions: [],
      quality_param: "resolution",
      max_reference_images: 0,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
      has_negative_prompt: false,
      has_seed: false,
      has_cfg_scale: false,
      has_sound: true,
      sound_param: "sound",
      has_shot_type: false,
      has_multi_prompt: false,
      has_element_list: false,
      has_scene_control: false,
      has_orientation: false,
      has_omni_tabs: false,
    }
  },
  {
    id: "infinitalk-from-audio",
    name: "Infinitalk API-AI lip-sync generator",
    family: "other",
    family_label: "Other",
    family_color: "#10b981",
    badge: "NEW",
    description: "Speech to video talking head lip-sync generator. Provide a clear face portrait image and an audio recording.",
    api_route: "infinitalk/from-audio",
    route_confirmed: true,
    capabilities: {
      requires_image: true,
      optional_image: false,
      requires_video: false,
      has_end_frame: false,
      aspect_ratios: [],
      sizes: [],
      durations: [],
      resolutions: [],
      quality_param: "resolution",
      max_reference_images: 0,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
      has_negative_prompt: false,
      has_seed: false,
      has_cfg_scale: false,
      has_sound: true,
      sound_param: "sound",
      has_shot_type: false,
      has_multi_prompt: false,
      has_element_list: false,
      has_scene_control: false,
      has_orientation: false,
      has_omni_tabs: false,
    }
  }
];

const LIPSYNC_MODEL = LIPSYNC_MODELS[0];

const FAMILY_GRADIENTS: Record<string, string> = {
  wan22:     "from-orange-900 via-orange-800 to-slate-900",
  kling:     "from-cyan-900   via-cyan-800   to-slate-900",
  veo:       "from-blue-900   via-sky-800    to-slate-900",
  sora:      "from-violet-900 via-purple-800 to-slate-900",
  hailuo:    "from-amber-900  via-amber-800  to-slate-900",
  seedance:  "from-emerald-900 via-emerald-800 to-slate-900",
  gemini:    "from-green-900 via-emerald-800 to-slate-900",
  luma:      "from-purple-900 via-purple-800 to-slate-900",
  pika:      "from-pink-900   via-pink-800   to-slate-900",
  pixverse:  "from-rose-900   via-rose-800   to-slate-900",
  runway:    "from-teal-900   via-teal-800   to-slate-900",
  grok:      "from-red-900    via-red-800    to-slate-900",
  other:     "from-teal-900   via-teal-800   to-slate-900",
};

const HIDDEN_VIDEO_PAGE_MODEL_IDS = new Set([
  "kling-v2.5-turbo-t2v",
  "kling-v2.5-turbo-i2v",
  "openai-sora-2-t2v",
  "openai-sora-2-i2v",
  "xai-grok-imagine-t2v",
  "xai-grok-imagine-edit",
]);

const MODEL_GROUPS = getModelGroups()
  .map((group) => ({
    ...group,
    models: group.models.filter((model) => !HIDDEN_VIDEO_PAGE_MODEL_IDS.has(model.id)),
  }))
  .filter((group) => group.models.length > 0);

type CharacterReference = {
  id: string;
  name: string;
  description?: string;
  referenceUrls: string[];
  coverUrl?: string | null;
  providerCharacterId?: string | null;
  status: string;
  metadata?: {
    characterPackage?: {
      mainIdentity?: string;
      faceMemory?: string;
      bodyProfile?: string;
      outfitMemory?: string;
      styleDna?: string;
      motionReferences?: string;
      consistencyProfile?: string;
      states?: Record<string, string>;
    };
  };
};

type CharacterSupportMode = "none" | "image_reference" | "kling_element" | "provider_character_id";

type CharacterSupport = {
  mode: CharacterSupportMode;
  label: string;
  minImages: number;
  maxImages: number;
  note: string;
};

const VIDEO_EDIT_CONTEXT_PREFIX = "saad_video_edit_context:";

function persistVideoEditContext(taskId: string, context: Record<string, unknown>) {
  if (typeof window === "undefined" || !taskId) return;
  try {
    const value = JSON.stringify({ ...context, savedAt: Date.now() });
    localStorage.setItem(`${VIDEO_EDIT_CONTEXT_PREFIX}${taskId}`, value);
    if (taskId.startsWith("gvo:")) {
      localStorage.setItem(`${VIDEO_EDIT_CONTEXT_PREFIX}gen-${taskId}`, value);
    }
  } catch {}
}

const NO_CHARACTER_SUPPORT: CharacterSupport = {
  mode: "none",
  label: "Not supported",
  minImages: 0,
  maxImages: 0,
  note: "This model does not accept saved character references.",
};

function getVideoCharacterSupport(model: WaveSpeedVideoModel): CharacterSupport {
  const route = model.api_route;

  if (model.family === "kling" && model.capabilities.has_element_list) {
    return {
      mode: "kling_element",
      label: "Kling Element",
      minImages: 2,
      maxImages: 4,
      note: "Kling Elements requires 2-4 reference images. The character is injected into the prompt as @name.",
    };
  }

  if (model.id.startsWith("bytedance-seedance-v2")) {
    return {
      mode: "image_reference",
      label: "Reference images",
      minImages: 1,
      maxImages: 9,
      note: "Seedance 2.0 accepts saved character images as visual references.",
    };
  }

  if (route === "google/veo3.1-fast-text-to-video") {
    return {
      mode: "image_reference",
      label: "Reference-to-video",
      minImages: 1,
      maxImages: 3,
      note: "Veo 3.1 Fast supports REFERENCE_2_VIDEO with up to 3 images.",
    };
  }

  if (route === "x-ai/grok-imagine-video/edit-video") {
    return {
      mode: "image_reference",
      label: "Image references",
      minImages: 1,
      maxImages: 7,
      note: "Grok image-to-video can use saved character images as references.",
    };
  }

  if (route.includes("openai/sora-2")) {
    return {
      mode: "provider_character_id",
      label: "Provider character ID",
      minImages: 0,
      maxImages: 0,
      note: "Sora character reuse requires a provider character ID, not ordinary reference images.",
    };
  }

  return NO_CHARACTER_SUPPORT;
}

function normalizeCharacterTag(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return cleaned || "character";
}

// -- Main Component -------------------------------------------------------------

function VideoPageInner() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { t, lang } = useVideoTranslation();
  const searchParams = useSearchParams();
  const [activeTool,    setActiveTool]    = useState<VideoToolId>("create-video");
  const [selectedModel, setSelectedModel] = useState<WaveSpeedVideoModel>(DEFAULT_MODEL);
  const [modelOpen,     setModelOpen]     = useState(false);
  const [characters, setCharacters] = useState<CharacterReference[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  useEffect(() => {
    let requestedTool = resolveVideoTool(searchParams.get("tool"));
    const requestedAudioUrl = searchParams.get("audioUrl");
    if (requestedAudioUrl && /^https?:\/\//i.test(requestedAudioUrl)) {
      requestedTool = "lipsync";
    }
    if (requestedTool) setActiveTool(requestedTool);

    const requestedModel = searchParams.get("model");
    if (requestedModel) {
      const allModels = MODEL_GROUPS.flatMap((group) => group.models);
      const matched = allModels.find((model) => model.api_route === requestedModel || model.id === requestedModel);
      if (matched) {
        setSelectedModel(matched);
        const c = matched.capabilities;
        setDuration(c.durations[0] ?? null);
        setAspectRatio(c.aspect_ratios[0] ?? (c.sizes.length > 0 ? null : "16:9"));
        setSize(c.sizes[0] ?? null);
        setResolution(c.resolutions[0] ?? null);
      }
    }

    const requestedCharacter = searchParams.get("characterId");
    if (requestedCharacter) setSelectedCharacterId(requestedCharacter);
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

  // Prompt fields
  const [prompt,    setPrompt]    = useState("");
  const [negPrompt, setNegPrompt] = useState("");

  // Output controls — reset when model changes
  const [duration,    setDuration]    = useState<number | null>(DEFAULT_MODEL.capabilities.durations[0] ?? null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(DEFAULT_MODEL.capabilities.aspect_ratios[0] ?? null);
  const [size,        setSize]        = useState<string | null>(DEFAULT_MODEL.capabilities.sizes[0] ?? null);
  const [resolution,  setResolution]  = useState<string | null>(DEFAULT_MODEL.capabilities.resolutions[0] ?? null);

  // Advanced controls
  const [cfgScale,      setCfgScale]      = useState(0.5);
  const [sound,         setSound]         = useState(false);
  const [shotType,      setShotType]      = useState<"intelligent" | "customize">("intelligent");
  const [multiPrompts,  setMultiPrompts]  = useState<string[]>([""]);
  const [elementList,   setElementList]   = useState<string[]>([""]);
  const [sceneControl,  setSceneControl]  = useState(false);
  const [orientation,   setOrientation]   = useState<"video" | "image">("video");
  const [omniTab,       setOmniTab]       = useState<"elements" | "frames">("elements");

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

  // Kling 3.0 structured elements (name + description + 2-4 images each, max 3 elements)
  type KlingEl = { name: string; description: string; files: File[]; previews: string[]; };
  const [klingEls, setKlingEls] = useState<KlingEl[]>([]);

  // Kling 3.0 multi-shot state (separate from generic multiPrompts — avoids cross-model pollution)
  const [kling30MultiEnabled, setKling30MultiEnabled] = useState(false);
  const [kling30MultiMode, setKling30MultiMode] = useState<"auto" | "custom">("auto");
  // custom shots: each has prompt + individual duration
  const [kling30CustomShots, setKling30CustomShots] = useState<Array<{ prompt: string; duration: number }>>([
    { prompt: "", duration: 5 },
  ]);

  // Image inputs
  const [startFrame,   setStartFrame]   = useState<File | null>(null);
  const [linkedStartFrameUrl, setLinkedStartFrameUrl] = useState<string | null>(null);
  const [endFrame,     setEndFrame]     = useState<File | null>(null);
  const [motionVideo,  setMotionVideo]  = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]); // unified: image + video + audio for Seedance 2
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  const [motionVideoPreview, setMotionVideoPreview] = useState<string | null>(null);
  const [motionVideoDuration, setMotionVideoDuration] = useState<number | null>(null);
  // Detected aspect ratio of the uploaded start frame (Kling 3.0 i2v auto-adapts to this)
  const [startFrameRatio, setStartFrameRatio] = useState<string | null>(null);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const startFrameRef  = useRef<HTMLInputElement>(null);
  const endFrameRef    = useRef<HTMLInputElement>(null);
  const motionVideoRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<HTMLInputElement>(null);
  // Lipsync audio state
  const [lipsyncAudioFile, setLipsyncAudioFile] = useState<File | null>(null);
  const [lipsyncAudioPreview, setLipsyncAudioPreview] = useState<string | null>(null);
  const lipsyncAudioRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (motionVideo) {
      validateVideoDuration(motionVideo, 3, 30)
        .then((dur) => setMotionVideoDuration(dur))
        .catch(() => setMotionVideoDuration(null));
    } else {
      setMotionVideoDuration(null);
    }
  }, [motionVideo]);

  useEffect(() => {
    if (!lipsyncAudioFile) {
      setLipsyncAudioPreview(null);
      return;
    }
    const url = URL.createObjectURL(lipsyncAudioFile);
    setLipsyncAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [lipsyncAudioFile]);

  useEffect(() => {
    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt) setPrompt(requestedPrompt);

    const requestedImageUrl = searchParams.get("imageUrl");
    if (!requestedImageUrl || !/^https?:\/\//i.test(requestedImageUrl)) return;

    let cancelled = false;
    setLinkedStartFrameUrl(requestedImageUrl);
    setStartFrame(null);
    setOmniTab("frames");

    const fallbacks = getFallbackUrls(requestedImageUrl);
    const fetchUrl = fallbacks.find((u) => u.startsWith("/api/media/")) || requestedImageUrl;

    void fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load linked image");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const type = blob.type || "image/jpeg";
        const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        setStartFrame(new File([blob], `linked-start-frame.${ext}`, { type }));
        setLinkedStartFrameUrl(null);
      })
      .catch(() => {
        if (!cancelled) setLinkedStartFrameUrl(requestedImageUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Load audioUrl from searchParams
  useEffect(() => {
    const requestedAudioUrl = searchParams.get("audioUrl");
    if (!requestedAudioUrl || !/^https?:\/\//i.test(requestedAudioUrl)) return;

    let cancelled = false;

    const fallbacks = getFallbackUrls(requestedAudioUrl);
    const fetchUrl = fallbacks.find((u) => u.startsWith("/api/media/")) || requestedAudioUrl;

    void fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load linked audio");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const type = blob.type || "audio/mpeg";
        const ext = type.includes("wav") ? "wav" : type.includes("aac") ? "aac" : "mp3";
        setLipsyncAudioFile(new File([blob], `linked-audio.${ext}`, { type }));
      })
      .catch((err) => {
        console.error("Failed to load searchParam audio:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);



  // Media gallery picker
  type PickerTarget = "startFrame" | "endFrame" | "motionVideo" | "referenceImages";
  const [mediaPicker, setMediaPicker]     = useState<PickerTarget | null>(null);
  const [pickerGallery, setPickerGallery] = useState<Array<{ id: string; url: string; type: string }>>([]);
  const [pickerTab, setPickerTab]         = useState<"upload" | "images" | "videos">("images");
  const [pickerLoading, setPickerLoading] = useState(false);

  const allowDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const markDropZone = useCallback((event: DragEvent<HTMLElement>, zone: string) => {
    event.preventDefault();
    setActiveDropZone(zone);
  }, []);

  const clearDropZone = useCallback((event: DragEvent<HTMLElement>, zone: string) => {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setActiveDropZone((current) => (current === zone ? null : current));
  }, []);

  const handleDropSingleImage = useCallback((event: DragEvent<HTMLElement>, setter: (file: File | null) => void) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (!dropped || !dropped.type.startsWith("image/")) return;
    setter(dropped);
  }, []);

  const handleDropSingleVideo = useCallback((event: DragEvent<HTMLElement>, setter: (file: File | null) => void) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (!dropped || !dropped.type.startsWith("video/")) return;
    setter(dropped);
  }, []);

  const handleDropReferenceImages = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setActiveDropZone(null);
    const dropped = Array.from(event.dataTransfer.files ?? []).filter((file) => isAllowedReferenceFile(file, selectedModel));
    if (!dropped.length) return;
    if (getReferenceFileLimits(selectedModel).images <= 0) return;
    setReferenceImages((prev) => mergeReferenceFiles(prev, dropped, selectedModel));
  }, [selectedModel]);

  useEffect(() => {
    if (!startFrame) {
      setStartFramePreview(linkedStartFrameUrl);
      setStartFrameRatio(null);
      if (linkedStartFrameUrl) {
        const img = new window.Image();
        img.onload = () => {
          const r = img.naturalWidth / img.naturalHeight;
          const snapped = Math.abs(r - 1) < 0.15 ? "1:1" : (r > 1 ? "16:9" : "9:16");
          setStartFrameRatio(snapped);
        };
        img.src = linkedStartFrameUrl;
      }
      return;
    }
    const url = URL.createObjectURL(startFrame);
    setStartFramePreview(url);
    // Detect actual aspect ratio of the image so we can mirror Kling 3.0's auto-adapt behavior
    const img = new window.Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      const snapped = Math.abs(r - 1) < 0.15 ? "1:1" : (r > 1 ? "16:9" : "9:16");
      setStartFrameRatio(snapped);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [linkedStartFrameUrl, startFrame]);

  useEffect(() => {
    if (!endFrame) {
      setEndFramePreview(null);
      return;
    }
    const url = URL.createObjectURL(endFrame);
    setEndFramePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [endFrame]);

  useEffect(() => {
    if (!motionVideo) {
      setMotionVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(motionVideo);
    setMotionVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [motionVideo]);

  useEffect(() => {
    if (!referenceImages.length) {
      setReferencePreviews([]);
      return;
    }
    const urls = referenceImages.map((f) => URL.createObjectURL(f));
    setReferencePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [referenceImages]);

  // Generation state
  type PendingTask = { model: WaveSpeedVideoModel; promptText: string; ratio: string; duration: number | null };
  const [pendingTasks,    setPendingTasks]    = useState<Map<string, PendingTask>>(new Map());
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const completedTaskRefs = useRef<Set<string>>(new Set());
  const resultUrlsRef = useRef<Set<string>>(new Set());

  // Results
  const [results, setResults] = useState<MediaItem[]>([]);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const allModels = useMemo(() => MODEL_GROUPS.flatMap((group) => group.models), []);

  useEffect(() => {
    let cancelled = false;
    const loadPersisted = async () => {
      try {
        const res = await fetch("/api/assets?type=video", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;

        const seenUrls = new Set<string>();
        const mapped: MediaItem[] = data.assets.flatMap((asset: any) => {
          if (!asset?.url || seenUrls.has(asset.url)) return [];
          seenUrls.add(asset.url);
          const model = allModels.find((m) => m.api_route === asset.model || m.name === asset.model);
          return [{
            id: asset.id,
            type: "video",
            src: asset.url,
            model: model?.name ?? (asset.model || "Video"),
            modelColor: model?.family_color ?? "#06b6d4",
            ratio: "16:9",
            duration: "auto",
            prompt: asset.prompt || "",
            providerRequestId: asset.providerRequestId,
            gradient: model ? (FAMILY_GRADIENTS[model.family] ?? "from-slate-900 via-slate-800 to-slate-900") : "from-slate-900 via-slate-800 to-slate-900",
            createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
          }];
        });

        resultUrlsRef.current = seenUrls;
        setResults(mapped);
      } catch {
        // keep local results only
      }
    };

    void loadPersisted();
    return () => {
      cancelled = true;
    };
  }, [allModels]);

  // Capability shorthand
  const caps = selectedModel.capabilities;
  const characterSupport = useMemo(() => getVideoCharacterSupport(selectedModel), [selectedModel]);
  const selectableCharacters = useMemo(
    () => characterSupport.mode === "provider_character_id"
      ? characters.filter((character) => Boolean(character.providerCharacterId))
      : characters,
    [characters, characterSupport.mode],
  );
  const supportsCharacterReference = characterSupport.mode !== "none" && selectableCharacters.length > 0;
  const selectedCharacter = useMemo(
    () => supportsCharacterReference ? selectableCharacters.find((character) => character.id === selectedCharacterId) || null : null,
    [selectableCharacters, selectedCharacterId, supportsCharacterReference],
  );
  const isSoraModel = selectedModel.api_route.includes("openai/sora-2");
  const isVeo31Model =
    selectedModel.api_route.startsWith("google/veo3.1") ||
    selectedModel.api_route === "google/veo-3.1-generate-preview" ||
    selectedModel.api_route === "google/gemini-omni-video" ||
    selectedModel.api_route === "google/gemini-omni-flash";
  const isVeo31LiteModel = selectedModel.api_route === "google/veo3.1-lite-text-to-video";
  const isVeo31FastModel = selectedModel.api_route === "google/veo3.1-fast-text-to-video";
  const hasVeo31ReferenceInput = isVeo31Model && (
    Boolean(startFrame) ||
    Boolean(linkedStartFrameUrl) ||
    Boolean(endFrame) ||
    referenceImages.length > 0
  );
  const isVeo31HighResolution = isVeo31Model && ["1080p", "4k"].includes((resolution ?? "").toLowerCase());
  const isVeo31FixedEightSecond = isVeo31Model && selectedModel.api_route !== "google/gemini-omni-flash" && (hasVeo31ReferenceInput || isVeo31HighResolution);
  const durationChoices = isSoraModel ? [4, 8, 12] : isVeo31FixedEightSecond ? [8] : caps.durations;
  const resolutionChoices = isSoraModel
    ? []
    : isVeo31LiteModel
      ? caps.resolutions.filter((value) => value.toLowerCase() !== "4k")
      : caps.resolutions;
  const effectiveAspectRatios = caps.aspect_ratios.length > 0
    ? caps.aspect_ratios
    : caps.sizes.length > 0
      ? []
      : ["16:9", "9:16", "1:1", "4:3", "3:4"];

  useEffect(() => {
    if (!isVeo31Model) return;

    if (aspectRatio !== "16:9" && aspectRatio !== "9:16") {
      setAspectRatio("16:9");
    }

    if (isVeo31LiteModel && resolution?.toLowerCase() === "4k") {
      setResolution("720p");
    } else if (resolutionChoices.length > 0 && resolution && !resolutionChoices.includes(resolution)) {
      setResolution(resolutionChoices[0]);
    }

    if (isVeo31FixedEightSecond && duration !== 8) {
      setDuration(8);
    } else if (!isVeo31FixedEightSecond && duration == null && caps.durations.includes(8)) {
      setDuration(8);
    }

    if (sound) setSound(false);
  }, [
    aspectRatio,
    caps.durations,
    duration,
    isVeo31FixedEightSecond,
    isVeo31LiteModel,
    isVeo31Model,
    resolution,
    resolutionChoices,
    sound,
  ]);

  // -- Model selection ---------------------------------------------------------

  const selectModel = useCallback((m: WaveSpeedVideoModel) => {
    setSelectedModel(m);
    setModelOpen(false);
    const c = m.capabilities;
    setDuration(c.durations[0] ?? null);
    setAspectRatio(c.aspect_ratios[0] ?? (c.sizes.length > 0 ? null : "16:9"));
    setSize(c.sizes[0] ?? null);
    setResolution(c.resolutions[0] ?? null);
    setStartFrame(null);
    setLinkedStartFrameUrl(null);
    setEndFrame(null);
    setMotionVideo(null);
    setReferenceImages([]);
    setShotType("intelligent");
    setMultiPrompts([""]);
    setElementList([""]);
    setKlingEls([]);
    setKling30MultiEnabled(false);
    setKling30MultiMode("auto");
    setKling30CustomShots([{ prompt: "", duration: 5 }]);
    setCfgScale(0.5);
    setSound(false);
    setSceneControl(false);
    setOrientation("video");
    setOmniTab("elements");

    // Clear any stale error from a previous model
    setGenerationError(null);
  }, []);

  useEffect(() => {
    if (activeTool === "lipsync") {
      if (!LIPSYNC_MODELS.some((m) => m.id === selectedModel.id)) {
        setSelectedModel(LIPSYNC_MODEL);
      }
      // Reset configurations to prevent state leakage from other tools
      setStartFrame(null);
      setLinkedStartFrameUrl(null);
      setEndFrame(null);
      setMotionVideo(null);
      setReferenceImages([]);
      setShotType("intelligent");
      setMultiPrompts([""]);
      setElementList([""]);
      setKlingEls([]);
      setKling30MultiEnabled(false);
      setKling30MultiMode("auto");
      setKling30CustomShots([{ prompt: "", duration: 5 }]);
      setCfgScale(0.5);
      setSound(false);
      setSceneControl(false);
      setOrientation("video");
      return;
    }
    const toolModelId = TOOL_DEFAULT_MODEL_ID[activeTool];
    if (!toolModelId) return;
    const targetModel = allModels.find((m) => m.id === toolModelId);
    if (!targetModel) return;
    selectModel(targetModel);

    if (activeTool === "kling-motion") {
      setSceneControl(true);
      setOrientation("video");
    }
  }, [activeTool, allModels, selectModel]);

  useEffect(() => {
    if (!isSoraModel) return;
    if (duration == null || ![4, 8, 12].includes(duration)) {
      setDuration(4);
    }
    if (resolution != null) {
      setResolution(null);
    }
  }, [isSoraModel, duration, resolution]);

  // -- Polling -----------------------------------------------------------------
  // Cleanup all active intervals on unmount
  useEffect(() => {
    return () => { pollRefs.current.forEach(id => clearInterval(id)); };
  }, []);

  // -- Media picker -----------------------------------------------------------

  const loadPickerAssets = useCallback(async (type: "image" | "video") => {
    setPickerLoading(true);
    try {
      const res  = await fetch(`/api/assets?type=${type}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.assets)) {
        setPickerGallery(data.assets);
      } else {
        setPickerGallery([]);
      }
    } catch {
      setPickerGallery([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const openMediaPicker = useCallback(async (target: PickerTarget) => {
    setMediaPicker(target);
    setPickerGallery([]);
    if (target === "motionVideo") {
      setPickerTab("videos");
      await loadPickerAssets("video");
    } else if (target === "referenceImages") {
      // For Seedance 2: default to images gallery; user can switch to videos
      setPickerTab("images");
      await loadPickerAssets("image");
    } else {
      setPickerTab("images");
      await loadPickerAssets("image");
    }
  }, [loadPickerAssets]);

  const pickGalleryAsset = useCallback(async (url: string, target: PickerTarget) => {
    setMediaPicker(null);
    try {
      const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v|flv|3gp)(?:\?|$)/i.test(url.toLowerCase());
      
      let fetchUrl = url;
      if (isVideo) {
        // Resolve fallbacks for video to get a same-origin proxy or direct CORS-enabled URL
        const fallbacks = getFallbackUrls(url);
        const proxyUrl = fallbacks.find((u) => u.startsWith("/api/media/"));
        fetchUrl = proxyUrl || fallbacks[0] || url;
      } else {
        // For images, route through proxy-image to avoid CORS
        fetchUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Fetch returned ${res.status}`);
      const blob = await res.blob();
      const ext  = (url.split(".").pop()?.split("?")[0] ?? "jpg").toLowerCase();
      const mime = blob.type || (ext === "mp4" ? "video/mp4" : "image/jpeg");
      const file = new File([blob], `gallery-pick.${ext}`, { type: mime });
      if (target === "startFrame")       setStartFrame(file);
      else if (target === "endFrame")    setEndFrame(file);
      else if (target === "motionVideo") setMotionVideo(file);
      else if (target === "referenceImages") {
        setReferenceImages((prev) => mergeReferenceFiles(prev, [file], selectedModel));
      }
    } catch (err) {
      console.error("[pickGalleryAsset] Failed to load gallery asset:", err);
      // Fallback: show a user-visible toast or error here if needed
    }
  }, [selectedModel]);

  const pickDeviceFiles = useCallback(async (target: PickerTarget): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const anyWindow = window as any;
    if (typeof anyWindow.showOpenFilePicker !== "function") return false;
    if (!window.isSecureContext) return false;

    const multiple = target === "referenceImages";

    const types =
      target === "motionVideo"
        ? [
            {
              description: "Video",
              accept: { "video/*": [".mp4", ".mov", ".webm", ".mkv", ".avi"] },
            },
          ]
        : target === "referenceImages" && isSeedanceV2VideoModel(selectedModel)
          ? [
              {
                description: "Images",
                accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"] },
              },
              {
                description: "Videos",
                accept: { "video/*": [".mp4", ".mov", ".webm", ".mkv", ".avi"] },
              },
              {
                description: "Audio",
                accept: { "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"] },
              },
            ]
          : [
              {
                description: "Images",
                accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"] },
              },
            ];

    try {
      const handles = (await anyWindow.showOpenFilePicker({
        multiple,
        types,
        startIn: "downloads",
      })) as Array<{ getFile: () => Promise<File> }>;

      const files = await Promise.all(handles.map((h) => h.getFile()));
      if (files.length === 0) return true;

      if (target === "startFrame") setStartFrame(files[0] ?? null);
      else if (target === "endFrame") setEndFrame(files[0] ?? null);
      else if (target === "motionVideo") setMotionVideo(files[0] ?? null);
      else if (target === "referenceImages") {
        setReferenceImages((prev) => mergeReferenceFiles(prev, files, selectedModel));
      }

      return true;
    } catch (e: any) {
      if (e?.name === "AbortError") return true;
      return false;
    }
  }, [selectedModel]);

  // -- Generate -----------------------------------------------------------------

  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const { addAsset } = useAssetStore();

  const startPolling = useCallback((taskId: string, ctx: { model: WaveSpeedVideoModel; promptText: string; ratio: string; duration: number | null }) => {
    if (pollRefs.current.has(taskId) || completedTaskRefs.current.has(taskId)) {
      return;
    }

    const removePending = () => {
      setPendingTasks(prev => { const n = new Map(prev); n.delete(taskId); return n; });
      if (pollRefs.current.has(taskId)) { clearInterval(pollRefs.current.get(taskId)!); pollRefs.current.delete(taskId); }
      // Remove from persisted list as well
      try {
        const raw = localStorage.getItem("ff_video_pending_jobs");
        if (raw) {
          const arr = JSON.parse(raw) as any[];
          const next = (Array.isArray(arr) ? arr : []).filter((j) => j && j.taskId !== taskId);
          if (next.length) localStorage.setItem("ff_video_pending_jobs", JSON.stringify(next));
          else localStorage.removeItem("ff_video_pending_jobs");
        }
      } catch {}
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
        let data: { taskId: string; status: "created" | "processing" | "completed" | "failed"; outputs: string[]; error: string | null; } | null = null;
        const cloned = res.clone();
        try { data = await res.json(); } catch {
          if (!res.ok) { const text = await cloned.text().catch(() => ""); setGenerationError(text || `Server error (${res.status})`); removePending(); }
          return;
        }
        if (!res.ok || !data) { setGenerationError(data?.error ?? "Generation check failed"); removePending(); return; }
        if (data.status === "completed" && data.outputs.length > 0) {
          if (completedTaskRefs.current.has(taskId)) {
            removePending();
            return;
          }
          completedTaskRefs.current.add(taskId);

          const videoUrl = data.outputs[0];
          const durableBaseUrl = process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
          const isDurableUrl =
            !!videoUrl &&
            ((durableBaseUrl && videoUrl.startsWith(durableBaseUrl)) ||
              videoUrl.includes("supabase.co/storage/v1/object/public"));
          const newItem: MediaItem = {
            id: "gen-" + taskId, type: "video", src: videoUrl,
            model: ctx.model.name, modelColor: ctx.model.family_color,
            ratio: ctx.ratio, duration: ctx.duration != null ? `${ctx.duration}s` : "auto",
            prompt: ctx.promptText,
            providerRequestId: taskId,
            gradient: FAMILY_GRADIENTS[ctx.model.family] ?? "from-slate-900 via-slate-800 to-slate-900",
            createdAt: new Date(),
          };
          const alreadyKnownUrl = resultUrlsRef.current.has(videoUrl);
          setResults(prev => {
            const alreadyShown = prev.some((item) => item.id === newItem.id || item.src === videoUrl);
            if (alreadyShown) return prev;
            resultUrlsRef.current.add(videoUrl);
            return [newItem, ...prev];
          });
          if (!alreadyKnownUrl) {
            addAsset({ type: "video", url: videoUrl, prompt: ctx.promptText, model: ctx.model.name, duration: ctx.duration != null ? `${ctx.duration}s` : undefined, providerRequestId: taskId });
          }
          if (videoUrl && !isDurableUrl) {
            void fetch("/api/assets/persist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaUrl: videoUrl, assetType: "video" }),
            })
              .then((persistRes) => persistRes.ok ? persistRes.json() : null)
              .then((persistJson) => {
                const durableUrl = typeof persistJson?.url === "string" ? persistJson.url : "";
                if (!durableUrl) return;
                setResults((prev) =>
                  prev.map((item) =>
                    item.id === newItem.id || item.providerRequestId === taskId
                      ? { ...item, src: durableUrl }
                      : item
                  )
                );
              })
              .catch(() => {});
          }
          removePending();
          setGenerationError(null);
        } else if (data.status === "failed") {
          setGenerationError(normalizeGenerationError(data.error)); removePending();
        }
      } catch { setGenerationError("Failed to check generation status"); removePending(); }
    };

    poll();
    const intervalId = setInterval(poll, 4000);
    pollRefs.current.set(taskId, intervalId);
  }, [addAsset]);

  // Resume any in-flight video generations that were interrupted by a page refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ff_video_pending_jobs");
      if (!raw) return;
      const arr = JSON.parse(raw) as any[];
      if (!Array.isArray(arr) || arr.length === 0) { localStorage.removeItem("ff_video_pending_jobs"); return; }
      const NOW = Date.now();
      const fresh = arr.filter((j) => j && j.taskId && (NOW - (j.startedAt || 0)) < 30 * 60 * 1000);
      if (fresh.length === 0) { localStorage.removeItem("ff_video_pending_jobs"); return; }
      // Restore pending markers + restart polling
      setPendingTasks((prev) => {
        const next = new Map(prev);
        for (const j of fresh) {
          const model = allModels.find((m) => m.api_route === j.modelRoute) ?? allModels[0];
          if (!model) continue;
          next.set(j.taskId, { model, promptText: j.promptText || "", ratio: j.ratio || "16:9", duration: j.duration ?? null });
        }
        return next;
      });
      for (const j of fresh) {
        const model = allModels.find((m) => m.api_route === j.modelRoute);
        if (!model) continue;
        startPolling(j.taskId, { model, promptText: j.promptText || "", ratio: j.ratio || "16:9", duration: j.duration ?? null });
      }
      // Persist trimmed list (in case some were stale)
      if (fresh.length !== arr.length) {
        try { localStorage.setItem("ff_video_pending_jobs", JSON.stringify(fresh)); } catch {}
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelectedSeedance2Route =
    selectedModel.api_route === "bytedance/dreamina-v3.0/text-to-video-720p" ||
    selectedModel.api_route === "bytedance/seedance-v2/text-to-video" ||
    selectedModel.api_route === "bytedance/seedance-v2/text-to-video-fast" ||
    selectedModel.api_route.startsWith("bytedance/seedance-2.0");

  const estimatedCredits = (() => {
    if (activeTool === "lipsync") {
      return 17;
    }
    const isMotionControl = selectedModel.api_route === "kwaivgi/kling-v3.0-pro/motion-control";
    const pricingDuration = isMotionControl
      ? (motionVideoDuration ? Math.round(motionVideoDuration) : 5)
      : (isVeo31FixedEightSecond ? 8 : (duration ?? (isVeo31Model ? 8 : 5)));
    // NOTE: capturedDuration below also defaults to 8 if duration is null.
    const base = getGenerationCostSync(
      selectedModel.api_route,
      pricingDuration,
      1,
      resolution ?? undefined,
    );
    return base;
  })();

  const handleGenerate = useCallback(async () => {
    const hasMain = prompt.trim().length > 0;
    const hasMulti = multiPrompts.some((s) => s.trim().length > 0);
    const multiOn = caps.has_multi_prompt && (multiPrompts.length > 1 || multiPrompts[0] !== "");

    // Kling 3.0 detected early — its own validation runs inside the block below
    const isKling30VideoEarly =
      selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
    const isKling30StdImageEarly =
      selectedModel.api_route === "kwaivgi/kling-v3.0-std/image-to-video" ||
      selectedModel.api_route === "kwaivgi/kling-v3.0-pro/image-to-video";
    // Skip the generic prompt guard for Kling 3.0 and Lipsync
    if (activeTool !== "lipsync" && !isKling30VideoEarly && !isKling30StdImageEarly && !caps.requires_video && !hasMain && !(multiOn && hasMulti)) return;
    const gate = await guardGeneration({ requiredCredits: estimatedCredits, action: `video:${selectedModel.api_route}` });
    if (!gate.ok) {
      if (gate.reason === "error") setGenerationError(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }

    // Validate video durations on client-side before starting submission
    if (motionVideo) {
      try {
        await validateVideoDuration(motionVideo, 3, 30);
      } catch (err) {
        setGenerationError(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    const refVids = referenceImages.filter((f) => f.type.startsWith("video/"));
    for (const vid of refVids) {
      try {
        await validateVideoDuration(vid, 3, 30);
      } catch (err) {
        setGenerationError(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    setIsSubmitting(true);
    setGenerationError(null);

    try {
      if (activeTool === "lipsync") {
        if (!startFrame && !linkedStartFrameUrl) {
          setGenerationError("Please upload an avatar image.");
          setIsSubmitting(false);
          return;
        }
        if (!lipsyncAudioFile) {
          setGenerationError("Please upload an audio file.");
          setIsSubmitting(false);
          return;
        }

        // 1. Upload Avatar Image to get public URL
        let imgUrl = "";
        if (startFrame) {
          const imgBase64 = await fileToDataURL(startFrame);
          const imgRes = await fetch("/api/upload/frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: startFrame.name,
              mimeType: startFrame.type || "image/png",
              base64: imgBase64,
            }),
          });
          const imgData = await imgRes.json().catch(() => ({}));
          if (!imgRes.ok || !imgData.url) {
            throw new Error(imgData.error || "Failed to upload avatar image.");
          }
          imgUrl = imgData.url;
        } else if (linkedStartFrameUrl) {
          imgUrl = linkedStartFrameUrl;
        }

        // 2. Upload Audio File to get public URL
        const audioBase64 = await fileToDataURL(lipsyncAudioFile);
        const audioRes = await fetch("/api/upload/frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: lipsyncAudioFile.name,
            mimeType: lipsyncAudioFile.type || "audio/mpeg",
            base64: audioBase64,
          }),
        });
        const audioData = await audioRes.json().catch(() => ({}));
        if (!audioRes.ok || !audioData.url) {
          throw new Error(audioData.error || "Failed to upload audio file.");
        }
        const audioUrl = audioData.url;

        // 3. Submit lipsync task to /api/generate/audio
        const lipsyncRes = await fetch("/api/generate/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "lip-sync",
            model: selectedModel.api_route || "kling/ai-avatar-pro",
            imageUrl: imgUrl,
            audioUrl: audioUrl,
            prompt: prompt.trim() || "Natural lip sync performance",
          }),
        });

        const lipsyncJson = await lipsyncRes.json().catch(() => ({}));
        if (!lipsyncRes.ok || !lipsyncJson.videoUrl) {
          throw new Error(lipsyncJson.error || "Generation failed on server.");
        }

        let finalVideoUrl = lipsyncJson.videoUrl;

        // 4. Persist to DB / durable storage
        const durableBaseUrl = process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
        const isDurableUrl =
          !!finalVideoUrl &&
          ((durableBaseUrl && finalVideoUrl.startsWith(durableBaseUrl)) ||
            finalVideoUrl.includes("supabase.co/storage/v1/object/public"));
        
        if (finalVideoUrl && !isDurableUrl) {
          try {
            const persistRes = await fetch("/api/assets/persist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaUrl: finalVideoUrl, assetType: "video" }),
            });
            if (persistRes.ok) {
              const persistJson = await persistRes.json();
              if (persistJson?.url) finalVideoUrl = persistJson.url;
            }
          } catch (e) {
            console.error("Persist failed", e);
          }
        }

        const newResult: MediaItem = {
          id: "gen-" + (lipsyncJson.generationId || crypto.randomUUID()),
          type: "video",
          src: finalVideoUrl,
          model: selectedModel.name,
          modelColor: selectedModel.family_color,
          ratio: "9:16",
          duration: "auto",
          prompt: prompt.trim() || "Natural lip sync performance",
          gradient: FAMILY_GRADIENTS[selectedModel.family] ?? "from-cyan-900 via-cyan-800 to-slate-900",
          createdAt: new Date(),
        };

        setResults(prev => {
          const alreadyShown = prev.some((item) => item.id === newResult.id || item.src === finalVideoUrl);
          if (alreadyShown) return prev;
          return [newResult, ...prev];
        });

        addAsset({
          type: "video",
          url: finalVideoUrl,
          prompt: prompt.trim() || "Natural lip sync performance",
          model: selectedModel.name,
        });

        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {};
      const toolPrefix = TOOL_PROMPT_PREFIX[activeTool] ?? "";

      const filledMultiPrompts = multiPrompts.filter((s) => s.trim());
      const basePrompt = hasMain
        ? prompt.trim()
        : filledMultiPrompts.map((s) => s.trim()).join(" | ");
      const selectedCharacterTag = selectedCharacter ? normalizeCharacterTag(selectedCharacter.name) : "";
      const pkg = selectedCharacter?.metadata?.characterPackage;
      const characterPrompt = selectedCharacter && characterSupport.mode !== "kling_element"
        ? [
            `Use the selected Character Package: ${selectedCharacter.name}.`,
            pkg?.mainIdentity ? `Main Identity: ${pkg.mainIdentity}` : selectedCharacter.description,
            pkg?.faceMemory ? `Face Memory: ${pkg.faceMemory}` : "Preserve the same face, identity, proportions, and recognizable features.",
            pkg?.bodyProfile ? `Body Profile: ${pkg.bodyProfile}` : "",
            pkg?.outfitMemory ? `Outfit Memory: ${pkg.outfitMemory}` : "",
            pkg?.styleDna ? `Style DNA: ${pkg.styleDna}` : "",
            pkg?.motionReferences ? `Motion Rules: ${pkg.motionReferences}` : "",
            pkg?.states?.motion ? `Active State: ${pkg.states.motion}` : "",
            pkg?.consistencyProfile ? `Consistency Profile: ${pkg.consistencyProfile}` : "",
          ].filter(Boolean).join("\n")
        : "";
      const klingCharacterPrompt = selectedCharacter && characterSupport.mode === "kling_element" && selectedCharacterTag
        ? (basePrompt.includes(`@${selectedCharacterTag}`) ? basePrompt : `@${selectedCharacterTag} ${basePrompt}`.trim())
        : basePrompt;
      const promptedText = characterPrompt ? `${characterPrompt}\n\n${basePrompt}` : klingCharacterPrompt;
      // Inject Style/Effect/Camera/Sketch/Location/Element systemPromptAddon into the prompt
      // so the model actually applies the selected preset (thumbnails are just index cards).
      const promptedWithPresets = withPresetsAppended(promptedText, {
        selectedStyleId: selectedStyle,
        selectedEffectId,
        selectedCameraId,
        selectedSketchId,
        selectedLocationId,
        selectedElementId,
        selectedPalette,
      });
      payload.prompt = toolPrefix ? `${toolPrefix} ${promptedWithPresets}` : promptedWithPresets;

      const isSeedanceV2 = selectedModel.id.startsWith("bytedance-seedance-v2");
      const isKling30Video =
        selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
      const isKlingElementModel = selectedModel.family === "kling" && caps.has_element_list;
      const isKling30StdImage =
        selectedModel.api_route === "kwaivgi/kling-v3.0-std/image-to-video" ||
        selectedModel.api_route === "kwaivgi/kling-v3.0-pro/image-to-video";

      const characterReferenceUrls = supportsCharacterReference
        ? (selectedCharacter?.referenceUrls ?? []).filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
        : [];

      // Image inputs — saved characters + uploaded reference media take priority
      if (selectedCharacter && characterSupport.mode === "kling_element" && characterReferenceUrls.length < characterSupport.minImages) {
        setGenerationError(`${selectedCharacter.name} needs at least ${characterSupport.minImages} reference images for Kling 3.0 Elements.`);
        setIsSubmitting(false);
        return;
      }

      if (isSeedanceV2) {
        const refImgs = referenceImages.filter((f) => f.type.startsWith("image/"));
        const refVids = referenceImages.filter((f) => f.type.startsWith("video/"));
        const refAuds = referenceImages.filter((f) => f.type.startsWith("audio/"));
        const hasStartImage =
          !!startFrame ||
          (characterSupport.mode === "image_reference" &&
            !!selectedCharacter?.referenceUrls?.[0]);
        const hasEndImage = !!endFrame;
        const imageCount =
          refImgs.length +
          characterReferenceUrls.length +
          (hasStartImage ? 1 : 0) +
          (hasEndImage ? 1 : 0);
        const videoCount =
          refVids.length + (caps.requires_video && !!motionVideo ? 1 : 0);
        const audioCount = refAuds.length;

        if (audioCount > 0 && imageCount === 0 && videoCount === 0) {
          setGenerationError(
            "موديل Seedance 2.0 لا يدعم إدخال 'نص + صوت' أو 'صوت فقط'. يجب إرفاق صورة مرجعية واحدة أو فيديو واحد على الأقل مع الصوت."
          );
          setIsSubmitting(false);
          return;
        }
      }

      if (characterSupport.mode === "provider_character_id" && selectedCharacter?.providerCharacterId) {
        payload.character_id_list = [selectedCharacter.providerCharacterId];
      }

      if (isKling30StdImage) {
        const uploadedImageRefs = await Promise.all(
          referenceImages.filter((f) => f.type.startsWith("image/")).slice(0, 2).map((f) => fileToDataURL(f))
        );
        if (startFrame) {
          payload.image = await fileToDataURL(startFrame);
        } else if (linkedStartFrameUrl) {
          payload.image = linkedStartFrameUrl;
        } else if (characterSupport.mode === "image_reference" && selectedCharacter?.referenceUrls?.[0]) {
          payload.image = selectedCharacter.referenceUrls[0];
        } else if (uploadedImageRefs[0]) {
          payload.image = uploadedImageRefs[0];
        }
        if (endFrame) {
          payload.end_image = await fileToDataURL(endFrame);
        } else if (uploadedImageRefs[1]) {
          payload.end_image = uploadedImageRefs[1];
        }
      } else if (referenceImages.length > 0 || (characterSupport.mode === "image_reference" && characterReferenceUrls.length > 0)) {
        if (isSeedanceV2) {
          // Split unified referenceImages by type → 3 separate KIE fields
          const refImgs  = referenceImages.filter(f => f.type.startsWith("image/"));
          const refVids  = referenceImages.filter(f => f.type.startsWith("video/"));
          const refAuds  = referenceImages.filter(f => f.type.startsWith("audio/"));
          const seedanceImageLimit = Math.max(1, Math.min(2, caps.max_reference_images || 2));
          const explicitStartImage = startFrame
            ? await fileToDataURL(startFrame)
            : linkedStartFrameUrl
              ? linkedStartFrameUrl
              : null;
          const uploadedImageRefs = await Promise.all(refImgs.slice(0, seedanceImageLimit).map(f => fileToDataURL(f)));
          const mergedImageRefs = [
            ...(explicitStartImage ? [explicitStartImage] : []),
            ...characterReferenceUrls,
            ...uploadedImageRefs,
          ].slice(0, seedanceImageLimit);
          if (mergedImageRefs[0]) {
            payload.image = mergedImageRefs[0];
            payload.first_frame_url = mergedImageRefs[0];
            payload.reference_image_urls = mergedImageRefs;
          }
          if (mergedImageRefs[1]) {
            payload.last_image = mergedImageRefs[1];
            payload.last_frame_url = mergedImageRefs[1];
          }
          if (refVids.length > 0)
            payload.reference_video_urls = await Promise.all(refVids.slice(0, 3).map(f => fileToDataURL(f)));
          if (refAuds.length > 0)
            payload.reference_audio_urls = await Promise.all(refAuds.slice(0, 3).map(f => fileToDataURL(f)));
          // Also allow end frame alongside Seedance references
          if (caps.has_end_frame && endFrame) {
            const explicitEndImage = await fileToDataURL(endFrame);
            payload.last_image = explicitEndImage;
            payload.last_frame_url = explicitEndImage;
          }
        } else {
          const uploadedRefs = await Promise.all(referenceImages.map((f) => fileToDataURL(f)));
          payload.reference_image_urls = [...characterReferenceUrls, ...uploadedRefs].slice(0, Math.max(1, caps.max_reference_images || 1));
        }
      } else if ((caps.requires_image || caps.optional_image) && startFrame) {
        payload[isSeedanceV2 ? "first_frame_url" : "image"] = await fileToDataURL(startFrame);
      } else if ((caps.requires_image || caps.optional_image) && characterSupport.mode === "image_reference" && selectedCharacter?.referenceUrls?.[0]) {
        payload[isSeedanceV2 ? "first_frame_url" : "image"] = selectedCharacter.referenceUrls[0];
      }
      if ((caps.requires_video || caps.optional_video) && motionVideo) {
        payload.video = await fileToDataURL(motionVideo);
      }
      if (caps.has_end_frame && endFrame && referenceImages.length === 0) {
        const endKey = isSeedanceV2
          ? "last_frame_url"
          : selectedModel.api_route.startsWith("wavespeed-ai/wan")
            ? "last_image"
            : "end_image";
        payload[endKey] = await fileToDataURL(endFrame);
      }

      if (isVeo31Model) {
        const refs = Array.isArray(payload.reference_image_urls)
          ? payload.reference_image_urls.filter((value): value is string => typeof value === "string")
          : [];
        const hasStartImage = typeof payload.image === "string" || typeof payload.first_frame_url === "string";
        const hasEndImage = typeof payload.end_image === "string" || typeof payload.last_frame_url === "string" || typeof payload.last_image === "string";
        payload.enable_translation = true;
        payload.generation_type = refs.length > 0 && isVeo31FastModel
          ? "REFERENCE_2_VIDEO"
          : refs.length > 0 || hasStartImage || hasEndImage
            ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
            : "TEXT_2_VIDEO";
      }

      // Size / Aspect ratio
      if (caps.sizes.length > 0 && size) {
        payload.size = size;
      }
      if (caps.aspect_ratios.length > 0 && aspectRatio) {
        payload.aspect_ratio = aspectRatio;
      }

      // Duration
      if (durationChoices.length > 0 && duration != null) {
        payload.duration = isVeo31FixedEightSecond ? 8 : duration;
      }
      const isMotionControl = selectedModel.api_route === "kwaivgi/kling-v3.0-pro/motion-control";
      if (isMotionControl) {
        payload.duration = motionVideoDuration ? Math.round(motionVideoDuration) : 5;
      }

      // Quality / Resolution
      if (resolutionChoices.length > 0 && resolution) {
        payload[caps.quality_param] = resolution;
      }

      // Prompt controls
      if (caps.has_negative_prompt && negPrompt.trim()) {
        payload.negative_prompt = negPrompt.trim();
      }
      if (caps.has_cfg_scale) {
        payload.cfg_scale = cfgScale;
      }
      if (caps.has_sound) {
        payload[caps.sound_param] = sound;
      }
      if (caps.has_shot_type) {
        payload.shot_type = shotType;
      }
      if (caps.has_multi_prompt) {
        const filled = multiPrompts
          .map((text, index) => ({ text: text.trim(), index }))
          .filter((item) => item.text.length > 0);
        if (filled.length > 0 && (multiOn || !caps.has_omni_tabs)) {
          if (duration != null && filled.length > duration) {
            setGenerationError(`For ${duration}s duration, maximum shots is ${duration}.`);
            setIsSubmitting(false);
            return;
          }
          const splitDurations = duration != null ? splitShotDurations(duration, filled.length) : [];
          if (duration != null && splitDurations.length !== filled.length) {
            setGenerationError("Invalid multi-shot split. Reduce shot count or increase duration.");
            setIsSubmitting(false);
            return;
          }
          // Validate each shot prompt length (API limit: 500 chars per shot)
          for (const item of filled) {
            if (item.text.length > 500) {
              setGenerationError(`Shot ${item.index + 1} prompt is too long (${item.text.length}/500 chars). Please shorten it.`);
              setIsSubmitting(false);
              return;
            }
          }
          payload.multi_prompt = filled.map((item, idx) => ({
            prompt: item.text,   // shot prompts are pure scene descriptions — no toolPrefix
            ...(duration != null ? { duration: splitDurations[idx] } : {}),
          }));
        }
      }
      if (caps.has_element_list) {
        // Reference images are passed as image_urls — element_list is for text IDs only
        const filled = elementList.filter(s => s.trim());
        if (filled.length > 0) {
          payload.element_list = filled.map(id => ({ id: id.trim() }));
        }
      }
      if (caps.has_scene_control) {
        payload.scene_control_mode = sceneControl;
      }
      if (caps.has_orientation) {
        payload.orientation = orientation;
      }

      if (isKlingElementModel) {
        // ── Kling 3.0 — fully spec-compliant payload builder ─────────────────
        const resolvedDuration = duration ?? 9;

        // Validate duration
        if (resolvedDuration < 3 || resolvedDuration > 15) {
          setGenerationError("Kling 3.0 duration must be between 3 and 15 seconds.");
          setIsSubmitting(false);
          return;
        }

        // Validate elements: each element needs 2+ images
        const invalidEl = klingEls.find(el => el.name.trim() && el.files.length < 2);
        if (invalidEl) {
          setGenerationError(`Element "${invalidEl.name}" needs at least 2 images.`);
          setIsSubmitting(false);
          return;
        }

        // Validate custom shots total duration
        if (kling30MultiEnabled && kling30MultiMode === "custom") {
          const activeCustom = kling30CustomShots.filter(s => s.prompt.trim());
          if (!activeCustom.length) {
            setGenerationError("Add at least one shot prompt in custom mode.");
            setIsSubmitting(false);
            return;
          }
          if (!kling30CustomDurationValid) {
            setGenerationError(
              `Shot durations must total exactly ${resolvedDuration}s (currently ${kling30CustomTotalDuration}s).`
            );
            setIsSubmitting(false);
            return;
          }
          if (activeCustom.length > 5) {
            setGenerationError("Maximum 5 shots allowed.");
            setIsSubmitting(false);
            return;
          }
        }

        // Validate single-shot prompt
        if (!kling30MultiEnabled && !hasMain) {
          setGenerationError("Kling 3.0 single-shot requires a prompt.");
          setIsSubmitting(false);
          return;
        }

        // Resolution → mode: "std" | "pro" | "4K"
        const normalizedResolution = resolution?.trim().toLowerCase();
        const modeValue =
          normalizedResolution === "4k"
            ? "4K"
            : normalizedResolution === "pro" || normalizedResolution === "1080p"
              ? "pro"
              : "std";

        // ── image_urls: read DIRECTLY from React state (authoritative source) ──
        // payload.image / payload.end_image are set by the generic block above,
        // but we re-read from state to guarantee no silent data loss.
        const imageUrls: string[] = [];
        const targetKlingRatio = aspectRatio ?? "16:9";
        const firstFrameDataUrl = startFrame
          ? await fileToAspectDataURL(startFrame, targetKlingRatio)
          : linkedStartFrameUrl
            ? await imageSourceToAspectDataURL(linkedStartFrameUrl, targetKlingRatio)
            : null;
        const lastFrameDataUrl =
          !kling30MultiEnabled && endFrame ? await fileToAspectDataURL(endFrame, targetKlingRatio) : null;
        if (firstFrameDataUrl) imageUrls.push(firstFrameDataUrl);
        if (lastFrameDataUrl) imageUrls.push(lastFrameDataUrl);
        // Log so we can verify images are included
        console.log(
          `[Kling 3.0] image_urls built: targetRatio=${targetKlingRatio}, start=${firstFrameDataUrl ? "✓ (" + firstFrameDataUrl.slice(0, 40) + "…)" : "✗ none"}, end=${lastFrameDataUrl ? "✓" : kling30MultiEnabled ? "skipped (multi-shot)" : "✗ none"}`
        );

        // ── kling_elements ───────────────────────────────────────────────────
        delete payload.element_list;
        delete payload.reference_image_urls;
        const validKlingEls = klingEls
          .slice(0, 3)
          .filter((el) => el.name.trim() && el.description.trim() && el.files.length >= 2);
        const selectedCharacterElement = selectedCharacter && characterSupport.mode === "kling_element"
          ? {
              name: selectedCharacterTag,
              description: selectedCharacter.description?.trim() || selectedCharacter.name,
              element_input_urls: characterReferenceUrls.slice(0, characterSupport.maxImages),
            }
          : null;

        // ── multi_prompt: build from auto or custom mode ─────────────────────
        let multiPromptList: Array<{ prompt: string; duration: number }> = [];
        if (kling30MultiEnabled) {
          if (kling30MultiMode === "auto") {
            const shotCount = Math.min(5, Math.max(1, Math.floor(resolvedDuration / 3)));
            const splitD = splitShotDurations(resolvedDuration, shotCount);
            const baseP = promptedText.trim() || "Continue the scene";
            multiPromptList = Array.from({ length: shotCount }, (_, i) => ({
              prompt: baseP,
              duration: splitD[i] ?? 3,
            }));
          } else {
            multiPromptList = kling30CustomShots
              .filter(s => s.prompt.trim())
              .slice(0, 5)
              .map(s => {
                const shotPrompt = s.prompt.trim();
                const withCharacter = selectedCharacterTag && characterSupport.mode === "kling_element" && !shotPrompt.includes(`@${selectedCharacterTag}`)
                  ? `@${selectedCharacterTag} ${shotPrompt}`
                  : shotPrompt;
                return { prompt: withCharacter, duration: s.duration };
              });
          }
        }

        // ── Build final payload ──────────────────────────────────────────────
        // Remove all generic keys — Kling 3.0 uses its own field names
        delete payload.image; delete payload.first_frame_url;
        delete payload.end_image; delete payload.last_frame_url;
        delete payload.multi_prompt; delete payload.element_list;

        payload.image_urls = imageUrls;
        payload.multi_shots = kling30MultiEnabled;
        payload.multi_prompt = multiPromptList;
        payload.mode = modeValue;
        payload.sound = !!sound;
        payload.duration = resolvedDuration;
        payload.aspect_ratio = targetKlingRatio;
        const rawKlingPrompt = toolPrefix ? `${toolPrefix} ${promptedText.trim()}` : promptedText.trim();
        payload.prompt = kling30MultiEnabled ? "" : compactKlingSingleShotPrompt(rawKlingPrompt);

        if (validKlingEls.length > 0 || selectedCharacterElement) {
          const manualElements = await Promise.all(
            validKlingEls.slice(0, selectedCharacterElement ? 2 : 3).map(async (el) => ({
              name: el.name.trim(),
              description: el.description.trim(),
              element_input_urls: await Promise.all(el.files.slice(0, 4).map((f) => fileToDataURL(f))),
            }))
          );
          payload.kling_elements = selectedCharacterElement
            ? [selectedCharacterElement, ...manualElements]
            : manualElements;
        } else {
          delete payload.kling_elements;
        }

        // ── PAYLOAD VERIFICATION LOG ─────────────────────────────────────────
        // Logs a compact diagnostic payload (data URLs truncated to 60 chars)
        const debugPayload = {
          modelRoute: selectedModel.api_route,
          model: "kling-3.0/video",
          target_frame_ratio: targetKlingRatio,
          prompt: payload.prompt,
          mode: payload.mode,
          duration: payload.duration,
          aspect_ratio: payload.aspect_ratio,
          multi_shots: payload.multi_shots,
          sound: payload.sound,
          image_urls: (payload.image_urls as string[]).map(
            (u, i) => `[frame_${i}] ${u.slice(0, 60)}…`
          ),
          multi_prompt: payload.multi_prompt,
          kling_elements: Array.isArray(payload.kling_elements)
            ? (payload.kling_elements as Array<{name:string;description:string;element_input_urls:string[]}>).map(el => ({
                name: el.name,
                description: el.description,
                images: el.element_input_urls.map((u,i)=>`[el_img_${i}] ${u.slice(0,60)}…`),
              }))
            : [],
        };
        console.log("[Kling 3.0] ✅ Final payload (before send):", JSON.stringify(debugPayload, null, 2));
      }

      const payloadHasImageInput = Boolean(
        (typeof payload.image === "string" && payload.image.trim()) ||
        (typeof payload.first_frame_url === "string" && payload.first_frame_url.trim()) ||
        (typeof payload.image_url === "string" && payload.image_url.trim()) ||
        (typeof payload.last_image === "string" && payload.last_image.trim()) ||
        (typeof payload.last_frame_url === "string" && payload.last_frame_url.trim()) ||
        (typeof payload.end_image === "string" && payload.end_image.trim()) ||
        (Array.isArray(payload.image_urls) && payload.image_urls.some((value) => typeof value === "string" && value.trim())) ||
        (Array.isArray(payload.reference_image_urls) && payload.reference_image_urls.some((value) => typeof value === "string" && value.trim()))
      );
      let requestModelRoute = selectedModel.api_route;
      if (requestModelRoute.includes("seedance")) {
        if (requestModelRoute.includes("mini")) {
          requestModelRoute = payloadHasImageInput
            ? "bytedance/seedance-2.0-mini/image-to-video"
            : "bytedance/seedance-2.0-mini/text-to-video";
        } else if (requestModelRoute.includes("fast") || requestModelRoute.includes("turbo")) {
          requestModelRoute = payloadHasImageInput
            ? "bytedance/seedance-2.0/image-to-video-turbo"
            : "bytedance/seedance-2.0/text-to-video-turbo";
        } else {
          requestModelRoute = payloadHasImageInput
            ? "bytedance/seedance-2.0/image-to-video"
            : "bytedance/seedance-2.0/text-to-video";
        }
      }
      if (
        requestModelRoute === "kwaivgi/kling-v3.0-pro/text-to-video" ||
        requestModelRoute === "bytedance/seedance-v2/text-to-video" ||
        requestModelRoute === "bytedance/seedance-v2/text-to-video-fast" ||
        requestModelRoute.startsWith("bytedance/seedance-2.0")
      ) {
        console.log("[video POST] modelRoute sent:", requestModelRoute);
      }

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelRoute: requestModelRoute, payload }),
      });

      let data: { taskId?: string; error?: string; publicError?: string } = {};
      const clonedRes = res.clone();
      try {
        data = await res.json();
      } catch {
        const text = await clonedRes.text().catch(() => "");
        const preview = text.slice(0, 200);
        console.error("[video POST] non-JSON response", res.status, preview);
        setGenerationError(getSafeErrorMessage(preview || `Server error (${res.status})`));
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || !data.taskId) {
        console.error("[video POST] failed", {
          status: res.status,
          modelRoute: requestModelRoute,
          response: data,
        });
        setGenerationError(getSafeErrorMessage(data.publicError ?? data.error ?? "Failed to start generation"));
        setIsSubmitting(false);
        return;
      }

      // Update local credits display in header instantly
      if (typeof window !== "undefined" && gate.currentBalance != null) {
        const newBalance = Math.max(0, gate.currentBalance - estimatedCredits);
        window.dispatchEvent(new CustomEvent("saad-credits-updated", { detail: { balance: newBalance } }));
      }

      // Show the ratio the user explicitly requested. Kling frames are normalized
      // to this ratio before submit, so the pending/result card should match it.
      const isKling30 = selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
      const _capturedRatio = isKling30
        ? (aspectRatio ?? "16:9")
        : (aspectRatio ?? (size ? sizeToRatio(size) : "16:9"));
      // Veo 3.1 accepts 4/6/8 — honor the user's choice (fallback to 8).
      const capturedDuration = isVeo31Model ? (isVeo31FixedEightSecond ? 8 : (duration ?? 8)) : duration;
      persistVideoEditContext(data.taskId, {
        modelRoute: requestModelRoute,
        modelName: selectedModel.name,
        duration: capturedDuration,
        aspectRatio: _capturedRatio,
        quality: resolution,
        referenceImageUrls: Array.isArray(payload.reference_image_urls)
          ? payload.reference_image_urls.filter((value): value is string => typeof value === "string").slice(0, 3)
          : [],
        startImageUrl: typeof payload.image === "string"
          ? payload.image
          : typeof payload.first_frame_url === "string"
            ? payload.first_frame_url
            : undefined,
        endImageUrl: typeof payload.end_image === "string"
          ? payload.end_image
          : typeof payload.last_frame_url === "string"
            ? payload.last_frame_url
            : typeof payload.last_image === "string"
              ? payload.last_image
              : undefined,
      });
      setPendingTasks(prev => new Map(prev).set(data.taskId!, { model: selectedModel, promptText: basePrompt, ratio: _capturedRatio, duration: capturedDuration }));
      // Persist task so it survives a page refresh
      try {
        const raw = localStorage.getItem("ff_video_pending_jobs");
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        const list = Array.isArray(arr) ? arr : [];
        list.push({ taskId: data.taskId, modelRoute: selectedModel.api_route, promptText: basePrompt, ratio: _capturedRatio, duration: capturedDuration, startedAt: Date.now() });
        localStorage.setItem("ff_video_pending_jobs", JSON.stringify(list));
      } catch {}
      setIsSubmitting(false);
      startPolling(data.taskId, { model: selectedModel, promptText: basePrompt, ratio: _capturedRatio, duration: capturedDuration });
    } catch (err) {
      setGenerationError(getSafeErrorMessage(err));
      setIsSubmitting(false);
    }
  }, [
    activeTool, prompt, selectedModel, selectedCharacter, caps, supportsCharacterReference, characterSupport, isVeo31Model, isVeo31FastModel, isVeo31FixedEightSecond,
    startFrame, linkedStartFrameUrl, endFrame, motionVideo, referenceImages, size, aspectRatio, startFrameRatio, duration, resolution,
    negPrompt, cfgScale, sound, shotType, multiPrompts, elementList,
    sceneControl, orientation, startPolling,
    klingEls, kling30MultiEnabled, kling30MultiMode, kling30CustomShots,
    estimatedCredits, getSafeErrorMessage, guardGeneration,
  ]);

  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const bStyle = selectedModel.badge
    ? BADGE_STYLE[selectedModel.badge as keyof typeof BADGE_STYLE]
    : null;

  const isKling30Video =
    selectedModel.api_route === "kwaivgi/kling-v3.0-pro/text-to-video";
  const isKlingElementModel = selectedModel.family === "kling" && caps.has_element_list;
  const isKling30Image =
    selectedModel.api_route === "kwaivgi/kling-v3.0-std/image-to-video" ||
    selectedModel.api_route === "kwaivgi/kling-v3.0-pro/image-to-video";
  const multiShotEnabled = caps.has_multi_prompt && (multiPrompts.length > 1 || multiPrompts[0] !== "");
  const showImageInput = caps.requires_image || caps.optional_image;
  // Kling 3.0 spec: end frame is NOT supported in multi-shot mode — uses kling30MultiEnabled (not generic)
  const showEndFrame   = caps.has_end_frame && !(isKling30Video && kling30MultiEnabled);
  const showVideoInput = caps.requires_video;
  const showOmniTabs   = caps.has_omni_tabs;
  // Kling 3.0 uses image_urls for start/end frames — no separate reference images section
  const showReferenceImages = caps.max_reference_images > 0 && !isKling30Video && !isKling30Image;
  const showSimpleKlingRefs = false; // Kling 3.0 now uses start/end frame inputs directly
  const showKling30Elements = isKlingElementModel;

  // Kling 3.0 computed values
  const kling30ShotCount = Math.min(5, Math.max(1, Math.floor((duration ?? 9) / 3)));
  const kling30CustomTotalDuration = kling30CustomShots.reduce((sum, s) => sum + s.duration, 0);
  const kling30DurationTarget = duration ?? 9;
  const kling30CustomDurationValid = kling30CustomTotalDuration === kling30DurationTarget;
  const kling30CustomDurationRemaining = kling30DurationTarget - kling30CustomTotalDuration;
  const maxShotsAllowed = (() => {
    if (!caps.has_multi_prompt) return 1;
    if (
      selectedModel.api_route === "kwaivgi/kling-v3-turbo-std/image-to-video" ||
      selectedModel.api_route === "kwaivgi/kling-v3-turbo-pro/image-to-video"
    ) {
      if (duration == null) return 6;
      return Math.max(1, Math.min(6, duration));
    }
    const hardMax = 5;
    if (duration == null) return hardMax;
    return Math.max(1, Math.min(hardMax, Math.floor(duration / 3)));
  })();
  const canAddMoreShots = multiPrompts.length < maxShotsAllowed;
  const hasMainPrompt = prompt.trim().length > 0;
  const hasMultiPrompt = multiPrompts.some((s) => s.trim().length > 0);
  const isSeedanceV2Model = selectedModel.id.startsWith("bytedance-seedance-v2");
  const referenceFileSummary = getReferenceFileSummary(referenceImages, selectedModel);
  const referenceFileMaxLabel = getReferenceFileMaxLabel(selectedModel);
  const hasRequiredImageInput =
    !caps.requires_image || !!startFrame || !!linkedStartFrameUrl || referenceImages.length > 0 || Boolean(selectedCharacter?.referenceUrls?.length);
  const hasRequiredVideoInput = !caps.requires_video || !!motionVideo;
  const canGenerate = activeTool === "lipsync"
    ? Boolean((startFrame || linkedStartFrameUrl) && lipsyncAudioFile)
    : isKling30Video
    ? (
        (kling30MultiEnabled
          ? (kling30MultiMode === "auto"
              ? true // auto builds prompts automatically
              : kling30CustomShots.some(s => s.prompt.trim()) && kling30CustomDurationValid)
          : (hasMainPrompt || caps.requires_video)) &&
        hasRequiredImageInput &&
        hasRequiredVideoInput
      )
    : (
        (hasMainPrompt || (multiShotEnabled && hasMultiPrompt) || caps.requires_video || !!motionVideo) &&
        hasRequiredImageInput &&
        hasRequiredVideoInput
      );
  const activeMultiPromptIndexes = multiPrompts
    .map((value, index) => ({ value: value.trim(), index }))
    .filter((item) => item.value.length > 0);
  const shotDurationsByIndex = (() => {
    const out: Record<number, number> = {};
    if (duration == null || activeMultiPromptIndexes.length === 0) return out;
    const count = activeMultiPromptIndexes.length;
    const split = splitShotDurations(duration, count);
    activeMultiPromptIndexes.forEach((item, idx) => {
      out[item.index] = split[idx] ?? 0;
    });
    return out;
  })();

  useEffect(() => {
    if (!supportsCharacterReference && selectedCharacterId) {
      setSelectedCharacterId("");
      return;
    }
    if (selectedCharacterId && !selectableCharacters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId("");
    }
  }, [selectableCharacters, selectedCharacterId, supportsCharacterReference]);

  useEffect(() => {
    if (!caps.has_multi_prompt) return;
    setMultiPrompts((prev) => {
      if (prev.length <= maxShotsAllowed) return prev;
      return prev.slice(0, maxShotsAllowed);
    });
  }, [caps.has_multi_prompt, maxShotsAllowed]);

  // -- Render -------------------------------------------------------------------

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - 56px)", background: "#03060f", color: "#e2e8f0" }}
    >
      {/* -- Left Sidebar --------------------------------------------------- */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col overflow-y-auto border-r"
        style={{ width: 220, borderColor: "rgba(255,255,255,0.05)", background: "#050a14" }}
      >
        <div className="px-3 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
            {t("Video Engines")}
          </span>
        </div>
        {TOOLS.map(tool => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="group relative flex items-start gap-2.5 w-full px-3 py-2.5 text-left transition-all"
              style={{
                borderLeft: active ? "2px solid #06b6d4" : "2px solid transparent",
                background:  active ? "rgba(6,182,212,0.08)" : "transparent",
                color:       active ? "#e2e8f0" : "#64748b",
              }}
            >
              <tool.icon size={14} style={{ color: active ? "#06b6d4" : "#475569", flexShrink: 0, marginTop: 2 }} />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium leading-tight">{t(tool.label)}</span>
                <span className="mt-0.5 text-[10px] leading-snug" style={{ color: active ? "#94a3b8" : "#475569" }}>
                  {t(tool.description)}
                </span>
              </span>
              {active && (
                <motion.div
                  layoutId="active-tool-glow"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.06) 0%, transparent 100%)" }}
                />
              )}
            </button>
          );
        })}
        <StyleLibraryGatewayCard />
      </aside>

      {/* -- Center Panel --------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[60px] lg:pb-0">
        {/* Results grid */}
        <div className="flex-1 overflow-y-auto px-4">
          {results.length === 0 && pendingTasks.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 80, height: 80, borderRadius: 20,
                  background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)",
                }}
              >
                <Film size={40} style={{ color: "rgba(6,182,212,0.4)" }} />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-medium text-white">{t("Create your first video")}</p>
                <p className="mt-1 text-sm" style={{ color: "#475569" }}>
                  {t("Write a prompt and hit Generate to start creating")}
                </p>
              </div>
            </div>
          ) : (
            <MediaGrid
              items={results}
              skeletonModels={Array.from(pendingTasks.values()).map(t => ({ name: t.model.name, ratio: t.ratio }))}
              onInspect={(item) => setInspectorAsset({ id: item.id, type: item.type, url: item.src, prompt: item.prompt ?? "", model: item.model, date: item.createdAt ? item.createdAt.toISOString() : undefined, providerRequestId: item.providerRequestId })}
              onDelete={async (id) => {
                setResults(prev => prev.filter(r => r.id !== id));
                try {
                  await fetch("/api/assets", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                  });
                } catch { /* rollback not needed — next refresh will re-fetch */ }
              }}
            />
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {generationError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
              <span className="text-[12px] flex-1" style={{ color: "#fca5a5" }}>{generationError}</span>
              <button onClick={() => setGenerationError(null)}>
                <X size={12} style={{ color: "#6b7280" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified Studio Composite Prompt Card */}
        <div
          className="flex-shrink-0 mx-4 mb-4 mt-2 rounded-2xl flex flex-col gap-2 p-3 transition-all duration-200 shadow-2xl"
          style={{
            background: "rgba(10, 16, 28, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
          }}
        >
          {/* Top Section inside Card: Reference Badges */}
          {referenceImages.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center pb-2.5 border-b border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1 flex items-center gap-1">
                <Sparkles size={11} className="text-cyan-400" /> {t("Click to insert reference:")}
              </span>
              {(() => {
                let imageCount = 0;
                return referenceImages.map((file, idx) => {
                  const isImage = file.type.startsWith("image/");
                  if (!isImage) return null;
                  imageCount++;
                  const tag = `@image${imageCount}`;
                  const previewSrc = referencePreviews[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(prev => prev ? `${prev} ${tag}` : tag);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] shadow-sm"
                      style={{
                        background: "rgba(6, 182, 212, 0.12)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        color: "#22d3ee",
                      }}
                      title={lang === "ar" ? `انقر لإدراج ${tag} في الوصف` : `Click to insert ${tag} into prompt`}
                    >
                      {previewSrc && (
                        <img
                          src={previewSrc}
                          alt={`Ref ${imageCount}`}
                          className="w-5 h-5 rounded object-cover border border-cyan-500/30"
                        />
                      )}
                      <span className="font-mono text-[10px]">{tag}</span>
                    </button>
                  );
                });
              })()}
            </div>
          )}

          {/* Middle Section inside Card: Full Width Multi-Line Textarea */}
          <div className="flex-1 w-full min-h-[64px]">
            <textarea
              rows={Math.min(8, Math.max(3, prompt.split('\n').length))}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onPaste={e => {
                if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                  const pastedFiles = Array.from(e.clipboardData.files).filter(f =>
                    f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/")
                  );
                  if (pastedFiles.length > 0) {
                    e.preventDefault();
                    setReferenceImages(prev => mergeReferenceFiles(prev, pastedFiles, selectedModel));
                  }
                }
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={
                activeTool === "lipsync"
                  ? t("Lipsync prompt (optional) e.g., talk naturally, smile...")
                  : isKling30Video
                  ? t("Describe the video… use @image1 for references")
                  : t("Describe the video you want to create…")
              }
              className="w-full bg-transparent outline-none text-[13.5px] sm:text-[14px] resize-y min-h-[64px] max-h-[220px] p-1.5 leading-relaxed overflow-y-auto custom-scrollbar"
              style={{ color: "#f8fafc" }}
            />
          </div>

          {/* Bottom Section inside Card: Action Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] gap-2 flex-wrap sm:flex-nowrap">
            {/* Left Action Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400">
                {(isSubmitting || pendingTasks.size > 0)
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />
                }
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector("[data-character-ref='1']") as HTMLElement | null;
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/10"
                style={{
                  background: selectedCharacter ? "rgba(217,70,239,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedCharacter ? "rgba(217,70,239,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: selectedCharacter ? "#f5d0fe" : "#94a3b8",
                }}
                title={t("Character Reference")}
              >
                <Users size={14} />
                <span className="max-w-[140px] truncate text-[12px] font-semibold">
                  {selectedCharacter ? selectedCharacter.name : t("No character")}
                </span>
              </button>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2 ml-auto">
              {prompt && (
                <button
                  onClick={() => setPrompt("")}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={lang === "ar" ? "مسح النص" : "Clear text"}
                >
                  <X size={14} />
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={isSubmitting || !canGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all shadow-md"
                style={{
                  background: isSubmitting || !canGenerate ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.25))",
                  border: `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.06)" : "rgba(6,182,212,0.4)"}`,
                  color: isSubmitting || !canGenerate ? "#475569" : "#ffffff",
                  cursor: isSubmitting || !canGenerate ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{t("Sending…")}</span>
                  </>
                ) : (
                  <>
                    <Film size={13} className="text-cyan-400" />
                    <span>
                      {activeTool === "lipsync" ? t("Generate Lipsync") : t("Generate")}
                      {" · "}
                      <span style={{ color: isSubmitting || !canGenerate ? "#64748b" : "#fbb11f", fontWeight: 700 }}>
                        {estimatedCredits} cr
                      </span>
                    </span>
                    {pendingTasks.size > 0 && (
                      <span style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.35)", borderRadius: 10, padding: "0 5px", fontSize: 10, color: "#06b6d4", lineHeight: 1.6 }}>
                        {pendingTasks.size}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* -- Right Sidebar --------------------------------------------------- */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col border-l overflow-y-auto"
        style={{ width: 288, borderColor: "rgba(255,255,255,0.05)", background: "#050a14" }}
      >
        <div className="flex flex-col gap-5 p-4 flex-1">
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
          {activeTool === "lipsync" ? (
            <div className="flex-grow flex flex-col gap-5">
              {/* Dynamic Avatar/Lipsync Info */}
              <div
                className="rounded-xl p-3"
                style={{
                  background: hexA(selectedModel.family_color, 0.06),
                  border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: selectedModel.family_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: selectedModel.family_color }}>
                        {selectedModel.name}
                      </span>
                      {selectedModel.badge && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: hexA(selectedModel.family_color, 0.15),
                            color: selectedModel.family_color,
                          }}
                        >
                          {selectedModel.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>
                      Sync avatar lips to audio. Provide a clear face portrait image and an audio recording.
                    </p>
                  </div>
                </div>
              </div>

              {/* Avatar Image Input */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                  Avatar Image
                </label>
                <div className="mt-2">
                  {startFramePreview ? (
                    <div className="group relative rounded-xl overflow-hidden border border-white/10 aspect-[3/4] bg-black/40">
                      <img
                        src={startFramePreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setStartFrame(null);
                          setLinkedStartFrameUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-slate-300 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openMediaPicker("startFrame")}
                      className="w-full aspect-[3/4] rounded-xl border border-dashed hover:border-cyan-500/50 bg-black/40 hover:bg-cyan-950/10 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-500 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      <ImageIcon size={24} />
                      <span className="text-xs font-semibold">Upload Avatar</span>
                      <span className="text-[10px] text-slate-600">Portrait recommended</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Audio File Input */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                  Voice / Audio
                </label>
                <div className="mt-2">
                  {lipsyncAudioFile ? (
                    <div className="relative rounded-xl p-3 border border-white/10 bg-black/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between min-w-0 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Music2 size={16} className="text-[#06b6d4] flex-shrink-0" />
                          <span className="text-xs text-slate-300 font-medium truncate min-w-0">
                            {lipsyncAudioFile.name}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setLipsyncAudioFile(null);
                          }}
                          className="p-1 rounded bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {lipsyncAudioPreview && (
                        <audio
                          src={lipsyncAudioPreview}
                          controls
                          className="w-full h-8 mt-1 rounded bg-black/30 overflow-hidden text-xs"
                        />
                      )}
                      <span className="text-[9px] text-[#475569]">
                        Size: {(lipsyncAudioFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        ref={lipsyncAudioRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setLipsyncAudioFile(file);
                        }}
                        accept="audio/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => lipsyncAudioRef.current?.click()}
                        className="w-full py-8 rounded-xl border border-dashed hover:border-cyan-500/50 bg-black/40 hover:bg-cyan-950/10 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-500 transition-all"
                        style={{ borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        <Music2 size={24} />
                        <span className="text-xs font-semibold">Upload Audio</span>
                        <span className="text-[10px] text-slate-600">MP3, WAV, AAC (Max 100MB)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>


          {/* -- Motion Control inputs (video + character) ----------------- */}
          {showVideoInput && (
            <div className="flex gap-2">
              {/* Motion reference video */}
              <button
                onClick={() => openMediaPicker("motionVideo")}
                onDragOver={allowDrop}
                onDragEnter={(event) => markDropZone(event, "motionVideo")}
                onDragLeave={(event) => clearDropZone(event, "motionVideo")}
                onDrop={(event) => handleDropSingleVideo(event, setMotionVideo)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all"
                style={{
                  height: 100,
                  borderColor: motionVideo ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                  background:  motionVideo ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  ref={motionVideoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => setMotionVideo(e.target.files?.[0] ?? null)}
                />
                {motionVideo ? (
                  <>
                    {motionVideoPreview && (
                      <video
                        src={motionVideoPreview}
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        muted
                        playsInline
                        autoPlay
                        loop
                      />
                    )}
                    <button
                      className="absolute top-2 left-2 z-10 rounded-full p-1"
                      style={{ background: "rgba(0,0,0,0.75)" }}
                      onClick={e => { e.stopPropagation(); setMotionVideo(null); }}
                    >
                      <X size={11} style={{ color: "#fff" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Film size={16} style={{ color: "#475569" }} />
                    </div>
                    <span className="text-[10px] text-center leading-tight px-1" style={{ color: "#475569" }}>Add motion to copy *</span>
                    <span className="text-[9px]" style={{ color: "#334155" }}>3–30 seconds</span>
                  </>
                )}
                {activeDropZone === "motionVideo" && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                    Drop video here
                  </span>
                )}
              </button>

              {/* Character image */}
              <button
                onClick={() => openMediaPicker("startFrame")}
                onDragOver={allowDrop}
                onDragEnter={(event) => markDropZone(event, "startFrame")}
                onDragLeave={(event) => clearDropZone(event, "startFrame")}
                onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all"
                style={{
                  height: 100,
                  borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                  background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  ref={startFrameRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                />
                {startFrame ? (
                  <>
                    {startFramePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={startFramePreview}
                        alt="Character image preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                      />
                    )}
                    <button
                      className="absolute top-2 left-2 z-10 rounded-full p-1"
                      style={{ background: "rgba(0,0,0,0.75)" }}
                      onClick={e => { e.stopPropagation(); setStartFrame(null); }}
                    >
                      <X size={11} style={{ color: "#fff" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <ImageIcon size={16} style={{ color: "#475569" }} />
                    </div>
                    <span className="text-[10px] text-center leading-tight px-1" style={{ color: "#475569" }}>Add your character *</span>
                    <span className="text-[9px] text-center px-1" style={{ color: "#334155" }}>Face and body</span>
                  </>
                )}
                {activeDropZone === "startFrame" && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                    Drop image here
                  </span>
                )}
              </button>
            </div>
          )}

          {/* -- Omni: Elements / Frames tabs ------------------------------- */}
          {showOmniTabs && (
            <div className="flex flex-col gap-2">
              {/* Tab switcher */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {(["elements", "frames"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOmniTab(tab)}
                    className="flex-1 py-2 text-[12px] font-semibold capitalize transition-all"
                    style={{
                      background: omniTab === tab ? hexA(selectedModel.family_color, 0.15) : "transparent",
                      color:      omniTab === tab ? selectedModel.family_color : "#64748b",
                      borderBottom: omniTab === tab ? `2px solid ${selectedModel.family_color}` : "2px solid transparent",
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Elements tab — element reference image */}
              {omniTab === "elements" && (
                <button
                  onClick={() => openMediaPicker("startFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "startFrame")}
                  onDragLeave={(event) => clearDropZone(event, "startFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all w-full"
                  style={{
                    height: 110,
                    borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={startFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                  />
                  {startFrame ? (
                    <>
                      {startFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={startFramePreview}
                          alt="Element image preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <button
                        className="absolute top-2 left-2 z-10 rounded-full p-1"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                        onClick={e => { e.stopPropagation(); setStartFrame(null); }}
                      >
                        <X size={11} style={{ color: "#fff" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <ImageIcon size={18} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Add consistent element</span>
                      <span className="text-[11px]" style={{ color: "#475569" }}>Character, person or object</span>
                    </>
                  )}
                </button>
              )}

              {/* Frames tab — Start + End frame */}
              {omniTab === "frames" && (
                <div className="flex gap-2">
                  {/* Start frame */}
                  <button
                    onClick={() => openMediaPicker("startFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "startFrame")}
                    onDragLeave={(event) => clearDropZone(event, "startFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                    style={{
                      height: 110,
                      borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                      background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <input
                      ref={startFrameRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                    />
                    {startFrame ? (
                      <>
                        {startFramePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={startFramePreview}
                            alt="Start frame preview"
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          />
                        )}
                        <button
                          className="absolute top-2 left-2 z-10 rounded-full p-1"
                          style={{ background: "rgba(0,0,0,0.75)" }}
                          onClick={e => { e.stopPropagation(); setStartFrame(null); }}
                        >
                          <X size={11} style={{ color: "#fff" }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ImageIcon size={16} style={{ color: "#475569" }} />
                        </div>
                        <span className="text-[11px]" style={{ color: "#475569" }}>Start frame</span>
                      </>
                    )}
                    {activeDropZone === "startFrame" && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                        Drop image here
                      </span>
                    )}
                  </button>

                  {/* End frame */}
                  <button
                    onClick={() => openMediaPicker("endFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "endFrame")}
                    onDragLeave={(event) => clearDropZone(event, "endFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                    style={{
                      height: 110,
                      borderColor: endFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                      background:  endFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <input
                      ref={endFrameRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setEndFrame(e.target.files?.[0] ?? null)}
                    />
                    <span
                      className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                    >
                      Optional
                    </span>
                    {endFrame ? (
                      <>
                        {endFramePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={endFramePreview}
                            alt="End frame preview"
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          />
                        )}
                        <button
                          className="absolute top-2 left-2 z-10 rounded-full p-1"
                          style={{ background: "rgba(0,0,0,0.75)" }}
                          onClick={e => { e.stopPropagation(); setEndFrame(null); }}
                        >
                          <X size={11} style={{ color: "#fff" }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ImageIcon size={16} style={{ color: "#475569" }} />
                        </div>
                        <span className="text-[11px]" style={{ color: "#475569" }}>End frame</span>
                      </>
                    )}
                    {activeDropZone === "endFrame" && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                        Drop image here
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* -- Omni: Reference images (shown alongside Omni tabs) -------- */}
          {showOmniTabs && (showReferenceImages || showSimpleKlingRefs) && (
            <>
            <button
              onClick={() => openMediaPicker("referenceImages")}
              onDragOver={allowDrop}
              onDragEnter={(event) => markDropZone(event, "referenceImages")}
              onDragLeave={(event) => clearDropZone(event, "referenceImages")}
              onDrop={handleDropReferenceImages}
              className="relative w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
              style={{
                height: 100,
                borderColor: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                background:  referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
              }}
            >
              <input
                ref={referenceImagesRef}
                type="file"
                accept={isSeedanceV2Model ? "image/*,video/*,audio/*" : "image/*"}
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  setReferenceImages((prev) => mergeReferenceFiles(prev, files, selectedModel));
                  e.target.value = "";
                }}
              />
              <span
                className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
              >
                {`Max ${showSimpleKlingRefs ? 3 : referenceFileMaxLabel}`}
              </span>
              {referenceImages.length > 0 ? (
                <>
                  {referencePreviews.length > 0 && (
                    <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1">
                      {referencePreviews.slice(0, 3).map((src, i) => {
                        const fileType = referenceImages[i]?.type ?? "";
                        if (fileType.startsWith("video/")) return (
                          <div key={i} className="w-full h-full rounded-md opacity-75 flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                            <Film size={14} style={{ color: "#06b6d4" }} />
                          </div>
                        );
                        if (fileType.startsWith("audio/")) return (
                          <div key={i} className="w-full h-full rounded-md opacity-75 flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                            <Music2 size={14} style={{ color: "#a855f7" }} />
                          </div>
                        );
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt={`Reference preview ${i + 1}`} className="w-full h-full object-cover rounded-md opacity-75" />
                        );
                      })}
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200 text-center leading-tight">
                    {referenceFileSummary}
                  </span>
                  <button
                    className="absolute top-2 left-2"
                    onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                  >
                    <X size={11} style={{ color: "#475569" }} />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <ImageIcon size={16} style={{ color: "#475569" }} />
                  </div>
                  <span className="text-[11px]" style={{ color: "#475569" }}>
                    {isSeedanceV2Model ? "Reference media" : "Reference images"}
                  </span>
                </>
              )}
              {activeDropZone === "referenceImages" && (
                <span className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                  {isSeedanceV2Model ? "Drop media here" : "Drop images here"}
                </span>
              )}
            </button>
            </>
          )}

          {/* -- Optional Video Input (for Video-to-Video models like Gemini Omni Flash) -- */}
          {caps.optional_video && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => openMediaPicker("motionVideo")}
                onDragOver={allowDrop}
                onDragEnter={(event) => markDropZone(event, "motionVideo")}
                onDragLeave={(event) => clearDropZone(event, "motionVideo")}
                onDrop={(event) => handleDropSingleVideo(event, setMotionVideo)}
                className="relative w-full h-[70px] rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-cyan-500 hover:border-cyan-500/50 bg-black/40 hover:bg-cyan-950/10"
                style={{
                  borderColor: motionVideo ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.08)",
                  background:  motionVideo ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                }}
              >
                <input
                  ref={motionVideoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => setMotionVideo(e.target.files?.[0] ?? null)}
                />
                {motionVideo ? (
                  <>
                    {motionVideoPreview && (
                      <video
                        src={motionVideoPreview}
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        muted
                        playsInline
                        autoPlay
                        loop
                      />
                    )}
                    <button
                      className="absolute top-2 left-2 z-10 rounded-full p-1"
                      style={{ background: "rgba(0,0,0,0.75)" }}
                      onClick={e => { e.stopPropagation(); setMotionVideo(null); }}
                    >
                      <X size={11} style={{ color: "#fff" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <Film size={15} className="text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400">Upload Input Video (Optional)</span>
                    <span className="text-[9px] text-slate-600">MP4, MOV (3-10 seconds)</span>
                  </>
                )}
                {activeDropZone === "motionVideo" && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                    Drop video here
                  </span>
                )}
              </button>
            </div>
          )}

          {/* -- Image inputs (Start / End frame) -------------------------- */}
          {/* NOTE: Kling 3.0 has its own dedicated FRAMES section below — hide generic here */}
          {!showVideoInput && !showOmniTabs && !isKling30Video && (showImageInput || showEndFrame) && (
            <div className="flex gap-2">
              {showImageInput && (
                <button
                  onClick={() => openMediaPicker("startFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "startFrame")}
                  onDragLeave={(event) => clearDropZone(event, "startFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: startFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  startFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={startFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setStartFrame(e.target.files?.[0] ?? null)}
                  />
                  {!caps.requires_image && (
                    <span
                      className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                    >
                      Optional
                    </span>
                  )}
                  {startFrame ? (
                    <>
                      {startFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={startFramePreview}
                          alt="Start frame preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <button
                        className="absolute top-2 left-2 z-10 rounded-full p-1"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                        onClick={e => { e.stopPropagation(); setStartFrame(null); }}
                      >
                        <X size={11} style={{ color: "#fff" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>
                        {caps.requires_image ? "Upload image *" : "Start frame"}
                      </span>
                    </>
                  )}
                  {activeDropZone === "startFrame" && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      Drop image here
                    </span>
                  )}
                </button>
              )}

              {showEndFrame && (
                <button
                  onClick={() => openMediaPicker("endFrame")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "endFrame")}
                  onDragLeave={(event) => clearDropZone(event, "endFrame")}
                  onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: endFrame ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  endFrame ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={endFrameRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setEndFrame(e.target.files?.[0] ?? null)}
                  />
                  <span
                    className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                  >
                    Optional
                  </span>
                  {endFrame ? (
                    <>
                      {endFramePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={endFramePreview}
                          alt="End frame preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                        />
                      )}
                      <button
                        className="absolute top-2 left-2 z-10 rounded-full p-1"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                        onClick={e => { e.stopPropagation(); setEndFrame(null); }}
                      >
                        <X size={11} style={{ color: "#fff" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>End frame</span>
                    </>
                  )}
                  {activeDropZone === "endFrame" && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      Drop image here
                    </span>
                  )}
                </button>
              )}

              {(showReferenceImages || showSimpleKlingRefs) && (
                <button
                  onClick={() => openMediaPicker("referenceImages")}
                  onDragOver={allowDrop}
                  onDragEnter={(event) => markDropZone(event, "referenceImages")}
                  onDragLeave={(event) => clearDropZone(event, "referenceImages")}
                  onDrop={handleDropReferenceImages}
                  className="relative flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                  style={{
                    height: 100,
                    borderColor: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                    background:  referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    ref={referenceImagesRef}
                    type="file"
                    accept={isSeedanceV2Model ? "image/*,video/*,audio/*" : "image/*"}
                    multiple
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      setReferenceImages((prev) => mergeReferenceFiles(prev, files, selectedModel));
                      e.target.value = "";
                    }}
                  />
                  <span
                    className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#475569" }}
                  >
                    {`Max ${showSimpleKlingRefs ? 3 : referenceFileMaxLabel}`}
                  </span>
                  {referenceImages.length > 0 ? (
                    <>
                      {referencePreviews.length > 0 && (
                        <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                          {referencePreviews.slice(0, 4).map((src, i) => {
                            const fileType = referenceImages[i]?.type ?? "";
                            if (fileType.startsWith("video/")) return (
                              <div key={i} className="w-full h-full rounded-md opacity-75 flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                                <Film size={14} style={{ color: "#06b6d4" }} />
                              </div>
                            );
                            if (fileType.startsWith("audio/")) return (
                              <div key={i} className="w-full h-full rounded-md opacity-75 flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                                <Music2 size={14} style={{ color: "#a855f7" }} />
                              </div>
                            );
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={src} alt={`Reference preview ${i + 1}`} className="w-full h-full object-cover rounded-md opacity-75" />
                            );
                          })}
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-200 text-center leading-tight">
                        {referenceFileSummary}
                      </span>
                      <button
                        className="absolute top-2 left-2"
                        onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <ImageIcon size={16} style={{ color: "#475569" }} />
                      </div>
                      <span className="text-[11px]" style={{ color: "#475569" }}>
                        {isSeedanceV2Model ? "Reference media" : "Reference images"}
                      </span>
                    </>
                  )}
                  {activeDropZone === "referenceImages" && (
                    <span className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-cyan-500/15 text-[12px] font-semibold text-cyan-300">
                      {isSeedanceV2Model ? "Drop media here" : "Drop images here"}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

              {(showReferenceImages || showSimpleKlingRefs) && referenceImages.length > 0 && (
                <div className="flex flex-col gap-2 -mt-3 mb-1">
                  {/* Horizontal list of uploaded images with tags */}
                  {(() => {
                    let imageIdx = 0;
                    const imageFiles = referenceImages.filter(f => f.type.startsWith("image/"));
                    if (imageFiles.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 items-center">
                        {imageFiles.map((file, idx) => {
                          imageIdx++;
                          const tag = `@image${imageIdx}`;
                          const previewSrc = referencePreviews[referenceImages.indexOf(file)];
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {previewSrc && (
                                <img
                                  src={previewSrc}
                                  alt={tag}
                                  className="w-8 h-8 rounded object-cover border border-cyan-500/20"
                                />
                              )}
                              <span className="text-[11px] font-semibold text-cyan-400 font-mono">{tag}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <p className="text-[10px]" style={{ color: "#64748b" }}>
                    {showSimpleKlingRefs
                      ? "Use @image1, @image2, @image3 inside prompt/shot prompts to activate references."
                      : isSeedanceV2Model
                        ? "Seedance maps @Image1..@Image9 from image references only; video and audio references are sent separately."
                        : "Reference images mode is active; first/last frame inputs will be ignored for this generation."}
                  </p>
                </div>
              )}

          {/* -- AI Model dropdown ------------------------------------------- */}
          {/* -- AI Model dropdown ------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
              AI Model
            </label>
            {(activeTool as string) !== "lipsync" ? (
              // Regular video models
              <>
                <div className="relative">
                  <button
                    onClick={() => setModelOpen(v => !v)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedModel.family_color }} />
                    <span className="flex-1 text-[13px]" style={{ color: "#e2e8f0" }}>{prettyModelName(selectedModel.name)}</span>
                    {bStyle && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                        style={{ background: bStyle.bg, color: bStyle.text }}
                      >
                        {selectedModel.badge}
                      </span>
                    )}
                    <ChevronDown
                      size={13}
                      style={{
                        color: "#475569",
                        transform: modelOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {modelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-y-auto py-1"
                        style={{
                          background: "#0a1220",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: "0 16px 32px rgba(0,0,0,0.6)",
                          maxHeight: 320,
                        }}
                      >
                        {MODEL_GROUPS.map(g => (
                          <div key={g.family}>
                            <div className="flex items-center gap-2 px-3 pt-3 pb-1 select-none">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.family_color }} />
                              <span
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: g.family_color, opacity: 0.85 }}
                              >
                                {g.family_label}
                              </span>
                              <div className="flex-1 h-px" style={{ background: hexA(g.family_color, 0.2) }} />
                            </div>
                            {g.models.map(m => {
                              const bs = m.badge ? BADGE_STYLE[m.badge as keyof typeof BADGE_STYLE] : null;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => selectModel(m)}
                                  className="w-full flex items-center gap-2 px-4 py-2 transition-all"
                                  style={{
                                    background: selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent",
                                    color:      selectedModel.id === m.id ? "#e2e8f0" : "#94a3b8",
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent")}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.family_color }} />
                                  <span className="flex-1 text-left text-[13px]">{prettyModelName(m.name)}</span>
                                  {bs && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                                      style={{ background: bs.bg, color: bs.text }}
                                    >
                                      {m.badge}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              // Lipsync models only
              <div className="relative">
                <button
                  onClick={() => setModelOpen(v => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedModel.family_color }} />
                  <span className="flex-1 text-[13px]" style={{ color: "#e2e8f0" }}>{prettyModelName(selectedModel.name)}</span>
                  {bStyle && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                      style={{ background: bStyle.bg, color: bStyle.text }}
                    >
                      {selectedModel.badge}
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    style={{
                      color: "#475569",
                      transform: modelOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                <AnimatePresence>
                  {modelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-y-auto py-1"
                      style={{
                        background: "#0a1220",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 16px 32px rgba(0,0,0,0.6)",
                        maxHeight: 320,
                      }}
                    >
                      {LIPSYNC_MODELS.map(m => {
                        const bs = m.badge ? BADGE_STYLE[m.badge as keyof typeof BADGE_STYLE] : null;
                        return (
                          <button
                            key={m.id}
                            onClick={() => selectModel(m)}
                            className="w-full flex items-center gap-2 px-4 py-2 transition-all"
                            style={{
                              background: selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent",
                              color:      selectedModel.id === m.id ? "#e2e8f0" : "#94a3b8",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                            onMouseLeave={e => (e.currentTarget.style.background = selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent")}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.family_color }} />
                            <span className="flex-1 text-left text-[13px]">{prettyModelName(m.name)}</span>
                            {bs && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                                style={{ background: bs.bg, color: bs.text }}
                              >
                                {m.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {supportsCharacterReference && (
            <div className="flex flex-col gap-2" data-character-ref="1">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Character Reference</label>
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value || "")}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e2e8f0",
                }}
              >
                <option value="">No saved character</option>
                {selectableCharacters.map((character) => (
                  <option key={character.id} value={character.id}>{character.name}</option>
                ))}
              </select>
              {selectedCharacter ? (
                <div className="flex gap-3 rounded-xl p-2" style={{ background: hexA(selectedModel.family_color, 0.08), border: `1px solid ${hexA(selectedModel.family_color, 0.22)}` }}>
                  {selectedCharacter.coverUrl ? (
                    <img src={selectedCharacter.coverUrl} alt={selectedCharacter.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Users size={18} style={{ color: selectedModel.family_color }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold" style={{ color: "#e2e8f0" }}>{selectedCharacter.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px]" style={{ color: "#64748b" }}>{selectedCharacter.description || "Reusable identity reference"}</p>
                    <p className="mt-1 text-[10px]" style={{ color: selectedModel.family_color }}>{characterSupport.label} · {selectedCharacter.referenceUrls.length} reference image(s)</p>
                  </div>
                </div>
              ) : selectableCharacters.length === 0 ? (
                <div className="rounded-xl border border-white/10 px-3 py-2 text-[11px] text-slate-500">
                  {characterSupport.note}
                </div>
              ) : (
                <a href="/character" className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-center text-[11px] text-slate-500 hover:border-white/20 hover:text-slate-300">
                  Create a reusable character
                </a>
              )}
              {selectedCharacter && characterSupport.mode === "kling_element" && selectedCharacter.referenceUrls.length < characterSupport.minImages && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
                  Kling 3.0 Elements needs at least {characterSupport.minImages} reference images for this character.
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              KLING 3.0 — Dedicated full-spec panel
              ════════════════════════════════════════════════════════════ */}
          {isKling30Video && (
            <div className="flex flex-col gap-4">

              {/* -- Start / End Frame ---------------------------------------- */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Frames</label>

                {/* Side-by-side cards */}
                <div className="grid grid-cols-2 gap-3">

                  {/* ── Start frame ── */}
                  <button
                    onClick={() => openMediaPicker("startFrame")}
                    onDragOver={allowDrop}
                    onDragEnter={(event) => markDropZone(event, "startFrame")}
                    onDragLeave={(event) => clearDropZone(event, "startFrame")}
                    onDrop={(event) => handleDropSingleImage(event, setStartFrame)}
                    className="relative flex flex-col items-center justify-center gap-2 rounded-2xl transition-all overflow-hidden aspect-square w-full"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${startFrame ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <input ref={startFrameRef} type="file" accept="image/*" className="hidden" onChange={e => setStartFrame(e.target.files?.[0] ?? null)} />
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md z-10" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>Optional</span>
                    {startFrame ? (
                      <>
                        {startFramePreview && <img src={startFramePreview} alt="Start" className="absolute inset-0 w-full h-full object-contain" style={{ padding: 8, background: "#000" }} />}
                        <button className="absolute top-2 left-2 z-10 rounded-full p-1" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { e.stopPropagation(); setStartFrame(null); }}><X size={14} style={{ color: "#fff" }} /></button>
                      </>
                    ) : (
                      <>
                        <div className="rounded-full p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <ImageIcon size={20} style={{ color: "#64748b" }} />
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Start frame</span>
                      </>
                    )}
                    {activeDropZone === "startFrame" && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-cyan-500/15 text-[11px] font-semibold text-cyan-300">Drop here</span>}
                  </button>

                  {/* ── End frame ── */}
                  {!kling30MultiEnabled ? (
                    <button
                      onClick={() => openMediaPicker("endFrame")}
                      onDragOver={allowDrop}
                      onDragEnter={(event) => markDropZone(event, "endFrame")}
                      onDragLeave={(event) => clearDropZone(event, "endFrame")}
                      onDrop={(event) => handleDropSingleImage(event, setEndFrame)}
                      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl transition-all overflow-hidden aspect-square w-full"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${endFrame ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <input ref={endFrameRef} type="file" accept="image/*" className="hidden" onChange={e => setEndFrame(e.target.files?.[0] ?? null)} />
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-md z-10" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>Optional</span>
                      {endFrame ? (
                        <>
                          {endFramePreview && <img src={endFramePreview} alt="End" className="absolute inset-0 w-full h-full object-contain" style={{ padding: 8, background: "#000" }} />}
                          <button className="absolute top-2 left-2 z-10 rounded-full p-1" style={{ background: "rgba(0,0,0,0.75)" }} onClick={e => { e.stopPropagation(); setEndFrame(null); }}><X size={14} style={{ color: "#fff" }} /></button>
                        </>
                      ) : (
                        <>
                          <div className="rounded-full p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <ImageIcon size={20} style={{ color: "#64748b" }} />
                          </div>
                          <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>End frame</span>
                        </>
                      )}
                      {activeDropZone === "endFrame" && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-purple-500/15 text-[11px] font-semibold text-purple-300">Drop here</span>}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl aspect-square w-full opacity-25" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-[10px] text-center px-2" style={{ color: "#334155" }}>N/A in multi-shot</span>
                    </div>
                  )}
                </div>

                {/* Duplicate warning */}
                {startFrame && endFrame && !kling30MultiEnabled && startFrame.size === endFrame.size && (
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span className="text-[9px] font-semibold" style={{ color: "#f87171" }}>⚠ Both slots have the same image!</span>
                  </div>
                )}
              </div>

              {/* -- Duration slider ------------------------------------------ */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Duration</label>
                  <span className="text-[13px] font-bold" style={{ color: selectedModel.family_color }}>{duration ?? 9}s</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={1}
                  value={duration ?? 9}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setDuration(v);
                    // Auto mode: clamp custom shots if over new max
                    if (kling30MultiMode === "custom") {
                      const maxShots = Math.min(5, Math.floor(v / 3));
                      setKling30CustomShots(prev => prev.slice(0, Math.max(1, maxShots)));
                    }
                  }}
                  className="w-full h-1.5 rounded outline-none cursor-pointer"
                  style={{ accentColor: selectedModel.family_color }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: "#334155" }}>
                  <span>3s</span>
                  {kling30MultiEnabled && kling30MultiMode === "auto" && (
                    <span style={{ color: "#64748b" }}>→ {kling30ShotCount} shot{kling30ShotCount > 1 ? "s" : ""}</span>
                  )}
                  <span>15s</span>
                </div>
              </div>

              {/* -- Aspect Ratio --------------------------------------------- */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Aspect Ratio</label>
                <div className="flex gap-1">
                  {(["16:9", "9:16", "1:1"] as const).map(r => {
                    const isActive = aspectRatio === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                        style={{
                          background: isActive ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                          border:     isActive ? `1px solid ${hexA(selectedModel.family_color, 0.5)}` : "1px solid rgba(255,255,255,0.06)",
                          color:      isActive ? selectedModel.family_color : "#64748b",
                          cursor:     "pointer",
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* -- Resolution (720p std / 1080p pro / 4K) ------------------- */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Resolution</label>
                <div className="flex gap-1">
                  {([["std", "720p"], ["pro", "1080p"], ["4K", "4K"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setResolution(val)}
                      className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: resolution === val ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                        border:     resolution === val ? `1px solid ${hexA(selectedModel.family_color, 0.5)}` : "1px solid rgba(255,255,255,0.06)",
                        color:      resolution === val ? selectedModel.family_color : "#64748b",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px]" style={{ color: "#334155" }}>
                  {resolution === "4K"
                    ? (aspectRatio === "16:9" ? "3840×2160" : aspectRatio === "9:16" ? "2160×3840" : "2160×2160")
                    : resolution === "pro"
                    ? (aspectRatio === "16:9" ? "1920×1080" : aspectRatio === "9:16" ? "1080×1920" : "1080×1080")
                    : (aspectRatio === "16:9" ? "1280×720" : aspectRatio === "9:16" ? "720×1280" : "720×720")}
                </p>
              </div>

              {/* -- Multi-shot toggle ---------------------------------------- */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>Multi-shot</span>
                  <span className="text-[10px]" style={{ color: "#475569" }}>Multiple scenes in one video</span>
                </div>
                <button
                  onClick={() => {
                    const next = !kling30MultiEnabled;
                    setKling30MultiEnabled(next);
                    if (next && endFrame) setEndFrame(null); // clear end frame when enabling multi-shot
                  }}
                  className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                  style={{ background: kling30MultiEnabled ? hexA(selectedModel.family_color, 0.7) : "rgba(255,255,255,0.08)" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: kling30MultiEnabled ? "calc(100% - 18px)" : 2 }}
                  />
                </button>
              </div>

              {/* -- Multi-shot Builder --------------------------------------- */}
              {kling30MultiEnabled && (
                <div className="flex flex-col gap-3">
                  {/* Auto / Custom tabs */}
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {(["auto", "custom"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setKling30MultiMode(mode)}
                        className="flex-1 py-2 text-[12px] font-semibold capitalize transition-all"
                        style={{
                          background: kling30MultiMode === mode ? hexA(selectedModel.family_color, 0.15) : "transparent",
                          color:      kling30MultiMode === mode ? selectedModel.family_color : "#64748b",
                          borderBottom: kling30MultiMode === mode ? `2px solid ${selectedModel.family_color}` : "2px solid transparent",
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* AUTO MODE */}
                  {kling30MultiMode === "auto" && (
                    <div
                      className="rounded-xl p-3 flex flex-col gap-1"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>Shots</span>
                        <span className="text-[14px] font-bold" style={{ color: selectedModel.family_color }}>{kling30ShotCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>Duration per shot</span>
                        <span className="text-[12px]" style={{ color: "#64748b" }}>≈ {Math.floor((duration ?? 9) / kling30ShotCount)}s each</span>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                        Auto divides {duration ?? 9}s into {kling30ShotCount} scene{kling30ShotCount > 1 ? "s" : ""} using your prompt.
                      </p>
                    </div>
                  )}

                  {/* CUSTOM MODE */}
                  {kling30MultiMode === "custom" && (
                    <div className="flex flex-col gap-2">
                      {/* Duration status bar */}
                      <div
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          background: kling30CustomDurationValid ? "rgba(16,185,129,0.08)" : kling30CustomDurationRemaining < 0 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                          border: `1px solid ${kling30CustomDurationValid ? "rgba(16,185,129,0.3)" : kling30CustomDurationRemaining < 0 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                        }}
                      >
                        <span className="text-[11px]" style={{ color: kling30CustomDurationValid ? "#34d399" : kling30CustomDurationRemaining < 0 ? "#f87171" : "#fbbf24" }}>
                          {kling30CustomDurationValid
                            ? `✓ ${kling30CustomTotalDuration}s — matches target`
                            : kling30CustomDurationRemaining > 0
                              ? `${kling30CustomTotalDuration}s / ${kling30DurationTarget}s — ${kling30CustomDurationRemaining}s remaining`
                              : `${kling30CustomTotalDuration}s / ${kling30DurationTarget}s — ${Math.abs(kling30CustomDurationRemaining)}s over`}
                        </span>
                      </div>

                      {/* Shot list */}
                      <div className="flex flex-col gap-1.5">
                        {kling30CustomShots.map((shot, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-1 rounded-xl p-2"
                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}` }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: hexA(selectedModel.family_color, 0.15), color: selectedModel.family_color }}
                              >
                                Shot {i + 1}
                              </span>
                              {/* Duration input */}
                              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                                <button
                                  onClick={() => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Math.max(1, s.duration - 1) } : s))}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[12px] font-bold"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                                >−</button>
                                <span className="text-[11px] w-6 text-center" style={{ color: selectedModel.family_color }}>{shot.duration}s</span>
                                <button
                                  onClick={() => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Math.min(12, s.duration + 1) } : s))}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[12px] font-bold"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                                >+</button>
                              </div>
                              {kling30CustomShots.length > 1 && (
                                <button onClick={() => setKling30CustomShots(prev => prev.filter((_, idx) => idx !== i))}>
                                  <X size={10} style={{ color: "#475569" }} />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={shot.prompt}
                              onChange={e => setKling30CustomShots(prev => prev.map((s, idx) => idx === i ? { ...s, prompt: e.target.value } : s))}
                              placeholder={`Scene ${i + 1} description…`}
                              rows={2}
                              className="w-full bg-transparent rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
                              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.15)}`, color: "#94a3b8" }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Add shot button */}
                      {kling30CustomShots.length < Math.min(5, Math.floor((duration ?? 9) / 1)) && (
                        <button
                          onClick={() => setKling30CustomShots(prev => [...prev, { prompt: "", duration: 3 }])}
                          className="text-[11px] py-2 rounded-lg transition-all"
                          style={{ background: hexA(selectedModel.family_color, 0.08), color: selectedModel.family_color, border: `1px dashed ${hexA(selectedModel.family_color, 0.3)}` }}
                        >
                          + Add Shot ({kling30CustomShots.length}/5 max)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* -- Elements system ------------------------------------------ */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                    Elements
                  </label>
                  {klingEls.length < 3 && (
                    <button
                      onClick={() => setKlingEls(prev => [...prev, { name: "", description: "", files: [], previews: [] }])}
                      className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                      style={{ background: hexA(selectedModel.family_color, 0.12), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.3)}` }}
                    >
                      + Add Element
                    </button>
                  )}
                </div>
                {klingEls.length === 0 && (
                  <p className="text-[10px]" style={{ color: "#334155" }}>
                    Elements let you reference consistent characters or objects using <span style={{ color: "#64748b" }}>@element_name</span> in your prompt.
                  </p>
                )}
                {klingEls.map((el, elIdx) => {
                  const trimmedName = el.name.trim();
                  const trimmedDesc = el.description.trim();
                  const validImages = el.files.filter(Boolean).length;
                  const isInPrompt = trimmedName ? new RegExp(`@${trimmedName}\\b`, "i").test(prompt) : false;
                  const isComplete = trimmedName && trimmedDesc && validImages >= 2 && isInPrompt;
                  return (
                  <div
                    key={elIdx}
                    className="flex flex-col gap-2 rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isComplete ? "rgba(16,185,129,0.4)" : hexA(selectedModel.family_color, 0.2)}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium" style={{ color: selectedModel.family_color }}>Element {elIdx + 1}</span>
                        {isComplete ? (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>✓ Ready</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>⚠ Incomplete</span>
                        )}
                      </div>
                      <button onClick={() => setKlingEls(prev => prev.filter((_, i) => i !== elIdx))}><X size={11} style={{ color: "#475569" }} /></button>
                    </div>
                    <input
                      value={el.name}
                      onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") } : v))}
                      placeholder="Name (letters/digits only — used as @name)"
                      className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${trimmedName ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`, color: "#94a3b8" }}
                    />
                    <input
                      value={el.description}
                      onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, description: e.target.value } : v))}
                      placeholder="Brief description of this element"
                      className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${trimmedDesc ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`, color: "#94a3b8" }}
                    />
                    {/* Image slots (2 required + 2 optional) */}
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 4 }).map((_, imgIdx) => {
                        const preview = el.previews[imgIdx];
                        const hasFile = !!el.files[imgIdx];
                        const isRequired = imgIdx < 2;
                        return (
                          <label
                            key={imgIdx}
                            className="relative flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer overflow-hidden"
                            style={{ height: 52, borderColor: hasFile ? hexA(selectedModel.family_color, 0.5) : isRequired ? "rgba(100,116,139,0.4)" : "rgba(255,255,255,0.06)", background: hasFile ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)" }}
                          >
                            <input
                              type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = URL.createObjectURL(file);
                                setKlingEls(prev => prev.map((v, i) => {
                                  if (i !== elIdx) return v;
                                  const newFiles = [...v.files];
                                  const newPreviews = [...v.previews];
                                  if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                  newFiles[imgIdx] = file;
                                  newPreviews[imgIdx] = url;
                                  return { ...v, files: newFiles, previews: newPreviews };
                                }));
                              }}
                            />
                            {preview ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <button
                                  type="button" className="absolute top-0.5 right-0.5 z-10"
                                  onClick={e => {
                                    e.preventDefault();
                                    setKlingEls(prev => prev.map((v, i) => {
                                      if (i !== elIdx) return v;
                                      const nf = [...v.files]; const np = [...v.previews];
                                      if (np[imgIdx]) URL.revokeObjectURL(np[imgIdx]);
                                      nf.splice(imgIdx, 1); np.splice(imgIdx, 1);
                                      return { ...v, files: nf, previews: np };
                                    }));
                                  }}
                                ><X size={9} style={{ color: "#fff" }} /></button>
                              </>
                            ) : (
                              <span className="text-[8px] text-center px-1" style={{ color: isRequired ? "#64748b" : "#334155" }}>
                                {isRequired ? "Req." : "Opt."}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {el.files.filter(Boolean).length < 2 && (
                      <span className="text-[10px]" style={{ color: "#ef4444" }}>⚠ Upload at least 2 images for this element.</span>
                    )}
                    {trimmedName && (
                      <div className="flex items-center gap-1.5 flex-wrap rounded-lg px-2 py-1.5" style={{
                        background: isInPrompt ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                        border: `1px solid ${isInPrompt ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}>
                        {isInPrompt ? (
                          <span className="text-[9px] font-semibold" style={{ color: "#34d399" }}>✓ @{trimmedName} is in prompt</span>
                        ) : (
                          <>
                            <span className="text-[9px]" style={{ color: "#f87171" }}>⚠ Add to prompt:</span>
                            <button
                              onClick={() => setPrompt(prev => prev.trimEnd() + (prev ? " " : "") + `@${trimmedName}`)}
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ background: hexA(selectedModel.family_color, 0.18), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.4)}` }}
                            >
                              + Insert @{trimmedName}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* -- Sound ---------------------------------------------------- */}
              {caps.has_sound && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 size={13} style={{ color: "#475569" }} />
                    <div className="flex flex-col">
                      <span className="text-[12px]" style={{ color: "#64748b" }}>Generate Sound</span>
                      <span className="text-[10px]" style={{ color: "#475569" }}>AI-generated audio track - included</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSound(v => !v)}
                    className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                    style={{ background: sound ? hexA(selectedModel.family_color, 0.7) : "rgba(255,255,255,0.08)" }}
                  >
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: sound ? "calc(100% - 18px)" : 2 }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              GENERIC controls — shown for all models EXCEPT Kling 3.0
              ════════════════════════════════════════════════════════════ */}
          {!isKling30Video && (<>

          {/* -- Veo 3.1 — Duration buttons (Google spec: 4 / 6 / 8 only) ---- */}

          {/* -- Duration ---------------------------------------------------- */}
          {durationChoices.length > 0 && duration != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Duration
              </label>
              <div className="relative">
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {durationChoices.map(d => (
                    <option key={d} value={d} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {d}s
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Aspect ratio ------------------------------------------------ */}
          {effectiveAspectRatios.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Aspect Ratio
              </label>
              <div className="relative">
                <select
                  value={aspectRatio || effectiveAspectRatios[0]}
                  onChange={e => setAspectRatio(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {effectiveAspectRatios.map(r => (
                    <option key={r} value={r} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Orientation / Size (for size-based models like Sora 2) ------- */}
          {caps.sizes.length > 0 && size != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Orientation
              </label>
              <div className="relative">
                <select
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${hexA(selectedModel.family_color, 0.25)}`,
                    color: selectedModel.family_color,
                  }}
                >
                  {caps.sizes.map(s => (
                    <option key={s} value={s} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {sizeLabel(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }} />
              </div>
            </div>
          )}

          {/* -- Quality ----------------------------------------------------- */}
          {resolutionChoices.length > 0 && resolution != null && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Quality
              </label>
              <div className="relative">
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[13px] outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#e2e8f0",
                  }}
                >
                  {resolutionChoices.map(r => (
                    <option key={r} value={r} style={{ background: "#0a1220", color: "#e2e8f0" }}>
                      {r === "std" ? "std" : r === "pro" ? "pro" : r.toLowerCase() === "4k" ? "4K" : r}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#475569" }}
                />
              </div>
            </div>
          )}

          {/* -- Scene Control Mode (Kling Motion) -------------------------- */}
          {caps.has_scene_control && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: "#64748b" }}>Scene Control Mode</span>
              </div>
              <button
                onClick={() => setSceneControl(v => !v)}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: sceneControl ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: sceneControl ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}

          {/* -- Orientation (Kling Motion) ---------------------------------- */}
          {caps.has_orientation && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Orientation
              </label>
              <div className="flex gap-1">
                {(["video", "image"] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    className="flex-1 py-2 rounded-lg text-[12px] font-medium capitalize transition-all"
                    style={{
                      background: orientation === o ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     orientation === o ? `1px solid ${hexA(selectedModel.family_color, 0.4)}` : "1px solid rgba(255,255,255,0.06)",
                      color:      orientation === o ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- CFG Scale --------------------------------------------------- */}
          {caps.has_cfg_scale && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  CFG Scale
                </label>
                <span className="text-[12px]" style={{ color: selectedModel.family_color }}>
                  {cfgScale.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={cfgScale}
                onChange={e => setCfgScale(parseFloat(e.target.value))}
                className="w-full h-1 rounded outline-none"
                style={{ accentColor: selectedModel.family_color }}
              />
              <div className="flex justify-between text-[10px]" style={{ color: "#334155" }}>
                <span>Flexible</span>
                <span>Strict</span>
              </div>
            </div>
          )}

          {/* -- Shot Type (Kling) -------------------------------------------- */}
          {caps.has_shot_type && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Shot Type
              </label>
              <div className="flex gap-1">
                {(["intelligent", "customize"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setShotType(st)}
                    className="flex-1 py-2 rounded-lg text-[12px] font-medium capitalize transition-all"
                    style={{
                      background: shotType === st ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     shotType === st ? `1px solid ${hexA(selectedModel.family_color, 0.4)}` : "1px solid rgba(255,255,255,0.06)",
                      color:      shotType === st ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- Multi-Prompt (Kling) ----------------------------------------- */}
          {caps.has_multi_prompt && showOmniTabs && (
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#64748b" }}>Multi-shot</span>
              <button
                onClick={() => setMultiPrompts(prev => prev.length === 1 && prev[0] === "" ? ["", ""] : [""])}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: multiShotEnabled ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: multiShotEnabled ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}
          {caps.has_multi_prompt && showOmniTabs && multiShotEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Multi-Shot Prompts
                </label>
                <button
                  onClick={() => {
                    if (!canAddMoreShots) return;
                    setMultiPrompts(prev => [...prev, ""]);
                  }}
                  disabled={!canAddMoreShots}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: hexA(selectedModel.family_color, 0.12),
                    color: canAddMoreShots ? selectedModel.family_color : "#64748b",
                    border: `1px solid ${canAddMoreShots ? hexA(selectedModel.family_color, 0.3) : "rgba(100,116,139,0.4)"}`,
                    cursor: canAddMoreShots ? "pointer" : "not-allowed",
                    opacity: canAddMoreShots ? 1 : 0.6,
                  }}
                >
                  + Add Shot
                </button>
              </div>
                {duration != null && activeMultiPromptIndexes.length > 0 && (
                  <span className="text-[10px]" style={{ color: "#64748b" }}>
                    Total {duration}s split across {activeMultiPromptIndexes.length} shot(s). Remainder goes to the last shot.
                  </span>
                )}
              <span className="text-[10px]" style={{ color: "#64748b" }}>
                Max shots for current duration: {maxShotsAllowed}
              </span>
              <div className="flex flex-col gap-1.5">
                {multiPrompts.map((mp, i) => (
                  <div key={i} className="relative">
                    <textarea
                      value={mp}
                      onChange={e => setMultiPrompts(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={isKling30Video ? `Shot ${i + 1} scene… use @image${Math.min(i + 1, 3)}` : `Shot ${i + 1} scene…`}
                      rows={2}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-16 text-[12px] outline-none resize-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${hexA(selectedModel.family_color, 0.2)}`,
                        color: "#94a3b8",
                      }}
                    />
                    {shotDurationsByIndex[i] != null && (
                      <span
                        className="absolute top-1.5 right-7 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                      >
                        {shotDurationsByIndex[i]}s
                      </span>
                    )}
                    {multiPrompts.length > 2 && (
                      <button
                        onClick={() => setMultiPrompts(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {caps.has_multi_prompt && !showOmniTabs && (
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#64748b" }}>Multi-shot</span>
              <button
                onClick={() => setMultiPrompts(prev => prev.length === 1 && prev[0] === "" ? ["", ""] : [""])}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: multiShotEnabled ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: multiShotEnabled ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}
          {caps.has_multi_prompt && !showOmniTabs && multiShotEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Multi-Shot Prompts
                </label>
                <button
                  onClick={() => {
                    if (!canAddMoreShots) return;
                    setMultiPrompts(prev => [...prev, ""]);
                  }}
                  disabled={!canAddMoreShots}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: hexA(selectedModel.family_color, 0.12),
                    color:      canAddMoreShots ? selectedModel.family_color : "#64748b",
                    border:     `1px solid ${canAddMoreShots ? hexA(selectedModel.family_color, 0.3) : "rgba(100,116,139,0.4)"}`,
                    cursor:     canAddMoreShots ? "pointer" : "not-allowed",
                    opacity:    canAddMoreShots ? 1 : 0.6,
                  }}
                >
                  + Add Shot
                </button>
              </div>
              {duration != null && activeMultiPromptIndexes.length > 0 && (
                <span className="text-[10px]" style={{ color: "#64748b" }}>
                  Total {duration}s split across {activeMultiPromptIndexes.length} shot(s). Remainder goes to the last shot.
                </span>
              )}
              <span className="text-[10px]" style={{ color: "#64748b" }}>
                Max shots for current duration: {maxShotsAllowed}
              </span>
              <div className="flex flex-col gap-1.5">
                {multiPrompts.map((mp, i) => (
                  <div key={i} className="relative">
                    <textarea
                      value={mp}
                      onChange={e => setMultiPrompts(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={isKling30Video ? `Shot ${i + 1} scene… use @image${Math.min(i + 1, 3)}` : `Shot ${i + 1} scene…`}
                      rows={2}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-7 text-[12px] outline-none resize-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border:     `1px solid ${hexA(selectedModel.family_color, 0.2)}`,
                        color:      "#94a3b8",
                      }}
                    />
                    {shotDurationsByIndex[i] != null && (
                      <span
                        className="absolute top-1.5 right-7 text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                      >
                        {shotDurationsByIndex[i]}s
                      </span>
                    )}
                    {multiPrompts.length > 1 && (
                      <button
                        onClick={() => setMultiPrompts(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Element List (Kling) ----------------------------------------- */}
          {caps.has_element_list && !showOmniTabs && !isKlingElementModel && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Element List
                </label>
                <button
                  onClick={() => setElementList((prev) => [...prev, ""])}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {elementList.map((el, i) => (
                  <div key={i} className="relative">
                    <input
                      value={el}
                      onChange={e => setElementList(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={`Element ID ${i + 1}`}
                      className="w-full bg-transparent rounded-lg px-3 py-2 pr-7 text-[12px] outline-none"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border:     "1px solid rgba(255,255,255,0.06)",
                        color:      "#94a3b8",
                      }}
                    />
                    {elementList.length > 1 && (
                      <button
                        onClick={() => setElementList(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5"
                      >
                        <X size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Kling 3.0 Elements (name + description + 2-4 images, max 3) -- */}
          {showKling30Elements && !showOmniTabs && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Elements
                </label>
                {klingEls.length < 3 && (
                  <button
                    onClick={() => setKlingEls(prev => [...prev, { name: "", description: "", files: [], previews: [] }])}
                    className="text-[10px] px-2 py-0.5 rounded-md transition-all"
                    style={{ background: hexA(selectedModel.family_color, 0.12), color: selectedModel.family_color, border: `1px solid ${hexA(selectedModel.family_color, 0.3)}` }}
                  >
                    + Add Element
                  </button>
                )}
              </div>
              <p className="text-[10px] -mt-2" style={{ color: "#64748b" }}>
                Each element needs 2–4 images. Reference it in your prompt as <span style={{ color: "#94a3b8" }}>@element_name</span>.
              </p>
              {klingEls.map((el, elIdx) => (
                <div
                  key={elIdx}
                  className="flex flex-col gap-2 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hexA(selectedModel.family_color, 0.2)}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: selectedModel.family_color }}>Element {elIdx + 1}</span>
                    <button onClick={() => setKlingEls(prev => prev.filter((_, i) => i !== elIdx))}>
                      <X size={11} style={{ color: "#475569" }} />
                    </button>
                  </div>
                  <input
                    value={el.name}
                    onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, name: e.target.value } : v))}
                    placeholder="Name (e.g. hero, car, logo)"
                    className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                  />
                  <input
                    value={el.description}
                    onChange={e => setKlingEls(prev => prev.map((v, i) => i === elIdx ? { ...v, description: e.target.value } : v))}
                    placeholder="Brief description of this element"
                    className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                  />
                  {/* Image slots (2-4) */}
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, imgIdx) => {
                      const preview = el.previews[imgIdx];
                      const hasFile = !!el.files[imgIdx];
                      return (
                        <label
                          key={imgIdx}
                          className="relative flex flex-col items-center justify-center rounded-lg border border-dashed cursor-pointer overflow-hidden"
                          style={{
                            height: 56,
                            borderColor: hasFile ? hexA(selectedModel.family_color, 0.5) : "rgba(255,255,255,0.1)",
                            background:  hasFile ? hexA(selectedModel.family_color, 0.07) : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = URL.createObjectURL(file);
                              setKlingEls(prev => prev.map((v, i) => {
                                if (i !== elIdx) return v;
                                const newFiles = [...v.files];
                                const newPreviews = [...v.previews];
                                // Revoke old preview if present
                                if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                newFiles[imgIdx] = file;
                                newPreviews[imgIdx] = url;
                                return { ...v, files: newFiles, previews: newPreviews };
                              }));
                            }}
                          />
                          {preview ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-0.5 right-0.5 z-10"
                                onClick={e => {
                                  e.preventDefault();
                                  setKlingEls(prev => prev.map((v, i) => {
                                    if (i !== elIdx) return v;
                                    const newFiles = [...v.files];
                                    const newPreviews = [...v.previews];
                                    if (newPreviews[imgIdx]) URL.revokeObjectURL(newPreviews[imgIdx]);
                                    newFiles.splice(imgIdx, 1);
                                    newPreviews.splice(imgIdx, 1);
                                    return { ...v, files: newFiles, previews: newPreviews };
                                  }));
                                }}
                              >
                                <X size={9} style={{ color: "#fff" }} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[9px]" style={{ color: imgIdx < 2 ? "#64748b" : "#334155" }}>
                              {imgIdx < 2 ? "Required" : "Optional"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {el.files.length < 2 && (
                    <span className="text-[10px]" style={{ color: "#ef4444" }}>Upload at least 2 images for this element.</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* -- Sound toggle ------------------------------------------------ */}
          {caps.has_sound && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 size={13} style={{ color: "#475569" }} />
                <span className="text-[12px]" style={{ color: "#64748b" }}>Generate Sound</span>
                <span
                  className="text-[10px] px-1 rounded"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}
                >
                  included
                </span>
              </div>
              <button
                onClick={() => setSound(v => !v)}
                className="relative w-9 h-5 rounded-full transition-all"
                style={{ background: sound ? hexA(selectedModel.family_color, 0.6) : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: sound ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>
          )}

          {/* -- Negative Prompt --------------------------------------------- */}
          {caps.has_negative_prompt && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                Negative Prompt
              </label>
              <textarea
                value={negPrompt}
                onChange={e => setNegPrompt(e.target.value)}
                placeholder="Things to avoid…"
                rows={3}
                className="w-full bg-transparent rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border:     "1px solid rgba(255,255,255,0.06)",
                  color:      "#94a3b8",
                }}
              />
            </div>
          )}

          </>)} {/* end !isKling30Video generic controls */}
          </>)}

          {/* -- Generate button (always visible) ----------------------------- */}
          <button
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: isSubmitting || !canGenerate
                ? "rgba(255,255,255,0.05)"
                : `linear-gradient(135deg, ${hexA(selectedModel.family_color, 0.8)}, ${hexA(selectedModel.family_color, 0.5)})`,
              border:  `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.06)" : hexA(selectedModel.family_color, 0.4)}`,
              color:   isSubmitting || !canGenerate ? "#475569" : "#fff",
              cursor:  isSubmitting || !canGenerate ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Film size={15} />
                <span>
                  {activeTool === "lipsync" ? "Generate Lipsync" : "Generate Video"} ·{" "}
                  <span
                    style={{
                      color: isSubmitting || !canGenerate ? "#64748b" : "#fbb11f",
                      fontWeight: 700,
                    }}
                  >
                    {estimatedCredits} cr
                  </span>
                </span>
                {pendingTasks.size > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>
                    {pendingTasks.size} running
                  </span>
                )}
              </>
            )}
          </button>

        </div>
      </aside>

      {/* ── Media Gallery Picker Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {mediaPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
            onClick={() => setMediaPicker(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y: 0 }}
              exit={{ scale: 0.94,    opacity: 0, y: 8 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{
                width: "min(720px, 92vw)",
                height: "min(540px, 82vh)",
                background: "#0a1220",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 32px 72px rgba(0,0,0,0.85)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  {mediaPicker === "motionVideo"
                    ? <Film size={15} style={{ color: selectedModel.family_color }} />
                    : <ImageIcon size={15} style={{ color: selectedModel.family_color }} />
                  }
                  <span className="text-[14px] font-semibold" style={{ color: "#e2e8f0" }}>
                    {mediaPicker === "motionVideo"
                      ? "Select Video"
                      : mediaPicker === "referenceImages" && isSeedanceV2Model
                        ? `Upload media - ${referenceFileSummary}`
                        : mediaPicker === "referenceImages"
                          ? `Select Reference Image (${referenceFileSummary})`
                          : mediaPicker === "endFrame" ? "Select End Frame" : "Select Start Frame"}
                  </span>
                </div>
                <button
                  onClick={() => setMediaPicker(null)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/08 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <X size={13} style={{ color: "#64748b" }} />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex items-center gap-1 px-5 py-2.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                {/* Upload from device */}
                <button
                  onClick={() => setPickerTab("upload")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: pickerTab === "upload" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${pickerTab === "upload" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                    color:      pickerTab === "upload" ? selectedModel.family_color : "#64748b",
                  }}
                >
                  <Upload size={11} />
                  Device
                </button>
                {/* Generated images */}
                {mediaPicker !== "motionVideo" && (
                  <button
                    onClick={async () => { setPickerTab("images"); await loadPickerAssets("image"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: pickerTab === "images" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                      border:     `1px solid ${pickerTab === "images" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                      color:      pickerTab === "images" ? selectedModel.family_color : "#64748b",
                    }}
                  >
                    <ImageIcon size={11} />
                    Generated Images
                  </button>
                )}
                {/* Generated videos */}
                <button
                  onClick={async () => { setPickerTab("videos"); await loadPickerAssets("video"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: pickerTab === "videos" ? hexA(selectedModel.family_color, 0.15) : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${pickerTab === "videos" ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                    color:      pickerTab === "videos" ? selectedModel.family_color : "#64748b",
                  }}
                >
                  <Film size={11} />
                  Generated Videos
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-4">
                {pickerTab === "upload" ? (
                  /* Device upload zone */
                  <button
                    className="w-full h-full min-h-48 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all hover:border-opacity-60"
                    style={{ borderColor: hexA(selectedModel.family_color, 0.3) }}
                    onClick={async () => {
                      const target = mediaPicker;
                      setMediaPicker(null);
                      if (!target) return;

                      const handled = await pickDeviceFiles(target);
                      if (handled) return;

                      if (target === "startFrame") startFrameRef.current?.click();
                      else if (target === "endFrame") endFrameRef.current?.click();
                      else if (target === "motionVideo") motionVideoRef.current?.click();
                      else if (target === "referenceImages") referenceImagesRef.current?.click();
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: hexA(selectedModel.family_color, 0.1) }}
                    >
                      <Upload size={24} style={{ color: selectedModel.family_color }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[14px] font-semibold" style={{ color: "#e2e8f0" }}>
                        Upload from device
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: "#475569" }}>
                        {mediaPicker === "motionVideo"
                          ? "MP4, MOV, WebM"
                          : mediaPicker === "referenceImages" && isSeedanceV2Model
                            ? "Image, Video or Audio"
                            : "PNG, JPG, WebP"}
                      </p>
                    </div>
                  </button>
                ) : pickerLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 size={24} className="animate-spin" style={{ color: "#475569" }} />
                  </div>
                ) : pickerGallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    {pickerTab === "images"
                      ? <ImageIcon size={32} style={{ color: "#334155" }} />
                      : <Film      size={32} style={{ color: "#334155" }} />
                    }
                    <p className="text-[12px]" style={{ color: "#475569" }}>
                      No {pickerTab === "images" ? "generated images" : "generated videos"} yet
                    </p>
                    <button
                      onClick={() => {
                        setPickerTab("upload");
                      }}
                      className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: hexA(selectedModel.family_color, 0.12),
                        border: `1px solid ${hexA(selectedModel.family_color, 0.3)}`,
                        color: selectedModel.family_color,
                      }}
                    >
                      <Upload size={11} /> Upload from device
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {pickerGallery.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => pickGalleryAsset(asset.url, mediaPicker!)}
                        className="group relative overflow-hidden rounded-xl transition-all ring-0 hover:ring-2"
                        style={{
                          aspectRatio: "1",
                          // @ts-expect-error ring color
                          "--tw-ring-color": selectedModel.family_color,
                          ringColor: selectedModel.family_color,
                        }}
                      >
                        {asset.type === "video" ? (
                          <video
                            src={asset.url}
                            muted
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.url}
                            alt="Gallery asset"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          style={{ background: hexA(selectedModel.family_color, 0.35) }}
                        >
                          <CheckCircle2 size={22} style={{ color: "#fff" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Mobile Bottom Tool Bar (lg:hidden) -------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-0 border-t lg:hidden" style={{ background: "#050a14", borderColor: "rgba(255,255,255,0.08)", height: 60 }}>
        <div className="flex-1 flex items-center gap-0 overflow-x-auto scrollbar-none px-2">
          {TOOLS.map(t => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all"
                style={{ minWidth: 52, color: active ? "#06b6d4" : "#475569" }}
              >
                <t.icon size={16} />
                <span className="text-[9px] font-medium leading-tight whitespace-nowrap" style={{ maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setMobileSettingsOpen(true)}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 h-full border-l"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
        >
          <Settings size={18} />
          <span className="text-[9px] font-medium">Settings</span>
        </button>
      </div>

      {/* -- Mobile Settings Overlay (lg:hidden) -------------------------------- */}
      <AnimatePresence>
        {mobileSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setMobileSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto"
              style={{ background: "#050a14", maxHeight: "85vh", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="text-sm font-semibold text-white">Model Settings</span>
                <button onClick={() => setMobileSettingsOpen(false)} className="p-1 rounded-lg" style={{ color: "#64748b" }}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-4 py-4">
                {/* Model selector button */}
                <div className="mb-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Model</label>
                  <button
                    onClick={() => { setModelOpen(true); setMobileSettingsOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: hexA(selectedModel.family_color, 0.08), border: `1px solid ${hexA(selectedModel.family_color, 0.3)}`, color: "#e2e8f0" }}
                  >
                    <span className="text-sm font-medium">{selectedModel.name}</span>
                    {bStyle && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bStyle.bg, color: bStyle.text }}>{selectedModel.badge}</span>
                    )}
                  </button>
                </div>

                {/* Duration */}
                {durationChoices.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Duration</label>
                    <div className="flex flex-wrap gap-2">
                      {durationChoices.map(d => (
                        <button key={d} onClick={() => setDuration(d)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ background: duration === d ? hexA(selectedModel.family_color, 0.2) : "rgba(255,255,255,0.04)", color: duration === d ? selectedModel.family_color : "#64748b", border: `1px solid ${duration === d ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.06)"}` }}
                        >{d}s</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aspect ratio */}
                {effectiveAspectRatios.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {effectiveAspectRatios.map(r => (
                        <button key={r} onClick={() => setAspectRatio(r)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ background: (aspectRatio || effectiveAspectRatios[0]) === r ? hexA(selectedModel.family_color, 0.2) : "rgba(255,255,255,0.04)", color: (aspectRatio || effectiveAspectRatios[0]) === r ? selectedModel.family_color : "#64748b", border: `1px solid ${(aspectRatio || effectiveAspectRatios[0]) === r ? hexA(selectedModel.family_color, 0.4) : "rgba(255,255,255,0.06)"}` }}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference Images (mobile) */}
                {(showReferenceImages || showSimpleKlingRefs) && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>
                      {isSeedanceV2Model ? "Reference Media" : "Reference Images"}
                    </label>
                    <button
                      onClick={() => { setMobileSettingsOpen(false); openMediaPicker("referenceImages"); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                      style={{
                        background: referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                        border: `1px solid ${referenceImages.length > 0 ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                        color: referenceImages.length > 0 ? selectedModel.family_color : "#64748b",
                      }}
                    >
                      <ImageIcon size={14} />
                      <span className="text-sm font-medium">
                        {referenceImages.length > 0
                          ? referenceFileSummary
                          : isSeedanceV2Model ? "Add reference media" : "Add reference images"
                        }
                      </span>
                      {referenceImages.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setReferenceImages([]); }}
                          className="ml-auto"
                        >
                          <X size={13} style={{ color: "#64748b" }} />
                        </button>
                      )}
                    </button>
                    {showSimpleKlingRefs && (
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                        Use @image1, @image2, @image3 in your prompt
                      </p>
                    )}
                    {isSeedanceV2Model && referenceImages.length > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                        @Image1..@Image9 follow image reference order only.
                      </p>
                    )}
                  </div>
                )}

                {/* Start Frame (mobile) */}
                {(showImageInput || showEndFrame) && !showVideoInput && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Image Input</label>
                    <div className="flex gap-2">
                      {showImageInput && (
                        <button
                          onClick={() => { setMobileSettingsOpen(false); openMediaPicker("startFrame"); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                          style={{
                            background: startFrame ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                            border: `1px solid ${startFrame ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                            color: startFrame ? selectedModel.family_color : "#64748b",
                          }}
                        >
                          <ImageIcon size={14} />
                          <span className="text-[12px] font-medium truncate">
                            {startFrame ? "Uploaded" : "Start frame"}
                          </span>
                        </button>
                      )}
                      {showEndFrame && (
                        <button
                          onClick={() => { setMobileSettingsOpen(false); openMediaPicker("endFrame"); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                          style={{
                            background: endFrame ? hexA(selectedModel.family_color, 0.1) : "rgba(255,255,255,0.04)",
                            border: `1px solid ${endFrame ? hexA(selectedModel.family_color, 0.35) : "rgba(255,255,255,0.06)"}`,
                            color: endFrame ? selectedModel.family_color : "#64748b",
                          }}
                        >
                          <ImageIcon size={14} />
                          <span className="text-[12px] font-medium truncate">
                            {endFrame ? "Uploaded" : "End frame"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Input (mobile, lipsync only) */}
                {activeTool === "lipsync" && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>Voice / Audio</label>
                    {lipsyncAudioFile ? (
                      <div className="relative rounded-xl p-3 border border-white/10 bg-black/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Music2 size={16} className="text-[#06b6d4] flex-shrink-0" />
                            <span className="text-xs text-slate-300 font-medium truncate min-w-0">
                              {lipsyncAudioFile.name}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setLipsyncAudioFile(null);
                            }}
                            className="p-1 rounded bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {lipsyncAudioPreview && (
                          <audio
                            src={lipsyncAudioPreview}
                            controls
                            className="w-full h-8 mt-1 rounded bg-black/30 overflow-hidden text-xs"
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          ref={lipsyncAudioRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setLipsyncAudioFile(file);
                          }}
                          accept="audio/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => lipsyncAudioRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            color: "#64748b",
                          }}
                        >
                          <Music2 size={14} />
                          <span className="text-sm font-medium">Add audio file</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Credits estimate */}
                <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xs" style={{ color: "#475569" }}>Estimated cost</span>
                  <span className="text-sm font-semibold" style={{ color: selectedModel.family_color }}>{estimatedCredits} credits</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Inspector Modal */}
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
        onSelectPalette={(pal) => setSelectedPalette(pal)}
        onAttachFile={(file) => {
          const targetUrl = file.url.startsWith("blob:") || file.url.startsWith("data:")
            ? file.url
            : `/api/proxy-image?url=${encodeURIComponent(file.url)}`;
          fetch(targetUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const f = new File([blob], `${file.name || "ref"}.jpg`, { type: "image/jpeg" });
              setReferenceImages((prev) => [...prev, f]);
            })
            .catch((err) => console.error("Failed to attach reference file:", err));
        }}
        isAr={lang === "ar"}
      />
    </div>
  );
}

// -- Export --------------------------------------------------------------------

export default function VideoPage() {
  return (
    <Suspense>
      <VideoPageInner />
    </Suspense>
  );
}

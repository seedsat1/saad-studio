"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion";
import {
  Play, ChevronRight, ChevronLeft, ImageIcon, VideoIcon, Music,
  Scissors, Wand2, ScanFace, Sparkles, Zap, Star, Layers,
  Clapperboard, Mic2, Bot, TrendingUp, Palette, Film,
  ArrowRight, Volume2, Aperture, PenTool, X, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageLayout } from "@/lib/use-page-layout";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";
import { usePromoContent } from "@/hooks/use-promo-content";
import { useCmsData } from "@/lib/use-cms-data";
import { normalizeMediaUrl } from "@/lib/storage";
import { useLanguage } from "@/lib/use-language";

function useHomeTranslation() {
  const { lang } = useLanguage();
  const t = useCallback((key: string): string => {
    if (lang !== "ar") return key;
    const dict: Record<string, string> = {
      // Hero Section
      "AI Creative Production Suite": "مجموعة الإنتاج الإبداعي بالذكاء الاصطناعي",
      "AI Creative Production Platform": "منصة الإنتاج الإبداعي بالذكاء الاصطناعي",
      "Direct Cinematic": "حول أفكارك إلى",
      "Worlds with": "عوالم سينمائية بـ",
      "AI": "الذكاء الاصطناعي",
      "Explore Our Craft": "استكشف أعمالنا",
      "View Plans": "عرض الخطط",
      "Pioneering future-forward visuals through advanced AI-driven creation for film, media, and brands. Generate high-fidelity images, cinematic videos, custom audio, and manage the entire workflow in one seamless canvas.":
        "ريادة البصريات المستقبلية من خلال ابتكار متقدم مدفوع بالذكاء الاصطناعي للأفلام والإعلام والعلامات التجارية. قم بتوليد صور عالية الدقة، وفيديوهات سينمائية، وصوتيات مخصصة، وإدارة مسار العمل بالكامل في مساحة عمل واحدة سلسة.",

      // Hero Mockup Card 1
      "Next Scene Still": "لقطة المشهد القادم",
      "Mastering the Unseen": "إتقان غير المرئي",
      "Stunning fidelity visuals of actual work, cinematic video visual creation. AI generation with optimized workflows.":
        "مرئيات مذهلة فائقة الدقة للعمل الفعلي، وابتكار بصرى للفيديو السينمائي. توليد بالذكاء الاصطناعي مع مسارات عمل محسنة.",

      // Hero Mockup Card 2
      "Narrative Short": "فيلم روائي قصير",
      "Aethoria: AI Narrative Short": "إيثوريا: فيلم روائي قصير بالذكاء الاصطناعي",
      "Pioneering future-forward visuals through advanced AI-driven creation for film, media, and brands.":
        "ريادة البصريات المستقبلية من خلال ابتكار متقدم مدفوع بالذكاء الاصطناعي للأفلام والإعلام والعلامات التجارية.",

      // Hero Mockup Card 3
      "Saad Studio Edit v1.2": "سعد ستوديو إيديت v1.2",
      "1080p @ 24fps": "1080p @ 24fps",
      "Production Mode": "وضع الإنتاج",
      "Active Model": "النموذج النشط",
      "Google Gemini Omni Flash": "جوجل جيميناي أومني فلاش",
      "Audio Engine": "محرك الصوت",
      "Google Lyria Music": "موسيقى جوجل ليريا",
      "Generation ID": "معرف التوليد",
      "Video 1": "فيديو 1",
      "Video 2": "فيديو 2",
      "Audio 1": "صوت 1",
      "Cinematic Music SFX": "مؤثرات وموسيقى سينمائية",

      // Section Headings
      "Choose your studio": "اختر الاستوديو الخاص بك",
      "Open Explore": "فتح الاستكشاف",
      "Built for real outputs": "مصمم لمخرجات حقيقية",
      "Production workflow": "مسار عمل الإنتاج",
      "From idea to publish-ready creative in one place.": "من الفكرة إلى إنتاج جاهز للنشر في مكان واحد.",
      "Move between images, video, character, audio, scene tools, and app utilities without losing the creative thread.":
        "تنقل بين الصور، الفيديو، الشخصيات، الصوت، أدوات المشاهد، والتطبيقات المساعدة دون فقدان الفكرة الإبداعية.",
      "Browse tools": "تصفح الأدوات",
      "Featured model drops": "أحدث نماذج الذكاء الاصطناعي",
      "View Explore": "عرض الاستكشاف",
      "85+ Apps — One Studio": "أكثر من 85 تطبيقًا في استوديو واحد",
      "Browse All": "تصفح الكل",
      "Powered by Industry-Leading AI": "مدعوم من رائدات الذكاء الاصطناعي في المجال",
      "Featured": "مميز",
      "Compliance & Company Overview": "الامتثال ونظرة عامة على الشركة",
      "Saad Studio is a software-as-a-service creative production platform. The product combines multiple AI models and focused studio workflows so users can generate images, create videos, build consistent characters, edit media, produce audio, and manage creative projects from one browser-based workspace. This website includes public product information, company details, contact information, pricing, privacy, and terms for program review.":
        "سعد ستوديو هو منصة برمجية كخدمة (SaaS) للإنتاج الإبداعي. يدمج المنتج العديد من نماذج الذكاء الاصطناعي ومسارات عمل الاستوديو المخصصة لتمكين المستخدمين من توليد الصور، وإنشاء الفيديوهات، وبناء شخصيات متسقة، وتعديل الوسائط، وإنتاج الصوت، وإدارة المشاريع الإبداعية من مساحة عمل واحدة تعتمد على المتصفح. يتضمن هذا الموقع معلومات عامة عن المنتج، وتفاصيل الشركة، ومعلومات الاتصال، والأسعار، وسياسة الخصوصية، والشروط لمراجعة البرنامج.",
      "Company: Saad Studio": "الشركة: سعد ستوديو",
      "Contact: support@saadstudio.app | 009647755815500": "الاتصال: support@saadstudio.app | 009647755815500",
      "Type: AI Creative Production SaaS": "النوع: منصة إنتاج إبداعي بالذكاء الاصطناعي (SaaS)",
      "About": "من نحن",
      "Contact": "اتصل بنا",
      "Privacy": "الخصوصية",
      "Terms": "الشروط",

      // Pathways
      "Image Studio": "استوديو الصور",
      "High-detail images, ads, portraits, product visuals, and edits.": "صور عالية التفاصيل، إعلانات، بورتريهات، بصريات المنتجات، والتعديلات.",
      "Video Studio": "استوديو الفيديو",
      "Generate cinematic motion, character shots, and social clips.": "توليد حركة سينمائية، لقطات شخصيات، ومقاطع وسائط اجتماعية.",
      "AI Canvas": "اللوحة الذكية",
      "Build complete creative workflows from one visual workspace.": "بناء مسارات عمل إبداعية كاملة من مساحة عمل بصرية واحدة.",
      "Next Scene": "المشهد التالي",
      "Direct scenes, storyboards, shots, and cinematic worlds.": "إخراج المشاهد، لوحات العمل، اللقطات، والعوالم السينمائية.",
      "Character": "الشخصيات",
      "Create consistent characters for brands, stories, and campaigns.": "إنشاء شخصيات متسقة للعلامات التجارية، القصص، والحملات.",
      "Apps": "التطبيقات",
      "Specialized tools for edit, audio, relight, transitions, and more.": "أدوات متخصصة للتعديل، الصوت، إعادة الإضاءة، الانتقالات، والمزيد.",

      // Showcase
      "Campaign visuals": "مرئيات الحملات",
      "Cinematic models": "نماذج سينمائية",
      "Scene engine": "محرك المشاهد",
      "Transitions": "الانتقالات",
      "Nano Banana": "نانو بنانا",
      "Canvas workflow": "مسار عمل اللوحة",
      "Kling 3.0": "كلينج 3.0",

      // Workflow Steps
      "Start": "البداية",
      "Pick a studio path": "اختر مسار الاستوديو",
      "Generate": "التوليد",
      "Use the right model": "استخدم النموذج المناسب",
      "Shape": "التشكيل والتعديل",
      "Edit, relight, upscale": "تعديل، إضاءة، ترقية الدقة",
      "Publish": "النشر",
      "Move into video or scene": "الانتقال إلى فيديو أو مشهد",

      // Stats
      "Image Models": "نماذج الصور",
      "GPT Image, FLUX, Imagen 4 & more": "GPT Image و FLUX و Imagen 4 والمزيد",
      "Video Engines": "محركات الفيديو",
      "Kling, Sora, Veo, Seedance & more": "كلينج وسورا وفيو وسيدانس والمزيد",
      "AI Tools": "أدوات الذكاء الاصطناعي",
      "Image, Video, Audio, 3D, Edit": "الصور، الفيديو، الصوت، ثلاثي الأبعاد، التعديل",
      "Subscription Plans": "خطط الاشتراك",
      "Starter, Plus, Pro, Max": "مبتدئ، بلس، برو، ماكس",

      // Model Spotlights
      "GPT Image 2": "GPT Image 2",
      "Canvas": "اللوحة الإبداعية",
      "Seedance 2": "سيدانس 2",

      // Core Tools
      "Create Image": "إنشاء صور",
      "Generate stunning visuals with 19 AI models": "توليد بصريات مذهلة باستخدام 19 نموذج ذكاء اصطناعي",
      "Create Video": "إنشاء فيديو",
      "Text-to-video with 13 production engines": "نص إلى فيديو باستخدام 13 محرك إنتاج",
      "Next Scene Video": "فيديو المشهد القادم",
      "Professional cinematic AI production": "إنتاج سينمائي احترافي بالذكاء الاصطناعي",
      "Lipsync Studio": "استوديو مزامنة الشفاه",
      "Audio-driven facial animation engine": "محرك تحريك الوجه المدفوع بالصوت",
      "Vibe Motion": "فايب موشن",
      "Music-synced dynamic video edits": "تعديلات فيديو ديناميكية متزامنة مع الموسيقى",
      "Draw to Video": "رسم إلى فيديو",
      "Animate sketched concepts into motion": "تحريك المفاهيم المرسومة إلى حركة فعلية",

      // Top Choice
      "Relight": "إعادة الإضاءة",
      "Relight any image with AI precision": "إعادة إضاءة أي صورة بدقة الذكاء الاصطناعي",
      "Face Swap": "تبديل الوجوه",
      "Swap faces with pixel-perfect accuracy": "تبديل الوجوه بدقة بكسل مثالية",
      "UGC Factory": "مصنع UGC",
      "User-generated content simulator": "محاكي المحتوى المصمم بواسطة المستخدم",
      "Video Upscale": "ترقية دقة الفيديو",
      "Enhance resolution to 4K / 8K": "تحسين دقة الوضوح إلى 4K / 8K",
      "Character Swap": "تبديل الشخصيات",
      "Transform any character seamlessly": "تحويل أي شخصية بسلاسة تامة",

      // Apps marquee
      "AI Chat": "المحادثة الذكية",
      "Upscaler": "ترقية الدقة",
      "Avatar Gen": "توليد الأفاتار",
      "BG Remover": "إزالة الخلفية",
      "Ad Creator": "صانع الإعلانات",
      "Logo Maker": "صانع الشعارات",
      "Story AI": "قصص الذكاء الاصطناعي",
      "QR Art": "فن الـ QR",
      "Denoiser": "مزيل الضوضاء",
      "Meme Studio": "استوديو الميمز",
      "Comic Gen": "توليد الكوميكس",
      "Style Transfer": "نقل الأسلوب الفني",
      "Smart Crop": "القص الذكي",
      "Trend AI": "تريند AI",
      "Portrait AI": "بورتريه AI",
      "Sprite Gen": "توليد Sprite",
      "NPC Creator": "صانع الـ NPC"
    };
    return dict[key] || key;
  }, [lang]);

  return { lang, t };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Badge = "NEW" | "PRO" | "TOP" | "HOT" | "";

type ToolCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge: Badge;
  gradient: string;
  accentColor: string;
  image?: string;
};

type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  gradient: string;
  accentFrom: string;
  accentTo: string;
  ctaHref: string;
  bgImage: string;
  trailerUrl?: string;
  youtubeUrl?: string;
};

const isVideoUrl = (url?: string) => Boolean(url && /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url));

function stablePositiveIntFromString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  const n = hash >>> 0;
  return (n % 1_000_000_000) + 1;
}

function safeParseJsonObject(input: string | null | undefined): Record<string, unknown> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

const TOOL_CARD_VIDEOS: Record<string, string> = {
  "create-image": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "create-video": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "cinema-studio": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "lipsync": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "vibe-motion": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "draw-to-video": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  relight: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "face-swap": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "ugc-factory": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  upscale: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "char-swap": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  default: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
};

const AD_CARD_VIDEOS = [
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
];

const getToolCardVideo = (card: ToolCard) => {
  if (isVideoUrl(card.image)) return card.image as string;
  return TOOL_CARD_VIDEOS[card.id] || TOOL_CARD_VIDEOS.default;
};

const getToolCardMedia = (card: ToolCard) => {
  if (card.image) return card.image;
  return getToolCardVideo(card);
};

function MediaFill({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const normalizedSrc = normalizeMediaUrl(src) || "";
  if (isVideoUrl(normalizedSrc)) {
    return (
      <video
        src={normalizedSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 h-full w-full object-cover object-center", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedSrc}
      alt={alt}
      className={cn("absolute inset-0 h-full w-full object-cover object-center", className)}
    />
  );
}

// ─── Hero Slides ──────────────────────────────────────────────────────────────
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: "Next Scene Engine",
    subtitle: "Direct cinematic worlds with AI — from concept to final cut in minutes.",
    tag: "New Release",
    gradient: "from-slate-950 via-violet-950/60 to-slate-950",
    accentFrom: "from-violet-500",
    accentTo: "to-indigo-500",
    ctaHref: "/cinema-studio",
    bgImage: "/landing/hero-1.jpg",
  },
  {
    id: 2,
    title: "Zephyr Original Series",
    subtitle: "AI-generated episodic content with consistent characters & cinematic audio.",
    tag: "Original",
    gradient: "from-slate-950 via-rose-950/50 to-slate-950",
    accentFrom: "from-rose-500",
    accentTo: "to-pink-500",
    ctaHref: "/original-series",
    bgImage: "/landing/hero-2.jpg",
  },
  {
    id: 3,
    title: "Image Studio 4K",
    subtitle: "19 world-class models. One canvas. Zero limits.",
    tag: "Top Choice",
    gradient: "from-slate-950 via-cyan-950/50 to-slate-950",
    accentFrom: "from-cyan-500",
    accentTo: "to-sky-500",
    ctaHref: "/image",
    bgImage: "/landing/hero-3.jpg",
  },
  {
    id: 4,
    title: "Nano Banana Pro",
    subtitle: "Our fastest, sharpest proprietary image model. Now in 4K.",
    tag: "Exclusive",
    gradient: "from-slate-950 via-amber-950/50 to-slate-950",
    accentFrom: "from-amber-400",
    accentTo: "to-orange-500",
    ctaHref: "/image?model=nano-banana-pro",
    bgImage: "/landing/hero-4.jpg",
  },
];

// ─── Core Tools ───────────────────────────────────────────────────────────────
const CORE_TOOLS: ToolCard[] = [
  {
    id: "create-image",
    title: "Create Image",
    description: "Generate stunning visuals with 19 AI models",
    href: "/image",
    icon: ImageIcon,
    badge: "TOP",
    gradient: "from-pink-600/40 via-violet-700/30 to-indigo-900/60",
    accentColor: "text-pink-400",
    image: "/landing/tool-create-image.png",
  },
  {
    id: "create-video",
    title: "Create Video",
    description: "Text-to-video with 13 production engines",
    href: "/video",
    icon: VideoIcon,
    badge: "NEW",
    gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60",
    accentColor: "text-orange-400",
    image: "/landing/tool-create-video.png",
  },
  {
    id: "cinema-studio",
    title: "Next Scene Video",
    description: "Professional cinematic AI production",
    href: "/cinema-studio",
    icon: Clapperboard,
    badge: "PRO",
    gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60",
    accentColor: "text-violet-400",
    image: "/landing/tool-cinema.png",
  },
  {
    id: "lipsync",
    title: "Lipsync Studio",
    description: "Audio-driven facial animation engine",
    href: "/video",
    icon: Mic2,
    badge: "",
    gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60",
    accentColor: "text-rose-400",
    image: "/landing/tool-lipsync.png",
  },
  {
    id: "vibe-motion",
    title: "Vibe Motion",
    description: "Music-synced dynamic video edits",
    href: "/video",
    icon: Music,
    badge: "",
    gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60",
    accentColor: "text-emerald-400",
    image: "/landing/tool-vibe-motion.png",
  },
  {
    id: "draw-to-video",
    title: "Draw to Video",
    description: "Animate sketched concepts into motion",
    href: "/video",
    icon: PenTool,
    badge: "",
    gradient: "from-fuchsia-600/40 via-violet-700/30 to-indigo-900/60",
    accentColor: "text-fuchsia-400",
    image: "/landing/tool-draw-video.png",
  },
];

// ─── Top Choice ───────────────────────────────────────────────────────────────
const TOP_CHOICE: ToolCard[] = [
  {
    id: "relight",
    title: "Relight",
    description: "Relight any image with AI precision",
    href: "/image",
    icon: Aperture,
    badge: "NEW",
    gradient: "from-yellow-500/40 via-amber-600/30 to-orange-900/60",
    accentColor: "text-yellow-400",
    image: "/landing/tool-relight.png",
  },
  {
    id: "face-swap",
    title: "Face Swap",
    description: "Swap faces with pixel-perfect accuracy",
    href: "/image",
    icon: ScanFace,
    badge: "TOP",
    gradient: "from-rose-500/40 via-pink-600/30 to-fuchsia-900/60",
    accentColor: "text-rose-400",
    image: "/landing/tool-face-swap.png",
  },
  {
    id: "ugc-factory",
    title: "UGC Factory",
    description: "User-generated content simulator",
    href: "/video",
    icon: Film,
    badge: "HOT",
    gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60",
    accentColor: "text-indigo-400",
    image: "/landing/tool-ugc-factory.png",
  },
  {
    id: "upscale",
    title: "Video Upscale",
    description: "Enhance resolution to 4K / 8K",
    href: "/video",
    icon: Zap,
    badge: "",
    gradient: "from-teal-500/40 via-emerald-600/30 to-cyan-900/60",
    accentColor: "text-teal-400",
    image: "/landing/tool-upscale.png",
  },
  {
    id: "char-swap",
    title: "Character Swap",
    description: "Transform any character seamlessly",
    href: "/image",
    icon: Layers,
    badge: "",
    gradient: "from-purple-500/40 via-violet-600/30 to-indigo-900/60",
    accentColor: "text-purple-400",
    image: "/landing/tool-char-swap.png",
  },
];

// ─── Apps Marquee ─────────────────────────────────────────────────────────────
const APPS_MARQUEE = [
  { title: "AI Chat", icon: Bot, color: "text-violet-400" },
  { title: "Upscaler", icon: Zap, color: "text-amber-400" },
  { title: "Avatar Gen", icon: ScanFace, color: "text-pink-400" },
  { title: "BG Remover", icon: Scissors, color: "text-cyan-400" },
  { title: "Ad Creator", icon: TrendingUp, color: "text-orange-400" },
  { title: "Logo Maker", icon: Sparkles, color: "text-lime-400" },
  { title: "Story AI", icon: Wand2, color: "text-rose-400" },
  { title: "QR Art", icon: Aperture, color: "text-teal-400" },
  { title: "Denoiser", icon: Layers, color: "text-blue-400" },
  { title: "Meme Studio", icon: Film, color: "text-fuchsia-400" },
  { title: "Comic Gen", icon: PenTool, color: "text-yellow-400" },
  { title: "3D Avatar", icon: Clapperboard, color: "text-indigo-400" },
  { title: "Style Transfer", icon: Palette, color: "text-emerald-400" },
  { title: "Smart Crop", icon: Scissors, color: "text-sky-400" },
  { title: "Trend AI", icon: TrendingUp, color: "text-red-400" },
  { title: "Portrait AI", icon: ScanFace, color: "text-purple-400" },
  { title: "Sprite Gen", icon: Sparkles, color: "text-green-400" },
  { title: "NPC Creator", icon: Bot, color: "text-amber-300" },
];

const AI_MODELS = [
  { name: "Kling 3.0",      tag: "Video",  color: "text-violet-400",  ring: "ring-violet-500/30"  },
  { name: "OpenAI Sora",    tag: "Video",  color: "text-sky-400",     ring: "ring-sky-500/30"     },
  { name: "Alibaba WAN",    tag: "Video",  color: "text-orange-400",  ring: "ring-orange-500/30"  },
  { name: "Google Veo 3",   tag: "Video",  color: "text-blue-400",    ring: "ring-blue-500/30"    },
  { name: "MiniMax",        tag: "Video",  color: "text-rose-400",    ring: "ring-rose-500/30"    },
  { name: "Seedance 2.0",   tag: "Video",  color: "text-teal-400",    ring: "ring-teal-500/30"    },
  { name: "FLUX.2",         tag: "Image",  color: "text-violet-300",  ring: "ring-violet-400/30"  },
  { name: "GPT Image 1.5",  tag: "Image",  color: "text-emerald-400", ring: "ring-emerald-500/30" },
  { name: "Google Imagen 4",tag: "Image",  color: "text-cyan-400",    ring: "ring-cyan-500/30"    },
  { name: "Nano Banana Pro", tag: "Image", color: "text-amber-400",   ring: "ring-amber-500/30"   },
];

// ─── Badge chip ───────────────────────────────────────────────────────────────
function BadgeChip({ badge }: { badge: Badge }) {
  if (!badge) return null;
  const styles: Record<NonNullable<Badge>, string> = {
    NEW: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    PRO: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
    TOP: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
    HOT: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
    "":  "",
  };
  return (
    <span className={cn(
      "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider ring-1",
      styles[badge]
    )}>
      {badge}
    </span>
  );
}

// ─── Tool Card (shared by Core Tools + Top Choice) ────────────────────────────
function ToolCardItem({ card, wide = false }: { card: ToolCard; wide?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const Icon = card.icon;
  const mediaSrc = getToolCardMedia(card);
  const { t } = useHomeTranslation();
  return (
    <Link href={card.href}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "group relative overflow-hidden rounded-3xl border border-white/[0.04] bg-zinc-950/30 backdrop-blur-sm hover:bg-zinc-950/50 hover:border-white/[0.12] transition-all duration-300 cursor-pointer select-none shadow-xl shadow-black/20",
          wide ? "w-[280px] aspect-[16/9]" : "aspect-[4/3]"
        )}
      >
        {/* BG media + gradient overlay */}
        <MediaFill src={mediaSrc} alt={t(card.title)} />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
          card.gradient,
          hovered ? "opacity-40" : "opacity-60"
        )} />

        {/* Top-right play icon on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md"
            >
              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-black/50 p-2 ring-1 ring-white/10 backdrop-blur-md">
              <Icon className={cn("h-4 w-4 shrink-0", card.accentColor)} />
            </div>
            <BadgeChip badge={card.badge} />
          </div>
          <div className="mt-2.5">
            <p className="font-bold text-white text-sm leading-tight tracking-tight">{t(card.title)}</p>
            <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1 leading-normal">{t(card.description)}</p>
          </div>
        </div>

        {/* Hover border glow */}
        <motion.div
          animate={hovered ? { opacity: 1 } : { opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/20 transition-opacity"
        />
      </motion.div>
    </Link>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, cta, ctaHref }: { title: string; cta?: string; ctaHref?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      {cta && ctaHref && (
        <Link href={ctaHref} className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group">
          {cta}
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 1. Cinematic Hero Workspace ───────────────────────────────────────────────
function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useHomeTranslation();
  
  return (
    <section className="relative w-full overflow-hidden bg-[#02050c] pt-24 pb-16 lg:pt-32">
      {/* Immersive background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-[600px] w-[600px] rounded-full bg-violet-900/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-900/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.15) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Main Text Copy */}
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] bg-white/5 border border-white/10 text-cyan-300 mb-6">
            <Sparkles className="h-3 w-3 animate-pulse" />
            {t("AI Creative Production Suite")}
          </div>
          
          <h1 
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={cn(
              "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]",
              lang === "ar" ? "leading-[1.35]" : "leading-[0.92]"
            )}
          >
            {lang === "ar" ? (
              <>
                حول أفكارك إلى عوالم سينمائية <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">بالذكاء الاصطناعي</span>
              </>
            ) : (
              <>
                Direct Cinematic <br />
                Worlds with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">AI</span>
              </>
            )}
          </h1>
          
          <p 
            dir={lang === "ar" ? "rtl" : "ltr"}
            className="mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-zinc-300 text-center"
          >
            {t("Pioneering future-forward visuals through advanced AI-driven creation for film, media, and brands. Generate high-fidelity images, cinematic videos, custom audio, and manage the entire workflow in one seamless canvas.")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/explore">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/10 hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
              >
                <Zap className="h-4 w-4" />
                {t("Explore Our Craft")}
              </motion.button>
            </Link>
            
            <Link href="/pricing">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/10 transition"
              >
                {t("View Plans")}
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Floating Node Canvas (Desktop View) */}
        <div ref={containerRef} className="relative w-full min-h-[640px] mt-16 hidden lg:block select-none">
          {/* SVG Connection Paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyan-violet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="violet-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Glowing lines from cards to timeline */}
            {/* Mastering the Unseen -> Timeline track 1 */}
            <motion.path
              d="M 310 160 C 450 160, 480 320, 680 320"
              stroke="url(#cyan-violet)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="8 6"
              animate={{ strokeDashoffset: [-28, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            {/* Aethoria Still -> Timeline track 2 */}
            <motion.path
              d="M 330 460 C 480 460, 500 370, 680 370"
              stroke="url(#violet-cyan)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="8 6"
              animate={{ strokeDashoffset: [28, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            
            {/* Soft Ambient glowing dots on path terminals */}
            <circle cx="680" cy="320" r="4" fill="#06b6d4" className="animate-ping" />
            <circle cx="680" cy="370" r="4" fill="#8b5cf6" className="animate-ping" />
          </svg>

          {/* Card 1: Mastering the Unseen (Top Left) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute top-4 left-0 w-[310px] rounded-3xl border border-white/[0.05] bg-zinc-950/20 backdrop-blur-lg p-4 shadow-xl shadow-black/30 z-10 animate-fade"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
              <Image src="/landing/hero-1.jpg" alt="Mastering the Unseen" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute top-2 left-2 rounded-md bg-cyan-500/20 text-cyan-300 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 ring-1 ring-cyan-500/30 backdrop-blur-sm">
                {t("Next Scene Still")}
              </span>
            </div>
            <div className="mt-3.5">
              <h4 className="text-sm font-bold text-white tracking-tight">{t("Mastering the Unseen")}</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                {t("Stunning fidelity visuals of actual work, cinematic video visual creation. AI generation with optimized workflows.")}
              </p>
            </div>
          </motion.div>

          {/* Card 2: Aethoria (Bottom Left) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute bottom-4 left-6 w-[330px] rounded-3xl border border-white/[0.05] bg-zinc-950/20 backdrop-blur-lg p-4 shadow-xl shadow-black/30 z-10"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
              <Image src="/landing/hero-2.jpg" alt="Aethoria: AI Narrative Short" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute top-2 left-2 rounded-md bg-violet-500/20 text-violet-300 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 ring-1 ring-violet-500/30 backdrop-blur-sm">
                {t("Narrative Short")}
              </span>
            </div>
            <div className="mt-3.5">
              <h4 className="text-sm font-bold text-white tracking-tight">{t("Aethoria: AI Narrative Short")}</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                {t("Pioneering future-forward visuals through advanced AI-driven creation for film, media, and brands.")}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Video Editor Timeline Mockup (Center Right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="absolute top-0 right-0 w-[700px] h-[480px] rounded-[32px] border border-white/[0.05] bg-zinc-950/30 backdrop-blur-xl p-5 shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-10 group"
          >
            {/* Top Bar / Interface Details */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5 text-[10px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </span>
                <span className="font-bold text-zinc-400">{t("Saad Studio Edit v1.2")}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>{t("1080p @ 24fps")}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] text-white">{t("Production Mode")}</span>
              </div>
            </div>

            {/* Video Preview Panel */}
            <div className="flex-1 grid grid-cols-[1.4fr_1fr] gap-4 py-4 min-h-0">
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/[0.05] shadow-inner bg-black">
                <Image src="/landing/hero-3.jpg" alt="Video Preview" fill className="object-cover opacity-90" unoptimized />
                <div className="absolute inset-0 bg-black/10" />
                {/* Playhead Overlay */}
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                  01:45:06:21
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur text-white shadow-xl shadow-black/20">
                  <Play className="h-5 w-5 fill-white ml-0.5" />
                </div>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-[10px] space-y-1">
                  <span className="font-bold text-cyan-400 uppercase tracking-wider text-[8px]">{t("Active Model")}</span>
                  <p className="font-semibold text-white">{t("Google Gemini Omni Flash")}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-[10px] space-y-1">
                  <span className="font-bold text-violet-400 uppercase tracking-wider text-[8px]">{t("Audio Engine")}</span>
                  <p className="font-semibold text-white">{t("Google Lyria Music")}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-[10px] space-y-1">
                  <span className="font-bold text-zinc-400 uppercase tracking-wider text-[8px]">{t("Generation ID")}</span>
                  <p className="text-zinc-500 font-mono">gen_omni_788219x</p>
                </div>
              </div>
            </div>

            {/* Timeline Tracks Mockup */}
            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-2">
              {/* Playhead Marker Rail */}
              <div className="relative h-4 text-[9px] text-zinc-500 border-b border-white/[0.03]">
                <div className="absolute left-[40%] -top-1 px-1.5 py-0.5 rounded bg-cyan-500 text-black font-bold text-[8px] z-20">
                  01:45
                </div>
                <div className="absolute left-[40%] top-3 bottom-[-90px] w-0.5 bg-cyan-500/70 shadow-[0_0_10px_#06b6d4] z-20" />
                <span className="absolute left-0">0:00</span>
                <span className="absolute left-[20%]">0:30</span>
                <span className="absolute left-[40%]">1:00</span>
                <span className="absolute left-[60%]">1:30</span>
                <span className="absolute left-[80%]">2:00</span>
              </div>
              
              {/* Video Track 1 */}
              <div className="flex gap-2 items-center text-[9px] text-zinc-400">
                <span className="w-14 font-semibold text-right shrink-0">{t("Video 1")}</span>
                <div className="flex-1 h-7 rounded-lg border border-white/[0.04] bg-white/[0.01] relative overflow-hidden">
                  <div className="absolute top-0.5 bottom-0.5 left-[10%] right-[55%] rounded-md bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border border-cyan-500/30 flex items-center px-2 text-cyan-200 font-bold overflow-hidden">
                    {t("Mastering the Unseen")}
                  </div>
                </div>
              </div>

              {/* Video Track 2 */}
              <div className="flex gap-2 items-center text-[9px] text-zinc-400">
                <span className="w-14 font-semibold text-right shrink-0">{t("Video 2")}</span>
                <div className="flex-1 h-7 rounded-lg border border-white/[0.04] bg-white/[0.01] relative overflow-hidden">
                  <div className="absolute top-0.5 bottom-0.5 left-[30%] right-[35%] rounded-md bg-gradient-to-r from-violet-500/25 to-indigo-500/25 border border-violet-500/30 flex items-center px-2 text-violet-200 font-bold overflow-hidden">
                    {t("Aethoria: AI Narrative Short")}
                  </div>
                </div>
              </div>

              {/* Audio Track 1 */}
              <div className="flex gap-2 items-center text-[9px] text-zinc-400">
                <span className="w-14 font-semibold text-right shrink-0">{t("Audio 1")}</span>
                <div className="flex-1 h-7 rounded-lg border border-white/[0.04] bg-white/[0.01] relative overflow-hidden">
                  <div className="absolute top-0.5 bottom-0.5 left-[10%] right-[20%] rounded-md bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-500/30 flex items-center px-2 text-emerald-200 font-bold overflow-hidden">
                    {t("Cinematic Music SFX")}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stacked Cards for Mobile / Small Screens */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:hidden">
          <div className="rounded-3xl border border-white/[0.05] bg-zinc-950/20 p-5 shadow-xl">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
              <Image src="/landing/hero-1.jpg" alt="Mastering the Unseen" fill className="object-cover" unoptimized />
            </div>
            <h4 className="mt-4 font-bold text-white text-base">{t("Mastering the Unseen")}</h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {t("Stunning fidelity visuals of actual work, cinematic video visual creation. AI generation with optimized workflows.")}
            </p>
          </div>
          <div className="rounded-3xl border border-white/[0.05] bg-zinc-950/20 p-5 shadow-xl">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
              <Image src="/landing/hero-2.jpg" alt="Aethoria" fill className="object-cover" unoptimized />
            </div>
            <h4 className="mt-4 font-bold text-white text-base">{t("Aethoria: AI Narrative Short")}</h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {t("Pioneering future-forward visuals through advanced AI-driven creation for film, media, and brands.")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Counter Section ────────────────────────────────────────────────────
const PLATFORM_STATS = [
  { number: "20+", label: "Image Models", subtitle: "GPT Image, FLUX, Imagen 4 & more" },
  { number: "17",  label: "Video Engines", subtitle: "Kling, Sora, Veo, Seedance & more" },
  { number: "85+", label: "AI Tools", subtitle: "Image, Video, Audio, 3D, Edit" },
  { number: "4",  label: "Subscription Plans", subtitle: "Starter, Plus, Pro, Max" },
];

function StatsCounter({ stats = PLATFORM_STATS }: { stats?: typeof PLATFORM_STATS }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn>
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.05] backdrop-blur-sm px-4 py-6 text-center"
            >
              <span className="text-4xl font-bold text-cyan-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {stat.number}
              </span>
              <span className="mt-1 text-lg font-semibold text-white">{t(stat.label)}</span>
              <span className="mt-0.5 text-sm text-gray-400">{t(stat.subtitle)}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

const MODEL_SPOTLIGHTS = [
  {
    title: "GPT Image 2",
    badge: "Image",
    href: "/image?tool=create&model=gpt-image-2-text-to-image",
    image: "/GPT%20Image%202/SHOT%201.webp",
  },
  {
    title: "Canvas",
    badge: "Workflow",
    href: "/original-series",
    image: "/canvas.webp",
  },
  {
    title: "Seedance 2",
    badge: "Video",
    href: "/video?tool=create-video&model=bytedance-seedance-v2-t2v",
    image: "/seedance%202/Hero.webp",
  },
  {
    title: "Kling 3.0",
    badge: "Video",
    href: "/video?tool=create-video&model=kling-v3.0-pro-t2v",
    image: "/Kling%203.0/Hero.webp",
  },
];

const STUDIO_PATHWAYS = [
  {
    title: "Image Studio",
    description: "High-detail images, ads, portraits, product visuals, and edits.",
    href: "/image",
    image: "/GPT%20Image%202/SHOT%203.webp",
    icon: ImageIcon,
    accent: "text-cyan-300",
  },
  {
    title: "Video Studio",
    description: "Generate cinematic motion, character shots, and social clips.",
    href: "/video",
    image: "/seedance%202/1%20(4).webp",
    icon: VideoIcon,
    accent: "text-fuchsia-300",
  },
  {
    title: "AI Canvas",
    description: "Build complete creative workflows from one visual workspace.",
    href: "/original-series",
    image: "/canvas.webp",
    icon: Layers,
    accent: "text-amber-200",
  },
  {
    title: "Next Scene",
    description: "Direct scenes, storyboards, shots, and cinematic worlds.",
    href: "/cinema-studio",
    image: "/NEXT%20SCENE%20ENGINE.webp",
    icon: Clapperboard,
    accent: "text-emerald-300",
  },
  {
    title: "Character",
    description: "Create consistent characters for brands, stories, and campaigns.",
    href: "/character",
    image: "/seedance%202/1%20(7).webp",
    icon: ScanFace,
    accent: "text-violet-300",
  },
  {
    title: "Apps",
    description: "Specialized tools for edit, audio, relight, transitions, and more.",
    href: "/apps",
    image: "/transitions/1%20(2).webp",
    icon: Wand2,
    accent: "text-lime-300",
  },
];

const SHOWCASE_TILES = [
  { title: "Campaign visuals", href: "/image", image: "/GPT%20Image%202/SHOT%204.webp", className: "md:col-span-5 md:row-span-2" },
  { title: "Cinematic models", href: "/video", image: "/seedance%202/Hero.webp", className: "md:col-span-4 md:row-span-2" },
  { title: "Scene engine", href: "/cinema-studio", image: "/NEXT%20SCENE%20ENGINE.webp", className: "md:col-span-3" },
  { title: "Transitions", href: "/apps/tool/transitions", image: "/transitions/Hero.webp", className: "md:col-span-3" },
  { title: "Nano Banana", href: "/image?model=nano-banana-pro", image: "/nano.webp", className: "md:col-span-4" },
  { title: "Canvas workflow", href: "/original-series", image: "/canvas.webp", className: "md:col-span-5" },
  { title: "Kling 3.0", href: "/video?tool=create-video&model=kling-v3.0-pro-t2v", image: "/Kling%203.0/Hero.webp", className: "md:col-span-3" },
];

const WORKFLOW_STEPS = [
  { title: "Start", description: "Pick a studio path", icon: Aperture },
  { title: "Generate", description: "Use the right model", icon: Sparkles },
  { title: "Shape", description: "Edit, relight, upscale", icon: Scissors },
  { title: "Publish", description: "Move into video or scene", icon: Film },
];

const HOME_DEFAULT_SECTION_ORDER = [
  "heroSlides",
  "studioPathways",
  "statsCounter",
  "productionWorkflow",
  "apps",
  "models",
  "startupVerification",
];

const HOME_INJECTED_SECTIONS: Record<string, { after: string }> = {
  studioPathways: { after: "heroSlides" },
  statsCounter: { after: "studioPathways" },
  productionWorkflow: { after: "statsCounter" },
  startupVerification: { after: "models" },
};

function StartupVerification() {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section className="border-t border-white/[0.06] pt-12 pb-16 text-zinc-400 text-sm sm:text-base">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="font-extrabold uppercase tracking-wider text-zinc-200 text-lg sm:text-xl">{t("Compliance & Company Overview")}</p>
          <p className="leading-relaxed text-zinc-400 text-sm sm:text-base">
            {t("Saad Studio is a software-as-a-service creative production platform. The product combines multiple AI models and focused studio workflows so users can generate images, create videos, build consistent characters, edit media, produce audio, and manage creative projects from one browser-based workspace. This website includes public product information, company details, contact information, pricing, privacy, and terms for program review.")}
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-zinc-300 text-xs sm:text-sm font-semibold">
            <span>{t("Company: Saad Studio")}</span>
            <span>{t("Contact: support@saadstudio.app | 009647755815500")}</span>
            <span>{t("Type: AI Creative Production SaaS")}</span>
          </div>
          <div className="flex justify-center gap-6 text-xs sm:text-sm mt-4">
            <Link href="/about" className="hover:text-white text-zinc-500 hover:underline transition">{t("About")}</Link>
            <Link href="/contact" className="hover:text-white text-zinc-500 hover:underline transition">{t("Contact")}</Link>
            <Link href="/privacy" className="hover:text-white text-zinc-500 hover:underline transition">{t("Privacy")}</Link>
            <Link href="/terms" className="hover:text-white text-zinc-500 hover:underline transition">{t("Terms")}</Link>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function StudioPathways({ items = STUDIO_PATHWAYS }: { items?: typeof STUDIO_PATHWAYS }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title={t("Choose your studio")} cta={t("Open Explore")} ctaHref="/explore" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const IconComp = item.icon;
            return (
              <Link key={item.title} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                  whileHover={{ y: -4 }}
                  className="group relative min-h-[240px] overflow-hidden rounded-3xl border border-white/[0.04] bg-zinc-950/20 hover:border-white/[0.12] transition-all duration-500 shadow-2xl shadow-black/40"
                >
                  <MediaFill src={item.image} alt={t(item.title)} className="opacity-60 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-85" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                      <IconComp className={cn("h-5 w-5", item.accent)} />
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{t(item.title)}</h3>
                    <p className="mt-2.5 max-w-sm text-sm leading-6 text-zinc-300">{t(item.description)}</p>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>
    </FadeIn>
  );
}

function ShowcaseWall({ tiles = SHOWCASE_TILES }: { tiles?: typeof SHOWCASE_TILES }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title={t("Built for real outputs")} />
        <div className="grid auto-rows-[170px] gap-3 md:grid-cols-12 md:auto-rows-[190px]">
          {tiles.map((tile, index) => (
            <Link key={tile.title} href={tile.href} className={cn("group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]", tile.className)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className="absolute inset-0"
              >
                <MediaFill src={tile.image} alt={t(tile.title)} className="transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-black text-white">{t(tile.title)}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

function ProductionWorkflow({ steps = WORKFLOW_STEPS }: { steps?: typeof WORKFLOW_STEPS }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="absolute inset-0">
            <MediaFill src="/canvas.webp" alt={t("Saad Studio workflow")} className="opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/55" />
          </div>
          <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                {t("Production workflow")}
              </span>
              <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
                {t("From idea to publish-ready creative in one place.")}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-300">
                {t("Move between images, video, character, audio, scene tools, and app utilities without losing the creative thread.")}
              </p>
              <Link href="/apps" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950">
                {t("Browse tools")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => {
                const IconComp = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                        <IconComp className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">0{index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">{t(step.title)}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{t(step.description)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function ModelSpotlightRail({ items = MODEL_SPOTLIGHTS }: { items?: typeof MODEL_SPOTLIGHTS }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title={t("Featured model drops")} cta={t("View Explore")} ctaHref="/explore" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <Link key={item.title} href={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/25"
              >
                <MediaFill src={item.image} alt={t(item.title)} className="transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="inline-flex rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur">
                    {t(item.badge)}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">{t(item.title)}</h3>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}



// ─── 4. Apps Infinite Marquee ─────────────────────────────────────────────────
function AppsMarquee({ apps = APPS_MARQUEE }: { apps?: { title: string; icon?: React.ElementType; color: string }[] }) {
  const { t } = useHomeTranslation();
  const doubled = [...apps, ...apps];
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title={t("85+ Apps — One Studio")} cta={t("Browse All")} ctaHref="/apps" />
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] py-4">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10" />
          <motion.div
            className="flex gap-3 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {doubled.map((app, i) => {
              const IconComp = app.icon ?? Sparkles;
              return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ duration: 0.15 }}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.08] hover:border-white/15 transition-colors"
              >
                <IconComp className={cn("h-4 w-4 shrink-0", app.color)} />
                <span className="text-xs font-semibold text-zinc-300 whitespace-nowrap">{t(app.title)}</span>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 5. AI Models Trust Strip ─────────────────────────────────────────────────



// ─── 5b. AI Models Trust Strip ────────────────────────────────────────────────
function ModelsTrustStrip({ models = AI_MODELS }: { models?: { name: string; tag: string; color: string; ring?: string }[] }) {
  const { t } = useHomeTranslation();
  return (
    <FadeIn delay={0.05}>
      <section className="pb-10">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-5">
          {t("Powered by Industry-Leading AI")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {models.map((m) => (
            <motion.div
              key={m.name}
              whileHover={{ scale: 1.06, y: -1 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 ring-1 hover:bg-white/[0.07] transition-colors cursor-default",
                m.ring ?? "ring-violet-500/30"
              )}
            >
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", m.color)}>{t(m.name)}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-zinc-500">{t(m.tag)}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 6. Ad Cards Row ──────────────────────────────────────────────────────────
function AdCardsRow({ cards }: { cards: CmsAdCard[] }) {
  const { t } = useHomeTranslation();
  if (!cards || cards.length === 0) return null;
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title={t("Featured")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map((card, i) => (
            <Link key={card._id || i} href={card.href || "/"}>
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                whileHover={{ scale: 1.025 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 cursor-pointer aspect-[4/3]"
              >
                <MediaFill
                  src={card.image || AD_CARD_VIDEOS[i % AD_CARD_VIDEOS.length]}
                  alt={t(card.title)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {card.badge && (
                    <span className={cn(
                      "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider ring-1 mb-1",
                      "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                    )}>
                      {t(card.badge)}
                    </span>
                  )}
                  <p className="font-semibold text-white text-sm leading-tight">{t(card.title)}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">{t(card.description)}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const HERO_SLOT_IDS = ["landing/hero-1", "landing/hero-2", "landing/hero-3", "landing/hero-4"];

const CORE_TOOL_SLOT_MAP: Record<string, string> = {
  "create-image": "landing/tool-create-image",
  "create-video": "landing/tool-create-video",
  "cinema-studio": "landing/tool-cinema",
  "lipsync": "landing/tool-lipsync",
  "vibe-motion": "landing/tool-vibe-motion",
  "draw-to-video": "landing/tool-draw-video",
};

const TOP_CHOICE_SLOT_MAP: Record<string, string> = {
  "relight": "landing/tool-relight",
  "face-swap": "landing/tool-face-swap",
  "ugc-factory": "landing/tool-ugc-factory",
  "upscale": "landing/tool-upscale",
  "char-swap": "landing/tool-char-swap",
};

// CMS data types for home page
interface CmsHeroSlide {
  _id?: string;
  title: string;
  subtitle: string;
  tag: string;
  bgImage: string;
  ctaHref: string;
  gradient?: string;
  accentFrom?: string;
  accentTo?: string;
  youtubeUrl?: string;
  trailerUrl?: string;
}

interface CmsToolCard {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient?: string;
  accentColor?: string;
}

interface CmsAppItem {
  _id?: string;
  title: string;
  color: string;
}

interface CmsModelItem {
  _id?: string;
  name: string;
  tag: string;
  color: string;
  ring?: string;
}

interface CmsAdCard {
  _id?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient?: string;
  className?: string;
  accentColor?: string;
}

interface CmsStatItem {
  _id?: string;
  number: string;
  label: string;
  subtitle: string;
}

interface CmsSectionOrder {
  _id: string;
  type: string;
  label: string;
  visible: boolean;
}

interface HomeCmsData {
  sectionOrder?: CmsSectionOrder[];
  heroSlides?: CmsHeroSlide[];
  studioPathways?: CmsAdCard[];
  showcaseTiles?: CmsAdCard[];
  stats?: CmsStatItem[];
  modelSpotlights?: CmsAdCard[];
  workflowSteps?: CmsAdCard[];
  coreTools?: CmsToolCard[];
  topChoice?: CmsToolCard[];
  apps?: CmsAppItem[];
  models?: CmsModelItem[];
  adCards?: CmsAdCard[];
}

export default function ExplorePage() {
  const { blocks } = usePageLayout("home");
  const promo = usePromoMedia();
  const promoContent = usePromoContent();
  const { data: cms } = useCmsData<HomeCmsData>("home");

  // ── Apps & Models & Ad Cards: CMS → hardcoded defaults ───────────────────────
  const homeApps = useMemo(() => {
    if (cms?.apps && cms.apps.length > 0) return cms.apps;
    return APPS_MARQUEE;
  }, [cms]);

  const homeModels = useMemo(() => {
    if (cms?.models && cms.models.length > 0) return cms.models;
    return AI_MODELS;
  }, [cms]);

  const homeAdCards = useMemo(() => cms?.adCards ?? [], [cms]);

  const homeStudioPathways = useMemo(() => {
    if (!cms?.studioPathways?.length) return STUDIO_PATHWAYS;
    return cms.studioPathways.map((item, idx) => {
      const fallback = STUDIO_PATHWAYS[idx % STUDIO_PATHWAYS.length];
      return {
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
        icon: fallback.icon,
        accent: item.accentColor || fallback.accent,
      };
    });
  }, [cms]);

  const homeShowcaseTiles = useMemo(() => {
    if (!cms?.showcaseTiles?.length) return SHOWCASE_TILES;
    return cms.showcaseTiles.map((item, idx) => {
      const fallback = SHOWCASE_TILES[idx % SHOWCASE_TILES.length];
      return {
        title: item.title || fallback.title,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
        className: item.className || fallback.className,
      };
    });
  }, [cms]);

  const homeStats = useMemo(() => {
    if (!cms?.stats?.length) return PLATFORM_STATS;
    return cms.stats.map((item, idx) => {
      const fallback = PLATFORM_STATS[idx % PLATFORM_STATS.length];
      return {
        number: item.number || fallback.number,
        label: item.label || fallback.label,
        subtitle: item.subtitle || fallback.subtitle,
      };
    });
  }, [cms]);

  const homeModelSpotlights = useMemo(() => {
    if (!cms?.modelSpotlights?.length) return MODEL_SPOTLIGHTS;
    return cms.modelSpotlights.map((item, idx) => {
      const fallback = MODEL_SPOTLIGHTS[idx % MODEL_SPOTLIGHTS.length];
      return {
        title: item.title || fallback.title,
        badge: item.badge || fallback.badge,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
      };
    });
  }, [cms]);

  const homeWorkflowSteps = useMemo(() => {
    if (!cms?.workflowSteps?.length) return WORKFLOW_STEPS;
    return cms.workflowSteps.map((item, idx) => {
      const fallback = WORKFLOW_STEPS[idx % WORKFLOW_STEPS.length];
      return {
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        icon: fallback.icon,
      };
    });
  }, [cms]);

  // ── Section order from CMS (default if none saved) ──────────────────────────
  const sectionOrder = useMemo(() => {
    const base = cms?.sectionOrder && cms.sectionOrder.length > 0
      ? cms.sectionOrder
      : HOME_DEFAULT_SECTION_ORDER.map((type) => ({ _id: type, type, label: type, visible: true }));

    // Inject hardcoded sections if missing from CMS order
    let result = [...base];
    for (const [type, { after }] of Object.entries(HOME_INJECTED_SECTIONS)) {
      if (!result.some((s) => s.type === type)) {
        const afterIdx = result.findIndex((s) => s.type === after);
        const entry = { _id: type, type, label: type, visible: true };
        if (afterIdx >= 0) {
          result.splice(afterIdx + 1, 0, entry);
        } else {
          result.push(entry);
        }
      }
    }
    return result;
  }, [cms]);

  const sectionMap: Record<string, React.ReactNode> = {
    heroSlides: <CinematicHero key="hero" />,
    startupVerification: <StartupVerification key="startupVerification" />,
    studioPathways: <StudioPathways key="studioPathways" items={homeStudioPathways} />,
    showcaseWall: <ShowcaseWall key="showcaseWall" tiles={homeShowcaseTiles} />,
    statsCounter: <StatsCounter key="stats" stats={homeStats} />,
    modelSpotlights: <ModelSpotlightRail key="modelSpotlights" items={homeModelSpotlights} />,
    productionWorkflow: <ProductionWorkflow key="productionWorkflow" steps={homeWorkflowSteps} />,
    adCards: <AdCardsRow key="ads" cards={homeAdCards} />,
    apps: <AppsMarquee key="apps" apps={homeApps} />,
    models: <ModelsTrustStrip key="models" models={homeModels} />,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {sectionOrder.filter((s) => s.visible !== false).map((sec) => {
        const node = sectionMap[sec.type];
        if (!node) return null;
        // Hero goes full-width, rest inside container
        if (sec.type === "heroSlides") return node;
        return (
          <div key={sec._id} className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 mt-14">
            {node}
          </div>
        );
      })}
    </div>
  );
}

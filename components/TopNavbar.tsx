"use client";

import Link from "next/link";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { useAvatar, PRESET_AVATARS } from "@/lib/avatar-context";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import {
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Zap,
  Globe,
  User,
  Settings,
  LogOut,
  CreditCard,
  Star,
  ImageIcon,
  VideoIcon,
  Music,
  Wand2,
  Scissors,
  Drama,
  Palette,
  Clapperboard,
  Monitor,
  Bot,
  GalleryHorizontalEnd,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Mic2,
  Headphones,
  Radio,
  Volume2,
  Crop,
  PenTool,
  Eraser,
  Blend,
  Shapes,
  LayoutGrid,
  Puzzle,
  TrendingUp,
  Gamepad2,
  Megaphone,
  Aperture,
  Film,
  Paintbrush,
  ScanFace,
  Lightbulb,
  Atom,
  Box,
  Plug,
  Camera,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TOOL_ROUTE_MAP } from "@/lib/apps-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getTranslation = (key: string, lang: "en" | "ar") => {
  if (lang !== "ar") return key;
  const dict: Record<string, string> = {
    "Explore": "استكشف",
    "Adobe Plugin": "إضافة أدوبي",
    "Image": "الصور",
    "Video": "الفيديو",
    "Audio": "الصوت",
    "Edit": "التعديل",
    "Apps": "التطبيقات",
    "Gallery": "المعرض",
    "My Assets": "أصولي",
    "Price Plans": "خطط الأسعار",
    "Pricing": "الأسعار",
    "Upgrade to Pro": "الترقية إلى برو",
    "Image Studio": "استوديو الصور",
    "Open Image Studio": "افتح استوديو الصور",
    "Video Studio": "استوديو الفيديو",
    "Open Video Studio": "افتح استوديو الفيديو",
    "Audio Studio": "استوديو الصوت",
    "Open Audio Studio": "افتح استوديو الصوت",
    "Features": "الميزات",
    "Models": "النماذج",
    "Studio": "الاستوديو",
    "Cinematic Styles": "الأنماط السينمائية",
    "Transitions": "الانتقالات",
    "Storyboard": "القصة المصورة",
    "Storyboard Studio": "استوديو القصة المصورة",
    "Hook Studio": "استوديو الهوكات",
    "Shots Studio": "استوديو اللقطات",
    "Open Shots Studio": "افتح استوديو اللقطات",
    "Credit Balance": "رصيد النقاط",
    "My Profile": "ملفي الشخصي",
    "Settings": "الإعدادات",
    "Upgrade Plan": "ترقية الخطة",
    "Logout": "تسجيل الخروج",
    "Sign In": "تسجيل الدخول",
    "Sign Up Free": "تسجيل مجاني",
    "Sign Up": "تسجيل مجاني",
    "Credits": "النقاط",
  };
  return dict[key] || key;
};

const LanguageSwitcher = () => {
  const { lang, changeLanguage } = useLanguage();
  return (
    <button
      onClick={() => changeLanguage(lang === "ar" ? "en" : "ar")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all select-none"
    >
      <Globe className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
      <span>{lang === "ar" ? "العربية" : "English"}</span>
    </button>
  );
};



const IMAGE_FEATURES = [
  { label: "Create Image", icon: Wand2, color: "text-pink-400", description: "Generate stunning AI images instantly", badge: "TOP" },
  { label: "Shots Studio", icon: Camera, color: "text-indigo-400", description: "Multi-shot consistent photo pack generator", badge: "NEW" },
  { label: "Prompt", icon: GalleryHorizontalEnd, color: "text-cyan-400", description: "Private prompt and result library", badge: "NEW" },
  { label: "Prompt Extractor", icon: ScanFace, color: "text-teal-400", description: "Extract prompts from images", badge: "NEW" },
  { label: "Cinema Studio Image 2.0", icon: Clapperboard, color: "text-violet-400", description: "Cinematic quality image generation", badge: "NEW" },
  { label: "Relight", icon: Lightbulb, color: "text-yellow-400", description: "Relight any image with AI precision", badge: "NEW" },
  { label: "Inpaint", icon: PenTool, color: "text-emerald-400", description: "Fill and repair areas seamlessly", badge: "" },
  { label: "Image Upscale", icon: Aperture, color: "text-blue-400", description: "4K AI upscaling & enhancement", badge: "" },
  { label: "Face Swap", icon: Drama, color: "text-rose-400", description: "Swap faces with pixel accuracy", badge: "" },
  { label: "Character Swap", icon: Shapes, color: "text-purple-400", description: "Transform any character seamlessly", badge: "" },
  { label: "Draw to Edit", icon: Paintbrush, color: "text-fuchsia-400", description: "Paint your edits directly on canvas", badge: "" },
];

const IMAGE_MODEL_GROUPS = [
  {
    group: "Nano Banana", icon: Atom, groupColor: "text-lime-400",
    models: [
      { id: "nano-banana-pro",          label: "Nano Banana Pro",  badge: "TOP" },
      { id: "nano-banana-2",            label: "Nano Banana 2",    badge: ""    },
      { id: "nano-banana-2-lite",       label: "Nano Banana 2 Lite", badge: "NEW" },
      { id: "google/nano-banana",       label: "Nano Banana",      badge: ""    },
      { id: "google/nano-banana-edit",  label: "NB Edit",          badge: ""    },
    ],
  },
  {
    group: "Google Imagen", icon: Sparkles, groupColor: "text-sky-400",
    models: [
      { id: "google/imagen4-fast",   label: "Imagen 4 Fast",   badge: ""    },
      { id: "google/imagen4",        label: "Imagen 4",         badge: ""    },
      { id: "google/imagen4-ultra",  label: "Imagen 4 Ultra",  badge: "TOP" },
    ],
  },
  {
    group: "Seedream", icon: Layers, groupColor: "text-emerald-400",
    models: [
      { id: "seedream/4.5-text-to-image",     label: "4.5 T2I",     badge: ""    },
      { id: "seedream/4.5-edit",              label: "4.5 Edit",    badge: ""    },
      { id: "seedream/5-lite-text-to-image",  label: "5 Lite T2I",  badge: "NEW" },
      { id: "seedream/5-lite-image-to-image", label: "5 Lite I2I",  badge: "NEW" },
    ],
  },
  {
    group: "FLUX.2", icon: Zap, groupColor: "text-violet-400",
    models: [
      { id: "flux-2/pro-text-to-image",    label: "Pro T2I",   badge: ""    },
      { id: "flux-2/pro-image-to-image",   label: "Pro I2I",   badge: ""    },
      { id: "flux-2/flex-text-to-image",   label: "Flex T2I", badge: "NEW" },
      { id: "flux-2/flex-image-to-image",  label: "Flex I2I", badge: "NEW" },
    ],
  },
  {
    group: "Other", icon: Wand2, groupColor: "text-pink-400",
    models: [
      { id: "z-image",                       label: "Z-Image",          badge: "" },
      { id: "grok-imagine/text-to-image",    label: "Grok Imagine",     badge: "" },
      { id: "gpt-image-2-text-to-image",     label: "GPT Image 2", badge: "NEW" },
    ],
  },
];

const VIDEO_FEATURES = [
  { label: "Hook Studio",         href: "/hook-studio",     icon: Clapperboard, color: "text-pink-400",    description: "Create viral scripts, hooks, and AI short-form videos", badge: "NEW" },
  { label: "Agent Studio",        href: "/agent-studio",    icon: Bot,          color: "text-violet-400",  description: "AI agent orchestrator & custom skills workflow", badge: "NEW" },
  { label: "Cinema Flow",         href: "/cinema-flow",     icon: Bot,          color: "text-orange-400",  description: "AI Creative Agent workspace",          badge: "NEW" },
  { label: "Create Video",        href: "/video",           icon: VideoIcon,    color: "text-orange-400",  description: "Text-to-video generation",             badge: "" },
  { label: "Cinema Edit",         href: "/video-edit",      icon: Sparkles,     color: "text-cyan-400",    description: "Iterative & stateful video editing",   badge: "NEW" },
  { label: "Transitions",         href: "/apps/tool/transitions", icon: Blend, color: "text-cyan-300", description: "Generate styled scene transitions", badge: "READY" },
  { label: "Storyboard Studio",   href: "/storyboard", icon: Clapperboard, color: "text-violet-300", description: "Create cinematic production boards", badge: "READY" },
  { label: "Draw to Video",       href: "/apps/tool/draw-to-video", icon: PenTool, color: "text-lime-300", description: "Draw, add, remove, replace and animate elements", badge: "NEW" },
  { label: "Cinematic Styles",    href: "/apps/tool/cinematic-styles", icon: Blend,        color: "text-cyan-300",    description: "Apply stylized motion presets to clips", badge: "READY" },
  { label: "Edit Video",          href: "/edit",            icon: Scissors,     color: "text-cyan-400",    description: "Advanced AI timeline editing",           badge: "" },
  { label: "Video Extend",        href: "/video-extend",    icon: Film,         color: "text-pink-400",    description: "Upload a clip and extend its duration",  badge: "NEW" },
  { label: "Lipsync Studio",      href: "/lipsync",          icon: Mic2,         color: "text-rose-400",    description: "Audio-driven facial animation",          badge: "" },
  { label: "ClipCraft Studio",    href: "/clipcraft-studio", icon: Sparkles,     color: "text-emerald-400", description: "Auto captions, reframe, AI dubbing, & translation", badge: "NEW" },
  { label: "Video Upscale",       href: "/video?tool=video-upscale",    icon: Aperture,     color: "text-blue-400",    description: "Enhance resolution to 4K/8K",            badge: "" },
  { label: "AI Canvas",           href: "/canvas", icon: Monitor,      color: "text-purple-400",  description: "Build complete creative workflows from one visual workspace", badge: "NEW" },
  { label: "3D Studio",           href: "/3d",              icon: Box,          color: "text-indigo-400",  description: "Generate and edit premium 3D models with AI", badge: "NEW" },
  { label: "Assist",              href: "/assist",          icon: Bot,          color: "text-green-400",   description: "Your AI co-pilot, chatbot, and agent assistant", badge: "NEW" },
  { label: "Smart CLI",           href: "/smart-cli",       icon: Plug,         color: "text-violet-400",  description: "AI terminal and hosted MCP connector for Claude", badge: "NEW" },
];

const VIDEO_MODEL_GROUPS = [
  {
    group: "Kling Engines", icon: Clapperboard, groupColor: "text-violet-400",
    models: [
      { id: "kling-3.0/video",                      label: "3.0 (Video)",          badge: "TOP" },
      { id: "kling-3.0/motion-control",              label: "3.0 Motion Control",   badge: "NEW" },
      { id: "kling-2.6/text-to-video",               label: "2.6 T2V",              badge: ""    },
      { id: "kling-2.6/image-to-video",              label: "2.6 I2V",              badge: ""    },
      { id: "kling/v2-5-turbo-text-to-video-pro",    label: "v2.5 Turbo T2V Pro",   badge: ""    },
      { id: "kling/v2-5-turbo-image-to-video-pro",   label: "v2.5 Turbo I2V Pro",   badge: ""    },
    ],
  },
  {
    group: "Hailuo Engines", icon: Sparkles, groupColor: "text-rose-400",
    models: [
      { id: "hailuo/2-3-image-to-video-pro",      label: "2.3 I2V Pro",       badge: ""    },
      { id: "hailuo/2-3-image-to-video-standard", label: "2.3 I2V Standard",  badge: ""    },
      { id: "hailuo/02-text-to-video-pro",        label: "02 T2V Pro",        badge: ""    },
      { id: "hailuo/02-image-to-video-pro",       label: "02 I2V Pro",        badge: ""    },
      { id: "hailuo/02-text-to-video-standard",   label: "02 T2V Standard",   badge: ""    },
    ],
  },
  {
    group: "Sora Engines", icon: VideoIcon, groupColor: "text-orange-400",
    models: [
      { id: "sora-2-image-to-video",      label: "Sora 2 I2V",       badge: ""    },
      { id: "sora-2-text-to-video",       label: "Sora 2 T2V",       badge: ""    },
      { id: "sora-2-pro-image-to-video",  label: "Sora 2 Pro I2V",   badge: "TOP" },
      { id: "sora-2-pro-text-to-video",   label: "Sora 2 Pro T2V",   badge: "TOP" },
    ],
  },
  {
    group: "Grok", icon: Bot, groupColor: "text-sky-400",
    models: [
      { id: "grok-imagine/text-to-video",   label: "T2V",  badge: "" },
      { id: "grok-imagine/image-to-video",  label: "I2V",  badge: "" },
    ],
  },
  {
    group: "Seedance / ByteDance", icon: Zap, groupColor: "text-amber-400",
    models: [
      { id: "seedance-2-preview",                    label: "Seedance 2 Preview",    badge: "NEW" },
      { id: "seedance-2-fast-preview",               label: "Seedance 2 Fast",       badge: "NEW" },
      { id: "bytedance/seedance-1.5-pro",            label: "Seedance 1.5 Pro",      badge: ""    },
      { id: "bytedance/seedance-2",                  label: "Seedance 2",            badge: ""    },
      { id: "bytedance/seedance-2-fast",             label: "Seedance 2 Fast",       badge: ""    },
      { id: "bytedance/v1-pro-fast-image-to-video",  label: "V1 Pro Fast I2V",       badge: ""    },
      { id: "bytedance/v1-pro-image-to-video",       label: "V1 Pro I2V",            badge: ""    },
      { id: "bytedance/v1-pro-text-to-video",        label: "V1 Pro T2V",            badge: ""    },
      { id: "bytedance/v1-lite-image-to-video",      label: "V1 Lite I2V",           badge: ""    },
      { id: "bytedance/v1-lite-text-to-video",       label: "V1 Lite T2V",           badge: ""    },
    ],
  },
];

const AUDIO_FEATURES = [
  { label: "Text to Music", icon: Music, color: "text-emerald-400", description: "Generate full tracks from prompts" },
  { label: "Voice Cloning", icon: Mic2, color: "text-violet-400", description: "Clone any voice in seconds" },
  { label: "Sound Effects", icon: Volume2, color: "text-yellow-400", description: "Create custom SFX & foley" },
  { label: "Podcast Studio", icon: Radio, color: "text-orange-400", description: "Professional podcast production" },
  { label: "Music Stems", icon: Headphones, color: "text-cyan-400", description: "Isolate and extract stems" },
  { label: "Lyrics Writer", icon: PenTool, color: "text-pink-400", description: "AI-powered songwriting" },
];

const AUDIO_MODELS = [
  { label: "Suno V4.5", tag: "🎵", color: "text-emerald-400" },
  { label: "Udio 1.5", tag: "🎶", color: "text-violet-400" },
  { label: "MusicGen 2", tag: "🎸", color: "text-yellow-400" },
  { label: "AudioCraft", tag: "🥁", color: "text-orange-400" },
  { label: "Stable Audio 2", tag: "🎹", color: "text-cyan-400" },
  { label: "ElevenLabs V3", tag: "🎤", color: "text-pink-400" },
];

const EDIT_FEATURES = [
  { label: "Background Remove", icon: Eraser, color: "text-red-400", description: "Remove backgrounds instantly" },
  { label: "AI Inpainting", icon: Wand2, color: "text-violet-400", description: "Fill and fix any area" },
  { label: "Upscale & Enhance", icon: Sparkles, color: "text-amber-400", description: "4K upscaling AI" },
  { label: "Style Transfer", icon: Blend, color: "text-cyan-400", description: "Apply any artistic style" },
  { label: "Smart Crop", icon: Crop, color: "text-emerald-400", description: "AI-powered composition" },
  { label: "Colorize", icon: Palette, color: "text-pink-400", description: "Colorize B&W media" },
];

const EDIT_MODELS = [
  { label: "Photoshop AI", tag: "✏️", color: "text-blue-400" },
  { label: "Adobe Firefly Edit", tag: "🔥", color: "text-orange-400" },
  { label: "Clipdrop API", tag: "✂️", color: "text-green-400" },
  { label: "Real-ESRGAN", tag: "🔍", color: "text-purple-400" },
  { label: "SD Inpaint", tag: "🎨", color: "text-violet-400" },
  { label: "Remove.bg Pro", tag: "🪄", color: "text-red-400" },
];

const APPS_CATEGORIES = [
  {
    category: "General",
    color: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/30",
    icon: Bot,
    iconColor: "text-violet-400",
    apps: ["AI Chat", "Smart Search", "Auto Writer", "Translator"],
  },
  {
    category: "Enhancement",
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/30",
    icon: Sparkles,
    iconColor: "text-amber-400",
    apps: ["Upscaler", "Enhancer", "Denoiser", "Sharpener"],
  },
  {
    category: "Face / Character",
    color: "from-pink-500/20 to-pink-600/10",
    border: "border-pink-500/30",
    icon: ScanFace,
    iconColor: "text-pink-400",
    apps: ["Face Swap", "Avatar Gen", "Portrait AI", "Aging/De-age"],
  },
  {
    category: "Editing",
    color: "from-cyan-500/20 to-cyan-600/10",
    border: "border-cyan-500/30",
    icon: Scissors,
    iconColor: "text-cyan-400",
    apps: ["BG Remover", "Inpainting", "Crop AI", "Object Remove"],
  },
  {
    category: "Ads / Scenes",
    color: "from-orange-500/20 to-orange-600/10",
    border: "border-orange-500/30",
    icon: Megaphone,
    iconColor: "text-orange-400",
    apps: ["Ad Creator", "Scene Builder", "Product Shot", "Story Board"],
  },
  {
    category: "Nano / Games",
    color: "from-lime-500/20 to-lime-600/10",
    border: "border-lime-500/30",
    icon: Gamepad2,
    iconColor: "text-lime-400",
    apps: ["Nano Games", "Sprite Gen", "Level Design", "NPC Creator"],
  },
  {
    category: "Creative",
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/30",
    icon: Lightbulb,
    iconColor: "text-rose-400",
    apps: ["Story AI", "Comic Gen", "Logo Maker", "Meme Studio"],
  },
  {
    category: "Extra / Trends",
    color: "from-teal-500/20 to-teal-600/10",
    border: "border-teal-500/30",
    icon: TrendingUp,
    iconColor: "text-teal-400",
    apps: ["Trend AI", "Viral Hook", "QR Art", "3D Avatar"],
  },
];

const IMAGE_TOOL_MAP: Record<string, string> = {
  "Create Image": "create",
  "Cinema Studio Image 2.0": "create",
  Relight: "relight",
  Inpaint: "inpaint",
  "Image Upscale": "upscale",
  "Face Swap": "face-swap",
  "Character Swap": "face-swap",
  "Draw to Edit": "inpaint",
};

const AUDIO_TOOL_MAP: Record<string, string> = {
  "Text to Music": "music-generator",
  "Voice Cloning": "voice-cloning",
  "Sound Effects": "sfx-generator",
  "Podcast Studio": "voice-generator",
  "Music Stems": "add-audio",
  "Lyrics Writer": "music-generator",
};

const EDIT_TOOL_MAP: Record<string, string> = {
  "Background Remove": "background-remove",
  "AI Inpainting": "inpaint",
  "Upscale & Enhance": "upscale",
  "Style Transfer": "style-transfer",
  "Smart Crop": "smart-crop",
  Colorize: "colorize",
};

function imageFeatureHref(label: string): string {
  if (label === "Prompt") return "/prompt";
  if (label === "Prompt Extractor") return "/prompt-extractor";
  if (label === "Cinema Studio Image 2.0" || label === "Shots Studio" || label === "Multishot") return "/shots";

  const editToolsMap: Record<string, string> = {
    Relight: "relight",
    Inpaint: "inpaint",
    "Image Upscale": "upscale",
    "Face Swap": "faceswap",
    "Character Swap": "faceswap",
    "Draw to Edit": "draw",
  };

  if (label in editToolsMap) {
    return `/edit?tool=${encodeURIComponent(editToolsMap[label])}`;
  }

  const tool = IMAGE_TOOL_MAP[label] ?? "create";
  return `/image?tool=${encodeURIComponent(tool)}`;
}

function audioFeatureHref(label: string): string {
  const tool = AUDIO_TOOL_MAP[label] ?? "voice-generator";
  return `/audio?tool=${encodeURIComponent(tool)}`;
}

function editFeatureHref(label: string): string {
  const tool = EDIT_TOOL_MAP[label] ?? "background-remove";
  return `/edit?tool=${encodeURIComponent(tool)}`;
}

const APPS_LINK_MAP: Record<string, string> = {
  // General
  "AI Chat": "/assist",
  "Smart Search": "/assist",
  "Auto Writer": "/assist",
  Translator: "/assist",

  // Enhancement
  Upscaler: TOOL_ROUTE_MAP["image-upscale"] || "/edit?tool=upscale",
  Enhancer: TOOL_ROUTE_MAP["skin-enhancer"] || "/edit?tool=style",
  Denoiser: "/edit?tool=style",
  Sharpener: "/edit?tool=upscale",

  // Face / Character
  "Face Swap": TOOL_ROUTE_MAP["face-swap"] ?? "/edit?tool=faceswap",
  "Avatar Gen": TOOL_ROUTE_MAP["headshot-gen"] ?? "/image?tool=create&model=nano-banana-pro",
  "Portrait AI": TOOL_ROUTE_MAP["headshot-gen"] ?? "/image?tool=create&model=nano-banana-pro",
  "Aging/De-age": TOOL_ROUTE_MAP["age-transform"] ?? "/edit?tool=style",

  // Editing
  "BG Remover": TOOL_ROUTE_MAP["bg-remover"] ?? "/edit?tool=bgremove",
  Inpainting: "/edit?tool=inpaint",
  "Crop AI": "/edit?tool=smart-crop",
  "Object Remove": "/edit?tool=inpaint",

  // Ads / Scenes
  "Ad Creator": TOOL_ROUTE_MAP["click-to-ad"] ?? "/video?tool=click-to-ad",
  "Scene Builder": TOOL_ROUTE_MAP["behind-scenes"] ?? "/video?tool=cinema-studio",
  "Product Shot": TOOL_ROUTE_MAP["packshot"] ?? "/video?tool=click-to-ad",
  "Story Board": TOOL_ROUTE_MAP["what-next"] ?? "/variations",

  // Nano / Games
  "Nano Games": TOOL_ROUTE_MAP["game-dump"] ?? "/image?tool=create",
  "Sprite Gen": TOOL_ROUTE_MAP["pixel-game"] ?? "/image?tool=create",
  "Level Design": TOOL_ROUTE_MAP["simlife"] ?? "/image?tool=create",
  "NPC Creator": TOOL_ROUTE_MAP["3d-figure"] ?? "/3d",

  // Creative
  "Story AI": TOOL_ROUTE_MAP["what-next"] ?? "/variations",
  "Comic Gen": TOOL_ROUTE_MAP["comic-book"] ?? "/image?tool=create",
  "Logo Maker": TOOL_ROUTE_MAP["poster"] ?? "/image?tool=create",
  "Meme Studio": TOOL_ROUTE_MAP["meme-gen"] ?? "/image?tool=create",

  // Extra / Trends
  "Trend AI": TOOL_ROUTE_MAP["skibidi"] ?? "/video?tool=sora-trends",
  "Viral Hook": TOOL_ROUTE_MAP["rap-god"] ?? "/video?tool=vibe-motion",
  QRArt: TOOL_ROUTE_MAP["sticker"] ?? "/image?tool=create",
  "3D Avatar": TOOL_ROUTE_MAP["3d-figure"] ?? "/3d",
};

function appHref(app: string): string {
  return APPS_LINK_MAP[app] ?? "/apps";
}

const SHOW_EXPERIMENTAL_NAV = false;

const STUDIO_LINKS = [
  { label: "Adobe Plugin", href: "/plugin", icon: Plug, color: "text-amber-400" },
  { label: "Cinematic Styles", href: "/apps/tool/cinematic-styles", icon: Blend, color: "text-cyan-300" },
  { label: "Transitions", href: "/apps/tool/transitions", icon: Blend, color: "text-cyan-300" },
  { label: "Storyboard", href: "/storyboard", icon: Clapperboard, color: "text-violet-300" },
  { label: "Hook Studio", href: "/hook-studio", icon: Clapperboard, color: "text-pink-400" },
];

const ListItem = ({
  href,
  title,
  description,
  icon: Icon,
  color,
  tag,
}: {
  href?: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  color: string;
  tag?: string;
}) => (
  <li>
    <Link
      href={href ?? "#"}
      className="group flex select-none rounded-lg p-3 leading-none no-underline outline-none transition-all hover:bg-white/[0.08] focus:bg-white/[0.08]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-100 group-hover:text-white truncate">
              {title}
            </span>
            {tag && (
              <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30">
                {tag}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-xs leading-snug text-zinc-500 group-hover:text-zinc-400 line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  </li>
);

const Logo = () => (
  <Link href="/explore" className="group flex items-center shrink-0">
    <div className="relative h-9 w-9">
      <Image
        src="/icon-192.png"
        alt="Saad Studio"
        fill
        sizes="36px"
        className="object-contain"
        priority
      />
    </div>
  </Link>
);

const PricingButton = () => (
  <Link href="/pricing">
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-full p-px overflow-hidden"
      style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5,#06b6d4,#7c3aed)" }}
    >
      <motion.div
        className="absolute inset-0 rounded-full blur-sm opacity-60"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5,#06b6d4)", backgroundSize: "200% 200%" }}
      />
      <span className="relative flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 transition-colors">
        <Zap className="h-3.5 w-3.5 text-violet-400" />
        Pricing
      </span>
    </motion.div>
  </Link>
);

function CreditRing({ ratio, size = 46, stroke = 2.5, hovered = false }: { ratio: number; size?: number; stroke?: number; hovered?: boolean }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Palette: gradient endpoints per state
  const state: "high" | "mid" | "low" | "critical" =
    clamped > 0.5 ? "high" : clamped > 0.25 ? "mid" : clamped > 0.08 ? "low" : "critical";
  const grad = {
    high:     { from: "#34d399", to: "#22c55e" }, // emerald → green
    mid:      { from: "#fbbf24", to: "#f59e0b" }, // amber → orange
    low:      { from: "#fb923c", to: "#ef4444" }, // orange → red
    critical: { from: "#f43f5e", to: "#ef4444" }, // rose → red
  }[state];
  const glow = {
    high:     "rgba(34,197,94,.55)",
    mid:      "rgba(245,158,11,.55)",
    low:      "rgba(239,68,68,.55)",
    critical: "rgba(239,68,68,.75)",
  }[state];
  const alert = state === "low" || state === "critical";

  // Head-dot coordinates at the end of the arc
  const angle = -Math.PI / 2 + 2 * Math.PI * clamped;
  const hx = cx + r * Math.cos(angle);
  const hy = cy + r * Math.sin(angle);

  const gradId = `cr-grad-${state}`;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        filter: `drop-shadow(0 0 ${hovered ? 10 : 6}px ${glow})`,
        transition: "filter .3s ease, transform .5s cubic-bezier(.2,.7,.2,1)",
        transform: hovered ? "rotate(360deg)" : "rotate(0deg)",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={grad.from} />
          <stop offset="100%" stopColor={grad.to} />
        </linearGradient>
      </defs>

      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />

      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)",
          animation: alert ? "cr-pulse 1.4s ease-in-out infinite" : undefined,
        }}
      />

      {/* Glowing head dot at arc tip — only when there is progress */}
      {clamped > 0.01 && clamped < 0.999 && (
        <circle
          cx={hx}
          cy={hy}
          r={stroke * 0.9}
          fill={grad.to}
          style={{
            filter: `drop-shadow(0 0 4px ${grad.to})`,
            transition: "cx .8s cubic-bezier(.2,.7,.2,1), cy .8s cubic-bezier(.2,.7,.2,1), fill .6s ease",
          }}
        />
      )}

      <style>{`
        @keyframes cr-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: .55; }
        }
      `}</style>
    </svg>
  );
}

const UserProfileDropdown = ({ creditBalance, creditCapacity }: { creditBalance: number | null; creditCapacity: number | null }) => {
  const { user } = useUser();
  const { lang } = useLanguage();
  const { signOut } = useClerk();
  const { uploadedPhoto, activePreset } = useAvatar();
  const activeGradient = PRESET_AVATARS.find((p) => p.id === activePreset)?.gradient ?? "from-violet-600 to-indigo-600";

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const [ringHovered, setRingHovered] = useState(false);
  const ringRatio =
    creditBalance !== null && creditCapacity && creditCapacity > 0
      ? creditBalance / creditCapacity
      : null;
  const ringPct = ringRatio !== null ? Math.round(ringRatio * 100) : null;
  const ringState =
    ringRatio === null ? "none"
    : ringRatio > 0.5 ? "high"
    : ringRatio > 0.25 ? "mid"
    : ringRatio > 0.08 ? "low"
    : "critical";
  const chipStyles: Record<string, { bg: string; text: string; ring: string }> = {
    high:     { bg: "rgba(34,197,94,.14)",  text: "#4ade80", ring: "rgba(34,197,94,.35)" },
    mid:      { bg: "rgba(245,158,11,.14)", text: "#fbbf24", ring: "rgba(245,158,11,.35)" },
    low:      { bg: "rgba(249,115,22,.16)", text: "#fb923c", ring: "rgba(249,115,22,.45)" },
    critical: { bg: "rgba(239,68,68,.18)",  text: "#f87171", ring: "rgba(239,68,68,.55)" },
    none:     { bg: "rgba(255,255,255,.06)",text: "#e2e8f0", ring: "rgba(255,255,255,.15)" },
  };
  const chip = chipStyles[ringState];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => setRingHovered(true)}
          onMouseLeave={() => setRingHovered(false)}
          onFocus={() => setRingHovered(true)}
          onBlur={() => setRingHovered(false)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full focus:outline-none"
          aria-label={
            creditBalance !== null && creditCapacity && creditCapacity > 0
              ? `Credit ${creditBalance.toLocaleString()} of ${creditCapacity.toLocaleString()} (${ringPct}%)`
              : creditBalance !== null ? `Credit ${creditBalance.toLocaleString()}` : "Profile"
          }
        >
          {ringRatio !== null && (
            <CreditRing ratio={ringRatio} size={46} stroke={2.5} hovered={ringHovered} />
          )}
          <div className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/10">
            {uploadedPhoto ? (
              <img src={uploadedPhoto} alt="Avatar" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${activeGradient} flex items-center justify-center`}>
                <span className="text-sm font-bold text-white select-none">{initials}</span>
              </div>
            )}
          </div>

          {/* Floating credit chip — appears on hover */}
          {ringRatio !== null && (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums shadow-lg shadow-black/40"
              style={{
                top: "calc(100% + 6px)",
                background: chip.bg,
                color: chip.text,
                border: `1px solid ${chip.ring}`,
                backdropFilter: "blur(8px)",
                opacity: ringHovered ? 1 : 0,
                transform: ringHovered ? "translate(-50%, 0)" : "translate(-50%, -4px)",
                transition: "opacity .22s ease, transform .22s cubic-bezier(.2,.7,.2,1)",
              }}
            >
              {creditBalance!.toLocaleString()}
            </div>
          )}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 border border-white/10 bg-slate-900/95 backdrop-blur-xl p-2 text-white shadow-2xl shadow-black/60 rounded-xl">
        <div className="mb-2 rounded-lg bg-white/5 p-3">
          <div className="flex items-center gap-3">
            {uploadedPhoto ? (
              <img src={uploadedPhoto} alt="Avatar" className="h-10 w-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${activeGradient} text-sm font-bold`}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{fullName}</p>
              <p className="truncate text-xs text-zinc-400">{email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-2 ring-1 ring-amber-500/20">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-amber-200">{getTranslation("Credit Balance", lang)}</span>
            </div>
            <span className="text-sm font-bold text-amber-400">
              {creditBalance !== null ? `${creditBalance.toLocaleString()} cr` : "—"}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <User className="h-4 w-4 text-violet-400" />{getTranslation("My Profile", lang)}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <Settings className="h-4 w-4 text-zinc-400" />{getTranslation("Settings", lang)}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pricing" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <CreditCard className="h-4 w-4 text-emerald-400" />{getTranslation("Upgrade Plan", lang)}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <DropdownMenuItem asChild>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:bg-red-500/10 focus:text-red-300">
            <LogOut className="h-4 w-4" />{getTranslation("Logout", lang)}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NavSep = () => (
  <span className="mx-0.5 h-4 w-px bg-white/20 inline-block align-middle" />
);

// ─── Mobile Accordion ─────────────────────────────────────────────────────────
// Text label = navigates via Link; chevron button toggles expand
const MobileAccordion = ({
  label,
  href,
  icon,
  badge,
  open,
  onToggle,
  children,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center">
      {/* Text = navigates */}
      <Link
        href={href}
        className={cn(
          "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          open ? "text-white" : "text-zinc-400 hover:text-white"
        )}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/30">
            {badge}
          </span>
        )}
      </Link>
      {/* Chevron = toggles dropdown only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          open ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        )}
        aria-label={`Toggle ${label} submenu`}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
    </div>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="ml-6 mr-1 mb-1 border-l border-white/10 pl-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─── Hover Nav Item (desktop) ─────────────────────────────────────────────────
// Text = navigates via Link; dropdown opens on hover
const HoverNavItem = ({
  href,
  icon,
  label,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (children) timerRef.current = setTimeout(() => setOpen(true), 100);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 200);
  };

  const pathname = usePathname();
  const isActive = (pathname.startsWith(href) || (href === "/video" && pathname.startsWith("/lipsync"))) && href !== "/";

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.08] whitespace-nowrap",
          isActive ? "text-white bg-white/[0.08]" : "text-zinc-300 hover:text-white"
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        {children && (
          <ChevronDown
            className={cn(
              "h-3 w-3 ml-0.5 transition-transform duration-200",
              open ? "rotate-180 text-white" : "text-zinc-500"
            )}
          />
        )}
      </Link>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && children && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-black/60"
            style={{ maxWidth: "calc(100vw - 2rem)" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── AUTH NAV BUTTONS ─────────────────────────────────────────────────────────
const AuthNavButtons = ({ creditBalance, creditCapacity, hydrated }: { creditBalance: number | null; creditCapacity: number | null; hydrated: boolean }) => {
  const { isSignedIn } = useAuth();
  const { lang } = useLanguage();
  const { onOpen } = useAuthModal();
  const showAccount = hydrated && isSignedIn;
  const showGuestButtons = hydrated && !isSignedIn;

  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      <PricingButton />
      {showAccount ? (
        <div className="hidden xl:block">
          <UserProfileDropdown creditBalance={creditBalance} creditCapacity={creditCapacity} />
        </div>
      ) : showGuestButtons ? (
        <div className="hidden xl:flex items-center gap-2">
          <button
            onClick={() => onOpen("login")}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/10 transition-all"
          >
            {getTranslation("Sign In", lang)}
          </button>
          <button
            onClick={() => onOpen("signup")}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
              boxShadow: "0 2px 16px rgba(124,58,237,0.45)",
            }}
          >
            {getTranslation("Sign Up Free", lang)}
          </button>
        </div>
      ) : null}
    </div>
  );
};
const TopNavbar = () => {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const { fetchWithAuth, isAuthLoaded } = useAuthenticatedFetch();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { onOpen } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditCapacity, setCreditCapacity] = useState<number | null>(null);
  const toggleSection = (k: string) => setMobileSection((p) => (p === k ? null : k));
  const { uploadedPhoto: mobilePhoto, activePreset: mobilePreset } = useAvatar();
  const mobileName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const mobileEmail = user?.emailAddresses[0]?.emailAddress ?? "";
  const mobileInitials = mobileName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const mobileGradient = PRESET_AVATARS.find((p) => p.id === mobilePreset)?.gradient ?? "from-violet-600 to-indigo-600";
  const showAccount = hydrated && isSignedIn;
  const showGuestButtons = hydrated && !isSignedIn;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      setCreditBalance(null);
      setCreditCapacity(null);
      return;
    }
    if (!isAuthLoaded) return;

    let disposed = false;
    const readNumber = (payload: unknown, ...keys: string[]): number | null => {
      const data = payload as Record<string, unknown> | null;
      if (!data) return null;
      for (const k of keys) {
        const v = data[k];
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
      }
      return null;
    };
    const readBalance = (payload: unknown): number | null => readNumber(payload, "balance", "credits");
    const readCapacity = (payload: unknown): number | null => readNumber(payload, "capacity", "monthlyCredits");
    const loadCredits = async () => {
      try {
        const res = await fetchWithAuth("/api/editor/credits", { cache: "no-store" });
        const data = await res.json();
        const balance = readBalance(data);
        const capacity = readCapacity(data);
        if (!disposed && balance !== null) {
          setCreditBalance(balance);
          if (capacity !== null) setCreditCapacity(capacity);
          return;
        }
        const fallbackRes = await fetchWithAuth("/api/profile/overview", { cache: "no-store" });
        if (!fallbackRes.ok) return;
        const fallbackData = await fallbackRes.json();
        const fallbackBalance = readBalance(fallbackData);
        const fallbackCapacity = readCapacity(fallbackData);
        if (!disposed && fallbackBalance !== null) {
          setCreditBalance(fallbackBalance);
          if (fallbackCapacity !== null) setCreditCapacity(fallbackCapacity);
        }
      } catch {
        // keep previous value
      }
    };

    // Fetch on sign-in/navigation only. Periodic polling kept Neon awake even
    // while the dashboard was idle.
    if (isSignedIn) {
      loadCredits();
    }

    const handleCreditsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ balance: number }>;
      if (customEvent.detail && typeof customEvent.detail.balance === "number") {
        setCreditBalance(customEvent.detail.balance);
      }
    };
    window.addEventListener("saad-credits-updated", handleCreditsUpdate);

    return () => {
      disposed = true;
      window.removeEventListener("saad-credits-updated", handleCreditsUpdate);
    };
  }, [fetchWithAuth, isAuthLoaded, isSignedIn, pathname]);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-black/60 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/40"
            : "bg-black/40 backdrop-blur-xl border-b border-white/10"
        )}
      >
        <div className="flex h-14 w-full items-center justify-between gap-2 px-3 lg:px-5">

          <Logo />

          <div className="hidden 2xl:flex items-center flex-1 justify-center min-w-0">
            <div className="flex items-center gap-0">
              {/* Explore */}
              <Link
                href="/dash"
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.08] whitespace-nowrap",
                  pathname === "/dash" ? "text-white bg-white/[0.08]" : "text-zinc-300 hover:text-white"
                )}
              >
                <Globe className="h-3 w-3 text-sky-400" />{getTranslation("Explore", lang)}
              </Link>

              {/* Image */}
              <HoverNavItem href="/image" icon={<ImageIcon className="h-3 w-3 text-pink-400" />} label={getTranslation("Image", lang)}>
                <div className="w-[min(860px,calc(100vw-2rem))] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/15 ring-1 ring-pink-500/30">
                        <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
                      </div>
                      <div className="text-sm font-semibold text-white">Image Studio</div>
                      <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300 ring-1 ring-pink-500/30">
                        13 Features
                      </span>
                    </div>
                    <Link
                      href="/image"
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 hover:bg-pink-500/10 hover:text-pink-300 hover:ring-pink-500/30 transition-all"
                    >
                      Open Image Studio <span className="text-pink-400">→</span>
                    </Link>
                  </div>
                  <div className="flex gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Features</div>
                      <ul className="grid grid-cols-2 gap-0.5">
                        {IMAGE_FEATURES.map((f) => (
                          <li key={f.label}>
                            <Link
                              href={imageFeatureHref(f.label)}
                              className="group flex items-start gap-2.5 rounded-lg p-2.5 transition-all hover:bg-white/[0.08]"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                                <f.icon className={cn("h-3.5 w-3.5", f.color)} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-medium text-zinc-100 group-hover:text-white leading-tight">{f.label}</span>
                                  {f.badge && (
                                    <span className={cn(
                                      "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ring-1",
                                      f.badge === "NEW"
                                        ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                                    )}>
                                      {f.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 group-hover:text-zinc-400 line-clamp-1">{f.description}</p>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>
              </HoverNavItem>

              {/* Video */}
              <HoverNavItem href="/video" icon={<VideoIcon className="h-3 w-3 text-orange-400" />} label={getTranslation("Video", lang)}>
                <div className="w-[min(860px,calc(100vw-2rem))] p-5">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                        <VideoIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{getTranslation("Video Studio", lang)}</p>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{getTranslation("Cinematic AI Video Generation", lang)}</p>
                      </div>
                    </div>
                    <Link
                      href="/video"
                      className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      {getTranslation("Open Video Studio", lang)} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-5 border-r border-white/10 pr-5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Features", lang)}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {VIDEO_FEATURES.map((f) => (
                          <Link key={f.label} href={f.href}
                            className="group flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/[0.08]">
                            <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 group-hover:ring-white/25", f.color)}>
                              <f.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">{getTranslation(f.label, lang)}</p>
                                {f.badge && (
                                  <span className={cn(
                                    "rounded-full px-1 py-0.2 text-[8px] font-bold uppercase ring-1",
                                    f.badge === "NEW" ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30" : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                                  )}>{f.badge}</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-7">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Models", lang)}</p>
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {VIDEO_MODEL_GROUPS.map((grp) => (
                          <div key={grp.group}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <grp.icon className={cn("h-3.5 w-3.5", grp.groupColor)} />
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", grp.groupColor)}>{grp.group}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {grp.models.map((m) => (
                                <Link key={m.id} href={`/video?model=${m.id}`}
                                  className="group flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all">
                                  <span className="truncate text-[11px] font-medium text-zinc-300 group-hover:text-white">{m.label}</span>
                                  {m.badge && (
                                    <span className={cn(
                                      "ml-1 shrink-0 rounded-full px-1 py-0.2 text-[7px] font-bold uppercase ring-1",
                                      m.badge === "NEW" ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30" : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                                    )}>{m.badge}</span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </HoverNavItem>

              {/* Audio */}
              <HoverNavItem href="/audio" icon={<Music className="h-3 w-3 text-emerald-400" />} label={getTranslation("Audio", lang)}>
                <div className="w-[min(620px,calc(100vw-2rem))] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Features", lang)}</p>
                      <div className="space-y-1">
                        {AUDIO_FEATURES.map((f) => (
                          <Link key={f.label} href={audioFeatureHref(f.label)}
                            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-white/[0.08] transition-colors">
                            <f.icon className={cn("h-4 w-4 shrink-0", f.color)} />
                            <div>
                              <p className="text-xs font-medium text-zinc-200 group-hover:text-white">{getTranslation(f.label, lang)}</p>
                              <p className="text-[10px] text-zinc-500">{getTranslation(f.description, lang)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Models", lang)}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {AUDIO_MODELS.map((m) => (
                          <Link key={m.label} href={`/audio?model=${m.label.toLowerCase().replace(/\s/g, "-")}`}
                            className="group flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all">
                            <span className="text-xs">{m.tag}</span>
                            <span className={cn("text-xs font-medium truncate", m.color)}>{m.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </HoverNavItem>

              {/* Edit */}
              <HoverNavItem href="/edit" icon={<Scissors className="h-3 w-3 text-cyan-400" />} label={getTranslation("Edit", lang)}>
                <div className="w-[min(620px,calc(100vw-2rem))] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Features", lang)}</p>
                      <div className="space-y-1">
                        {EDIT_FEATURES.map((f) => (
                          <Link key={f.label} href={editFeatureHref(f.label)}
                            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-white/[0.08] transition-colors">
                            <f.icon className={cn("h-4 w-4 shrink-0", f.color)} />
                            <div>
                              <p className="text-xs font-medium text-zinc-200 group-hover:text-white">{getTranslation(f.label, lang)}</p>
                              <p className="text-[10px] text-zinc-500">{getTranslation(f.description, lang)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{getTranslation("Models", lang)}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {EDIT_MODELS.map((m) => (
                          <Link key={m.label} href={`/edit?model=${m.label.toLowerCase().replace(/\s/g, "-")}`}
                            className="group flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all">
                            <span className="text-xs">{m.tag}</span>
                            <span className={cn("text-xs font-medium truncate", m.color)}>{m.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </HoverNavItem>

              <NavSep />

              {/* Studio */}
              <div className="flex items-center gap-0.5">
                {STUDIO_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.08] whitespace-nowrap",
                      pathname === link.href ? "text-white bg-white/[0.08]" : "text-zinc-300 hover:text-white"
                    )}
                  >
                    <link.icon className={cn("h-3 w-3 shrink-0", link.color)} />
                    <span className="hidden xl:inline">{getTranslation(link.label, lang)}</span>
                  </Link>
                ))}
              </div>

              <NavSep />

              {/* Apps */}
              {SHOW_EXPERIMENTAL_NAV && (
              <HoverNavItem href="/apps" icon={<LayoutGrid className="h-3 w-3 text-indigo-400" />} label={getTranslation("Apps", lang)}>
                <div className="w-[min(720px,calc(100vw-2rem))] p-4">
                  <div className="grid grid-cols-4 gap-2.5">
                    {APPS_CATEGORIES.map((cat) => (
                      <div key={cat.category} className={cn("rounded-xl border bg-gradient-to-b p-3", cat.color, cat.border)}>
                        <div className="mb-2 flex items-center gap-1.5">
                          <cat.icon className={cn("h-3.5 w-3.5", cat.iconColor)} />
                          <span className={cn("text-xs font-bold", cat.iconColor)}>{getTranslation(cat.category, lang)}</span>
                        </div>
                        <div className="space-y-0.5">
                          {cat.apps.map((app) => (
                            <Link key={app} href={appHref(app)}
                              className="block truncate rounded px-1.5 py-1 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
                              {getTranslation(app, lang)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverNavItem>
              )}

              {/* Gallery */}
              <div className="flex items-center gap-1">
                <Link href="/gallery" className={cn("flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all hover:bg-white/[0.08] whitespace-nowrap", pathname === "/gallery" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white")}>
                  <GalleryHorizontalEnd className="h-3 w-3 text-fuchsia-400" />{getTranslation("Gallery", lang)}
                </Link>
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <AuthNavButtons creditBalance={creditBalance} creditCapacity={creditCapacity} hydrated={hydrated} />
            <button
              className="xl:hidden flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={mobileOpen ? "x" : "menu"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* 📱 💻 Phone & Tablet Simplified Product Drawer (< 1280px / xl:hidden) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-40 flex w-[min(360px,100vw)] md:w-[460px] flex-col bg-slate-950/98 backdrop-blur-2xl border-l border-white/10 xl:hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-white/10 shrink-0">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content (Phone: stacked 1-col, Tablet: comfortable 2-col) */}
            <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Compact User / Guest Header */}
              {showAccount ? (
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {mobilePhoto ? (
                        <img src={mobilePhoto} alt="Avatar" className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-white/20" />
                      ) : (
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${mobileGradient} text-sm font-bold text-white shrink-0`}>{mobileInitials}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{mobileName}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{mobileEmail}</p>
                      </div>
                    </div>
                    <Link
                      href="/pricing"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all shrink-0"
                    >
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{creditBalance !== null ? `${creditBalance.toLocaleString()}` : "—"}</span>
                    </Link>
                  </div>
                </div>
              ) : showGuestButtons ? (
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <button
                    onClick={() => { setMobileOpen(false); onOpen("login"); }}
                    className="flex items-center justify-center rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors ring-1 ring-white/10"
                  >
                    {getTranslation("Sign In", lang)}
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); onOpen("signup"); }}
                    className="flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
                  >
                    {getTranslation("Sign Up Free", lang)}
                  </button>
                </div>
              ) : null}

              {/* Primary Generation Hub (Phone: single column stack, Tablet: 2-column grid) */}
              <div>
                <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {lang === "ar" ? "استوديوهات التوليد" : "Generation Studios"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* 1. Image Studio */}
                  <Link
                    href="/image"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl p-3.5 border transition-all active:scale-[0.98]",
                      pathname === "/image"
                        ? "bg-pink-500/15 border-pink-500/40 text-white shadow-lg shadow-pink-500/10"
                        : "bg-white/[0.03] border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/30 shrink-0">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{getTranslation("Image Studio", lang)}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{lang === "ar" ? "توليد وتعديل الصور بدقة فائقة" : "High-res AI image generation"}</p>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-sm font-bold shrink-0 ml-1">→</span>
                  </Link>

                  {/* 2. Video Studio */}
                  <Link
                    href="/video"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl p-3.5 border transition-all active:scale-[0.98]",
                      pathname === "/video"
                        ? "bg-orange-500/15 border-orange-500/40 text-white shadow-lg shadow-orange-500/10"
                        : "bg-white/[0.03] border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30 shrink-0">
                        <VideoIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{getTranslation("Video Studio", lang)}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{lang === "ar" ? "توليد فيديو سينمائي واحترافي" : "Cinematic AI video generation"}</p>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-sm font-bold shrink-0 ml-1">→</span>
                  </Link>

                  {/* 3. Audio & Voices */}
                  <Link
                    href="/audio"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl p-3.5 border transition-all active:scale-[0.98]",
                      pathname === "/audio"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10"
                        : "bg-white/[0.03] border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 shrink-0">
                        <Volume2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{lang === "ar" ? "الصوت والأصوات" : "Audio & Voices"}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{lang === "ar" ? "تحويل النص إلى كلام واستنساخ الصوت" : "TTS, voice catalog & voice clone"}</p>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-sm font-bold shrink-0 ml-1">→</span>
                  </Link>

                  {/* 4. Music & Songs */}
                  <Link
                    href="/music"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl p-3.5 border transition-all active:scale-[0.98]",
                      pathname === "/music"
                        ? "bg-indigo-500/15 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-white/[0.03] border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30 shrink-0">
                        <Music className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{lang === "ar" ? "الموسيقى والأغاني" : "Music & Songs"}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{lang === "ar" ? "توليد أغاني وتراك وموسيقى متكاملة" : "Full AI songs & instrumental tracks"}</p>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-sm font-bold shrink-0 ml-1">→</span>
                  </Link>
                </div>
              </div>

              {/* Account Section */}
              {showAccount && (
                <div className="pt-3 border-t border-white/10 space-y-1 shrink-0">
                  <p className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {lang === "ar" ? "الحساب والإعدادات" : "Account & Settings"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                        pathname === "/profile" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <User className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>{getTranslation("My Profile", lang)}</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                        pathname === "/settings" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Settings className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span>{getTranslation("Settings", lang)}</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Footer: Exactly ONE Single Logout */}
              {showAccount && (
                <div className="mt-auto pt-3 border-t border-white/10 shrink-0">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ redirectUrl: "/" });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all ring-1 ring-red-500/20 active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{getTranslation("Logout", lang)}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm xl:hidden" />
        )}
      </AnimatePresence>
    </>
  );
};

export default TopNavbar;

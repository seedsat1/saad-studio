"use client";

import Link from "next/link";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { useAvatar, PRESET_AVATARS } from "@/lib/avatar-context";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Montserrat } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthModal } from "@/hooks/use-auth-modal";
import {
  Menu,
  X,
  ChevronDown,
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

const montserrat = Montserrat({ weight: "600", subsets: ["latin"] });



const IMAGE_FEATURES = [
  { label: "Create Image", icon: Wand2, color: "text-pink-400", description: "Generate stunning AI images instantly", badge: "TOP" },
  { label: "Cinema Studio Image 2.0", icon: Clapperboard, color: "text-violet-400", description: "Cinematic quality image generation", badge: "NEW" },
  { label: "Soul ID Character", icon: ScanFace, color: "text-cyan-400", description: "Consistent character design system", badge: "" },
  { label: "AI Influencer", icon: Sparkles, color: "text-amber-400", description: "Create virtual AI influencers", badge: "TOP" },
  { label: "Photodump", icon: ImageIcon, color: "text-sky-400", description: "Bulk AI photo generation pipeline", badge: "" },
  { label: "Relight", icon: Lightbulb, color: "text-yellow-400", description: "Relight any image with AI precision", badge: "NEW" },
  { label: "Inpaint", icon: PenTool, color: "text-emerald-400", description: "Fill and repair areas seamlessly", badge: "" },
  { label: "Image Upscale", icon: Aperture, color: "text-blue-400", description: "4K AI upscaling & enhancement", badge: "" },
  { label: "Face Swap", icon: Drama, color: "text-rose-400", description: "Swap faces with pixel accuracy", badge: "" },
  { label: "Character Swap", icon: Shapes, color: "text-purple-400", description: "Transform any character seamlessly", badge: "" },
  { label: "Draw to Edit", icon: Paintbrush, color: "text-fuchsia-400", description: "Paint your edits directly on canvas", badge: "" },
  { label: "Fashion Factory", icon: Layers, color: "text-orange-400", description: "AI fashion & outfit design studio", badge: "" },
];

const IMAGE_MODEL_GROUPS = [
  {
    group: "Nano Banana", icon: Atom, groupColor: "text-lime-400",
    models: [
      { id: "nano-banana-pro",          label: "Nano Banana Pro",  badge: "TOP" },
      { id: "nano-banana-2",            label: "Nano Banana 2",    badge: ""    },
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
      { id: "gpt-image/1.5-text-to-image",   label: "GPT Img 1.5 T2I", badge: "" },
      { id: "gpt-image/1.5-image-to-image",  label: "GPT Img 1.5 I2I", badge: "" },
    ],
  },
];

const VIDEO_FEATURES = [
  { label: "Create Video",        href: "/video",           icon: VideoIcon,    color: "text-orange-400",  description: "Text-to-video generation",             badge: "" },
  { label: "Video Project Editor",href: "/video-editor",    icon: Scissors,     color: "text-cyan-300",    description: "Timeline editing workspace",            badge: "NEW" },
  { label: "Cinema Studio",       href: "/cinema-studio",   icon: Clapperboard, color: "text-violet-400",  description: "Professional cinematic production",      badge: "TOP" },
  { label: "Mixed Media",         href: "/video?tool=mixed-media",      icon: Blend,        color: "text-pink-400",    description: "Combine multiple visual styles",         badge: "" },
  { label: "Edit Video",          href: "/edit",            icon: Scissors,     color: "text-cyan-400",    description: "Advanced AI timeline editing",           badge: "" },
  { label: "Click to Ad",         href: "/video?tool=click-to-ad",      icon: Megaphone,    color: "text-amber-400",   description: "1-click commercial generation",          badge: "" },
  { label: "Sora 2 Trends",       href: "/video?tool=sora-trends",      icon: TrendingUp,   color: "text-sky-400",     description: "Viral cinematic templates",              badge: "" },
  { label: "Lipsync Studio",      href: "/video?tool=lipsync",          icon: Mic2,         color: "text-rose-400",    description: "Audio-driven facial animation",          badge: "" },
  { label: "Draw to Video",       href: "/video?tool=draw-to-video",    icon: Paintbrush,   color: "text-fuchsia-400", description: "Animate sketched concepts",              badge: "" },
  { label: "Sketch to Video",     href: "/video?tool=sketch-to-video",  icon: PenTool,      color: "text-lime-400",    description: "Turn rough outlines into motion",        badge: "" },
  { label: "UGC Factory",         href: "/video?tool=ugc-factory",      icon: Layers,       color: "text-teal-400",    description: "User-generated content simulator",       badge: "" },
  { label: "Video Upscale",       href: "/video?tool=video-upscale",    icon: Aperture,     color: "text-blue-400",    description: "Enhance resolution to 4K/8K",            badge: "" },
  { label: "Character Animate",   href: "/video?tool=higgsfield-animate", icon: Sparkles,   color: "text-emerald-400", description: "Character and object animation",         badge: "" },
  { label: "Vibe Motion",         href: "/video?tool=vibe-motion",      icon: Music,        color: "text-indigo-400",  description: "Music-synced dynamic edits",             badge: "" },
  { label: "Recast Studio",       href: "/video?tool=recast-studio",    icon: Film,         color: "text-red-400",     description: "Repurpose existing videos",              badge: "" },
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
  "Soul ID Character": "create",
  "AI Influencer": "create",
  "Photodump": "create",
  Relight: "relight",
  Inpaint: "inpaint",
  "Image Upscale": "upscale",
  "Face Swap": "face-swap",
  "Character Swap": "face-swap",
  "Draw to Edit": "inpaint",
  "Fashion Factory": "create",
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
  Upscaler: TOOL_ROUTE_MAP["image-upscale"] || "/image?tool=upscale",
  Enhancer: TOOL_ROUTE_MAP["skin-enhancer"] || "/edit?tool=style",
  Denoiser: "/edit?tool=style",
  Sharpener: "/edit?tool=upscale",

  // Face / Character
  "Face Swap": TOOL_ROUTE_MAP["face-swap"] ?? "/image?tool=face-swap",
  "Avatar Gen": TOOL_ROUTE_MAP["headshot-gen"] ?? "/image?tool=create&model=nano-banana-pro",
  "Portrait AI": TOOL_ROUTE_MAP["headshot-gen"] ?? "/image?tool=create&model=nano-banana-pro",
  "Aging/De-age": TOOL_ROUTE_MAP["age-transform"] ?? "/edit?tool=style",

  // Editing
  "BG Remover": TOOL_ROUTE_MAP["bg-remover"] ?? "/edit?tool=bgremove",
  Inpainting: "/image?tool=inpaint",
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

const STUDIO_LINKS = [
  { label: "Character", href: "/character", icon: Drama, color: "text-violet-400" },
  { label: "Video Editor", href: "/video-editor", icon: Scissors, color: "text-cyan-300" },
  { label: "Moodboard", href: "/moodboard", icon: Palette, color: "text-rose-400" },
  { label: "Cinema Studio", href: "/cinema-studio", icon: Clapperboard, color: "text-amber-400" },
  { label: "Original Series", href: "/original-series", icon: Monitor, color: "text-blue-400" },
  { label: "3D Studio", href: "/3d", icon: Box, color: "text-indigo-400" },
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
  <Link href="/" className="group flex items-center gap-2 shrink-0">
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <Image
        src="/apple-touch-icon.png"
        alt="Saad Studio"
        fill
        className="object-contain"
        priority
      />
    </div>
    <span className={cn("text-xl font-bold tracking-tight", montserrat.className)}>
      <span className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Saad</span>
      <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent"> Studio</span>
    </span>
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

const UserProfileDropdown = ({ creditBalance }: { creditBalance: number | null }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { uploadedPhoto, activePreset } = useAvatar();
  const activeGradient = PRESET_AVATARS.find((p) => p.id === activePreset)?.gradient ?? "from-violet-600 to-indigo-600";

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-violet-500/40 hover:ring-violet-400/70 transition-all focus:outline-none overflow-hidden"
        >
          {uploadedPhoto ? (
            <img src={uploadedPhoto} alt="Avatar" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${activeGradient} flex items-center justify-center`}>
              <span className="text-sm font-bold text-white select-none">{initials}</span>
            </div>
          )}
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
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
              <span className="text-xs font-medium text-amber-200">Credit Balance</span>
            </div>
            <span className="text-sm font-bold text-amber-400">
              {creditBalance !== null ? `${creditBalance.toLocaleString()} cr` : "—"}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <User className="h-4 w-4 text-violet-400" />My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <Settings className="h-4 w-4 text-zinc-400" />Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pricing" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
            <CreditCard className="h-4 w-4 text-emerald-400" />Upgrade Plan
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <DropdownMenuItem asChild>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:bg-red-500/10 focus:text-red-300">
            <LogOut className="h-4 w-4" />Logout
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
  const isActive = pathname.startsWith(href) && href !== "/";

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
const AuthNavButtons = ({ creditBalance }: { creditBalance: number | null }) => {
  const { isSignedIn } = useAuth();
  const { onOpen } = useAuthModal();
  return (
    <div className="flex items-center gap-2">
      <PricingButton />
      {isSignedIn ? (
        <div className="hidden 2xl:block">
          <UserProfileDropdown creditBalance={creditBalance} />
        </div>
      ) : (
        <div className="hidden 2xl:flex items-center gap-2">
          <button
            onClick={() => onOpen("login")}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/10 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpen("signup")}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
              boxShadow: "0 2px 16px rgba(124,58,237,0.45)",
            }}
          >
            Sign Up Free
          </button>
        </div>
      )}
    </div>
  );
};

const TopNavbar = () => {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const toggleSection = (k: string) => setMobileSection((p) => (p === k ? null : k));
  const { uploadedPhoto: mobilePhoto, activePreset: mobilePreset } = useAvatar();
  const mobileName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const mobileEmail = user?.emailAddresses[0]?.emailAddress ?? "";
  const mobileInitials = mobileName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const mobileGradient = PRESET_AVATARS.find((p) => p.id === mobilePreset)?.gradient ?? "from-violet-600 to-indigo-600";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSignedIn) {
      setCreditBalance(null);
      return;
    }

    let disposed = false;
    const loadCredits = async () => {
      try {
        const res = await fetch("/api/editor/credits", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!disposed && typeof data?.balance === "number") {
          setCreditBalance(Math.max(0, Math.floor(data.balance)));
        }
      } catch {
        // keep previous value
      }
    };

    loadCredits();
    const intervalId = window.setInterval(loadCredits, 15000);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [isSignedIn]);

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
                <Globe className="h-3 w-3 text-sky-400" />Explore
              </Link>

              {/* Image */}
              <HoverNavItem href="/image" icon={<ImageIcon className="h-3 w-3 text-pink-400" />} label="Image">
                <div className="w-[min(860px,calc(100vw-2rem))] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/15 ring-1 ring-pink-500/30">
                        <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Image Studio</h3>
                      <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300 ring-1 ring-pink-500/30">
                        12 Features
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
                      <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Features</h4>
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
              <HoverNavItem href="/video" icon={<VideoIcon className="h-3 w-3 text-orange-400" />} label="Video">
                <div className="w-[min(960px,calc(100vw-2rem))] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-500/30">
                        <VideoIcon className="h-3.5 w-3.5 text-orange-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Video Studio</h3>
                      <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300 ring-1 ring-orange-500/30">
                        15 Features
                      </span>
                    </div>
                    <Link
                      href="/video"
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 hover:bg-orange-500/10 hover:text-orange-300 hover:ring-orange-500/30 transition-all"
                    >
                      Open Video Studio <span className="text-orange-400">→</span>
                    </Link>
                  </div>
                  <div className="flex gap-5">
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Features</h4>
                      <ul className="grid grid-cols-2 gap-0.5">
                        {VIDEO_FEATURES.map((f) => (
                          <li key={f.label}>
                            <Link
                              href={f.href}
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

              {/* Audio */}
              <HoverNavItem href="/audio" icon={<Music className="h-3 w-3 text-emerald-400" />} label="Audio">
                <div className="w-[340px] p-4">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Features</h3>
                    <ul className="space-y-0.5">
                      {AUDIO_FEATURES.map((f) => (
                        <ListItem key={f.label} href={audioFeatureHref(f.label)} title={f.label} description={f.description} icon={f.icon} color={f.color} />
                      ))}
                    </ul>
                  </div>
                </div>
              </HoverNavItem>

              {/* Edit */}
              <HoverNavItem href="/edit" icon={<Scissors className="h-3 w-3 text-cyan-400" />} label="Edit">
                <div className="w-[340px] p-4">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Features</h3>
                    <ul className="space-y-0.5">
                      {EDIT_FEATURES.map((f) => (
                        <ListItem key={f.label} href={editFeatureHref(f.label)} title={f.label} description={f.description} icon={f.icon} color={f.color} />
                      ))}
                    </ul>
                  </div>
                </div>
              </HoverNavItem>
              {/* Character | Moodboard | Cinema Studio */}
              <div className="flex items-center">
                {STUDIO_LINKS.map((link, i) => (
                  <span key={link.href} className="flex items-center">
                    {i > 0 && <NavSep />}
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all hover:bg-white/[0.08] whitespace-nowrap",
                        pathname === link.href ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <link.icon className={cn("h-3.5 w-3.5", link.color)} />
                      <span className="hidden 2xl:inline">{link.label}</span>
                    </Link>
                  </span>
                ))}
              </div>

              {/* Apps */}
              <HoverNavItem href="/apps" icon={<LayoutGrid className="h-3 w-3 text-indigo-400" />} label="Apps">
                <div className="w-[min(760px,calc(100vw-2rem))] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">All AI Apps</h3>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">8 Categories</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {APPS_CATEGORIES.map((cat) => (
                      <div key={cat.category} className={cn("rounded-xl border bg-gradient-to-b p-3 transition-all hover:scale-[1.02]", cat.color, cat.border)}>
                        <div className="mb-2 flex items-center gap-1.5">
                          <cat.icon className={cn("h-3.5 w-3.5", cat.iconColor)} />
                          <span className={cn("text-xs font-bold", cat.iconColor)}>{cat.category}</span>
                        </div>
                        <div className="space-y-1">
                          {cat.apps.map((app) => (
                            <Link key={app} href={appHref(app)} className="block rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
                              {app}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverNavItem>

              {/* Assist | Gallery */}
              <div className="flex items-center">
                <Link href="/assist" className={cn("flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all hover:bg-white/[0.08] whitespace-nowrap", pathname === "/assist" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white")}>
                  <Bot className="h-3 w-3 text-green-400" />Assist
                </Link>
                <NavSep />
                <Link href="/gallery" className={cn("flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all hover:bg-white/[0.08] whitespace-nowrap", pathname === "/gallery" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white")}>
                  <GalleryHorizontalEnd className="h-3 w-3 text-fuchsia-400" />Gallery
                </Link>
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <AuthNavButtons creditBalance={creditBalance} />
            <button
              className="2xl:hidden flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
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

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-40 flex w-[min(320px,100vw)] flex-col bg-slate-950/98 backdrop-blur-2xl border-l border-white/10 2xl:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-4 mt-4 mb-2 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                {mobilePhoto ? (
                  <img src={mobilePhoto} alt="Avatar" className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${mobileGradient} text-sm font-bold text-white shrink-0`}>{mobileInitials}</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{mobileName}</p>
                  <p className="text-xs text-zinc-400 truncate">{mobileEmail}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-1.5 ring-1 ring-amber-500/20">
                <span className="text-xs text-amber-200 flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Credits</span>
                <span className="text-sm font-bold text-amber-400">
                  {creditBalance !== null ? `${creditBalance.toLocaleString()} cr` : "—"}
                </span>
              </div>
            </div>
            {/* Scrollable nav area */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">

              {/* Explore */}
              <Link
                href="/dash"
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", pathname === "/dash" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white")}
              >
                <Globe className="h-4 w-4 shrink-0 text-sky-400" />Explore
              </Link>

              {/* Image accordion – Features + Models */}
              <MobileAccordion
                label="Image" href="/image" badge="12+19"
                icon={<ImageIcon className="h-4 w-4 text-pink-400" />}
                open={mobileSection === "image"} onToggle={() => toggleSection("image")}
              >
                <div className="space-y-3 py-2">
                  <Link
                    href="/image"
                    className="flex items-center justify-between rounded-lg bg-pink-500/10 px-3 py-2 ring-1 ring-pink-500/25 hover:bg-pink-500/20 transition-all"
                  >
                    <span className="text-xs font-semibold text-pink-300">Open Image Studio</span>
                    <span className="text-pink-400 text-sm">→</span>
                  </Link>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Features</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {IMAGE_FEATURES.map((f) => (
                        <Link key={f.label} href={imageFeatureHref(f.label)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/[0.08] transition-all">
                          <f.icon className={cn("h-3 w-3 shrink-0", f.color)} />
                          <span className="min-w-0 text-[11px] font-medium text-zinc-300 truncate flex-1">{f.label}</span>
                          {f.badge && (
                            <span className={cn(
                              "shrink-0 rounded-full px-1 py-0.5 text-[7px] font-bold uppercase ring-1",
                              f.badge === "NEW" ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30" : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                            )}>{f.badge}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Models</p>
                    <div className="space-y-2">
                      {IMAGE_MODEL_GROUPS.map((grp) => (
                        <div key={grp.group}>
                          <div className="flex items-center gap-1 mb-1">
                            <grp.icon className={cn("h-3 w-3", grp.groupColor)} />
                            <span className={cn("text-[9px] font-bold uppercase tracking-widest", grp.groupColor)}>{grp.group}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {grp.models.map((m) => (
                              <Link key={m.id} href={`/image?model=${m.id}`}
                                className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/[0.08] transition-all">
                                <span className="min-w-0 text-[10px] font-medium text-zinc-400 truncate flex-1">{m.label}</span>
                                {m.badge && (
                                  <span className={cn(
                                    "shrink-0 rounded-full px-1 py-0.5 text-[7px] font-bold uppercase ring-1",
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
              </MobileAccordion>

              {/* Video accordion – Features + Models */}
              <MobileAccordion
                label="Video" href="/video" badge="15+27"
                icon={<VideoIcon className="h-4 w-4 text-orange-400" />}
                open={mobileSection === "video"} onToggle={() => toggleSection("video")}
              >
                <div className="space-y-3 py-2">
                  <Link
                    href="/video"
                    className="flex items-center justify-between rounded-lg bg-orange-500/10 px-3 py-2 ring-1 ring-orange-500/25 hover:bg-orange-500/20 transition-all"
                  >
                    <span className="text-xs font-semibold text-orange-300">Open Video Studio</span>
                    <span className="text-orange-400 text-sm">→</span>
                  </Link>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Features</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {VIDEO_FEATURES.map((f) => (
                        <Link key={f.label} href={f.href}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/[0.08] transition-all">
                          <f.icon className={cn("h-3 w-3 shrink-0", f.color)} />
                          <span className="min-w-0 text-[11px] font-medium text-zinc-300 truncate flex-1">{f.label}</span>
                          {f.badge && (
                            <span className={cn(
                              "shrink-0 rounded-full px-1 py-0.5 text-[7px] font-bold uppercase ring-1",
                              f.badge === "NEW" ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30" : "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                            )}>{f.badge}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Models</p>
                    <div className="space-y-2">
                      {VIDEO_MODEL_GROUPS.map((grp) => (
                        <div key={grp.group}>
                          <div className="flex items-center gap-1 mb-1">
                            <grp.icon className={cn("h-3 w-3", grp.groupColor)} />
                            <span className={cn("text-[9px] font-bold uppercase tracking-widest", grp.groupColor)}>{grp.group}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {grp.models.map((m) => (
                              <Link key={m.id} href={`/video?model=${m.id}`}
                                className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/[0.08] transition-all">
                                <span className="min-w-0 text-[10px] font-medium text-zinc-400 truncate flex-1">{m.label}</span>
                                {m.badge && (
                                  <span className={cn(
                                    "shrink-0 rounded-full px-1 py-0.5 text-[7px] font-bold uppercase ring-1",
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
              </MobileAccordion>

              {/* Audio accordion */}
              <MobileAccordion
                label="Audio" href="/audio"
                icon={<Music className="h-4 w-4 text-emerald-400" />}
                open={mobileSection === "audio"} onToggle={() => toggleSection("audio")}
              >
                <div className="space-y-3 py-2">
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Features</p>
                    <div className="space-y-0.5">
                      {AUDIO_FEATURES.map((f) => (
                        <Link key={f.label} href={audioFeatureHref(f.label)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          <f.icon className={cn("h-4 w-4 shrink-0", f.color)} />
                          <span className="text-xs font-medium text-zinc-300">{f.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Models</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AUDIO_MODELS.map((m) => (
                        <Link key={m.label} href={`/audio?model=${m.label.toLowerCase().replace(/\s/g, "-")}`}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                          <span className="text-sm">{m.tag}</span>
                          <span className={cn("min-w-0 text-[11px] font-medium truncate", m.color)}>{m.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </MobileAccordion>

              {/* Edit accordion */}
              <MobileAccordion
                label="Edit" href="/edit"
                icon={<Scissors className="h-4 w-4 text-cyan-400" />}
                open={mobileSection === "edit"} onToggle={() => toggleSection("edit")}
              >
                <div className="space-y-3 py-2">
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Features</p>
                    <div className="space-y-0.5">
                      {EDIT_FEATURES.map((f) => (
                        <Link key={f.label} href={editFeatureHref(f.label)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          <f.icon className={cn("h-4 w-4 shrink-0", f.color)} />
                          <span className="text-xs font-medium text-zinc-300">{f.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Models</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EDIT_MODELS.map((m) => (
                        <Link key={m.label} href={`/edit?model=${m.label.toLowerCase().replace(/\s/g, "-")}`}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                          <span className="text-sm">{m.tag}</span>
                          <span className={cn("min-w-0 text-[11px] font-medium truncate", m.color)}>{m.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </MobileAccordion>

              {/* Studio – 4 direct links in 2-col grid */}
              <div className="px-1 py-1.5">
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Studio</p>
                <div className="grid grid-cols-2 gap-1">
                  {STUDIO_LINKS.map((link) => (
                    <Link key={link.href} href={link.href}
                      className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        pathname === link.href ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>
                      <link.icon className={cn("h-4 w-4 shrink-0", link.color)} />
                      <span className="truncate text-xs">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Apps accordion – 8 categories */}
              <MobileAccordion
                label="Apps" href="/apps" badge="8 cats"
                icon={<LayoutGrid className="h-4 w-4 text-indigo-400" />}
                open={mobileSection === "apps"} onToggle={() => toggleSection("apps")}
              >
                <div className="grid grid-cols-2 gap-2 py-2">
                  {APPS_CATEGORIES.map((cat) => (
                    <div key={cat.category} className={cn("rounded-xl border bg-gradient-to-b p-2.5", cat.color, cat.border)}>
                      <div className="mb-1.5 flex items-center gap-1">
                        <cat.icon className={cn("h-3 w-3", cat.iconColor)} />
                        <span className={cn("text-[10px] font-bold", cat.iconColor)}>{cat.category}</span>
                      </div>
                      <div className="space-y-0.5">
                        {cat.apps.map((app) => (
                          <Link key={app} href={appHref(app)}
                            className="block truncate rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-white/10 hover:text-white transition-colors">
                            {app}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </MobileAccordion>

              {/* Assist | Gallery */}
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <Link href="/assist"
                  className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === "/assist" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>
                  <Bot className="h-4 w-4 text-green-400" />Assist
                </Link>
                <Link href="/gallery"
                  className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === "/gallery" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>
                  <GalleryHorizontalEnd className="h-4 w-4 text-fuchsia-400" />Gallery
                </Link>
              </div>

            </nav>
            <div className="border-t border-white/10 p-4 space-y-2">
              <Link href="/pricing" className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-all">
                <Zap className="h-4 w-4" /> Upgrade to Pro
              </Link>
              <Link href="/settings" className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm 2xl:hidden" />
        )}
      </AnimatePresence>
    </>
  );
};

export default TopNavbar;

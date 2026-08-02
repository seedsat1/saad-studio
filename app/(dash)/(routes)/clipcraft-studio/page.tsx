"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  Type,
  Languages,
  Maximize2,
  FileText,
  Video,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  HelpCircle,
  Cpu,
  Zap,
  Globe,
  Activity,
  Trash2,
  Plus,
  Search,
  Music,
  Settings,
  Layers,
  History,
  Film,
  Target,
  FolderOpen,
  Sliders,
  Volume2
} from "lucide-react";
import { FloatingParticles } from "@/components/FloatingParticles";

const FALLBACK_LANGUAGES = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { code: "ar-EG", label: "Arabic (Egypt)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "ru-RU", label: "Russian (Russia)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja-JP", label: "Japanese (Japan)" },
  { code: "ko-KR", label: "Korean (South Korea)" },
  { code: "tr-TR", label: "Turkish (Turkey)" },
  { code: "hi-IN", label: "Hindi (India)" },
  { code: "nl-NL", label: "Dutch (Netherlands)" },
  { code: "sv-SE", label: "Swedish (Sweden)" },
  { code: "pl-PL", label: "Polish (Poland)" },
  { code: "id-ID", label: "Indonesian (Indonesia)" },
  { code: "vi-VN", label: "Vietnamese (Vietnam)" },
  { code: "th-TH", label: "Thai (Thailand)" },
  { code: "he-IL", label: "Hebrew (Israel)" },
  { code: "el-GR", label: "Greek (Greece)" },
  { code: "ro-RO", label: "Romanian (Romania)" },
  { code: "da-DK", label: "Danish (Denmark)" },
  { code: "fi-FI", label: "Finnish (Finland)" },
  { code: "no-NO", label: "Norwegian (Norway)" },
  { code: "cs-CZ", label: "Czech (Czechia)" },
  { code: "hu-HU", label: "Hungarian (Hungary)" },
];

const LANGUAGES_WITH_FLAGS = [
  { code: "en-US", label: "English (United States)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (United Kingdom)", flag: "🇬🇧" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)", flag: "🇸🇦" },
  { code: "ar-EG", label: "Arabic (Egypt)", flag: "🇪🇬" },
  { code: "es-ES", label: "Spanish (Spain)", flag: "🇪🇸" },
  { code: "es-MX", label: "Spanish (Mexico)", flag: "🇲🇽" },
  { code: "fr-FR", label: "French (France)", flag: "🇫🇷" },
  { code: "fr-CA", label: "French (Canada)", flag: "🇨🇦" },
  { code: "de-DE", label: "German (Germany)", flag: "🇩🇪" },
  { code: "it-IT", label: "Italian (Italy)", flag: "🇮🇹" },
  { code: "pt-BR", label: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "pt-PT", label: "Portuguese (Portugal)", flag: "🇵🇹" },
  { code: "ru-RU", label: "Russian (Russia)", flag: "🇷🇺" },
  { code: "zh-CN", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "zh-TW", label: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "ja-JP", label: "Japanese (Japan)", flag: "🇯🇵" },
  { code: "ko-KR", label: "Korean (South Korea)", flag: "🇰🇷" },
  { code: "tr-TR", label: "Turkish (Turkey)", flag: "🇹🇷" },
  { code: "hi-IN", label: "Hindi (India)", flag: "🇮🇳" },
  { code: "nl-NL", label: "Dutch (Netherlands)", flag: "🇳🇱" },
  { code: "sv-SE", label: "Swedish (Sweden)", flag: "🇸🇪" },
  { code: "pl-PL", label: "Polish (Poland)", flag: "🇵🇱" },
  { code: "id-ID", label: "Indonesian (Indonesia)", flag: "🇮🇩" },
  { code: "vi-VN", label: "Vietnamese (Vietnam)", flag: "🇻🇳" },
  { code: "th-TH", label: "Thai (Thailand)", flag: "🇹🇭" },
  { code: "he-IL", label: "Hebrew (Israel)", flag: "🇮🇱" },
  { code: "el-GR", label: "Greek (Greece)", flag: "🇬🇷" },
  { code: "ro-RO", label: "Romanian (Romania)", flag: "🇷🇴" },
  { code: "da-DK", label: "Danish (Denmark)", flag: "🇩🇰" },
  { code: "fi-FI", label: "Finnish (Finland)", flag: "🇫🇮" },
  { code: "no-NO", label: "Norwegian (Norway)", flag: "🇳🇴" },
  { code: "hu-HU", label: "Hungarian (Hungary)", flag: "🇭🇺" }
];

const PRESET_STYLES: Record<string, {
  font: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  yPosition: number;
  text: string;
}> = {
  system_modern_bold: { font: "Montserrat", fontSize: 32, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "The quick brown fox jumps over" },
  system_neonize: { font: "Montserrat", fontSize: 30, textColor: "#d946ef", bgColor: "", yPosition: 70, text: "The quick brown fox jumps over" },
  system_classic: { font: "Georgia", fontSize: 28, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "The quick brown fox jumps over" },
  system_highlight: { font: "Impact", fontSize: 34, textColor: "#000000", bgColor: "#facc15", yPosition: 75, text: "The quick brown fox jumps over" },
  system_candy: { font: "Montserrat", fontSize: 32, textColor: "#facc15", bgColor: "#ef4444", yPosition: 75, text: "Sweet Candy Captions! 🍭" },
  system_glitch: { font: "monospace", fontSize: 28, textColor: "#00ffcc", bgColor: "#000000", yPosition: 65, text: "SYSTEM ERROR: GLITCH 👾" },
  system_prism: { font: "Georgia", fontSize: 30, textColor: "#c084fc", bgColor: "#6366f1", yPosition: 50, text: "Prism Color spectrum 🌈" },
  system_ticker: { font: "sans-serif", fontSize: 24, textColor: "#ffffff", bgColor: "#000000", yPosition: 85, text: "Breaking News: Live Ticker Update 📰" },
  system_trophy: { font: "Montserrat", fontSize: 34, textColor: "#facc15", bgColor: "", yPosition: 40, text: "CHAMPIONS TROPHY 🏆" },
  system_typewriter: { font: "monospace", fontSize: 26, textColor: "#ffffff", bgColor: "", yPosition: 50, text: "Typing out the script... ⌨️" },
  system_wavy: { font: "cursive", fontSize: 30, textColor: "#06b6d4", bgColor: "#ffffff", yPosition: 70, text: "Riding the wavy motion 🌊" },
  system_wiggle: { font: "cursive", fontSize: 32, textColor: "#ef4444", bgColor: "#facc15", yPosition: 60, text: "Wiggle it around! 💃" },
  system_beasty: { font: "Impact", fontSize: 36, textColor: "#4ade80", bgColor: "#000000", yPosition: 75, text: "BEAST VIRAL STYLE 🔥" },
  system_luxury: { font: "Georgia", fontSize: 28, textColor: "#facc15", bgColor: "", yPosition: 80, text: "Elegant Luxury Gold ✨" },
  system_karaoke: { font: "Montserrat", fontSize: 30, textColor: "#d946ef", bgColor: "", yPosition: 70, text: "The quick brown fox jumps over" },
  system_minimal: { font: "sans-serif", fontSize: 22, textColor: "#ffffff", bgColor: "", yPosition: 85, text: "Simple minimal caption" },
  system_solid: { font: "sans-serif", fontSize: 26, textColor: "#ffffff", bgColor: "#1e293b", yPosition: 75, text: "Solid background box" },
  system_blue: { font: "Montserrat", fontSize: 30, textColor: "#00d2ff", bgColor: "", yPosition: 75, text: "Blue Caption Style" },
  system_deep_diver: { font: "sans-serif", fontSize: 26, textColor: "#000000", bgColor: "#ffffff", yPosition: 75, text: "Deep Diver Style" },
  system_popline: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "#7c3aed", yPosition: 75, text: "Popline Style" },
  system_phantom: { font: "Impact", fontSize: 34, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "PHANTOM STYLE" },
  system_playdate: { font: "Georgia", fontSize: 30, textColor: "#f97316", bgColor: "", yPosition: 75, text: "Playdate Style" },
  system_galaxy: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "#5b21b6", yPosition: 75, text: "Galaxy Style" },
  system_turban: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "#4f46e5", yPosition: 75, text: "Turban Style" },
  system_flipper: { font: "Montserrat", fontSize: 32, textColor: "#000000", bgColor: "#eab308", yPosition: 75, text: "Flipper Style" },
  system_spell: { font: "Montserrat", fontSize: 30, textColor: "#ffffff", bgColor: "#a855f7", yPosition: 75, text: "Spell Style" },
  system_youshaei: { font: "Montserrat", fontSize: 32, textColor: "#22c55e", bgColor: "", yPosition: 75, text: "Youshaei Style" },
  system_noah: { font: "sans-serif", fontSize: 30, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "Noah Style" },
  system_drive: { font: "Impact", fontSize: 32, textColor: "#3b82f6", bgColor: "#000000", yPosition: 75, text: "DRIVE STYLE" },
  system_orange: { font: "Impact", fontSize: 34, textColor: "#ea580c", bgColor: "", yPosition: 75, text: "ORANGE STYLE" },
  system_ghost: { font: "sans-serif", fontSize: 30, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "Ghost Style" },
  system_pro_box: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "#0f172a", yPosition: 75, text: "Pro Box Style" },
  system_webster: { font: "Montserrat", fontSize: 30, textColor: "#ef4444", bgColor: "", yPosition: 75, text: "Webster Style" },
  system_lumina: { font: "Georgia", fontSize: 32, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "Lumina Style" },
  system_indigo: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "#4338ca", yPosition: 75, text: "Indigo Style" },
  system_ember: { font: "Impact", fontSize: 32, textColor: "#f97316", bgColor: "", yPosition: 75, text: "EMBER STYLE" },
  system_glow: { font: "sans-serif", fontSize: 32, textColor: "#22c55e", bgColor: "", yPosition: 75, text: "Glow Style" },
  system_impact: { font: "Impact", fontSize: 36, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "IMPACT STYLE" },
  system_notes: { font: "cursive", fontSize: 28, textColor: "#facc15", bgColor: "", yPosition: 75, text: "Notes Style" },
  system_vintage: { font: "Georgia", fontSize: 26, textColor: "#d1fae5", bgColor: "", yPosition: 75, text: "Vintage Classic Style" },
  system_mint: { font: "Montserrat", fontSize: 30, textColor: "#a7f3d0", bgColor: "", yPosition: 75, text: "Mint Fresh Style" },
  system_one_punch: { font: "Impact", fontSize: 36, textColor: "#ef4444", bgColor: "#000000", yPosition: 75, text: "ONE PUNCH POWER" },
  system_silka: { font: "sans-serif", fontSize: 28, textColor: "#ffffff", bgColor: "", yPosition: 75, text: "Silka Clean Caption" },
  system_headlines: { font: "Montserrat", fontSize: 34, textColor: "#ffffff", bgColor: "#1e3a8a", yPosition: 75, text: "HEADLINES NEWS STYLE" },
  system_wasabi: { font: "Montserrat", fontSize: 30, textColor: "#84cc16", bgColor: "", yPosition: 75, text: "Wasabi Green Style" },
  system_zen: { font: "Georgia", fontSize: 26, textColor: "#f5f5f4", bgColor: "", yPosition: 75, text: "Zen Peaceful Caption" },
  system_tech_talk: { font: "monospace", fontSize: 28, textColor: "#38bdf8", bgColor: "#090d16", yPosition: 75, text: "Tech Talk Terminal" },
  system_yc: { font: "Montserrat", fontSize: 32, textColor: "#ff6600", bgColor: "", yPosition: 75, text: "YC Orange Style" },
  system_popping: { font: "Montserrat", fontSize: 34, textColor: "#ec4899", bgColor: "", yPosition: 75, text: "Popping Pink Style" },
};

const PRESET_CATEGORIES = [
  { id: "all", label: "All Styles" },
  { id: "dynamic", label: "Dynamic & Glitch" },
  { id: "glow", label: "Neon & Glow" },
  { id: "bold", label: "Bold & Viral" },
  { id: "clean", label: "Clean & Minimal" },
];

type ToolType = "captions" | "dubbing" | "reframe" | "transcription" | "edit-videos" | "audiogram";

interface ReapCatalogItem {
  id?: string;
  code?: string;
  label: string;
}

interface CatalogState {
  languages: ReapCatalogItem[];
  dubbingSourceLanguages: ReapCatalogItem[];
  dubbingLanguages: ReapCatalogItem[];
  captionPresets: ReapCatalogItem[];
  brandTemplates: ReapCatalogItem[];
  loading: boolean;
}

const TOOL_DETAILS: Record<ToolType, {
  title: string;
  desc: string;
  cost: number;
  icon: any;
  color: string;
  illustration: string;
  features: string[];
}> = {
  "captions": {
    title: "AI Captions",
    desc: "Automatically generate accurate captions with custom styles.",
    cost: 50,
    icon: Type,
    color: "from-blue-500 to-indigo-600",
    illustration: "/ai_captions.png",
    features: [
      "Auto-generated captions perfectly synced with speech",
      "Over 20 premium designed caption styles and animation presets",
      "Multi-language support for 98+ global languages"
    ]
  },
  "dubbing": {
    title: "AI Dubbing",
    desc: "Dub your video voices instantly into other languages with natural voice synthesis.",
    cost: 120,
    icon: Languages,
    color: "from-indigo-500 to-purple-500",
    illustration: "/ai_dubbing.png",
    features: [
      "Translate and dub human voices with highly realistic AI voiceovers",
      "Preserves original speaker's vocal tone and expression",
      "Seamless cross-language synchronization"
    ]
  },
  "reframe": {
    title: "Auto Reframe",
    desc: "Intelligently crop your video for different formats (vertical TikTok, square Insta, etc.).",
    cost: 80,
    icon: Maximize2,
    color: "from-pink-500 to-rose-500",
    illustration: "/ai_reframe.png",
    features: [
      "AI focal point tracker dynamically reframes video to vertical",
      "One-click aspect ratio conversions (9:16, 1:1, 16:9)",
      "Perfect for repurposing landscape videos into short-form content"
    ]
  },
  "transcription": {
    title: "Transcription",
    desc: "Transcribe audio & video into highly accurate text transcripts.",
    cost: 30,
    icon: FileText,
    color: "from-emerald-500 to-teal-500",
    illustration: "/ai_captions.png",
    features: [
      "99% accurate speech-to-text transcription for various languages",
      "Generate downloadable subtitle and script files (TXT, SRT, VTT)",
      "Smart speaker separation and silence detection"
    ]
  },
  "edit-videos": {
    title: "AI Video Editor",
    desc: "Provide text instructions to edit, merge, clip or tweak your video dynamically.",
    cost: 150,
    icon: Video,
    color: "from-amber-500 to-orange-500",
    illustration: "/ai_reframe.png",
    features: [
      "Smart edits using natural text prompts without timeline complexity",
      "Auto-clip highlights and extract engaging moments from long videos",
      "Intelligent transitions and camera angle selections"
    ]
  },
  "audiogram": {
    title: "Audiograms",
    desc: "Convert audio-only podcasts and voice tracks into engaging social media videos with waveforms.",
    cost: 80,
    icon: Music,
    color: "from-violet-500 to-fuchsia-500",
    illustration: "/ai_captions.png",
    features: [
      "Dynamic audio visualizer waveform synced with sound",
      "Branded logo and background overlay images",
      "Fully synced captions and progress bar visualizer"
    ]
  }
};

const STEPS = [
  {
    num: "01",
    title: "Select Tool",
    desc: "Choose one of the 5 AI-powered tools to process your media.",
    icon: Cpu,
  },
  {
    num: "02",
    title: "Upload Media",
    desc: "Drag and drop your MP4/MP3 file into the upload zone.",
    icon: Upload,
  },
  {
    num: "03",
    title: "Customize Options",
    desc: "Set languages, aspect ratios, or custom preset styles.",
    icon: Globe,
  },
  {
    num: "04",
    title: "Generate & Save",
    desc: "Process and download your finalized post-production file.",
    icon: Zap,
  }
];

export default function ClipCraftStudioPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTool, setActiveTool] = useState<ToolType>("captions");

  useEffect(() => {
    if (pathname.includes("/clipcraft-studio/captions")) {
      setActiveTool("captions");
    } else if (pathname.includes("/clipcraft-studio/dubbing")) {
      setActiveTool("dubbing");
    } else if (pathname.includes("/clipcraft-studio/reframe")) {
      setActiveTool("reframe");
    } else if (pathname.includes("/clipcraft-studio/transcription")) {
      setActiveTool("transcription");
    } else if (pathname.includes("/clipcraft-studio/edit-videos")) {
      setActiveTool("edit-videos");
    } else if (pathname.includes("/clipcraft-studio/audiogram")) {
      setActiveTool("audiogram");
    }
  }, [pathname]);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form options
  const [language, setLanguage] = useState("auto");
  const [sourceLang, setSourceLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("ar-EG");
  const [captionStyle, setCaptionStyle] = useState("system_modern_bold");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [editPrompt, setEditPrompt] = useState("");
  const [brandTemplateId, setBrandTemplateId] = useState("");
  const [dubbingVoice, setDubbingVoice] = useState("Omar");

  // Audiogram form options
  const [waveformTemplate, setWaveformTemplate] = useState("wave");
  const [audiogramOrientation, setAudiogramOrientation] = useState("square");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadId, setLogoUploadId] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundUploadId, setBackgroundUploadId] = useState("");
  const [backgroundUploading, setBackgroundUploading] = useState(false);

  // Genre and advanced edits
  const [genre, setGenre] = useState("talking");
  const [enableFaceTracking, setEnableFaceTracking] = useState(false);
  const [enableAutoHooks, setEnableAutoHooks] = useState(false);

  // Advanced captions & link options
  const [sourceUrl, setSourceUrl] = useState("");
  const [translateTo, setTranslateTo] = useState("none");
  const [transcriptionScript, setTranscriptionScript] = useState<"native" | "roman">("native");
  const [resolution, setResolution] = useState(720);
  const [enableEmojis, setEnableEmojis] = useState(true);
  const [enableHighlights, setEnableHighlights] = useState(true);
  const [activeStyleTab, setActiveStyleTab] = useState<"presets" | "brands">("presets");
  const [selectedPresetCategory, setSelectedPresetCategory] = useState("all");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("templates");

  useEffect(() => {
    const linkedSourceUrl = searchParams.get("sourceUrl") || searchParams.get("videoUrl");
    if (!linkedSourceUrl || !/^https?:\/\//i.test(linkedSourceUrl)) return;
    setSourceUrl(linkedSourceUrl);
    setFile(null);
    setIsDemoMode(false);
  }, [searchParams]);

  useEffect(() => {
    if (activeTool === "captions" || activeTool === "audiogram") {
      setActiveSubTab("templates");
    } else if (activeTool === "reframe") {
      setActiveSubTab("reframe");
    } else if (activeTool === "transcription") {
      setActiveSubTab("transcript");
    } else if (activeTool === "edit-videos") {
      setActiveSubTab("tools");
    }
  }, [activeTool]);

  // Reframe & clipping advanced options
  const [disableAutoSplit, setDisableAutoSplit] = useState(false);
  const [reframeClips, setReframeClips] = useState(false);
  const [exportOrientation, setExportOrientation] = useState("landscape");
  const [exportResolution, setExportResolution] = useState(720);
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [topics, setTopics] = useState("");
  const [clipDurations, setClipDurations] = useState<Array<[number, number]>>([]);

  // Interactive design canvas states
  const [canvasText, setCanvasText] = useState("Create videos that captivate your audience.");
  const [canvasFont, setCanvasFont] = useState("Montserrat");
  const [canvasFontSize, setCanvasFontSize] = useState(32);
  const [canvasTextColor, setCanvasTextColor] = useState("#ffffff");
  const [canvasBgColor, setCanvasBgColor] = useState("");
  const [canvasYPosition, setCanvasYPosition] = useState(75);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(3.0);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= 12.0) {
            return 0.0;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const isWorkspaceActive = file || sourceUrl.trim() || isDemoMode;

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isWorkspaceActive) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    };
  }, [isWorkspaceActive]);

  // Clips Dashboard state
  const [clipsList, setClipsList] = useState<Array<{ id: string; url: string; label: string; status: "Draft" | "Scheduled" | "Published" }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHooksModal, setShowHooksModal] = useState(false);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<Array<{ id: string; prompt: string; projectId: string; outputUrl: string; model: string; cost: number; createdAt: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Loading, polling & results
  const [status, setStatus] = useState<"idle" | "uploading" | "queued" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Result output
  const [resultUrl, setResultUrl] = useState("");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  // Catalog data from backend
  const [catalog, setCatalog] = useState<CatalogState>({
    languages: [],
    dubbingSourceLanguages: [],
    dubbingLanguages: [],
    captionPresets: [],
    brandTemplates: [],
    loading: true,
  });

  const combinedCaptionPresets = useMemo(() => {
    const defaultNew = Object.keys(PRESET_STYLES).map((key) => {
      const name = key.replace("system_", "").replace(/_/g, " ");
      const capitalized = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      
      let emoji = "";
      if (key === "system_candy") emoji = " 🍭";
      else if (key === "system_glitch") emoji = " 👾";
      else if (key === "system_prism") emoji = " 🌈";
      else if (key === "system_ticker") emoji = " 📰";
      else if (key === "system_trophy") emoji = " 🏆";
      else if (key === "system_typewriter") emoji = " ⌨️";
      else if (key === "system_wavy") emoji = " 🌊";
      else if (key === "system_wiggle") emoji = " 💃";
      else if (key === "system_beasty") emoji = " 🔥";
      else if (key === "system_luxury") emoji = " ✨";
      else if (key === "system_karaoke") emoji = " 🎤";
      else if (key === "system_minimal") emoji = " 💼";

      return {
        id: key,
        label: capitalized + emoji
      };
    });
    const existing = catalog.captionPresets || [];
    const validExisting = existing.filter(p => p && typeof p.id === "string");
    const ids = new Set(validExisting.map(p => p.id));
    const merged = [...validExisting];
    for (const item of defaultNew) {
      if (!ids.has(item.id)) {
        merged.push(item);
      }
    }
    return merged;
  }, [catalog.captionPresets]);

  const applyPresetStyles = (presetId: string) => {
    const normalizedId = presetId.toLowerCase().startsWith("system_") 
      ? presetId 
      : `system_${presetId.toLowerCase().replace(/[\s-]/g, "_")}`;
      
    const style = PRESET_STYLES[presetId] || PRESET_STYLES[normalizedId] || PRESET_STYLES[presetId.toLowerCase()];
    if (style) {
      setCanvasFont(style.font);
      setCanvasFontSize(style.fontSize);
      setCanvasTextColor(style.textColor);
      setCanvasBgColor(style.bgColor);
      setCanvasYPosition(style.yPosition);
      
      // If canvasText is empty or is one of the preset texts, update it to the new preset text
      const isPresetText = Object.values(PRESET_STYLES).some(p => p.text === canvasText);
      if (canvasText.trim() === "" || canvasText === "Double-click to edit this caption text!" || isPresetText) {
        setCanvasText(style.text);
      }
    }
  };

  const applyBrandStyles = (brandId: string, label: string) => {
    setCanvasFont("Montserrat");
    setCanvasFontSize(30);
    setCanvasTextColor("#ffffff");
    setCanvasBgColor("#6366f1");
    setCanvasYPosition(75);
    setCanvasText(`Saad Studio: ${label}`);
  };

  const getPresetAnimationClass = (presetId: string) => {
    const id = presetId.toLowerCase().replace("system_", "");
    if (id.includes("glitch")) return "animate-mini-glitch";
    if (id.includes("glow") || id.includes("lumina")) return "animate-mini-glow";
    if (id.includes("wiggle")) return "animate-mini-wiggle";
    if (id.includes("wavy")) return "animate-mini-float";
    if (id.includes("typewriter")) return "animate-mini-blink";
    if (id.includes("candy") || id.includes("prism") || id.includes("spell")) return "animate-mini-pulse";
    if (id.includes("beasty") || id.includes("one_punch") || id.includes("impact")) return "animate-mini-bounce";
    if (id.includes("luxury") || id.includes("gold") || id.includes("ember")) return "animate-mini-skew";
    if (id.includes("ticker") || id.includes("headlines")) return "animate-mini-tracking";
    if (id.includes("flipper") || id.includes("wasabi")) return "animate-mini-shake";
    return "animate-mini-slide";
  };

  const filterPresetsByCategory = (presets: any[], categoryId: string) => {
    const validPresets = presets.filter(p => p && typeof p.id === "string");
    if (categoryId === "all") return validPresets;
    return validPresets.filter(preset => {
      const id = preset.id.toLowerCase();
      if (categoryId === "dynamic") {
        return id.includes("glitch") || id.includes("wavy") || id.includes("wiggle") || id.includes("spell") || id.includes("kinetic") || id.includes("typewriter") || id.includes("candy") || id.includes("prism") || id.includes("flipper") || id.includes("wasabi") || id.includes("ember") || id.includes("karaoke") || id.includes("tech_talk") || id.includes("popping");
      }
      if (categoryId === "glow") {
        return id.includes("glow") || id.includes("lumina") || id.includes("neon") || id.includes("halo") || id.includes("pulse") || id.includes("blue") || id.includes("deep") || id.includes("galaxy") || id.includes("indigo") || id.includes("prism") || id.includes("karaoke") || id.includes("popping");
      }
      if (categoryId === "bold") {
        return id.includes("beasty") || id.includes("impact") || id.includes("one_punch") || id.includes("headlines") || id.includes("trophy") || id.includes("drive") || id.includes("orange") || id.includes("ember") || id.includes("hype") || id.includes("phantom") || id.includes("luxury") || id.includes("popline") || id.includes("webster") || id.includes("yc");
      }
      if (categoryId === "clean") {
        return id.includes("minimal") || id.includes("solid") || id.includes("silka") || id.includes("zen") || id.includes("notes") || id.includes("vintage") || id.includes("mint") || id.includes("playdate") || id.includes("youshaei") || id.includes("noah") || id.includes("ghost") || id.includes("turban") || id.includes("classic") || id.includes("ticker") || id.includes("pro_box");
      }
      return true;
    });
  };

  const renderPresetCard = (
    preset: { id: string; label: string },
    isSelected: boolean,
    onClick: () => void
  ) => {
    const styleInfo = PRESET_STYLES[preset.id] || PRESET_STYLES[`system_${preset.id.toLowerCase().replace(/[\s-]/g, "_")}`];
    const animClass = getPresetAnimationClass(preset.id);
    
    const font = styleInfo?.font || "sans-serif";
    const textColor = styleInfo?.textColor || "#ffffff";
    const bgColor = styleInfo?.bgColor || "";
    
    return (
      <button
        key={preset.id}
        type="button"
        onClick={onClick}
        className={`h-11 w-32 flex-shrink-0 flex items-center justify-center gap-1.5 rounded-lg border text-center transition-all duration-200 relative overflow-hidden select-none px-2 ${
          isSelected
            ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] scale-105 z-10"
            : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-350 hover:scale-[1.02]"
        }`}
        style={{
          fontFamily: font === 'Impact' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' : font,
        }}
      >
        <span
          className={`text-[10px] font-extrabold truncate uppercase tracking-wider ${animClass}`}
          style={{
            color: isSelected ? undefined : textColor,
            backgroundColor: bgColor && !isSelected ? `${bgColor}33` : undefined,
            padding: bgColor && !isSelected ? "2px 4px" : undefined,
            borderRadius: bgColor ? "3px" : undefined,
            textShadow: bgColor ? "none" : "1px 1px 1px rgba(0,0,0,0.5)"
          }}
        >
          {preset.label.replace(" (NEW)", "").replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '') || preset.label}
        </span>
        {preset.label.includes("🍭") && <span className="text-xs">🍭</span>}
        {preset.label.includes("👾") && <span className="text-xs">👾</span>}
        {preset.label.includes("🌈") && <span className="text-xs">🌈</span>}
        {preset.label.includes("📰") && <span className="text-xs">📰</span>}
        {preset.label.includes("🏆") && <span className="text-xs">🏆</span>}
        {preset.label.includes("⌨️") && <span className="text-xs">⌨️</span>}
        {preset.label.includes("🌊") && <span className="text-xs">🌊</span>}
        {preset.label.includes("💃") && <span className="text-xs">💃</span>}
        {preset.label.includes("🔥") && <span className="text-xs">🔥</span>}
        {preset.label.includes("✨") && <span className="text-xs">✨</span>}
        {preset.label.includes("🎤") && <span className="text-xs">🎤</span>}
        {preset.label.includes("💼") && <span className="text-xs">💼</span>}
      </button>
    );
  };

  const renderBrandCard = (
    template: { id?: string; code?: string; label: string },
    isSelected: boolean,
    onClick: () => void
  ) => {
    return (
      <button
        key={template.id || template.code || template.label}
        type="button"
        onClick={onClick}
        className={`h-11 w-32 flex-shrink-0 flex items-center justify-center gap-1.5 rounded-lg border text-center transition-all duration-200 px-2 relative ${
          isSelected
            ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] scale-105 z-10"
            : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-350 hover:scale-[1.02]"
        }`}
      >
        <span className="text-xs">💼</span>
        <span className="text-[10px] font-bold truncate max-w-full">
          {template.label}
        </span>
      </button>
    );
  };

  const getExportButtonConfig = () => {
    switch (activeTool) {
      case "captions":
        return { label: "Export Captions · ~10 cr/min", color: "bg-blue-600 text-slate-100 hover:bg-blue-550" };
      case "dubbing":
        return { label: "Export · ~24 cr/min", color: "bg-purple-650 text-slate-100 hover:bg-purple-550" };
      case "reframe":
        return { label: "Export All · ~16 cr/min", color: "bg-rose-500 text-slate-100 hover:bg-rose-450" };
      case "transcription":
        return { label: "Export · ~6 cr/min", color: "bg-teal-500 text-slate-950 hover:bg-teal-400" };
      case "edit-videos":
        return { label: "Export Video · ~30 cr/min", color: "bg-orange-500 text-slate-950 hover:bg-orange-400" };
      case "audiogram":
        return { label: "Export · ~10 cr/min", color: "bg-violet-650 text-slate-100 hover:bg-violet-550" };
      default:
        return { label: "Export · pay per minute", color: "bg-cyan-500 text-slate-950 hover:bg-cyan-400" };
    }
  };

  const renderUploadLandingView = () => {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Video Post-Production
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ClipCraft Studio
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Upload your raw footage or audio clip to automatically generate subtitles, translate voices, smart edit, reframe and create stunning posts in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-slate-950/40 backdrop-blur-xl ${
              dragActive
                ? "border-cyan-500 bg-cyan-500/5"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/10"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-4 rounded-full bg-slate-900 text-cyan-400 border border-slate-800">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-200">Upload Media File</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">
                Drag and drop your MP4, MOV, MP3, or WAV here, or click to browse
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-8 bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Paste Media Link
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/video.mp4"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-805 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800/60"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-600 uppercase">Or</span>
                <div className="flex-grow border-t border-slate-800/60"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-300 font-sans">No files ready?</p>
                <p className="text-xs text-slate-500 mt-1">
                  Start with a simulated demo project to test all workspaces immediately.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDemoMode(true);
                setCanvasText("Create videos that captivate your audience.");
                setCanvasTextColor("#ffffff");
                setCanvasBgColor("#06b6d4");
                setCanvasFont("Montserrat");
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 font-bold text-slate-950 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Use Simulated Demo Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveWorkspace = () => {
    switch (activeTool) {
      case "captions":
        return renderCaptionsWorkspace();
      case "dubbing":
        return renderDubbingWorkspace();
      case "reframe":
        return renderReframeWorkspace();
      case "transcription":
        return renderTranscriptionWorkspace();
      case "edit-videos":
        return renderVideoEditorWorkspace();
      case "audiogram":
        return renderAudiogramsWorkspace();
      default:
        return null;
    }
  };

  const renderCaptionsWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        {/* Left Column: Vertical tab bar + Style list presets */}
        <div className="w-full lg:w-[360px] flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex overflow-hidden min-h-0">
          <div className="w-20 border-r border-slate-900 bg-[#070b16]/90 flex flex-col items-center py-4 gap-2 flex-shrink-0">
            {[
              { id: "templates", label: "Templates", icon: Sparkles },
              { id: "text", label: "Text", icon: Type },
              { id: "animations", label: "Animations", icon: Activity },
              { id: "position", label: "Position", icon: Maximize2 },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  title={tab.label}
                  className={`w-full py-4 flex flex-col items-center justify-center gap-1 transition-all ${
                    active
                      ? "text-blue-400 bg-[#0c1224] border-l-2 border-blue-500"
                      : "text-slate-500 hover:text-slate-350 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-bold tracking-wide mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-grow p-5 flex flex-col min-h-0 overflow-hidden">
            {activeSubTab === "templates" && (
              <div className="flex flex-col h-full min-h-0 space-y-4">
                <div className="flex justify-between items-center flex-shrink-0">
                  <h3 className="text-sm font-bold text-slate-200">Style</h3>
                </div>
                
                {/* Scrollable single-column style presets list */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-1.5 custom-scrollbar min-h-0 mb-2 pb-2 flex flex-col justify-between">
                  <div className="space-y-3">
                    {combinedCaptionPresets.map((preset) => {
                      const presetId = preset.id;
                      if (!presetId) return null;
                      const isSelected = captionStyle === presetId;
                      const styleInfo = PRESET_STYLES[presetId] || PRESET_STYLES[`system_${presetId.toLowerCase().replace(/[\s-]/g, "_")}`] || { font: 'sans-serif', textColor: '#ffffff', bgColor: '' };
                      const font = styleInfo.font;
                      const textColor = styleInfo.textColor;
                      const bgColor = styleInfo.bgColor;
                      const animClass = getPresetAnimationClass(presetId);
                      
                      const cleanLabel = preset.label.replace(" (NEW)", "").replace(" 🎤", "").replace(" 🍭", "").replace(" 👾", "").replace(" 🌈", "").replace(" 📰", "").replace(" 🏆", "").replace(" ⌨️", "").replace(" 🌊", "").replace(" 💃", "").replace(" 🔥", "").replace(" ✨", "").replace(" 💼", "");
                      const formattedLabel = cleanLabel === "Modern Bold" ? "Modern-Bold" : cleanLabel;

                      return (
                        <button
                          key={presetId}
                          type="button"
                          onClick={() => {
                            setCaptionStyle(presetId);
                            setBrandTemplateId("");
                            applyPresetStyles(presetId);
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-3 relative ${
                            isSelected
                              ? "bg-[#0b0f1d] border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                              : "bg-[#070b16]/40 border-slate-900 hover:border-slate-850 hover:bg-[#070b16]/80"
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className={`text-[12px] font-bold ${
                              isSelected ? "text-blue-400" : "text-slate-400"
                            }`}>
                              {formattedLabel}
                            </span>
                            <svg
                              viewBox="0 0 24 24"
                              fill={isSelected ? "#3b82f6" : "none"}
                              stroke={isSelected ? "#3b82f6" : "currentColor"}
                              className={`w-3.5 h-3.5 ${isSelected ? "text-blue-500" : "text-slate-600"}`}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </div>
                          
                          {/* Styled text directly inside the card */}
                          <div className="w-full py-2 flex items-center justify-center min-h-[50px]">
                            {preset.id === 'system_highlight' ? (
                              <div className={`text-center font-extrabold text-[12px] leading-tight select-none flex flex-col items-center gap-1 ${animClass}`} style={{ fontFamily: font === 'Impact' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' : font }}>
                                <span className="bg-[#facc15] text-[#000000] px-1.5 py-0.5 rounded font-black">The quick brown</span>
                                <span className="bg-[#facc15] text-[#000000] px-1.5 py-0.5 rounded font-black">fox jumps over</span>
                              </div>
                            ) : preset.id === 'system_neonize' || preset.id === 'system_karaoke' ? (
                              <span className={`text-center font-extrabold text-[13px] leading-tight select-none ${animClass}`} style={{ fontFamily: font }}>
                                <span style={{ color: '#d946ef' }}>The quick brown</span><br />
                                <span style={{ color: '#ffffff' }}>fox jumps over</span>
                              </span>
                            ) : preset.id === 'system_modern_bold' ? (
                              <span className={`text-center font-black text-[13px] leading-tight select-none ${animClass}`} style={{ fontFamily: font, color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.85)' }}>
                                The quick brown<br />fox jumps over
                              </span>
                            ) : preset.id === 'system_classic' ? (
                              <span className={`text-center font-medium italic text-[12px] leading-tight select-none ${animClass}`} style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}>
                                The quick brown<br />fox jumps over
                              </span>
                            ) : (
                              <span
                                className={`text-center font-extrabold text-[12px] leading-tight select-none ${animClass}`}
                                style={{
                                  fontFamily: font === 'Impact' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' : font,
                                  color: textColor || '#ffffff',
                                  backgroundColor: bgColor ? `${bgColor}66` : 'transparent',
                                  border: bgColor ? `1px solid ${bgColor}99` : 'none',
                                  padding: bgColor ? "4px 8px" : undefined,
                                  borderRadius: bgColor ? "4px" : undefined,
                                  textShadow: bgColor ? 'none' : '1px 1px 1px rgba(0,0,0,0.8)'
                                }}
                              >
                                The quick brown<br />fox jumps over
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* + New Style button at bottom of preset list */}
                  <div className="pt-4 flex-shrink-0">
                    <button className="w-full py-2.5 rounded-xl border border-blue-500/30 bg-[#070b16]/30 text-blue-400 hover:bg-[#070b16]/60 hover:border-blue-500 hover:text-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>New Style</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "text" && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Font Options</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Font Family</label>
                    <select
                      value={canvasFont}
                      onChange={(e) => setCanvasFont(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-850 p-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="sans-serif">System Sans</option>
                      <option value="Montserrat">Montserrat (Modern)</option>
                      <option value="Impact">Impact (Meme/Viral)</option>
                      <option value="Georgia">Georgia (Serif)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505">Size ({canvasFontSize}px)</label>
                    <input
                      type="range"
                      min={14}
                      max={42}
                      value={canvasFontSize}
                      onChange={(e) => setCanvasFontSize(Number(e.target.value))}
                      className="w-full accent-cyan-500 mt-1 cursor-pointer bg-slate-850"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505">Text</label>
                    <textarea
                      value={canvasText}
                      onChange={(e) => setCanvasText(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-850 p-2 text-xs text-slate-200 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "animations" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Animations</h3>
                <p className="text-[10px] text-slate-505">Select how words animate when spoken.</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Bounce", "Pulse", "Glitch", "Fade", "Slide"].map(anim => (
                    <button
                      key={anim}
                      className="p-2.5 rounded-lg border border-slate-900 bg-slate-900/40 text-left text-xs font-medium text-slate-300 hover:border-slate-850"
                    >
                      {anim}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSubTab === "position" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Position</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-505">Vertical Alignment ({canvasYPosition}%)</label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={canvasYPosition}
                    onChange={(e) => setCanvasYPosition(Number(e.target.value))}
                    className="w-full accent-cyan-500 mt-1"
                  />
                </div>
              </div>
            )}

            {activeSubTab === "settings" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advanced</h3>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                  <span className="text-xs text-slate-300">Enable Emojis</span>
                  <input
                    type="checkbox"
                    checked={enableEmojis}
                    onChange={(e) => setEnableEmojis(e.target.checked)}
                    className="accent-cyan-500"
                  />
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                  <span className="text-xs text-slate-300">Word Highlights</span>
                  <input
                    type="checkbox"
                    checked={enableHighlights}
                    onChange={(e) => setEnableHighlights(e.target.checked)}
                    className="accent-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player and Timeline */}
        <div className="flex-grow flex flex-col justify-between gap-4 min-h-0">
          {/* Aspect-Video Player Container */}
          <div className="flex-grow rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-4 flex flex-col justify-between relative min-h-0">
            <div className="flex-grow flex items-center justify-center min-h-0 relative py-2">
              <div className="relative aspect-video h-full max-h-[340px] border border-slate-900 bg-slate-900/40 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                <img
                  src="/talking_head_speaker.png"
                  alt="Speaker talking head"
                  className="w-full h-full object-cover select-none pointer-events-none absolute inset-0"
                />
                <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />

                {/* Dynamic Styled Subtitle text overlay */}
                <div
                  style={{
                    position: 'absolute',
                    left: '10%',
                    right: '10%',
                    top: `${canvasYPosition}%`,
                    transform: 'translateY(-50%)',
                    fontFamily: canvasFont === 'Impact' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' : canvasFont,
                    fontSize: `${canvasFontSize}px`,
                    color: canvasTextColor,
                    backgroundColor: canvasBgColor ? `${canvasBgColor}cc` : 'transparent',
                    boxShadow: canvasBgColor ? '0 8px 24px rgba(0,0,0,0.65)' : 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    lineHeight: '1.25',
                    textShadow: canvasBgColor ? 'none' : '2px 2px 4px rgba(0,0,0,0.95)',
                    wordBreak: 'break-word',
                    zIndex: 30,
                  }}
                >
                  {(() => {
                    const words = [
                      { text: "Create", start: 0.0, end: 1.2 },
                      { text: "videos", start: 1.2, end: 2.5 },
                      { text: "that", start: 2.5, end: 3.0 },
                      { text: "captivate", start: 3.0, end: 7.0 },
                      { text: "your", start: 7.0, end: 9.0 },
                      { text: "audience.", start: 9.0, end: 12.0 }
                    ];

                    return (
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                        {words.map((w, idx) => {
                          const isActive = currentTimeSec >= w.start && currentTimeSec < w.end;
                          
                          if (captionStyle === 'system_highlight') {
                            return (
                              <span
                                key={idx}
                                className={`transition-all duration-200 px-1.5 py-0.5 rounded font-black ${
                                  isActive
                                    ? "bg-[#facc15] text-[#000000] shadow-sm scale-105"
                                    : "text-white opacity-90"
                                }`}
                              >
                                {w.text}
                              </span>
                            );
                          } else if (captionStyle === 'system_neonize' || captionStyle === 'system_karaoke') {
                            return (
                              <span
                                key={idx}
                                style={{
                                  color: isActive ? '#d946ef' : '#ffffff',
                                  textShadow: isActive ? '0 0 8px #d946ef' : 'none',
                                }}
                                className={`transition-all duration-200 ${isActive ? 'font-black scale-105' : 'font-extrabold'}`}
                              >
                                {w.text}
                              </span>
                            );
                          } else if (captionStyle === 'system_modern_bold') {
                            return (
                              <span
                                key={idx}
                                style={{
                                  color: isActive ? '#3b82f6' : '#ffffff',
                                }}
                                className={`font-black tracking-wide transition-all duration-200 ${
                                  isActive ? "scale-105" : ""
                                }`}
                              >
                                {w.text}
                              </span>
                            );
                          } else if (captionStyle === 'system_classic') {
                            return (
                              <span
                                key={idx}
                                style={{
                                  color: isActive ? '#3b82f6' : '#ffffff',
                                  fontFamily: 'Georgia, serif'
                                }}
                                className={`italic font-medium transition-all duration-200 ${
                                  isActive ? "underline decoration-blue-500/50" : ""
                                }`}
                              >
                                {w.text}
                              </span>
                            );
                          } else {
                            return (
                              <span
                                key={idx}
                                style={{
                                  color: isActive ? '#3b82f6' : '#ffffff',
                                }}
                                className={`font-bold transition-all duration-200 ${
                                  isActive ? "scale-105" : ""
                                }`}
                              >
                                {w.text}
                              </span>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex-shrink-0 flex items-center justify-between mt-3 text-slate-400 text-xs pt-3 border-t border-slate-900/40 bg-slate-950/20 px-2 rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-blue-500 hover:text-blue-400 transition-colors bg-slate-900 p-2 rounded-lg border border-slate-800"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={() => setCurrentTimeSec((prev) => Math.max(0, prev - 1.0))}
                  className="hover:text-slate-200 transition-colors p-2 rounded bg-slate-900/40"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentTimeSec((prev) => Math.min(12.0, prev + 1.0))}
                  className="hover:text-slate-200 transition-colors p-2 rounded bg-slate-900/40"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-500 text-[10px] ml-1">
                  00:0{Math.floor(currentTimeSec)} / 00:12
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-blue-500 font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px]">
                  CC
                </button>
                <Maximize2 className="w-3.5 h-3.5 cursor-pointer hover:text-slate-200 transition-colors" />
              </div>
            </div>
          </div>

          {/* High-Fidelity Timeline Track */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col justify-between relative min-h-0 h-44 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block mb-1">Subtitles Timeline Track</span>
            
            <div className="flex items-center h-28 relative min-h-0 bg-[#070b16]/60 border border-slate-900/60 rounded-xl p-3">
              {/* Left side: Mute Button */}
              <div className="w-12 flex-shrink-0 flex items-center justify-start">
                <button className="w-9 h-11 rounded-lg bg-[#0b0f19] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200">
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right side: Ticks ruler + clips track + playhead */}
              <div className="flex-grow h-full relative flex flex-col justify-between min-w-0">
                {/* Ruler ticks */}
                <div className="relative w-full h-5 flex justify-between text-[8px] font-mono text-slate-500 select-none border-b border-slate-800/40 pb-1">
                  {["00:00", "00:02", "00:04", "00:06", "00:08", "00:10", "00:12"].map((tick, index) => (
                    <div key={index} className="relative flex flex-col items-center">
                      <span>{tick}</span>
                      <div className="w-px h-1.5 bg-slate-800 absolute bottom-0" />
                    </div>
                  ))}
                </div>

                {/* Clips track with SVG audio waveform backdrop */}
                <div className="relative w-full h-12 flex items-center gap-1.5 min-w-0 mt-2">
                  <div className="absolute inset-0 h-full w-full opacity-35 pointer-events-none z-0">
                    <svg className="w-full h-full text-blue-900/40" preserveAspectRatio="none" viewBox="0 0 100 20">
                      <path d="M 0 10 Q 2 5 4 10 T 8 10 T 12 5 T 16 10 T 20 15 T 24 10 T 28 10 T 32 3 T 36 10 T 40 17 T 44 10 T 48 10 T 52 8 T 56 10 T 60 12 T 64 10 T 68 10 T 72 6 T 76 10 T 80 4 T 84 10 T 88 18 T 92 10 T 96 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="0.8" />
                      <path d="M 0 10 Q 2 1 4 10 T 8 10 T 12 2 T 16 10 T 20 18 T 24 10 T 28 10 T 32 0 T 36 10 T 40 20 T 44 10 T 48 10 T 52 5 T 56 10 T 60 15 T 64 10 T 68 10 T 72 2 T 76 10 T 80 16 T 84 10 T 88 10 T 92 3 T 96 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
                    </svg>
                  </div>

                  {/* Subtitle Clip 1 */}
                  <div
                    onClick={() => {
                      setCurrentTimeSec(1.5);
                    }}
                    className={`h-11 rounded-lg border text-center transition-all flex flex-col justify-center select-none cursor-pointer z-10 ${
                      currentTimeSec < 3.0
                        ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                        : "bg-[#121626]/80 border-slate-800/60 text-slate-400 hover:border-slate-700"
                    }`}
                    style={{ width: "25%" }}
                  >
                    <span className="text-[10px] font-bold block truncate">Create videos</span>
                    <span className="text-[8px] font-mono opacity-50 block mt-0.5">00:00 - 00:03</span>
                  </div>

                  {/* Subtitle Clip 2 */}
                  <div
                    onClick={() => {
                      setCurrentTimeSec(5.0);
                    }}
                    className={`h-11 rounded-lg border text-center transition-all flex flex-col justify-center select-none cursor-pointer z-10 ${
                      currentTimeSec >= 3.0 && currentTimeSec < 7.0
                        ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                        : "bg-[#121626]/80 border-slate-800/60 text-slate-400 hover:border-slate-700"
                    }`}
                    style={{ width: "33.3%" }}
                  >
                    <span className="text-[10px] font-bold block truncate">that captivate</span>
                    <span className="text-[8px] font-mono opacity-50 block mt-0.5">00:03 - 00:07</span>
                  </div>

                  {/* Subtitle Clip 3 */}
                  <div
                    onClick={() => {
                      setCurrentTimeSec(9.5);
                    }}
                    className={`h-11 rounded-lg border text-center transition-all flex flex-col justify-center select-none cursor-pointer z-10 ${
                      currentTimeSec >= 7.0
                        ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                        : "bg-[#121626]/80 border-slate-800/60 text-slate-400 hover:border-slate-700"
                    }`}
                    style={{ width: "41.7%" }}
                  >
                    <span className="text-[10px] font-bold block truncate">your audience.</span>
                    <span className="text-[8px] font-mono opacity-50 block mt-0.5">00:07 - 00:12</span>
                  </div>
                </div>

                {/* Playhead Pin sliding indicator on ruler */}
                <div
                  className="absolute top-[17px] w-2.5 h-2.5 bg-blue-500 rounded-full pointer-events-none transition-all duration-75 transform -translate-x-1/2 z-30 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  style={{ left: `${(currentTimeSec / 12) * 100}%` }}
                />

                {/* Vertical blue playhead line */}
                <div
                  className="absolute top-5 bottom-0 w-0.5 bg-blue-500 pointer-events-none transition-all duration-75 z-20"
                  style={{ left: `${(currentTimeSec / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  const renderDubbingWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col justify-between gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col justify-between flex-grow min-h-0">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2 block">Original Video</span>
            <div className="flex-grow flex items-center justify-center min-h-0 relative py-2">
              <div className="relative aspect-video h-full max-h-[200px] bg-slate-900 rounded-xl overflow-hidden border border-slate-850 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950 flex flex-col items-center justify-center text-slate-650 gap-2">
                  <Video className="w-8 h-8 text-slate-800" />
                  <span className="text-[10px]">Playhead: 00:03</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px] mt-2 border-t border-slate-900 pt-2">
              <Play className="w-3.5 h-3.5 text-indigo-400 fill-current" />
              <span>00:03 / 00:12</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Voices</span>
              <button className="text-[9px] text-indigo-400 font-bold hover:underline">More Voices</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: "Omar", label: "Natural", image: "/omar_avatar.png" },
                { name: "Layla", label: "Warm", image: "/layla_avatar.png" },
                { name: "Hamed", label: "Deep", image: "/hamed_avatar.png" },
                { name: "Sera", label: "Soft", image: "/sera_avatar.png" }
              ].map((vc, i) => (
                <button
                  key={i}
                  onClick={() => setDubbingVoice(vc.name)}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    dubbingVoice === vc.name
                      ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                      : "bg-slate-900/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center mb-1">
                    <img src={vc.image} alt={vc.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] font-bold truncate w-full">{vc.name}</div>
                  <div className="text-[8px] text-slate-505 truncate w-full">{vc.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-grow rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 flex flex-col justify-between gap-4 min-h-0">
          <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Waveforms Comparison</span>

          <div className="space-y-4 flex-grow flex flex-col justify-center">
            <div className="space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
              <div className="flex justify-between text-[10px] text-slate-505">
                <span>Original (English)</span>
                <span>00:12</span>
              </div>
              <div className="h-10 flex gap-0.5 items-center justify-center">
                {[1, 2, 4, 6, 8, 3, 2, 5, 7, 4, 3, 6, 9, 8, 5, 2, 4, 6, 3, 1].map((h, i) => (
                  <div key={i} className="w-1 bg-indigo-500 rounded-full" style={{ height: `${h * 10}%` }} />
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Languages className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
              <div className="flex justify-between text-[10px] text-slate-550">
                <span>Dubbed (Arabic)</span>
                <span>00:12</span>
              </div>
              <div className="h-10 flex gap-0.5 items-center justify-center">
                {[1, 3, 5, 2, 4, 7, 9, 6, 4, 2, 5, 8, 7, 4, 3, 6, 5, 2, 1, 1].map((h, i) => (
                  <div key={i} className="w-1 bg-purple-500 rounded-full" style={{ height: `${h * 10}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col justify-between gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-4 flex-grow min-h-0">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block border-b border-slate-900 pb-2 mb-2">Dubbing Settings</span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-405 uppercase">Source Language</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-850 p-2 text-xs text-slate-200 outline-none"
                >
                  {LANGUAGES_WITH_FLAGS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-405 uppercase">Target Language</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-850 p-2 text-xs text-slate-200 outline-none"
                >
                  {LANGUAGES_WITH_FLAGS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-405 uppercase">Voice Accent</label>
                <select
                  value={dubbingVoice}
                  onChange={(e) => setDubbingVoice(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-855 p-2 text-xs text-slate-200 outline-none"
                >
                  <option value="Omar">Omar (Natural)</option>
                  <option value="Layla">Layla (Warm)</option>
                  <option value="Hamed">Hamed (Deep)</option>
                  <option value="Sera">Sera (Soft)</option>
                </select>
              </div>

              <button className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-lg transition-colors">
                Preview Voice
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-3">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Advanced Settings</span>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900 text-xs">
              <span className="text-slate-300">Lip Sync</span>
              <input
                type="checkbox"
                checked={enableFaceTracking}
                onChange={(e) => setEnableFaceTracking(e.target.checked)}
                className="accent-indigo-500"
              />
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900 text-xs">
              <span className="text-slate-300">Remove Noise</span>
              <input
                type="checkbox"
                checked={enableAutoHooks}
                onChange={(e) => setEnableAutoHooks(e.target.checked)}
                className="accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReframeWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        <div className="w-full lg:w-[280px] flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex overflow-hidden">
          <div className="w-16 border-r border-slate-900 bg-slate-950/80 flex flex-col items-center py-4 gap-4 flex-shrink-0">
            {[
              { id: "reframe", label: "Reframe", icon: Maximize2 },
              { id: "target", label: "Target", icon: Target },
              { id: "tracking", label: "Tracking", icon: Activity },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  title={tab.label}
                  className={`p-2.5 rounded-lg transition-all ${
                    activeSubTab === tab.id
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <div className="flex-grow p-5 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider capitalize">{activeSubTab} Config</h3>
            {activeSubTab === "reframe" && (
              <div className="space-y-3 text-xs">
                <p className="text-[10px] text-slate-505">Select orientation formats to export reframed files.</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                    <span className="text-slate-300 font-medium">9:16 vertical</span>
                    <input type="checkbox" checked={aspectRatio === "9:16"} onChange={() => setAspectRatio("9:16")} className="accent-rose-500" />
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                    <span className="text-slate-300 font-medium">1:1 square</span>
                    <input type="checkbox" checked={aspectRatio === "1:1"} onChange={() => setAspectRatio("1:1")} className="accent-rose-500" />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === "target" && (
              <div className="space-y-3">
                <label className="text-[9px] font-bold text-slate-505 uppercase">Video Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-850 p-2 text-xs text-slate-200 outline-none"
                >
                  <option value="talking">Talking Head 🗣️</option>
                  <option value="screenshare">Screen Share 🖥️</option>
                  <option value="gaming">Gaming Content 🎮</option>
                </select>
              </div>
            )}
            {activeSubTab === "tracking" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                  <span className="text-slate-300">Face Tracking</span>
                  <input type="checkbox" checked={enableFaceTracking} onChange={(e) => setEnableFaceTracking(e.target.checked)} className="accent-rose-500" />
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/20 border border-slate-900">
                  <span className="text-slate-300">Smart Crop</span>
                  <input type="checkbox" checked={enableAutoHooks} onChange={(e) => setEnableAutoHooks(e.target.checked)} className="accent-rose-500" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow flex flex-col justify-between gap-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow items-center">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400">16:9 YouTube</span>
              <div className="w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-850 relative overflow-hidden">
                <div className="absolute inset-x-2 inset-y-1 border-2 border-dashed border-rose-500/40 rounded flex items-center justify-center">
                  <span className="text-[8px] text-rose-400 font-mono">1920 x 1080</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1920 x 1080</span>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-rose-400">9:16 Stories/Reels</span>
              <div className="w-full aspect-square md:aspect-[9/16] bg-slate-900 rounded-lg flex items-center justify-center border border-slate-850 relative overflow-hidden max-h-[170px]">
                <div className="absolute inset-x-6 inset-y-2 border-2 border-dashed border-rose-500 rounded flex items-center justify-center">
                  <span className="text-[8px] text-rose-400 font-mono">1080 x 1920</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1080 x 1920</span>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400">1:1 Instagram Post</span>
              <div className="w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center border border-slate-855 relative overflow-hidden max-h-[170px]">
                <div className="absolute inset-4 border-2 border-dashed border-rose-500/40 rounded flex items-center justify-center">
                  <span className="text-[8px] text-rose-400 font-mono">1080 x 1080</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1080 x 1080</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Timeline tracking strip</span>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={enableFaceTracking} onChange={(e) => setEnableFaceTracking(e.target.checked)} className="accent-rose-500" />
                  <span className="text-slate-350">Face Tracking</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={enableAutoHooks} onChange={(e) => setEnableAutoHooks(e.target.checked)} className="accent-rose-500" />
                  <span className="text-slate-355">Smart Crop</span>
                </label>
              </div>
            </div>

            <div className="relative h-12 bg-slate-900 rounded-lg border border-slate-850 overflow-hidden flex items-center justify-between px-2">
              <div className="absolute top-0 bottom-0 left-[20%] w-0.5 bg-rose-500 z-10" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-12 h-8 bg-slate-800/40 border border-slate-700/30 rounded flex items-center justify-center">
                  <Film className="w-4 h-4 text-slate-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTranscriptionWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col justify-between gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 flex flex-col justify-between flex-grow min-h-0">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2 block">Transcription Player</span>
            <div className="flex-grow flex items-center justify-center min-h-0 relative py-2">
              <div className="relative aspect-video h-full max-h-[220px] bg-slate-900 rounded-xl overflow-hidden border border-slate-850 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950 flex flex-col items-center justify-center text-slate-655 gap-2">
                  <Video className="w-8 h-8 text-slate-800" />
                  <span className="text-[10px]">Playhead: 00:03</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px] mt-2 border-t border-slate-900 pt-2">
              <Play className="w-3.5 h-3.5 text-teal-400 fill-current" />
              <span>00:03 / 00:12</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Speakers Activity</span>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-350">Speaker 1</span>
                  <span className="text-teal-400">85%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: "85%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-355">Speaker 2</span>
                  <span className="text-slate-500">15%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700" style={{ width: "15%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-grow rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 flex flex-col justify-between gap-4 min-h-0">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-2">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Timed Transcript editor</span>
            <div className="relative max-w-xs w-48">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search transcript..."
                className="w-full rounded bg-slate-900 border border-slate-850 pl-8 pr-2 py-1 text-[10px] text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="flex-grow space-y-3 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
            {[
              { time: "00:00", text: "Creating content is more competitive than ever.", active: false },
              { time: "00:03", text: "The key is to create videos that truly captivate your audience.", active: true },
              { time: "00:06", text: "With ClipCraft Studio, you can edit faster and smarter using AI.", active: false },
              { time: "00:09", text: "From subtitles to dubbing and reframing, everything is automatic.", active: false },
              { time: "00:12", text: "Save time, increase engagement, and grow your brand.", active: false }
            ].map((item, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs leading-relaxed transition-all cursor-pointer flex gap-3 ${
                  item.active
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-[0_2px_8px_rgba(20,184,166,0.05)]"
                    : "bg-slate-900/40 border-slate-900/60 text-slate-400 hover:border-slate-800"
                }`}
              >
                <span className="font-mono text-slate-500 text-[10px] mt-0.5 shrink-0">{item.time}</span>
                <p className="font-medium">{item.text}</p>
              </div>
            ))}
          </div>

          <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-805 text-slate-300 text-xs font-semibold rounded-lg transition-colors">
            + Add custom subtitle note block
          </button>
        </div>
      </div>
    );
  };

  const renderVideoEditorWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        <div className="w-full lg:w-20 flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col items-center py-4 gap-4 justify-start">
          {[
            { id: "tools", label: "AI Tools", icon: Sparkles },
            { id: "media", label: "Media", icon: FolderOpen },
            { id: "text", label: "Text", icon: Type },
            { id: "elements", label: "Elements", icon: Layers },
            { id: "audio", label: "Audio", icon: Music },
            { id: "transitions", label: "Transitions", icon: Sliders },
            { id: "filters", label: "Filters", icon: Activity },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                title={tab.label}
                className={`p-2.5 rounded-lg transition-all flex flex-col items-center gap-1 ${
                  activeSubTab === tab.id
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[8px] scale-90 font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-grow flex flex-col justify-between gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 flex flex-col justify-between flex-grow min-h-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Video Editor Viewport</span>
              <span className="text-[10px] bg-slate-900 border border-slate-805 px-2 py-0.5 rounded text-orange-400 font-bold">16:9 Landscape</span>
            </div>

            <div className="flex-grow flex items-center justify-center min-h-0 relative py-2">
              <div className="relative aspect-video h-full max-h-[300px] bg-slate-900 rounded-xl overflow-hidden border border-slate-850 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950 flex flex-col items-center justify-center text-slate-650 gap-2">
                  <Film className="w-10 h-10 text-slate-800" />
                  <span className="text-xs">Project timeline viewport simulation</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-slate-400 text-xs px-1 border-t border-slate-900 pt-3">
              <div className="flex items-center gap-3">
                <button className="text-orange-400 hover:text-orange-300">
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <span>00:03 / 00:12</span>
              </div>
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Timeline editor tracks</span>

            <div className="space-y-2 text-[10px]">
              <div className="flex gap-2 items-center">
                <span className="w-10 text-slate-500 font-bold">Video</span>
                <div className="flex-grow h-7 bg-orange-950/20 border border-orange-900/40 rounded flex items-center px-2 justify-between">
                  <div className="w-1/3 h-5 bg-orange-500/20 rounded border border-orange-500/30 flex items-center justify-center font-bold text-[8px] text-orange-400">Clip #1</div>
                  <div className="w-1/3 h-5 bg-orange-500/20 rounded border border-orange-500/30 flex items-center justify-center font-bold text-[8px] text-orange-400">Clip #2</div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <span className="w-10 text-slate-500 font-bold">Audio</span>
                <div className="flex-grow h-7 bg-slate-900/60 border border-slate-800 rounded flex items-center px-2 justify-center">
                  <div className="h-2 w-full bg-slate-850 rounded overflow-hidden relative">
                    <div className="absolute inset-y-0 left-[10%] right-[30%] bg-indigo-500/40 rounded" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <span className="w-10 text-slate-500 font-bold">Text</span>
                <div className="flex-grow h-7 bg-slate-900/60 border border-slate-800 rounded flex items-center px-2">
                  <div className="w-1/4 h-5 bg-cyan-500/20 rounded border border-cyan-500/30 flex items-center justify-center font-bold text-[8px] text-cyan-400">Subtitle block</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[280px] flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-4 min-h-0">
          <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block border-b border-slate-900 pb-2 mb-2">AI Tools</span>

          <div className="space-y-3">
            {[
              { label: "Cut Silence", desc: "Remove silent parts automatically", active: true },
              { label: "Remove Filler Words", desc: "Like uhm, ah, you know", active: true },
              { label: "Smart Edit", desc: "Auto improve edits and cuts", active: false },
              { label: "Auto Caption", desc: "Add captions instantly", active: false },
              { label: "Auto B-Roll", desc: "Add matching stock overlays", active: false }
            ].map((tool, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-900 bg-slate-900/20 text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{tool.label}</div>
                  <div className="text-[9px] text-slate-505 font-medium">{tool.desc}</div>
                </div>
                <input type="checkbox" checked={tool.active} className="accent-orange-500 cursor-pointer" readOnly />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAudiogramsWorkspace = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full h-full min-h-0 max-w-none">
        <div className="w-full lg:w-[240px] flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex overflow-hidden">
          <div className="w-16 border-r border-slate-900 bg-slate-950/80 flex flex-col items-center py-4 gap-4 flex-shrink-0">
            {[
              { id: "templates", label: "Templates", icon: Sparkles },
              { id: "audio", label: "Audio", icon: Music },
              { id: "style", label: "Style", icon: Sliders },
              { id: "text", label: "Text", icon: Type },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  title={tab.label}
                  className={`p-2.5 rounded-lg transition-all ${
                    activeSubTab === tab.id
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <div className="flex-grow p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider capitalize">{activeSubTab} options</h3>
            {activeSubTab === "templates" && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-505">Pick Cover templates.</p>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-left text-slate-200">
                    Modern Dark Cover
                  </button>
                  <button className="w-full p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-left text-slate-200">
                    Minimal Gradient Cover
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 flex flex-col justify-center items-center gap-4 min-h-0">
          <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider self-start">Audiogram Preview</span>

          <div
            className="w-full max-w-[320px] aspect-square rounded-2xl p-6 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden"
            style={{
              background: canvasBgColor ? `${canvasBgColor}` : "#0c0a1c",
              border: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div className="space-y-1 mt-2 z-10">
              <span className="text-[8px] font-bold uppercase tracking-widest text-violet-400">Podcast Episode</span>
              <h4 className="text-sm font-extrabold text-slate-100 leading-tight">How to Create Better Content</h4>
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-violet-500 bg-slate-900 flex items-center justify-center overflow-hidden z-10">
              <span className="text-2xl">🎙️</span>
            </div>

            <div className="w-full z-10">
              <div className="flex gap-1 items-end justify-center h-10 w-full px-4">
                {[1, 2, 4, 3, 5, 2, 1, 3, 6, 8, 5, 3, 2, 4, 1].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-400 rounded-t-sm"
                    style={{
                      height: `${h * 10}%`,
                      backgroundColor: canvasTextColor ? canvasTextColor : "#c084fc",
                      animation: "wave-bars 1s ease-in-out infinite alternate",
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>
              <div className="text-[8px] text-slate-505 font-mono mt-2">00:03 / 00:45</div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[320px] flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 space-y-5 flex flex-col justify-between min-h-0">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block border-b border-slate-900 pb-2 mb-2">Waveform Styles</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "wave", name: "Wave lines" },
                { id: "bars", name: "Jumping Bars" },
                { id: "circle", name: "Circular Wave" },
                { id: "bricks", name: "Blocks" }
              ].map(wave => (
                <button
                  key={wave.id}
                  onClick={() => setWaveformTemplate(wave.id)}
                  className={`p-2.5 rounded border text-xs font-semibold text-center transition-all ${
                    waveformTemplate === wave.id
                      ? "bg-violet-500/10 border-violet-500/40 text-violet-400"
                      : "bg-slate-900/40 border-slate-900 text-slate-400"
                  }`}
                >
                  {wave.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Style & Colors</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Background</span>
                <input
                  type="color"
                  value={canvasBgColor}
                  onChange={(e) => setCanvasBgColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-800 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Wave Color</span>
                <input
                  type="color"
                  value={canvasTextColor}
                  onChange={(e) => setCanvasTextColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-800 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Animation speed</span>
                <select className="bg-slate-900 border border-slate-855 p-1 text-[10px] text-slate-200 outline-none rounded">
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setLogoFile(f);
      setLogoUploading(true);
      setError("");
      try {
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate logo upload URL.");
        }
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "image/png" },
          body: f,
        });
        if (!uploadRes.ok) throw new Error("Logo upload failed.");
        setLogoUploadId(urlData.uploadId);
      } catch (err: any) {
        console.error("Logo upload error:", err);
        setError("Logo upload failed: " + err.message);
      } finally {
        setLogoUploading(false);
      }
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setBackgroundFile(f);
      setBackgroundUploading(true);
      setError("");
      try {
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate bg upload URL.");
        }
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "image/png" },
          body: f,
        });
        if (!uploadRes.ok) throw new Error("Background upload failed.");
        setBackgroundUploadId(urlData.uploadId);
      } catch (err: any) {
        console.error("Background upload error:", err);
        setError("Background upload failed: " + err.message);
      } finally {
        setBackgroundUploading(false);
      }
    }
  };

  const handleDuplicateClip = (clipId: string) => {
    const clipToDup = clipsList.find(c => c.id === clipId);
    if (!clipToDup) return;
    const newClip = {
      ...clipToDup,
      id: `clip-dup-${Date.now()}`,
      label: `${clipToDup.label} (Copy)`
    };
    const idx = clipsList.findIndex(c => c.id === clipId);
    const updated = [...clipsList];
    updated.splice(idx + 1, 0, newClip);
    setClipsList(updated);
  };

  const handleDeleteClip = (clipId: string) => {
    setClipsList(clipsList.filter(c => c.id !== clipId));
  };

  const handleChangeClipStatus = (clipId: string, newStatus: "Draft" | "Scheduled" | "Published") => {
    setClipsList(clipsList.map(c => c.id === clipId ? { ...c, status: newStatus } : c));
  };

  const getSuggestedHooksForClip = (clipLabel: string) => {
    return [
      `🚨 STOP scrolling if you want to master ${activeTool === "audiogram" ? "audio podcasting" : "video content"}!`,
      `Here is the 1 mistake you are making with your ${activeTool} workflow...`,
      `The secret formula to automate ${activeTool === "captions" ? "subtitles" : "post-production"} in 2026.`,
      `I spent hours editing, but then this AI tool did it in 5 seconds 🤯`
    ];
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/clipcraft/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadPastProject = async (projectId: string, generationId: string, prompt: string, model: string) => {
    if (!projectId) return;
    setError("");
    setResultUrl("");
    setResultUrls([]);
    setMetadata(null);
    setProgress(null);
    setStatus("processing");
    setActiveTool(model as ToolType);
    
    try {
      const statusRes = await fetch(
        `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
      );
      const statusData = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        throw new Error(statusData.error || "Failed to load project details.");
      }
      if (statusData.status === "completed") {
        setStatus("completed");
        setResultUrl(statusData.url || "");
        const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
        setResultUrls(urls);
        setMetadata(statusData.metadata || null);
        setClipsList(
          urls.map((url: string, i: number) => ({
            id: `clip-${i}-${Date.now()}`,
            url,
            label: `Clip #${i + 1}`,
            status: "Draft" as const,
          }))
        );
      } else if (statusData.status === "failed") {
        setStatus("failed");
        setError(statusData.error || "Project failed.");
      } else {
        setStatus(statusData.status || "processing");
        let finished = false;
        let attempts = 0;
        while (!finished && attempts < 60) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
          const statusRes = await fetch(
            `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
          );
          const statusData = await statusRes.json().catch(() => ({}));
          if (!statusRes.ok) throw new Error(statusData.error || "Status check failed.");
          if (statusData.status === "completed") {
            finished = true;
            setStatus("completed");
            setResultUrl(statusData.url || "");
            const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
            setResultUrls(urls);
            setMetadata(statusData.metadata || null);
            setClipsList(
              urls.map((url: string, i: number) => ({
                id: `clip-${i}-${Date.now()}`,
                url,
                label: `Clip #${i + 1}`,
                status: "Draft" as const,
              }))
            );
          } else if (statusData.status === "failed") {
            finished = true;
            setStatus("failed");
            setError(statusData.error || "Automation failed.");
          } else if (statusData.status === "processing") {
            setStatus("processing");
            if (typeof statusData.progress === "number") setProgress(statusData.progress);
          } else if (statusData.status === "queued") {
            setStatus("queued");
          }
        }
      }
    } catch (err: any) {
      setStatus("failed");
      setError(err.message || "Failed to load past project.");
    }
  };

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/clipcraft/catalog");
        if (!res.ok) throw new Error("Failed to load catalog data.");
        const data = await res.json();
        const langs = data?.languages?.items || [];
        const dubSrc = data?.dubbingSourceLanguages?.items || [];
        const dubTgt = data?.dubbingLanguages?.items || [];
        const presets = data?.captionPresets?.items || [];
        const brands = data?.brandTemplates?.items || [];

        setCatalog({
          languages: langs,
          dubbingSourceLanguages: dubSrc,
          dubbingLanguages: dubTgt,
          captionPresets: presets,
          brandTemplates: brands,
          loading: false,
        });

        // Set default values if available
        const validPresets = presets.filter((p: any) => p && typeof p.id === "string");
        if (validPresets.length) {
          setCaptionStyle(validPresets[0].id);
        }
        const validDubSrc = dubSrc.filter((p: any) => p && (p.code || p.id));
        if (validDubSrc.length) {
          setSourceLang(validDubSrc[0].code || validDubSrc[0].id || "en-US");
        }
        const validDubTgt = dubTgt.filter((p: any) => p && (p.code || p.id));
        if (validDubTgt.length) {
          setTargetLang(validDubTgt[0].code || validDubTgt[0].id || "es-ES");
        }
      } catch (err) {
        console.error("Catalog load error:", err);
        setCatalog((prev) => ({ ...prev, loading: false }));
      }
    }
    void loadCatalog();
    void loadHistory();
  }, []);

  const toolCost = useMemo(() => TOOL_DETAILS[activeTool].cost, [activeTool]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Upload and run automation
  const handleGenerate = async () => {
    if (!file && !sourceUrl.trim()) {
      setError("Please select a video/audio file or paste a media link first.");
      return;
    }

    setError("");
    setResultUrl("");
    setResultUrls([]);
    setMetadata(null);
    setProgress(null);

    // Verify credits via generation gate
    const gate = await guardGeneration({
      requiredCredits: toolCost,
      action: `clipcraft:${activeTool}`,
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setStatus("uploading");

    try {
      let uploadId = "";
      let filename = "";

      if (sourceUrl.trim()) {
        filename = sourceUrl.split("/").pop() || "media.mp4";
      } else if (file) {
        filename = file.name;
        // 1. Get presigned upload URL
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate upload URL.");
        }

        // 2. Upload file directly to S3
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "video/mp4",
          },
          body: file,
        });
        if (!uploadRes.ok) {
          throw new Error("Direct upload failed.");
        }
        uploadId = urlData.uploadId;
      }

      // 3. Configure options based on active tool
      const options: Record<string, any> = {};
      if (activeTool === "captions") {
        if (language !== "auto") {
          options.language = language;
        }
        options.captionsPreset = captionStyle || brandTemplateId || "system_beasty";
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.resolution = resolution;
        options.enableEmojis = enableEmojis;
        options.enableHighlights = enableHighlights;
      } else if (activeTool === "dubbing") {
        options.sourceLanguage = sourceLang;
        options.targetLanguage = targetLang;
      } else if (activeTool === "reframe") {
        options.orientation = aspectRatio === "1:1" ? "square" : "portrait";
        options.genre = genre;
        options.disableAutoSplit = disableAutoSplit;
      } else if (activeTool === "transcription") {
        if (language !== "auto") {
          options.language = language;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
      } else if (activeTool === "edit-videos") {
        options.prompt = editPrompt;
        options.reframeClips = reframeClips;
        options.exportOrientation = exportOrientation;
        options.exportResolution = exportResolution;
        if (captionStyle || brandTemplateId) {
          options.captionsPreset = captionStyle || brandTemplateId;
        }
        options.enableEmojis = enableEmojis;
        options.enableHighlights = enableHighlights;
        if (language !== "auto") {
          options.language = language;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.genre = genre;
        if (selectedStart) {
          options.selectedStart = Number(selectedStart);
        }
        if (selectedEnd) {
          options.selectedEnd = Number(selectedEnd);
        }
        if (clipDurations.length > 0) {
          options.clipDurations = clipDurations;
        }
        if (topics.trim()) {
          options.topics = topics.split(",").map(t => t.trim()).filter(Boolean);
        }
      } else if (activeTool === "audiogram") {
        if (language !== "auto") {
          options.language = language;
        }
        options.orientation = audiogramOrientation;
        options.templateId = waveformTemplate;
        options.captionsPreset = captionStyle || brandTemplateId || undefined;
        if (logoUploadId) {
          options.logoUploadId = logoUploadId;
        }
        if (backgroundUploadId) {
          options.backgroundUploadId = backgroundUploadId;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.resolution = resolution;
      }

      // 4. Start the automation task
      const startRes = await fetch("/api/clipcraft/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: activeTool,
          uploadId: uploadId || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          filename: filename,
          prompt: `${TOOL_DETAILS[activeTool].title}: ${filename}`,
          options,
        }),
      });

      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start automation task.");
      }

      const { projectId, generationId } = startData;
      setStatus("queued");
      void loadHistory();

      // 5. Poll status until complete
      let finished = false;
      let attempts = 0;

      while (!finished && attempts < 120) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusRes = await fetch(
          `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
        );
        const statusData = await statusRes.json().catch(() => ({}));

        if (!statusRes.ok) {
          throw new Error(statusData.error || "Status check failed.");
        }

        if (statusData.status === "completed") {
          finished = true;
          setStatus("completed");
          setResultUrl(statusData.url || "");
          const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
          setResultUrls(urls);
          setMetadata(statusData.metadata || null);
          setClipsList(
            urls.map((url: string, i: number) => ({
              id: `clip-${i}-${Date.now()}`,
              url,
              label: `Clip #${i + 1}`,
              status: "Draft" as const,
            }))
          );
        } else if (statusData.status === "failed") {
          finished = true;
          setStatus("failed");
          setError(statusData.error || "Automation failed.");
        } else if (statusData.status === "processing") {
          setStatus("processing");
          if (typeof statusData.progress === "number") {
            setProgress(statusData.progress);
          }
        } else if (statusData.status === "queued") {
          setStatus("queued");
        }
      }

      if (!finished) {
        throw new Error("Task timed out. Please check your history later.");
      }
    } catch (err) {
      console.error("Automation error:", err);
      setStatus("failed");
      setError(getSafeErrorMessage(err));
    }
  };


  return (
    <div
      className={`${
        isWorkspaceActive ? "h-[calc(100vh-4rem)] overflow-hidden" : "min-h-screen overflow-y-auto"
      } relative text-slate-100 w-full`}
      style={{ background: "#060c18" }}
      lang="en"
      dir="ltr"
    >
      <style>{`
        @keyframes mini-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
        @keyframes mini-wiggle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes mini-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes mini-glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, 1px); }
          80% { transform: translate(1px, -1px); }
        }
        @keyframes mini-glow {
          0%, 100% { text-shadow: 0 0 4px rgba(6, 182, 212, 0.4); }
          50% { text-shadow: 0 0 12px rgba(6, 182, 212, 0.8), 0 0 20px rgba(99, 102, 241, 0.4); }
        }
        @keyframes mini-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes mini-skew {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(-5deg); }
        }
        @keyframes mini-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes mini-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1.5px); }
          75% { transform: translateX(1.5px); }
        }
        @keyframes mini-tracking {
          0%, 100% { letter-spacing: -0.5px; }
          50% { letter-spacing: 0.8px; }
        }
        @keyframes mini-slide {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(2px); }
        }
        .animate-mini-float { animation: mini-float 2.5s ease-in-out infinite; }
        .animate-mini-wiggle { animation: mini-wiggle 0.5s ease-in-out infinite; }
        .animate-mini-pulse { animation: mini-pulse 1.8s ease-in-out infinite; }
        .animate-mini-glitch { animation: mini-glitch 0.4s linear infinite; }
        .animate-mini-glow { animation: mini-glow 2s ease-in-out infinite; }
        .animate-mini-bounce { animation: mini-bounce 0.8s ease-in-out infinite; }
        .animate-mini-skew { animation: mini-skew 1.5s ease-in-out infinite; }
        .animate-mini-blink { animation: mini-blink 0.7s infinite; }
        .animate-mini-shake { animation: mini-shake 0.4s ease-in-out infinite; }
        .animate-mini-tracking { animation: mini-tracking 3s ease-in-out infinite; }
        .animate-mini-slide { animation: mini-slide 1.5s ease-in-out infinite; }
      `}</style>

      <FloatingParticles />

      <div className="relative z-10 w-full h-full flex flex-col p-4 md:p-6 overflow-hidden min-h-0 gap-4">
        {/* Compact Workspace Header & Navigator */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 bg-slate-950/40 backdrop-blur-xl border border-slate-900/60 p-3 rounded-2xl w-full">
          <div className="flex items-center gap-2.5 pl-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent block">
                ClipCraft Studio
              </span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5 leading-none">
                AI Video Post-Production Suite
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 bg-slate-900/40 p-1 rounded-xl border border-slate-800/60">
            {(Object.keys(TOOL_DETAILS) as ToolType[]).map((key) => {
              const t = TOOL_DETAILS[key];
              const Icon = t.icon;
              const active = activeTool === key;

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (status === "idle" || status === "completed" || status === "failed") {
                      router.push("/clipcraft-studio/" + key);
                      setError("");
                    }
                  }}
                  disabled={status !== "idle" && status !== "completed" && status !== "failed"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-bold ${
                    active
                      ? "bg-slate-800/90 border border-slate-700/80 text-cyan-400 shadow-[0_2px_8px_rgba(6,182,212,0.15)]"
                      : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.title}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold bg-slate-950/60 text-slate-500 ${active ? "text-cyan-400/80" : ""}`}>
                    {t.cost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!file && !sourceUrl.trim() && !isDemoMode ? (
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col space-y-8 pr-1.5 custom-scrollbar pb-10">
            {renderUploadLandingView()}
            
            {/* Recent Projects / Generation History (moved to landing page) */}
            {!historyLoading && historyList.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-slate-900 max-w-4xl mx-auto w-full">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                    <History className="w-5 h-5 text-cyan-400" />
                    Recent Projects
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Reload your previous generation runs and completed clips.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historyList.map((item) => {
                    const toolDetails = TOOL_DETAILS[item.model as ToolType];
                    const ToolIcon = toolDetails?.icon || FileText;
                    const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4 hover:border-slate-700 hover:bg-slate-900/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${toolDetails?.color || "from-slate-500 to-slate-700"} text-slate-950`}>
                              <ToolIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                                {toolDetails?.title || item.model}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mt-0.5" title={item.prompt}>
                                {item.prompt}
                              </h4>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                            {formattedDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                          <span className="text-slate-500 font-medium">{item.cost} Credits</span>
                          <button
                            onClick={() => handleLoadPastProject(item.projectId, item.id, item.prompt, item.model)}
                            disabled={status !== "idle" && status !== "completed" && status !== "failed"}
                            className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Reload Project
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full-width Steps Walkthrough (moved to landing page) */}
            <div className="space-y-6 pt-6 max-w-4xl mx-auto w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-100">Workflow & Process Steps</h2>
                <p className="text-sm text-slate-500 mt-1">Simple post-production flow without layout complexity.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {STEPS.map((s, i) => {
                  const StepIcon = s.icon;
                  return (
                    <div
                      key={i}
                      className="relative rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-3 group hover:border-slate-700/60 hover:bg-slate-900/10 transition-all duration-300"
                    >
                      <div className="flex justify-between items-center">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-extrabold text-slate-800 group-hover:text-cyan-500/20 transition-colors">
                          {s.num}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                      </div>
                      {i < 3 && (
                        <div className="hidden md:block absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 text-slate-805">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">
            {/* Unified Workspace Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${TOOL_DETAILS[activeTool].color} text-slate-950`}>
                  {(() => {
                    const ToolIcon = TOOL_DETAILS[activeTool].icon;
                    return <ToolIcon className="w-5 h-5" />;
                  })()}
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
                    {TOOL_DETAILS[activeTool].title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {TOOL_DETAILS[activeTool].desc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(isDemoMode || file || sourceUrl.trim()) && (
                  <button
                    onClick={() => {
                      setIsDemoMode(false);
                      setFile(null);
                      setSourceUrl("");
                      setError("");
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-800/80 bg-slate-900/30 text-slate-300 hover:text-slate-100 hover:bg-slate-900/60 hover:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isDemoMode ? "Upload Your Own File" : "Upload New File"}</span>
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 shadow-md ${getExportButtonConfig().color}`}
                >
                  {getExportButtonConfig().label}
                </button>
              </div>
            </div>

            {/* Render active workspace */}
            <div className="flex-grow min-h-0">
              {renderActiveWorkspace()}
            </div>
          </div>
        )}
      </div>

      {/* AI Hooks Suggestion Modal */}
      <AnimatePresence>
        {showHooksModal && selectedClipIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="text-base font-bold text-slate-100">
                    Suggested AI Hooks
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowHooksModal(false);
                    setSelectedClipIndex(null);
                  }}
                  className="text-slate-500 hover:text-slate-300 text-xs font-semibold outline-none"
                >
                  Close
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Highly engaging opening titles / viral hook texts generated for{" "}
                <span className="font-semibold text-slate-200 font-mono">
                  {clipsList[selectedClipIndex]?.label}
                </span>:
              </div>

              <div className="space-y-3">
                {getSuggestedHooksForClip(clipsList[selectedClipIndex]?.label).map(
                  (hook, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-800/80 bg-slate-900/20 text-xs"
                    >
                      <span className="text-slate-300 leading-relaxed font-medium">
                        {hook}
                      </span>
                      <button
                        onClick={() => {
                          void copyToClipboard(hook);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

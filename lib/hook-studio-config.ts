/**
 * Hook Studio Configuration Registry & Model Capability Matrix
 *
 * Direct integration with WaveSpeed API v3: https://api.wavespeed.ai/api/v3
 */

export interface LLMBrainModel {
  id: string;
  name: string;
  provider: "Google" | "Anthropic" | "Moonshot" | "OpenAI";
  description: string;
  badge: "FAST" | "PRO" | "CREATIVE" | "REASONING";
  iconName: string;
}

export interface HookGenrePreset {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  gradient: string;
  systemPromptAddon: string;
}

export interface VideoModelSpec {
  id: string;
  name: string;
  apiRoute: string;
  provider: "wavespeed" | "kling" | "seedance" | "bytedance" | "openai";
  badge: "TOP" | "NEW" | "PRO" | "FAST" | "4K";
  description: string;
  maxRefImages: number;
  maxRefVideos: number;
  maxRefVideoSeconds: number;
  maxRefAudios: number;
  maxRefAudioSeconds: number;
  durations: number[];
  aspectRatios: string[];
  qualityModes: string[];
  supportsScript: boolean;
  creditCost: number;
}

export const LLM_BRAIN_MODELS: LLMBrainModel[] = [
  {
    id: "gpt-4o",
    name: "GPT 4o",
    provider: "OpenAI",
    description: "توليد الهوكات والتحليل الذكي",
    badge: "PRO",
    iconName: "Bot",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5",
    provider: "Google",
    description: "صياغة الهوكات والسكربتات الفيروسية",
    badge: "PRO",
    iconName: "Sparkles",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5",
    provider: "Anthropic",
    description: "سرد سينمائي عالي الجودة",
    badge: "CREATIVE",
    iconName: "BrainCircuit",
  },
  {
    id: "kimi-k3-pro",
    name: "Kimi K3",
    provider: "Moonshot",
    description: "تفكير عميق وسياق ضخم (1M Token)",
    badge: "PRO",
    iconName: "Zap",
  },
];

export const HOOK_GENRES: HookGenrePreset[] = [
  {
    id: "cinematic",
    nameAr: "سينمائي",
    nameEn: "Cinematic",
    icon: "Film",
    gradient: "from-amber-500/20 to-purple-600/20 border-amber-500/40",
    systemPromptAddon: "إضاءة سينمائية درامية، زوايا كاميرا واسعة ومقربة، وإيقاع بصري مذهل.",
  },
  {
    id: "drama",
    nameAr: "درامي",
    nameEn: "Drama",
    icon: "Clapperboard",
    gradient: "from-rose-500/20 to-red-700/20 border-rose-500/40",
    systemPromptAddon: "انفعالات وجوه، تركيز بؤري، وصدمة عاطفية مشوقة.",
  },
  {
    id: "horror",
    nameAr: "رعب",
    nameEn: "Horror",
    icon: "Ghost",
    gradient: "from-gray-900/60 to-purple-900/40 border-purple-500/40",
    systemPromptAddon: "ظلال داكنة، حركة فجائية، وإضاءة خافتة لتوليد توتر فوري.",
  },
  {
    id: "romance",
    nameAr: "رومانسي",
    nameEn: "Romance",
    icon: "Heart",
    gradient: "from-pink-500/20 to-rose-400/20 border-pink-500/40",
    systemPromptAddon: "ألوان دافئة، حركة بطيئة للعدسة، ونظرات معبرة.",
  },
  {
    id: "action",
    nameAr: "أكشن",
    nameEn: "Action",
    icon: "Flame",
    gradient: "from-orange-500/20 to-amber-600/20 border-orange-500/40",
    systemPromptAddon: "حركة كاميرا سريعة، مطاردات وانفجارات خاطفة.",
  },
  {
    id: "scifi",
    nameAr: "خيال علمي",
    nameEn: "Sci-Fi",
    icon: "Cpu",
    gradient: "from-cyan-500/20 to-blue-600/20 border-cyan-500/40",
    systemPromptAddon: "إضاءات نيون، مؤثرات هولوجرافية، وتقنيات مستقبلية.",
  },
];

export const HOOK_VIDEO_MODELS: VideoModelSpec[] = [
  {
    id: "seedance-2.0-pro",
    name: "Seedance 2.0",
    apiRoute: "bytedance/seedance-v2.0-pro/text-to-video",
    provider: "seedance",
    badge: "TOP",
    description: "موديل سينمائي متعدد المراجع",
    maxRefImages: 4,
    maxRefVideos: 2,
    maxRefVideoSeconds: 60,
    maxRefAudios: 2,
    maxRefAudioSeconds: 180,
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    qualityModes: ["std", "pro", "4k"],
    supportsScript: true,
    creditCost: 15,
  },
  {
    id: "seedance-2.0-turbo",
    name: "Seedance Turbo",
    apiRoute: "bytedance/seedance-v2.0-turbo/text-to-video",
    provider: "seedance",
    badge: "FAST",
    description: "توليد سريع وتفاعل استجابة فورية",
    maxRefImages: 3,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 1,
    maxRefAudioSeconds: 90,
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 10,
  },
  {
    id: "seedance-2.0-mini",
    name: "Seedance Mini",
    apiRoute: "bytedance/seedance-v2.0-mini/text-to-video",
    provider: "seedance",
    badge: "NEW",
    description: "خفيف واقتصادي للتجارب السريعة",
    maxRefImages: 2,
    maxRefVideos: 1,
    maxRefVideoSeconds: 15,
    maxRefAudios: 1,
    maxRefAudioSeconds: 45,
    durations: [3, 4, 5],
    aspectRatios: ["9:16", "16:9"],
    qualityModes: ["std"],
    supportsScript: true,
    creditCost: 6,
  },
  {
    id: "seedance-2.0-fast",
    name: "Seedance Fast",
    apiRoute: "bytedance/seedance-v2.0-fast/text-to-video",
    provider: "seedance",
    badge: "FAST",
    description: "سرعة معالجة عالية مع صور مرجعية",
    maxRefImages: 3,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 1,
    maxRefAudioSeconds: 60,
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    aspectRatios: ["9:16", "16:9", "1:1"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 8,
  },
  {
    id: "kling-3.0-pro",
    name: "Kling 3.0",
    apiRoute: "kwaivgi/kling-v3.0-pro/text-to-video",
    provider: "kling",
    badge: "PRO",
    description: "أعلى جودة حركة وكاميرا سينمائية",
    maxRefImages: 4,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["pro", "4k"],
    supportsScript: true,
    creditCost: 14,
  },
  {
    id: "kling-3.0-turbo",
    name: "Kling Turbo",
    apiRoute: "kwaivgi/kling-v3.0-turbo/text-to-video",
    provider: "kling",
    badge: "FAST",
    description: "سرعة عالية وجودة متفوقة",
    maxRefImages: 2,
    maxRefVideos: 1,
    maxRefVideoSeconds: 20,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 11,
  },
  {
    id: "kling-o3-omni",
    name: "Kling O3",
    apiRoute: "kwaivgi/kling-o3-omni/text-to-video",
    provider: "kling",
    badge: "TOP",
    description: "عناصر متعددة وإطار أخير للقصة",
    maxRefImages: 4,
    maxRefVideos: 2,
    maxRefVideoSeconds: 45,
    maxRefAudios: 1,
    maxRefAudioSeconds: 60,
    durations: [5, 10, 15],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["std", "pro", "4k"],
    supportsScript: true,
    creditCost: 16,
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    apiRoute: "kwaivgi/kling-v2.6/text-to-video",
    provider: "kling",
    badge: "PRO",
    description: "كلاسيكي ثابت وموثوق",
    maxRefImages: 2,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 9,
  },
  {
    id: "seedream-5.0-pro",
    name: "Seedream 5.0",
    apiRoute: "wavespeed-ai/seedream-5.0-pro",
    provider: "wavespeed",
    badge: "PRO",
    description: "مشاهد واقعية وفائقة الجمال",
    maxRefImages: 4,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 1,
    maxRefAudioSeconds: 60,
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["pro", "4k"],
    supportsScript: true,
    creditCost: 12,
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    apiRoute: "openai/gpt-image-2",
    provider: "openai",
    badge: "NEW",
    description: "توليد مشاهد وStoryboards للهوكات بدقة فائقة",
    maxRefImages: 4,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [0],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["hd", "ultra"],
    supportsScript: true,
    creditCost: 7,
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana",
    apiRoute: "wavespeed-ai/nano-banana-pro",
    provider: "wavespeed",
    badge: "TOP",
    description: "تعديل ودعم Inpaint للصور المرجعية",
    maxRefImages: 4,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [0],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["hd"],
    supportsScript: true,
    creditCost: 6,
  },
];


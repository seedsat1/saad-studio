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
    name: "ChatGPT (GPT-4o)",
    provider: "OpenAI",
    description: "نموذج ذكاء اصطناعي متكامل للتحليل وتوليد الهوكات الحوارية والقصصية",
    badge: "PRO",
    iconName: "Bot",
  },
  {
    id: "gemini-2.5-pro",
    name: "Google Gemini 2.5 Pro",
    provider: "Google",
    description: "أفضل تفكير عميق لبناء السكربتات وصياغة الهوكات الفيروسية",
    badge: "PRO",
    iconName: "Sparkles",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "قوي جداً في السرد السينمائي والدرامي وجذب الانتباه",
    badge: "CREATIVE",
    iconName: "BrainCircuit",
  },
  {
    id: "kimi-k3-pro",
    name: "Kimi K3 Pro",
    provider: "Moonshot",
    description: "متخصص في الهوكات السريعة والقصيرة للفيديوهات العمودية",
    badge: "FAST",
    iconName: "Zap",
  },
];


export const HOOK_GENRES: HookGenrePreset[] = [
  {
    id: "cinematic",
    nameAr: "سينمائي الاحترافي",
    nameEn: "Cinematic Epic",
    icon: "Film",
    gradient: "from-amber-500/20 to-purple-600/20 border-amber-500/40",
    systemPromptAddon: "ركز على الإضاءة السينمائية الدرامية، زوايا الكاميرا الواسعة والمقربة، والإيقاع البصري المذهل في أول 3 ثواني.",
  },
  {
    id: "drama",
    nameAr: "درامي مشوق",
    nameEn: "Dramatic Tension",
    icon: "Clapperboard",
    gradient: "from-rose-500/20 to-red-700/20 border-rose-500/40",
    systemPromptAddon: "ركز على انفعالات الوجوه، التركيز البؤري، والصدمة العاطفية التي تجبر المتابع على الاستمرار.",
  },
  {
    id: "horror",
    nameAr: "رعب وغموض",
    nameEn: "Horror Thriller",
    icon: "Ghost",
    gradient: "from-gray-900/60 to-purple-900/40 border-purple-500/40",
    systemPromptAddon: "استخدم الظلال الداكنة، الحركة الفجائية، والإضاءة الخافتة لتوليد توتر فوري.",
  },
  {
    id: "romance",
    nameAr: "رومانسية وشغف",
    nameEn: "Romantic Emotion",
    icon: "Heart",
    gradient: "from-pink-500/20 to-rose-400/20 border-pink-500/40",
    systemPromptAddon: "استخدم الألوان الدافئة، الحركة البطيئة للعدسة، والنظرات المعبرة لإيصال الشعور بسرعة.",
  },
  {
    id: "action",
    nameAr: "أكشن وحركة",
    nameEn: "High Action",
    icon: "Flame",
    gradient: "from-orange-500/20 to-amber-600/20 border-orange-500/40",
    systemPromptAddon: "حركة كاميرا سريعة، انفجارات أو مطاردات خاطفة لجذب الانتباه في الكسر الأول من الثانية.",
  },
  {
    id: "scifi",
    nameAr: "خيال علمي مستقبلي",
    nameEn: "Sci-Fi Cyber",
    icon: "Cpu",
    gradient: "from-cyan-500/20 to-blue-600/20 border-cyan-500/40",
    systemPromptAddon: "إضاءات النيون، المؤثرات الهولوجرافية، والتقنيات المستقبلية الجذابة.",
  },
];

export const HOOK_VIDEO_MODELS: VideoModelSpec[] = [
  {
    id: "seedance-2.0-pro",
    name: "Seedance 2.0 Pro",
    apiRoute: "bytedance/seedance-v2.0-pro/text-to-video",
    provider: "seedance",
    badge: "TOP",
    description: "أحدث موديل سينمائي متعدد المراجع: 4 صور + 2 فيديو + 2 صوت",
    maxRefImages: 4,
    maxRefVideos: 2,
    maxRefVideoSeconds: 60,
    maxRefAudios: 2,
    maxRefAudioSeconds: 180,
    durations: [5, 10, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    qualityModes: ["std", "pro", "4k"],
    supportsScript: true,
    creditCost: 15,
  },
  {
    id: "seedance-2.0-turbo",
    name: "Seedance 2.0 Turbo",
    apiRoute: "bytedance/seedance-v2.0-turbo/text-to-video",
    provider: "seedance",
    badge: "FAST",
    description: "نسخة فائقة السرعة مع استجابة فورية وتوليد هوكات خلال ثوانٍ",
    maxRefImages: 3,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 1,
    maxRefAudioSeconds: 90,
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 10,
  },
  {
    id: "seedance-2.0-mini",
    name: "Seedance 2.0 Mini",
    apiRoute: "bytedance/seedance-v2.0-mini/text-to-video",
    provider: "seedance",
    badge: "NEW",
    description: "موديل خفيف واقتصادي للتجربة السريعة وإنتاج الهوكات المتعددة",
    maxRefImages: 2,
    maxRefVideos: 1,
    maxRefVideoSeconds: 15,
    maxRefAudios: 1,
    maxRefAudioSeconds: 45,
    durations: [5],
    aspectRatios: ["9:16", "16:9"],
    qualityModes: ["std"],
    supportsScript: true,
    creditCost: 6,
  },
  {
    id: "seedance-2.0-fast",
    name: "Seedance 2.0 Fast",
    apiRoute: "bytedance/seedance-v2.0-fast/text-to-video",
    provider: "seedance",
    badge: "FAST",
    description: "سرعة معالجة عالية مع دعم صور مرجعية متعددة",
    maxRefImages: 3,
    maxRefVideos: 1,
    maxRefVideoSeconds: 30,
    maxRefAudios: 1,
    maxRefAudioSeconds: 60,
    durations: [5, 10],
    aspectRatios: ["9:16", "16:9", "1:1"],
    qualityModes: ["std", "pro"],
    supportsScript: true,
    creditCost: 8,
  },
  {
    id: "kling-3.0-pro",
    name: "Kling 3.0 Pro",
    apiRoute: "kwaivgi/kling-v3.0-pro/text-to-video",
    provider: "kling",
    badge: "PRO",
    description: "أعلى جودة حركة وكاميرا سينمائية من Kwai VGI",
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
    name: "Kling 3.0 Turbo",
    apiRoute: "kwaivgi/kling-v3.0-turbo/text-to-video",
    provider: "kling",
    badge: "FAST",
    description: "نسخة سريعة وعالية الدقة من كينغ 3.0",
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
    name: "Kling O3 Omni",
    apiRoute: "kwaivgi/kling-o3-omni/text-to-video",
    provider: "kling",
    badge: "TOP",
    description: "دعم العناصر المتعددة والإطار الأخير لتحكم كامل بالقصة",
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
    description: "موديل كلاسيكي موثوق وثابت الحركة",
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
    name: "Seedream 5.0 Pro",
    apiRoute: "wavespeed-ai/seedream-5.0-pro",
    provider: "wavespeed",
    badge: "PRO",
    description: "توليد مشاهد فائقة الجمال والواقعية البصرية",
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
    description: "توليد صورة هوك أولى بدقة متناهية وإرشادات نصية معقدة",
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
    name: "Nano Banana Pro",
    apiRoute: "wavespeed-ai/nano-banana-pro",
    provider: "wavespeed",
    badge: "TOP",
    description: "تعديل ودعم Inpaint للصور المرجعية مع الحفاظ على الشخصيات",
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

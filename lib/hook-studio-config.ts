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
  provider: "wavespeed" | "kling" | "seedance" | "bytedance" | "openai" | "google";
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
    id: "advertising",
    nameAr: "إعلاني",
    nameEn: "Advertising",
    icon: "Megaphone",
    gradient: "from-emerald-500/20 to-cyan-600/20 border-emerald-500/40",
    systemPromptAddon: "رسالة بيع واضحة، إبراز المنتج أو الموقع، إثبات سريع للقيمة، ودعوة فعل مباشرة.",
  },
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
    id: "heritage",
    nameAr: "تراثي",
    nameEn: "Heritage",
    icon: "Landmark",
    gradient: "from-yellow-700/20 to-amber-500/20 border-amber-500/40",
    systemPromptAddon: "هوية محلية أصيلة، تفاصيل تراثية، ألوان دافئة، موسيقى وإيقاع يعكسان المكان والذاكرة.",
  },
  {
    id: "documentary",
    nameAr: "وثائقي",
    nameEn: "Documentary",
    icon: "ScanEye",
    gradient: "from-slate-500/20 to-sky-500/20 border-sky-500/40",
    systemPromptAddon: "لغة واقعية، لقطات مراقبة، مقابلات أو سرد معرفي، وإحساس مصداقية عالي.",
  },
  {
    id: "music-video",
    nameAr: "كليب موسيقي",
    nameEn: "Music Video",
    icon: "Music",
    gradient: "from-fuchsia-500/20 to-blue-600/20 border-fuchsia-500/40",
    systemPromptAddon: "إيقاع بصري متزامن مع الموسيقى، انتقالات سريعة، أداء وحركة كاميرا نابضة.",
  },
  {
    id: "comedy",
    nameAr: "كوميدي",
    nameEn: "Comedy",
    icon: "Smile",
    gradient: "from-lime-500/20 to-yellow-500/20 border-lime-500/40",
    systemPromptAddon: "مفارقة بصرية، توقيت كوميدي واضح، تعبيرات وجه مبالغ بها، ونهاية ذكية.",
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
  {
    id: "fantasy",
    nameAr: "فانتازيا",
    nameEn: "Fantasy",
    icon: "WandSparkles",
    gradient: "from-violet-500/20 to-pink-500/20 border-violet-500/40",
    systemPromptAddon: "عوالم خيالية، ضوء سحري، حركة كاميرا حالمة، وتحولات بصرية شاعرية.",
  },
];

export const HOOK_VIDEO_MODELS: VideoModelSpec[] = [
  {
    id: "seedance-2.0-pro",
    name: "Seedance 2.0",
    apiRoute: "bytedance/seedance-2.0/text-to-video",
    provider: "seedance",
    badge: "TOP",
    description: "Bytedance Seedance 2.0 — cinematic image-to-video with optional last frame and native audio.",
    maxRefImages: 9,
    maxRefVideos: 3,
    maxRefVideoSeconds: 15,
    maxRefAudios: 3,
    maxRefAudioSeconds: 15,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["480p", "720p", "1080p", "4k"],
    supportsScript: true,
    creditCost: 15,
  },
  {
    id: "seedance-2.0-turbo",
    name: "Seedance 2.0 Turbo",
    apiRoute: "bytedance/seedance-2.0/text-to-video-turbo",
    provider: "seedance",
    badge: "FAST",
    description: "Bytedance Seedance 2.0 Turbo — HD image-to-video with optional last frame and native audio.",
    maxRefImages: 9,
    maxRefVideos: 3,
    maxRefVideoSeconds: 15,
    maxRefAudios: 3,
    maxRefAudioSeconds: 15,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["720p", "1080p"],
    supportsScript: true,
    creditCost: 10,
  },
  {
    id: "seedance-2.0-mini",
    name: "Seedance 2.0 Mini",
    apiRoute: "bytedance/seedance-2.0-mini/text-to-video",
    provider: "seedance",
    badge: "NEW",
    description: "Bytedance Seedance 2.0 Mini — image-to-video with optional last frame and native audio.",
    maxRefImages: 9,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["480p", "720p", "1080p", "4k"],
    supportsScript: true,
    creditCost: 6,
  },
  {
    id: "seedance-2.0-fast",
    name: "Seedance 2.0 Fast",
    apiRoute: "bytedance/seedance-v2/text-to-video-fast",
    provider: "seedance",
    badge: "FAST",
    description: "Bytedance Seedance 2.0 Fast — fast reference-based video.",
    maxRefImages: 9,
    maxRefVideos: 3,
    maxRefVideoSeconds: 15,
    maxRefAudios: 3,
    maxRefAudioSeconds: 15,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["480p", "720p"],
    supportsScript: true,
    creditCost: 8,
  },
  {
    id: "kling-3.0-pro",
    name: "Kling 3.0",
    apiRoute: "kwaivgi/kling-v3.0-std/image-to-video",
    provider: "kling",
    badge: "NEW",
    description: "Kuaishou Kling V3.0 image-to-video with Standard/Pro route selection, optional end frame, and native sound.",
    maxRefImages: 10,
    maxRefVideos: 1,
    maxRefVideoSeconds: 15,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["source"],
    qualityModes: ["Standard", "Pro"],
    supportsScript: true,
    creditCost: 9,
  },
  {
    id: "kling-3.0-turbo",
    name: "Kling V3 Turbo",
    apiRoute: "kwaivgi/kling-v3-turbo-std/image-to-video",
    provider: "kling",
    badge: "FAST",
    description: "Kling V3 Turbo image-to-video with Standard 720P or Pro 1080P route selection and multi-shot storyboard support.",
    maxRefImages: 10,
    maxRefVideos: 1,
    maxRefVideoSeconds: 15,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["source"],
    qualityModes: ["Standard", "Pro"],
    supportsScript: true,
    creditCost: 11,
  },
  {
    id: "kling-o3-omni",
    name: "Kling O3",
    apiRoute: "kwaivgi/kling-video-o3-std/image-to-video",
    provider: "kling",
    badge: "TOP",
    description: "Kling Video O3 with Standard, Pro, and 4K routing across text, image, and reference-to-video modes.",
    maxRefImages: 7,
    maxRefVideos: 1,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["Standard", "Pro", "4K"],
    supportsScript: true,
    creditCost: 16,
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    apiRoute: "kwaivgi/kling-v2.6-std/image-to-video",
    provider: "kling",
    badge: "PRO",
    description: "Kling 2.6 Standard/Pro image-to-video with optional end frame, cfg scale, and native audio on Pro.",
    maxRefImages: 2,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [5, 10],
    aspectRatios: ["source"],
    qualityModes: ["Standard", "Pro"],
    supportsScript: true,
    creditCost: 9,
  },
  {
    id: "seedream-5.0-pro",
    name: "Seedream 5.0 Pro",
    apiRoute: "bytedance/seedream-v5.0-pro/edit",
    provider: "wavespeed",
    badge: "PRO",
    description: "Bytedance Seedream V5.0 Pro Edit — high-precision image editing.",
    maxRefImages: 10,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [0],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["1k", "2k"],
    supportsScript: true,
    creditCost: 12,
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    apiRoute: "gpt-image-2-text-to-image",
    provider: "openai",
    badge: "NEW",
    description: "GPT Image 2 text-to-image.",
    maxRefImages: 4,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [0],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["std", "medium", "high"],
    supportsScript: true,
    creditCost: 7,
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    apiRoute: "google/nano-banana-edit",
    provider: "google",
    badge: "TOP",
    description: "Nano Banana Pro image editing and inpainting.",
    maxRefImages: 9,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [0],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    qualityModes: ["std", "2k", "4k"],
    supportsScript: true,
    creditCost: 6,
  },
  {
    id: "google-gemini-omni",
    name: "Google Gemini Omni",
    apiRoute: "google/gemini-omni-flash",
    provider: "google",
    badge: "NEW",
    description: "Google Gemini Omni Flash — fast, multimodal video generation.",
    maxRefImages: 6,
    maxRefVideos: 0,
    maxRefVideoSeconds: 0,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    aspectRatios: ["16:9", "9:16"],
    qualityModes: ["720p"],
    supportsScript: true,
    creditCost: 10,
  },
];

export interface HookStylePreset {
  id: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  category: "all" | "photo" | "art" | "3d";
  systemPromptAddon: string;
}

export const HOOK_STYLES: HookStylePreset[] = [
  {
    id: "photorealistic",
    nameAr: "تصوير واقعي",
    nameEn: "#photo",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    category: "photo",
    systemPromptAddon: "Photorealistic style, captured on 35mm lens, natural textures, highly detailed, realistic lighting."
  },
  {
    id: "natural",
    nameAr: "إضاءة طبيعية",
    nameEn: "#natural",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    category: "photo",
    systemPromptAddon: "Natural lighting, lifestyle photography, authentic candid moment, film grain, soft highlights."
  },
  {
    id: "popsurrealism",
    nameAr: "سريالية بوب",
    nameEn: "#popsurrealism",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Pop surrealism style, vibrant neon pastel colors, dreamy whimsical landscape, abstract shapes, Salvador Dali meets modern pop art."
  },
  {
    id: "editorial",
    nameAr: "تصفيف مجلات",
    nameEn: "#editorial",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80",
    category: "photo",
    systemPromptAddon: "High fashion editorial magazine style, dramatic studio lighting, rich colors, stylized composition."
  },
  {
    id: "anime",
    nameAr: "أنمي كلاسيكي",
    nameEn: "#classic-anime",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Classic 90s anime style, hand-drawn character design, retro color palette, cell shading."
  },
  {
    id: "character3d",
    nameAr: "شخصية ثلاثية الأبعاد",
    nameEn: "#character3d",
    imageUrl: "https://images.unsplash.com/photo-1620428268482-cf1851a36764?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "3D stylized character render, octane render, soft ambient occlusion, bright clay textures, cute design."
  },
  {
    id: "cyberpunk",
    nameAr: "مستقبل سايبر",
    nameEn: "#cyberpunk",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Cyberpunk aesthetic, neon lighting, rainy streets at night, holographic displays, futuristic details."
  },
  {
    id: "pixelart",
    nameAr: "بكسل آرت ريترو",
    nameEn: "#pixelart",
    imageUrl: "https://images.unsplash.com/photo-1566241477600-ac026ad43874?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "16-bit retro pixel art, detailed pixelation, limited vibrant color palette, old school game console style."
  },
  {
    id: "watercolor",
    nameAr: "ألوان مائية",
    nameEn: "#watercolor",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Soft watercolor painting, visible paint bleeding, textured paper background, elegant brush strokes."
  },
  {
    id: "oilpainting",
    nameAr: "رسم زيتي كلاسيكي",
    nameEn: "#oilpainting",
    imageUrl: "https://images.unsplash.com/photo-1579783928621-7a13d66a6211?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Classic fine art oil painting style, visible rich impasto brush strokes, warm classical lighting, canvas texture."
  },
  {
    id: "vector",
    nameAr: "رسم فيكتور مسطح",
    nameEn: "#vector",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Flat vector illustration, minimalist shapes, clean lines, solid graphic design, bold colors."
  },
  {
    id: "sketch",
    nameAr: "رسم خط قلم رصاص",
    nameEn: "#sketch",
    imageUrl: "https://images.unsplash.com/photo-1576016770956-debb63d90029?auto=format&fit=crop&w=300&q=80",
    category: "art",
    systemPromptAddon: "Hand drawn pencil sketch, detailed crosshatching, graphite paper texture, monochrome pencil art."
  }
];


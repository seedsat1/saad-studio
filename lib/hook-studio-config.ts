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
  badge: "TOP" | "NEW" | "PRO" | "FAST" | "4K" | "FX";
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
    id: "bytedance-seedance-v25-t2v-turbo",
    name: "Seedance 2.5",
    apiRoute: "bytedance/seedance-2.5/text-to-video-turbo",
    provider: "wavespeed",
    badge: "NEW",
    description: "Bytedance Seedance 2.5 Turbo - 480p/720p, 4-30s, up to 30 images + 10 videos + 10 audios on text/reference generation.",
    maxRefImages: 30,
    maxRefVideos: 10,
    maxRefVideoSeconds: 30,
    maxRefAudios: 10,
    maxRefAudioSeconds: 30,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    aspectRatios: ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
    qualityModes: ["480p", "720p"],
    supportsScript: true,
    creditCost: 10,
  },
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
  {
    id: "wavespeed-motion-fx",
    name: "WaveSpeed Motion FX",
    apiRoute: "wavespeed-ai/motion-fx",
    provider: "wavespeed",
    badge: "FX",
    description: "WaveSpeed AI Motion FX — high speed visual effects, lighting, and slow-motion video generator.",
    maxRefImages: 6,
    maxRefVideos: 1,
    maxRefVideoSeconds: 10,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [3, 5, 8, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualityModes: ["720p", "1080p"],
    supportsScript: true,
    creditCost: 7,
  },
  {
    id: "wavespeed-cinematic-fx",
    name: "WaveSpeed Cinematic FX",
    apiRoute: "wavespeed-ai/cinematic-video-generator",
    provider: "wavespeed",
    badge: "PRO",
    description: "WaveSpeed AI Cinematic FX Generator — cinematic lighting, volumetric atmosphere, and realistic particle FX.",
    maxRefImages: 8,
    maxRefVideos: 1,
    maxRefVideoSeconds: 15,
    maxRefAudios: 0,
    maxRefAudioSeconds: 0,
    durations: [4, 6, 8, 10, 12],
    aspectRatios: ["16:9", "9:16", "21:9"],
    qualityModes: ["Standard", "Pro"],
    supportsScript: true,
    creditCost: 8,
  },
];

export interface HookStylePreset {
  id: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  category: "illustration" | "3d" | "design";
  systemPromptAddon: string;
}

export const HOOK_STYLES: HookStylePreset[] = [
  // ── DESIGN CATEGORY ──
  {
    id: "photorealistic",
    nameAr: "تصوير واقعي",
    nameEn: "#photo",
    imageUrl: "/api/media/reference-thumbnails/photorealistic.webp",
    category: "design",
    systemPromptAddon: "Photorealistic style, captured on 35mm lens, natural textures, highly detailed, realistic lighting."
  },
  {
    id: "natural",
    nameAr: "إضاءة طبيعية",
    nameEn: "#natural",
    imageUrl: "/api/media/reference-thumbnails/natural.webp",
    category: "design",
    systemPromptAddon: "Natural lighting, lifestyle photography, authentic candid moment, film grain, soft highlights."
  },
  {
    id: "editorial",
    nameAr: "تصفيف مجلات",
    nameEn: "#editorial",
    imageUrl: "/api/media/reference-thumbnails/editorial.webp",
    category: "design",
    systemPromptAddon: "High fashion editorial magazine style, dramatic studio lighting, rich colors, stylized composition."
  },
  {
    id: "neomemphis",
    nameAr: "نيو ميمفيس ريترو",
    nameEn: "#neomemphis",
    imageUrl: "/api/media/reference-thumbnails/neomemphis.webp",
    category: "design",
    systemPromptAddon: "Neo Memphis style design, bold patterns, bright geometry, colorful retro shapes, high contrast flat graphics."
  },
  {
    id: "boldposter",
    nameAr: "ملصق جريء ريترو",
    nameEn: "#boldposter",
    imageUrl: "/api/media/reference-thumbnails/boldposter.webp",
    category: "design",
    systemPromptAddon: "Bold vintage poster style, retro saturated color palette, graphic print texture, strong typography base."
  },
  {
    id: "letterpop",
    nameAr: "بوب تيبوغرافي",
    nameEn: "#letterpop",
    imageUrl: "/api/media/reference-thumbnails/letterpop.webp",
    category: "design",
    systemPromptAddon: "Pop typography art, bold lettering, vibrant neon accent hues, decorative graphic design poster."
  },
  {
    id: "minimaltypo",
    nameAr: "تيبوغرافي مبسط",
    nameEn: "#minimaltypo",
    imageUrl: "/api/media/reference-thumbnails/minimaltypo.webp",
    category: "design",
    systemPromptAddon: "Minimalist layout, fine typography, black and white stark graphic design, plenty of negative space."
  },
  {
    id: "coffeeshopmockup",
    nameAr: "موك اب كوب قهوة",
    nameEn: "#coffeeshopmockup",
    imageUrl: "/api/media/reference-thumbnails/coffeeshopmockup.webp",
    category: "design",
    systemPromptAddon: "Realistic branding mockup, coffee cup placement on wooden shop counter, soft natural morning bokeh."
  },

  // ── 3D CATEGORY ──
  {
    id: "character3d",
    nameAr: "شخصية ثلاثية الأبعاد",
    nameEn: "#character3d",
    imageUrl: "/api/media/reference-thumbnails/character3d.webp",
    category: "3d",
    systemPromptAddon: "3D stylized character render, octane render, soft ambient occlusion, bright clay textures, cute design."
  },
  {
    id: "claytoon",
    nameAr: "رسوم صلصال 3D",
    nameEn: "#claytoon",
    imageUrl: "/api/media/reference-thumbnails/claytoon.webp",
    category: "3d",
    systemPromptAddon: "Claymation style, soft 3D clay textures, handmade look, plasticine material, stop-motion animation feel."
  },
  {
    id: "dreamglass",
    nameAr: "زجاج حلمي متوهج",
    nameEn: "#dreamglass",
    imageUrl: "/api/media/reference-thumbnails/dreamglass.webp",
    category: "3d",
    systemPromptAddon: "Dream glass rendering, semi-transparent frosted textures, glowing iridescent internal refraction, pastel aura."
  },
  {
    id: "glam3d",
    nameAr: "شخصية 3D متألقة",
    nameEn: "#glam3d",
    imageUrl: "/api/media/reference-thumbnails/glam3d.webp",
    category: "3d",
    systemPromptAddon: "Glamorous 3D character design, highly detailed clothing, glossy hair textures, cute doll look, soft studio lighting."
  },
  {
    id: "minimalcharacters",
    nameAr: "شخصيات 3D مبسطة",
    nameEn: "#minimalcharacters",
    imageUrl: "/api/media/reference-thumbnails/minimalcharacters.webp",
    category: "3d",
    systemPromptAddon: "Minimalist 3D character layout, basic geometric shapes, clean pastel color blocks, smooth rendering."
  },
  {
    id: "vinyltoy",
    nameAr: "لعبة فينيل 3D",
    nameEn: "#vinyltoy",
    imageUrl: "/api/media/reference-thumbnails/vinyltoy.webp",
    category: "3d",
    systemPromptAddon: "Vinyl toy figure aesthetic, glossy smooth plastic texture, Funko Pop model layout, toy packaging style."
  },
  {
    id: "motionstitched",
    nameAr: "قماش صوف مطرز",
    nameEn: "#motionstitched",
    imageUrl: "/api/media/reference-thumbnails/motionstitched.webp",
    category: "3d",
    systemPromptAddon: "Felt wool animation style, stitched details, fabric textures, organic warm plush toy aesthetic."
  },
  {
    id: "3dcolorful",
    nameAr: "أشكال 3D ملونة",
    nameEn: "#3dcolorful",
    imageUrl: "/api/media/reference-thumbnails/3dcolorful.webp",
    category: "3d",
    systemPromptAddon: "Dynamic colorful 3D abstract shapes, rainbow gradient renders, high saturation glossy material."
  },
  {
    id: "softprism3d",
    nameAr: "موشور زجاجي 3D",
    nameEn: "#softprism3d",
    imageUrl: "/api/media/reference-thumbnails/softprism3d.webp",
    category: "3d",
    systemPromptAddon: "Soft prism glass rendering, colorful chromatic aberration, rainbow refraction beams, luxury cosmetic aesthetic."
  },
  {
    id: "kawaii3d",
    nameAr: "كاواي ياباني لطيف",
    nameEn: "#kawaii3d",
    imageUrl: "/api/media/reference-thumbnails/kawaii3d.webp",
    category: "3d",
    systemPromptAddon: "Cute Japanese Kawaii 3D model, pastel pink and sky blue colors, smiling faces, happy anime toy design."
  },
  {
    id: "isometricdesign",
    nameAr: "تصميم آيزومتريك ثلاثي الأبعاد",
    nameEn: "#isometricdesign",
    imageUrl: "/api/media/reference-thumbnails/isometricdesign.webp",
    category: "3d",
    systemPromptAddon: "Isometric 3D rendering, miniature room layout, block building graphics, cute toy furniture."
  },

  // ── ILLUSTRATION CATEGORY ──
  {
    id: "anime",
    nameAr: "أنمي كلاسيكي",
    nameEn: "#classic-anime",
    imageUrl: "/api/media/reference-thumbnails/anime.webp",
    category: "illustration",
    systemPromptAddon: "Classic 90s anime style, hand-drawn character design, retro color palette, cell shading."
  },
  {
    id: "origami",
    nameAr: "فن الأوريغامي الورقي",
    nameEn: "#origami",
    imageUrl: "/api/media/reference-thumbnails/origami.webp",
    category: "illustration",
    systemPromptAddon: "Origami paper art, folded clean paper textures, geometric folds, shadows, creative minimalist composition."
  },
  {
    id: "watercolor",
    nameAr: "رسم ألوان مائية",
    nameEn: "#watercolor",
    imageUrl: "/api/media/reference-thumbnails/watercolor.webp",
    category: "illustration",
    systemPromptAddon: "Soft watercolor painting, visible paint bleeding, textured paper background, elegant brush strokes."
  },
  {
    id: "oilpainting",
    nameAr: "لوحة زيتية كلاسيكية",
    nameEn: "#oilpainting",
    imageUrl: "/api/media/reference-thumbnails/oilpainting.webp",
    category: "illustration",
    systemPromptAddon: "Classic fine art oil painting style, visible rich impasto brush strokes, warm classical lighting, canvas texture."
  },
  {
    id: "sketch",
    nameAr: "خط قلم رصاص ورسم ورق",
    nameEn: "#sketch",
    imageUrl: "/api/media/reference-thumbnails/sketch.webp",
    category: "illustration",
    systemPromptAddon: "Hand drawn pencil sketch, detailed crosshatching, graphite paper texture, monochrome pencil art."
  },
  {
    id: "waxcrayon",
    nameAr: "رسم شمع ألوان",
    nameEn: "#waxcrayon",
    imageUrl: "/api/media/reference-thumbnails/waxcrayon.webp",
    category: "illustration",
    systemPromptAddon: "Crayon artwork, thick hand-drawn wax textures, childish nostalgic drawing feel, colorful crayon strokes."
  },
  {
    id: "dotted",
    nameAr: "تنقيط فني هافتون",
    nameEn: "#dotted",
    imageUrl: "/api/media/reference-thumbnails/dotted.webp",
    category: "illustration",
    systemPromptAddon: "Dotted pop art shading, vintage halftone pattern dots, stylized retro printing look."
  },
  {
    id: "risograph",
    nameAr: "طباعة ريزوغراف دافئة",
    nameEn: "#risograph",
    imageUrl: "/api/media/reference-thumbnails/risograph.webp",
    category: "illustration",
    systemPromptAddon: "Risograph print style, grainy duotone textures, overlapping colors, retro graphic print illustration."
  },
  {
    id: "traditional-japan",
    nameAr: "فن ياباني تقليدي",
    nameEn: "#traditional-japan",
    imageUrl: "/api/media/reference-thumbnails/traditional-japan.webp",
    category: "illustration",
    systemPromptAddon: "Traditional Japanese Ukiyo-e woodblock print aesthetic, vintage paper aging, elegant waves and lines."
  },
  {
    id: "cartoonfun",
    nameAr: "رسوم كرتون مرحة",
    nameEn: "#cartoonfun",
    imageUrl: "/api/media/reference-thumbnails/cartoonfun.webp",
    category: "illustration",
    systemPromptAddon: "Fun cute cartoon character drawing, bold black outlines, simple flat color fill, modern web illustration."
  },
  {
    id: "retrocomic",
    nameAr: "قصص مصورة عتيقة",
    nameEn: "#retrocomic",
    imageUrl: "/api/media/reference-thumbnails/retrocomic.webp",
    category: "illustration",
    systemPromptAddon: "Vintage 1960s comic book aesthetic, retro speech bubbles background layout, pop-art style ink dots."
  },
  {
    id: "linework",
    nameAr: "رسم خطوط نظيف",
    nameEn: "#linework",
    imageUrl: "/api/media/reference-thumbnails/linework.webp",
    category: "illustration",
    systemPromptAddon: "Clean black line art on off-white background, minimalist ink pen drawings, aesthetic contours."
  },
  {
    id: "grainy-flat",
    nameAr: "مسطح ذو نسيج رملي",
    nameEn: "#grainy-flat",
    imageUrl: "/api/media/reference-thumbnails/grainy-flat.webp",
    category: "illustration",
    systemPromptAddon: "Flat illustration style with grainy paper texture, natural warm ambient lighting, beautiful simple vectors."
  },
  {
    id: "pastelbeauty",
    nameAr: "جمالية الباستيل الناعمة",
    nameEn: "#pastelbeauty",
    imageUrl: "/api/media/reference-thumbnails/pastelbeauty.webp",
    category: "illustration",
    systemPromptAddon: "Soft pastel aesthetic art, cream and pink hues, beautiful stylized drawings, dream-like calmness."
  },
  {
    id: "coloredpencil",
    nameAr: "ألوان خشبية رسم",
    nameEn: "#coloredpencil",
    imageUrl: "/api/media/reference-thumbnails/coloredpencil.webp",
    category: "illustration",
    systemPromptAddon: "Detailed colored pencil texture drawing, fine crosshatches, vibrant soft coloring, handmade sketchpad."
  },
  {
    id: "pointillism",
    nameAr: "رسم تنقيطي انطباعي",
    nameEn: "#pointillism",
    imageUrl: "/api/media/reference-thumbnails/pointillism.webp",
    category: "illustration",
    systemPromptAddon: "Pointillism impressionist art style, composed entirely of tiny distinct paint dots, rich textured coloring."
  },
  {
    id: "classyvaporwave",
    nameAr: "فيبورويف كلاسيكي",
    nameEn: "#classyvaporwave",
    imageUrl: "/api/media/reference-thumbnails/classyvaporwave.webp",
    category: "illustration",
    systemPromptAddon: "Vaporwave visual aesthetic, neon pink and purple sunset grid landscapes, 80s computer synth graphics."
  }
];

export interface HookElementPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  promptDescription: string;
}

export const HOOK_ELEMENTS: HookElementPreset[] = [
  {
    id: "orangemoka",
    tag: "@orangemoka",
    nameAr: "وعاء موكا برتقالي (Google AI)",
    nameEn: "Orange Moka Pot",
    imageUrl: "/api/media/reference-thumbnails/orangemoka.webp",
    promptDescription: "Classic orange Moka pot coffee maker on clean table background, Google Nano Banana product model."
  },
  {
    id: "silvercream",
    tag: "@silvercream",
    nameAr: "كريم تجميل فضي (Google AI)",
    nameEn: "Silver Cream Tube",
    imageUrl: "/api/media/reference-thumbnails/silvercream.webp",
    promptDescription: "Sleek silver cosmetic cream tube held against minimal pastel background, Google Nano Banana product model."
  },
  {
    id: "nebulahandbag",
    tag: "@nebulahandbag",
    nameAr: "حقيبة يد فاخرة (Google AI)",
    nameEn: "Luxury Handbag",
    imageUrl: "/api/media/reference-thumbnails/nebulahandbag.webp",
    promptDescription: "Deep purple luxury leather handbag with gold clasp, Google Nano Banana product model."
  },
  {
    id: "redlipstick",
    tag: "@redlipstick",
    nameAr: "أحمر شفاه ياقوتي",
    nameEn: "Red Lipstick",
    imageUrl: "/api/media/reference-thumbnails/redlipstick.webp",
    promptDescription: "Classic gold bullet red lipstick tube open on pink surface."
  },
  {
    id: "bluetoaster",
    tag: "@bluetoaster",
    nameAr: "محمصة خبز زرقاء",
    nameEn: "Retro Blue Toaster",
    imageUrl: "/api/media/reference-thumbnails/bluetoaster.webp",
    promptDescription: "Retro pastel blue kitchen toaster with toasted bread slice."
  },
  {
    id: "perfum",
    tag: "@perfum",
    nameAr: "زجاجة عطور فاخرة (Google AI)",
    nameEn: "Luxury Perfume Bottle",
    imageUrl: "/api/media/reference-thumbnails/perfum.webp",
    promptDescription: "Elegant amber glass perfume bottle with crystal cap, Google Nano Banana product model."
  },
  {
    id: "serum",
    tag: "@serum",
    nameAr: "سيروم عناية بالبشرة",
    nameEn: "Skincare Serum Bottle",
    imageUrl: "/api/media/reference-thumbnails/serum.webp",
    promptDescription: "Glass dropper serum bottle with iridescent glow on warm marble."
  },
  {
    id: "redheels",
    tag: "@redheels",
    nameAr: "حذاء كعب أحمر",
    nameEn: "Red Stiletto Heels",
    imageUrl: "/api/media/reference-thumbnails/redheels.webp",
    promptDescription: "Glossy red high heel stiletto shoes on dark reflective glass."
  },
  {
    id: "lamp",
    tag: "@lamp",
    nameAr: "مصباح طاولة عصري",
    nameEn: "Modern Table Lamp",
    imageUrl: "/api/media/reference-thumbnails/lamp.webp",
    promptDescription: "Minimalist spherical glowing orb table lamp with brass stand."
  },
  {
    id: "smartwatch",
    tag: "@smartwatch",
    nameAr: "ساعة ذكية سوداء",
    nameEn: "Black Smartwatch",
    imageUrl: "/api/media/reference-thumbnails/smartwatch.webp",
    promptDescription: "Modern black smartwatch with dark OLED screen on neutral pedestal."
  },
  {
    id: "totebag",
    tag: "@totebag",
    nameAr: "حقيبة قماشية قتانية",
    nameEn: "Cotton Tote Bag",
    imageUrl: "/api/media/reference-thumbnails/totebag.webp",
    promptDescription: "Minimalist unbleached natural cotton canvas tote bag hanging."
  },
  {
    id: "leatherjacket",
    tag: "@leatherjacket",
    nameAr: "سترة جلدية سوداء",
    nameEn: "Black Leather Jacket",
    imageUrl: "/api/media/reference-thumbnails/leatherjacket.webp",
    promptDescription: "Classic black biker leather jacket with silver zippers."
  },
  {
    id: "metalmug",
    tag: "@metalmug",
    nameAr: "كوب معدني",
    nameEn: "Enamel Metal Mug",
    imageUrl: "/api/media/reference-thumbnails/metalmug.webp",
    promptDescription: "Classic white enamel metal coffee mug on wooden table."
  }
];

export interface HookLocationPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  promptDescription: string;
}

export const HOOK_LOCATIONS: HookLocationPreset[] = [
  {
    id: "beach",
    tag: "@beach",
    nameAr: "شاطئ رملي مشمس",
    nameEn: "Sandy Beach",
    imageUrl: "/api/media/reference-thumbnails/beach.webp",
    promptDescription: "Sunny tropical sandy beach with turquoise ocean water and soft waves."
  },
  {
    id: "bridge",
    tag: "@bridge",
    nameAr: "جسر بحري حديث",
    nameEn: "Coastal Highway Bridge",
    imageUrl: "/api/media/reference-thumbnails/bridge.webp",
    promptDescription: "Long coastal sea bridge highway stretching over clear ocean waters."
  },
  {
    id: "cafe",
    tag: "@cafe",
    nameAr: "مقهى عصري راقي",
    nameEn: "Modern Cafe Interior",
    imageUrl: "/api/media/reference-thumbnails/cafe.webp",
    promptDescription: "Warm minimalist modern cafe interior with wooden tables and warm ambient lighting."
  },
  {
    id: "castle",
    tag: "@castle",
    nameAr: "قلعة تاريخية قديمة",
    nameEn: "Medieval Stone Castle",
    imageUrl: "/api/media/reference-thumbnails/castle.webp",
    promptDescription: "Grand medieval stone castle towers under soft daylight."
  },
  {
    id: "countryside",
    tag: "@countryside",
    nameAr: "ريف وأزهار خضراء",
    nameEn: "Green Countryside",
    imageUrl: "/api/media/reference-thumbnails/countryside.webp",
    promptDescription: "Lush green countryside hills with blooming wildflowers and blue sky."
  },
  {
    id: "desert",
    tag: "@desert",
    nameAr: "صحراء وكثبان رملية",
    nameEn: "Desert Dunes",
    imageUrl: "/api/media/reference-thumbnails/desert.webp",
    promptDescription: "Vast desert sand dunes under bright sunny sky with warm gold tones."
  },
  {
    id: "forest",
    tag: "@forest",
    nameAr: "غابة ضبابية كثيفة",
    nameEn: "Misty Forest",
    imageUrl: "/api/media/reference-thumbnails/forest.webp",
    promptDescription: "Deep green forest with tall trees, moss floor, and misty sunlight rays."
  },
  {
    id: "garden",
    tag: "@garden",
    nameAr: "حديقة يابانية هادئة",
    nameEn: "Zen Garden",
    imageUrl: "/api/media/reference-thumbnails/garden.webp",
    promptDescription: "Peaceful Japanese zen garden with stone pathway and curated greenery."
  },
  {
    id: "interior",
    tag: "@interior",
    nameAr: "تصميم داخلي مودرن",
    nameEn: "Modern Living Interior",
    imageUrl: "/api/media/reference-thumbnails/interior.webp",
    promptDescription: "Spacious modern luxury interior with beige couch and large sunlit windows."
  },
  {
    id: "jungle",
    tag: "@jungle",
    nameAr: "غابة استوائية كثيفة",
    nameEn: "Tropical Jungle",
    imageUrl: "/api/media/reference-thumbnails/jungle.webp",
    promptDescription: "Vibrant tropical rainforest jungle with dense ferns and sun shafts."
  },
  {
    id: "laboratory",
    tag: "@laboratory",
    nameAr: "مختبر علمي متطور",
    nameEn: "High-Tech Laboratory",
    imageUrl: "/api/media/reference-thumbnails/laboratory.webp",
    promptDescription: "Ultra-clean high-tech medical research laboratory with white equipment."
  },
  {
    id: "library",
    tag: "@library",
    nameAr: "مكتبة ضخمة فاخرة",
    nameEn: "Grand Library",
    imageUrl: "/api/media/reference-thumbnails/library.webp",
    promptDescription: "Grand modern architectural library with tall bookshelves and wooden stairs."
  },
  {
    id: "mars",
    tag: "@mars",
    nameAr: "كوكب المريخ وسماء النجوم",
    nameEn: "Mars Surface",
    imageUrl: "/api/media/reference-thumbnails/mars.webp",
    promptDescription: "Red rocky Martian planet landscape under brilliant starry night sky."
  },
  {
    id: "mountain",
    tag: "@mountain",
    nameAr: "جبال شامخة صخرية",
    nameEn: "Rocky Mountain Range",
    imageUrl: "/api/media/reference-thumbnails/mountain.webp",
    promptDescription: "Majestic high mountain range peaks under clear blue sky."
  },
  {
    id: "rooftop",
    tag: "@rooftop",
    nameAr: "سطح برج في المدينة",
    nameEn: "City Rooftop",
    imageUrl: "/api/media/reference-thumbnails/rooftop.webp",
    promptDescription: "Urban city penthouse rooftop terrace overlooking city skyscrapers."
  },
  {
    id: "ruins",
    tag: "@ruins",
    nameAr: "أنقاض وحطام قديم",
    nameEn: "Ancient Ruins",
    imageUrl: "/api/media/reference-thumbnails/ruins.webp",
    promptDescription: "Overgrown ancient stone ruins with sunlight streaming through broken arches."
  },
  {
    id: "snow-field",
    tag: "@snow-field",
    nameAr: "حقل ثلجي جليلي",
    nameEn: "Snowy Mountain Field",
    imageUrl: "/api/media/reference-thumbnails/snow-field.webp",
    promptDescription: "Crisp white snow-covered landscape field with blue ice mountains."
  },
  {
    id: "stadium",
    tag: "@stadium",
    nameAr: "ملعب رياضي ضخم",
    nameEn: "Sports Stadium Arena",
    imageUrl: "/api/media/reference-thumbnails/stadium.webp",
    promptDescription: "Grand modern sports stadium arena with green pitch and empty seats."
  },
  {
    id: "temple",
    tag: "@temple",
    nameAr: "معبد قبة أثري",
    nameEn: "Ancient Temple Interior",
    imageUrl: "/api/media/reference-thumbnails/temple.webp",
    promptDescription: "Sacred ancient stone temple interior with domed roof and sunlit arches."
  },
  {
    id: "underwater",
    tag: "@underwater",
    nameAr: "أعماق المحيط والمرجان",
    nameEn: "Deep Underwater Ocean",
    imageUrl: "/api/media/reference-thumbnails/underwater.webp",
    promptDescription: "Deep blue ocean underwater scene with coral reefs and sunlight rays penetrating water."
  }
];

export interface HookCameraPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  promptDescription: string;
}

export const HOOK_CAMERAS: HookCameraPreset[] = [
  {
    id: "layered",
    tag: "#layered",
    nameAr: "عمق طبقات متدرجة",
    nameEn: "Layered Depth",
    imageUrl: "/api/media/reference-thumbnails/layered.webp?v=2",
    promptDescription: "Multi-layered depth composition with crisp foreground and blurred background element framing."
  },
  {
    id: "drone",
    tag: "#drone",
    nameAr: "تصوير طائرة درون",
    nameEn: "Drone Shot",
    imageUrl: "/api/media/reference-thumbnails/drone.webp?v=2",
    promptDescription: "High altitude smooth flying drone shot over expansive scenery."
  },
  {
    id: "camera360",
    tag: "#360",
    nameAr: "لقطة كروية 360 درجة",
    nameEn: "360 Panoramic",
    imageUrl: "/api/media/reference-thumbnails/camera360.webp?v=2",
    promptDescription: "360-degree tiny planet curvature panoramic wide lens perspective."
  },
  {
    id: "portrait",
    tag: "#portrait",
    nameAr: "لقطة بورتري قريبة",
    nameEn: "Portrait Shot",
    imageUrl: "/api/media/reference-thumbnails/portrait.webp?v=2",
    promptDescription: "Intimate head-and-shoulders portrait shot with soft bokeh background."
  },
  {
    id: "closeup",
    tag: "#close-up",
    nameAr: "لقطة قريبة جداً",
    nameEn: "Close-Up",
    imageUrl: "/api/media/reference-thumbnails/closeup.webp?v=2",
    promptDescription: "Tight extreme close-up shot capturing rich facial textures and eye details."
  },
  {
    id: "tiltshift",
    tag: "#tilt-shift",
    nameAr: "تأثير المصغرات (تيلت شفت)",
    nameEn: "Tilt-Shift",
    imageUrl: "/api/media/reference-thumbnails/tiltshift.webp?v=2",
    promptDescription: "Tilt-shift selective blur lens effect creating a miniature model appearance."
  },
  {
    id: "cinematic",
    tag: "#cinematic",
    nameAr: "لقطة سينمائية فاخرة",
    nameEn: "Cinematic Framing",
    imageUrl: "/api/media/reference-thumbnails/cinematic.webp?v=2",
    promptDescription: "Widescreen anamorphic cinematic framing with moody atmospheric lighting."
  },
  {
    id: "highangle",
    tag: "#high-angle",
    nameAr: "زاوية مرتفعة من الأعلى",
    nameEn: "High-Angle",
    imageUrl: "/api/media/reference-thumbnails/highangle.webp?v=2",
    promptDescription: "High camera angle pointing down from above the subject."
  },
  {
    id: "lowangle",
    tag: "#low-angle",
    nameAr: "زاوية منخفضة من الأسفل",
    nameEn: "Low-Angle",
    imageUrl: "/api/media/reference-thumbnails/lowangle.webp?v=2",
    promptDescription: "Low camera angle looking upward to emphasize grand scale and presence."
  },
  {
    id: "panoramic",
    tag: "#panoramic",
    nameAr: "لقطة بانورامية واسعة",
    nameEn: "Panoramic View",
    imageUrl: "/api/media/reference-thumbnails/panoramic.webp?v=2",
    promptDescription: "Ultra-wide panoramic horizon shot capturing expansive scenery."
  },
  {
    id: "symmetry",
    tag: "#symmetry",
    nameAr: "تكوين متناظر متطابق",
    nameEn: "Symmetry",
    imageUrl: "/api/media/reference-thumbnails/symmetry.webp?v=2",
    promptDescription: "Perfectly centered architectural symmetry framing with balanced lines."
  },
  {
    id: "fisheye",
    tag: "#fish-eye",
    nameAr: "عدسة عين السمكة",
    nameEn: "Fish-Eye Lens",
    imageUrl: "/api/media/reference-thumbnails/fisheye.webp?v=2",
    promptDescription: "Ultra wide 180-degree fisheye lens distortion with curved edge perspective."
  },
  {
    id: "firstperson",
    tag: "#first-person",
    nameAr: "منظور الشخص الأول POV",
    nameEn: "First-Person POV",
    imageUrl: "/api/media/reference-thumbnails/firstperson.webp?v=2",
    promptDescription: "First-person point-of-view perspective shot as seen directly through eyes."
  },
  {
    id: "midshot",
    tag: "#mid-shot",
    nameAr: "لقطة متوسطة (من الخصر)",
    nameEn: "Mid-Shot",
    imageUrl: "/api/media/reference-thumbnails/midshot.webp?v=2",
    promptDescription: "Balanced medium waist-up shot framing body gestures and background clearly."
  },
  {
    id: "fullbody",
    tag: "#full-body",
    nameAr: "لقطة كاملة للجسم",
    nameEn: "Full-Body Shot",
    imageUrl: "/api/media/reference-thumbnails/fullbody.webp?v=2",
    promptDescription: "Full length body shot showing complete outfit and standing environment stance."
  },
  {
    id: "wideshot",
    tag: "#wide-shot",
    nameAr: "لقطة واسعة شاملة",
    nameEn: "Wide Shot",
    imageUrl: "/api/media/reference-thumbnails/wideshot.webp?v=2",
    promptDescription: "Wide environmental establishing shot capturing subject in vast landscape."
  },
  {
    id: "tiltshot",
    tag: "#tilt-shot",
    nameAr: "لقطة مائلة دتش أنجل",
    nameEn: "Tilt Shot",
    imageUrl: "/api/media/reference-thumbnails/tiltshot.webp?v=2",
    promptDescription: "Dutch angle tilted camera horizon creating dynamic action tension."
  },
  {
    id: "aerial",
    tag: "#aerial",
    nameAr: "لقطة جوية رأسية",
    nameEn: "Aerial Top-Down",
    imageUrl: "/api/media/reference-thumbnails/aerial.webp?v=2",
    promptDescription: "Direct overhead top-down bird's eye view aerial perspective."
  },
  // ── Pan / Tilt ──────────────────────────────────────────────
  {
    id: "static-shot",
    tag: "#static",
    nameAr: "لقطة ثابتة مثبتة",
    nameEn: "Static Shot",
    imageUrl: "/api/media/reference-thumbnails/static-shot.webp",
    promptDescription: "locked-off static shot. Movement: hold one fixed camera position for the full clip. Speed: still and steady. Framing: keep the same angle, height, lens distance and composition. End: finish with the same framing and camera position."
  },
  {
    id: "pan-right",
    tag: "#pan-right",
    nameAr: "تدوير أفقي لليمين",
    nameEn: "Pan Right",
    imageUrl: "/api/media/reference-thumbnails/pan-right.webp",
    promptDescription: "pan right. Movement: rotate the camera horizontally from left to right from one fixed point. Speed: smooth constant rotation. Framing: keep the horizon level while new space enters from the right side of the frame. End: settle on a clear final composition."
  },
  {
    id: "pan-left",
    tag: "#pan-left",
    nameAr: "تدوير أفقي لليسار",
    nameEn: "Pan Left",
    imageUrl: "/api/media/reference-thumbnails/pan-left.webp",
    promptDescription: "pan left. Movement: rotate the camera horizontally from right to left from one fixed point. Speed: smooth constant rotation. Framing: keep the horizon level while new space enters from the left side of the frame. End: settle on a clear final composition."
  },
  {
    id: "whip-pan-right",
    tag: "#whip-pan-right",
    nameAr: "تدوير خاطف سريع لليمين",
    nameEn: "Whip Pan Right",
    imageUrl: "/api/media/reference-thumbnails/whip-pan-right.webp",
    promptDescription: "whip pan right. Movement: rotate rapidly from the starting direction toward a new target on the right. Speed: fast snap with brief motion blur during the rotation. Framing: begin on one readable composition and land on a second readable target. End: settle into a sharp final frame."
  },
  {
    id: "whip-pan-left",
    tag: "#whip-pan-left",
    nameAr: "تدوير خاطف سريع لليسار",
    nameEn: "Whip Pan Left",
    imageUrl: "/api/media/reference-thumbnails/whip-pan-left.webp",
    promptDescription: "whip pan left. Movement: rotate rapidly from the starting direction toward a new target on the left. Speed: fast snap with brief motion blur during the rotation. Framing: begin on one readable composition and land on a second readable target. End: settle into a sharp final frame."
  },
  {
    id: "tilt-up",
    tag: "#tilt-up",
    nameAr: "إمالة إلى الأعلى",
    nameEn: "Tilt Up",
    imageUrl: "/api/media/reference-thumbnails/tilt-up.webp",
    promptDescription: "tilt up. Movement: rotate the camera upward from one fixed point. Speed: smooth constant tilt. Framing: keep the vertical subject or architecture centered as the frame travels upward. End: land on the upper target."
  },
  {
    id: "tilt-down",
    tag: "#tilt-down",
    nameAr: "إمالة إلى الأسفل",
    nameEn: "Tilt Down",
    imageUrl: "/api/media/reference-thumbnails/tilt-down.webp",
    promptDescription: "tilt down. Movement: rotate the camera downward from one fixed point. Speed: smooth constant tilt. Framing: keep the vertical subject or architecture centered as the frame travels downward. End: land on the lower target."
  },
  // ── Zoom / Lens ─────────────────────────────────────────────
  {
    id: "slow-zoom-in",
    tag: "#slow-zoom-in",
    nameAr: "تكبير بطيء",
    nameEn: "Slow Zoom In",
    imageUrl: "/api/media/reference-thumbnails/slow-zoom-in.webp",
    promptDescription: "slow zoom in. Movement: slowly increase lens focal length toward a tighter frame. Speed: gradual and even. Framing: keep the main visual target readable as it becomes larger in frame. End: finish on a stable tighter composition."
  },
  {
    id: "slow-zoom-out",
    tag: "#slow-zoom-out",
    nameAr: "تصغير بطيء",
    nameEn: "Slow Zoom Out",
    imageUrl: "/api/media/reference-thumbnails/slow-zoom-out.webp",
    promptDescription: "slow zoom out. Movement: slowly decrease lens focal length toward a wider frame. Speed: gradual and even. Framing: keep the main visual target readable as more surrounding space appears. End: finish on a stable wider composition."
  },
  {
    id: "fast-zoom-in",
    tag: "#fast-zoom-in",
    nameAr: "تكبير سريع",
    nameEn: "Fast Zoom In",
    imageUrl: "/api/media/reference-thumbnails/fast-zoom-in.webp",
    promptDescription: "fast zoom in. Movement: quickly increase lens focal length toward the main visual target. Speed: quick decisive zoom. Framing: keep the target centered or clearly readable during the scale change. End: finish on a stable tighter composition."
  },
  {
    id: "fast-zoom-out",
    tag: "#fast-zoom-out",
    nameAr: "تصغير سريع",
    nameEn: "Fast Zoom Out",
    imageUrl: "/api/media/reference-thumbnails/fast-zoom-out.webp",
    promptDescription: "fast zoom out. Movement: quickly decrease lens focal length away from the main visual target. Speed: quick decisive zoom. Framing: keep the target readable as the surrounding space appears. End: finish on a stable wider composition."
  },
  {
    id: "crash-zoom-in",
    tag: "#crash-zoom-in",
    nameAr: "تكبير مفاجئ حاد",
    nameEn: "Crash Zoom In",
    imageUrl: "/api/media/reference-thumbnails/crash-zoom-in.webp",
    promptDescription: "crash zoom in. Movement: snap the lens rapidly toward the main visual target. Speed: very fast and punchy. Framing: keep the target readable through the sudden scale change. End: land on a bold tighter composition."
  },
  {
    id: "crash-zoom-out",
    tag: "#crash-zoom-out",
    nameAr: "تصغير مفاجئ حاد",
    nameEn: "Crash Zoom Out",
    imageUrl: "/api/media/reference-thumbnails/crash-zoom-out.webp",
    promptDescription: "crash zoom out. Movement: snap the lens rapidly away from the main visual target. Speed: very fast and punchy. Framing: keep the target readable as the surrounding space appears. End: land on a bold wider composition."
  },
  // ── Dolly / Track ───────────────────────────────────────────
  {
    id: "dolly-in",
    tag: "#dolly-in",
    nameAr: "دفع الكاميرا للأمام",
    nameEn: "Dolly In",
    imageUrl: "/api/media/reference-thumbnails/dolly-in.webp",
    promptDescription: "dolly in. Movement: move the camera physically forward in a straight line toward the main subject. Speed: smooth controlled push. Framing: keep camera height, lens direction and subject position consistent while distance closes. End: finish in a tighter composition."
  },
  {
    id: "dolly-out",
    tag: "#dolly-out",
    nameAr: "سحب الكاميرا للخلف",
    nameEn: "Dolly Out",
    imageUrl: "/api/media/reference-thumbnails/dolly-out.webp",
    promptDescription: "dolly out. Movement: move the camera physically backward in a straight line away from the main subject. Speed: smooth controlled retreat. Framing: keep lens direction and camera height consistent while more environment enters frame. End: finish in a wider composition."
  },
  {
    id: "tracking-shot",
    tag: "#tracking",
    nameAr: "لقطة تتبع",
    nameEn: "Tracking Shot",
    imageUrl: "/api/media/reference-thumbnails/tracking-shot.webp",
    promptDescription: "tracking shot. Movement: move through the scene with the main subject. Speed: match the subject's pace. Framing: keep the subject consistently readable while the environment moves around them. End: maintain a clear moving composition."
  },
  {
    id: "follow-shot",
    tag: "#follow",
    nameAr: "متابعة من الخلف (فوق الكتف)",
    nameEn: "Follow / Over-the-Shoulder",
    imageUrl: "/api/media/reference-thumbnails/follow-shot.webp",
    promptDescription: "follow shot from behind. Movement: move behind the subject along their route at shoulder height. Speed: match the subject's pace. Framing: keep the back, shoulder or head as the foreground guide while the route ahead stays readable. End: continue following with the subject leading the frame."
  },
  {
    id: "reverse-tracking",
    tag: "#reverse-tracking",
    nameAr: "تتبع عكسي (Walk & Talk)",
    nameEn: "Reverse Tracking / Walk-and-Talk",
    imageUrl: "/api/media/reference-thumbnails/reverse-tracking.webp",
    promptDescription: "reverse tracking shot. Movement: move backward in front of the walking subject. Speed: match the subject's forward pace. Framing: keep front-facing face and body framing stable as the background moves behind them. End: hold a clear front-facing moving composition."
  },
  {
    id: "side-tracking",
    tag: "#side-tracking",
    nameAr: "تتبع جانبي",
    nameEn: "Side Tracking",
    imageUrl: "/api/media/reference-thumbnails/side-tracking.webp",
    promptDescription: "side tracking shot. Movement: move parallel beside the subject along their direction of travel. Speed: match the subject's motion. Framing: keep the subject in side profile or three-quarter profile at a stable distance. End: continue the parallel movement with clear horizontal motion."
  },
  {
    id: "low-tracking",
    tag: "#low-tracking",
    nameAr: "تتبع من مستوى منخفض",
    nameEn: "Low Tracking",
    imageUrl: "/api/media/reference-thumbnails/low-tracking.webp",
    promptDescription: "low tracking shot. Movement: move at ground or below-waist height alongside the subject's movement path. Speed: match the subject, footsteps or wheels. Framing: keep the low detail readable while the ground plane moves through frame. End: finish with the low perspective clearly maintained."
  },
  {
    id: "vehicle-tracking",
    tag: "#vehicle-tracking",
    nameAr: "تتبع مركبة",
    nameEn: "Vehicle Tracking",
    imageUrl: "/api/media/reference-thumbnails/vehicle-tracking.webp",
    promptDescription: "vehicle tracking shot. Movement: move with the vehicle along its route. Speed: match the vehicle's pace. Framing: keep the vehicle stable in frame while the road or environment moves past. End: maintain a clear moving vehicle composition."
  },
  {
    id: "chase-shot",
    tag: "#chase",
    nameAr: "لقطة مطاردة",
    nameEn: "Chase Shot",
    imageUrl: "/api/media/reference-thumbnails/chase-shot.webp",
    promptDescription: "chase shot. Movement: follow a moving subject quickly along the action route. Speed: fast, reactive and physically close. Framing: keep the subject visible while allowing energetic reframing. End: stay connected to the subject in motion."
  },
  // ── Physical Moves ──────────────────────────────────────────
  {
    id: "truck-right",
    tag: "#truck-right",
    nameAr: "تحريك أفقي لليمين",
    nameEn: "Truck Right",
    imageUrl: "/api/media/reference-thumbnails/truck-right.webp",
    promptDescription: "truck right. Movement: move the camera physically to the right on a straight horizontal path. Speed: smooth constant lateral travel. Framing: keep the lens facing the same direction while the scene slides across frame. End: finish on a clean lateral composition."
  },
  {
    id: "truck-left",
    tag: "#truck-left",
    nameAr: "تحريك أفقي لليسار",
    nameEn: "Truck Left",
    imageUrl: "/api/media/reference-thumbnails/truck-left.webp",
    promptDescription: "truck left. Movement: move the camera physically to the left on a straight horizontal path. Speed: smooth constant lateral travel. Framing: keep the lens facing the same direction while the scene slides across frame. End: finish on a clean lateral composition."
  },
  {
    id: "pedestal-up",
    tag: "#pedestal-up",
    nameAr: "رفع الكاميرا عمودياً",
    nameEn: "Pedestal Up",
    imageUrl: "/api/media/reference-thumbnails/pedestal-up.webp",
    promptDescription: "pedestal up. Movement: move the entire camera vertically upward in a straight line. Speed: smooth constant lift. Framing: keep the lens level and pointed in the same direction during the vertical move. End: finish with the higher framing clearly readable."
  },
  {
    id: "pedestal-down",
    tag: "#pedestal-down",
    nameAr: "خفض الكاميرا عمودياً",
    nameEn: "Pedestal Down",
    imageUrl: "/api/media/reference-thumbnails/pedestal-down.webp",
    promptDescription: "pedestal down. Movement: move the entire camera vertically downward in a straight line. Speed: smooth constant descent. Framing: keep the lens level and pointed in the same direction during the vertical move. End: finish with the lower framing clearly readable."
  },
  {
    id: "slider-right",
    tag: "#slider-right",
    nameAr: "انزلاق قصير لليمين",
    nameEn: "Slider Right",
    imageUrl: "/api/media/reference-thumbnails/slider-right.webp",
    promptDescription: "slider right. Movement: slide the camera a small distance to the right. Speed: slow controlled constant motion. Framing: keep foreground, subject and background layers readable as parallax shifts. End: finish on a refined composition with the new right-side angle visible."
  },
  {
    id: "slider-left",
    tag: "#slider-left",
    nameAr: "انزلاق قصير لليسار",
    nameEn: "Slider Left",
    imageUrl: "/api/media/reference-thumbnails/slider-left.webp",
    promptDescription: "slider left. Movement: slide the camera a small distance to the left. Speed: slow controlled constant motion. Framing: keep foreground, subject and background layers readable as parallax shifts. End: finish on a refined composition with the new left-side angle visible."
  },
  {
    id: "push-past",
    tag: "#push-past",
    nameAr: "العبور خلف عائق أمامي",
    nameEn: "Push Past / Pass-By",
    imageUrl: "/api/media/reference-thumbnails/push-past.webp",
    promptDescription: "push past. Movement: move forward past a visible foreground object, edge or opening. Speed: smooth forward glide. Framing: let the foreground pass close to the lens while the space beyond becomes clearer. End: arrive inside or beyond the foreground layer."
  },
  {
    id: "arc-right",
    tag: "#arc-right",
    nameAr: "قوس منحني إلى اليمين",
    nameEn: "Arc Right",
    imageUrl: "/api/media/reference-thumbnails/arc-right.webp",
    promptDescription: "arc right. Movement: move on a shallow curved path around the main subject toward the right side. Speed: smooth measured curve. Framing: keep distance, height and subject readability consistent while the angle changes. End: finish from a new right-side angle."
  },
  {
    id: "arc-left",
    tag: "#arc-left",
    nameAr: "قوس منحني إلى اليسار",
    nameEn: "Arc Left",
    imageUrl: "/api/media/reference-thumbnails/arc-left.webp",
    promptDescription: "arc left. Movement: move on a shallow curved path around the main subject toward the left side. Speed: smooth measured curve. Framing: keep distance, height and subject readability consistent while the angle changes. End: finish from a new left-side angle."
  },
  {
    id: "orbit-cw",
    tag: "#orbit-cw",
    nameAr: "دوران مع عقارب الساعة",
    nameEn: "Clockwise Orbit",
    imageUrl: "/api/media/reference-thumbnails/orbit-cw.webp",
    promptDescription: "clockwise orbit. Movement: circle clockwise around the main subject at a consistent radius. Speed: smooth controlled orbit. Framing: keep the subject centered while the background rotates around them. End: complete the intended arc or full circle with stable framing."
  },
  {
    id: "orbit-ccw",
    tag: "#orbit-ccw",
    nameAr: "دوران عكس عقارب الساعة",
    nameEn: "Counterclockwise Orbit",
    imageUrl: "/api/media/reference-thumbnails/orbit-ccw.webp",
    promptDescription: "counterclockwise orbit. Movement: circle counterclockwise around the main subject at a consistent radius. Speed: smooth controlled orbit. Framing: keep the subject centered while the background rotates around them. End: complete the intended arc or full circle with stable framing."
  },
  // ── Human Camera ────────────────────────────────────────────
  {
    id: "handheld-shot",
    tag: "#handheld",
    nameAr: "كاميرا محمولة باليد",
    nameEn: "Handheld Shot",
    imageUrl: "/api/media/reference-thumbnails/handheld-shot.webp",
    promptDescription: "handheld shot. Movement: hold the camera at human operator height with natural body movement. Speed: responsive and organic. Framing: keep the subject readable while the frame has subtle sway and micro-adjustments. End: finish with a natural handheld composition."
  },
  {
    id: "snorricam",
    tag: "#snorricam",
    nameAr: "كاميرا مثبتة على الجسم (Snorricam)",
    nameEn: "Body-Mounted / Snorricam",
    imageUrl: "/api/media/reference-thumbnails/snorricam.webp",
    promptDescription: "body-mounted Snorricam. Movement: keep the camera fixed relative to the subject's torso or face while the subject moves. Speed: match the subject's body motion. Framing: keep the subject close, centered and facing the camera as the background moves around them. End: finish with the subject still locked in frame."
  },
  // ── Drone / Crane ───────────────────────────────────────────
  {
    id: "crane-up",
    tag: "#crane-up",
    nameAr: "صعود بالرافعة",
    nameEn: "Crane Up",
    imageUrl: "/api/media/reference-thumbnails/crane-up.webp",
    promptDescription: "crane up. Movement: travel smoothly upward through open space. Speed: slow controlled vertical lift. Framing: keep the subject or location readable as the camera rises. End: finish with the higher scale clearly visible."
  },
  {
    id: "crane-down",
    tag: "#crane-down",
    nameAr: "نزول بالرافعة",
    nameEn: "Crane Down",
    imageUrl: "/api/media/reference-thumbnails/crane-down.webp",
    promptDescription: "crane down. Movement: travel smoothly downward through open space. Speed: slow controlled vertical descent. Framing: keep the subject or location readable as the camera descends. End: finish with the lower subject or destination clearly visible."
  },
  {
    id: "drone-push-in",
    tag: "#drone-push-in",
    nameAr: "دفع الدرون للأمام",
    nameEn: "Drone Push In",
    imageUrl: "/api/media/reference-thumbnails/drone-push-in.webp",
    promptDescription: "drone push in. Movement: fly smoothly forward through open space toward the subject or destination. Speed: controlled aerial glide. Framing: keep the route and destination readable as the camera approaches. End: arrive at a closer aerial composition."
  },
  {
    id: "drone-pull-back",
    tag: "#drone-pull-back",
    nameAr: "سحب الدرون للخلف",
    nameEn: "Drone Pull Back",
    imageUrl: "/api/media/reference-thumbnails/drone-pull-back.webp",
    promptDescription: "drone pull back. Movement: fly smoothly backward away from the subject or destination. Speed: controlled aerial retreat. Framing: keep the subject readable as more landscape appears. End: finish on a wider aerial composition."
  },
  {
    id: "helicopter-shot",
    tag: "#helicopter",
    nameAr: "لقطة هليكوبتر جوية",
    nameEn: "Helicopter Shot",
    imageUrl: "/api/media/reference-thumbnails/helicopter-shot.webp",
    promptDescription: "helicopter-style aerial shot. Movement: move from high altitude along a broad gradual flight path. Speed: steady controlled aerial motion. Framing: keep the landscape or distant moving subject readable at wide scale. End: finish on a stable high-altitude composition."
  },
  // ── Specials ────────────────────────────────────────────────
  {
    id: "fpv-shot",
    tag: "#fpv",
    nameAr: "منظور الشخص الأول المتحرك (FPV)",
    nameEn: "First-Person View (FPV)",
    imageUrl: "/api/media/reference-thumbnails/fpv-shot.webp",
    promptDescription: "first-person view. Movement: move forward at human eye height from the character's perspective. Speed: natural walking or reaching pace. Framing: use visible hands, arms or body edges as the viewer's physical reference. End: arrive at the next point of action from the same point of view."
  },
  {
    id: "tilt-shift-motion",
    tag: "#tilt-shift-motion",
    nameAr: "تأثير تيلت شفت متحرك",
    nameEn: "Tilt-Shift Miniature",
    imageUrl: "/api/media/reference-thumbnails/tilt-shift-motion.webp",
    promptDescription: "tilt-shift miniature view. Movement: hold or glide from a high angled view over the scene. Speed: small precise movement. Framing: keep a narrow band of sharp focus across the key subject area with soft blur above and below. End: finish with the miniature-scale view intact."
  },
  {
    id: "infinite-zoom",
    tag: "#infinite-zoom",
    nameAr: "تكبير لا نهائي",
    nameEn: "Infinite Zoom",
    imageUrl: "/api/media/reference-thumbnails/infinite-zoom.webp",
    promptDescription: "infinite zoom. Movement: zoom continuously inward toward the exact center target. Speed: smooth accelerating zoom. Framing: keep the circular target centered as it expands. End: finish when the next visual world fills the frame."
  },
  {
    id: "earth-zoom-out",
    tag: "#earth-zoom-out",
    nameAr: "تصغير إلى منظر الأرض",
    nameEn: "Earth Zoom Out",
    imageUrl: "/api/media/reference-thumbnails/earth-zoom-out.webp",
    promptDescription: "earth zoom out. Movement: pull upward from the starting point through street, city, landscape and planet scale. Speed: rapid expanding zoom out. Framing: keep the original location centered as scale grows. End: finish on a planet-scale view with the starting point still implied at center."
  },
  {
    id: "time-lapse",
    tag: "#time-lapse",
    nameAr: "تسريع الزمن مع كاميرا ثابتة",
    nameEn: "Time-Lapse",
    imageUrl: "/api/media/reference-thumbnails/time-lapse.webp",
    promptDescription: "locked-camera time-lapse. Movement: hold one fixed camera position while time moves rapidly forward. Speed: fast time compression with a stable camera. Framing: keep the same composition and horizon as motion passes through the frame. End: finish from the same camera angle with visible passage of time."
  },
  {
    id: "pass-through",
    tag: "#pass-through",
    nameAr: "العبور خلال جسم أو سطح",
    nameEn: "Pass-Through Objects",
    imageUrl: "/api/media/reference-thumbnails/pass-through.webp",
    promptDescription: "pass-through movement. Movement: move forward toward a visible object, surface or barrier and continue into the space beyond. Speed: smooth centered glide. Framing: keep the opening or surface centered as the transition point. End: arrive inside the revealed space beyond."
  },
  // ── Signature techniques (from the extended camera-movements catalogue) ─────
  {
    id: "dolly-zoom",
    tag: "#dolly-zoom",
    nameAr: "دولّي زوم (تأثير فيرتيغو)",
    nameEn: "Dolly Zoom (Vertigo)",
    imageUrl: "/api/media/reference-thumbnails/dolly-zoom.webp",
    promptDescription: "dolly zoom effect, simultaneously zoom in while pulling camera back, Hitchcock vertigo effect, background stretching, subject stays same size, unsettling."
  },
  {
    id: "rack-focus",
    tag: "#rack-focus",
    nameAr: "تحويل البؤرة (Rack Focus)",
    nameEn: "Rack Focus",
    imageUrl: "/api/media/reference-thumbnails/rack-focus.webp",
    promptDescription: "rack focus from foreground to background, shallow depth of field, focus pulling between two subjects, bokeh transition, attention redirection."
  },
  {
    id: "pan-360",
    tag: "#pan-360",
    nameAr: "بانوراما دائرة كاملة 360°",
    nameEn: "Full 360° Pan",
    imageUrl: "/api/media/reference-thumbnails/pan-360.webp",
    promptDescription: "full 360 degree pan rotation, camera spinning slowly around its vertical axis, revealing the entire environment, immersive panoramic sweep."
  },
  {
    id: "barrel-roll",
    tag: "#barrel-roll",
    nameAr: "دوران محوري (Barrel Roll)",
    nameEn: "Barrel Roll",
    imageUrl: "/api/media/reference-thumbnails/barrel-roll.webp",
    promptDescription: "camera roll rotation around the Z axis, barrel roll effect, horizon tilting and spinning, disorienting 360 degree roll, psychedelic rotation."
  },
  {
    id: "speed-ramp",
    tag: "#speed-ramp",
    nameAr: "دفع سريع بتسارع (Speed Ramp)",
    nameEn: "Speed Ramp / Fast Dolly",
    imageUrl: "/api/media/reference-thumbnails/speed-ramp.webp",
    promptDescription: "fast forward camera rush toward subject, speed ramp effect, rapid dolly in, dramatic approach, motion blur at edges, high energy cinematic move."
  },
  // ── Extended signature techniques (from Korean camera-movements catalogue) ──
  {
    id: "extreme-macro-zoom",
    tag: "#extreme-macro-zoom",
    nameAr: "زوم ماكرو مجهري",
    nameEn: "Extreme Macro Zoom",
    imageUrl: "/api/media/reference-thumbnails/extreme-macro-zoom.webp",
    promptDescription: "extreme macro zoom, zoom transition from subject to micro details of surface, revealing microscopic texture."
  },
  {
    id: "cosmic-hyper-zoom",
    tag: "#cosmic-hyper-zoom",
    nameAr: "زوم كوني فائق",
    nameEn: "Cosmic Hyper Zoom",
    imageUrl: "/api/media/reference-thumbnails/cosmic-hyper-zoom.webp",
    promptDescription: "cosmic hyper zoom, fast zoom transition from extreme wide view down to macro level, from cosmos to close-up detail."
  },
  {
    id: "over-the-shoulder",
    tag: "#ots",
    nameAr: "لقطة من فوق الكتف (OTS)",
    nameEn: "Over the Shoulder (OTS)",
    imageUrl: "/api/media/reference-thumbnails/over-the-shoulder.webp",
    promptDescription: "over the shoulder shot, camera mounted behind subject A framing subject B, dialogue setup, shallow depth of field."
  },
  {
    id: "reveal-from-behind",
    tag: "#reveal-from-behind",
    nameAr: "كشف بالمسح من خلف عائق",
    nameEn: "Reveal from Behind",
    imageUrl: "/api/media/reference-thumbnails/reveal-from-behind.webp",
    promptDescription: "wipe movement, camera slides laterally from behind foreground object to reveal the scene."
  },
  {
    id: "reveal-from-blur",
    tag: "#reveal-from-blur",
    nameAr: "كشف من ضبابية",
    nameEn: "Reveal from Blur",
    imageUrl: "/api/media/reference-thumbnails/reveal-from-blur.webp",
    promptDescription: "rack focus, start completely out of focus, slowly pull focus until sharp, dramatic reveal from blur."
  },
  {
    id: "epic-drone-reveal",
    tag: "#epic-drone-reveal",
    nameAr: "كشف درون ملحمي",
    nameEn: "Epic Drone Reveal",
    imageUrl: "/api/media/reference-thumbnails/epic-drone-reveal.webp",
    promptDescription: "epic drone reveal, rising and tilting down to reveal the scene, combined aerial ascent with downward tilt."
  },
  {
    id: "fpv-drone-dive",
    tag: "#fpv-dive",
    nameAr: "غوص درون FPV عدواني",
    nameEn: "FPV Drone Dive",
    imageUrl: "/api/media/reference-thumbnails/fpv-drone-dive.webp",
    promptDescription: "FPV drone dive, aggressive diving motion down a vertical structure, high speed vertical descent."
  },
  {
    id: "hyperlapse",
    tag: "#hyperlapse",
    nameAr: "هايبرلابس (تسريع مع حركة)",
    nameEn: "Hyperlapse",
    imageUrl: "/api/media/reference-thumbnails/hyperlapse.webp",
    promptDescription: "hyperlapse, camera moves forward rapidly, time accelerated, fast motion, light trails, moving time-lapse."
  },
  {
    id: "vortex-shot",
    tag: "#vortex-shot",
    nameAr: "لقطة الدوامة (Inception)",
    nameEn: "Vortex / Inception Shot",
    imageUrl: "/api/media/reference-thumbnails/vortex-shot.webp",
    promptDescription: "barrel roll, camera spins 360 degrees clockwise while moving forward, disorienting Inception-style vortex shot."
  },
  {
    id: "bullet-time",
    tag: "#bullet-time",
    nameAr: "زمن الرصاصة (لحظة مجمّدة)",
    nameEn: "Bullet Time",
    imageUrl: "/api/media/reference-thumbnails/bullet-time.webp",
    promptDescription: "bullet time, frozen moment, ultra slow motion, camera orbit around a suspended subject with time frozen."
  },
  {
    id: "worm-eye-tracking",
    tag: "#worm-eye-tracking",
    nameAr: "تتبع بمستوى الأرض (عين الدودة)",
    nameEn: "Worm's Eye Tracking",
    imageUrl: "/api/media/reference-thumbnails/worm-eye-tracking.webp",
    promptDescription: "worm's eye view, low angle tracking, camera moves along the ground looking up, extreme low perspective."
  }
];

export interface HookEffectPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  category: "color" | "lighting" | "mood" | "action";
  promptDescription?: string;
  systemPromptAddon: string;
}

export const HOOK_EFFECTS: HookEffectPreset[] = [
  // ── COLOR ──
  {
    id: "earthy",
    tag: "#earthy",
    nameAr: "ألوان ترابية دافئة",
    nameEn: "Earthy Warm Tones",
    imageUrl: "/api/media/reference-thumbnails/earthy.webp",
    category: "color",
    promptDescription: "Earthy natural color grade, warm ochre and terracotta muted tones, organic feel.",
    systemPromptAddon: "Earthy natural color grade, warm ochre and terracotta muted tones, organic feel."
  },
  {
    id: "softhue",
    tag: "#softhue",
    nameAr: "درجات باستيل ناعمة",
    nameEn: "Soft Hue Pastels",
    imageUrl: "/api/media/reference-thumbnails/softhue.webp",
    category: "color",
    systemPromptAddon: "Soft pastel hue color palette, gentle highlights, low contrast cream and pink tones."
  },
  {
    id: "bw",
    tag: "#b&w",
    nameAr: "أبيض وأسود أحادي",
    nameEn: "Black & White",
    imageUrl: "/api/media/reference-thumbnails/bw.webp",
    category: "color",
    systemPromptAddon: "High contrast black and white monochrome photography style, deep shadows."
  },
  {
    id: "sepia",
    tag: "#sepia",
    nameAr: "سيبيا دافئة كلاسيكية",
    nameEn: "Classic Sepia",
    imageUrl: "/api/media/reference-thumbnails/sepia.webp",
    category: "color",
    systemPromptAddon: "Vintage sepia brown monochrome tone, aged photo print look."
  },
  {
    id: "mutedgreen",
    tag: "#muted-green",
    nameAr: "أخضر هادئ مطفأ",
    nameEn: "Muted Green",
    imageUrl: "/api/media/reference-thumbnails/mutedgreen.webp",
    category: "color",
    systemPromptAddon: "Muted sage and forest green color grading, cinematic film stock aesthetic."
  },
  {
    id: "deepteal",
    tag: "#deep-teal",
    nameAr: "تيل وبرتقالي عميق",
    nameEn: "Deep Teal & Orange",
    imageUrl: "/api/media/reference-thumbnails/deepteal.webp",
    category: "color",
    systemPromptAddon: "Deep teal and orange color grade, rich cinematic Hollywood shadow contrast."
  },
  {
    id: "duotone",
    tag: "#duotone",
    nameAr: "إضاءة ثنائية اللون (Seedance FX)",
    nameEn: "Neon Duotone",
    imageUrl: "/api/media/reference-thumbnails/duotone.webp",
    category: "color",
    systemPromptAddon: "Vibrant duotone lighting, high contrast dual neon gel color split, Seedance 2.0 FX engine."
  },
  {
    id: "vibrant",
    tag: "#vibrant",
    nameAr: "ألوان مشبعة حيوية",
    nameEn: "Vibrant Colors",
    imageUrl: "/api/media/reference-thumbnails/vibrant.webp",
    category: "color",
    systemPromptAddon: "Rich highly saturated color pop, punchy vibrant tones, bright vivid spectrum."
  },
  {
    id: "terracotatateal",
    tag: "#terracote-&-teal",
    nameAr: "طين فخاري مع تيل",
    nameEn: "Terracotta & Teal",
    imageUrl: "/api/media/reference-thumbnails/terracotatateal.webp",
    category: "color",
    systemPromptAddon: "Warm terracotta clay and cool teal contrast palette, aesthetic magazine color grade."
  },
  {
    id: "icyblue",
    tag: "#icy-blue",
    nameAr: "أزرق ثلجي بارد",
    nameEn: "Icy Blue Tones",
    imageUrl: "/api/media/reference-thumbnails/icyblue.webp",
    category: "color",
    systemPromptAddon: "Cool icy blue and frost white color grading, winter atmospheric chill."
  },
  {
    id: "redscale",
    tag: "#redscale",
    nameAr: "تووهج أحمر ريدسكيل",
    nameEn: "Redscale Glow",
    imageUrl: "/api/media/reference-thumbnails/redscale.webp",
    category: "color",
    systemPromptAddon: "Redscale film glow, warm fiery red and amber shadows with high intensity."
  },

  // ── LIGHTING ──
  {
    id: "goldglow",
    tag: "#gold-glow",
    nameAr: "تووهج ذهبي دافئ",
    nameEn: "Gold Glow",
    imageUrl: "/api/media/reference-thumbnails/goldglow.webp",
    category: "lighting",
    systemPromptAddon: "Warm golden light ambient glow, soft golden hour sun reflections."
  },
  {
    id: "highflash",
    tag: "#high-flash",
    nameAr: "فلاش قوي ستوديو",
    nameEn: "High-Flash Studio",
    imageUrl: "/api/media/reference-thumbnails/highflash.webp",
    category: "lighting",
    systemPromptAddon: "Harsh direct camera flash photography, sharp shadows, high fashion studio aesthetic."
  },
  {
    id: "chiaroscuro",
    tag: "#chiaroscuro",
    nameAr: "تباين ضوء وظل شديد",
    nameEn: "Chiaroscuro",
    imageUrl: "/api/media/reference-thumbnails/chiaroscuro.webp",
    category: "lighting",
    systemPromptAddon: "Chiaroscuro lighting technique, dramatic dark background with single strong spotlight key."
  },
  {
    id: "backlight",
    tag: "#back-light",
    nameAr: "إضاءة خلفية وظلال",
    nameEn: "Back-Lit Silhouette",
    imageUrl: "/api/media/reference-thumbnails/backlight.webp",
    category: "lighting",
    systemPromptAddon: "Strong backlighting, rim light highlights around subject silhouette, glowing background atmosphere."
  },
  {
    id: "studiolight",
    tag: "#studio",
    nameAr: "إضاءة استوديو احترافية",
    nameEn: "Studio Key Light",
    imageUrl: "/api/media/reference-thumbnails/studiolight.webp",
    category: "lighting",
    systemPromptAddon: "Professional 3-point studio lighting, soft fill light, clean commercial look."
  },
  {
    id: "iridescent",
    tag: "#iridescent",
    nameAr: "انعكاسات زجاجية متوهجة",
    nameEn: "Iridescent Reflection",
    imageUrl: "/api/media/reference-thumbnails/iridescent.webp",
    category: "lighting",
    systemPromptAddon: "Iridescent metallic sheen, prism rainbow light refractions, glossy surface highlights."
  },
  {
    id: "goldenhour",
    tag: "#golden-hour",
    nameAr: "الساعة الذهبية لغروب الشمس",
    nameEn: "Golden Hour Glow",
    imageUrl: "/api/media/reference-thumbnails/goldenhour.webp",
    category: "lighting",
    systemPromptAddon: "Sunset golden hour light rays, warm sun flare, long soft shadows."
  },
  {
    id: "hardlight",
    tag: "#hardlight",
    nameAr: "ضوء شمس حاد عالي التباين",
    nameEn: "Hard Sunlight",
    imageUrl: "/api/media/reference-thumbnails/hardlight.webp",
    category: "lighting",
    systemPromptAddon: "Direct midday hard sunlight, sharp crisp shadows, high contrast highlights."
  },
  {
    id: "volumetric",
    tag: "#volumetric",
    nameAr: "أشعة ضوء ضبابية عمودية",
    nameEn: "Volumetric Light Beams",
    imageUrl: "/api/media/reference-thumbnails/volumetric.webp",
    category: "lighting",
    systemPromptAddon: "Volumetric God rays cutting through atmospheric haze, dramatic beam highlights."
  },

  // ── MOOD ──
  {
    id: "coldmood",
    tag: "#cold",
    nameAr: "أجواء غامضة باردة",
    nameEn: "Cold Hazy Mood",
    imageUrl: "/api/media/reference-thumbnails/coldmood.webp",
    category: "mood",
    systemPromptAddon: "Cold atmospheric mood, mysterious fog and solitary quiet ambience."
  },
  {
    id: "zenmood",
    tag: "#zen",
    nameAr: "سكينة وهدوء تام",
    nameEn: "Zen Tranquility",
    imageUrl: "/api/media/reference-thumbnails/zenmood.webp",
    category: "mood",
    systemPromptAddon: "Zen peaceful atmosphere, balanced minimalist composition, calm serene mood."
  },
  {
    id: "tension",
    tag: "#tension",
    nameAr: "تشويق وإثارة عالية",
    nameEn: "High Tension Suspense",
    imageUrl: "/api/media/reference-thumbnails/tension.webp",
    category: "mood",
    systemPromptAddon: "Dramatic cinematic tension, high suspense lighting, intense confrontation mood."
  },
  {
    id: "playful",
    tag: "#playful",
    nameAr: "أجواء مرحة ومبهجة",
    nameEn: "Playful Joy",
    imageUrl: "/api/media/reference-thumbnails/playful.webp",
    category: "mood",
    systemPromptAddon: "Playful upbeat mood, colorful happy energy, fun social interaction."
  },
  {
    id: "nostalgic",
    tag: "#nostalgic",
    nameAr: "ذكريات ريترو نوسـتالجيا",
    nameEn: "Nostalgic Vintage",
    imageUrl: "/api/media/reference-thumbnails/nostalgic.webp",
    category: "mood",
    systemPromptAddon: "Nostalgic retro memory aesthetic, warm film grain, emotional vintage atmosphere."
  },

  // ── ACTION ──
  {
    id: "longexposure",
    tag: "#long-exposure",
    nameAr: "تعريض طويل مع ضبابية الحركة",
    nameEn: "Long Exposure Blur",
    imageUrl: "/api/media/reference-thumbnails/longexposure.webp",
    category: "action",
    systemPromptAddon: "Long exposure photography effect, silky motion blur trails, dynamic speed atmosphere."
  },
  {
    id: "walking",
    tag: "#walking",
    nameAr: "حركة مشي وتتبع",
    nameEn: "Walking Motion",
    imageUrl: "/api/media/reference-thumbnails/walking.webp",
    category: "action",
    systemPromptAddon: "Dynamic walking movement tracking, smooth camera motion following subject."
  },
  {
    id: "jumping",
    tag: "#jumping",
    nameAr: "قفزة تجميد في الهواء",
    nameEn: "Mid-Air Jump Freeze",
    imageUrl: "/api/media/reference-thumbnails/jumping.webp",
    category: "action",
    systemPromptAddon: "Mid-air freeze action shot, fast shutter speed capturing energetic jump height."
  },
  {
    id: "glitching",
    tag: "#glitching",
    nameAr: "تشويه جليتش رقمي",
    nameEn: "Digital Glitch",
    imageUrl: "/api/media/reference-thumbnails/glitching.webp",
    category: "action",
    systemPromptAddon: "Digital glitch distortion effect, chromatic aberration artifacts, futuristic cyber styling."
  },
  {
    id: "spinning",
    tag: "#spinning",
    nameAr: "دوران ومغزل عالي السرعة",
    nameEn: "High-Speed Spin",
    imageUrl: "/api/media/reference-thumbnails/spinning.webp",
    category: "action",
    systemPromptAddon: "Spinning rotation motion blur effect, high speed rotational kinetic energy."
  }
];

export interface HookCharacterPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  promptDescription: string;
}

export const HOOK_CHARACTERS: HookCharacterPreset[] = [
  {
    id: "businesswoman",
    tag: "@businesswoman",
    nameAr: "سيدة أعمال سعودية (Google AI)",
    nameEn: "Saudi Businesswoman",
    imageUrl: "/api/media/reference-thumbnails/businesswoman.webp",
    promptDescription: "Professional confident Saudi businesswoman wearing elegant modern attire, Google Gemini 3D character model."
  },
  {
    id: "influencer",
    tag: "@influencer",
    nameAr: "صانع محتوى ريادي (Google AI)",
    nameEn: "Tech Influencer",
    imageUrl: "/api/media/reference-thumbnails/influencer.webp",
    promptDescription: "Charismatic young Middle Eastern tech content creator speaking directly to camera, Google Gemini 3D character model."
  },
  {
    id: "barista",
    tag: "@barista",
    nameAr: "بارستا محترف (Google AI)",
    nameEn: "Master Barista",
    imageUrl: "/api/media/reference-thumbnails/barista.webp",
    promptDescription: "Passionate artisan barista pouring specialty drip coffee with intense focus, Google Gemini 3D character model."
  },
  {
    id: "athlete",
    tag: "@athlete",
    nameAr: "رياضي لياقة بدنية (Google AI)",
    nameEn: "Fitness Athlete",
    imageUrl: "/api/media/reference-thumbnails/athlete.webp",
    promptDescription: "Athletic fit runner preparing for training session in high performance sportswear, Google Gemini 3D character model."
  }
];

export interface HookSketchPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  promptDescription: string;
}

export const HOOK_SKETCHES: HookSketchPreset[] = [
  {
    id: "handdrawn",
    tag: "#pencil-sketch",
    nameAr: "رسم رصاص يدوّي",
    nameEn: "Hand-Drawn Pencil",
    imageUrl: "/api/media/reference-thumbnails/handdrawn.webp",
    promptDescription: "Detailed monochrome graphite pencil sketch drawing on textured paper."
  },
  {
    id: "storyboard-line",
    tag: "#ink-linework",
    nameAr: "تخطيط حبر ستوريبورد",
    nameEn: "Ink Storyboard Lines",
    imageUrl: "/api/media/reference-thumbnails/storyboard-line.webp",
    promptDescription: "Clean graphic black ink linework vector style storyboard frame."
  },
  {
    id: "architectural-blueprint",
    tag: "#blueprint",
    nameAr: "رسم معماري مخطط blueprint",
    nameEn: "Architectural Blueprint",
    imageUrl: "/api/media/reference-thumbnails/architectural-blueprint.webp",
    promptDescription: "Cyan blue background architectural draft blueprint line drawing."
  }
];

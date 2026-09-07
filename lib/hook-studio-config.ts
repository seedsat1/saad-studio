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
  },

  // ── NEW DESIGN STYLES ──
  {
    id: "minimalism",
    nameAr: "مينيماليزم",
    nameEn: "#minimalism",
    imageUrl: "/api/media/reference-thumbnails/minimalism.webp",
    category: "design",
    systemPromptAddon: "Minimalism design, a single focal subject on a vast plain background, muted neutral palette, enormous negative space, calm diffused light, extreme visual restraint."
  },
  {
    id: "maximalism",
    nameAr: "ماكسيماليزم",
    nameEn: "#maximalism",
    imageUrl: "/api/media/reference-thumbnails/maximalism.webp",
    category: "design",
    systemPromptAddon: "Maximalism design, densely layered clashing patterns, rich jewel tones, ornate textiles and gold accents, every surface decorated, opulent visual abundance."
  },
  {
    id: "surrealdesign",
    nameAr: "تصميم سريالي",
    nameEn: "#surrealdesign",
    imageUrl: "/api/media/reference-thumbnails/surrealdesign.webp",
    category: "design",
    systemPromptAddon: "Surreal design artwork, impossible perspective, floating and levitating objects, dreamlike Magritte-inspired composition, soft pastel gradient sky, long clean shadows."
  },
  {
    id: "swissdesign",
    nameAr: "تصميم سويسري",
    nameEn: "#swissdesign",
    imageUrl: "/api/media/reference-thumbnails/swissdesign.webp",
    category: "design",
    systemPromptAddon: "Swiss International Style design, strict modular grid, flat geometric shapes, large Helvetica sans-serif type blocks, red black and white palette, rational asymmetric layout."
  },
  {
    id: "y2kdesign",
    nameAr: "تصميم واي تو كي",
    nameEn: "#y2k",
    imageUrl: "/api/media/reference-thumbnails/y2kdesign.webp",
    category: "design",
    systemPromptAddon: "Y2K aesthetic, liquid chrome metal blobs, holographic iridescent gradients, bubbly early-2000s digital graphics, lens flares and star sparkles, cyan magenta silver glossy plastic."
  },
  {
    id: "glassmorphism",
    nameAr: "جلاس مورفيزم",
    nameEn: "#glassmorphism",
    imageUrl: "/api/media/reference-thumbnails/glassmorphism.webp",
    category: "design",
    systemPromptAddon: "Glassmorphism design, floating frosted translucent glass panels, heavy background blur, thin luminous white borders, soft gradient glow behind, layered depth and soft shadows."
  },
  {
    id: "collageart",
    nameAr: "فن الكولاج",
    nameEn: "#collageart",
    imageUrl: "/api/media/reference-thumbnails/collageart.webp",
    category: "design",
    systemPromptAddon: "Mixed media collage art, torn magazine paper cutouts, halftone newspaper scraps, masking tape and staples, hand-cut layered photographic fragments on textured kraft paper."
  },
  {
    id: "vectorart",
    nameAr: "فن فيكتور",
    nameEn: "#vectorart",
    imageUrl: "/api/media/reference-thumbnails/vectorart.webp",
    category: "design",
    systemPromptAddon: "Flat vector illustration, clean bezier shapes, bold solid color fills, simple geometric figures, no gradients and no texture, crisp SVG-like flat design with a limited palette."
  },
  {
    id: "futuristic",
    nameAr: "مستقبلي",
    nameEn: "#futuristic",
    imageUrl: "/api/media/reference-thumbnails/futuristic.webp",
    category: "design",
    systemPromptAddon: "Futuristic design, sleek white and chrome curved forms, glowing blue light strips, seamless advanced technology surfaces, ultra clean sci-fi product aesthetic."
  },
  {
    id: "aurora",
    nameAr: "شفق قطبي",
    nameEn: "#aurora",
    imageUrl: "/api/media/reference-thumbnails/aurora.webp",
    category: "design",
    systemPromptAddon: "Aurora gradient aesthetic, flowing northern-lights ribbons of green teal violet and pink light, soft blurred luminous mesh gradients over a deep dark sky."
  },
  {
    id: "retro",
    nameAr: "ريترو سبعينات",
    nameEn: "#retro",
    imageUrl: "/api/media/reference-thumbnails/retro.webp",
    category: "design",
    systemPromptAddon: "Retro 1970s design, warm sunburst stripes in mustard orange rust and cream, rounded groovy shapes, vintage offset print grain, faded sun-bleached palette."
  },

  // ── NEW ILLUSTRATION STYLES ──
  {
    id: "pixelart",
    nameAr: "بكسل آرت",
    nameEn: "#pixelart",
    imageUrl: "/api/media/reference-thumbnails/pixelart.webp",
    category: "illustration",
    systemPromptAddon: "16-bit pixel art, crisp square pixels, limited retro console palette, hard dithering, isometric pixel scene, nostalgic SNES-era video game look."
  },
  {
    id: "cyberpunk",
    nameAr: "سايبربانك",
    nameEn: "#cyberpunk",
    imageUrl: "/api/media/reference-thumbnails/cyberpunk.webp",
    category: "illustration",
    systemPromptAddon: "Cyberpunk aesthetic, rain-slick neon-lit streets, dense glowing signage, magenta and cyan light, holographic advertisements, atmospheric haze and high contrast."
  },
  {
    id: "popart",
    nameAr: "بوب آرت",
    nameEn: "#popart",
    imageUrl: "/api/media/reference-thumbnails/popart.webp",
    category: "illustration",
    systemPromptAddon: "Pop art illustration, bold black outlines, Ben-Day halftone dots, primary red yellow and blue flat fills, high contrast retro comic printing."
  },
  {
    id: "handwritten",
    nameAr: "خط يدوي",
    nameEn: "#handwritten",
    imageUrl: "/api/media/reference-thumbnails/handwritten.webp",
    category: "illustration",
    systemPromptAddon: "Handwritten style, ink calligraphy strokes on textured cream paper, hand-drawn doodles and arrows, casual personal notebook aesthetic."
  },
  {
    id: "bohemian",
    nameAr: "بوهيمي",
    nameEn: "#bohemian",
    imageUrl: "/api/media/reference-thumbnails/bohemian.webp",
    category: "illustration",
    systemPromptAddon: "Bohemian aesthetic, warm terracotta and sand palette, macrame textiles, dried pampas grass, rattan and woven textures, earthy natural styling in soft afternoon light."
  },
  {
    id: "graffiti",
    nameAr: "غرافيتي",
    nameEn: "#graffiti",
    imageUrl: "/api/media/reference-thumbnails/graffiti.webp",
    category: "illustration",
    systemPromptAddon: "Graffiti street art, spray paint wildstyle lettering on a concrete wall, vivid overlapping tags, paint drips and stencil layers, urban grit."
  },
  {
    id: "victorian",
    nameAr: "طراز فكتوري",
    nameEn: "#victorian",
    imageUrl: "/api/media/reference-thumbnails/victorian.webp",
    category: "illustration",
    systemPromptAddon: "Victorian era design, ornate gold filigree frames, engraved botanical etchings, deep burgundy and antique cream, damask patterns, 19th century decorative print."
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
    id: "iridescent",
    tag: "#iridescent",
    nameAr: "انعكاسات زجاجية متوهجة",
    nameEn: "Iridescent Reflection",
    imageUrl: "/api/media/reference-thumbnails/iridescent.webp",
    category: "lighting",
    systemPromptAddon: "Iridescent metallic sheen, prism rainbow light refractions, glossy surface highlights."
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

export interface HookShotTypePreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  /** Framing group used by the Shot Type tab filter bar. */
  group: "framing" | "angle";
  promptDescription: string;
}

export const HOOK_SHOT_TYPES: HookShotTypePreset[] = [
  // ── FRAMING ──
  {
    id: "ecu-front",
    tag: "#ecu-front",
    nameAr: "لقطة قريبة جداً – أمامية",
    nameEn: "Extreme Close-Up - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-ecu-front.webp",
    group: "framing",
    promptDescription: "extreme close-up, front view. Framing: fill the frame with the face from brow to chin, eyes on the upper third. Lens: 85mm equivalent, shallow depth of field. Subject faces the lens straight on."
  },
  {
    id: "ecu-45",
    tag: "#ecu-45",
    nameAr: "لقطة قريبة جداً – ٤٥°",
    nameEn: "Extreme Close-Up - 45°",
    imageUrl: "/api/media/reference-thumbnails/shot-ecu-45.webp",
    group: "framing",
    promptDescription: "extreme close-up, three-quarter 45 degree view. Framing: fill the frame with the face, head turned 45 degrees off axis so the far cheekbone stays visible. Lens: 85mm equivalent, shallow depth of field."
  },
  {
    id: "ecu-profile",
    tag: "#ecu-profile",
    nameAr: "لقطة قريبة جداً – جانبية",
    nameEn: "Extreme Close-Up - Profile",
    imageUrl: "/api/media/reference-thumbnails/shot-ecu-profile.webp",
    group: "framing",
    promptDescription: "extreme close-up, full profile view. Framing: fill the frame with the side of the face at a clean 90 degree profile, nose silhouette against the background. Lens: 85mm equivalent, shallow depth of field."
  },
  {
    id: "cu-front",
    tag: "#cu-front",
    nameAr: "لقطة قريبة – أمامية",
    nameEn: "Close-Up - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-cu-front.webp",
    group: "framing",
    promptDescription: "close-up, front view. Framing: head and top of the shoulders, cut just below the collarbone. Subject faces the lens straight on. Lens: 85mm equivalent, background softly separated."
  },
  {
    id: "cu-45",
    tag: "#cu-45",
    nameAr: "لقطة قريبة – ٤٥°",
    nameEn: "Close-Up - 45°",
    imageUrl: "/api/media/reference-thumbnails/shot-cu-45.webp",
    group: "framing",
    promptDescription: "close-up, three-quarter 45 degree view. Framing: head and top of the shoulders, body angled 45 degrees to the lens with the face turned toward camera. Lens: 85mm equivalent, background softly separated."
  },
  {
    id: "cu-profile",
    tag: "#cu-profile",
    nameAr: "لقطة قريبة – جانبية",
    nameEn: "Close-Up - Profile",
    imageUrl: "/api/media/reference-thumbnails/shot-cu-profile.webp",
    group: "framing",
    promptDescription: "close-up, full profile view. Framing: head and top of the shoulders seen from the side at 90 degrees, clean facial silhouette. Lens: 85mm equivalent, background softly separated."
  },
  {
    id: "medium-front",
    tag: "#medium-front",
    nameAr: "لقطة متوسطة – أمامية",
    nameEn: "Medium Shot - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-medium-front.webp",
    group: "framing",
    promptDescription: "medium shot, front view. Framing: from the waist up, subject facing the lens straight on, with readable environment behind. Lens: 50mm equivalent."
  },
  {
    id: "medium-45",
    tag: "#medium-45",
    nameAr: "لقطة متوسطة – ٤٥°",
    nameEn: "Medium Shot - 45°",
    imageUrl: "/api/media/reference-thumbnails/shot-medium-45.webp",
    group: "framing",
    promptDescription: "medium shot, three-quarter 45 degree view. Framing: from the waist up, body angled 45 degrees to the lens, with readable environment behind. Lens: 50mm equivalent."
  },
  {
    id: "medium-profile",
    tag: "#medium-profile",
    nameAr: "لقطة متوسطة – جانبية",
    nameEn: "Medium Shot - Profile",
    imageUrl: "/api/media/reference-thumbnails/shot-medium-profile.webp",
    group: "framing",
    promptDescription: "medium shot, full profile view. Framing: from the waist up seen from the side at 90 degrees, with readable environment behind. Lens: 50mm equivalent."
  },
  {
    id: "three-quarter-front",
    tag: "#three-quarter-front",
    nameAr: "لقطة ثلاثة أرباع – أمامية",
    nameEn: "Three Quarter Shot - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-three-quarter-front.webp",
    group: "framing",
    promptDescription: "three-quarter shot, front view. Framing: from mid-thigh up, subject facing the lens straight on, full posture and gesture visible. Lens: 40mm equivalent."
  },
  {
    id: "three-quarter-45",
    tag: "#three-quarter-45",
    nameAr: "لقطة ثلاثة أرباع – ٤٥°",
    nameEn: "Three Quarter Shot - 45°",
    imageUrl: "/api/media/reference-thumbnails/shot-three-quarter-45.webp",
    group: "framing",
    promptDescription: "three-quarter shot, 45 degree view. Framing: from mid-thigh up, body angled 45 degrees to the lens, full posture and gesture visible. Lens: 40mm equivalent."
  },
  {
    id: "three-quarter-profile",
    tag: "#three-quarter-profile",
    nameAr: "لقطة ثلاثة أرباع – جانبية",
    nameEn: "Three Quarter Shot - Profile",
    imageUrl: "/api/media/reference-thumbnails/shot-three-quarter-profile.webp",
    group: "framing",
    promptDescription: "three-quarter shot, full profile view. Framing: from mid-thigh up seen from the side at 90 degrees, full posture and gesture visible. Lens: 40mm equivalent."
  },
  {
    id: "long-front",
    tag: "#long-front",
    nameAr: "لقطة بعيدة – أمامية",
    nameEn: "Long Shot - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-long-front.webp",
    group: "framing",
    promptDescription: "long shot, front view. Framing: full body head to feet facing the lens, with clear headroom and the location established around the subject. Lens: 35mm equivalent."
  },
  {
    id: "long-profile",
    tag: "#long-profile",
    nameAr: "لقطة بعيدة – جانبية",
    nameEn: "Long Shot - Profile",
    imageUrl: "/api/media/reference-thumbnails/shot-long-profile.webp",
    group: "framing",
    promptDescription: "long shot, profile view. Framing: full body head to feet seen from the side, with clear headroom and the location established around the subject. Lens: 35mm equivalent."
  },
  {
    id: "wide-front",
    tag: "#wide-front",
    nameAr: "لقطة واسعة – أمامية",
    nameEn: "Wide Shot - Front",
    imageUrl: "/api/media/reference-thumbnails/shot-wide-front.webp",
    group: "framing",
    promptDescription: "wide shot, front view. Framing: the subject small within a large environment, facing the lens, landscape or architecture dominating the frame. Lens: 24mm equivalent, deep focus."
  },
  {
    id: "wide-45",
    tag: "#wide-45",
    nameAr: "لقطة واسعة – ٤٥°",
    nameEn: "Wide Shot - 45°",
    imageUrl: "/api/media/reference-thumbnails/shot-wide-45.webp",
    group: "framing",
    promptDescription: "wide shot, 45 degree view. Framing: the subject small within a large environment, angled 45 degrees to the lens, landscape or architecture dominating the frame. Lens: 24mm equivalent, deep focus."
  },
  {
    id: "over-shoulder",
    tag: "#over-shoulder",
    nameAr: "من فوق الكتف",
    nameEn: "Over the Shoulder",
    imageUrl: "/api/media/reference-thumbnails/shot-over-shoulder.webp",
    group: "framing",
    promptDescription: "over-the-shoulder shot. Framing: the back of a foreground person's head and shoulder occupies one lower corner and stays soft, the facing subject is sharp in the opposite third. Lens: 50mm equivalent."
  },
  {
    id: "back-shot",
    tag: "#back-shot",
    nameAr: "من الخلف",
    nameEn: "Back",
    imageUrl: "/api/media/reference-thumbnails/shot-back.webp",
    group: "framing",
    promptDescription: "back shot. Framing: the subject seen from directly behind, face hidden, looking away into the scene so the viewer shares their vantage point. Lens: 35mm equivalent."
  },

  // ── ANGLE ──
  {
    id: "pov-shot",
    tag: "#pov",
    nameAr: "وجهة نظر الشخصية",
    nameEn: "POV",
    imageUrl: "/api/media/reference-thumbnails/shot-pov.webp",
    group: "angle",
    promptDescription: "point-of-view shot. Framing: the scene exactly as the character's own eyes see it, their hands or a held object entering the bottom of the frame, natural eye-level height. Lens: 28mm equivalent."
  },
  {
    id: "high-angle-shot",
    tag: "#high-angle",
    nameAr: "زاوية عالية",
    nameEn: "High Angle",
    imageUrl: "/api/media/reference-thumbnails/shot-high-angle.webp",
    group: "angle",
    promptDescription: "high-angle shot. Framing: camera placed above the subject and tilted down, compressing them against the ground and making them read as smaller and more vulnerable."
  },
  {
    id: "low-angle-shot",
    tag: "#low-angle",
    nameAr: "زاوية منخفضة",
    nameEn: "Low Angle",
    imageUrl: "/api/media/reference-thumbnails/shot-low-angle.webp",
    group: "angle",
    promptDescription: "low-angle shot. Framing: camera placed below eye level and tilted up, the subject towering against the sky or ceiling, reading as powerful and imposing."
  },
  {
    id: "dutch-angle",
    tag: "#dutch-angle",
    nameAr: "زاوية مائلة (داتش)",
    nameEn: "Dutch Angle",
    imageUrl: "/api/media/reference-thumbnails/shot-dutch-angle.webp",
    group: "angle",
    promptDescription: "dutch angle shot. Framing: the camera rolled 15 to 30 degrees so the horizon tilts diagonally across the frame, creating unease and disorientation."
  },
  {
    id: "birds-eye",
    tag: "#birds-eye",
    nameAr: "منظور عين الطائر",
    nameEn: "Bird's Eye View",
    imageUrl: "/api/media/reference-thumbnails/shot-birds-eye.webp",
    group: "angle",
    promptDescription: "bird's eye view. Framing: camera directly overhead looking straight down, the scene flattened into a graphic top-down map-like composition."
  },
  {
    id: "worms-eye",
    tag: "#worms-eye",
    nameAr: "منظور عين الدودة",
    nameEn: "Worm's Eye View",
    imageUrl: "/api/media/reference-thumbnails/shot-worms-eye.webp",
    group: "angle",
    promptDescription: "worm's eye view. Framing: camera at ground level looking almost straight up, extreme vertical perspective with subjects and structures converging high above."
  }
];

export interface HookFilmStockPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  /** Emulsion family used by the Film Stock tab filter bar. */
  group: "color" | "bw";
  promptDescription: string;
}

export const HOOK_FILM_STOCKS: HookFilmStockPreset[] = [
  // ── COLOR EMULSIONS ──
  {
    id: "tungsten-balanced",
    tag: "#tungsten-balanced",
    nameAr: "متوازن تنغستن",
    nameEn: "Tungsten balanced",
    imageUrl: "/api/media/reference-thumbnails/film-tungsten-balanced.webp",
    group: "color",
    promptDescription: "shot on tungsten-balanced film stock: cool blue-leaning shadows with warm amber practicals left uncorrected, slightly crushed blacks, moderate grain, mixed-lighting night colour response."
  },
  {
    id: "warm-fine-grain",
    tag: "#warm-fine-grain",
    nameAr: "حبيبات ناعمة دافئة",
    nameEn: "Warm Fine Grain",
    imageUrl: "/api/media/reference-thumbnails/film-warm-fine-grain.webp",
    group: "color",
    promptDescription: "shot on a warm fine-grain colour negative: golden highlight roll-off, gentle amber cast through the midtones, very fine tight grain, creamy smooth tonal transitions."
  },
  {
    id: "soft-warm",
    tag: "#soft-warm",
    nameAr: "دافئ ناعم",
    nameEn: "Soft Warm",
    imageUrl: "/api/media/reference-thumbnails/film-soft-warm.webp",
    group: "color",
    promptDescription: "soft warm film look: lifted milky blacks, low contrast, honey-toned highlights, gentle halation around light sources, soft diffused rendering."
  },
  {
    id: "warm-film",
    tag: "#warm-film",
    nameAr: "فيلم دافئ",
    nameEn: "Warm film",
    imageUrl: "/api/media/reference-thumbnails/film-warm-film.webp",
    group: "color",
    promptDescription: "warm film stock: strong amber and orange bias across the whole frame, rich saturated warm tones, deep contrast, visible organic grain."
  },
  {
    id: "vibrant-fine-grain",
    tag: "#vibrant-fine-grain",
    nameAr: "حبيبات ناعمة زاهية",
    nameEn: "Vibrant fine grain",
    imageUrl: "/api/media/reference-thumbnails/film-vibrant-fine-grain.webp",
    group: "color",
    promptDescription: "vibrant fine-grain slide film: punchy saturated colour, high micro-contrast, crisp detail, extremely fine grain, vivid reds and greens with clean neutral whites."
  },
  {
    id: "cinema-tungsten",
    tag: "#cinema-tungsten",
    nameAr: "تنغستن سينمائي",
    nameEn: "Cinema tungsten",
    imageUrl: "/api/media/reference-thumbnails/film-cinema-tungsten.webp",
    group: "color",
    promptDescription: "cinema tungsten motion picture stock: warm interior practicals rendered rich and golden, teal-shifted shadows, wide latitude, filmic highlight roll-off, subtle 35mm grain."
  },
  {
    id: "cinema-daylight",
    tag: "#cinema-daylight",
    nameAr: "ضوء نهار سينمائي",
    nameEn: "Cinema Daylight",
    imageUrl: "/api/media/reference-thumbnails/film-cinema-daylight.webp",
    group: "color",
    promptDescription: "cinema daylight motion picture stock: neutral clean daylight balance, natural skin tones, wide dynamic range holding both window highlights and shadow detail, fine 35mm grain."
  },
  {
    id: "soft-pastel",
    tag: "#soft-pastel",
    nameAr: "باستيل ناعم",
    nameEn: "Soft Pastel",
    imageUrl: "/api/media/reference-thumbnails/film-soft-pastel.webp",
    group: "color",
    promptDescription: "soft pastel film emulsion: desaturated chalky colour, pale washed highlights, lifted low-contrast blacks, dreamy muted palette of soft pinks greens and blues."
  },
  {
    id: "green-cast",
    tag: "#green-cast",
    nameAr: "ميلان أخضر",
    nameEn: "Green Cast",
    imageUrl: "/api/media/reference-thumbnails/film-green-cast.webp",
    group: "color",
    promptDescription: "expired film with a green cast: olive-green tint pushed through the midtones and shadows, muted desaturated reds, slightly murky contrast, unstable vintage colour shift."
  },
  {
    id: "saturated-film",
    tag: "#saturated-film",
    nameAr: "فيلم مشبع",
    nameEn: "Saturated Film",
    imageUrl: "/api/media/reference-thumbnails/film-saturated-film.webp",
    group: "color",
    promptDescription: "heavily saturated colour film: dense rich colour, deep blacks, bold contrast curve, glowing saturated primaries, classic punchy print look."
  },
  {
    id: "natural-color",
    tag: "#natural-color",
    nameAr: "ألوان طبيعية",
    nameEn: "Natural color",
    imageUrl: "/api/media/reference-thumbnails/film-natural-color.webp",
    group: "color",
    promptDescription: "natural colour negative: accurate neutral colour reproduction, true-to-life skin tones, balanced moderate contrast, unobtrusive fine grain, no colour cast."
  },
  {
    id: "saturated-heavy-grain",
    tag: "#saturated-heavy-grain",
    nameAr: "مشبع بحبيبات خشنة",
    nameEn: "Saturated heavy grain",
    imageUrl: "/api/media/reference-thumbnails/film-saturated-heavy-grain.webp",
    group: "color",
    promptDescription: "push-processed high-ISO colour film: heavy coarse visible grain across the whole frame, saturated dense colour, hard contrast, gritty textured photographic surface."
  },
  {
    id: "cold-film",
    tag: "#cold-film",
    nameAr: "فيلم بارد",
    nameEn: "Cold Film",
    imageUrl: "/api/media/reference-thumbnails/film-cold-film.webp",
    group: "color",
    promptDescription: "cold film stock: blue and cyan bias throughout, cool steel shadows, desaturated warm tones, crisp contrast, chilly overcast colour response."
  },
  {
    id: "fine-grain",
    tag: "#fine-grain",
    nameAr: "حبيبات ناعمة",
    nameEn: "Fine grain",
    imageUrl: "/api/media/reference-thumbnails/film-fine-grain.webp",
    group: "color",
    promptDescription: "low-ISO fine-grain film: exceptionally smooth near-invisible grain, high resolving detail, restrained natural saturation, clean neutral tonality."
  },
  {
    id: "instant-film",
    tag: "#instant-film",
    nameAr: "فيلم فوري",
    nameEn: "Instant Film",
    imageUrl: "/api/media/reference-thumbnails/film-instant-film.webp",
    group: "color",
    promptDescription: "instant integral film: soft low-resolution rendering, lifted milky blacks, warm yellow-green colour shift, vignetted corners, uneven chemical development, snapshot immediacy."
  },

  // ── BLACK & WHITE EMULSIONS ──
  {
    id: "high-contrast-bw",
    tag: "#high-contrast-bw",
    nameAr: "أبيض وأسود عالي التباين",
    nameEn: "High Contrast BW",
    imageUrl: "/api/media/reference-thumbnails/film-high-contrast-bw.webp",
    group: "bw",
    promptDescription: "high-contrast black and white film: pure crushed blacks against blown clean whites, few midtones, graphic hard-edged tonal separation, punchy dramatic monochrome."
  },
  {
    id: "black-and-white",
    tag: "#black-and-white",
    nameAr: "أبيض وأسود",
    nameEn: "Black and white",
    imageUrl: "/api/media/reference-thumbnails/film-black-and-white.webp",
    group: "bw",
    promptDescription: "classic black and white film: full continuous tonal scale from deep black to bright white, rich silver midtones, moderate contrast, fine even grain."
  },
  {
    id: "high-speed-bw",
    tag: "#high-speed-bw",
    nameAr: "أبيض وأسود سريع الحساسية",
    nameEn: "High Speed BW",
    imageUrl: "/api/media/reference-thumbnails/film-high-speed-bw.webp",
    group: "bw",
    promptDescription: "push-processed high-speed black and white film: coarse gritty grain, hard contrast with blocked shadows, raw reportage monochrome texture."
  }
];

export interface HookMovieLookPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  /** Palette family used by the Movie Look tab filter bar. */
  group: "warm" | "cool" | "muted" | "vivid";
  promptDescription: string;
}

export const HOOK_MOVIE_LOOKS: HookMovieLookPreset[] = [
  // ── WARM LOOKS ──
  {
    id: "desert-gold",
    tag: "#desert-gold",
    nameAr: "ذهب الصحراء",
    nameEn: "Desert Gold",
    imageUrl: "/api/media/reference-thumbnails/look-desert-gold.webp",
    group: "warm",
    promptDescription: "desert gold cinematic grade: sun-bleached amber and ochre palette, hazy atmospheric depth, warm sand highlights against soft violet shadows, epic wide natural light."
  },
  {
    id: "near-future-warmth",
    tag: "#near-future-warmth",
    nameAr: "دفء المستقبل القريب",
    nameEn: "Near future warmth",
    imageUrl: "/api/media/reference-thumbnails/look-near-future-warmth.webp",
    group: "warm",
    promptDescription: "near-future warm grade: soft coral and blush palette, clean bright interiors, gentle low contrast, optimistic tactile futurism with warm skin tones."
  },
  {
    id: "warm-whimsy",
    tag: "#warm-whimsy",
    nameAr: "دفء طريف",
    nameEn: "Warm Whimsy",
    imageUrl: "/api/media/reference-thumbnails/look-warm-whimsy.webp",
    group: "warm",
    promptDescription: "warm whimsical grade: buttery gold and soft green palette, storybook charm, gentle contrast, nostalgic sunlit warmth with playful colour."
  },
  {
    id: "sun-drenched-summer",
    tag: "#sun-drenched-summer",
    nameAr: "صيف مغمور بالشمس",
    nameEn: "Sun-drenched summer",
    imageUrl: "/api/media/reference-thumbnails/look-sun-drenched-summer.webp",
    group: "warm",
    promptDescription: "sun-drenched summer grade: bright hazy sunlight, warm honey highlights blooming into lens flare, lush greens, languid golden Mediterranean warmth."
  },
  {
    id: "golden-ancient-rome",
    tag: "#golden-ancient-rome",
    nameAr: "ذهب الحقبة القديمة",
    nameEn: "Golden Ancient Rome",
    imageUrl: "/api/media/reference-thumbnails/look-golden-ancient-rome.webp",
    group: "warm",
    promptDescription: "golden antiquity epic grade: burnished bronze and wheat palette, dust motes in shafts of hard sunlight, heavy warm contrast, monumental historical scale."
  },
  {
    id: "soft-warmth",
    tag: "#soft-warmth",
    nameAr: "دفء ناعم",
    nameEn: "Soft Warmth",
    imageUrl: "/api/media/reference-thumbnails/look-soft-warmth.webp",
    group: "warm",
    promptDescription: "soft warmth grade: gentle amber wash, lifted shadows, low contrast, intimate domestic light, tender comforting tonality."
  },
  {
    id: "candlelit-period",
    tag: "#candlelit-period",
    nameAr: "حقبة بضوء الشموع",
    nameEn: "Candlelit Period",
    imageUrl: "/api/media/reference-thumbnails/look-candlelit-period.webp",
    group: "warm",
    promptDescription: "candlelit period grade: deep amber pools of flame light falling off into near-black, painterly chiaroscuro, natural-source-only illumination, rich historical texture."
  },
  {
    id: "warm-wonder",
    tag: "#warm-wonder",
    nameAr: "دهشة دافئة",
    nameEn: "Warm Wonder",
    imageUrl: "/api/media/reference-thumbnails/look-warm-wonder.webp",
    group: "warm",
    promptDescription: "warm wonder grade: golden backlight and glowing rim light, soft haze, awestruck faces lit from a source just out of frame, magical amber warmth."
  },

  // ── COOL LOOKS ──
  {
    id: "neon-cyberpunk",
    tag: "#neon-cyberpunk",
    nameAr: "نيون سايبربانك",
    nameEn: "Neon Cyberpunk",
    imageUrl: "/api/media/reference-thumbnails/look-neon-cyberpunk.webp",
    group: "cool",
    promptDescription: "neon cyberpunk grade: saturated magenta and cyan neon against deep blue-black shadows, wet reflective surfaces, volumetric haze, high-contrast night city."
  },
  {
    id: "cold-space",
    tag: "#cold-space",
    nameAr: "فضاء بارد",
    nameEn: "Cold Space",
    imageUrl: "/api/media/reference-thumbnails/look-cold-space.webp",
    group: "cool",
    promptDescription: "cold space grade: desaturated steel blue and grey palette, hard unforgiving light, vast empty negative space, clinical isolation and scale."
  },
  {
    id: "green-tinted-digital",
    tag: "#green-tinted-digital",
    nameAr: "رقمي بميلان أخضر",
    nameEn: "Green-tinted digital",
    imageUrl: "/api/media/reference-thumbnails/look-green-tinted-digital.webp",
    group: "cool",
    promptDescription: "green-tinted digital grade: pervasive emerald cast through every midtone and shadow, crushed blacks, cold artificial screen glow, synthetic simulated reality."
  },
  {
    id: "cold-minimalism",
    tag: "#cold-minimalism",
    nameAr: "بساطة باردة",
    nameEn: "Cold Minimalism",
    imageUrl: "/api/media/reference-thumbnails/look-cold-minimalism.webp",
    group: "cool",
    promptDescription: "cold minimalist grade: muted blue-grey palette, restrained low saturation, clean uncluttered composition, precise controlled light, emotional distance."
  },
  {
    id: "futuristic-neon-blue",
    tag: "#futuristic-neon-blue",
    nameAr: "أزرق نيون مستقبلي",
    nameEn: "Futuristic Neon Blue",
    imageUrl: "/api/media/reference-thumbnails/look-futuristic-neon-blue.webp",
    group: "cool",
    promptDescription: "futuristic neon blue grade: glowing electric cyan light lines against pure black, hard specular reflections, geometric synthetic environment, luminous cold precision."
  },
  {
    id: "contemplative-scifi",
    tag: "#contemplative-scifi",
    nameAr: "خيال علمي تأملي",
    nameEn: "Contemplative sci-fi",
    imageUrl: "/api/media/reference-thumbnails/look-contemplative-scifi.webp",
    group: "cool",
    promptDescription: "contemplative sci-fi grade: overcast slate blue and fog-grey palette, soft diffused light, low saturation, quiet monumental atmosphere and heavy stillness."
  },
  {
    id: "digital-nightscape",
    tag: "#digital-nightscape",
    nameAr: "مشهد ليلي رقمي",
    nameEn: "Digital Nightscape",
    imageUrl: "/api/media/reference-thumbnails/look-digital-nightscape.webp",
    group: "cool",
    promptDescription: "digital nightscape grade: cold blue night with warm bokeh city lights, clean modern digital capture, deep shadow detail retained, reflective glass and rain."
  },
  {
    id: "cold-wilderness",
    tag: "#cold-wilderness",
    nameAr: "برية باردة",
    nameEn: "Cold Wilderness",
    imageUrl: "/api/media/reference-thumbnails/look-cold-wilderness.webp",
    group: "cool",
    promptDescription: "cold wilderness grade: icy blue-white natural light, desaturated earth tones, breath-visible cold, raw available-light naturalism and harsh survival atmosphere."
  },

  // ── MUTED LOOKS ──
  {
    id: "pastel-symmetrical",
    tag: "#pastel-symmetrical",
    nameAr: "باستيل متناظر",
    nameEn: "Pastel symmetrical",
    imageUrl: "/api/media/reference-thumbnails/look-pastel-symmetrical.webp",
    group: "muted",
    promptDescription: "pastel symmetrical grade: flat frontal composition, perfectly centred symmetry, candy pastel palette of pink mint and butter yellow, even shadowless light, deadpan precision."
  },
  {
    id: "dreamlike-memories",
    tag: "#dreamlike-memories",
    nameAr: "ذكريات حالمة",
    nameEn: "Dreamlike memories",
    imageUrl: "/api/media/reference-thumbnails/look-dreamlike-memories.webp",
    group: "muted",
    promptDescription: "dreamlike memory grade: soft hazy diffusion, faded desaturated colour, milky lifted blacks, gentle blur at the frame edges, the texture of a half-remembered moment."
  },
  {
    id: "controlled-tension",
    tag: "#controlled-tension",
    nameAr: "توتر مضبوط",
    nameEn: "Controlled Tension",
    imageUrl: "/api/media/reference-thumbnails/look-controlled-tension.webp",
    group: "muted",
    promptDescription: "controlled tension grade: dusty desaturated earth palette, hard directional daylight, deep contained shadows, restrained colour and coiled procedural stillness."
  },
  {
    id: "desaturated-dread",
    tag: "#desaturated-dread",
    nameAr: "رهبة باهتة",
    nameEn: "Desaturated dread",
    imageUrl: "/api/media/reference-thumbnails/look-desaturated-dread.webp",
    group: "muted",
    promptDescription: "desaturated dread grade: near-monochrome grey-green palette, heavy crushed shadows, cold flat light, oppressive bleak atmosphere and drained colour."
  },
  {
    id: "desaturated-trenches",
    tag: "#desaturated-trenches",
    nameAr: "خنادق باهتة",
    nameEn: "Desaturated trenches",
    imageUrl: "/api/media/reference-thumbnails/look-desaturated-trenches.webp",
    group: "muted",
    promptDescription: "desaturated wartime grade: mud brown and gunmetal grey palette, overcast diffused light, ash and smoke in the air, grim documentary weight."
  },
  {
    id: "high-contrast-bw-look",
    tag: "#high-contrast-bw-look",
    nameAr: "أبيض وأسود عالي التباين",
    nameEn: "High contrast BW",
    imageUrl: "/api/media/reference-thumbnails/look-high-contrast-bw.webp",
    group: "muted",
    promptDescription: "high-contrast monochrome grade: deep pooling blacks against stark whites, hard sculpted light, graphic shadow shapes, entirely black and white with no colour."
  },
  {
    id: "controlled-modern",
    tag: "#controlled-modern",
    nameAr: "حديث مضبوط",
    nameEn: "Controlled Modern",
    imageUrl: "/api/media/reference-thumbnails/look-controlled-modern.webp",
    group: "muted",
    promptDescription: "controlled modern grade: cool neutral palette, immaculate clean interiors, precise soft window light, restrained saturation, composed contemporary austerity."
  },
  {
    id: "soft-countryside",
    tag: "#soft-countryside",
    nameAr: "ريف ناعم",
    nameEn: "Soft Countryside",
    imageUrl: "/api/media/reference-thumbnails/look-soft-countryside.webp",
    group: "muted",
    promptDescription: "soft countryside grade: gentle sage green and dove grey palette, overcast diffused daylight, low contrast, quiet pastoral naturalism."
  },
  {
    id: "muted-elegance",
    tag: "#muted-elegance",
    nameAr: "أناقة هادئة",
    nameEn: "Muted elegance",
    imageUrl: "/api/media/reference-thumbnails/look-muted-elegance.webp",
    group: "muted",
    promptDescription: "muted elegance grade: refined desaturated palette of taupe charcoal and slate, soft directional light, understated richness, tailored restrained sophistication."
  },
  {
    id: "documentary-natural",
    tag: "#documentary-natural",
    nameAr: "وثائقي طبيعي",
    nameEn: "Documentary Natural",
    imageUrl: "/api/media/reference-thumbnails/look-documentary-natural.webp",
    group: "muted",
    promptDescription: "documentary natural grade: honest unstyled available light, neutral true colour, moderate contrast, no stylisation, observational everyday realism."
  },
  {
    id: "symmetrical-precision",
    tag: "#symmetrical-precision",
    nameAr: "دقة متناظرة",
    nameEn: "Symmetrical Precision",
    imageUrl: "/api/media/reference-thumbnails/look-symmetrical-precision.webp",
    group: "muted",
    promptDescription: "symmetrical precision grade: rigorous one-point perspective, perfectly centred subject, cool controlled palette, wide-angle geometric corridors, unsettling clinical order."
  },

  // ── VIVID LOOKS ──
  {
    id: "saturated-apocalyptic",
    tag: "#saturated-apocalyptic",
    nameAr: "نهاية العالم المشبعة",
    nameEn: "Saturated Apocalyptic",
    imageUrl: "/api/media/reference-thumbnails/look-saturated-apocalyptic.webp",
    group: "vivid",
    promptDescription: "saturated apocalyptic grade: blazing orange sand against electric teal sky, extreme colour separation, harsh crushed contrast, hyper-real wasteland intensity."
  },
  {
    id: "overexposed-folk",
    tag: "#overexposed-folk",
    nameAr: "فولك مفرط الإضاءة",
    nameEn: "Overexposed Folk",
    imageUrl: "/api/media/reference-thumbnails/look-overexposed-folk.webp",
    group: "vivid",
    promptDescription: "overexposed folk grade: blinding blown-out daylight, bleached whites, vivid saturated florals and grass, unnervingly bright and shadowless."
  },
  {
    id: "saturated-pop-culture",
    tag: "#saturated-pop-culture",
    nameAr: "ثقافة شعبية مشبعة",
    nameEn: "Saturated Pop Culture",
    imageUrl: "/api/media/reference-thumbnails/look-saturated-pop-culture.webp",
    group: "vivid",
    promptDescription: "saturated pop grade: punchy retro colour, warm sunlit golden hour, rich reds and turquoise, glossy period-nostalgic vibrance and high colour density."
  }
];

export interface HookLightingPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  /** Lighting family used by the Lighting tab filter bar. */
  group: "portrait" | "natural" | "dramatic";
  promptDescription: string;
}

export const HOOK_LIGHTING: HookLightingPreset[] = [
  // ── PORTRAIT PATTERNS ──
  {
    id: "rembrandt-lighting",
    tag: "#rembrandt",
    nameAr: "إضاءة رمبرانت",
    nameEn: "Rembrandt Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-rembrandt.webp",
    group: "portrait",
    promptDescription: "Rembrandt lighting: a single key light placed high and about 45 degrees to one side, casting a small illuminated triangle on the shadowed cheek, the rest falling into soft deep shadow."
  },
  {
    id: "butterfly-lighting",
    tag: "#butterfly",
    nameAr: "إضاءة الفراشة",
    nameEn: "Butterfly Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-butterfly.webp",
    group: "portrait",
    promptDescription: "Butterfly lighting: the key light placed directly in front and high above, throwing a small symmetrical butterfly-shaped shadow straight down beneath the subject, glamorous and even."
  },
  {
    id: "loop-lighting",
    tag: "#loop",
    nameAr: "إضاءة الحلقة",
    nameEn: "Loop Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-loop.webp",
    group: "portrait",
    promptDescription: "Loop lighting: the key light slightly off axis and a little above eye level, casting a small looping shadow down and to one side without touching the cheek shadow, natural and flattering."
  },
  {
    id: "split-lighting",
    tag: "#split",
    nameAr: "إضاءة منقسمة",
    nameEn: "Split Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-split.webp",
    group: "portrait",
    promptDescription: "Split lighting: the key light placed at a full 90 degrees to the side, lighting exactly one half and leaving the other half in darkness, a hard vertical division down the middle."
  },
  {
    id: "broad-lighting",
    tag: "#broad",
    nameAr: "إضاءة عريضة",
    nameEn: "Broad Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-broad.webp",
    group: "portrait",
    promptDescription: "Broad lighting: the key light falls on the side turned toward the camera, so the larger visible plane is lit and the shadow is pushed away from the lens, open and widening."
  },
  {
    id: "short-lighting",
    tag: "#short",
    nameAr: "إضاءة قصيرة",
    nameEn: "Short Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-short.webp",
    group: "portrait",
    promptDescription: "Short lighting: the key light falls on the side turned away from the camera, so the near plane sits in shadow, sculpting and slimming with strong dimensional falloff."
  },
  {
    id: "high-key",
    tag: "#high-key",
    nameAr: "هاي كي",
    nameEn: "High Key",
    imageUrl: "/api/media/reference-thumbnails/light-high-key.webp",
    group: "portrait",
    promptDescription: "High key lighting: bright even illumination from multiple soft sources, almost no shadows, pale luminous background, low contrast, clean and airy."
  },
  {
    id: "low-key",
    tag: "#low-key",
    nameAr: "لو كي",
    nameEn: "Low Key",
    imageUrl: "/api/media/reference-thumbnails/light-low-key.webp",
    group: "portrait",
    promptDescription: "Low key lighting: a single small hard source against darkness, most of the frame in deep black, only selective edges and planes picked out, heavy dramatic contrast."
  },
  {
    id: "stage-lighting",
    tag: "#stage",
    nameAr: "إضاءة مسرح",
    nameEn: "Stage Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-stage.webp",
    group: "portrait",
    promptDescription: "Stage lighting: a tight hard spotlight pooling on the subject with a defined falloff edge, surrounding space dropping to black, theatrical isolation."
  },

  // ── NATURAL LIGHT ──
  {
    id: "golden-hour-light",
    tag: "#golden-hour",
    nameAr: "الساعة الذهبية",
    nameEn: "Golden Hour",
    imageUrl: "/api/media/reference-thumbnails/light-golden-hour.webp",
    group: "natural",
    promptDescription: "Golden hour light: low warm sun raking in from the side, long soft shadows, amber highlights, gentle glowing warmth just after sunrise or before sunset."
  },
  {
    id: "blue-hour-light",
    tag: "#blue-hour",
    nameAr: "الساعة الزرقاء",
    nameEn: "Blue Hour",
    imageUrl: "/api/media/reference-thumbnails/light-blue-hour.webp",
    group: "natural",
    promptDescription: "Blue hour light: the deep even blue twilight just after sunset, cool ambient fill with no direct sun, warm artificial lights beginning to register against it."
  },
  {
    id: "hard-sunlight",
    tag: "#hard-sunlight",
    nameAr: "شمس حادة",
    nameEn: "Hard Sunlight",
    imageUrl: "/api/media/reference-thumbnails/light-hard-sunlight.webp",
    group: "natural",
    promptDescription: "Hard sunlight: direct midday sun from a clear sky, crisp hard-edged shadows, blown specular highlights, high contrast and strong graphic shadow shapes."
  },
  {
    id: "candlelight",
    tag: "#candlelight",
    nameAr: "ضوء الشموع",
    nameEn: "Candlelight",
    imageUrl: "/api/media/reference-thumbnails/light-candlelight.webp",
    group: "natural",
    promptDescription: "Candlelight: a small warm flickering flame as the only source, deep amber pool falling off rapidly into darkness, soft warm skin tones and dancing shadows."
  },
  {
    id: "moonlight",
    tag: "#moonlight",
    nameAr: "ضوء القمر",
    nameEn: "Moonlight",
    imageUrl: "/api/media/reference-thumbnails/light-moonlight.webp",
    group: "natural",
    promptDescription: "Moonlight: cool blue-silver illumination from a single high distant source, low overall level with detail retained in the shadows, quiet nocturnal stillness."
  },

  // ── DRAMATIC / SHAPED LIGHT ──
  {
    id: "rim-lighting",
    tag: "#rim",
    nameAr: "إضاءة الحواف",
    nameEn: "Rim Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-rim.webp",
    group: "dramatic",
    promptDescription: "Rim lighting: a hard source placed behind and to one side tracing a bright outline along the subject's edge, separating it from a dark background while the front stays shadowed."
  },
  {
    id: "backlight-strong",
    tag: "#backlight",
    nameAr: "إضاءة خلفية",
    nameEn: "Backlight",
    imageUrl: "/api/media/reference-thumbnails/light-backlight.webp",
    group: "dramatic",
    promptDescription: "Backlighting: the main source directly behind the subject facing the lens, glowing halation around the edges, lifted flare and haze, the front softly underexposed."
  },
  {
    id: "volumetric-lighting",
    tag: "#volumetric",
    nameAr: "أشعة ضوئية حجمية",
    nameEn: "Volumetric Lighting",
    imageUrl: "/api/media/reference-thumbnails/light-volumetric.webp",
    group: "dramatic",
    promptDescription: "Volumetric lighting: visible god rays and shafts of light cutting through atmospheric haze, dust or smoke, the beams themselves becoming a tangible part of the composition."
  },
  {
    id: "silhouette",
    tag: "#silhouette",
    nameAr: "ظلّية",
    nameEn: "Silhouette",
    imageUrl: "/api/media/reference-thumbnails/light-silhouette.webp",
    group: "dramatic",
    promptDescription: "Silhouette lighting: the subject rendered as a solid black shape with no front fill at all, read purely as outline against a bright evenly lit background."
  }
];

export interface HookMotionBlurPreset {
  id: string;
  tag: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  /** Whether the preset sets an overall amount or a specific blur technique. */
  group: "amount" | "technique";
  promptDescription: string;
}

export const HOOK_MOTION_BLURS: HookMotionBlurPreset[] = [
  // ── AMOUNT ──
  {
    id: "no-blur",
    tag: "#no-blur",
    nameAr: "بدون ضبابية",
    nameEn: "None",
    imageUrl: "/api/media/reference-thumbnails/blur-none.webp",
    group: "amount",
    // Not the same as leaving the tab unselected: this actively asks for a frozen frame.
    promptDescription: "No motion blur at all: a fast shutter freezing every moving element, edges crisp and sharp throughout, no smearing or trailing anywhere in the frame."
  },
  {
    id: "subtle-cinematic",
    tag: "#subtle-cinematic",
    nameAr: "سينمائي خفيف",
    nameEn: "Subtle Cinematic",
    imageUrl: "/api/media/reference-thumbnails/blur-subtle-cinematic.webp",
    group: "amount",
    promptDescription: "Subtle cinematic motion blur: a natural 180-degree shutter, only the fastest-moving extremities softening slightly while the main subject stays readable and sharp."
  },
  {
    id: "moderate-cinematic",
    tag: "#moderate-cinematic",
    nameAr: "سينمائي متوسط",
    nameEn: "Moderate Cinematic",
    imageUrl: "/api/media/reference-thumbnails/blur-moderate-cinematic.webp",
    group: "amount",
    promptDescription: "Moderate cinematic motion blur: a slower shutter smearing limbs, fabric and anything in motion into clear directional streaks, while the core of the subject stays identifiable."
  },
  {
    id: "heavy-cinematic",
    tag: "#heavy-cinematic",
    nameAr: "سينمائي قوي",
    nameEn: "Heavy Cinematic",
    imageUrl: "/api/media/reference-thumbnails/blur-heavy-cinematic.webp",
    group: "amount",
    promptDescription: "Heavy cinematic motion blur: a long shutter dissolving the moving subject into sweeping abstract smears of colour and light, form barely holding together, motion dominating the frame."
  },

  // ── TECHNIQUE ──
  {
    id: "subject-motion-blur",
    tag: "#subject-blur",
    nameAr: "ضبابية الهدف فقط",
    nameEn: "Subject Motion Blur Only",
    imageUrl: "/api/media/reference-thumbnails/blur-subject.webp",
    group: "technique",
    promptDescription: "Subject motion blur only: the camera locked off and perfectly still so the background and environment stay razor sharp, while the moving subject alone smears across the frame."
  },
  {
    id: "camera-motion-blur",
    tag: "#camera-blur",
    nameAr: "ضبابية الكاميرا فقط",
    nameEn: "Camera Motion Blur Only",
    imageUrl: "/api/media/reference-thumbnails/blur-camera.webp",
    group: "technique",
    promptDescription: "Camera motion blur only: the camera panning with the moving subject so the subject stays sharp and readable while the entire background streaks into horizontal motion lines."
  },
  {
    id: "rack-focus-blur",
    tag: "#rack-focus-blur",
    nameAr: "ضبابية نقل التركيز",
    nameEn: "Rack Focus Pull Blur",
    imageUrl: "/api/media/reference-thumbnails/blur-rack-focus.webp",
    group: "technique",
    promptDescription: "Rack focus pull blur: focus caught mid-transition between two planes, the foreground melting into soft creamy bokeh while a sharp plane emerges behind it, shallow depth of field."
  },
  {
    id: "zoom-blur",
    tag: "#zoom-blur",
    nameAr: "ضبابية الزوم",
    nameEn: "Zoom Blur",
    imageUrl: "/api/media/reference-thumbnails/blur-zoom.webp",
    group: "technique",
    promptDescription: "Zoom blur: the lens racked during the exposure so every element streaks radially outward from a sharp centre point, explosive lines of motion radiating to the frame edges."
  },
  {
    id: "long-exposure-trails",
    tag: "#light-trails",
    nameAr: "آثار ضوئية بتعريض طويل",
    nameEn: "Long Exposure Light Trails",
    imageUrl: "/api/media/reference-thumbnails/blur-light-trails.webp",
    group: "technique",
    promptDescription: "Long exposure light trails: a multi-second exposure in darkness where every moving light source paints continuous glowing ribbons through the frame, static elements staying sharp."
  }
];

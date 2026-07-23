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
  category: "illustration" | "3d" | "design";
  systemPromptAddon: string;
}

export const HOOK_STYLES: HookStylePreset[] = [
  // ── DESIGN CATEGORY ──
  {
    id: "photorealistic",
    nameAr: "تصوير واقعي",
    nameEn: "#photo",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Photorealistic style, captured on 35mm lens, natural textures, highly detailed, realistic lighting."
  },
  {
    id: "natural",
    nameAr: "إضاءة طبيعية",
    nameEn: "#natural",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Natural lighting, lifestyle photography, authentic candid moment, film grain, soft highlights."
  },
  {
    id: "editorial",
    nameAr: "تصفيف مجلات",
    nameEn: "#editorial",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "High fashion editorial magazine style, dramatic studio lighting, rich colors, stylized composition."
  },
  {
    id: "neomemphis",
    nameAr: "نيو ميمفيس ريترو",
    nameEn: "#neomemphis",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Neo Memphis style design, bold patterns, bright geometry, colorful retro shapes, high contrast flat graphics."
  },
  {
    id: "boldposter",
    nameAr: "ملصق جريء ريترو",
    nameEn: "#boldposter",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Bold vintage poster style, retro saturated color palette, graphic print texture, strong typography base."
  },
  {
    id: "letterpop",
    nameAr: "بوب تيبوغرافي",
    nameEn: "#letterpop",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Pop typography art, bold lettering, vibrant neon accent hues, decorative graphic design poster."
  },
  {
    id: "minimaltypo",
    nameAr: "تيبوغرافي مبسط",
    nameEn: "#minimaltypo",
    imageUrl: "https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Minimalist layout, fine typography, black and white stark graphic design, plenty of negative space."
  },
  {
    id: "coffeeshopmockup",
    nameAr: "موك اب كوب قهوة",
    nameEn: "#coffeeshopmockup",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
    category: "design",
    systemPromptAddon: "Realistic branding mockup, coffee cup placement on wooden shop counter, soft natural morning bokeh."
  },

  // ── 3D CATEGORY ──
  {
    id: "character3d",
    nameAr: "شخصية ثلاثية الأبعاد",
    nameEn: "#character3d",
    imageUrl: "https://images.unsplash.com/photo-1620428268482-cf1851a36764?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "3D stylized character render, octane render, soft ambient occlusion, bright clay textures, cute design."
  },
  {
    id: "claytoon",
    nameAr: "رسوم صلصال 3D",
    nameEn: "#claytoon",
    imageUrl: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Claymation style, soft 3D clay textures, handmade look, plasticine material, stop-motion animation feel."
  },
  {
    id: "dreamglass",
    nameAr: "زجاج حلمي متوهج",
    nameEn: "#dreamglass",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Dream glass rendering, semi-transparent frosted textures, glowing iridescent internal refraction, pastel aura."
  },
  {
    id: "glam3d",
    nameAr: "شخصية 3D متألقة",
    nameEn: "#glam3d",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Glamorous 3D character design, highly detailed clothing, glossy hair textures, cute doll look, soft studio lighting."
  },
  {
    id: "minimalcharacters",
    nameAr: "شخصيات 3D مبسطة",
    nameEn: "#minimalcharacters",
    imageUrl: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Minimalist 3D character layout, basic geometric shapes, clean pastel color blocks, smooth rendering."
  },
  {
    id: "vinyltoy",
    nameAr: "لعبة فينيل 3D",
    nameEn: "#vinyltoy",
    imageUrl: "https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Vinyl toy figure aesthetic, glossy smooth plastic texture, Funko Pop model layout, toy packaging style."
  },
  {
    id: "motionstitched",
    nameAr: "قماش صوف مطرز",
    nameEn: "#motionstitched",
    imageUrl: "https://images.unsplash.com/photo-1584992208183-b9eb816db7eb?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Felt wool animation style, stitched details, fabric textures, organic warm plush toy aesthetic."
  },
  {
    id: "3dcolorful",
    nameAr: "أشكال 3D ملونة",
    nameEn: "#3dcolorful",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Dynamic colorful 3D abstract shapes, rainbow gradient renders, high saturation glossy material."
  },
  {
    id: "softprism3d",
    nameAr: "موشور زجاجي 3D",
    nameEn: "#softprism3d",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Soft prism glass rendering, colorful chromatic aberration, rainbow refraction beams, luxury cosmetic aesthetic."
  },
  {
    id: "kawaii3d",
    nameAr: "كاواي ياباني لطيف",
    nameEn: "#kawaii3d",
    imageUrl: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Cute Japanese Kawaii 3D model, pastel pink and sky blue colors, smiling faces, happy anime toy design."
  },
  {
    id: "isometricdesign",
    nameAr: "تصميم آيزومتريك ثلاثي الأبعاد",
    nameEn: "#isometricdesign",
    imageUrl: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=300&q=80",
    category: "3d",
    systemPromptAddon: "Isometric 3D rendering, miniature room layout, block building graphics, cute toy furniture."
  },

  // ── ILLUSTRATION CATEGORY ──
  {
    id: "anime",
    nameAr: "أنمي كلاسيكي",
    nameEn: "#classic-anime",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Classic 90s anime style, hand-drawn character design, retro color palette, cell shading."
  },
  {
    id: "origami",
    nameAr: "فن الأوريغامي الورقي",
    nameEn: "#origami",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Origami paper art, folded clean paper textures, geometric folds, shadows, creative minimalist composition."
  },
  {
    id: "watercolor",
    nameAr: "رسم ألوان مائية",
    nameEn: "#watercolor",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Soft watercolor painting, visible paint bleeding, textured paper background, elegant brush strokes."
  },
  {
    id: "oilpainting",
    nameAr: "لوحة زيتية كلاسيكية",
    nameEn: "#oilpainting",
    imageUrl: "https://images.unsplash.com/photo-1579783928621-7a13d66a6211?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Classic fine art oil painting style, visible rich impasto brush strokes, warm classical lighting, canvas texture."
  },
  {
    id: "sketch",
    nameAr: "خط قلم رصاص ورسم ورق",
    nameEn: "#sketch",
    imageUrl: "https://images.unsplash.com/photo-1576016770956-debb63d90029?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Hand drawn pencil sketch, detailed crosshatching, graphite paper texture, monochrome pencil art."
  },
  {
    id: "waxcrayon",
    nameAr: "رسم شمع ألوان",
    nameEn: "#waxcrayon",
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Crayon artwork, thick hand-drawn wax textures, childish nostalgic drawing feel, colorful crayon strokes."
  },
  {
    id: "dotted",
    nameAr: "تنقيط فني هافتون",
    nameEn: "#dotted",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Dotted pop art shading, vintage halftone pattern dots, stylized retro printing look."
  },
  {
    id: "risograph",
    nameAr: "طباعة ريزوغراف دافئة",
    nameEn: "#risograph",
    imageUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Risograph print style, grainy duotone textures, overlapping colors, retro graphic print illustration."
  },
  {
    id: "traditional-japan",
    nameAr: "فن ياباني تقليدي",
    nameEn: "#traditional-japan",
    imageUrl: "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Traditional Japanese Ukiyo-e woodblock print aesthetic, vintage paper aging, elegant waves and lines."
  },
  {
    id: "cartoonfun",
    nameAr: "رسوم كرتون مرحة",
    nameEn: "#cartoonfun",
    imageUrl: "https://images.unsplash.com/photo-1560942485-b2a11cc13456?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Fun cute cartoon character drawing, bold black outlines, simple flat color fill, modern web illustration."
  },
  {
    id: "retrocomic",
    nameAr: "قصص مصورة عتيقة",
    nameEn: "#retrocomic",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Vintage 1960s comic book aesthetic, retro speech bubbles background layout, pop-art style ink dots."
  },
  {
    id: "linework",
    nameAr: "رسم خطوط نظيف",
    nameEn: "#linework",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Clean black line art on off-white background, minimalist ink pen drawings, aesthetic contours."
  },
  {
    id: "grainy-flat",
    nameAr: "مسطح ذو نسيج رملي",
    nameEn: "#grainy-flat",
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Flat illustration style with grainy paper texture, natural warm ambient lighting, beautiful simple vectors."
  },
  {
    id: "pastelbeauty",
    nameAr: "جمالية الباستيل الناعمة",
    nameEn: "#pastelbeauty",
    imageUrl: "https://images.unsplash.com/photo-1579783928586-282b09efb48e?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Soft pastel aesthetic art, cream and pink hues, beautiful stylized drawings, dream-like calmness."
  },
  {
    id: "coloredpencil",
    nameAr: "ألوان خشبية رسم",
    nameEn: "#coloredpencil",
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Detailed colored pencil texture drawing, fine crosshatches, vibrant soft coloring, handmade sketchpad."
  },
  {
    id: "pointillism",
    nameAr: "رسم تنقيطي انطباعي",
    nameEn: "#pointillism",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80",
    category: "illustration",
    systemPromptAddon: "Pointillism impressionist art style, composed entirely of tiny distinct paint dots, rich textured coloring."
  },
  {
    id: "classyvaporwave",
    nameAr: "فيبورويف كلاسيكي",
    nameEn: "#classyvaporwave",
    imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=300&q=80",
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
    nameAr: "وعاء موكا برتقالي",
    nameEn: "Orange Moka Pot",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Classic orange Moka pot coffee maker on clean table background."
  },
  {
    id: "silvercream",
    tag: "@silvercream",
    nameAr: "كريم تجميل فضي",
    nameEn: "Silver Cream Tube",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Sleek silver cosmetic cream tube held against minimal pastel background."
  },
  {
    id: "nebulahandbag",
    tag: "@nebulahandbag",
    nameAr: "حقيبة يد فاخرة",
    nameEn: "Luxury Handbag",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Deep purple luxury leather handbag with gold clasp."
  },
  {
    id: "redlipstick",
    tag: "@redlipstick",
    nameAr: "أحمر شفاه ياقوتي",
    nameEn: "Red Lipstick",
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Classic gold bullet red lipstick tube open on pink surface."
  },
  {
    id: "bluetoaster",
    tag: "@bluetoaster",
    nameAr: "محمصة خبز زرقاء",
    nameEn: "Retro Blue Toaster",
    imageUrl: "https://images.unsplash.com/photo-1583634648128-3a58222ba096?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Retro pastel blue kitchen toaster with toasted bread slice."
  },
  {
    id: "perfum",
    tag: "@perfum",
    nameAr: "زجاجة عطور فاخرة",
    nameEn: "Luxury Perfume Bottle",
    imageUrl: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Elegant amber glass perfume bottle with crystal cap."
  },
  {
    id: "serum",
    tag: "@serum",
    nameAr: "سيروم عناية بالبشرة",
    nameEn: "Skincare Serum Bottle",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Glass dropper serum bottle with iridescent glow on warm marble."
  },
  {
    id: "redheels",
    tag: "@redheels",
    nameAr: "حذاء كعب أحمر",
    nameEn: "Red Stiletto Heels",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Glossy red high heel stiletto shoes on dark reflective glass."
  },
  {
    id: "lamp",
    tag: "@lamp",
    nameAr: "مصباح طاولة عصري",
    nameEn: "Modern Table Lamp",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Minimalist spherical glowing orb table lamp with brass stand."
  },
  {
    id: "smartwatch",
    tag: "@smartwatch",
    nameAr: "ساعة ذكية سوداء",
    nameEn: "Black Smartwatch",
    imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Modern black smartwatch with dark OLED screen on neutral pedestal."
  },
  {
    id: "totebag",
    tag: "@totebag",
    nameAr: "حقيبة قماشية قتانية",
    nameEn: "Cotton Tote Bag",
    imageUrl: "https://images.unsplash.com/photo-1597484661643-2f5f88447493?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Minimalist unbleached natural cotton canvas tote bag hanging."
  },
  {
    id: "leatherjacket",
    tag: "@leatherjacket",
    nameAr: "سترة جلدية سوداء",
    nameEn: "Black Leather Jacket",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Classic black biker leather jacket with silver zippers."
  },
  {
    id: "metalmug",
    tag: "@metalmug",
    nameAr: "كوب معدني",
    nameEn: "Enamel Metal Mug",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Classic white enamel metal coffee mug on wooden table."
  }
];


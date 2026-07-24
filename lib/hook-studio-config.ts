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
    imageUrl: "/images/presets/minimaltypo.jpg",
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
    imageUrl: "/images/presets/vinyltoy.jpg",
    category: "3d",
    systemPromptAddon: "Vinyl toy figure aesthetic, glossy smooth plastic texture, Funko Pop model layout, toy packaging style."
  },
  {
    id: "motionstitched",
    nameAr: "قماش صوف مطرز",
    nameEn: "#motionstitched",
    imageUrl: "/images/presets/motionstitched.jpg",
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
    imageUrl: "/images/presets/oilpainting.jpg",
    category: "illustration",
    systemPromptAddon: "Classic fine art oil painting style, visible rich impasto brush strokes, warm classical lighting, canvas texture."
  },
  {
    id: "sketch",
    nameAr: "خط قلم رصاص ورسم ورق",
    nameEn: "#sketch",
    imageUrl: "/images/presets/sketch.jpg",
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
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Sunny tropical sandy beach with turquoise ocean water and soft waves."
  },
  {
    id: "bridge",
    tag: "@bridge",
    nameAr: "جسر بحري حديث",
    nameEn: "Coastal Highway Bridge",
    imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Long coastal sea bridge highway stretching over clear ocean waters."
  },
  {
    id: "cafe",
    tag: "@cafe",
    nameAr: "مقهى عصري راقي",
    nameEn: "Modern Cafe Interior",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Warm minimalist modern cafe interior with wooden tables and warm ambient lighting."
  },
  {
    id: "castle",
    tag: "@castle",
    nameAr: "قلعة تاريخية قديمة",
    nameEn: "Medieval Stone Castle",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Grand medieval stone castle towers under soft daylight."
  },
  {
    id: "countryside",
    tag: "@countryside",
    nameAr: "ريف وأزهار خضراء",
    nameEn: "Green Countryside",
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Lush green countryside hills with blooming wildflowers and blue sky."
  },
  {
    id: "desert",
    tag: "@desert",
    nameAr: "صحراء وكثبان رملية",
    nameEn: "Desert Dunes",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Vast desert sand dunes under bright sunny sky with warm gold tones."
  },
  {
    id: "forest",
    tag: "@forest",
    nameAr: "غابة ضبابية كثيفة",
    nameEn: "Misty Forest",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Deep green forest with tall trees, moss floor, and misty sunlight rays."
  },
  {
    id: "garden",
    tag: "@garden",
    nameAr: "حديقة يابانية هادئة",
    nameEn: "Zen Garden",
    imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Peaceful Japanese zen garden with stone pathway and curated greenery."
  },
  {
    id: "interior",
    tag: "@interior",
    nameAr: "تصميم داخلي مودرن",
    nameEn: "Modern Living Interior",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Spacious modern luxury interior with beige couch and large sunlit windows."
  },
  {
    id: "jungle",
    tag: "@jungle",
    nameAr: "غابة استوائية كثيفة",
    nameEn: "Tropical Jungle",
    imageUrl: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Vibrant tropical rainforest jungle with dense ferns and sun shafts."
  },
  {
    id: "laboratory",
    tag: "@laboratory",
    nameAr: "مختبر علمي متطور",
    nameEn: "High-Tech Laboratory",
    imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Ultra-clean high-tech medical research laboratory with white equipment."
  },
  {
    id: "library",
    tag: "@library",
    nameAr: "مكتبة ضخمة فاخرة",
    nameEn: "Grand Library",
    imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Grand modern architectural library with tall bookshelves and wooden stairs."
  },
  {
    id: "mars",
    tag: "@mars",
    nameAr: "كوكب المريخ وسماء النجوم",
    nameEn: "Mars Surface",
    imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Red rocky Martian planet landscape under brilliant starry night sky."
  },
  {
    id: "mountain",
    tag: "@mountain",
    nameAr: "جبال شامخة صخرية",
    nameEn: "Rocky Mountain Range",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Majestic high mountain range peaks under clear blue sky."
  },
  {
    id: "rooftop",
    tag: "@rooftop",
    nameAr: "سطح برج في المدينة",
    nameEn: "City Rooftop",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Urban city penthouse rooftop terrace overlooking city skyscrapers."
  },
  {
    id: "ruins",
    tag: "@ruins",
    nameAr: "أنقاض وحطام قديم",
    nameEn: "Ancient Ruins",
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Overgrown ancient stone ruins with sunlight streaming through broken arches."
  },
  {
    id: "snow-field",
    tag: "@snow-field",
    nameAr: "حقل ثلجي جليلي",
    nameEn: "Snowy Mountain Field",
    imageUrl: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Crisp white snow-covered landscape field with blue ice mountains."
  },
  {
    id: "stadium",
    tag: "@stadium",
    nameAr: "ملعب رياضي ضخم",
    nameEn: "Sports Stadium Arena",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Grand modern sports stadium arena with green pitch and empty seats."
  },
  {
    id: "temple",
    tag: "@temple",
    nameAr: "معبد قبة أثري",
    nameEn: "Ancient Temple Interior",
    imageUrl: "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Sacred ancient stone temple interior with domed roof and sunlit arches."
  },
  {
    id: "underwater",
    tag: "@underwater",
    nameAr: "أعماق المحيط والمرجان",
    nameEn: "Deep Underwater Ocean",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=300&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Multi-layered depth composition with crisp foreground and blurred background element framing."
  },
  {
    id: "drone",
    tag: "#drone",
    nameAr: "تصوير طائرة درون",
    nameEn: "Drone Shot",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "High altitude smooth flying drone shot over expansive scenery."
  },
  {
    id: "camera360",
    tag: "#360",
    nameAr: "لقطة كروية 360 درجة",
    nameEn: "360 Panoramic",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    promptDescription: "360-degree tiny planet curvature panoramic wide lens perspective."
  },
  {
    id: "portrait",
    tag: "#portrait",
    nameAr: "لقطة بورتري قريبة",
    nameEn: "Portrait Shot",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Intimate head-and-shoulders portrait shot with soft bokeh background."
  },
  {
    id: "closeup",
    tag: "#close-up",
    nameAr: "لقطة قريبة جداً",
    nameEn: "Close-Up",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Tight extreme close-up shot capturing rich facial textures and eye details."
  },
  {
    id: "tiltshift",
    tag: "#tilt-shift",
    nameAr: "تأثير المصغرات (تيلت شفت)",
    nameEn: "Tilt-Shift",
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f30ac4ce78?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Tilt-shift selective blur lens effect creating a miniature model appearance."
  },
  {
    id: "cinematic",
    tag: "#cinematic",
    nameAr: "لقطة سينمائية فاخرة",
    nameEn: "Cinematic Framing",
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Widescreen anamorphic cinematic framing with moody atmospheric lighting."
  },
  {
    id: "highangle",
    tag: "#high-angle",
    nameAr: "زاوية مرتفعة من الأعلى",
    nameEn: "High-Angle",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "High camera angle pointing down from above the subject."
  },
  {
    id: "lowangle",
    tag: "#low-angle",
    nameAr: "زاوية منخفضة من الأسفل",
    nameEn: "Low-Angle",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Low camera angle looking upward to emphasize grand scale and presence."
  },
  {
    id: "panoramic",
    tag: "#panoramic",
    nameAr: "لقطة بانورامية واسعة",
    nameEn: "Panoramic View",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Ultra-wide panoramic horizon shot capturing expansive scenery."
  },
  {
    id: "symmetry",
    tag: "#symmetry",
    nameAr: "تكوين متناظر متطابق",
    nameEn: "Symmetry",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Perfectly centered architectural symmetry framing with balanced lines."
  },
  {
    id: "fisheye",
    tag: "#fish-eye",
    nameAr: "عدسة عين السمكة",
    nameEn: "Fish-Eye Lens",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Ultra wide 180-degree fisheye lens distortion with curved edge perspective."
  },
  {
    id: "firstperson",
    tag: "#first-person",
    nameAr: "منظور الشخص الأول POV",
    nameEn: "First-Person POV",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
    promptDescription: "First-person point-of-view perspective shot as seen directly through eyes."
  },
  {
    id: "midshot",
    tag: "#mid-shot",
    nameAr: "لقطة متوسطة (من الخصر)",
    nameEn: "Mid-Shot",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Balanced medium waist-up shot framing body gestures and background clearly."
  },
  {
    id: "fullbody",
    tag: "#full-body",
    nameAr: "لقطة كاملة للجسم",
    nameEn: "Full-Body Shot",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Full length body shot showing complete outfit and standing environment stance."
  },
  {
    id: "wideshot",
    tag: "#wide-shot",
    nameAr: "لقطة واسعة شاملة",
    nameEn: "Wide Shot",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Wide environmental establishing shot capturing subject in vast landscape."
  },
  {
    id: "tiltshot",
    tag: "#tilt-shot",
    nameAr: "لقطة مائلة دتش أنجل",
    nameEn: "Tilt Shot",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Dutch angle tilted camera horizon creating dynamic action tension."
  },
  {
    id: "aerial",
    tag: "#aerial",
    nameAr: "لقطة جوية رأسية",
    nameEn: "Aerial Top-Down",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Direct overhead top-down bird's eye view aerial perspective."
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
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    category: "color",
    promptDescription: "Earthy natural color grade, warm ochre and terracotta muted tones, organic feel.",
    systemPromptAddon: "Earthy natural color grade, warm ochre and terracotta muted tones, organic feel."
  },
  {
    id: "softhue",
    tag: "#softhue",
    nameAr: "درجات باستيل ناعمة",
    nameEn: "Soft Hue Pastels",
    imageUrl: "https://images.unsplash.com/photo-1579783928586-282b09efb48e?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Soft pastel hue color palette, gentle highlights, low contrast cream and pink tones."
  },
  {
    id: "bw",
    tag: "#b&w",
    nameAr: "أبيض وأسود أحادي",
    nameEn: "Black & White",
    imageUrl: "https://images.unsplash.com/photo-1576016770956-debb63d90029?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "High contrast black and white monochrome photography style, deep shadows."
  },
  {
    id: "sepia",
    tag: "#sepia",
    nameAr: "سيبيا دافئة كلاسيكية",
    nameEn: "Classic Sepia",
    imageUrl: "https://images.unsplash.com/photo-1579783928621-7a13d66a6211?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Vintage sepia brown monochrome tone, aged photo print look."
  },
  {
    id: "mutedgreen",
    tag: "#muted-green",
    nameAr: "أخضر هادئ مطفأ",
    nameEn: "Muted Green",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Muted sage and forest green color grading, cinematic film stock aesthetic."
  },
  {
    id: "deepteal",
    tag: "#deep-teal",
    nameAr: "تيل وبرتقالي عميق",
    nameEn: "Deep Teal & Orange",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Deep teal and orange color grade, rich cinematic Hollywood shadow contrast."
  },
  {
    id: "duotone",
    tag: "#duotone",
    nameAr: "إضاءة ثنائية اللون",
    nameEn: "Neon Duotone",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Vibrant duotone lighting, high contrast dual neon gel color split."
  },
  {
    id: "vibrant",
    tag: "#vibrant",
    nameAr: "ألوان مشبعة حيوية",
    nameEn: "Vibrant Colors",
    imageUrl: "https://images.unsplash.com/photo-1560942485-b2a11cc13456?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Rich highly saturated color pop, punchy vibrant tones, bright vivid spectrum."
  },
  {
    id: "terracotatateal",
    tag: "#terracote-&-teal",
    nameAr: "طين فخاري مع تيل",
    nameEn: "Terracotta & Teal",
    imageUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Warm terracotta clay and cool teal contrast palette, aesthetic magazine color grade."
  },
  {
    id: "icyblue",
    tag: "#icy-blue",
    nameAr: "أزرق ثلجي بارد",
    nameEn: "Icy Blue Tones",
    imageUrl: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Cool icy blue and frost white color grading, winter atmospheric chill."
  },
  {
    id: "redscale",
    tag: "#redscale",
    nameAr: "تووهج أحمر ريدسكيل",
    nameEn: "Redscale Glow",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
    category: "color",
    systemPromptAddon: "Redscale film glow, warm fiery red and amber shadows with high intensity."
  },

  // ── LIGHTING ──
  {
    id: "goldglow",
    tag: "#gold-glow",
    nameAr: "تووهج ذهبي دافئ",
    nameEn: "Gold Glow",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Warm golden light ambient glow, soft golden hour sun reflections."
  },
  {
    id: "highflash",
    tag: "#high-flash",
    nameAr: "فلاش قوي ستوديو",
    nameEn: "High-Flash Studio",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Harsh direct camera flash photography, sharp shadows, high fashion studio aesthetic."
  },
  {
    id: "chiaroscuro",
    tag: "#chiaroscuro",
    nameAr: "تباين ضوء وظل شديد",
    nameEn: "Chiaroscuro",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Chiaroscuro lighting technique, dramatic dark background with single strong spotlight key."
  },
  {
    id: "backlight",
    tag: "#back-light",
    nameAr: "إضاءة خلفية وظلال",
    nameEn: "Back-Lit Silhouette",
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Strong backlighting, rim light highlights around subject silhouette, glowing background atmosphere."
  },
  {
    id: "studiolight",
    tag: "#studio",
    nameAr: "إضاءة استوديو احترافية",
    nameEn: "Studio Key Light",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Professional 3-point studio lighting, soft fill light, clean commercial look."
  },
  {
    id: "iridescent",
    tag: "#iridescent",
    nameAr: "انعكاسات زجاجية متوهجة",
    nameEn: "Iridescent Reflection",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Iridescent metallic sheen, prism rainbow light refractions, glossy surface highlights."
  },
  {
    id: "goldenhour",
    tag: "#golden-hour",
    nameAr: "الساعة الذهبية لغروب الشمس",
    nameEn: "Golden Hour Glow",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Sunset golden hour light rays, warm sun flare, long soft shadows."
  },
  {
    id: "hardlight",
    tag: "#hardlight",
    nameAr: "ضوء شمس حاد عالي التباين",
    nameEn: "Hard Sunlight",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Direct midday hard sunlight, sharp crisp shadows, high contrast highlights."
  },
  {
    id: "volumetric",
    tag: "#volumetric",
    nameAr: "أشعة ضوء ضبابية عمودية",
    nameEn: "Volumetric Light Beams",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    category: "lighting",
    systemPromptAddon: "Volumetric God rays cutting through atmospheric haze, dramatic beam highlights."
  },

  // ── MOOD ──
  {
    id: "coldmood",
    tag: "#cold",
    nameAr: "أجواء غامضة باردة",
    nameEn: "Cold Hazy Mood",
    imageUrl: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=300&q=80",
    category: "mood",
    systemPromptAddon: "Cold atmospheric mood, mysterious fog and solitary quiet ambience."
  },
  {
    id: "zenmood",
    tag: "#zen",
    nameAr: "سكينة وهدوء تام",
    nameEn: "Zen Tranquility",
    imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=300&q=80",
    category: "mood",
    systemPromptAddon: "Zen peaceful atmosphere, balanced minimalist composition, calm serene mood."
  },
  {
    id: "tension",
    tag: "#tension",
    nameAr: "تشويق وإثارة عالية",
    nameEn: "High Tension Suspense",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
    category: "mood",
    systemPromptAddon: "Dramatic cinematic tension, high suspense lighting, intense confrontation mood."
  },
  {
    id: "playful",
    tag: "#playful",
    nameAr: "أجواء مرحة ومبهجة",
    nameEn: "Playful Joy",
    imageUrl: "https://images.unsplash.com/photo-1560942485-b2a11cc13456?auto=format&fit=crop&w=300&q=80",
    category: "mood",
    systemPromptAddon: "Playful upbeat mood, colorful happy energy, fun social interaction."
  },
  {
    id: "nostalgic",
    tag: "#nostalgic",
    nameAr: "ذكريات ريترو نوسـتالجيا",
    nameEn: "Nostalgic Vintage",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    category: "mood",
    systemPromptAddon: "Nostalgic retro memory aesthetic, warm film grain, emotional vintage atmosphere."
  },

  // ── ACTION ──
  {
    id: "longexposure",
    tag: "#long-exposure",
    nameAr: "تعريض طويل مع ضبابية الحركة",
    nameEn: "Long Exposure Blur",
    imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=300&q=80",
    category: "action",
    systemPromptAddon: "Long exposure photography effect, silky motion blur trails, dynamic speed atmosphere."
  },
  {
    id: "walking",
    tag: "#walking",
    nameAr: "حركة مشي وتتبع",
    nameEn: "Walking Motion",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    category: "action",
    systemPromptAddon: "Dynamic walking movement tracking, smooth camera motion following subject."
  },
  {
    id: "jumping",
    tag: "#jumping",
    nameAr: "قفزة تجميد في الهواء",
    nameEn: "Mid-Air Jump Freeze",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80",
    category: "action",
    systemPromptAddon: "Mid-air freeze action shot, fast shutter speed capturing energetic jump height."
  },
  {
    id: "glitching",
    tag: "#glitching",
    nameAr: "تشويه جليتش رقمي",
    nameEn: "Digital Glitch",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
    category: "action",
    systemPromptAddon: "Digital glitch distortion effect, chromatic aberration artifacts, futuristic cyber styling."
  },
  {
    id: "spinning",
    tag: "#spinning",
    nameAr: "دوران ومغزل عالي السرعة",
    nameEn: "High-Speed Spin",
    imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=300&q=80",
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
    nameAr: "سيدة أعمال سعودية",
    nameEn: "Saudi Businesswoman",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Professional confident Saudi businesswoman wearing elegant modern attire."
  },
  {
    id: "influencer",
    tag: "@influencer",
    nameAr: "صانع محتوى ريادي",
    nameEn: "Tech Influencer",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Charismatic young Middle Eastern tech content creator speaking directly to camera."
  },
  {
    id: "barista",
    tag: "@barista",
    nameAr: "بارستا محترف",
    nameEn: "Master Barista",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Passionate artisan barista pouring specialty drip coffee with intense focus."
  },
  {
    id: "athlete",
    tag: "@athlete",
    nameAr: "رياضي لياقة بدنية",
    nameEn: "Fitness Athlete",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Athletic fit runner preparing for training session in high performance sportswear."
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
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Detailed monochrome graphite pencil sketch drawing on textured paper."
  },
  {
    id: "storyboard-line",
    tag: "#ink-linework",
    nameAr: "تخطيط حبر ستوريبورد",
    nameEn: "Ink Storyboard Lines",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Clean graphic black ink linework vector style storyboard frame."
  },
  {
    id: "architectural-blueprint",
    tag: "#blueprint",
    nameAr: "رسم معماري مخطط blueprint",
    nameEn: "Architectural Blueprint",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=300&q=80",
    promptDescription: "Cyan blue background architectural draft blueprint line drawing."
  }
];


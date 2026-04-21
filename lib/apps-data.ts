export type AppBadge = "NEW" | "TOP" | "PRO" | "HOT" | "TRENDING" | "FREE" | null;

export interface AppTool {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: AppBadge;
  gradient: string;
  previewImage?: string;
  previewVideo?: string;
}

export interface AppCategory {
  id: string;
  title: string;
  description: string;
  href: string;
  tools: AppTool[];
}

export const TOOL_ROUTE_MAP: Record<string, string> = {
  // Keep only stable dedicated routes.
  // Other tools will use their own /apps/tool/<id> href from category definitions.
  "variations-studio": "/variations",
  angles: "/variations#angles",
  shots: "/shots",
  "beauty2-studio": "/beauty2.html",
  "storyboard-studio": "/apps/tool/storyboard-studio",
  "multi-angle-studio": "/apps/tool/multi-angle-studio",
};

const APP_CATEGORIES_RAW: AppCategory[] = [
  {
    id: "professional",
    title: "Professional",
    description: "Generate shots, angles, and seamless transitions",
    href: "/apps/professional",
    tools: [
      { id: "variations-studio", title: "Next Scene Studio", description: "AI video scene generator with filmstrip timeline & camera moves", href: "/variations", badge: "NEW", gradient: "from-violet-600/30 to-indigo-900/30" },
      { id: "storyboard-studio", title: "Storyboard Studio", description: "Multi-panel storyboards with perspective control from one image", href: "/apps/tool/storyboard-studio", badge: "NEW", gradient: "from-cyan-600/30 to-violet-900/30" },
      { id: "multi-angle-studio", title: "Multi-Angle Studio", description: "Generate any angle view in 3D space with precision controls", href: "/apps/tool/multi-angle-studio", badge: "PRO", gradient: "from-violet-600/30 to-cyan-900/30" },
      { id: "expand-image", title: "Expand Image", description: "Expand any image beyond its edges", href: "/apps/tool/expand-image", badge: null, gradient: "from-violet-600/30 to-indigo-900/30" },
      { id: "angles", title: "Angles 2.0", description: "Generate any angle view in seconds", href: "/apps/tool/angles", badge: "PRO", gradient: "from-emerald-600/30 to-teal-900/30" },
      { id: "shots", title: "Shots", description: "9 unique shots from one image", href: "/shots", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "transitions", title: "Transitions", description: "Seamless transitions between any shots", href: "/apps/tool/transitions", badge: "TRENDING", gradient: "from-rose-600/30 to-pink-900/30" },
      { id: "zooms", title: "Zooms", description: "Dynamic zoom effects for any content", href: "/apps/tool/zooms", badge: null, gradient: "from-sky-600/30 to-blue-900/30" },
      { id: "behind-scenes", title: "Behind the Scenes", description: "Generate BTS-style content", href: "/apps/tool/behind-scenes", badge: null, gradient: "from-purple-600/30 to-violet-900/30" },
      { id: "3d-rotation", title: "3D Rotation", description: "Rotate any subject in 3D space", href: "/apps/tool/3d-rotation", badge: "NEW", gradient: "from-cyan-600/30 to-teal-900/30" },
      { id: "bullet-time", title: "Bullet Time Scene", description: "Matrix-style freeze rotation", href: "/apps/tool/bullet-time", badge: "TOP", gradient: "from-indigo-600/30 to-blue-900/30" },
      { id: "packshot", title: "Packshot", description: "Product packshot generation", href: "/apps/tool/packshot", badge: "PRO", gradient: "from-amber-600/30 to-yellow-900/30" },
      { id: "macro-scene", title: "Macro Scene", description: "Macro photography style shots", href: "/apps/tool/macro-scene", badge: null, gradient: "from-green-600/30 to-emerald-900/30" },
      { id: "what-next", title: "What's Next?", description: "8 story continuation ideas from any scene", href: "/apps/tool/what-next", badge: "NEW", gradient: "from-pink-600/30 to-rose-900/30" },
    ],
  },
  {
    id: "enhance-style",
    title: "Enhance & Style",
    description: "Perfect your photos with AI enhancement and styling",
    href: "/apps/enhance-style",
    tools: [
      { id: "skin-enhancer", title: "Skin Enhancer", description: "Natural, realistic skin textures", href: "/apps/tool/skin-enhancer", badge: "PRO", gradient: "from-rose-600/30 to-pink-900/30" },
      { id: "beauty2-studio", title: "Beauty2 Studio", description: "Full beauty, makeup, hairstyle, and outfit transformations", href: "/beauty2.html", badge: "NEW", gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "relight", title: "Relight", description: "AI-powered lighting adjustment for any photo", href: "/apps/tool/relight", badge: "PRO", gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "makeup", title: "AI Makeup", description: "Professional AI-powered makeup in one click", href: "/apps/tool/makeup", badge: "TOP", gradient: "from-pink-600/30 to-rose-900/30" },
      { id: "style-snap", title: "Character Generation", description: "AI-powered character variations from any photo", href: "/apps/tool/style-snap", badge: "NEW", gradient: "from-cyan-600/30 to-indigo-900/30" },
      { id: "color-grading", title: "Color Grading", description: "Professional color correction", href: "/apps/tool/color-grading", badge: null, gradient: "from-blue-600/30 to-indigo-900/30" },
      { id: "bg-remover", title: "Background Remover", description: "Remove backgrounds instantly", href: "/apps/tool/bg-remover", badge: "FREE", gradient: "from-emerald-600/30 to-green-900/30" },
      { id: "image-upscale", title: "Image Upscale", description: "Enhance to 4K resolution", href: "/apps/tool/image-upscale", badge: "TOP", gradient: "from-sky-600/30 to-blue-900/30" },
      { id: "sketch-to-real", title: "Sketch to Real", description: "Convert sketches to realistic images", href: "/apps/tool/sketch-to-real", badge: "NEW", gradient: "from-indigo-600/30 to-violet-900/30" },
      { id: "fashion-factory", title: "Fashion Factory", description: "AI fashion & outfit design studio", href: "/apps/tool/fashion-factory", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
    ],
  },
  {
    id: "face-identity",
    title: "Face & Identity",
    description: "Swap faces, characters, and transform your identity",
    href: "/apps/face-identity",
    tools: [
      { id: "face-swap", title: "Face Swap", description: "Best instant AI face swap for photos", href: "/apps/tool/face-swap", badge: "TOP", gradient: "from-cyan-600/30 to-blue-900/30" },
      { id: "headshot-gen", title: "Headshot Generator", description: "Studio-quality headshots in seconds", href: "/apps/tool/headshot-gen", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "character-swap", title: "Character Swap 2.0", description: "Swap characters with a single click", href: "/apps/tool/character-swap", badge: null, gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "recast", title: "Recast", description: "Industry-leading character swap for video", href: "/apps/tool/recast", badge: "PRO", gradient: "from-emerald-600/30 to-teal-900/30" },
      { id: "video-face-swap", title: "Video Face Swap", description: "Best face swap technology for video", href: "/apps/tool/video-face-swap", badge: null, gradient: "from-sky-600/30 to-blue-900/30" },
      { id: "commercial-faces", title: "Commercial Faces", description: "Commercial-ready face generation", href: "/apps/tool/commercial-faces", badge: "PRO", gradient: "from-pink-600/30 to-rose-900/30" },
      { id: "ai-influencer", title: "AI Influencer", description: "Create virtual AI influencer personas", href: "/apps/tool/ai-influencer", badge: "HOT", gradient: "from-rose-600/30 to-pink-900/30" },
      { id: "age-transform", title: "Age Transform", description: "Transform character age realistically", href: "/apps/tool/age-transform", badge: null, gradient: "from-indigo-600/30 to-blue-900/30" },
      { id: "expression-edit", title: "Expression Editor", description: "Modify facial expressions", href: "/apps/tool/expression-edit", badge: null, gradient: "from-teal-600/30 to-cyan-900/30" },
      { id: "cosplay", title: "Cosplay Generator", description: "Transform into any cosplay character", href: "/apps/tool/cosplay", badge: "TRENDING", gradient: "from-purple-600/30 to-violet-900/30" },
    ],
  },
  {
    id: "video-editing",
    title: "Video Editing",
    description: "Cut, sync, and edit your videos with AI",
    href: "/apps/video-editing",
    tools: [
      { id: "clipcut", title: "ClipCut", description: "Turn one selfie into an instant outfit reel", href: "/apps/tool/clipcut", badge: "TOP", gradient: "from-cyan-600/30 to-teal-900/30" },
      { id: "urban-cuts", title: "Urban Cuts", description: "Beat-synced AI outfit videos", href: "/apps/tool/urban-cuts", badge: null, gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "video-bg-remover", title: "Video Background Remover", description: "Strip video backgrounds with AI", href: "/apps/tool/video-bg-remover", badge: null, gradient: "from-emerald-600/30 to-green-900/30" },
      { id: "breakdown", title: "Breakdown", description: "Split image into individual components", href: "/apps/tool/breakdown", badge: null, gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "lipsync", title: "Lipsync Studio", description: "Perfect AI lip-sync generation", href: "/apps/tool/lipsync", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
      { id: "video-upscale", title: "Video Upscale", description: "Enhance video resolution to 4K", href: "/apps/tool/video-upscale", badge: "PRO", gradient: "from-sky-600/30 to-blue-900/30" },
      { id: "draw-to-video", title: "Draw to Video", description: "Sketch scenes, generate video", href: "/apps/tool/draw-to-video", badge: "NEW", gradient: "from-indigo-600/30 to-violet-900/30" },
      { id: "mixed-media", title: "Mixed Media", description: "Transform videos with artistic presets", href: "/apps/tool/mixed-media", badge: "TOP", gradient: "from-pink-600/30 to-fuchsia-900/30" },
    ],
  },
  {
    id: "ads-products",
    title: "Ads & Products",
    description: "Create professional video ads and product showcases",
    href: "/apps/ads-products",
    tools: [
      { id: "click-to-ad", title: "Click to Ad", description: "Turn product links into video ads", href: "/apps/tool/click-to-ad", badge: "PRO", gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "billboard-ad", title: "Billboard Ad", description: "Your photo on a massive billboard", href: "/apps/tool/billboard-ad", badge: null, gradient: "from-sky-600/30 to-blue-900/30" },
      { id: "bullet-time-white", title: "Bullet Time White", description: "Product spin on clean white bg", href: "/apps/tool/bullet-time-white", badge: null, gradient: "from-slate-500/30 to-gray-900/30" },
      { id: "truck-ad", title: "Truck Ad", description: "Brand on a moving truck billboard", href: "/apps/tool/truck-ad", badge: null, gradient: "from-cyan-600/30 to-teal-900/30" },
      { id: "giant-product", title: "Giant Product", description: "Make your product larger than life", href: "/apps/tool/giant-product", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "fridge-ad", title: "Fridge Ad", description: "Product displayed on a smart fridge", href: "/apps/tool/fridge-ad", badge: null, gradient: "from-blue-600/30 to-indigo-900/30" },
      { id: "volcano-ad", title: "Volcano Ad", description: "Dramatic volcanic product reveal", href: "/apps/tool/volcano-ad", badge: "HOT", gradient: "from-rose-600/30 to-red-900/30" },
      { id: "graffiti-ad", title: "Graffiti Ad", description: "Street art style advertisement", href: "/apps/tool/graffiti-ad", badge: null, gradient: "from-emerald-600/30 to-green-900/30" },
      { id: "kick-ad", title: "Kick Ad", description: "Dynamic action product showcase", href: "/apps/tool/kick-ad", badge: null, gradient: "from-orange-600/30 to-amber-900/30" },
      { id: "macroshot-product", title: "Macroshot Product", description: "Extreme close-up product shots", href: "/apps/tool/macroshot-product", badge: "NEW", gradient: "from-teal-600/30 to-cyan-900/30" },
    ],
  },
  {
    id: "games-fun",
    title: "Games & Fun",
    description: "Game avatars, characters, and fun transformations",
    href: "/apps/games-fun",
    tools: [
      { id: "game-dump", title: "Game Dump", description: "Transform into 12 iconic game styles", href: "/apps/tool/game-dump", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "nano-strike", title: "Nano Strike", description: "Turn into tactical shooters", href: "/apps/tool/nano-strike", badge: null, gradient: "from-slate-500/30 to-gray-900/30" },
      { id: "nano-theft", title: "Nano Theft", description: "Open-world game style photos", href: "/apps/tool/nano-theft", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { id: "simlife", title: "Simlife", description: "Stylized life simulation character", href: "/apps/tool/simlife", badge: null, gradient: "from-emerald-600/30 to-green-900/30" },
      { id: "plushies", title: "Plushies", description: "Adorable plushie-style animation", href: "/apps/tool/plushies", badge: "TRENDING", gradient: "from-pink-600/30 to-rose-900/30" },
      { id: "pixel-game", title: "Pixel Game", description: "Retro pixel art transformation", href: "/apps/tool/pixel-game", badge: null, gradient: "from-cyan-600/30 to-teal-900/30" },
      { id: "roller-coaster", title: "Roller Coaster", description: "Theme park ride experience", href: "/apps/tool/roller-coaster", badge: null, gradient: "from-red-600/30 to-rose-900/30" },
      { id: "brick-cube", title: "Brick Cube", description: "LEGO-style character builder", href: "/apps/tool/brick-cube", badge: "NEW", gradient: "from-yellow-600/30 to-amber-900/30" },
      { id: "victory-card", title: "Victory Card", description: "Gaming achievement card generator", href: "/apps/tool/victory-card", badge: null, gradient: "from-indigo-600/30 to-blue-900/30" },
      { id: "3d-figure", title: "3D Figure", description: "Collectible 3D figure of yourself", href: "/apps/tool/3d-figure", badge: "NEW", gradient: "from-sky-600/30 to-cyan-900/30" },
    ],
  },
  {
    id: "creative-effects",
    title: "Creative Effects",
    description: "Stunning visual effects and artistic transformations",
    href: "/apps/creative-effects",
    tools: [
      { id: "comic-book", title: "Comic Book", description: "Transform photos into comic panels", href: "/apps/tool/comic-book", badge: "TOP", gradient: "from-amber-600/30 to-yellow-900/30" },
      { id: "renaissance", title: "Renaissance", description: "Classical painting style portraits", href: "/apps/tool/renaissance", badge: null, gradient: "from-orange-600/30 to-amber-900/30" },
      { id: "latex", title: "Latex", description: "Glossy artistic texture overlay", href: "/apps/tool/latex", badge: null, gradient: "from-slate-500/30 to-gray-900/30" },
      { id: "on-fire", title: "On Fire", description: "Dramatic fire effects", href: "/apps/tool/on-fire", badge: "TRENDING", gradient: "from-red-600/30 to-orange-900/30" },
      { id: "melting-doodle", title: "Melting Doodle", description: "Surreal melting art effect", href: "/apps/tool/melting-doodle", badge: null, gradient: "from-purple-600/30 to-violet-900/30" },
      { id: "giallo-horror", title: "Giallo Horror", description: "Italian horror film aesthetic", href: "/apps/tool/giallo-horror", badge: null, gradient: "from-rose-600/30 to-red-900/30" },
      { id: "burning-sunset", title: "Burning Sunset", description: "Cinematic sunset silhouettes", href: "/apps/tool/burning-sunset", badge: null, gradient: "from-orange-600/30 to-red-900/30" },
      { id: "cloud-surf", title: "Cloud Surf", description: "Dreamy pink cloud surfing", href: "/apps/tool/cloud-surf", badge: "TRENDING", gradient: "from-pink-600/30 to-rose-900/30" },
      { id: "sand-worm", title: "Sand Worm", description: "Epic desert creature scene", href: "/apps/tool/sand-worm", badge: null, gradient: "from-amber-600/30 to-yellow-900/30" },
      { id: "storm-creature", title: "Storm Creature", description: "Dramatic storm monster effect", href: "/apps/tool/storm-creature", badge: null, gradient: "from-slate-600/30 to-blue-900/30" },
      { id: "magic-button", title: "Magic Button", description: "One-click magical transformation", href: "/apps/tool/magic-button", badge: "FREE", gradient: "from-violet-600/30 to-indigo-900/30" },
      { id: "chameleon", title: "Chameleon", description: "Adaptive style blending", href: "/apps/tool/chameleon", badge: "NEW", gradient: "from-emerald-600/30 to-teal-900/30" },
    ],
  },
  {
    id: "templates-trends",
    title: "Templates & Trends",
    description: "Viral content templates and trending AI effects",
    href: "/apps/templates-trends",
    tools: [
      { id: "meme-gen", title: "Meme Generator", description: "Create viral memes with AI", href: "/apps/tool/meme-gen", badge: "FREE", gradient: "from-emerald-600/30 to-green-900/30" },
      { id: "mukbang", title: "Mukbang", description: "Transform into a viral eating show", href: "/apps/tool/mukbang", badge: "TRENDING", gradient: "from-orange-600/30 to-amber-900/30" },
      { id: "skibidi", title: "Skibidi", description: "Skibidi toilet meme generator", href: "/apps/tool/skibidi", badge: "TRENDING", gradient: "from-slate-500/30 to-gray-900/30" },
      { id: "idol", title: "Idol", description: "K-pop idol moment generator", href: "/apps/tool/idol", badge: "HOT", gradient: "from-pink-600/30 to-rose-900/30" },
      { id: "rap-god", title: "Rap God", description: "Hip-hop style transformation", href: "/apps/tool/rap-god", badge: null, gradient: "from-amber-600/30 to-yellow-900/30" },
      { id: "mugshot", title: "Mugshot", description: "Dramatic mugshot style photos", href: "/apps/tool/mugshot", badge: null, gradient: "from-slate-600/30 to-gray-900/30" },
      { id: "signboard", title: "Signboard", description: "See yourself on a stylish mural", href: "/apps/tool/signboard", badge: null, gradient: "from-cyan-600/30 to-teal-900/30" },
      { id: "paint-app", title: "Paint App", description: "Retro paint app art style", href: "/apps/tool/paint-app", badge: null, gradient: "from-blue-600/30 to-indigo-900/30" },
      { id: "poster", title: "Poster", description: "AI movie poster generator", href: "/apps/tool/poster", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { id: "sticker", title: "Sticker", description: "Custom AI sticker maker", href: "/apps/tool/sticker", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
    ],
  },
];

export const APP_CATEGORIES: AppCategory[] = APP_CATEGORIES_RAW.map((category) => ({
  ...category,
  href: `/apps#${category.id}`,
  tools: category.tools.map((tool) => ({
    ...tool,
    href: TOOL_ROUTE_MAP[tool.id] ?? tool.href,
  })),
}));

export const TOTAL_TOOLS = APP_CATEGORIES.reduce(
  (sum, cat) => sum + cat.tools.length,
  0
);

export type AppToolAction =
  | "image"
  | "video"
  | "audio"
  | "remove-bg"
  | "upscale"
  | "face-swap";

export const APP_TOOL_BY_ID: Record<string, AppTool> = APP_CATEGORIES.flatMap((c) => c.tools).reduce(
  (acc, tool) => {
    acc[tool.id] = tool;
    return acc;
  },
  {} as Record<string, AppTool>,
);

const FACE_SWAP_IDS = new Set([
  "face-swap",
  "character-swap",
  "video-face-swap",
]);

const REMOVE_BG_IDS = new Set([
  "bg-remover",
  "video-bg-remover",
]);

const UPSCALE_IDS = new Set([
  "image-upscale",
  "video-upscale",
]);

const AUDIO_IDS = new Set([
  "tts",
  "music-gen",
  "meme-gen",
  "rap-god",
]);

const VIDEO_IDS = new Set([
  "clipcut",
  "urban-cuts",
  "draw-to-video",
  "mixed-media",
  "click-to-ad",
  "billboard-ad",
  "bullet-time-white",
  "truck-ad",
  "giant-product",
  "fridge-ad",
  "volcano-ad",
  "kick-ad",
  "mukbang",
  "skibidi",
  "zooms",
  "behind-scenes",
  "bullet-time",
  "packshot",
  "recast",
]);

export function getAppToolAction(toolId: string): AppToolAction {
  if (FACE_SWAP_IDS.has(toolId)) return "face-swap";
  if (REMOVE_BG_IDS.has(toolId)) return "remove-bg";
  if (UPSCALE_IDS.has(toolId)) return "upscale";
  if (AUDIO_IDS.has(toolId)) return "audio";
  if (VIDEO_IDS.has(toolId)) return "video";
  return "image";
}

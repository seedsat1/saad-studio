export interface NavSubItem {
  label: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface NavCategory {
  id: string;
  label: string;
  emoji: string;
  href: string;
  subItems?: NavSubItem[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "explore",
    label: "Explore",
    emoji: "🌍",
    href: "/explore",
  },
  {
    id: "image",
    label: "Image",
    emoji: "🖼️",
    href: "/image",
    subItems: [
      { label: "Create Image", href: "/image", description: "Generate stunning AI images", badge: "TOP" },
      { label: "Soul ID Character", href: "/image/soul-id-character", description: "Consistent character design" },
      { label: "AI Influencer", href: "/image/ai-influencer", description: "Create virtual influencers", badge: "TOP" },
      { label: "Photodump", href: "/image", description: "Bulk AI photo generation" },
      { label: "Face Swap", href: "/image", description: "Swap faces with precision" },
      { label: "Image Upscale", href: "/image", description: "4K AI upscaling" },
    ],
  },
  {
    id: "video",
    label: "Video",
    emoji: "🎥",
    href: "/video",
    subItems: [
      { label: "Create Video", href: "/video", description: "Text-to-video generation" },
      { label: "Cinema Studio", href: "/cinema-studio", description: "Professional cinematic production", badge: "TOP" },
      { label: "Mixed Media", href: "/video", description: "Combine multiple visual styles" },
      { label: "Edit Video", href: "/edit", description: "Advanced AI timeline editing" },
      { label: "Lipsync Studio", href: "/video", description: "Audio-driven facial animation" },
      { label: "Video Upscale", href: "/video", description: "Enhance to 4K/8K" },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    emoji: "🎵",
    href: "/audio",
    subItems: [
      { label: "Text to Music", href: "/audio", description: "Generate full tracks from prompts" },
      { label: "Voice Cloning", href: "/audio", description: "Clone any voice in seconds" },
      { label: "Sound Effects", href: "/audio", description: "Create custom SFX" },
      { label: "Podcast Studio", href: "/audio", description: "Professional podcast production" },
    ],
  },
  {
    id: "3d",
    label: "3D",
    emoji: "🧊",
    href: "/3d",
    subItems: [
      { label: "3D Render", href: "/3d/render", description: "AI-powered 3D generation" },
      { label: "3D Avatar", href: "/3d/avatar", description: "Create 3D avatars" },
      { label: "Object to 3D", href: "/3d/object", description: "Photos to 3D models" },
    ],
  },
  {
    id: "others",
    label: "Others",
    emoji: "🛠️",
    href: "/edit",
    subItems: [
      { label: "Background Remove", href: "/edit/bg-remove", description: "Remove backgrounds instantly" },
      { label: "Upscale & Enhance", href: "/edit/upscale", description: "4K upscaling AI" },
      { label: "Smart Crop", href: "/edit/crop", description: "AI-powered composition" },
    ],
  },
  {
    id: "character",
    label: "Character",
    emoji: "🎭",
    href: "/character",
  },
  {
    id: "moodboard",
    label: "Moodboard",
    emoji: "🎨",
    href: "/moodboard",
  },
  {
    id: "cinema-studio",
    label: "Cinema Studio",
    emoji: "🎬",
    href: "/cinema-studio",
  },
  {
    id: "shots",
    label: "Shots Studio",
    emoji: "📸",
    href: "/shots",
  },
  {
    id: "variations",
    label: "Variations Studio",
    emoji: "🎞️",
    href: "/variations",
  },
  {
    id: "original-series",
    label: "Original Series",
    emoji: "📺",
    href: "/original-series",
  },
  {
    id: "apps",
    label: "Apps",
    emoji: "🧩",
    href: "/apps",
  },
  {
    id: "assist",
    label: "Assist",
    emoji: "🤖",
    href: "/conversation",
  },
  {
    id: "gallery",
    label: "Gallery",
    emoji: "🖼️",
    href: "/gallery",
  },
];

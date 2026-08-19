export interface VerifiedSubscriberRoute {
  path: string;
  name: string;
  category: "Core Studio" | "Creative Hub" | "Utility" | "System";
  description: string;
  badge?: string;
}

export const VERIFIED_SUBSCRIBER_ROUTES: VerifiedSubscriberRoute[] = [
  {
    path: "/dashboard",
    name: "Dashboard Overview",
    category: "Core Studio",
    description: "Main subscriber home hub with user metrics and recent generations",
    badge: "PRIMARY",
  },
  {
    path: "/image",
    name: "Image Studio",
    category: "Core Studio",
    description: "AI image creation, inpainting, relighting, upscale, and faceswap",
    badge: "STUDIO",
  },
  {
    path: "/video",
    name: "Video Studio",
    category: "Core Studio",
    description: "Cinematic text/image to video generation with camera controls",
    badge: "STUDIO",
  },
  {
    path: "/audio",
    name: "Audio & Music",
    category: "Core Studio",
    description: "AI music composition, sound design, and text to speech",
    badge: "STUDIO",
  },
  {
    path: "/apps",
    name: "AI Apps Catalog",
    category: "Creative Hub",
    description: "Curated suite of specialized creative tools and workflows",
  },
  {
    path: "/gallery",
    name: "Creative Vault",
    category: "Creative Hub",
    description: "Asset history, media library, favorites, and albums",
  },
  {
    path: "/pricing",
    name: "Subscription Plans",
    category: "System",
    description: "Subscription tiers, top-up credits, and billing overview",
    badge: "UPGRADE",
  },
  {
    path: "/explore",
    name: "Cinematic Showcase",
    category: "Creative Hub",
    description: "Community creations and trending cinematic prompts",
  },
  {
    path: "/3d",
    name: "3D Asset Studio",
    category: "Core Studio",
    description: "3D mesh generation from text, images, and multiview sketches",
  },
  {
    path: "/clipcraft-studio",
    name: "ClipCraft Video Editor",
    category: "Creative Hub",
    description: "AI video clipping, subtitles, audiograms, and reframing",
  },
  {
    path: "/canvas",
    name: "Infinite AI Canvas",
    category: "Creative Hub",
    description: "Infinite workspace for spatial composition and multi-asset editing",
  },
  {
    path: "/cinema-studio",
    name: "Cinema Studio",
    category: "Core Studio",
    description: "Multi-shot directorial timeline and sequence generator",
  },
  {
    path: "/hook-studio",
    name: "Hook & Viral Studio",
    category: "Creative Hub",
    description: "High-retention social hooks and viral video openers",
  },
  {
    path: "/prompt-extractor",
    name: "Prompt Extractor",
    category: "Utility",
    description: "Reverse-engineer prompts and styles from reference media",
  },
  {
    path: "/lipsync",
    name: "AI Lip Sync Studio",
    category: "Core Studio",
    description: "Audio-driven avatar lip sync and realistic facial animation",
  },
];

export const ROUTE_PATH_MAP = new Map(
  VERIFIED_SUBSCRIBER_ROUTES.map((r) => [r.path, r])
);

export function getRouteName(path: string): string {
  if (path === "ALL") return "All Subscriber Pages (Site-Wide)";
  return ROUTE_PATH_MAP.get(path)?.name || path;
}

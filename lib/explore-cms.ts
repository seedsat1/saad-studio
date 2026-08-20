export type ExploreMedia = {
  id: string;
  url: string;
  type: "image" | "video";
  alt?: string;
};

export type ExploreModuleLayout = "banner" | "gallery-left" | "gallery-right";

export type ExploreModule = {
  id: string;
  enabled: boolean;
  layout: ExploreModuleLayout;
  badge?: string;
  title: string;
  subtitle?: string;
  cta?: string;
  href: string;
  hero: ExploreMedia;
  gallery: ExploreMedia[];
};

export type ExploreCmsConfig = {
  modules: ExploreModule[];
  updatedAt?: string;
};

const image = (id: string, url: string, alt?: string): ExploreMedia => ({
  id,
  url,
  type: "image",
  alt,
});

export const DEFAULT_EXPLORE_MODULES: ExploreModule[] = [
  {
    id: "gpt-image-2",
    enabled: true,
    layout: "gallery-right",
    badge: "NEW MODEL",
    title: "Meet GPT Image 2",
    subtitle: "4K images with near-perfect text rendering",
    cta: "Try Model",
    href: "/image?tool=create&model=gpt-image-2-text-to-image",
    hero: image("hero", "/GPT%20Image%202/SHOT%201.webp", "GPT Image 2 hero"),
    gallery: [
      image("gallery-1", "/GPT%20Image%202/SHOT%202.webp"),
      image("gallery-2", "/GPT%20Image%202/SHOT%203.webp"),
      image("gallery-3", "/GPT%20Image%202/SHOT%204.webp"),
      image("gallery-4", "/GPT%20Image%202/SHOT%205.webp"),
      image("gallery-5", "/GPT%20Image%202/SHOT%206.webp"),
      image("gallery-6", "/GPT%20Image%202/SHOT%207.webp"),
      image("gallery-7", "/GPT%20Image%202/SHOT%208.webp"),
      image("gallery-8", "/GPT%20Image%202/SHOT%209.webp"),
    ],
  },
  {
    id: "canvas",
    enabled: true,
    layout: "banner",
    title: "Canvas",
    cta: "Open",
    href: "https://www.saadstudio.app/canvas",
    hero: image("hero", "/canvas.webp", "Canvas hero"),
    gallery: [],
  },
  {
    id: "seedance-2",
    enabled: true,
    layout: "gallery-left",
    badge: "VIDEO MODEL",
    title: "Seedance 2",
    subtitle: "Fast cinematic video generation with smooth motion and flexible references.",
    cta: "Try Model",
    href: "/video?tool=create-video&model=bytedance-seedance-v2-t2v",
    hero: image("hero", "/seedance%202/Hero.webp", "Seedance 2 hero"),
    gallery: [
      image("gallery-1", "/seedance%202/1%20(1).webp"),
      image("gallery-2", "/seedance%202/1%20(2).webp"),
      image("gallery-3", "/seedance%202/1%20(3).webp"),
      image("gallery-4", "/seedance%202/1%20(4).webp"),
      image("gallery-5", "/seedance%202/1%20(5).webp"),
      image("gallery-6", "/seedance%202/1%20(6).webp"),
      image("gallery-7", "/seedance%202/1%20(7).webp"),
      image("gallery-8", "/seedance%202/1%20(8).webp"),
    ],
  },
  {
    id: "next-scene-engine",
    enabled: true,
    layout: "banner",
    title: "NEXT SCENE ENGINE",
    cta: "Open",
    href: "https://www.saadstudio.app/cinema-studio",
    hero: image("hero", "/NEXT%20SCENE%20ENGINE.webp", "Next Scene Engine hero"),
    gallery: [],
  },
  {
    id: "transitions",
    enabled: true,
    layout: "gallery-right",
    badge: "VIDEO TOOL",
    title: "Transitions",
    subtitle: "Create stylized scene changes and motion bridges between your clips.",
    cta: "Open Tool",
    href: "https://www.saadstudio.app/apps/tool/transitions",
    hero: image("hero", "/transitions/Hero.webp", "Transitions hero"),
    gallery: [
      image("gallery-1", "/transitions/1%20(1).webp"),
      image("gallery-2", "/transitions/1%20(2).webp"),
      image("gallery-3", "/transitions/1%20(3).webp"),
      image("gallery-4", "/transitions/1%20(4).webp"),
      image("gallery-5", "/transitions/1%20(5).webp"),
      image("gallery-6", "/transitions/1%20(6).webp"),
      image("gallery-7", "/transitions/1%20(7).webp"),
      image("gallery-8", "/transitions/1%20(8).webp"),
      image("gallery-9", "/transitions/1%20(9).webp"),
    ],
  },
  {
    id: "nano-banana",
    enabled: true,
    layout: "banner",
    title: "Nano Banana",
    cta: "Open",
    href: "/image?tool=create&model=nano-banana-pro",
    hero: image("hero", "/nano.webp", "Nano Banana hero"),
    gallery: [],
  },
  {
    id: "kling-3",
    enabled: true,
    layout: "gallery-left",
    badge: "VIDEO MODEL",
    title: "Kling 3.0",
    subtitle: "Cinematic motion, strong scene continuity, and polished video generation.",
    cta: "Try Model",
    href: "/video?tool=create-video&model=kling-v3.0-pro-t2v",
    hero: image("hero", "/Kling%203.0/Hero.webp", "Kling 3.0 hero"),
    gallery: [
      image("gallery-1", "/Kling%203.0/1%20(1).webp"),
      image("gallery-2", "/Kling%203.0/1%20(2).webp"),
      image("gallery-3", "/Kling%203.0/1%20(3).webp"),
      image("gallery-4", "/Kling%203.0/1%20(4).webp"),
      image("gallery-5", "/Kling%203.0/1%20(5).webp"),
      image("gallery-6", "/Kling%203.0/1%20(6).webp"),
      image("gallery-7", "/Kling%203.0/1%20(7).webp"),
      image("gallery-8", "/Kling%203.0/1%20(8).webp"),
    ],
  },
  {
    id: "camera-movements",
    enabled: true,
    layout: "gallery-right",
    badge: "NEW LIBRARY",
    title: "46 Camera Movements",
    subtitle: "Cinematic camera movement library — dolly, zoom, orbit, drone, crane, tracking and more. Copy-paste prompts for any AI video model.",
    cta: "Open Library",
    href: "/hook-studio",
    hero: image(
      "hero",
      "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/orbit-cw.webp",
      "Camera movement library hero",
    ),
    gallery: [
      image("gallery-1", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/dolly-in.webp", "Dolly In"),
      image("gallery-2", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/crane-up.webp", "Crane Up"),
      image("gallery-3", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/chase-shot.webp", "Chase Shot"),
      image("gallery-4", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/arc-left.webp", "Arc Left"),
      image("gallery-5", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/helicopter-shot.webp", "Helicopter Shot"),
      image("gallery-6", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/fpv-shot.webp", "First-Person View"),
      image("gallery-7", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/pass-through.webp", "Pass-Through"),
      image("gallery-8", "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/whip-pan-right.webp", "Whip Pan"),
    ],
  },
];

export const DEFAULT_EXPLORE_CMS: ExploreCmsConfig = {
  modules: DEFAULT_EXPLORE_MODULES,
};

function cleanMedia(media: Partial<ExploreMedia> | undefined, fallback: ExploreMedia): ExploreMedia {
  return {
    id: String(media?.id || fallback.id || `media-${Date.now()}`),
    url: String(media?.url || fallback.url || ""),
    type: media?.type === "video" ? "video" : "image",
    alt: typeof media?.alt === "string" ? media.alt : fallback.alt,
  };
}

export function normalizeExploreConfig(input: unknown): ExploreCmsConfig {
  const raw = input as Partial<ExploreCmsConfig> | null | undefined;
  const modules = Array.isArray(raw?.modules) ? raw.modules : DEFAULT_EXPLORE_MODULES;

  return {
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined,
    modules: modules.map((module, index) => {
      const fallback = DEFAULT_EXPLORE_MODULES[index] ?? DEFAULT_EXPLORE_MODULES[0];
      const layout: ExploreModuleLayout =
        module?.layout === "banner" || module?.layout === "gallery-left" || module?.layout === "gallery-right"
          ? module.layout
          : fallback.layout;
      const fallbackHero = fallback.hero ?? image("hero", "");
      const fallbackGallery = fallback.gallery ?? [];

      return {
        id: String(module?.id || `module-${Date.now()}-${index}`),
        enabled: module?.enabled !== false,
        layout,
        badge: typeof module?.badge === "string" ? module.badge : fallback.badge,
        title: String(module?.title || fallback.title || "Untitled"),
        subtitle: typeof module?.subtitle === "string" ? module.subtitle : fallback.subtitle,
        cta: typeof module?.cta === "string" ? module.cta : fallback.cta,
        href: String(module?.href || fallback.href || "#"),
        hero: cleanMedia(module?.hero, fallbackHero),
        gallery: Array.isArray(module?.gallery)
          ? module.gallery.map((media, mediaIndex) => cleanMedia(media, fallbackGallery[mediaIndex] ?? image(`gallery-${mediaIndex + 1}`, "")))
          : fallbackGallery,
      };
    }),
  };
}

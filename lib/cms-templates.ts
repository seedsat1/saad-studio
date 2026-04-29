/**
 * CMS Template Registry
 * Defines default layouts and metadata for all CMS slugs.
 */

export type SectionType = "heroSlides" | "coreTools" | "topChoice" | "apps" | "models" | "adCards";

export interface SectionOrder {
  _id: string;
  type: SectionType;
  label: string;
  visible: boolean;
}

export interface CmsLayout {
  sectionOrder: SectionOrder[];
  heroSlides?: any[];
  coreTools?: any[];
  topChoice?: any[];
  apps?: any[];
  models?: any[];
  adCards?: any[];
  maintenance?: {
    enabled: boolean;
    message: string;
  };
}

export const CMS_SLUGS = [
  "home",
  "explore",
  "image",
  "video",
  "audio",
  "apps",
  "cinema-studio",
  "shots",
  "variations",
  "pricing",
] as const;

export type CmsSlug = (typeof CMS_SLUGS)[number];

export const DEFAULT_MAINTENANCE_MESSAGE =
  "This page is currently under maintenance. Please try again later.";

export const DEFAULT_LAYOUTS: Record<CmsSlug, CmsLayout> = {
  home: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Hero Carousel", visible: true },
      { _id: "s2", type: "coreTools", label: "Core Studio Tools", visible: true },
      { _id: "s3", type: "topChoice", label: "Top Choice", visible: true },
      { _id: "s4", type: "adCards", label: "Ad Cards", visible: true },
      { _id: "s5", type: "apps", label: "Apps Marquee", visible: true },
      { _id: "s6", type: "models", label: "AI Models Strip", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    topChoice: [],
    apps: [],
    models: [],
    adCards: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  explore: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Explore Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Core Tools", visible: true },
      { _id: "s3", type: "topChoice", label: "Top Choice", visible: true },
      { _id: "s4", type: "adCards", label: "Ad Cards", visible: true },
      { _id: "s5", type: "apps", label: "Apps", visible: true },
      { _id: "s6", type: "models", label: "Models", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    topChoice: [],
    apps: [],
    models: [],
    adCards: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  image: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Image Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Image Tools", visible: true },
      { _id: "s3", type: "models", label: "Image Models", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    models: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  video: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Video Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Video Tools", visible: true },
      { _id: "s3", type: "models", label: "Video Models", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    models: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  audio: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Audio Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Audio Tools", visible: true },
      { _id: "s3", type: "models", label: "Audio Models", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    models: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  apps: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Apps Hero", visible: true },
      { _id: "s2", type: "apps", label: "Apps", visible: true },
    ],
    heroSlides: [],
    apps: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  "cinema-studio": {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Cinema Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Scene Tools", visible: true },
      { _id: "s3", type: "models", label: "Production Models", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    models: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  shots: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Shots Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Shot Styles", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  variations: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Variations Hero", visible: true },
      { _id: "s2", type: "coreTools", label: "Variation Tools", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
  pricing: {
    sectionOrder: [
      { _id: "s1", type: "heroSlides", label: "Pricing Hero", visible: true },
    ],
    heroSlides: [],
    coreTools: [],
    topChoice: [],
    apps: [],
    models: [],
    adCards: [],
    maintenance: { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE },
  },
};

/**
 * Get the default layout for a given slug.
 * Returns the home layout if slug is not found.
 */
export function getDefaultLayout(slug: string): CmsLayout {
  const safeSlug = (slug || "home") as CmsSlug;
  return DEFAULT_LAYOUTS[safeSlug] || DEFAULT_LAYOUTS.home;
}

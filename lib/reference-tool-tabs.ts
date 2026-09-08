import {
  Image as ImageIcon,
  Sparkles,
  User,
  Package,
  MapPin,
  Palette,
  Wand2,
  Frame,
  Film,
  Clapperboard,
  Droplets,
  Lightbulb,
  Wind,
  Grip,
  Sun,
  Camera,
  PenTool,
  type LucideIcon,
} from "lucide-react";

/**
 * The Reference Studio's tabs, in one place.
 *
 * `id` must match the tab key ReferenceStudioModal switches on, so anything that
 * lists these tabs can open the right one with setActiveTab(id).
 *
 * ReferenceStudioModal still hand-writes its own sidebar buttons; migrating that
 * sidebar to render from this array is a separate, larger change.
 */
export interface ReferenceToolTab {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: LucideIcon;
  /** Tailwind text colour, written in full so the JIT can see it. */
  colorClass: string;
  /** Whether the tab is meaningful when generating a still image. */
  supportsImage: boolean;
  /** Whether the tab is meaningful when generating video. */
  supportsVideo: boolean;
}

export const REFERENCE_TOOL_TABS: ReferenceToolTab[] = [
  { id: "stock",      nameAr: "ستوك",       nameEn: "Stock",       icon: ImageIcon,    colorClass: "text-slate-400",   supportsImage: true,  supportsVideo: true },
  { id: "style",      nameAr: "ستايل",      nameEn: "Style",       icon: Sparkles,     colorClass: "text-indigo-400",  supportsImage: true,  supportsVideo: true },
  { id: "character",  nameAr: "شخصية",      nameEn: "Character",   icon: User,         colorClass: "text-emerald-400", supportsImage: true,  supportsVideo: true },
  { id: "element",    nameAr: "منتج",       nameEn: "Product",     icon: Package,      colorClass: "text-purple-400",  supportsImage: true,  supportsVideo: true },
  { id: "location",   nameAr: "موقع",       nameEn: "Location",    icon: MapPin,       colorClass: "text-pink-400",    supportsImage: true,  supportsVideo: true },
  { id: "color",      nameAr: "ألوان",      nameEn: "Color",       icon: Palette,      colorClass: "text-rose-400",    supportsImage: true,  supportsVideo: true },
  { id: "effects",    nameAr: "إفكت",       nameEn: "Effects",     icon: Wand2,        colorClass: "text-pink-300",    supportsImage: true,  supportsVideo: true },
  { id: "shottype",   nameAr: "تأطير",      nameEn: "Shot Type",   icon: Frame,        colorClass: "text-orange-400",  supportsImage: true,  supportsVideo: true },
  { id: "filmstock",  nameAr: "خامة",       nameEn: "Film Stock",  icon: Film,         colorClass: "text-cyan-400",    supportsImage: true,  supportsVideo: true },
  { id: "movielook",  nameAr: "لوك",        nameEn: "Movie Look",  icon: Clapperboard, colorClass: "text-rose-400",    supportsImage: true,  supportsVideo: true },
  { id: "tonallook",  nameAr: "تونال",      nameEn: "Tonal Look",  icon: Droplets,     colorClass: "text-sky-400",     supportsImage: true,  supportsVideo: true },
  // "نمط إضاءة" rather than "إضاءة": the workspace rail already has a RELIGHT
  // mode labelled "إضاءة", and two different things sharing a label is worse
  // than a longer one.
  { id: "lighting",   nameAr: "نمط إضاءة",  nameEn: "Lighting",    icon: Lightbulb,    colorClass: "text-yellow-400",  supportsImage: true,  supportsVideo: true },
  { id: "motionblur", nameAr: "حركة",       nameEn: "Motion Blur", icon: Wind,         colorClass: "text-violet-400",  supportsImage: true,  supportsVideo: true },
  { id: "grain",      nameAr: "حبيبات",     nameEn: "Grain",       icon: Grip,         colorClass: "text-lime-400",    supportsImage: true,  supportsVideo: true },
  { id: "halation",   nameAr: "هالة",       nameEn: "Halation",    icon: Sun,          colorClass: "text-fuchsia-400", supportsImage: true,  supportsVideo: true },
  // 62 of Camera's 80 presets are camera *movements*, which mean nothing in a
  // still frame; its 18 framing presets are covered by Shot Type.
  { id: "camera",     nameAr: "كاميرا",     nameEn: "Camera",      icon: Camera,       colorClass: "text-amber-400",   supportsImage: false, supportsVideo: true },
  // Sketch's presets are pencil drawings, storyboard frames and blueprints —
  // single-frame artefacts rather than a motion look.
  { id: "sketch",     nameAr: "اسكتش",      nameEn: "Sketch",      icon: PenTool,      colorClass: "text-teal-400",    supportsImage: true,  supportsVideo: false },
];

export const IMAGE_TOOL_TABS = REFERENCE_TOOL_TABS.filter((tab) => tab.supportsImage);
export const VIDEO_TOOL_TABS = REFERENCE_TOOL_TABS.filter((tab) => tab.supportsVideo);

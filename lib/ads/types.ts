export type AdPlacementMode = "FLOW" | "FLOATING";

export type AdPlacementFamily =
  | "TOP_BANNER"
  | "POPUP"
  | "SIDEBAR"
  | "FLOATING_CARD"
  | "INLINE_STRIP"
  | "EMBEDDED_CARD"
  | "CUSTOM";

export type AdAudienceTarget =
  | "ALL"
  | "GUESTS"
  | "AUTHENTICATED"
  | "FREE_TIER"
  | "PAID_SUBSCRIBERS"
  | "PRO_MAX_ONLY";

export type AdAnimationPreset =
  | "none"
  | "fade"
  | "slide"
  | "scale"
  | "float"
  | "pulse";

export type AdDismissalModel = "none" | "session" | "local_30d" | "permanent";

export type AdBreakpoint = "desktop" | "tablet" | "mobile";

export interface AdPositionGeometry {
  /** Normalized X position in viewport (0 to 100 %) */
  xPct: number;
  /** Normalized Y position in viewport (0 to 100 %) */
  yPct: number;
  /** Normalized width in viewport (10 to 100 %) */
  widthPct: number;
  /** Optional minimum height in pixels */
  heightPx?: number;
  /** Alignment anchor */
  anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "custom";
  /** Placement mode */
  placementMode: AdPlacementMode;
  /** Z-index layer (default 50) */
  zIndex?: number;
}

export interface AdResponsivePlacements {
  desktop: AdPositionGeometry;
  tablet?: AdPositionGeometry;
  mobile?: AdPositionGeometry;
}

export interface AdVisualTheme {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  gradient?: string;
  backdropBlur?: boolean;
  boxShadow?: string;
}

export interface AdCampaignConfig {
  id?: string;
  title: string;
  headline?: string;
  description?: string;
  mediaType: "image" | "video" | "none";
  mediaUrl: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaTarget?: "_self" | "_blank";
  type: AdPlacementFamily | string;
  theme: AdVisualTheme;
  animation: AdAnimationPreset;
  audience: AdAudienceTarget;
  priority: number;
  dismissible: boolean;
  dismissalModel: AdDismissalModel;
  /** Array of page routes e.g. ["/dashboard", "/video"] or ["ALL"] */
  targetPages: string[];
  /** Per-page responsive placement map: Record<pageRoute, AdResponsivePlacements> */
  placements: Record<string, AdResponsivePlacements>;
  startDate?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  impressionsCount?: number;
  clicksCount?: number;
  dismissalsCount?: number;
}

export interface AdCampaignRow {
  id: string;
  title: string;
  type: string;
  mediaUrl: string | null;
  targetLink: string | null;
  isActive: boolean;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type AdCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "EXPIRED";

export interface ResolvedPromotion {
  id: string;
  title: string;
  headline: string;
  description: string;
  mediaType: "image" | "video" | "none";
  mediaUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaTarget: "_self" | "_blank";
  placementFamily: AdPlacementFamily | string;
  placementMode: AdPlacementMode;
  geometry: AdPositionGeometry;
  theme: AdVisualTheme;
  animation: AdAnimationPreset;
  priority: number;
  dismissible: boolean;
  dismissalModel: AdDismissalModel;
  expiresAt: string | null;
}

import {
  AdCampaignConfig,
  AdCampaignRow,
  AdCampaignStatus,
  AdPositionGeometry,
  AdResponsivePlacements,
  AdVisualTheme,
} from "./types";

const LEGACY_ENCODING_PREFIX = "saad_ad_v1:";

/**
 * Default placements for legacy campaign types (TOP_BANNER, POPUP, SIDEBAR, CUSTOM)
 */
export function getDefaultPlacement(type: string): AdResponsivePlacements {
  switch (type) {
    case "TOP_BANNER":
      return {
        desktop: {
          xPct: 50,
          yPct: 0,
          widthPct: 100,
          anchor: "center",
          placementMode: "FLOW",
          zIndex: 40,
        },
        tablet: {
          xPct: 50,
          yPct: 0,
          widthPct: 100,
          anchor: "center",
          placementMode: "FLOW",
          zIndex: 40,
        },
        mobile: {
          xPct: 50,
          yPct: 0,
          widthPct: 100,
          anchor: "center",
          placementMode: "FLOW",
          zIndex: 40,
        },
      };
    case "POPUP":
      return {
        desktop: {
          xPct: 50,
          yPct: 50,
          widthPct: 40,
          anchor: "center",
          placementMode: "FLOATING",
          zIndex: 100,
        },
        tablet: {
          xPct: 50,
          yPct: 50,
          widthPct: 60,
          anchor: "center",
          placementMode: "FLOATING",
          zIndex: 100,
        },
        mobile: {
          xPct: 50,
          yPct: 50,
          widthPct: 90,
          anchor: "center",
          placementMode: "FLOATING",
          zIndex: 100,
        },
      };
    case "SIDEBAR":
    case "FLOATING_CARD":
    default:
      return {
        desktop: {
          xPct: 88,
          yPct: 82,
          widthPct: 24,
          anchor: "bottom-right",
          placementMode: "FLOATING",
          zIndex: 50,
        },
        tablet: {
          xPct: 85,
          yPct: 85,
          widthPct: 35,
          anchor: "bottom-right",
          placementMode: "FLOATING",
          zIndex: 50,
        },
        mobile: {
          xPct: 50,
          yPct: 90,
          widthPct: 92,
          anchor: "bottom-right",
          placementMode: "FLOATING",
          zIndex: 50,
        },
      };
  }
}

export const DEFAULT_THEME: AdVisualTheme = {
  backgroundColor: "#0d1424",
  textColor: "#f8fafc",
  borderColor: "rgba(255, 255, 255, 0.12)",
  borderRadius: 16,
  gradient: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(59, 130, 246, 0.15))",
  backdropBlur: true,
  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
};

/**
 * Strict validation against malicious/executable URLs (XSS, javascript:, vbscript:)
 */
export function sanitizeCtaUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/html") ||
    lower.startsWith("file:")
  ) {
    return null;
  }

  // Allow internal routes (/pricing, /video, etc.) and safe external URLs (http/https)
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }

  // Fallback prepend / if it looks like a relative slug
  if (!trimmed.includes("://") && !trimmed.startsWith(".")) {
    return `/${trimmed}`;
  }

  return null;
}

/**
 * Computes exact campaign lifecycle status
 */
export function computeCampaignStatus(
  isActive: boolean,
  startDate?: string | Date | null,
  expiresAt?: string | Date | null
): AdCampaignStatus {
  if (!isActive) return "PAUSED";

  const now = Date.now();

  if (expiresAt) {
    const expTime = new Date(expiresAt).getTime();
    if (!Number.isNaN(expTime) && expTime < now) {
      return "EXPIRED";
    }
  }

  if (startDate) {
    const startTime = new Date(startDate).getTime();
    if (!Number.isNaN(startTime) && startTime > now) {
      return "SCHEDULED";
    }
  }

  return "LIVE";
}

/**
 * Serializes AdCampaignConfig into normalized Prisma database models (AdCampaign + AdPlacement records)
 */
export function serializeAdCampaign(config: Partial<AdCampaignConfig> & { title: string; type: string }): {
  campaignData: {
    title: string;
    headline: string;
    description: string;
    type: string;
    mediaUrl: string | null;
    mediaType: string;
    targetLink: string | null; // PURE CTA URL
    ctaLabel: string;
    ctaTarget: string;
    isActive: boolean;
    priority: number;
    audience: string;
    animation: string;
    dismissible: boolean;
    dismissalModel: string;
    startDate: Date | null;
    expiresAt: Date | null;
  };
  placementsData: Array<{
    route: string;
    placementMode: string;
    anchor: string;
    desktopX: number;
    desktopY: number;
    desktopW: number;
    desktopH?: number | null;
    tabletX?: number | null;
    tabletY?: number | null;
    tabletW?: number | null;
    tabletH?: number | null;
    mobileX?: number | null;
    mobileY?: number | null;
    mobileW?: number | null;
    mobileH?: number | null;
    zIndex: number;
  }>;
  // Legacy targetLink fallback compatibility field
  targetLink: string | null;
  title: string;
  type: string;
  mediaUrl: string | null;
  isActive: boolean;
  expiresAt: Date | null;
} {
  const safeCta = sanitizeCtaUrl(config.ctaUrl || (config as any).targetLink);

  const targetPages =
    Array.isArray(config.targetPages) && config.targetPages.length > 0
      ? config.targetPages
      : ["ALL"];

  const rawPlacements = config.placements || { ALL: getDefaultPlacement(config.type) };

  const placementsData = targetPages.map((route) => {
    const p = rawPlacements[route] || rawPlacements["ALL"] || getDefaultPlacement(config.type);
    const desktop = p.desktop || { xPct: 50, yPct: 50, widthPct: 40, anchor: "center", placementMode: "FLOATING" };
    const tablet = p.tablet;
    const mobile = p.mobile;

    return {
      route,
      placementMode: desktop.placementMode || "FLOATING",
      anchor: desktop.anchor || "center",
      desktopX: desktop.xPct,
      desktopY: desktop.yPct,
      desktopW: desktop.widthPct,
      desktopH: desktop.heightPx || null,
      tabletX: tablet ? tablet.xPct : null,
      tabletY: tablet ? tablet.yPct : null,
      tabletW: tablet ? tablet.widthPct : null,
      tabletH: tablet?.heightPx || null,
      mobileX: mobile ? mobile.xPct : null,
      mobileY: mobile ? mobile.yPct : null,
      mobileW: mobile ? mobile.widthPct : null,
      mobileH: mobile?.heightPx || null,
      zIndex: desktop.zIndex || 50,
    };
  });

  const campaignData = {
    title: config.title,
    headline: config.headline || config.title,
    description: config.description || "",
    type: config.type,
    mediaUrl: config.mediaUrl || null,
    mediaType: config.mediaType || (config.mediaUrl ? "image" : "none"),
    targetLink: safeCta, // Pure CTA URL
    ctaLabel: config.ctaLabel || "Explore Now",
    ctaTarget: config.ctaTarget || "_self",
    isActive: config.isActive !== false,
    priority: typeof config.priority === "number" ? config.priority : 10,
    audience: config.audience || "ALL",
    animation: config.animation || "fade",
    dismissible: config.dismissible !== false,
    dismissalModel: config.dismissalModel || "session",
    startDate: config.startDate ? new Date(config.startDate) : null,
    expiresAt: config.expiresAt ? new Date(config.expiresAt) : null,
  };

  return {
    campaignData,
    placementsData,
    targetLink: safeCta,
    title: config.title,
    type: config.type,
    mediaUrl: config.mediaUrl || null,
    isActive: config.isActive !== false,
    expiresAt: config.expiresAt ? new Date(config.expiresAt) : null,
  };
}

/**
 * Deserializes a database row into rich AdCampaignConfig with support for normalized relations & legacy rows
 */
export function deserializeAdCampaign(row: any): AdCampaignConfig & {
  id: string;
  status: AdCampaignStatus;
  createdAt: string;
  updatedAt: string;
} {
  const rawTarget = row.targetLink || "";
  let legacyPayload: any = null;

  if (rawTarget.startsWith(LEGACY_ENCODING_PREFIX)) {
    try {
      legacyPayload = JSON.parse(rawTarget.slice(LEGACY_ENCODING_PREFIX.length));
    } catch {
      legacyPayload = null;
    }
  }

  // 1. Resolve CTA URL
  const ctaUrl = sanitizeCtaUrl(
    row.targetLink?.startsWith(LEGACY_ENCODING_PREFIX)
      ? legacyPayload?.ctaUrl
      : row.targetLink || row.ctaUrl
  );

  // 2. Resolve Placements
  const placements: Record<string, AdResponsivePlacements> = {};
  const targetPages: string[] = [];

  if (Array.isArray(row.placements) && row.placements.length > 0) {
    for (const p of row.placements) {
      targetPages.push(p.route);
      placements[p.route] = {
        desktop: {
          xPct: p.desktopX,
          yPct: p.desktopY,
          widthPct: p.desktopW,
          heightPx: p.desktopH || undefined,
          anchor: (p.anchor as any) || "center",
          placementMode: (p.placementMode as any) || "FLOATING",
          zIndex: p.zIndex || 50,
        },
        tablet: p.tabletX !== null ? {
          xPct: p.tabletX ?? p.desktopX,
          yPct: p.tabletY ?? p.desktopY,
          widthPct: p.tabletW ?? p.desktopW,
          heightPx: p.tabletH || undefined,
          anchor: (p.anchor as any) || "center",
          placementMode: (p.placementMode as any) || "FLOATING",
          zIndex: p.zIndex || 50,
        } : undefined,
        mobile: p.mobileX !== null ? {
          xPct: p.mobileX ?? p.desktopX,
          yPct: p.mobileY ?? p.desktopY,
          widthPct: p.mobileW ?? p.desktopW,
          heightPx: p.mobileH || undefined,
          anchor: (p.anchor as any) || "center",
          placementMode: (p.placementMode as any) || "FLOATING",
          zIndex: p.zIndex || 50,
        } : undefined,
      };
    }
  } else if (legacyPayload?.placements) {
    Object.assign(placements, legacyPayload.placements);
    if (Array.isArray(legacyPayload.targetPages)) {
      targetPages.push(...legacyPayload.targetPages);
    }
  }

  if (targetPages.length === 0) {
    targetPages.push("ALL");
    placements.ALL = getDefaultPlacement(row.type);
  }

  const startDate = row.startDate
    ? new Date(row.startDate).toISOString()
    : legacyPayload?.startDate || null;

  const expiresAt = row.expiresAt
    ? new Date(row.expiresAt).toISOString()
    : null;

  const status = computeCampaignStatus(row.isActive, startDate, expiresAt);

  // Compute telemetry counts from related events or legacy payload
  let impressionsCount = legacyPayload?.impressionsCount || 0;
  let clicksCount = legacyPayload?.clicksCount || 0;
  let dismissalsCount = legacyPayload?.dismissalsCount || 0;

  if (Array.isArray(row.events)) {
    impressionsCount = row.events.filter((e: any) => e.eventType === "impression").length;
    clicksCount = row.events.filter((e: any) => e.eventType === "click").length;
    dismissalsCount = row.events.filter((e: any) => e.eventType === "dismissal").length;
  }

  return {
    id: row.id,
    title: row.title,
    headline: row.headline || legacyPayload?.headline || row.title,
    description: row.description || legacyPayload?.description || "",
    mediaType: (row.mediaType as any) || legacyPayload?.mediaType || (row.mediaUrl ? "image" : "none"),
    mediaUrl: row.mediaUrl,
    ctaLabel: row.ctaLabel || legacyPayload?.ctaLabel || "Learn More",
    ctaUrl,
    ctaTarget: (row.ctaTarget as any) || legacyPayload?.ctaTarget || "_self",
    type: row.type,
    theme: legacyPayload?.theme || DEFAULT_THEME,
    animation: (row.animation as any) || legacyPayload?.animation || "fade",
    audience: (row.audience as any) || legacyPayload?.audience || "ALL",
    priority: typeof row.priority === "number" ? row.priority : (legacyPayload?.priority ?? 10),
    dismissible: row.dismissible !== false && (legacyPayload?.dismissible !== false),
    dismissalModel: (row.dismissalModel as any) || legacyPayload?.dismissalModel || "session",
    targetPages,
    placements,
    startDate,
    expiresAt,
    isActive: row.isActive,
    impressionsCount,
    clicksCount,
    dismissalsCount,
    status,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

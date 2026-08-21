import prismadb from "@/lib/prismadb";
import {
  getMobileRuntimeFlags,
  type MobileRuntimeFlags,
  type MobileCapabilityKey,
} from "@/lib/mobile/mobile-control-plane";

export type HealthStatus = "PASS" | "DEGRADED" | "FAIL" | "INSUFFICIENT_DATA" | "UNKNOWN";

export type DeviceHealthRow = {
  category: "IMAGE" | "VIDEO" | "AUDIO" | "MUSIC" | "AUTH";
  featureLabel: string;
  flagKey: MobileCapabilityKey;
  flagEnabled: boolean;
  status: HealthStatus;
  desktopStatus: HealthStatus;
  iosSafariStatus: HealthStatus;
  androidChromeStatus: HealthStatus;
  total24h: number;
  success24h: number;
  failure24h: number;
  successRate24h: number | null;
  total1h: number;
  failure1h: number;
  status1h: HealthStatus;
  lastFailureTime: string | null;
  lastFailureCode: string | null;
  lastFailureOperation: string | null;
  lastSuccessTime: string | null;
};

export type AdminMobileHealthSnapshot = {
  overallStatus: HealthStatus;
  activeIncidentsCount: number;
  totalEvents24h: number;
  totalFailures24h: number;
  successRate24h: number | null;
  flags: MobileRuntimeFlags;
  matrix: DeviceHealthRow[];
  recentFailures: Array<{
    id: string;
    createdAt: string;
    route: string;
    feature: string;
    operation: string;
    deviceClass: string;
    browser: string | null;
    errorCode: string | null;
  }>;
  checkedAt: string;
};

const CATEGORY_FEATURES: Array<{
  category: DeviceHealthRow["category"];
  featureLabel: string;
  flagKey: MobileCapabilityKey;
  eventFeaturePrefixes: string[];
}> = [
  {
    category: "IMAGE",
    featureLabel: "Image Upload, Preview & Generation",
    flagKey: "mobile.image.upload.enabled",
    eventFeaturePrefixes: ["image", "image_upload", "image_generate"],
  },
  {
    category: "VIDEO",
    featureLabel: "Video Start/End Frame, Motion & Generation",
    flagKey: "mobile.video.upload.enabled",
    eventFeaturePrefixes: ["video", "video_upload", "video_generate"],
  },
  {
    category: "AUDIO",
    featureLabel: "Voice Preview, Recording, Audio & TTS",
    flagKey: "mobile.audio.preview.enabled",
    eventFeaturePrefixes: ["audio", "voice", "voice_preview", "mic", "tts"],
  },
  {
    category: "MUSIC",
    featureLabel: "Music Creation & Lyrics Workflow",
    flagKey: "mobile.music.generate.enabled",
    eventFeaturePrefixes: ["music", "music_generate", "song"],
  },
  {
    category: "AUTH",
    featureLabel: "Mobile Authentication & Session",
    flagKey: "mobile.auth.passkey_enabled",
    eventFeaturePrefixes: ["auth", "session", "login", "signup"],
  },
];

function evaluateHealthStatus(total: number, failures: number): HealthStatus {
  if (total === 0) return "UNKNOWN";
  if (total < 5 && failures === 0) return "PASS";
  if (total < 5 && failures > 0) return "DEGRADED";

  const successRate = ((total - failures) / total) * 100;
  if (successRate >= 95) return "PASS";
  if (successRate >= 75) return "DEGRADED";
  return "FAIL";
}

export async function loadAdminMobileHealthSnapshot(): Promise<AdminMobileHealthSnapshot> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

  const [flags, events24h, recentFailures] = await Promise.all([
    getMobileRuntimeFlags(),
    prismadb.mobileTelemetryEvent.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: {
        createdAt: true,
        feature: true,
        operation: true,
        status: true,
        deviceClass: true,
        browser: true,
        errorCode: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prismadb.mobileTelemetryEvent.findMany({
      where: {
        status: "FAILURE",
        createdAt: { gte: twentyFourHoursAgo },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        route: true,
        feature: true,
        operation: true,
        deviceClass: true,
        browser: true,
        errorCode: true,
      },
    }),
  ]);

  const totalEvents24h = events24h.length;
  const totalFailures24h = events24h.filter((e) => e.status === "FAILURE").length;
  const successRate24h = totalEvents24h > 0 ? ((totalEvents24h - totalFailures24h) / totalEvents24h) * 100 : null;

  const matrix: DeviceHealthRow[] = CATEGORY_FEATURES.map((def) => {
    // Filter events matching category prefixes
    const catEvents24h = events24h.filter((e) =>
      def.eventFeaturePrefixes.some((p) => e.feature.toLowerCase().startsWith(p))
    );
    const catEvents1h = catEvents24h.filter((e) => e.createdAt >= oneHourAgo);

    const total24h = catEvents24h.length;
    const failure24h = catEvents24h.filter((e) => e.status === "FAILURE").length;
    const success24h = total24h - failure24h;
    const rate24h = total24h > 0 ? (success24h / total24h) * 100 : null;

    const total1h = catEvents1h.length;
    const failure1h = catEvents1h.filter((e) => e.status === "FAILURE").length;

    // Device specific breakdowns
    const desktopEvents = catEvents24h.filter((e) => e.deviceClass === "desktop");
    const desktopFails = desktopEvents.filter((e) => e.status === "FAILURE").length;

    const iosSafariEvents = catEvents24h.filter((e) => e.deviceClass === "ios" && e.browser === "safari");
    const iosSafariFails = iosSafariEvents.filter((e) => e.status === "FAILURE").length;

    const androidChromeEvents = catEvents24h.filter((e) => e.deviceClass === "android" && e.browser === "chrome");
    const androidChromeFails = androidChromeEvents.filter((e) => e.status === "FAILURE").length;

    // Last events
    const lastFail = catEvents24h.find((e) => e.status === "FAILURE");
    const lastSuccess = catEvents24h.find((e) => e.status === "SUCCESS");

    return {
      category: def.category,
      featureLabel: def.featureLabel,
      flagKey: def.flagKey,
      flagEnabled: flags[def.flagKey] !== false,
      status: evaluateHealthStatus(total24h, failure24h),
      desktopStatus: evaluateHealthStatus(desktopEvents.length, desktopFails),
      iosSafariStatus: evaluateHealthStatus(iosSafariEvents.length, iosSafariFails),
      androidChromeStatus: evaluateHealthStatus(androidChromeEvents.length, androidChromeFails),
      total24h,
      success24h,
      failure24h,
      successRate24h: rate24h,
      total1h,
      failure1h,
      status1h: evaluateHealthStatus(total1h, failure1h),
      lastFailureTime: lastFail ? lastFail.createdAt.toISOString() : null,
      lastFailureCode: lastFail ? lastFail.errorCode : null,
      lastFailureOperation: lastFail ? lastFail.operation : null,
      lastSuccessTime: lastSuccess ? lastSuccess.createdAt.toISOString() : null,
    };
  });

  const activeIncidentsCount = matrix.filter((m) => m.status === "FAIL" || m.status1h === "FAIL").length;
  const overallStatus = activeIncidentsCount > 0 ? "FAIL" : matrix.some((m) => m.status === "DEGRADED") ? "DEGRADED" : totalEvents24h > 0 ? "PASS" : "UNKNOWN";

  return {
    overallStatus,
    activeIncidentsCount,
    totalEvents24h,
    totalFailures24h,
    successRate24h,
    flags,
    matrix,
    recentFailures: recentFailures.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })),
    checkedAt: new Date().toISOString(),
  };
}

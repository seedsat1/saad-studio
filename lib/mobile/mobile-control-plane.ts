import prismadb from "@/lib/prismadb";

export const MOBILE_RUNTIME_FLAGS_KEY = "mobile_runtime_flags_v1";

export type MobileCapabilityKey =
  | "mobile.image.upload.enabled"
  | "mobile.image.generate.enabled"
  | "mobile.video.upload.enabled"
  | "mobile.video.generate.enabled"
  | "mobile.audio.preview.enabled"
  | "mobile.audio.recording.enabled"
  | "mobile.media.download.enabled"
  | "mobile.music.generate.enabled"
  | "mobile.auth.passkey_enabled";

export type MobileRuntimeFlags = Record<MobileCapabilityKey, boolean> & {
  updatedAt: string;
  updatedBy: string;
};

// Allowed error and telemetry event codes
export const ALLOWED_TELEMETRY_CODES = new Set([
  "UPLOAD_SUCCESS",
  "UPLOAD_FAILED",
  "PLAYBACK_SUCCESS",
  "PLAYBACK_FAILED",
  "DOWNLOAD_SUCCESS",
  "DOWNLOAD_FAILED",
  "MIC_PERMISSION_DENIED",
  "GENERATION_TRIGGER_SUCCESS",
  "GENERATION_TRIGGER_FAILED",
  "SAFARI_MEDIA_ERROR",
  "ANDROID_MEDIA_ERROR",
  "UNSUPPORTED_FORMAT",
  "FILE_TOO_LARGE",
  "AUTH_SESSION_ERROR",
  "NETWORK_DISRUPTION",
]);

export const DEFAULT_MOBILE_RUNTIME_FLAGS: MobileRuntimeFlags = {
  "mobile.image.upload.enabled": true,
  "mobile.image.generate.enabled": true,
  "mobile.video.upload.enabled": true,
  "mobile.video.generate.enabled": true,
  "mobile.audio.preview.enabled": true,
  "mobile.audio.recording.enabled": true,
  "mobile.media.download.enabled": true,
  "mobile.music.generate.enabled": true,
  "mobile.auth.passkey_enabled": true,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system_default",
};

export type ParsedClientDevice = {
  deviceClass: "desktop" | "ios" | "android" | "other";
  browser: "safari" | "chrome" | "firefox" | "edge" | "other";
  os: "ios" | "android" | "macos" | "windows" | "other";
};

export function parseClientDevice(userAgent?: string | null): ParsedClientDevice {
  if (!userAgent || typeof userAgent !== "string") {
    return { deviceClass: "desktop", browser: "other", os: "other" };
  }

  const ua = userAgent.toLowerCase();

  // OS Detection
  let os: ParsedClientDevice["os"] = "other";
  let isIOS = false;
  let isAndroid = false;

  if (/iphone|ipad|ipod/.test(ua)) {
    os = "ios";
    isIOS = true;
  } else if (/android/.test(ua)) {
    os = "android";
    isAndroid = true;
  } else if (/mac os x|macintosh/.test(ua)) {
    os = "macos";
  } else if (/windows nt|windows/.test(ua)) {
    os = "windows";
  }

  // Device Class
  let deviceClass: ParsedClientDevice["deviceClass"] = "desktop";
  if (isIOS) deviceClass = "ios";
  else if (isAndroid) deviceClass = "android";
  else if (/mobile|tablet|silk|kindle/.test(ua)) deviceClass = "other";

  // Browser Detection
  let browser: ParsedClientDevice["browser"] = "other";
  if (/edg\//.test(ua)) {
    browser = "edge";
  } else if (/firefox|fxios/.test(ua)) {
    browser = "firefox";
  } else if (/chrome|crios/.test(ua) && !/edg\//.test(ua)) {
    browser = "chrome";
  } else if (/safari/.test(ua) && !/chrome|crios|android/.test(ua)) {
    browser = "safari";
  }

  return { deviceClass, browser, os };
}

/** Reads the current mobile capability flags from PlatformConfig */
export async function getMobileRuntimeFlags(): Promise<MobileRuntimeFlags> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: MOBILE_RUNTIME_FLAGS_KEY },
    });

    if (!row?.value) {
      return DEFAULT_MOBILE_RUNTIME_FLAGS;
    }

    const parsed = JSON.parse(row.value) as Partial<MobileRuntimeFlags>;
    return {
      ...DEFAULT_MOBILE_RUNTIME_FLAGS,
      ...parsed,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: parsed.updatedBy || "admin",
    };
  } catch (error) {
    console.error("[mobile-control-plane] Failed to read mobile flags:", error);
    return DEFAULT_MOBILE_RUNTIME_FLAGS;
  }
}

/** Updates mobile capability flags in PlatformConfig */
export async function updateMobileRuntimeFlags(
  updates: Partial<Record<MobileCapabilityKey, boolean>>,
  updatedBy = "admin"
): Promise<MobileRuntimeFlags> {
  const current = await getMobileRuntimeFlags();
  const next: MobileRuntimeFlags = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await prismadb.platformConfig.upsert({
    where: { key: MOBILE_RUNTIME_FLAGS_KEY },
    create: {
      key: MOBILE_RUNTIME_FLAGS_KEY,
      value: JSON.stringify(next),
    },
    update: {
      value: JSON.stringify(next),
    },
  });

  return next;
}

/** Checks if a capability is enabled for a given client device */
export function isMobileCapabilityEnabled(
  flags: MobileRuntimeFlags,
  capability: MobileCapabilityKey,
  deviceClass: "desktop" | "ios" | "android" | "other"
): boolean {
  // If request is from desktop, mobile-specific disable switches don't block desktop
  if (deviceClass === "desktop") return true;

  // On mobile devices (ios/android/other), respect the admin flag
  return flags[capability] !== false;
}

export class MobileCapabilityDisabledError extends Error {
  readonly capability: MobileCapabilityKey;
  readonly deviceClass: string;

  constructor(capability: MobileCapabilityKey, deviceClass: string) {
    super(`Mobile capability '${capability}' is temporarily paused by Admin.`);
    this.name = "MobileCapabilityDisabledError";
    this.capability = capability;
    this.deviceClass = deviceClass;
  }
}

/** Asserts that a capability is enabled. Throws MobileCapabilityDisabledError if disabled on mobile. */
export async function assertMobileCapabilityAllowed(
  capability: MobileCapabilityKey,
  userAgent?: string | null,
  providedFlags?: MobileRuntimeFlags
): Promise<void> {
  const device = parseClientDevice(userAgent);
  if (device.deviceClass === "desktop") return;

  const flags = providedFlags || (await getMobileRuntimeFlags());
  if (!isMobileCapabilityEnabled(flags, capability, device.deviceClass)) {
    throw new MobileCapabilityDisabledError(capability, device.deviceClass);
  }
}

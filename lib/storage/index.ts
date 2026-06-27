import { StorageProvider } from "./types";
import { BackblazeProvider } from "./backblaze";
import { R2Provider } from "./r2";

export * from "./types";

export const defaultProvider: StorageProvider = new BackblazeProvider();
export const legacyProvider: StorageProvider = new R2Provider();

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let mediaPath = "";
  // 1. If it already starts with /api/media/ or http://.../api/media/, extract the key
  const apiMediaIndex = url.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    mediaPath = url.slice(apiMediaIndex + "/api/media/".length);
  } else {
    // 2. Extract storage key robustly
    const match = url.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
    if (match) {
      mediaPath = `${match[1]}/${match[2]}`;
    }
  }

  if (!mediaPath) {
    return url;
  }

  // 3. Determine browser media URL mode dynamically
  const mode = process.env.BROWSER_MEDIA_URL_MODE || process.env.NEXT_PUBLIC_BROWSER_MEDIA_URL_MODE || "b2";

  if (mode === "proxy") {
    return `/api/media/${mediaPath}`;
  }

  if (mode === "cdn") {
    const cdnBase = process.env.BROWSER_CDN_BASE_URL || process.env.NEXT_PUBLIC_BROWSER_CDN_BASE_URL || "";
    if (cdnBase) {
      return `${cdnBase.replace(/\/+$/, "")}/${mediaPath}`;
    }
    // Fall back to B2 direct if CDN base is not configured
  }

  // default mode: "b2" - return direct public URL from Backblaze B2 provider
  const matchParts = mediaPath.match(/^(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (matchParts) {
    return defaultProvider.getPublicUrl(matchParts[1], matchParts[2]);
  }

  return defaultProvider.getPublicUrl("", mediaPath);
}

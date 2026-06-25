import { StorageProvider } from "./types";
import { BackblazeProvider } from "./backblaze";
import { R2Provider } from "./r2";

export * from "./types";

export const defaultProvider: StorageProvider = new BackblazeProvider();
export const legacyProvider: StorageProvider = new R2Provider();

function extractMediaPath(url: string): string | null {
  const apiMediaIndex = url.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    return url.slice(apiMediaIndex + "/api/media/".length);
  }

  let mediaPath = "";
  const match = url.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
  if (match) {
    mediaPath = `${match[1]}/${match[2]}`;
  }
  return mediaPath || null;
}

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If it's already an /api/media URL, return as is
  if (url.includes("/api/media/")) {
    return url;
  }

  const mediaPath = extractMediaPath(url);
  if (!mediaPath) {
    return url;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.saadstudio.app";
  const cleanSite = siteUrl.replace(/\/+$/, "");
  return `${cleanSite}/api/media/${mediaPath}`;
}

export function getObjectKeyFromUrl(url: string): string | null {
  return extractMediaPath(url);
}

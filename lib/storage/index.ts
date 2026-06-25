import { StorageProvider } from "./types";
import { BackblazeProvider } from "./backblaze";
import { R2Provider } from "./r2";

export * from "./types";

export const defaultProvider: StorageProvider = new BackblazeProvider();
export const legacyProvider: StorageProvider = new R2Provider();

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let mediaPath = "";
  // Extract storage key robustly
  const match = url.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
  if (match) {
    mediaPath = `${match[1]}/${match[2]}`;
  }

  if (!mediaPath) {
    return url;
  }

  // Determine if it is a default (Backblaze B2) URL or a legacy (Cloudflare R2) URL
  if (defaultProvider.isStoredAssetUrl(url)) {
    return defaultProvider.getPublicUrl("", mediaPath);
  }

  if (legacyProvider.isStoredAssetUrl(url)) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.saadstudio.app";
    const cleanSite = siteUrl.replace(/\/+$/, "");
    return `${cleanSite}/api/media/${mediaPath}`;
  }

  // Fallback default format
  return defaultProvider.getPublicUrl("", mediaPath);
}

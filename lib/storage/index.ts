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

  // 3. We should ALWAYS return the relative proxy URL format: `/api/media/${mediaPath}`
  return `/api/media/${mediaPath}`;
}

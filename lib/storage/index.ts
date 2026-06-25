import { StorageProvider } from "./types";
import { BackblazeProvider } from "./backblaze";
import { R2Provider } from "./r2";

export * from "./types";

export const defaultProvider: StorageProvider = new BackblazeProvider();
export const legacyProvider: StorageProvider = new R2Provider();

import { resolveMediaUrl, extractObjectKey } from "../media-gateway";

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  return resolveMediaUrl(url);
}

export function getObjectKeyFromUrl(url: string): string | null {
  return extractObjectKey(url);
}

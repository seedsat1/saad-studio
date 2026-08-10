import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

export function getFallbackUrls(url: string | null | undefined, _isDownload = false): string[] {
  if (!url) return [];

  // 1. If it is a task placeholder, return empty to prevent browser requests
  if (url.includes("task:") || url.startsWith("task:")) {
    return [];
  }

  // 2. If it is a data/blob/gradient URL, return as-is
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("gradient:")
  ) {
    return [url];
  }

  let mediaPath = "";
  const apiMediaIndex = url.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    mediaPath = url.slice(apiMediaIndex + "/api/media/".length);
  } else {
    const match = url.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/([^?#]+)/i);
    if (match) {
      mediaPath = `${match[1]}/${match[2]}`;
    }
  }

  // 3. If it is an unrelated external URL, return as-is to bypass R2/B2 fallback timeouts
  let sourceHost = "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const host = parsed.host.toLowerCase();
      sourceHost = host;
      const isOurStorage =
        host.includes("r2.dev") ||
        host.includes("backblazeb2.com") ||
        host.includes("saadstudio.app") ||
        host.includes("supabase.co") ||
        host.includes("supabase.in") ||
        host.includes("localhost") ||
        host.includes("127.0.0.1");

      if (!isOurStorage) {
        return [url];
      }
    } catch (e) {
      // ignore
    }
  }

  if (!mediaPath) {
    return [url];
  }

  const fallbacks: string[] = [];
  const apiMediaUrl = `/api/media/${mediaPath}`;
  const isLegacySupabaseUrl = sourceHost.includes("supabase.co") || sourceHost.includes("supabase.in");

  const directB2Url = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com";

  // 1. Backblaze B2 (New Storage - Friendly & S3 Direct)
  let publicBaseUrl = (
    process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_B2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    ""
  ).replace(/\/+$/, "");

  if (!publicBaseUrl || publicBaseUrl.includes(".r2.dev") || publicBaseUrl.includes("media.saadstudio.app")) {
    publicBaseUrl = "https://f003.backblazeb2.com/file/saadstudio-storage";
  }

  if (!_isDownload && isLegacySupabaseUrl) {
    // Legacy Supabase URLs may no longer resolve in the browser; proxy first and
    // let /api/media choose the current B2 or legacy R2 provider.
    fallbacks.push(apiMediaUrl);
  }

  if (_isDownload) {
    // Prioritize direct S3 URL first for downloads/CORS
    fallbacks.push(`${directB2Url}/${mediaPath}`);
    if (publicBaseUrl !== directB2Url) {
      fallbacks.push(`${publicBaseUrl}/${mediaPath}`);
    }
  } else {
    // Prioritize friendly B2 URL first for modern HTTP (HTTP/2) support and multiplexing
    fallbacks.push(`${publicBaseUrl}/${mediaPath}`);
    if (publicBaseUrl !== directB2Url) {
      fallbacks.push(`${directB2Url}/${mediaPath}`);
    }
  }

  // 2. /api/media (Emergency Fallback - Proxy)
  // Safe for all assets (including videos) because /api/media streams directly rather than buffering in memory.
  fallbacks.push(apiMediaUrl);

  // 3. Cloudflare R2 (Old Storage - Direct)
  const rawR2Url = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";
  fallbacks.push(`${rawR2Url}/${mediaPath}`);

  // Deduplicate while preserving order
  const uniqueFallbacks: string[] = [];
  for (const f of fallbacks) {
    if (!uniqueFallbacks.includes(f)) {
      uniqueFallbacks.push(f);
    }
  }

  return uniqueFallbacks;
}

export const SITE_CREATION_DATE = "3/22/2026";

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
    const match = url.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
    if (match) {
      mediaPath = `${match[1]}/${match[2]}`;
    }
  }

  if (!mediaPath) {
    return [url];
  }

  const fallbacks: string[] = [];

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

  fallbacks.push(`${publicBaseUrl}/${mediaPath}`);

  const directB2Url = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com";
  if (publicBaseUrl !== directB2Url) {
    fallbacks.push(`${directB2Url}/${mediaPath}`);
  }

  // 2. /api/media (Emergency Fallback - Proxy)
  // Safe for all assets (including videos) because /api/media streams directly rather than buffering in memory.
  fallbacks.push(`/api/media/${mediaPath}`);

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
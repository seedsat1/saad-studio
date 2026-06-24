import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

export function getFallbackUrls(url: string | null | undefined, isDownload = false): string[] {
  if (!url) return [];
  
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("gradient:")
  ) {
    return [url];
  }
  
  let mediaPath = "";
  const patterns = [
    /https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev\/(.+)/i,
    /https:\/\/media\.saadstudio\.app\/(.+)/i,
    /https?:\/\/(?:www\.)?saadstudio\.app\/api\/media\/(.+)/i,
    /^\/api\/media\/(.+)/i,
  ];

  for (const regex of patterns) {
    const match = url.match(regex);
    if (match?.[1]) {
      mediaPath = match[1];
      break;
    }
  }

  if (!mediaPath) {
    return [url];
  }

  const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v|flv|3gp)(?:\?|$)/i.test(mediaPath.toLowerCase());

  const fallbacks = [
    `https://media.saadstudio.app/${mediaPath}`,
    `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/${mediaPath}`
  ];

  // If it's a video file in preview/stream context, do not route through Vercel proxy.
  if (!isVideo || isDownload) {
    fallbacks.push(`/api/media/${mediaPath}`);
  }

  return fallbacks;
}
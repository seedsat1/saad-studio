import { MediaProvider } from "./types";
import { BackblazePublicProvider } from "./backblaze";
import { R2Provider } from "./r2";

export * from "./types";

const providers: Record<string, MediaProvider> = {
  backblaze: new BackblazePublicProvider(),
  r2: new R2Provider(),
};

export function getProvider(name?: string): MediaProvider | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  return providers[clean] || null;
}

export function getActiveProvider(): MediaProvider {
  const activeName = process.env.MEDIA_PROVIDER || "backblaze";
  const provider = getProvider(activeName);
  if (!provider) {
    return providers.backblaze;
  }
  return provider;
}

export function getFallbackProvider(): MediaProvider | null {
  const fallbackName = process.env.MEDIA_FALLBACK_PROVIDER || "r2";
  if (!fallbackName || fallbackName === "none") return null;
  return getProvider(fallbackName);
}

export function getDeliveryMode(): "proxy" | "redirect" {
  const mode = process.env.MEDIA_DELIVERY_MODE || "proxy";
  return mode === "redirect" ? "redirect" : "proxy";
}

/**
 * Extracts raw object key from url or legacy urls
 */
export function extractObjectKey(url: string | null | undefined): string | null {
  if (!url) return null;

  // Handle double api/media prefix first: /api/media/media/videos/... -> /api/media/videos/...
  let cleanUrl = url;
  if (cleanUrl.includes("/api/media/media/")) {
    cleanUrl = cleanUrl.replace("/api/media/media/", "/api/media/");
  }

  // Handle standard /api/media/ prefix
  const apiMediaIndex = cleanUrl.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    return cleanUrl.slice(apiMediaIndex + "/api/media/".length);
  }

  try {
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      const parsed = new URL(cleanUrl);
      
      // Check for Backblaze public URL pattern: f003.backblazeb2.com/file/saadstudio-storage/videos/...
      if (parsed.host === "f003.backblazeb2.com" && parsed.pathname.startsWith("/file/saadstudio-storage/")) {
        return parsed.pathname.slice("/file/saadstudio-storage/".length);
      }
      
      // Check for R2 public URL pattern
      if (parsed.host.includes("r2.dev") || parsed.host.includes("backblazeb2.com")) {
        return parsed.pathname.replace(/^\/+/, "");
      }
    }
  } catch (e) {
    // ignore
  }

  // Fallback pattern matching for local/relative or standard format
  let mediaPath = "";
  const match = cleanUrl.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
  if (match) {
    mediaPath = `${match[1]}/${match[2]}`;
  }
  return mediaPath || cleanUrl; // fallback to original if not matched, to support direct relative keys
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // 1. If it is a task placeholder, it is not a media file. Return null to prevent requesting it.
  if (url.includes("task:") || url.startsWith("task:")) {
    return null;
  }

  // 2. If it is an external URL (e.g. tempfile.aiquickdraw.com), return as-is so browser loads it directly.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const host = parsed.host.toLowerCase();
      const isOurStorage =
        host.includes("r2.dev") ||
        host.includes("backblazeb2.com") ||
        host.includes("saadstudio.app") ||
        host.includes("localhost") ||
        host.includes("127.0.0.1");

      if (!isOurStorage) {
        return url;
      }
    } catch (e) {
      // ignore
    }
  }

  const key = extractObjectKey(url);
  if (!key) return url;

  // Expected returns: relative paths starting with /api/media/
  return `/api/media/${key}`;
}

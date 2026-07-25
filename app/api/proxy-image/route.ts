/**
 * Server-side image proxy.
 *
 * Fetches an external image URL server-side (no CORS issues) and streams it
 * back to the browser. Used by the video gallery picker so users can select
 * previously-generated images without cross-origin fetch errors.
 *
 * Security:
 *  - Requires authenticated session (Clerk)
 *  - Blocks private/loopback/link-local IP ranges (SSRF protection)
 *  - Only allows http(s) schemes
 *  - URL must point to an allowed external host
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFallbackUrls } from "@/lib/utils";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

/** Returns true only if the hostname is a real external host (basic SSRF guard). */
function isSafeExternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // Loopback & localhost
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") return false;

  // Link-local (AWS metadata, Docker, etc.)
  if (h === "169.254.169.254") return false;
  if (h.startsWith("169.254.")) return false;

  // Private IPv4 ranges
  if (h.startsWith("10.")) return false;
  if (h.startsWith("192.168.")) return false;
  // 172.16.0.0 – 172.31.255.255
  const parts = h.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return false;
  }

  // mDNS / local domain
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;

  return true;
}

export async function GET(req: NextRequest) {
  // Require authentication — only logged-in users may proxy images
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Block proxying of video files early.
  const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v|flv|3gp)(?:\?|$)/i.test(rawUrl.toLowerCase());
  if (isVideo) {
    return new NextResponse("Videos cannot be proxied through this route. Load directly from direct R2/custom domain instead.", { status: 400 });
  }

  // Resolve candidate URLs (supports relative paths like "images/user_..." as well as absolute URLs)
  const candidateUrls = getFallbackUrls(rawUrl);
  if (!candidateUrls.includes(rawUrl) && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"))) {
    candidateUrls.unshift(rawUrl);
  }

  const validFetchUrls: string[] = [];
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.saadstudio.app";

  for (const cUrl of candidateUrls) {
    try {
      const fullUrl = cUrl.startsWith("/") ? `${appBaseUrl}${cUrl}` : cUrl;
      const parsed = new URL(fullUrl);

      if (!ALLOWED_SCHEMES.has(parsed.protocol)) continue;
      if (!isSafeExternalHost(parsed.hostname)) continue;

      const candidateIsVideo = /\.(mp4|mov|webm|avi|mkv|m4v|flv|3gp)(?:\?|$)/i.test(parsed.pathname.toLowerCase());
      if (candidateIsVideo) continue;

      if (!validFetchUrls.includes(fullUrl)) {
        validFetchUrls.push(fullUrl);
      }
    } catch {
      // Ignore invalid candidates
    }
  }

  if (!validFetchUrls.length) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    let upstream: Response | null = null;
    let lastError: any = null;

    for (const fetchUrl of validFetchUrls) {
      try {
        console.log("[api/proxy-image] Attempting fetch from:", fetchUrl);
        upstream = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(30_000),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NextJS-ImageProxy/1.0)",
          },
        });

        if (upstream.ok) {
          break;
        } else {
          console.warn(`[api/proxy-image] Failed to fetch from ${fetchUrl}: Status ${upstream.status}`);
        }
      } catch (err) {
        lastError = err;
        console.warn(`[api/proxy-image] Error fetching from ${fetchUrl}:`, err);
      }
    }

    if (!upstream || !upstream.ok) {
      return new NextResponse(
        `Failed to fetch upstream resource after trying fallbacks. Last error: ${lastError?.message || "status " + upstream?.status}`,
        { status: upstream?.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";

    // Only proxy image content types
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Upstream resource is not an image", { status: 415 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        // Cache for 1 hour in the browser; 30 min at CDN edge
        "Cache-Control": "public, max-age=3600, s-maxage=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy fetch failed";
    console.error("[api/proxy-image] Error fetching", rawUrl, message);
    return new NextResponse("Proxy error", { status: 502 });
  }
}

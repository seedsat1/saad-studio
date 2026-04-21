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

  // Validate the URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return new NextResponse("URL scheme not allowed", { status: 400 });
  }

  if (!isSafeExternalHost(parsed.hostname)) {
    return new NextResponse("URL host not allowed", { status: 400 });
  }

  try {
    const upstream = await fetch(rawUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        // Some CDNs require a browser-like user-agent
        "User-Agent": "Mozilla/5.0 (compatible; NextJS-ImageProxy/1.0)",
      },
    });

    if (!upstream.ok) {
      return new NextResponse("Failed to fetch upstream image", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

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

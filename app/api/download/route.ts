import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFallbackUrls } from "@/lib/utils";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

function isSafeExternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") return false;
  if (h === "169.254.169.254" || h.startsWith("169.254.")) return false;
  if (h.startsWith("10.") || h.startsWith("192.168.")) return false;

  const parts = h.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return false;
  }

  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;

  return true;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "saad-download";
}

function inferExtension(contentType: string, sourceUrl: string): string {
  const pathExt = new URL(sourceUrl).pathname.split(".").pop()?.toLowerCase();
  if (pathExt && /^[a-z0-9]{2,5}$/.test(pathExt)) return pathExt;
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "bin";
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

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
    const urls = getFallbackUrls(rawUrl, true);
    let upstream: Response | null = null;
    let lastError: any = null;

    for (const url of urls) {
      try {
        console.log("[api/download] Attempting fetch from:", url);
        const fetchUrl = url.startsWith("/")
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://www.saadstudio.app"}${url}`
          : url;

        upstream = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(30_000),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SaadStudioDownload/1.0)",
          },
        });

        if (upstream.ok) {
          break;
        } else {
          console.warn(`[api/download] Failed to fetch from ${url}: Status ${upstream.status}`);
        }
      } catch (err) {
        lastError = err;
        console.warn(`[api/download] Error fetching from ${url}:`, err);
      }
    }

    if (!upstream || !upstream.ok) {
      return new NextResponse(
        `Failed to fetch upstream file after trying all fallbacks. Last error: ${lastError?.message || "status " + upstream?.status}`,
        { status: upstream?.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const requestedFilename = sanitizeFilename(req.nextUrl.searchParams.get("filename") || "saad-download");
    const extension = inferExtension(contentType, rawUrl);
    const filename = /\.[a-z0-9]{2,5}$/i.test(requestedFilename)
      ? requestedFilename
      : `${requestedFilename}.${extension}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download fetch failed";
    console.error("[api/download] Error fetching", rawUrl, message);
    return new NextResponse("Download error", { status: 502 });
  }
}

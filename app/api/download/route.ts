import { NextRequest } from "next/server";
import { getFallbackUrls } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download";

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const urlsToTry = (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))
      ? [targetUrl]
      : getFallbackUrls(targetUrl);

    let res: Response | null = null;
    let finalTargetUrl = targetUrl;

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, { method: "GET" });
        if (response.ok) {
          res = response;
          finalTargetUrl = url;
          break;
        }
      } catch (err) {
        console.warn(`[DOWNLOAD_ROUTE] Failed to fetch from ${url}:`, err);
      }
    }

    if (!res) {
      return new Response("Failed to fetch file from any storage location", { status: 404 });
    }

    const parsed = new URL(finalTargetUrl);

    // Try to guess the extension from the URL path first
    let ext = "";
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.endsWith(".mp3")) ext = ".mp3";
    else if (pathname.endsWith(".wav")) ext = ".wav";
    else if (pathname.endsWith(".mp4")) ext = ".mp4";
    else if (pathname.endsWith(".mov")) ext = ".mov";
    else if (pathname.endsWith(".png")) ext = ".png";
    else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) ext = ".jpg";
    else if (pathname.endsWith(".webp")) ext = ".webp";
    else if (pathname.endsWith(".gif")) ext = ".gif";

    // If not found in URL path, fallback to Content-Type header
    if (!ext) {
      const contentType = res.headers.get("Content-Type")?.toLowerCase() || "";
      if (contentType.includes("image/png")) ext = ".png";
      else if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) ext = ".jpg";
      else if (contentType.includes("image/webp")) ext = ".webp";
      else if (contentType.includes("image/gif")) ext = ".gif";
      else if (contentType.includes("video/mp4")) ext = ".mp4";
      else if (contentType.includes("video/quicktime")) ext = ".mov";
      else if (contentType.includes("audio/mpeg") || contentType.includes("audio/mp3")) ext = ".mp3";
      else if (contentType.includes("audio/wav")) ext = ".wav";
    }

    // Clean up filename by removing illegal OS characters, and make sure it has the correct extension
    let finalFilename = filename.replace(/[\\\/:*?"<>|]/g, "_").trim() || "download";
    if (ext && !finalFilename.toLowerCase().endsWith(ext)) {
      finalFilename = `${finalFilename}${ext}`;
    }

    const headers = new Headers();
    // Force browser to download the file directly using standard RFC 6266
    headers.set("Content-Disposition", `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    headers.set("Content-Type", res.headers.get("Content-Type") || "application/octet-stream");
    
    // Explicitly allow same-origin requests
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("[api/download] Proxy error", err);
    return new Response(`Download error: ${err.message}`, { status: 500 });
  }
}

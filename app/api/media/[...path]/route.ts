import { NextRequest, NextResponse } from "next/server";
import { defaultProvider, legacyProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Accept-Ranges": "bytes",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function fixContentType(contentType: string | undefined, key: string): string {
  const lowerKey = key.toLowerCase();
  const rawCt = (contentType || "").toLowerCase();
  
  if (lowerKey.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (lowerKey.endsWith(".bin")) {
    if (lowerKey.includes("videos/") || rawCt.startsWith("video/")) {
      return "video/mp4";
    }
  }
  if (lowerKey.endsWith(".vtt")) {
    return "text/vtt; charset=utf-8";
  }
  if (lowerKey.endsWith(".srt")) {
    return "text/srt; charset=utf-8";
  }
  if (lowerKey.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lowerKey.endsWith(".wav")) {
    return "audio/wav";
  }
  if (lowerKey.endsWith(".png")) {
    return "image/png";
  }
  if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerKey.endsWith(".webp")) {
    return "image/webp";
  }
  return contentType || "application/octet-stream";
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
    }

    const key = pathParts.join("/");
    const decodedKey = decodeURIComponent(key);
    const requestedPath = req.nextUrl.pathname;

    console.log(`[api/media HEAD] Requested Path: ${requestedPath}`);
    console.log(`[api/media HEAD] Decoded Object Key: ${decodedKey}`);

    // 1. Try default provider (Backblaze B2)
    try {
      const exists = await defaultProvider.exists({ bucket: "", path: decodedKey });
      console.log(`[api/media HEAD] Backblaze B2 - Path: ${decodedKey} | Exists: ${exists}`);
      if (exists) {
        const metadata = await defaultProvider.download({ bucket: "", path: decodedKey });
        const fixedCt = fixContentType(metadata.contentType, decodedKey);
        console.log(`[api/media HEAD] Serving from Backblaze B2 | Key: ${decodedKey} | Content-Type: ${fixedCt}`);
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Type": fixedCt,
            "Content-Length": String(metadata.totalSize),
            "Cache-Control": metadata.cacheControl,
            ...corsHeaders,
          },
        });
      }
    } catch (err) {
      console.warn("[api/media HEAD] Default provider failed for key:", decodedKey, err);
    }

    // 2. Try legacy provider (Cloudflare R2)
    try {
      const exists = await legacyProvider.exists({ bucket: "", path: decodedKey });
      console.log(`[api/media HEAD] Cloudflare R2 (Legacy) - Path: ${decodedKey} | Exists: ${exists}`);
      if (exists) {
        const metadata = await legacyProvider.download({ bucket: "", path: decodedKey });
        const fixedCt = fixContentType(metadata.contentType, decodedKey);
        console.log(`[api/media HEAD] Serving from Cloudflare R2 | Key: ${decodedKey} | Content-Type: ${fixedCt}`);
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Type": fixedCt,
            "Content-Length": String(metadata.totalSize),
            "Cache-Control": metadata.cacheControl,
            ...corsHeaders,
          },
        });
      }
    } catch (err) {
      console.warn("[api/media HEAD] Legacy provider failed for key:", decodedKey, err);
    }

    console.warn(`[api/media HEAD] Key not found in any provider: ${decodedKey}`);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("[api/media HEAD] Global failure:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
    }

    const key = pathParts.join("/");
    const decodedKey = decodeURIComponent(key);
    const requestedPath = req.nextUrl.pathname;
    const range = req.headers.get("range") || undefined;

    console.log(`[api/media GET] Requested Path: ${requestedPath}`);
    console.log(`[api/media GET] Decoded Object Key: ${decodedKey}`);

    // 1. Try default provider (Backblaze B2)
    try {
      const exists = await defaultProvider.exists({ bucket: "", path: decodedKey });
      console.log(`[api/media GET] Backblaze B2 - Path: ${decodedKey} | Exists: ${exists}`);
      if (exists) {
        const response = await defaultProvider.download({ bucket: "", path: decodedKey, range });
        const fixedCt = fixContentType(response.contentType, decodedKey);
        console.log(`[api/media GET] Serving from Backblaze B2 | Key: ${decodedKey} | Content-Type: ${fixedCt} | Range: ${range}`);
        
        const responseHeaders: Record<string, string> = {
          "Content-Type": fixedCt,
          "Cache-Control": response.cacheControl,
          ...corsHeaders,
        };

        if (response.contentRange) {
          responseHeaders["Content-Range"] = response.contentRange;
          responseHeaders["Content-Length"] = String(response.contentLength);
        } else {
          responseHeaders["Content-Length"] = String(response.totalSize);
        }

        if (response.etag) responseHeaders["ETag"] = response.etag;
        if (response.lastModified) responseHeaders["Last-Modified"] = response.lastModified;

        return new NextResponse(response.body as ReadableStream, {
          status: range ? 206 : 200,
          headers: responseHeaders,
        });
      }
    } catch (err) {
      console.warn("[api/media GET] Default provider failed for key:", decodedKey, err);
    }

    // 2. Try legacy provider (Cloudflare R2)
    try {
      const exists = await legacyProvider.exists({ bucket: "", path: decodedKey });
      console.log(`[api/media GET] Cloudflare R2 (Legacy) - Path: ${decodedKey} | Exists: ${exists}`);
      if (exists) {
        const response = await legacyProvider.download({ bucket: "", path: decodedKey, range });
        const fixedCt = fixContentType(response.contentType, decodedKey);
        console.log(`[api/media GET] Serving from Cloudflare R2 | Key: ${decodedKey} | Content-Type: ${fixedCt} | Range: ${range}`);
        
        const responseHeaders: Record<string, string> = {
          "Content-Type": fixedCt,
          "Cache-Control": response.cacheControl,
          ...corsHeaders,
        };

        if (response.contentRange) {
          responseHeaders["Content-Range"] = response.contentRange;
          responseHeaders["Content-Length"] = String(response.contentLength);
        } else {
          responseHeaders["Content-Length"] = String(response.totalSize);
        }

        if (response.etag) responseHeaders["ETag"] = response.etag;
        if (response.lastModified) responseHeaders["Last-Modified"] = response.lastModified;

        return new NextResponse(response.body as any, {
          status: range ? 206 : 200,
          headers: responseHeaders,
        });
      }
    } catch (err) {
      console.warn("[api/media GET] Legacy provider failed for key:", decodedKey, err);
    }

    console.warn(`[api/media GET] Key not found in any provider: ${decodedKey}`);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("[api/media GET] Global failure:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}

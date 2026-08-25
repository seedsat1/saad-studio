import { NextRequest, NextResponse } from "next/server";
import { headObject, readObject } from "@/lib/storage";

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

    const read = await readObject({ objectKey: decodedKey });
    if (read) {
      const metadata = read.response;
      const fixedCt = fixContentType(metadata.contentType, decodedKey);
      console.log(
        `[api/media HEAD] Serving from ${read.providerLabel} | Key: ${decodedKey} | Content-Type: ${fixedCt}`,
      );
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

    const attempts = await headObject({ objectKey: decodedKey }).catch(() => []);
    console.warn(`[api/media HEAD] Key not found in storage runtime: ${decodedKey}`, attempts);
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

    const read = await readObject({ objectKey: decodedKey, range });
    if (read) {
      const response = read.response;
      const fixedCt = fixContentType(response.contentType, decodedKey);
      console.log(
        `[api/media GET] Serving from ${read.providerLabel} | Key: ${decodedKey} | Content-Type: ${fixedCt} | Range: ${range}`,
      );

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

    // Fallback: If not found in storage providers, attempt direct fetch from storage public endpoint
    const b2FallbackUrl = `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/${decodedKey}`;
    try {
      const b2Res = await fetch(b2FallbackUrl, { signal: AbortSignal.timeout(6000) });
      if (b2Res.ok) {
        const buffer = Buffer.from(await b2Res.arrayBuffer());
        const fixedCt = fixContentType(b2Res.headers.get("content-type") || undefined, decodedKey);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": fixedCt,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=31536000, immutable",
            ...corsHeaders,
          },
        });
      }
    } catch {}

    const attempts = await headObject({ objectKey: decodedKey }).catch(() => []);
    console.warn(`[api/media GET] Key not found in storage runtime: ${decodedKey}`, attempts);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("[api/media GET] Global failure:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}

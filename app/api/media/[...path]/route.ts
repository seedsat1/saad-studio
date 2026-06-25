import { NextRequest, NextResponse } from "next/server";
import { defaultProvider, legacyProvider } from "@/lib/storage";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Accept-Ranges": "bytes",
};

function fixContentType(contentType: string | null | undefined, key: string): string {
  // If it's a .bin file but likely video based on key, use video/mp4
  if ((!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") && key.includes("video")) {
    return "video/mp4";
  }
  
  // If key ends with .mp4, ensure content type is video/mp4
  if (key.toLowerCase().endsWith(".mp4")) {
    return "video/mp4";
  }
  
  // If key ends with .webm, ensure video/webm
  if (key.toLowerCase().endsWith(".webm")) {
    return "video/webm";
  }
  
  // If key ends with .jpg/jpeg, ensure image/jpeg
  if (key.toLowerCase().endsWith(".jpg") || key.toLowerCase().endsWith(".jpeg")) {
    return "image/jpeg";
  }
  
  // If key ends with .png, ensure image/png
  if (key.toLowerCase().endsWith(".png")) {
    return "image/png";
  }
  
  // If key ends with .webp, ensure image/webp
  if (key.toLowerCase().endsWith(".webp")) {
    return "image/webp";
  }
  
  return contentType || "application/octet-stream";
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathParts = params.path || [];
  if (pathParts.length === 0) {
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }

  const key = pathParts.join("/");
  console.log(`[api/media HEAD] Requested path: ${key}`);

  // 1. Try default provider (Backblaze B2)
  try {
    const exists = await defaultProvider.exists({ bucket: "", path: key });
    console.log(`[api/media HEAD] Default provider (Backblaze B2) exists: ${exists}`);
    if (exists) {
      const metadata = await defaultProvider.download({ bucket: "", path: key });
      const fixedContentType = fixContentType(metadata.contentType, key);
      console.log(`[api/media HEAD] Default provider metadata: content-type=${fixedContentType}, size=${metadata.totalSize}`);
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Content-Type": fixedContentType,
          "Content-Length": String(metadata.totalSize),
          "Cache-Control": metadata.cacheControl,
          ...corsHeaders,
        },
      });
    }
  } catch (err) {
    console.warn("[api/media HEAD] Default provider failed for key:", key, err);
  }

  // 2. Try legacy provider (Cloudflare R2)
  try {
    const metadata = await legacyProvider.download({ bucket: "", path: key });
    const fixedContentType = fixContentType(metadata.contentType, key);
    console.log(`[api/media HEAD] Legacy provider (Cloudflare R2) metadata: content-type=${fixedContentType}, size=${metadata.totalSize}`);
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": fixedContentType,
        "Content-Length": String(metadata.totalSize),
        "Cache-Control": metadata.cacheControl,
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.warn("[api/media HEAD] Legacy provider failed for key:", key, err);
  }

  return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathParts = params.path || [];
  if (pathParts.length === 0) {
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }

  const key = pathParts.join("/");
  const range = req.headers.get("range") || undefined;
  console.log(`[api/media GET] Requested path: ${key}, range: ${range}`);

  // 1. Try default provider (Backblaze B2)
  try {
    const exists = await defaultProvider.exists({ bucket: "", path: key });
    console.log(`[api/media GET] Default provider (Backblaze B2) exists: ${exists}`);
    if (exists) {
      const response = await defaultProvider.download({ bucket: "", path: key, range });
      const fixedContentType = fixContentType(response.contentType, key);
      
      const responseHeaders: Record<string, string> = {
        "Content-Type": fixedContentType,
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

      console.log(`[api/media GET] Serving from default provider, content-type: ${fixedContentType}, status: ${range ? 206 : 200}`);
      return new NextResponse(response.body as ReadableStream, {
        status: range ? 206 : 200,
        headers: responseHeaders,
      });
    }
  } catch (err) {
    console.warn("[api/media GET] Default provider failed for key:", key, err);
  }

  // 2. Try legacy provider (Cloudflare R2)
  try {
    const response = await legacyProvider.download({ bucket: "", path: key, range });
    const fixedContentType = fixContentType(response.contentType, key);
    
    const responseHeaders: Record<string, string> = {
      "Content-Type": fixedContentType,
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

    console.log(`[api/media GET] Serving from legacy provider, content-type: ${fixedContentType}, status: ${range ? 206 : 200}`);
    return new NextResponse(response.body as any, {
      status: range ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.warn("[api/media GET] Legacy provider failed for key:", key, err);
  }

  return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
}

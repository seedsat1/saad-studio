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

    // 1. Try default provider (Backblaze B2)
    try {
      const exists = await defaultProvider.exists({ bucket: "", path: key });
      if (exists) {
        const metadata = await defaultProvider.download({ bucket: "", path: key });
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Type": metadata.contentType,
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
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Content-Type": metadata.contentType,
          "Content-Length": String(metadata.totalSize),
          "Cache-Control": metadata.cacheControl,
          ...corsHeaders,
        },
      });
    } catch (err) {
      console.warn("[api/media HEAD] Legacy provider failed for key:", key, err);
    }

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
    const range = req.headers.get("range") || undefined;

    // 1. Try default provider (Backblaze B2)
    try {
      const exists = await defaultProvider.exists({ bucket: "", path: key });
      if (exists) {
        const response = await defaultProvider.download({ bucket: "", path: key, range });
        
        const responseHeaders: Record<string, string> = {
          "Content-Type": response.contentType,
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
      console.warn("[api/media GET] Default provider failed for key:", key, err);
    }

    // 2. Try legacy provider (Cloudflare R2)
    try {
      const response = await legacyProvider.download({ bucket: "", path: key, range });
      
      const responseHeaders: Record<string, string> = {
        "Content-Type": response.contentType,
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
    } catch (err) {
      console.warn("[api/media GET] Legacy provider failed for key:", key, err);
    }

    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("[api/media GET] Global failure:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}

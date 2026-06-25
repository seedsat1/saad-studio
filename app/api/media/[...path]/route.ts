import { NextRequest, NextResponse } from "next/server";
import { getActiveProvider, getFallbackProvider, getDeliveryMode, extractObjectKey } from "@/lib/media-gateway";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Accept-Ranges": "bytes",
};

function fixContentType(contentType: string | null | undefined, key: string): string {
  if ((!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") && key.includes("video")) {
    return "video/mp4";
  }
  if (key.toLowerCase().endsWith(".mp4")) return "video/mp4";
  if (key.toLowerCase().endsWith(".webm")) return "video/webm";
  if (key.toLowerCase().endsWith(".jpg") || key.toLowerCase().endsWith(".jpeg")) return "image/jpeg";
  if (key.toLowerCase().endsWith(".png")) return "image/png";
  if (key.toLowerCase().endsWith(".webp")) return "image/webp";
  if (key.toLowerCase().endsWith(".srt")) return "text/plain";
  if (key.toLowerCase().endsWith(".vtt")) return "text/vtt";
  return contentType || "application/octet-stream";
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function handleMediaRequest(req: NextRequest, pathParts: string[], method: "GET" | "HEAD") {
  if (pathParts.length === 0) {
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }

  const rawKey = pathParts.join("/");
  const key = extractObjectKey(rawKey);
  if (!key) {
    return new NextResponse("Invalid Path", { status: 400, headers: corsHeaders });
  }

  const range = req.headers.get("range") || undefined;
  console.log(`[api/media ${method}] Requested key: ${key}, range: ${range}`);

  const activeProvider = getActiveProvider();
  const fallbackProvider = getFallbackProvider();
  const deliveryMode = getDeliveryMode();

  // Active Provider check/fetch
  try {
    const publicUrl = activeProvider.getPublicUrl(key);
    
    if (deliveryMode === "redirect" && method === "GET") {
      console.log(`[api/media GET] Redirect mode active. Redirecting to active provider URL: ${publicUrl}`);
      return NextResponse.redirect(publicUrl, { status: 302 });
    }

    const headers: Record<string, string> = {};
    if (range) {
      headers["Range"] = range;
    }

    console.log(`[api/media ${method}] Proxying to active provider: ${activeProvider.name}`);
    const response = await fetch(publicUrl, {
      method,
      headers,
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok || response.status === 206) {
      console.log(`[api/media ${method}] Active provider response OK (${response.status})`);
      const responseHeaders: Record<string, string> = { ...corsHeaders };
      
      const headersToPreserve = [
        "content-type",
        "content-length",
        "accept-ranges",
        "content-range",
        "cache-control",
        "etag",
        "last-modified",
      ];

      for (const h of headersToPreserve) {
        const val = response.headers.get(h);
        if (val) {
          let keyName = h;
          if (h === "content-type") keyName = "Content-Type";
          else if (h === "content-length") keyName = "Content-Length";
          else if (h === "accept-ranges") keyName = "Accept-Ranges";
          else if (h === "content-range") keyName = "Content-Range";
          else if (h === "cache-control") keyName = "Cache-Control";
          else if (h === "etag") keyName = "ETag";
          else if (h === "last-modified") keyName = "Last-Modified";
          responseHeaders[keyName] = val;
        }
      }

      // Ensure Content-Type is correct
      const currentCt = responseHeaders["Content-Type"];
      responseHeaders["Content-Type"] = fixContentType(currentCt, key);

      // Ensure Accept-Ranges is set
      responseHeaders["Accept-Ranges"] = "bytes";

      return new NextResponse(method === "HEAD" ? null : response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } else {
      console.warn(`[api/media ${method}] Active provider returned non-ok status: ${response.status}`);
    }
  } catch (err) {
    console.warn(`[api/media ${method}] Active provider failed:`, err);
  }

  // Fallback Provider check/fetch
  if (fallbackProvider) {
    try {
      const fallbackUrl = fallbackProvider.getPublicUrl(key);
      if (deliveryMode === "redirect" && method === "GET") {
        console.log(`[api/media GET] Redirect mode active. Redirecting to fallback provider URL: ${fallbackUrl}`);
        return NextResponse.redirect(fallbackUrl, { status: 302 });
      }

      const headers: Record<string, string> = {};
      if (range) {
        headers["Range"] = range;
      }

      console.log(`[api/media ${method}] Proxying to fallback provider: ${fallbackProvider.name}`);
      const response = await fetch(fallbackUrl, {
        method,
        headers,
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok || response.status === 206) {
        console.log(`[api/media ${method}] Fallback provider response OK (${response.status})`);
        const responseHeaders: Record<string, string> = { ...corsHeaders };
        
        const headersToPreserve = [
          "content-type",
          "content-length",
          "accept-ranges",
          "content-range",
          "cache-control",
          "etag",
          "last-modified",
        ];

        for (const h of headersToPreserve) {
          const val = response.headers.get(h);
          if (val) {
            let keyName = h;
            if (h === "content-type") keyName = "Content-Type";
            else if (h === "content-length") keyName = "Content-Length";
            else if (h === "accept-ranges") keyName = "Accept-Ranges";
            else if (h === "content-range") keyName = "Content-Range";
            else if (h === "cache-control") keyName = "Cache-Control";
            else if (h === "etag") keyName = "ETag";
            else if (h === "last-modified") keyName = "Last-Modified";
            responseHeaders[keyName] = val;
          }
        }

        responseHeaders["Content-Type"] = fixContentType(responseHeaders["Content-Type"], key);
        responseHeaders["Accept-Ranges"] = "bytes";

        return new NextResponse(method === "HEAD" ? null : response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      }
    } catch (err) {
      console.warn(`[api/media ${method}] Fallback provider failed:`, err);
    }
  }

  return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMediaRequest(req, params.path, "GET");
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMediaRequest(req, params.path, "HEAD");
}

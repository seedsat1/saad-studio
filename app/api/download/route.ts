import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download.mp3";

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    // Validate target URL format
    const parsed = new URL(targetUrl);
    if (!parsed.protocol.startsWith("http")) {
      return new Response("Invalid protocol", { status: 400 });
    }

    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new Response(`Failed to fetch file: ${res.statusText}`, { status: res.status });
    }

    const headers = new Headers();
    // Force browser to download the file directly
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
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

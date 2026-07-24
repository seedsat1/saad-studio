import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { sanitizePrompt } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";

type LabKind = "image" | "video" | "avatar";

function getWaveSpeedKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured on the server.");
  return key;
}

function waveSpeedHeaders() {
  return {
    Authorization: `Bearer ${getWaveSpeedKey()}`,
    "Content-Type": "application/json",
  };
}

function publicBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && /^https?:\/\//i.test(configured)) return configured.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function absolutizeUrl(value: unknown, baseUrl: string): unknown {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
    if (value.startsWith("/")) return `${baseUrl}${value}`;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => absolutizeUrl(item, baseUrl));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = absolutizeUrl(item, baseUrl);
    }
    return out;
  }

  return value;
}

function cleanRoute(value: unknown): string {
  const route = String(value || "").trim().replace(/^\/+/, "");
  if (!route || route.includes("..") || route.includes("?") || route.includes("#")) {
    throw new Error("A valid WaveSpeed route is required.");
  }
  return route;
}

function hasImage(payload: Record<string, unknown>): boolean {
  return Boolean(
    payload.image ||
      payload.image_url ||
      payload.first_frame_url ||
      payload.firstFrameUrl ||
      (Array.isArray(payload.images) && payload.images.length > 0) ||
      (Array.isArray(payload.image_urls) && payload.image_urls.length > 0) ||
      (Array.isArray(payload.reference_image_urls) && payload.reference_image_urls.length > 0),
  );
}

function normalizeRouteForPayload(route: string, payload: Record<string, unknown>): string {
  const withImage = hasImage(payload);
  let nextRoute = route;

  if (withImage) {
    if (nextRoute === "bytedance/seedance-2.0/text-to-video") {
      nextRoute = "bytedance/seedance-2.0/image-to-video";
    } else if (nextRoute === "bytedance/seedance-2.0/text-to-video-turbo") {
      nextRoute = "bytedance/seedance-2.0/image-to-video-turbo";
    } else if (nextRoute === "bytedance/seedance-2.0-mini/text-to-video") {
      nextRoute = "bytedance/seedance-2.0-mini/image-to-video";
    } else if (nextRoute === "bytedance/seedream-v5.0-pro") {
      nextRoute = "bytedance/seedream-v5.0-pro/edit";
    }
  }

  const quality = String(payload.resolution || payload.quality || "").toLowerCase();
  if (quality === "pro" || quality === "1080p") {
    nextRoute = nextRoute
      .replace("kwaivgi/kling-v3.0-std/", "kwaivgi/kling-v3.0-pro/")
      .replace("kwaivgi/kling-v3-turbo-std/", "kwaivgi/kling-v3-turbo-pro/")
      .replace("kwaivgi/kling-v2.6-std/", "kwaivgi/kling-v2.6-pro/")
      .replace("kwaivgi/kling-video-o3-std/", "kwaivgi/kling-video-o3-pro/");
  }

  if (quality === "4k") {
    nextRoute = nextRoute.replace("kwaivgi/kling-video-o3-std/", "kwaivgi/kling-video-o3-4k/");
  }

  return nextRoute;
}

function normalizePayload(kind: LabKind, route: string, rawPayload: Record<string, unknown>, baseUrl: string) {
  const payload = absolutizeUrl(rawPayload, baseUrl) as Record<string, unknown>;

  if (typeof payload.prompt === "string") {
    payload.prompt = sanitizePrompt(payload.prompt, 20000);
  }

  const imageUrls = Array.isArray(payload.image_urls)
    ? payload.image_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!payload.image && !payload.image_url && imageUrls[0]) {
    payload.image = imageUrls[0];
    payload.image_url = imageUrls[0];
  }

  if (kind === "image") {
    const shouldSendImageRefs = route.endsWith("/edit") || route.includes("image-to-image") || imageUrls.length > 0;
    if (shouldSendImageRefs) {
      payload.images = Array.isArray(payload.images) ? payload.images : imageUrls.slice(0, 10);
    } else {
      delete payload.images;
      delete payload.image_urls;
      delete payload.image_url;
      delete payload.image;
    }
    payload.enable_base64_output = false;
    payload.enable_sync_mode = false;
  }

  if (kind === "video") {
    if (payload.first_frame_url && !payload.image) payload.image = payload.first_frame_url;
    if (payload.last_frame_url && !payload.last_image) payload.last_image = payload.last_frame_url;
    if (payload.reference_image_urls == null && imageUrls.length > 0) {
      payload.reference_image_urls = imageUrls;
    }
  }

  if (kind === "avatar") {
    if (payload.image_url && !payload.image) payload.image = payload.image_url;
    if (payload.audioUrl && !payload.audio_url) payload.audio_url = payload.audioUrl;
  }

  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (value === "" || value === null || value === undefined) delete payload[key];
    if (Array.isArray(value) && value.length === 0) delete payload[key];
  }

  return payload;
}

function extractOutputs(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractOutputs(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap(extractOutputs);
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["outputs", "resultUrls", "imageUrls", "videoUrls", "images", "videos", "urls", "result", "output", "response", "data", "url"]) {
      const found = extractOutputs(rec[key]);
      if (found.length) return found;
    }
  }
  return [];
}

function normalizeStatus(value: unknown): "processing" | "completed" | "failed" {
  const s = String(value || "").toLowerCase();
  if (["success", "succeeded", "completed", "complete", "done"].includes(s)) return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function safeDownloadFilename(value: string | null): string {
  const fallback = "generation-lab-output";
  const clean = String(value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
}

function assertRemoteDownloadUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP downloads are supported.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") {
    throw new Error("Local download URLs are not allowed.");
  }
  return url;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      kind?: LabKind;
      route?: string;
      payload?: Record<string, unknown>;
    };

    const kind: LabKind = body.kind === "video" || body.kind === "avatar" ? body.kind : "image";
    const rawRoute = cleanRoute(body.route);
    const baseUrl = publicBaseUrl(req);
    const inputPayload = normalizePayload(kind, rawRoute, body.payload || {}, baseUrl);
    const route = normalizeRouteForPayload(rawRoute, inputPayload);

    const submitRes = await fetch(`${WAVESPEED_BASE}/${route}`, {
      method: "POST",
      headers: waveSpeedHeaders(),
      body: JSON.stringify(inputPayload),
      cache: "no-store",
    });

    const submitJson = (await submitRes.json().catch(() => null)) as Record<string, unknown> | null;
    const data = (submitJson?.data as Record<string, unknown> | undefined) || submitJson || {};
    const taskId = data.id || data.taskId || data.predictionId || data.requestId;

    if (!submitRes.ok || typeof taskId !== "string") {
      const message =
        (typeof submitJson?.error === "string" && submitJson.error) ||
        (typeof submitJson?.message === "string" && submitJson.message) ||
        (typeof submitJson?.msg === "string" && submitJson.msg) ||
        `WaveSpeed submit failed (${submitRes.status})`;
      return NextResponse.json({ error: message, raw: submitJson }, { status: submitRes.ok ? 502 : submitRes.status });
    }

    return NextResponse.json({
      taskId: `ws:${taskId}`,
      providerTaskId: taskId,
      route,
      payload: inputPayload,
      status: "processing",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation Lab request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const downloadUrl = req.nextUrl.searchParams.get("downloadUrl");
    if (downloadUrl) {
      const url = assertRemoteDownloadUrl(downloadUrl);
      const filename = safeDownloadFilename(req.nextUrl.searchParams.get("filename"));
      const fileRes = await fetch(url, { cache: "no-store" });
      if (!fileRes.ok || !fileRes.body) {
        return NextResponse.json({ error: `Download failed (${fileRes.status})` }, { status: 502 });
      }
      return new NextResponse(fileRes.body, {
        headers: {
          "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const taskIdParam = req.nextUrl.searchParams.get("taskId") || "";
    const providerTaskId = taskIdParam.startsWith("ws:") ? taskIdParam.slice(3) : taskIdParam;
    if (!providerTaskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const headers = { Authorization: `Bearer ${getWaveSpeedKey()}` };
    const resultRes = await fetch(`${WAVESPEED_BASE}/predictions/${encodeURIComponent(providerTaskId)}/result`, {
      headers,
      cache: "no-store",
    });

    let resultJson = (await resultRes.json().catch(() => null)) as Record<string, unknown> | null;
    if (!resultRes.ok || !resultJson) {
      const statusRes = await fetch(`${WAVESPEED_BASE}/predictions/${encodeURIComponent(providerTaskId)}`, {
        headers,
        cache: "no-store",
      });
      resultJson = (await statusRes.json().catch(() => null)) as Record<string, unknown> | null;
      if (!statusRes.ok || !resultJson) {
        return NextResponse.json({ taskId: taskIdParam, status: "processing", outputs: [], error: null });
      }
    }

    const data = (resultJson.data as Record<string, unknown> | undefined) || resultJson;
    let status = normalizeStatus(data.status || data.taskStatus || data.state || resultJson.status);
    const outputs = extractOutputs(data.outputs || data.result || data.response || data);
    const error =
      (typeof data.error === "string" && data.error) ||
      (typeof data.errorMessage === "string" && data.errorMessage) ||
      null;

    if (status === "completed" && outputs.length === 0) status = "processing";
    if (status === "processing" && outputs.length > 0) status = "completed";
    if (error && status !== "completed") status = "failed";

    return NextResponse.json({
      taskId: taskIdParam,
      providerTaskId,
      status,
      outputs,
      error,
      raw: resultJson,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation Lab polling failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

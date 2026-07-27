import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  refundGenerationCharge,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 300;

const CREDIT_COST = 2;
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_MODEL = "bria/fibo/relight";

const ALLOWED_LIGHT_TYPES = new Set([
  "midday",
  "blue hour light",
  "low-angle sunlight",
  "sunrise light",
  "spotlight on subject",
  "overcast light",
  "soft overcast daylight lighting",
  "cloud-filtered lighting",
  "fog-diffused lighting",
  "moonlight lighting",
  "starlight nighttime",
  "soft bokeh lighting",
  "harsh studio lighting",
]);
const ALLOWED_DIRECTIONS = new Set(["front", "side", "bottom", "top-down"]);

function apiKey(): string {
  const k = process.env.WAVESPEED_API_KEY;
  if (!k) throw new Error("WAVESPEED_API_KEY is not configured");
  return k;
}

async function uploadRefImage(base64DataUrl: string, userId: string, genId: string): Promise<string> {
  if (base64DataUrl.startsWith("http://") || base64DataUrl.startsWith("https://")) {
    return base64DataUrl;
  }
  const match = base64DataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("Invalid base64 data URL for reference image");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image-ref",
    generationId: `${genId}-bria-relight-ref`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image to storage");
  return url;
}

async function submitTask(image: string, light_type: string, light_direction: string): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE}/${WAVESPEED_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image, light_type, light_direction }),
  });
  const json = await res.json().catch(() => ({}));
  const id = json?.data?.id ?? json?.id;
  if (!res.ok || !id) {
    throw new Error(`WaveSpeed submit failed (${res.status}): ${json?.message ?? json?.msg ?? JSON.stringify(json)}`);
  }
  return id as string;
}

async function pollTask(
  predictionId: string,
  maxAttempts = 90,
  intervalMs = 2000,
): Promise<{ status: "success" | "fail" | "timeout"; urls: string[]; error?: string; inferenceMs?: number }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}/result`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    if (!res.ok) continue;
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    const status = String(data?.status ?? "").toLowerCase();
    if (status === "completed") {
      const outputs: string[] = Array.isArray(data?.outputs)
        ? data.outputs
        : Array.isArray(data?.output?.images)
          ? data.output.images
          : [];
      return { status: "success", urls: outputs, inferenceMs: data?.timings?.inference };
    }
    if (status === "failed" || status === "cancelled" || status === "timeout") {
      return { status: "fail", urls: [], error: data?.error ?? "WaveSpeed task failed" };
    }
  }
  return { status: "timeout", urls: [] };
}

/**
 * GET /api/wavespeed/bria/fibo/relight?id={predictionId}
 * Poll a submitted task from the client (used by the UI progress loop).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const res = await fetch(`${WAVESPEED_BASE}/predictions/${id}/result`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    return NextResponse.json({
      id: data?.id,
      status: data?.status,
      outputs: data?.outputs ?? [],
      error: data?.error ?? null,
      inferenceMs: data?.timings?.inference ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Poll failed" }, { status: 500 });
  }
}

/**
 * POST /api/wavespeed/bria/fibo/relight
 * Body: { imageDataUrl | imageUrl, light_type, light_direction }
 */
export async function POST(req: NextRequest) {
  let chargedUserId: string | null = null;
  let genId = `bria-relight-${Date.now()}`;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`bria-relight:${userId}:${ip}`, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      imageUrl?: string;
      light_type?: string;
      light_direction?: string;
    };
    const raw = body.imageDataUrl || body.imageUrl || "";
    const light_type = String(body.light_type || "midday");
    const light_direction = String(body.light_direction || "front");

    if (!raw || (!raw.startsWith("data:image/") && !raw.startsWith("http"))) {
      return NextResponse.json({ error: "A valid photo is required." }, { status: 400 });
    }
    if (!ALLOWED_LIGHT_TYPES.has(light_type)) {
      return NextResponse.json({ error: `Invalid light_type: ${light_type}` }, { status: 400 });
    }
    if (!ALLOWED_DIRECTIONS.has(light_direction)) {
      return NextResponse.json({ error: `Invalid light_direction: ${light_direction}` }, { status: 400 });
    }

    // 1. Charge credits upfront
    chargedUserId = userId;
    await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: `Bria Relight · ${light_type} / ${light_direction}`,
      assetType: "image",
      modelUsed: WAVESPEED_MODEL,
    });

    // 2. Upload reference image if it's base64
    const imageUrl = await uploadRefImage(raw, userId, genId);

    // 3. Submit to WaveSpeed
    const predictionId = await submitTask(imageUrl, light_type, light_direction);

    // 4. Poll for completion
    const result = await pollTask(predictionId);
    if (result.status !== "success" || result.urls.length === 0) {
      throw new Error(result.error || `Relight task ${result.status}`);
    }

    return NextResponse.json({
      predictionId,
      outputUrl: result.urls[0],
      outputs: result.urls,
      inferenceMs: result.inferenceMs ?? null,
      light_type,
      light_direction,
    });
  } catch (error: any) {
    // Refund on failure
    if (chargedUserId) {
      await refundGenerationCharge({
        userId: chargedUserId,
        credits: CREDIT_COST,
        reason: `Bria Relight failed: ${error?.message ?? "unknown"}`,
      }).catch(() => null);
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
    }
    return NextResponse.json({ error: error?.message || "Relight failed." }, { status: 500 });
  }
}

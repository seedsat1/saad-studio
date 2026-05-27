import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, refundGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl } from "@/lib/security";

const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_UPSCALE_MODEL = "topaz/image-upscale";

interface KieJobResponse {
  code?: number;
  msg?: string;
  message?: string;
  data?: Record<string, unknown>;
}

function getKieKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("KIE_API_KEY is not configured.");
  return key;
}

function extractOutputs(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) return [input];
    try {
      return extractOutputs(JSON.parse(input));
    } catch {
      return [];
    }
  }
  if (Array.isArray(input)) {
    return input.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v));
  }
  if (typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const candidates = [rec.resultUrls, rec.outputs, rec.urls, rec.images, rec.result, rec.imageUrl, rec.url, rec.output];
    for (const candidate of candidates) {
      const out = extractOutputs(candidate);
      if (out.length) return out;
    }
  }
  return [];
}

function parseBase64DataUrl(raw: string) {
  const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return { fileData, ext };
}

async function uploadDataUrlToKie(imageDataUrl: string, apiKey: string): Promise<string> {
  const parsed = parseBase64DataUrl(imageDataUrl);
  if (!parsed) return imageDataUrl;

  const uploadRes = await fetchWithTimeout(
    `${KIE_BASE_URL}/files/upload/base64`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        fileData: parsed.fileData,
        fileName: `upscale-input.${parsed.ext}`,
      }),
    },
    30_000,
  );

  const uploadJson = (await uploadRes.json().catch(() => null)) as KieJobResponse | null;
  const url =
    (uploadJson?.data?.url as string | undefined) ||
    (uploadJson?.data?.fileUrl as string | undefined) ||
    (uploadJson?.data?.downloadUrl as string | undefined);

  if (!uploadRes.ok || !url) {
    throw new Error(uploadJson?.msg || uploadJson?.message || "KIE file upload failed.");
  }

  return url;
}

async function pollKieTask(taskId: string, apiKey: string, maxAttempts = 50, intervalMs = 2500): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetchWithTimeout(
      `${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      30_000,
    );

    const json = (await res.json().catch(() => null)) as KieJobResponse | null;
    if (!res.ok || (json?.code != null && json.code !== 200)) {
      throw new Error(json?.msg || json?.message || `KIE polling failed (${res.status})`);
    }

    const data = (json?.data ?? {}) as Record<string, unknown>;
    const status = String(data.taskStatus || data.status || data.state || "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const outputs = extractOutputs(data.resultUrls || data.outputs || data.resultJson || data.result || data.response);
      if (!outputs.length) throw new Error("No output URL in KIE result.");
      return outputs;
    }
    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(String(data.failMsg || data.errorMessage || data.error || "Upscale failed."));
    }
  }
  throw new Error("Upscale timed out.");
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`upscale:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    const mediaUrl = (typeof body?.imageUrl === "string" && body.imageUrl) || (typeof body?.videoUrl === "string" && body.videoUrl);
    
    // Scale factor must be string enum: '1', '2', '4', '8'
    let scaleFactor = String(body?.scale || "2");
    if (!["1", "2", "4", "8"].includes(scaleFactor)) {
      scaleFactor = "2";
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
    }
    if (!(mediaUrl.startsWith("data:") || isSafePublicHttpUrl(mediaUrl))) {
      return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
    }

    const creditsToCharge = await getGenerationCost("tool:upscale");
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: "No credit configuration for upscale tool." }, { status: 400 });
    }
    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: "Upscale image",
      assetType: "IMAGE",
      modelUsed: KIE_UPSCALE_MODEL,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const kieKey = getKieKey();
    const normalizedMediaUrl = mediaUrl.startsWith("data:")
      ? await uploadDataUrlToKie(mediaUrl, kieKey)
      : mediaUrl;

    const submitRes = await fetchWithTimeout(
      `${KIE_BASE_URL}/jobs/createTask`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${kieKey}`,
        },
        body: JSON.stringify({
          model: KIE_UPSCALE_MODEL,
          input: { 
            image_url: normalizedMediaUrl,
            upscale_factor: scaleFactor
          },
        }),
      },
      30_000,
    );

    if (!submitRes.ok) {
      const errText = await readErrorBody(submitRes);
      throw new Error(`KIE submit failed: ${errText}`);
    }

    const submitJson = (await submitRes.json().catch(() => null)) as KieJobResponse | null;
    if (submitJson?.code != null && submitJson.code !== 200) {
      throw new Error(submitJson.msg || submitJson.message || "KIE task submission failed.");
    }
    const taskId = (submitJson?.data?.taskId as string | undefined) || (submitJson?.data?.id as string | undefined);
    if (!taskId) {
      throw new Error(submitJson?.msg || submitJson?.message || "No task ID returned.");
    }

    const outputs = await pollKieTask(taskId, kieKey);
    const url = outputs[0];
    if (generationId) {
      await setGenerationMediaUrl(generationId, url).catch((err) => {
        console.error("[upscale] Failed to attach media URL to generation", err);
      });
    }

    return NextResponse.json({ generationId, imageUrl: url, mediaUrl: url }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

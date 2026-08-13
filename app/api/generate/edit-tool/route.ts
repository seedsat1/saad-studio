import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, refundGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_IMAGE_ERASER_MODEL = "wavespeed-ai/image-eraser";
const WAVESPEED_IMAGE_EDIT_MODEL = "wavespeed-ai/qwen-image/edit";

type EditAction = "inpaint" | "replace" | "style";

interface WaveSpeedResponse {
  code?: number;
  message?: string;
  msg?: string;
  data?: Record<string, unknown>;
}

function getWaveSpeedKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured.");
  return key;
}

function isEditAction(value: unknown): value is EditAction {
  return value === "inpaint" || value === "replace" || value === "style";
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
    const candidates = [rec.outputs, rec.resultUrls, rec.urls, rec.images, rec.result, rec.imageUrl, rec.url, rec.output];
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
  return { mime, fileData, ext };
}

async function uploadDataUrlToWaveSpeed(dataUrl: string, apiKey: string, fileStem: string): Promise<string> {
  const parsed = parseBase64DataUrl(dataUrl);
  if (!parsed) return dataUrl;

  const buffer = Buffer.from(parsed.fileData, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: parsed.mime }), `${fileStem}.${parsed.ext}`);

  const uploadRes = await fetchWithTimeout(
    `${WAVESPEED_BASE_URL}/media/upload/binary`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    },
    30_000,
  );

  const uploadJson = (await uploadRes.json().catch(() => null)) as WaveSpeedResponse | null;
  const url =
    (uploadJson?.data?.download_url as string | undefined) ||
    (uploadJson?.data?.url as string | undefined);

  if (!uploadRes.ok || !url) {
    throw new Error(uploadJson?.msg || uploadJson?.message || "WaveSpeed file upload failed.");
  }

  return url;
}

async function pollWaveSpeedTask(taskId: string, apiKey: string, maxAttempts = 60, intervalMs = 2500): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      30_000,
    );

    const json = (await res.json().catch(() => null)) as WaveSpeedResponse | null;
    if (!res.ok || (json?.code != null && json.code !== 200)) {
      throw new Error(json?.msg || json?.message || `WaveSpeed polling failed (${res.status})`);
    }

    const data = (json?.data ?? {}) as Record<string, unknown>;
    const status = String(data.status || data.taskStatus || "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const outputs = extractOutputs(data.outputs || data.result || data.resultJson || data.response);
      if (!outputs.length) throw new Error("No output URL in WaveSpeed result.");
      return outputs;
    }
    if (["fail", "failed", "error", "canceled", "cancelled", "timeout"].includes(status)) {
      throw new Error(String(data.error || data.errorMessage || "Image edit failed."));
    }
  }
  throw new Error("Image edit timed out.");
}

function buildPrompt(action: EditAction, prompt: string): string {
  const clean = sanitizePrompt(prompt, 1000).trim();
  if (clean) return clean;
  if (action === "style") return "Apply a polished cinematic artistic style while preserving the original subject and composition.";
  if (action === "replace") return "Remove the painted object and reconstruct the background naturally.";
  return "Fill the masked area naturally using surrounding image context.";
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
    const rate = checkRateLimit(`edit-tool:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const maskImageUrl = typeof body.maskImageUrl === "string" ? body.maskImageUrl : "";
    const prompt = buildPrompt(action as EditAction, typeof body.prompt === "string" ? body.prompt : "");

    if (!isEditAction(action)) {
      return NextResponse.json({ error: "Unsupported edit action." }, { status: 400 });
    }
    if (!imageUrl || !(imageUrl.startsWith("data:") || isSafePublicHttpUrl(imageUrl))) {
      return NextResponse.json({ error: "A valid imageUrl is required." }, { status: 400 });
    }
    if ((action === "inpaint" || action === "replace") && (!maskImageUrl || !maskImageUrl.startsWith("data:image/"))) {
      return NextResponse.json({ error: "A painted mask is required for this tool." }, { status: 400 });
    }

    const modelToUse = action === "style" ? WAVESPEED_IMAGE_EDIT_MODEL : WAVESPEED_IMAGE_ERASER_MODEL;
    const pricingRef = action === "style" ? "qwen2/image-edit" : "tool:remove-bg";
    const creditsToCharge = await getGenerationCost(pricingRef);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: "No credit configuration for edit tool." }, { status: 400 });
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt,
      assetType: "IMAGE",
      modelUsed: modelToUse,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const waveKey = getWaveSpeedKey();
    const normalizedImageUrl = imageUrl.startsWith("data:")
      ? await uploadDataUrlToWaveSpeed(imageUrl, waveKey, "edit-input")
      : imageUrl;

    const submitBody: Record<string, unknown> = {
      image: normalizedImageUrl,
      prompt,
      output_format: "jpeg",
      enable_base64_output: false,
      enable_sync_mode: false,
    };

    if (action === "inpaint" || action === "replace") {
      submitBody.mask_image = await uploadDataUrlToWaveSpeed(maskImageUrl, waveKey, "edit-mask");
    } else {
      submitBody.seed = -1;
    }

    const submitRes = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/${modelToUse}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${waveKey}`,
        },
        body: JSON.stringify(submitBody),
      },
      30_000,
    );

    if (!submitRes.ok) {
      const errText = await readErrorBody(submitRes);
      throw new Error(`WaveSpeed submit failed: ${errText}`);
    }

    const submitJson = (await submitRes.json().catch(() => null)) as WaveSpeedResponse | null;
    if (submitJson?.code != null && submitJson.code !== 200) {
      throw new Error(submitJson.msg || submitJson.message || "WaveSpeed task submission failed.");
    }

    const taskId = (submitJson?.data?.id as string | undefined) || (submitJson?.data?.taskId as string | undefined);
    if (!taskId) throw new Error("No task ID returned.");

    const outputs = await pollWaveSpeedTask(taskId, waveKey);
    const url = outputs[0];
    if (generationId) await setGenerationMediaUrl(generationId, url);

    return NextResponse.json({
      generationId,
      imageUrl: url,
      mediaUrl: url,
      provider: "wavespeed",
      modelUsed: modelToUse,
      chargedCredits: creditsToCharge,
    }, { status: 200 });
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

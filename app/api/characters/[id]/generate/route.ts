import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { getGenerationCost } from "@/lib/pricing";
import {
  InsufficientCreditsError,
  refundGenerationCharge,
  saveAdditionalGenerationUrls,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { precheckGenerationPolicy } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import { fetchWithTimeout } from "@/lib/http";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 180;

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_MODEL = "ideogram-ai/ideogram-character";
const GOOGLE_GEMINI_CHARACTER_MODEL_ID = "gemini-3-pro-image-preview";
const LEGACY_GEMINI_OMNI_CHARACTER_MODEL_ID = "gemini-omni-character";

function getGoogleApiKey(): string | null {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || String(error);
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingUserCharacterTable(error: unknown): boolean {
  const anyErr = error as any;
  const raw = `${errorText(error)} ${String(anyErr?.code ?? "")} ${String(anyErr?.meta?.cause ?? "")}`.toLowerCase();
  if (raw.includes("p2021")) return true;
  if (!raw.includes("usercharacter")) return false;
  return (
    raw.includes("does not exist") ||
    raw.includes("doesn't exist") ||
    raw.includes("no such table") ||
    raw.includes("relation") ||
    raw.includes("p2021")
  );
}

async function ensureUserCharacterTable(): Promise<boolean> {
  try {
    await prismadb.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCharacter" (
        "id"                  TEXT        NOT NULL PRIMARY KEY,
        "userId"              TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "name"                TEXT        NOT NULL,
        "description"         TEXT        NOT NULL DEFAULT '',
        "referenceUrls"       JSONB       NOT NULL DEFAULT '[]',
        "coverUrl"            TEXT,
        "provider"            TEXT        NOT NULL DEFAULT 'reference',
        "providerCharacterId" TEXT,
        "status"              TEXT        NOT NULL DEFAULT 'ready',
        "metadata"            JSONB       NOT NULL DEFAULT '{}',
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prismadb.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserCharacter_userId_updatedAt_idx"
      ON "UserCharacter"("userId", "updatedAt");
    `);
    return true;
  } catch {
    return false;
  }
}

function extractOutputs(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    const trimmed = input.trim();
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
  if (Array.isArray(input)) return input.flatMap(extractOutputs);
  if (typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const direct = rec.url ?? rec.imageUrl ?? rec.image_url ?? rec.downloadUrl;
    if (typeof direct === "string") return extractOutputs(direct);
    for (const candidate of [rec.outputs, rec.resultUrls, rec.images, rec.urls, rec.result, rec.output, rec.response, rec.data]) {
      const outputs = extractOutputs(candidate);
      if (outputs.length) return outputs;
    }
  }
  return [];
}

function sizeToAspectRatio(size: string | null | undefined): string | null {
  if (!size) return null;
  const m = size.match(/^(\d+)\*(\d+)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const r = w / h;
  if (r > 1.5) return "16:9";
  if (r < 0.8) return "9:16";
  return "1:1";
}

function normalizeCharacterQuality(input: unknown): string {
  const value = typeof input === "string" ? input.trim().toUpperCase() : "1K";
  return ["1K", "2K", "4K"].includes(value) ? value : "1K";
}

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function imageUrlToInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  const inline = dataUrlToInlineData(url);
  if (inline) return inline;

  const res = await fetchWithTimeout(url, { method: "GET" }, 60_000);
  if (!res.ok) throw new Error(`Failed to fetch character reference for Google (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buffer.toString("base64") };
}

function extractGoogleInlineImages(value: unknown): Array<{ data: string; mimeType: string }> {
  if (!value || typeof value !== "object") return [];
  const rec = value as Record<string, unknown>;
  const candidates = Array.isArray(rec.candidates) ? rec.candidates : [];
  return candidates.flatMap((candidate) => {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    return parts.flatMap((part) => {
      const inlineData = (part as Record<string, unknown>)?.inlineData as Record<string, unknown> | undefined;
      const data = inlineData?.data;
      if (typeof data !== "string" || !data) return [];
      const mimeType = typeof inlineData?.mimeType === "string" ? inlineData.mimeType : "image/png";
      return [{ data, mimeType }];
    });
  });
}

async function generateGoogleCharacterImages(params: {
  apiKey: string;
  prompt: string;
  referenceUrls: string[];
  aspectRatio: string;
  quality: string;
}): Promise<Array<{ buffer: Buffer; mimeType: string }>> {
  const parts: Array<Record<string, unknown>> = [{ text: sanitizePrompt(params.prompt, 5000) }];
  for (const ref of params.referenceUrls.slice(0, 8)) {
    const inline = await imageUrlToInlineData(ref);
    parts.push({ inline_data: inline });
  }

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_GEMINI_CHARACTER_MODEL_ID}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": params.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: params.aspectRatio || "1:1",
            imageSize: params.quality,
          },
        },
      }),
    },
    120_000,
  );

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const message = typeof json?.error?.message === "string" ? json.error.message : `Google character generation failed (${res.status})`;
    throw new Error(message);
  }

  const images = extractGoogleInlineImages(json);
  if (!images.length) throw new Error("Google completed but returned no character image.");
  return images.map((image) => ({ buffer: Buffer.from(image.data, "base64"), mimeType: image.mimeType }));
}

async function uploadGoogleCharacterImages(params: {
  userId: string;
  generationId: string;
  images: Array<{ buffer: Buffer; mimeType: string }>;
}): Promise<string[]> {
  const urls: string[] = [];
  for (let idx = 0; idx < params.images.length; idx++) {
    const image = params.images[idx];
    const ext = image.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const url = await uploadBufferToStorage({
      buffer: image.buffer,
      contentType: image.mimeType,
      userId: params.userId,
      assetType: "image",
      generationId: `${params.generationId}-gemini-${idx}`,
      fileName: `character.${ext}`,
    });
    if (url) urls.push(url);
  }
  if (!urls.length) throw new Error("Character media storage is not configured.");
  return urls;
}

async function pollWaveSpeedTask(taskId: string, apiKey: string, maxAttempts = 60, intervalMs = 2500): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const statusRes = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      30_000,
    );
    const statusJson = (await statusRes.json().catch(() => null)) as any;
    if (!statusRes.ok) {
      if (statusRes.status === 404) continue;
      throw new Error(statusJson?.msg || statusJson?.message || `WaveSpeed polling failed (${statusRes.status})`);
    }

    const statusData = statusJson?.data ?? statusJson;
    const status = String(statusData?.status ?? statusData?.taskStatus ?? "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const resultRes = await fetchWithTimeout(
        `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
        30_000,
      );
      const resultJson = (await resultRes.json().catch(() => null)) as any;
      if (!resultRes.ok) {
        throw new Error(resultJson?.msg || resultJson?.message || `WaveSpeed result fetch failed (${resultRes.status})`);
      }
      const resultData = resultJson?.data ?? resultJson;
      const outputs = extractOutputs(
        resultData?.outputs ||
          resultData?.resultUrls ||
          resultData?.images ||
          resultData?.urls ||
          resultData?.result ||
          resultData?.output ||
          resultData?.response ||
          resultData?.data,
      );
      if (!outputs.length) throw new Error("No output URL in WaveSpeed result.");
      return outputs;
    }
    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(String(statusData?.error || statusData?.errorMessage || "Instant character generation failed."));
    }
  }

  throw new Error("Instant character generation timed out.");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`instant-character:${userId}:${ip}`, 12, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    let character: any = null;
    try {
      character = await prismadb.userCharacter.findFirst({ where: { id: params.id, userId } });
    } catch (err) {
      if (isMissingUserCharacterTable(err)) {
        await ensureUserCharacterTable().catch(() => false);
        return NextResponse.json(
          { error: "Character storage is not configured yet.", code: "characters_table_missing" },
          { status: 503 },
        );
      }
      throw err;
    }
    if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });

    const refs = Array.isArray(character.referenceUrls)
      ? character.referenceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
      : [];
    const image = (typeof character.coverUrl === "string" && isSafePublicHttpUrl(character.coverUrl))
      ? character.coverUrl
      : refs[0];
    if (!image) return NextResponse.json({ error: "Character has no usable reference image." }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userPrompt = typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "Create a high-quality character portrait preserving the exact identity, face, and recognizable features.";
    const size = typeof body.size === "string" && /^\d+\*\d+$/.test(body.size) ? body.size : null;
    const aspectRatio = typeof body.aspect_ratio === "string" && /^\d+:\d+$/.test(body.aspect_ratio)
      ? body.aspect_ratio
      : sizeToAspectRatio(size) ?? "1:1";
    const style = typeof body.style === "string" && body.style.trim() ? body.style.trim().slice(0, 32) : "Auto";
    const renderingSpeed = typeof body.rendering_speed === "string" && body.rendering_speed.trim()
      ? body.rendering_speed.trim().slice(0, 32)
      : "Quality";
    const modelId = typeof body.modelId === "string" && body.modelId.trim()
      ? body.modelId.trim()
      : GOOGLE_GEMINI_CHARACTER_MODEL_ID;
    const quality = normalizeCharacterQuality(body.quality);

    const fullPrompt = `Character: ${character.name}. Preserve the same identity, face, ethnicity, proportions, and recognizable features. ${character.description || ""}\n\n${userPrompt}`.trim();
    const precheck = await precheckGenerationPolicy({ prompt: fullPrompt });
    if (!precheck.allowed) {
      return NextResponse.json({ error: precheck.message, blocked: true, reason: precheck.reason }, { status: 403 });
    }

    const isGoogleGeminiCharacterModel =
      modelId === GOOGLE_GEMINI_CHARACTER_MODEL_ID ||
      modelId === LEGACY_GEMINI_OMNI_CHARACTER_MODEL_ID;

    if (isGoogleGeminiCharacterModel) {
      const apiKey = getGoogleApiKey();
      if (!apiKey) {
        return NextResponse.json(
          { error: "Gemini Omni Character provider is not configured.", code: "google_key_missing" },
          { status: 503 },
        );
      }

      const creditsToCharge = await getGenerationCost(GOOGLE_GEMINI_CHARACTER_MODEL_ID, 5, 1, quality);
      if (creditsToCharge <= 0) return NextResponse.json({ error: "No credit configuration for Gemini 3 Pro Image." }, { status: 400 });

      const charge = await spendCredits({
        userId,
        credits: creditsToCharge,
        prompt: sanitizePrompt(fullPrompt, 5000),
        assetType: "IMAGE",
        modelUsed: GOOGLE_GEMINI_CHARACTER_MODEL_ID,
      });
      generationId = charge.generationId;
      chargedCredits = creditsToCharge;
      chargedUserId = userId;

      const referenceUrls = Array.from(new Set([image, ...refs].filter((url) => isSafePublicHttpUrl(url)))).slice(0, 8);
      const generatedImages = await generateGoogleCharacterImages({
        apiKey,
        prompt: [
          fullPrompt,
          "Use the attached reference images as the locked character identity.",
          "Keep face structure, hairline, skin tone, body proportions, wardrobe memory, and recognizable features consistent.",
          `Render aspect ratio ${aspectRatio} at ${quality}.`,
        ].join("\n"),
        referenceUrls,
        aspectRatio,
        quality,
      });
      const imageUrls = await uploadGoogleCharacterImages({ userId, generationId, images: generatedImages });

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
          console.error("[gemini-3-pro-image-preview] Failed to save media URL", err);
        });
      }
      if (imageUrls.length > 1) {
        await saveAdditionalGenerationUrls(userId, sanitizePrompt(fullPrompt, 5000), GOOGLE_GEMINI_CHARACTER_MODEL_ID, "IMAGE", imageUrls.slice(1)).catch(() => null);
      }

      return NextResponse.json({
        generationId,
        imageUrls,
        resultUrls: imageUrls,
        imageUrl: imageUrls[0] ?? null,
        mediaUrl: imageUrls[0] ?? null,
        taskId: generationId,
        modelId: GOOGLE_GEMINI_CHARACTER_MODEL_ID,
        provider: "google",
        quality,
        aspectRatio,
        credits: creditsToCharge,
      });
    }

    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Instant character provider is not configured.", code: "wavespeed_key_missing" },
        { status: 503 },
      );
    }

    const creditsToCharge = await getGenerationCost("tool:instant-character");
    if (creditsToCharge <= 0) return NextResponse.json({ error: "No credit configuration for instant character." }, { status: 400 });

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(fullPrompt, 5000),
      assetType: "IMAGE",
      modelUsed: WAVESPEED_MODEL,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const submitRes = await fetchWithTimeout(
      `${WAVESPEED_BASE_URL}/${WAVESPEED_MODEL}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          image,
          prompt: fullPrompt,
          aspect_ratio: aspectRatio,
          enable_base64_output: false,
          rendering_speed: renderingSpeed,
          style,
        }),
      },
      30_000,
    );

    const submitJson = (await submitRes.json().catch(() => null)) as any;
    const taskId = submitJson?.data?.id ?? submitJson?.id;
    if (!submitRes.ok || !taskId) {
      throw new Error(submitJson?.msg || submitJson?.message || `WaveSpeed submit failed (${submitRes.status})`);
    }

    const imageUrls = await pollWaveSpeedTask(String(taskId), apiKey);
    if (generationId && imageUrls[0]) {
      await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
        console.error("[instant-character] Failed to save media URL", err);
      });
    }
    if (imageUrls.length > 1) {
      await saveAdditionalGenerationUrls(userId, sanitizePrompt(fullPrompt, 5000), WAVESPEED_MODEL, "IMAGE", imageUrls.slice(1)).catch(() => null);
    }

    return NextResponse.json({
      generationId,
      imageUrls,
      resultUrls: imageUrls,
      imageUrl: imageUrls[0] ?? null,
      mediaUrl: imageUrls[0] ?? null,
      taskId,
      credits: creditsToCharge,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => null);
    }

    const message = error instanceof Error ? error.message : "Instant character generation failed.";
    const lower = String(message).toLowerCase();
    const status =
      lower.includes("timed out") ? 504 :
      lower.includes("not configured") ? 503 :
      lower.includes("google") ? 502 :
      lower.includes("wavespeed") ? 502 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}

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

export const maxDuration = 180;

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_MODEL = "ideogram-ai/ideogram-character";

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

    const fullPrompt = `Character: ${character.name}. Preserve the same identity, face, ethnicity, proportions, and recognizable features. ${character.description || ""}\n\n${userPrompt}`.trim();
    const precheck = await precheckGenerationPolicy({ prompt: fullPrompt });
    if (!precheck.allowed) {
      return NextResponse.json({ error: precheck.message, blocked: true, reason: precheck.reason }, { status: 403 });
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
      lower.includes("wavespeed") ? 502 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}

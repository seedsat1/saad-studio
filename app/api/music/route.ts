import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, precheckGenerationPolicy, rollbackGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { attachIdempotencyGeneration, beginIdempotency, completeIdempotency, getIdempotencyKey, hashRequestBody } from "@/lib/idempotency";

const WAVESPEED_MUSIC_PREFIXES = ["wavespeed-ai/", "minimax/", "elevenlabs/", "google/lyria"];
const IDEMPOTENCY_ROUTE = "generate:music";

function isWaveSpeedModel(model: string): boolean {
  return WAVESPEED_MUSIC_PREFIXES.some((p) => model.startsWith(p));
}

export async function POST(req: Request) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;
  const idempotencyKey = getIdempotencyKey(req.headers);
  let requestHash: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    chargedUserId = userId;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`music:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    requestHash = hashRequestBody(body);
    const { prompt, model = "elevenlabs/music", duration, style, lyrics, force_instrumental, output_format } = body as {
      prompt: string;
      model?: string;
      duration?: number;
      style?: string;
      lyrics?: string;
      force_instrumental?: boolean;
      output_format?: string;
    };

    if (!prompt?.trim()) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    if (!isWaveSpeedModel(model)) {
      return new NextResponse("Unsupported music model", { status: 400 });
    }

    const creditsToCharge = await getGenerationCost(model, duration ?? 30);
    if (creditsToCharge <= 0) {
      return new NextResponse("No credit configuration for this music model", { status: 400 });
    }

    const idem = await beginIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      requestHash,
    });
    if (idem.kind === "replay") {
      return NextResponse.json(idem.responseJson, { status: idem.responseStatus });
    }
    if (idem.kind === "in_progress") {
      return NextResponse.json({ status: "processing", generationId: idem.generationId }, { status: 202 });
    }

    const precheck = await precheckGenerationPolicy({
      prompt,
      extraText: [style ?? "", lyrics ?? ""].filter(Boolean).join("\n") || null,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 3000),
      assetType: "AUDIO",
      modelUsed: model,
    });
    chargedCredits = creditsToCharge;
    generationId = charge.generationId;
    await attachIdempotencyGeneration({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
    }).catch(() => {});

    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WaveSpeed API key not configured");
    }

    const payload: Record<string, unknown> = { prompt: sanitizePrompt(prompt, 3000) };
    if (model === "elevenlabs/music") {
      const safeSeconds = duration && Number.isFinite(duration) && duration > 0 ? Math.min(duration, 300) : 30;
      payload.music_length_ms = Math.max(5000, safeSeconds * 1000);
      payload.force_instrumental = Boolean(force_instrumental);
      payload.output_format = output_format || "mp3_standard";
      if (style?.trim()) payload.prompt = `${payload.prompt} ${sanitizePrompt(style, 200)}`;
      if (lyrics?.trim()) payload.prompt = `${payload.prompt} ${sanitizePrompt(lyrics, 2500)}`;
    } else {
      if (lyrics?.trim()) payload.lyrics = sanitizePrompt(lyrics, 2500);
      if (style?.trim()) payload.tags = sanitizePrompt(style, 200);
      if (duration && Number.isFinite(duration) && duration > 0 && duration <= 300) payload.duration = duration;
    }

    const externalRes = await fetchWithTimeout(
      `https://api.wavespeed.ai/api/v3/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      35_000,
    );

    if (!externalRes.ok) {
      const detail = await readErrorBody(externalRes);
      console.error("[MUSIC_WAVESPEED_ERROR]", externalRes.status, detail);
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => {});
      }
      await completeIdempotency({
        userId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus: externalRes.status,
        responseJson: { error: `Music generation failed: ${detail}` },
      }).catch(() => {});
      return new NextResponse(`Music generation failed: ${detail}`, { status: externalRes.status });
    }

    const data = await externalRes.json();

    const audioUrl: string | null =
      data?.data?.outputs?.[0] ?? data?.outputs?.[0] ?? data?.data?.audio ?? data?.audio ?? null;

    if (!audioUrl) {
      console.error("[MUSIC_NO_URL]", JSON.stringify(data));
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => {});
      }
      await completeIdempotency({
        userId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus: 502,
        responseJson: { error: "No audio URL in provider response" },
      }).catch(() => {});
      return new NextResponse("No audio URL in provider response", { status: 502 });
    }

    if (generationId) {
      await setGenerationMediaUrl(generationId, audioUrl).catch(() => {});
    }
    const responseJson = { audioUrl };
    await completeIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
      responseStatus: 200,
      responseJson,
    }).catch(() => {});
    return NextResponse.json(responseJson);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      const responseJson = {
        error: "Insufficient credits",
        requiredCredits: error.requiredCredits,
        currentBalance: error.currentBalance,
      };
      if (chargedUserId && requestHash) {
        await completeIdempotency({
          userId: chargedUserId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: 402,
          responseJson,
        }).catch(() => {});
      }
      return NextResponse.json(
        responseJson,
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => {});
    }

    console.error("[MUSIC_ERROR]", error);
    const msg = error instanceof Error ? error.message : "Internal Error";
    if (chargedUserId && requestHash) {
      await completeIdempotency({
        userId: chargedUserId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus: 500,
        responseJson: { error: msg },
      }).catch(() => {});
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

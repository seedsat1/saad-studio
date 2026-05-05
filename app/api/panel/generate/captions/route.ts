import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  spendCredits,
} from "@/lib/credit-ledger";
import { isSafePublicHttpUrl } from "@/lib/security";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const CAPTIONS_CREDIT_COST = 3;
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const WS_WHISPER_MODEL = "wavespeed-ai/openai-whisper";

function getWsKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured.");
  return key;
}

async function pollWaveSpeed(
  predictionId: string,
  apiKey: string,
): Promise<{ text: string; subtitleUrl?: string }> {
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `${WAVESPEED_BASE_URL}/predictions/${predictionId}/fetch`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) continue;
    const json = await res.json().catch(() => ({})) as {
      data?: {
        status?: string;
        outputs?: unknown;
        error?: string;
      };
    };
    const data = json?.data ?? {};
    const status = String(data.status ?? "").toLowerCase();

    if (status === "completed") {
      const out = data.outputs as Record<string, unknown> | null;
      const text = String(
        out?.text ?? out?.transcription ?? out?.transcript ?? "",
      );
      const subtitleUrl = String(
        out?.subtitle_url ?? out?.vtt_url ?? out?.srt_url ?? "",
      ) || undefined;
      return { text, subtitleUrl };
    }
    if (status === "failed") {
      throw new Error(String(data.error ?? "Captions generation failed."));
    }
  }
  throw new Error("Captions generation timed out.");
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const { userId } = verified;

  let body: { audioUrl?: string; language?: string; engine?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const audioUrl = String(body.audioUrl ?? "").trim();
  if (!audioUrl) return NextResponse.json({ error: "audioUrl is required." }, { status: 400 });
  if (!isSafePublicHttpUrl(audioUrl)) {
    return NextResponse.json({ error: "audioUrl must be a valid public https URL." }, { status: 400 });
  }

  const language = String(body.language ?? "en").slice(0, 10);

  await ensureUserRow(userId);

  try {
    const { balanceAfter } = await spendCredits(
      userId,
      CAPTIONS_CREDIT_COST,
      "panel_captions",
      { audioUrl: audioUrl.slice(0, 80) },
    );

    const apiKey = getWsKey();

    const startRes = await fetch(`${WAVESPEED_BASE_URL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: WS_WHISPER_MODEL,
        input: {
          audio: audioUrl,
          language: language === "auto" ? null : language,
          word_timestamps: true,
          output_format: "vtt",
        },
      }),
    });

    const startJson = await startRes.json().catch(() => ({})) as {
      data?: { id?: string };
      msg?: string;
    };
    if (!startRes.ok) throw new Error(startJson?.msg ?? "WaveSpeed Whisper start failed.");

    const predictionId = startJson?.data?.id;
    if (!predictionId) throw new Error("No prediction ID returned.");

    const { text, subtitleUrl } = await pollWaveSpeed(String(predictionId), apiKey);

    return NextResponse.json({
      text,
      subtitleUrl,
      creditsUsed: CAPTIONS_CREDIT_COST,
      balanceAfter,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits.", requiredCredits: CAPTIONS_CREDIT_COST },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: (err as Error).message ?? "Captions failed." },
      { status: 500 },
    );
  }
}

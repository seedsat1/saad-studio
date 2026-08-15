import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { sanitizePrompt } from "@/lib/security";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const TTS_CREDIT_COST = 3;
const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_TTS_MODEL = "elevenlabs/text-to-speech-multilingual-v2";
// Panel TTS is a separate lightweight panel action; keep its intentional fixed charge independent from the main /api/generate/audio TTS legacy price.

// ElevenLabs voice IDs for multilingual-v2
const VOICE_IDS: Record<string, string> = {
  rachel:   "21m00Tcm4TlvDq8ikWAM",
  brian:    "nPczCjzI2devNBz1zQrb",
  aria:     "9BWtsMINqrJLrRacOk9x",
  daniel:   "onwK4e9ZLuTAKqWW03F9",
  matilda:  "XrExE9yKIg1WjnnlVkGX",
  arabella: "pFZP5JQG7iQjIQuC4Bku",
};

function getKieKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error("KIE_API_KEY is not configured.");
  return key;
}

async function pollKie(
  taskId: string,
  apiKey: string,
): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) continue;
    const json = await res.json().catch(() => ({})) as {
      data?: { state?: string; resultJson?: unknown; failMsg?: string };
    };
    const data = json?.data ?? {};
    const state = String(data.state ?? "").toLowerCase();

    if (state === "success") {
      const payload = data.resultJson as Record<string, unknown> | null;
      const urls: string[] =
        (payload?.resultUrls as string[]) ??
        ((payload?.resultObject as Record<string, unknown>)?.resultUrls as string[]) ??
        [];
      const url = urls.find((u) => typeof u === "string" && /^https?:\/\//.test(u));
      if (!url) throw new Error("TTS returned no audio URL.");
      return url;
    }
    if (state === "fail" || state === "failed") {
      throw new Error(data.failMsg ?? "TTS generation failed.");
    }
  }
  throw new Error("TTS generation timed out.");
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const rate = hitRateLimit({
    key: `panel:generate-tts:${verified.userId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  const { userId } = verified;

  let body: { text?: string; voiceId?: string; speed?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const text = sanitizePrompt(String(body.text ?? "")).slice(0, 4000);
  if (!text) return NextResponse.json({ error: "text is required." }, { status: 400 });

  const voiceKey = String(body.voiceId ?? "rachel").toLowerCase();
  const voiceId = VOICE_IDS[voiceKey] ?? VOICE_IDS.rachel;
  const speed = Math.max(0.5, Math.min(2.0, Number(body.speed ?? 1.0)));

  await ensureUserRow(userId);
  let generationId: string | undefined;

  try {
    const { generationId: gid, remainingCredits } = await spendCredits({
      userId,
      credits: TTS_CREDIT_COST,
      prompt: text.slice(0, 100),
      assetType: "audio",
      modelUsed: "tts",
    });
    generationId = gid;

    const apiKey = getKieKey();

    const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: KIE_TTS_MODEL,
        callBackUrl: "",
        input: {
          text,
          voice: voiceId,
          speed,
          emotion: "neutral",
        },
        config: { serviceMode: "", webhookConfig: { endpoint: "", secret: "" } },
      }),
    });

    const submitJson = await submitRes.json().catch(() => ({})) as {
      data?: { taskId?: string; id?: string };
      msg?: string;
    };
    if (!submitRes.ok) throw new Error(submitJson?.msg ?? "KIE submit failed.");

    const taskId = submitJson?.data?.taskId ?? submitJson?.data?.id;
    if (!taskId) throw new Error("No taskId returned from KIE.");

    const audioUrl = await pollKie(String(taskId), apiKey);

    if (generationId) await setGenerationMediaUrl(generationId, audioUrl);

    return NextResponse.json({
      audioUrl,
      creditsUsed: TTS_CREDIT_COST,
      balanceAfter: remainingCredits,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits.", requiredCredits: TTS_CREDIT_COST },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: (err as Error).message ?? "TTS failed." },
      { status: 500 },
    );
  }
}

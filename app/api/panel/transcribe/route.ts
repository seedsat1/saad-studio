import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  spendCredits,
} from "@/lib/credit-ledger";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TRANSCRIBE_CREDIT_COST = 10;

// ─── Groq Whisper API ─────────────────────────────────────────────────────────

type GroqWhisperSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
};

type GroqWhisperResponse = {
  text: string;
  language: string;
  duration: number;
  segments: GroqWhisperSegment[];
};

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured.");
  return key;
}

async function transcribeWithGroq(
  audioFile: File,
  language: string = "ar",
): Promise<GroqWhisperResponse> {
  const apiKey = getGroqApiKey();

  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");
  formData.append("language", language);
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Groq Whisper API failed: ${errorText}`);
  }

  const json = await res.json();

  return {
    text: json.text || "",
    language: json.language || language,
    duration: json.duration || 0,
    segments: (json.segments || []).map((seg: any) => ({
      id: seg.id || 0,
      start: seg.start || 0,
      end: seg.end || 0,
      text: seg.text || "",
      words: seg.words,
    })),
  };
}

// ─── OpenAI Whisper Fallback ──────────────────────────────────────────────────

async function transcribeWithOpenAI(
  audioFile: File,
  language: string = "ar",
): Promise<GroqWhisperResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("language", language);
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`OpenAI Whisper API failed: ${errorText}`);
  }

  const json = await res.json();

  return {
    text: json.text || "",
    language: json.language || language,
    duration: json.duration || 0,
    segments: (json.segments || []).map((seg: any) => ({
      id: seg.id || 0,
      start: seg.start || 0,
      end: seg.end || 0,
      text: seg.text || "",
      words: seg.words,
    })),
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  const { userId } = verified;

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const language = (formData.get("language") as string)?.trim() || "ar";
  const sequenceName = (formData.get("sequenceName") as string)?.trim() || "Unknown Sequence";

  // Validate file size (max 25MB for Groq/OpenAI)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (audioFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Audio file too large. Maximum size is 25MB.` },
      { status: 400 },
    );
  }

  // 3. Ensure user row exists
  await ensureUserRow(userId);

  let generationId: string | null = null;

  try {
    // 4. Spend credits BEFORE transcription
    const spent = await spendCredits({
      userId,
      credits: TRANSCRIBE_CREDIT_COST,
      prompt: `Transcribe: ${sequenceName}`,
      assetType: "TRANSCRIPTION",
      modelUsed: "whisper-large-v3",
    });
    generationId = spent.generationId ?? null;

    // 5. Transcribe with Groq (fallback to OpenAI if fails)
    let result: GroqWhisperResponse;
    try {
      result = await transcribeWithGroq(audioFile, language);
    } catch (groqError) {
      console.warn("[panel/transcribe] Groq failed, trying OpenAI fallback:", groqError);
      try {
        result = await transcribeWithOpenAI(audioFile, language);
      } catch (openaiError) {
        console.error("[panel/transcribe] Both Groq and OpenAI failed:", openaiError);
        throw new Error("Transcription failed with all providers.");
      }
    }

    // 6. Return structured response
    return NextResponse.json({
      metadata: {
        duration: result.duration,
        language: result.language,
        provider: "groq-whisper-large-v3",
        sequenceName,
        createdAt: new Date().toISOString(),
      },
      segments: result.segments,
      fullText: result.text,
      creditsUsed: TRANSCRIBE_CREDIT_COST,
      generationId,
    });

  } catch (error) {
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

    console.error("[panel/transcribe]", error);
    return NextResponse.json(
      { error: (error as Error).message || "Transcription failed." },
      { status: 500 },
    );
  }
}

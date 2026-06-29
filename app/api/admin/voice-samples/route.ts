import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const runtime = "nodejs";

const GOOGLE_GEMINI_TTS_VOICES = [
  ["Zephyr", "Bright", "female"],
  ["Puck", "Upbeat", "male"],
  ["Charon", "Informative", "male"],
  ["Kore", "Firm", "female"],
  ["Fenrir", "Excitable", "male"],
  ["Leda", "Youthful", "female"],
  ["Orus", "Firm", "male"],
  ["Aoede", "Breezy", "female"],
  ["Callirrhoe", "Easy-going", "female"],
  ["Autonoe", "Bright", "female"],
  ["Enceladus", "Breathy", "male"],
  ["Iapetus", "Clear", "male"],
  ["Umbriel", "Easy-going", "male"],
  ["Algieba", "Smooth", "male"],
  ["Despina", "Smooth", "female"],
  ["Erinome", "Clear", "female"],
  ["Algenib", "Gravelly", "male"],
  ["Rasalgethi", "Informative", "male"],
  ["Laomedeia", "Upbeat", "female"],
  ["Achernar", "Soft", "female"],
  ["Alnilam", "Firm", "male"],
  ["Schedar", "Even", "female"],
  ["Gacrux", "Mature", "female"],
  ["Pulcherrima", "Forward", "female"],
  ["Achird", "Friendly", "male"],
  ["Zubenelgenubi", "Casual", "male"],
  ["Vindemiatrix", "Gentle", "female"],
  ["Sadachbia", "Lively", "male"],
  ["Sadaltager", "Knowledgeable", "male"],
  ["Sulafat", "Warm", "female"],
] as const;

function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function extractGeminiAudio(value: unknown): { data: string; mimeType: string } | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const candidates = Array.isArray(rec.candidates) ? rec.candidates : [];
  for (const candidate of candidates) {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    for (const part of parts) {
      const inlineData = (part as Record<string, unknown>)?.inlineData as Record<string, unknown> | undefined;
      const data = inlineData?.data;
      if (typeof data !== "string" || !data) continue;
      const mimeType = typeof inlineData?.mimeType === "string" ? inlineData.mimeType : "audio/L16;rate=24000";
      return { data, mimeType };
    }
  }
  return null;
}

export async function GET() {
  try {
    const voices = GOOGLE_GEMINI_TTS_VOICES.map(([name, tone, gender]) => ({
      id: `gemini:${name}`,
      name: `Gemini ${name}`,
      cleanId: name,
      tone,
      gender,
      provider: "Google Gemini",
      sampleUrl: `/api/voice-sample?voice=${encodeURIComponent(name)}`,
    }));

    return NextResponse.json({ voices });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const voiceId = String(body.voiceId || "Sulafat").replace(/^gemini:/i, "").trim();

    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Google API key not configured on server." }, { status: 500 });
    }

    const prompt = `اقرأ النص التالي بالعربية بصوت واضح وطبيعي ومناسب للجمهور العربي:\n\nمرحباً، هذا نموذج رسمس لمعاينة خامة الصوت الاصطناعي في سعد ستوديو.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceId },
              },
            },
          },
        }),
      }
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || `Google Gemini TTS error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const audio = extractGeminiAudio(json);
    if (!audio) {
      return NextResponse.json({ error: "No audio data returned from Gemini TTS" }, { status: 502 });
    }

    const raw = Buffer.from(audio.data, "base64");
    const buffer = audio.mimeType.toLowerCase().includes("wav") ? raw : pcmToWav(raw);

    const uploadedUrl = await uploadBufferToStorage({
      buffer,
      contentType: "audio/wav",
      userId: "admin_previews",
      assetType: "audio",
      generationId: `voice_sample_${voiceId.toLowerCase()}`,
      fileName: `sample_${voiceId.toLowerCase()}.wav`,
    });

    return NextResponse.json({
      success: true,
      voiceId,
      sampleUrl: uploadedUrl || `/api/voice-sample?voice=${encodeURIComponent(voiceId)}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { getRegistry, saveRegistry } from "@/lib/voice-registry";
import { isMp3Buffer, transcodeToMp3 } from "@/lib/server/audio-transcode";

export const runtime = "nodejs";

const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

function toBrowserMediaUrl(value: string): string {
  if (value.startsWith("/")) return value;

  const match = value.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/([^?#]+)/i);
  if (!match) return value;

  return `/api/media/${match[1]}/${match[2]}`;
}

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
    const registry = getRegistry();
    const voices = GOOGLE_GEMINI_TTS_VOICES.map(([name, tone, gender]) => {
      const storedUrl = registry[name];
      const sampleUrl = storedUrl
        ? toBrowserMediaUrl(storedUrl)
        : `/api/voice-sample?voice=${encodeURIComponent(name)}`;

      return {
        id: `gemini:${name}`,
        name: `Gemini ${name}`,
        cleanId: name,
        tone,
        gender,
        provider: "Google Gemini",
        sampleUrl,
        isGenerated: !!storedUrl,
      };
    });

    return NextResponse.json({ voices });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

async function generateAndSaveVoiceSample(voiceId: string, apiKey: string): Promise<string> {
  const prompt = `اقرأ النص التالي بالعربية بصوت واضح وطبيعي ومناسب للجمهور العربي:\n\nمرحباً، هذا نموذج لمعاينة خامة الصوت الاصطناعي في سعد ستوديو.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
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
    throw new Error(msg);
  }

  const audio = extractGeminiAudio(json);
  if (!audio) {
    throw new Error("No audio data returned from Gemini TTS");
  }

  const raw = Buffer.from(audio.data, "base64");
  const wavBuffer = audio.mimeType.toLowerCase().includes("wav") ? raw : pcmToWav(raw);
  
  let mp3Buffer: Buffer = wavBuffer;
  try {
    mp3Buffer = (await transcodeToMp3(wavBuffer, { bitrate: "192k", sampleRate: 44100 })) as any;
  } catch (err) {
    console.warn(`[VOICE_SAMPLES_ADMIN] MP3 transcode fallback for ${voiceId}:`, err);
  }

  const uploadedUrl = await uploadBufferToStorage({
    buffer: mp3Buffer,
    contentType: "audio/mpeg",
    userId: "admin_previews",
    assetType: "audio",
    generationId: `voice_sample_${voiceId.toLowerCase()}`,
    fileName: `sample_${voiceId.toLowerCase()}.mp3`,
  });

  if (uploadedUrl) {
    const registry = getRegistry();
    registry[voiceId] = uploadedUrl;
    saveRegistry(registry);
  }

  return uploadedUrl
    ? toBrowserMediaUrl(uploadedUrl)
    : `/api/voice-sample?voice=${encodeURIComponent(voiceId)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Google API key not configured on server." }, { status: 500 });
    }

    if (body.generateAll) {
      const results: { voiceId: string; success: boolean; sampleUrl?: string; error?: string }[] = [];
      
      for (const [name] of GOOGLE_GEMINI_TTS_VOICES) {
        try {
          const sampleUrl = await generateAndSaveVoiceSample(name, apiKey);
          results.push({ voiceId: name, success: true, sampleUrl });
        } catch (err: any) {
          results.push({ voiceId: name, success: false, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        generatedCount: results.filter(r => r.success).length,
        total: GOOGLE_GEMINI_TTS_VOICES.length,
        results,
      });
    }

    const voiceId = String(body.voiceId || "Sulafat").replace(/^gemini:/i, "").trim();
    const finalSampleUrl = await generateAndSaveVoiceSample(voiceId, apiKey);

    return NextResponse.json({
      success: true,
      voiceId,
      sampleUrl: finalSampleUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

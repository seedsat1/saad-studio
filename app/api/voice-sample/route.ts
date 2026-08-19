import { NextRequest, NextResponse } from "next/server";
import { getRegistry, saveRegistry } from "@/lib/voice-registry";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { transcodeToMp3 } from "@/lib/server/audio-transcode";

export const dynamic = "force-dynamic";

const GOOGLE_GEMINI_TTS_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]);

const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

// Concurrency guard: deduplicate simultaneous first-click requests for the same voice+lang preview
const inFlightPreviews = new Map<string, Promise<string>>();

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

function toBrowserMediaUrl(value: string): string {
  if (value.startsWith("/")) return value;

  const match = value.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/([^?#]+)/i);
  if (!match) return value;

  const mediaPath = `${match[1]}/${match[2]}`;
  return `/api/media/${mediaPath}`;
}

function mp3Response(buffer: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}

const GOOGLE_GEMINI_TTS_VOICE_DETAILS: Record<string, { arabicName: string; gender: "أنثوي" | "رجالي" }> = {
  Zephyr: { arabicName: "زيفير", gender: "أنثوي" },
  Puck: { arabicName: "باك", gender: "رجالي" },
  Charon: { arabicName: "كارون", gender: "رجالي" },
  Kore: { arabicName: "كوري", gender: "أنثوي" },
  Fenrir: { arabicName: "فينرير", gender: "رجالي" },
  Leda: { arabicName: "ليدا", gender: "أنثوي" },
  Orus: { arabicName: "اوروس", gender: "رجالي" },
  Aoede: { arabicName: "آويدي", gender: "أنثوي" },
  Callirrhoe: { arabicName: "كاليِروي", gender: "أنثوي" },
  Autonoe: { arabicName: "أوتونوي", gender: "أنثوي" },
  Enceladus: { arabicName: "إنسيلادوس", gender: "رجالي" },
  Iapetus: { arabicName: "يابيتوس", gender: "رجالي" },
  Umbriel: { arabicName: "أومبريل", gender: "رجالي" },
  Algieba: { arabicName: "ألكيبا", gender: "رجالي" },
  Despina: { arabicName: "ديسبينا", gender: "أنثوي" },
  Erinome: { arabicName: "إيرينومي", gender: "أنثوي" },
  Algenib: { arabicName: "ألكينيب", gender: "رجالي" },
  Rasalgethi: { arabicName: "راسالجيثي", gender: "رجالي" },
  Laomedeia: { arabicName: "لاوميديا", gender: "أنثوي" },
  Achernar: { arabicName: "أشيرنار", gender: "أنثوي" },
  Alnilam: { arabicName: "ألنيلام", gender: "رجالي" },
  Schedar: { arabicName: "شيدار", gender: "أنثوي" },
  Gacrux: { arabicName: "جاكروكس", gender: "أنثوي" },
  Pulcherrima: { arabicName: "بولشيريما", gender: "أنثوي" },
  Achird: { arabicName: "أشيرد", gender: "رجالي" },
  Zubenelgenubi: { arabicName: "زوبينالجانوبي", gender: "رجالي" },
  Vindemiatrix: { arabicName: "فينديمياتريكس", gender: "أنثوي" },
  Sadachbia: { arabicName: "ساداشبيا", gender: "رجالي" },
  Sadaltager: { arabicName: "سادالتاجر", gender: "رجالي" },
  Sulafat: { arabicName: "سولافات", gender: "أنثوي" },
};

const LANGUAGE_PROMPTS: Record<string, string> = {
  ar: "مرحباً، أنا {voice}، صوت {gender} من سعد ستوديو.",
  en: "Hello, I am {voice}, a {gender} voice from Saad Studio.",
  es: "Hola, soy {voice}, una voz {gender} de Saad Studio.",
  pt: "Olá, eu sou {voice}, uma voz {gender} do Saad Studio.",
  hi: "नमस्ते, मैं {voice} हूँ, साਦ स्टूडियो की एक {gender} आवाज़।",
  ru: "Привет, я {voice}, {gender} голос из Saad Studio.",
  fr: "Bonjour, je suis {voice}, une voix {gender} de Saad Studio.",
  de: "Hallo, ich bin {voice}, eine {gender} Stimme aus dem Saad Studio.",
  ko: "안녕하세요, 저는 사드 스튜디오의 {gender} 목소리 {voice}입니다.",
  tr: "Merhaba, ben {voice}, Saad Studio'dan bir {gender} ses.",
  it: "Ciao, sono {voice}, una voce {gender} di Saad Studio."
};

const LANGUAGE_GENDERS: Record<string, { male: string; female: string }> = {
  ar: { male: "رجالي", female: "أنثوي" },
  en: { male: "male", female: "female" },
  es: { male: "masculina", female: "femenina" },
  pt: { male: "masculina", female: "femenina" },
  hi: { male: "पुरुष", female: "महिला" },
  ru: { male: "мужской", female: "женский" },
  fr: { male: "masculine", female: "féminine" },
  de: { male: "männliche", female: "weibliche" },
  ko: { male: "남성", female: "여성" },
  tr: { male: "erkek", female: "kadın" },
  it: { male: "maschile", female: "femminile" }
};

async function generateAndPersistPreview(exactVoice: string, exactLang: string, apiKey: string): Promise<string> {
  const details = GOOGLE_GEMINI_TTS_VOICE_DETAILS[exactVoice] || { arabicName: exactVoice, gender: "أنثوي" };
  const isFemale = details.gender === "أنثوي";
  const genderStr = LANGUAGE_GENDERS[exactLang]?.[isFemale ? "female" : "male"] || (isFemale ? "female" : "male");
  const template = LANGUAGE_PROMPTS[exactLang] || LANGUAGE_PROMPTS.ar;
  const voiceLabel = exactLang === "ar" ? details.arabicName : exactVoice;
  const prompt = template.replace("{voice}", voiceLabel).replace("{gender}", genderStr);

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
              prebuiltVoiceConfig: { voiceName: exactVoice },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google TTS API failed with HTTP ${res.status}`);
  }

  const json = await res.json().catch(() => null);
  const audio = extractGeminiAudio(json);
  if (!audio) {
    throw new Error("No audio payload returned from Gemini TTS");
  }

  const raw = Buffer.from(audio.data, "base64");
  const initialBuffer = audio.mimeType.toLowerCase().includes("wav") ? raw : pcmToWav(raw);

  // Transcode to clean canonical MP3
  const mp3Buffer = await transcodeToMp3(initialBuffer, {
    bitrate: "192k",
    sampleRate: 44100,
    channels: 2,
  });

  const uploadedUrl = await uploadBufferToStorage({
    buffer: mp3Buffer,
    contentType: "audio/mpeg",
    userId: "admin_previews",
    assetType: "audio",
    generationId: `voice_preview_google_${exactVoice.toLowerCase()}_${exactLang}`,
    fileName: `sample_${exactVoice.toLowerCase()}_${exactLang}.mp3`,
  });

  if (!uploadedUrl) {
    throw new Error("Storage upload failed for voice preview");
  }

  const registryKey = `voice-preview:google:${exactVoice.toLowerCase()}:${exactLang}`;
  const registry = getRegistry();
  registry[registryKey] = uploadedUrl;
  registry[`${exactVoice}_${exactLang}`] = uploadedUrl;
  if (exactLang === "ar") {
    registry[exactVoice] = uploadedUrl;
  }
  saveRegistry(registry);

  return uploadedUrl;
}

export async function GET(req: NextRequest) {
  try {
    const voiceParam = req.nextUrl.searchParams.get("voice") || "Sulafat";
    const langParam = req.nextUrl.searchParams.get("lang") || "ar";
    const rawName = String(voiceParam).replace(/^gemini:/i, "").trim();
    const exactVoice = Array.from(GOOGLE_GEMINI_TTS_VOICES).find(
      (v) => v.toLowerCase() === rawName.toLowerCase()
    ) || "Sulafat";

    const exactLang = LANGUAGE_PROMPTS[langParam.toLowerCase()] ? langParam.toLowerCase() : "ar";
    const canonicalKey = `voice-preview:google:${exactVoice.toLowerCase()}:${exactLang}`;
    const legacyKey = `${exactVoice}_${exactLang}`;

    // 1. Check persistent registry (ZERO provider calls for existing previews)
    const registry = getRegistry();
    const storedUrl = registry[canonicalKey] || registry[legacyKey] || (exactLang === "ar" ? registry[exactVoice] : undefined);
    if (storedUrl) {
      const targetUrl = toBrowserMediaUrl(storedUrl);
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    // 2. Generate once if missing with deduplication lock
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (apiKey) {
      let previewPromise = inFlightPreviews.get(canonicalKey);
      if (!previewPromise) {
        previewPromise = generateAndPersistPreview(exactVoice, exactLang, apiKey)
          .finally(() => {
            inFlightPreviews.delete(canonicalKey);
          });
        inFlightPreviews.set(canonicalKey, previewPromise);
      }

      const uploadedUrl = await previewPromise;
      const targetUrl = toBrowserMediaUrl(uploadedUrl);
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    // 3. Fallback to any existing pre-rendered voice URL
    const fallbackUrl = registry["Sulafat"] || Object.values(registry)[0];
    if (fallbackUrl) {
      const targetUrl = toBrowserMediaUrl(fallbackUrl);
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    return new NextResponse("Voice sample generation is not configured on the server.", { status: 503 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new NextResponse(message, { status: 500 });
  }
}

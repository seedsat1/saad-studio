import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

const GOOGLE_GEMINI_TTS_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]);

const REGISTRY_PATH = path.join(process.cwd(), "public/stude/voice_samples_registry.json");

export function getRegistry(): Record<string, string> {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Error reading registry:", e);
  }
  return {};
}

export function saveRegistry(registry: Record<string, string>) {
  try {
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing registry:", e);
  }
}

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

export async function GET(req: NextRequest) {
  try {
    const voiceParam = req.nextUrl.searchParams.get("voice") || "Sulafat";
    const rawName = String(voiceParam).replace(/^gemini:/i, "").trim();
    const exactVoice = Array.from(GOOGLE_GEMINI_TTS_VOICES).find(
      (v) => v.toLowerCase() === rawName.toLowerCase()
    ) || "Sulafat";

    // 1. Check persistent registry
    const registry = getRegistry();
    const storedUrl = registry[exactVoice];
    if (storedUrl) {
      return NextResponse.redirect(new URL(storedUrl, req.url));
    }

    // 2. Generate if not found
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return new NextResponse("Google API key not configured", { status: 500 });
    }

    const prompt = `اقرأ النص التالي بالعربية بصوت واضح وطبيعي ومناسب للجمهور العربي:\n\nمرحباً، هذا نموذج لمعاينة خامة الصوت الاصطناعي في سعد ستوديو.`;

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
                prebuiltVoiceConfig: { voiceName: exactVoice },
              },
            },
          },
        }),
      }
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || `Gemini API error ${res.status}`;
      return new NextResponse(msg, { status: 502 });
    }

    const audio = extractGeminiAudio(json);
    if (!audio) {
      return new NextResponse("No audio data returned", { status: 502 });
    }

    const raw = Buffer.from(audio.data, "base64");
    const buffer = audio.mimeType.toLowerCase().includes("wav") ? raw : pcmToWav(raw);

    // 3. Upload buffer to permanent storage
    const uploadedUrl = await uploadBufferToStorage({
      buffer,
      contentType: "audio/wav",
      userId: "admin_previews",
      assetType: "audio",
      generationId: `voice_sample_${exactVoice.toLowerCase()}`,
      fileName: `sample_${exactVoice.toLowerCase()}.wav`,
    });

    if (uploadedUrl) {
      registry[exactVoice] = uploadedUrl;
      saveRegistry(registry);
      return NextResponse.redirect(new URL(uploadedUrl, req.url));
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    return new NextResponse(error?.message || "Internal server error", { status: 500 });
  }
}

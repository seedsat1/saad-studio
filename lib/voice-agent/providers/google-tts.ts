import { TextToSpeechClient, protos } from "@google-cloud/text-to-speech";

type AudioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding;

let cachedClient: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient {
  if (cachedClient) return cachedClient;
  cachedClient = new TextToSpeechClient();
  return cachedClient;
}

export type ArabicVoice =
  | "ar-XA-Wavenet-A"
  | "ar-XA-Wavenet-B"
  | "ar-XA-Wavenet-C"
  | "ar-XA-Wavenet-D"
  | "ar-XA-Standard-A"
  | "ar-XA-Standard-B"
  | "ar-XA-Standard-C"
  | "ar-XA-Standard-D";

export type SynthesizeInput = {
  text: string;
  voiceName?: ArabicVoice | string;
  languageCode?: string;
  speakingRate?: number;
  pitch?: number;
  audioEncoding?: "MP3" | "LINEAR16" | "MULAW" | "OGG_OPUS";
  sampleRateHertz?: number;
};

export type SynthesizeResult = {
  audioBase64: string;
  audioBuffer: Buffer;
  mimeType: string;
  voiceName: string;
  languageCode: string;
};

const ENCODING_TO_MIME: Record<string, string> = {
  MP3: "audio/mpeg",
  LINEAR16: "audio/wav",
  MULAW: "audio/basic",
  OGG_OPUS: "audio/ogg",
};

export const DEFAULT_ARABIC_FEMALE_VOICE = "ar-XA-Chirp3-HD-Despina";
export const DEFAULT_ARABIC_MALE_VOICE = "ar-XA-Chirp3-HD-Achird";

export async function synthesizeSpeech(input: SynthesizeInput): Promise<SynthesizeResult> {
  const client = getClient();
  const voiceName = input.voiceName ?? DEFAULT_ARABIC_FEMALE_VOICE;
  const languageCode = input.languageCode ?? "ar-XA";
  const encodingKey = input.audioEncoding ?? "MULAW";

  const [response] = await client.synthesizeSpeech({
    input: { text: input.text },
    voice: { languageCode, name: voiceName },
    audioConfig: {
      audioEncoding: encodingKey as unknown as AudioEncoding,
      sampleRateHertz: input.sampleRateHertz ?? (encodingKey === "MULAW" ? 8000 : 24000),
      speakingRate: input.speakingRate ?? 1.0,
      pitch: input.pitch ?? 0,
    },
  });

  if (!response.audioContent) {
    throw new Error("google-tts: empty audioContent");
  }

  const audioBuffer = Buffer.isBuffer(response.audioContent)
    ? response.audioContent
    : Buffer.from(response.audioContent as Uint8Array);

  return {
    audioBase64: audioBuffer.toString("base64"),
    audioBuffer,
    mimeType: ENCODING_TO_MIME[encodingKey] ?? "application/octet-stream",
    voiceName,
    languageCode,
  };
}

export async function listArabicVoices() {
  const client = getClient();
  const [response] = await client.listVoices({ languageCode: "ar-XA" });
  return (response.voices ?? []).map((voice) => ({
    name: voice.name ?? "",
    ssmlGender: voice.ssmlGender,
    naturalSampleRateHertz: voice.naturalSampleRateHertz,
  }));
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost, getGenerationCostQuote } from "@/lib/pricing";
import { InsufficientCreditsError, precheckGenerationPolicy, refundGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import { attachIdempotencyGeneration, beginIdempotency, completeIdempotency, getIdempotencyKey, hashRequestBody } from "@/lib/idempotency";

export const runtime = "nodejs";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";
const IDEMPOTENCY_ROUTE = "generate:audio";

const WS_TTS_MODEL = "elevenlabs/multilingual-v2";
const WS_VIDEO2AUDIO_MODEL = "wavespeed-ai/mmaudio-v2";
const VALID_ELEVENLABS_MUSIC_FORMATS = new Set(['mp3_standard','mp3_high_quality','wav_16khz','wav_22khz','wav_24khz','wav_cd_quality']);

function sanitizeMusicFormat(fmt: string | undefined): string {
  if (fmt && VALID_ELEVENLABS_MUSIC_FORMATS.has(fmt)) return fmt;
  return 'mp3_high_quality';
}

const WS_MUSIC_MODEL = "elevenlabs/music";
const WS_GOOGLE_LYRIA_CLIP_MODEL = "google/lyria-3-clip/music";
const WS_GOOGLE_LYRIA_PRO_MODEL = "google/lyria-3-pro/music";
const WS_VOICE_CHANGER_MODEL = "elevenlabs/voice-changer";
const WS_DUBBING_MODEL = "elevenlabs/dubbing";
const WS_LIPSYNC_MODEL = "sync/lipsync-3";
const WS_VOICE_CLONING_MODEL = "minimax/voice-clone";
const KIE_TTS_MULTILINGUAL_V2_MODEL = "elevenlabs/text-to-speech-multilingual-v2";
const KIE_TEXT_TO_DIALOGUE_V3_MODEL = "elevenlabs/text-to-dialogue-v3";
const KIE_SOUND_EFFECT_V2_MODEL = "elevenlabs/sound-effect-v2";
const KIE_SPEECH_TO_TEXT_MODEL = "elevenlabs/speech-to-text";
const KIE_AUDIO_ISOLATION_MODEL = "elevenlabs/audio-isolation";
const KIE_FROM_AUDIO_MODEL = "infinitalk/from-audio";
const KIE_AI_AVATAR_PRO_MODEL = "kling/ai-avatar-pro";
const KIE_SEEDANCE_2_MODEL = "bytedance/seedance-2";
const KIE_SEEDANCE_2_FAST_MODEL = "bytedance/seedance-2-fast";

interface AudioRequestBody {
  actionType: "tts" | "video2audio" | "music" | "speech-to-text" | "audio-isolation" | "voice-changer" | "dubbing" | "lip-sync" | "voice-cloning";
  text?: string;
  voice?: string;
  speed?: number;
  emotion?: string;
  stability?: number;
  clarity?: number;
  use_speaker_boost?: boolean;
  videoUrl?: string;
  audioUrl?: string;
  remove_background_noise?: boolean;
  prompt?: string;
  lyrics?: string;
  stylePrompt?: string;
  musicDuration?: number;
  music_length_ms?: number;
  force_instrumental?: boolean;
  output_format?: string;
  image?: string;
  outputFormat?: string;
  sync_mode?: "loop" | "bounce" | "cut_off" | "silence" | "remap";
  sourceLang?: string;
  targetLang?: string;
  cloneName?: string;
  sampleAudioUrls?: string[];
  description?: string;
  labels?: string;
  model?: string;
  imageUrl?: string;
  resolution?: "480p" | "720p" | "1080p";
  seed?: number;
  aspect_ratio?: "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9";
  duration?: number;
  web_search?: boolean;
}

type KieRecordResult = {
  status: "completed" | "failed";
  resultJson?: unknown;
  error?: string;
};

interface WaveSpeedApiResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: string;
    outputs?: string[];
    error?: string;
  };
}

function parseBase64DataUrl(raw: string) {
  const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("mpeg", "mp3").replace("x-m4a", "m4a") || "bin";
  return { mime, fileData, ext };
}

async function uploadDataUrlToWaveSpeed(dataUrl: string, apiKey: string): Promise<string> {
  const parsed = parseBase64DataUrl(dataUrl);
  if (!parsed) return dataUrl;

  const buffer = Buffer.from(parsed.fileData, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: parsed.mime }), `audio-upload.${parsed.ext}`);

  const uploadRes = await fetch(`${WAVESPEED_BASE_URL}/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const uploadJson = await uploadRes.json().catch(() => null);
  const url =
    uploadJson?.data?.download_url ||
    uploadJson?.data?.url ||
    uploadJson?.data?.downloadUrl;

  if (!uploadRes.ok || !url) {
    throw new Error(uploadJson?.message || uploadJson?.msg || "WaveSpeed audio upload failed.");
  }

  return String(url);
}

function looksLikeKieModel(model?: string): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  if (m.startsWith("wavespeed-ai/") || m.startsWith("minimax/")) return false;
  return m.includes("/");
}

function resolveWaveSpeedTtsModel(model?: string): string {
  if (!model) return WS_TTS_MODEL;
  const normalized = model.trim().toLowerCase();
  if (normalized === "elevenlabs/eleven-v3" || normalized === "eleven_v3") return "elevenlabs/eleven-v3";
  if (normalized === "elevenlabs/multilingual-v2" || normalized === "eleven_multilingual_v2") return "elevenlabs/multilingual-v2";
  return WS_TTS_MODEL;
}

function resolveWaveSpeedMusicModel(model?: string): string {
  if (!model) return WS_MUSIC_MODEL;
  const normalized = model.trim().toLowerCase();
  if (normalized === KIE_SOUND_EFFECT_V2_MODEL) return KIE_SOUND_EFFECT_V2_MODEL;
  if (normalized === WS_GOOGLE_LYRIA_CLIP_MODEL) return WS_GOOGLE_LYRIA_CLIP_MODEL;
  if (normalized === WS_GOOGLE_LYRIA_PRO_MODEL) return WS_GOOGLE_LYRIA_PRO_MODEL;
  if (normalized === WS_MUSIC_MODEL) return WS_MUSIC_MODEL;
  return WS_MUSIC_MODEL;
}

function resolveKieTtsModel(model?: string): string {
  const normalized = String(model || "").trim().toLowerCase();
  if (normalized === KIE_TEXT_TO_DIALOGUE_V3_MODEL) return KIE_TEXT_TO_DIALOGUE_V3_MODEL;
  if (normalized === KIE_TTS_MULTILINGUAL_V2_MODEL) return KIE_TTS_MULTILINGUAL_V2_MODEL;
  return KIE_TTS_MULTILINGUAL_V2_MODEL;
}

function isKieTtsModelSupported(model?: string): boolean {
  const normalized = String(model || "").trim().toLowerCase();
  return normalized === KIE_TEXT_TO_DIALOGUE_V3_MODEL || normalized === KIE_TTS_MULTILINGUAL_V2_MODEL;
}

function resolveLipSyncModel(model?: string): string {
  const normalized = String(model || "").trim().toLowerCase();
  if (normalized === KIE_FROM_AUDIO_MODEL) return KIE_FROM_AUDIO_MODEL;
  if (normalized === KIE_AI_AVATAR_PRO_MODEL) return KIE_AI_AVATAR_PRO_MODEL;
  if (normalized === KIE_SEEDANCE_2_MODEL) return KIE_SEEDANCE_2_MODEL;
  if (normalized === KIE_SEEDANCE_2_FAST_MODEL) return KIE_SEEDANCE_2_FAST_MODEL;
  // Route WaveSpeed-only lip-sync selection to a KIE equivalent.
  if (normalized === WS_LIPSYNC_MODEL) return KIE_SEEDANCE_2_FAST_MODEL;
  return KIE_SEEDANCE_2_FAST_MODEL;
}

function isGoogleLyriaModel(model: string): boolean {
  return model === WS_GOOGLE_LYRIA_CLIP_MODEL || model === WS_GOOGLE_LYRIA_PRO_MODEL;
}

function resolveChargeModelRef(actionType: AudioRequestBody["actionType"], body: AudioRequestBody): string {
  if (actionType === "tts") {
    if (isKieTtsModelSupported(body.model)) return resolveKieTtsModel(body.model);
    return resolveWaveSpeedTtsModel(body.model);
  }
  if (actionType === "video2audio") return WS_VIDEO2AUDIO_MODEL;
  if (actionType === "music") return resolveWaveSpeedMusicModel(body.model);
  if (actionType === "speech-to-text") return KIE_SPEECH_TO_TEXT_MODEL;
  if (actionType === "audio-isolation") return KIE_AUDIO_ISOLATION_MODEL;
  if (actionType === "voice-changer") return WS_VOICE_CHANGER_MODEL;
  if (actionType === "dubbing") return WS_DUBBING_MODEL;
  if (actionType === "lip-sync") return resolveLipSyncModel(body.model);
  return WS_VOICE_CLONING_MODEL;
}

function resolveQuoteDurationSec(actionType: AudioRequestBody["actionType"], body: AudioRequestBody): number {
  if (actionType === "tts") {
    const text = String(body.text || "").trim();
    if (!text) return 30;
    const words = text.split(/\s+/).filter(Boolean).length;
    // Rough TTS pacing: ~2.6 words/sec, clamped to a safe quote range.
    const estimated = Math.ceil(words / 2.6);
    return Math.max(3, Math.min(180, estimated));
  }

  if (actionType === "lip-sync") {
    const raw = Number(body.duration ?? 8);
    if (!Number.isFinite(raw)) return 8;
    return Math.max(4, Math.min(15, raw));
  }

  if (actionType === "music") {
    const defaultDuration = resolveWaveSpeedMusicModel(body.model) === WS_GOOGLE_LYRIA_PRO_MODEL ? 180 : 30;
    const raw = Number(body.musicDuration ?? defaultDuration);
    if (!Number.isFinite(raw)) return 30;
    return Math.max(5, Math.min(180, raw));
  }
  return 30;
}

function resolveQuoteQuality(actionType: AudioRequestBody["actionType"], body: AudioRequestBody): string | null {
  if (actionType === "lip-sync") return body.resolution ?? "720p";
  return null;
}

function resolveQuoteUnits(actionType: AudioRequestBody["actionType"], durationSec: number): number {
  if (actionType === "lip-sync") {
    // LipSync base unit is an 8-second generation block.
    return Math.max(1, Math.ceil(durationSec / 8));
  }
  return 1;
}

async function buildAudioChargeQuote(actionType: AudioRequestBody["actionType"], body: AudioRequestBody) {
  const chargeModelRef = resolveChargeModelRef(actionType, body);
  const durationSec = resolveQuoteDurationSec(actionType, body);
  const quality = resolveQuoteQuality(actionType, body);
  const units = resolveQuoteUnits(actionType, durationSec);
  const dynamicQuote = await getGenerationCostQuote(chargeModelRef, durationSec, units, quality);

  if (dynamicQuote && Number.isFinite(dynamicQuote.finalCredits) && dynamicQuote.finalCredits > 0) {
    return { chargeModelRef, durationSec, quote: dynamicQuote };
  }

  // Safety net: keep generation working even when source quote data is incomplete.
  const legacy = await getGenerationCost(chargeModelRef, durationSec, units, quality);
  if (Number.isFinite(legacy) && legacy > 0) {
    return {
      chargeModelRef,
      durationSec,
      quote: {
        actionType,
        modelRef: chargeModelRef,
        sourceCredits: legacy,
        marginPercent: 0,
        finalCredits: Math.ceil(legacy),
      },
    };
  }

  return { chargeModelRef, durationSec, quote: null };
}

function sanitizeCustomVoiceId(raw?: string): string {
  const source = (raw || "").trim();
  const normalized = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const base = normalized || "saad_clone_voice";
  const withPrefix = /^[A-Za-z]/.test(base) ? base : `v_${base}`;
  return withPrefix.slice(0, 64);
}

async function pollKieTask(
  taskId: string,
  apiKey: string,
  maxAttempts = 80,
  intervalMs = 3000,
): Promise<{ status: string; outputs?: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const resultRes = await fetch(`${KIE_BASE_URL}/jobs/getTaskResult?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resultRes.ok) continue;

    const resultJson = await resultRes.json().catch(() => null);
    const data = resultJson?.data ?? resultJson;
    const status = String(data?.taskStatus ?? data?.status ?? "").toLowerCase();
    const outputs =
      data?.resultUrls ??
      data?.outputs ??
      data?.result?.outputs ??
      data?.audioUrls ??
      data?.audio_urls ??
      [];
    const error = data?.errorMessage ?? data?.error ?? null;

    if (["success", "completed", "done"].includes(status)) {
      return { status: "completed", outputs: Array.isArray(outputs) ? outputs : [] };
    }
    if (["fail", "failed", "error", "cancelled", "canceled"].includes(status)) {
      return { status: "failed", error: error ?? "KIE task failed." };
    }
  }

  throw new Error("KIE audio generation timed out.");
}

async function runKieAudio(
  body: AudioRequestBody,
  apiKey: string,
): Promise<string> {
  if (body.actionType !== "tts") {
    throw new Error("KIE fallback currently supports TTS action only.");
  }
  if (!body.text?.trim()) {
    throw new Error("Field 'text' is required for KIE TTS.");
  }
  if (!isKieTtsModelSupported(body.model)) {
    throw new Error("Selected audio model is not a KIE model.");
  }

  const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveKieTtsModel(body.model),
      callBackUrl: "",
      input: {
        text: body.text,
        voice: body.voice ?? "default",
        speed: body.speed ?? 1,
        emotion: body.emotion ?? "neutral",
      },
      config: {
        serviceMode: "",
        webhookConfig: {
          endpoint: "",
          secret: "",
        },
      },
    }),
  });

  const submitJson = await submitRes.json().catch(() => null);
  if (!submitRes.ok) {
    throw new Error(submitJson?.msg || submitJson?.error || "KIE task submit failed.");
  }

  const taskId = submitJson?.data?.taskId ?? submitJson?.data?.id;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.");
  }

  const result = await pollKieTask(String(taskId), apiKey);
  if (result.status === "failed") {
    throw new Error(result.error ?? "KIE audio generation failed.");
  }

  const audioUrl = result.outputs?.find((url) => typeof url === "string" && /^https?:\/\//.test(url));
  if (!audioUrl) {
    throw new Error("KIE returned no audio URL.");
  }
  return audioUrl;
}

function parseKieResultPayload(resultJson: unknown): unknown {
  if (typeof resultJson === "string") {
    try {
      return JSON.parse(resultJson);
    } catch {
      return null;
    }
  }
  return resultJson;
}

function pickFirstMediaUrl(resultPayload: unknown): string | null {
  const candidate = resultPayload as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return null;

  const direct = candidate.resultUrls;
  if (Array.isArray(direct)) {
    const first = direct.find((v) => typeof v === "string" && /^https?:\/\//.test(v));
    if (typeof first === "string") return first;
  }

  const nested = candidate.resultObject as Record<string, unknown> | undefined;
  const nestedUrls = nested?.resultUrls;
  if (Array.isArray(nestedUrls)) {
    const first = nestedUrls.find((v) => typeof v === "string" && /^https?:\/\//.test(v));
    if (typeof first === "string") return first;
  }

  return null;
}

function pickTranscriptText(resultPayload: unknown): string | null {
  const candidate = resultPayload as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return null;
  const resultObject = candidate.resultObject as Record<string, unknown> | undefined;
  const text = resultObject?.text;
  return typeof text === "string" && text.trim() ? text : null;
}

async function pollKieRecordInfo(
  taskId: string,
  apiKey: string,
  maxAttempts = 80,
  intervalMs = 3000,
): Promise<KieRecordResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) continue;

    const json = await res.json().catch(() => null);
    const data = json?.data ?? null;
    const state = String(data?.state ?? data?.taskStatus ?? "").toLowerCase();
    const resultJson = parseKieResultPayload(data?.resultJson);

    if (state === "success") {
      return { status: "completed", resultJson };
    }
    if (state === "fail" || state === "failed") {
      return { status: "failed", error: data?.failMsg || data?.error || "KIE task failed." };
    }
  }

  throw new Error("KIE task timed out.");
}

async function submitKieTask(model: string, input: Record<string, unknown>, apiKey: string): Promise<string> {
  const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, callBackUrl: "", input }),
  });

  const submitJson = await submitRes.json().catch(() => null);
  if (!submitRes.ok) {
    throw new Error(submitJson?.msg || submitJson?.error || "KIE task submit failed.");
  }

  const taskId = submitJson?.data?.taskId ?? submitJson?.data?.id;
  if (!taskId) throw new Error("No taskId returned from KIE.");
  return String(taskId);
}

async function runKieSoundEffect(body: AudioRequestBody, apiKey: string): Promise<string> {
  const prompt = sanitizePrompt(body.prompt || body.text || "", 450);
  if (!prompt) throw new Error("Sound effect prompt is required.");

  const durationRaw = Number(body.musicDuration ?? 10);
  const durationSeconds = Number.isFinite(durationRaw) ? Math.max(0.5, Math.min(22, durationRaw)) : 10;

  const taskId = await submitKieTask(
    KIE_SOUND_EFFECT_V2_MODEL,
    {
      text: prompt,
      loop: Boolean((body as unknown as Record<string, unknown>).loop),
      duration_seconds: durationSeconds,
      prompt_influence: 0.3,
      output_format: body.outputFormat || body.output_format || "mp3_44100_128",
    },
    apiKey,
  );

  const result = await pollKieRecordInfo(taskId, apiKey);
  if (result.status === "failed") throw new Error(result.error || "Sound effect generation failed.");
  const audioUrl = pickFirstMediaUrl(result.resultJson);
  if (!audioUrl) throw new Error("KIE sound-effect returned no audio URL.");
  return audioUrl;
}

async function runKieSpeechToText(body: AudioRequestBody, apiKey: string): Promise<string> {
  if (!body.audioUrl?.trim()) throw new Error("Field 'audioUrl' is required for speech-to-text.");
  const normalizedAudioUrl = body.audioUrl.startsWith("data:") ? await uploadAudioToKie(body.audioUrl) : body.audioUrl;

  const taskId = await submitKieTask(
    KIE_SPEECH_TO_TEXT_MODEL,
    {
      audio_url: normalizedAudioUrl,
      language_code: "",
      tag_audio_events: true,
      diarize: true,
      nsfw_checker: true,
    },
    apiKey,
  );

  const result = await pollKieRecordInfo(taskId, apiKey);
  if (result.status === "failed") throw new Error(result.error || "Speech-to-text failed.");
  const transcript = pickTranscriptText(result.resultJson);
  if (!transcript) throw new Error("KIE speech-to-text returned no transcript.");
  return transcript;
}

async function runKieAudioIsolation(body: AudioRequestBody, apiKey: string): Promise<string> {
  if (!body.audioUrl?.trim()) throw new Error("Field 'audioUrl' is required for audio-isolation.");
  const normalizedAudioUrl = body.audioUrl.startsWith("data:") ? await uploadAudioToKie(body.audioUrl) : body.audioUrl;

  const taskId = await submitKieTask(
    KIE_AUDIO_ISOLATION_MODEL,
    {
      audio_url: normalizedAudioUrl,
      nsfw_checker: true,
    },
    apiKey,
  );

  const result = await pollKieRecordInfo(taskId, apiKey);
  if (result.status === "failed") throw new Error(result.error || "Audio isolation failed.");
  const audioUrl = pickFirstMediaUrl(result.resultJson);
  if (!audioUrl) throw new Error("KIE audio-isolation returned no audio URL.");
  return audioUrl;
}

async function uploadDataUrlToKie(dataUrl: string, fileNamePrefix = "upload"): Promise<string> {
  const parsed = parseBase64DataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid base64 data URL for KIE upload.");

  const res = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64: `data:${parsed.mime};base64,${parsed.fileData}`,
      fileName: `${fileNamePrefix}.${parsed.ext}`,
    }),
  });

  const json = await res.json().catch(() => null);
  const url = json?.url || json?.data?.url;
  if (!res.ok || !url) {
    throw new Error(json?.error || json?.message || "KIE file upload failed.");
  }
  return String(url);
}

async function uploadAudioToKie(dataUrl: string): Promise<string> {
  return uploadDataUrlToKie(dataUrl, "voice-sample");
}

async function runKieVoiceClone(
  body: AudioRequestBody,
  kieApiKey: string,
): Promise<string> {
  const samples = body.sampleAudioUrls || [];
  const uploadedUrls = await Promise.all(
    samples.map((u) => (u.startsWith("data:") ? uploadAudioToKie(u) : Promise.resolve(u))),
  );
  const referenceAudio = uploadedUrls[0];
  if (!referenceAudio) throw new Error("No reference audio provided for voice cloning.");

  const seedText = sanitizePrompt(body.text || body.prompt || "Hello from SAAD Studio voice cloning.", 5000);
  const clonedVoiceName = (body.cloneName || "custom-voice").trim().slice(0, 64);
  const customVoiceId = sanitizeCustomVoiceId(clonedVoiceName);

  // Use submitKieTask + pollKieRecordInfo (same pattern as all other KIE models)
  const taskId = await submitKieTask(
    "minimax/voice-clone",
    {
      text: seedText,
      audio: referenceAudio,
      voice_id: customVoiceId,
      custom_voice_id: customVoiceId,
      model: "speech-02-hd",
      accuracy: 1,
      need_noise_reduction: body.remove_background_noise !== false,
    },
    kieApiKey,
  );

  const result = await pollKieRecordInfo(taskId, kieApiKey);
  if (result.status === "failed") {
    throw new Error(result.error ?? "KIE voice cloning failed.");
  }

  const audioUrl = pickFirstMediaUrl(result.resultJson);
  if (!audioUrl) throw new Error("KIE voice-clone returned no audio URL.");
  return audioUrl;
}

async function pollWaveSpeed(
  predictionId: string,
  apiKey: string,
  maxAttempts = 60,
  intervalMs = 4000,
): Promise<{ status: string; outputs?: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${WAVESPEED_BASE_URL}/predictions/${predictionId}/result`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`WaveSpeed polling failed: ${res.status}`);

    const json: WaveSpeedApiResponse = await res.json();
    const data = json.data;
    if (data.status === "completed" || data.status === "failed") return data;
  }

  throw new Error("Audio generation timed out.");
}

async function runWaveSpeed(
  model: string,
  payload: Record<string, unknown>,
  apiKey: string,
): Promise<string> {
  const submitRes = await fetch(`${WAVESPEED_BASE_URL}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`WaveSpeedAI submit failed (${model}): ${errText}`);
  }

  const submitJson: WaveSpeedApiResponse = await submitRes.json();
  const predictionId = submitJson.data?.id;
  if (!predictionId) throw new Error("No prediction ID returned from WaveSpeedAI.");

  const result = await pollWaveSpeed(predictionId, apiKey);
  if (result.status === "failed") {
    throw new Error(result.error ?? "Audio generation failed.");
  }

  const audioUrl = result.outputs?.[0];
  if (!audioUrl) throw new Error("No output URL in WaveSpeed result.");
  return audioUrl;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actionType = req.nextUrl.searchParams.get("actionType") as AudioRequestBody["actionType"] | null;
    if (!actionType || !["tts", "video2audio", "music", "speech-to-text", "audio-isolation", "voice-changer", "dubbing", "lip-sync", "voice-cloning"].includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }

    const model = req.nextUrl.searchParams.get("model") || undefined;
    const text = req.nextUrl.searchParams.get("text") || undefined;
    const resolution = req.nextUrl.searchParams.get("resolution") as AudioRequestBody["resolution"] | null;
    const durationRaw = req.nextUrl.searchParams.get("duration");
    const duration = durationRaw ? Number(durationRaw) : undefined;
    const musicDurationRaw = req.nextUrl.searchParams.get("musicDuration");
    const musicDuration = musicDurationRaw ? Number(musicDurationRaw) : undefined;

    const { chargeModelRef, quote } = await buildAudioChargeQuote(actionType, {
      actionType,
      model,
      text,
      resolution: resolution ?? undefined,
      duration,
      musicDuration,
    });
    if (!quote) {
      return NextResponse.json(
        { error: `No credit configuration for actionType='${actionType}' and model='${chargeModelRef}'.` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        actionType,
        modelRef: chargeModelRef,
        sourceCredits: quote.sourceCredits,
        marginPercent: quote.marginPercent,
        finalCredits: quote.finalCredits,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build quote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;
  const idempotencyKey = getIdempotencyKey(req.headers);
  let requestHash: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    chargedUserId = userId;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`audio:${userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    const kieKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
    if (!wavespeedKey && !kieKey) {
      return NextResponse.json(
        { error: "No audio provider key configured (KIE_API_KEY or WAVESPEED_API_KEY)." },
        { status: 500 },
      );
    }

    const body: AudioRequestBody = await req.json();
    requestHash = hashRequestBody(body);
    const { actionType } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: "Missing required field: actionType (tts | video2audio | music | speech-to-text | audio-isolation | voice-changer | dubbing | lip-sync | voice-cloning)." },
        { status: 400 },
      );
    }
    if (!["tts", "video2audio", "music", "speech-to-text", "audio-isolation", "voice-changer", "dubbing", "lip-sync", "voice-cloning"].includes(actionType)) {
      return NextResponse.json(
        { error: `Unknown actionType: ${actionType}. Supported: tts | video2audio | music | speech-to-text | audio-isolation | voice-changer | dubbing | lip-sync | voice-cloning.` },
        { status: 400 },
      );
    }
    if (actionType === "speech-to-text") {
      if (!body.audioUrl?.trim()) {
        return NextResponse.json({ error: "Field 'audioUrl' is required for actionType='speech-to-text'." }, { status: 400 });
      }
      if (!(body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl))) {
        return NextResponse.json({ error: "Invalid audioUrl for speech-to-text." }, { status: 400 });
      }
    }
    if (actionType === "audio-isolation") {
      if (!body.audioUrl?.trim()) {
        return NextResponse.json({ error: "Field 'audioUrl' is required for actionType='audio-isolation'." }, { status: 400 });
      }
      if (!(body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl))) {
        return NextResponse.json({ error: "Invalid audioUrl for audio-isolation." }, { status: 400 });
      }
    }

    if (actionType === "tts" && !body.text?.trim()) {
      return NextResponse.json(
        { error: "Field 'text' is required for actionType='tts'." },
        { status: 400 },
      );
    }

    if (actionType === "video2audio" && !body.videoUrl?.trim()) {
      return NextResponse.json(
        { error: "Field 'videoUrl' is required for actionType='video2audio'." },
        { status: 400 },
      );
    }
    if (actionType === "video2audio" && body.videoUrl && !isSafePublicHttpUrl(body.videoUrl)) {
      return NextResponse.json({ error: "Invalid or private videoUrl is not allowed." }, { status: 400 });
    }
    if (actionType === "voice-changer") {
      if (!body.audioUrl?.trim()) {
        return NextResponse.json(
          { error: "Field 'audioUrl' is required for actionType='voice-changer'." },
          { status: 400 },
        );
      }
      if (!(body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl))) {
        return NextResponse.json({ error: "Invalid or private audioUrl is not allowed." }, { status: 400 });
      }
    }
    if (actionType === "dubbing") {
      const hasVideo = Boolean(body.videoUrl?.trim());
      const hasAudio = Boolean(body.audioUrl?.trim());
      if (!hasVideo && !hasAudio) {
        return NextResponse.json(
          { error: "Field 'videoUrl' or 'audioUrl' is required for actionType='dubbing'." },
          { status: 400 },
        );
      }
      if (body.videoUrl && !(body.videoUrl.startsWith("data:") || isSafePublicHttpUrl(body.videoUrl))) {
        return NextResponse.json({ error: "Invalid videoUrl for dubbing." }, { status: 400 });
      }
      if (body.audioUrl && !(body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl))) {
        return NextResponse.json({ error: "Invalid audioUrl for dubbing." }, { status: 400 });
      }
      if (!body.targetLang?.trim()) {
        return NextResponse.json({ error: "Field 'targetLang' is required for dubbing." }, { status: 400 });
      }
    }
    if (actionType === "lip-sync") {
      const lipSyncModel = resolveLipSyncModel(body.model);
      if (lipSyncModel === KIE_FROM_AUDIO_MODEL || lipSyncModel === KIE_AI_AVATAR_PRO_MODEL) {
        if (!body.imageUrl?.trim() || !body.audioUrl?.trim()) {
          return NextResponse.json(
            { error: "Fields 'imageUrl' and 'audioUrl' are required for selected lip-sync model." },
            { status: 400 },
          );
        }
        if (!body.prompt?.trim()) {
          return NextResponse.json({ error: "Field 'prompt' is required for selected lip-sync model." }, { status: 400 });
        }
        const validImage = body.imageUrl.startsWith("data:") || isSafePublicHttpUrl(body.imageUrl);
        const validAudio = body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl);
        if (!validImage || !validAudio) {
          return NextResponse.json({ error: "Invalid imageUrl or audioUrl." }, { status: 400 });
        }
      } else {
        if (body.videoUrl && !(body.videoUrl.startsWith("data:") || isSafePublicHttpUrl(body.videoUrl))) {
          return NextResponse.json({ error: "Invalid videoUrl for seedance model." }, { status: 400 });
        }
        if (body.imageUrl && !(body.imageUrl.startsWith("data:") || isSafePublicHttpUrl(body.imageUrl))) {
          return NextResponse.json({ error: "Invalid imageUrl for seedance model." }, { status: 400 });
        }
        if (body.audioUrl && !(body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl))) {
          return NextResponse.json({ error: "Invalid audioUrl for seedance model." }, { status: 400 });
        }
        const hasRef = Boolean(body.prompt?.trim() || body.videoUrl?.trim() || body.audioUrl?.trim() || body.imageUrl?.trim());
        if (!hasRef) {
          return NextResponse.json({ error: "Provide prompt or media references for seedance lip-sync model." }, { status: 400 });
        }
      }
    }
    if (actionType === "voice-cloning") {
      if (!Array.isArray(body.sampleAudioUrls) || body.sampleAudioUrls.length === 0) {
        return NextResponse.json(
          { error: "Field 'sampleAudioUrls' is required for actionType='voice-cloning'." },
          { status: 400 },
        );
      }
      const invalid = body.sampleAudioUrls.some((u) => !(typeof u === "string" && (u.startsWith("data:") || isSafePublicHttpUrl(u))));
      if (invalid) {
        return NextResponse.json({ error: "Invalid sampleAudioUrls." }, { status: 400 });
      }
    }
    if (actionType === "music" && body.image?.trim()) {
      const validImage = body.image.startsWith("data:") || isSafePublicHttpUrl(body.image);
      if (!validImage) {
        return NextResponse.json({ error: "Invalid image URL for music generation." }, { status: 400 });
      }
    }

    const { chargeModelRef, quote } = await buildAudioChargeQuote(actionType, body);
    if (!quote || quote.finalCredits <= 0) {
      return NextResponse.json(
        { error: `No credit configuration for actionType='${actionType}' and model='${chargeModelRef}'.` },
        { status: 400 },
      );
    }
    const creditsToCharge = quote.finalCredits;
    const precheckPrompt =
      (typeof body.prompt === "string" ? body.prompt : "") ||
      (typeof body.text === "string" ? body.text : "") ||
      "Audio generation";
    const precheckExtraText = [
      typeof body.lyrics === "string" ? body.lyrics : "",
      typeof body.stylePrompt === "string" ? body.stylePrompt : "",
    ]
      .filter(Boolean)
      .join("\n");
    const precheck = await precheckGenerationPolicy({
      prompt: precheckPrompt,
      extraText: precheckExtraText || null,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }
    const modelUsedForLedger =
      actionType === "voice-cloning"
        ? WS_VOICE_CLONING_MODEL
        : actionType === "lip-sync"
        ? resolveLipSyncModel(body.model)
        : actionType === "dubbing"
        ? WS_DUBBING_MODEL
        : actionType === "voice-changer"
        ? WS_VOICE_CHANGER_MODEL
        : actionType === "tts"
          ? (isKieTtsModelSupported(body.model) ? resolveKieTtsModel(body.model) : resolveWaveSpeedTtsModel(body.model))
          : actionType === "video2audio"
            ? WS_VIDEO2AUDIO_MODEL
            : actionType === "speech-to-text"
              ? KIE_SPEECH_TO_TEXT_MODEL
              : actionType === "audio-isolation"
                ? KIE_AUDIO_ISOLATION_MODEL
            : resolveWaveSpeedMusicModel(body.model);

    if (requestHash) {
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
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: body.prompt ?? body.text ?? "Audio generation",
      assetType: "AUDIO",
      modelUsed: modelUsedForLedger,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;
    await attachIdempotencyGeneration({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
    }).catch(() => {});

    const finalize = async (responseJson: unknown, responseStatus: number) => {
      const wrapped =
        responseJson && typeof responseJson === "object" && !Array.isArray(responseJson)
          ? ({ generationId, ...(responseJson as Record<string, unknown>) } as Record<string, unknown>)
          : ({ generationId, data: responseJson } as Record<string, unknown>);

      await completeIdempotency({
        userId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus,
        responseJson: wrapped,
      }).catch(() => {});
      return NextResponse.json(wrapped, { status: responseStatus });
    };

    if (actionType === "tts") {
      const { text, voice = "Aria" } = body;
      const safeText = sanitizePrompt(text ?? "", 5000);
      const wsModel = resolveWaveSpeedTtsModel(body.model);
      const providerOrder = [
        kieKey && isKieTtsModelSupported(body.model) ? "kie" : null,
        wavespeedKey ? "wavespeed" : null,
      ].filter(Boolean) as Array<"kie" | "wavespeed">;

      let lastError: string | null = null;
      for (const provider of providerOrder) {
        try {
          const audioUrl =
            provider === "kie"
              ? await runKieAudio(body, kieKey!)
              : await runWaveSpeed(
                  wsModel,
                  {
                    text: safeText,
                    voice_id: voice,
                    similarity: Math.max(0, Math.min(1, Number(body.clarity ?? 75) / 100)),
                    stability: Math.max(0, Math.min(1, Number(body.stability ?? 50) / 100)),
                    use_speaker_boost: body.use_speaker_boost !== false,
                    output_format: body.output_format || body.outputFormat || "mp3_44100_128",
                  },
                  wavespeedKey!,
                );

          if (generationId) {
            await setGenerationMediaUrl(generationId, audioUrl);
          }
          return await finalize({ audioUrl, provider, chargedCredits: creditsToCharge }, 200);
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown provider error.";
        }
      }

      throw new Error(lastError ?? "Audio generation failed on all providers.");
    }

    if (actionType === "video2audio") {
      const { videoUrl, prompt = "" } = body;
      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for video2audio.");
      }
      const audioUrl = await runWaveSpeed(
        WS_VIDEO2AUDIO_MODEL,
        { video_url: videoUrl, prompt: sanitizePrompt(prompt, 500), steps: 25 },
        wavespeedKey,
      );
      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl);
      }
      return await finalize({ audioUrl, provider: "wavespeed", chargedCredits: creditsToCharge }, 200);
    }

    if (actionType === "music") {
      const {
        prompt = "",
        lyrics = "",
        stylePrompt = "pop",
        musicDuration = 60,
        music_length_ms,
        force_instrumental = false,
        output_format = sanitizeMusicFormat("mp3_high_quality"),
        image,
      } = body;

      const fullPrompt = sanitizePrompt(
        [prompt.trim(), stylePrompt.trim(), lyrics.trim()].filter(Boolean).join(" ").trim(),
        5000,
      );
      if (!fullPrompt) {
        throw new Error("Music prompt is required.");
      }

      const wsMusicModel = resolveWaveSpeedMusicModel(body.model);
      if (wsMusicModel === KIE_SOUND_EFFECT_V2_MODEL) {
        if (!kieKey && !wavespeedKey) {
          throw new Error("No available provider for selected music model.");
        }

        let kieError: string | null = null;
        if (kieKey) {
          try {
            const audioUrl = await runKieSoundEffect(body, kieKey);
            if (generationId) {
              await setGenerationMediaUrl(generationId, audioUrl);
            }
            return await finalize({ audioUrl, provider: "kie", chargedCredits: creditsToCharge }, 200);
          } catch (error) {
            kieError = error instanceof Error ? error.message : "KIE sound effect failed.";
          }
        }

        if (!wavespeedKey) {
          throw new Error(kieError || "KIE sound effect failed and WaveSpeed is unavailable.");
        }

        const fallbackAudioUrl = await runWaveSpeed(
          WS_MUSIC_MODEL,
          {
            prompt: fullPrompt,
            music_length_ms: Math.max(5000, Math.min(300000, Math.round(Number(musicDuration || 60) * 1000))),
            force_instrumental: Boolean(force_instrumental),
            output_format: sanitizeMusicFormat(output_format),
          },
          wavespeedKey,
        );
        if (generationId) {
          await setGenerationMediaUrl(generationId, fallbackAudioUrl);
        }
        return await finalize({ audioUrl: fallbackAudioUrl, provider: "wavespeed", chargedCredits: creditsToCharge }, 200);
      }

      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for music generation.");
      }

      let audioUrl: string;

      if (isGoogleLyriaModel(wsMusicModel)) {
        const normalizedImage = image
          ? (image.startsWith("data:") ? await uploadDataUrlToWaveSpeed(image, wavespeedKey) : image)
          : undefined;

        audioUrl = await runWaveSpeed(
          wsMusicModel,
          {
            prompt: fullPrompt,
            ...(normalizedImage ? { image: normalizedImage } : {}),
          },
          wavespeedKey,
        );
      } else {
        const safeMs = Number.isFinite(Number(music_length_ms))
          ? Math.max(5000, Math.min(300000, Number(music_length_ms)))
          : Math.max(5000, Math.min(300000, Math.round(Number(musicDuration || 60) * 1000)));

        audioUrl = await runWaveSpeed(
          wsMusicModel,
          {
            prompt: fullPrompt,
            music_length_ms: safeMs,
            force_instrumental: Boolean(force_instrumental),
            output_format,
          },
          wavespeedKey,
        );
      }
      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl);
      }
      return await finalize({ audioUrl, provider: "wavespeed", chargedCredits: creditsToCharge }, 200);
    }
    if (actionType === "speech-to-text") {
      if (!kieKey) throw new Error("KIE API key is required for speech-to-text.");
      const transcript = await runKieSpeechToText(body, kieKey);
      return await finalize({ transcript, provider: "kie", chargedCredits: creditsToCharge }, 200);
    }
    if (actionType === "audio-isolation") {
      if (!kieKey) throw new Error("KIE API key is required for audio-isolation.");
      const audioUrl = await runKieAudioIsolation(body, kieKey);
      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl);
      }
      return await finalize({ audioUrl, provider: "kie", chargedCredits: creditsToCharge }, 200);
    }
    if (actionType === "voice-changer") {
      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for voice changer.");
      }

      const voiceId = body.voice?.trim() || "pNInz6obpgDQGcFmaJgB";
      const normalizedAudioUrl = body.audioUrl!.startsWith("data:")
        ? await uploadDataUrlToWaveSpeed(body.audioUrl!, wavespeedKey)
        : body.audioUrl!;

      const audioUrl = await runWaveSpeed(
        WS_VOICE_CHANGER_MODEL,
        {
          audio: normalizedAudioUrl,
          voice_id: voiceId,
          remove_background_noise: body.remove_background_noise ?? true,
        },
        wavespeedKey,
      );

      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl);
      }
      return await finalize({ audioUrl, provider: "wavespeed", chargedCredits: creditsToCharge }, 200);
    }
    if (actionType === "dubbing") {
      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for dubbing.");
      }

      const normalizedVideoUrl = body.videoUrl
        ? (body.videoUrl.startsWith("data:") ? await uploadDataUrlToWaveSpeed(body.videoUrl, wavespeedKey) : body.videoUrl)
        : undefined;
      const normalizedAudioUrl = body.audioUrl
        ? (body.audioUrl.startsWith("data:") ? await uploadDataUrlToWaveSpeed(body.audioUrl, wavespeedKey) : body.audioUrl)
        : undefined;

      const sourceLang = (body.sourceLang || "Auto").replace("Auto-detect", "Auto");
      const targetLang = body.targetLang || "Arabic";

      const outputUrl = await runWaveSpeed(
        WS_DUBBING_MODEL,
        {
          ...(normalizedVideoUrl ? { video: normalizedVideoUrl } : {}),
          ...(normalizedAudioUrl ? { audio: normalizedAudioUrl } : {}),
          source_lang: sourceLang,
          target_lang: targetLang,
        },
        wavespeedKey,
      );

      if (generationId) {
        await setGenerationMediaUrl(generationId, outputUrl);
      }

      const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(outputUrl);
      return await finalize(
        isVideo
          ? { videoUrl: outputUrl, provider: "wavespeed", chargedCredits: creditsToCharge }
          : { audioUrl: outputUrl, provider: "wavespeed", chargedCredits: creditsToCharge },
        200,
      );
    }
    if (actionType === "lip-sync") {
      const lipSyncModel = resolveLipSyncModel(body.model);

      if (!kieKey) {
        throw new Error("KIE API key is required for selected lip-sync model.");
      }

      if (lipSyncModel === KIE_FROM_AUDIO_MODEL || lipSyncModel === KIE_AI_AVATAR_PRO_MODEL) {
        const normalizedImageUrl = body.imageUrl!.startsWith("data:")
          ? await uploadDataUrlToKie(body.imageUrl!, "avatar-image")
          : body.imageUrl!;
        const normalizedAudioUrl = body.audioUrl!.startsWith("data:")
          ? await uploadDataUrlToKie(body.audioUrl!, "avatar-audio")
          : body.audioUrl!;

        const taskId = await submitKieTask(
          lipSyncModel,
          {
            image_url: normalizedImageUrl,
            audio_url: normalizedAudioUrl,
            prompt: sanitizePrompt(body.prompt || "", 5000),
            ...(lipSyncModel === KIE_FROM_AUDIO_MODEL ? { resolution: body.resolution || "480p" } : {}),
            ...(Number.isFinite(Number(body.seed)) ? { seed: Number(body.seed) } : {}),
            nsfw_checker: true,
          },
          kieKey,
        );

        const result = await pollKieRecordInfo(taskId, kieKey);
        if (result.status === "failed") {
          throw new Error(result.error || "KIE lip-sync model failed.");
        }
        const videoUrl = pickFirstMediaUrl(result.resultJson);
        if (!videoUrl) throw new Error("KIE lip-sync returned no video URL.");
        if (generationId) {
          await setGenerationMediaUrl(generationId, videoUrl);
        }
        return await finalize({ videoUrl, provider: "kie", chargedCredits: creditsToCharge }, 200);
      }

      // Seedance 2: optional references + prompt in one video-generation call.
      const seedancePrompt = sanitizePrompt(body.prompt || "Audio-driven scene", 5000);
      const referenceVideo = body.videoUrl
        ? (body.videoUrl.startsWith("data:") ? await uploadDataUrlToKie(body.videoUrl, "seedance-video") : body.videoUrl)
        : null;
      const referenceAudio = body.audioUrl
        ? (body.audioUrl.startsWith("data:") ? await uploadDataUrlToKie(body.audioUrl, "seedance-audio") : body.audioUrl)
        : null;
      const referenceImage = body.imageUrl
        ? (body.imageUrl.startsWith("data:") ? await uploadDataUrlToKie(body.imageUrl, "seedance-image") : body.imageUrl)
        : null;

      const taskId = await submitKieTask(
        lipSyncModel === KIE_SEEDANCE_2_FAST_MODEL ? KIE_SEEDANCE_2_FAST_MODEL : KIE_SEEDANCE_2_MODEL,
        {
          prompt: seedancePrompt,
          ...(referenceImage ? { reference_image_urls: [referenceImage] } : {}),
          ...(referenceVideo ? { reference_video_urls: [referenceVideo] } : {}),
          ...(referenceAudio ? { reference_audio_urls: [referenceAudio] } : {}),
          generate_audio: true,
          resolution: body.resolution || "720p",
          aspect_ratio: body.aspect_ratio || "16:9",
          duration: Number.isFinite(Number(body.duration)) ? Math.max(4, Math.min(15, Number(body.duration))) : 8,
          web_search: Boolean(body.web_search),
          nsfw_checker: true,
        },
        kieKey,
      );

      const result = await pollKieRecordInfo(taskId, kieKey);
      if (result.status === "failed") {
        throw new Error(result.error || "Seedance lip-sync model failed.");
      }
      const videoUrl = pickFirstMediaUrl(result.resultJson);
      if (!videoUrl) throw new Error("Seedance returned no video URL.");
      if (generationId) {
        await setGenerationMediaUrl(generationId, videoUrl);
      }
      return await finalize({ videoUrl, provider: "kie", chargedCredits: creditsToCharge }, 200);
    }
    if (actionType === "voice-cloning") {
      const clonedVoiceName = (body.cloneName || "custom-voice").trim().slice(0, 64);
      const customVoiceId = sanitizeCustomVoiceId(clonedVoiceName);

      // --- Try KIE first ---
      if (kieKey) {
        try {
          const audioUrl = await runKieVoiceClone(body, kieKey);
          if (generationId) {
            await setGenerationMediaUrl(generationId, audioUrl);
          }
          return await finalize(
            {
              audioUrl,
              provider: "kie",
              voiceId: customVoiceId,
              voiceName: clonedVoiceName || customVoiceId,
              chargedCredits: creditsToCharge,
            },
            200,
          );
        } catch (kieErr) {
          console.warn("[voice-cloning] KIE failed, falling back to WaveSpeed:", kieErr instanceof Error ? kieErr.message : kieErr);
        }
      }

      // --- WaveSpeed fallback ---
      if (!wavespeedKey) {
        throw new Error("Voice cloning failed: no available provider.");
      }

      const samples = await Promise.all(
        (body.sampleAudioUrls || []).map((url) =>
          url.startsWith("data:") ? uploadDataUrlToWaveSpeed(url, wavespeedKey) : Promise.resolve(url),
        ),
      );
      const referenceAudio = samples[0];
      const seedText = sanitizePrompt(body.text || body.prompt || "Hello from SAAD Studio voice cloning.", 5000);

      const audioUrl = await runWaveSpeed(
        WS_VOICE_CLONING_MODEL,
        {
          text: seedText,
          audio: referenceAudio,
          custom_voice_id: customVoiceId,
          model: "speech-02-hd",
          accuracy: 1,
          need_noise_reduction: body.remove_background_noise !== false,
        },
        wavespeedKey,
      );

      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl);
      }
      return await finalize(
        {
          audioUrl,
          provider: "wavespeed",
          voiceId: customVoiceId,
          voiceName: clonedVoiceName || customVoiceId,
          chargedCredits: creditsToCharge,
        },
        200,
      );
    }
    throw new Error(`Unknown actionType: ${actionType}. Supported: tts | video2audio | music | speech-to-text | audio-isolation | voice-changer | dubbing | lip-sync | voice-cloning.`);
  } catch (error: unknown) {
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
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    if (chargedUserId && requestHash) {
      await completeIdempotency({
        userId: chargedUserId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus: 500,
        responseJson: { error: message },
      }).catch(() => {});
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAudioActionCredits } from "@/lib/credit-pricing";
import { InsufficientCreditsError, rollbackGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";

export const runtime = "nodejs";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

const WS_TTS_MODEL = "elevenlabs/multilingual-v2";
const WS_VIDEO2AUDIO_MODEL = "wavespeed-ai/mmaudio-v2";
const WS_MUSIC_MODEL = "elevenlabs/music";
const WS_GOOGLE_LYRIA_CLIP_MODEL = "google/lyria-3-clip/music";
const WS_GOOGLE_LYRIA_PRO_MODEL = "google/lyria-3-pro/music";
const WS_VOICE_CHANGER_MODEL = "elevenlabs/voice-changer";
const WS_DUBBING_MODEL = "elevenlabs/dubbing";
const WS_LIPSYNC_MODEL = "sync/lipsync-3";
const WS_VOICE_CLONING_MODEL = "minimax/voice-clone";

interface AudioRequestBody {
  actionType: "tts" | "video2audio" | "music" | "voice-changer" | "dubbing" | "lip-sync" | "voice-cloning";
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
}

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
  if (normalized === WS_GOOGLE_LYRIA_CLIP_MODEL) return WS_GOOGLE_LYRIA_CLIP_MODEL;
  if (normalized === WS_GOOGLE_LYRIA_PRO_MODEL) return WS_GOOGLE_LYRIA_PRO_MODEL;
  if (normalized === WS_MUSIC_MODEL) return WS_MUSIC_MODEL;
  return WS_MUSIC_MODEL;
}

function isGoogleLyriaModel(model: string): boolean {
  return model === WS_GOOGLE_LYRIA_CLIP_MODEL || model === WS_GOOGLE_LYRIA_PRO_MODEL;
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
  if (!looksLikeKieModel(body.model)) {
    throw new Error("Selected audio model is not a KIE model.");
  }

  const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
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

async function uploadAudioToKie(dataUrl: string): Promise<string> {
  const parsed = parseBase64DataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid base64 audio data URL for KIE upload.");

  const res = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64: `data:${parsed.mime};base64,${parsed.fileData}`,
      fileName: `voice-sample.${parsed.ext}`,
    }),
  });

  const json = await res.json().catch(() => null);
  const url = json?.url || json?.data?.url;
  if (!res.ok || !url) {
    throw new Error(json?.error || json?.message || "KIE file upload failed.");
  }
  return String(url);
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

  const submitRes = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kieApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "minimax/voice-clone",
      callBackUrl: "",
      input: {
        text: seedText,
        audio: referenceAudio,
        voice_id: customVoiceId,
        custom_voice_id: customVoiceId,
        model: "speech-02-hd",
        accuracy: 1,
        need_noise_reduction: body.remove_background_noise !== false,
      },
    }),
  });

  const submitJson = await submitRes.json().catch(() => null);
  if (!submitRes.ok) {
    throw new Error(submitJson?.msg || submitJson?.error || "KIE voice-clone task submit failed.");
  }

  const taskId = submitJson?.data?.taskId ?? submitJson?.data?.id;
  if (!taskId) throw new Error("No taskId returned from KIE voice-clone.");

  const result = await pollKieTask(String(taskId), kieApiKey);
  if (result.status === "failed") {
    throw new Error(result.error ?? "KIE voice cloning failed.");
  }

  const audioUrl = result.outputs?.find((url) => typeof url === "string" && /^https?:\/\//.test(url));
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

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { actionType } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: "Missing required field: actionType (tts | video2audio | music | voice-changer | dubbing | lip-sync | voice-cloning)." },
        { status: 400 },
      );
    }
    if (!["tts", "video2audio", "music", "voice-changer", "dubbing", "lip-sync", "voice-cloning"].includes(actionType)) {
      return NextResponse.json(
        { error: `Unknown actionType: ${actionType}. Supported: tts | video2audio | music | voice-changer | dubbing | lip-sync | voice-cloning.` },
        { status: 400 },
      );
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
      if (!body.videoUrl?.trim() || !body.audioUrl?.trim()) {
        return NextResponse.json(
          { error: "Fields 'videoUrl' and 'audioUrl' are required for actionType='lip-sync'." },
          { status: 400 },
        );
      }
      const validVideo = body.videoUrl.startsWith("data:") || isSafePublicHttpUrl(body.videoUrl);
      const validAudio = body.audioUrl.startsWith("data:") || isSafePublicHttpUrl(body.audioUrl);
      if (!validVideo || !validAudio) {
        return NextResponse.json({ error: "Invalid videoUrl or audioUrl." }, { status: 400 });
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

    const creditsToCharge = getAudioActionCredits(actionType);
    const modelUsedForLedger =
      actionType === "voice-cloning"
        ? WS_VOICE_CLONING_MODEL
        : actionType === "lip-sync"
        ? WS_LIPSYNC_MODEL
        : actionType === "dubbing"
        ? WS_DUBBING_MODEL
        : actionType === "voice-changer"
        ? WS_VOICE_CHANGER_MODEL
        : actionType === "tts"
          ? (looksLikeKieModel(body.model) ? (body.model ?? WS_TTS_MODEL) : resolveWaveSpeedTtsModel(body.model))
          : actionType === "video2audio"
            ? WS_VIDEO2AUDIO_MODEL
            : resolveWaveSpeedMusicModel(body.model);
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

    if (actionType === "tts") {
      const { text, voice = "Aria" } = body;
      const safeText = sanitizePrompt(text ?? "", 5000);
      const wsModel = resolveWaveSpeedTtsModel(body.model);
      const providerOrder = [
        kieKey && looksLikeKieModel(body.model) ? "kie" : null,
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
          return NextResponse.json({ audioUrl, provider }, { status: 200 });
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
      return NextResponse.json({ audioUrl, provider: "wavespeed" }, { status: 200 });
    }

    if (actionType === "music") {
      const {
        prompt = "",
        lyrics = "",
        stylePrompt = "pop",
        musicDuration = 60,
        music_length_ms,
        force_instrumental = false,
        output_format = "mp3_standard",
        image,
      } = body;

      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for music generation.");
      }
      const wsMusicModel = resolveWaveSpeedMusicModel(body.model);
      const fullPrompt = sanitizePrompt(
        [prompt.trim(), stylePrompt.trim(), lyrics.trim()].filter(Boolean).join(" ").trim(),
        5000,
      );
      if (!fullPrompt) {
        throw new Error("Music prompt is required.");
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
      return NextResponse.json({ audioUrl, provider: "wavespeed" }, { status: 200 });
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
      return NextResponse.json({ audioUrl, provider: "wavespeed" }, { status: 200 });
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
      return NextResponse.json(
        isVideo ? { videoUrl: outputUrl, provider: "wavespeed" } : { audioUrl: outputUrl, provider: "wavespeed" },
        { status: 200 },
      );
    }
    if (actionType === "lip-sync") {
      if (!wavespeedKey) {
        throw new Error("WaveSpeed API key is required for lip-sync.");
      }

      const normalizedVideoUrl = body.videoUrl!.startsWith("data:")
        ? await uploadDataUrlToWaveSpeed(body.videoUrl!, wavespeedKey)
        : body.videoUrl!;
      const normalizedAudioUrl = body.audioUrl!.startsWith("data:")
        ? await uploadDataUrlToWaveSpeed(body.audioUrl!, wavespeedKey)
        : body.audioUrl!;

      const syncMode = body.sync_mode || "cut_off";
      const videoUrl = await runWaveSpeed(
        WS_LIPSYNC_MODEL,
        {
          video: normalizedVideoUrl,
          audio: normalizedAudioUrl,
          sync_mode: syncMode,
        },
        wavespeedKey,
      );

      if (generationId) {
        await setGenerationMediaUrl(generationId, videoUrl);
      }
      return NextResponse.json({ videoUrl, provider: "wavespeed" }, { status: 200 });
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
          return NextResponse.json(
            {
              audioUrl,
              provider: "kie",
              voiceId: customVoiceId,
              voiceName: clonedVoiceName || customVoiceId,
            },
            { status: 200 },
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
      return NextResponse.json(
        {
          audioUrl,
          provider: "wavespeed",
          voiceId: customVoiceId,
          voiceName: clonedVoiceName || customVoiceId,
        },
        { status: 200 },
      );
    }
    throw new Error(`Unknown actionType: ${actionType}. Supported: tts | video2audio | music | voice-changer | dubbing | lip-sync | voice-cloning.`);
  } catch (error: unknown) {
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

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


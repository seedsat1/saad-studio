import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, rollbackGenerationCharge, setGenerationMediaUrl, setGenerationTaskMarker, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";

const KIE_BASE = "https://api.kie.ai/api/v1";
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const { videoRouteToKieModelMap, wavespeedFallbackMap } = getResolvedKieRoutingMaps();

function getKieKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("KIE API key is not configured");
  return key;
}

function kieHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getKieKey()}`,
  };
}

function getWaveSpeedKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured");
  return key;
}

function wavespeedHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getWaveSpeedKey()}`,
  };
}

function mapToWavespeedInput(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof payload.prompt === "string") out.prompt = payload.prompt;
  if (typeof payload.duration === "number") out.duration = payload.duration;
  else if (typeof payload.duration === "string") out.duration = Number.parseInt(payload.duration, 10);
  if (typeof payload.aspect_ratio === "string") out.aspect_ratio = payload.aspect_ratio;
  if (typeof payload.resolution === "string") out.resolution = payload.resolution;
  // Normalise image inputs → image_url for WaveSpeed
  const imgSrc =
    (typeof payload.image === "string" ? payload.image : null) ||
    (typeof payload.first_frame_url === "string" ? payload.first_frame_url : null) ||
    (typeof payload.image_url === "string" ? payload.image_url : null);
  if (imgSrc) out.image_url = imgSrc;
  return out;
}

function extractBase64(raw: string) {
  const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { mime, fileData, ext };
}

async function uploadDataUrlToKie(value: string): Promise<string> {
  if (!value.startsWith("data:")) return value;
  const parsed = extractBase64(value);
  if (!parsed) return value;

  // CRITICAL: Use a unique filename per upload. If two uploads share the same
  // filename, KIE may dedupe and return the same URL for both — which silently
  // collapses image_urls=[first,last] to image_urls=[same,same] and breaks
  // first/last-frame video generation.
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const uploadRes = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    headers: kieHeaders(),
    body: JSON.stringify({
      base64Data: parsed.fileData,
      uploadPath: "video-refs",
      fileName: `upload-${uniqueId}.${parsed.ext}`,
    }),
  });

  const uploadJson = await uploadRes.json().catch(() => null);
  const maybeUrl =
    uploadJson?.data?.downloadUrl ||
    uploadJson?.data?.download_url ||
    uploadJson?.data?.fileUrl ||
    uploadJson?.data?.file_url ||
    uploadJson?.data?.url ||
    (typeof uploadJson?.data === "string" ? uploadJson.data : undefined) ||
    uploadJson?.fileUrl ||
    uploadJson?.url;

  if (!uploadRes.ok || !maybeUrl) {
    throw new Error(uploadJson?.msg || "KIE file upload failed");
  }

  return String(maybeUrl);
}

async function resolveMediaInInput(input: Record<string, unknown>) {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && ["image", "image_url", "first_frame_url", "last_frame_url", "last_image", "end_image", "video"].includes(key)) {
      resolved[key] = await uploadDataUrlToKie(value);
      continue;
    }

    if (Array.isArray(value) && ["reference_image_urls", "image_urls", "reference_video_urls", "reference_audio_urls"].includes(key)) {
      const uploaded = await Promise.all(
        value.map(async (item) => (typeof item === "string" ? await uploadDataUrlToKie(item) : item)),
      );
      // Verify uploads produced distinct URLs (critical for first/last frame pairs)
      if (key === "image_urls" && uploaded.length >= 2) {
        const urlsOnly = uploaded.filter((u): u is string => typeof u === "string");
        const uniqueUrls = new Set(urlsOnly);
        console.log(
          `[API/video] image_urls uploaded → ${urlsOnly.length} items, ${uniqueUrls.size} unique URLs`,
          urlsOnly.map((u, i) => `[${i}] ${u.slice(0, 80)}`),
        );
        if (uniqueUrls.size < urlsOnly.length) {
          console.warn(
            "[API/video] ⚠ KIE returned duplicate URLs for distinct frames — first/last frame transition will not work!",
          );
        }
      }
      resolved[key] = uploaded;
      continue;
    }

    resolved[key] = value;
  }

  if (Array.isArray(resolved.kling_elements)) {
    resolved.kling_elements = await Promise.all(
      (resolved.kling_elements as Array<Record<string, unknown>>).map(async (el) => {
        const next = { ...el };
        if (Array.isArray(next.element_input_urls)) {
          next.element_input_urls = await Promise.all(
            (next.element_input_urls as unknown[]).map(async (v) =>
              typeof v === "string" ? await uploadDataUrlToKie(v) : v,
            ),
          );
        }
        return next;
      }),
    );
  }

  return resolved;
}

function normalizeInputForKie(payload: Record<string, unknown>) {
  return { ...payload };
}

function mapToKieInput(model: string, payload: Record<string, unknown>) {
  const input: Record<string, unknown> = { ...payload };

  const startImage =
    (typeof input.first_frame_url === "string" ? input.first_frame_url : null) ||
    (typeof input.image_url === "string" ? input.image_url : null) ||
    (typeof input.image === "string" ? input.image : null);
  const endImage =
    (typeof input.last_frame_url === "string" ? input.last_frame_url : null) ||
    (typeof input.end_image === "string" ? input.end_image : null) ||
    (typeof input.last_image === "string" ? input.last_image : null);
  const referenceImages = Array.isArray(input.reference_image_urls)
    ? input.reference_image_urls.filter((v): v is string => typeof v === "string")
    : [];
  const referenceVideos = Array.isArray(input.reference_video_urls)
    ? input.reference_video_urls.filter((v): v is string => typeof v === "string")
    : [];
  const referenceAudios = Array.isArray(input.reference_audio_urls)
    ? input.reference_audio_urls.filter((v): v is string => typeof v === "string")
    : [];
  const motionVideo = typeof input.video === "string" ? input.video : null;

  if (model === "kling-3.0/video") {
    const out: Record<string, unknown> = {};
    const mode = typeof input.mode === "string" ? input.mode : "std";
    const sound = input.sound === true;
    const multiShots = input.multi_shots === true;
    const durationRaw = input.duration;
    const durationValue =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number.parseInt(durationRaw, 10)
          : 5;
    const duration = Number.isFinite(durationValue) ? Math.max(3, Math.min(15, durationValue)) : 5;
    const aspectRatio = typeof input.aspect_ratio === "string" ? input.aspect_ratio : undefined;
    const multiPrompt = Array.isArray(input.multi_prompt)
      ? input.multi_prompt
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const rec = item as Record<string, unknown>;
            const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
            const shotDurationRaw = rec.duration;
            const shotDuration =
              typeof shotDurationRaw === "number"
                ? shotDurationRaw
                : typeof shotDurationRaw === "string"
                  ? Number.parseInt(shotDurationRaw, 10)
                  : NaN;
            if (!prompt) return null;
            if (!Number.isFinite(shotDuration) || shotDuration < 1 || shotDuration > 12) return null;
            return { prompt, duration: shotDuration };
          })
          .filter((x): x is { prompt: string; duration: number } => x !== null)
      : [];

    out.mode = mode;
    out.sound = sound;
    out.duration = String(duration);
    if (aspectRatio) out.aspect_ratio = aspectRatio;
    out.multi_shots = multiShots;

    // image_urls: already correctly built by the frontend (start frame + optional end frame).
    // Accept them directly from the payload rather than recomputing.
    const frontendImageUrls = Array.isArray(input.image_urls)
      ? (input.image_urls as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
    if (multiShots) {
      out.multi_prompt = multiPrompt;
      // Only the first frame is supported in multi-shot
      if (frontendImageUrls.length > 0) {
        out.image_urls = [frontendImageUrls[0]];
      } else if (startImage) {
        out.image_urls = [startImage];
      }
      if (typeof input.prompt === "string") out.prompt = "";
    } else {
      out.prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      out.multi_prompt = [];
      // Use frontend-built image_urls directly (preserves start+end frame pair)
      if (frontendImageUrls.length > 0) {
        out.image_urls = frontendImageUrls.slice(0, 2);
      } else if (startImage && endImage) {
        out.image_urls = [startImage, endImage];
      } else if (startImage) {
        out.image_urls = [startImage];
      }
    }

    if (Array.isArray(input.kling_elements)) {
      out.kling_elements = (input.kling_elements as Array<Record<string, unknown>>)
        .map((el) => {
          const name = typeof el.name === "string" ? el.name.trim() : "";
          const description = typeof el.description === "string" ? el.description.trim() : "";
          const urls = Array.isArray(el.element_input_urls)
            ? (el.element_input_urls as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
            : [];
          if (!name || !description || urls.length < 2 || urls.length > 4) return null;
          return { name, description, element_input_urls: urls };
        })
        .filter((x) => x !== null);
    }

    return out;
  }

  // ── Seedance 2.0 / 2.0 Fast — KIE flat input shape ───────────────────────
  // Spec (docs.kie.ai/market/bytedance/seedance-2 + seedance-2-fast):
  //   prompt (REQUIRED, 3-20000)
  //   first_frame_url, last_frame_url, reference_image_urls (max 9)
  //   generate_audio (default TRUE → must be sent explicitly to avoid charge)
  //   resolution: HQ allows 480p/720p/1080p; Fast allows 480p/720p only
  //   aspect_ratio: 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 21:9 / adaptive (default 16:9)
  //   duration: 4-15 (integer)
  if (model === "bytedance/seedance-2" || model === "bytedance/seedance-2-fast") {
    const isFast = model === "bytedance/seedance-2-fast";
    const out: Record<string, unknown> = { ...input };

    // Reference images take priority over single start/end frame
    if (referenceImages.length > 0) {
      out.reference_image_urls = referenceImages.slice(0, 9); // KIE max 9
      delete out.first_frame_url;
      delete out.last_frame_url;
    } else {
      delete out.reference_image_urls;
      if (startImage)  out.first_frame_url = startImage;
      else             delete out.first_frame_url;
      if (endImage)    out.last_frame_url = endImage;
      else             delete out.last_frame_url;
    }

    // Reference videos: max 3, total duration ≤15s (validated client-side)
    // KIE field name in spec has a trailing space: 'reference_video_urls ' — using
    // the trimmed name; if KIE rejects, switch to the spec literal.
    if (referenceVideos.length > 0) {
      out.reference_video_urls = referenceVideos.slice(0, 3);
    } else {
      delete out.reference_video_urls;
    }

    // Reference audios: max 3, total duration ≤15s
    if (referenceAudios.length > 0) {
      out.reference_audio_urls = referenceAudios.slice(0, 3);
    } else {
      delete out.reference_audio_urls;
    }

    // Clean generic aliases never used by Seedance
    delete out.image;
    delete out.image_url;
    delete out.end_image;
    delete out.last_image;
    delete out.image_urls;
    delete out.video;
    delete out.size;
    delete out.mode;
    delete out.quality;

    // duration must be integer in [4, 15]
    const rawDur = typeof out.duration === "string" ? Number.parseInt(out.duration, 10)
                 : typeof out.duration === "number" ? Math.floor(out.duration)
                 : 5;
    out.duration = Math.max(4, Math.min(15, Number.isFinite(rawDur) ? rawDur : 5));

    // resolution: clamp Fast variant to 720p max (KIE rejects 1080p there)
    const rawRes = typeof out.resolution === "string" ? out.resolution.toLowerCase() : "";
    const validRes = isFast
      ? (rawRes === "480p" ? "480p" : "720p")
      : (rawRes === "480p" ? "480p" : rawRes === "1080p" ? "1080p" : "720p");
    out.resolution = validRes;

    // aspect_ratio is REQUIRED per spec — default to 16:9 if missing
    const allowedAR = new Set(["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "adaptive"]);
    if (typeof out.aspect_ratio !== "string" || !allowedAR.has(out.aspect_ratio)) {
      out.aspect_ratio = "16:9";
    }

    // generate_audio: KIE defaults to TRUE (audio = extra cost). Always send
    // explicit boolean so the user's "off" choice isn't silently overridden.
    out.generate_audio = out.generate_audio === true;

    // prompt length: hard cap at 20000 chars (KIE limit)
    if (typeof out.prompt === "string" && out.prompt.length > 20000) {
      out.prompt = out.prompt.slice(0, 20000);
    }

    return out;
  }

  // ── Hailuo 2.3 — expects image_url (singular string), NOT image_urls array ──
  if (model === "hailuo/2-3-image-to-video-standard" || model === "hailuo/2-3-image-to-video-pro") {
    const out: Record<string, unknown> = { ...input };
    // Clean all image field aliases
    delete out.image;
    delete out.image_urls;
    delete out.first_frame_url;
    delete out.last_frame_url;
    delete out.end_image;
    delete out.last_image;
    delete out.reference_image_urls;
    delete out.video;
    // Use the single required start image
    if (startImage) out.image_url = startImage;
    if (typeof out.duration === "number") out.duration = String(out.duration);
    return out;
  }

  // ── Kling 2.5 Turbo Pro (T2V + I2V) — KIE flat input shape ────────────────
  // T2V: { prompt, duration ('5'|'10'), aspect_ratio, negative_prompt?, cfg_scale? }
  // I2V: { prompt, image_url, duration ('5'|'10'), negative_prompt?, cfg_scale? }
  if (
    model === "kling/v2-5-turbo-text-to-video-pro" ||
    model === "kling/v2-5-turbo-image-to-video-pro"
  ) {
    const isI2V = model === "kling/v2-5-turbo-image-to-video-pro";
    const out: Record<string, unknown> = {};
    out.prompt = typeof input.prompt === "string" ? input.prompt : "";
    const dur = typeof input.duration === "number"
      ? input.duration
      : typeof input.duration === "string" ? Number(input.duration) : 5;
    out.duration = dur >= 10 ? "10" : "5";
    if (!isI2V && typeof input.aspect_ratio === "string") {
      out.aspect_ratio = input.aspect_ratio;
    }
    if (typeof input.negative_prompt === "string" && input.negative_prompt.trim()) {
      out.negative_prompt = input.negative_prompt;
    }
    if (typeof input.cfg_scale === "number") {
      out.cfg_scale = input.cfg_scale;
    }
    if (isI2V && startImage) {
      out.image_url = startImage;
    }
    return out;
  }

  // ── Sora 2 — KIE uses n_frames ("10s"/"15s") and "Portrait"/"Landscape" aspect_ratio ──
  if (model === "sora-2-text-to-video" || model === "sora-2-image-to-video" || model === "sora-2-pro-text-to-video") {
    const out: Record<string, unknown> = {};
    out.prompt = typeof input.prompt === "string" ? input.prompt : "";
    // KIE Sora 2 uses "Portrait" / "Landscape" (the registry now sends these directly)
    const ar = typeof input.aspect_ratio === "string" ? input.aspect_ratio : "Landscape";
    out.aspect_ratio = ar;
    // KIE Sora 2 uses n_frames "10s" / "15s" — NOT a numeric duration field
    const soraDur = typeof input.duration === "number" ? input.duration
      : typeof input.duration === "string" ? Number(input.duration) : 10;
    out.n_frames = soraDur >= 15 ? "15s" : "10s";
    // I2V: first frame only (KIE Sora 2 accepts max 1 image)
    if (startImage) out.image_urls = [startImage];
    return out;
  }

  // ── Grok Imagine — duration must be a number (integer slider), not a string ──
  if (model === "grok-imagine/text-to-video" || model === "grok-imagine/image-to-video") {
    const out: Record<string, unknown> = {};
    out.prompt = typeof input.prompt === "string" ? input.prompt : "";
    if (typeof input.aspect_ratio === "string") out.aspect_ratio = input.aspect_ratio;
    if (typeof input.resolution === "string") out.resolution = input.resolution;
    // Keep duration as number — KIE Grok expects integer (slider value), not string
    const grokDur = typeof input.duration === "number" ? input.duration
      : typeof input.duration === "string" ? Number(input.duration) : 6;
    if (Number.isFinite(grokDur)) out.duration = grokDur;
    // I2V: image references (up to 7)
    if (referenceImages.length > 0) out.image_urls = referenceImages.slice(0, 7);
    else if (startImage) out.image_urls = [startImage];
    return out;
  }

  // ── Veo 3.1 — no duration param (model-fixed ~8s), audio always-on (no sound field) ──
  if (model === "veo3.1-lite/text-to-video" || model === "veo3.1-fast/text-to-video" || model === "veo3.1/text-to-video") {
    const out: Record<string, unknown> = {};
    out.prompt = typeof input.prompt === "string" ? input.prompt : "";
    if (typeof input.aspect_ratio === "string") out.aspect_ratio = input.aspect_ratio;
    if (typeof input.resolution === "string") out.resolution = input.resolution;
    // Reference images take priority; otherwise use frame control
    if (referenceImages.length > 0) {
      out.image_urls = referenceImages;
    } else {
      if (startImage) out.first_frame_url = startImage;
      if (endImage) out.last_frame_url = endImage;
    }
    // No duration (fixed by model), no sound field (always-on in Veo 3.1 per Google)
    return out;
  }

  // ── Kling 3.0 Motion Control — KIE flat input shape ──────────────────────
  // Required: input_urls (1 image), video_urls (1 video). Optional: prompt,
  // mode ("std"|"pro"), character_orientation ("video"|"image"),
  // background_source ("input_video"|"input_image"). NO duration/aspect_ratio.
  if (model === "kling-3.0/motion-control") {
    const out: Record<string, unknown> = {};
    if (typeof input.prompt === "string" && input.prompt.trim()) {
      out.prompt = input.prompt.trim().slice(0, 2500);
    }
    if (startImage) out.input_urls = [startImage];
    if (motionVideo) out.video_urls = [motionVideo];

    // resolution ("720p"|"1080p") → mode ("std"|"pro")
    const res = typeof input.resolution === "string" ? input.resolution.toLowerCase() : "";
    const modeFromInput = typeof input.mode === "string" ? input.mode.toLowerCase() : "";
    if (modeFromInput === "std" || modeFromInput === "pro") {
      out.mode = modeFromInput;
    } else if (res.includes("1080")) {
      out.mode = "pro";
    } else if (res.includes("720")) {
      out.mode = "std";
    }

    // orientation ("video"|"image") → character_orientation
    if (input.orientation === "video" || input.orientation === "image") {
      out.character_orientation = input.orientation;
    }

    // scene_control_mode toggle → background_source
    // toggle ON → use image background; OFF (default) → use video background
    if (input.scene_control_mode === true) {
      out.background_source = "input_image";
    } else if (input.scene_control_mode === false) {
      out.background_source = "input_video";
    }

    return out;
  }

  // Generic fallback path (any model not handled above)
  if (referenceImages.length) {
    input.image_urls = referenceImages;
  } else if (startImage && endImage) {
    input.image_urls = [startImage, endImage];
  } else if (startImage) {
    input.image_urls = [startImage];
  }

  delete input.image;
  delete input.image_url;
  delete input.first_frame_url;
  delete input.last_frame_url;
  delete input.end_image;
  delete input.last_image;
  delete input.reference_image_urls;
  delete input.video;

  if (typeof input.duration === "number") {
    input.duration = String(input.duration);
  }

  return input;
}

function normalizeTaskState(status: string) {
  const s = (status || "").toLowerCase();
  if (["success", "succeed", "completed", "done", "finish", "finished"].includes(s)) return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function extractOutputs(resultPayload: unknown): string[] {
  if (!resultPayload) return [];

  if (typeof resultPayload === "string") {
    try {
      const parsed = JSON.parse(resultPayload);
      return extractOutputs(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(resultPayload)) {
    const direct = resultPayload.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
    if (direct.length) return direct;
    // Handle array of objects with url/videoUrl/imageUrl fields
    const fromObjects: string[] = [];
    for (const item of resultPayload) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const url = obj.url ?? obj.videoUrl ?? obj.imageUrl ?? obj.downloadUrl;
        if (typeof url === "string" && /^https?:\/\//.test(url)) fromObjects.push(url);
      }
    }
    return fromObjects;
  }

  if (typeof resultPayload === "object") {
    const data = resultPayload as Record<string, unknown>;
    const candidates = [
      data.resultUrls,
      data.outputs,
      data.urls,
      data.videos,
      data.images,
      data.result,
      data.videoUrl,
      data.imageUrl,
      data.url,
    ];
    for (const candidate of candidates) {
      const extracted = extractOutputs(candidate);
      if (extracted.length) return extracted;
    }
  }

  return [];
}

function validateKling30Payload(payload: Record<string, unknown>): string | null {
  const mode = typeof payload.mode === "string" ? payload.mode : "std";
  if (!["std", "pro"].includes(mode)) return "Kling 3.0 mode must be std or pro.";

  const durationRaw = payload.duration;
  const duration =
    typeof durationRaw === "number"
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number.parseInt(durationRaw, 10)
        : NaN;
  if (!Number.isFinite(duration) || duration < 3 || duration > 15) {
    return "Kling 3.0 duration must be between 3 and 15 seconds.";
  }

  const multiShots = payload.multi_shots === true;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const imageUrls = Array.isArray(payload.image_urls)
    ? payload.image_urls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const refImages = Array.isArray(payload.reference_image_urls)
    ? payload.reference_image_urls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  if (refImages.length > 3) return "Kling 3.0 supports at most 3 reference images.";

  if (!multiShots) {
    if (!prompt) return "Kling 3.0 single-shot requires prompt.";
    if (imageUrls.length > 2) return "Kling 3.0 supports at most 2 image_urls in single-shot.";
  }

  const shots = Array.isArray(payload.multi_prompt) ? payload.multi_prompt : [];
  if (multiShots) {
    if (shots.length < 1 || shots.length > 5) return "Kling 3.0 multi-shot supports 1 to 5 shots.";
    if (imageUrls.length > 1) return "Kling 3.0 multi-shot supports only first frame image.";
    let sum = 0;
    for (const item of shots) {
      if (!item || typeof item !== "object") return "Invalid multi_prompt entry.";
      const record = item as Record<string, unknown>;
      const shotPrompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
      const shotDuration =
        typeof record.duration === "number"
          ? record.duration
          : typeof record.duration === "string"
            ? Number.parseInt(record.duration, 10)
            : NaN;
      if (!shotPrompt || shotPrompt.length > 500) return "Each multi-shot prompt must be 1..500 chars.";
      if (!Number.isFinite(shotDuration) || shotDuration < 1 || shotDuration > 12) {
        return "Each multi-shot duration must be 1..12 seconds.";
      }
      sum += shotDuration;
    }
    if (sum !== duration) return "Sum of multi-shot durations must equal total duration.";
  }

  const klingElements = Array.isArray(payload.kling_elements) ? payload.kling_elements : [];
  if (klingElements.length > 3) return "Kling 3.0 supports maximum 3 elements.";
  if (klingElements.length > 0) {
    const allPrompts = [
      prompt,
      ...shots
        .map((s) => (s && typeof s === "object" && typeof (s as Record<string, unknown>).prompt === "string"
          ? String((s as Record<string, unknown>).prompt)
          : ""))
        .filter(Boolean),
    ].join(" ");

    for (const el of klingElements) {
      if (!el || typeof el !== "object") return "Invalid kling_elements entry.";
      const record = el as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const desc = typeof record.description === "string" ? record.description.trim() : "";
      const urls = Array.isArray(record.element_input_urls)
        ? record.element_input_urls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];
      if (!name || !desc) return "Each element must include name and description.";
      if (urls.length < 2 || urls.length > 4) return `Element ${name} must include 2 to 4 URLs.`;
      if (!allPrompts.includes(`@${name}`)) return `Element @${name} is not referenced in prompts.`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    await syncKieModelCatalog(false).catch(() => null);

    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`video:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    const { modelRoute, payload } = body as {
      modelRoute?: string;
      payload?: Record<string, unknown>;
    };

    if (!modelRoute || typeof modelRoute !== "string") {
      return NextResponse.json({ error: "modelRoute is required" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "payload is required" }, { status: 400 });
    }

    const kieModel = videoRouteToKieModelMap[modelRoute];
    const wavespeedRoute = wavespeedFallbackMap[modelRoute];

    if (!kieModel && !wavespeedRoute) {
      return NextResponse.json(
        { error: `No model mapping for route: ${modelRoute}` },
        { status: 400 },
      );
    }

    const durationForCost = typeof payload.duration === "number" ? payload.duration : 5;
    const qualityForCost =
      (typeof payload.mode === "string" ? payload.mode : null) ||
      (typeof payload.resolution === "string" ? payload.resolution : null) ||
      (typeof payload.quality === "string" ? payload.quality : null);
    const soundEnabled = payload.sound === true || payload.generate_audio === true;
    const baseCost = await getGenerationCost(modelRoute, durationForCost, 1, qualityForCost);
    const creditsToCharge = soundEnabled ? parseFloat((baseCost * 1.5).toFixed(2)) : baseCost;
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: "No credit configuration for this model" }, { status: 400 });
    }

    // ── WaveSpeed path ────────────────────────────────────────────────────────
    if (wavespeedRoute && !kieModel) {
      const wsInput = mapToWavespeedInput(payload);
      if (wsInput.image_url && typeof wsInput.image_url === "string" && wsInput.image_url.startsWith("data:")) {
        wsInput.image_url = await uploadDataUrlToKie(wsInput.image_url).catch(() => wsInput.image_url as string);
      }

      const charge = await spendCredits({
        userId,
        credits: creditsToCharge,
        prompt: typeof payload.prompt === "string" ? sanitizePrompt(payload.prompt, 5000) : "Video generation",
        assetType: "VIDEO",
        modelUsed: modelRoute,
      });
      generationId = charge.generationId;
      chargedCredits = creditsToCharge;
      chargedUserId = userId;

      const wsRes = await fetch(`${WAVESPEED_BASE}/${wavespeedRoute}`, {
        method: "POST",
        headers: wavespeedHeaders(),
        body: JSON.stringify(wsInput),
      });

      let wsJson: Record<string, unknown> | null = null;
      try { wsJson = await wsRes.json(); } catch { /* non-JSON */ }
      const wsPredictionId = (wsJson?.data as Record<string, unknown>)?.id ?? wsJson?.id;

      if (!wsRes.ok || !wsPredictionId) {
        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
        }
        return NextResponse.json(
          { error: (wsJson as Record<string, unknown>)?.message || `WaveSpeed submit failed (${wsRes.status})` },
          { status: 502 },
        );
      }

      const wsTaskId = `ws:${String(wsPredictionId)}`;
      if (generationId) await setGenerationTaskMarker(generationId, wsTaskId);

      return NextResponse.json({ taskId: wsTaskId, status: "processing" });
    }

    // ── KIE path ──────────────────────────────────────────────────────────────
    const normalizedInput = normalizeInputForKie(payload);
    const resolvedInput = await resolveMediaInInput(normalizedInput);

    // ── KIE 3.0 payload diagnostic log ───────────────────────────────────
    if (kieModel === "kling-3.0/video") {
      const rawImageUrls = Array.isArray(normalizedInput.image_urls)
        ? (normalizedInput.image_urls as unknown[]).map((u, i) =>
            typeof u === "string" ? `[${i}] ${u.slice(0, 60)}\u2026 (len=${u.length})` : `[${i}] non-string`
          )
        : "not an array";
      console.log(
        `[API/video] Kling 3.0 received image_urls (${Array.isArray(normalizedInput.image_urls) ? (normalizedInput.image_urls as unknown[]).length : 0} items):`,
        JSON.stringify(rawImageUrls, null, 2)
      );
    }

    const kieInput = mapToKieInput(kieModel!, resolvedInput);

    // ── Post-map log ─────────────────────────────────────────────────────
    if (kieModel === "kling-3.0/video") {
      const mapped = kieInput as Record<string, unknown>;
      console.log("[API/video] Kling 3.0 kieInput snapshot:", JSON.stringify({
        prompt: mapped.prompt,
        mode: mapped.mode,
        duration: mapped.duration,
        aspect_ratio: mapped.aspect_ratio,
        multi_shots: mapped.multi_shots,
        image_urls: Array.isArray(mapped.image_urls)
          ? (mapped.image_urls as string[]).map((u, i) => `[${i}] ${u.slice(0, 80)}\u2026`)
          : mapped.image_urls,
        has_kling_elements: Array.isArray(mapped.kling_elements) && (mapped.kling_elements as unknown[]).length > 0,
        kling_elements_count: Array.isArray(mapped.kling_elements) ? (mapped.kling_elements as unknown[]).length : 0,
      }, null, 2));
    }

    if (kieModel === "kling-3.0/video") {
      const klingError = validateKling30Payload(kieInput);
      if (klingError) {
        return NextResponse.json({ error: klingError }, { status: 400 });
      }
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: typeof payload.prompt === "string" ? sanitizePrompt(payload.prompt, 5000) : "Video generation",
      assetType: "VIDEO",
      modelUsed: modelRoute,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://example.com"}/api/callback`;

    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(),
      body: JSON.stringify({
        model: kieModel,
        callBackUrl: callbackUrl,
        input: kieInput,
      }),
    });

    let createJson: Record<string, unknown> | null = null;
    try {
      createJson = await createRes.json();
    } catch {
      const text = await createRes.text().catch(() => "");
      console.error("[api/video POST] KIE non-JSON response", createRes.status, text.slice(0, 300));
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
      }
      return NextResponse.json(
        { error: `KIE returned non-JSON (${createRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const createData = createJson?.data as Record<string, unknown> | undefined;
    const taskId = createData?.taskId || createJson?.taskId;

    if (!createRes.ok || !taskId) {
      console.error("[api/video POST] KIE createTask failed", createRes.status, JSON.stringify(createJson).slice(0, 500));
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
      }
      return NextResponse.json(
        { error: createJson?.msg || createJson?.message || `KIE createTask failed (${createRes.status})` },
        { status: 502 },
      );
    }

    if (generationId) {
      await setGenerationTaskMarker(generationId, String(taskId));
    }

    return NextResponse.json({
      taskId: String(taskId),
      status: "processing",
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
    }

    const msg = err instanceof Error ? err.message : "Internal Error";
    console.error("[api/video POST]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // ── WaveSpeed polling ────────────────────────────────────────────────────
    if (taskId.startsWith("ws:")) {
      const predictionId = taskId.slice(3);
      let wsKey: string;
      try { wsKey = getWaveSpeedKey(); } catch {
        return NextResponse.json({ error: "WAVESPEED_API_KEY not configured" }, { status: 500 });
      }
      const wsRes = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}/result`, {
        headers: { Authorization: `Bearer ${wsKey}` },
        cache: "no-store",
      });
      let wsJson: Record<string, unknown> | null = null;
      try { wsJson = await wsRes.json(); } catch { /* ignore */ }
      if (!wsRes.ok || !wsJson) {
        return NextResponse.json({ taskId, status: "processing", outputs: [], error: null });
      }
      const wsData = (wsJson.data as Record<string, unknown>) ?? wsJson;
      const rawStatus = String(wsData.status || "");
      const wsStatus = normalizeTaskState(rawStatus);
      const wsOutputs = Array.isArray(wsData.outputs)
        ? (wsData.outputs as unknown[]).filter((v): v is string => typeof v === "string")
        : [];
      const wsError = typeof wsData.error === "string" ? wsData.error : null;

      // DB sync for completion / refund on failure
      try {
        const linkedGeneration = await prismadb.generation.findFirst({
          where: { userId, mediaUrl: { startsWith: `task:${taskId}` } },
          select: { id: true, cost: true, mediaUrl: true },
          orderBy: { createdAt: "desc" },
        });
        if (linkedGeneration) {
          if (wsStatus === "completed" && wsOutputs.length > 0 && linkedGeneration.mediaUrl?.startsWith("task:")) {
            await setGenerationMediaUrl(linkedGeneration.id, wsOutputs[0]);
          }
          if (wsStatus === "failed" && linkedGeneration.cost > 0) {
            await rollbackGenerationCharge(linkedGeneration.id, userId, linkedGeneration.cost);
          }
        }
      } catch { /* best-effort */ }

      return NextResponse.json({ taskId, status: wsStatus, outputs: wsOutputs, error: wsError });
    }

    // ── KIE polling ──────────────────────────────────────────────────────────
    const pollRes = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: kieHeaders(),
      cache: "no-store",
    });

    let pollJson: Record<string, unknown> | null = null;
    try {
      pollJson = await pollRes.json();
    } catch {
      const text = await pollRes.text().catch(() => "");
      console.error("[api/video GET] KIE non-JSON poll response", pollRes.status, text.slice(0, 300));
      return NextResponse.json(
        { taskId, status: "processing", outputs: [], error: null },
      );
    }

    // KIE uses code: 200 for success, but fallback: if HTTP is OK and data exists, treat as success
    const kieCodeOk = pollJson?.code == null || pollJson.code === 200 || pollJson.code === 0;
    if (pollRes.status === 404) {
      // Task not found in KIE — may have been cleaned up; treat as completed if DB has result
      return NextResponse.json(
        { taskId, status: "failed", outputs: [], error: "Task not found" },
        { status: 200 },
      );
    }
    if (!pollRes.ok || !kieCodeOk) {
      return NextResponse.json(
        { error: pollJson?.msg || pollJson?.message || `KIE poll failed (${pollRes.status})` },
        { status: 502 },
      );
    }

    const data = (pollJson?.data ?? {}) as Record<string, unknown>;
    const status = normalizeTaskState(String(data.taskStatus || data.status || data.state || ""));
    const outputs = (() => {
      for (const field of [data.response, data.resultJson, data.outputs, data.result, data.output, data.works]) {
        const found = extractOutputs(field);
        if (found.length) return found;
      }
      return [] as string[];
    })();
    const error = typeof data.errorMessage === "string" ? data.errorMessage
      : typeof data.failMsg === "string" ? data.failMsg : null;

    // DB sync is best-effort; status polling should still work even if DB is temporarily unavailable.
    try {
      const linkedGeneration = await prismadb.generation.findFirst({
        where: { userId, mediaUrl: { startsWith: `task:${taskId}` } },
        select: { id: true, cost: true, mediaUrl: true },
        orderBy: { createdAt: "desc" },
      });

      // Check if callback already resolved this task in DB
      if (linkedGeneration?.mediaUrl && !linkedGeneration.mediaUrl.startsWith("task:")) {
        if (linkedGeneration.mediaUrl.startsWith("failed:")) {
          const parts = linkedGeneration.mediaUrl.split(":");
          const errMsg = parts.slice(2).join(":") || "Generation failed";
          return NextResponse.json({ taskId, status: "failed", outputs: [], error: errMsg });
        }
        // Already has a real URL from callback
        return NextResponse.json({ taskId, status: "completed", outputs: [linkedGeneration.mediaUrl], error: null });
      }

      if (status === "completed" && outputs.length > 0 && linkedGeneration) {
        await setGenerationMediaUrl(linkedGeneration.id, outputs[0]);
      }

      if (status === "failed" && linkedGeneration && linkedGeneration.cost > 0) {
        await rollbackGenerationCharge(linkedGeneration.id, userId, linkedGeneration.cost);
      }
    } catch (dbErr) {
      console.error("[api/video GET] non-fatal DB sync error", dbErr);
    }

    return NextResponse.json({
      taskId: String(data.taskId || taskId),
      status,
      outputs,
      error,
    });
  } catch (err) {
    console.error("[api/video GET]", err);
    return NextResponse.json({ error: "Internal error while checking generation status" }, { status: 500 });
  }
}


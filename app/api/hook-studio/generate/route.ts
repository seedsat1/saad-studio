import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { spendCredits, InsufficientCreditsError } from "@/lib/credit-ledger";
import { HOOK_VIDEO_MODELS, HOOK_GENRES, LLM_BRAIN_MODELS } from "@/lib/hook-studio-config";
import { openai } from "@/lib/gptutils";

export const dynamic = "force-dynamic";

const SEEDANCE_MINI_ASPECT_RATIOS = new Set(["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"]);
const SEEDANCE_MINI_RESOLUTIONS = new Set(["480p", "720p", "1080p", "4k"]);
const SEEDANCE_BASE_ASPECT_RATIOS = new Set(["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"]);
const SEEDANCE_BASE_RESOLUTIONS = new Set(["480p", "720p", "1080p", "4k"]);
const SEEDANCE_TURBO_ASPECT_RATIOS = new Set(["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"]);
const SEEDANCE_TURBO_RESOLUTIONS = new Set(["720p", "1080p"]);

function normalizeDurationSeconds(value: unknown, fallback = 5) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : fallback;
  return Number.isFinite(parsed) ? Math.min(15, Math.max(4, parsed)) : fallback;
}

function normalizeSeedanceMiniResolution(value: unknown) {
  const resolution = typeof value === "string" ? value.toLowerCase() : "720p";
  return SEEDANCE_MINI_RESOLUTIONS.has(resolution) ? resolution : "720p";
}

function normalizeSeedanceBaseResolution(value: unknown) {
  const resolution = typeof value === "string" ? value.toLowerCase() : "720p";
  return SEEDANCE_BASE_RESOLUTIONS.has(resolution) ? resolution : "720p";
}

function normalizeSeedanceTurboResolution(value: unknown) {
  const resolution = typeof value === "string" ? value.toLowerCase() : "720p";
  return SEEDANCE_TURBO_RESOLUTIONS.has(resolution) ? resolution : "720p";
}

function normalizeKlingQuality(value: unknown) {
  const quality = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (quality === "4k" || quality === "4K".toLowerCase()) return "4k";
  return quality === "pro" || quality === "1080p" ? "pro" : "std";
}

function buildKlingO3Route(quality: unknown, hasReferenceVideo: boolean, imageCount: number) {
  const tier = normalizeKlingQuality(quality);
  const mode = hasReferenceVideo || imageCount > 2
    ? "reference-to-video"
    : imageCount > 0
      ? "image-to-video"
      : "text-to-video";
  return `kwaivgi/kling-video-o3-${tier}/${mode}`;
}

function buildKling26Route(quality: unknown, hasStartImage: boolean) {
  const tier = normalizeKlingQuality(quality) === "pro" ? "pro" : "std";
  return `kwaivgi/kling-v2.6-${tier}/${hasStartImage ? "image-to-video" : "text-to-video"}`;
}

function resolveHookWavespeedRoute(modelId: string, apiRoute: string, hasStartImage: boolean, quality?: unknown, hasReferenceVideo = false, imageCount = 0) {
  if (modelId === "kling-3.0-pro") {
    return normalizeKlingQuality(quality) === "pro"
      ? "kwaivgi/kling-v3.0-pro/image-to-video"
      : "kwaivgi/kling-v3.0-std/image-to-video";
  }
  if (modelId === "kling-3.0-turbo") {
    return normalizeKlingQuality(quality) === "pro"
      ? "kwaivgi/kling-v3-turbo-pro/image-to-video"
      : "kwaivgi/kling-v3-turbo-std/image-to-video";
  }
  if (modelId === "kling-o3-omni") {
    return buildKlingO3Route(quality, hasReferenceVideo, imageCount);
  }
  if (modelId === "kling-2.6") {
    return buildKling26Route(quality, hasStartImage);
  }
  if (modelId === "seedance-2.0-pro") {
    return hasStartImage
      ? "bytedance/seedance-2.0/image-to-video"
      : "bytedance/seedance-2.0/text-to-video";
  }
  if (modelId === "seedance-2.0-turbo") {
    return hasStartImage
      ? "bytedance/seedance-2.0/image-to-video-turbo"
      : "bytedance/seedance-2.0/text-to-video-turbo";
  }
  if (modelId === "seedance-2.0-mini") {
    return hasStartImage
      ? "bytedance/seedance-2.0-mini/image-to-video"
      : "bytedance/seedance-2.0-mini/text-to-video";
  }
  return apiRoute;
}

function normalizeKlingStdDuration(value: unknown) {
  const parsed =
    typeof value === "number"
      ? Math.floor(value)
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : 5;
  return Number.isFinite(parsed) ? Math.min(15, Math.max(3, parsed)) : 5;
}

function normalizeHookPrompt(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[!?.؟،,؛:]+/g, "")
    .replace(/\s+/g, " ");
}

function isArabicText(value: string) {
  return /[\u0600-\u06ff]/.test(value);
}

function isCasualHookStudioPrompt(value: string, hasReferences: boolean) {
  const normalized = normalizeHookPrompt(value);
  if (!normalized) return false;

  const casualMessages = new Set(
    [
      "اهلا",
      "أهلا",
      "اهلاً",
      "أهلاً",
      "هلا",
      "مرحبا",
      "السلام عليكم",
      "السلام عليكم ورحمة الله",
      "شلونك",
      "كيفك",
      "hi",
      "hello",
      "hey",
      "good morning",
      "good evening",
    ].map(normalizeHookPrompt),
  );

  if (casualMessages.has(normalized)) return true;

  const generationTerms = [
    "hook",
    "video",
    "reel",
    "ad",
    "storyboard",
    "generate",
    "create",
    "make",
    "write",
    "فيديو",
    "هوك",
    "اعلان",
    "إعلان",
    "ريل",
    "ستوريبورد",
    "مشهد",
    "برومبت",
    "فكرة",
    "اكتب",
    "اكتبلي",
    "ولد",
    "ولّد",
    "انشئ",
    "أنشئ",
    "اصنع",
    "اعمل",
    "سوي",
  ].map(normalizeHookPrompt);

  const asksForGeneration = generationTerms.some((term) => normalized.includes(term));
  return !asksForGeneration && !hasReferences && normalized.length <= 24;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح لك للوصول" }, { status: 401 });
    }

    const body = await req.json();
    const {
      prompt,
      llmBrain = "gpt-4o",
      genre = "cinematic",
      modelId = "seedance-2.0-pro",
      duration = 5,
      aspectRatio = "9:16",
      quality = "pro",
      generateAudio = true,
      refImages = [],
      refVideos = [],
      refAudios = [],
      longScript = "",
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json({ error: "يرجى كتابة فكرة أو وصف الهوك المطلوب" }, { status: 400 });
    }

    const hasReferences =
      (Array.isArray(refImages) && refImages.length > 0) ||
      (Array.isArray(refVideos) && refVideos.length > 0) ||
      (Array.isArray(refAudios) && refAudios.length > 0);

    if (isCasualHookStudioPrompt(prompt, hasReferences)) {
      return NextResponse.json({
        success: true,
        mode: "chat",
        message:
          isArabicText(prompt)
            ? "أهلاً بك. اكتب فكرة الفيديو أو المنتج أو نوع الهوك الذي تريده، وسأجهز لك هوك وستوريبورد مناسب."
            : "Hello. Send me the video idea, product, or hook direction you want, and I will prepare a focused hook and storyboard.",
      });
    }

    const selectedModel = HOOK_VIDEO_MODELS.find((m) => m.id === modelId) || HOOK_VIDEO_MODELS[0];
    const selectedGenre = HOOK_GENRES.find((g) => g.id === genre) || HOOK_GENRES[0];
    const selectedBrain = LLM_BRAIN_MODELS.find((b) => b.id === llmBrain) || LLM_BRAIN_MODELS[0];
    let safeDuration = normalizeDurationSeconds(duration);
    if (selectedModel.id === "kling-3.0-pro" || selectedModel.id === "kling-3.0-turbo" || selectedModel.id === "kling-o3-omni") {
      safeDuration = normalizeKlingStdDuration(duration);
    } else if (selectedModel.id === "kling-2.6") {
      const kling26Duration = normalizeKlingStdDuration(duration);
      safeDuration = kling26Duration >= 8 ? 10 : 5;
    }
    const safeRefImages = Array.isArray(refImages) ? refImages.filter((v) => typeof v === "string" && /^https?:\/\//i.test(v)) : [];
    const safeRefVideos = Array.isArray(refVideos) ? refVideos.filter((v) => typeof v === "string" && /^https?:\/\//i.test(v)) : [];
    const safeRefAudios = Array.isArray(refAudios) ? refAudios.filter((v) => typeof v === "string" && /^https?:\/\//i.test(v)) : [];
    const providerRoute = resolveHookWavespeedRoute(
      selectedModel.id,
      selectedModel.apiRoute,
      safeRefImages.length > 0,
      quality,
      safeRefVideos.length > 0,
      safeRefImages.length,
    );
    if (selectedModel.id === "kling-3.0-pro" && !safeRefImages[0]) {
      return NextResponse.json({ error: "Kling 3.0 Image-to-Video requires a start image reference." }, { status: 400 });
    }
    if (selectedModel.id === "kling-3.0-turbo" && !safeRefImages[0]) {
      return NextResponse.json({ error: "Kling V3 Turbo Image-to-Video requires a start image reference." }, { status: 400 });
    }
    if (selectedModel.id === "kling-o3-omni" && providerRoute.includes("/image-to-video") && !safeRefImages[0]) {
      return NextResponse.json({ error: "Kling O3 Image-to-Video requires a start image reference." }, { status: 400 });
    }
    if (selectedModel.id === "kling-2.6" && providerRoute.includes("/image-to-video") && !safeRefImages[0]) {
      return NextResponse.json({ error: "Kling 2.6 Image-to-Video requires a start image reference." }, { status: 400 });
    }

    // Deduct user credits for generation
    const cost = selectedModel.creditCost;
    const isImageModel = selectedModel.durations[0] === 0;
    const assetType = isImageModel ? "IMAGE" : "VIDEO";

    let newBalance = 0;
    let generationId: string | null = null;
    try {
      const charge = await spendCredits({
        userId,
        credits: cost,
        prompt: `[${selectedBrain.name}] [${selectedGenre.nameAr}] ${prompt}`,
        assetType: assetType,
        modelUsed: selectedModel.id,
        duration: isImageModel ? 0 : safeDuration,
        aspectRatio: aspectRatio,
        quality: quality,
        providerName: "WaveSpeed",
        providerModel: providerRoute,
      });
      newBalance = charge.remainingCredits;
      generationId = charge.generationId;
    } catch (err: any) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "رصيد الكريدت غير كافٍ لإتمام التوليد", requiredCredits: err.requiredCredits },
          { status: 402 }
        );
      }
      throw err;
    }


    let hookText = "ماذا لو أخبرتك أن المحتوى الفيروسي يصنع بالذكاء الاصطناعي؟";
    let recommendedModelAdvice = "نوصي باستخدام Seedance 2.0 للحصول على معالجة سينمائية وثبات مذهل للألوان.";

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-placeholder") {
      try {
        const systemPrompt = `You are the creative brain of Hook Studio, a premium AI video generation assistant.
Your task is to write a high-retention viral video hook in Arabic or English (matching the user's prompt language and requested dialect, e.g., if they request the Iraqi dialect "اللهجة العراقية", you MUST use authentic Iraqi vocabulary like 'شلونك', 'أريد', 'عيني').

Rules:
1. No placeholders, no filler text, and no duplicate phrases.
2. If the user mentions action/speed/combat, recommend 'Kling 3.0' or 'Kling Turbo' for action sequences. If they mention sci-fi/fantasy/neon/visual realism, recommend 'Seedream V5.0 Pro Edit'. If they want cinematic quality or general storytelling with reference media, recommend 'Seedance 2.0'.
3. Always respond ONLY in a valid JSON object matching this schema:
{
  "hookText": "The actual viral hook phrase (quote-wrapped if needed, e.g., \\"ماذا لو...\\")",
  "recommendedModel": "Detailed recommendation message explaining why a specific model (Seedance 2.0, Kling 3.0, or Seedream V5.0 Pro Edit) is the best choice for this prompt."
}
Do not include any markdown code fence around the JSON, just return raw JSON.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Prompt: " + prompt + "\nGenre: " + selectedGenre.nameEn + "\nBrain Selected: " + selectedBrain.name }
          ],
          response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(completion.choices[0].message.content || "{}");
        if (parsed.hookText) hookText = parsed.hookText;
        if (parsed.recommendedModel) recommendedModelAdvice = parsed.recommendedModel;
      } catch (err) {
        console.error("OpenAI Hook Studio generation error, using fallback:", err);
      }
    }

    // Call Google direct provider or WaveSpeed API v3
    const waveKey = process.env.WAVESPEED_API_KEY;
    let taskId = `ws-hook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let resultUrl: string | null = null;
    let status = "processing";

    const isGoogleModel = selectedModel.provider === "google" || selectedModel.apiRoute.startsWith("google/");

    if (isGoogleModel) {
      try {
        const localOrigin = req.headers.get("origin") || "http://localhost:3000";
        // Forward to our local video route which supports direct Google connection (veo-3.1-generate-preview)
        const localRes = await fetch(`${localOrigin}/api/video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") || "", // Forward Clerk session cookie for authentication
            Authorization: req.headers.get("authorization") || "", // Forward Authorization header
          },
          body: JSON.stringify({
            modelRoute: selectedModel.apiRoute,
            payload: {
              prompt: `${prompt.trim()}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`,
              aspect_ratio: aspectRatio,
              duration: safeDuration,
              resolution: quality || "720p",
              reference_image_urls: safeRefImages,
              reference_video_urls: safeRefVideos,
              reference_audio_urls: safeRefAudios,
              generate_audio: !!generateAudio,
            },
          }),
        });

        const data = await localRes.json().catch(() => null);
        if (localRes.ok && data) {
          taskId = data?.taskId || taskId;
          resultUrl = data?.mediaUrl || data?.url || null;
          if (resultUrl && !resultUrl.startsWith("task:")) status = "completed";
        }
      } catch (err) {
        console.error("Local Google API redirect error:", err);
      }
    } else if (waveKey) {
      try {
        const payload: Record<string, any> = {
          prompt: `${prompt.trim()}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`,
          duration: safeDuration,
          resolution:
            selectedModel.id === "seedance-2.0-pro"
              ? normalizeSeedanceBaseResolution(quality)
              : selectedModel.id === "seedance-2.0-mini"
              ? normalizeSeedanceMiniResolution(quality)
              : selectedModel.id === "seedance-2.0-turbo"
                ? normalizeSeedanceTurboResolution(quality)
                : quality,
        };

        if (selectedModel.id === "kling-3.0-turbo") {
          delete payload.resolution;
          payload.duration = String(normalizeKlingStdDuration(duration));
          if (safeRefImages[0]) payload.image = safeRefImages[0];
        } else if (selectedModel.id === "kling-3.0-pro") {
          delete payload.resolution;
          payload.duration = normalizeKlingStdDuration(duration);
          payload.sound = !!generateAudio;
          if (safeRefImages[0]) payload.image = safeRefImages[0];
          if (safeRefImages[1]) payload.end_image = safeRefImages[1];
        } else if (selectedModel.id === "kling-o3-omni") {
          delete payload.resolution;
          payload.duration = normalizeKlingStdDuration(duration);
          payload.sound = !!generateAudio;
          const shotType = aspectRatio === "source" ? "customize" : "customize";
          payload.shot_type = shotType;
          if (providerRoute.includes("/reference-to-video")) {
            if (["16:9", "9:16", "1:1"].includes(aspectRatio)) payload.aspect_ratio = aspectRatio;
            if (safeRefVideos[0]) {
              payload.video = safeRefVideos[0];
              payload.keep_original_sound = true;
            }
            if (safeRefImages.length > 0) {
              payload.images = safeRefImages.slice(0, safeRefVideos[0] ? 4 : 7);
            }
          } else if (providerRoute.includes("/image-to-video")) {
            if (safeRefImages[0]) payload.image = safeRefImages[0];
            if (safeRefImages[1]) payload.end_image = safeRefImages[1];
          }
        } else if (selectedModel.id === "kling-2.6") {
          delete payload.resolution;
          payload.duration = [5, 10].includes(normalizeKlingStdDuration(duration)) ? normalizeKlingStdDuration(duration) : 5;
          payload.sound = !!generateAudio && providerRoute.includes("-pro/");
          if (safeRefImages[0]) payload.image = safeRefImages[0];
          if (providerRoute.includes("-pro/") && safeRefImages[1] && !payload.sound) payload.end_image = safeRefImages[1];
          payload.cfg_scale = 0.5;
        } else if (selectedModel.id === "seedance-2.0-pro" || selectedModel.id === "seedance-2.0-mini" || selectedModel.id === "seedance-2.0-turbo") {
          const supportedAspects =
            selectedModel.id === "seedance-2.0-pro"
              ? SEEDANCE_BASE_ASPECT_RATIOS
              : selectedModel.id === "seedance-2.0-mini"
              ? SEEDANCE_MINI_ASPECT_RATIOS
              : SEEDANCE_TURBO_ASPECT_RATIOS;
          if (supportedAspects.has(aspectRatio)) payload.aspect_ratio = aspectRatio;
          payload.enable_web_search = false;
          payload.generate_audio = !!generateAudio;
          if (safeRefImages[0]) payload.image = safeRefImages[0];
          if (safeRefImages[1]) payload.last_image = safeRefImages[1];
        } else {
          payload.aspect_ratio = aspectRatio;
          payload.generate_audio = !!generateAudio;
          if (safeRefImages.length > 0) payload.reference_image_urls = safeRefImages.slice(0, selectedModel.maxRefImages);
          if (safeRefVideos.length > 0) payload.reference_video_urls = safeRefVideos.slice(0, selectedModel.maxRefVideos);
          if (safeRefAudios.length > 0) payload.reference_audio_urls = safeRefAudios.slice(0, selectedModel.maxRefAudios);
          if (longScript) payload.script = longScript;
        }

        const res = await fetch(`https://api.wavespeed.ai/api/v3/${providerRoute}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waveKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          taskId = data?.task_id || data?.id || taskId;
          resultUrl = data?.output_url || data?.url || data?.data?.url || null;
          if (resultUrl) status = "completed";
        }
      } catch (err) {
        console.error("WaveSpeed API dispatch error:", err);
      }
    }

    // Update DB Generation record with final results
    if (generationId) {
      try {
        await prismadb.generation.update({
          where: { id: generationId },
          data: {
            mediaUrl: resultUrl || (taskId ? `task:${taskId}` : null),
            outputUrl: resultUrl && /^https?:\/\//i.test(resultUrl) ? resultUrl : null,
            status: resultUrl ? "completed" : "processing",
          },
        });
      } catch (dbErr) {
        console.error("Failed to update generation record:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      generationId: generationId,
      taskId,
      status,
      mediaUrl: resultUrl,
      modelUsed: selectedModel.name,
      creditsDeducted: cost,
      remainingCredits: newBalance,
      hookText,
      recommendedModel: recommendedModelAdvice,
    });
  } catch (error: any) {
    console.error("Hook Studio Generation Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع أثناء التوليد" },
      { status: 500 }
    );
  }
}

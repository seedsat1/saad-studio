import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { spendCredits, InsufficientCreditsError, refundGenerationCharge } from "@/lib/credit-ledger";
import { HOOK_VIDEO_MODELS, HOOK_GENRES, LLM_BRAIN_MODELS } from "@/lib/hook-studio-config";
import { openai } from "@/lib/gptutils";
import { buildHookStudioDirectorSystemPrompt } from "@/lib/hook-studio-director-prompt";

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
  return Number.isFinite(parsed) ? Math.min(15, Math.max(3, parsed)) : fallback;
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

function getInternalImageModelId(modelId: string, hasRefs: boolean): string {
  if (modelId === "seedream-5.0-pro") {
    return "seedream/5-pro";
  }
  if (modelId === "gpt-image-2") {
    return hasRefs ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";
  }
  if (modelId === "nano-banana-pro") {
    return "nano-banana-pro";
  }
  return "seedream/5-pro"; // fallback
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

function getMentionedUrl(value: string) {
  return value.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)?.[0]?.replace(/[),.،]+$/, "") || "";
}

function isAdvisoryHookStudioPrompt(value: string, hasReferences: boolean) {
  const normalized = normalizeHookPrompt(value);
  if (!normalized) return false;

  const asksForAdvice = [
    "ماذا تقترح",
    "شنو تقترح",
    "ما تقترح",
    "اقترح",
    "اقتراح",
    "رايك",
    "رأيك",
    "what do you suggest",
    "suggest",
    "recommend",
    "idea for",
  ].some((term) => normalized.includes(normalizeHookPrompt(term)));

  const hasCampaignContext =
    hasReferences ||
    Boolean(getMentionedUrl(value)) ||
    ["موقعي", "موقع", "اعلان", "إعلان", "ad", "campaign", "website"].some((term) =>
      normalized.includes(normalizeHookPrompt(term)),
    );

  const asksForImmediateGeneration = [
    "ولد الفيديو",
    "ولّد الفيديو",
    "generate video",
    "render video",
    "ابدأ التوليد",
  ].some((term) => normalized.includes(normalizeHookPrompt(term)));

  return asksForAdvice && hasCampaignContext && !asksForImmediateGeneration;
}

function buildAdvisoryReply(prompt: string, hasReferences: boolean) {
  const siteUrl = getMentionedUrl(prompt) || "saadstudio.app";
  if (isArabicText(prompt)) {
    const referenceLine = hasReferences
      ? "اعتمد الصورة المرفقة كموديل/مرجع بصري ثابت في الإعلان."
      : "أضف صورة أو فيديو مرجعي حتى أثبت الهوية البصرية في الإعلان.";
    return [
      `اقتراحي لإعلان ${siteUrl}:`,
      "",
      "الفكرة الأقوى: إعلان قصير يبيّن أن المستخدم يدخل بفكرة بسيطة، ثم Saad Studio يحولها إلى فيديو/هوك جاهز خلال لحظات.",
      referenceLine,
      "",
      "هوك مناسب:",
      "“عندك فكرة؟ خلّي Saad Studio يحولها لإعلان جاهز قبل ما تضيع اللحظة.”",
      "",
      "السيناريو المقترح: لقطة افتتاحية قريبة للموديل/المرجع، بعدها ظهور واجهة الموقع، ثم نتائج فيديو سريعة، وفي النهاية دعوة واضحة: جرّب Saad Studio الآن.",
      "",
      "إذا تريد، اكتب: ولّد هذا الإعلان، وسأحوّله إلى هوك وستوريبورد قابل للتوليد.",
    ].join("\n");
  }

  return [
    `My suggestion for ${siteUrl}:`,
    "",
    "Use a short ad where the viewer starts with a simple idea, then Saad Studio turns it into a ready video hook in moments.",
    hasReferences
      ? "Use the attached image as the main visual/model reference."
      : "Add an image or video reference so the ad can keep a clear visual identity.",
    "",
    "Hook:",
    "“Got an idea? Let Saad Studio turn it into a ready ad before the moment is gone.”",
    "",
    "Storyboard: close opening shot with the reference, quick reveal of the site interface, fast generated-video results, then a call to action: Try Saad Studio now.",
    "",
    "Type: generate this ad, and I will turn it into a hook and storyboard ready for video generation.",
  ].join("\n");
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
      history = [],
      llmBrain = "gpt-4o",
      genre = "advertising",
      modelId = "seedance-2.0-pro",
      duration = 5,
      aspectRatio = "9:16",
      quality = "pro",
      generateAudio = true,
      hookAngle = "brand-reveal",
      refImages = [],
      refVideos = [],
      refAudios = [],
      longScript = "",
      onlyStoryboard = false,
      executeStoryboard = false,
      executeAsImage = false,
    } = body;

    let scenePrompts = body.scenePrompts || [];

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json({ error: "يرجى كتابة فكرة أو وصف الهوك المطلوب" }, { status: 400 });
    }

    const hasReferences =
      (Array.isArray(refImages) && refImages.length > 0) ||
      (Array.isArray(refVideos) && refVideos.length > 0) ||
      (Array.isArray(refAudios) && refAudios.length > 0);

    if (!executeStoryboard && isCasualHookStudioPrompt(prompt, hasReferences)) {
      return NextResponse.json({
        success: true,
        mode: "chat",
        message:
          isArabicText(prompt)
            ? "أهلاً بك. اكتب فكرة الفيديو أو المنتج أو نوع الهوك الذي تريده، وسأجهز لك هوك وستوريبورد مناسب."
            : "Hello. Send me the video idea, product, or hook direction you want, and I will prepare a focused hook and storyboard.",
      });
    }

    if (!executeStoryboard && isAdvisoryHookStudioPrompt(prompt, hasReferences)) {
      return NextResponse.json({
        success: true,
        mode: "chat",
        message: buildAdvisoryReply(prompt, hasReferences),
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

    if (executeStoryboard && executeAsImage) {
      try {
        const imagePromises = scenePrompts.slice(0, 4).map(async (scene: any, idx: number) => {
          const scenePrompt = `${scene.prompt || scene.description || ""}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`;
          const internalModelId = getInternalImageModelId(selectedModel.id, safeRefImages.length > 0);
          
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.saadstudio.app"}/api/generate/image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") || "",
              Authorization: req.headers.get("authorization") || "",
            },
            body: JSON.stringify({
              prompt: scenePrompt,
              modelId: internalModelId,
              aspectRatio: aspectRatio === "source" ? "1:1" : aspectRatio,
              quality: quality || "std",
              imageUrl: safeRefImages[0] || undefined,
              imageUrls: safeRefImages.length > 0 ? safeRefImages : undefined,
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            console.error(`Internal image generation scene ${idx + 1} failed:`, data);
            return {
              title: scene.title || `Scene ${idx + 1}`,
              prompt: scenePrompt,
              url: null,
              error: data?.error || `Internal generation returned status ${res.status}`
            };
          }
          const url = data?.mediaUrl || data?.mediaUrls?.[0] || null;
          return {
            title: scene.title || `Scene ${idx + 1}`,
            prompt: scenePrompt,
            url,
          };
        });

        const results = await Promise.all(imagePromises);
        const imageUrls = results.map(r => r.url).filter(Boolean);

        if (imageUrls.length === 0) {
          const failedResults = results.map(r => r.error).filter(Boolean);
          const detailMsg = failedResults.length > 0 ? failedResults[0] : "API returned empty outputs";
          throw new Error(`لم يتم توليد أي صور بنجاح. السبب: ${detailMsg}`);
        }

        return NextResponse.json({
          success: true,
          mode: "image",
          imageUrls,
          results,
        });
      } catch (genErr: any) {
        console.error("Internal image storyboard dispatch error:", genErr);
        return NextResponse.json({ error: genErr.message || "حدث خطأ أثناء توليد صور المشاهد" }, { status: 400 });
      }
    }

    if (executeStoryboard) {
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
    }

    // Step 1: Storyboard Generation only (No video render, no credits charge)
    if (onlyStoryboard) {
      let hookText = "عندك فكرة؟ خلّي Saad Studio يحولها لإعلان جاهز قبل ما تضيع اللحظة.";
      let directorTreatment = "افتتاحية قوية تربط المرجع البصري برسالة الإعلان، ثم إثبات سريع للقيمة، ثم دعوة واضحة للفعل.";
      let angle = selectedGenre.nameAr || selectedGenre.nameEn;
      let genreLabel = selectedGenre.nameAr || selectedGenre.nameEn;
      let scenePromptsFallback: Array<any> = [
        { title: "الافتتاحية", shotType: "Establishing Shot", lens: "24mm", cameraAngle: "Low Angle", movement: "Dolly In", lighting: "Rembrandt", description: "لقطة قريبة للمرجع البصري مع إحساس إنتاجي فاخر يعرّف هوية الإعلان.", audio: "موسيقى غامضة", prompt: "A cinematic establishing shot, 24mm lens, Rembrandt lighting, showing the product details." },
        { title: "المشكلة", shotType: "Medium Shot", lens: "35mm", cameraAngle: "Eye Level", movement: "Static", lighting: "Soft Light", description: "إظهار لحظة احتياج أو فضول عند الجمهور قبل ظهور الحل.", audio: "نبضات قلب سريعة", prompt: "A medium shot at eye level, soft light, showing a person thinking with curiosity." },
        { title: "الحل", shotType: "Close-Up", lens: "50mm Anamorphic", cameraAngle: "Low Angle", movement: "Push In", lighting: "Neon Cinematic", description: "ظهور Saad Studio كأداة تحول الفكرة إلى إنتاج بصري جاهز.", audio: "موسيقى ملحمية", prompt: "A close-up shot, 50mm Anamorphic lens, luxury cinematic neon, revealing the digital studio interface." },
        { title: "الدعوة", shotType: "Beauty Shot", lens: "85mm", cameraAngle: "Eye Level", movement: "Orbit 180°", lighting: "Golden Hour", description: "نهاية واضحة بشعار الموقع ودعوة تجربة مباشرة.", audio: "شعار صوتي دافئ", prompt: "A product beauty shot, 85mm lens, golden hour glow, showing a call to action." }
      ];
      let recommendedModelAdvice = "نوصي باستخدام Seedance 2.0 للإعلانات السينمائية التي تحتاج ثبات المرجع البصري، حركة ناعمة، وصوت أصلي عند الحاجة.";

      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-placeholder") {
        try {
          const systemPrompt = buildHookStudioDirectorSystemPrompt();

          const historyList = Array.isArray(history) ? history : [];
          const formattedHistory = historyList
            .map((h: any) => ({
              role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
              content: typeof h.content === "string" ? h.content : "",
            }))
            .filter((h: any) => h.content.trim().length > 0);

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.7,
            messages: [
              { role: "system", content: systemPrompt },
              ...formattedHistory,
              { role: "user", content: "Prompt: " + prompt + "\nGenre: " + selectedGenre.nameEn + "\nHook Angle: " + hookAngle + "\nBrain Selected: " + selectedBrain.name }
            ],
            response_format: { type: "json_object" }
          });
          const parsed = JSON.parse(completion.choices[0].message.content || "{}");
          if (parsed.hookText) hookText = parsed.hookText;
          if (parsed.directorTreatment) directorTreatment = parsed.directorTreatment;
          if (parsed.angle) angle = parsed.angle;
          if (parsed.genreLabel) genreLabel = parsed.genreLabel;
          if (Array.isArray(parsed.scenePrompts) && parsed.scenePrompts.length > 0) {
            scenePrompts = parsed.scenePrompts.slice(0, 4).map((scene: any, index: number) => ({
              title: typeof scene?.title === "string" ? scene.title : `Scene ${index + 1}`,
              shotType: typeof scene?.shotType === "string" ? scene.shotType : "Medium Shot",
              lens: typeof scene?.lens === "string" ? scene.lens : "35mm",
              cameraAngle: typeof scene?.cameraAngle === "string" ? scene.cameraAngle : "Eye Level",
              movement: typeof scene?.movement === "string" ? scene.movement : "Static",
              lighting: typeof scene?.lighting === "string" ? scene.lighting : "Soft Light",
              description: typeof scene?.description === "string" ? scene.description : "",
              audio: typeof scene?.audio === "string" ? scene.audio : "",
              prompt: typeof scene?.prompt === "string" ? scene.prompt : String(scene || ""),
            }));
          } else {
            scenePrompts = scenePromptsFallback;
          }
          if (parsed.recommendedModel) recommendedModelAdvice = parsed.recommendedModel;
        } catch (err) {
          console.error("OpenAI Hook Studio generation error, using fallback:", err);
          scenePrompts = scenePromptsFallback;
        }
      } else {
        scenePrompts = scenePromptsFallback;
      }

      return NextResponse.json({
        success: true,
        hookText,
        directorTreatment,
        angle,
        genreLabel,
        scenePrompts,
        recommendedModel: recommendedModelAdvice,
      });
    }

    // Step 2: Video Execution (Bypasses OpenAI, spends credits, dispatches task)
    const cost = selectedModel.creditCost;
    const isImageModel = selectedModel.durations[0] === 0;
    const assetType = isImageModel ? "IMAGE" : "VIDEO";

    let newBalance = 0;
    let generationId: string | null = null;
    try {
      const charge = await spendCredits({
        userId,
        credits: cost,
        prompt: `[${selectedBrain.name}] [${selectedGenre.nameAr}] Execution: ${prompt}`,
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

    // Construct final generation prompt from storyboard scene prompts
    const promptToUse = Array.isArray(scenePrompts) && scenePrompts.length > 0
      ? scenePrompts.map((s: any, idx: number) => `Scene ${idx + 1} (${s.shotType || "Medium"}, ${s.lens || "35mm"}, ${s.movement || "Static"}, ${s.lighting || "Soft Light"}): ${s.prompt || s.description || ""}`).join(" | ")
      : prompt;

    const waveKey = process.env.WAVESPEED_API_KEY;
    let taskId = `ws-hook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let resultUrl: string | null = null;
    let status = "processing";

    const isGoogleModel = selectedModel.provider === "google" || selectedModel.apiRoute.startsWith("google/");

    if (isGoogleModel) {
      try {
        const localOrigin = req.headers.get("origin") || "http://localhost:3000";
        const localRes = await fetch(`${localOrigin}/api/video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") || "",
            Authorization: req.headers.get("authorization") || "",
          },
          body: JSON.stringify({
            modelRoute: selectedModel.apiRoute,
            payload: {
              prompt: `${promptToUse.trim()}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`,
              aspect_ratio: aspectRatio,
              duration: safeDuration,
              resolution: quality || "720p",
              image: safeRefImages[0],
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
        } else {
          if (generationId) {
            await refundGenerationCharge(generationId, userId, cost, {
              reason: "generation_refund_provider_failed",
              clearMediaUrl: true,
            }).catch(() => {});
          }
          const errMsg = data?.error || data?.message || `Google API returned status ${localRes.status}`;
          return NextResponse.json({ error: `Google API error: ${errMsg}` }, { status: 400 });
        }
      } catch (err: any) {
        console.error("Local Google API redirect error:", err);
        if (generationId) {
          await refundGenerationCharge(generationId, userId, cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return NextResponse.json({ error: `Google API redirect error: ${err.message}` }, { status: 500 });
      }
    } else if (waveKey) {
      try {
        const payload: Record<string, any> = {
          prompt: `${promptToUse.trim()}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`,
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
        } else {
          if (generationId) {
            await refundGenerationCharge(generationId, userId, cost, {
              reason: "generation_refund_provider_failed",
              clearMediaUrl: true,
            }).catch(() => {});
          }
          const errMsg = data?.error || data?.message || `WaveSpeed returned status ${res.status}`;
          return NextResponse.json({ error: `WaveSpeed error: ${errMsg}` }, { status: 400 });
        }
      } catch (err: any) {
        console.error("WaveSpeed API dispatch error:", err);
        if (generationId) {
          await refundGenerationCharge(generationId, userId, cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return NextResponse.json({ error: `WaveSpeed dispatch error: ${err.message}` }, { status: 500 });
      }
    }

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
    });
  } catch (error: any) {
    console.error("Hook Studio Generation Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع أثناء التوليد" },
      { status: 500 }
    );
  }
}

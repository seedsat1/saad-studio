import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, recordFreeGeneration, rollbackGenerationCharge, saveAdditionalGenerationUrls, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { applyAnnualUnlimitedImageSlowdown, getAnnualUnlimitedImageEligibility } from "@/lib/annual-image-unlimited";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";
import { isStorageConfigured, uploadBufferToStorage } from "@/lib/supabase-storage";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";
import { normalizeMediaUrl } from "@/lib/storage";
import { resolveProviderMediaUrl, verifyPublicMediaUrl, ValidationError } from "@/lib/media/public-url-resolver";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";
const IDEMPOTENCY_ROUTE = "generate:image";
const GOOGLE_IMAGE_MODEL_MAP: Record<string, string> = {
  "google/nano-banana": "gemini-2.5-flash-image",
  "google/nano-banana-edit": "gemini-2.5-flash-image",
  "nano-banana-2": "gemini-3.1-flash-image",
  "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};
const OPENAI_IMAGE_MODEL_MAP: Record<string, string> = {
  "gpt-image-2-text-to-image": "gpt-image-2",
  "gpt-image-2-image-to-image": "gpt-image-2",
};

interface ImageRequestBody {
  prompt: string;
  modelId: string;
  aspectRatio?: string;
  resolution?: string;
  imageSize?: string;
  numImages?: number;
  negativePrompt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  quality?: string;
  useAnnualUnlimited?: boolean;
  /** KIE input field for reference images: "image_url" (default) or "image_input" (Gemini models) or "input_urls" (GPT I2I, Wan, Flux-2 I2I). */
  imageInputField?: string;
}

interface KieTaskData {
  taskId?: string;
  state?: string;
  resultJson?: string;
  failMsg?: string;
  failCode?: string;
}

interface KieApiResponse {
  code?: number;
  msg?: string;
  data?: KieTaskData;
}

function extractKieOutputUrls(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractKieOutputUrls(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractKieOutputUrls(item));
  }

  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const direct = rec.url ?? rec.imageUrl ?? rec.image_url ?? rec.downloadUrl;
    if (typeof direct === "string") return extractKieOutputUrls(direct);

    const candidates = [
      rec.resultUrls,
      rec.imageUrls,
      rec.images,
      rec.outputs,
      rec.urls,
      rec.result,
      rec.output,
      rec.response,
      rec.data,
    ];
    for (const candidate of candidates) {
      const urls = extractKieOutputUrls(candidate);
      if (urls.length) return urls;
    }
  }

  return [];
}

function inferImageInputField(kieModelId: string): "image_url" | "image_input" | "image_urls" | "input_urls" | undefined {
  if ([
    "google/nano-banana-edit",
    "seedream/4.5-edit",
    "seedream/5-lite-image-to-image",
    "seedream/5-pro-image-to-image",
    "grok-imagine/image-to-image",
    "flux-2/pro-image-to-image",
    "flux-2/flex-image-to-image",
  ].includes(kieModelId)) return "image_urls";

  if ([
    "nano-banana-pro",
    "nano-banana-2",
    "nano-banana-2-lite",
    "google/nano-banana",
  ].includes(kieModelId)) return "image_input";

  if ([
    "gpt-image/1.5-image-to-image",
    "gpt-image-2-image-to-image",
    "wan/2-7-image-pro",
  ].includes(kieModelId)) return "input_urls";

  if ([
    "qwen2/image-edit",
    "qwen/image-to-image",
  ].includes(kieModelId)) return "image_url";

  return undefined;
}

function resolveFlux2Variant(modelId: string, hasReferenceImages: boolean, quality?: string | null): string {
  const normalized = modelId.toLowerCase();
  let prefix: "pro" | "flex" | null = null;

  if (normalized === "flux-2/flex") {
    prefix = "flex";
  } else if (normalized === "flux-2/pro" || normalized === "flux-2/max") {
    prefix = "pro";
  } else if (normalized === "flux-2") {
    const tier = typeof quality === "string" ? quality.trim().toUpperCase() : "";
    prefix = tier === "1K" ? "flex" : "pro";
  }

  if (!prefix) return modelId;
  return hasReferenceImages
    ? `flux-2/${prefix}-image-to-image`
    : `flux-2/${prefix}-text-to-image`;
}

function resolveSeedream5ProVariant(modelId: string, hasReferenceImages: boolean): string {
  const normalized = modelId.toLowerCase();
  if (normalized === "seedream/5-pro") {
    return hasReferenceImages
      ? "seedream/5-pro-image-to-image"
      : "seedream/5-pro-text-to-image";
  }
  return modelId;
}

function getGoogleImageModel(modelId: string): string | null {
  return GOOGLE_IMAGE_MODEL_MAP[modelId] ?? null;
}

function getOpenAIImageModel(modelId: string): string | null {
  return OPENAI_IMAGE_MODEL_MAP[modelId] ?? null;
}

function normalizeOpenAIImageSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "9:16":
    case "3:4":
      return "1024x1536";
    case "16:9":
    case "4:3":
      return "1536x1024";
    case "auto":
    default:
      return "auto";
  }
}

function normalizeOpenAIImageQuality(value?: string | null): "low" | "medium" | "high" {
  const normalized = String(value ?? "medium").trim().toLowerCase();
  if (normalized === "1k" || normalized === "low") return "low";
  if (normalized === "2k" || normalized === "medium") return "medium";
  if (normalized === "4k" || normalized === "high") return "high";
  return "medium";
}

function normalizeGoogleImageSize(model: string, requested?: string | null): string | null {
  if (model === "gemini-2.5-flash-image") return null;
  const normalized = String(requested ?? "1K").trim().toUpperCase();
  return ["1K", "2K", "4K"].includes(normalized) ? normalized : "1K";
}

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function imageUrlToInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  const inline = dataUrlToInlineData(url);
  if (inline) return inline;

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to fetch reference image for Google (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buffer.toString("base64") };
}

async function imageUrlToOpenAIBlob(url: string): Promise<{ blob: Blob; fileName: string }> {
  const inline = dataUrlToInlineData(url);
  if (inline) {
    const ext = inline.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    return {
      blob: new Blob([Buffer.from(inline.data, "base64")], { type: inline.mimeType }),
      fileName: `reference.${ext}`,
    };
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to fetch reference image for OpenAI (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return {
    blob: new Blob([buffer], { type: mimeType }),
    fileName: `reference.${ext}`,
  };
}

function extractOpenAIBase64Images(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const rec = value as Record<string, unknown>;
  const data = Array.isArray(rec.data) ? rec.data : [];
  return data.flatMap((item) => {
    const b64 = (item as Record<string, unknown>)?.b64_json;
    return typeof b64 === "string" && b64 ? [b64] : [];
  });
}

async function generateOpenAIImage(params: {
  apiKey: string;
  openAIModel: string;
  prompt: string;
  referenceUrls: string[];
  aspectRatio: string;
  quality?: string | null;
}): Promise<Array<{ buffer: Buffer; mimeType: string }>> {
  const size = normalizeOpenAIImageSize(params.aspectRatio);
  const quality = normalizeOpenAIImageQuality(params.quality);
  const endpoint = params.referenceUrls.length > 0
    ? "https://api.openai.com/v1/images/edits"
    : "https://api.openai.com/v1/images/generations";

  const headers = { Authorization: `Bearer ${params.apiKey}` };
  let body: BodyInit;

  if (params.referenceUrls.length > 0) {
    const form = new FormData();
    form.append("model", params.openAIModel);
    form.append("prompt", sanitizePrompt(params.prompt, 5000));
    form.append("size", size);
    form.append("quality", quality);
    form.append("output_format", "png");
    for (const ref of params.referenceUrls.slice(0, 16)) {
      const file = await imageUrlToOpenAIBlob(ref);
      form.append("image", file.blob, file.fileName);
    }
    body = form;
  } else {
    body = JSON.stringify({
      model: params.openAIModel,
      prompt: sanitizePrompt(params.prompt, 5000),
      size,
      quality,
      output_format: "png",
    });
    Object.assign(headers, { "Content-Type": "application/json" });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(180_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof json?.error?.message === "string" ? json.error.message : `OpenAI image generation failed (${res.status})`;
    throw new Error(message);
  }

  const images = extractOpenAIBase64Images(json);
  if (!images.length) throw new Error("OpenAI completed but returned no image.");
  return images.map((data) => ({ buffer: Buffer.from(data, "base64"), mimeType: "image/png" }));
}

function extractGoogleInlineImages(value: unknown): Array<{ data: string; mimeType: string }> {
  if (!value || typeof value !== "object") return [];
  const rec = value as Record<string, unknown>;
  const candidates = Array.isArray(rec.candidates) ? rec.candidates : [];
  return candidates.flatMap((candidate) => {
    const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    return parts.flatMap((part) => {
      const inlineData = (part as Record<string, unknown>)?.inlineData as Record<string, unknown> | undefined;
      const data = inlineData?.data;
      if (typeof data !== "string" || !data) return [];
      const mimeType = typeof inlineData?.mimeType === "string" ? inlineData.mimeType : "image/png";
      return [{ data, mimeType }];
    });
  });
}

function normalizeGoogleAspectRatio(aspectRatio?: string | null): string {
  const allowed = new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);
  const normalized = String(aspectRatio ?? "1:1").trim();
  if (allowed.has(normalized)) return normalized;
  return "1:1";
}

async function generateGoogleImage(params: {
  apiKey: string;
  googleModel: string;
  prompt: string;
  referenceUrls: string[];
  aspectRatio: string;
  quality?: string | null;
}): Promise<Array<{ buffer: Buffer; mimeType: string }>> {
  const parts: Array<Record<string, unknown>> = [{ text: sanitizePrompt(params.prompt, 5000) }];
  for (const ref of params.referenceUrls) {
    const inline = await imageUrlToInlineData(ref);
    parts.push({ inline_data: inline });
  }

  // Gemini image-gen models accept aspect ratio as a plain string ("1:1",
  // "16:9", ...) via `imageConfig`. The legacy `responseFormat.image` path
  // expects protobuf enum values (ASPECT_RATIO_1_1, IMAGE_SIZE_*) and rejects
  // plain strings with a 400 — so we use the imageConfig path only.
  const imageConfig: Record<string, string> = { aspectRatio: normalizeGoogleAspectRatio(params.aspectRatio) };
  const imageSize = normalizeGoogleImageSize(params.googleModel, params.quality);
  if (imageSize) imageConfig.imageSize = imageSize;

  const makeRequest = async (config: Record<string, string>) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${params.googleModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": params.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: config,
          },
        }),
      },
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = typeof json?.error?.message === "string" ? json.error.message : `Google image generation failed (${res.status})`;
      return { success: false, error: message };
    }
    return { success: true, json };
  };

  let attempt = await makeRequest(imageConfig);
  if (!attempt.success) {
    const errStr = String(attempt.error || "");
    if (/image size|resolution|imageConfig/i.test(errStr) && imageSize && imageSize !== "1K") {
      console.warn(`[generateGoogleImage] Resolution ${imageSize} failed for model ${params.googleModel}. Retrying with 1K...`);
      const fallbackConfig = { ...imageConfig, imageSize: "1K" };
      attempt = await makeRequest(fallbackConfig);
    }
  }

  if (!attempt.success) {
    throw new Error(attempt.error || "Google image generation failed");
  }

  const json = attempt.json;
  const images = extractGoogleInlineImages(json);
  if (!images.length) {
    const candidates = json && typeof json === "object" && Array.isArray((json as Record<string, any>).candidates)
      ? (json as Record<string, any>).candidates
      : [];
    const finishReason = candidates[0]?.finishReason;
    if (finishReason) {
      throw new Error(`Google image generation was blocked or did not output an image. Reason: ${finishReason}`);
    }
    throw new Error(`Google completed but returned no image. Raw response: ${JSON.stringify(json)}`);
  }
  return images.map((image) => ({ buffer: Buffer.from(image.data, "base64"), mimeType: image.mimeType }));
}



async function createKieTask(
  apiKey: string,
  kieModelId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(KIE_CREATE_TASK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: kieModelId, input }),
  });

  const json: KieApiResponse = await res.json().catch(() => ({}));

  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    const msg = json?.msg ?? res.statusText;
    throw new Error(`KIE createTask failed (HTTP ${res.status}, code ${json.code}): ${msg}`);
  }

  const taskId = json?.data?.taskId;
  if (!taskId) {
    throw new Error(`KIE createTask did not return a taskId. Full response: ${JSON.stringify(json)}`);
  }
  return taskId;
}

async function pollWaveSpeedImageTask(taskId: string, apiKey: string, maxAttempts = 60, intervalMs = 2500): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const statusRes = await fetch(
      `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const statusJson = await statusRes.json().catch(() => null) as Record<string, unknown> | null;
    if (!statusRes.ok) {
      if (statusRes.status === 404) continue;
      throw new Error(`WaveSpeed polling failed (${statusRes.status})`);
    }

    const statusData = (statusJson?.data ?? statusJson) as Record<string, unknown> | null;
    const status = String(statusData?.status ?? statusData?.taskStatus ?? "").toLowerCase();
    if (["success", "completed", "done"].includes(status)) {
      const resultRes = await fetch(
        `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      const resultJson = await resultRes.json().catch(() => null) as Record<string, unknown> | null;
      if (!resultRes.ok) throw new Error(`WaveSpeed result fetch failed (${resultRes.status})`);
      const resultData = (resultJson?.data ?? resultJson) as Record<string, unknown> | null;
      const urls = extractKieOutputUrls(
        resultData?.outputs ??
          resultData?.resultUrls ??
          resultData?.imageUrls ??
          resultData?.images ??
          resultData?.urls ??
          resultData?.result ??
          resultData?.output ??
          resultData?.response ??
          resultData?.data,
      );
      if (!urls.length) throw new Error("No output URL in WaveSpeed result.");
      return urls;
    }

    if (["fail", "failed", "error", "canceled", "cancelled"].includes(status)) {
      throw new Error(String(statusData?.error ?? statusData?.errorMessage ?? "WaveSpeed image generation failed."));
    }
  }

  throw new Error("WaveSpeed image generation timed out.");
}

async function pollKieTask(
  apiKey: string,
  taskId: string,
  maxAttempts = 50,
  intervalMs = 3000,
): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // First 5 polls: 2s interval (fast models); then 3s (default)
    const wait = attempt < 5 ? 2000 : intervalMs;
    await new Promise((r) => setTimeout(r, wait));

    const res = await fetch(
      `${KIE_QUERY_TASK_URL}?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);

    const json: KieApiResponse = await res.json().catch(() => ({}));
    const taskData = json?.data;
    const state = taskData?.state;

    if (String(state || "").toLowerCase() === "success") {
      const resultJson = taskData?.resultJson;
      if (!resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(resultJson) as unknown;
      const urls = extractKieOutputUrls(parsed);
      if (!urls.length) throw new Error("KIE task succeeded but resultUrls is empty.");
      return urls;
    }

    if (String(state || "").toLowerCase() === "fail") {
      const msg = taskData?.failMsg ?? taskData?.failCode ?? "Unknown error";
      throw new Error(`KIE generation failed: ${msg}`);
    }

    // Continue polling while state is: waiting | queuing | generating
  }

  throw new Error("Image generation timed out.");
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    // non-blocking periodic sync of KIE updates catalog
    await syncKieModelCatalog(false).catch(() => null);

    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    let { userId } = await auth();
    if (!userId && process.env.NODE_ENV !== "production") {
      userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    chargedUserId = userId;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`image:${userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body: ImageRequestBody = await req.json();
    const {
      prompt,
      modelId,
      aspectRatio = "1:1",
      numImages = 1,
      negativePrompt,
      imageUrl,
      imageUrls: imageUrlsParam,
      quality,
      resolution,
      imageSize,
      useAnnualUnlimited = true,
      imageInputField,
    } = body;

    if (!prompt || !modelId) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, modelId." },
        { status: 400 },
      );
    }

    // Early check: reference images require Supabase storage to be configured
    const rawRefUrls: string[] = [];
    if (body.imageUrl) rawRefUrls.push(body.imageUrl);
    if (body.imageUrls?.length) rawRefUrls.push(...body.imageUrls);

    const isFluxKontext = modelId.startsWith("flux-kontext");
    const hasReferenceImages = Boolean(imageUrl || imageUrlsParam?.length);
    let effectiveModelId = isFluxKontext ? modelId : resolveFlux2Variant(modelId, hasReferenceImages, quality);
    effectiveModelId = resolveSeedream5ProVariant(effectiveModelId, hasReferenceImages);
    const { imageModelMap } = getResolvedKieRoutingMaps();
    const isWaveSpeedImageModel = false;
    const openAIImageModel = isFluxKontext ? null : getOpenAIImageModel(effectiveModelId);

    const kieModelId = isFluxKontext ? null : (openAIImageModel ? null : imageModelMap[effectiveModelId]);
    if (!isFluxKontext && !openAIImageModel && !kieModelId) {
      const supported = Object.keys(imageModelMap).join(", ");
      return NextResponse.json(
        { error: `Unsupported modelId: ${effectiveModelId}. Supported: ${supported}` },
        { status: 400 },
      );
    }

    const effectiveImageInputField = kieModelId ? imageInputField ?? inferImageInputField(kieModelId) : undefined;
    const googleImageModel = getGoogleImageModel(effectiveModelId);
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleImageModel && !googleApiKey) {
      return NextResponse.json(
        { error: "Google image API key is not configured. Set GOOGLE_API_KEY on the server." },
        { status: 500 },
      );
    }

    const chargeQuality = resolution ?? quality ?? imageSize;
    const unlimited = useAnnualUnlimited
      ? await getAnnualUnlimitedImageEligibility({
          userId,
          modelId: effectiveModelId,
          quality: chargeQuality,
          requestedUnits: numImages,
        })
      : { eligible: false, planId: null as string | null, reason: "disabled", dailyUsed: undefined };
    const creditsToCharge = unlimited.eligible
      ? 0
      : await getGenerationCost(effectiveModelId, 5, numImages, chargeQuality);
    if (!unlimited.eligible && creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit configuration for model: ${modelId}` }, { status: 400 });
    }

    const chargeInput = {
      userId,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: modelId,
      resolution: chargeQuality,
      aspectRatio,
      requestPayload: body,
    };
    const refUrls: string[] = [];
    if (imageUrl) refUrls.push(imageUrl);
    if (imageUrlsParam?.length) refUrls.push(...imageUrlsParam);

    for (const ref of refUrls) {
      await checkStoryboardReferenceImageSafety(ref);
    }

    const resolvedRefs = await Promise.all(
      refUrls.map((r) => resolveProviderMediaUrl(r, { userId, assetType: "image" }))
    );

    for (const url of resolvedRefs) {
      await verifyPublicMediaUrl(url, "reference_image");
    }

    const spent = unlimited.eligible
      ? await recordFreeGeneration(chargeInput)
      : await spendCredits({ ...chargeInput, credits: creditsToCharge });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;
    await applyAnnualUnlimitedImageSlowdown({
      eligible: unlimited.eligible,
      dailyUsed: unlimited.dailyUsed,
      requestedUnits: numImages,
    });

    if (isFluxKontext) {
      const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
      if (!kieApiKey) {
        throw new Error("KIE_API_KEY is not configured on the server.");
      }

      const buildKontextInput = (): Record<string, unknown> => {
        const input: Record<string, unknown> = {
          prompt: sanitizePrompt(prompt, 5000),
          enableTranslation: true,
          uploadCn: false,
          aspectRatio: aspectRatio === "auto" ? "16:9" : aspectRatio,
          outputFormat: "jpeg",
          promptUpsampling: false,
          model: modelId,
          safetyTolerance: 2,
        };

        if (resolvedRefs.length > 0) {
          input.inputImage = resolvedRefs[0];
        }
        return input;
      };

      const createKontextTask = async (apiKey: string, body: Record<string, unknown>): Promise<string> => {
        const res = await fetch("https://api.kie.ai/api/v1/flux/kontext/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
          const msg = json?.msg ?? res.statusText;
          throw new Error(`KIE Kontext createTask failed (HTTP ${res.status}, code ${json.code}): ${msg}`);
        }

        const taskId = json?.data?.taskId;
        if (!taskId) {
          throw new Error(`KIE Kontext createTask did not return a taskId. Response: ${JSON.stringify(json)}`);
        }
        return taskId;
      };

      const taskIds = await Promise.all(
        Array.from({ length: Math.max(1, Math.min(12, numImages)) }, () =>
          createKontextTask(kieApiKey, buildKontextInput())
        )
      );

      const pollResults = await Promise.all(
        taskIds.map((tid) => pollKieTask(kieApiKey, tid))
      );
      const imageUrls = pollResults.flat();
      const taskId = taskIds[0];

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
          console.error("[generate/image] Failed to save Kontext media URL", err);
        });
      }

      if (imageUrls.length > 1 && chargedUserId) {
        await saveAdditionalGenerationUrls(
          chargedUserId,
          sanitizePrompt(prompt, 5000),
          modelId,
          "IMAGE",
          imageUrls.slice(1),
        ).catch((err) => {
          console.error("[generate/image] Failed to save additional Kontext URLs", err);
        });
      }

      const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url) || url);
      return NextResponse.json({
        generationId,
        imageUrls: normalizedImageUrls,
        resultUrls: normalizedImageUrls,
        imageUrl: normalizedImageUrls[0] ?? null,
        mediaUrl: normalizedImageUrls[0] ?? null,
        taskId,
      }, { status: 200 });
    }

    if (openAIImageModel) {
      const openAIApiKey = process.env.OPENAI_API_KEY;
      if (!openAIApiKey) {
        return NextResponse.json(
          { error: "OpenAI API key is not configured. Set OPENAI_API_KEY on the server." },
          { status: 500 },
        );
      }

      const images = await generateOpenAIImage({
        apiKey: openAIApiKey,
        openAIModel: openAIImageModel,
        prompt,
        referenceUrls: resolvedRefs,
        aspectRatio,
        quality: chargeQuality,
      });

      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          const stored = generationId
            ? await uploadBufferToStorage({
                buffer: image.buffer,
                contentType: image.mimeType,
                userId,
                assetType: "IMAGE",
                generationId: index === 0 ? generationId : `${generationId}-${index}`,
              }).catch((err) => {
                console.error("[generate/image] Failed to upload OpenAI image", err);
                return null;
              })
            : null;
          return stored ?? `data:${image.mimeType};base64,${image.buffer.toString("base64")}`;
        }),
      );

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
          console.error("[generate/image] Failed to save OpenAI media URL", err);
        });
      }

      if (imageUrls.length > 1 && chargedUserId) {
        await saveAdditionalGenerationUrls(
          chargedUserId,
          sanitizePrompt(prompt, 5000),
          modelId,
          "IMAGE",
          imageUrls.slice(1),
        ).catch((err) => {
          console.error("[generate/image] Failed to save additional OpenAI URLs", err);
        });
      }

      const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url) || url);
      return NextResponse.json({
        generationId,
        imageUrls: normalizedImageUrls,
        resultUrls: normalizedImageUrls,
        imageUrl: normalizedImageUrls[0] ?? null,
        mediaUrl: normalizedImageUrls[0] ?? null,
        provider: "openai",
        model: openAIImageModel,
      }, { status: 200 });
    }

    if (googleImageModel && googleApiKey) {
      const fanout = Math.max(1, Math.min(4, numImages));
      const googleResults = await Promise.all(
        Array.from({ length: fanout }, () =>
          generateGoogleImage({
            apiKey: googleApiKey,
            googleModel: googleImageModel,
            prompt,
            referenceUrls: resolvedRefs,
            aspectRatio,
            quality: chargeQuality,
          }),
        ),
      );
      const images = googleResults.flat().slice(0, fanout);

      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          const stored = generationId
            ? await uploadBufferToStorage({
                buffer: image.buffer,
                contentType: image.mimeType,
                userId,
                assetType: "IMAGE",
                generationId: index === 0 ? generationId : `${generationId}-${index}`,
              }).catch((err) => {
                console.error("[generate/image] Failed to upload Google image", err);
                return null;
              })
            : null;
          return stored ?? `data:${image.mimeType};base64,${image.buffer.toString("base64")}`;
        }),
      );

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
          console.error("[generate/image] Failed to save Google media URL", err);
        });
      }

      if (imageUrls.length > 1 && chargedUserId) {
        await saveAdditionalGenerationUrls(
          chargedUserId,
          sanitizePrompt(prompt, 5000),
          modelId,
          "IMAGE",
          imageUrls.slice(1),
        ).catch((err) => {
          console.error("[generate/image] Failed to save additional Google URLs", err);
        });
      }

      const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url) || url);
      return NextResponse.json({
        generationId,
        imageUrls: normalizedImageUrls,
        resultUrls: normalizedImageUrls,
        imageUrl: normalizedImageUrls[0] ?? null,
        mediaUrl: normalizedImageUrls[0] ?? null,
        provider: "google",
        model: googleImageModel,
      }, { status: 200 });
    }

    if (isWaveSpeedImageModel) {
      const waveSpeedApiKey = process.env.WAVESPEED_API_KEY;
      if (!waveSpeedApiKey) {
        throw new Error("WAVESPEED_API_KEY is not configured on the server.");
      }

      const submitRes = await fetch(
        `${WAVESPEED_BASE_URL}/${effectiveModelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waveSpeedApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: sanitizePrompt(prompt, 5000),
            images: resolvedRefs,
            aspect_ratio: aspectRatio,
            resolution: typeof quality === "string" ? quality.toLowerCase() : "1k",
            num_images: Math.max(1, Math.min(4, numImages)),
            enable_base64_output: false,
            enable_safety_checker: false,
          }),
        },
      );

      const submitJson = await submitRes.json().catch(() => null) as Record<string, unknown> | null;
      const taskId = ((submitJson?.data as Record<string, unknown> | undefined)?.id ?? submitJson?.id) as string | undefined;
      if (!submitRes.ok || !taskId) {
        throw new Error(`WaveSpeed submit failed (${submitRes.status})`);
      }

      const imageUrls = await pollWaveSpeedImageTask(taskId, waveSpeedApiKey);

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
          console.error("[generate-image] Failed to save WaveSpeed media URL", err);
        });
      }
      if (imageUrls.length > 1 && chargedUserId) {
        await saveAdditionalGenerationUrls(
          chargedUserId,
          sanitizePrompt(prompt, 5000),
          modelId,
          "IMAGE",
          imageUrls.slice(1),
        ).catch((err) => {
          console.error("[generate-image] Failed to save additional WaveSpeed URLs", err);
        });
      }

      const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url) || url);
      return NextResponse.json({
        generationId,
        taskId,
        imageUrls: normalizedImageUrls,
        resultUrls: normalizedImageUrls,
        imageUrl: normalizedImageUrls[0] ?? null,
        mediaUrl: normalizedImageUrls[0] ?? null,
        credits: creditsToCharge,
      });
    }

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) {
      throw new Error("KIE_API_KEY is not configured on the server.");
    }

    if (!kieModelId) {
      throw new Error(`Unsupported modelId: ${effectiveModelId}`);
    }

    const isWanModel = kieModelId.startsWith("wan/");
    const isImagen4Fast = kieModelId === "google/imagen4-fast";
    // Models whose KIE spec uses `image_size` instead of `aspect_ratio`.
    // - Nano Banana family (google/nano-banana, google/nano-banana-edit) accepts the
    //   ratio strings as-is (1:1, 9:16, 16:9, ...).
    // - Qwen2 Image Edit accepts the ratio strings as-is.
    // - Qwen Text-to-Image uses a named enum (square_hd / portrait_4_3 / ...).
    const NANO_BANANA_IMAGE_SIZE = new Set(["google/nano-banana", "nano-banana/image-to-image"]);
    const QWEN_EDIT_IMAGE_SIZE = new Set(["qwen2/image-edit"]);
    const QWEN_T2I_IMAGE_SIZE_ENUM = new Set(["qwen/text-to-image", "qwen2/text-to-image"]);
    // qwen/image-to-image spec has no aspect/image_size field at all.
    const NO_ASPECT_FIELD = new Set(["qwen/image-to-image"]);
    // KIE models that natively accept a batch parameter (num_images / n).
    // For everything else we fan out N parallel createTasks below.
    const NATIVE_BATCH_MODELS = new Set(["google/imagen4-fast", "wan/2-7-image-pro"]);

    const ratioToQwenImageSize = (ratio: string): string => {
      switch (ratio) {
        case "1:1":  return "square_hd";
        case "3:4":  return "portrait_4_3";
        case "4:3":  return "landscape_4_3";
        case "9:16": return "portrait_16_9";
        case "16:9": return "landscape_16_9";
        default:     return "square_hd";
      }
    };

    const buildAspectField = (target: Record<string, unknown>) => {
      if (NO_ASPECT_FIELD.has(kieModelId)) return; // spec has no such field
      if (NANO_BANANA_IMAGE_SIZE.has(kieModelId) || QWEN_EDIT_IMAGE_SIZE.has(kieModelId)) {
        target.image_size = aspectRatio;
        return;
      }
      if (QWEN_T2I_IMAGE_SIZE_ENUM.has(kieModelId)) {
        target.image_size = ratioToQwenImageSize(aspectRatio);
        return;
      }
      target.aspect_ratio = aspectRatio;
    };

    const normalizeGptImage2Resolution = (): string | null => {
      if (!kieModelId.startsWith("gpt-image-2-")) return null;
      const requested = typeof resolution === "string" && resolution ? resolution : quality;
      const normalized = ["1K", "2K", "4K"].includes(requested ?? "") ? requested! : "1K";
      if (aspectRatio === "auto") return "1K";
      if (aspectRatio === "1:1" && normalized === "4K") {
        throw new Error("GPT Image 2 does not support 4K with 1:1 aspect ratio.");
      }
      return normalized;
    };

    /** Build the `input` body for a single createTask call.
     * `requestedCount` is what we pass to the model when it supports a batch field. */
    const buildInput = (requestedCount: number): Record<string, unknown> => {
      const input: Record<string, unknown> = {
        prompt: sanitizePrompt(prompt, 5000),
      };
      buildAspectField(input);

      if (isWanModel) {
        // n=1-4 default; 1-12 with enable_sequential.
        input.n = Math.max(1, Math.min(12, requestedCount));
        if (requestedCount > 4) input.enable_sequential = true;
        input.nsfw_checker = true;
        input.watermark = false;
        input.seed = 0;
      } else if (isImagen4Fast) {
        // Spec requires string enum "1" | "2" | "3" | "4"
        input.num_images = String(Math.max(1, Math.min(4, requestedCount)));
      } else if (NATIVE_BATCH_MODELS.has(kieModelId)) {
        input.num_images = requestedCount;
      }
      // Models without native batch: do NOT send num_images / n; outer loop fans out.

      if (negativePrompt) input.negative_prompt = negativePrompt;

      if (resolvedRefs.length > 0) {
        if (effectiveImageInputField === "image_input") {
          input.image_input = resolvedRefs;
        } else if (effectiveImageInputField === "image_urls") {
          input.image_urls = resolvedRefs;
        } else if (effectiveImageInputField === "input_urls") {
          input.input_urls = resolvedRefs;
          // Wan spec: aspect_ratio must not be sent when input_urls is present
          if (isWanModel) {
            delete input.aspect_ratio;
            delete input.image_size;
          }
        } else if (effectiveImageInputField === "image_url") {
          input.image_url = resolvedRefs[0];
        } else {
          if (resolvedRefs.length === 1) input.image_url = resolvedRefs[0];
          else input.image_urls = resolvedRefs;
        }
      }

      // Quality field handling
      // - "1K"/"2K"/"4K"           → resolution param (Wan, Nano Banana Pro/2)
      // - "speed"/"quality"        → enable_pro boolean (Grok Imagine T2I)
      // - "basic"/"high"           → quality param (Seedream)
      // - other ("medium"/"high")  → quality param (GPT Image)
      const gptImage2Resolution = normalizeGptImage2Resolution();
      const RESOLUTION_VALUES = ["1K", "2K", "4K"];
      if (gptImage2Resolution) {
        input.resolution = gptImage2Resolution;
      } else if (quality && RESOLUTION_VALUES.includes(quality)) {
        input.resolution = quality;
      } else if (quality === "speed" || quality === "quality") {
        // Grok Imagine T2I speed-vs-quality toggle
        input.enable_pro = quality === "quality";
      } else if (quality) {
        input.quality = quality;
      }
      if (resolution && !gptImage2Resolution) input.resolution = resolution;

      return input;
    };

    // Determine batch strategy:
    // - native batch models    → 1 call, model returns all images
    // - non-native + N>1       → fan out N parallel createTasks
    const useNativeBatch = NATIVE_BATCH_MODELS.has(kieModelId);
    const fanout = useNativeBatch ? 1 : Math.max(1, Math.min(12, numImages));
    const requestedPerCall = useNativeBatch ? numImages : 1;

    const taskIds: string[] = await Promise.all(
      Array.from({ length: fanout }, () =>
        createKieTask(kieApiKey, kieModelId, buildInput(requestedPerCall)),
      ),
    );
    const pollResults = await Promise.all(
      taskIds.map((tid) => pollKieTask(kieApiKey, tid)),
    );
    const imageUrls = pollResults.flat();
    const taskId = taskIds[0];

    // Save the first result URL to the main generation record (Gallery + Image history)
    if (generationId && imageUrls[0]) {
      await setGenerationMediaUrl(generationId, imageUrls[0]).catch((err) => {
        console.error("[generate/image] Failed to save first image URL", err);
      });
    }

    // Save each additional image as a separate zero-cost record so all images
    // appear correctly in the gallery after page refresh (fixes multi-image loss bug)
    if (imageUrls.length > 1 && chargedUserId) {
      await saveAdditionalGenerationUrls(
        chargedUserId,
        sanitizePrompt(prompt, 5000),
        modelId,
        "IMAGE",
        imageUrls.slice(1),
      ).catch((err) => {
        console.error("[generate/image] Failed to save additional image URLs", err);
      });
    }

    const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url) || url);
    const responseJson = {
      generationId,
      imageUrls: normalizedImageUrls,
      resultUrls: normalizedImageUrls,
      imageUrl: normalizedImageUrls[0] ?? null,
      mediaUrl: normalizedImageUrls[0] ?? null,
      taskId,
    };
    return NextResponse.json(responseJson, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InsufficientCreditsError) {
      const responseJson: Record<string, unknown> = {
        error: "Insufficient credits",
        requiredCredits: error.requiredCredits,
        currentBalance: error.currentBalance,
      };
      return NextResponse.json(
        responseJson,
        { status: 402 },
      );
    }

    if (error instanceof ValidationError || error instanceof UnsafeReferenceImageError) {
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => {});
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

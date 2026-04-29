import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, precheckGenerationPolicy, refundGenerationCharge, saveAdditionalGenerationUrls, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

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
    "grok-imagine/image-to-image",
    "flux-2/pro-image-to-image",
    "flux-2/flex-image-to-image",
  ].includes(kieModelId)) return "image_urls";

  if ([
    "nano-banana-pro",
    "nano-banana-2",
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

async function uploadBase64ToStorage(
  base64Data: string,
  userId: string,
  genId: string,
  idx: number,
): Promise<string> {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URL for reference image");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image-ref",
    generationId: `${genId}-r${idx}`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image to storage");
  return url;
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

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      imageInputField,
    } = body;

    if (!prompt || !modelId) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, modelId." },
        { status: 400 },
      );
    }

    const precheck = await precheckGenerationPolicy({ prompt, negativePrompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const hasReferenceImages = Boolean(imageUrl || imageUrlsParam?.length);
    const effectiveModelId = resolveFlux2Variant(modelId, hasReferenceImages, quality);
    const { imageModelMap } = getResolvedKieRoutingMaps();

    const kieModelId = imageModelMap[effectiveModelId];
    if (!kieModelId) {
      const supported = Object.keys(imageModelMap).join(", ");
      return NextResponse.json(
        { error: `Unsupported modelId: ${effectiveModelId}. Supported: ${supported}` },
        { status: 400 },
      );
    }

    const effectiveImageInputField = imageInputField ?? inferImageInputField(kieModelId);

    const creditsToCharge = await getGenerationCost(effectiveModelId, 5, numImages);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit configuration for model: ${modelId}` }, { status: 400 });
    }

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: modelId,
    });
    chargedCredits = creditsToCharge;
    chargedUserId = userId;
    generationId = spent.generationId;

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) {
      throw new Error("KIE_API_KEY is not configured on the server.");
    }

    // Resolve all reference images: upload base64 → Supabase Storage, pass http URLs as-is.
    const resolveRef = async (raw: string, idx: number): Promise<string> => {
      if (!raw.startsWith("data:")) return raw;
      return await uploadBase64ToStorage(raw, userId, generationId!, idx);
    };
    const refUrls: string[] = [];
    if (imageUrl) refUrls.push(imageUrl);
    if (imageUrlsParam?.length) refUrls.push(...imageUrlsParam);
    const resolvedRefs = await Promise.all(refUrls.map((r, i) => resolveRef(r, i)));

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
        input.nsfw_checker = false;
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

    return NextResponse.json(
      {
        imageUrls,
        resultUrls: imageUrls,
        imageUrl: imageUrls[0] ?? null,
        mediaUrl: imageUrls[0] ?? null,
        taskId,
      },
      { status: 200 },
    );
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
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

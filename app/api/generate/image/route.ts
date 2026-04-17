import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, refundCredits, spendCredits, setGenerationMediaUrl } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 60;
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
  maxAttempts = 100,
  intervalMs = 3000,
): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(
      `${KIE_QUERY_TASK_URL}?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);

    const json: KieApiResponse = await res.json().catch(() => ({}));
    const taskData = json?.data;
    const state = taskData?.state;

    if (state === "success") {
      const resultJson = taskData?.resultJson;
      if (!resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
      const urls = parsed?.resultUrls ?? [];
      if (!urls.length) throw new Error("KIE task succeeded but resultUrls is empty.");
      return urls;
    }

    if (state === "fail") {
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

    const { imageModelMap } = getResolvedKieRoutingMaps();

    const kieModelId = imageModelMap[modelId];
    if (!kieModelId) {
      const supported = Object.keys(imageModelMap).join(", ");
      return NextResponse.json(
        { error: `Unsupported modelId: ${modelId}. Supported: ${supported}` },
        { status: 400 },
      );
    }

    const creditsToCharge = await getGenerationCost(modelId, 5, numImages);
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

    const input: Record<string, unknown> = {
      prompt: sanitizePrompt(prompt, 5000),
      aspect_ratio: aspectRatio,
      num_images: numImages,
    };
    if (negativePrompt) input.negative_prompt = negativePrompt;
    // Build reference image fields using the model-specific field name
    if (resolvedRefs.length > 0) {
      if (imageInputField === "image_input") {
        // Gemini/Nano Banana: always array
        input.image_input = resolvedRefs;
      } else if (imageInputField === "image_urls") {
        // Seedream / Grok I2I: always array
        input.image_urls = resolvedRefs;
      } else if (imageInputField === "input_urls") {
        // GPT Image I2I / Wan / Flux-2 I2I: always array
        input.input_urls = resolvedRefs;
      } else if (imageInputField === "image_url") {
        // Qwen models: single string
        input.image_url = resolvedRefs[0];
      } else {
        // Default: image_url for single, image_urls for multiple
        if (resolvedRefs.length === 1) input.image_url = resolvedRefs[0];
        else input.image_urls = resolvedRefs;
      }
    }
    // "1K"/"2K"/"4K" → resolution param; "standard"/"hd" → quality param (GPT Image only)
    const RESOLUTION_VALUES = ["1K", "2K", "4K"];
    if (quality && RESOLUTION_VALUES.includes(quality)) {
      input.resolution = quality;
    } else if (quality) {
      input.quality = quality;
    }
    if (resolution) input.resolution = resolution;

    const taskId = await createKieTask(kieApiKey, kieModelId, input);
    const imageUrls = await pollKieTask(kieApiKey, taskId);

    // Save the first result URL so it appears in the Gallery and Image history
    if (generationId && imageUrls[0]) {
      await setGenerationMediaUrl(generationId, imageUrls[0]).catch(() => {});
    }

    return NextResponse.json({ imageUrls, taskId }, { status: 200 });
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

    if (chargedCredits > 0 && chargedUserId) {
      await refundCredits(chargedUserId, chargedCredits);
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  recordFreeGeneration,
  rollbackGenerationCharge,
  saveAdditionalGenerationUrls,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { applyAnnualUnlimitedImageSlowdown, getAnnualUnlimitedImageEligibility } from "@/lib/annual-image-unlimited";
import { getGenerationCost } from "@/lib/pricing";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { getDynamicImageModels } from "@/lib/dynamic-model-loader";
import { sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";
import { isDirectProviderModel } from "@/lib/provider-router";
import { dispatchDirectImage } from "@/lib/providers/dispatch";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";
import {
  DEFAULT_GOOGLE_IMAGE_MODEL_ID,
  getGoogleImageUpstreamModel,
  normalizeGoogleImageSize,
} from "@/lib/google-image-model-specs";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";

type KieApiJson = { code?: number; msg?: string; data?: { taskId?: string; state?: string; resultJson?: string; failMsg?: string; failCode?: string } };

function extractKieUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("{") || t.startsWith("[")) {
      try { return extractKieUrls(JSON.parse(t)); } catch { return []; }
    }
    if (/^https?:\/\//i.test(t)) return [t];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => extractKieUrls(v));
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    const direct = r.url ?? r.imageUrl ?? r.image_url ?? r.downloadUrl;
    if (typeof direct === "string") return extractKieUrls(direct);
    for (const k of ["resultUrls", "imageUrls", "images", "outputs", "urls", "result", "output", "response", "data"]) {
      const u = extractKieUrls(r[k]);
      if (u.length) return u;
    }
  }
  return [];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const clean = typeof value === "string" ? value.trim() : "";
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function resolveSeedream5ProBillingModel(modelId: string, hasReferenceImages: boolean): string {
  const normalized = modelId.toLowerCase();
  if (normalized === "seedream/5-pro") {
    return hasReferenceImages ? "seedream/5-pro-image-to-image" : "seedream/5-pro-text-to-image";
  }
  return modelId;
}

function resolveSeedream5ProWaveSpeedRoute(modelId: string, hasReferenceImages: boolean): string | null {
  const billingModel = resolveSeedream5ProBillingModel(modelId, hasReferenceImages).toLowerCase();
  if (billingModel === "seedream/5-pro-text-to-image" || billingModel === "bytedance/seedream-v5.0-pro") {
    return "bytedance/seedream-v5.0-pro";
  }
  if (billingModel === "seedream/5-pro-image-to-image" || billingModel === "bytedance/seedream-v5.0-pro/edit") {
    return "bytedance/seedream-v5.0-pro/edit";
  }
  return null;
}

function normalizeSeedream5ProResolution(value: unknown): "1k" | "2k" {
  const normalized = String(value ?? "1k").trim().toLowerCase();
  return normalized.includes("2") ? "2k" : "1k";
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

async function createKieTask(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const json = await res.json().catch(() => ({})) as KieApiJson;
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    const upstreamMsg = json.msg ?? res.statusText;
    const inputKeys = Object.keys(input).join(", ");
    console.error("[panel/generate/image] KIE createTask rejected", {
      model,
      status: res.status,
      msg: upstreamMsg,
      inputKeys,
      input,
      response: json,
    });
    throw new Error(
      `KIE createTask failed for model=${model} (status=${res.status}): ${upstreamMsg}. Sent fields: [${inputKeys}].`,
    );
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("KIE did not return a taskId.");
  return taskId;
}

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 60, intervalMs = 3000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 2000 : intervalMs));
    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);
    const json = await res.json().catch(() => ({})) as KieApiJson;
    const state = String(json.data?.state ?? "").toLowerCase();
    if (state === "success") {
      if (!json.data?.resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(json.data.resultJson) as unknown;
      const urls = extractKieUrls(parsed);
      if (!urls.length) throw new Error("KIE task succeeded but no image URLs returned.");
      return urls;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }
  throw new Error("Image generation timed out.");
}

async function createWaveSpeedImageTask(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE_URL}/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null) as Record<string, unknown> | null;
  const data = (json?.data ?? json) as Record<string, unknown> | null;
  const taskId = typeof data?.id === "string" ? data.id : null;
  if (!res.ok || !taskId) {
    throw new Error(`WaveSpeed submit failed for model=${model} (status=${res.status}).`);
  }
  return taskId;
}

async function pollWaveSpeedImageTask(apiKey: string, taskId: string, maxAttempts = 60, intervalMs = 2500): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 2000 : intervalMs));
    const res = await fetch(`${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok) {
      if (res.status === 404) continue;
      throw new Error(`WaveSpeed poll failed (${res.status})`);
    }
    const data = (json?.data ?? json) as Record<string, unknown> | null;
    const status = String(data?.status ?? "").toLowerCase();
    if (status === "completed") {
      const urls = extractKieUrls(data?.outputs ?? data?.resultUrls ?? data?.imageUrls ?? data?.images ?? data?.urls);
      if (!urls.length) throw new Error("WaveSpeed task completed but returned no image URLs.");
      return urls;
    }
    if (["failed", "cancelled", "timeout"].includes(status)) {
      throw new Error(String(data?.error ?? data?.errorMessage ?? "WaveSpeed image generation failed."));
    }
  }
  throw new Error("WaveSpeed image generation timed out.");
}

/** POST /api/panel/generate/image â€” generates images using website credits + KIE API. */
export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });

  const rate = hitRateLimit({
    key: `panel:generate-image:${verified.userId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  let chargedCredits = 0;
  let generationId: string | null = null;
  const userId = verified.userId;

  try {
    await ensureUserRow(userId);
    const dbUser = await prismadb.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });
    if (dbUser?.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const body = await req.json() as {
      prompt?: string;
      modelId?: string;
      aspectRatio?: string;
      resolution?: string;
      numImages?: number;
      negativePrompt?: string;
      imageUrl?: string;
      imageUrls?: string[];
      referenceImageUrls?: string[];
      imageInputField?: "image_url" | "image_input" | "image_urls" | "input_urls";
      useAnnualUnlimited?: boolean;
    };

    const {
      prompt,
      modelId = DEFAULT_GOOGLE_IMAGE_MODEL_ID,
      aspectRatio = "1:1",
      resolution = "1K",
      numImages = 1,
      negativePrompt,
      imageUrl,
      imageUrls: bodyImageUrls,
      referenceImageUrls,
      imageInputField,
      useAnnualUnlimited = true,
    } = body;
    const refUrls = uniqueStrings([
      imageUrl,
      ...(Array.isArray(bodyImageUrls) ? bodyImageUrls : []),
      ...(Array.isArray(referenceImageUrls) ? referenceImageUrls : []),
    ]);

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Please enter a prompt." }, { status: 400 });
    }

    const seedreamWaveSpeedRoute = resolveSeedream5ProWaveSpeedRoute(modelId, refUrls.length > 0);
    if (seedreamWaveSpeedRoute) {
      if (seedreamWaveSpeedRoute.endsWith("/edit") && refUrls.length === 0) {
        return NextResponse.json(
          { error: "Seedream 5.0 Pro Edit requires at least one reference image." },
          { status: 400 },
        );
      }

      for (const refUrl of refUrls) {
        await checkStoryboardReferenceImageSafety(refUrl);
      }

      const billingModelId = resolveSeedream5ProBillingModel(modelId, refUrls.length > 0);
      const unlimited = useAnnualUnlimited
        ? await getAnnualUnlimitedImageEligibility({
            userId,
            modelId: billingModelId,
            quality: resolution,
            requestedUnits: numImages,
          })
        : { eligible: false, planId: null as string | null, reason: "disabled", dailyUsed: undefined };
      const creditsToCharge = unlimited.eligible
        ? 0
        : await getGenerationCost(billingModelId, 5, numImages, resolution);
      if (!unlimited.eligible && creditsToCharge <= 0) {
        return NextResponse.json({ error: `No credit config for model: ${billingModelId}` }, { status: 400 });
      }

      const cleanPrompt = sanitizePrompt(prompt, 5000);
      const chargeInput = {
        userId,
        prompt: cleanPrompt,
        assetType: "IMAGE",
        modelUsed: billingModelId,
      };
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

      const waveSpeedApiKey = process.env.WAVESPEED_API_KEY;
      if (!waveSpeedApiKey) throw new Error("WAVESPEED_API_KEY is not configured on the server.");

      const input: Record<string, unknown> = {
        prompt: cleanPrompt,
        aspect_ratio: aspectRatio === "auto" ? undefined : aspectRatio,
        resolution: normalizeSeedream5ProResolution(resolution),
        output_format: "jpeg",
        enable_base64_output: false,
        enable_sync_mode: false,
      };
      if (seedreamWaveSpeedRoute.endsWith("/edit")) input.images = refUrls.slice(0, 10);
      Object.keys(input).forEach((key) => {
        if (input[key] === undefined) delete input[key];
      });

      const taskId = await createWaveSpeedImageTask(waveSpeedApiKey, seedreamWaveSpeedRoute, input);
      const imageUrls = await pollWaveSpeedImageTask(waveSpeedApiKey, taskId);

      if (generationId && imageUrls[0]) {
        await setGenerationMediaUrl(generationId, imageUrls[0]).catch(() => {});
      }
      if (imageUrls.length > 1) {
        await saveAdditionalGenerationUrls(
          userId,
          cleanPrompt,
          billingModelId,
          "IMAGE",
          imageUrls.slice(1),
        ).catch(() => {});
      }

      return NextResponse.json({
        imageUrls,
        imageUrl: imageUrls[0] ?? null,
        generationId,
        taskId,
        provider: "wavespeed",
        model: seedreamWaveSpeedRoute,
      });
    }

    // â”€â”€ Early dispatch: Google / OpenAI direct adapters.
    //    Routes Google models (Nano Banana, Imagen) to the official
    //    Gemini/Vertex API and OpenAI models (gpt-image, DALLÂ·E) to
    //    OpenAI directly. Everything else falls through to kie.ai.
    if (isDirectProviderModel(modelId)) {
      for (const refUrl of refUrls) {
        await checkStoryboardReferenceImageSafety(refUrl);
      }
      const result = await dispatchDirectImage({
        userId,
        modelId,
        prompt,
        aspectRatio,
        resolution,
        numImages,
        negativePrompt,
        imageUrl: refUrls[0],
        imageUrls: refUrls,
      });
      return NextResponse.json({
        imageUrls: result.imageUrls ?? [],
        imageUrl: result.imageUrl ?? null,
        generationId: result.generationId,
      });
    }

    const dynamicModels = await getDynamicImageModels();
    const dynamicModel = dynamicModels.find((m) => m.id === modelId && m.isActive !== false);

    const { imageModelMap } = getResolvedKieRoutingMaps();
    let kieModelId = imageModelMap[modelId];
    let dynamicImageInputField: string | undefined = undefined;

    if (dynamicModel) {
      kieModelId = dynamicModel.upstreamModelId || dynamicModel.id;
      dynamicImageInputField = dynamicModel.imageInputField;
    } else {
      if (!kieModelId) {
        return NextResponse.json({ error: `Unsupported model: ${modelId}` }, { status: 400 });
      }
    }

    const unlimited = useAnnualUnlimited
      ? await getAnnualUnlimitedImageEligibility({
          userId,
          modelId,
          quality: resolution,
          requestedUnits: numImages,
        })
      : { eligible: false, planId: null as string | null, reason: "disabled", dailyUsed: undefined };
    const creditsToCharge = unlimited.eligible
      ? 0
      : await getGenerationCost(modelId, 5, numImages, resolution);
    if (!unlimited.eligible && creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit config for model: ${modelId}` }, { status: 400 });
    }

    const chargeInput = {
      userId,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: modelId,
    };
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

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) throw new Error("KIE API key not configured on server.");

    const isNanoBanana = ["nano-banana-pro", "nano-banana-2", "nano-banana-2-lite", "google/nano-banana", "google/nano-banana-edit"].includes(kieModelId);
    const normalizedResolution = isNanoBanana
      ? normalizeGoogleImageSize(getGoogleImageUpstreamModel(kieModelId) ?? kieModelId, resolution)
      : resolution;

    const input: Record<string, unknown> = {
      prompt: sanitizePrompt(prompt, 5000),
      // Nano Banana uses image_size not aspect_ratio
      ...(isNanoBanana ? { image_size: aspectRatio } : { aspect_ratio: aspectRatio }),
    };
    if (normalizedResolution) input.resolution = normalizedResolution;
    if (negativePrompt) input.negative_prompt = negativePrompt;

    for (const refUrl of refUrls) {
      await checkStoryboardReferenceImageSafety(refUrl);
    }

    // If reference image URLs are provided, add the correct field per model.
    if (refUrls.length) {
      const effectiveImageInputField = imageInputField ?? dynamicImageInputField ?? inferImageInputField(kieModelId);
      if (effectiveImageInputField === "image_input" || isNanoBanana) {
        input.image_input = refUrls;
      } else if (effectiveImageInputField === "image_urls") {
        input.image_urls = refUrls;
      } else if (effectiveImageInputField === "input_urls") {
        input.input_urls = refUrls;
      } else if (effectiveImageInputField === "image_url") {
        input.image_url = refUrls[0];
      } else if (refUrls.length === 1) {
        input.image_url = refUrls[0];
      } else {
        input.image_urls = refUrls;
      }
    }

    const fanout = Math.max(1, Math.min(4, numImages));
    const taskIds = await Promise.all(
      Array.from({ length: fanout }, () => createKieTask(kieApiKey, kieModelId, input)),
    );
    const results = await Promise.all(taskIds.map((tid) => pollKieTask(kieApiKey, tid)));
    const imageUrls = results.flat();

    if (generationId && imageUrls[0]) {
      await setGenerationMediaUrl(generationId, imageUrls[0]).catch(() => {});
    }
    if (imageUrls.length > 1) {
      await saveAdditionalGenerationUrls(
        userId,
        sanitizePrompt(prompt, 5000),
        modelId,
        "IMAGE",
        imageUrls.slice(1),
      ).catch(() => {});
    }

    return NextResponse.json({ imageUrls, imageUrl: imageUrls[0] ?? null, generationId });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance },
        { status: 402 },
      );
    }
    if (error instanceof UnsafeReferenceImageError) {
      if (chargedCredits > 0 && generationId) {
        await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }
    console.error("[panel/generate/image]", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

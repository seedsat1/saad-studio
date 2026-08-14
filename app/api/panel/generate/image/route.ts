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
import { sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";
import { isDirectProviderModel } from "@/lib/provider-router";
import { dispatchDirectImage } from "@/lib/providers/dispatch";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";
import { buildWaveSpeedImageInput, resolveWaveSpeedImageModelRoute } from "@/lib/wavespeed-image-routing";
import {
  DEFAULT_GOOGLE_IMAGE_MODEL_ID,
} from "@/lib/google-image-model-specs";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3";

function extractProviderUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("{") || t.startsWith("[")) {
      try { return extractProviderUrls(JSON.parse(t)); } catch { return []; }
    }
    if (/^https?:\/\//i.test(t)) return [t];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => extractProviderUrls(v));
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    const direct = r.url ?? r.imageUrl ?? r.image_url ?? r.downloadUrl;
    if (typeof direct === "string") return extractProviderUrls(direct);
    for (const k of ["resultUrls", "imageUrls", "images", "outputs", "urls", "result", "output", "response", "data"]) {
      const u = extractProviderUrls(r[k]);
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
      const urls = extractProviderUrls(data?.outputs ?? data?.resultUrls ?? data?.imageUrls ?? data?.images ?? data?.urls);
      if (!urls.length) throw new Error("WaveSpeed task completed but returned no image URLs.");
      return urls;
    }
    if (["failed", "cancelled", "timeout"].includes(status)) {
      throw new Error(String(data?.error ?? data?.errorMessage ?? "WaveSpeed image generation failed."));
    }
  }
  throw new Error("WaveSpeed image generation timed out.");
}

/** POST /api/panel/generate/image â€” generates images using website credits and official provider routes. */
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
      imageInputField?: "image_url" | "image_input" | "image_urls" | "input_urls" | "image" | "images";
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

    const waveSpeedImageRoute = resolveWaveSpeedImageModelRoute(modelId, refUrls.length > 0, Number(numImages) || 1);
    if (waveSpeedImageRoute) {
      if (waveSpeedImageRoute.requiresReference && refUrls.length === 0) {
        return NextResponse.json(
          { error: "Selected WaveSpeed image edit model requires at least one reference image." },
          { status: 400 },
        );
      }
      if (refUrls.length > waveSpeedImageRoute.maxReferenceImages) {
        return NextResponse.json(
          {
            error: `Selected model accepts up to ${waveSpeedImageRoute.maxReferenceImages} reference image${waveSpeedImageRoute.maxReferenceImages === 1 ? "" : "s"}.`,
          },
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

      const input = buildWaveSpeedImageInput(waveSpeedImageRoute, {
        prompt: cleanPrompt,
        aspectRatio,
        resolution,
        numImages,
        referenceUrls: refUrls,
        negativePrompt,
      });

      const taskCount = waveSpeedImageRoute.outputCountField
        ? 1
        : Math.max(1, Math.min(waveSpeedImageRoute.maxOutputImages, Math.ceil(Number(numImages) || 1)));
      const taskIds = await Promise.all(
        Array.from({ length: taskCount }, () => createWaveSpeedImageTask(waveSpeedApiKey, waveSpeedImageRoute.model, input)),
      );
      const imageUrls = (await Promise.all(taskIds.map((taskId) => pollWaveSpeedImageTask(waveSpeedApiKey, taskId)))).flat();
      const taskId = taskIds[0];

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
        model: waveSpeedImageRoute.model,
      });
    }

    // â”€â”€ Early dispatch: Google / OpenAI direct adapters.
    //    Routes Google models (Nano Banana, Imagen) to the official
    //    Gemini/Vertex API and OpenAI models (gpt-image, DALLÂ·E) to
    //    OpenAI directly. Other curated image models route through WaveSpeed before this direct-provider branch.
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

    return NextResponse.json(
      { error: `Unsupported image model for configured providers: ${modelId}` },
      { status: 400 },
    );

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

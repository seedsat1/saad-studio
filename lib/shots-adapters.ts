// ─── Shots Studio – Provider Adapters & Native Engine Integration ─────────────
// SERVER-SIDE ONLY. Do not import from client components.

import type {
  ShotType,
  ShotModel,
  GenerationMode,
  ShotPreset,
  NormalizedShotOutput,
} from "@/lib/shots-studio";
import { SHOT_PRESETS, SHOT_CREDIT_COSTS, IDENTITY_CRITICAL_SHOTS } from "@/lib/shots-studio";
import { generateImage } from "@/lib/provider-router";
import { persistProviderUrl } from "@/lib/providers/persist-output";

// ─── Adapter Input / Output ───────────────────────────────────────────────────

/**
 * Upload a base64-encoded image to persistent storage and return the hosted URL.
 */
export async function uploadBase64ToStorage(
  base64Data: string,
  userId = "system",
  generationId = `upload_${Date.now()}`
): Promise<string> {
  return persistProviderUrl({
    url: base64Data,
    userId,
    generationId,
    assetType: "IMAGE",
  });
}

/** Compatibility alias */
export const uploadBase64ToKie = uploadBase64ToStorage;

export interface AdapterInput {
  preset: ShotPreset;
  userPrompt: string;
  /** Resolved hosted URL or data: URI. */
  referenceImageUrl?: string;
  aspectRatioOverride?: string;
  userId?: string;
  generationId?: string;
}

// ─── Abstract Base Adapter ────────────────────────────────────────────────────

abstract class BaseShotAdapter {
  abstract readonly modelId: ShotModel;
  /** Whether this adapter accepts a reference image in its payload */
  abstract readonly supportsReferenceImage: boolean;

  abstract generate(input: AdapterInput): Promise<string[]>;
}

// ─── Google Nano Banana Adapter (Direct Google Gemini / Imagen) ───────────────

export class NanoBananaAdapter extends BaseShotAdapter {
  readonly modelId: ShotModel = "nano-banana-pro";
  readonly supportsReferenceImage = true;

  async generate(input: AdapterInput): Promise<string[]> {
    const { preset, userPrompt, referenceImageUrl, aspectRatioOverride, userId, generationId } = input;

    const assembledPrompt = userPrompt
      ? `${preset.systemPrompt}. ${userPrompt}. Cinematic, professional photography.`
      : `${preset.systemPrompt}. Cinematic, professional photography.`;

    const aspectRatio = aspectRatioOverride ?? preset.aspectRatio;

    // Direct Google Image Generation via Central Provider Router
    const result = await generateImage({
      modelId: "nano-banana-pro",
      prompt: assembledPrompt,
      negativePrompt: preset.negativePrompt,
      aspectRatio,
      numImages: 1,
      imageUrl: referenceImageUrl || undefined,
      imageUrls: referenceImageUrl ? [referenceImageUrl] : undefined,
    });

    if (!result.urls || result.urls.length === 0) {
      throw new Error("Google Nano Banana returned no image results.");
    }

    // Persist result URLs to R2 / Supabase Storage
    const persistedUrls = await Promise.all(
      result.urls.map(async (rawUrl) => {
        if (!userId || !generationId) return rawUrl;
        return persistProviderUrl({
          url: rawUrl,
          userId,
          generationId,
          assetType: "IMAGE",
        });
      })
    );

    return persistedUrls;
  }
}

// ─── Z-Image / WaveSpeed Adapter ──────────────────────────────────────────────

export class ZImageAdapter extends BaseShotAdapter {
  readonly modelId: ShotModel = "z-image";
  readonly supportsReferenceImage = false;

  async generate(input: AdapterInput): Promise<string[]> {
    const { preset, userPrompt, aspectRatioOverride, userId, generationId } = input;

    const assembledPrompt = userPrompt
      ? `${preset.systemPrompt}. ${userPrompt}. Professional photography.`
      : `${preset.systemPrompt}. Professional photography.`;

    const aspectRatio = aspectRatioOverride ?? preset.aspectRatio;

    const result = await generateImage({
      modelId: "z-image",
      prompt: assembledPrompt,
      negativePrompt: preset.negativePrompt,
      aspectRatio,
      numImages: 1,
    });

    if (!result.urls || result.urls.length === 0) {
      throw new Error("Z-Image provider returned no image results.");
    }

    const persistedUrls = await Promise.all(
      result.urls.map(async (rawUrl) => {
        if (!userId || !generationId) return rawUrl;
        return persistProviderUrl({
          url: rawUrl,
          userId,
          generationId,
          assetType: "IMAGE",
        });
      })
    );

    return persistedUrls;
  }
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const ADAPTER_REGISTRY: Record<ShotModel, BaseShotAdapter> = {
  "nano-banana-pro": new NanoBananaAdapter(),
  "z-image": new ZImageAdapter(),
};

export function getAdapter(model: ShotModel): BaseShotAdapter {
  return ADAPTER_REGISTRY[model] || ADAPTER_REGISTRY["nano-banana-pro"];
}

// ─── Single Shot Generation with Fallback ─────────────────────────────────────

export interface GenerateShotOptions {
  apiKey?: string;
  shotType: ShotType;
  primaryModel: ShotModel;
  userPrompt: string;
  referenceImageUrl?: string;
  mode: GenerationMode;
  /** Compound output ID for this specific shot result */
  outputId: string;
  userId?: string;
  generationId?: string;
}

/**
 * Generates one shot with automatic server-side fallback logic using native Google / Wavespeed engines.
 * Never throws — always returns a NormalizedShotOutput.
 */
export async function generateShotWithFallback(
  opts: GenerateShotOptions,
): Promise<NormalizedShotOutput> {
  const { shotType, primaryModel, userPrompt, referenceImageUrl, mode, outputId, userId, generationId } = opts;
  const preset = SHOT_PRESETS[shotType];
  const now = new Date().toISOString();

  const tryModel = async (
    model: ShotModel,
    isFallback: boolean,
  ): Promise<NormalizedShotOutput> => {
    const adapter = getAdapter(model);
    const adapterInput: AdapterInput = {
      preset,
      userPrompt,
      referenceImageUrl: adapter.supportsReferenceImage ? referenceImageUrl : undefined,
      userId,
      generationId,
    };

    const urls = await adapter.generate(adapterInput);
    const imageUrl = urls[0] ?? null;

    return {
      output_id: outputId,
      shot_type: shotType,
      model_used: model,
      mode_used: mode,
      asset_url: imageUrl,
      thumbnail_url: imageUrl,
      generation_status: isFallback ? "fallback" : "success",
      credit_cost: SHOT_CREDIT_COSTS[model],
      fallback_used: isFallback,
      created_at: now,
    };
  };

  // ── Primary attempt ──
  try {
    return await tryModel(primaryModel, false);
  } catch (primaryErr) {
    console.warn(`[ShotsStudio] Primary model ${primaryModel} failed:`, primaryErr);
    // ── Retry primary once (covers transient failures) ──
    try {
      return await tryModel(primaryModel, false);
    } catch (retryErr) {
      console.warn(`[ShotsStudio] Primary model ${primaryModel} retry failed:`, retryErr);

      // ── Decide whether fallback to Z-Image is allowed ──
      const isIdentityCritical = IDENTITY_CRITICAL_SHOTS.has(shotType);
      const canFallback =
        primaryModel === "nano-banana-pro" &&
        (mode === "budget" || !isIdentityCritical);

      if (canFallback) {
        try {
          return await tryModel("z-image", true);
        } catch (fallbackErr) {
          const msg =
            fallbackErr instanceof Error ? fallbackErr.message : "Fallback generation failed";
          return {
            output_id: outputId,
            shot_type: shotType,
            model_used: "z-image",
            mode_used: mode,
            asset_url: null,
            thumbnail_url: null,
            generation_status: "failed",
            credit_cost: 0,
            fallback_used: true,
            error_message: msg,
            created_at: now,
          };
        }
      }

      // Fallback not allowed – mark shot as failed
      const msg = retryErr instanceof Error ? retryErr.message : "Generation failed";
      return {
        output_id: outputId,
        shot_type: shotType,
        model_used: primaryModel,
        mode_used: mode,
        asset_url: null,
        thumbnail_url: null,
        generation_status: "failed",
        credit_cost: 0,
        fallback_used: false,
        error_message: msg,
        created_at: now,
      };
    }
  }
}

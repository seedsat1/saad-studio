/** End-to-end dispatch for non-kie panel generations.
 *
 * Centralises the work the existing panel routes do for kie.ai (credit
 * charge → run → persist to R2 → save Generation row) but for Google,
 * BytePlus, and OpenAI direct adapters. The panel route does an early
 * dispatch here when `isDirectProviderModel(modelId)` is true, then
 * falls through to its existing kie flow otherwise.
 *
 * Charging strategy: try the existing pricing table first. If no entry
 * is configured for the modelId, fall back to a sensible default
 * (DEFAULT_IMAGE_COST / DEFAULT_VIDEO_COST) so generations don't crash
 * just because the admin hasn't filled out the pricing row yet. */

import {
  ensureUserRow,
  recordFreeGeneration,
  rollbackGenerationCharge,
  saveAdditionalGenerationUrls,
  setGenerationMediaUrl,
  spendCredits,
  InsufficientCreditsError,
} from "../credit-ledger";
import { getGenerationCost } from "../pricing";
import { getVideoCreditsByModelId } from "../credit-pricing";
import { sanitizePrompt } from "../security";
import prismadb from "../prismadb";

import { generateImage, generateVideo } from "../provider-router";
import { persistProviderUrl } from "./persist-output";

const DEFAULT_IMAGE_COST = 10;
const DEFAULT_VIDEO_COST = 60;

export interface DispatchImageInput {
  userId: string;
  modelId: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  numImages?: number;
  negativePrompt?: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export interface DispatchVideoInput {
  userId: string;
  modelId: string;
  prompt: string;
  aspect?: string;
  durationSec?: number;
  quality?: string;
  mode?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  audioUrls?: string[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
  enableAudio?: boolean;
}

export interface DispatchResult {
  imageUrls?: string[];
  imageUrl?: string | null;
  videoUrl?: string | null;
  generationId: string;
  creditsCharged: number;
}

// ─── Image ─────────────────────────────────────────────────────────────

export async function dispatchDirectImage(input: DispatchImageInput): Promise<DispatchResult> {
  await ensureUserRow(input.userId);
  const banned = await prismadb.user.findUnique({
    where: { id: input.userId },
    select: { isBanned: true },
  });
  if (banned?.isBanned) throw new Error("Account suspended.");

  // 1) Credit cost (with default fallback)
  let cost = await getGenerationCost(input.modelId, 5, input.numImages ?? 1, input.resolution ?? "1K");
  if (!cost || cost <= 0) cost = DEFAULT_IMAGE_COST * (input.numImages ?? 1);

  // 2) Charge credits
  const cleanPrompt = sanitizePrompt(input.prompt, 5000);
  const spent = await spendCredits({
    userId: input.userId,
    prompt: cleanPrompt,
    assetType: "IMAGE",
    modelUsed: input.modelId,
    credits: cost,
  });
  const generationId = spent.generationId;

  try {
    // 3) Call the provider adapter
    const result = await generateImage({
      modelId: input.modelId,
      prompt: cleanPrompt,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      numImages: input.numImages,
      negativePrompt: input.negativePrompt,
      imageUrl: input.imageUrl,
      imageUrls: input.imageUrls,
    });

    // 4) Persist each URL to R2 (best-effort — falls back to source URL)
    const persistedUrls: string[] = [];
    for (let i = 0; i < result.urls.length; i++) {
      const persisted = await persistProviderUrl({
        url: result.urls[i],
        userId: input.userId,
        generationId: i === 0 ? generationId : `${generationId}-${i}`,
        assetType: "IMAGE",
      });
      persistedUrls.push(persisted);
    }

    // 5) Save to DB
    if (persistedUrls[0]) {
      await setGenerationMediaUrl(generationId, persistedUrls[0]).catch(() => {});
    }
    if (persistedUrls.length > 1) {
      await saveAdditionalGenerationUrls(
        input.userId, cleanPrompt, input.modelId, "IMAGE", persistedUrls.slice(1),
      ).catch(() => {});
    }

    return {
      imageUrls: persistedUrls,
      imageUrl: persistedUrls[0] ?? null,
      generationId,
      creditsCharged: cost,
    };
  } catch (err) {
    // Roll back the charge so the user isn't billed for a failed generation.
    await rollbackGenerationCharge(generationId, input.userId, cost).catch(() => {});
    throw err;
  }
}

// ─── Video ─────────────────────────────────────────────────────────────

export async function dispatchDirectVideo(input: DispatchVideoInput): Promise<DispatchResult> {
  await ensureUserRow(input.userId);
  const banned = await prismadb.user.findUnique({
    where: { id: input.userId },
    select: { isBanned: true },
  });
  if (banned?.isBanned) throw new Error("Account suspended.");

  // 1) Credit cost
  let cost = getVideoCreditsByModelId(input.modelId, {
    duration: input.durationSec,
    quality: input.quality,
  });
  if (!cost || cost <= 0) cost = DEFAULT_VIDEO_COST;

  // 2) Charge credits
  const cleanPrompt = sanitizePrompt(input.prompt, 5000);
  const spent = await spendCredits({
    userId: input.userId,
    prompt: cleanPrompt,
    assetType: "VIDEO",
    modelUsed: input.modelId,
    credits: cost,
  });
  const generationId = spent.generationId;

  try {
    // 3) Call the provider adapter
    const result = await generateVideo({
      modelId: input.modelId,
      prompt: cleanPrompt,
      aspect: input.aspect,
      durationSec: input.durationSec,
      quality: input.quality,
      mode: input.mode,
      imageUrl: input.imageUrl,
      imageUrls: input.imageUrls,
      videoUrl: input.videoUrl,
      videoUrls: input.videoUrls,
      audioUrls: input.audioUrls,
      firstFrameUrl: input.firstFrameUrl,
      lastFrameUrl: input.lastFrameUrl,
      referenceImageUrls: input.referenceImageUrls,
      referenceVideoUrls: input.referenceVideoUrls,
      referenceAudioUrls: input.referenceAudioUrls,
      generationType: input.generationType,
      enableAudio: input.enableAudio,
    });

    // 4) Persist to R2
    const persistedUrl = await persistProviderUrl({
      url: result.urls[0],
      userId: input.userId,
      generationId,
      assetType: "VIDEO",
    });

    // 5) Save to DB
    await setGenerationMediaUrl(generationId, persistedUrl).catch(() => {});

    return {
      videoUrl: persistedUrl,
      generationId,
      creditsCharged: cost,
    };
  } catch (err) {
    await rollbackGenerationCharge(generationId, input.userId, cost).catch(() => {});
    throw err;
  }
}

// Re-export error type for callers to do `instanceof InsufficientCreditsError`.
export { InsufficientCreditsError };

/** Quiet the unused import warning when free-generation logic isn't wired
 *  for direct providers yet. */
export const _reserved_for_unlimited = recordFreeGeneration;

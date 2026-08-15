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
  saveAdditionalGenerationUrls,
  InsufficientCreditsError,
} from "../credit-ledger";
import { getGenerationCost } from "../pricing";
import { getVideoCreditsByModelIdAsync } from "../credit-pricing";
import { sanitizePrompt } from "../security";
import prismadb from "../prismadb";

import { generateImage, generateVideo } from "../provider-router";
import { runInlineGeneration } from "../generation/inline-orchestrator";
import { persistProviderUrl } from "./persist-output";
import { resolveRuntimeProviderRoute, routingMetadata, type RuntimeRoutingDecision } from "../routing/runtime-routing";

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

  const cleanPrompt = sanitizePrompt(input.prompt, 5000);
  const legacyProviderName = input.modelId.startsWith("gpt-image") ||
    input.modelId.startsWith("dall-e") ||
    input.modelId.startsWith("openai/")
      ? "openai"
      : "google";
  const routingDecision = await resolveRuntimeProviderRoute({
    modelId: input.modelId,
    modality: "image",
    legacyRoute: { provider: legacyProviderName, route: input.modelId },
  });
  const directRoutingDecision: RuntimeRoutingDecision =
    routingDecision.effectiveProvider === "google" || routingDecision.effectiveProvider === "openai"
      ? routingDecision
      : {
          modelId: input.modelId,
          modality: "image",
          routingSource: "legacy_fallback",
          effectiveProvider: legacyProviderName,
          providerRoute: input.modelId,
          route: { provider: legacyProviderName, route: input.modelId },
          reason: `Routing resolved ${routingDecision.effectiveProvider}, which is not handled by direct image dispatch.`,
        };

  const result = await runInlineGeneration({
    modelId: input.modelId,
    modality: "image",
    currentRoute: directRoutingDecision.route,
    charge: {
      userId: input.userId,
      prompt: cleanPrompt,
      assetType: "IMAGE",
      modelUsed: input.modelId,
      credits: cost,
      requestPayload: {
        routing: routingMetadata(directRoutingDecision),
      },
    },
    attachMediaFailure: "log",
    failureCreditAction: "rollback",
    logPrefix: "dispatch-direct-image",
    execute: async ({ generationId }) => {
      // 3) Call the provider adapter
      const imageResult = await generateImage({
        modelId: directRoutingDecision.providerRoute,
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
      for (let i = 0; i < imageResult.urls.length; i++) {
        const persisted = await persistProviderUrl({
          url: imageResult.urls[i],
          userId: input.userId,
          generationId: i === 0 ? generationId : `${generationId}-${i}`,
          assetType: "IMAGE",
        });
        persistedUrls.push(persisted);
      }

      return {
        mediaUrl: persistedUrls[0] ?? "",
        imageUrls: persistedUrls,
        imageUrl: persistedUrls[0] ?? null,
      };
    },
  });

  if ((result.providerResult.imageUrls?.length ?? 0) > 1) {
    await saveAdditionalGenerationUrls(
      input.userId,
      cleanPrompt,
      input.modelId,
      "IMAGE",
      result.providerResult.imageUrls?.slice(1) ?? [],
    ).catch(() => {});
  }

  return {
    imageUrls: result.providerResult.imageUrls,
    imageUrl: result.providerResult.imageUrl,
    generationId: result.generationId,
    creditsCharged: cost,
  };
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
  let cost = await getVideoCreditsByModelIdAsync(input.modelId, {
    duration: input.durationSec,
    quality: input.quality,
  });
  if (!cost || cost <= 0) cost = DEFAULT_VIDEO_COST;

  const cleanPrompt = sanitizePrompt(input.prompt, 5000);
  const legacyProviderName = input.modelId.includes("google") || input.modelId.includes("veo")
    ? "google"
    : input.modelId.includes("openai") || input.modelId.includes("sora")
      ? "openai"
      : "byteplus";
  const routingDecision = await resolveRuntimeProviderRoute({
    modelId: input.modelId,
    modality: "video",
    legacyRoute: { provider: legacyProviderName, route: input.modelId },
  });
  const directRoutingDecision: RuntimeRoutingDecision =
    routingDecision.effectiveProvider === "google" || routingDecision.effectiveProvider === "byteplus"
      ? routingDecision
      : {
          modelId: input.modelId,
          modality: "video",
          routingSource: "legacy_fallback",
          effectiveProvider: legacyProviderName,
          providerRoute: input.modelId,
          route: { provider: legacyProviderName, route: input.modelId },
          reason: `Routing resolved ${routingDecision.effectiveProvider}, which is not handled by direct video dispatch.`,
        };

  const result = await runInlineGeneration({
    modelId: input.modelId,
    modality: "video",
    currentRoute: directRoutingDecision.route,
    charge: {
      userId: input.userId,
      prompt: cleanPrompt,
      assetType: "VIDEO",
      modelUsed: input.modelId,
      credits: cost,
      requestPayload: {
        routing: routingMetadata(directRoutingDecision),
      },
    },
    attachMediaFailure: "log",
    failureCreditAction: "rollback",
    logPrefix: "dispatch-direct-video",
    execute: async ({ generationId }) => {
      const videoResult = await generateVideo({
        modelId: directRoutingDecision.providerRoute,
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

      const persistedUrl = await persistProviderUrl({
        url: videoResult.urls[0],
        userId: input.userId,
        generationId,
        assetType: "VIDEO",
      });

      return {
        mediaUrl: persistedUrl,
        videoUrl: persistedUrl,
      };
    },
  });

  return {
    videoUrl: result.providerResult.videoUrl,
    generationId: result.generationId,
    creditsCharged: cost,
  };
}

// Re-export error type for callers to do `instanceof InsufficientCreditsError`.
export { InsufficientCreditsError };

/** Quiet the unused import warning when free-generation logic isn't wired
 *  for direct providers yet. */
export const _reserved_for_unlimited = recordFreeGeneration;

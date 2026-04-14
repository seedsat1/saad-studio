// ─── Shots Studio – Provider Adapters & KIE.ai Integration ───────────────────
// SERVER-SIDE ONLY. Do not import from client components.

import type {
  ShotType,
  ShotModel,
  GenerationMode,
  ShotPreset,
  NormalizedShotOutput,
} from "@/lib/shots-studio";
import { SHOT_PRESETS, KIE_SHOT_MODEL_IDS, SHOT_CREDIT_COSTS, IDENTITY_CRITICAL_SHOTS } from "@/lib/shots-studio";

// ─── KIE.ai API Constants ─────────────────────────────────────────────────────

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL  = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

// ─── KIE.ai Low-Level Helpers ────────────────────────────────────────────────

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

/**
 * Upload a base64-encoded image to KIE and return the hosted URL.
 * Used when frontend sends a data: URI as the reference image.
 */
export async function uploadBase64ToKie(base64Data: string, apiKey: string): Promise<string> {
  const res = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ base64Data, uploadPath: "shots-refs" }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(
      `KIE file upload failed (${res.status}): ${json?.msg ?? JSON.stringify(json)}`,
    );
  }

  const fileUrl: string | undefined =
    json?.data?.downloadUrl ??
    json?.data?.download_url ??
    json?.data?.fileUrl ??
    json?.data?.file_url ??
    json?.data?.url ??
    (typeof json?.data === "string" ? json.data : undefined) ??
    json?.fileUrl ??
    json?.url;

  if (!fileUrl) {
    throw new Error(
      `KIE file upload returned no URL. Response: ${JSON.stringify(json)}`,
    );
  }
  return fileUrl;
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
    throw new Error(
      `KIE createTask failed (HTTP ${res.status}, code ${json.code}): ${json.msg ?? res.statusText}`,
    );
  }

  const taskId = json?.data?.taskId;
  if (!taskId) {
    throw new Error(
      `KIE createTask returned no taskId. Response: ${JSON.stringify(json)}`,
    );
  }
  return taskId;
}

async function pollKieTask(
  apiKey: string,
  taskId: string,
  maxAttempts = 100,
  intervalMs  = 3000,
): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(
      `${KIE_QUERY_TASK_URL}?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);

    const json: KieApiResponse = await res.json().catch(() => ({}));
    const state = json?.data?.state;

    if (state === "success") {
      const resultJson = json?.data?.resultJson;
      if (!resultJson) throw new Error("KIE succeeded but resultJson is empty.");
      const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
      const urls = parsed?.resultUrls ?? [];
      if (!urls.length) throw new Error("KIE succeeded but resultUrls is empty.");
      return urls;
    }

    if (state === "fail") {
      const msg = json?.data?.failMsg ?? json?.data?.failCode ?? "Unknown failure";
      throw new Error(`KIE generation failed: ${msg}`);
    }
    // Continue polling: waiting | queuing | generating
  }

  throw new Error("Shot generation timed out after maximum poll attempts.");
}

// ─── Adapter Input / Output ───────────────────────────────────────────────────

export interface AdapterInput {
  preset: ShotPreset;
  userPrompt: string;
  /** Resolved hosted URL (never a data: URI – upload first). */
  referenceImageUrl?: string;
  aspectRatioOverride?: string;
}

// ─── Abstract Base Adapter ────────────────────────────────────────────────────

abstract class BaseShotAdapter {
  abstract readonly modelId: ShotModel;
  abstract readonly kieModelId: string;
  /** Whether this adapter accepts a reference image in its payload */
  abstract readonly supportsReferenceImage: boolean;

  abstract buildPayload(input: AdapterInput): Record<string, unknown>;

  async submit(apiKey: string, input: AdapterInput): Promise<string> {
    return createKieTask(apiKey, this.kieModelId, this.buildPayload(input));
  }

  async poll(apiKey: string, taskId: string): Promise<string[]> {
    return pollKieTask(apiKey, taskId);
  }
}

// ─── Nano Banana Adapter ──────────────────────────────────────────────────────

export class NanoBananaAdapter extends BaseShotAdapter {
  readonly modelId: ShotModel = "nano-banana-pro";
  readonly kieModelId = KIE_SHOT_MODEL_IDS["nano-banana-pro"];
  readonly supportsReferenceImage = true;

  buildPayload(input: AdapterInput): Record<string, unknown> {
    const { preset, userPrompt, referenceImageUrl, aspectRatioOverride } = input;

    const assembledPrompt = userPrompt
      ? `${preset.systemPrompt}. ${userPrompt}. Cinematic, professional photography.`
      : `${preset.systemPrompt}. Cinematic, professional photography.`;

    const payload: Record<string, unknown> = {
      prompt: assembledPrompt,
      aspect_ratio: aspectRatioOverride ?? preset.aspectRatio,
      num_images: 1,
      negative_prompt: preset.negativePrompt,
    };

    // Nano Banana Pro accepts reference images via image_input array
    if (referenceImageUrl) {
      payload.image_input = [referenceImageUrl];
    }

    return payload;
  }
}

// ─── Z-Image Adapter ──────────────────────────────────────────────────────────

export class ZImageAdapter extends BaseShotAdapter {
  readonly modelId: ShotModel = "z-image";
  readonly kieModelId = KIE_SHOT_MODEL_IDS["z-image"];
  // Z-Image does not support reference images (maxRefImages: 0)
  readonly supportsReferenceImage = false;

  buildPayload(input: AdapterInput): Record<string, unknown> {
    const { preset, userPrompt, aspectRatioOverride } = input;

    const assembledPrompt = userPrompt
      ? `${preset.systemPrompt}. ${userPrompt}. Professional photography.`
      : `${preset.systemPrompt}. Professional photography.`;

    return {
      prompt: assembledPrompt,
      aspect_ratio: aspectRatioOverride ?? preset.aspectRatio,
      num_images: 1,
      negative_prompt: preset.negativePrompt,
    };
  }
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const ADAPTER_REGISTRY: Record<ShotModel, BaseShotAdapter> = {
  "nano-banana-pro": new NanoBananaAdapter(),
  "z-image": new ZImageAdapter(),
};

export function getAdapter(model: ShotModel): BaseShotAdapter {
  return ADAPTER_REGISTRY[model];
}

// ─── Single Shot Generation with Fallback ─────────────────────────────────────

export interface GenerateShotOptions {
  apiKey: string;
  shotType: ShotType;
  primaryModel: ShotModel;
  userPrompt: string;
  referenceImageUrl?: string;
  mode: GenerationMode;
  /** Compound output ID for this specific shot result */
  outputId: string;
}

/**
 * Generates one shot with automatic server-side fallback logic.
 * Implements retry + fallback per the routing spec.
 * Never throws — always returns a NormalizedShotOutput.
 */
export async function generateShotWithFallback(
  opts: GenerateShotOptions,
): Promise<NormalizedShotOutput> {
  const { apiKey, shotType, primaryModel, userPrompt, referenceImageUrl, mode, outputId } = opts;
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
      // Do not pass reference image to adapters that don't support it
      referenceImageUrl: adapter.supportsReferenceImage ? referenceImageUrl : undefined,
    };

    const taskId = await adapter.submit(apiKey, adapterInput);
    const urls   = await adapter.poll(apiKey, taskId);
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
  } catch {
    // ── Retry primary once (covers transient failures) ──
    try {
      return await tryModel(primaryModel, false);
    } catch (retryErr) {
      // ── Decide whether fallback to Z-Image is allowed ──
      const isIdentityCritical = IDENTITY_CRITICAL_SHOTS.has(shotType);
      // Safety rule: never silently downgrade identity-critical shots in Standard mode
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

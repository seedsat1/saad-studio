// ─── Variations Studio – Server-Side KIE Adapter ────────────────────────────
// SERVER-SIDE ONLY. Do not import from client components.

import type {
  VariationMode,
  VariationModel,
  VariationGenMode,
} from "@/lib/variations-presets";
import {
  STORYBOARD_PRESETS,
  ANGLES_PRESETS,
  KIE_VARIATION_MODEL_IDS,
  VARIATION_CREDIT_COSTS,
  routeVariationModel,
} from "@/lib/variations-presets";
import { fetchWithTimeout } from "@/lib/http";

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

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

export async function uploadBase64ToKie(base64Data: string, apiKey: string): Promise<string> {
  const res = await fetchWithTimeout(
    KIE_FILE_UPLOAD_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Data, uploadPath: "variations-refs" }),
    },
    10000,
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(`KIE file upload failed (${res.status}): ${json?.msg ?? JSON.stringify(json)}`);
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
    throw new Error(`KIE file upload returned no URL. Response: ${JSON.stringify(json)}`);
  }
  return fileUrl;
}

async function createKieTask(
  apiKey: string,
  kieModelId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const res = await fetchWithTimeout(
    KIE_CREATE_TASK_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: kieModelId, input }),
    },
    12000,
  );

  const json: KieApiResponse = await res.json().catch(() => ({}));

  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(
      `KIE createTask failed (HTTP ${res.status}, code ${json.code}): ${json.msg ?? res.statusText}`,
    );
  }

  const taskId = json?.data?.taskId;
  if (!taskId) {
    throw new Error(`KIE createTask returned no taskId. Response: ${JSON.stringify(json)}`);
  }
  return taskId;
}

export async function pollKieTaskOnce(
  apiKey: string,
  taskId: string,
): Promise<{ state: "success" | "fail" | "pending"; urls?: string[]; error?: string }> {
  const res = await fetchWithTimeout(
    `${KIE_QUERY_TASK_URL}?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
    2500,
  ).catch(() => null);

  if (!res || !res.ok) return { state: "pending" };

  const json: KieApiResponse = await res.json().catch(() => ({}));
  const state = json?.data?.state;

  if (state === "success") {
    const resultJson = json?.data?.resultJson;
    if (!resultJson) return { state: "fail", error: "KIE succeeded but resultJson is empty" };
    const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
    const urls = parsed?.resultUrls ?? [];
    if (!urls.length) return { state: "fail", error: "KIE succeeded but resultUrls is empty" };
    return { state: "success", urls };
  }

  if (state === "fail") {
    return {
      state: "fail",
      error: json?.data?.failMsg ?? json?.data?.failCode ?? "Unknown failure",
    };
  }

  return { state: "pending" };
}

export interface VariationSubmitInput {
  mode: VariationMode;
  genMode: VariationGenMode;
  presetId: string;
  referenceImageUrl: string;
  userDirection: string;
  userNegativeDirection: string;
  consistencyLock: boolean;
  aspectRatio: string;
}

export interface SubmitResult {
  kieTaskId: string;
  modelUsed: VariationModel;
  creditCost: number;
}

function buildNanoBananaPayload(
  systemPrompt: string,
  negativePrompt: string,
  userDirection: string,
  referenceImageUrl: string,
  aspectRatio: string,
) {
  const assembled = userDirection
    ? `${systemPrompt}. ${userDirection}. Cinematic, professional photography.`
    : `${systemPrompt}. Cinematic, professional photography.`;

  return {
    prompt: assembled,
    aspect_ratio: aspectRatio,
    num_images: 1,
    negative_prompt: negativePrompt,
    image_input: [referenceImageUrl],
  };
}

function buildZImagePayload(
  systemPrompt: string,
  negativePrompt: string,
  userDirection: string,
  aspectRatio: string,
) {
  const assembled = userDirection
    ? `${systemPrompt}. ${userDirection}. Cinematic, professional photography.`
    : `${systemPrompt}. Cinematic, professional photography.`;

  return {
    prompt: assembled,
    aspect_ratio: aspectRatio,
    negative_prompt: negativePrompt,
    num_images: 1,
  };
}

export async function submitVariationTask(
  apiKey: string,
  input: VariationSubmitInput,
): Promise<SubmitResult> {
  let systemPrompt: string;
  let negativePrompt: string;
  let isIdentityCritical: boolean;
  let presetModelPreference: VariationModel;

  if (input.mode === "storyboard") {
    const preset = STORYBOARD_PRESETS[input.presetId as keyof typeof STORYBOARD_PRESETS];
    if (!preset) throw new Error(`Unknown storyboard preset: ${input.presetId}`);
    systemPrompt = preset.hiddenSystemPrompt;
    negativePrompt = input.userNegativeDirection
      ? `${preset.hiddenNegativePrompt}, ${input.userNegativeDirection}`
      : preset.hiddenNegativePrompt;
    isIdentityCritical = preset.isIdentityCritical;
    presetModelPreference = preset.modelPreference;
  } else {
    const preset = ANGLES_PRESETS[input.presetId as keyof typeof ANGLES_PRESETS];
    if (!preset) throw new Error(`Unknown angles preset: ${input.presetId}`);
    systemPrompt = preset.hiddenSystemPrompt;
    negativePrompt = input.userNegativeDirection
      ? `${preset.hiddenNegativePrompt}, ${input.userNegativeDirection}`
      : preset.hiddenNegativePrompt;
    isIdentityCritical = true; // angles always identity-critical
    presetModelPreference = preset.modelPreference;
  }

  void presetModelPreference; // Used for future per-preset overrides

  const decidedModel = routeVariationModel(
    input.mode,
    input.genMode,
    isIdentityCritical,
    input.consistencyLock,
  );

  const kieModelId = KIE_VARIATION_MODEL_IDS[decidedModel];

  let kieTaskId: string;

  if (decidedModel === "nano-banana-pro") {
    const payload = buildNanoBananaPayload(
      systemPrompt,
      negativePrompt,
      input.userDirection,
      input.referenceImageUrl,
      input.aspectRatio,
    );
    try {
      kieTaskId = await createKieTask(apiKey, kieModelId, payload);
    } catch (err) {
      // Retry once on failure
      try {
        kieTaskId = await createKieTask(apiKey, kieModelId, payload);
      } catch {
        // Fallback to Z-Image if consistency lock is off
        if (!input.consistencyLock && !isIdentityCritical) {
          const fallbackPayload = buildZImagePayload(
            systemPrompt,
            negativePrompt,
            input.userDirection,
            input.aspectRatio,
          );
          kieTaskId = await createKieTask(apiKey, KIE_VARIATION_MODEL_IDS["z-image"], fallbackPayload);
          return {
            kieTaskId,
            modelUsed: "z-image",
            creditCost: VARIATION_CREDIT_COSTS["z-image"],
          };
        }
        throw err;
      }
    }
  } else {
    const payload = buildZImagePayload(
      systemPrompt,
      negativePrompt,
      input.userDirection,
      input.aspectRatio,
    );
    kieTaskId = await createKieTask(apiKey, kieModelId, payload);
  }

  return {
    kieTaskId,
    modelUsed: decidedModel,
    creditCost: VARIATION_CREDIT_COSTS[decidedModel],
  };
}

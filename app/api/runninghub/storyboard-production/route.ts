import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";

/** Allow up to 5 minutes */
export const maxDuration = 300;

const CREDIT_COST = 30;
const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";
const KIE_MODEL_ID = "qwen2/image-edit";

function getKieApiKey(): string {
  const key = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
  if (!key) throw new Error("KIE_API_KEY is not configured");
  return key;
}

function kieHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/** Upload base64 image to KIE and return a hosted URL */
async function uploadImageToKie(base64DataUrl: string, apiKey: string): Promise<string> {
  // Strip the data:image/...;base64, prefix
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");

  const res = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: kieHeaders(apiKey),
    body: JSON.stringify({ base64Data, uploadPath: "storyboard-refs" }),
  });

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

/** Create a KIE task and return taskId */
async function createKieTask(
  apiKey: string,
  modelId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(KIE_CREATE_TASK_URL, {
    method: "POST",
    headers: kieHeaders(apiKey),
    body: JSON.stringify({ model: modelId, input }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    const msg = json?.msg ?? res.statusText;
    throw new Error(`KIE createTask failed (HTTP ${res.status}, code ${json.code}): ${msg}`);
  }

  const taskId = json?.data?.taskId;
  if (!taskId) {
    throw new Error(`KIE createTask did not return a taskId. Response: ${JSON.stringify(json)}`);
  }
  return taskId;
}

/** Poll KIE task until success/fail/timeout */
async function pollKieTask(
  apiKey: string,
  taskId: string,
  maxAttempts = 80,
  intervalMs = 3000,
): Promise<{ status: "success" | "fail" | "timeout"; urls: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wait = attempt < 5 ? 2000 : intervalMs;
    await new Promise((r) => setTimeout(r, wait));

    const res = await fetch(
      `${KIE_QUERY_TASK_URL}?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!res.ok) continue;

    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? {};
    const state = String(data?.state ?? data?.taskStatus ?? data?.status ?? "").toLowerCase();

    // Parse resultJson
    let parsedUrls: string[] = [];
    if (data?.resultJson) {
      try {
        const rj = typeof data.resultJson === "string" ? JSON.parse(data.resultJson) : data.resultJson;
        parsedUrls = Array.isArray(rj?.resultUrls) ? rj.resultUrls : [];
      } catch { /* ignore */ }
    }

    const urls: string[] =
      parsedUrls.length > 0
        ? parsedUrls
        : (data?.resultUrls ?? data?.outputs ?? []);

    if (["success", "completed", "done"].includes(state)) {
      return { status: "success", urls: Array.isArray(urls) ? urls : [] };
    }

    if (["fail", "failed", "error", "cancelled", "canceled"].includes(state)) {
      const error = data?.failMsg ?? data?.errorMessage ?? data?.failCode ?? "KIE task failed.";
      return { status: "fail", urls: [], error };
    }
    // waiting / queuing / generating — keep polling
  }

  return { status: "timeout", urls: [] };
}

/**
 * POST /api/runninghub/storyboard-production
 *
 * Generates storyboard panels via KIE API (Qwen-Image-Edit-25).
 *
 * Body: { imageDataUrl, prompt? }
 */
export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`storyboard-prod:${userId}:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      prompt?: string;
    };

    const { imageDataUrl } = body;
    const userPrompt = sanitizePrompt(body.prompt ?? "", 2000);

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const apiKey = getKieApiKey();

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: userPrompt || "Storyboard Production – Qwen-Image-Edit-25",
      assetType: "IMAGE",
      modelUsed: "kie/qwen-image-edit-25/storyboard",
    });
    chargedCredits = CREDIT_COST;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to KIE
    const hostedImageUrl = await uploadImageToKie(imageDataUrl, apiKey);

    // Build KIE input
    const input: Record<string, unknown> = {
      image_url: hostedImageUrl,
      prompt: userPrompt || "Generate cinematic storyboard panels from this image with varied camera angles and compositions",
    };

    // Create task via KIE
    const taskId = await createKieTask(apiKey, KIE_MODEL_ID, input);

    // Poll for result (max ~4 min)
    const result = await pollKieTask(apiKey, taskId);

    if (result.status === "success") {
      const outputs = result.urls;
      if (outputs.length === 0) {
        await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
        return NextResponse.json(
          { error: "Task completed but produced no outputs. Credits refunded." },
          { status: 502 },
        );
      }

      await setGenerationMediaUrl(generationId, outputs[0]).catch(() => null);

      return NextResponse.json({
        outputs,
        generationId,
        remainingCredits: spent.remainingCredits,
      });
    }

    if (result.status === "fail") {
      await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
      return NextResponse.json(
        { error: result.error || "KIE task failed. Credits refunded." },
        { status: 502 },
      );
    }

    // Timed out
    await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
    return NextResponse.json(
      { error: "Generation timed out. Credits refunded." },
      { status: 504 },
    );
  } catch (err) {
    if (generationId && chargedUserId && chargedCredits > 0) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => null);
    }

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }

    console.error("[STORYBOARD_PRODUCTION_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

/** Allow up to 5 minutes */
export const maxDuration = 300;

const CREDIT_PER_PANEL = 2;
const MAX_PANELS = 6;
const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_MODEL_ID = "qwen2/image-edit";

const VALID_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

/** Auto-generate cinematic prompts for each panel */
const PANEL_PROMPTS = [
  "Wide establishing shot showing the full scene with dramatic lighting and cinematic composition",
  "Close-up portrait shot focusing on the main subject with shallow depth of field",
  "Medium shot from a low angle perspective emphasizing power and drama",
  "Over-the-shoulder view creating depth and narrative tension",
  "Extreme close-up highlighting key details with dramatic contrast",
  "Bird's eye aerial view showing the full environment from above",
];

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

/** Upload base64 image to Supabase Storage and return a public URL */
async function uploadRefImage(base64DataUrl: string, userId: string, genId: string): Promise<string> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URL for reference image");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image-ref",
    generationId: `${genId}-storyboard-ref`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image to storage");
  return url;
}

/** Create a KIE task and return taskId */
async function createKieTask(
  apiKey: string,
  modelId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const payload = { model: modelId, input };
  console.log("[STORYBOARD] createKieTask payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(KIE_CREATE_TASK_URL, {
    method: "POST",
    headers: kieHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  console.log("[STORYBOARD] createKieTask response:", JSON.stringify(json));

  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    const msg = json?.msg ?? res.statusText;
    throw new Error(`KIE createTask failed (HTTP ${res.status}, code ${json.code}): ${msg} | Full response: ${JSON.stringify(json)} | Input: ${JSON.stringify(input)}`);
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
 * Generates storyboard panels via KIE API (qwen2/image-edit).
 * Each panel is a separate KIE task with an auto-generated cinematic prompt.
 *
 * Body: { imageDataUrl, numPanels?, aspectRatio? }
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
      numPanels?: number;
      aspectRatio?: string;
    };

    const { imageDataUrl } = body;
    const numPanels = Math.max(1, Math.min(MAX_PANELS, body.numPanels ?? 4));
    const aspectRatio = VALID_ASPECT_RATIOS.includes(body.aspectRatio ?? "")
      ? body.aspectRatio!
      : "16:9";

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const apiKey = getKieApiKey();
    const totalCost = numPanels * CREDIT_PER_PANEL;

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: totalCost,
      prompt: `Storyboard Production – ${numPanels} panels`,
      assetType: "IMAGE",
      modelUsed: "kie/qwen2-image-edit/storyboard",
    });
    chargedCredits = totalCost;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to Supabase Storage
    const hostedImageUrl = await uploadRefImage(imageDataUrl, userId, generationId!);
    console.log("[STORYBOARD] hostedImageUrl:", hostedImageUrl);

    // Verify the uploaded image is publicly accessible
    const headCheck = await fetch(hostedImageUrl, { method: "HEAD" }).catch(() => null);
    console.log("[STORYBOARD] image HEAD check:", headCheck?.status, headCheck?.headers.get("content-type"));
    if (!headCheck || !headCheck.ok) {
      throw new Error(`Uploaded reference image is not accessible (status ${headCheck?.status}). URL: ${hostedImageUrl}`);
    }

    // Launch all panel tasks in parallel
    const taskIds: string[] = [];
    for (let i = 0; i < numPanels; i++) {
      const prompt = PANEL_PROMPTS[i % PANEL_PROMPTS.length];
      const input: Record<string, unknown> = {
        image_url: hostedImageUrl,
        prompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
      };
      const taskId = await createKieTask(apiKey, KIE_MODEL_ID, input);
      taskIds.push(taskId);
    }

    // Poll all tasks (max ~4 min total)
    const results = await Promise.all(
      taskIds.map((tid) => pollKieTask(apiKey, tid, 60, 3000)),
    );

    const outputs: string[] = [];
    const failures: string[] = [];

    for (const r of results) {
      if (r.status === "success" && r.urls.length > 0) {
        outputs.push(r.urls[0]);
      } else {
        failures.push(r.error ?? "Panel generation failed");
      }
    }

    // If all failed, refund everything
    if (outputs.length === 0) {
      await rollbackGenerationCharge(generationId, userId, totalCost).catch(() => null);
      return NextResponse.json(
        { error: failures[0] || "All panels failed. Credits refunded." },
        { status: 502 },
      );
    }

    // If some failed, refund partial
    if (failures.length > 0) {
      const refund = failures.length * CREDIT_PER_PANEL;
      await rollbackGenerationCharge(generationId, userId, refund).catch(() => null);
    }

    await setGenerationMediaUrl(generationId, outputs[0]).catch(() => null);

    return NextResponse.json({
      outputs,
      generationId,
      totalPanels: numPanels,
      successfulPanels: outputs.length,
      remainingCredits: spent.remainingCredits,
    });
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

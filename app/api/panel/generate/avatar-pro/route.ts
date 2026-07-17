import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";
import { getVideoCreditsByModelId } from "@/lib/credit-pricing";
import { getGenerationCostQuote } from "@/lib/pricing";
import { isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const AVATAR_MODEL_IDS = ["kling/ai-avatar-pro", "kling/ai-avatar-standard"] as const;
type AvatarModelId = (typeof AVATAR_MODEL_IDS)[number];
const DEFAULT_AVATAR_MODEL_ID: AvatarModelId = "kling/ai-avatar-pro";
const DEFAULT_AVATAR_PROMPT = "Natural lip sync performance, accurate mouth movement, stable framing, preserve facial identity.";
const AVATAR_QUOTE_DURATION_SEC = 5;
const AVATAR_QUOTE_RESOLUTION = "1080p";
const AVATAR_MARGIN_PERCENT = 40;

type KieApiJson = {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    state?: string;
    resultJson?: string;
    failMsg?: string;
    failCode?: string;
  };
};

function extractVideoUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value.trim())) return [value.trim()];
    try {
      return extractVideoUrls(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["resultUrls", "outputs", "urls", "videos", "result", "videoUrl", "url", "response", "data"]) {
      const urls = extractVideoUrls(record[key]);
      if (urls.length) return urls;
    }
  }
  return [];
}

function normalizeAvatarModel(value: unknown): AvatarModelId {
  return AVATAR_MODEL_IDS.includes(value as AvatarModelId)
    ? value as AvatarModelId
    : DEFAULT_AVATAR_MODEL_ID;
}

async function createKieTask(apiKey: string, modelId: AvatarModelId, imageUrl: string, audioUrl: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt,
      },
    }),
  });

  const json = await res.json().catch(() => ({})) as KieApiJson;
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(`KIE createTask failed: ${json.msg ?? res.statusText}`);
  }

  const taskId = json.data?.taskId;
  if (!taskId) {
    throw new Error("KIE did not return a taskId.");
  }
  return taskId;
}

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 80, intervalMs = 4000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, i < 5 ? 3000 : intervalMs));

    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`KIE poll failed (${res.status})`);
    }

    const json = await res.json().catch(() => ({})) as KieApiJson;
    const state = String(json.data?.state ?? "").toLowerCase();

    if (state === "success") {
      if (!json.data?.resultJson) {
        throw new Error("KIE task succeeded but resultJson is empty.");
      }
      const parsed = JSON.parse(json.data.resultJson) as unknown;
      const urls = extractVideoUrls(parsed);
      if (!urls.length) {
        throw new Error("KIE task succeeded but no video URL returned.");
      }
      return urls;
    }

    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }

  throw new Error("Avatar generation timed out.");
}

async function getAvatarCreditsToCharge(modelId: AvatarModelId): Promise<number> {
  const quote = await getGenerationCostQuote(
    modelId,
    AVATAR_QUOTE_DURATION_SEC,
    1,
    AVATAR_QUOTE_RESOLUTION,
  );
  if (quote && Number.isFinite(quote.sourceCredits) && quote.sourceCredits > 0) {
    return Math.max(1, Math.ceil(quote.sourceCredits * (1 + AVATAR_MARGIN_PERCENT / 100)));
  }

  const legacy = getVideoCreditsByModelId(modelId, {
    duration: AVATAR_QUOTE_DURATION_SEC,
    resolution: AVATAR_QUOTE_RESOLUTION,
  }) || 12;
  return Math.max(1, Math.ceil(legacy * (1 + AVATAR_MARGIN_PERCENT / 100)));
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });
  }

  const rate = hitRateLimit({
    key: `panel:generate-avatar-pro:${verified.userId}`,
    limit: 10,
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
      imageUrl?: string;
      audioUrl?: string;
      prompt?: string;
      modelId?: string;
    };

    const imageUrl = body.imageUrl?.trim() ?? "";
    const audioUrl = body.audioUrl?.trim() ?? "";
    const modelId = normalizeAvatarModel(body.modelId);
    const promptText = typeof body.prompt === "string" ? sanitizePrompt(body.prompt, 5000) : "";
    const effectivePrompt = promptText || DEFAULT_AVATAR_PROMPT;

    if (!isSafePublicHttpUrl(imageUrl)) {
      return NextResponse.json({ error: "Please upload a valid public image URL." }, { status: 400 });
    }
    if (!isSafePublicHttpUrl(audioUrl)) {
      return NextResponse.json({ error: "Please upload a valid public audio URL." }, { status: 400 });
    }

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) {
      throw new Error("KIE API key not configured on server.");
    }

    const creditsToCharge = await getAvatarCreditsToCharge(modelId);

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      // KIE requires a non-empty prompt even when the plugin UI keeps it optional.
      prompt: effectivePrompt,
      assetType: "VIDEO",
      modelUsed: modelId,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const taskId = await createKieTask(kieApiKey, modelId, imageUrl, audioUrl, effectivePrompt);
    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId).catch(() => {});
    }

    const videoUrls = await pollKieTask(kieApiKey, taskId);
    const videoUrl = videoUrls[0] ?? null;

    if (generationId && videoUrl) {
      await setGenerationMediaUrl(generationId, videoUrl).catch(() => {});
    }

    return NextResponse.json({
      id: generationId ?? taskId,
      status: "succeeded",
      progress: 100,
      taskId,
      generationId,
      result: videoUrl
        ? {
            id: generationId ?? taskId,
            kind: "video",
            url: videoUrl,
            prompt: promptText || undefined,
            model: modelId,
            createdAt: new Date().toISOString(),
          }
        : null,
      videoUrl,
      videoUrls,
    });
  } catch (error) {
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

    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }

    console.error("[panel/generate/avatar-pro]", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
import { isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const AVATAR_MODEL_ID = "kling/ai-avatar-pro";

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

async function createKieTask(apiKey: string, imageUrl: string, audioUrl: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AVATAR_MODEL_ID,
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

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });
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
    };

    const imageUrl = body.imageUrl?.trim() ?? "";
    const audioUrl = body.audioUrl?.trim() ?? "";
    const promptText = typeof body.prompt === "string" ? sanitizePrompt(body.prompt, 5000) : "";

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

    const creditsToCharge = Math.max(
      1,
      Math.ceil(getVideoCreditsByModelId(AVATAR_MODEL_ID, { duration: 5, resolution: "1080p" }) || 12),
    );

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: promptText || "Kling AI Avatar Pro",
      assetType: "VIDEO",
      modelUsed: AVATAR_MODEL_ID,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const taskId = await createKieTask(kieApiKey, imageUrl, audioUrl, promptText);
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
            model: AVATAR_MODEL_ID,
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

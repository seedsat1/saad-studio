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
import { assembleHiddenPrompt, calcTransitionCredits, getPresetById } from "@/lib/transition-presets";
import { isSafePublicHttpUrl } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const TRANSITION_MODEL = "kling-3.0/video";

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
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];
    try {
      return extractVideoUrls(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractVideoUrls(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["resultUrls", "outputs", "urls", "result", "output", "response", "data", "works"]) {
      const urls = extractVideoUrls(record[key]);
      if (urls.length) return urls;
    }
    for (const key of ["url", "videoUrl", "video_url", "downloadUrl"]) {
      const direct = record[key];
      if (typeof direct === "string" && /^https?:\/\//i.test(direct)) return [direct];
    }
    const resource = record.resource as Record<string, unknown> | undefined;
    if (resource && typeof resource.resource === "string" && /^https?:\/\//i.test(resource.resource)) {
      return [resource.resource];
    }
  }
  return [];
}

async function createKieTask(
  apiKey: string,
  prompt: string,
  inputAUrl: string,
  inputBUrl: string,
  duration: number,
  aspectRatio: string,
  resolution: string,
): Promise<string> {
  const mode = resolution === "720p" ? "std" : "pro";
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TRANSITION_MODEL,
      input: {
        prompt,
        duration: String(duration),
        aspect_ratio: aspectRatio,
        mode,
        sound: false,
        multi_shots: false,
        multi_prompt: [],
        image_urls: [inputAUrl, inputBUrl],
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

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 80, intervalMs = 3500): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, i < 5 ? 2500 : intervalMs));
    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
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
      const urls = extractVideoUrls(JSON.parse(json.data.resultJson) as unknown);
      if (!urls.length) {
        throw new Error("KIE task succeeded but no video URL returned.");
      }
      return urls;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }
  throw new Error("Transition generation timed out.");
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
    key: `panel:generate-transition:${verified.userId}`,
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
      presetId?: string;
      inputAUrl?: string;
      inputBUrl?: string;
      aspectRatio?: string;
      duration?: number;
      intensity?: number;
      smoothness?: number;
      cinematicStr?: number;
      preserveFraming?: boolean;
      subjectFocus?: boolean;
      resolution?: string;
      fps?: number;
      enhance?: boolean;
    };

    const presetId = body.presetId?.trim() ?? "";
    const inputAUrl = body.inputAUrl?.trim() ?? "";
    const inputBUrl = body.inputBUrl?.trim() ?? "";
    const aspectRatio = body.aspectRatio?.trim() ?? "16:9";
    const duration = typeof body.duration === "number" ? Math.max(3, Math.min(10, Math.floor(body.duration))) : 5;
    const resolution = body.resolution?.trim() ?? "1080p";

    if (!presetId) {
      return NextResponse.json({ error: "presetId is required." }, { status: 400 });
    }
    if (!isSafePublicHttpUrl(inputAUrl) || !isSafePublicHttpUrl(inputBUrl)) {
      return NextResponse.json({ error: "Both transition inputs must be public URLs." }, { status: 400 });
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      return NextResponse.json({ error: "Invalid transition preset." }, { status: 400 });
    }

    const controls = {
      intensity: typeof body.intensity === "number" ? body.intensity : 50,
      smoothness: typeof body.smoothness === "number" ? body.smoothness : 60,
      cinematicStrength: typeof body.cinematicStr === "number" ? body.cinematicStr : 65,
      preserveFraming: typeof body.preserveFraming === "boolean" ? body.preserveFraming : true,
      subjectFocus: typeof body.subjectFocus === "boolean" ? body.subjectFocus : true,
      resolution,
      fps: typeof body.fps === "number" ? body.fps : 24,
      enhance: typeof body.enhance === "boolean" ? body.enhance : true,
    };
    const hidden = assembleHiddenPrompt(preset, controls);

    const creditsToCharge = calcTransitionCredits(presetId, duration, resolution);
    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: `Transition: ${preset.name}`,
      assetType: "VIDEO",
      modelUsed: `transition/${presetId}`,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) {
      throw new Error("KIE API key not configured on server.");
    }

    const taskId = await createKieTask(
      apiKey,
      hidden.prompt,
      inputAUrl,
      inputBUrl,
      duration,
      aspectRatio,
      resolution,
    );
    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId).catch(() => {});
    }

    const videoUrls = await pollKieTask(apiKey, taskId);
    const videoUrl = videoUrls[0] ?? null;
    if (generationId && videoUrl) {
      await setGenerationMediaUrl(generationId, videoUrl).catch(() => {});
    }

    return NextResponse.json({
      id: generationId ?? taskId,
      status: "succeeded",
      progress: 100,
      result: videoUrl
        ? {
            id: generationId ?? taskId,
            kind: "video",
            url: videoUrl,
            prompt: preset.name,
            model: `transition/${presetId}`,
            aspect: aspectRatio,
            durationSec: duration,
            createdAt: new Date().toISOString(),
          }
        : null,
      taskId,
      generationId,
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

    console.error("[panel/generate/transition]", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

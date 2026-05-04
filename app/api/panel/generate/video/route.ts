import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { getVideoCreditsByModelId } from "@/lib/credit-pricing";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

type KieApiJson = { code?: number; msg?: string; data?: { taskId?: string; state?: string; resultJson?: string; failMsg?: string; failCode?: string } };

function extractVideoUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value.trim())) return [value.trim()];
    try { return extractVideoUrls(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v));
  }
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    for (const k of ["resultUrls", "outputs", "urls", "videos", "result", "videoUrl", "url", "response", "data"]) {
      const u = extractVideoUrls(r[k]);
      if (u.length) return u;
    }
  }
  return [];
}

async function createKieTask(apiKey: string, model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const json = await res.json().catch(() => ({})) as KieApiJson;
  if (!res.ok || (json.code !== undefined && json.code !== 200 && json.code !== 0)) {
    throw new Error(`KIE createTask failed: ${json.msg ?? res.statusText}`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("KIE did not return a taskId.");
  return taskId;
}

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 80, intervalMs = 4000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 3000 : intervalMs));
    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);
    const json = await res.json().catch(() => ({})) as KieApiJson;
    const state = String(json.data?.state ?? "").toLowerCase();
    if (state === "success") {
      if (!json.data?.resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(json.data.resultJson) as unknown;
      const urls = extractVideoUrls(parsed);
      if (!urls.length) throw new Error("KIE task succeeded but no video URL returned.");
      return urls;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }
  throw new Error("Video generation timed out.");
}

/** POST /api/panel/generate/video — generates video using website credits + KIE API. */
export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });

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
      prompt?: string;
      modelId?: string;  // KIE video model ID e.g. "kling-3.0/video"
      duration?: number;
      aspectRatio?: string;
      resolution?: string;
      imageUrl?: string;
    };

    const {
      prompt,
      modelId = "kling-3.0/video",
      duration = 5,
      aspectRatio = "16:9",
      resolution = "1080p",
      imageUrl,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Please enter a prompt." }, { status: 400 });
    }

    // Validate the model is a known KIE video model
    const { kieVideoModelMap } = getResolvedKieRoutingMaps();
    const kieModelId = kieVideoModelMap[modelId] ?? modelId; // fallback: use as-is if already a KIE ID

    let creditsToCharge: number;
    try {
      creditsToCharge = getVideoCreditsByModelId(kieModelId, { duration, resolution });
      if (!creditsToCharge || creditsToCharge <= 0) creditsToCharge = 12;
    } catch {
      creditsToCharge = 12; // fallback: 12 credits
    }

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "VIDEO",
      modelUsed: modelId,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) throw new Error("KIE API key not configured on server.");

    const isSeedance = kieModelId.includes("seedance") || kieModelId.includes("bytedance");
    const isKling = kieModelId.includes("kling");

    const input: Record<string, unknown> = {
      prompt: sanitizePrompt(prompt, 5000),
      // Seedance: duration must be integer [4-15]; Kling/others: string "5"|"10"
      duration: isSeedance
        ? Math.max(4, Math.min(15, Number(duration) || 5))
        : String(duration),
      aspect_ratio: aspectRatio,
    };

    // Add image reference if provided (image-to-video mode)
    if (imageUrl) {
      if (kieModelId === "kling-3.0/video" || kieModelId === "kling-3.0/motion-control") {
        input.image_urls = [imageUrl];
      } else if (isKling) {
        // Kling 2.x I2V uses image_url (single)
        input.image_url = imageUrl;
      } else if (isSeedance) {
        // Seedance 2 uses first_frame_url for reference image
        input.first_frame_url = imageUrl;
      } else {
        input.image_url = imageUrl;
      }
    }

    // Model-specific settings
    if (isKling) {
      const mode = resolution === "4K" ? "4K" : (resolution === "720p" ? "std" : "pro");
      input.mode = mode;
    }

    // Seedance: generate_audio defaults to TRUE (extra cost) — always disable unless explicitly set
    if (isSeedance) {
      input.generate_audio = false;
      // resolution for Seedance: 480p/720p/1080p
      if (resolution) input.resolution = resolution.toLowerCase();
    }

    const taskId = await createKieTask(kieApiKey, kieModelId, input);
    const videoUrls = await pollKieTask(kieApiKey, taskId);

    if (generationId && videoUrls[0]) {
      await setGenerationMediaUrl(generationId, videoUrls[0]).catch(() => {});
    }

    return NextResponse.json({ videoUrls, videoUrl: videoUrls[0] ?? null, taskId, generationId });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance },
        { status: 402 },
      );
    }
    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }
    console.error("[panel/generate/video]", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  saveAdditionalGenerationUrls,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { getGenerationCost } from "@/lib/pricing";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

type KieApiJson = { code?: number; msg?: string; data?: { taskId?: string; state?: string; resultJson?: string; failMsg?: string; failCode?: string } };

function extractKieUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("{") || t.startsWith("[")) {
      try { return extractKieUrls(JSON.parse(t)); } catch { return []; }
    }
    if (/^https?:\/\//i.test(t)) return [t];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => extractKieUrls(v));
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    const direct = r.url ?? r.imageUrl ?? r.image_url ?? r.downloadUrl;
    if (typeof direct === "string") return extractKieUrls(direct);
    for (const k of ["resultUrls", "imageUrls", "images", "outputs", "urls", "result", "output", "response", "data"]) {
      const u = extractKieUrls(r[k]);
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

async function pollKieTask(apiKey: string, taskId: string, maxAttempts = 60, intervalMs = 3000): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 2000 : intervalMs));
    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`KIE poll failed (${res.status})`);
    const json = await res.json().catch(() => ({})) as KieApiJson;
    const state = String(json.data?.state ?? "").toLowerCase();
    if (state === "success") {
      if (!json.data?.resultJson) throw new Error("KIE task succeeded but resultJson is empty.");
      const parsed = JSON.parse(json.data.resultJson) as unknown;
      const urls = extractKieUrls(parsed);
      if (!urls.length) throw new Error("KIE task succeeded but no image URLs returned.");
      return urls;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg ?? json.data?.failCode ?? "Unknown error"}`);
    }
  }
  throw new Error("Image generation timed out.");
}

/** POST /api/panel/generate/image — generates images using website credits + KIE API. */
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
      modelId?: string;
      aspectRatio?: string;
      resolution?: string;
      numImages?: number;
      negativePrompt?: string;
      imageUrl?: string;
    };

    const {
      prompt,
      modelId = "nano-banana-pro",
      aspectRatio = "1:1",
      resolution = "1K",
      numImages = 1,
      negativePrompt,
      imageUrl,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Please enter a prompt." }, { status: 400 });
    }

    const { imageModelMap } = getResolvedKieRoutingMaps();
    const kieModelId = imageModelMap[modelId];
    if (!kieModelId) {
      return NextResponse.json({ error: `Unsupported model: ${modelId}` }, { status: 400 });
    }

    const creditsToCharge = await getGenerationCost(modelId, 5, numImages);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit config for model: ${modelId}` }, { status: 400 });
    }

    const spent = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: modelId,
    });
    chargedCredits = creditsToCharge;
    generationId = spent.generationId;

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) throw new Error("KIE API key not configured on server.");

    const isNanoBanana = ["nano-banana-pro", "nano-banana-2", "google/nano-banana"].includes(kieModelId);

    const input: Record<string, unknown> = {
      prompt: sanitizePrompt(prompt, 5000),
      // Nano Banana uses image_size not aspect_ratio
      ...(isNanoBanana ? { image_size: aspectRatio } : { aspect_ratio: aspectRatio }),
      resolution,
    };
    if (negativePrompt) input.negative_prompt = negativePrompt;

    // If a reference image URL is provided, add the correct field per model
    if (imageUrl) {
      if (isNanoBanana) {
        input.image_input = [imageUrl];
      } else {
        input.image_url = imageUrl;
      }
    }

    const fanout = Math.max(1, Math.min(4, numImages));
    const taskIds = await Promise.all(
      Array.from({ length: fanout }, () => createKieTask(kieApiKey, kieModelId, input)),
    );
    const results = await Promise.all(taskIds.map((tid) => pollKieTask(kieApiKey, tid)));
    const imageUrls = results.flat();

    if (generationId && imageUrls[0]) {
      await setGenerationMediaUrl(generationId, imageUrls[0]).catch(() => {});
    }
    if (imageUrls.length > 1) {
      await saveAdditionalGenerationUrls(
        userId,
        sanitizePrompt(prompt, 5000),
        modelId,
        "IMAGE",
        imageUrls.slice(1),
      ).catch(() => {});
    }

    return NextResponse.json({ imageUrls, imageUrl: imageUrls[0] ?? null, generationId });
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
    console.error("[panel/generate/image]", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

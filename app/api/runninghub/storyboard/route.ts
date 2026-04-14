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
import { uploadBase64ToKie } from "@/lib/shots-adapters";

/** Allow up to 5 minutes — frames generated in parallel server-side */
export const maxDuration = 300;

const CREDIT_COST = 30;
const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY  = "https://api.kie.ai/api/v1/jobs/recordInfo";

const FRAME_ANGLES = [
  "establishing wide shot, full scene panoramic view",
  "medium shot, waist-up framing",
  "close-up shot, face and upper body focus",
  "low angle, dramatic upward perspective",
  "high angle, bird's-eye downward perspective",
  "over-the-shoulder shot, from behind the subject",
  "extreme close-up, detailed facial focus",
  "side profile view, lateral 90-degree angle",
  "3/4 left angle, diagonal forward perspective",
  "back view, rear-facing perspective",
];

async function generateFrame(
  apiKey: string,
  imageUrl: string,
  prompt: string,
): Promise<string | null> {
  try {
    const res = await fetch(KIE_CREATE, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen/image-to-image",
        input: {
          prompt,
          image_url: imageUrl,
          strength: 0.8,
          num_inference_steps: 30,
          guidance_scale: 3.5,
          output_format: "png",
          acceleration: "regular",
          enable_safety_checker: false,
        },
      }),
    });
    const createData = (await res.json()) as { data?: { taskId?: string } };
    const taskId = createData?.data?.taskId;
    if (!taskId) return null;

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3_000));
      const poll = await fetch(`${KIE_QUERY}?taskId=${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = (await poll.json()) as { data?: { state?: string; resultJson?: string } };
      const state = pollData?.data?.state;
      if (state === "success") {
        const parsed = JSON.parse(pollData.data?.resultJson ?? "{}") as { resultUrls?: string[] };
        return parsed?.resultUrls?.[0] ?? null;
      }
      if (state === "fail") return null;
    }
    return null;
  } catch {
    return null;
  }
}

/** POST /api/runninghub/storyboard */
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
    const rate = checkRateLimit(`storyboard:${userId}:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      prompt?: string;
      numFrames?: number;
      bgConsistency?: boolean;
    };

    const { imageDataUrl, numFrames = 6, bgConsistency = true } = body;
    const userPrompt = sanitizePrompt(body.prompt ?? "", 1000);

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const frames = Math.max(2, Math.min(10, Math.floor(numFrames)));

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY ?? "";
    if (!apiKey) throw new Error("KIE API key is not configured on the server");

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: userPrompt || `Storyboard – ${frames} frames`,
      assetType: "IMAGE",
      modelUsed: "kie/qwen/storyboard",
    });
    chargedCredits = CREDIT_COST;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to KIE (server-side — API key never exposed)
    const hostedImageUrl = await uploadBase64ToKie(imageDataUrl, apiKey);

    // Build per-frame prompts
    const angles = FRAME_ANGLES.slice(0, frames);
    const suffix = userPrompt
      ? `. ${userPrompt}. Cinematic storyboard frame, professional photography.`
      : ". Cinematic storyboard frame, professional photography.";
    const bgNote = bgConsistency ? " Keep background scene consistent." : "";
    const prompts = angles.map((angle) => `${angle}${suffix}${bgNote}`);

    // Generate all frames in parallel
    const results = await Promise.allSettled(
      prompts.map((p) => generateFrame(apiKey, hostedImageUrl, p)),
    );

    const outputs = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((url): url is string => !!url);

    if (outputs.length === 0) {
      await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
      return NextResponse.json(
        { error: "All frames failed to generate. Credits refunded." },
        { status: 502 },
      );
    }

    await setGenerationMediaUrl(generationId, outputs[0]).catch(() => null);

    return NextResponse.json({
      outputs,
      generationId,
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

    console.error("[STORYBOARD_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

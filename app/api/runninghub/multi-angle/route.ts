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
import { uploadBase64ToKie } from "@/lib/shots-adapters";

/** Allow up to 5 minutes — views generated in parallel server-side */
export const maxDuration = 300;

const CREDIT_COST = 30;
const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY  = "https://api.kie.ai/api/v1/jobs/recordInfo";

/** 6 standard views generated in auto mode */
const AUTO_VIEW_PROMPTS = [
  "front view, directly facing forward, full frontal perspective, professional photography",
  "left side profile, 90 degrees left, pure lateral view, professional photography",
  "right side profile, 90 degrees right, pure lateral view, professional photography",
  "back view, 180 degrees, rear-facing perspective, professional photography",
  "3/4 diagonal left angle, 45 degrees left-forward, professional photography",
  "top-down bird's-eye view, aerial perspective looking straight down, professional photography",
];

async function generateView(
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
          strength: 0.75,
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

/** POST /api/runninghub/multi-angle */
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
    const rateKey = `multi-angle:${userId}:${ip}`;
    // inline rate limit check (5 req / 60 s)
    const rate = checkRateLimit(rateKey, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      mode?: "auto" | "manual";
      horizontalAngle?: number;
      verticalAngle?: number;
    };

    const { imageDataUrl, mode = "auto", horizontalAngle = 0, verticalAngle = 0 } = body;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    const h = Math.max(-180, Math.min(180, Math.round(horizontalAngle)));
    const v = Math.max(-90, Math.min(90, Math.round(verticalAngle)));

    const promptLabel =
      mode === "manual"
        ? `Multi-Angle – H:${h}° V:${v}°`
        : "Multi-Angle – Auto (6 views)";

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY ?? "";
    if (!apiKey) throw new Error("KIE API key is not configured on the server");

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: promptLabel,
      assetType: "IMAGE",
      modelUsed: "kie/qwen/multi-angle",
    });
    chargedCredits = CREDIT_COST;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to KIE
    const hostedImageUrl = await uploadBase64ToKie(imageDataUrl, apiKey);

    // Build view prompts
    let viewPrompts: string[];
    if (mode === "manual") {
      const hDir =
        h === 0 ? "facing front" :
        h > 0   ? `rotated ${h}° to the right` :
                  `rotated ${Math.abs(h)}° to the left`;
      const vDir =
        v === 0 ? "eye level" :
        v > 0   ? `${v}° tilted upward` :
                  `${Math.abs(v)}° tilted downward`;
      viewPrompts = [`${hDir}, ${vDir}, professional photography, clean studio lighting`];
    } else {
      viewPrompts = AUTO_VIEW_PROMPTS;
    }

    // Generate all views in parallel
    const results = await Promise.allSettled(
      viewPrompts.map((p) => generateView(apiKey, hostedImageUrl, p)),
    );

    const outputs = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((url): url is string => !!url);

    if (outputs.length === 0) {
      await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
      return NextResponse.json(
        { error: "All views failed to generate. Credits refunded." },
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

    console.error("[MULTI_ANGLE_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}

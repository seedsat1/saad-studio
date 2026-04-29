import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, precheckGenerationPolicy, refundCredits, refundGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";

/** Allow up to 3 minutes for async KIE polling */
export const maxDuration = 180;

const WAVESPEED_PREFIXES = ["seedream", "wavespeed-ai"];

const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY  = "https://api.kie.ai/api/v1/jobs/recordInfo";

type Provider = "wavespeed" | "kie";

function resolveProvider(model: string): Provider {
  const lower = model.toLowerCase();
  if (WAVESPEED_PREFIXES.some((p) => lower.startsWith(p))) return "wavespeed";
  return "kie";
}

/** Map aspect_ratio strings to Qwen image_size enum values */
function toQwenImageSize(aspectRatio: string): string {
  const map: Record<string, string> = {
    "1:1":  "square_hd",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    "4:3":  "landscape_4_3",
    "3:4":  "portrait_4_3",
    "21:9": "landscape_16_9",
    "2:3":  "portrait_16_9",
    "3:2":  "landscape_4_3",
  };
  return map[aspectRatio] ?? "square_hd";
}

export async function POST(req: Request) {
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
    const rate = checkRateLimit(`image-generate:${userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    const { prompt, model, aspectRatio = "1:1", numImages = 1, quality, resolution, imageSize, imageUrl: refImageUrl } = body as {
      prompt: string;
      model: string;
      aspectRatio?: string;
      numImages?: number;
      quality?: string;
      resolution?: string;
      imageSize?: string;
      imageUrl?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!model?.trim()) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    const creditsToCharge = await getGenerationCost(model, 5, numImages);
    if (creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit configuration for model: ${model}` }, { status: 400 });
    }

    const precheck = await precheckGenerationPolicy({ prompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: model,
    });
    chargedCredits = creditsToCharge;
    chargedUserId = userId;
    generationId = charge.generationId;

    const provider = resolveProvider(model);
    let imageUrl: string | null = null;

    if (provider === "wavespeed") {
      const apiKey = process.env.WAVESPEED_API_KEY;
      if (!apiKey) throw new Error("WaveSpeed API key is not configured on the server");

      const externalRes = await fetchWithTimeout(
        `https://api.wavespeed.ai/api/v3/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: sanitizePrompt(prompt, 5000), aspect_ratio: aspectRatio, num_images: numImages }),
        },
        35_000,
      );

      if (!externalRes.ok) {
        const detail = await readErrorBody(externalRes);
        throw new Error(`WaveSpeed API returned ${externalRes.status}: ${detail}`);
      }

      const data = await externalRes.json();
      imageUrl = data?.data?.outputs?.[0] ?? data?.outputs?.[0] ?? null;
    }

    if (provider === "kie") {
      const apiKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
      if (!apiKey) throw new Error("KIE API key is not configured on the server");

      const sanitized = sanitizePrompt(prompt, 5000);
      const isI2I = model.includes("image-to-image");
      const input: Record<string, unknown> = isI2I
        ? {
            prompt: sanitized,
            image_url: refImageUrl ?? "",
            strength: 0.8,
            output_format: "png",
            acceleration: "none",
            num_inference_steps: 30,
            guidance_scale: 2.5,
            enable_safety_checker: false,
          }
        : {
            prompt: sanitized,
            image_size: toQwenImageSize(aspectRatio),
            num_inference_steps: 30,
            guidance_scale: 2.5,
            enable_safety_checker: false,
            output_format: "png",
            acceleration: "none",
          };

      // 1) Create async task
      const createRes = await fetchWithTimeout(
        KIE_CREATE,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, input }),
        },
        30_000,
      );

      if (!createRes.ok) {
        const detail = await readErrorBody(createRes);
        return NextResponse.json({ error: `KIE API returned ${createRes.status}`, detail }, { status: createRes.status });
      }

      const createData = await createRes.json() as { code?: number; msg?: string; data?: { taskId?: string } };
      const taskId = createData?.data?.taskId;
      if (!taskId) throw new Error(`KIE API did not return a taskId: ${JSON.stringify(createData)}`);

      // 2) Poll until success/fail (max 40 × 3 s = 2 min)
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3_000));

        const pollRes = await fetchWithTimeout(
          `${KIE_QUERY}?taskId=${encodeURIComponent(taskId)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
          10_000,
        );

        if (!pollRes.ok) continue;

        const pollData = await pollRes.json() as { data?: { state?: string; resultJson?: string; failMsg?: string } };
        const state = pollData?.data?.state;

        if (state === "success") {
          const resultJson = JSON.parse(pollData.data?.resultJson ?? "{}") as { resultUrls?: string[] };
          imageUrl = resultJson?.resultUrls?.[0] ?? null;
          break;
        }
        if (state === "fail") {
          throw new Error(pollData?.data?.failMsg ?? "KIE generation failed");
        }
        // waiting | queuing | generating → keep polling
      }
    }

    if (!imageUrl) {
      throw new Error("The AI provider did not return an image URL");
    }

    if (generationId) {
      await setGenerationMediaUrl(generationId, imageUrl).catch(() => {});
    }
    return NextResponse.json({ success: true, message: "Image generated successfully", imageUrl });
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

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => {});
    } else if (chargedCredits > 0 && chargedUserId) {
      await refundCredits(chargedUserId, chargedCredits).catch(() => {});
    }

    console.error("[IMAGE_GENERATE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

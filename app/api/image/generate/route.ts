import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost } from "@/lib/pricing";
import { InsufficientCreditsError, precheckGenerationPolicy, recordFreeGeneration, refundCredits, refundGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { applyAnnualUnlimitedImageSlowdown, getAnnualUnlimitedImageEligibility } from "@/lib/annual-image-unlimited";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";

/** Allow up to 3 minutes for async KIE polling */
export const maxDuration = 180;

const WAVESPEED_PREFIXES = ["seedream", "wavespeed-ai"];

const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY  = "https://api.kie.ai/api/v1/jobs/recordInfo";

type Provider = "wavespeed" | "kie";

function resolveProvider(model: string): Provider {
  const lower = model.toLowerCase();
  if (lower.includes("seedream/5-pro")) return "wavespeed";
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
    const { prompt, model, aspectRatio = "1:1", numImages = 1, quality, resolution, imageSize, imageUrl: refImageUrl, useAnnualUnlimited = true } = body as {
      prompt: string;
      model: string;
      aspectRatio?: string;
      numImages?: number;
      quality?: string;
      resolution?: string;
      imageSize?: string;
      imageUrl?: string;
      useAnnualUnlimited?: boolean;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!model?.trim()) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    if (typeof refImageUrl === "string" && /^https?:\/\//i.test(refImageUrl)) {
      await checkStoryboardReferenceImageSafety(refImageUrl);
    }

    const chargeQuality = resolution ?? quality ?? imageSize;
    const unlimited = useAnnualUnlimited
      ? await getAnnualUnlimitedImageEligibility({
          userId,
          modelId: model,
          quality: chargeQuality,
          requestedUnits: numImages,
        })
      : { eligible: false, planId: null as string | null, reason: "disabled", dailyUsed: undefined };
    const creditsToCharge = unlimited.eligible
      ? 0
      : await getGenerationCost(model, 5, numImages, chargeQuality);
    if (!unlimited.eligible && creditsToCharge <= 0) {
      return NextResponse.json({ error: `No credit configuration for model: ${model}` }, { status: 400 });
    }

    const precheck = await precheckGenerationPolicy({ prompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const profileIdFromHeader = req.headers.get("x-profile-id") || req.cookies.get("saad_active_profile_id")?.value;
    const profileId = typeof body?.profileId === "string" ? body.profileId : profileIdFromHeader || null;

    const chargeInput = {
      userId,
      profileId,
      prompt: sanitizePrompt(prompt, 5000),
      assetType: "IMAGE",
      modelUsed: model,
      resolution: chargeQuality,
      aspectRatio,
      requestPayload: body,
    };
    const charge = unlimited.eligible
      ? await recordFreeGeneration(chargeInput)
      : await spendCredits({ ...chargeInput, credits: creditsToCharge });
    chargedCredits = creditsToCharge;
    chargedUserId = userId;
    generationId = charge.generationId;
    await applyAnnualUnlimitedImageSlowdown({
      eligible: unlimited.eligible,
      dailyUsed: unlimited.dailyUsed,
      requestedUnits: numImages,
    });

    const provider = resolveProvider(model);
    let imageUrl: string | null = null;

    if (provider === "wavespeed") {
      const apiKey = process.env.WAVESPEED_API_KEY;
      if (!apiKey) throw new Error("WaveSpeed API key is not configured on the server");

      let wsModel = model;
      const wsInput: Record<string, unknown> = {
        prompt: sanitizePrompt(prompt, 5000),
        aspect_ratio: aspectRatio,
        output_format: "png",
      };

      // Normalize resolution
      const resVal = String(quality || resolution || "1k").toLowerCase();
      wsInput.resolution = resVal.includes("2k") ? "2k" : "1k";

      if (model.includes("seedream/5-pro-text-to-image") || model === "seedream/5-pro") {
        wsModel = "bytedance/seedream-v5.0-pro";
      } else if (model.includes("seedream/5-pro-image-to-image")) {
        if (!refImageUrl) {
          return NextResponse.json(
            { error: "Seedream 5.0 Pro Edit requires at least one reference image." },
            { status: 400 },
          );
        }
        wsModel = "bytedance/seedream-v5.0-pro/edit";
        wsInput.images = [refImageUrl];
      }

      const externalRes = await fetchWithTimeout(
        `https://api.wavespeed.ai/api/v3/${wsModel}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(wsInput),
        },
        35_000,
      );

      if (!externalRes.ok) {
        const detail = await readErrorBody(externalRes);
        throw new Error(`WaveSpeed API returned ${externalRes.status}: ${detail}`);
      }

      const submitData = await externalRes.json();
      let wsData = submitData?.data ?? submitData;
      const predictionId = wsData?.id;
      if (!predictionId) {
        throw new Error(`WaveSpeed did not return a prediction ID: ${JSON.stringify(submitData)}`);
      }

      let wsStatus = String(wsData?.status || "created");
      let wsOutputs = Array.isArray(wsData?.outputs) ? wsData.outputs : [];
      const pollUrl = wsData?.urls?.get || `https://api.wavespeed.ai/api/v3/predictions/${predictionId}/result`;

      for (let i = 0; i < 40; i++) {
        if (wsStatus === "completed" || wsStatus === "failed" || wsStatus === "cancelled") {
          break;
        }

        await new Promise((r) => setTimeout(r, 2000));

        const pollRes = await fetchWithTimeout(
          pollUrl,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
          10_000,
        );

        if (!pollRes.ok) continue;

        const pollJson = await pollRes.json();
        wsData = pollJson?.data ?? pollJson;
        wsStatus = String(wsData?.status || "processing");
        wsOutputs = Array.isArray(wsData?.outputs) ? wsData.outputs : [];
      }

      if (wsStatus !== "completed") {
        throw new Error(`WaveSpeed generation task failed or timed out. Status: ${wsStatus}, Error: ${wsData?.error || "Unknown"}`);
      }

      imageUrl = wsOutputs[0] || null;
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
    return NextResponse.json({ generationId, success: true, message: "Image generated successfully", imageUrl });
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

    if (error instanceof UnsafeReferenceImageError) {
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => {});
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
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

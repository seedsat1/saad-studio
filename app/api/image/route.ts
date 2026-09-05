import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { openai, OpenAIConfig } from "@/lib/gptutils";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import {
  InsufficientCreditsError,
  precheckGenerationPolicy,
  saveAdditionalGenerationUrls,
} from "@/lib/credit-ledger";
import { runInlineGeneration } from "@/lib/generation/inline-orchestrator";
import { getGenerationCost } from "@/lib/pricing";

const ALLOWED_RESOLUTIONS = new Set(["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"]);

export async function POST(req: NextRequest) {
  let chargeUserId: string | null = null;
  let creditsToCharge = 0;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`image-legacy:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    if (!OpenAIConfig.apiKey) {
      return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? sanitizePrompt(body.prompt, 4000) : "";
    const amount = Number(body?.amount ?? 1);
    const resolutionRaw = typeof body?.resolution === "string" ? body.resolution : "1024x1024";
    const resolution = ALLOWED_RESOLUTIONS.has(resolutionRaw) ? resolutionRaw : "1024x1024";

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 1 || amount > 4) {
      return new NextResponse("Amount must be between 1 and 4", { status: 400 });
    }

    const precheck = await precheckGenerationPolicy({ prompt });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    creditsToCharge = await getGenerationCost("dall-e-3", 5, Math.floor(amount));
    chargeUserId = userId;

    const profileIdFromHeader = req.headers.get("x-profile-id") || req.cookies.get("saad_active_profile_id")?.value;
    const profileId = typeof body?.profileId === "string" ? body.profileId : profileIdFromHeader || undefined;

    const result = await runInlineGeneration({
      modelId: "dall-e-3",
      modality: "image",
      currentRoute: { provider: "openai", route: "dall-e-3" },
      charge: {
        userId,
        profileId,
        credits: creditsToCharge,
        prompt,
        assetType: "image_legacy",
        modelUsed: "dall-e-3",
      },
      execute: async ({ generationId }) => {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: amount,
          size: resolution,
        });

        const firstUrl = response.data?.[0]?.url ?? null;
        if (!firstUrl) {
          throw new Error("OpenAI did not return an image URL");
        }

        const additionalUrls = response.data
          .slice(1)
          .map((item) => item.url)
          .filter((url): url is string => typeof url === "string");

        return {
          mediaUrl: firstUrl,
          responseData: response.data,
          additionalUrls,
        };
      },
    });

    // Save each additional image URL as a separate zero-cost record
    if (result.providerResult.additionalUrls.length > 0 && chargeUserId) {
      await saveAdditionalGenerationUrls(
        chargeUserId,
        prompt,
        "dall-e-3",
        "image_legacy",
        result.providerResult.additionalUrls,
        profileId,
      ).catch(() => {});
    }

    return NextResponse.json({
      generationId: result.generationId,
      images: result.providerResult.responseData,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          currentBalance: error.currentBalance,
          requiredCredits: error.requiredCredits,
        },
        { status: 402 },
      );
    }

    console.error("--- image generation error ---", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { openai } from "@/lib/gptutils";
import { spendCredits } from "@/lib/credit-ledger";
import { requireGenerationUser, safeGenerationErrorResponse } from "@/lib/generation-guard";
import {
  PROMPT_EXTRACTOR_CREDIT_COST,
  PROMPT_EXTRACTOR_MODEL,
} from "@/lib/prompt-extractor-pricing";

export const dynamic = "force-dynamic";

const MAX_IMAGE_CHARS = 12_000_000;

function isSupportedDataUrl(value: string) {
  return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireGenerationUser();
    const body = await req.json().catch(() => null);
    const image = typeof body?.image === "string" ? body.image : "";

    if (!image || !isSupportedDataUrl(image)) {
      return NextResponse.json({ error: "A supported image is required." }, { status: 400 });
    }

    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "Image is too large." }, { status: 413 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-placeholder") {
      return NextResponse.json(
        {
          error:
            "Official OpenAI API key is missing. Set OPENAI_API_KEY in .env.local, then restart the local server.",
        },
        { status: 500 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.PROMPT_EXTRACTOR_MODEL || "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You convert images into production-ready prompts for image/video generation. Return one polished English prompt only. Include subject, setting, composition, camera/lens, lighting, color palette, materials, mood, style, and quality details. Do not mention that you analyzed an image.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract a detailed generation prompt from this image. Keep it cinematic, concrete, and directly usable.",
            },
            {
              type: "image_url",
              image_url: { url: image, detail: "high" },
            },
          ],
        },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "The model returned an empty prompt." }, { status: 502 });
    }

    const charge = await spendCredits({
      userId,
      credits: PROMPT_EXTRACTOR_CREDIT_COST,
      prompt: prompt.slice(0, 5000),
      assetType: "PROMPT",
      modelUsed: PROMPT_EXTRACTOR_MODEL,
      mediaUrl: null,
    });

    return NextResponse.json({
      prompt,
      creditsCharged: PROMPT_EXTRACTOR_CREDIT_COST,
      remainingCredits: charge.remainingCredits,
      generationId: charge.generationId,
    });
  } catch (error) {
    return safeGenerationErrorResponse(error, "prompt-extractor");
  }
}

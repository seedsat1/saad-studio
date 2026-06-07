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
      model: process.env.PROMPT_EXTRACTOR_MODEL || "gpt-4o",
      temperature: 0.12,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            [
              "You are an expert image-to-prompt and OCR analyst.",
              "First identify every visible text element in the image, including Arabic, English, numbers, names, labels, captions, badges, and UI-like panels.",
              "Preserve readable text verbatim whenever possible. Do not translate Arabic names or titles unless you also keep the original Arabic.",
              "Then write a production-ready generation prompt that recreates the full design, not just the scene.",
              "The prompt must include layout, typography, exact visible text, logos/icons, panels, colors, lighting, background, subject placement, materials, and style.",
              "If any text is partially unreadable, mark it as partially readable instead of inventing it.",
              "Return only the final prompt. No markdown heading.",
            ].join(" "),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract a faithful prompt from this image. Include all readable Arabic and English text verbatim, the full graphic layout, and every important design element.",
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

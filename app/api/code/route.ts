import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";

import { openai, createMsg, AsstMsg, OpenAIConfig } from "@/lib/gptutils";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import {
  InsufficientCreditsError,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { CODE_CHAT_CREDITS } from "@/lib/credits-config";

const instructionMessage = new AsstMsg(
  "You are a code generator. You must answer only in markdown code snippets. Use code comments for explanations.",
);

export async function POST(req: NextRequest) {
  let charge: { generationId: string; remainingCredits: number } | null = null;
  let chargeUserId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`code:${userId}:${ip}`, 25, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    if (!OpenAIConfig.apiKey) {
      return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    }

    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    if (!rawMessages.length) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const latestUserPrompt =
      [...rawMessages]
        .reverse()
        .find((m) => m && typeof m === "object" && (m as { role?: string }).role === "user")
        ?.content ?? "Code assistant request";

    charge = await spendCredits({
      userId,
      credits: CODE_CHAT_CREDITS,
      prompt: String(latestUserPrompt),
      assetType: "code_chat",
      modelUsed: "gpt-4",
    });
    chargeUserId = userId;

    const msgs = rawMessages
      .map((msg: OpenAI.ChatCompletionMessageParam) => createMsg(msg))
      .filter(Boolean) as OpenAI.ChatCompletionMessageParam[];

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [instructionMessage, ...msgs],
      stream: true,
    });

    let out = "";
    for await (const chunk of stream) {
      out = out.concat(chunk.choices[0]?.delta?.content || "");
    }

    await setGenerationMediaUrl(charge.generationId, "text:code");
    return NextResponse.json({ generationId: charge.generationId, content: out, remainingCredits: charge.remainingCredits });
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

    if (charge && chargeUserId) {
      await rollbackGenerationCharge(charge.generationId, chargeUserId, CODE_CHAT_CREDITS).catch(
        () => {},
      );
    }

    console.error("--- code API error ---", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

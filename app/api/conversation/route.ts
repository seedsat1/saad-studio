import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

import { createMsg } from "@/lib/gptutils";
import {
  InsufficientCreditsError,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { ASSIST_CHAT_CREDITS } from "@/lib/credits-config";
import {
  assertSufficientCredits,
  generationAuthResponse,
  insufficientCreditsResponse,
  safeGenerationErrorResponse,
} from "@/lib/generation-guard";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export async function POST(req: Request) {
  let charge: { generationId: string; remainingCredits: number } | null = null;
  let chargeUserId: string | null = null;

  try {
    const { userId } = await auth();
    const body = await req.json();
    const { messages } = body;

    if (!userId) {
      return generationAuthResponse();
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`conversation:${userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return safeGenerationErrorResponse(new Error("OpenAI API Key not configured."), "conversation");
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const latestUserPrompt =
      [...messages]
        .reverse()
        .find((m) => m && typeof m === "object" && (m as { role?: string }).role === "user")
        ?.content ?? "Conversation request";

    await assertSufficientCredits(userId, ASSIST_CHAT_CREDITS);

    charge = await spendCredits({
      userId,
      credits: ASSIST_CHAT_CREDITS,
      prompt: String(latestUserPrompt),
      assetType: "conversation_chat",
      modelUsed: "gpt-4",
    });
    chargeUserId = userId;

    const msgs = messages
      .map((msg: ChatCompletionMessageParam) => createMsg(msg))
      .filter(Boolean) as ChatCompletionMessageParam[];

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: msgs,
      stream: true,
    });

    let msg = "";
    for await (const chunk of stream) {
      msg = msg.concat(chunk.choices[0]?.delta?.content || "");
    }

    await setGenerationMediaUrl(charge.generationId, "text:conversation");
    return NextResponse.json({ generationId: charge.generationId, content: msg, remainingCredits: charge.remainingCredits });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return insufficientCreditsResponse(error.requiredCredits, error.currentBalance);
    }

    if (charge && chargeUserId) {
      await rollbackGenerationCharge(charge.generationId, chargeUserId, ASSIST_CHAT_CREDITS).catch(
        () => {},
      );
    }

    console.log("--- gpt error ---", error);
    return safeGenerationErrorResponse(error, "conversation");
  }
}

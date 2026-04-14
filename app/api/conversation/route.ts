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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const latestUserPrompt =
      [...messages]
        .reverse()
        .find((m) => m && typeof m === "object" && (m as { role?: string }).role === "user")
        ?.content ?? "Conversation request";

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
    return NextResponse.json({ content: msg, remainingCredits: charge.remainingCredits });
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
      await rollbackGenerationCharge(charge.generationId, chargeUserId, ASSIST_CHAT_CREDITS).catch(
        () => {},
      );
    }

    console.log("--- gpt error ---", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

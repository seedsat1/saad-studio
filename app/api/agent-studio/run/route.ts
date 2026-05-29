import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { spendCredits } from "@/lib/credit-ledger";
import { ASSIST_CHAT_CREDITS } from "@/lib/credits-config";
import { assertSufficientCredits, generationAuthResponse } from "@/lib/generation-guard";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return generationAuthResponse();
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { prompt, skills, memories } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // Spend credits
    await assertSufficientCredits(userId, ASSIST_CHAT_CREDITS);
    await spendCredits({
      userId,
      credits: ASSIST_CHAT_CREDITS,
      prompt: String(prompt),
      assetType: "agent_studio_run",
      modelUsed: "gpt-4",
    });

    // Build the system instructions using active skills and memory rules
    let systemInstructions = "You are Agent Studio, a premium multi-model AI agent orchestrator.\n";
    
    if (skills && skills.length > 0) {
      systemInstructions += "\nYou must apply the following active skills when answering:\n";
      skills.forEach((skill: any) => {
        systemInstructions += `- ${skill.title}: ${skill.desc} (Instruction: ${skill.prompt})\n`;
      });
    }

    if (memories && memories.length > 0) {
      systemInstructions += "\nYou must respect the following user memory preference rules:\n";
      memories.forEach((mem: any) => {
        systemInstructions += `- ${mem.text}\n`;
      });
    }

    systemInstructions += "\nKeep your answer detailed, professional, and fully complete.";

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: prompt }
      ],
    });

    const content = response.choices[0]?.message?.content || "No response generated.";

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Agent Studio run error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

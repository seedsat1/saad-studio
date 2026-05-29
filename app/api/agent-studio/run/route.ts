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
    let systemInstructions = `You are Agent Studio, a premium multi-model AI agent orchestrator.
You must return your output in JSON format. The JSON object must contain the following keys:
- "content": A detailed text script, outline, copywriting, or response using the active skills, in the language of the user's prompt (Arabic by default if prompt is in Arabic).
- "mediaType": set to "video" if the user requested a video or the active skill is video-focused (e.g. B-roll shot planner, Kling video director, Pulp Cinema director, etc.), or "image" if the user requested an image/graphic (e.g. static ads, thumbnail enhancement), or "none" if it is a pure text/writing task.
- "mediaPrompt": A detailed descriptive prompt in English (optimized for video or image generation models like Kling 3.0, Flux-2, Wavespeed) describing the scene/image to be generated. Keep this empty if mediaType is "none".
- "suggestedModel": The best model ID to generate the media. Choose one of: "kling-3.0/video", "wavespeed-ai/cinematic-video-generator", "flux-2", "google/nano-banana", or keep empty if mediaType is "none".
- "aspectRatio": The aspect ratio (e.g. "16:9", "9:16", "1:1").
`;
    
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

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: prompt }
      ],
    });

    const contentString = response.choices[0]?.message?.content || "{}";
    let parsedData = { content: "No response generated.", mediaType: "none", mediaPrompt: "", suggestedModel: "", aspectRatio: "16:9" };
    try {
      parsedData = JSON.parse(contentString);
    } catch (e) {
      console.error("Failed to parse JSON response:", contentString);
      parsedData.content = contentString;
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Agent Studio run error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

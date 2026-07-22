import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { spendCredits, InsufficientCreditsError } from "@/lib/credit-ledger";
import { HOOK_VIDEO_MODELS, HOOK_GENRES, LLM_BRAIN_MODELS } from "@/lib/hook-studio-config";
import { openai } from "@/lib/gptutils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح لك للوصول" }, { status: 401 });
    }

    const body = await req.json();
    const {
      prompt,
      llmBrain = "gpt-4o",
      genre = "cinematic",
      modelId = "seedance-2.0-pro",
      duration = 5,
      aspectRatio = "9:16",
      quality = "pro",
      refImages = [],
      refVideos = [],
      refAudios = [],
      longScript = "",
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json({ error: "يرجى كتابة فكرة أو وصف الهوك المطلوب" }, { status: 400 });
    }

    const selectedModel = HOOK_VIDEO_MODELS.find((m) => m.id === modelId) || HOOK_VIDEO_MODELS[0];
    const selectedGenre = HOOK_GENRES.find((g) => g.id === genre) || HOOK_GENRES[0];
    const selectedBrain = LLM_BRAIN_MODELS.find((b) => b.id === llmBrain) || LLM_BRAIN_MODELS[0];

    // Deduct user credits for generation
    const cost = selectedModel.creditCost;
    let newBalance = 0;
    try {
      const charge = await spendCredits({
        userId,
        credits: cost,
        description: `Hook Studio generation using ${selectedModel.name} (${selectedGenre.nameAr})`,
        modelUsed: selectedModel.id,
      });
      newBalance = charge.newBalance;
    } catch (err: any) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "رصيد الكريدت غير كافٍ لإتمام التوليد", requiredCredits: err.requiredCredits },
          { status: 402 }
        );
      }
      throw err;
    }


    let hookText = "ماذا لو أخبرتك أن المحتوى الفيروسي يصنع بالذكاء الاصطناعي؟";
    let recommendedModelAdvice = "نوصي باستخدام Seedance 2.0 للحصول على معالجة سينمائية وثبات مذهل للألوان.";

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-placeholder") {
      try {
        const systemPrompt = `You are the creative brain of Hook Studio, a premium AI video generation assistant.
Your task is to write a high-retention viral video hook in Arabic or English (matching the user's prompt language and requested dialect, e.g., if they request the Iraqi dialect "اللهجة العراقية", you MUST use authentic Iraqi vocabulary like 'شلونك', 'أريد', 'عيني').

Rules:
1. No placeholders, no filler text, and no duplicate phrases.
2. If the user mentions action/speed/combat, recommend 'Kling 3.0' or 'Kling Turbo' for action sequences. If they mention sci-fi/fantasy/neon/visual realism, recommend 'Seedream V5.0 Pro Edit'. If they want cinematic quality or general storytelling with reference media, recommend 'Seedance 2.0'.
3. Always respond ONLY in a valid JSON object matching this schema:
{
  "hookText": "The actual viral hook phrase (quote-wrapped if needed, e.g., \\"ماذا لو...\\")",
  "recommendedModel": "Detailed recommendation message explaining why a specific model (Seedance 2.0, Kling 3.0, or Seedream V5.0 Pro Edit) is the best choice for this prompt."
}
Do not include any markdown code fence around the JSON, just return raw JSON.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Prompt: " + prompt + "\nGenre: " + selectedGenre.nameEn + "\nBrain Selected: " + selectedBrain.name }
          ],
          response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(completion.choices[0].message.content || "{}");
        if (parsed.hookText) hookText = parsed.hookText;
        if (parsed.recommendedModel) recommendedModelAdvice = parsed.recommendedModel;
      } catch (err) {
        console.error("OpenAI Hook Studio generation error, using fallback:", err);
      }
    }

    // Call WaveSpeed API v3
    const waveKey = process.env.WAVESPEED_API_KEY;
    let taskId = `ws-hook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let resultUrl: string | null = null;
    let status = "processing";

    if (waveKey) {
      try {
        const payload: Record<string, any> = {
          prompt: `${prompt.trim()}. [Style: ${selectedGenre.nameEn}. ${selectedGenre.systemPromptAddon}]`,
          aspect_ratio: aspectRatio,
          duration,
          quality,
        };

        if (refImages.length > 0) payload.images = refImages.slice(0, selectedModel.maxRefImages);
        if (refVideos.length > 0) payload.videos = refVideos.slice(0, selectedModel.maxRefVideos);
        if (refAudios.length > 0) payload.audios = refAudios.slice(0, selectedModel.maxRefAudios);
        if (longScript) payload.script = longScript;

        const res = await fetch(`https://api.wavespeed.ai/api/v3/${selectedModel.apiRoute}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waveKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          taskId = data?.task_id || data?.id || taskId;
          resultUrl = data?.output_url || data?.url || data?.data?.url || null;
          if (resultUrl) status = "completed";
        }
      } catch (err) {
        console.error("WaveSpeed API dispatch error:", err);
      }
    }

    // Create DB Generation record
    const generation = await prismadb.generation.create({
      data: {
        userId,
        prompt: `[${selectedBrain.name}] [${selectedGenre.nameAr}] ${prompt}`,
        modelUsed: selectedModel.name,
        mediaUrl: resultUrl,
        type: selectedModel.durations[0] === 0 ? "IMAGE" : "VIDEO",
      },
    });

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      taskId,
      status,
      mediaUrl: resultUrl,
      modelUsed: selectedModel.name,
      creditsDeducted: cost,
      remainingCredits: newBalance,
      hookText,
      recommendedModel: recommendedModelAdvice,
    });
  } catch (error: any) {
    console.error("Hook Studio Generation Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع أثناء التوليد" },
      { status: 500 }
    );
  }
}

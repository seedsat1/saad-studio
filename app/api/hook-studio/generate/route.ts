import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { spendCredits, InsufficientCreditsError } from "@/lib/credit-ledger";
import { HOOK_VIDEO_MODELS, HOOK_GENRES, LLM_BRAIN_MODELS } from "@/lib/hook-studio-config";

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
      remainingCredits: deduction.newBalance,
    });
  } catch (error: any) {
    console.error("Hook Studio Generation Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع أثناء التوليد" },
      { status: 500 }
    );
  }
}

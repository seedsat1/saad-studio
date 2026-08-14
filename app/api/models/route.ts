import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { withAudioSourceMetadata, withImageSourceMetadata, withVideoSourceMetadata } from "@/lib/model-source-map";
import { loadModels } from "@/lib/pricing";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();

    // Filter out inactive models for general users
    const activeImageModels = imageModels
      .filter((m) => m.isActive !== false)
      .map(withImageSourceMetadata);
    const activeVideoModels = videoModels
      .filter((m) => m.isActive !== false)
      .map(withVideoSourceMetadata);

    const allModels = await loadModels();
    const activeAudioModels = allModels
      .filter((m) => m.type === "audio" && m.isActive !== false)
      .map((m) => {
        let desc = m.notes || "";
        if (m.id === "google/lyria-3-pro/music") {
          desc = "Google · Pro Preview";
        } else if (m.id === "google/lyria-3-clip/music") {
          desc = "Google · Fast Preview";
        }
        return {
          id: m.id,
          name: m.name,
          desc: desc,
          creditCost: m.userCreditsRate,
          isActive: m.isActive,
        };
      })
      .map(withAudioSourceMetadata);

    return NextResponse.json({
      ok: true,
      imageModels: activeImageModels,
      videoModels: activeVideoModels,
      audioModels: activeAudioModels,
    });
  } catch (err) {
    console.error("[public-models] GET error:", err);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

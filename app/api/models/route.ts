import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();

    // Filter out inactive models for general users
    const activeImageModels = imageModels.filter((m) => m.isActive !== false);
    const activeVideoModels = videoModels.filter((m) => m.isActive !== false);

    return NextResponse.json({
      ok: true,
      imageModels: activeImageModels,
      videoModels: activeVideoModels,
    });
  } catch (err) {
    console.error("[public-models] GET error:", err);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

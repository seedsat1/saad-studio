import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import {
  buildCentralModelDefinitions,
  getCentralizedDynamicImageModels,
  getCentralizedDynamicVideoModels,
} from "@/lib/model-definition-registry";
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
    const modelDefinitions = buildCentralModelDefinitions({ imageModels, videoModels });

    // Filter out inactive models for general users
    const activeImageModels = (await getCentralizedDynamicImageModels())
      .filter((m) => m.isActive !== false)
      .map(withImageSourceMetadata);
    const activeVideoModels = (await getCentralizedDynamicVideoModels())
      .filter((m) => m.isActive !== false)
      .map(withVideoSourceMetadata);

    const allModels = await loadModels();
    const activeAudioModels = allModels
      .filter((m) => m.type === "audio" && m.isActive !== false)
      .map((m) => {
        const centralDef = modelDefinitions.find((def) => def.modelId === m.id || def.sourceModelId === m.id);
        const displayName = centralDef ? centralDef.displayName : m.name;
        let desc = m.notes || "";
        if (m.id === "google/lyria-3-pro/music") {
          desc = "Google · Pro Preview";
        } else if (m.id === "google/lyria-3-clip/music") {
          desc = "Google · Fast Preview";
        }
        return {
          id: m.id,
          name: displayName,
          desc: desc,
          creditCost: m.userCreditsRate,
          isActive: centralDef ? centralDef.status === "active" : m.isActive,
        };
      })
      .map(withAudioSourceMetadata);

    return NextResponse.json({
      ok: true,
      imageModels: activeImageModels,
      videoModels: activeVideoModels,
      audioModels: activeAudioModels,
      modelDefinitions: modelDefinitions.filter((definition) => definition.status === "active"),
      modelDefinitionSource: "central",
    });
  } catch (err) {
    console.error("[public-models] GET error:", err);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

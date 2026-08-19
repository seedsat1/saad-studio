import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { VOICE_CATALOG, VoiceDefinition } from "@/lib/voice-catalog";
import { getRegistry } from "@/lib/voice-registry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const language = searchParams.get("language");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const registry = getRegistry();

    // Map samples with pre-cached URLs if available
    let voices: VoiceDefinition[] = VOICE_CATALOG.map((v) => {
      const storedUrl = v.geminiVoiceId ? registry[v.geminiVoiceId] : null;
      return {
        ...v,
        sampleUrl: storedUrl || v.sampleUrl,
      };
    });

    if (category && category !== "all") {
      voices = voices.filter((v) => v.category === category || (category === "arabic" && v.language === "Arabic"));
    }

    if (language && language !== "All languages" && language !== "all") {
      voices = voices.filter((v) => v.language.toLowerCase() === language.toLowerCase());
    }

    if (gender && gender !== "All genders" && gender !== "all") {
      voices = voices.filter((v) => v.gender.toLowerCase() === gender.toLowerCase());
    }

    if (search) {
      voices = voices.filter(
        (v) =>
          v.name.toLowerCase().includes(search) ||
          v.accent.toLowerCase().includes(search) ||
          v.language.toLowerCase().includes(search) ||
          v.tag.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      voices,
      total: voices.length,
      categories: [
        { id: "all", label: "All voices", icon: "zap" },
        { id: "narration", label: "Narration", icon: "book" },
        { id: "characters", label: "Characters", icon: "theater" },
        { id: "conversational", label: "Conversational", icon: "chat" },
        { id: "news", label: "News", icon: "newspaper" },
        { id: "epic", label: "Epic", icon: "flame" },
        { id: "social", label: "Social", icon: "smartphone" },
        { id: "calm", label: "Calm", icon: "spa" },
        { id: "arabic", label: "Arabic", icon: "moon" },
      ],
    });
  } catch (err: any) {
    console.error("[api/voices] GET error:", err);
    return NextResponse.json({ error: "Failed to load voices" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_GEMINI_TTS_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]);

import { getRegistry } from "@/lib/voice-registry";

export async function GET(req: NextRequest) {
  try {
    const voiceParam = req.nextUrl.searchParams.get("voice") || "Sulafat";
    const rawName = String(voiceParam).replace(/^gemini:/i, "").trim();
    const exactVoice = Array.from(GOOGLE_GEMINI_TTS_VOICES).find(
      (v) => v.toLowerCase() === rawName.toLowerCase()
    ) || "Sulafat";

    // 1. Check persistent registry
    const registry = getRegistry();
    const storedUrl = registry[exactVoice];
    if (storedUrl) {
      const targetUrl = (storedUrl.startsWith("http") || storedUrl.startsWith("/"))
        ? storedUrl
        : `/api/media/${storedUrl}`;
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    // 2. Strict rule: Fallback to Sulafat's pre-rendered URL to avoid on-the-fly paid calls
    const fallbackUrl = registry["Sulafat"] || Object.values(registry)[0];
    if (fallbackUrl) {
      const targetUrl = (fallbackUrl.startsWith("http") || fallbackUrl.startsWith("/"))
        ? fallbackUrl
        : `/api/media/${fallbackUrl}`;
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    return new NextResponse("Voice sample not pre-rendered by admin yet.", { status: 404 });
  } catch (error: any) {
    return new NextResponse(error?.message || "Internal server error", { status: 500 });
  }
}

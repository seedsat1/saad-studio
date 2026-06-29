import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const GOOGLE_GEMINI_TTS_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]);

const REGISTRY_PATH = path.join(process.cwd(), "public/stude/voice_samples_registry.json");

export function getRegistry(): Record<string, string> {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Error reading registry:", e);
  }
  return {};
}

export function saveRegistry(registry: Record<string, string>) {
  try {
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing registry:", e);
  }
}

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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  inspectCaptionPresets,
  listCaptionPresets,
  listTranslationLanguages,
  type ReapRawLanguageOption,
} from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId && !isLocalDevRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.REAP_API_KEY) {
    return NextResponse.json({ error: "REAP_API_KEY is not set on the server." }, { status: 503 });
  }

  try {
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    const [languages, presets, presetsDiagnostics] = await Promise.all([
      listTranslationLanguages().catch(() => ({ sourceLanguages: [], targetLanguages: [] })),
      listCaptionPresets().catch(() => []),
      debug ? inspectCaptionPresets() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      languages: mapStudioLanguages(languages.sourceLanguages),
      presets,
      ...(presetsDiagnostics ? { presetsDiagnostics } : {}),
    });
  } catch (err) {
    console.error("[studio-edit/languages]", err);
    return NextResponse.json({ error: "Failed to fetch languages/presets." }, { status: 500 });
  }
}

function isLocalDevRequest(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const host = req.headers.get("host") ?? "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function mapStudioLanguages(items: ReapRawLanguageOption[]) {
  return items.map((item) => ({
    code: item.code,
    label: item.displayName || item.name || item.code,
  }));
}

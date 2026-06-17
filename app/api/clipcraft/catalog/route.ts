import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import {
  inspectCaptionPresets,
  listCaptionPresets,
  listDubbingLanguages,
  type ReapLanguageCatalog,
  type ReapRawLanguageOption,
  listTranslationLanguages,
} from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

type CatalogSource = "reap" | "derived" | "unsupported";

interface CatalogEntry<T> {
  items: T[];
  source: CatalogSource;
  diagnostic?: string;
}

interface CatalogLanguage {
  code: string;
  label: string;
}

interface CatalogPreset {
  id: string;
  label: string;
  name?: string;
  source?: string;
  preferences?: Record<string, unknown>;
}

function unsupportedEntry<T>(diagnostic: string): CatalogEntry<T> {
  return { items: [], source: "unsupported", diagnostic };
}

function splitPresets(presets: CatalogPreset[]) {
  const brandTemplates = presets.filter((preset) => preset.source === "user");
  const captionPresets = presets.filter((preset) => preset.source !== "user");
  const audiogramTemplates = presets.filter((preset) => preset.preferences?.addAudiogram === true);
  return { brandTemplates, captionPresets, audiogramTemplates };
}

function mapLanguageOptions(items: ReapRawLanguageOption[]): CatalogLanguage[] {
  return items.map((item) => ({
    code: item.code,
    label: item.displayName || item.name || item.code,
  }));
}

function toCatalogEntry(result: PromiseSettledResult<ReapLanguageCatalog>, key: "sourceLanguages" | "targetLanguages"): CatalogEntry<CatalogLanguage> {
  if (result.status === "fulfilled") {
    return { items: mapLanguageOptions(result.value[key]), source: "reap" };
  }
  return {
    items: [],
    source: "reap",
    diagnostic: result.reason instanceof Error ? result.reason.message : String(result.reason),
  };
}

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`clipcraft-catalog:${userId}:${ip}`, 15, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  try {
    const [languagesResult, dubbingResult, presetsResult, presetDiagnostics] = await Promise.allSettled([
      listTranslationLanguages(),
      listDubbingLanguages(),
      listCaptionPresets(),
      inspectCaptionPresets(),
    ]);

    const languages = toCatalogEntry(languagesResult, "sourceLanguages");
    const dubbingSourceLanguages = toCatalogEntry(dubbingResult, "sourceLanguages");
    const dubbingLanguages = toCatalogEntry(dubbingResult, "targetLanguages");

    const presets = presetsResult.status === "fulfilled" ? presetsResult.value : [];
    const presetDiagnosticMessage = presetsResult.status === "rejected"
      ? (presetsResult.reason instanceof Error ? presetsResult.reason.message : String(presetsResult.reason))
      : undefined;
    const {
      captionPresets: captionPresetItems,
      brandTemplates: brandTemplateItems,
      audiogramTemplates: audiogramTemplateItems,
    } = splitPresets(presets);

    const captionPresets: CatalogEntry<CatalogPreset> = {
      items: captionPresetItems,
      source: "reap",
      diagnostic: presetDiagnosticMessage,
    };

    const brandTemplates: CatalogEntry<CatalogPreset> = {
      items: brandTemplateItems,
      source: "derived",
      diagnostic: brandTemplateItems.length
        ? undefined
        : "No user Brand Templates were returned via /get-all-presets.",
    };

    const audiogramTemplates: CatalogEntry<CatalogPreset> = {
      items: audiogramTemplateItems,
      source: "derived",
      diagnostic: audiogramTemplateItems.length
        ? undefined
        : "/get-all-presets returned no presets with preferences.addAudiogram=true.",
    };

    const diagnostics = {
      captionPresets: presetDiagnostics.status === "fulfilled" ? presetDiagnostics.value : {
        ok: false,
        error: presetDiagnostics.reason instanceof Error ? presetDiagnostics.reason.message : String(presetDiagnostics.reason),
      },
      unsupported: {
        voices: "No documented automation catalog endpoint for voices was found.",
        reframeOptions: "No documented automation catalog endpoint for reframe options was found.",
        audiogramTemplates: "No standalone audiogram template endpoint is documented; derived from /get-all-presets.",
      },
    };

    return NextResponse.json({
      languages,
      captionPresets,
      brandTemplates,
      voices: unsupportedEntry("Voice catalog endpoint is not exposed in the public automation API currently used."),
      dubbingSourceLanguages,
      dubbingLanguages,
      reframeOptions: unsupportedEntry("Reframe options are configured per job, but no public catalog endpoint is documented."),
      audiogramTemplates,
      diagnostics,
    });
  } catch (err) {
    console.error("[api/clipcraft/catalog]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

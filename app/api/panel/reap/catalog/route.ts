import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
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
  return { brandTemplates, captionPresets };
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
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const [languagesResult, dubbingResult, presetsResult, presetDiagnostics] = await Promise.allSettled([
      listTranslationLanguages(),
      listDubbingLanguages(),
      listCaptionPresets(),
      inspectCaptionPresets(),
    ]);

    const languages = toCatalogEntry(languagesResult, "sourceLanguages");
    const dubbingLanguages = toCatalogEntry(dubbingResult, "targetLanguages");

    const presets = presetsResult.status === "fulfilled" ? presetsResult.value : [];
    const presetDiagnosticMessage = presetsResult.status === "rejected"
      ? (presetsResult.reason instanceof Error ? presetsResult.reason.message : String(presetsResult.reason))
      : undefined;
    const { captionPresets: captionPresetItems, brandTemplates: brandTemplateItems } = splitPresets(presets);

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
        : "No user Brand Templates were returned by Reap via /get-all-presets.",
    };

    const diagnostics = {
      captionPresets: presetDiagnostics.status === "fulfilled" ? presetDiagnostics.value : {
        ok: false,
        error: presetDiagnostics.reason instanceof Error ? presetDiagnostics.reason.message : String(presetDiagnostics.reason),
      },
      unsupported: {
        voices: "No documented Reap automation catalog endpoint for voices was found during phase 1.",
        reframeOptions: "No documented Reap automation catalog endpoint for reframe options was found during phase 1.",
        audiogramTemplates: "No documented Reap automation catalog endpoint for audiogram templates was found during phase 1.",
      },
    };

    return NextResponse.json({
      languages,
      captionPresets,
      brandTemplates,
      voices: unsupportedEntry("Reap voice catalog endpoint is not exposed in the public automation API currently used by the panel."),
      dubbingLanguages,
      reframeOptions: unsupportedEntry("Reap reframe options are configured per job, but no public catalog endpoint is documented for them."),
      audiogramTemplates: unsupportedEntry("Reap audiogram templates appear in product docs, but no public automation catalog endpoint is documented for them."),
      diagnostics,
    });
  } catch (err) {
    console.error("[panel/reap/catalog]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

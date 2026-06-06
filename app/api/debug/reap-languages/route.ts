import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REAP_URL = "https://public.reap.video/api/v1/automation/get-translation-languages";

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function summarizeError(
  upstreamStatus: number,
  rawJson: unknown,
  rawText: string,
  parseError: string | null,
): string | null {
  if (parseError) return parseError;

  if (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)) {
    const data = rawJson as Record<string, unknown>;
    const candidate = data.error ?? data.message ?? data.detail;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  if (!rawText.trim()) return `Empty response from Reap (${upstreamStatus}).`;
  if (upstreamStatus >= 400) return rawText.slice(0, 500);
  return null;
}

export async function GET() {
  const apiKey = process.env.REAP_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      {
        status: 500,
        contentType: null,
        rawJson: null,
        sourceLanguagesCount: 0,
        targetLanguagesCount: 0,
        sourceLanguagesPreview: [],
        targetLanguagesPreview: [],
        error: "REAP_API_KEY is not set on the server.",
      },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(REAP_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type");
    const rawText = await res.text();

    let rawJson: unknown = null;
    let parseError: string | null = null;

    if (rawText.trim()) {
      try {
        rawJson = JSON.parse(rawText);
      } catch {
        parseError = `Non-JSON response from Reap (${res.status}).`;
      }
    }

    const sourceLanguages = rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)
      ? asList((rawJson as Record<string, unknown>).sourceLanguages)
      : [];
    const targetLanguages = rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)
      ? asList((rawJson as Record<string, unknown>).targetLanguages)
      : [];

    return NextResponse.json(
      {
        status: res.status,
        contentType,
        rawJson,
        sourceLanguagesCount: sourceLanguages.length,
        targetLanguagesCount: targetLanguages.length,
        sourceLanguagesPreview: sourceLanguages.slice(0, 5),
        targetLanguagesPreview: targetLanguages.slice(0, 5),
        error: summarizeError(res.status, rawJson, rawText, parseError),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: 502,
        contentType: null,
        rawJson: null,
        sourceLanguagesCount: 0,
        targetLanguagesCount: 0,
        sourceLanguagesPreview: [],
        targetLanguagesPreview: [],
        error: message,
      },
      { status: 502 },
    );
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("Service is not configured.");
  return key;
}

function normalizeDataUrl(base64: string, mimeType: string): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}

function extractUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const json = data as Record<string, unknown>;
  const row = (json.data && typeof json.data === "object") ? (json.data as Record<string, unknown>) : json;
  const value =
    row.downloadUrl ||
    row.download_url ||
    row.fileUrl ||
    row.file_url ||
    row.url;
  return typeof value === "string" && value.trim() ? value : null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      filename?: string;
      mimeType?: string;
      base64?: string;
    };

    const filename = (body.filename || "frame.png").trim();
    const mimeType = (body.mimeType || "image/png").trim();
    const base64 = typeof body.base64 === "string" ? body.base64.trim() : "";

    if (!base64) {
      return NextResponse.json({ error: "base64 is required" }, { status: 400 });
    }

    const payload = {
      base64: normalizeDataUrl(base64, mimeType),
      fileName: filename,
    };

    const upstream = await fetch(KIE_UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(() => null);
    const url = extractUrl(data);

    if (!upstream.ok || !url) {
      return NextResponse.json(
        { error: "Upload failed." },
        { status: upstream.status || 502 },
      );
    }

    return NextResponse.json({ url, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

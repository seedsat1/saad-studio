import JSZip from "jszip";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILES = 25;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

type BatchDownloadItem = {
  url?: unknown;
  filename?: unknown;
};

function isSafeExternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") return false;
  if (host === "169.254.169.254" || host.startsWith("169.254.")) return false;
  if (host.startsWith("10.") || host.startsWith("192.168.")) return false;

  const parts = host.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return false;
  }

  return !host.endsWith(".local") && !host.endsWith(".internal") && !host.endsWith(".localhost");
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "saadstudio-image";
}

function inferExtension(contentType: string, sourceUrl: string): string {
  const pathExtension = new URL(sourceUrl).pathname.split(".").pop()?.toLowerCase();
  if (pathExtension && /^(avif|gif|jpe?g|png|webp)$/.test(pathExtension)) return pathExtension === "jpeg" ? "jpg" : pathExtension;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function parseExternalUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const url = new URL(rawUrl);
    return ALLOWED_SCHEMES.has(url.protocol) && isSafeExternalHost(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: BatchDownloadItem[] } | null;
  const requestedItems = Array.isArray(body?.items) ? body.items : [];
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Select at least one image to download." }, { status: 400 });
  }
  if (requestedItems.length > MAX_FILES) {
    return NextResponse.json({ error: `You can download up to ${MAX_FILES} images at once.` }, { status: 400 });
  }

  const parsedItems = requestedItems.map((item, index) => ({
    url: parseExternalUrl(item.url),
    filename: sanitizeFilename(typeof item.filename === "string" ? item.filename : `saadstudio-image-${index + 1}`),
  }));
  if (parsedItems.some((item) => !item.url)) {
    return NextResponse.json({ error: "One or more image URLs are invalid." }, { status: 400 });
  }

  const zip = new JSZip();
  const failures: string[] = [];
  let totalBytes = 0;

  for (let index = 0; index < parsedItems.length; index++) {
    const item = parsedItems[index];
    const sourceUrl = item.url!;
    try {
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(45_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SaadStudioBatchDownload/1.0)" },
      });
      if (!response.ok) throw new Error(`upstream returned ${response.status}`);

      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_FILE_BYTES) throw new Error("file is too large");

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("file is too large");
      if (totalBytes + bytes.byteLength > MAX_TOTAL_BYTES) throw new Error("archive size limit reached");
      totalBytes += bytes.byteLength;

      const extension = inferExtension(response.headers.get("content-type") || "", sourceUrl.toString());
      const baseName = item.filename.replace(/\.(avif|gif|jpe?g|png|webp)$/i, "");
      zip.file(`${String(index + 1).padStart(2, "0")}-${baseName}.${extension}`, bytes);
    } catch (error) {
      failures.push(`${index + 1}. ${error instanceof Error ? error.message : "download failed"}`);
    }
  }

  if (totalBytes === 0) {
    return NextResponse.json({ error: "The selected images could not be downloaded." }, { status: 502 });
  }
  if (failures.length > 0) {
    zip.file("download-errors.txt", `Some images could not be included:\n\n${failures.join("\n")}`);
  }

  const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(archive as any, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(archive.byteLength),
      "Content-Disposition": `attachment; filename="saadstudio-images-${timestamp}.zip"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

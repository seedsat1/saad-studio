import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { isSafePublicHttpUrl } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

type AspectRatio = "16:9" | "9:16";

const RATIO_DIMS: Record<AspectRatio, [number, number]> = {
  "16:9": [1280, 720],
  "9:16": [720, 1280],
};

async function getFfmpegPath(): Promise<string> {
  const staticMod = await import("ffmpeg-static");
  const ffmpegPath = (staticMod.default || staticMod) as unknown as string;
  try {
    fs.chmodSync(ffmpegPath, 0o755);
  } catch {}
  return ffmpegPath;
}

async function downloadToTemp(url: string, tmpDir: string, name: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Could not download ${name} video (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
  const filePath = path.join(tmpDir, `${name}.${safeExt}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(req: NextRequest) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-extend-stitch-"));

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as {
      sourceUrl?: string;
      continuationUrl?: string;
      aspectRatio?: AspectRatio;
      sourceDuration?: number | null;
      continuationDuration?: number | null;
    } | null;

    const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl : "";
    const continuationUrl = typeof body?.continuationUrl === "string" ? body.continuationUrl : "";
    if (!sourceUrl || !continuationUrl || !isSafePublicHttpUrl(sourceUrl) || !isSafePublicHttpUrl(continuationUrl)) {
      return NextResponse.json({ error: "Two public video URLs are required." }, { status: 400 });
    }

    const aspectRatio: AspectRatio = body?.aspectRatio === "9:16" ? "9:16" : "16:9";
    const [width, height] = RATIO_DIMS[aspectRatio];
    const sourceDuration = Number.isFinite(Number(body?.sourceDuration)) ? Math.max(0, Number(body?.sourceDuration)) : 0;
    const continuationDuration = Number.isFinite(Number(body?.continuationDuration)) ? Math.max(0, Number(body?.continuationDuration)) : 8;

    const [sourcePath, continuationPath] = await Promise.all([
      downloadToTemp(sourceUrl, tmpDir, "source"),
      downloadToTemp(continuationUrl, tmpDir, "continuation"),
    ]);
    const outputPath = path.join(tmpDir, "extended.mp4");
    const ffmpegPath = await getFfmpegPath();

    const videoFilter = [
      `[0:v]settb=AVTB,fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1,setsar=1,format=yuv420p[v0]`,
      `[1:v]settb=AVTB,fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1,setsar=1,format=yuv420p[v1]`,
      "[v0][v1]concat=n=2:v=1:a=0[vout]",
    ].join(";");

    await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-y",
        "-i",
        sourcePath,
        "-i",
        continuationPath,
        "-filter_complex",
        videoFilter,
        "-map",
        "[vout]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { timeout: 240_000, maxBuffer: 1024 * 1024 * 8 },
    );

    const outputBuffer = fs.readFileSync(outputPath);
    const extendedUrl = await uploadBufferToStorage({
      buffer: outputBuffer,
      contentType: "video/mp4",
      userId,
      assetType: "video",
      generationId: `video-extend-${crypto.randomUUID()}`,
    });

    if (!extendedUrl) throw new Error("Could not upload the extended video.");

    return NextResponse.json({
      extendedUrl,
      duration: sourceDuration + continuationDuration || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not stitch the extended video.";
    console.error("[video-extend/stitch]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

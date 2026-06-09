import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { isSafePublicHttpUrl } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);

async function downloadToTemp(url: string, tmpDir: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Could not download source video (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
  const filePath = path.join(tmpDir, `source.${safeExt}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(req: NextRequest) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-extend-frame-"));

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as { videoUrl?: string } | null;
    const videoUrl = typeof body?.videoUrl === "string" ? body.videoUrl : "";
    if (!videoUrl || !isSafePublicHttpUrl(videoUrl)) {
      return NextResponse.json({ error: "A public source video URL is required." }, { status: 400 });
    }

    const inputPath = await downloadToTemp(videoUrl, tmpDir);
    const framePath = path.join(tmpDir, "last-frame.jpg");
    const ffmpegPath = await getFfmpegPath();

    await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-y",
        "-sseof",
        "-0.08",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        framePath,
      ],
      { timeout: 90_000, maxBuffer: 1024 * 1024 * 4 },
    );

    const frameBuffer = fs.readFileSync(framePath);
    const frameUrl = await uploadBufferToStorage({
      buffer: frameBuffer,
      contentType: "image/jpeg",
      userId,
      assetType: "thumbnail",
      generationId: `video-extend-frame-${crypto.randomUUID()}`,
    });

    if (!frameUrl) throw new Error("Could not upload extracted frame.");

    return NextResponse.json({ frameUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not extract the last frame.";
    console.error("[video-extend/last-frame]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

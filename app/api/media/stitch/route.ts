import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes

const execFileAsync = promisify(execFile);

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str);
}

async function downloadToTemp(url: string, tmpDir: string, name: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Failed to download ${name}.`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
  const dest = path.join(tmpDir, `${name}.${safeExt}`);
  fs.writeFileSync(dest, buffer);
  return dest;
}

export async function POST(req: NextRequest) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-stitch-"));
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoUrl, audioUrl } = await req.json().catch(() => ({}));
    if (!videoUrl || !audioUrl || !isUrl(videoUrl) || !isUrl(audioUrl)) {
      return NextResponse.json(
        { error: "Both videoUrl and audioUrl are required public URLs." },
        { status: 400 }
      );
    }

    // Download assets to temp directory
    const videoPath = await downloadToTemp(videoUrl, tmpDir, "video");
    const audioPath = await downloadToTemp(audioUrl, tmpDir, "audio");
    const outputPath = path.join(tmpDir, "output.mp4");

    // Execute FFmpeg to stitch audio and video
    const ffmpegPath = await getFfmpegPath();
    const args = [
      "-hide_banner",
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-map", "0:v:0",
      "-map", "1:a:0",
      outputPath
    ];

    await execFileAsync(ffmpegPath, args, { timeout: 90_000 });

    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg failed to produce output file.");
    }

    const outputBuffer = fs.readFileSync(outputPath);
    const resultUrl = await uploadBufferToStorage({
      buffer: outputBuffer,
      contentType: "video/mp4",
      userId,
      assetType: "video",
      generationId: `media-stitch-${Date.now()}`,
    });

    if (!resultUrl) {
      throw new Error("Failed to upload stitched media to storage.");
    }

    return NextResponse.json({ url: resultUrl });
  } catch (err: any) {
    console.error("[media/stitch] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Media stitch failed" },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files and directory
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("[media/stitch] cleanup error:", e);
    }
  }
}

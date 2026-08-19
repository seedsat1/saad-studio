import { NextRequest } from "next/server";
import { getFallbackUrls } from "@/lib/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import { isMp3Buffer, transcodeToMp3 } from "@/lib/server/audio-transcode";

const execFileAsync = promisify(execFile);

async function transcodeAudio(inputBuffer: any, inputExt: string, targetExt: string): Promise<any> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-transcode-"));
  const inputPath = path.join(tmpDir, `input.${inputExt}`);
  const outputPath = path.join(tmpDir, `output.${targetExt}`);
  
  try {
    fs.writeFileSync(inputPath, inputBuffer);
    const ffmpegPath = await getFfmpegPath();
    
    let args: string[] = [];
    if (targetExt === "mp3") {
      args = [
        "-hide_banner",
        "-y",
        "-i", inputPath,
        "-codec:a", "libmp3lame",
        "-qscale:a", "2",
        outputPath
      ];
    } else if (targetExt === "wav") {
      args = [
        "-hide_banner",
        "-y",
        "-i", inputPath,
        outputPath
      ];
    } else {
      args = [
        "-hide_banner",
        "-y",
        "-i", inputPath,
        outputPath
      ];
    }
    
    await execFileAsync(ffmpegPath, args, { timeout: 30_000 });
    
    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg failed to transcode audio.");
    }
    
    return fs.readFileSync(outputPath);
  } finally {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download";

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const urlsToTry = getFallbackUrls(targetUrl, true);

    let res: Response | null = null;
    let finalTargetUrl = targetUrl;

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, { method: "GET" });
        if (response.ok) {
          res = response;
          finalTargetUrl = url;
          break;
        }
      } catch (err) {
        console.warn(`[DOWNLOAD_ROUTE] Failed to fetch from ${url}:`, err);
      }
    }

    if (!res) {
      return new Response("Failed to fetch file from any storage location", { status: 404 });
    }

    const parsed = new URL(finalTargetUrl);
    const lowercaseUrl = finalTargetUrl.toLowerCase();
    const contentType = res.headers.get("Content-Type")?.toLowerCase() || "";

    // Guess the source format (srcExt) and extension (ext) with robust checks
    let srcExt = "";
    if (lowercaseUrl.includes(".mp3") || contentType.includes("mpeg") || contentType.includes("mp3")) {
      srcExt = "mp3";
    } else if (lowercaseUrl.includes(".wav") || contentType.includes("wav") || contentType.includes("wave")) {
      srcExt = "wav";
    } else if (lowercaseUrl.includes(".mp4") || contentType.includes("mp4")) {
      srcExt = "mp4";
    } else if (lowercaseUrl.includes(".mov") || contentType.includes("quicktime")) {
      srcExt = "mov";
    } else if (lowercaseUrl.includes(".png") || contentType.includes("png")) {
      srcExt = "png";
    } else if (lowercaseUrl.includes(".jpg") || lowercaseUrl.includes(".jpeg") || contentType.includes("jpeg") || contentType.includes("jpg")) {
      srcExt = "jpg";
    } else if (lowercaseUrl.includes(".webp") || contentType.includes("webp")) {
      srcExt = "webp";
    } else if (lowercaseUrl.includes(".gif") || contentType.includes("gif")) {
      srcExt = "gif";
    }

    let ext = srcExt ? `.${srcExt}` : "";

    // Determine requested target format
    let targetExt = "";
    if (filename.toLowerCase().endsWith(".mp3")) targetExt = "mp3";
    else if (filename.toLowerCase().endsWith(".wav")) targetExt = "wav";

    let fileBuffer: Buffer = Buffer.from(await res.arrayBuffer());
    let responseContentType = res.headers.get("Content-Type") || "application/octet-stream";

    // Transcode audio on the fly if needed (MP3 <-> WAV)
    if (targetExt === "mp3" || (srcExt === "wav" && targetExt !== "wav")) {
      try {
        if (!isMp3Buffer(fileBuffer)) {
          console.log(`[DOWNLOAD_TRANSCODE] Transcoding to MP3 (192kbps)`);
          fileBuffer = (await transcodeToMp3(fileBuffer, { bitrate: "192k", sampleRate: 44100 })) as any;
        }
        responseContentType = "audio/mpeg";
        ext = ".mp3";
      } catch (transcodeErr) {
        console.error("[DOWNLOAD_TRANSCODE_FAILED] Fallback to raw buffer", transcodeErr);
      }
    } else if (targetExt === "wav" && srcExt === "mp3") {
      try {
        console.log(`[DOWNLOAD_TRANSCODE] Transcoding to WAV`);
        fileBuffer = (await transcodeAudio(fileBuffer, "mp3", "wav")) as any;
        responseContentType = "audio/wav";
        ext = ".wav";
      } catch (transcodeErr) {
        console.error("[DOWNLOAD_TRANSCODE_FAILED] Fallback to raw buffer", transcodeErr);
      }
    }

    let finalFilename = filename.replace(/[\\\/:*?"<>|]/g, "_").trim() || "audio_download.mp3";
    if (ext && !finalFilename.toLowerCase().endsWith(ext)) {
      const otherExt = ext === ".mp3" ? ".wav" : ".mp3";
      if (finalFilename.toLowerCase().endsWith(otherExt)) {
        finalFilename = finalFilename.slice(0, -otherExt.length) + ext;
      } else {
        finalFilename = `${finalFilename}${ext}`;
      }
    }

    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    headers.set("Content-Type", responseContentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("[api/download] Proxy error", err);
    return new Response(`Download error: ${err.message}`, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { getFallbackUrls } from "@/lib/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";

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
    const urlsToTry = (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))
      ? [targetUrl]
      : getFallbackUrls(targetUrl);

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

    // Try to guess the extension from the URL path first
    let ext = "";
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.endsWith(".mp3")) ext = ".mp3";
    else if (pathname.endsWith(".wav")) ext = ".wav";
    else if (pathname.endsWith(".mp4")) ext = ".mp4";
    else if (pathname.endsWith(".mov")) ext = ".mov";
    else if (pathname.endsWith(".png")) ext = ".png";
    else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) ext = ".jpg";
    else if (pathname.endsWith(".webp")) ext = ".webp";
    else if (pathname.endsWith(".gif")) ext = ".gif";

    // If not found in URL path, fallback to Content-Type header
    if (!ext) {
      const contentType = res.headers.get("Content-Type")?.toLowerCase() || "";
      if (contentType.includes("image/png")) ext = ".png";
      else if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) ext = ".jpg";
      else if (contentType.includes("image/webp")) ext = ".webp";
      else if (contentType.includes("image/gif")) ext = ".gif";
      else if (contentType.includes("video/mp4")) ext = ".mp4";
      else if (contentType.includes("video/quicktime")) ext = ".mov";
      else if (contentType.includes("audio/mpeg") || contentType.includes("audio/mp3")) ext = ".mp3";
      else if (contentType.includes("audio/wav")) ext = ".wav";
    }

    // Clean up filename by removing illegal OS characters, and make sure it has the correct extension
    const srcExt = ext ? ext.replace(".", "").toLowerCase() : "";
    let targetExt = "";
    if (filename.toLowerCase().endsWith(".mp3")) targetExt = "mp3";
    else if (filename.toLowerCase().endsWith(".wav")) targetExt = "wav";

    let fileBuffer = Buffer.from(await res.arrayBuffer());
    let responseContentType = res.headers.get("Content-Type") || "application/octet-stream";

    // Transcode audio on the fly if needed (MP3 <-> WAV)
    if (targetExt && srcExt && srcExt !== targetExt && (srcExt === "mp3" || srcExt === "wav") && (targetExt === "mp3" || targetExt === "wav")) {
      try {
        console.log(`[DOWNLOAD_TRANSCODE] Transcoding from ${srcExt} to ${targetExt}`);
        fileBuffer = (await transcodeAudio(fileBuffer, srcExt, targetExt)) as any;
        responseContentType = targetExt === "wav" ? "audio/wav" : "audio/mpeg";
        ext = `.${targetExt}`;
      } catch (transcodeErr) {
        console.error("[DOWNLOAD_TRANSCODE_FAILED] Fallback to raw buffer", transcodeErr);
      }
    }

    let finalFilename = filename.replace(/[\\\/:*?"<>|]/g, "_").trim() || "download";
    if (ext && !finalFilename.toLowerCase().endsWith(ext)) {
      const otherExt = ext === ".mp3" ? ".wav" : ".mp3";
      if (finalFilename.toLowerCase().endsWith(otherExt)) {
        finalFilename = finalFilename.slice(0, -otherExt.length) + ext;
      } else {
        finalFilename = `${finalFilename}${ext}`;
      }
    }

    const headers = new Headers();
    // Force browser to download the file directly using standard RFC 6266
    headers.set("Content-Disposition", `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    headers.set("Content-Type", responseContentType);
    
    // Explicitly allow same-origin requests
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("[api/download] Proxy error", err);
    return new Response(`Download error: ${err.message}`, { status: 500 });
  }
}

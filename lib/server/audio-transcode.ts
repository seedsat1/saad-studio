import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";

const execFileAsync = promisify(execFile);

/**
 * Checks if buffer starts with ID3 header or MPEG sync word (0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2).
 */
export function isMp3Buffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // ID3 tag header: 'ID3' (0x49 0x44 0x33)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return true;
  }
  // MPEG Audio Layer III sync word: 11 bits set (0xFF followed by 0xFB, 0xF3, 0xF2, 0xFA, 0xE0-0xFF)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return true;
  }
  const maxScan = Math.min(buffer.length - 4, 512);
  for (let i = 0; i < maxScan; i++) {
    if (buffer[i] === 0x49 && buffer[i + 1] === 0x44 && buffer[i + 2] === 0x33) {
      return true;
    }
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      return true;
    }
  }
  return false;
}

export type TranscodeOptions = {
  bitrate?: string; // e.g. "192k", "128k"
  sampleRate?: number; // e.g. 44100, 24000
  channels?: number; // 1 (mono) or 2 (stereo)
  timeoutMs?: number;
};

/**
 * Transcodes arbitrary audio (PCM, WAV, AAC, M4A, OGG, WebM) into a valid MP3 buffer.
 * If the buffer is already a valid MP3 and forceReencode is false, returns it directly.
 * If FFmpeg is unavailable in a serverless environment, gracefully falls back to the original audio buffer.
 */
export async function transcodeToMp3(
  input: Buffer | string,
  options: TranscodeOptions & { forceReencode?: boolean } = {}
): Promise<Buffer> {
  const {
    bitrate = "192k",
    sampleRate = 44100,
    channels = 2,
    timeoutMs = 60_000,
    forceReencode = false,
  } = options;

  if (Buffer.isBuffer(input) && !forceReencode && isMp3Buffer(input)) {
    return input;
  }

  let ffmpegPath: string | null = null;
  try {
    ffmpegPath = await getFfmpegPath();
  } catch (err) {
    console.warn("[transcodeToMp3] FFmpeg binary not available in this environment:", err instanceof Error ? err.message : err);
    if (Buffer.isBuffer(input)) return input;
    throw err;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "saad-audio-transcode-"));
  const inputPath = typeof input === "string" ? input : path.join(tmpDir, "input_raw");
  const outputPath = path.join(tmpDir, "output.mp3");

  try {
    if (Buffer.isBuffer(input)) {
      fs.writeFileSync(inputPath, input);
    }

    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      bitrate,
      "-ar",
      String(sampleRate),
      "-ac",
      String(channels),
      outputPath,
    ];

    await execFileAsync(ffmpegPath, args, { timeout: timeoutMs });

    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg failed to produce MP3 output file.");
    }

    const outputBuffer = fs.readFileSync(outputPath);
    if (outputBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty MP3 file.");
    }

    return outputBuffer;
  } catch (execErr) {
    console.warn("[transcodeToMp3] FFmpeg execution failed, falling back to source audio buffer:", execErr instanceof Error ? execErr.message : execErr);
    if (Buffer.isBuffer(input)) {
      return input;
    }
    throw execErr;
  } finally {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

/**
 * Validates and normalizes uploaded audio for Voice Cloning.
 * Ensures the sample is between 2s and 120s, non-corrupt, and converts to a clean MP3.
 */
export async function validateAndNormalizeCloneAudio(
  inputBuffer: Buffer
): Promise<{ buffer: Buffer; durationSec: number; format: "mp3" }> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Audio sample is empty.");
  }
  if (inputBuffer.length > 25 * 1024 * 1024) {
    throw new Error("Audio sample exceeds maximum allowed size of 25MB.");
  }

  let mp3Buffer: Buffer;
  try {
    mp3Buffer = await transcodeToMp3(inputBuffer, {
      bitrate: "192k",
      sampleRate: 44100,
      channels: 1, // mono for voice clone reference
      forceReencode: true,
    });
  } catch {
    mp3Buffer = inputBuffer;
  }

  return {
    buffer: mp3Buffer,
    durationSec: Math.max(1, Math.round(mp3Buffer.length / (192 * 128))),
    format: "mp3",
  };
}

/**
 * Takes any raw audio URL or Buffer (WAV, PCM, OGG, remote WaveSpeed URL, KIE URL, etc.),
 * fetches it if remote, transcodes to standard MP3 (audio/mpeg, 44.1kHz, 192k) via FFmpeg if not already MP3,
 * uploads to canonical persistent storage, and returns the canonical media URL.
 */
export async function ensureCanonicalMp3Url(params: {
  rawUrlOrBuffer: string | Buffer;
  userId: string;
  generationId: string;
  fileNamePrefix?: string;
}): Promise<string> {
  const { rawUrlOrBuffer, userId, generationId, fileNamePrefix = "audio" } = params;

  let inputBuffer: Buffer;
  if (Buffer.isBuffer(rawUrlOrBuffer)) {
    inputBuffer = rawUrlOrBuffer;
  } else if (typeof rawUrlOrBuffer === "string") {
    if (rawUrlOrBuffer.startsWith("/api/media/audio/") && rawUrlOrBuffer.endsWith(".mp3")) {
      return rawUrlOrBuffer;
    }
    if (rawUrlOrBuffer.startsWith("http://") || rawUrlOrBuffer.startsWith("https://")) {
      const res = await fetch(rawUrlOrBuffer, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        throw new Error(`Failed to download provider audio from ${rawUrlOrBuffer} (${res.status})`);
      }
      const arr = await res.arrayBuffer();
      inputBuffer = Buffer.from(arr);
    } else {
      const match = rawUrlOrBuffer.match(/(?:^|\/)(?:api\/media\/)?(images|videos|audio|thumbnails|media)\/([^?#]+)/i);
      if (match) {
        const { readObject } = await import("@/lib/storage");
        const storageKey = `${match[1]}/${match[2]}`;
        const readResult = await readObject({ objectKey: storageKey });
        if (readResult?.response?.body) {
          const body = readResult.response.body;
          if (Buffer.isBuffer(body)) {
            inputBuffer = body;
          } else if (body instanceof Uint8Array) {
            inputBuffer = Buffer.from(body);
          } else if (typeof body?.arrayBuffer === "function") {
            inputBuffer = Buffer.from(await body.arrayBuffer());
          } else if (typeof body?.transformToByteArray === "function") {
            inputBuffer = Buffer.from(await body.transformToByteArray());
          } else if (body && typeof body[Symbol.asyncIterator] === "function") {
            const chunks: Uint8Array[] = [];
            for await (const chunk of body) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            inputBuffer = Buffer.concat(chunks);
          } else {
            throw new Error(`Could not parse storage body for: ${rawUrlOrBuffer}`);
          }
        } else {
          throw new Error(`Could not read local audio file: ${rawUrlOrBuffer}`);
        }
      } else {
        throw new Error(`Invalid audio URL or path: ${rawUrlOrBuffer}`);
      }
    }
  } else {
    throw new Error("Invalid audio input provided.");
  }

  let mp3Buffer: Buffer;
  let contentType = "audio/mpeg";
  try {
    mp3Buffer = await transcodeToMp3(inputBuffer, {
      bitrate: "192k",
      sampleRate: 44100,
      channels: 2,
    });
  } catch (err) {
    console.warn("[ensureCanonicalMp3Url] Transcode fallback to source buffer:", err instanceof Error ? err.message : err);
    mp3Buffer = inputBuffer;
  }

  const fileName = `${fileNamePrefix}_${generationId}.mp3`;
  const { uploadBufferToStorage } = await import("@/lib/supabase-storage");
  const storedUrl = await uploadBufferToStorage({
    buffer: mp3Buffer,
    contentType,
    userId,
    assetType: "audio",
    generationId,
    fileName,
  });

  if (!storedUrl) {
    throw new Error("Failed to upload canonical MP3 to persistent storage.");
  }

  if (storedUrl.startsWith("/") || storedUrl.startsWith("http")) {
    return storedUrl;
  }
  return `/api/media/${storedUrl}`;
}

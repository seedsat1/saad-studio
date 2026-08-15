import { evalES } from "../../cep";

export interface SilenceRange {
  start: number;
  end: number;
  duration: number;
}

export interface SilenceTrackInfo {
  type: "video" | "audio";
  index: number;
  name: string;
}

function getSyncNodeRuntime() {
  const nodeRequire = window.cep_node?.require as any;
  return {
    fs: nodeRequire ? nodeRequire("fs") as typeof import("fs") : null as any,
    path: nodeRequire ? nodeRequire("path") as typeof import("path") : null as any,
    os: nodeRequire ? nodeRequire("os") as typeof import("os") : null as any,
    cp: nodeRequire ? nodeRequire("child_process") as typeof import("child_process") : null as any,
  };
}

function resolveFfmpegPath(fs: any, path: any): string | null {
  if (!window.__adobe_cep__) return null;
  const ext = window.__adobe_cep__.getSystemPath("extension");
  const candidates: string[] = [];
  const name = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  candidates.push(path.join(ext, "client", "lib", name));
  candidates.push(path.join(ext, "tools", "ffmpeg", name));
  candidates.push(path.join(ext, "ffmpeg.exe"));
  candidates.push(path.join(ext, "lib", name));
  candidates.push(path.join(ext, "client", "node", name));
  candidates.push(path.join(ext, "node", name));
  candidates.push("C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\app.saadstudio.cep\\tools\\ffmpeg\\ffmpeg.exe");
  candidates.push("C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions\\app.saadstudio.cep\\tools\\ffmpeg\\ffmpeg.exe");
  
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "ffmpeg";
}

function runFFmpeg(cp: any, ffmpegPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn(ffmpegPath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: any) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: any) => { stderr += d.toString(); });
    proc.on("error", (err: any) => { reject(err); });
    proc.on("close", (code: number) => {
      if (code === 0) {
        resolve(stderr); // FFmpeg writes outputs/diagnostics to stderr
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr}`));
      }
    });
  });
}

function parseSilenceDetect(stderr: string) {
  const silences: { start: number; end: number; duration: number }[] = [];
  const lines = stderr.split("\n");
  let current: any = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startM = line.match(/silence_start:\s*([\d.]+)/);
    if (startM) {
      current = { start: parseFloat(startM[1]) };
      continue;
    }
    const endM = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
    if (endM && current !== null) {
      current.end = parseFloat(endM[1]);
      current.duration = parseFloat(endM[2]);
      silences.push(current);
      current = null;
    }
  }
  return silences;
}

export async function detectSilenceOnTrack(
  trackType: "audio" | "video",
  trackIndex: number,
  thresholdDb: number,
  minDurationSec: number,
  paddingSec: number
): Promise<{
  mediaPath: string;
  clipMap: any[];
  silences: SilenceRange[];
  peaks: number[];
  duration: number;
}> {
  const runtime = getSyncNodeRuntime();
  if (!runtime.fs || !runtime.path || !runtime.cp || !runtime.os) {
    throw new Error("Node integration not available. Ensure you are running inside Adobe Premiere CEP panel.");
  }

  const ffmpegPath = resolveFfmpegPath(runtime.fs, runtime.path);
  if (!ffmpegPath) {
    throw new Error("FFmpeg binary not found. Please verify your installation.");
  }

  // 1. Gather all clips on the chosen track
  const rawClips = await evalES<any[]>("getAudioTrackClips", trackType, trackIndex);
  if (!rawClips || rawClips.length === 0) {
    throw new Error("No clips found on the selected track.");
  }

  // 2. Concatenate clips into a single wave file
  const tmpDir = runtime.os.tmpdir();
  const outPath = runtime.path.join(tmpDir, `saad_silence_audio.wav`).replace(/\\/g, "/");

  const segPaths: string[] = [];
  const clipMap: any[] = [];
  let concatOffset = 0;
  let silentIdx = 0;

  for (let i = 0; i < rawClips.length; i++) {
    const clip = rawClips[i];
    if (!runtime.fs.existsSync(clip.sourceFile)) {
      throw new Error(`Source file not found: ${clip.sourceFile}`);
    }

    // Pad gap between previous clip's timeline end and this clip's start.
    if (i > 0) {
      const prev = rawClips[i - 1];
      const prevEnd = prev.timelineStart + (prev.srcOut - prev.srcIn);
      const gap = clip.timelineStart - prevEnd;
      if (gap > 0.001) {
        const silPath = runtime.path.join(tmpDir, `saad_sil_${silentIdx++}.wav`);
        await runFFmpeg(runtime.cp, ffmpegPath, [
          "-y",
          "-f", "lavfi",
          "-i", "anullsrc=r=16000:cl=mono",
          "-t", gap.toFixed(3),
          "-acodec", "pcm_s16le",
          silPath
        ]);
        if (!runtime.fs.existsSync(silPath)) throw new Error("Silence pad not created.");
        segPaths.push(silPath);
        concatOffset += gap;
      }
    }

    const segPath = runtime.path.join(tmpDir, `saad_seg_${i}.wav`);
    await runFFmpeg(runtime.cp, ffmpegPath, [
      "-y",
      "-ss", String(clip.srcIn),
      "-to", String(clip.srcOut),
      "-i", clip.sourceFile,
      "-vn",
      "-acodec", "pcm_s16le",
      "-ar", "16000",
      "-ac", "1",
      segPath
    ]);
    if (!runtime.fs.existsSync(segPath)) throw new Error(`Segment ${i} not created.`);
    const segDuration = clip.srcOut - clip.srcIn;
    clipMap.push({
      concatStart: concatOffset,
      concatEnd: concatOffset + segDuration,
      timelineStart: clip.timelineStart
    });
    concatOffset += segDuration;
    segPaths.push(segPath);
  }

  // Write FFmpeg concat list
  const concatListPath = runtime.path.join(tmpDir, "saad_concat.txt");
  const concatContent = segPaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  runtime.fs.writeFileSync(concatListPath, concatContent, "utf8");

  await runFFmpeg(runtime.cp, ffmpegPath, [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath,
    "-acodec", "pcm_s16le",
    outPath
  ]);

  // Cleanup segment files
  segPaths.forEach(p => {
    try { runtime.fs.unlinkSync(p); } catch {}
  });
  try { runtime.fs.unlinkSync(concatListPath); } catch {}

  // 3. Detect silences
  const filter = `silencedetect=noise=${thresholdDb}dB:d=${minDurationSec}`;
  const stderr = await runFFmpeg(runtime.cp, ffmpegPath, ["-i", outPath, "-af", filter, "-f", "null", "-"]);
  const rawSilences = parseSilenceDetect(stderr);

  // 4. Translate silence ranges to timeline ranges using clipMap
  const translatedRanges: SilenceRange[] = [];
  
  function splitToTimelineRanges(cStart: number, cEnd: number): { start: number; end: number }[] {
    if (cEnd <= cStart) return [];
    if (!clipMap || !clipMap.length) {
      return [{ start: cStart, end: cEnd }];
    }
    const out: { start: number; end: number }[] = [];
    for (let i = 0; i < clipMap.length; i++) {
      const cm = clipMap[i];
      const os = Math.max(cStart, cm.concatStart);
      const oe = Math.min(cEnd, cm.concatEnd);
      if (oe > os) {
        out.push({
          start: cm.timelineStart + (os - cm.concatStart),
          end: cm.timelineStart + (oe - cm.concatStart)
        });
      }
    }
    return out;
  }

  for (const s of rawSilences) {
    const cs = s.start + paddingSec;
    const ce = s.end - paddingSec;
    if (ce <= cs) continue;
    const parts = splitToTimelineRanges(cs, ce);
    for (const part of parts) {
      translatedRanges.push({
        start: part.start,
        end: part.end,
        duration: part.end - part.start
      });
    }
  }

  // 5. Generate waveform peaks (800 points)
  const probe = await runFFmpeg(runtime.cp, ffmpegPath, ["-i", outPath, "-f", "null", "-"]);
  const durMatch = probe.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const fullDuration = durMatch
    ? parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3])
    : 0;
  
  const points = 800;
  const sampleRate = Math.max(100, Math.ceil((points * 4) / (fullDuration || 1)));
  const tmpPcm = runtime.path.join(tmpDir, `saad_waveform_${Date.now()}.raw`);

  await runFFmpeg(runtime.cp, ffmpegPath, [
    "-y",
    "-i", outPath,
    "-vn", "-ac", "1", "-ar", String(sampleRate),
    "-f", "f32le", tmpPcm
  ]);

  const buf = runtime.fs.readFileSync(tmpPcm);
  try { runtime.fs.unlinkSync(tmpPcm); } catch {}

  const totalSamples = buf.length / 4;
  const chunkSize = Math.max(1, Math.floor(totalSamples / points));
  const peaks: number[] = [];
  for (let i = 0; i < points; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalSamples);
    let peak = 0;
    for (let s = start; s < end; s++) {
      const v = Math.abs(buf.readFloatLE(s * 4));
      if (v > peak) peak = v;
    }
    peaks.push(peak);
  }

  const maxPeak = peaks.reduce((m, v) => Math.max(m, v), 0.0001);
  const normalizedPeaks = peaks.map(v => v / maxPeak);

  return {
    mediaPath: outPath,
    clipMap,
    silences: translatedRanges,
    peaks: normalizedPeaks,
    duration: fullDuration
  };
}

export async function detectSilenceOnCachedWav(
  mediaPath: string,
  clipMap: any[],
  thresholdDb: number,
  minDurationSec: number,
  paddingSec: number
): Promise<SilenceRange[]> {
  const runtime = getSyncNodeRuntime();
  const ffmpegPath = resolveFfmpegPath(runtime.fs, runtime.path);
  if (!ffmpegPath) throw new Error("FFmpeg not found");

  const filter = `silencedetect=noise=${thresholdDb}dB:d=${minDurationSec}`;
  const stderr = await runFFmpeg(runtime.cp, ffmpegPath, ["-i", mediaPath, "-af", filter, "-f", "null", "-"]);
  const rawSilences = parseSilenceDetect(stderr);

  const translatedRanges: SilenceRange[] = [];
  
  function splitToTimelineRanges(cStart: number, cEnd: number): { start: number; end: number }[] {
    if (cEnd <= cStart) return [];
    if (!clipMap || !clipMap.length) {
      return [{ start: cStart, end: cEnd }];
    }
    const out: { start: number; end: number }[] = [];
    for (let i = 0; i < clipMap.length; i++) {
      const cm = clipMap[i];
      const os = Math.max(cStart, cm.concatStart);
      const oe = Math.min(cEnd, cm.concatEnd);
      if (oe > os) {
        out.push({
          start: cm.timelineStart + (os - cm.concatStart),
          end: cm.timelineStart + (oe - cm.concatStart)
        });
      }
    }
    return out;
  }

  for (const s of rawSilences) {
    const cs = s.start + paddingSec;
    const ce = s.end - paddingSec;
    if (ce <= cs) continue;
    const parts = splitToTimelineRanges(cs, ce);
    for (const part of parts) {
      translatedRanges.push({
        start: part.start,
        end: part.end,
        duration: part.end - part.start
      });
    }
  }

  return translatedRanges;
}

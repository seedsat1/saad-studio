import { NextRequest, NextResponse } from 'next/server';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import Ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

Ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const FPS = 30;

interface Clip {
  id: string;
  track: number;
  start: number;
  dur: number;
  label: string;
  src: string;
  kind: string;
}

interface TrackInfo {
  id: string;
  type: string;
  muted: boolean;
  volume: number;
}

function sec(frames: number) {
  return frames / FPS;
}

async function downloadToTemp(url: string, tmpDir: string, idx: number): Promise<string | null> {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'mp4';
    const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'mp4';
    const destPath = path.join(tmpDir, `asset_${idx}.${safeExt}`);
    fs.writeFileSync(destPath, buf);
    return destPath;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { clips?: Clip[]; tracks?: TrackInfo[]; width?: number; height?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clips = [], tracks = [], width = 1920, height = 1080 } = body;
  if (!clips.length) {
    return NextResponse.json({ error: 'No clips provided' }, { status: 400 });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-export-'));
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    // Separate video and audio clips, skip blobs
    const videoClips = clips.filter((c) => {
      const tr = tracks[c.track];
      return tr?.type === 'video' && !tr.muted && c.src && !c.src.startsWith('blob:');
    }).sort((a, b) => a.start - b.start);

    const audioClips = clips.filter((c) => {
      const tr = tracks[c.track];
      return tr?.type === 'audio' && !tr.muted && c.src && !c.src.startsWith('blob:');
    }).sort((a, b) => a.start - b.start);

    const allClips = [...videoClips, ...audioClips];
    if (!allClips.length) {
      return NextResponse.json({ error: 'No downloadable clips found (blob URLs not supported)' }, { status: 400 });
    }

    // Download all media
    const urlToLocal = new Map<string, string | null>();
    const uniqueUrls = [...new Set(allClips.map((c) => c.src))];
    await Promise.all(uniqueUrls.map(async (url, i) => {
      const localPath = await downloadToTemp(url, tmpDir, i);
      urlToLocal.set(url, localPath);
    }));

    const maxEndFrame = clips.reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
    const totalSec = Math.max(3, sec(maxEndFrame)).toFixed(3);

    // Build FFmpeg inputs list (unique local paths)
    const localFiles: string[] = [];
    const urlToInputIdx = new Map<string, number>();
    for (const url of uniqueUrls) {
      const local = urlToLocal.get(url);
      if (local) {
        urlToInputIdx.set(url, localFiles.length);
        localFiles.push(local);
      }
    }

    if (!localFiles.length) {
      return NextResponse.json({ error: 'All media downloads failed' }, { status: 500 });
    }

    // Build filter_complex
    const filterParts: string[] = [];
    let currentVideo = '';
    let videoIdx = 0;

    // Create base canvas
    filterParts.push(`nullsrc=s=${width}x${height}:d=${totalSec}:r=${FPS},format=yuv420p[base]`);
    currentVideo = 'base';

    for (const clip of videoClips) {
      const inputIdx = urlToInputIdx.get(clip.src);
      if (inputIdx === undefined) continue;
      const clipStartSec = sec(clip.start).toFixed(3);
      const clipDurSec = sec(clip.dur).toFixed(3);
      const clipEndSec = sec(clip.start + clip.dur).toFixed(3);
      const vTag = `vcl${videoIdx}`;

      filterParts.push(
        `[${inputIdx}:v]trim=duration=${clipDurSec},setpts=PTS-STARTPTS+${clipStartSec}/TB,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1,format=yuv420p[${vTag}]`
      );
      const compTag = `comp${videoIdx}`;
      filterParts.push(
        `[${currentVideo}][${vTag}]overlay=enable='between(t,${clipStartSec},${clipEndSec})':shortest=0[${compTag}]`
      );
      currentVideo = compTag;
      videoIdx++;
    }

    // Audio mixing
    const audioTags: string[] = [];
    let audioIdx = 0;
    for (const clip of audioClips) {
      const inputIdx = urlToInputIdx.get(clip.src);
      if (inputIdx === undefined) continue;
      const tr = tracks[clip.track];
      const vol = tr?.volume ?? 1;
      const clipDurSec = sec(clip.dur).toFixed(3);
      const delayMs = Math.round(sec(clip.start) * 1000);
      const aTag = `acl${audioIdx}`;
      filterParts.push(
        `[${inputIdx}:a]atrim=duration=${clipDurSec},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${vol.toFixed(3)}[${aTag}]`
      );
      audioTags.push(`[${aTag}]`);
      audioIdx++;
    }

    let audioOut = '';
    if (audioTags.length > 1) {
      audioOut = 'aout';
      filterParts.push(`${audioTags.join('')}amix=inputs=${audioTags.length}:duration=longest:dropout_transition=0[${audioOut}]`);
    } else if (audioTags.length === 1) {
      audioOut = audioTags[0].slice(1, -1); // strip brackets
    }

    const filterComplex = filterParts.join('; ');

    // Build and run FFmpeg command
    await new Promise<void>((resolve, reject) => {
      let cmd = Ffmpeg();
      localFiles.forEach((f) => cmd.input(f));

      cmd
        .complexFilter(filterComplex)
        .outputOptions([
          `-map [${currentVideo}]`,
          ...(audioOut ? [`-map [${audioOut}]`] : []),
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k',
          '-movflags +faststart',
          '-y',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Stream the output file back
    const videoBuffer = fs.readFileSync(outputPath);
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="export_${Date.now()}.mp4"`,
        'Content-Length': String(videoBuffer.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Export failed: ${msg}` }, { status: 500 });
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

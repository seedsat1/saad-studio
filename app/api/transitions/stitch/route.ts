import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import prismadb from "@/lib/prismadb";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import {
  InsufficientCreditsError,
  refundGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { calcTransitionCredits, getPresetById } from "@/lib/transition-presets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const RATIO_DIMS: Record<string, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "4:3": [1440, 1080],
  "3:4": [1080, 1440],
  "21:9": [1920, 824],
};

function isPublicVideoUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && /\.(mp4|mov|webm|mkv|m4v)(\?|#|$)/i.test(url);
}

function safeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveXfadeTransition(presetId: string): string {
  const id = presetId.toLowerCase();
  if (id.includes("smoke") || id.includes("raven") || id.includes("shadow")) return "fadeblack";
  if (id.includes("water") || id.includes("splash")) return "wipeleft";
  if (id.includes("fire") || id.includes("flame") || id.includes("lava")) return "wipeleft";
  if (id.includes("camera") || id.includes("flying") || id.includes("jump")) return "slideleft";
  if (id.includes("hole") || id.includes("display")) return "circleopen";
  if (id.includes("column")) return "wipeup";
  return "fade";
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

async function runFfmpeg(args: string[]) {
  const ffmpegPath = await getFfmpegPath();
  await execFileAsync(ffmpegPath, args, { timeout: 240_000, maxBuffer: 1024 * 1024 * 8 });
}

async function renderTransition(params: {
  inputAPath: string;
  inputBPath: string;
  outputPath: string;
  width: number;
  height: number;
  transition: string;
  transitionDuration: number;
  inputADuration: number;
}) {
  const transitionDuration = Math.max(0.4, Math.min(3, params.transitionDuration));
  const offset = Math.max(0.1, params.inputADuration - transitionDuration);
  const videoFilter = [
    `[0:v]settb=AVTB,fps=30,scale=${params.width}:${params.height}:force_original_aspect_ratio=decrease,pad=${params.width}:${params.height}:-1:-1,format=yuv420p[v0]`,
    `[1:v]settb=AVTB,fps=30,scale=${params.width}:${params.height}:force_original_aspect_ratio=decrease,pad=${params.width}:${params.height}:-1:-1,format=yuv420p[v1]`,
    `[v0][v1]xfade=transition=${params.transition}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)},format=yuv420p[vout]`,
  ].join(";");
  const audioFilter = [
    `[0:a]asetpts=PTS-STARTPTS[a0]`,
    `[1:a]asetpts=PTS-STARTPTS[a1]`,
    `[a0][a1]acrossfade=d=${transitionDuration.toFixed(3)}:c1=tri:c2=tri[aout]`,
  ].join(";");

  const baseArgs = ["-hide_banner", "-y", "-i", params.inputAPath, "-i", params.inputBPath];
  const encodeArgs = [
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
    "-shortest",
    params.outputPath,
  ];

  try {
    await runFfmpeg([
      ...baseArgs,
      "-filter_complex",
      `${videoFilter};${audioFilter}`,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-shortest",
      params.outputPath,
    ]);
  } catch {
    await runFfmpeg([...baseArgs, "-filter_complex", videoFilter, ...encodeArgs]);
  }
}

export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;
  let jobId: string | null = null;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transition-stitch-"));

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const presetId = typeof body.presetId === "string" ? body.presetId : "";
    const inputAUrl = typeof body.inputAUrl === "string" ? body.inputAUrl : "";
    const inputBUrl = typeof body.inputBUrl === "string" ? body.inputBUrl : "";
    const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9";
    const resolution = typeof body.resolution === "string" ? body.resolution : "1080p";
    const transitionSeconds = Math.max(0.4, Math.min(3, safeNumber(body.duration, 3)));
    const inputADuration = safeNumber(body.inputADuration, 5);
    const inputBDuration = safeNumber(body.inputBDuration, 5);

    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    if (!presetId) return NextResponse.json({ error: "presetId is required" }, { status: 400 });
    if (!isPublicVideoUrl(inputAUrl) || !isPublicVideoUrl(inputBUrl)) {
      return NextResponse.json({ error: "Both transition inputs must be public video URLs." }, { status: 400 });
    }

    const project = await prismadb.transitionProject.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const preset = getPresetById(presetId);
    if (!preset) return NextResponse.json({ error: "Invalid preset" }, { status: 400 });

    const creditsToCharge = calcTransitionCredits(presetId, transitionSeconds, resolution);
    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: `Transition stitch: ${preset.name}`,
      assetType: "TRANSITION_VIDEO_STITCH",
      modelUsed: `transition/stitch/${presetId}`,
      duration: transitionSeconds,
      resolution: resolution,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const job = await prismadb.transitionJob.create({
      data: {
        projectId,
        userId,
        presetId,
        status: "processing",
        creditsCost: creditsToCharge,
        payload: JSON.stringify({
          mode: "preserve-video-stitch",
          inputAUrl,
          inputBUrl,
          inputADuration,
          inputBDuration,
          transitionSeconds,
          aspectRatio,
          resolution,
        }),
      },
    });
    jobId = job.id;

    const [width, height] = RATIO_DIMS[aspectRatio] ?? RATIO_DIMS["16:9"];
    const inputAPath = await downloadToTemp(inputAUrl, tmpDir, "input-a");
    const inputBPath = await downloadToTemp(inputBUrl, tmpDir, "input-b");
    const outputPath = path.join(tmpDir, "output.mp4");

    await renderTransition({
      inputAPath,
      inputBPath,
      outputPath,
      width,
      height,
      transition: resolveXfadeTransition(presetId),
      transitionDuration: transitionSeconds,
      inputADuration,
    });

    const outputBuffer = fs.readFileSync(outputPath);
    const resultUrl = await uploadBufferToStorage({
      buffer: outputBuffer,
      contentType: "video/mp4",
      userId,
      assetType: "video",
      generationId: `transition-stitch-${job.id}`,
    });
    if (!resultUrl) throw new Error("Failed to upload stitched transition.");

    const outputDuration = Math.max(1, Math.round(inputADuration + inputBDuration - transitionSeconds));
    const [updatedJob, output] = await prismadb.$transaction([
      prismadb.transitionJob.update({
        where: { id: job.id },
        data: { status: "completed", resultUrl },
      }),
      prismadb.transitionOutput.upsert({
        where: { jobId: job.id },
        create: {
          projectId,
          jobId: job.id,
          userId,
          url: resultUrl,
          presetId,
          presetName: preset.name,
          aspectRatio,
          duration: outputDuration,
          inputAUrl,
          inputBUrl,
        },
        update: { url: resultUrl, duration: outputDuration },
      }),
    ]);

    if (generationId) {
      await setGenerationMediaUrl(generationId, resultUrl).catch(() => null);
    }

    return NextResponse.json({
      jobId: updatedJob.id,
      status: "completed",
      output,
      creditsCharged: creditsToCharge,
      remainingCredits: charge.remainingCredits,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", required: err.requiredCredits, current: err.currentBalance },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await refundGenerationCharge(generationId, chargedUserId, chargedCredits, {
        reason: "generation_refund_provider_failed",
        clearMediaUrl: true,
      }).catch(() => null);
    }

    if (jobId) {
      await prismadb.transitionJob
        .update({
          where: { id: jobId },
          data: { status: "failed", error: err instanceof Error ? err.message : String(err) },
        })
        .catch(() => null);
    }

    console.error("[transitions/stitch]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transition stitch failed" },
      { status: 500 },
    );
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { getMusicCredits } from "@/lib/credit-pricing";
import { precheckGenerationPolicy } from "@/lib/credit-ledger";
import { sanitizePrompt } from "@/lib/security";
import { uploadBufferToStorage } from "@/lib/r2-storage";
import { getGoogleApiKey } from "@/lib/gemini-veo";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const execFileAsync = promisify(execFile);
const CLIP_MODEL = "google/lyria-3-clip/music";
const PRO_MODEL = "google/lyria-3-pro/music";

type PanelMusicBody = {
  prompt?: string;
  model?: string;
  duration?: number;
  style?: string;
  lyrics?: string;
  force_instrumental?: boolean;
  output_format?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  images?: Array<{ data?: string; mimeType?: string }>;
};

function resolveModel(model: unknown): string {
  return model === PRO_MODEL ? PRO_MODEL : CLIP_MODEL;
}

function clampDuration(value: unknown, model: string): number {
  const fallback = model === PRO_MODEL ? 120 : 30;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  if (model === CLIP_MODEL) return 30;
  return Math.max(30, Math.min(300, Math.round(numeric)));
}

function normalizeDataUrl(data: string): string {
  const clean = data.trim();
  return clean.includes("base64,") ? clean.split("base64,").pop() ?? clean : clean;
}

function buildPrompt(body: PanelMusicBody, duration: number): string {
  let fullPrompt = sanitizePrompt(String(body.prompt ?? ""), 3000);
  const specs: string[] = [];
  if (body.genre?.trim()) specs.push(`Genre/Style: ${body.genre.trim()}`);
  if (body.mood?.trim()) specs.push(`Mood/Atmosphere: ${body.mood.trim()}`);
  if (body.bpm && Number.isFinite(body.bpm) && body.bpm > 0) specs.push(`Tempo: ${Math.round(body.bpm)} BPM`);
  specs.push(body.force_instrumental ? "Vocal Type: Instrumental only, no vocals, no singing, no voice" : "Vocal Type: Vocal track if lyrics are provided");

  if (!fullPrompt) {
    fullPrompt = body.force_instrumental
      ? `Create a polished instrumental ${body.genre || "cinematic"} track.`
      : `Create a polished ${body.genre || "cinematic"} song.`;
  }

  if (specs.length) {
    fullPrompt = `${specs.map((item) => `[${item}]`).join(" ")}\n\n${fullPrompt}`;
  }
  if (body.lyrics?.trim() && !body.force_instrumental) {
    fullPrompt += `\n\nLyrics:\n\n${sanitizePrompt(body.lyrics, 2500)}`;
  }
  if (body.style?.trim()) {
    fullPrompt += `\n\nStyle/Mood/Instruments: ${sanitizePrompt(body.style, 300)}`;
  }
  if (body.force_instrumental) {
    fullPrompt += "\n\n[CRITICAL DIRECTIVE: Pure instrumental only. No vocals, no singing, no humming, no voice.]";
  }
  fullPrompt += `\n\n[Duration Constraint: Generate about ${duration} seconds of audio and resolve naturally at the end.]`;
  return fullPrompt;
}

async function trimAudioBuffer(buffer: Buffer<ArrayBufferLike>, duration: number, format: "mp3" | "wav"): Promise<Buffer<ArrayBufferLike>> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "panel-lyria-trim-"));
  const inputPath = path.join(tmpDir, `input.${format}`);
  const outputPath = path.join(tmpDir, `output.${format}`);
  try {
    fs.writeFileSync(inputPath, buffer);
    const ffmpegPath = await getFfmpegPath();
    const fadeDuration = duration > 10 ? 3 : 1;
    const fadeStart = Math.max(0, duration - fadeDuration);
    await execFileAsync(ffmpegPath, [
      "-hide_banner", "-y", "-i", inputPath,
      "-af", `afade=t=out:st=${fadeStart}:d=${fadeDuration}`,
      "-t", String(duration), outputPath,
    ], { timeout: 30_000 });
    if (!fs.existsSync(outputPath)) return buffer;
    return fs.readFileSync(outputPath);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const rate = hitRateLimit({ key: `panel:generate-music:${verified.userId}`, limit: 8, windowMs: 60_000 });
  if (!rate.allowed) return panelRateLimitResponse(rate.retryAfterSec);

  const userId = verified.userId;
  let generationId: string | null = null;
  let chargedCredits = 0;

  try {
    await ensureUserRow(userId);
    const body = await req.json().catch(() => ({})) as PanelMusicBody;
    const model = resolveModel(body.model);
    const duration = clampDuration(body.duration, model);
    const prompt = buildPrompt(body, duration);
    if (!prompt.trim()) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const precheck = await precheckGenerationPolicy({
      prompt,
      extraText: [body.style ?? "", body.lyrics ?? ""].filter(Boolean).join("\n") || null,
    });
    if (!precheck.allowed) {
      return NextResponse.json({ error: precheck.message, blocked: true, reason: precheck.reason }, { status: 403 });
    }

    const credits = getMusicCredits(model, duration);
    const spent = await spendCredits({
      userId,
      credits,
      prompt: sanitizePrompt(String(body.prompt ?? prompt), 3000),
      assetType: "AUDIO",
      modelUsed: model,
      duration,
      requestPayload: body,
    });
    generationId = spent.generationId;
    chargedCredits = credits;

    const googleKey = getGoogleApiKey();
    if (!googleKey) throw new Error("Google API key is not configured.");
    const googleModelId = model === PRO_MODEL ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
    const input: unknown[] = [{ type: "text", text: prompt }];
    for (const image of (body.images ?? []).slice(0, 10)) {
      if (image?.data && image?.mimeType) {
        input.push({ type: "image", mime_type: image.mimeType, data: normalizeDataUrl(image.data) });
      }
    }

    const params: Record<string, unknown> = { model: googleModelId, input };
    const format = body.output_format === "wav" && model === PRO_MODEL ? "wav" : "mp3";
    if (format === "wav") params.response_format = { type: "audio" };

    const genAI = new GoogleGenAI({ apiKey: googleKey });
    const interaction = await genAI.interactions.create(params as never) as any;
    let audioBase64: string | null = null;
    const lyricBlocks: string[] = [];

    for (const step of Array.isArray(interaction?.steps) ? interaction.steps : []) {
      if (step?.type !== "model_output" || !Array.isArray(step?.content)) continue;
      for (const block of step.content) {
        if (block?.type === "audio" && block?.data) audioBase64 = String(block.data);
        if (block?.type === "text" && block?.text) lyricBlocks.push(String(block.text));
      }
    }

    if (!audioBase64) throw new Error("No audio generated by Lyria model.");
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(audioBase64, "base64");
    if (duration > 0) {
      buffer = await trimAudioBuffer(buffer, duration, format).catch(() => buffer);
    }

    const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";
    const audioUrl = await uploadBufferToStorage({
      buffer,
      contentType,
      userId,
      assetType: "AUDIO",
      generationId,
      fileName: `lyria-${Date.now()}.${format}`,
    });
    if (!audioUrl) throw new Error("Failed to upload Lyria audio output to storage.");

    await setGenerationMediaUrl(generationId, audioUrl).catch(() => {});

    return NextResponse.json({
      id: generationId,
      status: "succeeded",
      progress: 100,
      audioUrl,
      generationId,
      lyrics: lyricBlocks.join("\n"),
      result: {
        id: generationId,
        kind: "audio",
        url: audioUrl,
        prompt: body.prompt || prompt,
        model,
        durationSec: duration,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Insufficient credits", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance }, { status: 402 });
    }
    if (chargedCredits > 0 && generationId) {
      await rollbackGenerationCharge(generationId, userId, chargedCredits).catch(() => {});
    }
    console.error("[panel/generate/music]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Music generation failed." }, { status: 500 });
  }
}
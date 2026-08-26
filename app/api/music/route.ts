import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost, calculateMusicCredits } from "@/lib/pricing";

export const maxDuration = 180; // 3 minutes timeout for polling minimax music generation
import { InsufficientCreditsError, precheckGenerationPolicy, rollbackGenerationCharge, setGenerationMediaUrl, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { attachIdempotencyGeneration, beginIdempotency, completeIdempotency, getIdempotencyKey, hashRequestBody, idempotencyErrorResponse } from "@/lib/idempotency";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { normalizeMediaUrl, readStorageRuntimeConfig } from "@/lib/storage";
import { getGoogleApiKey } from "@/lib/gemini-veo";
import { GoogleGenAI } from "@google/genai";
import prismadb from "@/lib/prismadb";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getFfmpegPath } from "@/lib/server/ffmpeg-path";
import { resolveRuntimeProviderRoute, routingMetadata } from "@/lib/routing/runtime-routing";
import { assertMobileCapabilityAllowed, MobileCapabilityDisabledError } from "@/lib/mobile/mobile-control-plane";

const execFileAsync = promisify(execFile);

async function trimAudioBuffer(buffer: any, duration: number, format: "mp3" | "wav"): Promise<any> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-trim-"));
  const inputPath = path.join(tmpDir, `input.${format}`);
  const outputPath = path.join(tmpDir, `output.${format}`);
  
  try {
    fs.writeFileSync(inputPath, buffer);
    const ffmpegPath = await getFfmpegPath();
    
    // We want a 3-second fade-out ending at the requested duration
    const fadeDuration = duration > 10 ? 3 : 1;
    const fadeStart = Math.max(0, duration - fadeDuration);
    const audioFilter = `afade=t=out:st=${fadeStart}:d=${fadeDuration}`;
    
    const args = [
      "-hide_banner",
      "-y",
      "-i", inputPath,
      "-af", audioFilter,
      "-t", String(duration),
      outputPath
    ];
    


    await execFileAsync(ffmpegPath, args, { timeout: 30_000 });
    
    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg failed to output trimmed audio file.");
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

const WAVESPEED_MUSIC_PREFIXES = ["wavespeed-ai/", "minimax/", "elevenlabs/", "google/lyria"];
const IDEMPOTENCY_ROUTE = "generate:music";

function isWaveSpeedModel(model: string): boolean {
  return WAVESPEED_MUSIC_PREFIXES.some((p) => model.startsWith(p));
}

export async function POST(req: Request) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;
  const idempotencyKey = getIdempotencyKey(req.headers);
  let requestHash: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    let { userId } = await auth();
    if (!userId && process.env.NODE_ENV !== "production") {
      userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
    }
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const storageConfig = await readStorageRuntimeConfig();
    chargedUserId = userId;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`music:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    requestHash = hashRequestBody(body);
    const { prompt, model = "elevenlabs/music", duration, style, lyrics, force_instrumental, output_format, genre, mood, bpm } = body as {
      prompt: string;
      model?: string;
      duration?: number;
      style?: string;
      lyrics?: string;
      force_instrumental?: boolean;
      output_format?: string;
      genre?: string;
      mood?: string;
      bpm?: number;
    };

    if (!prompt?.trim()) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    try {
      await assertMobileCapabilityAllowed("mobile.music.generate.enabled", req.headers.get("user-agent"));
    } catch (mobileErr) {
      if (mobileErr instanceof MobileCapabilityDisabledError) {
        return NextResponse.json({ error: mobileErr.message, code: "mobile_capability_disabled" }, { status: 403 });
      }
    }

    if (!isWaveSpeedModel(model)) {
      return new NextResponse("Unsupported music model", { status: 400 });
    }
    const legacyMusicProvider = model.startsWith("google/lyria") ? "google" : "wavespeed";
    const routingDecision = await resolveRuntimeProviderRoute({
      modelId: model,
      modality: "audio",
      legacyRoute: { provider: legacyMusicProvider, route: model },
    });
    const routedModel =
      routingDecision.routingSource === "control_center" &&
      (routingDecision.effectiveProvider === "google" || routingDecision.effectiveProvider === "wavespeed")
        ? routingDecision.providerRoute
        : model;

    const dbCost = await getGenerationCost(model, duration ?? 30);
    const creditsToCharge = dbCost > 0 ? dbCost : calculateMusicCredits(duration ?? 30);
    if (creditsToCharge <= 0) {
      return new NextResponse("No credit configuration for this music model", { status: 400 });
    }

    const idem = await beginIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      requestHash,
    });
    if (idem.kind === "replay") {
      return NextResponse.json(idem.responseJson, { status: idem.responseStatus });
    }
    if (idem.kind === "in_progress") {
      return NextResponse.json({ status: "processing", generationId: idem.generationId }, { status: 202 });
    }

    const precheck = await precheckGenerationPolicy({
      prompt,
      extraText: [style ?? "", lyrics ?? ""].filter(Boolean).join("\n") || null,
    });
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: precheck.message, blocked: true, reason: precheck.reason },
        { status: 403 },
      );
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: sanitizePrompt(prompt, 3000),
      assetType: "AUDIO",
      modelUsed: model,
      duration: duration ?? 30,
      requestPayload: {
        ...body,
        routing: routingMetadata(routingDecision),
      },
    });
    chargedCredits = creditsToCharge;
    generationId = charge.generationId;
    await attachIdempotencyGeneration({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
    });

    let audioUrl: string | null = null;
    let responseJson: any = null;

    if (routedModel.startsWith("google/lyria")) {
      const googleKey = getGoogleApiKey();
      if (!googleKey) {
        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
        }
        await completeIdempotency({
          userId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: 400,
          responseJson: { error: "Google API key is not configured. Please add GOOGLE_API_KEY to your environment variables." },
        });
        return new NextResponse("Google API key is not configured. Please add GOOGLE_API_KEY to your environment variables.", { status: 400 });
      }

      try {
        const googleModelId = routedModel.includes("pro") ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

        const inputList: any[] = [];
        let fullPrompt = sanitizePrompt(prompt, 3000);

        // Build a highly structured musical specification block to enforce real settings on Lyria
        const specs: string[] = [];
        if (genre?.trim()) specs.push(`Genre/Style: ${genre.trim()}`);
        if (mood?.trim()) specs.push(`Mood/Atmosphere: ${mood.trim()}`);
        if (bpm && Number.isFinite(bpm) && bpm > 0) specs.push(`Tempo: ${bpm} BPM`);
        if (force_instrumental) {
          specs.push(`Vocal Type: Instrumental only, absolutely NO vocals, NO singing, NO voice`);
        } else {
          specs.push(`Vocal Type: Vocal track incorporating lyrics`);
        }

        if (specs.length > 0) {
          const prefix = specs.map(s => `[${s}]`).join(" ");
          fullPrompt = `${prefix}\n\n${fullPrompt}`;
        }

        if (lyrics?.trim() && !force_instrumental) {
          fullPrompt += `\n\nLyrics:\n\n${sanitizePrompt(lyrics, 2500)}`;
        }
        if (style?.trim() && !genre && !mood) {
          fullPrompt += `\n\nStyle/Mood/Instruments: ${sanitizePrompt(style, 200)}`;
        }
        if (force_instrumental) {
          fullPrompt += `\n\n[CRITICAL DIRECTIVE: This is a pure instrumental piece. Absolutely NO vocals, NO singing, NO humming, and NO voice. Return instrumental arrangement only.]`;
        }
        if (duration && Number.isFinite(duration) && duration > 0) {
          fullPrompt += `\n\n[Duration Constraint: Generate exactly ${duration} seconds of audio. The music must resolve and end at around ${duration} seconds.]`;
        }

        inputList.push({
          type: "text",
          text: fullPrompt
        });

        // Parse optional multimodal base64 images from body if present
        if (body.images && Array.isArray(body.images)) {
          for (const img of body.images) {
            if (img.data && img.mimeType) {
              inputList.push({
                type: "image",
                mime_type: img.mimeType,
                data: img.data.includes("base64,") ? img.data.split("base64,")[1] : img.data
              });
            }
          }
        }

        const params: any = {
          model: googleModelId,
          input: inputList,
        };

        if (output_format === "wav" && googleModelId === "lyria-3-pro-preview") {
          params.response_format = { type: "audio" };
        }

        const genAI = new GoogleGenAI({ apiKey: googleKey });
        const interaction = await genAI.interactions.create(params);

        let audioBase64: string | null = null;
        const lyricsArr: string[] = [];

        if (interaction.steps && Array.isArray(interaction.steps)) {
          for (const step of interaction.steps) {
            if (step.type === "model_output" && step.content && Array.isArray(step.content)) {
              for (const block of step.content) {
                if (block.type === "audio" && block.data) {
                  audioBase64 = block.data;
                } else if (block.type === "text" && block.text) {
                  lyricsArr.push(block.text);
                }
              }
            }
          }
        }

        if (!audioBase64) {
          console.error("[MUSIC_LYRIA_NO_AUDIO]", JSON.stringify(interaction));
          if (chargedCredits > 0 && chargedUserId && generationId) {
            await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
          }
          await completeIdempotency({
            userId,
            route: IDEMPOTENCY_ROUTE,
            key: idempotencyKey,
            generationId,
            responseStatus: 502,
            responseJson: { error: "No audio generated by Lyria model" },
          });
          return new NextResponse("No audio generated by Lyria model", { status: 502 });
        }

        const format = output_format === "wav" && googleModelId === "lyria-3-pro-preview" ? "wav" : "mp3";
        const mimeType = format === "wav" ? "audio/wav" : "audio/mpeg";
        let buffer = Buffer.from(audioBase64, "base64");

        if (duration && Number.isFinite(duration) && duration > 0) {
          try {
            console.log(`[MUSIC_LYRIA_TRIM] Trimming audio output to ${duration} seconds`);
            buffer = (await trimAudioBuffer(buffer, duration, format)) as any;
          } catch (trimErr) {
            console.error("[MUSIC_LYRIA_TRIM_FAILED] FFmpeg trim failed, using raw buffer", trimErr);
          }
        }

        const uploadedUrl = await uploadBufferToStorage({
          buffer,
          contentType: mimeType,
          userId,
          assetType: "AUDIO",
          generationId: generationId || `lyria-${Date.now()}`,
          fileName: `lyria-${Date.now()}.${format}`,
        });

        if (!uploadedUrl) {
          throw new Error("Failed to upload Lyria audio output to storage");
        }

        audioUrl = uploadedUrl;
        const generatedLyricsText = lyricsArr.join("\n");

        if (generationId) {
          await setGenerationMediaUrl(generationId, audioUrl).catch(() => {});
        }

        responseJson = {
          generationId,
          audioUrl: normalizeMediaUrl(audioUrl, { config: storageConfig }) || audioUrl,
          lyrics: generatedLyricsText,
        };
      } catch (err: any) {
        console.error("[MUSIC_LYRIA_ERROR]", err);
        const errMsg = err?.message || String(err);
        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
          await prismadb.generation.update({
            where: { id: generationId },
            data: { outputUrl: `ERROR: ${errMsg.slice(0, 1000)}` }
          });
        }
        const errStatus = err?.status || 500;
        await completeIdempotency({
          userId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: errStatus,
          responseJson: { error: `Lyria music generation failed: ${errMsg}` },
        });
        return new NextResponse(`Google Lyria API request failed: ${errMsg}`, { status: errStatus });
      }
    } else {
      const apiKey = process.env.WAVESPEED_API_KEY;
      if (!apiKey) {
        throw new Error("WaveSpeed API key not configured");
      }

      const payload: Record<string, unknown> = { prompt: sanitizePrompt(prompt, 3000) };
      if (routedModel === "elevenlabs/music") {
        const safeSeconds = duration && Number.isFinite(duration) && duration > 0 ? Math.min(duration, 300) : 30;
        payload.music_length_ms = Math.max(5000, safeSeconds * 1000);
        payload.force_instrumental = Boolean(force_instrumental);
        payload.output_format = output_format || "mp3_standard";
        if (style?.trim()) payload.prompt = `${payload.prompt} ${sanitizePrompt(style, 200)}`;
        if (lyrics?.trim()) payload.prompt = `${payload.prompt} ${sanitizePrompt(lyrics, 2500)}`;
      } else {
        if (routedModel.startsWith("minimax/")) {
          const finalLyrics = lyrics?.trim() || "[Instrumental]";
          payload.lyrics = sanitizePrompt(finalLyrics, 2500);
        } else {
          if (lyrics?.trim()) payload.lyrics = sanitizePrompt(lyrics, 2500);
        }
        if (style?.trim()) payload.tags = sanitizePrompt(style, 200);
        if (duration && Number.isFinite(duration) && duration > 0 && duration <= 300) payload.duration = duration;
      }

      const externalRes = await fetchWithTimeout(
        `https://api.wavespeed.ai/api/v3/${routedModel}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        35_000,
      );

      if (!externalRes.ok) {
        const detail = await readErrorBody(externalRes);
        console.error("[MUSIC_WAVESPEED_ERROR]", externalRes.status, detail);
        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
        }
        await completeIdempotency({
          userId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: externalRes.status,
          responseJson: { error: `Music generation failed: ${detail}` },
        });
        return new NextResponse(`Music generation failed: ${detail}`, { status: externalRes.status });
      }

      const data = await externalRes.json();
      let waveUrl: string | null =
        data?.data?.outputs?.[0] ?? data?.outputs?.[0] ?? data?.data?.audio ?? data?.audio ?? null;

      if (!waveUrl && data?.data?.id) {
        try {
          const pollResult = await pollWaveSpeed(data.data.id, apiKey);
          if (pollResult.status === "completed") {
            waveUrl = pollResult.outputs?.[0] ?? null;
          } else {
            console.error("[MUSIC_POLLING_FAILED]", pollResult.error);
          }
        } catch (pollErr) {
          console.error("[MUSIC_POLLING_ERROR]", pollErr);
        }
      }

      if (!waveUrl) {
        console.error("[MUSIC_NO_URL]", JSON.stringify(data));
        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
        }
        await completeIdempotency({
          userId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: 502,
          responseJson: { error: "No audio URL in provider response" },
        });
        return new NextResponse("No audio URL in provider response", { status: 502 });
      }

      audioUrl = waveUrl;
      if (generationId) {
        await setGenerationMediaUrl(generationId, audioUrl).catch(() => {});
      }
      responseJson = {
        generationId,
        audioUrl: normalizeMediaUrl(audioUrl, { config: storageConfig }) || audioUrl,
      };
    }

    await completeIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
      responseStatus: 200,
      responseJson,
    });
    return NextResponse.json(responseJson);
  } catch (error) {
    const idemResponse = idempotencyErrorResponse(error);
    if (idemResponse) return idemResponse;

    if (error instanceof InsufficientCreditsError) {
      const responseJson = {
        error: "Insufficient credits",
        requiredCredits: error.requiredCredits,
        currentBalance: error.currentBalance,
      };
      if (chargedUserId && requestHash) {
        await completeIdempotency({
          userId: chargedUserId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: 402,
          responseJson,
        });
      }
      return NextResponse.json(
        responseJson,
        { status: 402 },
      );
    }

        if (chargedCredits > 0 && chargedUserId && generationId) {
          await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
        }

    console.error("[MUSIC_ERROR]", error);
    const msg = error instanceof Error ? error.message : "Internal Error";
    if (chargedUserId && requestHash) {
      await completeIdempotency({
        userId: chargedUserId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        responseStatus: 500,
        responseJson: { error: msg },
        });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

async function pollWaveSpeed(
  predictionId: string,
  apiKey: string,
  maxAttempts = 60,
  intervalMs = 4000,
): Promise<{ status: string; outputs?: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}/result`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`WaveSpeed polling failed: ${res.status}`);

    const json = await res.json();
    const data = json.data;
    if (data.status === "completed" || data.status === "failed") return data;
  }

  throw new Error("Audio generation timed out.");
}

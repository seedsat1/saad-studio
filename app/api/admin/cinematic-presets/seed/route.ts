// ============================================================
// FILE: app/api/admin/cinematic-presets/seed/route.ts
// DESCRIPTION: Admin-only endpoint that generates poster images
//   (and optionally short Veo videos) for the Cinematic Video
//   preset library. Uses the user's Google AI API key DIRECTLY
//   via @google/genai — NO third-party providers.
// AUTH: isAdmin() guard
// ============================================================

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  generateImagenImage,
  startVeoGeneration,
  pollVeoOperation,
  downloadVeoVideo,
} from "@/lib/gemini-veo";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { VEO_PRESETS, buildPosterPrompt, type VeoPreset } from "@/lib/veo-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

const POSTER_ASSET_TYPE = "preset-poster";
const VIDEO_ASSET_TYPE = "preset-video";
/** Single shared "owner" for preset assets so the storage paths stay stable. */
const SYSTEM_OWNER = "system-presets";

type SeedMode = "posters" | "videos" | "both";

interface SeedRequest {
  mode?: SeedMode;
  presetIds?: string[];
  /** If true, regenerate even if a file appears to already exist. */
  force?: boolean;
}

interface PresetResult {
  id: string;
  posterUrl?: string;
  videoUrl?: string;
  error?: string;
}

// ─── Single preset — poster (Imagen 4 Fast) ───────────────────────────────────

async function generatePosterForPreset(p: VeoPreset): Promise<string> {
  const [img] = await generateImagenImage({
    tier: "fast",
    prompt: buildPosterPrompt(p),
    aspectRatio: "16:9",
    numberOfImages: 1,
  });

  const url = await uploadBufferToStorage({
    buffer: img.buffer,
    contentType: img.mimeType,
    userId: SYSTEM_OWNER,
    assetType: POSTER_ASSET_TYPE,
    generationId: p.id,
    fileName: `${p.id}.png`,
  });

  if (!url) throw new Error("Supabase upload failed (poster).");
  return url;
}

// ─── Single preset — video (Veo 3.1 Lite) ─────────────────────────────────────

async function generateVideoForPreset(p: VeoPreset): Promise<string> {
  // 4-second silent draft to keep cost low ($)
  const handle = await startVeoGeneration({
    tier: "lite",
    prompt: p.prompt,
    aspectRatio: "16:9",
    resolution: "720p",
    durationSeconds: 4,
    generateAudio: false,
  });

  // Poll up to ~6 minutes
  const start = Date.now();
  const MAX_MS = 6 * 60 * 1000;
  let videoUri: string | null = null;
  while (Date.now() - start < MAX_MS) {
    await new Promise((r) => setTimeout(r, 10_000));
    const poll = await pollVeoOperation(handle);
    if (poll.done) {
      videoUri = poll.videoUri;
      break;
    }
  }
  if (!videoUri) throw new Error("Veo generation timed out for preset video.");

  const { buffer, contentType } = await downloadVeoVideo(videoUri);
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId: SYSTEM_OWNER,
    assetType: VIDEO_ASSET_TYPE,
    generationId: p.id,
    fileName: `${p.id}.mp4`,
  });
  if (!url) throw new Error("Supabase upload failed (video).");
  return url;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json().catch(() => null)) as SeedRequest | null;
  const mode: SeedMode = raw?.mode === "videos" || raw?.mode === "both" ? raw.mode : "posters";

  const targetIds = new Set(
    Array.isArray(raw?.presetIds) && raw.presetIds.length > 0
      ? raw.presetIds
      : VEO_PRESETS.map((p) => p.id),
  );

  const results: PresetResult[] = [];

  // Posters first — fast, runs in parallel
  if (mode === "posters" || mode === "both") {
    const posters = await Promise.allSettled(
      VEO_PRESETS.filter((p) => targetIds.has(p.id)).map(async (p) => {
        const url = await generatePosterForPreset(p);
        return { id: p.id, posterUrl: url };
      }),
    );
    posters.forEach((r) => {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        const reason =
          r.reason instanceof Error ? r.reason.message : String(r.reason);
        results.push({ id: "(unknown)", error: `poster: ${reason}` });
      }
    });
  }

  // Videos second — slow, MUST run sequentially to avoid Google quota spikes
  if (mode === "videos" || mode === "both") {
    for (const p of VEO_PRESETS.filter((x) => targetIds.has(x.id))) {
      try {
        const videoUrl = await generateVideoForPreset(p);
        const existing = results.find((r) => r.id === p.id);
        if (existing) existing.videoUrl = videoUrl;
        else results.push({ id: p.id, videoUrl });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const existing = results.find((r) => r.id === p.id);
        if (existing) existing.error = `video: ${reason}`;
        else results.push({ id: p.id, error: `video: ${reason}` });
      }
    }
  }

  const succeeded = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    ok: true,
    mode,
    succeeded,
    failed,
    results,
  });
}

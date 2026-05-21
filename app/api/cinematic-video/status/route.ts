// ============================================================
// FILE: app/api/cinematic-video/status/route.ts
// DESCRIPTION: Poll a Veo operation. When done, download the
//   mp4, push it to Supabase Storage, and update the Generation
//   row's mediaUrl. Client polls every ~10s.
// AUTH: Clerk user
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  downloadVeoVideo,
  pollVeoOperation,
} from "@/lib/gemini-veo";
import { setGenerationMediaUrl, rollbackGenerationCharge } from "@/lib/credit-ledger";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import prismadb from "@/lib/prismadb";

export const runtime = "nodejs";
export const maxDuration = 60;

interface StatusRequestBody {
  operationName?: string;
  model?: string;
  generationId?: string;
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`cinematic-status:${userId}:${ip}`, 90, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const raw = (await req.json().catch(() => null)) as StatusRequestBody | null;
    if (!raw?.operationName || !raw?.generationId) {
      return NextResponse.json(
        { error: "operationName and generationId required" },
        { status: 400 },
      );
    }

    // Ownership check: the generation row must belong to this user.
    const generation = await prismadb.generation.findUnique({
      where: { id: raw.generationId },
      select: {
        id: true,
        userId: true,
        cost: true,
        mediaUrl: true,
        status: true,
      },
    });
    if (!generation || generation.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already finished
    if (
      generation.status === "completed" &&
      generation.mediaUrl &&
      generation.mediaUrl.startsWith("http")
    ) {
      return NextResponse.json({
        done: true,
        status: "completed",
        mediaUrl: generation.mediaUrl,
      });
    }

    // Poll Google
    const poll = await pollVeoOperation({
      name: raw.operationName,
      model: raw.model || "veo-3.1-generate-preview",
    });

    if (!poll.done) {
      return NextResponse.json({ done: false, status: "running" });
    }

    if (!poll.videoUri) {
      // Operation finished but no video — refund and mark failed.
      await rollbackGenerationCharge(
        generation.id,
        userId,
        generation.cost,
      ).catch(() => {});
      await prismadb.generation
        .update({
          where: { id: generation.id },
          data: { status: "failed" },
        })
        .catch(() => {});
      return NextResponse.json(
        { done: true, status: "failed", error: "No video returned" },
        { status: 502 },
      );
    }

    // Download → Supabase
    const { buffer, contentType } = await downloadVeoVideo(poll.videoUri);
    const publicUrl = await uploadBufferToStorage({
      buffer,
      contentType,
      userId,
      assetType: "video",
      generationId: generation.id,
    });

    if (!publicUrl) {
      return NextResponse.json(
        { done: true, status: "failed", error: "Storage upload failed" },
        { status: 502 },
      );
    }

    await setGenerationMediaUrl(generation.id, publicUrl);

    return NextResponse.json({
      done: true,
      status: "completed",
      mediaUrl: publicUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[cinematic-video/status] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

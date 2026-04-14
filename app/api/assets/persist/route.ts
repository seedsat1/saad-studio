/**
 * POST /api/assets/persist
 *
 * After a generation completes on the client side, the frontend can call this
 * endpoint to permanently store the media file in Supabase Storage and update
 * the Generation record with the durable storage URL.
 *
 * This way, generation logic is NOT touched — persistence is handled separately.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import {
  uploadUrlToStorage,
  isStorageConfigured,
} from "@/lib/supabase-storage";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const generationId: string | undefined = body?.generationId;
    const mediaUrl: string | undefined = body?.mediaUrl;

    if (!generationId || typeof generationId !== "string") {
      return NextResponse.json({ error: "generationId is required" }, { status: 400 });
    }

    // Verify this generation belongs to the authenticated user
    const generation = await prismadb.generation.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true, mediaUrl: true, assetType: true },
    });

    if (!generation || generation.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Determine the URL to persist
    const urlToPersist = mediaUrl || generation.mediaUrl;

    if (!urlToPersist || urlToPersist.startsWith("task:")) {
      return NextResponse.json({ error: "No media URL to persist" }, { status: 400 });
    }

    // If already a Supabase URL, nothing to do
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && urlToPersist.includes(supabaseUrl)) {
      return NextResponse.json({ persisted: true, url: urlToPersist, skipped: true });
    }

    // If storage is not configured, return current URL without failing
    if (!isStorageConfigured()) {
      return NextResponse.json({
        persisted: false,
        url: urlToPersist,
        reason: "Storage not configured",
      });
    }

    // Upload to Supabase Storage
    const permanentUrl = await uploadUrlToStorage({
      remoteUrl: urlToPersist,
      userId,
      assetType: generation.assetType,
      generationId,
    });

    if (!permanentUrl) {
      // Non-fatal — keep original URL, return warning
      return NextResponse.json({
        persisted: false,
        url: urlToPersist,
        reason: "Upload to storage failed — original URL kept",
      });
    }

    // Update the generation record with the permanent URL
    await prismadb.generation.update({
      where: { id: generationId },
      data: { mediaUrl: permanentUrl },
    });

    return NextResponse.json({ persisted: true, url: permanentUrl });
  } catch (err) {
    console.error("[persist] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

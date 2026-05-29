import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { deleteFromStorage } from "@/lib/r2-storage";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  const rate = hitRateLimit({
    key: `panel:generations-delete:${verified.userId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  try {
    await ensureUserRow(verified.userId);
    const { id } = await params;
    const generationId = String(id ?? "").trim();
    if (!generationId) {
      return NextResponse.json({ error: "Generation id is required." }, { status: 400 });
    }

    const generation = await prismadb.generation.findFirst({
      where: {
        id: generationId,
        userId: verified.userId,
      },
      select: {
        id: true,
        userId: true,
        assetType: true,
      },
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found." }, { status: 404 });
    }

    await prismadb.generation.delete({
      where: { id: generation.id },
    });

    await deleteFromStorage({
      userId: generation.userId,
      generationId: generation.id,
      assetType: generation.assetType,
    }).catch(() => {});

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[panel/generations/:id] delete", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

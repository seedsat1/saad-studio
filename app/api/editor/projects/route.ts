/**
 * /api/editor/projects
 * Lightweight project store — saves timeline JSON in the Generation table's
 * `prompt` field repurposed as JSON payload for editor projects.
 * We use a dedicated Generation record with assetType="editor_project".
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureUserRow } from "@/lib/credit-ledger";

// GET — list all editor projects for the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ projects: [] }, { status: 401 });

  const rows = await prismadb.generation.findMany({
    where: { userId, assetType: "editor_project" },
    orderBy: { createdAt: "desc" },
    select: { id: true, prompt: true, createdAt: true },
  });

  const projects = rows.map((r) => {
    try {
      const data = JSON.parse(r.prompt);
      return { id: r.id, ...data };
    } catch {
      return { id: r.id, name: "Untitled Project", createdAt: r.createdAt };
    }
  });

  return NextResponse.json({ projects });
}

// POST — create a new project
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const name = String(body?.name ?? "Untitled Project").slice(0, 200);
  const tracks = body?.tracks ?? { video: [], text: [], audio: [] };

  await ensureUserRow(userId);

  const row = await prismadb.generation.create({
    data: {
      userId,
      prompt: JSON.stringify({ name, tracks, updatedAt: new Date().toISOString() }),
      assetType: "editor_project",
      modelUsed: "editor",
      cost: 0,
    },
  });

  return NextResponse.json({ id: row.id, name, tracks });
}

// PUT — update an existing project (body must include id)
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const id = String(body?.id ?? "");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const existing = await prismadb.generation.findFirst({
    where: { id, userId, assetType: "editor_project" },
  });
  if (!existing) return new NextResponse("Not found", { status: 404 });

  // Merge with existing, strip large data-URLs before DB save to keep rows small
  const name = String(body?.name ?? "Untitled Project").slice(0, 200);
  const rawTracks = body?.tracks && typeof body.tracks === "object" ? body.tracks : { video: [], text: [], audio: [] };
  const tracks = sanitizeTracks(rawTracks as Record<string, unknown>);

  await prismadb.generation.update({
    where: { id },
    data: {
      prompt: JSON.stringify({ name, tracks, updatedAt: new Date().toISOString() }),
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await req.json();
  if (!id) return new NextResponse("Missing id", { status: 400 });

  await prismadb.generation.deleteMany({
    where: { id, userId, assetType: "editor_project" },
  });

  return NextResponse.json({ ok: true });
}

/** Strip large data-URL blobs from clip src before saving to DB. We keep only the URL references. */
function sanitizeTracks(tracks: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(tracks)) {
    if (!Array.isArray(val)) {
      // Non-array values (e.g. projectRatio string) — keep as-is
      clean[k] = val;
      continue;
    }
    clean[k] = val.map((clip: unknown) => {
      if (clip && typeof clip === "object") {
        const c = { ...(clip as Record<string, unknown>) };
        // Remove data-URL blobs — large base64 stays in IndexedDB only
        if (typeof c.src === "string" && c.src.startsWith("data:")) {
          c.src = ""; // cleared; IndexedDB holds the real data
        }
        return c;
      }
      return clip;
    });
  }
  return clean;
}

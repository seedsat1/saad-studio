/**
 * /api/admin/presets/media
 * GET  → returns all transition presets with their current preview URLs
 * PUT  → updates a preset's previewVideoUrl by id
 * Body: { presetId: string; previewVideoUrl: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getClientSafePresets } from "@/lib/transition-presets";
import fs from "fs/promises";
import path from "path";

const PRESETS_FILE = path.join(process.cwd(), "lib", "transition-presets.ts");

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const presets = getClientSafePresets();
  return NextResponse.json({ presets });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { presetId, previewVideoUrl } = (await req.json()) as {
      presetId: string;
      previewVideoUrl: string;
    };

    if (!presetId || typeof previewVideoUrl !== "string") {
      return NextResponse.json(
        { error: "presetId and previewVideoUrl required" },
        { status: 400 }
      );
    }

    // Read the source file
    const source = await fs.readFile(PRESETS_FILE, "utf-8");

    // Find the preset block and update its previewVideoUrl
    // Pattern: id: "presetId", ... previewVideoUrl: "...",
    const idPattern = new RegExp(
      `(id:\\s*"${presetId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^}]*?previewVideoUrl:\\s*)"[^"]*"`,
      "s"
    );

    if (!idPattern.test(source)) {
      return NextResponse.json(
        { error: `Preset "${presetId}" not found in source` },
        { status: 404 }
      );
    }

    const updated = source.replace(
      idPattern,
      `$1"${previewVideoUrl.replace(/"/g, '\\"')}"`
    );

    await fs.writeFile(PRESETS_FILE, updated, "utf-8");

    return NextResponse.json({ ok: true, presetId, previewVideoUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}

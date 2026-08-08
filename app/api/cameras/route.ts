import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { uploadBufferToStorage } from "@/lib/supabase-storage";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";
import { parseStorageKey, resolveProviderMediaUrl } from "@/lib/media/public-url-resolver";

type CameraImageInput = {
  dataUrl?: string;
  url?: string;
  name?: string;
};

function safeMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  try {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1] || "image/png",
    buffer: Buffer.from(match[2] || "", "base64"),
  };
}

function isSafeStoragePath(path: string): boolean {
  return Boolean(path) && !path.includes("..") && !/[\\ -]/.test(path);
}

function isSafeBareImageFileName(value: string): boolean {
  return /^[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|gif)$/i.test(value);
}

function normalizeCameraReferenceInput(input: unknown, userId: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isSafeBareImageFileName(trimmed)) return `images/${userId}/${trimmed}`;

  const apiMediaIndex = trimmed.indexOf("/api/media/");
  const storageCandidate = apiMediaIndex === -1
    ? trimmed
    : trimmed.slice(apiMediaIndex + "/api/media/".length);
  const parsed = parseStorageKey(storageCandidate);
  if (parsed && isSafeStoragePath(parsed.path)) {
    return `${parsed.bucket}/${parsed.path}`;
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

async function resolveCameraReferenceForSafety(reference: string, userId: string): Promise<string> {
  return resolveProviderMediaUrl(reference, { userId, assetType: "image" });
}

function normalizeStoredCameraReference(row: any, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isSafeBareImageFileName(trimmed) && typeof row.userId === "string" && row.userId) {
    return `images/${row.userId}/${trimmed}`;
  }
  return trimmed;
}

function normalizeCamera(row: any) {
  const refs = Array.isArray(row.referenceUrls)
    ? row.referenceUrls.map((v: unknown) => normalizeStoredCameraReference(row, v)).filter((v: string | null): v is string => Boolean(v))
    : [];
  const coverUrl = normalizeStoredCameraReference(row, row.coverUrl);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    referenceUrls: refs,
    coverUrl: coverUrl || refs[0] || null,
    provider: row.provider,
    providerCameraId: row.providerCameraId,
    status: row.status,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || String(error);
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingUserCameraTable(error: unknown): boolean {
  const anyErr = error as any;
  const raw = `${errorText(error)} ${String(anyErr?.code ?? "")} ${String(anyErr?.meta?.cause ?? "")}`.toLowerCase();
  if (raw.includes("p2021")) return true;
  if (!raw.includes("usercamera")) return false;
  return (
    raw.includes("does not exist") ||
    raw.includes("doesn't exist") ||
    raw.includes("no such table") ||
    raw.includes("relation") ||
    raw.includes("p2021")
  );
}

async function ensureUserCameraTable(): Promise<boolean> {
  try {
    await prismadb.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCamera" (
        "id"                TEXT        NOT NULL PRIMARY KEY,
        "userId"            TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "name"              TEXT        NOT NULL,
        "description"       TEXT        NOT NULL DEFAULT '',
        "referenceUrls"     JSONB       NOT NULL DEFAULT '[]',
        "coverUrl"          TEXT,
        "provider"          TEXT        NOT NULL DEFAULT 'reference',
        "providerCameraId"  TEXT,
        "status"            TEXT        NOT NULL DEFAULT 'ready',
        "metadata"          JSONB       NOT NULL DEFAULT '{}',
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prismadb.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserCamera_userId_updatedAt_idx"
      ON "UserCamera"("userId", "updatedAt");
    `);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await (prismadb as any).userCamera.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ cameras: rows.map(normalizeCamera) }, { status: 200 });
  } catch (error) {
    if (isMissingUserCameraTable(error)) {
      const created = await ensureUserCameraTable();
      if (created) {
        try {
          const { userId } = await auth();
          if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          const rows = await (prismadb as any).userCamera.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
          });
          return NextResponse.json({ cameras: rows.map(normalizeCamera) }, { status: 200 });
        } catch {}
      }
      return NextResponse.json({ cameras: [], warning: "cameras_table_missing" }, { status: 200 });
    }

    const msg = error instanceof Error ? error.message : "Failed to load cameras.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const run = async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Camera";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1200) : "";
    const metadataInput = safeMetadata(body.metadata);
    const images = Array.isArray(body.images) ? (body.images as CameraImageInput[]).slice(0, 24) : [];
    const directUrls = Array.isArray(body.referenceUrls)
      ? (body.referenceUrls as unknown[]).map((value) => normalizeCameraReferenceInput(value, userId)).filter((v): v is string => Boolean(v))
      : [];

    if (images.length === 0 && directUrls.length === 0) {
      return NextResponse.json({ error: "Upload at least one reference image." }, { status: 400 });
    }

    const camera = await (prismadb as any).userCamera.create({
      data: {
        userId,
        name,
        description,
        referenceUrls: [],
        status: "processing",
        metadata: {
          ...metadataInput,
          source: "saad-camera-library",
          imageCount: images.length + directUrls.length,
          smartAssetKind: metadataInput.smartAssetKind || "camera",
        },
      },
    });

    const uploadedUrls: string[] = [...directUrls];
    for (const url of directUrls) {
      await checkStoryboardReferenceImageSafety(await resolveCameraReferenceForSafety(url, userId));
    }
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const normalizedImageUrl = normalizeCameraReferenceInput(image?.url, userId);
      if (normalizedImageUrl) {
        await checkStoryboardReferenceImageSafety(await resolveCameraReferenceForSafety(normalizedImageUrl, userId));
        uploadedUrls.push(normalizedImageUrl);
        continue;
      }
      if (typeof image?.dataUrl !== "string") continue;
      await checkStoryboardReferenceImageSafety(image.dataUrl);
      const parsed = parseDataUrl(image.dataUrl);
      if (!parsed || parsed.buffer.length === 0) continue;
      const uploaded = await uploadBufferToStorage({
        buffer: parsed.buffer,
        contentType: parsed.contentType,
        userId,
        assetType: "image",
        generationId: `cameras/${camera.id}/${i + 1}`,
        fileName: image.name || `reference-${i + 1}.png`,
      });
      if (uploaded) uploadedUrls.push(uploaded);
    }

    if (uploadedUrls.length === 0) {
      await (prismadb as any).userCamera.delete({ where: { id: camera.id } }).catch(() => null);
      return NextResponse.json({ error: "Could not upload reference images." }, { status: 500 });
    }

    const updated = await (prismadb as any).userCamera.update({
      where: { id: camera.id },
      data: {
        referenceUrls: uploadedUrls,
        coverUrl: uploadedUrls[0],
        status: "ready",
        metadata: {
          ...metadataInput,
          source: "saad-camera-library",
          imageCount: uploadedUrls.length,
          smartAssetKind: metadataInput.smartAssetKind || "camera",
          note: "Used as a persistent shot/framing reference across production tools.",
        },
      },
    });

    return NextResponse.json({ camera: normalizeCamera(updated) }, { status: 201 });
  };

  try {
    return await run();
  } catch (error) {
    if (error instanceof UnsafeReferenceImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (isMissingUserCameraTable(error)) {
      const created = await ensureUserCameraTable();
      if (created) {
        try {
          return await run();
        } catch {}
      }
      return NextResponse.json(
        {
          error: "Camera storage is not configured yet. Please run the database migration (UserCamera table).",
          code: "cameras_table_missing",
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create camera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

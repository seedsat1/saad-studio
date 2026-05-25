/**
 * /api/admin/migrate-storage
 *
 * Migrates media files stored in Supabase Storage → Cloudflare R2.
 * Downloads each Supabase public URL, re-uploads to R2, updates DB record.
 *
 * GET ?dry=true          → count only, no changes
 * GET ?batch=0&size=20   → migrate one batch (default size 20)
 * GET ?stats             → show counts per table
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { putObjectToStorage, bucketForAssetType, extensionFromContentType } from "@/lib/r2-storage";

const SUPABASE_PATTERN = "supabase.co/storage/v1/object/public";

type MigratedRecord = { table: string; id: string; field: string; oldUrl: string; newUrl: string };
type FailedRecord   = { table: string; id: string; field: string; url: string; error: string };

// ─── helpers ─────────────────────────────────────────────────────────────────

function isSupabaseUrl(url: unknown): url is string {
  return typeof url === "string" && url.includes(SUPABASE_PATTERN);
}

async function migrateUrl(url: string, assetType: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await res.arrayBuffer());
    const bucket = bucketForAssetType(assetType);
    const ext    = extensionFromContentType(contentType);
    const path   = `migrated/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    return await putObjectToStorage({ bucket, path, body: buffer, contentType, cacheControl: "public, max-age=31536000, immutable" });
  } catch {
    return null;
  }
}

// detect rough asset type from URL or field name
function guessType(url: string, field: string): string {
  const u = url.toLowerCase();
  if (u.includes(".mp4") || u.includes(".mov") || u.includes(".webm") || field.toLowerCase().includes("video")) return "video";
  if (u.includes(".mp3") || u.includes(".wav") || u.includes(".aac") || field.toLowerCase().includes("audio")) return "audio";
  return "image";
}

// ─── collect all Supabase rows ────────────────────────────────────────────────

async function collectRows(): Promise<{ table: string; id: string; field: string; url: string }[]> {
  const rows: { table: string; id: string; field: string; url: string }[] = [];

  // Generation
  const gens = await prismadb.generation.findMany({ select: { id: true, outputUrl: true, mediaUrl: true } });
  for (const g of gens) {
    if (isSupabaseUrl(g.outputUrl)) rows.push({ table: "Generation", id: g.id, field: "outputUrl", url: g.outputUrl });
    if (isSupabaseUrl(g.mediaUrl))  rows.push({ table: "Generation", id: g.id, field: "mediaUrl",  url: g.mediaUrl });
  }

  // PageContent
  const pcs = await prismadb.pageContent.findMany({ select: { id: true, mediaUrl: true } });
  for (const p of pcs) {
    if (isSupabaseUrl(p.mediaUrl)) rows.push({ table: "PageContent", id: p.id, field: "mediaUrl", url: p.mediaUrl! });
  }

  // AdCampaign
  const ads = await prismadb.adCampaign.findMany({ select: { id: true, mediaUrl: true } });
  for (const a of ads) {
    if (isSupabaseUrl(a.mediaUrl)) rows.push({ table: "AdCampaign", id: a.id, field: "mediaUrl", url: a.mediaUrl! });
  }

  // ShowcaseItem
  const shows = await prismadb.showcaseItem.findMany({ select: { id: true, videoUrl: true, thumbnailUrl: true } });
  for (const s of shows) {
    if (isSupabaseUrl(s.videoUrl))     rows.push({ table: "ShowcaseItem", id: s.id, field: "videoUrl",     url: s.videoUrl });
    if (isSupabaseUrl(s.thumbnailUrl)) rows.push({ table: "ShowcaseItem", id: s.id, field: "thumbnailUrl", url: s.thumbnailUrl });
  }

  // CinemaCharacter
  const chars = await prismadb.cinemaCharacter.findMany({ select: { id: true, referenceUrl: true } });
  for (const c of chars) {
    if (isSupabaseUrl(c.referenceUrl)) rows.push({ table: "CinemaCharacter", id: c.id, field: "referenceUrl", url: c.referenceUrl! });
  }

  // CinemaLocation
  const locs = await prismadb.cinemaLocation.findMany({ select: { id: true, referenceUrl: true } });
  for (const l of locs) {
    if (isSupabaseUrl(l.referenceUrl)) rows.push({ table: "CinemaLocation", id: l.id, field: "referenceUrl", url: l.referenceUrl! });
  }

  // CinemaAsset
  const assets = await prismadb.cinemaAsset.findMany({ select: { id: true, url: true, thumbnailUrl: true } });
  for (const a of assets) {
    if (isSupabaseUrl(a.url))          rows.push({ table: "CinemaAsset", id: a.id, field: "url",          url: a.url });
    if (isSupabaseUrl(a.thumbnailUrl)) rows.push({ table: "CinemaAsset", id: a.id, field: "thumbnailUrl", url: a.thumbnailUrl! });
  }

  // CinemaJob
  const cjobs = await prismadb.cinemaJob.findMany({ select: { id: true, resultUrl: true } });
  for (const j of cjobs) {
    if (isSupabaseUrl(j.resultUrl)) rows.push({ table: "CinemaJob", id: j.id, field: "resultUrl", url: j.resultUrl! });
  }

  // TransitionProject
  const tps = await prismadb.transitionProject.findMany({ select: { id: true, inputAUrl: true, inputBUrl: true } });
  for (const t of tps) {
    if (isSupabaseUrl(t.inputAUrl)) rows.push({ table: "TransitionProject", id: t.id, field: "inputAUrl", url: t.inputAUrl! });
    if (isSupabaseUrl(t.inputBUrl)) rows.push({ table: "TransitionProject", id: t.id, field: "inputBUrl", url: t.inputBUrl! });
  }

  // TransitionJob
  const tjs = await prismadb.transitionJob.findMany({ select: { id: true, resultUrl: true } });
  for (const j of tjs) {
    if (isSupabaseUrl(j.resultUrl)) rows.push({ table: "TransitionJob", id: j.id, field: "resultUrl", url: j.resultUrl! });
  }

  // TransitionOutput
  const tos = await prismadb.transitionOutput.findMany({ select: { id: true, url: true, thumbnailUrl: true, inputAUrl: true, inputBUrl: true } });
  for (const o of tos) {
    if (isSupabaseUrl(o.url))          rows.push({ table: "TransitionOutput", id: o.id, field: "url",          url: o.url });
    if (isSupabaseUrl(o.thumbnailUrl)) rows.push({ table: "TransitionOutput", id: o.id, field: "thumbnailUrl", url: o.thumbnailUrl! });
    if (isSupabaseUrl(o.inputAUrl))    rows.push({ table: "TransitionOutput", id: o.id, field: "inputAUrl",    url: o.inputAUrl! });
    if (isSupabaseUrl(o.inputBUrl))    rows.push({ table: "TransitionOutput", id: o.id, field: "inputBUrl",    url: o.inputBUrl! });
  }

  // VariationOutput
  const vos = await prismadb.variationOutput.findMany({ select: { id: true, assetUrl: true, thumbnailUrl: true } });
  for (const v of vos) {
    if (isSupabaseUrl(v.assetUrl))     rows.push({ table: "VariationOutput", id: v.id, field: "assetUrl",     url: v.assetUrl! });
    if (isSupabaseUrl(v.thumbnailUrl)) rows.push({ table: "VariationOutput", id: v.id, field: "thumbnailUrl", url: v.thumbnailUrl! });
  }

  // UserCharacter
  const ucs = await prismadb.userCharacter.findMany({ select: { id: true, coverUrl: true } });
  for (const u of ucs) {
    if (isSupabaseUrl(u.coverUrl)) rows.push({ table: "UserCharacter", id: u.id, field: "coverUrl", url: u.coverUrl! });
  }

  return rows;
}

// ─── update one field in DB ───────────────────────────────────────────────────

async function updateRow(table: string, id: string, field: string, newUrl: string) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data: Record<string, string> = { [field]: newUrl };
  switch (table) {
    case "Generation":        await (prismadb.generation as any).update({ where: { id }, data }); break;
    case "PageContent":       await (prismadb.pageContent as any).update({ where: { id }, data }); break;
    case "AdCampaign":        await (prismadb.adCampaign as any).update({ where: { id }, data }); break;
    case "ShowcaseItem":      await (prismadb.showcaseItem as any).update({ where: { id }, data }); break;
    case "CinemaCharacter":   await (prismadb.cinemaCharacter as any).update({ where: { id }, data }); break;
    case "CinemaLocation":    await (prismadb.cinemaLocation as any).update({ where: { id }, data }); break;
    case "CinemaAsset":       await (prismadb.cinemaAsset as any).update({ where: { id }, data }); break;
    case "CinemaJob":         await (prismadb.cinemaJob as any).update({ where: { id }, data }); break;
    case "TransitionProject": await (prismadb.transitionProject as any).update({ where: { id }, data }); break;
    case "TransitionJob":     await (prismadb.transitionJob as any).update({ where: { id }, data }); break;
    case "TransitionOutput":  await (prismadb.transitionOutput as any).update({ where: { id }, data }); break;
    case "VariationOutput":   await (prismadb.variationOutput as any).update({ where: { id }, data }); break;
    case "UserCharacter":     await (prismadb.userCharacter as any).update({ where: { id }, data }); break;
  }
}

// ─── route ───────────────────────────────────────────────────────────────────

export const maxDuration = 300; // 5 min Vercel limit

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dry   = searchParams.has("dry");
  const stats = searchParams.has("stats");
  const batch = parseInt(searchParams.get("batch") ?? "0", 10);
  const size  = Math.min(parseInt(searchParams.get("size") ?? "20", 10), 50);

  const allRows = await collectRows();

  if (dry || stats) {
    const byCounts: Record<string, number> = {};
    for (const r of allRows) byCounts[r.table] = (byCounts[r.table] || 0) + 1;
    return NextResponse.json({ total: allRows.length, byTable: byCounts });
  }

  const slice = allRows.slice(batch * size, batch * size + size);
  const migrated: MigratedRecord[] = [];
  const failed:   FailedRecord[]   = [];

  for (const row of slice) {
    const assetType = guessType(row.url, row.field);
    const newUrl = await migrateUrl(row.url, assetType);
    if (newUrl) {
      try {
        await updateRow(row.table, row.id, row.field, newUrl);
        migrated.push({ table: row.table, id: row.id, field: row.field, oldUrl: row.url, newUrl });
      } catch (e) {
        failed.push({ table: row.table, id: row.id, field: row.field, url: row.url, error: e instanceof Error ? e.message : "DB update failed" });
      }
    } else {
      failed.push({ table: row.table, id: row.id, field: row.field, url: row.url, error: "Download/upload failed" });
    }
  }

  const totalBatches = Math.ceil(allRows.length / size);
  const hasMore = batch + 1 < totalBatches;

  return NextResponse.json({
    batch,
    totalRows: allRows.length,
    totalBatches,
    processed: slice.length,
    migrated: migrated.length,
    failed: failed.length,
    hasMore,
    nextBatch: hasMore ? batch + 1 : null,
    details: { migrated, failed },
  });
}

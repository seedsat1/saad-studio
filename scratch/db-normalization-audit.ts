import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const r2Regex = /pub-[a-zA-Z0-9]+\.r2\.dev/i;
const supabaseRegex = /[a-zA-Z0-9-]+\.supabase\.(co|com)/i;
const tempfileRegex = /tempfile\.aiquickdraw/i;
const doubleProxyRegex = /\/api\/media\/media\//i;
const nestedHttpsRegex = /\/api\/media\/https?:\/?/i;
const blobRegex = /^blob:/i;
const dataRegex = /^data:/i;

function needsNormalization(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    r2Regex.test(url) ||
    supabaseRegex.test(url) ||
    tempfileRegex.test(url) ||
    doubleProxyRegex.test(url) ||
    nestedHttpsRegex.test(url) ||
    blobRegex.test(url) ||
    dataRegex.test(url)
  );
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // 1. If it contains blob:, data:, or tempfile, mark it legacy-broken
  if (blobRegex.test(url) || dataRegex.test(url) || tempfileRegex.test(url)) {
    return `legacy-broken:${url}`;
  }

  let working = url;

  // 2. Handle nested proxy URLs first
  // e.g. /api/media/https:/pub-*.r2.dev/images/foo.jpg -> /api/media/images/foo.jpg
  // e.g. /api/media/https://saadstudio-storage.s3... -> https://saadstudio-storage.s3...
  if (nestedHttpsRegex.test(working)) {
    const cleanUrl = working.replace(nestedHttpsRegex, "https://");
    // If it's still a storage provider URL, try to extract key
    working = cleanUrl;
  }

  // 3. Handle double proxy /api/media/media/ -> /api/media/
  if (doubleProxyRegex.test(working)) {
    working = working.replace(doubleProxyRegex, "/api/media/");
  }

  // 4. If it contains R2 or Supabase domains, extract the key and reconstruct it as proxy path
  if (r2Regex.test(working) || supabaseRegex.test(working)) {
    const match = working.match(/(images|videos|audio|thumbnails|media)\/(.+)/i);
    if (match) {
      return `/api/media/${match[1]}/${match[2]}`;
    }
  }

  // Double check if double media prefix still exists
  if (working.includes("/api/media/media/")) {
    working = working.replace(/\/api\/media\/media\//g, "/api/media/");
  }

  return working;
}

// Helper to normalize JSON fields recursively
function normalizeJson(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    if (needsNormalization(val)) {
      return normalizeUrl(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeJson);
  }
  if (typeof val === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = normalizeJson(val[key]);
    }
    return res;
  }
  return val;
}

async function main() {
  const isWrite = process.argv.includes("--write");
  console.log(`\n======================================================`);
  console.log(`🔍 Database Normalization Audit running in: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log(`======================================================\n`);

  try {
    // Table 1: Generation
    console.log("Checking Generation table...");
    const gens = await prisma.generation.findMany({
      select: { id: true, mediaUrl: true, outputUrl: true },
    });
    let genUpdates = 0;
    for (const gen of gens) {
      if (needsNormalization(gen.mediaUrl) || needsNormalization(gen.outputUrl)) {
        const nextMedia = normalizeUrl(gen.mediaUrl);
        const nextOutput = normalizeUrl(gen.outputUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] Generation ID ${gen.id}:`);
          console.log(`  mediaUrl:  ${gen.mediaUrl} -> ${nextMedia}`);
          console.log(`  outputUrl: ${gen.outputUrl} -> ${nextOutput}`);
        } else {
          await prisma.generation.update({
            where: { id: gen.id },
            data: {
              mediaUrl: nextMedia,
              outputUrl: nextOutput,
            },
          });
        }
        genUpdates++;
      }
    }
    console.log(`Generation updates needed/applied: ${genUpdates}\n`);

    // Table 2: PageContent
    console.log("Checking PageContent table...");
    const contents = await prisma.pageContent.findMany({
      select: { id: true, slug: true, sectionName: true, mediaUrl: true },
    });
    let contentUpdates = 0;
    for (const c of contents) {
      if (needsNormalization(c.mediaUrl)) {
        const nextMedia = normalizeUrl(c.mediaUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] PageContent ${c.slug}/${c.sectionName}:`);
          console.log(`  mediaUrl: ${c.mediaUrl} -> ${nextMedia}`);
        } else {
          await prisma.pageContent.update({
            where: { id: c.id },
            data: { mediaUrl: nextMedia },
          });
        }
        contentUpdates++;
      }
    }
    console.log(`PageContent updates needed/applied: ${contentUpdates}\n`);

    // Table 3: PageLayout
    console.log("Checking PageLayout table...");
    const layouts = await prisma.pageLayout.findMany({
      select: { id: true, pageName: true, layoutBlocks: true },
    });
    let layoutUpdates = 0;
    for (const l of layouts) {
      const blocksStr = JSON.stringify(l.layoutBlocks);
      if (needsNormalization(blocksStr)) {
        const nextBlocks = normalizeJson(l.layoutBlocks);
        if (!isWrite) {
          console.log(`[DRY-RUN] PageLayout ${l.pageName} needs updates (contains matching patterns).`);
        } else {
          await prisma.pageLayout.update({
            where: { id: l.id },
            data: { layoutBlocks: nextBlocks },
          });
        }
        layoutUpdates++;
      }
    }
    console.log(`PageLayout updates needed/applied: ${layoutUpdates}\n`);

    // Table 4: StudioImg
    console.log("Checking StudioImg table...");
    const studioImgs = await prisma.studioImg.findMany({
      select: { id: true, beforeUrl: true, afterUrl: true, videoUrl: true, posterUrl: true },
    });
    let imgUpdates = 0;
    for (const s of studioImgs) {
      if (
        needsNormalization(s.beforeUrl) ||
        needsNormalization(s.afterUrl) ||
        needsNormalization(s.videoUrl) ||
        needsNormalization(s.posterUrl)
      ) {
        const nextBefore = normalizeUrl(s.beforeUrl);
        const nextAfter = normalizeUrl(s.afterUrl);
        const nextVideo = normalizeUrl(s.videoUrl);
        const nextPoster = normalizeUrl(s.posterUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] StudioImg ID ${s.id} needs updates.`);
        } else {
          await prisma.studioImg.update({
            where: { id: s.id },
            data: {
              beforeUrl: nextBefore,
              afterUrl: nextAfter,
              videoUrl: nextVideo,
              posterUrl: nextPoster,
            },
          });
        }
        imgUpdates++;
      }
    }
    console.log(`StudioImg updates needed/applied: ${imgUpdates}\n`);

    // Table 5: StudioImgStep
    console.log("Checking StudioImgStep table...");
    const steps = await prisma.studioImgStep.findMany({
      select: { id: true, beforeUrl: true, afterUrl: true, videoUrl: true, posterUrl: true },
    });
    let stepUpdates = 0;
    for (const st of steps) {
      if (
        needsNormalization(st.beforeUrl) ||
        needsNormalization(st.afterUrl) ||
        needsNormalization(st.videoUrl) ||
        needsNormalization(st.posterUrl)
      ) {
        const nextBefore = normalizeUrl(st.beforeUrl);
        const nextAfter = normalizeUrl(st.afterUrl);
        const nextVideo = normalizeUrl(st.videoUrl);
        const nextPoster = normalizeUrl(st.posterUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] StudioImgStep ID ${st.id} needs updates.`);
        } else {
          await prisma.studioImgStep.update({
            where: { id: st.id },
            data: {
              beforeUrl: nextBefore,
              afterUrl: nextAfter,
              videoUrl: nextVideo,
              posterUrl: nextPoster,
            },
          });
        }
        stepUpdates++;
      }
    }
    console.log(`StudioImgStep updates needed/applied: ${stepUpdates}\n`);

    // Table 6: TransitionOutput
    console.log("Checking TransitionOutput table...");
    const trans = await prisma.transitionOutput.findMany({
      select: { id: true, url: true, thumbnailUrl: true, inputAUrl: true, inputBUrl: true },
    });
    let transUpdates = 0;
    for (const t of trans) {
      if (
        needsNormalization(t.url) ||
        needsNormalization(t.thumbnailUrl) ||
        needsNormalization(t.inputAUrl) ||
        needsNormalization(t.inputBUrl)
      ) {
        const nextUrl = normalizeUrl(t.url);
        const nextThumb = normalizeUrl(t.thumbnailUrl);
        const nextA = normalizeUrl(t.inputAUrl);
        const nextB = normalizeUrl(t.inputBUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] TransitionOutput ID ${t.id} needs updates.`);
        } else {
          await prisma.transitionOutput.update({
            where: { id: t.id },
            data: {
              url: nextUrl!,
              thumbnailUrl: nextThumb,
              inputAUrl: nextA,
              inputBUrl: nextB,
            },
          });
        }
        transUpdates++;
      }
    }
    console.log(`TransitionOutput updates needed/applied: ${transUpdates}\n`);

    // Table 7: VariationOutput
    console.log("Checking VariationOutput table...");
    const variations = await prisma.variationOutput.findMany({
      select: { id: true, assetUrl: true, thumbnailUrl: true },
    });
    let varUpdates = 0;
    for (const v of variations) {
      if (needsNormalization(v.assetUrl) || needsNormalization(v.thumbnailUrl)) {
        const nextAsset = normalizeUrl(v.assetUrl);
        const nextThumb = normalizeUrl(v.thumbnailUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] VariationOutput ID ${v.id} needs updates.`);
        } else {
          await prisma.variationOutput.update({
            where: { id: v.id },
            data: {
              assetUrl: nextAsset,
              thumbnailUrl: nextThumb,
            },
          });
        }
        varUpdates++;
      }
    }
    console.log(`VariationOutput updates needed/applied: ${varUpdates}\n`);

    // Table 8: UserCharacter
    console.log("Checking UserCharacter table...");
    const chars = await prisma.userCharacter.findMany({
      select: { id: true, referenceUrls: true, coverUrl: true },
    });
    let charUpdates = 0;
    for (const ch of chars) {
      const refStr = JSON.stringify(ch.referenceUrls);
      if (needsNormalization(refStr) || needsNormalization(ch.coverUrl)) {
        const nextRefs = normalizeJson(ch.referenceUrls);
        const nextCover = normalizeUrl(ch.coverUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] UserCharacter ID ${ch.id} needs updates.`);
        } else {
          await prisma.userCharacter.update({
            where: { id: ch.id },
            data: {
              referenceUrls: nextRefs,
              coverUrl: nextCover,
            },
          });
        }
        charUpdates++;
      }
    }
    console.log(`UserCharacter updates needed/applied: ${charUpdates}\n`);

    // Table 9: TransitionProject
    console.log("Checking TransitionProject table...");
    const transProjects = await prisma.transitionProject.findMany({
      select: { id: true, inputAUrl: true, inputBUrl: true },
    });
    let projUpdates = 0;
    for (const tp of transProjects) {
      if (needsNormalization(tp.inputAUrl) || needsNormalization(tp.inputBUrl)) {
        const nextA = normalizeUrl(tp.inputAUrl);
        const nextB = normalizeUrl(tp.inputBUrl);
        if (!isWrite) {
          console.log(`[DRY-RUN] TransitionProject ID ${tp.id} needs updates.`);
        } else {
          await prisma.transitionProject.update({
            where: { id: tp.id },
            data: {
              inputAUrl: nextA,
              inputBUrl: nextB,
            },
          });
        }
        projUpdates++;
      }
    }
    console.log(`TransitionProject updates needed/applied: ${projUpdates}\n`);

    // Table 10: ReapJob
    console.log("Checking ReapJob table...");
    const reapJobs = await prisma.reapJob.findMany({
      select: { id: true, sourceUrl: true, outputUrls: true },
    });
    let reapUpdates = 0;
    for (const rj of reapJobs) {
      const outputStr = JSON.stringify(rj.outputUrls);
      if (needsNormalization(rj.sourceUrl) || needsNormalization(outputStr)) {
        const nextSource = normalizeUrl(rj.sourceUrl);
        const nextOutputs = normalizeJson(rj.outputUrls);
        if (!isWrite) {
          console.log(`[DRY-RUN] ReapJob ID ${rj.id} needs updates.`);
        } else {
          await prisma.reapJob.update({
            where: { id: rj.id },
            data: {
              sourceUrl: nextSource!,
              outputUrls: nextOutputs,
            },
          });
        }
        reapUpdates++;
      }
    }
    console.log(`ReapJob updates needed/applied: ${reapUpdates}\n`);

    console.log("======================================================");
    if (!isWrite) {
      console.log("🔍 Dry run completed successfully! No data was written.");
      console.log("To apply the normalization fixes to the DB, run:");
      console.log("  npx tsx scratch/db-normalization-audit.ts --write");
    } else {
      console.log("🔥 All matching records successfully normalized in the database!");
    }
    console.log("======================================================\n");
  } catch (err) {
    console.error("❌ Normalization audit failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

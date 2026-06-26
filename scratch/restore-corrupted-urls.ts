import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function restoreUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("legacy-broken:")) {
    const restored = url.slice("legacy-broken:".length);
    console.log(`  Restoring: ${url} -> ${restored}`);
    return restored;
  }
  return url;
}

function restoreJson(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    if (val.startsWith("legacy-broken:")) {
      return val.slice("legacy-broken:".length);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(restoreJson);
  }
  if (typeof val === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = restoreJson(val[key]);
    }
    return res;
  }
  return val;
}

async function main() {
  const isWrite = process.argv.includes("--write");
  console.log(`\n======================================================`);
  console.log(`🔄 Restoring Corrupted URLs in Database: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log(`======================================================\n`);

  try {
    // 1. Generation
    console.log("Restoring Generation table...");
    const gens = await prisma.generation.findMany({
      select: { id: true, mediaUrl: true, outputUrl: true },
    });
    let genUpdates = 0;
    for (const gen of gens) {
      const mediaBroken = gen.mediaUrl?.startsWith("legacy-broken:");
      const outputBroken = gen.outputUrl?.startsWith("legacy-broken:");
      if (mediaBroken || outputBroken) {
        const nextMedia = restoreUrl(gen.mediaUrl);
        const nextOutput = restoreUrl(gen.outputUrl);
        if (isWrite) {
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
    console.log(`Generation rows restored: ${genUpdates}\n`);

    // 2. PageContent
    console.log("Restoring PageContent table...");
    const contents = await prisma.pageContent.findMany({
      select: { id: true, slug: true, sectionName: true, mediaUrl: true },
    });
    let contentUpdates = 0;
    for (const c of contents) {
      if (c.mediaUrl?.startsWith("legacy-broken:")) {
        const nextMedia = restoreUrl(c.mediaUrl);
        if (isWrite) {
          await prisma.pageContent.update({
            where: { id: c.id },
            data: { mediaUrl: nextMedia },
          });
        }
        contentUpdates++;
      }
    }
    console.log(`PageContent rows restored: ${contentUpdates}\n`);

    // 3. PageLayout
    console.log("Restoring PageLayout table...");
    const layouts = await prisma.pageLayout.findMany({
      select: { id: true, pageName: true, layoutBlocks: true },
    });
    let layoutUpdates = 0;
    for (const l of layouts) {
      const blocksStr = JSON.stringify(l.layoutBlocks);
      if (blocksStr.includes("legacy-broken:")) {
        const nextBlocks = restoreJson(l.layoutBlocks);
        if (isWrite) {
          await prisma.pageLayout.update({
            where: { id: l.id },
            data: { layoutBlocks: nextBlocks },
          });
        }
        layoutUpdates++;
      }
    }
    console.log(`PageLayout rows restored: ${layoutUpdates}\n`);

    // 4. StudioImg
    console.log("Restoring StudioImg table...");
    const studioImgs = await prisma.studioImg.findMany({
      select: { id: true, beforeUrl: true, afterUrl: true, videoUrl: true, posterUrl: true },
    });
    let imgUpdates = 0;
    for (const s of studioImgs) {
      const anyBroken = [s.beforeUrl, s.afterUrl, s.videoUrl, s.posterUrl].some(u => u?.startsWith("legacy-broken:"));
      if (anyBroken) {
        const nextBefore = restoreUrl(s.beforeUrl);
        const nextAfter = restoreUrl(s.afterUrl);
        const nextVideo = restoreUrl(s.videoUrl);
        const nextPoster = restoreUrl(s.posterUrl);
        if (isWrite) {
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
    console.log(`StudioImg rows restored: ${imgUpdates}\n`);

    // 5. StudioImgStep
    console.log("Restoring StudioImgStep table...");
    const steps = await prisma.studioImgStep.findMany({
      select: { id: true, beforeUrl: true, afterUrl: true, videoUrl: true, posterUrl: true },
    });
    let stepUpdates = 0;
    for (const st of steps) {
      const anyBroken = [st.beforeUrl, st.afterUrl, st.videoUrl, st.posterUrl].some(u => u?.startsWith("legacy-broken:"));
      if (anyBroken) {
        const nextBefore = restoreUrl(st.beforeUrl);
        const nextAfter = restoreUrl(st.afterUrl);
        const nextVideo = restoreUrl(st.videoUrl);
        const nextPoster = restoreUrl(st.posterUrl);
        if (isWrite) {
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
    console.log(`StudioImgStep rows restored: ${stepUpdates}\n`);

    // 6. TransitionOutput
    console.log("Restoring TransitionOutput table...");
    const trans = await prisma.transitionOutput.findMany({
      select: { id: true, url: true, thumbnailUrl: true, inputAUrl: true, inputBUrl: true },
    });
    let transUpdates = 0;
    for (const t of trans) {
      const anyBroken = [t.url, t.thumbnailUrl, t.inputAUrl, t.inputBUrl].some(u => u?.startsWith("legacy-broken:"));
      if (anyBroken) {
        const nextUrl = restoreUrl(t.url);
        const nextThumb = restoreUrl(t.thumbnailUrl);
        const nextA = restoreUrl(t.inputAUrl);
        const nextB = restoreUrl(t.inputBUrl);
        if (isWrite) {
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
    console.log(`TransitionOutput rows restored: ${transUpdates}\n`);

    // 7. VariationOutput
    console.log("Restoring VariationOutput table...");
    const variations = await prisma.variationOutput.findMany({
      select: { id: true, assetUrl: true, thumbnailUrl: true },
    });
    let varUpdates = 0;
    for (const v of variations) {
      const anyBroken = [v.assetUrl, v.thumbnailUrl].some(u => u?.startsWith("legacy-broken:"));
      if (anyBroken) {
        const nextAsset = restoreUrl(v.assetUrl);
        const nextThumb = restoreUrl(v.thumbnailUrl);
        if (isWrite) {
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
    console.log(`VariationOutput rows restored: ${varUpdates}\n`);

    // 8. UserCharacter
    console.log("Restoring UserCharacter table...");
    const chars = await prisma.userCharacter.findMany({
      select: { id: true, referenceUrls: true, coverUrl: true },
    });
    let charUpdates = 0;
    for (const ch of chars) {
      const refStr = JSON.stringify(ch.referenceUrls);
      const coverBroken = ch.coverUrl?.startsWith("legacy-broken:");
      if (refStr.includes("legacy-broken:") || coverBroken) {
        const nextRefs = restoreJson(ch.referenceUrls);
        const nextCover = restoreUrl(ch.coverUrl);
        if (isWrite) {
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
    console.log(`UserCharacter rows restored: ${charUpdates}\n`);

    // 9. TransitionProject
    console.log("Restoring TransitionProject table...");
    const transProjects = await prisma.transitionProject.findMany({
      select: { id: true, inputAUrl: true, inputBUrl: true },
    });
    let projUpdates = 0;
    for (const tp of transProjects) {
      const anyBroken = [tp.inputAUrl, tp.inputBUrl].some(u => u?.startsWith("legacy-broken:"));
      if (anyBroken) {
        const nextA = restoreUrl(tp.inputAUrl);
        const nextB = restoreUrl(tp.inputBUrl);
        if (isWrite) {
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
    console.log(`TransitionProject rows restored: ${projUpdates}\n`);

    // 10. ReapJob
    console.log("Restoring ReapJob table...");
    const reapJobs = await prisma.reapJob.findMany({
      select: { id: true, sourceUrl: true, outputUrls: true },
    });
    let reapUpdates = 0;
    for (const rj of reapJobs) {
      const outputStr = JSON.stringify(rj.outputUrls);
      const sourceBroken = rj.sourceUrl?.startsWith("legacy-broken:");
      if (sourceBroken || outputStr.includes("legacy-broken:")) {
        const nextSource = restoreUrl(rj.sourceUrl);
        const nextOutputs = restoreJson(rj.outputUrls);
        if (isWrite) {
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
    console.log(`ReapJob rows restored: ${reapUpdates}\n`);

    console.log("======================================================");
    if (!isWrite) {
      console.log("🔍 Dry run completed successfully!");
      console.log("To actually update the database and restore the URLs, run:");
      console.log("  npx tsx scratch/restore-corrupted-urls.ts --write");
    } else {
      console.log("🎉 All corrupted legacy-broken URLs successfully restored in the database!");
    }
    console.log("======================================================\n");
  } catch (err) {
    console.error("❌ Restore script failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

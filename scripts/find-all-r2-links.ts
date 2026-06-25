import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const r2Domain1 = "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";
  const r2Domain2 = "media.saadstudio.app";

  try {
    console.log("=== Scanning ALL tables for R2 references ===");

    // 1. Generation
    const gens = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: r2Domain1 } },
          { mediaUrl: { contains: r2Domain2 } },
          { outputUrl: { contains: r2Domain1 } },
          { outputUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`Generation table: found ${gens.length} records.`);

    // 2. ShowcaseItem
    const showcases = await prisma.showcaseItem.findMany({
      where: {
        OR: [
          { videoUrl: { contains: r2Domain1 } },
          { videoUrl: { contains: r2Domain2 } },
          { thumbnailUrl: { contains: r2Domain1 } },
          { thumbnailUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`ShowcaseItem table: found ${showcases.length} records.`);

    // 3. StudioImg
    const studioImgs = await prisma.studioImg.findMany({
      where: {
        OR: [
          { beforeUrl: { contains: r2Domain1 } },
          { beforeUrl: { contains: r2Domain2 } },
          { afterUrl: { contains: r2Domain1 } },
          { afterUrl: { contains: r2Domain2 } },
          { videoUrl: { contains: r2Domain1 } },
          { videoUrl: { contains: r2Domain2 } },
          { posterUrl: { contains: r2Domain1 } },
          { posterUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`StudioImg table: found ${studioImgs.length} records.`);

    // 4. StudioImgStep
    const studioSteps = await prisma.studioImgStep.findMany({
      where: {
        OR: [
          { beforeUrl: { contains: r2Domain1 } },
          { beforeUrl: { contains: r2Domain2 } },
          { afterUrl: { contains: r2Domain1 } },
          { afterUrl: { contains: r2Domain2 } },
          { videoUrl: { contains: r2Domain1 } },
          { videoUrl: { contains: r2Domain2 } },
          { posterUrl: { contains: r2Domain1 } },
          { posterUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`StudioImgStep table: found ${studioSteps.length} records.`);

    // 5. CinemaAsset
    const cinemaAssets = await prisma.cinemaAsset.findMany({
      where: {
        OR: [
          { url: { contains: r2Domain1 } },
          { url: { contains: r2Domain2 } },
          { thumbnailUrl: { contains: r2Domain1 } },
          { thumbnailUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`CinemaAsset table: found ${cinemaAssets.length} records.`);

    // 6. TransitionOutput
    const trans = await prisma.transitionOutput.findMany({
      where: {
        OR: [
          { url: { contains: r2Domain1 } },
          { url: { contains: r2Domain2 } },
          { thumbnailUrl: { contains: r2Domain1 } },
          { thumbnailUrl: { contains: r2Domain2 } },
          { inputAUrl: { contains: r2Domain1 } },
          { inputAUrl: { contains: r2Domain2 } },
          { inputBUrl: { contains: r2Domain1 } },
          { inputBUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`TransitionOutput table: found ${trans.length} records.`);

    // 7. VariationOutput
    const variations = await prisma.variationOutput.findMany({
      where: {
        OR: [
          { assetUrl: { contains: r2Domain1 } },
          { assetUrl: { contains: r2Domain2 } },
          { thumbnailUrl: { contains: r2Domain1 } },
          { thumbnailUrl: { contains: r2Domain2 } },
        ],
      },
    });
    console.log(`VariationOutput table: found ${variations.length} records.`);

    // 8. ReapJob
    const reapJobs = await prisma.reapJob.findMany({
      where: {
        OR: [
          { sourceUrl: { contains: r2Domain1 } },
          { sourceUrl: { contains: r2Domain2 } },
          // Note: outputUrls is JSON, we can do raw database string matching or fetch and filter
        ],
      },
    });
    console.log(`ReapJob (sourceUrl): found ${reapJobs.length} records.`);

    // Read all ReapJobs to inspect JSON outputUrls
    const allReapJobs = await prisma.reapJob.findMany({});
    let jsonMatchCount = 0;
    allReapJobs.forEach((job) => {
      const urlsStr = JSON.stringify(job.outputUrls);
      if (urlsStr.includes(r2Domain1) || urlsStr.includes(r2Domain2)) {
        jsonMatchCount++;
      }
    });
    console.log(`ReapJob (outputUrls JSON): found ${jsonMatchCount} records.`);

  } catch (error) {
    console.error("Scan failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const isWrite = process.argv.includes("--write");

  console.log("=================================================");
  console.log(`📂 Database URL Migration script running in: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log("=================================================");

  const r2Domain1 = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";
  const r2Domain2 = "https://media.saadstudio.app";
  const b2Domain = "https://f003.backblazeb2.com/file/saadstudio-storage";

  console.log(`Source domains to replace:\n - ${r2Domain1}\n - ${r2Domain2}`);
  console.log(`Target B2 friendly domain:\n - ${b2Domain}\n`);

  function getNewLink(url: string | null | undefined): string | null | undefined {
    if (url === null) return null;
    if (url === undefined) return undefined;
    if (url.startsWith(r2Domain1)) {
      return url.replace(r2Domain1, b2Domain);
    }
    if (url.startsWith(r2Domain2)) {
      return url.replace(r2Domain2, b2Domain);
    }
    return undefined; // no change
  }

  try {
    // 1. Generation Table (mediaUrl, outputUrl)
    console.log("1. Scanning Generation table...");
    const generations = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { startsWith: r2Domain1 } },
          { mediaUrl: { startsWith: r2Domain2 } },
          { outputUrl: { startsWith: r2Domain1 } },
          { outputUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${generations.length} records to update.`);

    if (isWrite && generations.length > 0) {
      let updatedCount = 0;
      for (const gen of generations) {
        const nextMedia = getNewLink(gen.mediaUrl);
        const nextOutput = getNewLink(gen.outputUrl);
        await prisma.generation.update({
          where: { id: gen.id },
          data: {
            mediaUrl: nextMedia !== undefined ? nextMedia : gen.mediaUrl,
            outputUrl: nextOutput !== undefined ? nextOutput : gen.outputUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} generations.`);
    }

    // 2. ShowcaseItem Table (videoUrl, thumbnailUrl)
    console.log("\n2. Scanning ShowcaseItem table...");
    const showcaseItems = await prisma.showcaseItem.findMany({
      where: {
        OR: [
          { videoUrl: { startsWith: r2Domain1 } },
          { videoUrl: { startsWith: r2Domain2 } },
          { thumbnailUrl: { startsWith: r2Domain1 } },
          { thumbnailUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${showcaseItems.length} records to update.`);

    if (isWrite && showcaseItems.length > 0) {
      let updatedCount = 0;
      for (const item of showcaseItems) {
        const nextVideo = getNewLink(item.videoUrl);
        const nextThumb = getNewLink(item.thumbnailUrl);
        await prisma.showcaseItem.update({
          where: { id: item.id },
          data: {
            videoUrl: nextVideo !== undefined ? nextVideo! : item.videoUrl,
            thumbnailUrl: nextThumb !== undefined ? nextThumb! : item.thumbnailUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} showcase items.`);
    }

    // 3. StudioImg Table (beforeUrl, afterUrl, videoUrl, posterUrl)
    console.log("\n3. Scanning StudioImg table...");
    const studioImages = await prisma.studioImg.findMany({
      where: {
        OR: [
          { beforeUrl: { startsWith: r2Domain1 } },
          { beforeUrl: { startsWith: r2Domain2 } },
          { afterUrl: { startsWith: r2Domain1 } },
          { afterUrl: { startsWith: r2Domain2 } },
          { videoUrl: { startsWith: r2Domain1 } },
          { videoUrl: { startsWith: r2Domain2 } },
          { posterUrl: { startsWith: r2Domain1 } },
          { posterUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${studioImages.length} records to update.`);

    if (isWrite && studioImages.length > 0) {
      let updatedCount = 0;
      for (const img of studioImages) {
        const nextBefore = getNewLink(img.beforeUrl);
        const nextAfter = getNewLink(img.afterUrl);
        const nextVideo = getNewLink(img.videoUrl);
        const nextPoster = getNewLink(img.posterUrl);
        await prisma.studioImg.update({
          where: { id: img.id },
          data: {
            beforeUrl: nextBefore !== undefined ? nextBefore : img.beforeUrl,
            afterUrl: nextAfter !== undefined ? nextAfter : img.afterUrl,
            videoUrl: nextVideo !== undefined ? nextVideo : img.videoUrl,
            posterUrl: nextPoster !== undefined ? nextPoster : img.posterUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} studio images.`);
    }

    // 4. StudioImgStep Table (beforeUrl, afterUrl, videoUrl, posterUrl)
    console.log("\n4. Scanning StudioImgStep table...");
    const imgSteps = await prisma.studioImgStep.findMany({
      where: {
        OR: [
          { beforeUrl: { startsWith: r2Domain1 } },
          { beforeUrl: { startsWith: r2Domain2 } },
          { afterUrl: { startsWith: r2Domain1 } },
          { afterUrl: { startsWith: r2Domain2 } },
          { videoUrl: { startsWith: r2Domain1 } },
          { videoUrl: { startsWith: r2Domain2 } },
          { posterUrl: { startsWith: r2Domain1 } },
          { posterUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${imgSteps.length} records to update.`);

    if (isWrite && imgSteps.length > 0) {
      let updatedCount = 0;
      for (const step of imgSteps) {
        const nextBefore = getNewLink(step.beforeUrl);
        const nextAfter = getNewLink(step.afterUrl);
        const nextVideo = getNewLink(step.videoUrl);
        const nextPoster = getNewLink(step.posterUrl);
        await prisma.studioImgStep.update({
          where: { id: step.id },
          data: {
            beforeUrl: nextBefore !== undefined ? nextBefore : step.beforeUrl,
            afterUrl: nextAfter !== undefined ? nextAfter : step.afterUrl,
            videoUrl: nextVideo !== undefined ? nextVideo : step.videoUrl,
            posterUrl: nextPoster !== undefined ? nextPoster : step.posterUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} image steps.`);
    }

    // 5. CinemaAsset Table (url, thumbnailUrl)
    console.log("\n5. Scanning CinemaAsset table...");
    const cinemaAssets = await prisma.cinemaAsset.findMany({
      where: {
        OR: [
          { url: { startsWith: r2Domain1 } },
          { url: { startsWith: r2Domain2 } },
          { thumbnailUrl: { startsWith: r2Domain1 } },
          { thumbnailUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${cinemaAssets.length} records to update.`);

    if (isWrite && cinemaAssets.length > 0) {
      let updatedCount = 0;
      for (const asset of cinemaAssets) {
        const nextUrl = getNewLink(asset.url);
        const nextThumb = getNewLink(asset.thumbnailUrl);
        await prisma.cinemaAsset.update({
          where: { id: asset.id },
          data: {
            url: nextUrl !== undefined ? nextUrl! : asset.url,
            thumbnailUrl: nextThumb !== undefined ? nextThumb : asset.thumbnailUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} cinema assets.`);
    }

    // 6. TransitionOutput Table (url, thumbnailUrl, inputAUrl, inputBUrl)
    console.log("\n6. Scanning TransitionOutput table...");
    const transOutputs = await prisma.transitionOutput.findMany({
      where: {
        OR: [
          { url: { startsWith: r2Domain1 } },
          { url: { startsWith: r2Domain2 } },
          { thumbnailUrl: { startsWith: r2Domain1 } },
          { thumbnailUrl: { startsWith: r2Domain2 } },
          { inputAUrl: { startsWith: r2Domain1 } },
          { inputAUrl: { startsWith: r2Domain2 } },
          { inputBUrl: { startsWith: r2Domain1 } },
          { inputBUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${transOutputs.length} records to update.`);

    if (isWrite && transOutputs.length > 0) {
      let updatedCount = 0;
      for (const out of transOutputs) {
        const nextUrl = getNewLink(out.url);
        const nextThumb = getNewLink(out.thumbnailUrl);
        const nextInputA = getNewLink(out.inputAUrl);
        const nextInputB = getNewLink(out.inputBUrl);
        await prisma.transitionOutput.update({
          where: { id: out.id },
          data: {
            url: nextUrl !== undefined ? nextUrl! : out.url,
            thumbnailUrl: nextThumb !== undefined ? nextThumb : out.thumbnailUrl,
            inputAUrl: nextInputA !== undefined ? nextInputA : out.inputAUrl,
            inputBUrl: nextInputB !== undefined ? nextInputB : out.inputBUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} transition outputs.`);
    }

    // 7. VariationOutput Table (assetUrl, thumbnailUrl)
    console.log("\n7. Scanning VariationOutput table...");
    const varOutputs = await prisma.variationOutput.findMany({
      where: {
        OR: [
          { assetUrl: { startsWith: r2Domain1 } },
          { assetUrl: { startsWith: r2Domain2 } },
          { thumbnailUrl: { startsWith: r2Domain1 } },
          { thumbnailUrl: { startsWith: r2Domain2 } },
        ],
      },
    });
    console.log(`   Found ${varOutputs.length} records to update.`);

    if (isWrite && varOutputs.length > 0) {
      let updatedCount = 0;
      for (const out of varOutputs) {
        const nextAsset = getNewLink(out.assetUrl);
        const nextThumb = getNewLink(out.thumbnailUrl);
        await prisma.variationOutput.update({
          where: { id: out.id },
          data: {
            assetUrl: nextAsset !== undefined ? nextAsset : out.assetUrl,
            thumbnailUrl: nextThumb !== undefined ? nextThumb : out.thumbnailUrl,
          },
        });
        updatedCount++;
      }
      console.log(`   ✅ Succeeded: Updated ${updatedCount} variation outputs.`);
    }

    console.log("\n=================================================");
    if (isWrite) {
      console.log("🎉 Database URL updates finished successfully!");
    } else {
      console.log("🔍 Dry run completed. No data was modified.");
      console.log("To apply the changes permanently, re-run this script with the '--write' flag:");
      console.log("   npx ts-node scripts/migrate-db-urls.ts --write");
    }
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Database migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

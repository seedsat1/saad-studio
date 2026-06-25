const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetModels = [
    'generation',
    'showcaseItem',
    'userCharacter',
    'providerUsageRecord',
    'adminTransaction',
    'pageLayout',
    'transitionProject',
    'transitionJob',
    'transitionOutput',
    'variationOutput',
    'cinemaAsset',
    'studioImg',
    'studioImgStep'
  ];

  console.log("Searching database tables for 'media/videos', 'media/images', or 'media/audio' prefix...");

  for (const model of targetModels) {
    if (!prisma[model]) continue;
    try {
      const records = await prisma[model].findMany({});
      let count = 0;
      for (const record of records) {
        const str = JSON.stringify(record);
        if (str.includes("media/videos") || str.includes("media/images") || str.includes("media/audio") || str.includes("media/thumbnails")) {
          count++;
          if (count <= 2) {
            console.log(`Found in ${model}:`, JSON.stringify(record).slice(0, 300));
          }
        }
      }
      if (count > 0) {
        console.log(`Total matching records in ${model}: ${count}`);
      }
    } catch (e) {
      console.error(`Error querying ${model}:`, e.message);
    }
  }

  await prisma.$disconnect();
}

main();

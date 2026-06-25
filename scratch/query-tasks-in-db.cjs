const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetModels = [
    'generation',
    'showcaseItem',
    'userCharacter',
    'transitionOutput',
    'variationOutput',
    'cinemaAsset',
    'studioImg',
    'studioImgStep'
  ];

  console.log('Searching database for tasks/legacy URLs...');

  for (const model of targetModels) {
    if (!prisma[model]) continue;
    try {
      const records = await prisma[model].findMany({});
      let foundCount = 0;
      for (const record of records) {
        const recordStr = JSON.stringify(record);
        if (recordStr.includes('task:') || recordStr.includes('tempfile.aiquickdraw.com')) {
          foundCount++;
          console.log(`- Model: ${model} | ID: ${record.id}`);
          if (record.mediaUrl) console.log(`  mediaUrl:  ${record.mediaUrl}`);
          if (record.outputUrl) console.log(`  outputUrl: ${record.outputUrl}`);
          if (record.url) console.log(`  url:       ${record.url}`);
          if (record.src) console.log(`  src:       ${record.src}`);
        }
      }
      if (foundCount > 0) {
        console.log(`Found ${foundCount} records in ${model}.\n`);
      }
    } catch (err) {
      console.error(`Error scanning ${model}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

main();

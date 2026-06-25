const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function main() {
  console.log("Searching database tables for any occurrence of 'r2.dev' or 'pub-'...");
  console.log("===============================================================");

  for (const model of targetModels) {
    if (!prisma[model]) continue;
    try {
      const records = await prisma[model].findMany({});
      let count = 0;
      for (const record of records) {
        const str = JSON.stringify(record);
        if (str.includes("r2.dev") || str.includes("pub-")) {
          count++;
          console.log(`[${model}] Found record ID: ${record.id || 'N/A'}`);
          
          // Print key-value pairs that match
          for (const [key, val] of Object.entries(record)) {
            const valStr = JSON.stringify(val);
            if (valStr.includes("r2.dev") || valStr.includes("pub-")) {
              console.log(`  - ${key}: ${valStr}`);
            }
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

#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let totalScanned = 0;
  let totalUpdated = 0; // Read-only check, so updated is 0
  let remainingR2 = 0;

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

  console.log('🔍 Starting comprehensive database verification scan...');

  try {
    for (const model of targetModels) {
      if (!prisma[model]) {
        console.warn(`⚠️ Model "${model}" not found in Prisma client`);
        continue;
      }
      
      const records = await prisma[model].findMany({});
      totalScanned += records.length;
      
      let modelR2Count = 0;
      for (const record of records) {
        const recordStr = JSON.stringify(record);
        if (recordStr.includes('r2.dev') || recordStr.includes('pub-')) {
          // Double check to make sure it's actually a pub-*.r2.dev URL
          if (/pub-[a-f0-9]+\.r2\.dev/i.test(recordStr)) {
            remainingR2++;
            modelR2Count++;
          }
        }
      }
      if (modelR2Count > 0) {
        console.log(`❌ Found ${modelR2Count} remaining R2 URLs in model: ${model}`);
      }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Total records scanned: ${totalScanned}`);
    console.log(`Total records updated: ${totalUpdated}`);
    console.log(`Remaining pub-*.r2.dev URLs: ${remainingR2}`);
  } catch (error) {
    console.error('Error verifying database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');
const { extractObjectKey } = require('../lib/media-gateway/index');

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const isWrite = process.argv.includes('--write');
  console.log('==================================================');
  console.log(`📦 Running TransitionOutput URL Migration: ${isWrite ? '🔥 WRITE MODE' : '🔍 DRY-RUN MODE'}`);
  console.log('==================================================\n');

  try {
    const records = await prisma.transitionOutput.findMany({});
    console.log(`Scanned ${records.length} transition outputs.`);

    let updatedCount = 0;
    for (const r of records) {
      let needsUpdate = false;
      const dataToUpdate = {};

      const fields = ['url', 'thumbnailUrl', 'inputAUrl', 'inputBUrl'];
      for (const field of fields) {
        const val = r[field];
        if (val && (val.startsWith('http') || val.includes('r2.dev') || val.includes('backblazeb2.com'))) {
          const key = extractObjectKey(val);
          if (key && key !== val) {
            dataToUpdate[field] = key;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        console.log(`- ID: ${r.id}`);
        for (const [f, k] of Object.entries(dataToUpdate)) {
          console.log(`  ${f}: ${r[f]} -> ${k}`);
        }
        
        if (isWrite) {
          await prisma.transitionOutput.update({
            where: { id: r.id },
            data: dataToUpdate
          });
          console.log('  ✅ Database record updated.');
        }
        updatedCount++;
      }
    }

    console.log('\n==================================================');
    console.log(`Total scanned: ${records.length}`);
    console.log(`Total identified/fixed: ${updatedCount}`);
    console.log('==================================================');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

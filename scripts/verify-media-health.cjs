#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function testUrl(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentLength: res.headers.get('content-length')
    };
  } catch (err) {
    return { status: null, error: err.message };
  }
}

async function main() {
  const port = process.argv[2] || '3001';
  console.log('==================================================');
  console.log('🔍 Starting Automated Media Health Verification...');
  console.log(`Target Dev Server Port: ${port}`);
  console.log('==================================================\n');

  let allPassed = true;

  // Check 1: Scan Database for remaining r2.dev and pub- URLs
  console.log('Check 1: Scanning Database for legacy R2 URLs...');
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

  let r2Count = 0;
  let duplicateCount = 0;
  let binCount = 0;

  for (const model of targetModels) {
    if (!prisma[model]) continue;
    try {
      const records = await prisma[model].findMany({});
      for (const record of records) {
        const recordStr = JSON.stringify(record);
        if (recordStr.includes('r2.dev') || recordStr.includes('pub-')) {
          if (/pub-[a-f0-9]+\.r2\.dev/i.test(recordStr)) {
            r2Count++;
          }
        }
        if (recordStr.includes('/api/media/media/')) {
          duplicateCount++;
        }
        if (recordStr.includes('.bin')) {
          binCount++;
        }
      }
    } catch (err) {
      console.error(`  ⚠️ Failed to scan model ${model}:`, err.message);
    }
  }

  if (r2Count === 0) {
    console.log('  ✅ DB Scan: 0 remaining r2.dev / pub- URLs. [PASSED]');
  } else {
    console.log(`  ❌ DB Scan: Found ${r2Count} remaining R2 URLs! [FAILED]`);
    allPassed = false;
  }

  if (duplicateCount === 0) {
    console.log('  ✅ DB Scan: 0 remaining duplicate "/api/media/media/" URLs. [PASSED]');
  } else {
    console.log(`  ❌ DB Scan: Found ${duplicateCount} duplicate prefix URLs! [FAILED]`);
    allPassed = false;
  }

  if (binCount === 0) {
    console.log('  ✅ DB Scan: 0 remaining ".bin" media file URLs. [PASSED]');
  } else {
    console.log(`  ❌ DB Scan: Found ${binCount} remaining ".bin" URLs! [FAILED]`);
    allPassed = false;
  }

  // Check 2: Verify `/api/media` proxy endpoints for actual media categories
  console.log('\nCheck 2: Testing /api/media proxy endpoint responses...');
  
  // Find a video, an image, and a thumbnail from generations
  const testGenerations = await prisma.generation.findMany({
    where: {
      status: 'completed',
      mediaUrl: { not: null }
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  if (testGenerations.length === 0) {
    console.log('  ⚠️ No completed generations found to verify streaming.');
  } else {
    let testedCount = 0;
    for (const gen of testGenerations) {
      if (!gen.mediaUrl || gen.mediaUrl.startsWith('http')) continue;
      
      const mediaUrl = `http://localhost:${port}/api/media/${gen.mediaUrl}`;
      const result = await testUrl(mediaUrl);
      
      console.log(`  - Media Key: ${gen.mediaUrl}`);
      console.log(`    Status: ${result.status} | Content-Type: ${result.contentType}`);
      
      if (result.status === 200) {
        console.log('    ✅ Route works and streams correctly. [PASSED]');
      } else {
        console.log(`    ❌ Route failed with status: ${result.status} [FAILED]`);
        allPassed = false;
      }
      testedCount++;
      if (testedCount >= 3) break;
    }
  }

  // Check 3: Check that server-side normalization handles response outputs correctly
  console.log('\nCheck 3: Verifying central normalizer behavior...');
  const { normalizeMediaUrl } = require('../lib/storage/index');
  const testUrls = [
    'videos/user_123/video.mp4',
    'https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/videos/user_123/video.mp4',
    'https://media.saadstudio.app/images/user_123/image.jpg',
    '/api/media/audio/sound.mp3'
  ];

  for (const url of testUrls) {
    const normalized = normalizeMediaUrl(url);
    console.log(`  Original:   ${url}`);
    console.log(`  Normalized: ${normalized}`);
    if (normalized && normalized.includes('/api/media/') && !normalized.includes('/api/media/media/')) {
      console.log('    ✅ Normalization correct. [PASSED]');
    } else {
      console.log('    ❌ Normalization incorrect! [FAILED]');
      allPassed = false;
    }
  }

  console.log('\n==================================================');
  if (allPassed) {
    console.log('🎉 Verification script: all checks passed!');
  } else {
    console.log('❌ Verification script: some checks FAILED!');
  }
  console.log('==================================================');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

main();

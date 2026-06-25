#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function testUrl(url, headers = {}) {
  try {
    const res = await fetch(url, { method: 'GET', headers });
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentLength: res.headers.get('content-length'),
      acceptRanges: res.headers.get('accept-ranges'),
      contentRange: res.headers.get('content-range'),
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (err) {
    return { status: null, error: err.message };
  }
}

async function main() {
  const port = process.argv[2] || '3001';
  console.log('==================================================');
  console.log('🔍 Starting Media Gateway Architecture Audit & Verification...');
  console.log(`Target Dev Server Port: ${port}`);
  console.log('==================================================\n');

  let allPassed = true;

  // Check 1: Scan Database to ensure NO public provider URLs are stored (only neutral keys or tasks)
  console.log('Check 1: Scanning DB to ensure zero raw provider URLs are stored...');
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

  let rawUrlCount = 0;
  for (const model of targetModels) {
    if (!prisma[model]) continue;
    try {
      const records = await prisma[model].findMany({});
      for (const record of records) {
        const recordStr = JSON.stringify(record);
        if (recordStr.includes('r2.dev') || recordStr.includes('backblazeb2.com')) {
          // Exclude debug fields like publicPreviewUrl in schema if any, but they are not stored in DB
          rawUrlCount++;
          console.log(`  ❌ Raw URL found in DB: ${model} record has R2/B2 absolute URL.`);
        }
      }
    } catch (err) {
      console.error(`  ⚠️ Failed to scan model ${model}:`, err.message);
    }
  }

  if (rawUrlCount === 0) {
    console.log('  ✅ DB Contract: 0 absolute raw provider URLs found. Neutral object keys only. [PASSED]');
  } else {
    console.log(`  ❌ DB Contract: Found ${rawUrlCount} absolute provider URLs stored! [FAILED]`);
    allPassed = false;
  }

  // Check 2: Verify normalized URLs in responses
  console.log('\nCheck 2: Verifying Central Normalizer behavior...');
  const { resolveMediaUrl } = require('../lib/media-gateway/index');
  const testInputs = [
    'videos/user_xxx/file.mp4',
    'https://pub-123.r2.dev/images/user_xxx/img.png',
    'https://f003.backblazeb2.com/file/saadstudio-storage/audio/user_xxx/audio.mp3',
    '/api/media/media/videos/user_xxx/file.mp4'
  ];

  for (const input of testInputs) {
    const output = resolveMediaUrl(input);
    console.log(`  Input:  ${input}`);
    console.log(`  Output: ${output}`);
    
    const isValidFormat = output.startsWith('/api/media/') && !output.includes('/api/media/media/') && !output.includes('r2.dev') && !output.includes('backblazeb2.com');
    if (isValidFormat) {
      console.log('    ✅ Format Correct. [PASSED]');
    } else {
      console.log('    ❌ Format Invalid! [FAILED]');
      allPassed = false;
    }
  }

  // Check 3: Live Media Gateway proxy test
  console.log('\nCheck 3: Testing live /api/media proxy streaming...');
  const completedVideo = await prisma.generation.findFirst({
    where: {
      status: 'completed',
      mediaUrl: { not: null }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!completedVideo) {
    console.log('  ⚠️ No completed generations found in DB to test live streaming.');
  } else {
    const objectKey = completedVideo.mediaUrl;
    const mediaUrl = `http://localhost:${port}/api/media/${objectKey}`;
    console.log(`  Testing objectKey: ${objectKey}`);
    console.log(`  URL: ${mediaUrl}`);

    // Standard GET (No Range)
    console.log('  Testing Standard GET (Status 200 expected)...');
    const getResult = await testUrl(mediaUrl);
    console.log(`    Status: ${getResult.status} | Content-Type: ${getResult.contentType} | Content-Length: ${getResult.contentLength}`);
    if (getResult.status === 200) {
      console.log('    ✅ Standard GET returns 200 OK. [PASSED]');
    } else {
      console.log(`    ❌ Standard GET failed (Status: ${getResult.status}) [FAILED]`);
      allPassed = false;
    }

    // Range GET (Status 206 expected)
    console.log('  Testing Range Request (Status 206 expected)...');
    const rangeResult = await testUrl(mediaUrl, { 'Range': 'bytes=0-100' });
    console.log(`    Status: ${rangeResult.status} | Content-Range: ${rangeResult.contentRange} | Accept-Ranges: ${rangeResult.acceptRanges}`);
    if (rangeResult.status === 206) {
      console.log('    ✅ Range request returns 206 Partial Content. [PASSED]');
    } else {
      console.log(`    ❌ Range request failed (Status: ${rangeResult.status}) [FAILED]`);
      allPassed = false;
    }

    // Check that headers are masked (no backblazeb2 or r2 in body/headers)
    const headerStr = JSON.stringify(getResult.headers);
    if (headerStr.includes('backblazeb2.com') || headerStr.includes('r2.dev')) {
      console.log('    ❌ Provider domains leaked in response headers! [FAILED]');
      allPassed = false;
    } else {
      console.log('    ✅ Provider domains successfully hidden from response headers. [PASSED]');
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

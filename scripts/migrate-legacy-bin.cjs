#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');
const { S3Client, HeadObjectCommand, CopyObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.B2_REGION || "eu-central-003",
  endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
  }
});
const bucket = process.env.B2_BUCKET || "saadstudio-storage";

async function readFirstBytes(key, bytesCount = 100) {
  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${bytesCount - 1}`
    }));
    const streamToBuffer = async (stream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    };
    const buffer = await streamToBuffer(res.Body);
    return buffer.toString('utf8');
  } catch (err) {
    return '';
  }
}

async function main() {
  const isWrite = process.argv.includes('--write');

  console.log('==================================================');
  console.log(`📦 Running Legacy .bin Migration: ${isWrite ? '🔥 WRITE MODE' : '🔍 DRY-RUN MODE'}`);
  console.log('==================================================');

  let totalScanned = 0;
  let totalFixed = 0;
  let totalRemainingBad = 0;

  try {
    const records = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: '.bin' } },
          { outputUrl: { contains: '.bin' } }
        ]
      }
    });

    totalScanned = records.length;
    console.log(`Found ${records.length} records with .bin files to migrate.`);

    for (const r of records) {
      console.log(`\nAnalyzing Generation ID: ${r.id} (Type: ${r.assetType}, Model: ${r.modelUsed})`);
      
      let newMediaUrl = r.mediaUrl;
      let newOutputUrl = r.outputUrl;
      let migrationSuccess = true;

      const keysToMigrate = [];
      if (r.mediaUrl && r.mediaUrl.includes('.bin')) {
        keysToMigrate.push({ field: 'mediaUrl', key: r.mediaUrl });
      }
      if (r.outputUrl && r.outputUrl.includes('.bin') && r.outputUrl !== r.mediaUrl) {
        keysToMigrate.push({ field: 'outputUrl', key: r.outputUrl });
      }

      for (const item of keysToMigrate) {
        const originalKey = item.key;
        console.log(`  - Original Key (${item.field}): ${originalKey}`);
        
        try {
          // Get B2 Info
          const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: originalKey }));
          const size = head.ContentLength || 0;
          
          let extension = '.mp4';
          let contentType = 'video/mp4';

          if (r.assetType === 'IMAGE' || originalKey.includes('images/')) {
            extension = '.jpg';
            contentType = 'image/jpeg';
          } else if (r.assetType === 'TRANSCRIPTION' || size <= 15360) { // Under 15KB is likely subtitles
            // Read first bytes to see if it's WebVTT or SRT
            const header = await readFirstBytes(originalKey, 50);
            if (header.toUpperCase().includes('WEBVTT')) {
              extension = '.vtt';
              contentType = 'text/vtt';
            } else {
              extension = '.srt';
              contentType = 'text/plain'; // or application/x-subrip
            }
          }

          const targetKey = originalKey.replace(/\.bin$/, extension);
          console.log(`    Mapped extension: ${extension} (Size: ${size} bytes, ContentType: ${contentType})`);
          console.log(`    Target Key: ${targetKey}`);

          if (isWrite) {
            // S3 Copy Object
            await s3.send(new CopyObjectCommand({
              Bucket: bucket,
              CopySource: encodeURIComponent(`${bucket}/${originalKey}`),
              Key: targetKey,
              ContentType: contentType,
              MetadataDirective: 'REPLACE'
            }));
            console.log(`    ✅ Copied object on B2 to: ${targetKey}`);
          }

          if (item.field === 'mediaUrl') {
            newMediaUrl = targetKey;
            if (r.outputUrl === r.mediaUrl) {
              newOutputUrl = targetKey;
            }
          } else {
            newOutputUrl = targetKey;
          }
        } catch (err) {
          console.error(`    ❌ Failed to process ${originalKey}: ${err.message}`);
          migrationSuccess = false;
        }
      }

      if (migrationSuccess) {
        const hasChanges = newMediaUrl !== r.mediaUrl || newOutputUrl !== r.outputUrl;
        if (hasChanges) {
          if (isWrite) {
            await prisma.generation.update({
              where: { id: r.id },
              data: {
                mediaUrl: newMediaUrl,
                outputUrl: newOutputUrl
              }
            });
            console.log(`    ✅ Updated database record.`);
          } else {
            console.log(`    [DRY-RUN] Will update database record.`);
          }
          totalFixed++;
        }
      } else {
        totalRemainingBad++;
      }
    }

    console.log('\n================ MIGRATION REPORT ================');
    console.log(`Total scanned: ${totalScanned}`);
    console.log(`Total fixed:   ${totalFixed}`);
    console.log(`Total remaining bad (unrecoverable/failed): ${totalRemainingBad}`);
    console.log('==================================================');

  } catch (error) {
    console.error('Migration execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function extractMediaPath(url) {
  // Extract from pub-*.r2.dev URLs
  const r2Match = url.match(/pub-[a-f0-9]+\.r2\.dev\/(.*)/i);
  if (r2Match && r2Match[1]) {
    return decodeURIComponent(r2Match[1]);
  }
  
  // Extract from backblaze URLs
  const b2Match = url.match(/(?:f\d+\.backblazeb2\.com\/file\/[^/]+|media\.saadstudio\.app)\/(.*)/i);
  if (b2Match && b2Match[1]) {
    return decodeURIComponent(b2Match[1]);
  }
  
  // If it's already an object key (no https://), return it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise, try to extract the path after the first directory
  const pathMatch = url.match(/\/(images|videos|audio|thumbnails|media)\/(.*)/i);
  if (pathMatch) {
    return pathMatch[1] + '/' + pathMatch[2];
  }
  
  return url;
}

async function checkRemainingR2Urls() {
  console.log('\n--- Checking remaining pub-*.r2.dev URLs ---');
  
  // Check Generation table
  const generationsWithR2 = await prisma.generation.findMany({
    where: {
      OR: [
        { mediaUrl: { contains: 'pub-' } },
        { mediaUrl: { contains: '.r2.dev' } },
        { outputUrl: { contains: 'pub-' } },
        { outputUrl: { contains: '.r2.dev' } }
      ]
    },
    select: { id: true, mediaUrl: true, outputUrl: true }
  });
  
  // Check ShowcaseItem table
  const showcaseWithR2 = await prisma.showcaseItem.findMany({
    where: {
      OR: [
        { videoUrl: { contains: 'pub-' } },
        { videoUrl: { contains: '.r2.dev' } },
        { thumbnailUrl: { contains: 'pub-' } },
        { thumbnailUrl: { contains: '.r2.dev' } }
      ]
    },
    select: { id: true, videoUrl: true, thumbnailUrl: true }
  });
  
  // Check UserCharacter table
  const charsWithR2 = await prisma.userCharacter.findMany({
    where: {
      OR: [
        { coverUrl: { contains: 'pub-' } },
        { coverUrl: { contains: '.r2.dev' } }
      ]
    },
    select: { id: true, coverUrl: true, referenceUrls: true }
  });
  
  let totalRemaining = generationsWithR2.length + showcaseWithR2.length + charsWithR2.length;
  
  // Also check referenceUrls arrays in UserCharacter
  for (const char of charsWithR2) {
    if (Array.isArray(char.referenceUrls)) {
      for (const url of char.referenceUrls) {
        if (typeof url === 'string' && (url.includes('pub-') || url.includes('.r2.dev'))) {
          totalRemaining++;
        }
      }
    }
  }
  
  console.log('Generations with pub-*.r2.dev URLs: ' + generationsWithR2.length);
  console.log('Showcase items with pub-*.r2.dev URLs: ' + showcaseWithR2.length);
  console.log('User characters with pub-*.r2.dev URLs: ' + charsWithR2.length);
  console.log('TOTAL remaining pub-*.r2.dev URLs: ' + totalRemaining);
  
  return totalRemaining;
}

async function normalizeGenerationMediaUrls() {
  console.log('\n--- Starting normalization of Generation media URLs ---');
  
  const generations = await prisma.generation.findMany({
    select: { id: true, mediaUrl: true, outputUrl: true }
  });
  
  console.log('Scanned ' + generations.length + ' generations');
  
  let updated = 0;
  
  for (const gen of generations) {
    let needsUpdate = false;
    let newMediaUrl = gen.mediaUrl;
    let newOutputUrl = gen.outputUrl;
    
    if (gen.mediaUrl) {
      const extracted = extractMediaPath(gen.mediaUrl);
      if (extracted && extracted !== gen.mediaUrl) {
        newMediaUrl = extracted;
        needsUpdate = true;
      }
    }
    
    if (gen.outputUrl) {
      const extracted = extractMediaPath(gen.outputUrl);
      if (extracted && extracted !== gen.outputUrl) {
        newOutputUrl = extracted;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      await prisma.generation.update({
        where: { id: gen.id },
        data: {
          mediaUrl: newMediaUrl,
          outputUrl: newOutputUrl
        }
      });
      updated++;
    }
  }
  
  console.log('Updated ' + updated + ' generations');
  return { scanned: generations.length, updated };
}

async function normalizeShowcaseItemMediaUrls() {
  console.log('\n--- Starting normalization of ShowcaseItem media URLs ---');
  
  const items = await prisma.showcaseItem.findMany({
    select: { id: true, videoUrl: true, thumbnailUrl: true }
  });
  
  console.log('Scanned ' + items.length + ' showcase items');
  
  let updated = 0;
  
  for (const item of items) {
    let needsUpdate = false;
    let newVideoUrl = item.videoUrl;
    let newThumbnailUrl = item.thumbnailUrl;
    
    if (item.videoUrl) {
      const extracted = extractMediaPath(item.videoUrl);
      if (extracted && extracted !== item.videoUrl) {
        newVideoUrl = extracted;
        needsUpdate = true;
      }
    }
    
    if (item.thumbnailUrl) {
      const extracted = extractMediaPath(item.thumbnailUrl);
      if (extracted && extracted !== item.thumbnailUrl) {
        newThumbnailUrl = extracted;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      await prisma.showcaseItem.update({
        where: { id: item.id },
        data: {
          videoUrl: newVideoUrl,
          thumbnailUrl: newThumbnailUrl
        }
      });
      updated++;
    }
  }
  
  console.log('Updated ' + updated + ' showcase items');
  return { scanned: items.length, updated };
}

async function normalizeUserCharacterMediaUrls() {
  console.log('\n--- Starting normalization of UserCharacter media URLs ---');
  
  const chars = await prisma.userCharacter.findMany({
    select: { id: true, referenceUrls: true, coverUrl: true }
  });
  
  console.log('Scanned ' + chars.length + ' user characters');
  
  let updated = 0;
  
  for (const char of chars) {
    let needsUpdate = false;
    const newCoverUrl = char.coverUrl ? extractMediaPath(char.coverUrl) : char.coverUrl;
    
    // Type check referenceUrls
    let newReferenceUrls = char.referenceUrls;
    if (Array.isArray(char.referenceUrls)) {
      newReferenceUrls = char.referenceUrls.map((url) => {
        if (typeof url === 'string') {
          const extracted = extractMediaPath(url);
          return extracted || url;
        }
        return url;
      });
    }
    
    if (newCoverUrl !== char.coverUrl) {
      needsUpdate = true;
    }
    if (JSON.stringify(newReferenceUrls) !== JSON.stringify(char.referenceUrls)) {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await prisma.userCharacter.update({
        where: { id: char.id },
        data: {
          coverUrl: newCoverUrl,
          referenceUrls: newReferenceUrls
        }
      });
      updated++;
    }
  }
  
  console.log('Updated ' + updated + ' user characters');
  return { scanned: chars.length, updated };
}

async function main() {
  let totalScanned = 0;
  let totalUpdated = 0;
  
  try {
    // Normalize all tables
    const genStats = await normalizeGenerationMediaUrls();
    totalScanned += genStats.scanned;
    totalUpdated += genStats.updated;
    
    const showcaseStats = await normalizeShowcaseItemMediaUrls();
    totalScanned += showcaseStats.scanned;
    totalUpdated += showcaseStats.updated;
    
    const charStats = await normalizeUserCharacterMediaUrls();
    totalScanned += charStats.scanned;
    totalUpdated += charStats.updated;
    
    // Check remaining R2 URLs
    const remainingR2 = await checkRemainingR2Urls();
    
    // Print summary
    console.log('\n--- SUMMARY ---');
    console.log('Total records scanned: ' + totalScanned);
    console.log('Total records updated: ' + totalUpdated);
    console.log('Remaining pub-*.r2.dev URLs: ' + remainingR2);
  } catch (error) {
    console.error('Error normalizing media URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

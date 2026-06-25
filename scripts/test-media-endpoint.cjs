#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUrl(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Content-Length: ${res.headers.get('content-length')}`);
    console.log('--------------------------------------------------');
    return res.status;
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

async function main() {
  const port = process.argv[2] || '3001';
  console.log(`Testing /api/media endpoint on port ${port}...`);

  // Fetch some real generations from the database to test
  const generations = await prisma.generation.findMany({
    where: {
      OR: [
        { mediaUrl: { not: null } },
        { outputUrl: { not: null } }
      ]
    },
    take: 3,
    orderBy: { createdAt: 'desc' }
  });

  if (generations.length === 0) {
    console.log('No generations found in the database to test.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${generations.length} recent generations for testing.`);
  console.log('==================================================');

  for (const gen of generations) {
    console.log(`Generation ID: ${gen.id}`);
    
    if (gen.mediaUrl && !gen.mediaUrl.startsWith('http')) {
      const url = `http://localhost:${port}/api/media/${gen.mediaUrl}`;
      await testUrl(url);
    } else if (gen.mediaUrl) {
      console.log(`Skipping mediaUrl (not an object key): ${gen.mediaUrl}`);
    }

    if (gen.outputUrl && !gen.outputUrl.startsWith('http')) {
      const url = `http://localhost:${port}/api/media/${gen.outputUrl}`;
      await testUrl(url);
    } else if (gen.outputUrl) {
      console.log(`Skipping outputUrl (not an object key): ${gen.outputUrl}`);
    }
  }

  await prisma.$disconnect();
}

main();

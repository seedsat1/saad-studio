#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get a few generations to check
  const generations = await prisma.generation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      mediaUrl: true,
      outputUrl: true,
      createdAt: true
    }
  });
  
  console.log('Recent generations:');
  console.log(JSON.stringify(generations, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

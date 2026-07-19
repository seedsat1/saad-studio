const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promptMatches = await prisma.generation.findMany({
    where: {
      OR: [
        { prompt: { contains: 'Buenos Aires', mode: 'insensitive' } },
        { prompt: { contains: 'seedance', mode: 'insensitive' } },
        { prompt: { contains: 'Argentine', mode: 'insensitive' } },
        { prompt: { contains: 'doscientos', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Matching Generations in DB:', promptMatches.length);
  if (promptMatches.length > 0) {
    console.log('Found records:', JSON.stringify(promptMatches, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

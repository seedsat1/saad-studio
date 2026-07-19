const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DEEP SEARCH FOR ARGENTINE / CASINO / PROMPT KEYWORDS IN ALL DB TABLES ===");

  const keywords = [
    "Argentine",
    "Buenos Aires",
    "Bono",
    "doscientos",
    "casino",
    "porteño",
    "birra",
    "pantalla",
    "depósito",
    "nano-banana-pro",
    "a small red apple"
  ];

  // 1. Search Generation
  const gens = await prisma.generation.findMany({
    where: {
      OR: keywords.map(kw => ({ prompt: { contains: kw, mode: 'insensitive' } }))
    },
    include: { user: true }
  });
  console.log(`Found ${gens.length} generations in Generation table matching prompt keywords:`);
  gens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Cost: ${g.cost} | Prompt: ${g.prompt.substring(0, 80)}`);
  });

  // 2. Search ProviderUsageRecord
  const pur = await prisma.providerUsageRecord.findMany({
    where: {
      OR: keywords.map(kw => ({ rawPayloadSafe: { contains: kw, mode: 'insensitive' } }))
    },
    include: { user: true }
  });
  console.log(`\nFound ${pur.length} records in ProviderUsageRecord matching keywords:`);
  pur.forEach(p => {
    console.log(`[${p.createdAt.toISOString()}] User: ${p.user?.email} | Model: ${p.providerModel} | TaskId: ${p.providerRequestId}`);
  });

  // 3. Search GenerationRequestSnapshot
  const snaps = await prisma.generationRequestSnapshot.findMany({
    where: {
      OR: keywords.map(kw => ({ requestPayload: { path: ['prompt'], string_contains: kw } }))
    }
  });
  console.log(`\nFound ${snaps.length} snapshots matching keywords.`);

  // 4. Search User records created or updated around July 18
  console.log("\n=== Checking all Generations on July 18 (2026-07-18) ===");
  const july18Gens = await prisma.generation.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-18T00:00:00.000Z'),
        lt: new Date('2026-07-19T00:00:00.000Z')
      }
    },
    include: { user: true }
  });
  console.log(`Total generations in DB on 2026-07-18: ${july18Gens.length}`);
  july18Gens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email} | Model: ${g.modelUsed} | Prompt: ${g.prompt.substring(0, 60)}`);
  });

  // 5. Search all Generations on July 17 (2026-07-17)
  console.log("\n=== Checking all Generations on July 17 (2026-07-17) ===");
  const july17Gens = await prisma.generation.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-17T00:00:00.000Z'),
        lt: new Date('2026-07-18T00:00:00.000Z')
      }
    },
    include: { user: true }
  });
  console.log(`Total generations in DB on 2026-07-17: ${july17Gens.length}`);
  july17Gens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email} | Model: ${g.modelUsed} | Prompt: ${g.prompt.substring(0, 60)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

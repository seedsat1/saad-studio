const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING DB FOR JULY 19, 2026 GENERATIONS & TASK IDs ===");

  const targetTaskIds = [
    "1e09e57fd62405aff112ca8364d9f5c4",
    "8071b16d42d7460ab077ca52a0047e",
    "1e09e57f",
    "8071b16d"
  ];

  // 1. Search Generations created on 2026-07-19
  const july19Gens = await prisma.generation.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-19T00:00:00.000Z')
      }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  console.log(`Found ${july19Gens.length} generations in DB on 2026-07-19:`);
  july19Gens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User Email: ${g.user?.email || g.userId} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Cost: ${g.cost} | Status: ${g.status} | Prompt: ${g.prompt?.substring(0, 70)}`);
  });

  // 2. Search ProviderUsageRecord created on 2026-07-19
  const july19Pur = await prisma.providerUsageRecord.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-19T00:00:00.000Z')
      }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  console.log(`\nFound ${july19Pur.length} ProviderUsageRecords in DB on 2026-07-19:`);
  july19Pur.forEach(p => {
    console.log(`[${p.createdAt.toISOString()}] User Email: ${p.user?.email || p.userId} | Model: ${p.providerModel} | TaskId: ${p.providerRequestId} | Status: ${p.status} | RawPayload: ${p.rawPayloadSafe?.substring(0, 100)}`);
  });

  // 3. Search for specific task IDs in Generation table
  const specificGens = await prisma.generation.findMany({
    where: {
      OR: targetTaskIds.map(t => ({ providerRequestId: { contains: t } }))
    },
    include: { user: true }
  });
  console.log(`\nFound ${specificGens.length} specific generation matches for task IDs:`);
  specificGens.forEach(g => {
    console.log(`- Gen ID: ${g.id}, Task ID: ${g.providerRequestId}, Email: ${g.user?.email}, Model: ${g.modelUsed}, Prompt: ${g.prompt}`);
  });

  // 4. Search for specific task IDs in ProviderUsageRecord
  const specificPur = await prisma.providerUsageRecord.findMany({
    where: {
      OR: targetTaskIds.map(t => ({ providerRequestId: { contains: t } }))
    },
    include: { user: true }
  });
  console.log(`\nFound ${specificPur.length} specific ProviderUsageRecord matches for task IDs:`);
  specificPur.forEach(p => {
    console.log(`- PUR ID: ${p.id}, Task ID: ${p.providerRequestId}, Email: ${p.user?.email}, Model: ${p.providerModel}`);
  });

  // 5. Search GenerationRequestSnapshot
  const snaps = await prisma.generationRequestSnapshot.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-19T00:00:00.000Z')
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nFound ${snaps.length} GenerationRequestSnapshots on 2026-07-19:`);
  for (const s of snaps) {
    const u = await prisma.user.findUnique({ where: { id: s.userId } });
    console.log(`[${s.createdAt.toISOString()}] User Email: ${u?.email} | Model: ${s.model} | GenId: ${s.generationId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

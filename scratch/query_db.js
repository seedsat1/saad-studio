const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying Generation table for BytePlus models...");
  const gens = await prisma.generation.findMany({
    where: {
      providerName: {
        contains: 'byteplus',
        mode: 'insensitive'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      modelUsed: true,
      providerModel: true,
      status: true,
      prompt: true,
      providerRequestId: true,
      generationRequestSnapshot: true
    }
  });

  console.log(`Found ${gens.length} generations:`);
  gens.forEach(g => {
    console.log(`- Date: ${g.createdAt}, ModelUsed: ${g.modelUsed}, ProviderModel: ${g.providerModel}, Status: ${g.status}`);
    if (g.generationRequestSnapshot) {
      console.log(`  Snapshot Request: ${g.generationRequestSnapshot.requestPayload}`);
      console.log(`  Snapshot Response: ${g.generationRequestSnapshot.responsePayload}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

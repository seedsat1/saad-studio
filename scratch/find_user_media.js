const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const searchKey = "1780349239104-qd7s1axz-2.bin";

  try {
    console.log(`Searching database for: ${searchKey}`);

    // Check Generation table
    const gens = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: searchKey } },
          { outputUrl: { contains: searchKey } }
        ]
      }
    });
    console.log(`Generation matches: ${gens.length}`);
    gens.forEach(g => {
      console.log(`- ID: ${g.id}`);
      console.log(`  mediaUrl: ${g.mediaUrl}`);
      console.log(`  outputUrl: ${g.outputUrl}`);
    });

    // Check TransitionOutput table
    const trans = await prisma.transitionOutput.findMany({
      where: {
        OR: [
          { url: { contains: searchKey } },
          { thumbnailUrl: { contains: searchKey } }
        ]
      }
    });
    console.log(`TransitionOutput matches: ${trans.length}`);
    trans.forEach(t => {
      console.log(`- ID: ${t.id}`);
      console.log(`  url: ${t.url}`);
    });

  } catch (error) {
    console.error("Search failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

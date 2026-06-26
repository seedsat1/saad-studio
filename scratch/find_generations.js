const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const gens = await prisma.generation.findMany({
    where: {
      userId: "user_3CMgl0E1u3OcgATvBIZR3rByAXo"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });
  console.log(`Found ${gens.length} generations for user_3CMgl0E1u3OcgATvBIZR3rByAXo:`);
  gens.forEach(g => {
    console.log(`ID: ${g.id}, Status: ${g.status}, mediaUrl: ${g.mediaUrl}, outputUrl: ${g.outputUrl}`);
  });

  const specific = await prisma.generation.findMany({
    where: {
      OR: [
        { mediaUrl: { contains: "persisted-f28107f0-9bdc-41ec-b040-807c3b84081a" } },
        { outputUrl: { contains: "persisted-f28107f0-9bdc-41ec-b040-807c3b84081a" } }
      ]
    }
  });
  console.log(`Specific query returned ${specific.length} records:`);
  console.log(JSON.stringify(specific, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

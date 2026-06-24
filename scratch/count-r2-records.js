const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  const countMedia = await prisma.generation.count({
    where: {
      mediaUrl: {
        contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev",
      },
    },
  });

  const countOutput = await prisma.generation.count({
    where: {
      outputUrl: {
        contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev",
      },
    },
  });

  console.log(`Found ${countMedia} records with old R2 URL in mediaUrl`);
  console.log(`Found ${countOutput} records with old R2 URL in outputUrl`);
  
  const sample = await prisma.generation.findFirst({
    where: {
      OR: [
        { mediaUrl: { contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev" } },
        { outputUrl: { contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev" } }
      ]
    },
    select: {
      id: true,
      mediaUrl: true,
      outputUrl: true
    }
  });
  
  if (sample) {
    console.log("Sample record:", sample);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

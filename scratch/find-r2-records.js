const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const record = await prisma.generation.findFirst({
    where: {
      OR: [
        { mediaUrl: { startsWith: "http" } },
        { outputUrl: { startsWith: "http" } }
      ]
    },
    select: {
      id: true,
      mediaUrl: true,
      outputUrl: true
    }
  });
  console.log("Record from database:", record);
}

main().catch(console.error).finally(() => prisma.$disconnect());

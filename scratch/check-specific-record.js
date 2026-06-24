const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const record = await prisma.generation.findUnique({
    where: { id: "cmpmx62iv0002k04pqn0ua36t" },
    select: {
      id: true,
      mediaUrl: true,
      outputUrl: true
    }
  });
  console.log("Specific record from database:", record);
}

main().catch(console.error).finally(() => prisma.$disconnect());

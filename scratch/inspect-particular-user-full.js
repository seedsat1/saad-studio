const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      transactions: true,
      generations: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
  
  if (!user) {
    console.log(`User by ID ${userId} not found.`);
    return;
  }
  
  console.log("=== USER DETAILS ===");
  console.log(JSON.stringify(user, null, 2));

  console.log("\=== LATEST GENERATION REQUEST SNAPSHOTS ===");
  const snapshots = await prisma.generationRequestSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(snapshots, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

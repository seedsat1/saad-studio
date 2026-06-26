const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    console.log(`User ${userId} not found.`);
    return;
  }
  
  const generations = await prisma.generation.findMany({
    where: { userId },
  });
  
  let totalSpent = 0;
  for (const gen of generations) {
    totalSpent += gen.cost;
  }
  
  console.log(`User Name: ${user.name}`);
  console.log(`Total Generations count: ${generations.length}`);
  console.log(`Total Spent Credits in generations: ${totalSpent}`);
  
  const completedTx = await prisma.adminTransaction.findMany({
    where: { userId, paymentStatus: "COMPLETED" },
  });
  
  let totalPurchased = 0;
  for (const tx of completedTx) {
    totalPurchased += tx.credits;
  }
  console.log(`Total Purchased/Allocated Credits from transactions: ${totalPurchased}`);
  
  console.log(`Current DB Credit Balance: ${user.creditBalance}`);
  console.log(`Current DB Monthly Credits: ${user.monthlyCredits}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DETAILS FOR SUBSCRIBER crimn694@gmail.com ===");

  const user = await prisma.user.findUnique({
    where: { email: 'crimn694@gmail.com' },
    include: {
      generations: {
        orderBy: { createdAt: 'desc' },
        take: 30
      },
      transactions: true
    }
  });

  console.log("User Info:");
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Credit Balance: ${user.creditBalance}`);
  console.log(`- Created At: ${user.createdAt.toISOString()}`);

  console.log("\nTransactions:");
  user.transactions.forEach(t => {
    console.log(`- [${t.createdAt.toISOString()}] Plan: ${t.plan} | Amount: $${t.amount} | Status: ${t.paymentStatus}`);
  });

  console.log("\nRecent 30 Generations:");
  user.generations.forEach(g => {
    console.log(`- [${g.createdAt.toISOString()}] Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Cost: ${g.cost} | Status: ${g.status} | Prompt: ${g.prompt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

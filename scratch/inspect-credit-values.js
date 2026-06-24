const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const allTxs = await prisma.adminTransaction.findMany({
    where: { paymentStatus: "COMPLETED" },
    select: { userId: true, amount: true, credits: true },
  });

  const userCreditValues = {};
  allUsers.forEach((user) => {
    const userTxs = allTxs.filter(t => t.userId === user.id);
    const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
    const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
    const isOmar = user.email === "omarworkimn@gmail.com";
    const creditsGranted = txCredits + (isOmar ? 2700 : 0);
    userCreditValues[user.id] = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0;
    
    if (totalPayments > 0) {
      console.log(`User: ${user.email}`);
      console.log(`  Total Payments: $${totalPayments}`);
      console.log(`  Credits Granted: ${creditsGranted}`);
      console.log(`  Credit Value: $${userCreditValues[user.id].toFixed(4)}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

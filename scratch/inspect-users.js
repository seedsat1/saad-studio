const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "ofemuh@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      transactions: true,
    }
  });
  
  if (!user) {
    console.log(`User not found.`);
    return;
  }
  
  console.log(`User ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name}`);
  console.log(`Credit Balance: ${user.creditBalance}`);
  console.log(`Role: ${user.role}`);
  console.log(`Created At: ${user.createdAt}`);
  
  const sub = await prisma.userSubscription.findUnique({
    where: { userId: user.id }
  });
  console.log(`Subscription:`, sub);
  console.log(`Transactions:`, user.transactions);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

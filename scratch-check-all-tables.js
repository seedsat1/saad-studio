const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking database connection info ===");
  console.log("Database URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

  console.log("\n=== Checking AdminTransactions ===");
  const txs = await prisma.adminTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: true }
  });
  txs.forEach(t => {
    console.log(`[${t.createdAt.toISOString()}] User: ${t.user?.email} | Plan: ${t.plan} | Amount: ${t.amount} | Status: ${t.paymentStatus}`);
  });

  console.log("\n=== Checking ReapJobs ===");
  const reap = await prisma.reapJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  reap.forEach(r => {
    console.log(`[${r.createdAt.toISOString()}] User: ${r.userId} | Tool: ${r.tool} | Status: ${r.status}`);
  });

  console.log("\n=== Checking all users updated recently ===");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total users: ${users.length}`);

  console.log("\n=== Users with credit balances > 0 ===");
  const usersWithCredits = users.filter(u => u.creditBalance > 0);
  usersWithCredits.forEach(u => {
    console.log(`- ${u.email}: ${u.creditBalance} credits (Role: ${u.role}, Created: ${u.createdAt.toISOString()})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

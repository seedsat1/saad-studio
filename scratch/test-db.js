const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const jobs = await prisma.transitionJob.findMany({
      where: {
        projectId: "cmo36vvfk0000a6u488lckrg9",
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log("Jobs for cmo36vvfk0000a6u488lckrg9:", JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const row = await prisma.generation.findUnique({
      where: {
        id: "cmr9wj8z50002b2pd34g1r1qk"
      }
    });
    console.log(JSON.stringify(row, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

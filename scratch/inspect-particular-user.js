const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const usersByName = await prisma.user.findMany({
    where: {
      name: {
        contains: "Saad Design"
      }
    }
  });
  console.log(`Found ${usersByName.length} users with name 'Saad Design':`);
  console.log(JSON.stringify(usersByName, null, 2));

  const usersByCredits = await prisma.user.findMany({
    where: {
      creditBalance: {
        gte: 2500,
        lte: 2600
      }
    }
  });
  console.log(`Found ${usersByCredits.length} users with credits between 2500 and 2600:`);
  console.log(JSON.stringify(usersByCredits, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching PricingConstitution from DB...");
  const constitution = await prisma.pricingConstitution.findMany();
  console.log(JSON.stringify(constitution, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== PRICING CONSTITUTION ===");
  const models = await prisma.pricingConstitution.findMany();
  console.log(JSON.stringify(models, null, 2));

  console.log("\n=== PAGE LAYOUT (cms-pricing) ===");
  const pageLayouts = await prisma.pageLayout.findMany({
    where: { pageName: "cms-pricing" }
  });
  console.log(JSON.stringify(pageLayouts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const ids = [
    "cmqka381e00026w8d6cer4xpl", // 210 credits
    "cmqi4kl9z0005105xftr9ob3g", // 168 credits
    "cmqi4bh72000855a1xx6s9t3d", // 126 credits
    "cmqb1xzan00067dm78ydyshv6", // 105 credits
    "cmqk9v48p0005lg7ke93gpx0t"  // 23 credits
  ];

  const generations = await prisma.generation.findMany({
    where: { id: { in: ids } }
  });

  console.log(JSON.stringify(generations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

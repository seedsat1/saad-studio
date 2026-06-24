const { PrismaClient } = require("@prisma/client");

function cleanR2Url(url) {
  if (!url) return null;
  return url.replace(/https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev/gi, "https://saadstudio.app/api/media");
}

const globalPrisma = new PrismaClient();
const prismadb = globalPrisma.$extends({
  result: {
    generation: {
      mediaUrl: {
        needs: { mediaUrl: true },
        compute(data) {
          return cleanR2Url(data.mediaUrl);
        },
      },
      outputUrl: {
        needs: { outputUrl: true },
        compute(data) {
          return cleanR2Url(data.outputUrl);
        },
      },
    },
  },
});

async function main() {
  console.log("Testing raw client...");
  const rawSample = await globalPrisma.generation.findFirst({
    where: {
      OR: [
        { mediaUrl: { contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev" } },
        { outputUrl: { contains: "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev" } }
      ]
    },
    select: {
      id: true,
      mediaUrl: true,
      outputUrl: true
    }
  });
  console.log("Raw from database:", rawSample);

  if (rawSample) {
    console.log("Testing extended client...");
    const sample = await prismadb.generation.findUnique({
      where: { id: rawSample.id },
      select: {
        id: true,
        mediaUrl: true,
        outputUrl: true
      }
    });
    console.log("Returned from extended client:", sample);
  }
}

main()
  .catch(console.error)
  .finally(() => globalPrisma.$disconnect());

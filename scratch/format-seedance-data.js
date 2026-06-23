const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const generations = await prisma.generation.findMany({
    where: {
      modelUsed: {
        contains: "seedance",
        mode: "insensitive"
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20,
    include: {
      user: true
    }
  });

  if (generations.length === 0) {
    console.log("No Seedance generations found.");
    return;
  }

  const results = generations.map((g, idx) => {
    // Attempt to extract duration from prompt or metadata
    let duration = "Unknown (Est: 5s)";
    const durationMatch = g.prompt.match(/(?:duration|seconds|sec|time|مدة|ثانية)\s*[:=\s]\s*(\d+)/i);
    if (durationMatch) {
      duration = `${durationMatch[1]}s`;
    } else {
      // Look for standard duration keywords
      if (g.prompt.includes("15s") || g.prompt.includes("15 seconds") || g.prompt.includes("15 ثانية")) {
        duration = "15s";
      } else if (g.prompt.includes("10s") || g.prompt.includes("10 seconds") || g.prompt.includes("10 ثانية")) {
        duration = "10s";
      } else if (g.prompt.includes("5s") || g.prompt.includes("5 seconds") || g.prompt.includes("5 ثانية")) {
        duration = "5s";
      } else {
        // Estimate from cost if we can
        // cost = duration * userCreditsRate * qualityMultiplier
        // We know seedance2 has userCreditsRate = 7, multipliers: 1080p = 3.0, 720p = 1.0, 480p = 0.8
        // Let's check common cost patterns
        if (g.cost === 315) {
          duration = "15s (HQ 1080p)";
        } else if (g.cost === 105) {
          duration = "15s (HQ 720p) or 5s (HQ 1080p)";
        } else if (g.cost === 23) {
          duration = "Unknown (Old calculation)";
        }
      }
    }

    // Attempt to extract resolution
    let resolution = "720p (Default)";
    if (g.prompt.toLowerCase().includes("1080p") || g.prompt.toLowerCase().includes("1080") || g.prompt.toLowerCase().includes("hd")) {
      resolution = "1080p";
    } else if (g.prompt.toLowerCase().includes("4k") || g.prompt.toLowerCase().includes("uhd")) {
      resolution = "4K";
    } else if (g.prompt.toLowerCase().includes("480p") || g.prompt.toLowerCase().includes("sd")) {
      resolution = "480p";
    } else if (g.mediaUrl && g.mediaUrl.includes("1080")) {
      resolution = "1080p";
    }

    return {
      index: idx + 1,
      email: g.user.email,
      model: g.modelUsed,
      duration,
      resolution,
      creditsCharged: g.cost,
      createdAt: g.createdAt.toISOString(),
      id: g.id,
      promptSnippet: g.prompt.slice(0, 60) + "..."
    };
  });

  console.log("FORMATTED_SEEDANCE_DATA_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("FORMATTED_SEEDANCE_DATA_END");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

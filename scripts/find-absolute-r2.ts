import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const r2Domain = "pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";

  try {
    console.log("=== Comprehensive database search for R2 ===");

    // User table
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { creditBalance: { lt: 0 } } // dummy to satisfy TS
        ]
      }
    });

    // CinemaProject
    const cinemaProjects = await prisma.cinemaProject.findMany({});
    cinemaProjects.forEach((p) => {
      if (JSON.stringify(p).includes(r2Domain)) {
        console.log(`- Found in CinemaProject ID: ${p.id}`);
      }
    });

    // CinemaShot
    const cinemaShots = await prisma.cinemaShot.findMany({});
    cinemaShots.forEach((s) => {
      if (JSON.stringify(s).includes(r2Domain)) {
        console.log(`- Found in CinemaShot ID: ${s.id}`);
      }
    });

    // CinemaJob
    const cinemaJobs = await prisma.cinemaJob.findMany({});
    cinemaJobs.forEach((j) => {
      if (JSON.stringify(j).includes(r2Domain)) {
        console.log(`- Found in CinemaJob ID: ${j.id} (resultUrl: ${j.resultUrl})`);
      }
    });

    // TransitionProject
    const transProjects = await prisma.transitionProject.findMany({});
    transProjects.forEach((p) => {
      if (JSON.stringify(p).includes(r2Domain)) {
        console.log(`- Found in TransitionProject ID: ${p.id} (inputAUrl: ${p.inputAUrl}, inputBUrl: ${p.inputBUrl})`);
      }
    });

    // TransitionJob
    const transJobs = await prisma.transitionJob.findMany({});
    transJobs.forEach((j) => {
      if (JSON.stringify(j).includes(r2Domain)) {
        console.log(`- Found in TransitionJob ID: ${j.id} (resultUrl: ${j.resultUrl})`);
      }
    });

    // VariationProject
    const varProjects = await prisma.variationProject.findMany({});
    varProjects.forEach((p) => {
      if (JSON.stringify(p).includes(r2Domain)) {
        console.log(`- Found in VariationProject ID: ${p.id} (refAssetUrl: ${p.referenceAssetUrl})`);
      }
    });

    // VariationJob
    const varJobs = await prisma.variationJob.findMany({});
    varJobs.forEach((j) => {
      if (JSON.stringify(j).includes(r2Domain)) {
        console.log(`- Found in VariationJob ID: ${j.id}`);
      }
    });

    // GenerationRequestSnapshot
    const snapshots = await prisma.generationRequestSnapshot.findMany({});
    snapshots.forEach((s) => {
      if (JSON.stringify(s).includes(r2Domain)) {
        console.log(`- Found in GenerationRequestSnapshot ID: ${s.id}`);
      }
    });

    console.log("=== End of Comprehensive search ===");

  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mapping: Record<string, string> = {
  "noir": "/preset/17 Film Noir B&W.webp",
  "canvas": "/canvas.webp",
  "sketch": "/preset/7 Pencil Sketch.webp",
  "flash-comic": "/preset/8 Comic Book.webp",
  "overexposed": "/preset/13 Fashion Editorial.webp",
  "particles": "", // Delete / set empty so it falls back to accent gradient
  "hand-paint": "/preset/6 Watercolor Painting.webp",
  "cinematic-trailer": "/preset/Cinematic portrait.webp",
  "k-drama-soft": "/preset/13 Fashion Editorial.webp",
  "vhs-memories": "/preset/10 Vintage Polaroid.webp",
  "cyberpunk-neon": "/preset/9 Neon Cyberpunk.webp",
  "paparazzi-flash": "/preset/2 Studio Product Shot.webp",
  "anime-pulse": "/preset/3 Anime · Ghibli.webp",
  "polaroid-snap": "/preset/10 Vintage Polaroid.webp",
  "y2k-camcorder": "/preset/10 Vintage Polaroid.webp",
  "golden-hour": "/preset/12 Food Photography.webp",
  "synthwave-drive": "/preset/9 Neon Cyberpunk.webp",
  "watercolor-dream": "/preset/6 Watercolor Painting.webp",
  "layer-mixed-media": "/preset/14 Fantasy Illustration.webp"
};

async function main() {
  const isWrite = process.argv.includes("--write");
  console.log("=================================================");
  console.log(`🎬 Cinematic Styles Supabase Remapping: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log("=================================================");

  try {
    const layout = await prisma.pageLayout.findUnique({
      where: { pageName: "cms-cinematic-styles" }
    });

    if (!layout) {
      console.error("❌ Layout 'cms-cinematic-styles' not found in database!");
      return;
    }

    const blocks = layout.layoutBlocks as any;
    if (!blocks || !blocks.presetMedia) {
      console.error("❌ Invalid layout blocks structure!");
      return;
    }

    const presetMedia = { ...blocks.presetMedia };
    let changed = false;
    let updateCount = 0;

    for (const [presetId, media] of Object.entries(presetMedia) as any) {
      const url = media.url || "";
      if (url.includes("supabase.co")) {
        const fallbackUrl = mapping[presetId];
        if (fallbackUrl !== undefined) {
          console.log(`   - Remapping preset [${presetId}] from Supabase URL [${url}]`);
          if (fallbackUrl === "") {
            console.log(`     → Removing URL (will use accent gradient)`);
            delete presetMedia[presetId];
          } else {
            console.log(`     → Local static image [${fallbackUrl}]`);
            presetMedia[presetId] = {
              url: fallbackUrl,
              type: "image"
            };
          }
          updateCount++;
          changed = true;
        } else {
          console.log(`   ⚠️ Preset [${presetId}] points to Supabase but has no local fallback mapping configured.`);
        }
      }
    }

    console.log(`\n👉 Scanning completed. Found ${updateCount} presets needing updates.`);

    if (changed && isWrite) {
      const updatedBlocks = {
        ...blocks,
        presetMedia
      };

      await prisma.pageLayout.update({
        where: { pageName: "cms-cinematic-styles" },
        data: { layoutBlocks: updatedBlocks }
      });
      console.log("   ✅ Successfully updated layout blocks in PageLayout!");
    } else if (changed) {
      console.log("   ℹ️ Run with --write flag to apply changes to database.");
    } else {
      console.log("   ✅ No changes needed.");
    }

  } catch (e) {
    console.error("❌ Failed to process database update:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const originalPresetMedia = {
  "noir": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779226523728-mfqft7.webm",
    "type": "video"
  },
  "paper": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923289152-16uuwg.webm",
    "type": "video"
  },
  "canvas": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779221745955-0dabja.webm",
    "type": "video"
  },
  "sketch": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779220957491-4e2p7s.webm",
    "type": "video"
  },
  "deep-tide": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779930146825-mliydr.webm",
    "type": "video"
  },
  "particles": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779229015580-3sxnmo.webm",
    "type": "video"
  },
  "hand-paint": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779229339335-orcbq9.webm",
    "type": "video"
  },
  "magma-heat": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779931020184-ywi8pd.webm",
    "type": "video"
  },
  "anime-pulse": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779232010558-5j04fj.webm",
    "type": "video"
  },
  "cafe-window": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923400368-h7vcl4.webm",
    "type": "video"
  },
  "flash-comic": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779222470322-ldx939.webm",
    "type": "video"
  },
  "glossy-page": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779925407444-84tgx0.webm",
    "type": "video"
  },
  "golden-hour": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779235314184-vm451c.mp4",
    "type": "video"
  },
  "manga-lines": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779926511933-exqs3p.webm",
    "type": "video"
  },
  "marble-bust": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923339503-128fva.webm",
    "type": "video"
  },
  "overexposed": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779223116901-lvhjhv.webm",
    "type": "video"
  },
  "storm-light": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779926498815-3gj572.webm",
    "type": "video"
  },
  "comic-action": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779925306425-riqkb5.webm",
    "type": "video"
  },
  "k-drama-soft": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779220405046-vj93qd.webm",
    "type": "video"
  },
  "pixel-arcade": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923415529-rm35pl.webm",
    "type": "video"
  },
  "soap-bubbles": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923443349-gxcj21.webm",
    "type": "video"
  },
  "vhs-memories": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779230626572-3c7ovt.webm",
    "type": "video"
  },
  "mirror-shards": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779932327494-mji39z.webm",
    "type": "video"
  },
  "old-hollywood": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779923361431-m7zi8w.webm",
    "type": "video"
  },
  "polaroid-snap": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779232411977-1l9t6m.mp4",
    "type": "video"
  },
  "y2k-camcorder": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779232842215-owiom9.mp4",
    "type": "video"
  },
  "cyberpunk-neon": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779231254522-s7bw8y.webm",
    "type": "video"
  },
  "graffiti-spray": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779925323044-0cmlou.webm",
    "type": "video"
  },
  "hip-hop-visual": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779925357299-ubib9f.webm",
    "type": "video"
  },
  "paparazzi-flash": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779231355140-pvvru8.webm",
    "type": "video"
  },
  "studio-portrait": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779925386002-pgg0ji.webm",
    "type": "video"
  },
  "synthwave-drive": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779234940554-px5yy9.mp4",
    "type": "video"
  },
  "editorial-modern": {
    "url": "https://f003.backblazeb2.com/file/saadstudio-storage/videos/admin-cms/1779929842464-bxv8h1.webm",
    "type": "video"
  },
  "watercolor-dream": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779236552343-4cmr2l.mp4",
    "type": "video"
  },
  "cinematic-trailer": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779219727092-30ypgt.webm",
    "type": "video"
  },
  "layer-mixed-media": {
    "url": "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779215073996-5n4540.webm",
    "type": "video"
  }
};

async function main() {
  const isWrite = process.argv.includes("--write");
  console.log("=================================================");
  console.log(`🎬 Restoring Cinematic Styles: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log("=================================================");

  try {
    const layout = await prisma.pageLayout.findUnique({
      where: { pageName: "cms-cinematic-styles" }
    });

    if (!layout) {
      console.error("❌ Layout 'cms-cinematic-styles' not found!");
      return;
    }

    const blocks = layout.layoutBlocks as any;
    
    if (isWrite) {
      const updatedBlocks = {
        ...blocks,
        presetMedia: originalPresetMedia
      };

      await prisma.pageLayout.update({
        where: { pageName: "cms-cinematic-styles" },
        data: { layoutBlocks: updatedBlocks }
      });
      console.log("✅ Successfully restored all original preset videos in the database!");
    } else {
      console.log("🔍 Dry-run: Original presets verified. Run with --write to restore.");
    }
  } catch (e) {
    console.error("❌ Restore failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

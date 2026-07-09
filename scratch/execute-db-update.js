const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const modelsToUpdate = [
  { id: "nano_pro", name: "Nano Banana Pro", notes: "4K I2I", type: "image", provider: "kie", billing: "flat", kieCredits: 18, waveUsd: 0, userCreditsRate: 2.0, maxDuration: null, isActive: true },
  { id: "nano2", name: "Nano Banana 2", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 3.5, waveUsd: 0, userCreditsRate: 2.0, maxDuration: null, isActive: true },
  { id: "nano2_lite", name: "Nano Banana 2 Lite", notes: "T2I Lite", type: "image", provider: "kie", billing: "flat", kieCredits: 2.5, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "nano", name: "Nano Banana", notes: "std", type: "image", provider: "kie", billing: "flat", kieCredits: 2, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "nano_edit", name: "Nano Banana Edit", notes: "edit", type: "image", provider: "kie", billing: "flat", kieCredits: 4, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "imagen4f", name: "Google Imagen 4 Fast", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 1.6, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "imagen4", name: "Google Imagen 4", notes: "HQ", type: "image", provider: "kie", billing: "flat", kieCredits: 6, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "imagen4u", name: "Google Imagen 4 Ultra", notes: "Ultra", type: "image", provider: "kie", billing: "flat", kieCredits: 12, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "seedream45", name: "Seedream 4.5 T2I", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 3.5, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "seedream45e", name: "Seedream 4.5 Edit", notes: "edit", type: "image", provider: "kie", billing: "flat", kieCredits: 4, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "seedream5l", name: "Seedream 5 Lite T2I", notes: "T2I", type: "image", provider: "wavespeed", billing: "flat", kieCredits: 0, waveUsd: 0.012, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "seedream5i", name: "Seedream 5 Lite I2I", notes: "I2I", type: "image", provider: "wavespeed", billing: "flat", kieCredits: 0, waveUsd: 0.015, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "zimage", name: "Z-Image", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 3, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "grok_img", name: "Grok Imagine", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 4, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "grok_imge", name: "Grok Imagine Edit", notes: "edit", type: "image", provider: "kie", billing: "flat", kieCredits: 5, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "gpt2t", name: "GPT Image 2 T2I", notes: "1K/2K/4K", type: "image", provider: "kie", billing: "flat", kieCredits: 6, waveUsd: 0, userCreditsRate: 2.0, maxDuration: null, isActive: true },
  { id: "gpt2i", name: "GPT Image 2 I2I", notes: "1K/2K/4K", type: "image", provider: "kie", billing: "flat", kieCredits: 7, waveUsd: 0, userCreditsRate: 2.0, maxDuration: null, isActive: true },
  { id: "gpt15t", name: "GPT Image 1.5 T2I", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 4, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "gpt15i", name: "GPT Image 1.5 I2I", notes: "I2I", type: "image", provider: "kie", billing: "flat", kieCredits: 5, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "qwen_t", name: "Qwen Image T2I", notes: "T2I", type: "image", provider: "kie", billing: "flat", kieCredits: 3, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "qwen_i", name: "Qwen Image I2I", notes: "I2I", type: "image", provider: "kie", billing: "flat", kieCredits: 3.5, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "wan_image_pro", name: "Wan 2.7 Image Pro", notes: "Generate & Edit", type: "image", provider: "kie", billing: "flat", kieCredits: 18, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "flux2_pro_t", name: "FLUX.2 Pro T2I", notes: "hidden", type: "image", provider: "kie", billing: "flat", kieCredits: 3, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "flux2_pro_i", name: "FLUX.2 Pro I2I", notes: "hidden", type: "image", provider: "kie", billing: "flat", kieCredits: 3, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "flux2_flex_t", name: "FLUX.2 Flex T2I", notes: "hidden", type: "image", provider: "kie", billing: "flat", kieCredits: 2, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true },
  { id: "flux2_flex_i", name: "FLUX.2 Flex I2I", notes: "hidden", type: "image", provider: "kie", billing: "flat", kieCredits: 2, waveUsd: 0, userCreditsRate: 1.0, maxDuration: null, isActive: true }
];

async function main() {
  for (const m of modelsToUpdate) {
    const res = await prisma.pricingConstitution.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        notes: m.notes,
        type: m.type,
        provider: m.provider,
        billing: m.billing,
        kieCredits: m.kieCredits,
        waveUsd: m.waveUsd,
        userCreditsRate: m.userCreditsRate,
        maxDuration: m.maxDuration,
        isActive: m.isActive,
      },
      create: m
    });
    console.log(`Upserted ${m.id} to userCreditsRate = ${m.userCreditsRate}`);
  }
  console.log("Pricing constitution update complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

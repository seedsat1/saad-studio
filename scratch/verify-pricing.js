const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EXCLUDED_IDS = new Set([
  "tool_upscale",
  "tool_rmbg",
  "tool_faceswap",
  "tool_instant_character",
  "gemini_omni_character",
  "dalle3"
]);

async function verifyDatabase() {
  console.log("=== VERIFYING DATABASE PRICING ===");
  const rows = await prisma.pricingConstitution.findMany({
    where: { type: "image" }
  });

  let hasErrors = false;
  const expectedTwos = new Set(["nano_pro", "nano2", "gpt2t", "gpt2i"]);

  for (const row of rows) {
    if (EXCLUDED_IDS.has(row.id)) {
      console.log(`ℹ️ DB SKIP: Model ${row.id} is excluded from standard 1.0 rate check.`);
      continue;
    }
    const expected = expectedTwos.has(row.id) ? 2.0 : 1.0;
    if (row.userCreditsRate !== expected) {
      console.error(`❌ DB MISMATCH: Model ${row.id} has userCreditsRate = ${row.userCreditsRate}, expected = ${expected}`);
      hasErrors = true;
    } else {
      console.log(`✅ DB MATCH: Model ${row.id} has userCreditsRate = ${row.userCreditsRate}`);
    }
  }

  // Check if wan_image_pro was successfully added
  const wanRow = rows.find(r => r.id === "wan_image_pro");
  if (!wanRow) {
    console.error("❌ DB MISMATCH: Model wan_image_pro is missing from the database!");
    hasErrors = true;
  } else if (wanRow.userCreditsRate !== 1.0) {
    console.error(`❌ DB MISMATCH: wan_image_pro has userCreditsRate = ${wanRow.userCreditsRate}, expected = 1.0`);
    hasErrors = true;
  } else {
    console.log("✅ DB MATCH: wan_image_pro exists and is set to 1.0");
  }

  return !hasErrors;
}

function verifyImageModelsFile() {
  console.log("\n=== VERIFYING lib/image-models.ts ===");
  const filePath = path.join(__dirname, "../lib/image-models.ts");
  const content = fs.readFileSync(filePath, "utf-8");

  // Regex to extract model blocks and verify their creditCost
  const modelRegex = /id:\s*"([^"]+)"[\s\S]*?creditCost:\s*([\d.]+)/g;
  let match;
  let hasErrors = false;
  const expectedTwos = new Set(["nano-banana-pro", "nano-banana-2", "gpt-image-2-text-to-image", "gpt-image-2-image-to-image"]);

  while ((match = modelRegex.exec(content)) !== null) {
    const id = match[1];
    const cost = parseFloat(match[2]);
    const expected = expectedTwos.has(id) ? 2.0 : 1.0;
    if (cost !== expected) {
      console.error(`❌ CATALOG FILE MISMATCH: Model ${id} has creditCost = ${cost}, expected = ${expected}`);
      hasErrors = true;
    } else {
      console.log(`✅ CATALOG FILE MATCH: Model ${id} has creditCost = ${cost}`);
    }
  }
  return !hasErrors;
}

function verifyPricingModelsFile() {
  console.log("\n=== VERIFYING lib/pricing-models.ts ===");
  const filePath = path.join(__dirname, "../lib/pricing-models.ts");
  const content = fs.readFileSync(filePath, "utf-8");

  // Match: { id:"nano_pro", ... userCreditsRate:2.0, ... }
  const modelRegex = /id:\s*"([^"]+)"[^{}]*?type:\s*"image"[^{}]*?userCreditsRate:\s*([\d.]+)/g;
  let match;
  let hasErrors = false;
  const expectedTwos = new Set(["nano_pro", "nano2", "gpt2t", "gpt2i"]);

  while ((match = modelRegex.exec(content)) !== null) {
    const id = match[1];
    const rate = parseFloat(match[2]);
    if (EXCLUDED_IDS.has(id)) {
      console.log(`ℹ️ PRICING FILE SKIP: Model ${id} is excluded from standard 1.0 rate check.`);
      continue;
    }
    const expected = expectedTwos.has(id) ? 2.0 : 1.0;
    if (rate !== expected) {
      console.error(`❌ PRICING FILE MISMATCH: Model ${id} has userCreditsRate = ${rate}, expected = ${expected}`);
      hasErrors = true;
    } else {
      console.log(`✅ PRICING FILE MATCH: Model ${id} has userCreditsRate = ${rate}`);
    }
  }

  // Check wan_image_pro as well
  if (!content.includes('id:"wan_image_pro"')) {
    console.error("❌ PRICING FILE MISMATCH: wan_image_pro is missing in DEFAULT_MODELS!");
    hasErrors = true;
  } else {
    console.log("✅ PRICING FILE MATCH: wan_image_pro exists in DEFAULT_MODELS");
  }

  return !hasErrors;
}

async function run() {
  const dbOk = await verifyDatabase();
  const file1Ok = verifyImageModelsFile();
  const file2Ok = verifyPricingModelsFile();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (dbOk && file1Ok && file2Ok) {
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
  } else {
    console.error("❌ SOME TESTS FAILED! PLEASE CHECK THE ERRORS ABOVE.");
    process.exit(1);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

run().catch(console.error).finally(() => prisma.$disconnect());

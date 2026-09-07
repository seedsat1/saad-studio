// Build the four Grain tiles from ONE clean base plate.
//
// Why this is not part of generate-reference-thumbnails.mjs:
// asking an image model for "coarse grain" vs "fine grain" does not work. Measured
// on a first attempt, high-frequency energy came out at 6.84 for the "Coarse 16mm"
// tile against 7.12 for the "35mm" tile — the coarse one was LESS grainy than the
// fine one — and the "barely visible shadow grain" tile had the cleanest shadows
// of the four, the opposite of its own description. The model renders a broadly
// clean image whatever the prompt says, and a contact sheet hides this entirely.
//
// Grain is a compositing operation, so it is applied here in post instead. That
// also makes the four tiles pixel-identical apart from the grain itself, which no
// amount of prompting can achieve.
//
// Run:  node scripts/build-grain-thumbnails.mjs [--no-upload]

import { ROOT, loadEnv, uploadTile, getPlate, makeRandom, sharp, resolve, writeFileSync } from "./lib/thumbnail-build.mjs";

loadEnv();

const NO_UPLOAD = process.argv.includes("--no-upload");
const OUT_DIR = resolve(ROOT, "scratchpad/grains-thumbnails");

const PLATE_PROMPT =
  "Photograph, exceptionally clean modern digital capture with NO grain and NO noise whatsoever, " +
  "perfectly smooth flat areas. A small child in a striped shirt walking toward the camera on a " +
  "sunlit residential street, holding the hand of an adult cropped at the edge of frame, low warm " +
  "afternoon sun, plain concrete buildings and a wide empty road behind them with large flat areas " +
  "of sky and asphalt. Natural warm light, neutral colour. No text, no watermark, no logo, no border frame.";

// blockSize:  how many pixels share one noise value (bigger = coarser clumps)
// sigma:      noise amplitude in 8-bit levels
// shadowOnly: scale noise by how dark the pixel is, so grain lives in the shadows
const RECIPES = [
  { key: "grain-coarse-16mm",           blockSize: 3, sigma: 26, shadowOnly: false },
  { key: "grain-35mm-silver-halide",    blockSize: 2, sigma: 15, shadowOnly: false },
  { key: "grain-fine-organic-sensor",   blockSize: 1, sigma: 8,  shadowOnly: false },
  { key: "grain-barely-visible-shadow", blockSize: 1, sigma: 16, shadowOnly: true  },
];

async function applyGrain(platePng, { blockSize, sigma, shadowOnly }, seed) {
  const img = sharp(platePng);
  const { width, height } = await img.metadata();
  const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });

  const rand = makeRandom(seed);
  const bw = Math.ceil(width / blockSize);
  const bh = Math.ceil(height / blockSize);

  // One gaussian-ish value per block, shared by every pixel in that block.
  const blocks = new Float32Array(bw * bh);
  for (let i = 0; i < blocks.length; i++) {
    // sum of three uniforms ≈ gaussian, centred on 0, range ~[-1.5, 1.5]
    blocks[i] = (rand() + rand() + rand() - 1.5) * sigma;
  }

  const out = Buffer.allocUnsafe(data.length);
  for (let y = 0; y < height; y++) {
    const by = Math.floor(y / blockSize);
    for (let x = 0; x < width; x++) {
      const bx = Math.floor(x / blockSize);
      let n = blocks[by * bw + bx];
      const i = (y * width + x) * 3;

      if (shadowOnly) {
        const luma = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        // full strength in black, nothing by mid-grey and above
        n *= Math.max(0, 1 - luma * 2.2);
      }

      for (let c = 0; c < 3; c++) {
        const v = data[i + c] + n;
        out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 3 } }).webp({ quality: 88 }).toBuffer();
}

async function main() {
  const plate = await getPlate(OUT_DIR, PLATE_PROMPT);
  const platePng = await sharp(plate).png().toBuffer();

  for (const [i, recipe] of RECIPES.entries()) {
    const webp = await applyGrain(platePng, recipe, 1000 + i * 7919);
    writeFileSync(resolve(OUT_DIR, `${recipe.key}.webp`), webp);
    if (!NO_UPLOAD) await uploadTile(recipe.key, webp);
    console.log(`✓ ${recipe.key.padEnd(30)} block=${recipe.blockSize} sigma=${recipe.sigma}${recipe.shadowOnly ? " shadow-masked" : ""} (${(webp.length / 1024).toFixed(0)}KB)${NO_UPLOAD ? "" : " → uploaded"}`);
  }

  console.log(`\nDone. Local copies: ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

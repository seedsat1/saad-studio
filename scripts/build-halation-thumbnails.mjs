// Build the four Halation tiles from ONE clean night plate.
//
// Halation is the coloured glow that bleeds outward from bright highlights when
// light scatters off the film backing. Like grain, it is a post-process, and like
// grain the image model will not produce it on demand at a controlled strength or
// hue — so it is composited here instead. Building it this way also means "None"
// is the untouched plate and the other three differ from it ONLY by the glow,
// which is what makes the four tiles honestly comparable.
//
// Method: isolate pixels above a brightness threshold, blur that highlight mask
// to spread it outward, tint it, and screen-blend it back over the plate.
//
// Run:  node scripts/build-halation-thumbnails.mjs [--no-upload]

import { ROOT, loadEnv, uploadTile, getPlate, sharp, resolve, writeFileSync } from "./lib/thumbnail-build.mjs";

loadEnv();

const NO_UPLOAD = process.argv.includes("--no-upload");
const OUT_DIR = resolve(ROOT, "scratchpad/halation-thumbnails");

const PLATE_PROMPT =
  "Cinematic film still, night exterior. A young man in a jacket standing in a narrow doorway on a " +
  "dark empty street, lit by a warm incandescent bulb just inside the doorway and a distant orange " +
  "street lamp further down the road. Deep shadows, wet asphalt, small bright practical lights " +
  "against darkness. Clean modern digital capture with NO glow or bloom around the lights — the " +
  "highlights must be crisp and contained. Photoreal, neutral colour. " +
  "No text, no watermark, no logo, no border frame.";

// threshold: how bright a pixel must be to bleed (0-255)
// radius:    how far the glow spreads
// strength:  how much of the tinted glow is screened back on
// tint:      [r, g, b] multipliers applied to the glow
const RECIPES = [
  { key: "halation-none",               threshold: null, radius: 0,  strength: 0,    tint: [1, 1, 1] },
  { key: "halation-warm-orange-red",    threshold: 170,  radius: 14, strength: 0.55, tint: [1.0, 0.42, 0.22] },
  { key: "halation-strong-warm-bloom",  threshold: 140,  radius: 30, strength: 1.0,  tint: [1.0, 0.60, 0.38] },
  // strength is 0.38 rather than 0.55 so this matches the warm fringe in perceived
  // brightness: green carries 0.587 of luma against red's 0.299, so an identical
  // strength would read ~1.45x brighter. These two presets differ by HUE, not amount.
  { key: "halation-green-yellow-fringe",threshold: 170,  radius: 14, strength: 0.38, tint: [0.72, 1.0, 0.24] },
];

async function applyHalation(platePng, { threshold, radius, strength, tint }) {
  const img = sharp(platePng);
  const { width, height } = await img.metadata();
  const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });

  if (threshold === null || strength === 0) {
    return sharp(data, { raw: { width, height, channels: 3 } }).webp({ quality: 90 }).toBuffer();
  }

  // 1. Isolate the highlights, ramping in above the threshold so the glow has a
  //    soft shoulder instead of a hard cut.
  const mask = Buffer.allocUnsafe(width * height);
  for (let p = 0, i = 0; p < mask.length; p++, i += 3) {
    const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const over = (luma - threshold) / (255 - threshold);
    mask[p] = over <= 0 ? 0 : Math.min(255, Math.round(over * 255));
  }

  // 2. Spread it outward — this is the halation itself.
  const glow = await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(radius)
    .raw()
    .toBuffer();

  // 3. Tint and screen-blend back over the plate.
  const out = Buffer.allocUnsafe(data.length);
  for (let p = 0, i = 0; p < glow.length; p++, i += 3) {
    const g = (glow[p] / 255) * strength;
    for (let c = 0; c < 3; c++) {
      const add = g * tint[c] * 255;
      // screen: 255 - (255-a)(255-b)/255 — keeps the glow additive but bounded
      const v = 255 - ((255 - data[i + c]) * (255 - Math.min(255, add))) / 255;
      out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  return sharp(out, { raw: { width, height, channels: 3 } }).webp({ quality: 90 }).toBuffer();
}

async function main() {
  const plate = await getPlate(OUT_DIR, PLATE_PROMPT);
  const platePng = await sharp(plate).png().toBuffer();

  for (const recipe of RECIPES) {
    const webp = await applyHalation(platePng, recipe);
    writeFileSync(resolve(OUT_DIR, `${recipe.key}.webp`), webp);
    if (!NO_UPLOAD) await uploadTile(recipe.key, webp);
    const desc = recipe.strength === 0
      ? "untouched plate"
      : `threshold=${recipe.threshold} radius=${recipe.radius} strength=${recipe.strength}`;
    console.log(`✓ ${recipe.key.padEnd(32)} ${desc.padEnd(46)} (${(webp.length / 1024).toFixed(0)}KB)${NO_UPLOAD ? "" : " → uploaded"}`);
  }

  console.log(`\nDone. Local copies: ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

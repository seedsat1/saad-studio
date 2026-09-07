// Build the four Grain tiles from ONE clean base plate.
//
// Why this is not part of generate-reference-thumbnails.mjs:
// asking an image model for "coarse grain" vs "fine grain" does not work. Measured
// on a first attempt, the "coarse 16mm" tile came out LESS grainy than the "35mm"
// tile, and the "shadow grain" tile had the cleanest shadows of the four — the
// model renders a broadly clean image whatever the prompt says. Grain is a
// compositing operation, so it is applied here in post instead, which also makes
// the four tiles pixel-identical apart from the grain itself.
//
// Run:  node scripts/build-grain-thumbnails.mjs [--base <file>] [--no-upload]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadDotenv(filename) {
  const p = resolve(ROOT, filename);
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

const args = process.argv.slice(2);
const NO_UPLOAD = args.includes("--no-upload");
const baseArg = args.find((a) => a.startsWith("--base="));

const OUT_DIR = resolve(ROOT, "scratchpad/grains-thumbnails");
const BASE_PATH = baseArg ? resolve(ROOT, baseArg.slice(7)) : resolve(OUT_DIR, "_base.webp");

const KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-3.1-flash-image";
const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";
const FOLDER = "reference-thumbnails";

const s3 = new S3Client({
  region: process.env.B2_REGION || "eu-central-003",
  endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// ─── grain recipes ────────────────────────────────────────────────────
// blockSize: how many pixels share one noise value (bigger = coarser clumps)
// sigma:     noise amplitude in 8-bit levels
// shadowOnly: scale noise by how dark the pixel is, so grain lives in shadows
const RECIPES = [
  { key: "grain-coarse-16mm",            blockSize: 3, sigma: 26, shadowOnly: false },
  { key: "grain-35mm-silver-halide",     blockSize: 2, sigma: 15, shadowOnly: false },
  { key: "grain-fine-organic-sensor",    blockSize: 1, sigma: 8,  shadowOnly: false },
  { key: "grain-barely-visible-shadow",  blockSize: 1, sigma: 16, shadowOnly: true  },
];

const BASE_PROMPT =
  "Photograph, exceptionally clean modern digital capture with NO grain and NO noise whatsoever, " +
  "perfectly smooth flat areas. A small child in a striped shirt walking toward the camera on a " +
  "sunlit residential street, holding the hand of an adult cropped at the edge of frame, low warm " +
  "afternoon sun, plain concrete buildings and a wide empty road behind them with large flat areas " +
  "of sky and asphalt. Natural warm light, neutral colour. No text, no watermark, no logo, no border frame.";

async function generateBase() {
  if (!KEY) throw new Error("GOOGLE_API_KEY not set");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": KEY, "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: "text", text: `Generate a detailed high quality visual image depicting: ${BASE_PROMPT}\n\nOutput requirements: aspect ratio 4:3, target quality 2K.` }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:3", image_size: "2K" },
      generation_config: { image_config: { aspect_ratio: "4:3" } },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || `base generation failed (${res.status})`);

  const found = [];
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const img = n.output_image ?? n.outputImage ?? n.image;
    const d = img?.data ?? img?.b64_json ?? n.data;
    if (typeof d === "string" && d.length > 1000) found.push(d);
    for (const k of ["output", "content", "parts", "steps", "response", "result", "data", "candidates"]) walk(n[k]);
  })(json);
  if (!found.length) throw new Error("base generation returned no image");
  return Buffer.from(found[0], "base64");
}

// Deterministic PRNG so reruns reproduce the same grain.
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function applyGrain(basePng, { blockSize, sigma, shadowOnly }, seed) {
  const img = sharp(basePng);
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
  mkdirSync(OUT_DIR, { recursive: true });

  let base;
  if (existsSync(BASE_PATH)) {
    console.log(`Using existing clean plate: ${BASE_PATH}`);
    base = readFileSync(BASE_PATH);
  } else {
    console.log("Generating clean base plate…");
    const jpeg = await generateBase();
    base = await sharp(jpeg).resize(1024, 768, { fit: "cover", position: "centre" }).webp({ quality: 95 }).toBuffer();
    writeFileSync(BASE_PATH, base);
    console.log(`✓ base plate saved (${(base.length / 1024).toFixed(0)}KB)`);
  }

  // Normalise to a raw-friendly PNG once so every tile starts from identical pixels.
  const basePng = await sharp(base).png().toBuffer();

  for (const [i, recipe] of RECIPES.entries()) {
    const webp = await applyGrain(basePng, recipe, 1000 + i * 7919);
    writeFileSync(resolve(OUT_DIR, `${recipe.key}.webp`), webp);

    if (!NO_UPLOAD) {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${FOLDER}/${recipe.key}.webp`,
        Body: webp,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }));
    }
    console.log(`✓ ${recipe.key.padEnd(30)} block=${recipe.blockSize} sigma=${recipe.sigma}${recipe.shadowOnly ? " shadow-masked" : ""} (${(webp.length / 1024).toFixed(0)}KB)${NO_UPLOAD ? "" : " → uploaded"}`);
  }

  console.log(`\nDone. Local copies: ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

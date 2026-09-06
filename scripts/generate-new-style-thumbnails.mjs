// Generate reference-studio Style thumbnails with Google Gemini image models and
// upload them to Backblaze B2 at reference-thumbnails/<styleId>.webp
//
// Run:  node scripts/generate-new-style-thumbnails.mjs [--force] [--only id1,id2]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",").map((s) => s.trim())) : null;
const OUT_DIR = resolve(ROOT, "scratchpad/style-thumbnails");

const KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";
if (!KEY) throw new Error("GOOGLE_API_KEY not set");

const MODEL = process.env.STYLE_THUMB_MODEL || "gemini-3.1-flash-image";

const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";
const REGION = process.env.B2_REGION || "eu-central-003";
const ENDPOINT = process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
const FOLDER = "reference-thumbnails";

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const NO_TEXT = "No watermark, no logo, no caption bar, no border frame.";

const STYLES = [
  ["minimalism", `Minimalist graphic design composition. A single small matte ceramic vessel centered on a vast off-white plaster background, one thin charcoal accent line, muted beige and soft black palette, enormous negative space, calm diffused studio light, ultra clean and restrained. ${NO_TEXT}`],
  ["maximalism", `Maximalist interior design vignette. Densely layered clashing patterns, rich jewel tones of emerald fuchsia and gold, ornate embroidered textiles over leopard print, velvet brass and tropical florals, every surface decorated, opulent warm lighting. ${NO_TEXT}`],
  ["surrealdesign", `Surreal design artwork. A floating stone arch and a giant levitating orange above a pale desert plain, impossible perspective, dreamlike Magritte-inspired composition, soft peach and lavender gradient sky, long clean shadows. ${NO_TEXT}`],
  ["swissdesign", `Swiss International Style graphic design poster. Strict modular grid, flat geometric shapes, large clean sans-serif type blocks, pure red black and white palette, rational asymmetric layout, crisp offset print reproduction.`],
  ["y2kdesign", `Y2K aesthetic design. Liquid chrome metal blobs, holographic iridescent gradients, bubbly early-2000s digital graphics, lens flares and star sparkles, cyan magenta and silver palette, glossy plastic surfaces. ${NO_TEXT}`],
  ["glassmorphism", `Glassmorphism interface design. Floating frosted translucent glass panels with heavy background blur, thin luminous white borders, soft violet and teal gradient glow behind, layered depth and soft shadows, modern dark UI aesthetic, no readable text. ${NO_TEXT}`],
  ["collageart", `Mixed media collage art. Torn magazine paper cutouts, halftone newspaper scraps, masking tape and staples, hand-cut layered photographic fragments, textured kraft paper background, analog scrapbook feel. ${NO_TEXT}`],
  ["vectorart", `Flat vector illustration. Clean bezier shapes, bold solid color fills, simple geometric figures in a modern editorial scene, no gradients and no texture, crisp SVG-like flat design, limited harmonious palette. ${NO_TEXT}`],
  ["futuristic", `Futuristic design concept. Sleek white and chrome curved forms, glowing blue light strips, seamless advanced technology surfaces, ultra clean sci-fi product aesthetic, soft rim lighting on a dark gradient. ${NO_TEXT}`],
  ["aurora", `Aurora gradient aesthetic. Flowing northern-lights ribbons of green teal violet and pink light, soft blurred luminous mesh gradients over a deep dark night sky, silky smooth color transitions. ${NO_TEXT}`],
  ["retro", `Retro 1970s graphic design. Warm sunburst stripes in mustard orange rust and cream, rounded groovy shapes, vintage offset print grain, faded sun-bleached palette, nostalgic seventies album-cover aesthetic. ${NO_TEXT}`],
  ["pixelart", `16-bit pixel art scene. Crisp square pixels, limited retro console palette, isometric pixel-art room with a tiny character and a warm lamp glow, hard dithering, nostalgic SNES-era video game look. ${NO_TEXT}`],
  ["cyberpunk", `Cyberpunk night street. Rain-slick asphalt reflecting dense neon signage in Arabic and Latin lettering, magenta and cyan glow, holographic floating advertisements, steam and atmospheric haze, moody high-contrast mood. ${NO_TEXT}`],
  ["popart", `Pop art comic illustration. A stylish Iraqi woman with dark wavy hair in profile, bold black outlines, Ben-Day halftone dots, primary red yellow and blue flat fills, high contrast retro comic printing. ${NO_TEXT}`],
  ["handwritten", `Handwritten lettering style. Ink calligraphy strokes and loose script on textured cream paper, hand-drawn doodles arrows and underlines, fountain pen and a coffee ring, casual personal notebook aesthetic. ${NO_TEXT}`],
  ["bohemian", `Bohemian aesthetic still life. Warm terracotta and sand palette, macrame wall hanging, dried pampas grass in a clay vase, rattan and woven textures, layered rugs, earthy natural styling in soft afternoon light. ${NO_TEXT}`],
  ["graffiti", `Graffiti street art. Spray paint wildstyle lettering on a weathered concrete wall, vivid overlapping abstract tags, paint drips and stencil layers, urban grit and daylight shadows. Lettering must be abstract invented shapes only: no personal names, no religious words or symbols, no readable slogans. ${NO_TEXT}`],
  ["victorian", `Victorian era decorative design. Ornate gold filigree frame, engraved botanical etchings, deep burgundy and antique cream, damask pattern background, 19th century decorative print plate. ${NO_TEXT}`],
];

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function extractImages(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => extractImages(n, out));
    return out;
  }
  const image = node.output_image ?? node.outputImage ?? node.image;
  const data = image?.data ?? image?.b64_json ?? node.data;
  if (typeof data === "string" && data.length > 1000) out.push(data);
  for (const k of ["output", "content", "parts", "steps", "response", "result", "data", "candidates"]) {
    extractImages(node[k], out);
  }
  return out;
}

async function generate(prompt) {
  const body = {
    model: MODEL,
    input: [{ type: "text", text: `Generate a detailed high quality visual image depicting: ${prompt}\n\nOutput requirements: aspect ratio 4:3, target quality 2K.` }],
    response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:3", image_size: "2K" },
    generation_config: { image_config: { aspect_ratio: "4:3" } },
  };
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": KEY,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || `Google image generation failed (${res.status})`);
  }
  const images = extractImages(json);
  if (!images.length) throw new Error("Gemini returned no image data");
  return Buffer.from(images[0], "base64");
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const targets = STYLES.filter(([id]) => !ONLY || ONLY.has(id));
  console.log(`Generating ${targets.length} style thumbnails with ${MODEL} → b2://${BUCKET}/${FOLDER}/`);

  const results = {};
  let ok = 0, fail = 0;
  const queue = [...targets];
  const CONCURRENCY = 4;

  async function worker() {
    while (queue.length) {
      const [id, prompt] = queue.shift();
      const key = `${FOLDER}/${id}.webp`;
      try {
        if (!FORCE && (await objectExists(key))) {
          console.log(`· ${id} — already on B2, skipped (use --force to regenerate)`);
          results[id] = "skipped";
          continue;
        }
        let jpeg = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            jpeg = await generate(prompt);
            break;
          } catch (e) {
            if (attempt === 3) throw e;
            console.log(`  ${id} attempt ${attempt} failed (${e.message}), retrying…`);
            await new Promise((r) => setTimeout(r, 2500 * attempt));
          }
        }
        const webp = await sharp(jpeg)
          .resize(1024, 768, { fit: "cover", position: "centre" })
          .webp({ quality: 82 })
          .toBuffer();
        writeFileSync(resolve(OUT_DIR, `${id}.webp`), webp);
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: webp,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }));
        ok++;
        results[id] = "uploaded";
        console.log(`✓ ${id} (${(webp.length / 1024).toFixed(0)}KB) → ${key}`);
      } catch (e) {
        fail++;
        results[id] = `failed: ${e.message}`;
        console.error(`✗ ${id}: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(resolve(OUT_DIR, "_report.json"), JSON.stringify(results, null, 2));
  console.log(`\nDone. uploaded=${ok} failed=${fail}\nLocal copies: ${OUT_DIR}`);
  if (fail) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });

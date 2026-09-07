// Shared machinery for the composited Reference Studio thumbnail builders
// (Grain, Halation). These sets are built rather than prompted because the image
// model cannot control a pure post-process reliably — see the header comment in
// build-grain-thumbnails.mjs for the measurements that established this.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    const p = resolve(ROOT, filename);
    if (!existsSync(p)) continue;
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
}

const FOLDER = "reference-thumbnails";
const MODEL = "gemini-3.1-flash-image";

let _s3 = null;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.B2_REGION || "eu-central-003",
      endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return _s3;
}

export async function uploadTile(key, body) {
  await s3().send(new PutObjectCommand({
    Bucket: process.env.B2_BUCKET || "saadstudio-storage",
    Key: `${FOLDER}/${key}.webp`,
    Body: body,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
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

/** Generate a single clean base plate every tile in a set is built from. */
export async function generatePlate(prompt) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("GOOGLE_API_KEY not set");

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: "text", text: `Generate a detailed high quality visual image depicting: ${prompt}\n\nOutput requirements: aspect ratio 4:3, target quality 2K.` }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:3", image_size: "2K" },
      generation_config: { image_config: { aspect_ratio: "4:3" } },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || `plate generation failed (${res.status})`);
  const found = extractImages(json);
  if (!found.length) throw new Error("plate generation returned no image");

  return sharp(Buffer.from(found[0], "base64"))
    .resize(1024, 768, { fit: "cover", position: "centre" })
    .webp({ quality: 95 })
    .toBuffer();
}

/** Load the cached plate for a set, generating and caching it on first run. */
export async function getPlate(outDir, prompt) {
  mkdirSync(outDir, { recursive: true });
  const platePath = resolve(outDir, "_base.webp");
  if (existsSync(platePath)) {
    console.log(`Using cached clean plate: ${platePath}`);
    return readFileSync(platePath);
  }
  console.log("Generating clean base plate…");
  const plate = await generatePlate(prompt);
  writeFileSync(platePath, plate);
  console.log(`✓ base plate saved (${(plate.length / 1024).toFixed(0)}KB)`);
  return plate;
}

/** Deterministic PRNG so reruns reproduce byte-identical tiles. */
export function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export { sharp, resolve, writeFileSync, readFileSync, existsSync, mkdirSync };

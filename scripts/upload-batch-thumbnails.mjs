// Upload a batch of MP4s → animated WebP → Backblaze at reference-thumbnails/<slug>.webp
// (creates parent dirs on disk so slugs with subfolder are OK).
//
// Usage:
//   node --env-file=.env.local scripts/upload-batch-thumbnails.mjs <manifest.json>

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/upload-batch-thumbnails.mjs <manifest.json>");
  process.exit(1);
}

const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";
const KEY_PREFIX = "reference-thumbnails";

const s3 = new S3Client({
  region: process.env.B2_REGION || "eu-central-003",
  endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
  },
});

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-800)}`))
    );
  });
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "batch-thumbs-"));

let ok = 0, fail = 0;
for (const [i, v] of manifest.videos.entries()) {
  const key = `${KEY_PREFIX}/${v.slug}.webp`;
  const mp4 = path.join(workDir, `${v.slug.replace(/\//g, "_")}.mp4`);
  const webp = path.join(workDir, `${v.slug.replace(/\//g, "_")}.webp`);
  try {
    process.stdout.write(`[${String(i + 1).padStart(2)}/${manifest.videos.length}] ${v.slug} — download…`);
    const res = await fetch(v.mp4Url);
    if (!res.ok) throw new Error(`GET ${res.status}`);
    await pipeline(res.body, fs.createWriteStream(mp4));
    process.stdout.write(" convert…");
    await run("ffmpeg", [
      "-y",
      "-i", mp4,
      "-vf", "fps=12,scale=720:-2:flags=lanczos",
      "-loop", "0",
      "-quality", "75",
      "-compression_level", "6",
      "-preset", "picture",
      "-an",
      webp,
    ]);
    const body = fs.readFileSync(webp);
    const size = (body.length / 1024).toFixed(0);
    process.stdout.write(` upload (${size}KB)…`);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=3600, must-revalidate",
    }));
    console.log(` ✓ ${key}`);
    ok++;
  } catch (e) {
    console.log(` ✗ ${e.message}`);
    fail++;
  }
}
console.log(`\nDone. ${ok} uploaded, ${fail} failed.`);

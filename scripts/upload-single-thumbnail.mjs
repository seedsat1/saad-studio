// One-off: download an MP4, convert to animated WebP via ffmpeg, and upload to a specific Backblaze key.
// Args: <mp4Url> <targetKey>
// Example:
//   node --env-file=.env.local scripts/upload-single-thumbnail.mjs "https://.../foo.mp4" "reference-thumbnails/seedance/foo.webp"

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const [mp4Url, targetKey] = process.argv.slice(2);
if (!mp4Url || !targetKey) {
  console.error("Usage: node scripts/upload-single-thumbnail.mjs <mp4Url> <targetKey>");
  process.exit(1);
}

const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";

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

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "single-thumb-"));
const mp4Path = path.join(workDir, "src.mp4");
const webpPath = path.join(workDir, "out.webp");

process.stdout.write("Download… ");
const res = await fetch(mp4Url);
if (!res.ok) throw new Error(`GET ${mp4Url} → ${res.status}`);
await pipeline(res.body, fs.createWriteStream(mp4Path));

process.stdout.write("convert… ");
await run("ffmpeg", [
  "-y",
  "-i", mp4Path,
  "-vf", "fps=12,scale=720:-2:flags=lanczos",
  "-loop", "0",
  "-quality", "75",
  "-compression_level", "6",
  "-preset", "picture",
  "-an",
  webpPath,
]);

const body = fs.readFileSync(webpPath);
const size = (body.length / 1024).toFixed(0);
process.stdout.write(`upload (${size}KB)… `);
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: targetKey,
  Body: body,
  ContentType: "image/webp",
  CacheControl: "public, max-age=3600, must-revalidate",
}));
console.log(`✓ ${targetKey}`);
console.log(`https://${BUCKET}.s3.${process.env.B2_REGION || "eu-central-003"}.backblazeb2.com/${targetKey}`);

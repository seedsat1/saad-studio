#!/usr/bin/env node
// Downloads 46 camera movement MP4s, converts each to animated WebP (720x405, ~4s loop),
// and uploads to Backblaze B2 at reference-thumbnails/<slug>.webp.
//
// Prereqs:
//   - Node 20.6+ (uses --env-file flag)
//   - ffmpeg on PATH (with libwebp)
//   - .env.local set: B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY (+ optional B2_BUCKET, B2_ENDPOINT, B2_REGION)
//
// Run:
//   node --env-file=.env.local scripts/upload-camera-thumbnails.mjs

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MANIFEST = path.join(
  os.tmpdir(),
  "claude",
  "E------------next14-ai-saas-next14-ai-saas-main-next14-ai-saas-main",
  "432e4ba4-9abf-4815-8820-7e58c3078906",
  "scratchpad",
  "camera-movement-videos.json"
);

const BUCKET = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || "saadstudio-storage";
const KEY_PREFIX = "reference-thumbnails";

const requiredEnv = ["B2_ACCESS_KEY_ID", "B2_SECRET_ACCESS_KEY"];
for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}. Set it in .env.local first.`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: process.env.B2_REGION || "eu-central-003",
  endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
  },
});

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(res.body, fs.createWriteStream(dest));
}

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

async function convertToWebp(mp4Path, webpPath) {
  // 720x405 (16:9), loop=0 (infinite), 12fps to keep file size small, quality 75.
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
}

async function uploadWebp(webpPath, slug) {
  const body = fs.readFileSync(webpPath);
  const key = `${KEY_PREFIX}/${slug}.webp`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return key;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const workDir = path.join(os.tmpdir(), "camera-thumbnails-work");
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`Processing ${manifest.videos.length} videos → ${BUCKET}/${KEY_PREFIX}/*.webp`);

  let ok = 0, fail = 0;
  for (const [i, v] of manifest.videos.entries()) {
    const mp4 = path.join(workDir, `${v.slug}.mp4`);
    const webp = path.join(workDir, `${v.slug}.webp`);
    try {
      process.stdout.write(`[${String(i + 1).padStart(2)}/${manifest.videos.length}] ${v.slug} — download…`);
      await download(v.mp4Url, mp4);
      process.stdout.write(" convert…");
      await convertToWebp(mp4, webp);
      const size = (fs.statSync(webp).size / 1024).toFixed(0);
      process.stdout.write(` upload (${size}KB)…`);
      const key = await uploadWebp(webp, v.slug);
      console.log(` ✓ ${key}`);
      ok++;
    } catch (e) {
      console.log(` ✗ ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ${ok} uploaded, ${fail} failed. Public base: https://${BUCKET}.s3.${process.env.B2_REGION || "eu-central-003"}.backblazeb2.com/${KEY_PREFIX}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

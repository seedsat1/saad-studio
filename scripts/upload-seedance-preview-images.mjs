// One-off: upload 4 local Seedance preview images from the awesome-seedance repo to Backblaze
// at seedance-prompts/[filename].webp. Cache: 1 hour (safe overwrite).
//
// Run:
//   node --env-file=.env.local scratchpad/upload-seedance-preview-images.mjs

import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SRC_DIR = "E:/برومبت/awesome-seedance-2-prompt-main/awesome-seedance-2-prompt-main/assets/examples";
const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";
const KEY_PREFIX = "reference-thumbnails/seedance";

const files = [
  "techhalla-flying-carpet.webp",
  "aimikoda-match-cut.webp",
  "0xbisc-stone-hand.webp",
  "ai-girl-design-system-prompt.webp",
];

const s3 = new S3Client({
  region: process.env.B2_REGION || "eu-central-003",
  endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
  },
});

for (const [i, file] of files.entries()) {
  const src = path.join(SRC_DIR, file);
  const key = `${KEY_PREFIX}/${file}`;
  process.stdout.write(`[${i + 1}/${files.length}] ${file} upload…`);
  const body = fs.readFileSync(src);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: "image/webp",
    CacheControl: "public, max-age=3600, must-revalidate",
  }));
  console.log(` ✓ ${key}`);
}
console.log(`\nDone. Public base: https://${BUCKET}.s3.${process.env.B2_REGION || "eu-central-003"}.backblazeb2.com/${KEY_PREFIX}/`);

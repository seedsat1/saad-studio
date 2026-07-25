// One-shot: download reference thumbnails from Higgsfield CDN and upload to Backblaze B2.
// Run: node scripts/upload-reference-thumbnails.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadDotenv(filename) {
  const p = resolve(ROOT, filename);
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const raw of txt.split(/\r?\n/)) {
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
loadDotenv(".env.migration");
loadDotenv(".env.local");
loadDotenv(".env");
loadDotenv(".env.production");

const MAP_PATH = process.argv[2] || resolve(
  "C:\\Users\\PC\\AppData\\Local\\Temp\\claude\\E------------next14-ai-saas-next14-ai-saas-main-next14-ai-saas-main\\bf0ed58f-e39f-491a-ab5f-67e1054e613f\\scratchpad\\preset-url-map.json",
);
const OUT_PATH = resolve(dirname(MAP_PATH), "preset-b2-urls.json");

const BUCKET = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || "saadstudio-storage";
const REGION = process.env.B2_REGION || "eu-central-003";
const ENDPOINT = process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
const PUBLIC = (process.env.B2_PUBLIC_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL || `https://${BUCKET}.s3.${REGION}.backblazeb2.com`).replace(/\/+$/, "");

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

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadOne(presetId, srcUrl) {
  const key = `reference-thumbnails/${presetId}.webp`;
  if (await objectExists(key)) {
    return `${PUBLIC}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  }
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`fetch ${srcUrl} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buf,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${PUBLIC}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

async function main() {
  const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
  const entries = Object.entries(map);
  console.log(`Uploading ${entries.length} thumbnails to B2 bucket "${BUCKET}"...`);
  const out = {};
  let ok = 0, fail = 0;
  const CONCURRENCY = 6;
  const queue = [...entries];
  async function worker() {
    while (queue.length) {
      const [pid, url] = queue.shift();
      try {
        const publicUrl = await uploadOne(pid, url);
        out[pid] = publicUrl;
        ok++;
        console.log(`✓ [${ok + fail}/${entries.length}] ${pid}`);
      } catch (e) {
        fail++;
        console.error(`✗ ${pid}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nDone. ok=${ok} fail=${fail}\nWrote ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

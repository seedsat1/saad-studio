/**
 * scripts/set-r2-cors.mjs
 * Sets CORS policy on the Cloudflare R2 bucket so browser presigned PUT
 * uploads from saadstudio.app are allowed.
 *
 * Usage:
 *   node scripts/set-r2-cors.mjs
 *
 * Reads env from .env.local (or from the process environment).
 */

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Load .env.local if present ───────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.trim().split("=");
    if (k && !k.startsWith("#") && rest.length) {
      const val = rest.join("=").replace(/^['"]/, "").replace(/['"]$/, "");
      if (!process.env[k]) process.env[k] = val;
    }
  }
  console.log("✓ Loaded .env.local");
}

function get(...names) {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return "";
}

const accountId = get("R2_ACCOUNT_ID");
const accessKeyId = get("R2_ACCESS_KEY_ID");
const secretAccessKey = get("R2_SECRET_ACCESS_KEY");
const bucket = get("R2_BUCKET", "R2_BUCKET_NAME");

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const corsRules = [
  {
    AllowedOrigins: [
      "https://www.saadstudio.app",
      "https://saadstudio.app",
      "http://localhost:3000",
    ],
    AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Length"],
    MaxAgeSeconds: 3600,
  },
];

console.log(`\nSetting CORS on bucket: ${bucket}\n`, JSON.stringify(corsRules, null, 2));

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: corsRules },
  })
);

console.log("\n✓ CORS policy applied successfully!\n");

// Verify
const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
console.log("Active CORS rules:", JSON.stringify(CORSRules, null, 2));

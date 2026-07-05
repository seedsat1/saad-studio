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

// ── Load environment files ───────────────────────────────────────────────────
const envFiles = [".env.production", ".env.local", ".env.migration", ".env"];
for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.trim().split("=");
      if (k && !k.startsWith("#") && rest.length) {
        const val = rest.join("=").replace(/^['"]/, "").replace(/['"]$/, "");
        if (!process.env[k]) process.env[k] = val;
      }
    }
    console.log(`✓ Loaded ${envFile}`);
  }
}

function get(...names) {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return "";
}

// ── Read configuration ───────────────────────────────────────────────────────
// Backblaze B2 (which is the default provider in the app)
const b2Bucket = get("B2_BUCKET", "B2_BUCKET_NAME");
const b2AccessKeyId = get("B2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
const b2SecretAccessKey = get("B2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY");
const b2Region = get("B2_REGION", "R2_REGION") || "eu-central-003";
const b2Endpoint = get("B2_ENDPOINT", "R2_ENDPOINT") || "https://s3.eu-central-003.backblazeb2.com";

// Cloudflare R2
const r2AccountId = get("R2_ACCOUNT_ID");
const r2AccessKeyId = get("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = get("R2_SECRET_ACCESS_KEY");
const r2Bucket = get("R2_BUCKET", "R2_BUCKET_NAME");

const corsRules = [
  {
    AllowedOrigins: [
      "https://www.saadstudio.app",
      "https://saadstudio.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Length"],
    MaxAgeSeconds: 3600,
  },
];

async function setCors(name, bucket, clientConfig) {
  console.log(`\nSetting CORS on ${name} bucket: ${bucket}`);
  console.log(JSON.stringify(corsRules, null, 2));

  try {
    const client = new S3Client(clientConfig);
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: { CORSRules: corsRules },
      })
    );
    console.log(`✓ CORS policy applied successfully to ${name} bucket: ${bucket}`);

    // Verify
    const { CORSRules } = await client.send(
      new GetBucketCorsCommand({ Bucket: bucket })
    );
    console.log(`Active CORS rules for ${name}:`, JSON.stringify(CORSRules, null, 2));
  } catch (error) {
    console.error(`✗ Failed to set CORS on ${name}:`, error.message);
  }
}

let configured = false;

// Run Backblaze B2 setup
const resolvedB2Bucket = b2Bucket || (b2AccessKeyId && !r2AccountId ? "saadstudio-storage" : "");
if (b2AccessKeyId && b2SecretAccessKey && resolvedB2Bucket) {
  configured = true;
  await setCors("Backblaze B2", resolvedB2Bucket, {
    region: b2Region,
    endpoint: b2Endpoint,
    credentials: { accessKeyId: b2AccessKeyId, secretAccessKey: b2SecretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

// Run Cloudflare R2 setup (if distinct R2 config exists)
if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket) {
  configured = true;
  if (r2AccessKeyId !== b2AccessKeyId || r2Bucket !== b2Bucket || b2Endpoint.includes("backblazeb2")) {
    await setCors("Cloudflare R2", r2Bucket, {
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
}

if (!configured) {
  console.error("No active storage configuration found in env variables.");
  process.exit(1);
}

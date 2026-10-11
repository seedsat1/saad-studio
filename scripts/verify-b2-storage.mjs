import fs from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

for (const file of [".env.production.local", ".env.local", ".env.production", ".env"]) {
  loadEnvFile(path.join(process.cwd(), file));
}

const bucketName = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || "";
const region = process.env.B2_REGION || "eu-central-003";
const endpoint = process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
const publicBase = (process.env.B2_PUBLIC_URL || process.env.B2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_URL || `https://${bucketName}.s3.${region}.backblazeb2.com`).replace(/\/+$/, "");
const accessKeyId = process.env.B2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.B2_SECRET_ACCESS_KEY || "";

function safeUrlOrigin(value) {
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return value ? "[invalid-url]" : "[unset]";
  }
}

function credentialScopeHint(keyId) {
  if (!keyId) return "missing";
  return "present";
}

function objectUrl(key) {
  return `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  if (typeof body.arrayBuffer === "function") return Buffer.from(await body.arrayBuffer());
  if (Buffer.isBuffer(body)) return body;
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function externalActionFor(error, operation) {
  const text = [error?.name, error?.Code, error?.code, error?.message].filter(Boolean).join(" ");
  if (/AccessDenied|not entitled|Forbidden|403/i.test(text)) {
    return `Backblaze external blocker: the application key used by B2_ACCESS_KEY_ID is not entitled to ${operation}. In Backblaze, create or update the Application Key for bucket '${bucketName}' so it allows writeFiles and readFiles for the tested prefixes images/, videos/, audio/, thumbnails/ (or all files in this bucket), then restart the app container with the same B2_ACCESS_KEY_ID/B2_SECRET_ACCESS_KEY/B2_BUCKET values.`;
  }
  return null;
}

const fixtures = [
  {
    label: "image",
    keyPrefix: "images",
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
  },
  {
    label: "video",
    keyPrefix: "videos",
    contentType: "video/mp4",
    body: Buffer.from([0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0x00,0x00,0x02,0x00,0x69,0x73,0x6f,0x6d,0x69,0x73,0x6f,0x32]),
  },
  {
    label: "audio",
    keyPrefix: "audio",
    contentType: "audio/wav",
    body: Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=", "base64"),
  },
  {
    label: "thumbnail",
    keyPrefix: "thumbnails",
    contentType: "image/webp",
    body: Buffer.from([0x52,0x49,0x46,0x46,0x0a,0x00,0x00,0x00,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x20]),
  },
];

async function main() {
  console.log("SAAD_STORAGE_VERIFY_START");
  console.log(JSON.stringify({
    bucket: bucketName || "[missing]",
    endpoint: safeUrlOrigin(endpoint),
    region,
    publicBase: safeUrlOrigin(publicBase),
    accessKeyId: credentialScopeHint(accessKeyId),
    secretAccessKey: secretAccessKey ? "present" : "missing",
  }, null, 2));

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    console.error("BLOCKER: Missing B2_BUCKET/B2_BUCKET_NAME, B2_ACCESS_KEY_ID, or B2_SECRET_ACCESS_KEY in the runtime environment.");
    process.exit(2);
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `storage-restore-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
  const results = [];

  for (const fixture of fixtures) {
    const ext = fixture.label === "image" ? "png" : fixture.label === "video" ? "mp4" : fixture.label === "audio" ? "wav" : "webp";
    const key = `${fixture.keyPrefix}/_diagnostics/${runId}.${ext}`;
    const publicUrl = objectUrl(key);
    const result = { label: fixture.label, key, put: "pending", head: "pending", get: "pending", publicGet: "pending", cleanup: "pending" };
    results.push(result);

    try {
      await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fixture.body,
        ContentType: fixture.contentType,
        CacheControl: "no-store",
      }));
      result.put = "ok";
    } catch (error) {
      result.put = `failed: ${error?.name || error?.code || "Error"}: ${error?.message || error}`;
      const action = externalActionFor(error, "PutObject/writeFiles");
      if (action) result.externalAction = action;
      console.error(JSON.stringify(result, null, 2));
      continue;
    }

    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      result.head = `ok contentType=${head.ContentType || "unknown"} bytes=${head.ContentLength ?? "unknown"}`;
    } catch (error) {
      result.head = `failed: ${error?.name || error?.code || "Error"}: ${error?.message || error}`;
      const action = externalActionFor(error, "HeadObject/readFiles");
      if (action) result.externalAction = action;
    }

    try {
      const object = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: key, Range: "bytes=0-63" }));
      const bytes = await bodyToBuffer(object.Body);
      result.get = bytes.length > 0 ? `ok bytes=${bytes.length}` : "failed: empty body";
    } catch (error) {
      result.get = `failed: ${error?.name || error?.code || "Error"}: ${error?.message || error}`;
      const action = externalActionFor(error, "GetObject/readFiles");
      if (action) result.externalAction = action;
    }

    try {
      const res = await fetch(publicUrl, { method: "GET", headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(10000) });
      result.publicGet = (res.ok || res.status === 206) ? `ok status=${res.status}` : `failed status=${res.status}`;
    } catch (error) {
      result.publicGet = `failed: ${error?.message || error}`;
    }

    if (process.env.KEEP_B2_DIAGNOSTIC_OBJECT === "1") {
      result.cleanup = "skipped KEEP_B2_DIAGNOSTIC_OBJECT=1";
    } else {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
        result.cleanup = "ok";
      } catch (error) {
        result.cleanup = `failed: ${error?.name || error?.code || "Error"}: ${error?.message || error}`;
      }
    }

    console.log(JSON.stringify(result, null, 2));
  }

  const failed = results.filter((r) => !String(r.put).startsWith("ok") || !String(r.head).startsWith("ok") || !String(r.get).startsWith("ok") || !String(r.publicGet).startsWith("ok"));
  if (failed.length) {
    console.error("SAAD_STORAGE_VERIFY_FAIL");
    for (const failure of failed) {
      if (failure.externalAction) console.error(failure.externalAction);
    }
    process.exit(1);
  }

  console.log("SAAD_STORAGE_VERIFY_PASS");
}

main().catch((error) => {
  console.error("SAAD_STORAGE_VERIFY_CRASH", error?.message || error);
  process.exit(1);
});

import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env: Record<string, string> = {};
  content.split("\n").forEach((line) => {
    // Strip comments
    const cleanLine = line.split("#")[0].trim();
    const match = cleanLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

async function main() {
  const envPath = path.join(process.cwd(), ".env.migration");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.migration file not found in project root!");
    console.error("Please create a .env.migration file containing access keys as specified in the migration plan.");
    process.exit(1);
  }

  console.log("📖 Loading credentials from .env.migration...");
  const env = parseEnvFile(envPath);

  const r2AccessKeyId = env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const r2Endpoint = env.R2_ENDPOINT;
  const r2Bucket = env.R2_BUCKET_NAME;

  const b2AccessKeyId = env.B2_ACCESS_KEY_ID;
  const b2SecretAccessKey = env.B2_SECRET_ACCESS_KEY;
  const b2Endpoint = env.B2_ENDPOINT;
  const b2Bucket = env.B2_BUCKET_NAME;

  if (
    !r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint || !r2Bucket ||
    !b2AccessKeyId || !b2SecretAccessKey || !b2Endpoint || !b2Bucket
  ) {
    console.error("❌ Error: Missing required credentials in .env.migration!");
    console.error("Ensure all R2_* and B2_* keys are configured correctly.");
    process.exit(1);
  }

  console.log("Initializing Cloudflare R2 Client (Source)...");
  const r2Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  console.log("Initializing Backblaze B2 Client (Destination)...");
  const b2Client = new S3Client({
    region: "eu-central-003",
    endpoint: b2Endpoint,
    credentials: { accessKeyId: b2AccessKeyId, secretAccessKey: b2SecretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  console.log(`\n🚀 Starting Migration from R2 [${r2Bucket}] -> B2 [${b2Bucket}]...`);

  let countSucceeded = 0;
  let countSkipped = 0;
  let countFailed = 0;
  let totalBytesTransferred = 0;

  let continuationToken: string | undefined = undefined;
  let hasMore = true;

  try {
    while (hasMore) {
      const listCommand = new ListObjectsV2Command({
        Bucket: r2Bucket,
        MaxKeys: 100, // Small batch sizes for visible progress
        ContinuationToken: continuationToken,
      });

      const listResponse = (await r2Client.send(listCommand)) as any;
      const contents = listResponse.Contents || [];

      if (contents.length === 0) {
        console.log("No objects found to migrate.");
        break;
      }

      console.log(`\n--- Processing batch of ${contents.length} items ---`);

      for (const object of contents) {
        const key = object.Key;
        const size = object.Size || 0;
        if (!key) continue;

        console.log(`Processing: "${key}" (${(size / (1024 * 1024)).toFixed(2)} MB)`);

        try {
          // 1. Check if it already exists in Backblaze B2 and match sizes
          let b2Exists = false;
          try {
            const headResponse = (await b2Client.send(
              new HeadObjectCommand({ Bucket: b2Bucket, Key: key })
            )) as any;
            if (headResponse.ContentLength === size) {
              b2Exists = true;
            }
          } catch {
            // Fails if object doesn't exist
          }

          if (b2Exists) {
            console.log(`   ⏭️ Skipped (Already exists in B2 with matching size)`);
            countSkipped++;
            continue;
          }

          // 2. Stream download from R2 and upload to B2
          console.log(`   📥 Downloading from R2...`);
          const getResponse = (await r2Client.send(
            new GetObjectCommand({ Bucket: r2Bucket, Key: key })
          )) as any;

          if (!getResponse.Body) {
            throw new Error("R2 GET response body is empty");
          }

          console.log(`   📤 Uploading stream to B2...`);
          await b2Client.send(
            new PutObjectCommand({
              Bucket: b2Bucket,
              Key: key,
              Body: getResponse.Body as any,
              ContentLength: size,
              ContentType: getResponse.ContentType || "application/octet-stream",
              CacheControl: getResponse.CacheControl || "public, max-age=31536000, immutable",
            })
          );

          console.log(`   ✅ Succeeded!`);
          countSucceeded++;
          totalBytesTransferred += size;
        } catch (err: any) {
          console.error(`   ❌ Failed to migrate: ${key}`, err.message || err);
          countFailed++;
        }
      }

      continuationToken = listResponse.NextContinuationToken;
      hasMore = listResponse.IsTruncated || false;
    }

    console.log("\n===============================================");
    console.log("🎉 Migration process completed!");
    console.log(`   Succeeded: ${countSucceeded}`);
    console.log(`   Skipped:   ${countSkipped}`);
    console.log(`   Failed:    ${countFailed}`);
    console.log(`   Total transferred: ${(totalBytesTransferred / (1024 * 1024)).toFixed(2)} MB`);
    console.log("===============================================");
  } catch (error: any) {
    console.error("\n❌ Fatal migration error occurred:", error.message || error);
    process.exit(1);
  }
}

main();

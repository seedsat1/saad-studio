import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import axios from "axios";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env: Record<string, string> = {};
  content.split("\n").forEach((line) => {
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

interface BucketStats {
  totalCount: number;
  totalSize: number;
  byFolder: Record<string, { count: number; size: number }>;
  files: Map<string, number>; // Key -> Size
}

async function getBucketStats(client: S3Client, bucketName: string): Promise<BucketStats> {
  const stats: BucketStats = {
    totalCount: 0,
    totalSize: 0,
    byFolder: {},
    files: new Map(),
  };

  let continuationToken: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = (await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    )) as any;

    const contents = response.Contents || [];
    for (const obj of contents) {
      if (!obj.Key) continue;
      const key = obj.Key;
      const size = obj.Size || 0;

      stats.totalCount++;
      stats.totalSize += size;
      stats.files.set(key, size);

      // Determine top-level folder prefix
      const parts = key.split("/");
      const folder = parts.length > 1 ? parts[0] + "/" : "root/";

      if (!stats.byFolder[folder]) {
        stats.byFolder[folder] = { count: 0, size: 0 };
      }
      stats.byFolder[folder].count++;
      stats.byFolder[folder].size += size;
    }

    continuationToken = response.NextContinuationToken;
    hasMore = response.IsTruncated || false;
  }

  return stats;
}

async function main() {
  const envPath = path.join(process.cwd(), ".env.migration");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.migration file not found!");
    process.exit(1);
  }

  const env = parseEnvFile(envPath);
  const r2Client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });

  const b2Client = new S3Client({
    region: "eu-central-003",
    endpoint: env.B2_ENDPOINT,
    credentials: { accessKeyId: env.B2_ACCESS_KEY_ID, secretAccessKey: env.B2_SECRET_ACCESS_KEY },
  });

  console.log("🔍 Scanning Source Cloudflare R2...");
  const r2Stats = await getBucketStats(r2Client, env.R2_BUCKET_NAME);

  console.log("🔍 Scanning Destination Backblaze B2...");
  const b2Stats = await getBucketStats(b2Client, env.B2_BUCKET_NAME);

  console.log("\n========================================================");
  console.log("📊 MIGRATION STATS COMPARISON");
  console.log("========================================================");
  console.log(`Metric           | Cloudflare R2       | Backblaze B2`);
  console.log(`--------------------------------------------------------`);
  console.log(`Total Objects    | ${String(r2Stats.totalCount).padEnd(19)} | ${b2Stats.totalCount}`);
  console.log(`Total Size (MB)  | ${((r2Stats.totalSize) / (1024 * 1024)).toFixed(2).padEnd(19)} | ${((b2Stats.totalSize) / (1024 * 1024)).toFixed(2)}`);
  console.log("========================================================\n");

  console.log("📁 FOLDER BREAKDOWN COMPARISON");
  console.log("--------------------------------------------------------");
  console.log(`Folder Prefix    | R2 Count (Size MB)   | B2 Count (Size MB)`);
  console.log(`--------------------------------------------------------`);
  
  const allFolders = new Set([...Object.keys(r2Stats.byFolder), ...Object.keys(b2Stats.byFolder)]);
  for (const folder of Array.from(allFolders).sort()) {
    const r2F = r2Stats.byFolder[folder] || { count: 0, size: 0 };
    const b2F = b2Stats.byFolder[folder] || { count: 0, size: 0 };
    
    const r2Str = `${r2F.count} (${(r2F.size / (1024 * 1024)).toFixed(2)} MB)`;
    const b2Str = `${b2F.count} (${(b2F.size / (1024 * 1024)).toFixed(2)} MB)`;
    
    console.log(`${folder.padEnd(16)} | ${r2Str.padEnd(20)} | ${b2Str}`);
  }
  console.log("--------------------------------------------------------\n");

  // 1. Missing files check
  console.log("🕵️ Checking for missing or mismatched files...");
  let missingCount = 0;
  let sizeMismatchCount = 0;

  r2Stats.files.forEach((r2Size, key) => {
    if (!b2Stats.files.has(key)) {
      console.log(`   ❌ Missing on B2: "${key}"`);
      missingCount++;
    } else {
      const b2Size = b2Stats.files.get(key);
      if (b2Size !== r2Size) {
        console.log(`   ⚠️ Size mismatch for "${key}": R2=${r2Size} bytes, B2=${b2Size} bytes`);
        sizeMismatchCount++;
      }
    }
  });

  if (missingCount === 0 && sizeMismatchCount === 0) {
    console.log("   ✅ Success: All files exist on Backblaze B2 with identical sizes.");
  } else {
    console.log(`   ❌ Error: found ${missingCount} missing files and ${sizeMismatchCount} size mismatches.`);
  }

  // 2. HTTP sample verify check
  console.log("\n🌐 Verifying public URLs and sample files access...");
  const sampleKeys = Array.from(r2Stats.files.keys()).slice(0, 5); // Take first 5 files as sample
  const b2BasePublicUrl = "https://f003.backblazeb2.com/file/saadstudio-storage";

  for (const key of sampleKeys) {
    const publicUrl = `${b2BasePublicUrl}/${key}`;
    try {
      const response = await axios.head(publicUrl);
      console.log(`   ✅ Public URL OK (${response.status} ${response.statusText}): ${publicUrl}`);
    } catch (error: any) {
      console.log(`   ❌ Public URL FAILED (${error.message}): ${publicUrl}`);
    }
  }
  console.log("========================================================\n");
}

main().catch(console.error);

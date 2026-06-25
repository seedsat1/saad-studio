const fs = require('fs');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
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

async function main() {
  const envPath = path.join(process.cwd(), ".env.migration");
  const env = parseEnvFile(envPath);
  const b2Client = new S3Client({
    region: "eu-central-003",
    endpoint: env.B2_ENDPOINT,
    credentials: {
      accessKeyId: env.B2_ACCESS_KEY_ID,
      secretAccessKey: env.B2_SECRET_ACCESS_KEY,
    },
  });

  const searchKey = "videos/user_3EGsHzh6eCMhZ4OMcgagSaF0Di7/cmqtqgfxg000211wi71g515ta.mp4";
  console.log(`Checking if key exists in B2: "${searchKey}"...`);

  try {
    let continuationToken = undefined;
    let hasMore = true;
    let found = false;

    while (hasMore) {
      const response = await b2Client.send(new ListObjectsV2Command({
        Bucket: env.B2_BUCKET_NAME,
        Prefix: searchKey,
        ContinuationToken: continuationToken,
      }));

      const contents = response.Contents || [];
      for (const obj of contents) {
        if (obj.Key === searchKey) {
          console.log(`✅ FOUND! Key: "${obj.Key}", Size: ${(obj.Size / (1024 * 1024)).toFixed(2)} MB, LastModified: ${obj.LastModified}`);
          found = true;
          break;
        }
      }

      if (found) break;
      continuationToken = response.NextContinuationToken;
      hasMore = response.IsTruncated || false;
    }

    if (!found) {
      console.log("❌ NOT FOUND in B2 bucket.");
    }
  } catch (e) {
    console.error("Error checking B2:", e);
  }
}

main().catch(console.error);

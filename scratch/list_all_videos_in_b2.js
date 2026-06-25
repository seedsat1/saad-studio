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

  console.log("Listing all video files in Backblaze B2 bucket...");
  
  try {
    let continuationToken = undefined;
    let hasMore = true;
    let videos = [];
    
    while (hasMore) {
      const response = await b2Client.send(new ListObjectsV2Command({
        Bucket: env.B2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      }));
      
      const contents = response.Contents || [];
      for (const obj of contents) {
        if (obj.Key && (obj.Key.endsWith('.webm') || obj.Key.endsWith('.mp4'))) {
          videos.push({ key: obj.Key, size: obj.Size });
        }
      }
      
      continuationToken = response.NextContinuationToken;
      hasMore = response.IsTruncated || false;
    }
    
    console.log(`Found ${videos.length} videos in B2:`);
    videos.forEach(v => {
      console.log(`- ${v.key} (${(v.size / (1024 * 1024)).toFixed(2)} MB)`);
    });
    
  } catch (e) {
    console.error("Error:", e);
  }
}

main().catch(console.error);

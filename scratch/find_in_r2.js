const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

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

  const r2Client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log("Listing R2 objects...");
    const command = new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      MaxKeys: 1000
    });
    const res = await r2Client.send(command);
    const contents = res.Contents || [];
    
    console.log(`Listed ${contents.length} objects.`);
    for (const obj of contents) {
      if (obj.Key.includes("17792") || obj.Key.includes("admin-cms")) {
        console.log(`✨ Found match in R2: ${obj.Key} (Size: ${obj.Size})`);
      }
    }
  } catch (e) {
    console.error("Failed to list R2:", e);
  }
}

main();

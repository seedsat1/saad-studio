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

  const b2Client = new S3Client({
    region: "eu-central-003",
    endpoint: env.B2_ENDPOINT,
    credentials: {
      accessKeyId: env.B2_ACCESS_KEY_ID,
      secretAccessKey: env.B2_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log("Listing B2 objects under videos/admin-cms/...");
    const command = new ListObjectsV2Command({
      Bucket: env.B2_BUCKET_NAME,
      Prefix: "videos/admin-cms/"
    });
    const res = await b2Client.send(command);
    const contents = res.Contents || [];
    
    console.log(`Listed ${contents.length} objects.`);
    for (const obj of contents) {
      console.log(`- Key: ${obj.Key} (Size: ${obj.Size})`);
    }
  } catch (e) {
    console.error("Failed to list B2:", e);
  }
}

main();

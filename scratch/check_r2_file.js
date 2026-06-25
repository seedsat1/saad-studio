const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
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

  const testKeys = [
    "videos/admin-cms/1779215073996-5n4540.webm", // layer-mixed-media
    "videos/admin-cms/1779220957491-4e2p7s.webm", // sketch
    "videos/admin-cms/1779221745955-0dabja.webm", // canvas
    "videos/admin-cms/1779222470322-ldx939.webm", // flash-comic
    "videos/admin-cms/1779223116901-lvhjhv.webm", // overexposed
  ];

  for (const key of testKeys) {
    try {
      await r2Client.send(new HeadObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key
      }));
      console.log(`✅ File found in R2: ${key}`);
    } catch (e) {
      console.log(`❌ File NOT found in R2: ${key}`);
    }
  }
}

main();

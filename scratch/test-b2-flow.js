const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

function loadMigrationEnv() {
  const envPath = path.resolve(process.cwd(), ".env.migration");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.migration not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    const key = parts[0]?.trim();
    let val = parts.slice(1).join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    if (key) env[key] = val;
  });
  return env;
}

async function main() {
  try {
    const env = loadMigrationEnv();
    const b2Client = new S3Client({
      endpoint: env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
      region: "eu-central-003",
      credentials: {
        accessKeyId: env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: env.B2_SECRET_ACCESS_KEY || "",
      },
    });

    const bucket = env.B2_BUCKET_NAME || "saadstudio-storage";
    const key = "videos/test-file.txt";

    console.log(`Testing B2 Bucket: ${bucket}`);
    
    // 1. Upload
    console.log("1. Uploading test file...");
    await b2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "Hello from B2 test flow!",
      ContentType: "text/plain"
    }));
    console.log("✅ Upload successful!");

    // 2. Download (GET) directly without HEAD
    console.log("2. Downloading file (GET)...");
    const getRes = await b2Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    const data = await getRes.Body.transformToString();
    console.log("✅ Download successful! Content:", data);

    // 3. Delete
    console.log("3. Deleting test file...");
    await b2Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    console.log("✅ Delete successful!");

  } catch (err) {
    console.error("❌ B2 operation failed:", err);
  }
}

main();

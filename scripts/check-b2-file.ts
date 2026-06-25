import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

function loadMigrationEnv() {
  const envPath = path.resolve(process.cwd(), ".env.migration");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.migration not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};
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
    const key = "videos/user_3CMgl0E1u3OcgATvBIZR3rByAXo/1780349239104-qd7s1axz-2.bin";

    console.log(`Checking B2 bucket: ${bucket} for key: ${key}`);
    const res = await b2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log("✅ File exists on B2!");
    console.log("Metadata:", res);
  } catch (err: any) {
    console.error("❌ File does NOT exist on B2 or error checking:", err.message);
  }
}

main();

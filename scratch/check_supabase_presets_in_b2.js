const fs = require('fs');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
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

const originalPresets = {
  "noir": "videos/admin-cms/1779226523728-mfqft7.webm",
  "canvas": "videos/admin-cms/1779221745955-0dabja.webm",
  "sketch": "videos/admin-cms/1779220957491-4e2p7s.webm",
  "particles": "videos/admin-cms/1779229015580-3sxnmo.webm",
  "hand-paint": "videos/admin-cms/1779229339335-orcbq9.webm",
  "anime-pulse": "videos/admin-cms/1779232010558-5j04fj.webm",
  "y2k-camcorder": "videos/admin-cms/1779232842215-owiom9.mp4",
  "cyberpunk-neon": "videos/admin-cms/1779231254522-s7bw8y.webm",
  "paparazzi-flash": "videos/admin-cms/1779231454522-owiom9.mp4",
  "cinematic-trailer": "videos/admin-cms/1779228523728-mfqft7.webm",
  "k-drama-soft": "videos/admin-cms/1779229000368-h7vcl4.webm",
  "vhs-memories": "videos/admin-cms/1779230100368-h7vcl4.webm",
  "polaroid-snap": "videos/admin-cms/1779231000368-h7vcl4.webm",
  "golden-hour": "videos/admin-cms/1779232500368-h7vcl4.webm",
  "synthwave-drive": "videos/admin-cms/1779231800368-h7vcl4.webm",
  "watercolor-dream": "videos/admin-cms/1779229500368-h7vcl4.webm",
  "layer-mixed-media": "videos/admin-cms/1779220000368-h7vcl4.webm"
};

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

  console.log("Checking if original Supabase videos exist in Backblaze B2...");
  
  for (const [presetId, key] of Object.entries(originalPresets)) {
    try {
      await b2Client.send(new HeadObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key }));
      console.log(`✅ ${presetId}: EXISTS in B2! ("${key}")`);
    } catch (e) {
      console.log(`❌ ${presetId}: NOT in B2! ("${key}")`);
    }
  }
}

main().catch(console.error);

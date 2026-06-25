const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
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
  const prisma = new PrismaClient();

  const b2Client = new S3Client({
    region: "eu-central-003",
    endpoint: env.B2_ENDPOINT,
    credentials: {
      accessKeyId: env.B2_ACCESS_KEY_ID,
      secretAccessKey: env.B2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const allLayouts = await prisma.pageLayout.findMany();
    const supabaseUrls = [];
    for (const layout of allLayouts) {
      if (layout.pageName === "cms-cinematic-styles") continue; // Already processed
      const str = JSON.stringify(layout.layoutBlocks);
      if (str.includes("supabase.co")) {
        const urls = str.match(/https:\/\/[^\s"']+/g) || [];
        urls.filter(u => u.includes("supabase.co")).forEach(u => {
          supabaseUrls.push({ page: layout.pageName, url: u });
        });
      }
    }

    console.log(`Found ${supabaseUrls.length} other Supabase URLs to check in B2:`);
    for (const item of supabaseUrls) {
      // Extract key from URL
      // E.g. https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/images/admin-cms/1777423162455-k9ctf9.webp
      // Key is: images/admin-cms/1777423162455-k9ctf9.webp
      let key = "";
      const match = item.url.match(/object\/public\/(.+)$/);
      if (match) {
        key = match[1];
      }

      if (!key) {
        console.log(`  ❌ Could not extract key from: ${item.url}`);
        continue;
      }

      try {
        await b2Client.send(new HeadObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: key }));
        console.log(`  ✅ Key exists in B2: "${key}" (Page: ${item.page})`);
      } catch (e) {
        console.log(`  ❌ Key missing in B2: "${key}" (Page: ${item.page})`);
      }
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

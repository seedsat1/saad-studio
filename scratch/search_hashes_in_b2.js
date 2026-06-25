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

const hashes = [
  "mfqft7", "0dabja", "4e2p7s", "3sxnmo", "orcbq9", "5j04fj", "ldx939",
  "vm451c", "lvhjhv", "vj93qd", "3c7ovt", "1l9t6m", "owiom9", "s7bw8y",
  "pvvru8", "px5yy9", "4cmr2l", "30ypgt", "5n4540"
];

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
    console.log("Listing all B2 objects to find matches for the missing preset hashes...");
    let continuationToken = undefined;
    let hasMore = true;
    let totalCount = 0;
    const found = [];

    while (hasMore) {
      const command = new ListObjectsV2Command({
        Bucket: env.B2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });
      const res = await b2Client.send(command);
      const contents = res.Contents || [];
      totalCount += contents.length;

      for (const obj of contents) {
        for (const hash of hashes) {
          if (obj.Key.includes(hash)) {
            found.push({ key: obj.Key, size: obj.Size, hash });
          }
        }
      }

      continuationToken = res.NextContinuationToken;
      hasMore = res.IsTruncated || false;
    }

    console.log(`Scanned ${totalCount} objects in B2.`);
    console.log(`Found ${found.length} matches:`);
    console.log(JSON.stringify(found, null, 2));

  } catch (e) {
    console.error("Failed to list B2:", e);
  }
}

main();

import * as fs from "fs";
import * as path from "path";

// Simple manual env parser to load B2 settings for testing
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, "..", file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const firstEq = trimmed.indexOf("=");
          const key = trimmed.slice(0, firstEq).trim();
          let val = trimmed.slice(firstEq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[key] = val; // Set the key directly
        }
      }
    }
  }
}

// Load env BEFORE importing storage module
loadEnv();

async function runTests() {
  console.log("🧪 Verifying BROWSER_MEDIA_URL_MODE behavior...\n");

  // Dynamically import to ensure process.env is set before the class is initialized
  const { normalizeMediaUrl } = await import("../lib/storage");

  const testKey = "images/user_3CMgl0/test-photo.jpg";
  const b2Base = process.env.B2_PUBLIC_URL || "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com";

  // Case 1: mode = "proxy"
  process.env.BROWSER_MEDIA_URL_MODE = "proxy";
  const proxyResult = normalizeMediaUrl(testKey);
  console.log("1️⃣ Mode: proxy");
  console.log(`   Input:  ${testKey}`);
  console.log(`   Output: ${proxyResult}`);
  if (proxyResult !== `/api/media/${testKey}`) {
    throw new Error(`Expected proxy path but got: ${proxyResult}`);
  }
  console.log("   ✅ Passed!");

  // Case 2: mode = "cdn"
  process.env.BROWSER_MEDIA_URL_MODE = "cdn";
  process.env.BROWSER_CDN_BASE_URL = "https://cdn.saadstudio.app";
  const cdnResult = normalizeMediaUrl(testKey);
  console.log("\n2️⃣ Mode: cdn");
  console.log(`   Input:  ${testKey}`);
  console.log(`   Output: ${cdnResult}`);
  if (cdnResult !== `https://cdn.saadstudio.app/${testKey}`) {
    throw new Error(`Expected cdn path but got: ${cdnResult}`);
  }
  console.log("   ✅ Passed!");

  // Case 3: mode = "b2" (default)
  process.env.BROWSER_MEDIA_URL_MODE = "b2";
  const b2Result = normalizeMediaUrl(testKey);
  console.log("\n3️⃣ Mode: b2 (default)");
  console.log(`   Input:  ${testKey}`);
  console.log(`   Output: ${b2Result}`);
  if (!b2Result || !b2Result.startsWith(b2Base)) {
    throw new Error(`Expected direct B2 URL starting with ${b2Base} but got: ${b2Result}`);
  }
  console.log("   ✅ Passed!");

  console.log("\n🎉 All mode verification tests passed successfully!");
}

runTests().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});

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
    const keyId = env.B2_ACCESS_KEY_ID;
    const applicationKey = env.B2_SECRET_ACCESS_KEY;

    console.log("Authorizing B2 Account...");
    const authHeader = "Basic " + Buffer.from(`${keyId}:${applicationKey}`).toString("base64");
    const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      headers: { Authorization: authHeader }
    });
    
    if (!authRes.ok) {
      console.error("Auth failed:", authRes.status, await authRes.text());
      return;
    }
    
    const authData = await authRes.json();
    console.log("✅ Full Authorization Response Object:");
    console.log(JSON.stringify(authData, null, 2));

  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

main();

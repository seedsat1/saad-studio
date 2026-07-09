const fs = require("fs");
const path = require("path");

function getApiKey() {
  const envFile = ".env";
  const fullPath = path.join(__dirname, "..", envFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(/WAVESPEED_API_KEY\s*=\s*(.*)/);
    if (match) {
      return match[1].trim().replace(/['"]/g, "");
    }
  }
  return null;
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("WAVESPEED_API_KEY not found in .env");
    return;
  }

  const url = "https://api.wavespeed.ai/api/v3/models";
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    const data = await res.json().catch(() => null);
    if (data && Array.isArray(data.data)) {
      const filtered = data.data.filter(m => 
        (m.model_id && (m.model_id.toLowerCase().includes("seedream") || m.model_id.toLowerCase().includes("bytedance"))) ||
        (m.name && (m.name.toLowerCase().includes("seedream") || m.name.toLowerCase().includes("bytedance")))
      );
      console.log(`Found ${filtered.length} matching models:`);
      filtered.forEach(m => {
        console.log(`- ID: ${m.model_id}, Type: ${m.type}, Description: ${m.description}`);
      });
    } else {
      console.log("No data returned or invalid format.");
    }
  } catch (e) {
    console.error(`Failed:`, e.message);
  }
}

main();

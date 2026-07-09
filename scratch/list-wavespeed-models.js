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

  const endpoints = [
    "https://api.wavespeed.ai/api/v3/models",
    "https://api.wavespeed.ai/api/v2/models",
    "https://api.wavespeed.ai/api/v3/user/models",
    "https://api.wavespeed.ai/api/v3/predictions/models"
  ];

  for (const url of endpoints) {
    console.log(`\nFetching ${url}...`);
    try {
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      const data = await res.json().catch(() => null);
      console.log(`Status: ${res.status}`);
      if (data) {
        console.log(`Response keys:`, Object.keys(data));
        if (data.data) {
          console.log(`data type:`, typeof data.data, Array.isArray(data.data) ? `array length = ${data.data.length}` : "");
          if (Array.isArray(data.data)) {
            console.log(`First few models:`, data.data.slice(0, 10).map(m => m.id || m.model || m));
          } else {
            console.log(`data preview:`, JSON.stringify(data.data).substring(0, 200));
          }
        } else {
          console.log(`Response preview:`, JSON.stringify(data).substring(0, 200));
        }
      }
    } catch (e) {
      console.error(`Failed:`, e.message);
    }
  }
}

main();

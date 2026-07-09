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
  console.log("WAVESPEED_API_KEY found:", apiKey.substring(0, 15) + "...");

  const testModels = [
    "bytedance/seedream-v5-lite",
    "bytedance/seedream-v5-lite/edit",
    "bytedance/seedream-v5-lite/image-to-image",
    "bytedance/seedream-v5-lite/i2v",
    "bytedance/seedream-v5",
    "bytedance/seedream-v5/edit"
  ];

  for (const model of testModels) {
    const url = `https://api.wavespeed.ai/api/v3/${model}`;
    console.log(`\nTesting POST request to ${url}...`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: "test",
          aspect_ratio: "1:1",
          images: ["https://www.saadstudio.app/favicon.png"]
        })
      });
      const data = await res.json().catch(() => null);
      console.log(`Status: ${res.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Fetch failed for ${model}:`, e.message);
    }
  }
}

main();

const fs = require("fs");
const path = require("path");

function getApiKey(envFile) {
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
  const apiKey = getApiKey(".env");
  if (!apiKey) {
    console.error("WAVESPEED_API_KEY not found in .env");
    return;
  }
  console.log("WAVESPEED_API_KEY found in .env:", apiKey.substring(0, 15) + "...");

  const testModels = [
    "bytedance/seedream-v4.5/edit",
    "seedream/4.5-edit",
    "seedream/4.5-text-to-image",
    "bytedance/seedream-v4.5/image-edit"
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
          images: ["https://www.saadstudio.app/favicon.png"] // dummy image URL
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

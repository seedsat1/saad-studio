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
  if (!apiKey) return;
  const res = await fetch("https://api.wavespeed.ai/api/v3/models", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  const data = await res.json();
  const list = data.data
    .map(m => m.model_id)
    .filter(id => id.includes("seedream"));
  console.log(list);
}

main();

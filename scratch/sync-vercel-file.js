const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getCorrectKey() {
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

function runSync(cmd) {
  console.log(`Executing: ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (e) {
    console.error(`Execution failed: ${e.message}`);
    return false;
  }
}

async function main() {
  const correctKey = getCorrectKey();
  if (!correctKey || !correctKey.startsWith("wsk_live_")) {
    console.error("Could not find correct WAVESPEED_API_KEY starting with wsk_live_ in .env");
    return;
  }
  console.log("Correct key found. Length:", correctKey.length);

  const tempFilePath = path.join(__dirname, "temp_key.txt");
  fs.writeFileSync(tempFilePath, correctKey, "utf-8");

  try {
    const envs = ["production", "preview", "development"];
    for (const env of envs) {
      console.log(`\nUpdating WAVESPEED_API_KEY for ${env}...`);
      const cmd = `npx -y vercel env add WAVESPEED_API_KEY ${env} --yes --force --non-interactive --scope saadstudios-projects < "${tempFilePath}"`;
      runSync(cmd);
    }
    console.log("\nSuccessfully synchronized WAVESPEED_API_KEY on Vercel!");
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Cleaned up temporary key file.");
    }
  }
}

main();

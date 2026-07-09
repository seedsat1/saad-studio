const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const safeArgs = args.map(arg => arg.includes("wsk_") ? "wsk_***" : arg);
    console.log(`Running: ${command} ${safeArgs.join(" ")}`);
    
    const proc = spawn(command, args, { shell: true });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}. Error: ${stderr.trim()}`));
      }
    });
  });
}

async function main() {
  const correctKey = getCorrectKey();
  if (!correctKey || !correctKey.startsWith("wsk_live_")) {
    console.error("Could not find correct WAVESPEED_API_KEY starting with wsk_live_ in .env");
    return;
  }
  console.log("Correct key found in .env. Length:", correctKey.length);

  try {
    // Add correct keys to Vercel with --force, --value, --non-interactive and --scope
    console.log("\nAdding correct WAVESPEED_API_KEY to production...");
    await runCommand("npx", ["-y", "vercel", "env", "add", "WAVESPEED_API_KEY", "production", "--value", correctKey, "--yes", "--force", "--non-interactive", "--scope", "saadstudios-projects"]);

    console.log("\nAdding correct WAVESPEED_API_KEY to preview...");
    await runCommand("npx", ["-y", "vercel", "env", "add", "WAVESPEED_API_KEY", "preview", "--value", correctKey, "--yes", "--force", "--non-interactive", "--scope", "saadstudios-projects"]);

    console.log("\nAdding correct WAVESPEED_API_KEY to development...");
    await runCommand("npx", ["-y", "vercel", "env", "add", "WAVESPEED_API_KEY", "development", "--value", correctKey, "--yes", "--force", "--non-interactive", "--scope", "saadstudios-projects"]);

    console.log("\nSuccessfully synchronized WAVESPEED_API_KEY on Vercel!");
  } catch (error) {
    console.error("Sync failed:", error.message);
  }
}

main();

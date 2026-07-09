const fs = require("fs");
const path = require("path");

function checkEnvFile(filename) {
  const fullPath = path.join(__dirname, "..", filename);
  if (!fs.existsSync(fullPath)) {
    console.log(`${filename} does not exist`);
    return;
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  console.log(`=== ${filename} ===`);
  for (const line of lines) {
    if (line.includes("API_KEY") || line.includes("SECRET") || line.includes("RUNNINGHUB") || line.includes("WAVESPEED")) {
      const parts = line.split("=");
      const key = parts[0].trim();
      const val = parts[1] ? parts[1].trim() : "";
      console.log(`${key}: length=${val.length}, prefix=${val.substring(0, 10)}...`);
    }
  }
}

checkEnvFile(".env");
checkEnvFile(".env.vercel");
checkEnvFile(".env.vercel.decrypted");
checkEnvFile(".env.local");

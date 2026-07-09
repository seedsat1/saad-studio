const fs = require("fs");
const path = require("path");

const envFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.vercel",
  ".env.vercel.decrypted",
  ".env.vercel.production.decrypted"
];

for (const file of envFiles) {
  const fullPath = path.join(__dirname, "..", file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(/WAVESPEED_API_KEY\s*=\s*(.*)/);
    if (match) {
      const val = match[1].trim();
      console.log(`${file}: key length = ${val.length}, starts with = ${val.substring(0, 8)}...`);
    } else {
      console.log(`${file}: no WAVESPEED_API_KEY found`);
    }
  } else {
    console.log(`${file}: does not exist`);
  }
}

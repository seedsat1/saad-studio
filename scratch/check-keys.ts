import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, "..", file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const firstEq = trimmed.indexOf("=");
          const key = trimmed.slice(0, firstEq).trim();
          let val = trimmed.slice(firstEq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          // Do NOT check !process.env[key] or let's override properly so env.local overrides env
          // Wait, in Node.js, process env is set. Let's see: we should override if the file is loaded.
          // Actually, .env.local should have priority over .env!
          // So if we load .env first, and then .env.local, .env.local overrides it.
          if (file === ".env.local") {
            process.env[key] = val; // Force override for local
          } else if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

console.log("B2_ACCESS_KEY_ID:", process.env.B2_ACCESS_KEY_ID);
console.log("B2_SECRET_ACCESS_KEY:", process.env.B2_SECRET_ACCESS_KEY ? "EXISTS" : "NONE");
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID);
console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY);

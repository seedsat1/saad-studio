const { normalizeMediaUrl } = require("../lib/r2-storage");
const path = require("path");
const fs = require("fs");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/['"]/g, "");
    }
  });
}

console.log("Testing normalizeMediaUrl...");
const relativePath = "images/user_test/test_ref_image.jpg";
const resolved = normalizeMediaUrl(relativePath);
console.log("Relative:", relativePath);
console.log("Resolved:", resolved);

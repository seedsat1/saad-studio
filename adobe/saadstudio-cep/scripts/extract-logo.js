/**
 * One-off helper: pull the 32x32 PNG out of public/favicon-v2.ico (or
 * resize public/favicon.ico.png if it's a real raster) and write it as
 * icons/logo.png at multiple sizes the CEP runtime accepts.
 *
 * Run from the project root:
 *   node adobe/saadstudio-cep/scripts/extract-logo.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "../../..");
const iconsDir = path.resolve(__dirname, "..", "icons");

// Sharp doesn't read .ico — fall through to the WebP-disguised-as-png
// which is the actual high-res raster source.
const candidates = [
  path.join(projectRoot, "public", "favicon.ico.png"),
  path.join(projectRoot, "public", "favicon-v2.png"),
  path.join(projectRoot, "public", "logo.png"),
  path.join(projectRoot, "favicon.png"),
];

const source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error("No favicon source found. Tried:", candidates);
  process.exit(1);
}
console.log("Source:", source);

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

(async () => {
  const buf = fs.readFileSync(source);
  // Sharp auto-detects ico/webp/png/jpg/etc.
  const base = sharp(buf, { density: 384 });

  const out = path.join(iconsDir, "logo.png");
  await base
    .clone()
    .resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);

  await base
    .clone()
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, "logo-48.png"));

  console.log("Wrote", out);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

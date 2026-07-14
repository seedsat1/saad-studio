import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwdPackagePath = path.join(process.cwd(), "package.json");
const cwdPackage = await fs.readFile(cwdPackagePath, "utf8").catch(() => "");
const agentRoot = cwdPackage.includes("\"name\": \"saad-agent\"")
  ? path.resolve(process.cwd())
  : path.resolve(scriptDir, "..");
const dezRoot = path.join(agentRoot, "release-production-v4", "win-unpacked", "DEZ");
const outputPath = path.join(agentRoot, "DESIGN_REFERENCE_MANIFEST.json");

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache"
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".txt",
  ".yml",
  ".yaml",
  ".cjs",
  ".mjs",
  ".svg"
]);

function normalizePath(input) {
  return input.replace(/\\/g, "/");
}

function classify(relativePath) {
  const value = normalizePath(relativePath).toLowerCase();
  const categories = [];
  if (value.includes("landing")) categories.push("landing");
  if (value.includes("dashboard")) categories.push("dashboard");
  if (value.includes("/chat") || value.includes("chat/")) categories.push("chat");
  if (value.includes("settings")) categories.push("settings");
  if (/auth|login|signup|sign-up|forgot-password/.test(value)) categories.push("auth");
  if (/pricing|billing|plans?/.test(value)) categories.push("pricing");
  if (/components\/ui|\/ui\/|ui-main/.test(value)) categories.push("ui-components");
  if (value.includes("components")) categories.push("components");
  if (/theme|customizer|tokens?|colors?|config/.test(value)) categories.push("theme");
  if (value.includes("admin")) categories.push("admin");
  if (/tasks?/.test(value)) categories.push("tasks");
  if (/users?/.test(value)) categories.push("users");
  if (value.includes("calendar")) categories.push("calendar");
  if (/faqs?/.test(value)) categories.push("faq");
  if (/mail/.test(value)) categories.push("mail");
  if (/public|assets?|images?|\.png$|\.jpe?g$|\.webp$|\.gif$|\.ico$|\.svg$/.test(value)) categories.push("visual-assets");
  if (/readme|docs?|license/.test(value)) categories.push("docs");
  if (/\.zip$/.test(value)) categories.push("archive");
  if (!categories.length) categories.push("misc");
  return Array.from(new Set(categories));
}

async function walk(directory, files) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await walk(fullPath, files);
      }
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    const relativePath = normalizePath(path.relative(dezRoot, fullPath));
    const ext = path.extname(entry.name).toLowerCase();
    files.push({
      path: relativePath,
      size: stat.size,
      extension: ext || "(none)",
      textLike: textExtensions.has(ext),
      categories: classify(relativePath)
    });
  }
}

function summarize(files) {
  const roots = new Map();
  const categories = new Map();
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.size;
    const root = file.path.split("/")[0] || "(root)";
    const rootSummary = roots.get(root) || { name: root, totalFiles: 0, totalBytes: 0 };
    rootSummary.totalFiles += 1;
    rootSummary.totalBytes += file.size;
    roots.set(root, rootSummary);

    for (const category of file.categories) {
      const categorySummary = categories.get(category) || { count: 0, examples: [] };
      categorySummary.count += 1;
      if (categorySummary.examples.length < 30) {
        categorySummary.examples.push(file.path);
      }
      categories.set(category, categorySummary);
    }
  }

  return {
    roots: Array.from(roots.values()).sort((a, b) => a.name.localeCompare(b.name)),
    categories: Object.fromEntries(Array.from(categories.entries()).sort(([a], [b]) => a.localeCompare(b))),
    totalBytes
  };
}

async function main() {
  const rootStat = await fs.stat(dezRoot).catch(() => null);
  if (!rootStat?.isDirectory()) {
    throw new Error(`DEZ reference root not found: ${dezRoot}`);
  }

  const files = [];
  await walk(dezRoot, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const summary = summarize(files);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    purpose: "Complete file-level manifest for Saad Agent local DEZ design references.",
    rules: [
      "Use DEZ as a read-only design/reference source.",
      "Inspect the target workspace before using reference patterns.",
      "Inspect relevant files from this manifest before implementing UI/design work.",
      "Do not copy full projects or blindly overwrite target files.",
      "Do not modify files inside DEZ."
    ],
    relativeDezRoot: "release-production-v4/win-unpacked/DEZ",
    absoluteDezRoot: normalizePath(dezRoot),
    totalFiles: files.length,
    totalBytes: summary.totalBytes,
    roots: summary.roots,
    categories: summary.categories,
    files
  };

  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${normalizePath(outputPath)} with ${files.length} files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

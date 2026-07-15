import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwdPackagePath = path.join(process.cwd(), "package.json");
const cwdPackage = await fs.readFile(cwdPackagePath, "utf8").catch(() => "");
const agentRoot = cwdPackage.includes("\"name\": \"saad-agent\"")
  ? path.resolve(process.cwd())
  : path.resolve(scriptDir, "..");

const referenceRoot = process.env.SAAD_AGENT_CLAUDE_CODE_REFERENCE_ROOT
  || "E:\\Agent-Reach-main\\claude-code";
const outputPath = path.join(agentRoot, "CLAUDE_CODE_REFERENCE_MANIFEST.json");

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
  ".toml"
]);

function normalizePath(input) {
  return input.replace(/\\/g, "/");
}

function classify(relativePath) {
  const value = normalizePath(relativePath).toLowerCase();
  const categories = [];
  if (/package\.json$|bun\.lock$|pnpm-lock|yarn\.lock|package-lock/.test(value)) categories.push("package");
  if (/readme|license|claude\.md|docs?/.test(value)) categories.push("docs");
  if (/entrypoints?|cli|mcp|sdk/.test(value)) categories.push("entrypoints");
  if (/tool|tools|toolresult|toolpool/.test(value)) categories.push("tools");
  if (/task|tasks|workflow/.test(value)) categories.push("tasks");
  if (/agent|localagent|sub.?agent/.test(value)) categories.push("agent-runtime");
  if (/memory|memdir|context|token|budget|summary/.test(value)) categories.push("memory-context");
  if (/permission|approval|policy|guard|safety/.test(value)) categories.push("permissions");
  if (/terminal|shell|bash|command|windowspaths/.test(value)) categories.push("terminal");
  if (/diff|patch|edit|write|read|file/.test(value)) categories.push("file-ops");
  if (/plugin|skill|hook|marketplace/.test(value)) categories.push("skills-plugins-hooks");
  if (/test|spec/.test(value)) categories.push("tests");
  if (/claude-code-source-code-leak|source-code-leak|leak/.test(value)) categories.push("high-risk-unusable-reference");
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
    const relativePath = normalizePath(path.relative(referenceRoot, fullPath));
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
  const rootStat = await fs.stat(referenceRoot).catch(() => null);
  if (!rootStat?.isDirectory()) {
    throw new Error(`Claude Code reference root not found: ${referenceRoot}`);
  }

  const files = [];
  await walk(referenceRoot, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const summary = summarize(files);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    purpose: "File-level manifest for the local Claude Code comparative architecture reference.",
    safetyRules: [
      "Read-only architecture reference only.",
      "Do not copy, run, vendor, bundle, import, or reverse-engineer code from this folder.",
      "Use only high-level patterns implemented with original Saad Agent code.",
      "High-risk leaked/proprietary mirrors must be excluded from public or customer-facing releases."
    ],
    relativeReferenceRoot: "E:/Agent-Reach-main/claude-code",
    absoluteReferenceRoot: normalizePath(referenceRoot),
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

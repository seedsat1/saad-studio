import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KnowledgeManagerService } from "../dist/platform/services/knowledge-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const sourceRoot = process.argv[2];
if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  console.error("Usage: node scripts/import-agent-training-folder.mjs <training-folder>");
  process.exit(1);
}

const excludedDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "vendor",
  "coverage",
  ".cache",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  ".pnpm-store",
  "target",
  "out",
  ".output",
]);

const allowedExtensions = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonl",
  ".yaml",
  ".yml",
  ".html",
  ".csv",
  ".pdf",
  ".docx",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
]);

const binaryLikeExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".mov",
  ".zip",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".asar",
]);

const duplicateTopDirs = new Set([
  "agent-rules-books-main",
  "awesome-ai-agents-main_2",
  "everything-ai-coding-main",
]);

const quotaByTop = new Map([
  ["agent-rules-books", 260],
  ["api-guidelines-vnext", 70],
  ["awesome-ai-apps-main", 160],
  ["awesome-generative-ai-guide-main", 120],
  ["awesome-llm-apps-main", 200],
  ["awesome-system-prompts-main", 280],
  ["azure-rest-api-specs-main", 90],
  ["claude-code-prompts-master", 80],
  ["claude-code-system-prompts-main", 240],
  ["claude-skills-main", 320],
  ["everything-ai-coding", 180],
  ["system-prompts-and-models-of-ai-tools-main", 140],
]);

const defaultTopQuota = 80;
const maxImports = Number(process.env.SAAD_IMPORT_LIMIT || 1800);
const maxReadableBytes = 1024 * 1024;
const maxCodeBytes = 220 * 1024;
const maxStructuredBytes = 360 * 1024;

const keywordWeights = [
  ["pricing", 14],
  ["price", 12],
  ["cost", 12],
  ["credit", 14],
  ["margin", 14],
  ["profit", 14],
  ["billing", 12],
  ["calculation", 14],
  ["calculator", 14],
  ["formula", 14],
  ["provider", 12],
  ["model", 9],
  ["api", 10],
  ["integration", 8],
  ["security", 12],
  ["safety", 10],
  ["git", 8],
  ["release", 10],
  ["deploy", 8],
  ["verification", 12],
  ["test", 7],
  ["workflow", 12],
  ["maintenance", 12],
  ["daily", 10],
  ["bug", 10],
  ["fix", 8],
  ["review", 8],
  ["page", 6],
  ["route", 6],
  ["architecture", 12],
  ["clean-architecture", 14],
  ["rag", 14],
  ["retrieval", 12],
  ["memory", 12],
  ["knowledge", 12],
  ["agent", 10],
  ["prompt", 12],
  ["system-prompt", 14],
  ["skill", 12],
  ["mcp", 10],
  ["tool", 8],
  ["connector", 9],
  ["rule", 10],
  ["guideline", 10],
  ["instruction", 9],
  ["docs", 5],
  ["readme", 8],
];

const categories = [
  "programming",
  "react",
  "nextjs",
  "typescript",
  "electron",
  "nodejs",
  "ai",
  "providers",
  "database",
  "security",
  "uiux",
  "architecture",
  "saad-studio",
  "custom",
];

function normalizeText(value) {
  return value.toLowerCase().replace(/\\/g, "/");
}

function topDirOf(filePath) {
  const relative = path.relative(sourceRoot, filePath);
  return relative.split(path.sep)[0] || "";
}

function walk(dir, files = [], skipped = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) {
        skipped.push({ path: path.relative(sourceRoot, fullPath), reason: "excluded directory" });
        continue;
      }
      walk(fullPath, files, skipped);
      continue;
    }
    files.push(fullPath);
  }
  return { files, skipped };
}

function isSecretLike(filePath, content = "") {
  const lower = normalizeText(filePath);
  if (/(^|[/.\\_-])(\.env|secret|secrets|credential|credentials|token|tokens|cookie|cookies|private[-_]?key|\.pem|\.key)([/.\\_-]|$)/i.test(lower)) {
    return true;
  }
  if (/-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/.test(content)) return true;
  if (/\b(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/.test(content)) return true;
  return false;
}

function scoreFile(filePath, stat) {
  const rel = normalizeText(path.relative(sourceRoot, filePath));
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (binaryLikeExtensions.has(ext)) return { score: -1, reason: "binary or archive" };
  if (!allowedExtensions.has(ext)) return { score: -1, reason: "unsupported extension" };
  if (/package-lock|pnpm-lock|yarn\.lock|composer\.lock|cargo\.lock|poetry\.lock|uv\.lock|\.min\.js|\.map$/.test(base)) {
    return { score: -1, reason: "lock or generated artifact" };
  }
  if (stat.size > maxReadableBytes) return { score: -1, reason: "too large for useful import" };
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"].includes(ext) && stat.size > maxCodeBytes) {
    return { score: -1, reason: "large code file" };
  }
  if ([".json", ".jsonl", ".yaml", ".yml", ".csv"].includes(ext) && stat.size > maxStructuredBytes) {
    return { score: -1, reason: "large structured spec" };
  }

  let score = 0;
  if (/^readme(\..*)?$/.test(base)) score += 28;
  if (/^(contributing|changelog|license|security|architecture|roadmap)(\..*)?$/.test(base)) score += 16;
  if (rel.includes("/docs/") || rel.includes("/documentation/")) score += 8;
  if (rel.includes("/examples/") || rel.includes("/templates/")) score += 3;
  if (rel.includes("/test/") || rel.includes("/tests/")) score += 2;
  if (rel.includes("azure-rest-api-specs-main") && !/(readme|guideline|docs|documentation|openapi|api-version|security|pricing|cost|provider|model)/.test(rel)) {
    score -= 20;
  }
  for (const [keyword, weight] of keywordWeights) {
    if (rel.includes(keyword)) score += weight;
  }
  if ([".md", ".mdx", ".txt"].includes(ext)) score += 8;
  if ([".pdf", ".docx", ".html"].includes(ext)) score += 5;
  if ([".json", ".yaml", ".yml"].includes(ext)) score += 2;
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"].includes(ext) && !/(prompt|agent|skill|workflow|tool|provider|model|pricing|cost|credit|security|mcp|connector|calculator|calculation|release|verify|test|route|page|api)/.test(rel)) {
    score -= 10;
  }
  return { score, reason: "scored" };
}

function classifyCategory(filePath) {
  const rel = normalizeText(path.relative(sourceRoot, filePath));
  if (/security|safety|permission|approval|secret|credential/.test(rel)) return "security";
  if (/pricing|price|cost|credit|margin|profit|billing|provider|model|api|openapi|integration/.test(rel)) return "providers";
  if (/architecture|clean-architecture|system-design|design-pattern|ddd|domain-driven/.test(rel)) return "architecture";
  if (/ui|ux|page|route|react|component|frontend|design/.test(rel)) return rel.includes("react") ? "react" : "uiux";
  if (/nextjs|next\.js|next-/.test(rel)) return "nextjs";
  if (/typescript|tsconfig|tsx|\.ts$/.test(rel)) return "typescript";
  if (/electron|desktop/.test(rel)) return "electron";
  if (/nodejs|node|npm|pnpm/.test(rel)) return "nodejs";
  if (/rag|retrieval|memory|knowledge|agent|prompt|llm|ai|claude|mcp|tool|skill/.test(rel)) return "ai";
  if (/database|sql|postgres|sqlite|supabase/.test(rel)) return "database";
  if (/saad|studio/.test(rel)) return "saad-studio";
  if (/workflow|maintenance|bug|fix|review|release|deploy|test|verification|git|programming|code/.test(rel)) return "programming";
  return "custom";
}

function extractConcepts(filePath) {
  const rel = normalizeText(path.relative(sourceRoot, filePath));
  const concepts = [];
  for (const [keyword] of keywordWeights) {
    if (rel.includes(keyword)) concepts.push(keyword);
  }
  const category = classifyCategory(filePath);
  concepts.push(category);
  return [...new Set(concepts)].slice(0, 12);
}

function hashContent(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function updatePack(category, docs, packName) {
  const dirs = KnowledgeManagerService.getDirs();
  fs.mkdirSync(dirs.packs, { recursive: true });
  const packPath = path.join(dirs.packs, `${category}.json`);
  let pack = {
    id: `pack_${category}`,
    name: packName,
    description: "Imported training references for Saad Agent.",
    category,
    documents: [],
    version: "1.0.0",
    importedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    storageSize: 0,
    chunks: 0,
    dictionaryTerms: 0,
    apiReferences: [],
    status: "ready",
  };
  try {
    if (fs.existsSync(packPath)) pack = { ...pack, ...JSON.parse(fs.readFileSync(packPath, "utf8")) };
  } catch {}
  if (!Array.isArray(pack.documents)) pack.documents = [];
  for (const doc of docs) {
    if (!pack.documents.includes(doc.id)) pack.documents.push(doc.id);
    pack.storageSize = (pack.storageSize || 0) + (doc.sizeBytes || 0);
    pack.chunks = (pack.chunks || 0) + doc.chunkCount;
    pack.dictionaryTerms = (pack.dictionaryTerms || 0) + doc.technicalTerms.length;
  }
  pack.name = packName;
  pack.pages = pack.documents.length;
  pack.lastUpdated = new Date().toISOString();
  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), "utf8");
  return packPath;
}

await KnowledgeManagerService.initialize();

const { files: allFiles, skipped: skippedDirs } = walk(sourceRoot);
const zipFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === ".zip");
const skipped = zipFiles.map((file) => ({ path: path.relative(sourceRoot, file), reason: "zip ignored because extracted folders exist" }));
skipped.push(...skippedDirs);

const candidates = [];
for (const file of allFiles) {
  const top = topDirOf(file);
  const stat = fs.statSync(file);
  if (duplicateTopDirs.has(top)) {
    skipped.push({ path: path.relative(sourceRoot, file), reason: "duplicated extracted folder" });
    continue;
  }
  const scored = scoreFile(file, stat);
  if (scored.score < 18) {
    skipped.push({ path: path.relative(sourceRoot, file), reason: scored.reason === "scored" ? "low training value" : scored.reason });
    continue;
  }
  let contentForSecretCheck = "";
  const ext = path.extname(file).toLowerCase();
  if (![".pdf", ".docx"].includes(ext) && stat.size <= 512 * 1024) {
    try {
      contentForSecretCheck = fs.readFileSync(file, "utf8").slice(0, 200000);
    } catch {}
  }
  if (isSecretLike(file, contentForSecretCheck)) {
    skipped.push({ path: path.relative(sourceRoot, file), reason: "secret-like path or content" });
    continue;
  }
  candidates.push({
    file,
    top,
    relative: path.relative(sourceRoot, file),
    score: scored.score,
    size: stat.size,
    category: classifyCategory(file),
    tags: extractConcepts(file),
  });
}

candidates.sort((a, b) => b.score - a.score || a.size - b.size);

const topCounts = new Map();
const seenHashes = new Set();
const selected = [];
const duplicateContent = [];
for (const candidate of candidates) {
  const topKey = candidate.top.toLowerCase();
  const quota = quotaByTop.get(topKey) || defaultTopQuota;
  const currentCount = topCounts.get(topKey) || 0;
  if (currentCount >= quota) {
    skipped.push({ path: candidate.relative, reason: `top-level quota reached: ${quota}` });
    continue;
  }
  let hash;
  try {
    hash = hashContent(candidate.file);
  } catch (error) {
    skipped.push({ path: candidate.relative, reason: `hash failed: ${error.message}` });
    continue;
  }
  if (seenHashes.has(hash)) {
    duplicateContent.push(candidate.relative);
    skipped.push({ path: candidate.relative, reason: "duplicate content hash" });
    continue;
  }
  seenHashes.add(hash);
  selected.push({ ...candidate, hash });
  topCounts.set(topKey, currentCount + 1);
  if (selected.length >= maxImports) break;
}

const imported = [];
const errors = [];
const docsByCategory = new Map();
for (const item of selected) {
  try {
    const doc = await KnowledgeManagerService.ingestDocument(item.file, item.category, [
      "external-training",
      item.top,
      ...item.tags,
    ]);
    doc.sizeBytes = item.size;
    imported.push({
      source: item.relative,
      category: item.category,
      docId: doc.id,
      title: doc.title,
      chunks: doc.chunkCount,
      terms: doc.technicalTerms,
      score: item.score,
    });
    if (!docsByCategory.has(item.category)) docsByCategory.set(item.category, []);
    docsByCategory.get(item.category).push(doc);
  } catch (error) {
    errors.push({ source: item.relative, error: error.message });
  }
}

const packUpdates = [];
for (const [category, docs] of docsByCategory.entries()) {
  const packPath = updatePack(category, docs, `Agent Training ${category}`);
  packUpdates.push({ category, packPath, addedDocuments: docs.length });
}

const concepts = new Map();
const workflowRegex = /(workflow|maintenance|release|deploy|verification|test|bug|fix|review|git|daily|page|provider|model|api|pricing|cost|credit|margin|profit|security|rag|memory|skill|prompt|mcp)/i;
for (const item of imported) {
  const source = item.source.toLowerCase();
  for (const [keyword] of keywordWeights) {
    if (source.includes(keyword)) concepts.set(keyword, (concepts.get(keyword) || 0) + 1);
  }
  if (workflowRegex.test(source)) {
    concepts.set("workflow-related", (concepts.get("workflow-related") || 0) + 1);
  }
}

const pricingRules = imported
  .filter((item) => /(pricing|price|cost|credit|margin|profit|billing|calculation|calculator|formula)/i.test(item.source))
  .slice(0, 80)
  .map((item) => item.source);

const workflows = imported
  .filter((item) => /(workflow|maintenance|release|deploy|verification|test|bug|fix|review|git|daily|page|provider|model|api)/i.test(item.source))
  .slice(0, 120)
  .map((item) => item.source);

const skills = imported
  .filter((item) => /(skill|prompt|agent|mcp|tool|connector)/i.test(item.source))
  .slice(0, 120)
  .map((item) => item.source);

const searchChecks = [
  { query: "provider cost calculation credit margin", category: "providers" },
  { query: "daily maintenance release verification workflow", category: "programming" },
  { query: "RAG memory retrieval knowledge pipeline", category: "ai" },
  { query: "security git safety approval secrets", category: "security" },
  { query: "clean architecture software design rules", category: "architecture" },
];

const verification = searchChecks.map((check) => {
  const results = KnowledgeManagerService.search(check.query, check.category).slice(0, 5);
  return {
    ...check,
    matches: results.length,
    titles: results.map((match) => match.item?.title || match.item?.fileName || match.item?.id).filter(Boolean),
  };
});

const topProcessed = [...new Set(imported.map((item) => item.source.split(/[\\/]/)[0]))];
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  vault: KnowledgeManagerService.getDirs(),
  foldersScanned: fs.readdirSync(sourceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  repositoriesProcessed: topProcessed,
  totalFilesSeen: allFiles.length,
  candidatesConsidered: candidates.length,
  selectedForImport: selected.length,
  importedCount: imported.length,
  errorCount: errors.length,
  zipFilesIgnored: zipFiles.map((file) => path.relative(sourceRoot, file)),
  duplicateTopDirsIgnored: [...duplicateTopDirs],
  duplicateContentIgnored: duplicateContent.slice(0, 250),
  importedFiles: imported,
  skippedSummary: Object.entries(
    skipped.reduce((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {})
  ).map(([reason, count]) => ({ reason, count })),
  skippedSamples: skipped.slice(0, 300),
  packsCreatedOrUpdated: packUpdates,
  conceptsExtracted: [...concepts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([concept, count]) => ({ concept, count })),
  skillsExtracted: skills,
  workflowsExtracted: workflows,
  pricingCalculationRulesExtracted: pricingRules,
  warnings: [
    "ZIP files were ignored when extracted folders were available.",
    "Large vendor/build/cache/generated files were skipped.",
    "Provider prices were not invented; only source files containing pricing/cost/credit calculation material were imported.",
    "External repositories were imported as reference knowledge only; current Saad Agent architecture remains the source of truth.",
  ],
  errors,
  verification,
};

const reportDir = path.join(projectRoot, "saad-agent", ".saad-agent", "import-reports");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `agent-training-import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify({
  reportPath,
  sourceRoot,
  importedCount: imported.length,
  selectedForImport: selected.length,
  errorCount: errors.length,
  packsCreatedOrUpdated: packUpdates,
  verification,
}, null, 2));

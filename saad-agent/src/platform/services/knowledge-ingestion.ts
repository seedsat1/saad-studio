import * as fs from "fs/promises";
import * as path from "path";
import { TokenManager } from "./token-manager.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { SemanticSearch } from "../../context/semantic-search.js";
import type { Attachment } from "./attachments.js";

export interface KnowledgeChunkRecord {
  id: string;
  sourcePath: string;
  sourceType: "file" | "vision" | "memory";
  title: string;
  content: string;
  hash: string;
  vector: Record<string, number>;
  tokensEstimate: number;
  updatedAt: string;
}

export interface KnowledgeVectorIndex {
  version: 1;
  workspacePath: string;
  generatedAt: string;
  chunks: KnowledgeChunkRecord[];
}

export type TrainingKnowledgeCategory =
  | "books"
  | "maps"
  | "diagrams"
  | "screenshots"
  | "api-docs"
  | "project-docs"
  | "ui-references"
  | "code-examples"
  | "lessons";

export interface TrainingKnowledgeRegistryItem {
  id: string;
  fileName: string;
  filePath: string;
  type: string;
  category: TrainingKnowledgeCategory;
  summary: string;
  tags: string[];
  addedDate: string;
  indexedStatus: "indexed" | "skipped" | "failed";
  chunkCount: number;
  embeddingStatus: "indexed" | "metadata-only" | "skipped" | "failed";
  lastUsedDate: string | null;
}

export interface TrainingKnowledgeRegistry {
  version: 1;
  generatedAt: string;
  items: TrainingKnowledgeRegistryItem[];
}

export interface TrainingKnowledgeMatch {
  item: TrainingKnowledgeRegistryItem;
  chunks: KnowledgeChunkRecord[];
}

export interface PreAnswerReviewResult {
  diagnostics: string;
  finalContext: string;
  knowledgeMatches: TrainingKnowledgeMatch[];
  skillsLoaded: string[];
  projectContextLoaded: boolean;
  noKnowledgeNotice: string | null;
}

export interface TrainingAttachmentImportResult {
  attachmentId: string;
  fileName: string;
  trainingPath: string;
  category: TrainingKnowledgeCategory;
  indexed: boolean;
}

export class KnowledgeIngestionService {
  private static readonly MAX_FILES = 350;
  private static readonly MAX_FILE_BYTES = 8 * 1024 * 1024;
  private static readonly MAX_CHUNKS = 5000;
  private static readonly CHUNK_TOKENS = 450;
  private static readonly VECTOR_DIMENSIONS = 256;
  private static readonly TRAINING_CATEGORIES: TrainingKnowledgeCategory[] = [
    "books",
    "maps",
    "diagrams",
    "screenshots",
    "api-docs",
    "project-docs",
    "ui-references",
    "code-examples",
    "lessons"
  ];

  static async search(workspacePath: string, query: string, limit = 6): Promise<KnowledgeChunkRecord[]> {
    const index = await this.loadOrBuildIndex(workspacePath);
    const queryVector = this.embed(query);
    return index.chunks
      .map((chunk) => ({ chunk, score: this.cosine(queryVector, chunk.vector) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.chunk);
  }

  static async ensureTrainingFolders(workspacePath: string): Promise<string[]> {
    const createdOrVerified: string[] = [];
    for (const category of this.TRAINING_CATEGORIES) {
      const folder = path.join(workspacePath, ".saad-agent", "training", category);
      await fs.mkdir(folder, { recursive: true });
      createdOrVerified.push(path.relative(workspacePath, folder).replace(/\\/g, "/"));
    }
    await fs.mkdir(path.join(workspacePath, ".saad-agent", "knowledge"), { recursive: true });
    return createdOrVerified;
  }

  static async ingestTrainingKnowledge(workspacePath: string): Promise<TrainingKnowledgeRegistry> {
    await this.ensureTrainingFolders(workspacePath);
    const trainingRoot = path.join(workspacePath, ".saad-agent", "training");
    const files = await SemanticSearch.listFilesRecursive(trainingRoot, this.MAX_FILES).catch(() => []);
    const previous = await this.loadRegistry(workspacePath);
    const previousByPath = new Map(previous.items.map((item) => [item.filePath, item]));
    const items: TrainingKnowledgeRegistryItem[] = [];
    const index = await this.loadOrBuildIndex(workspacePath);
    const trainingChunks = new Map<string, KnowledgeChunkRecord[]>();

    index.chunks = index.chunks.filter((chunk) => {
      const normalized = chunk.sourcePath.replace(/\\/g, "/");
      return !normalized.startsWith(".saad-agent/training/");
    });

    for (const filePath of files) {
      const rel = path.relative(workspacePath, filePath).replace(/\\/g, "/");
      const category = this.trainingCategoryFromPath(rel);
      if (!category) continue;
      if (SemanticSearch.isSensitiveFile(rel)) {
        await this.appendLog(workspacePath, "ingestion-log.json", {
          event: "training-file-skipped-sensitive",
          filePath: rel,
          timestamp: new Date().toISOString()
        });
        continue;
      }
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) continue;
      const extension = path.extname(filePath).toLowerCase().replace(".", "") || "unknown";
      if (stat.size > this.MAX_FILE_BYTES) {
        const previousItem = previousByPath.get(rel);
        items.push(this.registryItem(rel, category, extension, "File skipped because it exceeds the safe indexing size limit.", [], "skipped", 0, "skipped", previousItem?.lastUsedDate || null, previousItem?.addedDate));
        continue;
      }

      const extracted = await this.extractTrainingText(filePath, rel, category);
      const text = EngineeringMemory.scrubSecrets(extracted.text).trim();
      const summary = this.summarizeTrainingText(text, rel, category, extracted.metadataOnly);
      const chunks = text ? TokenManager.chunkText(text, this.CHUNK_TOKENS).filter((chunk) => chunk.trim()) : [];
      const tags = this.inferTags(rel, category, summary);
      const previousItem = previousByPath.get(rel);
      const registryItem = this.registryItem(
        rel,
        category,
        extension,
        summary,
        tags,
        "indexed",
        chunks.length,
        extracted.metadataOnly ? "metadata-only" : "indexed",
        previousItem?.lastUsedDate || null,
        previousItem?.addedDate
      );
      items.push(registryItem);
      const records = chunks.map((content, indexNumber) => {
        const trimmed = content.trim();
        return {
          id: this.chunkId(rel, indexNumber, trimmed),
          sourcePath: rel,
          sourceType: "file" as const,
          title: `${rel}#${indexNumber + 1}`,
          content: trimmed,
          hash: this.hash(trimmed),
          vector: this.embed(`${registryItem.fileName} ${registryItem.category} ${registryItem.tags.join(" ")} ${trimmed}`),
          tokensEstimate: TokenManager.estimateTokens(trimmed),
          updatedAt: new Date(stat.mtimeMs).toISOString()
        };
      });
      trainingChunks.set(rel, records);
      index.chunks.push(...records);
    }

    index.generatedAt = new Date().toISOString();
    index.chunks = index.chunks.slice(0, this.MAX_CHUNKS);
    await this.writeIndex(workspacePath, index);

    const registry: TrainingKnowledgeRegistry = {
      version: 1,
      generatedAt: new Date().toISOString(),
      items: items.sort((a, b) => a.filePath.localeCompare(b.filePath))
    };
    await this.writeRegistry(workspacePath, registry);
    await this.appendLog(workspacePath, "ingestion-log.json", {
      event: "training-ingestion-completed",
      timestamp: registry.generatedAt,
      filesIndexed: registry.items.filter((item) => item.indexedStatus === "indexed").length,
      chunksIndexed: Array.from(trainingChunks.values()).reduce((sum, records) => sum + records.length, 0)
    });
    return registry;
  }

  static async searchTrainingKnowledge(workspacePath: string, query: string, limit = 6): Promise<TrainingKnowledgeMatch[]> {
    const registry = await this.ingestTrainingKnowledge(workspacePath);
    const chunks = await this.search(workspacePath, query, Math.max(limit * 3, 12));
    const byPath = new Map(registry.items.map((item) => [item.filePath, item]));
    const matchesByPath = new Map<string, KnowledgeChunkRecord[]>();

    for (const chunk of chunks) {
      if (!chunk.sourcePath.replace(/\\/g, "/").startsWith(".saad-agent/training/")) continue;
      const list = matchesByPath.get(chunk.sourcePath) || [];
      list.push(chunk);
      matchesByPath.set(chunk.sourcePath, list);
    }

    if (matchesByPath.size < limit) {
      const queryTokens = this.queryTokens(query);
      const scoredItems = registry.items
        .map((item) => ({ item, score: this.registryScore(item, queryTokens) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
      for (const entry of scoredItems) {
        if (matchesByPath.size >= limit) break;
        if (!matchesByPath.has(entry.item.filePath)) {
          matchesByPath.set(entry.item.filePath, []);
        }
      }
    }

    const now = new Date().toISOString();
    const matches: TrainingKnowledgeMatch[] = [];
    for (const [filePath, matchedChunks] of matchesByPath) {
      const item = byPath.get(filePath);
      if (!item) continue;
      item.lastUsedDate = now;
      matches.push({ item, chunks: matchedChunks });
      if (matches.length >= limit) break;
    }

    if (matches.length > 0) {
      await this.writeRegistry(workspacePath, {
        ...registry,
        generatedAt: new Date().toISOString()
      });
    }
    await this.appendLog(workspacePath, "retrieval-log.json", {
      event: "training-knowledge-searched",
      timestamp: now,
      query: EngineeringMemory.scrubSecrets(query).slice(0, 500),
      matches: matches.map((match) => ({
        filePath: match.item.filePath,
        summary: match.item.summary,
        chunks: match.chunks.length
      }))
    });
    return matches;
  }

  static async importAttachmentsAsTraining(
    workspacePath: string,
    attachments: Attachment[],
    requestedCategory?: TrainingKnowledgeCategory
  ): Promise<TrainingAttachmentImportResult[]> {
    await this.ensureTrainingFolders(workspacePath);
    const imported: TrainingAttachmentImportResult[] = [];
    for (const rawAttachment of attachments) {
      const attachment = this.normalizeAttachment(rawAttachment);
      const sourcePath = attachment.localPath;
      if (!sourcePath || SemanticSearch.isSensitiveFile(sourcePath)) continue;
      const stat = await fs.stat(sourcePath).catch(() => null);
      if (!stat || !stat.isFile()) continue;
      const category = requestedCategory || this.trainingCategoryFromAttachment(attachment);
      const safeName = this.safeTrainingFileName(attachment.filename || path.basename(sourcePath));
      const destPath = await this.nextAvailableTrainingPath(workspacePath, category, safeName);
      await fs.copyFile(sourcePath, destPath);
      const rel = path.relative(workspacePath, destPath).replace(/\\/g, "/");
      imported.push({
        attachmentId: attachment.id,
        fileName: attachment.filename,
        trainingPath: rel,
        category,
        indexed: true
      });
      await this.appendLog(workspacePath, "ingestion-log.json", {
        event: "attachment-imported-to-training",
        timestamp: new Date().toISOString(),
        attachmentId: attachment.id,
        sourceFile: EngineeringMemory.scrubSecrets(attachment.filename),
        trainingPath: rel,
        category
      });
    }
    if (imported.length > 0) {
      await this.ingestTrainingKnowledge(workspacePath);
    }
    return imported;
  }

  static async upsertVisionSummary(workspacePath: string, localPath: string, summary: string): Promise<void> {
    const safeSummary = EngineeringMemory.scrubSecrets(summary).trim();
    if (!safeSummary) return;
    const index = await this.loadOrBuildIndex(workspacePath);
    const sourcePath = `vision:${path.basename(localPath)}`;
    const chunk: KnowledgeChunkRecord = {
      id: this.chunkId(sourcePath, 0, safeSummary),
      sourcePath,
      sourceType: "vision",
      title: `Vision Summary: ${path.basename(localPath)}`,
      content: safeSummary,
      hash: this.hash(safeSummary),
      vector: this.embed(safeSummary),
      tokensEstimate: TokenManager.estimateTokens(safeSummary),
      updatedAt: new Date().toISOString()
    };
    index.chunks = index.chunks.filter((item) => item.sourcePath !== sourcePath);
    index.chunks.unshift(chunk);
    index.generatedAt = new Date().toISOString();
    await this.writeIndex(workspacePath, index);
  }

  static async rebuildIndex(workspacePath: string): Promise<KnowledgeVectorIndex> {
    const chunks: KnowledgeChunkRecord[] = [];
    const roots = [
      path.join(workspacePath, "docs"),
      path.join(workspacePath, ".saad-agent", "knowledge"),
      path.join(workspacePath, ".saad-agent", "memory"),
      path.join(workspacePath, ".saad-agent", "training")
    ];

    for (const root of roots) {
      const files = await SemanticSearch.listFilesRecursive(root, this.MAX_FILES).catch(() => []);
      for (const filePath of files) {
        if (chunks.length >= this.MAX_CHUNKS) break;
        const rel = path.relative(workspacePath, filePath).replace(/\\/g, "/");
        if (!this.isIndexable(rel)) continue;
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat || stat.size > this.MAX_FILE_BYTES) continue;
        const raw = await fs.readFile(filePath, "utf8").catch(() => "");
        const text = EngineeringMemory.scrubSecrets(raw).trim();
        if (!text) continue;
        const textChunks = TokenManager.chunkText(text, this.CHUNK_TOKENS);
        textChunks.forEach((content, index) => {
          const trimmed = content.trim();
          if (!trimmed) return;
          chunks.push({
            id: this.chunkId(rel, index, trimmed),
            sourcePath: rel,
            sourceType: "file",
            title: `${rel}#${index + 1}`,
            content: trimmed,
            hash: this.hash(trimmed),
            vector: this.embed(trimmed),
            tokensEstimate: TokenManager.estimateTokens(trimmed),
            updatedAt: new Date(stat.mtimeMs).toISOString()
          });
        });
      }
    }

    const index: KnowledgeVectorIndex = {
      version: 1,
      workspacePath,
      generatedAt: new Date().toISOString(),
      chunks: chunks.slice(0, this.MAX_CHUNKS)
    };
    await this.writeIndex(workspacePath, index);
    return index;
  }

  private static async loadOrBuildIndex(workspacePath: string): Promise<KnowledgeVectorIndex> {
    const indexPath = this.indexPath(workspacePath);
    try {
      const raw = await fs.readFile(indexPath, "utf8");
      const parsed = JSON.parse(raw) as KnowledgeVectorIndex;
      if (parsed.version === 1 && Array.isArray(parsed.chunks)) {
        return parsed;
      }
    } catch {}
    return this.rebuildIndex(workspacePath);
  }

  private static async writeIndex(workspacePath: string, index: KnowledgeVectorIndex): Promise<void> {
    const indexPath = this.indexPath(workspacePath);
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  private static indexPath(workspacePath: string): string {
    return path.join(workspacePath, ".saad-agent", "knowledge", "vector-index.json");
  }

  private static isIndexable(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    if (SemanticSearch.isSensitiveFile(relPath)) return false;
    if (lower.includes("/node_modules/") || lower.includes("/.git/") || lower.includes("/dist/") || lower.includes("/build/")) return false;
    return /\.(md|txt|json|ts|tsx|js|jsx|css|html)$/i.test(relPath);
  }

  private static async loadRegistry(workspacePath: string): Promise<TrainingKnowledgeRegistry> {
    const registryPath = path.join(workspacePath, ".saad-agent", "knowledge", "registry.json");
    try {
      const raw = await fs.readFile(registryPath, "utf8");
      const parsed = JSON.parse(raw) as TrainingKnowledgeRegistry;
      if (parsed.version === 1 && Array.isArray(parsed.items)) return parsed;
    } catch {}
    return { version: 1, generatedAt: new Date().toISOString(), items: [] };
  }

  private static async writeRegistry(workspacePath: string, registry: TrainingKnowledgeRegistry): Promise<void> {
    const registryPath = path.join(workspacePath, ".saad-agent", "knowledge", "registry.json");
    await fs.mkdir(path.dirname(registryPath), { recursive: true });
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), "utf8");
  }

  private static registryItem(
    rel: string,
    category: TrainingKnowledgeCategory,
    extension: string,
    summary: string,
    tags: string[],
    indexedStatus: TrainingKnowledgeRegistryItem["indexedStatus"],
    chunkCount: number,
    embeddingStatus: TrainingKnowledgeRegistryItem["embeddingStatus"],
    lastUsedDate: string | null,
    addedDate?: string
  ): TrainingKnowledgeRegistryItem {
    return {
      id: `training:${this.hash(rel)}`,
      fileName: path.basename(rel),
      filePath: rel,
      type: extension,
      category,
      summary: EngineeringMemory.scrubSecrets(summary),
      tags,
      addedDate: addedDate || new Date().toISOString(),
      indexedStatus,
      chunkCount,
      embeddingStatus,
      lastUsedDate
    };
  }

  private static trainingCategoryFromPath(rel: string): TrainingKnowledgeCategory | null {
    const normalized = rel.replace(/\\/g, "/");
    const prefix = ".saad-agent/training/";
    if (!normalized.startsWith(prefix)) return null;
    const category = normalized.slice(prefix.length).split("/")[0] as TrainingKnowledgeCategory | undefined;
    return category && this.TRAINING_CATEGORIES.includes(category) ? category : null;
  }

  private static trainingCategoryFromAttachment(attachment: Attachment): TrainingKnowledgeCategory {
    const mime = (attachment.mimeType || "").toLowerCase();
    const ext = path.extname(attachment.filename || "").toLowerCase();
    if (mime.startsWith("image/")) return "screenshots";
    if (ext === ".pdf") return "project-docs";
    if ([".doc", ".docx", ".rtf"].includes(ext)) return "project-docs";
    if ([".json", ".yaml", ".yml"].includes(ext)) return "api-docs";
    if ([".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".html"].includes(ext)) return "code-examples";
    if ([".md", ".txt"].includes(ext)) return "lessons";
    return "project-docs";
  }

  private static normalizeAttachment(attachment: Attachment): Attachment {
    const anyAttachment = attachment as any;
    const localPath = String(anyAttachment.localPath || anyAttachment.path || anyAttachment.previewPath || "").trim();
    const fileName = String(
      anyAttachment.filename ||
      anyAttachment.name ||
      anyAttachment.originalFilename ||
      path.basename(localPath || "")
    ).trim();
    const safeFileName = this.safeTrainingFileName(fileName || `attachment-${Date.now()}.txt`);
    const mimeType = String(anyAttachment.mimeType || anyAttachment.type || this.inferMimeTypeFromFileName(safeFileName));
    return {
      id: String(anyAttachment.id || `att-${Date.now()}`),
      filename: safeFileName,
      mimeType,
      size: Number.isFinite(Number(anyAttachment.size)) ? Number(anyAttachment.size) : 0,
      localPath,
      previewPath: String(anyAttachment.previewPath || localPath),
      source: anyAttachment.source === "clipboard" || anyAttachment.source === "drag_drop" ? anyAttachment.source : "upload",
      timestamp: Number.isFinite(Number(anyAttachment.timestamp)) ? Number(anyAttachment.timestamp) : Date.now(),
      workspaceId: String(anyAttachment.workspaceId || "default-workspace")
    };
  }

  private static inferMimeTypeFromFileName(fileName: string): string {
    const ext = path.extname(fileName || "").toLowerCase();
    if (ext === ".md" || ext === ".markdown") return "text/markdown";
    if (ext === ".txt") return "text/plain";
    if (ext === ".json") return "application/json";
    if (ext === ".yaml" || ext === ".yml") return "application/yaml";
    if (ext === ".html") return "text/html";
    if (ext === ".css") return "text/css";
    if (ext === ".js" || ext === ".jsx") return "text/javascript";
    if (ext === ".ts" || ext === ".tsx") return "text/typescript";
    if (ext === ".pdf") return "application/pdf";
    return "application/octet-stream";
  }

  private static safeTrainingFileName(fileName: string): string {
    const base = path.basename(fileName).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
    return base || `attachment-${Date.now()}.bin`;
  }

  private static async nextAvailableTrainingPath(workspacePath: string, category: TrainingKnowledgeCategory, fileName: string): Promise<string> {
    const folder = path.join(workspacePath, ".saad-agent", "training", category);
    await fs.mkdir(folder, { recursive: true });
    const parsed = path.parse(fileName);
    let candidate = path.join(folder, fileName);
    let counter = 1;
    while (await fs.stat(candidate).then(() => true).catch(() => false)) {
      candidate = path.join(folder, `${parsed.name}-${counter}${parsed.ext}`);
      counter += 1;
    }
    return candidate;
  }

  private static async extractTrainingText(filePath: string, rel: string, category: TrainingKnowledgeCategory): Promise<{ text: string; metadataOnly: boolean }> {
    const extension = path.extname(filePath).toLowerCase();
    if (/\.(md|txt|json|ts|tsx|js|jsx|css|html)$/i.test(extension)) {
      const raw = await fs.readFile(filePath, "utf8").catch(() => "");
      return { text: raw, metadataOnly: false };
    }
    if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(extension)) {
      return {
        text: `Visual training item in ${category}: ${path.basename(rel)}. Use the vision pipeline to inspect this screenshot, diagram, or map when it matches the task.`,
        metadataOnly: true
      };
    }
    if (extension === ".pdf") {
      return {
        text: `PDF training item in ${category}: ${path.basename(rel)}. Text extraction requires a PDF extractor; metadata is indexed until readable text is available.`,
        metadataOnly: true
      };
    }
    return {
      text: `Training item in ${category}: ${path.basename(rel)}.`,
      metadataOnly: true
    };
  }

  private static summarizeTrainingText(text: string, rel: string, category: TrainingKnowledgeCategory, metadataOnly: boolean): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return `Empty training item in ${category}: ${path.basename(rel)}.`;
    const clipped = normalized.slice(0, 260);
    return metadataOnly ? clipped : clipped + (normalized.length > clipped.length ? "..." : "");
  }

  private static inferTags(rel: string, category: TrainingKnowledgeCategory, summary: string): string[] {
    const words = `${rel} ${category} ${summary}`
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.looksSecret(word));
    return Array.from(new Set([category, ...words])).slice(0, 14);
  }

  private static queryTokens(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !this.looksSecret(token));
  }

  private static registryScore(item: TrainingKnowledgeRegistryItem, queryTokens: string[]): number {
    const haystack = `${item.fileName} ${item.filePath} ${item.category} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
    return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
  }

  private static async appendLog(workspacePath: string, fileName: string, entry: Record<string, unknown>): Promise<void> {
    const logPath = path.join(workspacePath, ".saad-agent", "knowledge", fileName);
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    let list: unknown[] = [];
    try {
      const raw = await fs.readFile(logPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
    list.push(entry);
    await fs.writeFile(logPath, JSON.stringify(list.slice(-200), null, 2), "utf8");
  }

  private static embed(text: string): Record<string, number> {
    const vector: Record<string, number> = {};
    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_./-]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.looksSecret(word));
    for (const word of words) {
      const bucket = String(this.hashNumber(word) % this.VECTOR_DIMENSIONS);
      vector[bucket] = (vector[bucket] || 0) + 1;
    }
    return vector;
  }

  private static cosine(a: Record<string, number>, b: Record<string, number>): number {
    let dot = 0;
    let aNorm = 0;
    let bNorm = 0;
    for (const value of Object.values(a)) aNorm += value * value;
    for (const [key, value] of Object.entries(b)) {
      bNorm += value * value;
      dot += (a[key] || 0) * value;
    }
    if (!aNorm || !bNorm) return 0;
    return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
  }

  private static chunkId(sourcePath: string, index: number, content: string): string {
    return `knowledge:${this.hash(`${sourcePath}:${index}:${content.slice(0, 120)}`)}`;
  }

  private static hash(text: string): string {
    return this.hashNumber(text).toString(16);
  }

  private static hashNumber(text: string): number {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private static looksSecret(value: string): boolean {
    if (/(api[_-]?key|token|secret|password|credential|cookie)/i.test(value)) return true;
    return /^[a-z0-9_\-]{32,}$/i.test(value);
  }
}

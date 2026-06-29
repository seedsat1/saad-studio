import * as fs from "fs/promises";
import * as path from "path";
import { TokenManager } from "./token-manager.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { SemanticSearch } from "../../context/semantic-search.js";

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

export class KnowledgeIngestionService {
  private static readonly MAX_FILES = 350;
  private static readonly MAX_FILE_BYTES = 512 * 1024;
  private static readonly MAX_CHUNKS = 900;
  private static readonly CHUNK_TOKENS = 450;
  private static readonly VECTOR_DIMENSIONS = 256;

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
      path.join(workspacePath, ".saad-agent", "memory")
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

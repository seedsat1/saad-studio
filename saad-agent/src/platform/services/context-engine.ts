import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { TokenManager } from "./token-manager.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { EventBus } from "./event-bus.js";
import type { ContextItem } from "./context-manager.js";
import { SemanticSearch } from "../../context/semantic-search.js";
import { RankingEngine } from "../../context/ranking-engine.js";
import { TokenOptimizer } from "../../context/token-optimizer.js";
import { RetrievalEngine } from "../../context/retrieval-engine.js";
import { SkillRegistry } from "../../skills/skill-registry.js";
import type { ContextRetrievalResult, RankedContextCandidate } from "../../context/context-types.js";
import { KnowledgeIngestionService } from "./knowledge-ingestion.js";

export class ContextEngine {
  private static recentModifications: string[] = [];
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) return;
    EventBus.subscribe("WorkspaceChanged", (data: any) => {
      if (data && Array.isArray(data.modified)) {
        this.recentModifications.push(...data.modified);
        if (this.recentModifications.length > 50) {
          this.recentModifications = this.recentModifications.slice(-50);
        }
      }
    });
    this.isInitialized = true;
  }

  static getRecentModifications(): string[] {
    return [...this.recentModifications];
  }

  static addRecentModification(filePath: string): void {
    this.recentModifications.push(filePath);
    if (this.recentModifications.length > 50) {
      this.recentModifications = this.recentModifications.slice(-50);
    }
  }

  static isSensitiveFile(filePath: string): boolean {
    return SemanticSearch.isSensitiveFile(filePath);
  }

  static async retrieveContext(
    query: string,
    workspacePath: string,
    tokenLimit?: number
  ): Promise<ContextRetrievalResult> {
    this.initialize();
    const limit = tokenLimit || CONFIG.MAX_CONTEXT_TOKENS || 8192;
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\W+/).filter(t => t.length > 3);

    const candidates: RankedContextCandidate[] = [];
    const workspaceStats = {
      candidateFiles: 0,
      skippedSensitiveFiles: 0,
      attachmentMetadataFiles: 0,
      recentModifications: this.recentModifications.length
    };
    const semanticIndexSummary = {
      files: 0,
      classes: 0,
      functions: 0,
      symbols: 0,
      dependencies: 0,
      keywords: new Set(queryTokens).size,
      engineeringTopics: 0,
      architectureComponents: 0
    };

    // 1. Load Architecture.json
    let architecture: any = null;
    try {
      const archContent = await fs.readFile(
        path.join(workspacePath, ".saad-agent", "knowledge", "architecture.json"),
        "utf8"
      );
      architecture = JSON.parse(archContent);
      const contentStr = JSON.stringify(architecture);
      candidates.push({
        item: {
          id: "architecture-ref",
          source: "memory",
          title: "Project Architecture Reference",
          content: contentStr,
          tokensEstimate: TokenManager.estimateTokens(contentStr)
        },
        score: queryTokens.some(t => contentStr.toLowerCase().includes(t)) ? 60 : 20,
        kind: "architecture",
        reasons: ["architecture preservation", "workspace scope"]
      });
      semanticIndexSummary.architectureComponents = SemanticSearch.countArchitectureComponents(architecture);
    } catch {}

    // 2. Load Dependency-graph.json
    let dependencyGraph: any = null;
    try {
      const depContent = await fs.readFile(
        path.join(workspacePath, ".saad-agent", "knowledge", "dependency-graph.json"),
        "utf8"
      );
      dependencyGraph = JSON.parse(depContent);
      const contentStr = JSON.stringify(dependencyGraph);
      candidates.push({
        item: {
          id: "dependency-ref",
          source: "memory",
          title: "Project Dependencies Graph",
          content: contentStr,
          tokensEstimate: TokenManager.estimateTokens(contentStr)
        },
        score: queryTokens.some(t => contentStr.toLowerCase().includes(t)) ? 50 : 15,
        kind: "dependency",
        reasons: ["dependency relationships"]
      });
      semanticIndexSummary.dependencies = SemanticSearch.countDependencyEntries(dependencyGraph);
    } catch {}

    // 3. Load Project-summary.json
    try {
      const sumContent = await fs.readFile(
        path.join(workspacePath, ".saad-agent", "knowledge", "project-summary.json"),
        "utf8"
      );
      const summary = JSON.parse(sumContent);
      const contentStr = JSON.stringify(summary);
      candidates.push({
        item: {
          id: "project-summary-ref",
          source: "memory",
          title: "Project Configuration Summary",
          content: contentStr,
          tokensEstimate: TokenManager.estimateTokens(contentStr)
        },
        score: 30,
        kind: "summary",
        reasons: ["workspace statistics", "project summary"]
      });
    } catch {}

    // 3b. Retrieve Active Skill Rules matching query
    try {
      const activeSkillMatches = SkillRegistry.matchSkillsForTask(query);
      for (const match of activeSkillMatches) {
        const skillRulesContent = `[Skill Guidance: ${match.skill.name}] Domain: ${match.skill.domain}. Rules:\n${match.skill.promptTemplates.systemRules.join("\n")}`;
        candidates.push({
          item: {
            id: `skill-ref:${match.skill.id}`,
            source: "memory",
            title: match.skill.name,
            content: skillRulesContent,
            tokensEstimate: TokenManager.estimateTokens(skillRulesContent)
          },
          score: 45 + Math.floor(match.confidence / 2),
          kind: "summary",
          reasons: [match.activationReason]
        });
      }
    } catch {}

    // 3c. Retrieve persistent local knowledge chunks from the lightweight vector index.
    try {
      const knowledgeChunks = await KnowledgeIngestionService.search(workspacePath, query, 6);
      for (const chunk of knowledgeChunks) {
        candidates.push({
          item: {
            id: chunk.id,
            source: "memory",
            title: chunk.title,
            content: `[Knowledge Source: ${chunk.sourcePath}]\n${chunk.content}`,
            tokensEstimate: chunk.tokensEstimate
          },
          score: 55,
          kind: "knowledge",
          reasons: ["semantic vector similarity", "knowledge index"]
        });
        semanticIndexSummary.engineeringTopics += 1;
      }
    } catch {}

    // 4. Retrieve Engineering Memories matching keywords
    try {
      const memoryItems = await EngineeringMemory.retrieveRelevantContext(query);
      for (const m of memoryItems) {
        let score = 40;
        const overlap = queryTokens.filter(t => m.content.toLowerCase().includes(t)).length;
        score += overlap * 15;
        const kind = RetrievalEngine.kindFromMemoryId(m.id);
        candidates.push({
          item: m,
          score,
          kind,
          reasons: ["engineering memory", overlap > 0 ? "semantic similarity" : "task history"]
        });
        semanticIndexSummary.engineeringTopics += 1;
      }
    } catch {}

    // 5. Retrieve Attachment Metadata
    try {
      const attachmentsDir = path.join(workspacePath, ".saad-agent", "attachments");
      const files = await SemanticSearch.listFilesRecursive(attachmentsDir, 100);
      workspaceStats.attachmentMetadataFiles = files.length;
      for (const filePath of files) {
        const file = path.relative(attachmentsDir, filePath).replace(/\\/g, "/");
        if (!this.isSensitiveFile(file) && queryTokens.some(t => file.toLowerCase().includes(t))) {
          const stat = await fs.stat(filePath);
          const content = `[Attachment Metadata] Filename: ${file}, Size: ${stat.size} bytes. Source: local storage.`;
          candidates.push({
            item: {
              id: `attachment-metadata:${file}`,
              source: "attachment",
              title: file,
              content,
              tokensEstimate: TokenManager.estimateTokens(content)
            },
            score: 75,
            kind: "attachment",
            reasons: ["attachment retrieval", "filename similarity"]
          });
        }
      }
    } catch {}

    // 6. Source Files Retrieval
    const potentialFiles = new Set<string>();
    
    // Check files matching names in architecture
    if (architecture) {
      const findInTree = (node: any) => {
        if (node.path) {
          const matchedToken = queryTokens.find(t => node.path.toLowerCase().includes(t));
          if (matchedToken) {
            potentialFiles.add(node.path);
          }
        }
        if (node.children) {
          for (const child of node.children) {
            findInTree(child);
          }
        }
      };
      findInTree(architecture);
    }

    // Direct folder scan fallback
    try {
      const entries = await fs.readdir(workspacePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const nameLower = entry.name.toLowerCase();
          if (queryTokens.some(t => nameLower.includes(t))) {
            potentialFiles.add(entry.name);
          }
        }
      }
    } catch {}

    // Read and score matched files
    for (const fileRel of potentialFiles) {
      workspaceStats.candidateFiles += 1;
      if (this.isSensitiveFile(fileRel)) {
        workspaceStats.skippedSensitiveFiles += 1;
        continue;
      }
      const absPath = path.isAbsolute(fileRel) ? fileRel : path.join(workspacePath, fileRel);
      try {
        const content = await fs.readFile(absPath, "utf8");
        const scrubbedContent = EngineeringMemory.scrubSecrets(content);
        const symbols = SemanticSearch.extractSymbols(scrubbedContent);
        semanticIndexSummary.files += 1;
        semanticIndexSummary.classes += symbols.classes.length;
        semanticIndexSummary.functions += symbols.functions.length;
        semanticIndexSummary.symbols += symbols.symbols.length;
        const item: ContextItem = {
          id: `file:${fileRel}`,
          source: "file",
          title: fileRel,
          content: `${scrubbedContent}\n\n[Semantic Index] classes=${symbols.classes.join(", ")} functions=${symbols.functions.join(", ")} symbols=${symbols.symbols.slice(0, 20).join(", ")}`,
          tokensEstimate: TokenManager.estimateTokens(scrubbedContent)
        };

        const scored = RankingEngine.calculateRelevanceScore(
          item,
          query,
          queryTokens,
          this.recentModifications,
          dependencyGraph,
          architecture
        );

        candidates.push({ item, score: scored.score, kind: "file", reasons: scored.reasons });
      } catch {}
    }

    // 7. Sort candidates by Relevance Score
    candidates.sort((a, b) => b.score - a.score);

    // 8. Token Budget Optimization
    const optimized = TokenOptimizer.optimize(candidates, limit);

    const compressionSummary = `Retrieved ${candidates.length} items, included ${optimized.selectedItems.length} inside token budget (${optimized.accumulatedTokens}/${limit} tokens). Trimmed ${optimized.trimmedCount} low-priority matches. Preserved architecture, engineering memory, failure/success history, and attachment metadata when budget allowed.`;

    return {
      items: optimized.selectedItems,
      tokenUsage: optimized.accumulatedTokens,
      limit,
      compressionSummary,
      categories: RetrievalEngine.buildCategories(optimized.selectedCandidates),
      workspaceStats,
      rankingSummary: optimized.selectedCandidates.slice(0, 8).map(
        (cand) => `${cand.item.title}: score ${cand.score} via ${cand.reasons.join(", ")}`
      ),
      semanticIndexSummary
    };
  }

}

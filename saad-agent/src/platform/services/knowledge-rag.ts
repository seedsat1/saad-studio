import { ContextEngine } from "./context-engine.js";
import { DecisionMemoryService } from "./decision-memory.js";

export interface KnowledgeSnippet {
  sourceType: "documentation" | "api_docs" | "project_docs" | "previous_fix" | "adr";
  title: string;
  content: string;
  score: number;
}

export class KnowledgeRAGService {
  /**
   * Complete decoupled Knowledge RAG Pipeline: Index -> Retriever -> Ranker -> Context Builder
   */
  static async executeRAGPipeline(
    prompt: string,
    workspacePath: string,
    maxTokens = 2000
  ): Promise<{ contextText: string; snippets: KnowledgeSnippet[] }> {
    // 1. Retriever: Retrieve workspace context & ADRs
    const rawContext = await ContextEngine.retrieveContext(prompt, workspacePath, maxTokens);
    const adrs = await DecisionMemoryService.getDecisions();

    const snippets: KnowledgeSnippet[] = [];

    // Map ADRs
    for (const adr of adrs) {
      if (adr.status === "accepted") {
        snippets.push({
          sourceType: "adr",
          title: `ADR: ${adr.title}`,
          content: `${adr.decision} (Rationale: ${adr.rationale || "N/A"})`,
          score: prompt.toLowerCase().includes(adr.title.toLowerCase()) ? 0.95 : 0.7,
        });
      }
    }

    // Map workspace RAG items
    for (const item of rawContext.items) {
      snippets.push({
        sourceType: item.title.includes("api") ? "api_docs" : item.title.includes("doc") ? "documentation" : "project_docs",
        title: item.title,
        content: item.content,
        score: 0.8,
      });
    }

    // 2. Ranker: Sort by relevance score
    snippets.sort((a, b) => b.score - a.score);

    // 3. Context Builder: Assemble top snippets
    const topSnippets = snippets.slice(0, 8);
    const contextText = topSnippets.map((s) => `[${s.sourceType.toUpperCase()}] ${s.title}\n${s.content}`).join("\n\n");

    return { contextText, snippets: topSnippets };
  }
}

import * as path from "path";
import type { ContextItem } from "../platform/services/context-manager.js";

export class RankingEngine {
  static calculateRelevanceScore(
    item: ContextItem,
    query: string,
    queryTokens: string[],
    recentModifications: string[],
    dependencyGraph: any,
    _architecture: any
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();
    const queryLower = query.toLowerCase();

    for (const token of queryTokens) {
      if (titleLower.includes(token)) {
        score += 50;
        reasons.push("filename similarity");
      }
    }
    if (titleLower === queryLower) {
      score += 100;
      reasons.push("exact title match");
    }

    const symbols = query.match(/[A-Z_a-z][A-Za-z0-9_]+/g) || [];
    for (const sym of symbols) {
      if (sym.length > 3) {
        const regex = new RegExp(`\\b${sym}\\b`, "g");
        const matches = item.content.match(regex);
        if (matches && matches.length > 0) {
          score += Math.min(matches.length * 15, 60);
          reasons.push("symbol similarity");
        }
      }
    }

    if (item.source === "file" && dependencyGraph?.modules) {
      for (const [mod, deps] of Object.entries(dependencyGraph.modules)) {
        const modName = path.basename(mod);
        const isModInQuery = queryTokens.some(t => modName.toLowerCase().includes(t));
        const hasDepInQuery = (deps as string[]).some(d => {
          const depName = path.basename(d);
          return queryTokens.some(t => depName.toLowerCase().includes(t));
        });
        if (isModInQuery || hasDepInQuery) {
          score += 25;
          reasons.push("dependency relationship");
        }
      }
    }

    if (item.id.startsWith("memory:decision:") || item.source === "memory") {
      score += 30;
      reasons.push("engineering decisions/task history");
    }

    if (item.source === "file") {
      const filename = path.basename(item.title);
      if (recentModifications.some(m => m.toLowerCase().includes(filename.toLowerCase()))) {
        score += 35;
        reasons.push("recent modification");
      }
    }

    const stopwords = new Set(["the", "and", "a", "of", "to", "in", "is", "that", "it", "on", "for", "with", "as", "at", "by", "an", "this", "be"]);
    const contentWords = contentLower.split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
    const uniqueContentWords = new Set(contentWords);
    let overlapCount = 0;
    for (const qWord of queryTokens) {
      if (!stopwords.has(qWord) && uniqueContentWords.has(qWord)) {
        overlapCount++;
      }
    }
    score += overlapCount * 10;
    if (overlapCount > 0) {
      reasons.push("semantic similarity");
    }

    if (item.source === "attachment") {
      score += 15;
      reasons.push("workspace attachment scope");
    }

    return { score, reasons: [...new Set(reasons)] };
  }
}

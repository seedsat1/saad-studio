import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface SpellReviewIssue {
  file: string;
  identifierText: string;
  suggestedFix: string;
  reason: string;
  severity: "warning" | "error";
}

export interface SpellReviewReport {
  passed: boolean;
  issues: SpellReviewIssue[];
}

export class SmartSpellReviewService {
  private static validWords = new Set<string>([
    "manager", "receive", "intelligence", "environment", "government", "success", "failure", 
    "processor", "respond", "necessary", "apparent", "argument", "commit", "depend", 
    "existence", "independent", "liaison", "millennium", "perceive", "publicly", "relieve", 
    "threshold", "unforeseen", "separate", "occurred", "written", "referring", "until", 
    "transferred", "address", "connection", "coming", "definitely", "variable", "function", 
    "component", "provider", "model", "route", "api", "message", "comment", "settings", 
    "backup", "restore", "orchestrator", "credits", "gallery", "workspace", "application", 
    "integration", "validation", "pipeline", "standard", "interactive", "creative", "startup", 
    "diagnostics", "performance", "monitor", "standards", "session", "connector", "attachment", 
    "vision", "health", "system", "recovery", "history", "execution", "builder", "prompt", 
    "health", "monitor", "database", "client", "server", "request", "response", "casing", 
    "dialect", "iraqi", "dictionary", "dictionaries", "spell", "cancellation", "abort",
    "signal", "controller", "parallel", "handler", "pre", "post", "review",
    "main", "preload", "index", "config", "types", "utility", "helper", "helpers",
    "name", "naming", "spelling", "spellcheck", "spellchecker", "check", "checker",
    "incorrect", "inconsistent", "duplicated", "abbreviation", "abbreviations",
    "error", "warning", "info", "severity", "passed", "failed", "report", "issues",
    "app"
  ]);

  private static commonTypos: Record<string, string> = {
    "manger": "manager",
    "recive": "receive",
    "inteligence": "intelligence",
    "adress": "address",
    "conection": "connection",
    "comming": "coming",
    "definately": "definitely",
    "seperate": "separate",
    "occured": "occurred",
    "writen": "written",
    "refering": "referring",
    "untill": "until",
    "transfered": "transferred",
    "sucess": "success",
    "failur": "failure",
    "processer": "processor",
    "reapond": "respond",
    "enviroment": "environment",
    "goverment": "government",
    "neccessary": "necessary",
    "apparant": "apparent",
    "arguement": "argument",
    "colleague": "colleague",
    "committ": "commit",
    "depand": "depend",
    "existance": "existence",
    "independant": "independent",
    "liason": "liaison",
    "millenium": "millennium",
    "percieve": "perceive",
    "publically": "publicly",
    "relieve": "relieve",
    "threshhold": "threshold",
    "unforseen": "unforeseen",
    "recieve": "receive",
    "providermanger": "providerManager",
    "reciveimage": "receiveImage",
    "inteligenceengine": "intelligenceEngine"
  };

  private static keywords = new Set<string>([
    "const", "let", "var", "function", "class", "interface", "import", "export", "return", 
    "default", "from", "as", "true", "false", "null", "undefined", "void", "async", "await", 
    "try", "catch", "finally", "throw", "if", "else", "switch", "case", "break", "continue", 
    "for", "while", "do", "new", "this", "super", "extends", "implements", "typeof", "instanceof", 
    "package", "private", "protected", "public", "static", "readonly", "any", "string", "number", 
    "boolean", "unknown", "never", "keyof", "type", "console", "log", "warn", "error"
  ]);

  private static levenshtein(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
    for (let i = 0; i <= b.length; i++) {
      const row = matrix[i];
      if (row) row[0] = i;
    }
    const firstRow = matrix[0];
    if (firstRow) {
      for (let j = 0; j <= a.length; j++) firstRow[j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const matrixRow = matrix[i];
        const prevRow = matrix[i - 1];
        if (!matrixRow || !prevRow) continue;
        
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrixRow[j] = prevRow[j - 1] ?? 0;
        } else {
          matrixRow[j] = Math.min(
            (prevRow[j - 1] ?? 0) + 1,
            (matrixRow[j - 1] ?? 0) + 1,
            (prevRow[j] ?? 0) + 1
          );
        }
      }
    }
    const lastRow = matrix[b.length];
    return lastRow ? (lastRow[a.length] ?? 0) : 0;
  }

  private static loadProjectDictionary(): Set<string> {
    const allowed = new Set<string>();
    let loaded = false;
    try {
      let dictPath = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "dictionaries", "project-terms.json");
      if (!fs.existsSync(dictPath)) {
        dictPath = path.join(CONFIG.PROJECT_ROOT, "saad-agent", ".saad-agent", "dictionaries", "project-terms.json");
      }
      if (fs.existsSync(dictPath)) {
        const content = fs.readFileSync(dictPath, "utf8");
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          for (const word of list) {
            allowed.add(word.toLowerCase());
          }
          loaded = true;
        }
      }
    } catch (e) {
      console.warn("Failed to load project dictionary:", e);
    }

    if (!loaded) {
      // Fallback allowed terms
      const fallbackList = [
        "saad", "saadstudio", "saadagent", "qwen", "byteplus", "modelark", "seedance", 
        "seedream", "kie", "wavespeed", "flux", "veo", "nanobanana", "supabase", "backblaze", 
        "orchestrator", "rag", "adrs", "credits", "gallery", "provider", "workspace", "app"
      ];
      for (const word of fallbackList) {
        allowed.add(word);
      }
    }
    return allowed;
  }

  private static splitIdentifier(ident: string): string[] {
    return ident
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      .split(/[_-]/)
      .map(w => w.toLowerCase())
      .filter(w => w.length > 0);
  }

  static reviewContent(content: string, filePath: string): SpellReviewReport {
    const issues: SpellReviewIssue[] = [];
    const projectDict = this.loadProjectDictionary();

    // 1. Extract and analyze comments
    const commentRegex = /\/\/.*$|\/\*[\s\S]*?\*\//gm;
    let match;
    while ((match = commentRegex.exec(content)) !== null) {
      const commentText = match[0] || "";
      this.checkTextSpelling(commentText, "Comment", filePath, issues, projectDict);
    }

    // 2. Extract and analyze string literals
    const stringRegex = /"(.*?)"|'(.*?)'|`(.*?)`/g;
    while ((match = stringRegex.exec(content)) !== null) {
      const stringText = match[1] || match[2] || match[3] || "";
      if (!stringText) continue;

      // Check for route names wrong casing
      if (stringText.startsWith("/") && stringText.length > 1) {
        if (/[A-Z_]/.test(stringText) && !stringText.includes("${")) {
          issues.push({
            file: filePath,
            identifierText: stringText,
            suggestedFix: stringText.toLowerCase().replace(/_/g, "-"),
            reason: "Route names should be lowercase and kebab-case.",
            severity: "warning"
          });
        }
      }

      // Check UI messages and documentation text for grammatical mistakes and spelling
      this.checkTextSpelling(stringText, "String Literal", filePath, issues, projectDict);
    }

    // 3. Extract and analyze identifiers
    const identifierRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
    const originalCasings = new Map<string, { original: string; line: number }[]>();
    
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i] || "";
      let idMatch;
      while ((idMatch = identifierRegex.exec(lineText)) !== null) {
        const ident = idMatch[0];
        if (!ident || ident.length < 3 || this.keywords.has(ident)) continue;

        // Skip built-in global identifiers
        if (/^(Map|Set|Array|Object|String|Number|Boolean|Error|Promise|AbortController|fetch|Headers|Response|URL|console|process|fs|path|require|import)$/.test(ident)) {
          continue;
        }

        // Track casing for inconsistent naming detection
        const snakeCaseRepresentation = this.splitIdentifier(ident).join("_");
        const list = originalCasings.get(snakeCaseRepresentation) || [];
        if (!list.some(item => item.original === ident)) {
          list.push({ original: ident, line: i + 1 });
          originalCasings.set(snakeCaseRepresentation, list);
        }

        // Check casing issues
        this.checkCasing(ident, lineText, filePath, issues);

        // Check if the whole identifier is in dictionaries
        const lowerIdent = ident.toLowerCase();
        if (this.validWords.has(lowerIdent) || projectDict.has(lowerIdent)) continue;

        // Spellcheck split tokens of identifier
        const tokens = this.splitIdentifier(ident);
        for (const token of tokens) {
          if (token.length < 3) continue;
          if (this.validWords.has(token) || projectDict.has(token)) continue;

          // Check if token matches common typo
          if (this.commonTypos[token]) {
            const typoFix = this.commonTypos[token] || "";
            const suggestedFix = ident.replace(new RegExp(token, "i"), (m) => {
              if (m && m.charAt(0) === m.charAt(0).toUpperCase()) {
                return typoFix.charAt(0).toUpperCase() + typoFix.slice(1);
              }
              return typoFix;
            });
            issues.push({
              file: filePath,
              identifierText: ident,
              suggestedFix,
              reason: `Misspelled token "${token}" found in identifier.`,
              severity: "warning"
            });
          } else {
            // Levenshtein similarity check against valid words and project dictionary
            let bestMatch = "";
            let minDistance = 3; // Max threshold
            for (const dictWord of [...this.validWords, ...projectDict]) {
              const d = this.levenshtein(token, dictWord);
              if (d < minDistance) {
                minDistance = d;
                bestMatch = dictWord;
              }
            }

            if (bestMatch && minDistance <= 2) {
              const suggestedFix = ident.replace(new RegExp(token, "i"), (m) => {
                if (m && m.charAt(0) === m.charAt(0).toUpperCase()) {
                  return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
                }
                return bestMatch;
              });
              issues.push({
                file: filePath,
                identifierText: ident,
                suggestedFix,
                reason: `Confusing typo-like identifier token "${token}". Did you mean "${bestMatch}"?`,
                severity: "warning"
              });
            }
          }
        }
      }
    }

    // Check for inconsistent casings in the same file (duplicated confusing names)
    for (const list of originalCasings.values()) {
      if (list.length > 1) {
        const first = list[0];
        if (!first) continue;
        const originals = list.map(item => `"${item.original}" (line ${item.line})`).join(" and ");
        issues.push({
          file: filePath,
          identifierText: first.original,
          suggestedFix: first.original,
          reason: `Duplicated confusing casing variants found in the same file: ${originals}. Use consistent naming.`,
          severity: "warning"
        });
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  private static checkCasing(ident: string, lineContent: string, filePath: string, issues: SpellReviewIssue[]) {
    // React component names must be PascalCase (starts with upper letter)
    const isComponent = /class\s+([a-zA-Z0-9_$]+)\s+extends\s+(?:React\.Component|Component)/.exec(lineContent)
      || /const\s+([a-zA-Z0-9_$]+)\s*:\s*(?:React\.)?FC/.exec(lineContent)
      || /function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(/.exec(lineContent);
      
    if (isComponent && isComponent[1] === ident) {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(ident)) {
        issues.push({
          file: filePath,
          identifierText: ident,
          suggestedFix: ident.charAt(0).toUpperCase() + ident.slice(1),
          reason: "Component names should be in PascalCase.",
          severity: "warning"
        });
      }
    }

    // Constants must be UPPER_SNAKE_CASE
    if (/^[a-z]+[A-Z0-9_]*$/.test(ident) && ident.toUpperCase() === ident) {
      if (!/^[A-Z0-9_]+$/.test(ident)) {
        issues.push({
          file: filePath,
          identifierText: ident,
          suggestedFix: ident.replace(/[^A-Z0-9]/gi, "_").toUpperCase(),
          reason: "Constants should be in UPPER_SNAKE_CASE.",
          severity: "warning"
        });
      }
    }
  }

  private static checkTextSpelling(text: string, context: string, filePath: string, issues: SpellReviewIssue[], projectDict: Set<string>) {
    const grammarChecks = [
      { regex: /\ba image\b/i, fix: "an image", reason: "Use 'an' before vowel sounds." },
      { regex: /\ban user\b/i, fix: "a user", reason: "Use 'a' before consonant sounds (like 'yoo' in user)." },
      { regex: /\ba api\b/i, fix: "an API", reason: "Use 'an' before vowel sounds (API is pronounced 'ay-pee-eye')." },
      { regex: /\ban website\b/i, fix: "a website", reason: "Use 'a' before consonant sounds." }
    ];

    for (const check of grammarChecks) {
      if (check.regex.test(text)) {
        issues.push({
          file: filePath,
          identifierText: text,
          suggestedFix: text.replace(check.regex, check.fix),
          reason: `Common English grammar mistake: ${check.reason}`,
          severity: "warning"
        });
      }
    }

    const words = text.match(/\b[a-zA-Z']+\b/g) || [];
    for (const word of words) {
      if (word.length < 3) continue;
      const lowerWord = word.toLowerCase();

      if (this.validWords.has(lowerWord) || projectDict.has(lowerWord)) continue;

      if (this.commonTypos[lowerWord]) {
        const typoFix = this.commonTypos[lowerWord] || "";
        issues.push({
          file: filePath,
          identifierText: word,
          suggestedFix: typoFix,
          reason: `Misspelled word "${word}" found in ${context}.`,
          severity: "warning"
        });
      }
    }
  }

  static formatReport(report: SpellReviewReport): string {
    const lines = [
      "Smart Spell Review:",
      `Passed: ${report.passed}`,
      ""
    ];

    if (report.issues.length > 0) {
      lines.push("Issues:");
      for (const issue of report.issues) {
        lines.push(`- File: ${issue.file}`);
        lines.push(`  Identifier/Text: ${issue.identifierText}`);
        lines.push(`  Suggested Fix: ${issue.suggestedFix}`);
        lines.push(`  Reason: ${issue.reason}`);
        lines.push(`  Severity: ${issue.severity}`);
        lines.push("");
      }
    }

    return lines.join("\n").trim();
  }
}

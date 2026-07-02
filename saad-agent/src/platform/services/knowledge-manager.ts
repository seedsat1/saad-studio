import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { execSync } from "child_process";
import * as crypto from "crypto";
import * as http from "http";
import * as https from "https";
import { CONFIG } from "../../config.js";
import { DialectNormalizer } from "./dialect-normalizer.js";

export interface KnowledgeDocument {
  id: string;
  title: string;
  originalFileName: string;
  category: string;
  sourcePath: string;
  sourceType: string;
  fileType: string;
  language: string;
  summary: string;
  tags: string[];
  technicalTerms: string[];
  aliases: string[];
  relatedDocuments: string[];
  chunkCount: number;
  embeddingStatus: "indexed" | "metadata-only" | "skipped" | "failed";
  indexedStatus: "ready" | "failed" | "skipped";
  importedAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  errors: string[];
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  content: string;
  tags: string[];
  vector?: number[];
}

export interface DictionaryTerm {
  id: string;
  term: string;
  normalizedTerm: string;
  category: string;
  definition: string;
  aliasesArabic: string[];
  aliasesEnglish: string[];
  examples: string[];
  codeExamples: string[];
  relatedTerms: string[];
  sourceDocuments: string[];
  confidence: number;
  lastUpdated: string;
}

export interface KnowledgePack {
  name: string;
  description: string;
  category: string;
  documents: string[];
  version: string;
  importedAt: string;
  updatedAt: string;
  enabled: boolean;
  priority: number;
}

export interface StorageVaultConfig {
  knowledgeRoot: string;
  documentsFolder: string;
  workspaceFolder: string;
  registryFolder: string;
  dictionaryFolder: string;
  knowledgePacksFolder: string;
  searchIndexFolder: string;
  embeddingsFolder: string;
  cacheFolder: string;
  logsFolder: string;
  backupFolder: string;
  temporaryFolder: string;
  exportFolder: string;
  maxStorageSize: string;
  automaticCleanupRules: string;
  maxCacheSize: string;
  workerLimits: number;
  concurrentImports: number;
}

export class KnowledgeManagerService {
  private static config: StorageVaultConfig;
  private static activeWorkspaceId: string = "";

  private static DIRS = {
    root: "",
    documents: "",
    chunks: "",
    dictionaries: "",
    embeddings: "",
    summaries: "",
    imports: "",
    failed: "",
    packs: "",
    relations: "",
    searchIndex: "",
    metadata: "",
    projectIndex: "",
    registry: ""
  };

  private static readonly CATEGORIES = [
    "programming", "react", "nextjs", "typescript", "electron", "nodejs", "ai", 
    "providers", "database", "security", "uiux", "architecture", "saad-studio", 
    "human-attributes", "iraqi-dialect", "custom"
  ];

  static getConfigPath(): string {
    const userHome = process.env.USERPROFILE || process.env.HOME || "C:\\";
    return path.join(userHome, ".saad-agent", "knowledge-config.json");
  }

  static loadStorageConfig(): StorageVaultConfig {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (fs.existsSync(configPath)) {
      try {
        this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return this.config;
      } catch {}
    }

    // Default configuration
    const isWindows = process.platform === "win32";
    let rootPath = isWindows ? "E:\\SaadAgentData" : path.join(process.env.HOME || "~", "SaadAgentData");
    if (isWindows && !fs.existsSync("E:\\")) {
      rootPath = path.join(process.env.USERPROFILE || "C:\\", "SaadAgentData");
    }

    this.config = {
      knowledgeRoot: rootPath,
      documentsFolder: path.join(rootPath, "Documents"),
      workspaceFolder: path.join(rootPath, "WorkspaceKnowledge"),
      registryFolder: path.join(rootPath, "Registry"),
      dictionaryFolder: path.join(rootPath, "Dictionaries"),
      knowledgePacksFolder: path.join(rootPath, "KnowledgePacks"),
      searchIndexFolder: path.join(rootPath, "SearchIndex"),
      embeddingsFolder: path.join(rootPath, "Embeddings"),
      cacheFolder: path.join(rootPath, "Cache"),
      logsFolder: path.join(rootPath, "Logs"),
      backupFolder: path.join(rootPath, "Backups"),
      temporaryFolder: path.join(rootPath, "Temp"),
      exportFolder: path.join(rootPath, "Exports"),
      maxStorageSize: "100GB",
      automaticCleanupRules: "none",
      maxCacheSize: "10GB",
      workerLimits: 4,
      concurrentImports: 2
    };

    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), "utf8");
    return this.config;
  }

  static getActiveWorkspaceId() {
    return this.activeWorkspaceId;
  }

  static generateFingerprint(workspacePath: string): string {
    const parts: string[] = [];
    const pkgPath = path.join(workspacePath, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        parts.push(pkg.name || "");
        parts.push(pkg.version || "");
        parts.push(JSON.stringify(pkg.dependencies || {}));
      } catch {}
    }
    try {
      const gitUrl = execSync("git config --get remote.origin.url", { cwd: workspacePath, stdio: "pipe" }).toString().trim();
      if (gitUrl) parts.push(gitUrl);
    } catch {}
    try {
      const subdirs = fs.readdirSync(workspacePath)
        .filter(f => fs.statSync(path.join(workspacePath, f)).isDirectory() && !f.startsWith(".") && f !== "node_modules");
      parts.push(subdirs.join(","));
    } catch {}
    const hash = crypto.createHash("sha256");
    hash.update(parts.join("|") || workspacePath);
    return hash.digest("hex");
  }

  static detectAndConnectWorkspace(workspacePath: string): string {
    const wsDbPath = path.join(this.config.workspaceFolder, "workspaces.json");
    let workspaces: any[] = [];
    try {
      if (fs.existsSync(wsDbPath)) {
        workspaces = JSON.parse(fs.readFileSync(wsDbPath, "utf8"));
      }
    } catch {}

    const fingerprint = this.generateFingerprint(workspacePath);
    const existing = workspaces.find(w => w.workspaceFingerprint === fingerprint);

    if (existing) {
      if (!existing.rootHistory.includes(workspacePath)) {
        existing.rootHistory.push(workspacePath);
      }
      existing.lastOpened = new Date().toISOString();
      this.activeWorkspaceId = existing.workspaceId;
      fs.writeFileSync(wsDbPath, JSON.stringify(workspaces, null, 2), "utf8");
      return existing.workspaceId;
    }

    // Register a new workspace
    const newId = "ws_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
    const name = path.basename(workspacePath);
    let projectType = "Unknown";
    if (fs.existsSync(path.join(workspacePath, "next.config.js")) || fs.existsSync(path.join(workspacePath, "next.config.mjs"))) {
      projectType = "Next.js";
    } else if (fs.existsSync(path.join(workspacePath, "vite.config.ts")) || fs.existsSync(path.join(workspacePath, "vite.config.js"))) {
      projectType = "Vite React";
    }

    let gitRepo = "unspecified";
    try {
      gitRepo = execSync("git config --get remote.origin.url", { cwd: workspacePath, stdio: "pipe" }).toString().trim() || "unspecified";
    } catch {}

    const newWs = {
      workspaceId: newId,
      workspaceFingerprint: fingerprint,
      workspaceName: name,
      createdAt: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      rootHistory: [workspacePath],
      gitRepository: gitRepo,
      projectType
    };

    workspaces.push(newWs);
    
    const wsDir = path.dirname(wsDbPath);
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    fs.writeFileSync(wsDbPath, JSON.stringify(workspaces, null, 2), "utf8");
    
    const specificFolder = path.join(this.config.workspaceFolder, newId);
    if (!fs.existsSync(specificFolder)) {
      fs.mkdirSync(specificFolder, { recursive: true });
    }

    this.activeWorkspaceId = newId;
    return newId;
  }

  static listWorkspaces(): any[] {
    const wsDbPath = path.join(this.config.workspaceFolder, "workspaces.json");
    if (!fs.existsSync(wsDbPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(wsDbPath, "utf8"));
    } catch {
      return [];
    }
  }

  private static async migrateLocalKnowledge() {
    const localDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge");
    if (!fs.existsSync(localDir)) return;

    const copyRecursive = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return;
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    try {
      const folders = ["documents", "dictionaries", "packs", "chunks", "summaries", "failed"];
      for (const folder of folders) {
        const srcFolder = path.join(localDir, folder);
        let destFolder = path.join(this.DIRS.root, folder);
        if (folder === "documents") destFolder = this.DIRS.documents;
        else if (folder === "dictionaries") destFolder = this.DIRS.dictionaries;
        else if (folder === "packs") destFolder = this.DIRS.packs;
        else if (folder === "chunks") destFolder = this.DIRS.chunks;
        else if (folder === "summaries") destFolder = this.DIRS.summaries;
        else if (folder === "failed") destFolder = this.DIRS.failed;

        if (fs.existsSync(srcFolder)) {
          copyRecursive(srcFolder, destFolder);
        }
      }

      const localRegistry = path.join(localDir, "registry.json");
      if (fs.existsSync(localRegistry)) {
        fs.copyFileSync(localRegistry, path.join(this.DIRS.registry, "registry.json"));
      }

      const backupDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", `knowledge.migrated-backup-${Date.now()}`);
      fs.renameSync(localDir, backupDir);
    } catch (e) {
      console.error("[MIGRATION] Error migrating local knowledge:", e);
    }
  }

  static async initialize() {
    try {
      this.loadStorageConfig();
      const root = this.config.knowledgeRoot;

      this.DIRS = {
        root: root,
        documents: this.config.documentsFolder,
        chunks: path.join(root, "Chunks"),
        dictionaries: this.config.dictionaryFolder,
        embeddings: this.config.embeddingsFolder,
        summaries: path.join(root, "Summaries"),
        imports: this.config.temporaryFolder,
        failed: path.join(root, "Failed"),
        packs: this.config.knowledgePacksFolder,
        relations: path.join(root, "Relations"),
        searchIndex: this.config.searchIndexFolder,
        metadata: path.join(root, "Metadata"),
        projectIndex: path.join(root, "WorkspaceIndex"),
        registry: this.config.registryFolder || path.join(root, "Registry")
      };

      for (const dirPath of Object.values(this.DIRS)) {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }

      for (const cat of this.CATEGORIES) {
        const catDir = path.join(this.DIRS.documents, cat);
        if (!fs.existsSync(catDir)) {
          fs.mkdirSync(catDir, { recursive: true });
        }
      }

      await this.migrateLocalKnowledge();
      this.detectAndConnectWorkspace(CONFIG.PROJECT_ROOT);

      // Ensure registry.json
      const registryPath = path.join(this.DIRS.registry, "registry.json");
      if (!fs.existsSync(registryPath)) {
        const fallbackPath = path.join(this.DIRS.root, "registry.json");
        if (fs.existsSync(fallbackPath)) {
          try {
            fs.copyFileSync(fallbackPath, registryPath);
          } catch {}
        } else {
          fs.writeFileSync(registryPath, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), items: [] }, null, 2), "utf8");
        }
      }

      // Ensure dictionaries
      for (const cat of this.CATEGORIES) {
        const dictPath = path.join(this.DIRS.dictionaries, `${cat}.json`);
        if (!fs.existsSync(dictPath)) {
          fs.writeFileSync(dictPath, JSON.stringify([], null, 2), "utf8");
        }
      }

      // Ensure default Adobe CEP knowledge pack exists
      this.ensureAdobePack();

      // Ensure default Iraqi dialect dictionary
      this.ensureIraqiDialectDictionary();

      // Ensure default human attributes dictionary
      this.ensureHumanAttributesDictionary();

    } catch (e) {
      console.error("Failed to initialize KnowledgeManagerService:", e);
    }
  }

  // 1. Human Attributes Local Parser (Requirement 13)
  static parseHumanAttributes(prompt: string): any {
    const p = prompt.toLowerCase();
    const hasAttr = /(رجل|امرأة|شاب|بنت|سمين|ضعيف|نحيف|رياضي|عضلات|صدر|أرداف|ارداف|طيز|فلر|فيلر|شفايف)/.test(p);
    if (!hasAttr) return null;

    const result: any = {
      domain: "human_attributes",
      gender: "unspecified",
      body_type: "average",
      muscularity: "average",
      chest_size: "average",
      butt_size: "average",
      lip_filler: false,
      lips_size: "average"
    };

    if (p.includes("رجل") || p.includes("شاب")) result.gender = "male";
    if (p.includes("امرأة") || p.includes("بنت") || p.includes("امراه")) result.gender = "female";

    if (p.includes("سمين") || p.includes("سمينه") || p.includes("متين")) result.body_type = "overweight";
    if (p.includes("ضعيف") || p.includes("نحيف") || p.includes("ضعيفه") || p.includes("نحيفه")) result.body_type = "slim";
    if (p.includes("رياضي") || p.includes("رياضيه") || p.includes("فتنس")) result.body_type = "athletic";

    if (p.includes("عضلات") || p.includes("معضل") || p.includes("ضخم")) result.muscularity = "high";

    if (p.includes("صدر كبير") || p.includes("صدر ضخم")) result.chest_size = "large";
    if (p.includes("صدر صغير")) result.chest_size = "small";

    if (p.includes("أرداف كبيرة") || p.includes("ارداف كبيرة") || p.includes("أرداف ضخمة") || p.includes("ارداف ضخمة") || p.includes("طيز كبير") || p.includes("طيز ضخم")) {
      result.butt_size = "large";
    }
    if (p.includes("أرداف صغيرة") || p.includes("ارداف صغيرة") || p.includes("طيز صغير")) {
      result.butt_size = "small";
    }

    if (p.includes("فلر") || p.includes("فيلر") || p.includes("تكبير الشفايف")) {
      result.lip_filler = true;
    }

    if (p.includes("شفايف كبيرة") || p.includes("شفايف منفوخة")) result.lips_size = "large";
    if (p.includes("شفايف صغيرة")) result.lips_size = "small";

    return result;
  }

  // 2. Iraqi Dialect Local Parser (Requirement 14)
  static parseIraqiDialect(prompt: string): string | null {
    const p = prompt.trim();
    if (!p) return null;

    const terms: Record<string, string> = {
      "يمعود": "tone/emphasis",
      "همزين": "confirmation",
      "كول": "explain",
      "جيبها": "retrieve_previous",
      "هاتها": "retrieve_previous",
      "دزلي": "return_result",
      "شوف": "inspect",
      "دور": "search_local_or_context",
      "سوه": "execute",
      "سوّيها": "execute",
      "سويها": "execute",
      "كمل": "continue_previous_task",
      "وقف": "stop",
      "رجع": "rollback_or_restore",
      "عدله": "modify_current_target",
      "غيره": "replace_current_target",
      "مو هيچ": "reject_previous_output",
      "مو هيج": "reject_previous_output",
      "مو هذا": "reject_previous_output",
      "هذني": "current_selection",
      "هاي": "current_object",
      "هذاك": "previous_object",
      "ليش": "ask_reason",
      "شلون": "ask_how",
      "شنو": "ask_what"
    };

    return terms[p] || null;
  }

  // 3. Extractors for Ingestion
  static extractTextFromMarkdown(content: string): string {
    return content; // Plain text return
  }

  static extractTextFromHTML(content: string): string {
    // Strip script, style, and navigation tags
    let text = content.replace(/<(script|style|nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, "");
    // Strip all tags
    text = text.replace(/<[^>]*>/g, " ");
    // Normalize spaces
    return text.replace(/\s+/g, " ").trim();
  }

  static extractTextFromPDF(filePath: string): string {
    // Fast binary stream parser for PDF text
    try {
      const buffer = fs.readFileSync(filePath);
      let text = "";
      
      // Look for streams containing (text strings)
      // Standard PDFs contain text inside parenthesis (Text) Tj or [ (Text1) (Text2) ] TJ
      const matches = buffer.toString("binary").match(/\/Filter\s*\/FlateDecode[\s\S]*?stream[\s\S]*?endstream/g);
      if (matches) {
        for (const m of matches) {
          try {
            const streamStart = m.indexOf("stream") + 6;
            const streamEnd = m.indexOf("endstream");
            const streamBinary = m.slice(streamStart, streamEnd).trim();
            const decompressed = zlib.inflateSync(Buffer.from(streamBinary, "binary"));
            const decompressedText = decompressed.toString("utf8");
            
            // Extract content inside parenthesis
            const strings = decompressedText.match(/\(([^)]*)\)/g);
            if (strings) {
              text += strings.map(s => s.slice(1, -1)).join(" ") + "\n";
            }
          } catch {}
        }
      }

      if (text.trim().length > 100) {
        return text;
      }

      // Fallback: Run PowerShell on Windows to extract text if Adobe Reader or Word is installed
      try {
        const tempTxt = path.join(this.DIRS.failed, `${path.basename(filePath)}.txt`);
        const cmd = `powershell -Command "$word = New-Object -ComObject Word.Application; $doc = $word.Documents.Open('${filePath.replace(/'/g, "''")}'); $doc.Content.Text | Out-File '${tempTxt.replace(/'/g, "''")}' -Encoding utf8; $doc.Close(); $word.Quit();"`;
        execSync(cmd, { stdio: "ignore", timeout: 5000 });
        if (fs.existsSync(tempTxt)) {
          const txtContent = fs.readFileSync(tempTxt, "utf8");
          fs.unlinkSync(tempTxt);
          return txtContent;
        }
      } catch {}

      // Fallback 2: Extract clean ASCII strings
      return buffer.toString("utf8").replace(/[^\x20-\x7E\s]/g, " ").replace(/\s+/g, " ");
    } catch (e) {
      console.warn("Failed PDF parse, using fallback ASCII extraction:", e);
      return "";
    }
  }

  static extractTextFromDOCX(filePath: string): string {
    try {
      // unzipping using PowerShell (built-in) to a temp folder
      const tempDir = path.join(this.DIRS.imports, `docx-temp-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      const cmd = `powershell -Command "Expand-Archive -Path '${filePath.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force"`;
      execSync(cmd, { stdio: "ignore" });

      const xmlPath = path.join(tempDir, "word", "document.xml");
      if (fs.existsSync(xmlPath)) {
        const xmlContent = fs.readFileSync(xmlPath, "utf8");
        const matches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        let text = "";
        if (matches) {
          text = matches.map(m => m.replace(/<[^>]*>/g, "")).join(" ");
        }
        // Cleanup temp folder
        fs.rmSync(tempDir, { recursive: true, force: true });
        return text;
      }
    } catch (e) {
      console.error("Failed DOCX extraction:", e);
    }
    return "";
  }

  // 4. Ingestion Pipeline Implementation (Requirement 5)
  static async ingestDocument(filePath: string, category: string, tags: string[] = []): Promise<KnowledgeDocument> {
    const stats = fs.statSync(filePath);
    const originalFileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const cat = this.CATEGORIES.includes(category.toLowerCase()) ? category.toLowerCase() : "custom";
    const destFolder = path.join(this.DIRS.documents, cat);
    const destPath = path.join(destFolder, `${docId}_${originalFileName}`);
    fs.copyFileSync(filePath, destPath);

    let content = "";
    try {
      if (ext === "md") {
        content = this.extractTextFromMarkdown(fs.readFileSync(destPath, "utf8"));
      } else if (ext === "txt") {
        content = fs.readFileSync(destPath, "utf8");
      } else if (ext === "html") {
        content = this.extractTextFromHTML(fs.readFileSync(destPath, "utf8"));
      } else if (ext === "json") {
        content = JSON.stringify(JSON.parse(fs.readFileSync(destPath, "utf8")), null, 2);
      } else if (ext === "csv") {
        content = fs.readFileSync(destPath, "utf8");
      } else if (ext === "pdf") {
        content = this.extractTextFromPDF(destPath);
      } else if (ext === "docx") {
        content = this.extractTextFromDOCX(destPath);
      } else {
        content = fs.readFileSync(destPath, "utf8");
      }
    } catch (e: any) {
      // Copy to failed
      const failedFolder = this.DIRS.failed;
      fs.copyFileSync(filePath, path.join(failedFolder, originalFileName));
      const failedMeta = {
        reason: "Formatting extraction failed",
        fileName: originalFileName,
        errorMessage: e?.message || "Unknown extraction error",
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(failedFolder, `${originalFileName}.meta.json`), JSON.stringify(failedMeta, null, 2));
      throw e;
    }

    // Pipeline Steps
    const language = /[أ-ي]/.test(content.slice(0, 1000)) ? "ar" : "en";
    const title = originalFileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const summary = content.slice(0, 300).trim() + (content.length > 300 ? "..." : "");
    
    // Extract terms and aliases
    const technicalTerms: string[] = [];
    const aliases: string[] = [];
    
    const termRegex = /\b[a-zA-Z]{3,}\b/g;
    let m;
    const termCount: Record<string, number> = {};
    while ((m = termRegex.exec(content.slice(0, 10000))) !== null) {
      const term = m[0].toLowerCase();
      if (term.length > 4 && !/^(const|let|function|return|import|export|class)$/.test(term)) {
        termCount[term] = (termCount[term] || 0) + 1;
      }
    }
    const sortedTerms = Object.keys(termCount).sort((a, b) => termCount[b]! - termCount[a]!).slice(0, 8);
    technicalTerms.push(...sortedTerms);

    // Split into chunks of ~500 chars
    const chunks: KnowledgeChunk[] = [];
    const chunkSize = 600;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkText = content.slice(i, i + chunkSize).trim();
      if (chunkText.length > 50) {
        const chunkId = `chunk_${docId}_${chunks.length}`;
        chunks.push({
          id: chunkId,
          docId,
          chunkIndex: chunks.length,
          content: chunkText,
          tags: [cat, ...tags]
        });
        
        // Save chunk
        fs.writeFileSync(path.join(this.DIRS.chunks, `${chunkId}.json`), JSON.stringify(chunks[chunks.length - 1], null, 2));
      }
    }

    const docRecord: KnowledgeDocument = {
      id: docId,
      title,
      originalFileName,
      category: cat,
      sourcePath: destPath.replace(/\\/g, "/"),
      sourceType: ext,
      fileType: ext,
      language,
      summary,
      tags: [cat, ...tags],
      technicalTerms,
      aliases,
      relatedDocuments: [],
      chunkCount: chunks.length,
      embeddingStatus: "indexed",
      indexedStatus: "ready",
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0,
      errors: []
    };

    // Update registry
    const registry = this.loadRegistry();
    registry.push(docRecord);
    this.writeRegistry(registry);

    // Update dictionaries
    this.updateDictionariesForDoc(docRecord, content);

    return docRecord;
  }

  // Dictionary updates helper
  private static updateDictionariesForDoc(doc: KnowledgeDocument, content: string) {
    const dictPath = path.join(this.DIRS.dictionaries, `${doc.category}.json`);
    let dict: DictionaryTerm[] = [];
    try {
      dict = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    } catch {}

    // Find code blocks containing term
    const codeBlocks: string[] = [];
    const codeRegex = /```[a-zA-Z]*\n([\s\S]*?)\n```/g;
    let match;
    while ((match = codeRegex.exec(content)) !== null) {
      if (match[1]) codeBlocks.push(match[1].trim());
    }

    for (const term of doc.technicalTerms) {
      const existingIdx = dict.findIndex(t => t.term === term);
      
      // Find examples of usage
      const examples: string[] = [];
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.toLowerCase().includes(term.toLowerCase()) && line.length > 20 && line.length < 150) {
          examples.push(line.trim());
          if (examples.length >= 3) break;
        }
      }

      // Find code examples
      const termCodeExamples = codeBlocks
        .filter(block => block.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 2);

      if (existingIdx > -1) {
        const t = dict[existingIdx]!;
        if (!t.sourceDocuments.includes(doc.id)) {
          t.sourceDocuments.push(doc.id);
        }
        t.examples = [...new Set([...t.examples, ...examples])].slice(0, 5);
        t.codeExamples = [...new Set([...t.codeExamples, ...termCodeExamples])].slice(0, 3);
        t.lastUpdated = new Date().toISOString();
      } else {
        dict.push({
          id: `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          term,
          normalizedTerm: term,
          category: doc.category,
          definition: `Technical reference keyword extracted from document "${doc.title}"`,
          aliasesArabic: [],
          aliasesEnglish: [],
          examples,
          codeExamples: termCodeExamples,
          relatedTerms: doc.technicalTerms.filter(x => x !== term).slice(0, 3),
          sourceDocuments: [doc.id],
          confidence: 0.8,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2), "utf8");
  }

  // 5. Codebase learning (Requirement 12)
  static async learnCodebase(folderPath: string): Promise<any> {
    const indexFolder = this.DIRS.projectIndex;
    const projectMap: Record<string, any> = {
      pages: [],
      components: [],
      hooks: [],
      services: [],
      providers: [],
      configs: [],
      riskFiles: []
    };
    const fileIndex: any[] = [];
    const dependencyMap: Record<string, string[]> = {};

    const scan = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        const rel = path.relative(folderPath, full).replace(/\\/g, "/");
        if (rel.includes("node_modules") || rel.includes(".git") || rel.includes("dist") || rel.includes("build")) continue;
        
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scan(full);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (/\.(ts|tsx|js|jsx|json)$/.test(ext)) {
            fileIndex.push({
              filePath: rel,
              sizeBytes: stat.size,
              mtime: stat.mtime
            });

            // Analyze categories based on path and file name
            if (rel.includes("components/") || file.match(/^[A-Z]/)) {
              projectMap.components.push(rel);
            } else if (rel.includes("services/") || file.includes("service")) {
              projectMap.services.push(rel);
            } else if (rel.includes("hooks/") || file.startsWith("use")) {
              projectMap.hooks.push(rel);
            } else if (rel.includes("pages/") || rel.includes("routes/") || rel.includes("app/")) {
              projectMap.pages.push(rel);
            } else if (rel.includes("config") || file.includes("config")) {
              projectMap.configs.push(rel);
            }

            // Simple import parsing
            try {
              const code = fs.readFileSync(full, "utf8");
              const imports: string[] = [];
              const importRegex = /import\s+.*?from\s+["'](.*?)["']/g;
              let match;
              while ((match = importRegex.exec(code)) !== null) {
                if (match[1]) imports.push(match[1]);
              }
              if (imports.length > 0) {
                dependencyMap[rel] = imports;
              }
            } catch {}
          }
        }
      }
    };

    scan(folderPath);

    fs.writeFileSync(path.join(indexFolder, "project-map.json"), JSON.stringify(projectMap, null, 2));
    fs.writeFileSync(path.join(indexFolder, "file-index.json"), JSON.stringify(fileIndex, null, 2));
    fs.writeFileSync(path.join(indexFolder, "dependency-map.json"), JSON.stringify(dependencyMap, null, 2));
    fs.writeFileSync(path.join(indexFolder, "patterns.json"), JSON.stringify({ casing: "camelCase", codingStandards: "TypeScript strict" }, null, 2));
    fs.writeFileSync(path.join(indexFolder, "architecture-summary.md"), "# Architecture Summary\n\nSaad Studio extension architecture.");
    fs.writeFileSync(path.join(indexFolder, "provider-patterns.md"), "# Provider Patterns\n\nIntegrations patterns.");
    fs.writeFileSync(path.join(indexFolder, "page-patterns.md"), "# Page Patterns\n\nRouting patterns.");
    fs.writeFileSync(path.join(indexFolder, "bug-risk-map.json"), JSON.stringify([], null, 2));

    return {
      success: true,
      fileCount: fileIndex.length,
      projectMap
    };
  }

  // Ensure default Iraqi dialect dictionary
  private static ensureIraqiDialectDictionary() {
    const dictPath = path.join(this.DIRS.dictionaries, "iraqi-dialect.json");
    const terms = [
      { term: "يمعود", definition: "تنبيه أو توكيد نبرة الكلام", category: "iraqi-dialect" },
      { term: "همزين", definition: "تأكيد أو تعبير عن الارتياح والتأكيد", category: "iraqi-dialect" },
      { term: "جيبها", definition: "استرجاع الملف أو المعلومة السابقة", category: "iraqi-dialect" }
    ];
    fs.writeFileSync(dictPath, JSON.stringify(terms, null, 2));
  }

  // Ensure default human attributes dictionary
  private static ensureHumanAttributesDictionary() {
    const dictPath = path.join(this.DIRS.dictionaries, "human-attributes.json");
    const terms = [
      { term: "صدر كبير", definition: "حجم الصدر: كبير جداً", category: "human-attributes" },
      { term: "طيز كبير", definition: "حجم الأرداف: كبير جداً", category: "human-attributes" }
    ];
    fs.writeFileSync(dictPath, JSON.stringify(terms, null, 2));
  }

  // Ensure default Adobe CEP pack exists
  private static ensureAdobePack() {
    const packPath = path.join(this.DIRS.packs, "adobe-cep-pack.json");
    if (!fs.existsSync(packPath)) {
      const pack: KnowledgePack = {
        name: "Adobe Premiere Pro CEP Pack",
        description: "Permanent learning pack for Adobe CEP Panels, ExtendScript and timeline automation.",
        category: "saad-studio",
        documents: [],
        version: "1.0.0",
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: true,
        priority: 10
      };
      fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), "utf8");
    }
  }

  // 6. Search Service (Requirement 9)
  static search(query: string, category?: string, limit = 5): any[] {
    const registry = this.loadRegistry();
    const matches: any[] = [];
    const q = query.toLowerCase();

    for (const doc of registry) {
      if (category && doc.category !== category) continue;

      let score = 0;
      if (doc.title.toLowerCase().includes(q)) score += 5;
      if (doc.summary.toLowerCase().includes(q)) score += 3;
      if (doc.tags.some(t => t.toLowerCase().includes(q))) score += 2;
      if (doc.technicalTerms.some(t => t.toLowerCase().includes(q))) score += 2;

      // Additive Arabic/Iraqi normalization check
      if (score === 0) {
        const normQ = DialectNormalizer.normalize(q);
        if (normQ) {
          if (DialectNormalizer.normalize(doc.title).includes(normQ)) score += 5;
          if (DialectNormalizer.normalize(doc.summary).includes(normQ)) score += 3;
          if (doc.tags.some(t => DialectNormalizer.normalize(t).includes(normQ))) score += 2;
          if (doc.technicalTerms.some(t => DialectNormalizer.normalize(t).includes(normQ))) score += 2;
        }
      }

      if (score > 0) {
        matches.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          snippet: doc.summary,
          relevanceScore: score,
          sourcePath: doc.sourcePath,
          summary: doc.summary,
          matchedTerms: doc.technicalTerms.filter(t => {
            const lowerT = t.toLowerCase();
            if (lowerT.includes(q)) return true;
            const normQ = DialectNormalizer.normalize(q);
            return normQ && DialectNormalizer.normalize(t).includes(normQ);
          })
        });
      }
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  static getStats(): any {
    const docs = this.loadRegistry();

    const chunks = fs.existsSync(this.DIRS.chunks) ? fs.readdirSync(this.DIRS.chunks).length : 0;
    let failed = 0;
    try {
      failed = fs.readdirSync(this.DIRS.failed).filter(f => f.endsWith(".meta.json")).length;
    } catch {}

    let dictTermsCount = 0;
    try {
      for (const cat of this.CATEGORIES) {
        const dictPath = path.join(this.DIRS.dictionaries, `${cat}.json`);
        if (fs.existsSync(dictPath)) {
          const dict = JSON.parse(fs.readFileSync(dictPath, "utf8"));
          dictTermsCount += Array.isArray(dict) ? dict.length : 0;
        }
      }
    } catch {}

    return {
      totalDocuments: docs.length,
      indexedDocuments: docs.filter(d => d.indexedStatus === "ready").length,
      failedDocuments: failed,
      totalChunks: chunks,
      dictionaryTerms: dictTermsCount,
      embeddingsStatus: "active",
      lastImport: docs.length > 0 ? docs[docs.length - 1]?.importedAt : null,
      lastSearch: new Date().toISOString(),
      lastUsedKnowledge: docs.length > 0 ? docs[0]?.title : "None"
    };
  }

  static deleteDocument(id: string) {
    const registry = this.loadRegistry();
    const docIndex = registry.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      const doc = registry[docIndex];
      if (doc) {
        const docFilePath = doc.sourcePath;
        if (fs.existsSync(docFilePath)) {
          fs.unlinkSync(docFilePath);
        }
      }
      registry.splice(docIndex, 1);
      this.writeRegistry(registry);
    }
  }

  static getDirs() {
    return this.DIRS;
  }

  static listPacks(): any[] {
    const packsDir = this.DIRS.packs;
    if (!fs.existsSync(packsDir)) return [];
    try {
      return fs.readdirSync(packsDir)
        .filter(f => f.endsWith(".json"))
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(packsDir, f), "utf8"));
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  static deletePack(category: string) {
    const packPath = path.join(this.DIRS.packs, `${category}.json`);
    if (fs.existsSync(packPath)) {
      fs.unlinkSync(packPath);
    }

    // Also delete all documents of this category
    const registry = this.loadRegistry();
    const keep = registry.filter(d => d.category !== category);
    this.writeRegistry(keep);

    // Delete document files in this category
    const catDir = path.join(this.DIRS.documents, category);
    if (fs.existsSync(catDir)) {
      fs.rmSync(catDir, { recursive: true, force: true });
      fs.mkdirSync(catDir, { recursive: true });
    }
  }

  private static checkUrlReachable(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(urlStr);
        const client = urlObj.protocol === "https:" ? https : http;
        const options = {
          method: "HEAD",
          timeout: 5000,
          headers: { "User-Agent": "Mozilla/5.0" }
        };
        const req = client.request(urlStr, options, (res) => {
          resolve(res.statusCode ? res.statusCode < 400 : true);
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      } catch {
        resolve(false);
      }
    });
  }

  static async reindexPack(category: string): Promise<{ success: boolean; error?: string }> {
    const packPath = path.join(this.DIRS.packs, `${category}.json`);
    if (!fs.existsSync(packPath)) {
      return { success: false, error: "Cannot reindex. Source files are missing." };
    }
    let pack: any;
    try {
      pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
    } catch {
      return { success: false, error: "Cannot reindex. Source files are missing." };
    }
    
    const source = pack.sourceUrl;
    if (!source) {
      return { success: false, error: "Cannot reindex. Source files are missing." };
    }

    const isWeb = source.startsWith("http://") || source.startsWith("https://");
    if (!isWeb) {
      // Local file or folder
      if (!fs.existsSync(source)) {
        return { success: false, error: "Cannot reindex. Source files are missing." };
      }

      try {
        // Re-indexing local files/folders:
        // 1. Clear old documents in registry
        const registry = this.loadRegistry();
        const filteredRegistry = registry.filter(d => d.category !== category);
        this.writeRegistry(filteredRegistry);

        // 2. Clear category documents folder
        const catDir = path.join(this.DIRS.documents, category);
        if (fs.existsSync(catDir)) {
          fs.rmSync(catDir, { recursive: true, force: true });
        }
        fs.mkdirSync(catDir, { recursive: true });

        // 3. Re-ingest
        const results: any[] = [];
        let totalSize = 0;
        let totalChunks = 0;
        let totalTerms = 0;

        const stats = fs.statSync(source);
        if (stats.isFile()) {
          const doc = await this.ingestDocument(source, category);
          results.push(doc);
          totalChunks += doc.chunkCount;
          totalTerms += doc.technicalTerms.length;
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          const files = fs.readdirSync(source);
          for (const file of files) {
            const fullPath = path.join(source, file);
            if (fs.statSync(fullPath).isFile()) {
              const ext = path.extname(file).toLowerCase();
              if (/\.(md|txt|html|json|csv|pdf|docx)$/.test(ext)) {
                const doc = await this.ingestDocument(fullPath, category);
                results.push(doc);
                totalChunks += doc.chunkCount;
                totalTerms += doc.technicalTerms.length;
                totalSize += fs.statSync(fullPath).size;
              }
            }
          }
          await this.learnCodebase(source);
        }

        // 4. Update pack metadata
        pack.pages = results.length;
        pack.chunks = totalChunks;
        pack.dictionaryTerms = totalTerms;
        pack.storageSize = totalSize;
        pack.lastUpdated = new Date().toISOString();
        fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), "utf8");

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Reindexing failed." };
      }
    } else {
      // Web URL re-indexing.
      // Verify if target site is reachable
      const reachable = await this.checkUrlReachable(source);
      if (!reachable) {
        return { success: false, error: "Cannot reindex. Source files are missing." };
      }

      // Re-index web pack from cached documents
      const catDir = path.join(this.DIRS.documents, category);
      if (!fs.existsSync(catDir)) {
        return { success: false, error: "Cannot reindex. Source files are missing." };
      }

      try {
        const registry = this.loadRegistry();
        const catDocs = registry.filter(d => d.category === category);
        
        let totalChunks = 0;
        let totalTerms = 0;
        let totalSize = 0;
        let reindexedCount = 0;

        for (const doc of catDocs) {
          if (fs.existsSync(doc.sourcePath)) {
            // Re-ingest text file
            const updatedDoc = await this.ingestDocument(doc.sourcePath, category, doc.tags);
            reindexedCount++;
            totalChunks += updatedDoc.chunkCount;
            totalTerms += updatedDoc.technicalTerms.length;
            totalSize += fs.statSync(doc.sourcePath).size;
          }
        }

        pack.pages = reindexedCount;
        pack.chunks = totalChunks;
        pack.dictionaryTerms = totalTerms;
        pack.storageSize = totalSize;
        pack.lastUpdated = new Date().toISOString();
        fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), "utf8");

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Reindexing failed." };
      }
    }
  }

  private static loadRegistry(): KnowledgeDocument[] {
    let registryPath = path.join(this.DIRS.registry, "registry.json");
    if (!fs.existsSync(registryPath)) {
      const fallbackPath = path.join(this.DIRS.root, "registry.json");
      if (fs.existsSync(fallbackPath)) {
        registryPath = fallbackPath;
      }
    }
    if (!fs.existsSync(registryPath)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    } catch {}
    return [];
  }

  private static writeRegistry(items: KnowledgeDocument[]) {
    const registryPath = path.join(this.DIRS.registry, "registry.json");
    const registry = {
      version: 1,
      generatedAt: new Date().toISOString(),
      items
    };
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
  }

  static getStorageConfig(): StorageVaultConfig {
    return this.config;
  }

  static updateStorageConfig(newConfig: Partial<StorageVaultConfig>): boolean {
    const configPath = this.getConfigPath();
    const current = { ...this.config };
    const merged = { ...current, ...newConfig } as StorageVaultConfig;

    if (!merged.knowledgeRoot) return false;

    const copyRecursive = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return;
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    try {
      if (newConfig.knowledgeRoot && newConfig.knowledgeRoot !== current.knowledgeRoot) {
        if (!fs.existsSync(newConfig.knowledgeRoot)) {
          fs.mkdirSync(newConfig.knowledgeRoot, { recursive: true });
        }
        const subfolders = ["Documents", "WorkspaceKnowledge", "Registry", "Dictionaries", "KnowledgePacks", "SearchIndex", "Embeddings", "Cache", "Logs", "Backups", "Temp", "Exports"];
        for (const sub of subfolders) {
          const oldSub = path.join(current.knowledgeRoot, sub);
          const newSub = path.join(newConfig.knowledgeRoot, sub);
          if (fs.existsSync(oldSub)) {
            copyRecursive(oldSub, newSub);
            if (!fs.existsSync(newSub)) {
              throw new Error(`Migration verification failed for folder: ${sub}`);
            }
          }
        }
        try {
          const archiveRoot = current.knowledgeRoot + ".migrated-archive-" + Date.now();
          fs.renameSync(current.knowledgeRoot, archiveRoot);
        } catch (e) {
          console.warn("[VAULT] Could not archive old root folder, keeping untouched:", e);
        }
      }

      const folderKeys: Array<keyof StorageVaultConfig> = [
        "documentsFolder", "workspaceFolder", "registryFolder", "dictionaryFolder",
        "knowledgePacksFolder", "searchIndexFolder", "embeddingsFolder", "cacheFolder",
        "logsFolder", "backupFolder", "temporaryFolder", "exportFolder"
      ];
      for (const key of folderKeys) {
        const newVal = newConfig[key];
        const oldVal = current[key];
        if (newVal && newVal !== oldVal) {
          if (!fs.existsSync(newVal as string)) {
            fs.mkdirSync(newVal as string, { recursive: true });
          }
          if (fs.existsSync(oldVal as string)) {
            copyRecursive(oldVal as string, newVal as string);
            if (!fs.existsSync(newVal as string)) {
              throw new Error(`Migration verification failed for specific folder key: ${key}`);
            }
            try {
              const archiveSpecific = (oldVal as string) + ".migrated-archive-" + Date.now();
              fs.renameSync(oldVal as string, archiveSpecific);
            } catch (e) {
              console.warn(`[VAULT] Could not archive old folder for key ${key}, keeping untouched:`, e);
            }
          }
        }
      }

      this.config = merged;
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), "utf8");
      void this.initialize();
      return true;
    } catch (e: any) {
      console.error("[VAULT] Failed to update storage config or move data:", e);
      return false;
    }
  }

  static createBackup(label: string): string {
    const backupId = `backup_${Date.now()}`;
    const dest = path.join(this.config.backupFolder, `${backupId}_${label}`);
    fs.mkdirSync(dest, { recursive: true });
    
    const reg = path.join(this.DIRS.registry, "registry.json");
    if (fs.existsSync(reg)) fs.copyFileSync(reg, path.join(dest, "registry.json"));
    
    const ws = path.join(this.config.workspaceFolder, "workspaces.json");
    if (fs.existsSync(ws)) fs.copyFileSync(ws, path.join(dest, "workspaces.json"));
    
    const copyDir = (src: string, target: string) => {
      if (!fs.existsSync(src)) return;
      fs.mkdirSync(target, { recursive: true });
      fs.readdirSync(src).forEach(f => {
        const fullSrc = path.join(src, f);
        const fullTgt = path.join(target, f);
        if (fs.statSync(fullSrc).isFile()) {
          fs.copyFileSync(fullSrc, fullTgt);
        }
      });
    };
    copyDir(this.DIRS.dictionaries, path.join(dest, "Dictionaries"));
    copyDir(this.DIRS.packs, path.join(dest, "KnowledgePacks"));
    
    return backupId;
  }

  static listBackups(): any[] {
    const backupDir = this.config.backupFolder;
    if (!fs.existsSync(backupDir)) return [];
    try {
      return fs.readdirSync(backupDir).map(dirName => {
        const full = path.join(backupDir, dirName);
        const stat = fs.statSync(full);
        return {
          id: dirName.split("_").slice(0, 2).join("_"),
          label: dirName.split("_").slice(2).join("_"),
          createdAt: stat.mtime.toISOString(),
          folderName: dirName
        };
      });
    } catch {
      return [];
    }
  }

  static restoreBackup(backupId: string): boolean {
    const backupDir = this.config.backupFolder;
    if (!fs.existsSync(backupDir)) return false;
    const folders = fs.readdirSync(backupDir);
    const folder = folders.find(f => f.startsWith(backupId));
    if (!folder) return false;
    const src = path.join(backupDir, folder);
    
    const reg = path.join(src, "registry.json");
    if (fs.existsSync(reg)) fs.copyFileSync(reg, path.join(this.DIRS.registry, "registry.json"));
    
    const ws = path.join(src, "workspaces.json");
    if (fs.existsSync(ws)) fs.copyFileSync(ws, path.join(this.config.workspaceFolder, "workspaces.json"));
    
    const restoreDir = (backupSrc: string, targetDest: string) => {
      if (!fs.existsSync(backupSrc)) return;
      fs.mkdirSync(targetDest, { recursive: true });
      fs.readdirSync(backupSrc).forEach(f => {
        fs.copyFileSync(path.join(backupSrc, f), path.join(targetDest, f));
      });
    };
    restoreDir(path.join(src, "Dictionaries"), this.DIRS.dictionaries);
    restoreDir(path.join(src, "KnowledgePacks"), this.DIRS.packs);
    
    void this.initialize();
    return true;
  }
}

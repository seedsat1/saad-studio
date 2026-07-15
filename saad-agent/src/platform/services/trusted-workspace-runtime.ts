import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import electronPkg from "electron";
import { getGlobalAppDataDir } from "../workspace-manager.js";
import { fileURLToPath } from "url";
import { ReferenceRegistryService } from "./reference-registry.js";

const execFileAsync = promisify(execFile);
const { clipboard, shell } = electronPkg;

export interface TrustedWorkspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpened: string;
}

export interface TrustedWorkspaceStore {
  version: number;
  workspaces: TrustedWorkspace[];
}

export interface WorkspaceSearchResult {
  type: "file" | "content";
  path: string;
  relativePath: string;
  line?: number;
  preview?: string;
  score: number;
}

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "release",
  "release-production-v4",
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
  ".prisma",
  ".env.example"
]);

const safeCommandMap: Record<string, { command: string; args: string[]; writes?: boolean }> = {
  "npm run build": { command: "npm.cmd", args: ["run", "build"] },
  "npm run typecheck": { command: "npm.cmd", args: ["run", "typecheck"] },
  "npm run lint": { command: "npm.cmd", args: ["run", "lint"] },
  "npm test": { command: "npm.cmd", args: ["test"] },
  "git status": { command: "git", args: ["status", "--short"] },
  "git diff": { command: "git", args: ["diff"] },
  "git add": { command: "git", args: ["add"], writes: true },
  "git commit": { command: "git", args: ["commit", "-m"], writes: true },
  "git push": { command: "git", args: ["push"], writes: true }
};

const designReferenceIndexFallback = [
  "# Saad Agent Design Reference Index",
  "",
  "Use DEZ as a read-only UI/design reference map, not as a target workspace or source-copy folder.",
  "Reference root: saad-agent/release-production-v4/win-unpacked/DEZ.",
  "Primary references:",
  "- Landing/SaaS/AI Studio: shadcn-dashboard-landing-template-main/.../vite-version/src/app/landing and nextjs-version/src/app/landing.",
  "- Dashboard/product tools: .../vite-version/src/app/dashboard, dashboard-2, and nextjs-version/src/app/(dashboard).",
  "- Chat UI: .../vite-version/src/app/chat.",
  "- Settings/providers/models/security panels: .../vite-version/src/app/settings and shadcn-admin-kit-main.",
  "- Auth: .../vite-version/src/app/auth and nextjs-version/src/app/(auth).",
  "- Pricing: .../vite-version/src/app/pricing and nextjs-version dashboard pricing.",
  "- Components: .../src/components, .../src/components/ui, and ui-main/ui-main.",
  "Rules: inspect the real target workspace first; use references only for patterns; do not modify DEZ; do not install libraries without approval; keep Arabic text LTR when the user says no RTL; use local image folders only as assets."
].join("\n");

const designReferenceManifestFallback = [
  "# Saad Agent DEZ Design Reference Manifest",
  "",
  "The generated DESIGN_REFERENCE_MANIFEST.json file is missing from the package.",
  "Fallback source root: saad-agent/release-production-v4/win-unpacked/DEZ.",
  "Before UI/design work, inspect the target workspace first, then inspect matching DEZ files from landing, dashboard, chat, settings, auth, pricing, components, ui-components, theme, and visual-assets categories.",
  "This fallback is not a complete file-level manifest; regenerate it with `npm run generate:dez-manifest` inside saad-agent."
].join("\n");

const claudeCodeReferenceIndexFallback = [
  "# Saad Agent Claude Code Reference Index",
  "",
  "Use E:/Agent-Reach-main/claude-code as a read-only comparative architecture reference only.",
  "Allowed patterns: agent loop, tool registry, task state, permission gates, terminal/file workflows, hooks, skills/plugins, memory/context budgeting.",
  "Forbidden: copying, importing, running, vendoring, bundling, or reverse-engineering source from that folder.",
  "For architecture/runtime tasks, inspect this reference summary plus CLAUDE_CODE_REFERENCE_MANIFEST.json and relevant paths before making claims.",
  "Final runtime reports must include `Claude-code files inspected: <actual reference paths>` or `Claude-code files inspected: blocked - <reason>`."
].join("\n");

const claudeCodeReferenceManifestFallback = [
  "# Saad Agent Claude Code Reference Manifest",
  "",
  "The generated CLAUDE_CODE_REFERENCE_MANIFEST.json file is missing from the package.",
  "Fallback source root: E:/Agent-Reach-main/claude-code.",
  "This fallback is not a complete file-level manifest; regenerate it with `npm run generate:claude-code-manifest` inside saad-agent before relying on Claude Code reference evidence."
].join("\n");

export class TrustedWorkspaceRuntime {
  private static async storePath(): Promise<string> {
    const appData = await getGlobalAppDataDir();
    return path.join(appData, "trusted-workspaces.json");
  }

  static normalize(inputPath: string): string {
    return path.resolve(inputPath).replace(/\\/g, "/");
  }

  static isSensitivePath(inputPath: string): boolean {
    const normalized = inputPath.replace(/\\/g, "/").toLowerCase();
    const base = path.basename(normalized);
    if (base === ".env" || base.startsWith(".env.")) return true;
    return /(^|\/)(secrets?|credentials?|tokens?|cookies?|private-keys?|keychain|encrypted-secret-store)(\/|$)/i.test(normalized)
      || /\.(pem|p12|pfx|key|crt)$/i.test(normalized)
      || /(api[_-]?key|access[_-]?token|auth[_-]?token|secret|password|credential)/i.test(base);
  }

  static isReferenceOnlyPath(inputPath: string): boolean {
    const normalized = inputPath.replace(/\\/g, "/").toLowerCase();
    return ReferenceRegistryService.isReferenceOnlyPath(inputPath)
      || normalized.includes("/agent-reach-main/claude-code")
      || normalized.includes("/release-production-v4/win-unpacked/dez")
      || /(^|\/)dez(\/|$)/i.test(normalized)
      || /(^|\/)(claude_code_reference_|design_reference_)/i.test(path.basename(normalized));
  }

  static async loadStore(): Promise<TrustedWorkspaceStore> {
    const storePath = await this.storePath();
    try {
      const parsed = JSON.parse(await fsp.readFile(storePath, "utf8"));
      const workspaces = Array.isArray(parsed?.workspaces) ? parsed.workspaces : [];
      return { version: 1, workspaces };
    } catch {
      return { version: 1, workspaces: [] };
    }
  }

  static async saveStore(store: TrustedWorkspaceStore): Promise<void> {
    const storePath = await this.storePath();
    await fsp.mkdir(path.dirname(storePath), { recursive: true });
    await fsp.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  }

  static async addWorkspace(workspacePath: string, name?: string): Promise<TrustedWorkspace> {
    const normalized = this.normalize(workspacePath);
    const stat = await fsp.stat(normalized).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new Error("Trusted workspace must be an existing directory.");
    }
    if (this.isSensitivePath(normalized)) {
      throw new Error("Sensitive paths cannot be trusted workspaces.");
    }
    if (this.isReferenceOnlyPath(normalized)) {
      throw new Error("Reference-only paths cannot be trusted workspaces.");
    }

    const store = await this.loadStore();
    const now = new Date().toISOString();
    const id = Buffer.from(normalized.toLowerCase()).toString("base64url").slice(0, 32);
    const existing = store.workspaces.find((item) => item.path.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      existing.name = name?.trim() || existing.name;
      existing.lastOpened = now;
      await this.saveStore(store);
      return existing;
    }

    const workspace: TrustedWorkspace = {
      id,
      name: name?.trim() || path.basename(normalized) || "Workspace",
      path: normalized,
      createdAt: now,
      lastOpened: now
    };
    store.workspaces.unshift(workspace);
    await this.saveStore(store);
    return workspace;
  }

  static async removeWorkspace(workspaceId: string): Promise<boolean> {
    const store = await this.loadStore();
    const before = store.workspaces.length;
    store.workspaces = store.workspaces.filter((item) => item.id !== workspaceId);
    await this.saveStore(store);
    return store.workspaces.length !== before;
  }

  static async listWorkspaces(): Promise<TrustedWorkspace[]> {
    return (await this.loadStore()).workspaces;
  }

  static async ensureDefaultWorkspace(workspacePath?: string): Promise<void> {
    if (!workspacePath) return;
    await this.addWorkspace(workspacePath).catch(() => undefined);
  }

  static async assertTrustedPath(targetPath: string): Promise<string> {
    if (!targetPath || typeof targetPath !== "string") {
      throw new Error("Missing local path.");
    }
    if (targetPath.includes("\0")) {
      throw new Error("Unsafe path.");
    }
    const resolved = this.normalize(targetPath);
    if (this.isSensitivePath(resolved)) {
      throw new Error("Access denied: sensitive files and credential paths are blocked.");
    }
    if (this.isReferenceOnlyPath(resolved)) {
      throw new Error("Access denied: reference-only paths cannot be execution workspaces.");
    }

    const store = await this.loadStore();
    const allowed = store.workspaces.some((workspace) => {
      const root = this.normalize(workspace.path);
      const relative = path.relative(root, resolved);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
    if (!allowed) {
      throw new Error("Access denied: path is not inside a trusted workspace.");
    }
    return resolved;
  }

  static async openLocalPath(targetPath: string): Promise<{ success: boolean; path: string }> {
    const safePath = await this.assertTrustedPath(targetPath);
    await shell.openPath(safePath);
    return { success: true, path: safePath };
  }

  static async revealLocalPath(targetPath: string): Promise<{ success: boolean; path: string }> {
    const safePath = await this.assertTrustedPath(targetPath);
    shell.showItemInFolder(safePath);
    return { success: true, path: safePath };
  }

  static async copyLocalPath(targetPath: string): Promise<{ success: boolean; path: string }> {
    const safePath = await this.assertTrustedPath(targetPath);
    clipboard.writeText(safePath);
    return { success: true, path: safePath };
  }

  static async readFile(targetPath: string): Promise<{ path: string; content: string }> {
    const safePath = await this.assertTrustedPath(targetPath);
    const stat = await fsp.stat(safePath);
    if (!stat.isFile()) throw new Error("Path is not a file.");
    if (stat.size > 1024 * 1024) throw new Error("File is too large to read directly.");
    return { path: safePath, content: await fsp.readFile(safePath, "utf8") };
  }

  static async createBackup(targetPath: string): Promise<string> {
    const safePath = await this.assertTrustedPath(targetPath);
    const stat = await fsp.stat(safePath).catch(() => null);
    if (!stat?.isFile()) return "";
    const root = await this.findContainingWorkspace(safePath);
    if (!root) throw new Error("No containing trusted workspace found.");
    const relative = path.relative(root.path, safePath);
    const backupPath = path.join(root.path, ".saad-agent", "runtime-backups", `${Date.now()}-${relative.replace(/[\\/:*?"<>|]/g, "_")}`);
    await fsp.mkdir(path.dirname(backupPath), { recursive: true });
    await fsp.copyFile(safePath, backupPath);
    return backupPath.replace(/\\/g, "/");
  }

  static async writeFile(targetPath: string, content: string, create = false): Promise<{ path: string; backupPath?: string }> {
    const safePath = await this.assertTrustedPath(targetPath);
    const exists = fs.existsSync(safePath);
    if (!exists && !create) throw new Error("File does not exist. Use create=true to create a new file.");
    const backupPath = exists ? await this.createBackup(safePath) : undefined;
    await fsp.mkdir(path.dirname(safePath), { recursive: true });
    await fsp.writeFile(safePath, content, "utf8");
    return backupPath ? { path: safePath, backupPath } : { path: safePath };
  }

  static async deletePath(targetPath: string, approved: boolean): Promise<{ success: boolean; backupPath?: string }> {
    if (!approved) throw new Error("Delete requires explicit approval.");
    const safePath = await this.assertTrustedPath(targetPath);
    const backupPath = await this.createBackup(safePath);
    const stat = await fsp.stat(safePath);
    if (stat.isDirectory()) {
      await fsp.rm(safePath, { recursive: true, force: false });
    } else {
      await fsp.unlink(safePath);
    }
    return { success: true, backupPath };
  }

  static async search(workspaceId: string, query: string, limit = 50): Promise<WorkspaceSearchResult[]> {
    const store = await this.loadStore();
    const workspace = store.workspaces.find((item) => item.id === workspaceId) || store.workspaces[0];
    if (!workspace) throw new Error("No trusted workspace is configured.");
    const root = await this.assertTrustedPath(workspace.path);
    const needle = (query || "").trim().toLowerCase();
    if (!needle) return [];

    const results: WorkspaceSearchResult[] = [];
    const walk = async (dir: string) => {
      if (results.length >= limit) return;
      const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (results.length >= limit) break;
        const full = path.join(dir, entry.name);
        if (this.isSensitivePath(full)) continue;
        if (entry.isDirectory()) {
          if (!ignoredDirectories.has(entry.name)) await walk(full);
          continue;
        }
        if (!entry.isFile()) continue;
        const relativePath = path.relative(root, full).replace(/\\/g, "/");
        const lowerName = entry.name.toLowerCase();
        const lowerRel = relativePath.toLowerCase();
        if (lowerName.includes(needle) || lowerRel.includes(needle)) {
          results.push({ type: "file", path: this.normalize(full), relativePath, score: lowerName === needle ? 100 : 80 });
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!textExtensions.has(ext)) continue;
        const stat = await fsp.stat(full).catch(() => null);
        if (!stat || stat.size > 512 * 1024) continue;
        const content = await fsp.readFile(full, "utf8").catch(() => "");
        const lines = content.split(/\r?\n/);
        const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(needle));
        if (lineIndex >= 0) {
          const previewLine = lines[lineIndex] || "";
          results.push({
            type: "content",
            path: this.normalize(full),
            relativePath,
            line: lineIndex + 1,
            preview: previewLine.trim().slice(0, 260),
            score: 70
          });
        }
      }
    };

    await walk(root);
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  static async runSafeCommand(workspaceId: string, commandName: string, args: string[] = [], explicitApproval = false): Promise<any> {
    const store = await this.loadStore();
    const workspace = store.workspaces.find((item) => item.id === workspaceId) || store.workspaces[0];
    if (!workspace) throw new Error("No trusted workspace is configured.");
    const cwd = await this.assertTrustedPath(workspace.path);
    const spec = safeCommandMap[commandName];
    if (!spec) throw new Error(`Command is not allowlisted: ${commandName}`);
    if ((commandName === "git push" || spec.writes) && !explicitApproval) {
      throw new Error(`${commandName} requires explicit approval.`);
    }
    const finalArgs = [...spec.args];
    if (commandName === "git add") finalArgs.push(...args);
    if (commandName === "git commit") finalArgs.push(args.join(" ").trim() || "Saad Agent update");
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync(spec.command, finalArgs, {
      cwd,
      timeout: 120000,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
    return { success: true, command: commandName, cwd, stdout, stderr, durationMs: Date.now() - startedAt };
  }

  static async loadAgentReferences(workspacePath: string): Promise<Array<{ path: string; loaded: boolean; content?: string }>> {
    const currentFile = fileURLToPath(import.meta.url);
    const builtAgentRoot = path.resolve(path.dirname(currentFile), "../../..");
    const workspaceRoot = await this.findProjectMemoryRoot(workspacePath);
    const agentRoot = fs.existsSync(path.join(workspaceRoot, "saad-agent", "SAAD_AGENT_CONTEXT.md"))
      ? path.join(workspaceRoot, "saad-agent")
      : builtAgentRoot;
    const designReference = ReferenceRegistryService.getDesignReference();
    const claudeReference = ReferenceRegistryService.getClaudeCodeReference();
    const candidates = [
      path.join(workspaceRoot, "AGENTS.md"),
      path.join(workspaceRoot, "PROJECT_CONTEXT.md"),
      path.join(agentRoot, "SAAD_AGENT_CONTEXT.md"),
      designReference.indexPath,
      designReference.manifestPath,
      claudeReference.indexPath,
      claudeReference.manifestPath,
      path.join(workspaceRoot, "docs", "saad-studio-premiere-reference-ar.md")
    ];
    const unique = Array.from(new Set(candidates.map((item) => path.resolve(item))));
    return Promise.all(unique.map(async (filePath) => {
      let content = await fsp.readFile(filePath, "utf8").catch(() => "");
      if (!content.trim() && path.basename(filePath) === "DESIGN_REFERENCE_INDEX.md") {
        content = designReferenceIndexFallback;
      }
      if (!content.trim() && path.basename(filePath) === "CLAUDE_CODE_REFERENCE_INDEX.md") {
        content = claudeCodeReferenceIndexFallback;
      }
      if (path.basename(filePath) === "DESIGN_REFERENCE_MANIFEST.json") {
        content = content.trim()
          ? this.formatDesignReferenceManifest(filePath, content)
          : designReferenceManifestFallback;
      }
      if (path.basename(filePath) === "CLAUDE_CODE_REFERENCE_MANIFEST.json") {
        content = content.trim()
          ? this.formatClaudeCodeReferenceManifest(filePath, content)
          : claudeCodeReferenceManifestFallback;
      }
      return { path: filePath.replace(/\\/g, "/"), loaded: Boolean(content.trim()), content: content.slice(0, 2000) };
    }));
  }

  private static formatDesignReferenceManifest(filePath: string, rawContent: string): string {
    try {
      const manifest = JSON.parse(rawContent) as {
        absoluteDezRoot?: string;
        relativeDezRoot?: string;
        totalFiles?: number;
        totalBytes?: number;
        roots?: Array<{ name: string; totalFiles: number; totalBytes: number }>;
        categories?: Record<string, { count: number; examples?: string[] }>;
      };
      const priorityCategories = [
        "landing",
        "dashboard",
        "chat",
        "settings",
        "auth",
        "pricing",
        "components",
        "ui-components",
        "theme",
        "visual-assets"
      ];
      const lines = [
        "# Saad Agent DEZ Design Reference Manifest",
        "",
        "This generated manifest is the authoritative file-level source for local DEZ design references.",
        `Manifest file: ${filePath.replace(/\\/g, "/")}`,
        `Absolute DEZ root: ${manifest.absoluteDezRoot || "(unknown)"}`,
        `Relative DEZ root: ${manifest.relativeDezRoot || "release-production-v4/win-unpacked/DEZ"}`,
        `Indexed files: ${manifest.totalFiles ?? 0}`,
        `Indexed bytes: ${manifest.totalBytes ?? 0}`,
        "",
        "Required behavior: inspect the real target workspace first; for UI/design tasks inspect matching DEZ files by category before implementing; do not modify DEZ; do not copy full projects blindly.",
        "",
        "Reference roots:"
      ];
      for (const root of (manifest.roots || []).slice(0, 12)) {
        lines.push(`- ${root.name}: ${root.totalFiles} files, ${root.totalBytes} bytes`);
      }
      lines.push("", "Priority categories:");
      for (const category of priorityCategories) {
        const summary = manifest.categories?.[category];
        if (!summary) continue;
        lines.push(`- ${category}: ${summary.count} files`);
        for (const example of (summary.examples || []).slice(0, 5)) {
          lines.push(`  - ${example}`);
        }
      }
      return lines.join("\n");
    } catch {
      return [
        "# Saad Agent DEZ Design Reference Manifest",
        "",
        `Manifest file: ${filePath.replace(/\\/g, "/")}`,
        "The manifest exists but could not be parsed. Regenerate it with `npm run generate:dez-manifest` inside saad-agent before relying on DEZ references."
      ].join("\n");
    }
  }

  private static formatClaudeCodeReferenceManifest(filePath: string, rawContent: string): string {
    try {
      const manifest = JSON.parse(rawContent) as {
        absoluteReferenceRoot?: string;
        relativeReferenceRoot?: string;
        totalFiles?: number;
        totalBytes?: number;
        roots?: Array<{ name: string; totalFiles: number; totalBytes: number }>;
        categories?: Record<string, { count: number; examples?: string[] }>;
      };
      const priorityCategories = [
        "package",
        "entrypoints",
        "agent-runtime",
        "tools",
        "tasks",
        "memory-context",
        "permissions",
        "terminal",
        "file-ops",
        "skills-plugins-hooks",
        "docs"
      ];
      const lines = [
        "# Saad Agent Claude Code Reference Manifest",
        "",
        "This generated manifest is the authoritative file-level source for the local Claude Code comparative architecture reference.",
        `Manifest file: ${filePath.replace(/\\/g, "/")}`,
        `Absolute reference root: ${manifest.absoluteReferenceRoot || "(unknown)"}`,
        `Relative reference root: ${manifest.relativeReferenceRoot || "E:/Agent-Reach-main/claude-code"}`,
        `Indexed files: ${manifest.totalFiles ?? 0}`,
        `Indexed bytes: ${manifest.totalBytes ?? 0}`,
        "",
        "Safety: read-only architecture reference only. Do not copy, run, import, vendor, bundle, or reverse-engineer code from this folder.",
        "Required behavior: for Saad Agent architecture/runtime tasks, inspect relevant manifest categories and cite actual reference paths in `Claude-code files inspected:`.",
        "",
        "Reference roots:"
      ];
      for (const root of (manifest.roots || []).slice(0, 12)) {
        lines.push(`- ${root.name}: ${root.totalFiles} files, ${root.totalBytes} bytes`);
      }
      lines.push("", "Priority categories:");
      for (const category of priorityCategories) {
        const summary = manifest.categories?.[category];
        if (!summary) continue;
        lines.push(`- ${category}: ${summary.count} files`);
        for (const example of (summary.examples || []).slice(0, 5)) {
          lines.push(`  - ${example}`);
        }
      }
      return lines.join("\n");
    } catch {
      return [
        "# Saad Agent Claude Code Reference Manifest",
        "",
        `Manifest file: ${filePath.replace(/\\/g, "/")}`,
        "The manifest exists but could not be parsed. Regenerate it with `npm run generate:claude-code-manifest` inside saad-agent before relying on Claude Code references."
      ].join("\n");
    }
  }

  private static async findProjectMemoryRoot(startPath: string): Promise<string> {
    let current = path.resolve(startPath);
    const stat = await fsp.stat(current).catch(() => null);
    if (stat?.isFile()) current = path.dirname(current);
    for (let i = 0; i < 8; i += 1) {
      if (fs.existsSync(path.join(current, "AGENTS.md")) || fs.existsSync(path.join(current, "PROJECT_CONTEXT.md"))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return path.resolve(startPath);
  }

  private static async findContainingWorkspace(targetPath: string): Promise<TrustedWorkspace | null> {
    const safe = this.normalize(targetPath);
    const store = await this.loadStore();
    return store.workspaces.find((workspace) => {
      const root = this.normalize(workspace.path);
      const relative = path.relative(root, safe);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    }) || null;
  }
}

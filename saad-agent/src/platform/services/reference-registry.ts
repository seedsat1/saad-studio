import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "../../config.js";

export type ReferenceRootId = "dez" | "claude-code";

export interface ReferenceRootRecord {
  id: ReferenceRootId;
  label: string;
  rootPath: string;
  manifestPath: string;
  indexPath: string;
  readOnly: true;
  exists: boolean;
  source: "electron-resources" | "module-root" | "project-root" | "environment" | "known-local" | "missing";
}

export interface ReferenceRegistrySnapshot {
  design: ReferenceRootRecord;
  claudeCode: ReferenceRootRecord;
}

function normalizePath(value: string): string {
  return path.resolve(value).replace(/\\/g, "/");
}

function pathExists(value: string): boolean {
  try {
    return fs.existsSync(value);
  } catch {
    return false;
  }
}

function currentModuleAppRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../../..");
}

function resourcesPath(): string {
  const proc = process as NodeJS.Process & { resourcesPath?: string };
  return typeof proc.resourcesPath === "string" ? proc.resourcesPath || "" : "";
}

function firstExistingDirectory(
  candidates: Array<{ path: string; source: ReferenceRootRecord["source"] }>
): { path: string; source: ReferenceRootRecord["source"]; exists: boolean } {
  for (const candidate of candidates) {
    if (candidate.path && pathExists(candidate.path) && fs.statSync(candidate.path).isDirectory()) {
      return { path: normalizePath(candidate.path), source: candidate.source, exists: true };
    }
  }
  const fallback = candidates.find((candidate) => candidate.path) || { path: "", source: "missing" as const };
  return { path: fallback.path ? normalizePath(fallback.path) : "", source: "missing", exists: false };
}

function firstExistingFile(candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    if (candidate && pathExists(candidate) && fs.statSync(candidate).isFile()) {
      return normalizePath(candidate);
    }
  }
  return normalizePath(fallback);
}

export class ReferenceRegistryService {
  private static cache: ReferenceRegistrySnapshot | null = null;

  static getSnapshot(): ReferenceRegistrySnapshot {
    if (!this.cache) {
      this.cache = {
        design: this.resolveDesignReference(),
        claudeCode: this.resolveClaudeCodeReference()
      };
    }
    return this.cache;
  }

  static clearCacheForTests(): void {
    this.cache = null;
  }

  static getDesignReference(): ReferenceRootRecord {
    return this.getSnapshot().design;
  }

  static getClaudeCodeReference(): ReferenceRootRecord {
    return this.getSnapshot().claudeCode;
  }

  static resolveNamedReference(name: string): string | null {
    const normalized = String(name || "").toLowerCase();
    if (/\bdez\b|design_reference_manifest|design reference manifest/.test(normalized)) {
      return this.getDesignReference().rootPath;
    }
    if (/claude-code|claude_code_reference|agent-reach/.test(normalized)) {
      return this.getClaudeCodeReference().rootPath;
    }
    return null;
  }

  static isReferenceOnlyPath(inputPath: string): boolean {
    if (!inputPath) return false;
    const normalized = normalizePath(inputPath).toLowerCase();
    const references = [this.getDesignReference(), this.getClaudeCodeReference()];
    return references.some((reference) => {
      const roots = [reference.rootPath, reference.manifestPath, reference.indexPath]
        .filter(Boolean)
        .map((item) => normalizePath(item).toLowerCase());
      return roots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
    });
  }

  private static resolveDesignReference(): ReferenceRootRecord {
    const moduleRoot = currentModuleAppRoot();
    const projectRoot = CONFIG.PROJECT_ROOT;
    const resourceRoot = resourcesPath();

    const root = firstExistingDirectory([
      { path: process.env["SAAD_AGENT_DEZ_REFERENCE_ROOT"] || "", source: "environment" },
      { path: resourceRoot ? path.resolve(resourceRoot, "..", "DEZ") : "", source: "electron-resources" },
      { path: path.resolve(moduleRoot, "release-production-v4", "win-unpacked", "DEZ"), source: "module-root" },
      { path: path.resolve(moduleRoot, "DEZ"), source: "module-root" },
      { path: path.resolve(projectRoot, "saad-agent", "release-production-v4", "win-unpacked", "DEZ"), source: "project-root" },
      { path: path.resolve(projectRoot, "release-production-v4", "win-unpacked", "DEZ"), source: "project-root" },
      { path: path.resolve(projectRoot, "DEZ"), source: "project-root" }
    ]);

    const manifestPath = firstExistingFile([
      process.env["SAAD_AGENT_DESIGN_REFERENCE_MANIFEST"] || "",
      path.resolve(moduleRoot, "DESIGN_REFERENCE_MANIFEST.json"),
      path.resolve(projectRoot, "saad-agent", "DESIGN_REFERENCE_MANIFEST.json"),
      path.resolve(projectRoot, "DESIGN_REFERENCE_MANIFEST.json")
    ], path.resolve(moduleRoot, "DESIGN_REFERENCE_MANIFEST.json"));

    const indexPath = firstExistingFile([
      path.resolve(moduleRoot, "DESIGN_REFERENCE_INDEX.md"),
      path.resolve(projectRoot, "saad-agent", "DESIGN_REFERENCE_INDEX.md"),
      path.resolve(projectRoot, "DESIGN_REFERENCE_INDEX.md")
    ], path.resolve(moduleRoot, "DESIGN_REFERENCE_INDEX.md"));

    return {
      id: "dez",
      label: "DEZ design references",
      rootPath: root.path,
      manifestPath,
      indexPath,
      readOnly: true,
      exists: root.exists,
      source: root.source
    };
  }

  private static resolveClaudeCodeReference(): ReferenceRootRecord {
    const moduleRoot = currentModuleAppRoot();
    const projectRoot = CONFIG.PROJECT_ROOT;
    const knownRoot = path.resolve("E:/Agent-Reach-main/claude-code");

    const root = firstExistingDirectory([
      { path: process.env["SAAD_AGENT_CLAUDE_CODE_REFERENCE_ROOT"] || "", source: "environment" },
      { path: knownRoot, source: "known-local" }
    ]);

    const manifestPath = firstExistingFile([
      process.env["SAAD_AGENT_CLAUDE_CODE_REFERENCE_MANIFEST"] || "",
      path.resolve(moduleRoot, "CLAUDE_CODE_REFERENCE_MANIFEST.json"),
      path.resolve(projectRoot, "saad-agent", "CLAUDE_CODE_REFERENCE_MANIFEST.json"),
      path.resolve(projectRoot, "CLAUDE_CODE_REFERENCE_MANIFEST.json")
    ], path.resolve(moduleRoot, "CLAUDE_CODE_REFERENCE_MANIFEST.json"));

    const indexPath = firstExistingFile([
      path.resolve(moduleRoot, "CLAUDE_CODE_REFERENCE_INDEX.md"),
      path.resolve(projectRoot, "saad-agent", "CLAUDE_CODE_REFERENCE_INDEX.md"),
      path.resolve(projectRoot, "CLAUDE_CODE_REFERENCE_INDEX.md")
    ], path.resolve(moduleRoot, "CLAUDE_CODE_REFERENCE_INDEX.md"));

    return {
      id: "claude-code",
      label: "Claude Code architecture reference",
      rootPath: root.path || normalizePath(knownRoot),
      manifestPath,
      indexPath,
      readOnly: true,
      exists: root.exists,
      source: root.source
    };
  }
}

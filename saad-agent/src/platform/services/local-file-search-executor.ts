import * as path from "path";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TrustedWorkspaceRuntime, type WorkspaceSearchResult } from "./trusted-workspace-runtime.js";

interface LocalFileSearchInput {
  taskId: string;
  conversationId: string;
  prompt: string;
  workspacePath?: string;
  limit?: number;
}

interface WorkspaceResultGroup {
  workspaceName: string;
  workspacePath: string;
  results: WorkspaceSearchResult[];
}

const searchMarkers = [
  "بعنوان",
  "باسم",
  "اسمه",
  "اسمها",
  "عنوانه",
  "عنوانها",
  "اسمهه",
  "called",
  "named",
  "title"
];

const removableArabicTerms = [
  "ابحث",
  "ابحثلي",
  "ابحث لي",
  "دور",
  "دورلي",
  "دور لي",
  "فتش",
  "فتشلي",
  "فتش لي",
  "اطلع",
  "طلع",
  "شوف",
  "داخل",
  "في",
  "بالكمبيوتر",
  "الكمبيوتر",
  "الحاسوب",
  "الجهاز",
  "ملف",
  "ملفات",
  "وورد",
  "ورد",
  "بي دي اف",
  "فولدر",
  "مجلد"
];

export class LocalFileSearchExecutor {
  static canHandle(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = (prompt || "").toLowerCase();
    const hasSearchVerb = /(?:^|\s)(?:ابحث|ابحثلي|ابحث لي|دور|دورلي|دور لي|فتش|فتشلي|فتش لي|اطلع|طلع|شوف|find|search|locate)(?:\s|$)/i.test(normalized)
      || /\b(find|search|locate|look for)\b/i.test(lower);
    const hasLocalScope = /(?:كمبيوتر|الحاسوب|الجهاز|قرص|درايف|فولدر|مجلد|مسار|ملف|ملفات|وورد|ورد|docx|doc|pdf|xlsx|صور|screenshots?|desktop|documents|downloads)/i.test(normalized)
      || /[a-z]:[\\/]/i.test(lower)
      || /\b(local|computer|folder|directory|file|files|word|docx|pdf|desktop|documents|downloads)\b/i.test(lower);
    const explicitWeb = /(?:انترنت|الانترنت|الويب|ويب|رابط|روابط|مصادر|latest|current|online|internet|web|links|sources)/i.test(normalized)
      || /\b(internet|web|online|latest|current|links|sources)\b/i.test(lower);
    return hasSearchVerb && hasLocalScope && !explicitWeb;
  }

  static async run(input: LocalFileSearchInput): Promise<{ response: string; groups: WorkspaceResultGroup[]; query: string }> {
    const query = this.extractQuery(input.prompt);
    if (!query) {
      return {
        query,
        groups: [],
        response: "شنو اسم الملف أو النص اللي تريد أفتش عليه؟ اكتبلي الاسم مثل: `وصف الفيديو`."
      };
    }

    if (input.workspacePath) {
      try {
        await TrustedWorkspaceRuntime.ensureDefaultWorkspace(input.workspacePath);
      } catch {
        // If the active path is not usable, continue with already trusted workspaces.
      }
    }

    const store = await TrustedWorkspaceRuntime.loadStore();
    const workspaces = store.workspaces.slice(0, 12);
    if (!workspaces.length) {
      return {
        query,
        groups: [],
        response: [
          "ماكو Trusted Workspace مضبوط حتى أفتش داخله.",
          "أضف الفولدر من لوحة Trusted Workspaces، وبعدها أگدر أبحث داخله وأرجعلك مسارات حقيقية."
        ].join("\n")
      };
    }

    ExecutionTraceEmitter.emit({
      taskId: input.taskId,
      conversationId: input.conversationId,
      phase: "local_workspace_search",
      status: "active",
      label: "Searching trusted workspaces",
      safeDetails: { query, workspaceCount: workspaces.length },
      sourceService: "LocalFileSearchExecutor"
    });

    const groups: WorkspaceResultGroup[] = [];
    const perWorkspaceLimit = Math.max(8, Math.ceil((input.limit || 24) / workspaces.length));
    for (const workspace of workspaces) {
      try {
        const results = await TrustedWorkspaceRuntime.search(workspace.id, query, perWorkspaceLimit);
        if (results.length) {
          groups.push({
            workspaceName: workspace.name,
            workspacePath: workspace.path,
            results
          });
        }
      } catch {
        // Keep searching other trusted roots.
      }
    }

    ExecutionTraceEmitter.emit({
      taskId: input.taskId,
      conversationId: input.conversationId,
      phase: "local_workspace_search",
      status: "done",
      label: "Trusted workspace search completed",
      safeDetails: {
        query,
        matches: groups.reduce((sum, group) => sum + group.results.length, 0)
      },
      sourceService: "LocalFileSearchExecutor"
    });

    return {
      query,
      groups,
      response: this.formatResponse(query, groups)
    };
  }

  private static extractQuery(prompt: string): string {
    const raw = (prompt || "").trim();
    const quoted = raw.match(/["'“”`«»](.+?)["'“”`«»]/)?.[1]?.trim();
    if (quoted) return this.cleanupQuery(quoted);

    const normalized = this.normalizeArabic(raw);
    for (const marker of searchMarkers) {
      const index = normalized.indexOf(this.normalizeArabic(marker));
      if (index >= 0) {
        return this.cleanupQuery(normalized.slice(index + marker.length));
      }
    }

    const pathStripped = normalized.replace(/[a-z]:[\\/][^\r\n]+/ig, " ");
    return this.cleanupQuery(pathStripped);
  }

  private static cleanupQuery(value: string): string {
    let cleaned = this.normalizeArabic(value)
      .replace(/[\\/]+/g, " ")
      .replace(/\b(?:docx?|pdf|xlsx?|pptx?|txt|md|json)\b/gi, " ");
    for (const term of removableArabicTerms) {
      cleaned = cleaned.replace(new RegExp(`(?:^|\\s)${this.escapeRegExp(this.normalizeArabic(term))}(?=\\s|$)`, "g"), " ");
    }
    cleaned = cleaned
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.slice(0, 120);
  }

  private static formatResponse(query: string, groups: WorkspaceResultGroup[]): string {
    const total = groups.reduce((sum, group) => sum + group.results.length, 0);
    if (!total) {
      return [
        `فتشت داخل الـ Trusted Workspaces عن: \`${query}\``,
        "",
        "ما لقيت ملف أو محتوى مطابق.",
        "إذا الملف بمكان ثاني مثل سطح المكتب أو الصور، أضف ذاك الفولدر كـ Trusted Workspace حتى أفتشه فعلياً."
      ].join("\n");
    }

    const lines = [
      `لقيت ${total} نتيجة عن: \`${query}\` داخل الـ Trusted Workspaces:`,
      ""
    ];
    for (const group of groups) {
      lines.push(`Workspace: ${group.workspaceName}`);
      for (const result of group.results.slice(0, 10)) {
        const suffix = result.type === "content" && result.line ? `:${result.line}` : "";
        const preview = result.preview ? ` — ${result.preview}` : "";
        lines.push(`- ${result.relativePath}${suffix}`);
        lines.push(`  ${path.normalize(result.path)}${preview}`);
      }
      lines.push("");
    }
    lines.push("ملاحظة: البحث مقصود داخل المسارات الموثوقة فقط، مو كل الكمبيوتر، حتى ما نلمس ملفات خاصة أو أسرار.");
    return lines.join("\n").trim();
  }

  private static normalizeArabic(input: string): string {
    return (input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u0625\u0623\u0622\u0671]/g, "ا")
      .replace(/\u0649/g, "ي")
      .replace(/\u0629/g, "ه")
      .replace(/[؟?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

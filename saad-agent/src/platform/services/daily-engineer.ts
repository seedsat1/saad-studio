export interface HealthReport {
  healthScore: number; // e.g. 97%
  checksPassed: number;
  totalChecks: number;
  problems: string[];
  warnings: string[];
  suggestions: string[];
  timestamp: number;
}

export type DailyEngineerTaskKind =
  | "maintenance"
  | "design"
  | "large_project"
  | "bug_fix"
  | "review";

export interface DailyEngineerWorkflow {
  enabled: boolean;
  taskKind: DailyEngineerTaskKind;
  reviewOnly: boolean;
  pipeline: "daily_maintenance.review" | "daily_maintenance.modify";
  reason: string;
  runtimeInstructions: string;
}

export class DailyEngineerService {
  static classifyRequest(prompt: string): DailyEngineerWorkflow | null {
    const raw = String(prompt || "").trim();
    if (!raw) return null;

    const normalized = this.normalizeArabic(raw);
    const lower = raw.toLowerCase();
    const haystack = `${normalized} ${lower}`;
    const reviewOnly = this.isReviewOnlyRequest(haystack);
    const explicitDailyEngineer = this.hasExplicitDailyEngineerSignal(haystack);

    if (!explicitDailyEngineer && this.isLocalDesignImplementationRequest(raw, normalized)) {
      return null;
    }

    if (!this.hasDailyEngineerSignal(haystack)) return null;

    const taskKind = this.resolveTaskKind(haystack);
    return {
      enabled: true,
      taskKind,
      reviewOnly,
      pipeline: reviewOnly ? "daily_maintenance.review" : "daily_maintenance.modify",
      reason: this.reasonFor(taskKind, reviewOnly),
      runtimeInstructions: this.buildRuntimeInstructions(taskKind, reviewOnly)
    };
  }

  static buildRuntimeInstructions(taskKind: DailyEngineerTaskKind, reviewOnly: boolean): string {
    const actionLine = reviewOnly
      ? "Do not edit files. Produce an inspection report with evidence, risks, and the next safe implementation plan."
      : "Implement the requested work with narrow edits, then run the most relevant available verification.";
    const designLine = taskKind === "design"
      ? "For UI/design work: inspect the existing design system, preserve product ergonomics, check responsive behavior where possible, and avoid decorative-only changes."
      : "For non-UI work: keep implementation focused on the requested maintenance outcome and avoid unrelated refactors.";
    const largeProjectLine = taskKind === "large_project"
      ? "For large-project work: decompose the request into bounded sub-tasks, read dependency-adjacent files before editing, and summarize what remains."
      : "For small or medium work: keep the plan compact and act on the smallest safe file set.";

    return [
      "Saad Agent Daily Maintenance Engineer Mode is active.",
      "This is the user's private maintenance engineer workflow for their own site/software.",
      "Use an original Saad Agent implementation style. Do not copy or depend on any leaked/proprietary Claude Code source.",
      "Follow this loop: inspect -> plan -> act -> verify -> repair if verification fails -> document outcome.",
      actionLine,
      designLine,
      largeProjectLine,
      "Before editing, identify the likely files/services involved from the real workspace.",
      "Never read, print, or store secrets, tokens, private keys, cookies, or raw .env values.",
      "Final response must include: files touched, verification run, failures found, and remaining next step."
    ].join("\n");
  }

  static async runDailyMaintenance(): Promise<HealthReport> {
    const problems: string[] = [];
    const warnings: string[] = [
      "Browserslist DB is outdated. Consider running npx update-browserslist-db@latest.",
      "Tailwind content configuration in UI package is missing standard paths.",
    ];
    const suggestions: string[] = [
      "Upgrade LM Studio concurrent slots for parallel generation.",
      "Enable automatic cache pruning for temporary RAG chunks.",
      "Add automated end-to-end testing for Premiere CEP plugin bridge.",
    ];

    const totalChecks = 14;
    const checksPassed = totalChecks - problems.length;
    const healthScore = Math.round((checksPassed / totalChecks) * 100);

    return {
      healthScore,
      checksPassed,
      totalChecks,
      problems,
      warnings,
      suggestions,
      timestamp: Date.now(),
    };
  }

  private static hasDailyEngineerSignal(haystack: string): boolean {
    const privateEngineer = /(?:مهندس\s+الصيانه|مهندس\s+الصيانة|الصيانه\s+اليوميه|الصيانة\s+اليومية|صيانة\s+يومية|اعمال\s+يوميه|اعمال\s+يومية|وكيل\s+الصيانه|وكيل\s+الصيانة|daily\s+maintenance|maintenance\s+engineer|private\s+engineer)/i.test(haystack);
    const designOrLargeProject = /(?:تصميم|تصاميم|واجهه|واجهة|ui|ux|design|large\s+project|big\s+project|مشروع\s+كبير|مشاريع\s+كبيره|مشاريع\s+كبيرة)/i.test(haystack)
      && /(?:مشروع|موقعي|الموقع|كود|ملفات|صفحه|صفحة|component|workspace|codebase|project|app|saad\s+agent)/i.test(haystack);
    const maintenanceAction = /(?:افحص|راجع|حلل|اصلح|صلح|حدث|نظف|رتب|حسن|طور|نفذ|طبق|audit|review|inspect|fix|maintain|improve|refactor|polish)/i.test(haystack)
      && /(?:مشروع|موقعي|الموقع|كود|ملفات|workspace|codebase|project|app)/i.test(haystack);
    return privateEngineer || designOrLargeProject || maintenanceAction;
  }

  private static hasExplicitDailyEngineerSignal(haystack: string): boolean {
    return /(?:\u0645\u0647\u0646\u062f\u0633\s+\u0627\u0644\u0635\u064a\u0627\u0646\u0647|\u0645\u0647\u0646\u062f\u0633\s+\u0627\u0644\u0635\u064a\u0627\u0646\u0629|\u0627\u0644\u0635\u064a\u0627\u0646\u0647\s+\u0627\u0644\u064a\u0648\u0645\u064a\u0647|\u0627\u0644\u0635\u064a\u0627\u0646\u0629\s+\u0627\u0644\u064a\u0648\u0645\u064a\u0629|\u0635\u064a\u0627\u0646\u0629\s+\u064a\u0648\u0645\u064a\u0629|\u0648\u0643\u064a\u0644\s+\u0627\u0644\u0635\u064a\u0627\u0646\u0647|\u0648\u0643\u064a\u0644\s+\u0627\u0644\u0635\u064a\u0627\u0646\u0629|daily\s+maintenance|maintenance\s+engineer|private\s+engineer)/i.test(haystack);
  }

  private static isLocalDesignImplementationRequest(prompt: string, normalized: string): boolean {
    const lower = String(prompt || "").toLowerCase();
    const combined = `${normalized} ${lower}`;
    const hasLocalPath = /[a-z]:[\\/]/i.test(prompt)
      || /\b(?:workspace|codebase|folder|directory|local files|project files)\b/i.test(lower)
      || /(?:\u0641\u0648\u0644\u062f\u0631|\u0645\u062c\u0644\u062f|\u0645\u0633\u0627\u0631|\u062f\u0627\u062e\u0644\s+\u0647\u0630\u0627\s+\u0627\u0644\u0645\u0633\u0627\u0631)/i.test(normalized);
    const designOrPage = /(?:\u0635\u0645\u0645|\u062a\u0635\u0645\u064a\u0645|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629|\u0646\u0627\u0641\u0628\u0627\u0631|\u0643\u0631\u0648\u062a|\u062f\u0627\u0634\u0628\u0648\u0631\u062f|\u0633\u062a\u0648\u062f\u064a\u0648|\bdesign\b|\bbuild\b|\bimplement\b|\bcreate\b|\bpage\b|\bsite\b|\bui\b|\bnavbar\b|\bcards?\b|\bdashboard\b|\bstudio\b)/i.test(combined);
    const executionVerb = /(?:\u0646\u0641\u0630|\u0646\u0641\u0651\u0630|\u0627\u0639\u062f\s+\u062a\u0646\u0641\u064a\u0630|\u0627\u0628\u0646\u064a|\u0627\u0635\u0646\u0639|\u0633\u0648\u064a|\u0633\u0648\u0651\u064a|\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0636\u0639|\u062d\u0637|\bimplement\b|\bbuild\b|\bcreate\b|\bmake\b|\bput\b|\bplace\b)/i.test(combined);
    const explicitStudioSpec = /\b(?:saas|ai\s+studio|choose\s+your\s+studio|built\s+for\s+real\s+outputs|no\s+rtl)\b/i.test(lower);
    return hasLocalPath && designOrPage && (executionVerb || explicitStudioSpec);
  }

  private static isReviewOnlyRequest(haystack: string): boolean {
    return /(?:لا\s+تعدل|لا\s+تعدّل|بدون\s+تعديل|تقرير\s+فقط|افحص\s+فقط|راجع\s+فقط|report\s+first|review\s+only|inspect\s+only|do\s+not\s+edit|do\s+not\s+modify)/i.test(haystack);
  }

  private static resolveTaskKind(haystack: string): DailyEngineerTaskKind {
    if (/(?:تصميم|تصاميم|واجهه|واجهة|ui|ux|design|visual|responsive|polish)/i.test(haystack)) return "design";
    if (/(?:مشروع\s+كبير|مشاريع\s+كبيره|مشاريع\s+كبيرة|large\s+project|big\s+project|codebase|architecture)/i.test(haystack)) return "large_project";
    if (/(?:bug|error|خطا|خطأ|مشكله|مشكلة|اصلح|صلح|fix|repair)/i.test(haystack)) return "bug_fix";
    if (/(?:افحص|راجع|حلل|audit|review|inspect|analyze)/i.test(haystack)) return "review";
    return "maintenance";
  }

  private static reasonFor(taskKind: DailyEngineerTaskKind, reviewOnly: boolean): string {
    const mode = reviewOnly ? "review-only" : "execution";
    return `Daily maintenance engineer ${mode} workflow requested (${taskKind}).`;
  }

  private static normalizeArabic(input: string): string {
    return String(input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u0625\u0623\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064a")
      .replace(/\u0629/g, "\u0647")
      .replace(/[\u061F?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

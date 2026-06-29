export type SupportedTool = "Filesystem" | "Git" | "Terminal" | "Browser" | "Brave" | "MCP" | "Docker" | "Node" | "Supabase";

export interface ToolSelectionResult {
  taskPrompt: string;
  selectedTools: SupportedTool[];
  rationale: string;
}

export class ToolOrchestratorService {
  static selectToolsForTask(prompt: string, intent?: string): ToolSelectionResult {
    const clean = prompt.toLowerCase();
    const selected: SupportedTool[] = ["Filesystem"];

    const isWebIntent = intent === "internet_answers" || intent === "web_search" || clean.includes("آخر تحديث") || clean.includes("أحدث تحديث") || clean.includes("انترنت") || clean.includes("إنترنت");
    const isWorkspaceIntent = intent === "workspace_question" || clean.includes("مشروع") || clean.includes("صفحة") || clean.includes("credits") || clean.includes("gallery");

    if (isWebIntent && !isWorkspaceIntent) {
      selected.push("Brave");
      selected.push("Browser");
    }

    if (clean.includes("git") || clean.includes("commit") || clean.includes("branch") || clean.includes("push")) {
      selected.push("Git");
    }

    if (clean.includes("build") || clean.includes("test") || clean.includes("npm") || clean.includes("run") || clean.includes("terminal") || clean.includes("موديل")) {
      selected.push("Terminal");
      selected.push("Node");
    }

    if (clean.includes("db") || clean.includes("database") || clean.includes("supabase") || clean.includes("table")) {
      selected.push("Supabase");
    }

    return {
      taskPrompt: prompt,
      selectedTools: Array.from(new Set(selected)),
      rationale: `Selected ${selected.length} tools dynamically based on intent (${intent || "auto"}).`,
    };
  }
}

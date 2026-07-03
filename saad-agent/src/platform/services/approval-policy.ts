import * as fsp from "fs/promises";
import * as path from "path";
import { getGlobalAppDataDir } from "../workspace-manager.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";

export type ApprovalMode = "ask" | "approve_for_me" | "full_access";
export type ApprovalRisk = "safe" | "medium" | "high";
export type ApprovalAction =
  | "read_file"
  | "write_file"
  | "delete_file"
  | "search_workspace"
  | "run_command"
  | "use_internet"
  | "use_git"
  | "import_knowledge"
  | "open_local_path"
  | "install_package";

export interface ApprovalActionContext {
  mode?: ApprovalMode | undefined;
  conversationId?: string | undefined;
  taskId?: string | undefined;
  action: ApprovalAction;
  command?: string | undefined;
  files?: string[] | undefined;
  paths?: string[] | undefined;
  reason?: string | undefined;
  approved?: boolean | undefined;
  alwaysAllow?: boolean | undefined;
}

export interface ApprovalRequest {
  requiresApproval: true;
  action: string;
  risk: ApprovalRisk;
  reason: string;
  command?: string | undefined;
  files: string[];
}

export interface ApprovalDecision {
  allowed: boolean;
  requiresApproval: boolean;
  risk: ApprovalRisk;
  reason: string;
  request?: ApprovalRequest;
}

interface ApprovalStore {
  version: number;
  conversationModes: Record<string, ApprovalMode>;
  alwaysAllow: Record<string, string[]>;
}

const defaultMode: ApprovalMode = "approve_for_me";
const safeCommands = new Set(["npm run build", "npm run typecheck", "npm run lint", "npm test", "git status", "git diff"]);
const gitCommands = new Set(["git status", "git diff", "git add", "git commit", "git push", "git reset"]);

export class ApprovalPolicyService {
  private static async storePath(): Promise<string> {
    const appData = await getGlobalAppDataDir();
    return path.join(appData, "approval-policy.json");
  }

  private static async auditPath(): Promise<string> {
    const appData = await getGlobalAppDataDir();
    return path.join(appData, "approval-audit-log.jsonl");
  }

  static normalizeMode(mode?: string): ApprovalMode {
    if (mode === "approve_for_me" || mode === "full_access" || mode === "ask") return mode;
    return defaultMode;
  }

  static async loadStore(): Promise<ApprovalStore> {
    const storePath = await this.storePath();
    try {
      const parsed = JSON.parse(await fsp.readFile(storePath, "utf8"));
      return {
        version: 1,
        conversationModes: parsed?.conversationModes || {},
        alwaysAllow: parsed?.alwaysAllow || {}
      };
    } catch {
      return { version: 1, conversationModes: {}, alwaysAllow: {} };
    }
  }

  static async saveStore(store: ApprovalStore): Promise<void> {
    try {
      const storePath = await this.storePath();
      await fsp.mkdir(path.dirname(storePath), { recursive: true });
      await fsp.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Approval policy store persistence skipped; continuing with runtime policy: ${message}`);
    }
  }

  static async setConversationMode(conversationId: string | undefined, mode: ApprovalMode): Promise<void> {
    if (!conversationId) return;
    const store = await this.loadStore();
    store.conversationModes[conversationId] = this.normalizeMode(mode);
    await this.saveStore(store);
  }

  static async getConversationMode(conversationId: string | undefined, fallback?: ApprovalMode): Promise<ApprovalMode> {
    const store = await this.loadStore();
    return this.normalizeMode((conversationId && store.conversationModes[conversationId]) || fallback);
  }

  static async rememberAlwaysAllow(conversationId: string | undefined, action: ApprovalAction): Promise<void> {
    if (!conversationId) return;
    const store = await this.loadStore();
    const existing = new Set(store.alwaysAllow[conversationId] || []);
    existing.add(action);
    store.alwaysAllow[conversationId] = Array.from(existing);
    await this.saveStore(store);
  }

  static isDangerousAction(context: ApprovalActionContext): boolean {
    if (context.files?.some((file) => TrustedWorkspaceRuntime.isSensitivePath(file))) return true;
    if (context.paths?.some((file) => TrustedWorkspaceRuntime.isSensitivePath(file))) return true;
    if (context.action === "delete_file" || context.action === "install_package") return true;
    if (context.action === "use_git" && /push|reset/i.test(context.command || "")) return true;
    if (context.action === "run_command") {
      const command = context.command || "";
      if (command === "codex exec") return false;
      if (/npm\s+install|pnpm\s+add|yarn\s+add|git\s+reset|git\s+push|rm\s|del\s|format\s|powershell|cmd\s/i.test(command)) return true;
      return !safeCommands.has(command);
    }
    return false;
  }

  static riskFor(context: ApprovalActionContext): ApprovalRisk {
    if (this.isDangerousAction(context)) return "high";
    if (context.action === "write_file" || context.action === "use_internet" || context.action === "import_knowledge") return "medium";
    if (context.action === "run_command" && context.command === "codex exec") return "medium";
    if (context.action === "use_git" && !safeCommands.has(context.command || "")) return "medium";
    return "safe";
  }

  static async requiresApproval(context: ApprovalActionContext): Promise<boolean> {
    const mode = await this.getConversationMode(context.conversationId, context.mode);
    const store = await this.loadStore();
    const action = context.action;
    const alwaysAllowed = Boolean(context.conversationId && store.alwaysAllow[context.conversationId]?.includes(action));
    if (context.approved || alwaysAllowed) return false;
    if (mode === "full_access") {
      return this.hasSensitiveTarget(context);
    }
    if (mode === "ask") {
      return ["write_file", "delete_file", "run_command", "use_internet", "use_git", "import_knowledge", "install_package"].includes(action);
    }
    return this.isDangerousAction(context);
  }

  static async evaluate(context: ApprovalActionContext): Promise<ApprovalDecision> {
    const files = [...(context.files || []), ...(context.paths || [])].filter(Boolean);
    const traceTaskId = context.taskId || `policy-${Date.now()}`;

    if (context.conversationId) {
      ExecutionTraceEmitter.emit({
        conversationId: context.conversationId,
        taskId: traceTaskId,
        phase: "safety_check",
        status: "active",
        label: `Checking execution policy for ${context.action}`,
        sourceService: "ApprovalPolicyService"
      });
    }

    if (this.hasSensitiveTarget(context)) {
      const decision: ApprovalDecision = {
        allowed: false,
        requiresApproval: false,
        risk: "high",
        reason: "Secrets and credential-looking paths are blocked in every approval mode."
      };
      if (context.conversationId) {
        ExecutionTraceEmitter.emit({
          conversationId: context.conversationId,
          taskId: traceTaskId,
          phase: "safety_check",
          status: "failed",
          label: "Execution policy blocked target (sensitive credentials)",
          safeDetails: {
            action: context.action,
            risk: decision.risk,
            reason: decision.reason
          },
          sourceService: "ApprovalPolicyService"
        });
      }
      return decision;
    }

    const risk = this.riskFor(context);
    const requiresApproval = await this.requiresApproval(context);
    const reason = context.reason || this.reasonFor(context, risk, requiresApproval);
    if (requiresApproval) {
      const decision: ApprovalDecision = {
        allowed: false,
        requiresApproval: true,
        risk,
        reason,
        request: {
          requiresApproval: true,
          action: context.action,
          risk,
          reason,
          command: context.command,
          files
        }
      };

      if (context.conversationId) {
        ExecutionTraceEmitter.emit({
          conversationId: context.conversationId,
          taskId: traceTaskId,
          phase: "safety_check",
          status: "pending",
          label: `Approval required for ${context.action}`,
          safeDetails: {
            action: context.action,
            risk,
            reason
          },
          sourceService: "ApprovalPolicyService"
        });
      }
      return decision;
    }

    const decision: ApprovalDecision = { allowed: true, requiresApproval: false, risk, reason };

    if (context.conversationId) {
      ExecutionTraceEmitter.emit({
        conversationId: context.conversationId,
        taskId: traceTaskId,
        phase: "safety_check",
        status: "done",
        label: `Execution policy check completed: Allowed`,
        safeDetails: {
          action: context.action,
          allowed: true,
          risk
        },
        sourceService: "ApprovalPolicyService"
      });
    }

    return decision;
  }

  static async assertAllowed(context: ApprovalActionContext): Promise<ApprovalDecision> {
    const decision = await this.evaluate(context);
    await this.logAction(context, decision, decision.allowed);
    if (!decision.allowed) {
      if (decision.request) return decision;
      throw new Error(decision.reason);
    }
    return decision;
  }

  static async canReadFile(context: Omit<ApprovalActionContext, "action">) {
    return this.evaluate({ ...context, action: "read_file" });
  }

  static async canWriteFile(context: Omit<ApprovalActionContext, "action">) {
    return this.evaluate({ ...context, action: "write_file" });
  }

  static async canDeleteFile(context: Omit<ApprovalActionContext, "action">) {
    return this.evaluate({ ...context, action: "delete_file" });
  }

  static async canRunCommand(context: Omit<ApprovalActionContext, "action">) {
    const command = context.command || "";
    const action: ApprovalAction = gitCommands.has(command) ? "use_git" : "run_command";
    return this.evaluate({ ...context, action });
  }

  static async canUseInternet(context: Omit<ApprovalActionContext, "action">) {
    return this.evaluate({ ...context, action: "use_internet" });
  }

  static async canUseGit(context: Omit<ApprovalActionContext, "action">) {
    return this.evaluate({ ...context, action: "use_git" });
  }

  static async logAction(context: ApprovalActionContext, decision: ApprovalDecision, approved: boolean, result?: string): Promise<void> {
    try {
      const auditPath = await this.auditPath();
      await fsp.mkdir(path.dirname(auditPath), { recursive: true });
      const mode = await this.getConversationMode(context.conversationId, context.mode);
      const entry = {
        timestamp: new Date().toISOString(),
        approvalMode: mode,
        conversationId: context.conversationId,
        action: context.action,
        risk: decision.risk,
        approved,
        filesAffected: context.files || context.paths || [],
        command: context.command,
        result: result || decision.reason
      };
      await fsp.appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Approval audit logging skipped; action decision was still returned: ${message}`);
    }
  }

  private static hasSensitiveTarget(context: ApprovalActionContext): boolean {
    return Boolean(context.files?.some((file) => TrustedWorkspaceRuntime.isSensitivePath(file))
      || context.paths?.some((file) => TrustedWorkspaceRuntime.isSensitivePath(file)));
  }

  private static reasonFor(context: ApprovalActionContext, risk: ApprovalRisk, requiresApproval: boolean): string {
    if (!requiresApproval) return `${context.action} is allowed by the current approval mode.`;
    if (risk === "high") return `${context.action} is high risk and requires explicit approval.`;
    if (context.action === "use_internet") return "Internet access requires approval in the current mode.";
    if (context.action === "import_knowledge") return "Knowledge import writes persistent training data and requires approval in the current mode.";
    return `${context.action} requires approval in the current mode.`;
  }
}

import { execFile } from "child_process";
import { promisify } from "util";
import { ApprovalPolicyService, type ApprovalMode, type ApprovalRequest } from "./approval-policy.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";

const execFileAsync = promisify(execFile);

export interface CodexRuntimeBridgeRequest {
  taskId: string;
  conversationId: string;
  workspacePath: string;
  prompt: string;
  approvalMode?: ApprovalMode | undefined;
  approved?: boolean | undefined;
  timeoutMs?: number | undefined;
  sandboxMode?: "read-only" | "workspace-write" | undefined;
}

export interface CodexRuntimeBridgeResult {
  success: boolean;
  available: boolean;
  command: string;
  args: string[];
  cwd: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode?: number;
  error?: string;
  approvalRequest?: ApprovalRequest;
}

function redactOutput(value: string): string {
  return (value || "")
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[REDACTED_OPENAI_KEY]")
    .replace(/(api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*[:=]\s*[^\s"'`,}]+/gi, "$1=[REDACTED]")
    .slice(0, 24000);
}

function normalizeCodexError(message: string): string {
  if (/access is denied|spawn EPERM|operation not permitted/i.test(message)) {
    return [
      "Codex CLI موجود، لكن Windows رفض تشغيله من عملية Saad Agent الحالية: Access is denied.",
      "هذا يعني الربط وصل لطبقة التشغيل فعليًا، لكن executable الحالي غير قابل للاستدعاء كـ child process.",
      "الحل العملي: تثبيت Codex CLI/SDK بنسخة قابلة للتنفيذ من Node أو ضبط SAAD_AGENT_CODEX_PATH على executable صالح."
    ].join("\n");
  }
  if (/ENOENT|not found|cannot find/i.test(message)) {
    return [
      "Codex CLI غير متاح لهذا التطبيق.",
      "ثبّت Codex CLI أو اضبط SAAD_AGENT_CODEX_PATH على مسار codex executable صالح."
    ].join("\n");
  }
  return message;
}

export class CodexRuntimeBridge {
  static command(): string {
    return process.env.SAAD_AGENT_CODEX_PATH || "codex";
  }

  static async runTask(request: CodexRuntimeBridgeRequest): Promise<CodexRuntimeBridgeResult> {
    const startedAt = Date.now();
    const cwd = await TrustedWorkspaceRuntime.assertTrustedPath(request.workspacePath);
    const command = this.command();
    const sandboxMode = request.sandboxMode || "read-only";
    const displayCommand = `codex exec (${sandboxMode})`;

    const approval = await ApprovalPolicyService.evaluate({
      mode: request.approvalMode,
      conversationId: request.conversationId,
      taskId: request.taskId,
      approved: request.approved,
      action: "run_command",
      command: "codex exec",
      paths: [cwd],
      reason: "Running the Codex runtime can inspect the trusted workspace and must pass Saad Agent approval policy."
    });

    if (approval.request) {
      return {
        success: false,
        available: true,
        command,
        args: [],
        cwd,
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: "",
        approvalRequest: approval.request
      };
    }

    await ApprovalPolicyService.logAction({
      mode: request.approvalMode,
      conversationId: request.conversationId,
      taskId: request.taskId,
      action: "run_command",
      command: "codex exec",
      paths: [cwd]
    }, approval, true, "codex runtime bridge allowed");

    ExecutionTraceEmitter.emit({
      taskId: request.taskId,
      conversationId: request.conversationId,
      phase: "codex_runtime",
      status: "active",
      label: "Starting Codex runtime bridge",
      safeDetails: {
        command: displayCommand,
        cwd,
        sandboxMode
      },
      sourceService: "CodexRuntimeBridge"
    });

    const args = [
      "exec",
      "--json",
      "--sandbox",
      sandboxMode,
      "--ask-for-approval",
      "never",
      "--cwd",
      cwd,
      request.prompt
    ];

    try {
      const result = await execFileAsync(command, args, {
        cwd,
        windowsHide: true,
        timeout: request.timeoutMs || 180000,
        maxBuffer: 1024 * 1024 * 12,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          USERPROFILE: process.env.USERPROFILE,
          APPDATA: process.env.APPDATA,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          SAAD_AGENT_CHILD_PROCESS: "codex-runtime-bridge"
        }
      });

      const stdout = redactOutput(result.stdout || "");
      const stderr = redactOutput(result.stderr || "");

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "done",
        label: "Codex runtime completed",
        safeDetails: {
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
          durationMs: Date.now() - startedAt
        },
        sourceService: "CodexRuntimeBridge"
      });

      return {
        success: true,
        available: true,
        command,
        args: args.slice(0, -1).concat("[PROMPT]"),
        cwd,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr
      };
    } catch (err: any) {
      const stdout = redactOutput(err?.stdout || "");
      const stderr = redactOutput(err?.stderr || "");
      const error = normalizeCodexError(err?.message || String(err));

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "failed",
        label: "Codex runtime failed",
        error,
        safeDetails: {
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
          durationMs: Date.now() - startedAt
        },
        sourceService: "CodexRuntimeBridge"
      });

      return {
        success: false,
        available: !/ENOENT|not found|cannot find/i.test(err?.message || ""),
        command,
        args: args.slice(0, -1).concat("[PROMPT]"),
        cwd,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        exitCode: typeof err?.code === "number" ? err.code : undefined,
        error
      };
    }
  }
}

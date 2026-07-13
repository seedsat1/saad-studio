import { execFile } from "child_process";
import { promisify } from "util";
import { ApprovalPolicyService, type ApprovalMode, type ApprovalRequest } from "./approval-policy.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";
import { SettingsManager } from "../../production/settings-manager.js";
import { existsSync } from "fs";

function execFileWithClosedStdin(
  command: string,
  args: string[],
  options: any
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      ...options,
      stdio: ["pipe", "pipe", "pipe"]
    }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { 
          stdout: String(stdout || ""), 
          stderr: String(stderr || "") 
        }));
      } else {
        resolve({ 
          stdout: String(stdout || ""), 
          stderr: String(stderr || "") 
        });
      }
    });

    if (child.stdin) {
      child.stdin.end();
    }
  });
}

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
  const extracted = extractRuntimeErrorMessage(message);
  if (extracted && extracted !== message) {
    return normalizeCodexError(extracted);
  }
  if (/operation not allowed/i.test(message)) {
    return [
      "تعذر تشغيل مهمة الصيانة لأن مزود النموذج المحلي رفض العملية: Operation not allowed.",
      "Ollama يعمل، لكن جسر Pi/Codex لم يحصل على سماح أو إعداد مزود صحيح لتنفيذ طلب LLM/Tools.",
      "الحل: تأكد أن نموذج Coding مضبوط على Ollama ونموذج موجود، ثم أعد المحاولة. إذا استمر الخطأ استخدم وضع Ask للموافقة اليدوية أو بدّل Coding إلى نموذج آخر."
    ].join("\n");
  }
  if (/cloud-only provider policy|configured Cloud provider|Local providers such as LM Studio/i.test(message)) {
    return [
      "Local-first model policy is active.",
      "The current Coding provider is not fully configured as a callable local/runtime model.",
      "Configure LM Studio, Ollama, or Saad Local Direct in Settings > Providers, run Discover / Fetch Models, then select a discovered model in Settings > Models.",
      "No files were modified."
    ].join("\n");
  }
  if (/unknown provider\s+["']?ollama["']?|pi\/codex runtime does not support ollama/i.test(message)) {
    return [
      "Pi/Codex runtime does not support Ollama as a direct provider for engineering tool execution.",
      "Ollama can stay enabled for Chat, but Coding execution through Pi should use LM Studio, or Saad Local Direct with a real llama-server.exe and GGUF model.",
      "No files were modified."
    ].join("\n");
  }
  const unknownProviderMatch = message.match(/unknown provider\s+["']?([^"'\s.]+)["']?/i);
  if (unknownProviderMatch) {
    const providerName = unknownProviderMatch[1] || "selected-provider";
    return [
      `Pi/Codex runtime does not recognize provider "${providerName}" for engineering tool execution.`,
      `Run pi --list-models and confirm the provider appears there. If Pi reports a models.json parse error, repair C:\\Users\\PC\\.pi\\agent\\models.json first.`,
      "No files were modified."
    ].join("\n");
  }
  if (/access is denied|spawn EPERM|operation not permitted/i.test(message)) {
    return [
      "خطأ تشغيل: Windows رفض تشغيل عملية التشفير/الترميز من Saad Agent: Access is denied.",
      "هذا يعني المجلد أو ملف التنفيذ غير قابل للاستدعاء كـ child process.",
      "الحل العملي: ضبط صلاحيات التنفيذ أو ضبط SAAD_AGENT_CODEX_PATH على executable صالح."
    ].join("\n");
  }
  if (/ENOENT|not found|cannot find/i.test(message)) {
    return [
      "مساعد البرمجة (Pi/Codex CLI) غير متاح في هذا النظام.",
      "تأكد من تثبيته أو ضبط SAAD_AGENT_CODEX_PATH على المسار الصحيح."
    ].join("\n");
  }
  return message;
}

function extractRuntimeErrorMessage(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  const tryParse = (candidate: string): any => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };
  const direct = tryParse(text);
  const payload = direct || tryParse((text.match(/\{[\s\S]*\}/)?.[0] || ""));
  if (!payload) return text;
  const firstMessage = payload?.error?.message || payload?.message || payload?.error;
  if (typeof firstMessage === "string") {
    const nested = tryParse(firstMessage.trim());
    if (nested) return extractRuntimeErrorMessage(JSON.stringify(nested));
    return firstMessage.trim();
  }
  return text;
}

export class CodexRuntimeBridge {
  static command(): string {
    if (process.env.SAAD_AGENT_CODEX_PATH) {
      return process.env.SAAD_AGENT_CODEX_PATH;
    }
    const userProfile = process.env.USERPROFILE || "";
    if (userProfile) {
      const npmGlobalPi = `${userProfile}\\AppData\\Roaming\\npm\\pi.cmd`;
      if (existsSync(npmGlobalPi)) {
        return npmGlobalPi;
      }
    }
    return "pi";
  }

  static async runTask(request: CodexRuntimeBridgeRequest): Promise<CodexRuntimeBridgeResult> {
    const startedAt = Date.now();
    const cwd = await TrustedWorkspaceRuntime.assertTrustedPath(request.workspacePath);
    const command = this.command();
    const isPi = command === "pi" || command.endsWith("pi") || command.endsWith("pi.cmd") || command.endsWith("pi.exe");
    const sandboxMode = request.sandboxMode || "read-only";
    const displayCommand = isPi ? `pi exec (${sandboxMode})` : `codex exec (${sandboxMode})`;

    const approval = await ApprovalPolicyService.evaluate({
      mode: request.approvalMode,
      conversationId: request.conversationId,
      taskId: request.taskId,
      approved: request.approved,
      action: "run_command",
      command: isPi ? "pi exec" : "codex exec",
      paths: [cwd],
      reason: "Running the coding runtime can inspect the trusted workspace and must pass Saad Agent approval policy."
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
      command: isPi ? "pi exec" : "codex exec",
      paths: [cwd]
    }, approval, true, "coding runtime bridge allowed");

    ExecutionTraceEmitter.emit({
      taskId: request.taskId,
      conversationId: request.conversationId,
      phase: "codex_runtime",
      status: "active",
      label: isPi ? "Starting Pi runtime bridge" : "Starting Codex runtime bridge",
      safeDetails: {
        command: displayCommand,
        cwd,
        sandboxMode
      },
      sourceService: "CodexRuntimeBridge"
    });

    let piProvider = "";
    let piModel = "";
    let unsupportedPiProvider = "";

    try {
      const runtime = await SettingsManager.getModelRuntime("Coding");
      const providerId = runtime.provider.id === "gemini" ? "google" : runtime.provider.id;
      if (providerId === "lm-studio") {
        piProvider = "lm-studio";
        piModel = runtime.model.modelName;
      } else if (runtime.provider.type === "local") {
        unsupportedPiProvider = runtime.provider.id;
      } else if (["google", "openai", "anthropic", "deepseek", "groq", "openrouter"].includes(providerId)) {
        piProvider = providerId;
        piModel = runtime.model.modelName;
      } else {
        unsupportedPiProvider = runtime.provider.id;
      }
    } catch (err: any) {
      const error = normalizeCodexError(err?.message || String(err));
      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "failed",
        label: "Model runtime setup required",
        error,
        safeDetails: {
          durationMs: Date.now() - startedAt
        },
        sourceService: "CodexRuntimeBridge"
      });
      return {
        success: false,
        available: true,
        command,
        args: ["-p", "--tools", sandboxMode === "read-only" ? "read,grep,find,ls" : "read,bash,edit,write,grep,find,ls", "[PROMPT]"],
        cwd,
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: "",
        error
      };
    }

    if (unsupportedPiProvider) {
      const error = normalizeCodexError(`Unknown provider "${unsupportedPiProvider}". Pi/Codex runtime cannot use this provider for engineering tool execution.`);
      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "failed",
        label: "Pi runtime provider unsupported",
        error,
        safeDetails: {
          provider: unsupportedPiProvider,
          durationMs: Date.now() - startedAt
        },
        sourceService: "CodexRuntimeBridge"
      });
      return {
        success: false,
        available: true,
        command,
        args: ["-p", "--tools", sandboxMode === "read-only" ? "read,grep,find,ls" : "read,bash,edit,write,grep,find,ls", "[PROMPT]"],
        cwd,
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: "",
        error
      };
    }

    const piTools = sandboxMode === "read-only" 
      ? "read,grep,find,ls" 
      : "read,bash,edit,write,grep,find,ls";

    const args = isPi ? [
      "-p",
      "--tools", piTools,
      ...(piProvider ? ["--provider", piProvider] : []),
      ...(piModel ? ["--model", piModel] : []),
      request.prompt
    ] : [
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

    const childEnv: Record<string, string> = {
      PATH: process.env.PATH || "",
      SystemRoot: process.env.SystemRoot || "",
      USERPROFILE: process.env.USERPROFILE || "",
      APPDATA: process.env.APPDATA || "",
      LOCALAPPDATA: process.env.LOCALAPPDATA || "",
      SAAD_AGENT_CHILD_PROCESS: "codex-runtime-bridge"
    };

    try {
      const settings = await SettingsManager.getSettings();
      if (settings && Array.isArray(settings.providers)) {
        for (const provider of settings.providers) {
          const apiKey = await SettingsManager.getProviderApiKey(provider);
          if (apiKey) {
            const envVarName = `${provider.id.toUpperCase().replace(/-/g, "_")}_API_KEY`;
            childEnv[envVarName] = apiKey;
            if (envVarName === "GOOGLE_API_KEY") {
              childEnv["GEMINI_API_KEY"] = apiKey;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load provider API keys in CodexRuntimeBridge:", e);
    }

    let execCommand = command;
    let execArgs = args;
    let useShell = process.platform === "win32";

    if (isPi) {
      const userProfile = process.env.USERPROFILE || "";
      const npmGlobalCli = `${userProfile}\\AppData\\Roaming\\npm\\node_modules\\@earendil-works\\pi-coding-agent\\dist\\cli.js`;
      if (existsSync(npmGlobalCli)) {
        execCommand = "node";
        execArgs = [npmGlobalCli].concat(args);
        useShell = false;
      }
    }

    try {
      const result = await execFileWithClosedStdin(execCommand, execArgs, {
        cwd,
        windowsHide: true,
        timeout: request.timeoutMs || 180000,
        maxBuffer: 1024 * 1024 * 12,
        env: childEnv,
        shell: useShell
      });

      const stdout = redactOutput(String(result.stdout || ""));
      const stderr = redactOutput(String(result.stderr || ""));
      const runtimeError = extractRuntimeErrorMessage(stdout || stderr);
      if (/operation not allowed|llm_call_failed/i.test(`${stdout}\n${stderr}\n${runtimeError}`)) {
        const error = normalizeCodexError(runtimeError || stdout || stderr);
        ExecutionTraceEmitter.emit({
          taskId: request.taskId,
          conversationId: request.conversationId,
          phase: "codex_runtime",
          status: "failed",
          label: isPi ? "Pi runtime failed" : "Codex runtime failed",
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
          available: true,
          command,
          args: args.slice(0, -1).concat("[PROMPT]"),
          cwd,
          durationMs: Date.now() - startedAt,
          stdout,
          stderr,
          error
        };
      }

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "done",
        label: isPi ? "Pi runtime completed" : "Codex runtime completed",
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
      const stdout = redactOutput(String(err?.stdout || ""));
      const stderr = redactOutput(String(err?.stderr || ""));
      const error = normalizeCodexError(err?.message || String(err));

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "codex_runtime",
        status: "failed",
        label: isPi ? "Pi runtime failed" : "Codex runtime failed",
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

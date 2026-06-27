import { exec } from "child_process";
import { promisify } from "util";
import { ToolManager } from "../services/tool-manager.js";
import type { Tool } from "../services/tool-manager.js";
import { EventBus } from "../services/event-bus.js";
import { CONFIG } from "../../config.js";

const execAsync = promisify(exec);

function parseTestOutput(output: string): { passed: number; failed: number; skipped: number } {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Regex scanners for common test runners (Jest, Vitest, Mocha)
  const passedMatch = output.match(/(\d+)\s+passed/i);
  const failedMatch = output.match(/(\d+)\s+failed/i);
  const skippedMatch = output.match(/(\d+)\s+skipped/i);

  if (passedMatch && passedMatch[1]) {
    passed = parseInt(passedMatch[1], 10);
  }
  if (failedMatch && failedMatch[1]) {
    failed = parseInt(failedMatch[1], 10);
  }
  if (skippedMatch && skippedMatch[1]) {
    skipped = parseInt(skippedMatch[1], 10);
  }

  // Fallback checks (e.g. "x tests completed successfully")
  if (passed === 0 && failed === 0) {
    if (output.includes("successfully") || output.includes("completed successfully")) {
      passed = 1;
    }
  }

  return { passed, failed, skipped };
}

export const TestTool: Tool = {
  definition: {
    name: "test-tool",
    description: "Run automated tests (e.g. npm test) and capture test outcomes (passed/failed counts) and run durations.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string" }, // Default: 'npm test'
      },
      required: [],
    },
    permissions: ["execute"],
    approvalRequired: false,
  },

  async execute(args: { command?: string }): Promise<any> {
    const testCommand = args.command || "npm test";
    const startTime = Date.now();

    await EventBus.publish("test:started", { command: testCommand });

    try {
      const { stdout, stderr } = await execAsync(testCommand, { cwd: CONFIG.PROJECT_ROOT });
      const duration = Date.now() - startTime;
      
      const stats = parseTestOutput(stdout + "\n" + stderr);
      const result = {
        success: true,
        command: testCommand,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        durationMs: duration,
        stats,
      };

      await EventBus.publish("test:completed", { success: true, stats, durationMs: duration });
      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const combinedOutput = (err.stdout || "") + "\n" + (err.stderr || err.message || "");
      const stats = parseTestOutput(combinedOutput);
      
      const result = {
        success: false,
        command: testCommand,
        stdout: err.stdout ? err.stdout.trim() : "",
        stderr: err.stderr ? err.stderr.trim() : err.message,
        exitCode: err.code || 1,
        durationMs: duration,
        stats: {
          ...stats,
          failed: stats.failed || 1, // Fallback if exit code is non-zero
        },
      };

      await EventBus.publish("test:completed", { success: false, durationMs: duration });
      return result; // Don't throw so caller gets structured results
    }
  },
};

ToolManager.registerTool(TestTool);

import { AgentLoopService } from "./platform/services/agent-loop.js";
import { EventBus } from "./platform/services/event-bus.js";
import { ToolManager } from "./platform/services/tool-manager.js";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  ToolManager.clearRegistry();
  EventBus.clearAll();

  const events: string[] = [];
  EventBus.subscribe("*", (event) => {
    events.push(event.type);
  });

  let readToolCalls = 0;
  let writeToolCalls = 0;

  ToolManager.registerTool({
    definition: {
      name: "safe-read-tool",
      description: "Reads bounded project evidence.",
      parameters: {},
      permissions: ["read"],
      approvalRequired: false
    },
    execute: async (args) => {
      readToolCalls += 1;
      return { inspected: args.target || "workspace" };
    }
  });

  ToolManager.registerTool({
    definition: {
      name: "write-tool",
      description: "Writes a project file.",
      parameters: {},
      permissions: ["write"],
      approvalRequired: true
    },
    execute: async () => {
      writeToolCalls += 1;
      return { changed: true };
    }
  });

  const safeRun = await AgentLoopService.run({
    goal: "Inspect the workspace and stop.",
    approvalMode: "approve_for_me",
    conversationId: "agent-loop-test-safe",
    maxIterations: 3,
    decideNextAction: ({ observations }) => {
      if (observations.length === 0) {
        return {
          type: "tool",
          toolName: "safe-read-tool",
          args: { target: "workspace" },
          reason: "Read-only workspace inspection."
        };
      }
      return { type: "finish", answer: "Inspection complete." };
    }
  });

  assert(safeRun.status === "completed", "Safe read loop should complete.");
  assert(safeRun.observations.length === 1, "Safe read loop should record one observation.");
  assert(safeRun.observations[0]?.ok === true, "Safe read observation should succeed.");
  assert(readToolCalls === 1, "Safe read tool should run once.");
  assert(safeRun.answer === "Inspection complete.", "Safe read loop should return the finish answer.");
  assert(ToolManager.getTool("fs-tool"), "Agent loop should ensure the core filesystem tool is registered.");

  const approvalRun = await AgentLoopService.run({
    goal: "Write a project file after approval.",
    approvalMode: "ask",
    conversationId: "agent-loop-test-approval",
    maxIterations: 2,
    decideNextAction: () => ({
      type: "tool",
      toolName: "write-tool",
      args: { path: "src/example.ts" },
      reason: "Project file write requested.",
      approval: {
        action: "write_file",
        files: ["E:/trusted/project/src/example.ts"]
      }
    })
  });

  assert(approvalRun.status === "waiting_approval", "Ask mode write should wait for approval.");
  assert(Boolean(approvalRun.approvalRequest), "Ask mode write should include an approval request.");
  assert(writeToolCalls === 0, "Write tool must not run before approval.");

  const missingToolRun = await AgentLoopService.run({
    goal: "Call a missing tool.",
    approvalMode: "approve_for_me",
    conversationId: "agent-loop-test-missing-tool",
    maxIterations: 1,
    decideNextAction: () => ({
      type: "tool",
      toolName: "missing-tool",
      reason: "This should fail before execution."
    })
  });

  assert(missingToolRun.status === "failed", "Missing tool should fail deterministically.");
  assert(missingToolRun.failedReason?.includes("Tool not found"), "Missing tool failure should name the real cause.");
  assert(events.includes("AgentLoopStarted"), "Agent loop should publish lifecycle events.");
  assert(events.includes("AgentLoopToolCompleted"), "Agent loop should publish tool completion events.");
  assert(events.includes("AgentLoopApprovalRequired"), "Agent loop should publish approval events.");

  ToolManager.clearRegistry();
  EventBus.clearAll();
  console.log("Agent loop tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

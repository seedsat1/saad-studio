import { ApprovalPolicyService } from "./platform/services/approval-policy.js";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const conversationId = `approval-test-${Date.now()}`;

  const askWrite = await ApprovalPolicyService.evaluate({
    mode: "ask",
    conversationId,
    action: "write_file",
    files: ["E:/trusted/project/src/page.tsx"]
  });
  assert(askWrite.requiresApproval, "Ask mode must require approval for file edits.");

  const askCommand = await ApprovalPolicyService.evaluate({
    mode: "ask",
    conversationId,
    action: "run_command",
    command: "npm run build"
  });
  assert(askCommand.requiresApproval, "Ask mode must require approval for terminal commands.");

  const approveSearch = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "search_workspace"
  });
  assert(approveSearch.allowed, "Approve for me should allow workspace search.");

  const approveBuild = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "run_command",
    command: "npm run build"
  });
  assert(approveBuild.allowed, "Approve for me should allow npm run build.");

  const approveWrite = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "write_file",
    files: ["E:/trusted/project/src/page.tsx"]
  });
  assert(approveWrite.allowed, "Approve for me should allow safe file edits.");

  const approveCodexRuntime = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "run_command",
    command: "codex exec",
    paths: ["E:/trusted/project"]
  });
  assert(approveCodexRuntime.allowed, "Approve for me should allow Codex runtime execution inside a trusted workspace.");

  const defaultSearch = await ApprovalPolicyService.evaluate({
    conversationId: `approval-default-${Date.now()}`,
    action: "search_workspace"
  });
  assert(defaultSearch.allowed, "Default approval mode should allow safe workspace search.");

  const approveDelete = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "delete_file",
    files: ["E:/trusted/project/src/page.tsx"]
  });
  assert(approveDelete.requiresApproval, "Approve for me must require approval for delete.");

  const approvePush = await ApprovalPolicyService.evaluate({
    mode: "approve_for_me",
    conversationId,
    action: "use_git",
    command: "git push"
  });
  assert(approvePush.requiresApproval, "Approve for me must require approval for git push.");

  const fullWrite = await ApprovalPolicyService.evaluate({
    mode: "full_access",
    conversationId,
    action: "write_file",
    files: ["E:/trusted/project/src/page.tsx"]
  });
  assert(fullWrite.allowed, "Full access should allow safe workspace edits.");

  const fullCommand = await ApprovalPolicyService.evaluate({
    mode: "full_access",
    conversationId,
    action: "run_command",
    command: "npm run build"
  });
  assert(fullCommand.allowed, "Full access should allow commands.");

  const secretBlocked = await ApprovalPolicyService.evaluate({
    mode: "full_access",
    conversationId,
    action: "read_file",
    files: ["E:/trusted/project/.env"]
  });
  assert(!secretBlocked.allowed && !secretBlocked.requiresApproval, "Secrets must remain blocked in full access.");

  console.log("Approval policy tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

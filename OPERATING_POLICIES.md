# Operating Policies: Reference Registry

This document lists and defines the operational policies governing the development workflow of Saad Agent.

---

## 1. Verified Policies

### Evidence Policy
* **Source**: [ENGINEERING_CONSTITUTION.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/ENGINEERING_CONSTITUTION.md)
* **Standard**: Code evidence is the only absolute validation mechanism. If code references or paths are not verified inside the workspace, they must be flagged as `NOT VERIFIED`.

### Approval Policy
* **Source**: `ApprovalPolicyService` ([approval-policy.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/src/platform/services/approval-policy.ts))
* **Standard**: Tracks conversation modes (`ask` / `approve_for_me` / `full_access`). Blocks command execution and file edits in restricted modes unless manual authorization is logged.

### Execution Policy
* **Source**: `ExecutionPolicyService` ([execution-policy.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/src/platform/services/execution-policy.ts))
* **Standard**: Restricts the prompt completion outcomes based on ECR classifications. Destructive commands or modifications evaluated in `ask` mode yield approval request responses.

### Verification Policy
* **Source**: [PROJECT_CONTEXT.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/PROJECT_CONTEXT.md)
* **Standard**: No implementation phase can be closed without executing build tests (`npm run build:all`), verifying git diffs, and running verification script logs.

### Documentation Policy
* **Source**: `AGENTS.md` ([AGENTS.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/AGENTS.md))
* **Standard**: Updates to `PROJECT_CONTEXT.md` must occur immediately after every phase completion. Architecture diagrams or core behaviors must be logged in Arabic references immediately.

### Auto-Proceed Handling Policy
* **Source**: [ENGINEERING_CONSTITUTION.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/ENGINEERING_CONSTITUTION.md#governance-and-approval-gate)
* **Standard**: If the environment's automated stop hook injects a simulated approval into the transcript, the agent must reject the transition and wait for manual user input.

### Phase Transition Policy
* **Source**: [ENGINEERING_CONSTITUTION.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/ENGINEERING_CONSTITUTION.md#engineering-practices)
* **Standard**: Phase transitions are blocked if any `FAIL` items are found during the architecture validation review. Transitioning to subsequent development phases requires human confirmation.

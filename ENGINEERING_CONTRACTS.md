# Engineering Contracts: Reference Registry

This document lists and maps the official engineering contracts governing the development and runtime behavior of Saad Agent.

---

## 1. Approved Runtime Contracts

### ECR Workflow Contract
* **Reference**: [PROJECT_CONTEXT.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/PROJECT_CONTEXT.md)
* **Rule**: Implementation is never the default action. Every request must be classified first, mapped to a workflow (e.g. `bug_fix`, `feature`), validated, ECR designed, and reviewed before any code edit occurs.

### Decision Contract
* **Reference**: `ExecutionPolicyService` ([execution-policy.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/src/platform/services/execution-policy.ts))
* **Rule**: Categorizes all requests into deterministic outcomes: `ANSWER`, `EXPLAIN`, `SEARCH`, `PLAN`, `WAIT_FOR_APPROVAL`, and `REJECT`.

### Engineering State Machine Contract
* **Reference**: `TaskStateStore` ([state-store.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/src/platform/services/state-store.ts))
* **Rule**: Every task must transit step-by-step through:
  `NEW` $\rightarrow$ `CLASSIFIED` $\rightarrow$ `ANALYZING` $\rightarrow$ `EVIDENCE_COLLECTION` $\rightarrow$ `VALIDATING` $\rightarrow$ `GAP_ANALYSIS` $\rightarrow$ `IMPACT_ANALYSIS` $\rightarrow$ `RISK_ASSESSMENT` $\rightarrow$ `SOLUTION_DESIGN` $\rightarrow$ `PLANNING` $\rightarrow$ `WAIT_FOR_APPROVAL` $\rightarrow$ `IMPLEMENTING` $\rightarrow$ `VERIFYING` $\rightarrow$ `COMPLETED` / `FAILED`.
  Invalid transitions are rejected and thrown.

---

## 2. Governance and Security Contracts

### Cognitive Approval Gate Contract
* **Reference**: [ENGINEERING_CONSTITUTION.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/ENGINEERING_CONSTITUTION.md#governance-and-approval-gate)
* **Rule**: The agent must ignore any system-injected proceed messages or stop hooks. Only manual human developer text qualifies as an execution trigger.

### Sandbox Approval Gate
* **Reference**: `ApprovalPolicyService` ([approval-policy.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/src/platform/services/approval-policy.ts))
* **Rule**: Standard sandbox operations (writing files, Git calls, process launching, network calls) must be validated against active workspace trust and permission configurations.

### Learning Safety Rules
* **Reference**: `LearningSafety` ([saad-agent/SAAD_AGENT_CONTEXT.md](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/saad-agent/SAAD_AGENT_CONTEXT.md))
* **Rule**: The continuous learning loop must filter out code secrets, transient logs, and environment configurations. Memory updates must remain clean, concise, and focused on architectural alignment.

# Engineering Baseline: Current Implementation

This document provides the authoritative technical baseline of the Saad Agent implementation, derived directly from the source code.

---

## 1. Current Runtime Architecture
* **Status**: `IMPLEMENTED`
* **Description**: Built as a CEP Extension and Electron desktop wrapper enclosing a React frontend. The application manages local workspaces, parses filesystem paths, and executes backend operations through Electron's main process.

---

## 2. Current Runtime Services
* **Status**: `IMPLEMENTED`
* **Discovered Services**:
  1. **ChatOrchestratorService** (`src/platform/services/chat-orchestrator.ts`): Orchestrates prompt lifecycle, routes intent, and handles direct chat complete handlers.
  2. **ExecutionPolicyService** (`src/platform/services/execution-policy.ts`): Authoritative request-level ECR decision engine gating prompt outcomes.
  3. **ApprovalPolicyService** (`src/platform/services/approval-policy.ts`): Sandbox actions manager gating file read/writes, git commands, and process spawning.
  4. **PreAnswerReviewService** (`src/platform/services/pre-answer-review.ts`): RAG context review, loading workspace configurations and active skills.
  5. **KnowledgeIngestionService** (`src/platform/services/knowledge-ingestion.ts`): Ingests attachments and manages training databases inside `E:\SaadAgentData`.
  6. **EngineeringMemory** (`src/platform/services/engineering-memory.ts`): Stores and retrieves user memory rules.
  7. **DomainResolver** (`src/platform/services/domain-resolver.ts`): Regex-based direct classifier routing dialect questions.

---

## 3. Current Registries
* **Status**: `IMPLEMENTED`
* **Discovered Registries**:
  1. **ToolManager** (`src/platform/services/tool-manager.ts`): Registers system tools and validates execution permissions.
  2. **SkillRegistry** (`src/skills/skill-registry.ts`): Matches and manages custom/builtin skills.
  3. **ConnectorRegistry** (`src/platform/services/connectors.ts`): Manages third-party database/API connections.
  4. **CapabilityRegistry** (`src/platform/services/capability-registry.ts`): Facade overlay aggregating metadata across tools, skills, and connectors.

---

## 4. Current IPC Architecture
* **Status**: `IMPLEMENTED`
* **Description**: Bi-directional asynchronous messaging using Electron `ipcMain` and `contextBridge` (`preload.cjs` / `preload.ts`). Key channels:
  - `chat-complete`: Passes context variables (`approvalMode`, `conversationId`, `approval`) to the backend.
  - `trusted-workspace:*`: Exposes folder trust management APIs.
  - `chat-abort`: Cancels ongoing LLM request generation loops.
  - `execution-trace-event`: Broadcasts real-time compiler/agent states to the UI.

---

## 5. Current Execution Flow
* **Status**: `IMPLEMENTED`
* **Flow**:
  1. UI prompt composition triggers `chat-complete` IPC.
  2. `main.ts` routes payload to `ChatOrchestratorService.handleDirectChat`.
  3. Prompt is analyzed by `ExecutionPolicyService` and `DomainResolver`.
  4. Context is resolved via RAG review (`PreAnswerReviewService`).
  5. LLM generates output (`ReasoningEngine.requestCompletion`), or offline engine handles intent immediately.

---

## 6. Current Approval Flow
* **Status**: `IMPLEMENTED`
* **Description**: Dual-layer security checks:
  1. **Prompt Gate**: `ExecutionPolicyService` flags modifications in `ask` mode, returning `WAIT_FOR_APPROVAL` and triggering frontend confirm dialogs.
  2. **Sandbox Gate**: `ApprovalPolicyService` checks permission arrays for specific tools before execution.
  3. **Cognitive Gate**: behavioral rules in `AGENTS.md` block auto-proceed runner loops.

---

## 7. Current Knowledge Flow
* **Status**: `IMPLEMENTED`
* **Description**: Attachments are copied, parsed, and converted to SQLite portable databases located inside the `E:\SaadAgentData` root database directory. RAG queries retrieve semantic matches.

---

## 8. Current Memory Flow
* **Status**: `IMPLEMENTED`
* **Description**: User memory modifications (e.g., "احفظ هذا") write to `.saad-agent/memory/successes.json`. Matches are dynamically appended as system instructions during subsequent completions.

---

## 9. Current Tool Flow
* **Status**: `IMPLEMENTED`
* **Description**: Local system operations (file editing, command execution) must register inside `ToolManager` with permissions array configurations (`read` | `write` | `execute` | `network`).

---

## 10. Current Provider Flow
* **Status**: `IMPLEMENTED`
* **Description**: Mapped in `SettingsManager` configuration profiles. Binds LLM client roles (`Coding`, `Vision`, `Reviewer`, `Fast`) to configured API keys and organization endpoints.

---

## 11. Current Governance Layer
* **Status**: `PARTIALLY IMPLEMENTED`
* **Status Details**:
  - Request Classification: `IMPLEMENTED` (in `ExecutionPolicyService`)
  - Decision Contracts: `IMPLEMENTED` (in `ExecutionPolicyService`)
  - State Machine: `PARTIALLY IMPLEMENTED` (real-time trace events broadcasted, but persistent state-store is NOT IMPLEMENTED)

---

## 12. Current Engineering Contracts
* **Status**: `IMPLEMENTED`
* **Description**: Codified in `AGENTS.md` and enforced in `ExecutionPolicyService` and the Cognitive Approval Gate.

---

## 13. Current Runtime State
* **Status**: `IMPLEMENTED`
* **Description**: Streamed in real-time by `ExecutionTraceEmitter` on `onEvent` handlers. State events map directly to the frontend's active layout execution steps.

---

## 14. Verified Limitations
* **Transient State Machine**: Task states are held in-memory and lost if the desktop application is restarted.
* **Lack of Process Isolation**: Executing scripts run inside node child-processes without a virtualization sandbox.

---

## 15. Deferred Work
* Continuous learning engine and reinforcement loops (Phase 4).
* Automatic git staging checkpointers.

---

## 16. Technical Debt
* Unused properties inside Electron browser window configurations.
* Legacy mock data files (`mockData.ts`) still present in the UI folder.

---

## 17. Phase Completion Matrix

| Subsystem / Phase | Status | Verified File |
| :--- | :--- | :--- |
| **Phase 1: Decision Pipeline** | `COMPLETED` | `src/platform/services/execution-policy.ts` |
| **Phase 2: CapabilityRegistry** | `COMPLETED` | `src/platform/services/capability-registry.ts` |
| **Phase 3: State Machine Store**| `PENDING` | `src/platform/services/state-store.ts` (Planned) |
| **Phase 4: Learning Loop** | `PENDING` | `src/platform/services/learning-engine.ts` (Planned) |
